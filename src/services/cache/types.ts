/**
 * Local File Cache Types
 * 
 * Defines all types and interfaces for the local file caching system
 */

/**
 * Possible states for a cached file
 */
export type FileSyncState =
  | 'local-only'    // Saved locally, not uploaded yet
  | 'uploading'     // Currently uploading to cloud
  | 'synced'        // Uploaded successfully, cached locally
  | 'failed'        // Upload failed (will retry)
  | 'downloading'   // Downloading from cloud
  | 'not-cached'    // Exists in cloud but not cached locally
  | 'deleted';      // Soft deleted

/**
 * File metadata stored in cache database
 */
export interface CachedFile {
  // Identity
  id: string;                    // Unique ID (matches Supabase file_id)
  
  // Storage paths
  localPath: string | null;      // Path in cache (null if evicted)
  cloudPath: string | null;      // Path in Supabase Storage
  publicUrl: string | null;      // Public URL for download
  
  // State
  state: FileSyncState;
  uploadAttempts: number;        // Number of upload attempts
  error: string | null;          // Last error message
  
  // File information
  fileName: string;
  fileSize: number;              // In bytes
  mimeType: string;
  checksum: string | null;       // SHA-256 checksum
  
  // Metadata
  entityType: string;            // 'task', 'project', etc.
  entityId: string;
  uploadedBy: string;
  companyId: string;
  
  // Timestamps
  createdAt: string;             // ISO string
  lastAccessedAt: string;        // For LRU eviction
  cachedAt: string | null;       // When downloaded to cache
  uploadedAt: string | null;     // When uploaded to cloud
}

/**
 * Cache statistics
 */
export interface CacheStats {
  totalSize: number;             // Total cache size in bytes
  totalFiles: number;            // Number of cached files
  pendingUploads: number;        // Files waiting to upload
  failedUploads: number;         // Files that failed to upload
  breakdown: {
    images: { count: number; size: number };
    documents: { count: number; size: number };
    pending: { count: number; size: number };
  };
  lastEviction: string | null;   // ISO string
  updatedAt: string;             // ISO string
}

/**
 * Network information
 */
export interface NetworkInfo {
  type: 'wifi' | 'cellular' | 'none' | 'unknown';
  isConnected: boolean;
  isInternetReachable: boolean | null;
}

/**
 * Network policy configuration
 */
export interface NetworkPolicy {
  allowCellularUpload: boolean;
  allowCellularDownload: boolean;
  maxFileSize: {
    cellular: number;
    wifi: number;
  };
}

/**
 * Upload queue item
 */
export interface UploadQueueItem {
  file: CachedFile;
  priority: number;              // Higher = more important
  addedAt: string;               // ISO string
}

/**
 * Cache configuration
 */
export interface CacheConfig {
  maxCacheSize: number;          // In bytes (default: 500MB)
  evictionThreshold: number;     // Start evicting at this % (default: 0.9)
  evictionTarget: number;        // Evict down to this % (default: 0.8)
  maxConcurrentUploads: {
    wifi: number;
    cellular: number;
  };
  retryConfig: {
    maxAttempts: number;
    delays: number[];            // Exponential backoff delays in ms
  };
  cacheTTL: {
    images: number;              // Time to live in ms
    documents: number;
  };
}

/**
 * Clear cache options
 */
export interface ClearCacheOptions {
  onlyDownloaded?: boolean;      // Keep pending uploads
  olderThan?: Date;              // Clear files older than this date
  entityType?: string;           // Clear specific entity type only
  entityId?: string;             // Clear specific entity only
}

/**
 * Eviction candidate
 */
export interface EvictionCandidate {
  file: CachedFile;
  score: number;                 // Higher score = more likely to evict
}

/**
 * File download options
 */
export interface DownloadOptions {
  priority?: number;
  skipCache?: boolean;           // Force re-download
  onProgress?: (progress: number) => void;
}

/**
 * Cache event types for logging/debugging
 */
export type CacheEvent =
  | { type: 'file_cached'; data: { id: string; size: number } }
  | { type: 'file_evicted'; data: { id: string; reason: string } }
  | { type: 'upload_started'; data: { id: string } }
  | { type: 'upload_completed'; data: { id: string; duration: number } }
  | { type: 'upload_failed'; data: { id: string; error: string; attempts: number } }
  | { type: 'download_started'; data: { id: string } }
  | { type: 'download_completed'; data: { id: string; duration: number } }
  | { type: 'cache_cleared'; data: { filesRemoved: number; bytesFreed: number } }
  | { type: 'corruption_detected'; data: { id: string } };

/**
 * Cache operation result
 */
export interface CacheOperationResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Realtime file change event
 */
export interface RealtimeFileEvent {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  old: any;
  new: any;
}

export default {
  // Re-export for convenience
};

