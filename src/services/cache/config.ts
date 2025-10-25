/**
 * Cache Configuration
 * 
 * Default configuration for the local file caching system
 */

import { CacheConfig } from './types';

/**
 * Default cache configuration
 */
export const DEFAULT_CACHE_CONFIG: CacheConfig = {
  // Maximum cache size: 500MB
  maxCacheSize: 500 * 1024 * 1024,
  
  // Start evicting when cache reaches 90% (450MB)
  evictionThreshold: 0.9,
  
  // Evict down to 80% (400MB) to leave buffer
  evictionTarget: 0.8,
  
  // Concurrent upload limits
  maxConcurrentUploads: {
    wifi: 3,      // 3 simultaneous uploads on WiFi
    cellular: 1,  // 1 upload at a time on cellular
  },
  
  // Retry configuration
  retryConfig: {
    maxAttempts: 5,
    // Exponential backoff: 2s, 4s, 8s, 16s, 32s
    delays: [2000, 4000, 8000, 16000, 32000],
  },
  
  // Cache time-to-live
  cacheTTL: {
    images: 7 * 24 * 60 * 60 * 1000,      // 7 days
    documents: 30 * 24 * 60 * 60 * 1000,  // 30 days
  },
};

/**
 * Cache directory structure
 */
export const CACHE_DIRECTORIES = {
  ROOT: 'buildtrack-files',
  PENDING: 'buildtrack-files/pending',    // Protected from eviction
  IMAGES: 'buildtrack-files/images',      // Can be evicted
  DOCUMENTS: 'buildtrack-files/documents', // Can be evicted
  METADATA: 'buildtrack-files/.metadata', // Metadata storage
};

/**
 * File type categories
 */
export const FILE_TYPE_CATEGORIES = {
  image: [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/heic',
    'image/heif',
  ],
  document: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv',
  ],
};

/**
 * File size limits
 */
export const FILE_SIZE_LIMITS = {
  MAX_FILE_SIZE: 50 * 1024 * 1024,        // 50MB max per file
  MAX_MEMORY_SIZE: 20 * 1024 * 1024,      // 20MB max in memory
  CELLULAR_MAX_SIZE: 5 * 1024 * 1024,     // 5MB max on cellular
  AUTO_DOWNLOAD_MAX: 2 * 1024 * 1024,     // 2MB max for auto-download
};

/**
 * Network retry configuration
 */
export const NETWORK_RETRY_ERRORS = [
  'network-error',
  'timeout',
  'fetch-error',
];

/**
 * Errors that should NOT retry
 */
export const NO_RETRY_ERRORS = [
  'permission-denied',
  'file-too-large',
  'invalid-file-type',
  'quota-exceeded',
];

/**
 * Get file type category from MIME type
 */
export function getFileTypeCategory(mimeType: string): 'image' | 'document' | 'other' {
  if (FILE_TYPE_CATEGORIES.image.includes(mimeType)) {
    return 'image';
  }
  if (FILE_TYPE_CATEGORIES.document.includes(mimeType)) {
    return 'document';
  }
  return 'other';
}

/**
 * Get cache directory for file type
 */
export function getCacheDirectoryForType(mimeType: string): string {
  const category = getFileTypeCategory(mimeType);
  
  switch (category) {
    case 'image':
      return CACHE_DIRECTORIES.IMAGES;
    case 'document':
      return CACHE_DIRECTORIES.DOCUMENTS;
    default:
      return CACHE_DIRECTORIES.DOCUMENTS; // Default to documents
  }
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

/**
 * Calculate cache usage percentage
 */
export function getCacheUsagePercentage(usedBytes: number, maxBytes: number): number {
  return (usedBytes / maxBytes) * 100;
}

/**
 * Check if cache needs eviction
 */
export function needsEviction(
  usedBytes: number,
  maxBytes: number,
  threshold: number = DEFAULT_CACHE_CONFIG.evictionThreshold
): boolean {
  return usedBytes >= maxBytes * threshold;
}

/**
 * Calculate bytes to free for eviction
 */
export function calculateBytesToFree(
  currentBytes: number,
  maxBytes: number,
  targetPercentage: number = DEFAULT_CACHE_CONFIG.evictionTarget
): number {
  const targetBytes = maxBytes * targetPercentage;
  return Math.max(0, currentBytes - targetBytes);
}

