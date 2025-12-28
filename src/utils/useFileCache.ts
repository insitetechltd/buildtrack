import { useState, useCallback, useEffect } from 'react';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';

/**
 * Unified file caching utility for images and documents (PDFs, etc.)
 * 
 * Features:
 * - Caches images using expo-image (when available) or native Image caching
 * - Caches PDFs and documents using expo-file-system
 * - Automatic cache management (size limits, cleanup)
 * - Returns cached local URI or downloads if needed
 */

interface CachedFile {
  originalUri: string;
  cachedUri: string;
  fileType: 'image' | 'document' | 'other';
  size: number;
  cachedAt: number;
}

interface FileCacheStats {
  totalFiles: number;
  totalSize: number;
  imageCount: number;
  documentCount: number;
}

// Cache configuration
const CACHE_CONFIG = {
  MAX_CACHE_SIZE_MB: 500, // Maximum total cache size (500MB)
  MAX_FILE_AGE_DAYS: 30, // Files older than 30 days are candidates for cleanup
  CACHE_DIR: FileSystem.cacheDirectory + 'file-cache/',
};

// In-memory cache map for quick lookups
const cacheMap = new Map<string, CachedFile>();

/**
 * Determine file type from URI or MIME type
 */
function getFileType(uri: string, mimeType?: string): 'image' | 'document' | 'other' {
  const lowerUri = uri.toLowerCase();
  
  // Check MIME type first if provided
  if (mimeType) {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType === 'application/pdf' || mimeType.includes('document') || mimeType.includes('word') || mimeType.includes('excel')) {
      return 'document';
    }
  }
  
  // Check file extension
  if (lowerUri.endsWith('.pdf')) return 'document';
  if (lowerUri.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i)) return 'image';
  if (lowerUri.match(/\.(doc|docx|xls|xlsx|ppt|pptx|txt)$/i)) return 'document';
  
  // Check if URI contains image indicators
  if (lowerUri.includes('image') || lowerUri.includes('photo') || lowerUri.includes('picture')) {
    return 'image';
  }
  
  return 'other';
}

/**
 * Generate cache filename from URI
 */
function getCacheFilename(uri: string): string {
  // Create a hash-like filename from the URI
  const url = new URL(uri);
  const pathParts = url.pathname.split('/');
  const filename = pathParts[pathParts.length - 1] || 'file';
  const timestamp = Date.now();
  const hash = uri.split('').reduce((acc, char) => {
    const hash = ((acc << 5) - acc) + char.charCodeAt(0);
    return hash & hash;
  }, 0);
  
  // Preserve extension if present
  const ext = filename.includes('.') ? filename.split('.').pop() : '';
  return `${Math.abs(hash)}-${timestamp}${ext ? '.' + ext : ''}`;
}

/**
 * Initialize cache directory
 */
async function ensureCacheDirectory(): Promise<void> {
  const dirInfo = await FileSystem.getInfoAsync(CACHE_CONFIG.CACHE_DIR);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(CACHE_CONFIG.CACHE_DIR, { intermediates: true });
  }
}

/**
 * Get cached file info if it exists
 */
async function getCachedFileInfo(uri: string): Promise<CachedFile | null> {
  // Check in-memory cache first
  const cached = cacheMap.get(uri);
  if (cached) {
    const fileInfo = await FileSystem.getInfoAsync(cached.cachedUri);
    if (fileInfo.exists) {
      return cached;
    } else {
      // File was deleted, remove from cache
      cacheMap.delete(uri);
    }
  }
  
  return null;
}

/**
 * Download and cache a file
 */
async function downloadAndCache(uri: string, fileType: 'image' | 'document' | 'other'): Promise<string> {
  await ensureCacheDirectory();
  
  const cacheFilename = getCacheFilename(uri);
  const cachedPath = CACHE_CONFIG.CACHE_DIR + cacheFilename;
  
  try {
    console.log(`📥 [FileCache] Downloading ${fileType}: ${uri.substring(0, 50)}...`);
    
    const downloadResult = await FileSystem.downloadAsync(uri, cachedPath);
    
    if (downloadResult.status === 200) {
      const fileInfo = await FileSystem.getInfoAsync(cachedPath);
      const size = fileInfo.exists ? (fileInfo as any).size || 0 : 0;
      
      // Ensure file:// protocol for local files
      const fileUri = cachedPath.startsWith('file://') ? cachedPath : `file://${cachedPath}`;
      
      const cachedFile: CachedFile = {
        originalUri: uri,
        cachedUri: fileUri,
        fileType,
        size,
        cachedAt: Date.now(),
      };
      
      // Store in memory cache
      cacheMap.set(uri, cachedFile);
      
      console.log(`✅ [FileCache] Cached ${fileType} (${(size / 1024).toFixed(2)}KB): ${cacheFilename}`);
      
      return fileUri;
    } else {
      throw new Error(`Download failed with status ${downloadResult.status}`);
    }
  } catch (error) {
    console.error(`❌ [FileCache] Failed to cache file:`, error);
    // Return original URI if caching fails
    return uri;
  }
}

/**
 * Clean up old or large cache files
 */
async function cleanupCache(): Promise<void> {
  try {
    await ensureCacheDirectory();
    
    const files = await FileSystem.readDirectoryAsync(CACHE_CONFIG.CACHE_DIR);
    const now = Date.now();
    const maxAge = CACHE_CONFIG.MAX_FILE_AGE_DAYS * 24 * 60 * 60 * 1000;
    const maxSize = CACHE_CONFIG.MAX_CACHE_SIZE_MB * 1024 * 1024;
    
    let totalSize = 0;
    const fileInfos: Array<{ path: string; size: number; age: number }> = [];
    
    // Get info for all cached files
    for (const file of files) {
      const filePath = CACHE_CONFIG.CACHE_DIR + file;
      const fileInfo = await FileSystem.getInfoAsync(filePath);
      
      if (fileInfo.exists) {
        const size = (fileInfo as any).size || 0;
        totalSize += size;
        
        // Try to get file modification time
        const stat = await FileSystem.getInfoAsync(filePath);
        const age = now - ((stat as any).modificationTime || now);
        
        fileInfos.push({ path: filePath, size, age });
      }
    }
    
    // Sort by age (oldest first)
    fileInfos.sort((a, b) => a.age - b.age);
    
    // Delete old files first
    for (const fileInfo of fileInfos) {
      if (fileInfo.age > maxAge) {
        console.log(`🗑️ [FileCache] Deleting old file: ${fileInfo.path}`);
        await FileSystem.deleteAsync(fileInfo.path, { idempotent: true });
        totalSize -= fileInfo.size;
      }
    }
    
    // If still over limit, delete oldest files
    if (totalSize > maxSize) {
      for (const fileInfo of fileInfos) {
        if (totalSize <= maxSize) break;
        
        const fileInfo_check = await FileSystem.getInfoAsync(fileInfo.path);
        if (fileInfo_check.exists) {
          console.log(`🗑️ [FileCache] Deleting file to free space: ${fileInfo.path}`);
          await FileSystem.deleteAsync(fileInfo.path, { idempotent: true });
          totalSize -= fileInfo.size;
        }
      }
    }
    
    // Clean up memory cache
    for (const [uri, cached] of cacheMap.entries()) {
      const fileInfo = await FileSystem.getInfoAsync(cached.cachedUri);
      if (!fileInfo.exists) {
        cacheMap.delete(uri);
      }
    }
    
    console.log(`🧹 [FileCache] Cleanup complete. Cache size: ${(totalSize / 1024 / 1024).toFixed(2)}MB`);
  } catch (error) {
    console.error('❌ [FileCache] Cleanup error:', error);
  }
}

/**
 * Get cached file URI (cached if available, otherwise original)
 * For images, returns original URI (expo-image handles caching)
 * For documents, returns cached local URI
 */
export async function getCachedFileUri(uri: string, mimeType?: string): Promise<string> {
  if (!uri || !uri.startsWith('http')) {
    // Local file or invalid URI, return as-is
    return uri;
  }
  
  const fileType = getFileType(uri, mimeType);
  
  // For images, let expo-image handle caching (or native Image caching)
  // We return the original URI so expo-image can manage it
  if (fileType === 'image') {
    return uri;
  }
  
  // For documents (PDFs, etc.), use file system caching
  try {
    const cached = await getCachedFileInfo(uri);
    if (cached) {
      return cached.cachedUri;
    }
    
    // Download and cache
    return await downloadAndCache(uri, fileType);
  } catch (error) {
    console.error(`❌ [FileCache] Error getting cached file:`, error);
    return uri; // Fallback to original URI
  }
}

/**
 * Preload files into cache
 */
export async function preloadFiles(uris: string[]): Promise<void> {
  const promises = uris.map(uri => getCachedFileUri(uri));
  await Promise.all(promises);
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<FileCacheStats> {
  try {
    await ensureCacheDirectory();
    
    const files = await FileSystem.readDirectoryAsync(CACHE_CONFIG.CACHE_DIR);
    let totalSize = 0;
    let imageCount = 0;
    let documentCount = 0;
    
    for (const file of files) {
      const filePath = CACHE_CONFIG.CACHE_DIR + file;
      const fileInfo = await FileSystem.getInfoAsync(filePath);
      
      if (fileInfo.exists) {
        const size = (fileInfo as any).size || 0;
        totalSize += size;
        
        const fileType = getFileType(file);
        if (fileType === 'image') imageCount++;
        else if (fileType === 'document') documentCount++;
      }
    }
    
    return {
      totalFiles: files.length,
      totalSize,
      imageCount,
      documentCount,
    };
  } catch (error) {
    console.error('❌ [FileCache] Error getting cache stats:', error);
    return { totalFiles: 0, totalSize: 0, imageCount: 0, documentCount: 0 };
  }
}

/**
 * Clear all cached files
 */
export async function clearCache(): Promise<void> {
  try {
    await ensureCacheDirectory();
    const files = await FileSystem.readDirectoryAsync(CACHE_CONFIG.CACHE_DIR);
    
    for (const file of files) {
      await FileSystem.deleteAsync(CACHE_CONFIG.CACHE_DIR + file, { idempotent: true });
    }
    
    cacheMap.clear();
    console.log('🗑️ [FileCache] Cache cleared');
  } catch (error) {
    console.error('❌ [FileCache] Error clearing cache:', error);
  }
}

/**
 * React hook for file caching
 */
export function useFileCache() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [cacheStats, setCacheStats] = useState<FileCacheStats>({
    totalFiles: 0,
    totalSize: 0,
    imageCount: 0,
    documentCount: 0,
  });

  useEffect(() => {
    // Initialize cache directory
    ensureCacheDirectory().then(() => {
      setIsInitialized(true);
      // Run cleanup on initialization
      cleanupCache();
      // Get initial stats
      getCacheStats().then(setCacheStats);
    });
  }, []);

  const getCachedUri = useCallback(async (uri: string, mimeType?: string): Promise<string> => {
    return getCachedFileUri(uri, mimeType);
  }, []);

  const preload = useCallback(async (uris: string[]) => {
    await preloadFiles(uris);
    // Update stats after preloading
    getCacheStats().then(setCacheStats);
  }, []);

  const clear = useCallback(async () => {
    await clearCache();
    setCacheStats({ totalFiles: 0, totalSize: 0, imageCount: 0, documentCount: 0 });
  }, []);

  const refreshStats = useCallback(async () => {
    const stats = await getCacheStats();
    setCacheStats(stats);
  }, []);

  return {
    isInitialized,
    cacheStats,
    getCachedUri,
    preload,
    clear,
    refreshStats,
  };
}

