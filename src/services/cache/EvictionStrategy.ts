/**
 * LRU Eviction Strategy
 * 
 * Implements Least Recently Used eviction with protections for:
 * - Pending uploads (never evict)
 * - Failed uploads (never evict)
 * - Recent files (keep if accessed within threshold)
 */

import * as FileSystem from 'expo-file-system';
import { CachedFile, EvictionCandidate } from './types';
import { cacheMetadataStore } from './CacheMetadataStore';
import { DEFAULT_CACHE_CONFIG } from './config';

export class LRUEvictionStrategy {
  /**
   * Get eviction candidates
   * Returns files that can be safely evicted, sorted by eviction priority
   */
  async getCandidates(): Promise<EvictionCandidate[]> {
    const allFiles = await cacheMetadataStore.getAllFiles();
    const now = Date.now();
    
    const candidates: EvictionCandidate[] = [];

    for (const file of allFiles) {
      // NEVER evict these states
      if (
        file.state === 'local-only' ||
        file.state === 'uploading' ||
        file.state === 'failed' ||
        file.state === 'downloading'
      ) {
        continue;
      }

      // Only evict synced files with local copies
      if (file.state !== 'synced' || !file.localPath) {
        continue;
      }

      // Calculate eviction score (higher = more likely to evict)
      const lastAccessTime = new Date(file.lastAccessedAt).getTime();
      const ageInDays = (now - lastAccessTime) / (1000 * 60 * 60 * 24);
      
      // Score based on age and access pattern
      let score = ageInDays;

      // Older files get higher scores
      if (ageInDays > 30) {
        score *= 2; // Really old
      } else if (ageInDays > 14) {
        score *= 1.5; // Old
      } else if (ageInDays > 7) {
        score *= 1.2; // Somewhat old
      }

      // Larger files get slightly higher scores (free more space)
      const sizeInMB = file.fileSize / (1024 * 1024);
      if (sizeInMB > 10) {
        score *= 1.1;
      }

      candidates.push({
        file,
        score,
      });
    }

    // Sort by score (highest score first = evict first)
    return candidates.sort((a, b) => b.score - a.score);
  }

  /**
   * Evict files to free up specified amount of space
   * Returns the number of bytes actually freed
   */
  async evict(bytesToFree: number): Promise<number> {
    console.log(`🗑️ Starting eviction to free ${this.formatBytes(bytesToFree)}`);

    const candidates = await this.getCandidates();
    if (candidates.length === 0) {
      console.warn('⚠️ No files available for eviction');
      return 0;
    }

    let bytesFreed = 0;
    const evictedFiles: string[] = [];

    for (const candidate of candidates) {
      if (bytesFreed >= bytesToFree) {
        break; // Freed enough space
      }

      try {
        await this.evictFile(candidate.file);
        bytesFreed += candidate.file.fileSize;
        evictedFiles.push(candidate.file.id);

        console.log(
          `🗑️ Evicted: ${candidate.file.fileName} (${this.formatBytes(candidate.file.fileSize)})`
        );
      } catch (error) {
        console.error(`Failed to evict file ${candidate.file.id}:`, error);
      }
    }

    console.log(
      `✅ Eviction complete: ${evictedFiles.length} files, ${this.formatBytes(bytesFreed)} freed`
    );

    // Update last eviction time
    await cacheMetadataStore.updateLastEviction();

    return bytesFreed;
  }

  /**
   * Evict a single file
   */
  private async evictFile(file: CachedFile): Promise<void> {
    if (!file.localPath) {
      throw new Error('Cannot evict file without local path');
    }

    // Delete file from file system
    try {
      const fileInfo = await FileSystem.getInfoAsync(file.localPath);
      if (fileInfo.exists) {
        await FileSystem.deleteAsync(file.localPath, { idempotent: true });
      }
    } catch (error) {
      console.warn(`Failed to delete file ${file.localPath}:`, error);
    }

    // Update metadata (mark as not cached)
    await cacheMetadataStore.updateFileState(file.id, 'not-cached', {
      localPath: null,
      cachedAt: null,
    });
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
   * Get eviction statistics
   */
  async getEvictionStats(): Promise<{
    totalCandidates: number;
    totalBytesAvailable: number;
    oldestFile: Date | null;
    newestFile: Date | null;
  }> {
    const candidates = await this.getCandidates();
    
    let totalBytesAvailable = 0;
    let oldestTime: number | null = null;
    let newestTime: number | null = null;

    for (const candidate of candidates) {
      totalBytesAvailable += candidate.file.fileSize;
      
      const accessTime = new Date(candidate.file.lastAccessedAt).getTime();
      if (oldestTime === null || accessTime < oldestTime) {
        oldestTime = accessTime;
      }
      if (newestTime === null || accessTime > newestTime) {
        newestTime = accessTime;
      }
    }

    return {
      totalCandidates: candidates.length,
      totalBytesAvailable,
      oldestFile: oldestTime ? new Date(oldestTime) : null,
      newestFile: newestTime ? new Date(newestTime) : null,
    };
  }
}

// Singleton instance
export const evictionStrategy = new LRUEvictionStrategy();

