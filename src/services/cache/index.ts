/**
 * Cache Services
 * 
 * Main entry point for the local file caching system
 */

export * from './types';
export * from './config';
export { cacheManager } from './CacheManager';
export { uploadQueue } from './UploadQueue';
export { syncManager } from './SyncManager';
export { evictionStrategy } from './EvictionStrategy';
export { cacheMetadataStore } from './CacheMetadataStore';

// Export for backwards compatibility
export { CacheManager } from './CacheManager';
export { UploadQueue } from './UploadQueue';
export { SyncManager } from './SyncManager';
export { LRUEvictionStrategy } from './EvictionStrategy';
export { CacheMetadataStore } from './CacheMetadataStore';

