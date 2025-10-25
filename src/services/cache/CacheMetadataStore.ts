/**
 * Cache Metadata Store
 * 
 * Manages storage and retrieval of cache metadata using AsyncStorage
 * Can be migrated to SQLite later if performance becomes an issue
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { CachedFile, CacheStats, FileSyncState } from './types';

const STORAGE_KEYS = {
  FILES: '@buildtrack/cache/files',
  STATS: '@buildtrack/cache/stats',
  VERSION: '@buildtrack/cache/version',
};

const CURRENT_VERSION = '1.0.0';

/**
 * Cache metadata store
 */
export class CacheMetadataStore {
  private filesCache: Map<string, CachedFile> = new Map();
  private isInitialized = false;

  /**
   * Initialize the metadata store
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Check version for migrations
      const version = await AsyncStorage.getItem(STORAGE_KEYS.VERSION);
      if (version !== CURRENT_VERSION) {
        await this.migrate(version);
      }

      // Load files into memory
      const filesJson = await AsyncStorage.getItem(STORAGE_KEYS.FILES);
      if (filesJson) {
        const filesArray: CachedFile[] = JSON.parse(filesJson);
        this.filesCache = new Map(filesArray.map(f => [f.id, f]));
      }

      this.isInitialized = true;
      console.log(`📦 Cache metadata initialized (${this.filesCache.size} files)`);
    } catch (error) {
      console.error('Failed to initialize cache metadata:', error);
      throw error;
    }
  }

  /**
   * Save a file to metadata store
   */
  async saveFile(file: CachedFile): Promise<void> {
    this.filesCache.set(file.id, file);
    await this.persist();
  }

  /**
   * Get a file from metadata store
   */
  async getFile(id: string): Promise<CachedFile | null> {
    return this.filesCache.get(id) || null;
  }

  /**
   * Get all files
   */
  async getAllFiles(): Promise<CachedFile[]> {
    return Array.from(this.filesCache.values());
  }

  /**
   * Get files by state
   */
  async getFilesByState(state: FileSyncState): Promise<CachedFile[]> {
    return Array.from(this.filesCache.values()).filter(f => f.state === state);
  }

  /**
   * Get files by entity
   */
  async getFilesByEntity(entityType: string, entityId: string): Promise<CachedFile[]> {
    return Array.from(this.filesCache.values()).filter(
      f => f.entityType === entityType && f.entityId === entityId
    );
  }

  /**
   * Update file state
   */
  async updateFileState(
    id: string,
    state: FileSyncState,
    updates?: Partial<CachedFile>
  ): Promise<void> {
    const file = this.filesCache.get(id);
    if (!file) {
      throw new Error(`File not found: ${id}`);
    }

    const updatedFile: CachedFile = {
      ...file,
      ...updates,
      state,
    };

    this.filesCache.set(id, updatedFile);
    await this.persist();
  }

  /**
   * Update last accessed time (for LRU)
   */
  async updateLastAccessed(id: string): Promise<void> {
    const file = this.filesCache.get(id);
    if (!file) return;

    file.lastAccessedAt = new Date().toISOString();
    this.filesCache.set(id, file);
    await this.persist();
  }

  /**
   * Delete a file from metadata
   */
  async deleteFile(id: string): Promise<void> {
    this.filesCache.delete(id);
    await this.persist();
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<CacheStats> {
    const files = Array.from(this.filesCache.values());
    
    const stats: CacheStats = {
      totalSize: 0,
      totalFiles: files.length,
      pendingUploads: 0,
      failedUploads: 0,
      breakdown: {
        images: { count: 0, size: 0 },
        documents: { count: 0, size: 0 },
        pending: { count: 0, size: 0 },
      },
      lastEviction: null,
      updatedAt: new Date().toISOString(),
    };

    for (const file of files) {
      // Only count files that have local copies
      if (file.localPath) {
        stats.totalSize += file.fileSize;
      }

      // Count by state
      if (file.state === 'local-only' || file.state === 'uploading') {
        stats.pendingUploads++;
        stats.breakdown.pending.count++;
        stats.breakdown.pending.size += file.fileSize;
      } else if (file.state === 'failed') {
        stats.failedUploads++;
      }

      // Count by type
      if (file.mimeType.startsWith('image/')) {
        stats.breakdown.images.count++;
        if (file.localPath) {
          stats.breakdown.images.size += file.fileSize;
        }
      } else {
        stats.breakdown.documents.count++;
        if (file.localPath) {
          stats.breakdown.documents.size += file.fileSize;
        }
      }
    }

    // Try to get last eviction time
    const statsJson = await AsyncStorage.getItem(STORAGE_KEYS.STATS);
    if (statsJson) {
      const savedStats = JSON.parse(statsJson);
      stats.lastEviction = savedStats.lastEviction;
    }

    // Save updated stats
    await AsyncStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(stats));

    return stats;
  }

  /**
   * Update last eviction time
   */
  async updateLastEviction(): Promise<void> {
    const stats = await this.getStats();
    stats.lastEviction = new Date().toISOString();
    await AsyncStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(stats));
  }

  /**
   * Get files sorted by last accessed (for LRU eviction)
   */
  async getFilesSortedByAccess(): Promise<CachedFile[]> {
    const files = Array.from(this.filesCache.values());
    return files.sort((a, b) => {
      const dateA = new Date(a.lastAccessedAt).getTime();
      const dateB = new Date(b.lastAccessedAt).getTime();
      return dateA - dateB; // Oldest first
    });
  }

  /**
   * Clear all metadata
   */
  async clear(): Promise<void> {
    this.filesCache.clear();
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.FILES,
      STORAGE_KEYS.STATS,
    ]);
  }

  /**
   * Persist files to AsyncStorage
   */
  private async persist(): Promise<void> {
    const filesArray = Array.from(this.filesCache.values());
    await AsyncStorage.setItem(STORAGE_KEYS.FILES, JSON.stringify(filesArray));
  }

  /**
   * Migrate metadata between versions
   */
  private async migrate(oldVersion: string | null): Promise<void> {
    console.log(`📦 Migrating cache metadata from ${oldVersion || 'unknown'} to ${CURRENT_VERSION}`);
    
    // For now, just update version
    // Add migration logic here if schema changes in future
    
    await AsyncStorage.setItem(STORAGE_KEYS.VERSION, CURRENT_VERSION);
  }

  /**
   * Export metadata for debugging
   */
  async export(): Promise<string> {
    const files = Array.from(this.filesCache.values());
    const stats = await this.getStats();
    
    return JSON.stringify({
      version: CURRENT_VERSION,
      exportedAt: new Date().toISOString(),
      files,
      stats,
    }, null, 2);
  }
}

// Singleton instance
export const cacheMetadataStore = new CacheMetadataStore();

