/**
 * Sync Manager
 * 
 * Manages realtime synchronization with Supabase
 * Automatically downloads new files based on policy
 */

import NetInfo from '@react-native-community/netinfo';
import * as FileSystem from 'expo-file-system';
import { supabase } from '../../api/supabase';
import { CachedFile, RealtimeFileEvent, NetworkInfo } from './types';
import { cacheManager } from './CacheManager';
import { cacheMetadataStore } from './CacheMetadataStore';
import { FILE_SIZE_LIMITS, getCacheDirectoryForType } from './config';

export class SyncManager {
  private subscription: any = null;
  private networkInfo: NetworkInfo = {
    type: 'unknown',
    isConnected: false,
    isInternetReachable: null,
  };

  /**
   * Start realtime subscription
   */
  async subscribe(companyId: string, userId: string): Promise<void> {
    if (!supabase) {
      console.warn('⚠️ Supabase not configured, skipping realtime sync');
      return;
    }

    // Initialize network listener
    this.initializeNetworkListener();

    console.log('🔔 Starting realtime file sync...');

    this.subscription = supabase
      .channel('file-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'file_attachments',
          filter: `company_id=eq.${companyId}`,
        },
        async (payload) => {
          await this.handleRealtimeEvent(payload as any, userId);
        }
      )
      .subscribe((status) => {
        console.log('🔔 Realtime subscription status:', status);
      });
  }

  /**
   * Stop realtime subscription
   */
  async unsubscribe(): Promise<void> {
    if (this.subscription) {
      await supabase?.removeChannel(this.subscription);
      this.subscription = null;
      console.log('🔔 Realtime sync stopped');
    }
  }

  /**
   * Handle realtime file change event
   */
  private async handleRealtimeEvent(
    payload: RealtimeFileEvent,
    currentUserId: string
  ): Promise<void> {
    console.log('🔔 Realtime event:', payload.eventType);

    try {
      if (payload.eventType === 'INSERT') {
        await this.handleNewFile(payload.new, currentUserId);
      } else if (payload.eventType === 'UPDATE') {
        await this.handleFileUpdate(payload.new);
      } else if (payload.eventType === 'DELETE') {
        await this.handleFileDelete(payload.old);
      }
    } catch (error) {
      console.error('Failed to handle realtime event:', error);
    }
  }

  /**
   * Handle new file uploaded (maybe by another user/device)
   */
  private async handleNewFile(fileData: any, currentUserId: string): Promise<void> {
    console.log('🆕 New file detected:', fileData.file_name);

    // Don't process if we uploaded it (we already have it cached)
    if (fileData.uploaded_by === currentUserId) {
      console.log('👤 File uploaded by current user, skipping');
      return;
    }

    // Check if we should auto-download
    const shouldDownload = await this.shouldAutoDownload(fileData);

    if (shouldDownload) {
      console.log('⬇️ Auto-downloading new file:', fileData.file_name);
      await this.downloadAndCacheFile(fileData);
    } else {
      console.log('💾 Saving metadata only:', fileData.file_name);
      // Save metadata without downloading
      await this.saveFileMetadata(fileData);
    }
  }

  /**
   * Handle file update
   */
  private async handleFileUpdate(fileData: any): Promise<void> {
    console.log('🔄 File updated:', fileData.file_name);

    // Check if we have this file cached
    const existing = await cacheMetadataStore.getFile(fileData.id);

    if (existing && existing.localPath) {
      // File is cached, check if we need to re-download
      const cloudUpdatedAt = new Date(fileData.updated_at).getTime();
      const localCachedAt = existing.cachedAt
        ? new Date(existing.cachedAt).getTime()
        : 0;

      if (cloudUpdatedAt > localCachedAt) {
        console.log('🔄 Cloud version is newer, re-downloading');
        
        // Delete old cached version
        try {
          await FileSystem.deleteAsync(existing.localPath, { idempotent: true });
        } catch (error) {
          console.warn('Failed to delete old version:', error);
        }

        // Download new version
        await this.downloadAndCacheFile(fileData);
      }
    } else {
      // Not cached, just update metadata
      await this.saveFileMetadata(fileData);
    }
  }

  /**
   * Handle file deletion
   */
  private async handleFileDelete(fileData: any): Promise<void> {
    console.log('🗑️ File deleted:', fileData.file_name);

    const existing = await cacheMetadataStore.getFile(fileData.id);

    if (existing) {
      // Delete local copy if it exists
      if (existing.localPath) {
        try {
          await FileSystem.deleteAsync(existing.localPath, { idempotent: true });
        } catch (error) {
          console.warn('Failed to delete local copy:', error);
        }
      }

      // Remove from metadata
      await cacheMetadataStore.deleteFile(fileData.id);

      console.log('✅ Local copy removed');
    }
  }

  /**
   * Determine if file should be auto-downloaded
   */
  private async shouldAutoDownload(fileData: any): Promise<boolean> {
    // Only auto-download if:
    // 1. File is small (< 2MB)
    // 2. User is on WiFi
    // 3. Cache has space
    // 4. File is relevant to user (could check current project/task)

    const fileSize = fileData.file_size || 0;

    // Check file size
    if (fileSize > FILE_SIZE_LIMITS.AUTO_DOWNLOAD_MAX) {
      console.log(`⏸️ File too large for auto-download: ${this.formatBytes(fileSize)}`);
      return false;
    }

    // Check network type
    if (this.networkInfo.type !== 'wifi') {
      console.log('⏸️ Not on WiFi, skipping auto-download');
      return false;
    }

    // Check cache space
    const stats = await cacheManager.getStats();
    const maxCacheSize = 500 * 1024 * 1024; // 500MB
    const availableSpace = maxCacheSize - stats.totalSize;

    if (availableSpace < fileSize) {
      console.log('⏸️ Insufficient cache space for auto-download');
      return false;
    }

    // TODO: Could add relevance check (e.g., file belongs to current project/task)

    return true;
  }

  /**
   * Download and cache a file from cloud
   */
  private async downloadAndCacheFile(fileData: any): Promise<void> {
    if (!supabase) {
      throw new Error('Supabase not configured');
    }

    console.log(`⬇️ Downloading: ${fileData.file_name}`);

    try {
      // Download from Supabase Storage
      const { data, error } = await supabase.storage
        .from('buildtrack-files')
        .download(fileData.storage_path);

      if (error) {
        throw error;
      }

      // Convert blob to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const base64 = reader.result as string;
          resolve(base64.split(',')[1]); // Remove data:... prefix
        };
        reader.onerror = reject;
        reader.readAsDataURL(data);
      });

      const base64 = await base64Promise;

      // Save to cache
      const cacheRoot = FileSystem.cacheDirectory!;
      const cacheDir = `${cacheRoot}${getCacheDirectoryForType(fileData.mime_type)}/`;
      const localPath = `${cacheDir}${fileData.id}-${fileData.file_name}`;

      // Ensure directory exists
      const dirInfo = await FileSystem.getInfoAsync(cacheDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(cacheDir, { intermediates: true });
      }

      // Write file
      await FileSystem.writeAsStringAsync(localPath, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Save metadata
      const cachedFile: CachedFile = {
        id: fileData.id,
        localPath,
        cloudPath: fileData.storage_path,
        publicUrl: fileData.public_url,
        state: 'synced',
        uploadAttempts: 0,
        error: null,
        fileName: fileData.file_name,
        fileSize: fileData.file_size,
        mimeType: fileData.mime_type,
        checksum: null, // TODO: Calculate if needed
        entityType: fileData.entity_type,
        entityId: fileData.entity_id,
        uploadedBy: fileData.uploaded_by,
        companyId: fileData.company_id,
        createdAt: fileData.created_at,
        lastAccessedAt: new Date().toISOString(),
        cachedAt: new Date().toISOString(),
        uploadedAt: fileData.created_at,
      };

      await cacheMetadataStore.saveFile(cachedFile);

      console.log(`✅ Downloaded and cached: ${fileData.file_name}`);
    } catch (error) {
      console.error('Failed to download file:', error);
      throw error;
    }
  }

  /**
   * Save file metadata without downloading
   */
  private async saveFileMetadata(fileData: any): Promise<void> {
    const existingFile = await cacheMetadataStore.getFile(fileData.id);

    if (existingFile) {
      // Update existing metadata
      await cacheMetadataStore.updateFileState(existingFile.id, existingFile.state, {
        cloudPath: fileData.storage_path,
        publicUrl: fileData.public_url,
        fileName: fileData.file_name,
        fileSize: fileData.file_size,
      });
    } else {
      // Create new metadata entry
      const cachedFile: CachedFile = {
        id: fileData.id,
        localPath: null, // Not cached locally
        cloudPath: fileData.storage_path,
        publicUrl: fileData.public_url,
        state: 'not-cached',
        uploadAttempts: 0,
        error: null,
        fileName: fileData.file_name,
        fileSize: fileData.file_size,
        mimeType: fileData.mime_type,
        checksum: null,
        entityType: fileData.entity_type,
        entityId: fileData.entity_id,
        uploadedBy: fileData.uploaded_by,
        companyId: fileData.company_id,
        createdAt: fileData.created_at,
        lastAccessedAt: new Date().toISOString(),
        cachedAt: null,
        uploadedAt: fileData.created_at,
      };

      await cacheMetadataStore.saveFile(cachedFile);
    }

    console.log(`💾 Metadata saved: ${fileData.file_name}`);
  }

  /**
   * Initialize network listener
   */
  private initializeNetworkListener(): void {
    NetInfo.fetch().then(state => {
      this.updateNetworkInfo(state);
    });

    NetInfo.addEventListener(state => {
      this.updateNetworkInfo(state);
    });
  }

  /**
   * Update network info
   */
  private updateNetworkInfo(state: any): void {
    this.networkInfo = {
      type: this.mapNetworkType(state.type),
      isConnected: state.isConnected ?? false,
      isInternetReachable: state.isInternetReachable,
    };
  }

  /**
   * Map NetInfo type to our NetworkInfo type
   */
  private mapNetworkType(type: string): NetworkInfo['type'] {
    if (type === 'wifi') return 'wifi';
    if (type === 'cellular') return 'cellular';
    if (type === 'none') return 'none';
    return 'unknown';
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
}

// Singleton instance
export const syncManager = new SyncManager();

