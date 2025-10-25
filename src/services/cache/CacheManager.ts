/**
 * Cache Manager
 * 
 * Main coordinator for the file caching system
 * Handles caching, retrieval, eviction, and statistics
 */

import * as FileSystem from 'expo-file-system';
import * as Crypto from 'expo-crypto';
import { CachedFile, CacheStats, CacheOperationResult, ClearCacheOptions } from './types';
import { cacheMetadataStore } from './CacheMetadataStore';
import { evictionStrategy } from './EvictionStrategy';
import {
  DEFAULT_CACHE_CONFIG,
  CACHE_DIRECTORIES,
  getCacheDirectoryForType,
  needsEviction,
  calculateBytesToFree,
} from './config';

export class CacheManager {
  private isInitialized = false;

  /**
   * Initialize the cache manager
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('📦 Initializing cache manager...');

      // Initialize metadata store
      await cacheMetadataStore.initialize();

      // Ensure cache directories exist
      await this.ensureDirectories();

      // Perform crash recovery
      await this.recoverFromCrash();

      this.isInitialized = true;
      console.log('✅ Cache manager initialized');

      // Log current statistics
      const stats = await this.getStats();
      console.log(
        `📊 Cache stats: ${this.formatBytes(stats.totalSize)} / ${this.formatBytes(
          DEFAULT_CACHE_CONFIG.maxCacheSize
        )} (${((stats.totalSize / DEFAULT_CACHE_CONFIG.maxCacheSize) * 100).toFixed(1)}%)`
      );
    } catch (error) {
      console.error('Failed to initialize cache manager:', error);
      throw error;
    }
  }

  /**
   * Cache a file locally
   * This is the first step in the upload flow
   */
  async cacheFile(
    uri: string,
    metadata: {
      fileName: string;
      mimeType: string;
      entityType: string;
      entityId: string;
      uploadedBy: string;
      companyId: string;
    }
  ): Promise<CacheOperationResult<CachedFile>> {
    try {
      console.log(`📦 Caching file: ${metadata.fileName}`);

      // Get file info
      const fileInfo = await FileSystem.getInfoAsync(uri);
      if (!fileInfo.exists || !('size' in fileInfo)) {
        return {
          success: false,
          error: 'File does not exist or size unavailable',
        };
      }

      const fileSize = fileInfo.size;

      // Check if we need to make space
      const stats = await this.getStats();
      const wouldExceedLimit =
        stats.totalSize + fileSize > DEFAULT_CACHE_CONFIG.maxCacheSize;

      if (wouldExceedLimit) {
        // Try to make space
        const spaceNeeded = stats.totalSize + fileSize - DEFAULT_CACHE_CONFIG.maxCacheSize;
        const freed = await evictionStrategy.evict(spaceNeeded + 10 * 1024 * 1024); // Extra 10MB buffer

        if (freed < spaceNeeded) {
          return {
            success: false,
            error: 'Insufficient cache space and cannot evict enough files',
          };
        }
      }

      // Generate unique ID
      const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Determine cache location (pending folder - protected from eviction)
      const cacheRoot = FileSystem.cacheDirectory!;
      const pendingDir = `${cacheRoot}${CACHE_DIRECTORIES.PENDING}/`;
      const localPath = `${pendingDir}${id}-${metadata.fileName}`;

      // Copy file to cache
      await FileSystem.copyAsync({
        from: uri,
        to: localPath,
      });

      // Calculate checksum for integrity
      const checksum = await this.calculateChecksum(localPath);

      // Create cached file metadata
      const now = new Date().toISOString();
      const cachedFile: CachedFile = {
        id,
        localPath,
        cloudPath: null,
        publicUrl: null,
        state: 'local-only',
        uploadAttempts: 0,
        error: null,
        fileName: metadata.fileName,
        fileSize,
        mimeType: metadata.mimeType,
        checksum,
        entityType: metadata.entityType,
        entityId: metadata.entityId,
        uploadedBy: metadata.uploadedBy,
        companyId: metadata.companyId,
        createdAt: now,
        lastAccessedAt: now,
        cachedAt: now,
        uploadedAt: null,
      };

      // Save to metadata store
      await cacheMetadataStore.saveFile(cachedFile);

      console.log(`✅ File cached: ${metadata.fileName} (${this.formatBytes(fileSize)})`);

      return {
        success: true,
        data: cachedFile,
      };
    } catch (error) {
      console.error('Failed to cache file:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get a cached file by ID
   * Updates last accessed time for LRU
   */
  async getCachedFile(id: string): Promise<string | null> {
    const file = await cacheMetadataStore.getFile(id);
    
    if (!file || !file.localPath) {
      return null;
    }

    // Verify file exists
    const fileInfo = await FileSystem.getInfoAsync(file.localPath);
    if (!fileInfo.exists) {
      console.warn(`Cached file missing: ${file.localPath}`);
      // Update metadata
      await cacheMetadataStore.updateFileState(id, 'not-cached', {
        localPath: null,
      });
      return null;
    }

    // Verify integrity (optional, can be slow)
    if (file.checksum) {
      const isValid = await this.verifyFile(file);
      if (!isValid) {
        console.error(`File corrupted: ${file.localPath}`);
        // Delete corrupted file
        await FileSystem.deleteAsync(file.localPath, { idempotent: true });
        await cacheMetadataStore.updateFileState(id, 'not-cached', {
          localPath: null,
          error: 'File corrupted',
        });
        return null;
      }
    }

    // Update last accessed time (for LRU)
    await cacheMetadataStore.updateLastAccessed(id);

    return file.localPath;
  }

  /**
   * Get file metadata by ID
   */
  async getFileMetadata(id: string): Promise<CachedFile | null> {
    return await cacheMetadataStore.getFile(id);
  }

  /**
   * Get files for an entity
   */
  async getFilesForEntity(entityType: string, entityId: string): Promise<CachedFile[]> {
    return await cacheMetadataStore.getFilesByEntity(entityType, entityId);
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<CacheStats> {
    return await cacheMetadataStore.getStats();
  }

  /**
   * Clear cache with options
   */
  async clearCache(options?: ClearCacheOptions): Promise<CacheOperationResult<{
    filesRemoved: number;
    bytesFreed: number;
  }>> {
    try {
      console.log('🗑️ Clearing cache...');

      let files = await cacheMetadataStore.getAllFiles();

      // Filter by options
      if (options?.onlyDownloaded) {
        // Only clear synced files (keep pending uploads)
        files = files.filter(f => f.state === 'synced');
      }

      if (options?.olderThan) {
        const threshold = options.olderThan.getTime();
        files = files.filter(f => {
          const accessTime = new Date(f.lastAccessedAt).getTime();
          return accessTime < threshold;
        });
      }

      if (options?.entityType) {
        files = files.filter(f => f.entityType === options.entityType);
      }

      if (options?.entityId) {
        files = files.filter(f => f.entityId === options.entityId);
      }

      let filesRemoved = 0;
      let bytesFreed = 0;

      for (const file of files) {
        if (file.localPath) {
          try {
            await FileSystem.deleteAsync(file.localPath, { idempotent: true });
            bytesFreed += file.fileSize;
            filesRemoved++;

            // Update metadata
            await cacheMetadataStore.updateFileState(file.id, 'not-cached', {
              localPath: null,
              cachedAt: null,
            });
          } catch (error) {
            console.error(`Failed to delete file ${file.localPath}:`, error);
          }
        }
      }

      console.log(`✅ Cache cleared: ${filesRemoved} files, ${this.formatBytes(bytesFreed)} freed`);

      return {
        success: true,
        data: { filesRemoved, bytesFreed },
      };
    } catch (error) {
      console.error('Failed to clear cache:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Verify file integrity using checksum
   */
  async verifyFile(file: CachedFile): Promise<boolean> {
    if (!file.checksum || !file.localPath) {
      return true; // Cannot verify, assume valid
    }

    try {
      const currentChecksum = await this.calculateChecksum(file.localPath);
      return currentChecksum === file.checksum;
    } catch (error) {
      console.error('Failed to verify file:', error);
      return false;
    }
  }

  /**
   * Calculate SHA-256 checksum for a file
   */
  private async calculateChecksum(filePath: string): Promise<string> {
    try {
      // Read file as base64
      const base64 = await FileSystem.readAsStringAsync(filePath, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Calculate SHA-256
      const checksum = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        base64
      );

      return checksum;
    } catch (error) {
      console.error('Failed to calculate checksum:', error);
      throw error;
    }
  }

  /**
   * Ensure cache directories exist
   */
  private async ensureDirectories(): Promise<void> {
    const cacheRoot = FileSystem.cacheDirectory!;
    const directories = Object.values(CACHE_DIRECTORIES);

    for (const dir of directories) {
      const fullPath = `${cacheRoot}${dir}`;
      const dirInfo = await FileSystem.getInfoAsync(fullPath);
      
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(fullPath, { intermediates: true });
        console.log(`📁 Created directory: ${dir}`);
      }
    }
  }

  /**
   * Recover from app crash
   * Reset files stuck in transitional states
   */
  private async recoverFromCrash(): Promise<void> {
    console.log('🔄 Performing crash recovery...');

    // Find files stuck in 'uploading' or 'downloading' state
    const uploadingFiles = await cacheMetadataStore.getFilesByState('uploading');
    const downloadingFiles = await cacheMetadataStore.getFilesByState('downloading');

    const stuckFiles = [...uploadingFiles, ...downloadingFiles];

    if (stuckFiles.length === 0) {
      console.log('✅ No stuck files found');
      return;
    }

    console.log(`⚠️ Found ${stuckFiles.length} stuck files, recovering...`);

    for (const file of stuckFiles) {
      if (file.state === 'uploading') {
        // Reset to failed so it can be retried
        await cacheMetadataStore.updateFileState(file.id, 'failed', {
          error: 'Upload interrupted by app crash/restart',
        });
      } else if (file.state === 'downloading') {
        // Reset to not-cached
        await cacheMetadataStore.updateFileState(file.id, 'not-cached', {
          localPath: null,
          error: 'Download interrupted by app crash/restart',
        });
      }
    }

    console.log(`✅ Recovered ${stuckFiles.length} stuck files`);
  }

  /**
   * Format bytes for display
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  }

  /**
   * Export cache metadata for debugging
   */
  async exportMetadata(): Promise<string> {
    return await cacheMetadataStore.export();
  }
}

// Singleton instance
export const cacheManager = new CacheManager();

