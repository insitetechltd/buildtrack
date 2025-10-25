/**
 * Upload Queue
 * 
 * Manages background uploads with retry logic and exponential backoff
 * Limits concurrent uploads based on network type
 */

import NetInfo from '@react-native-community/netinfo';
import PQueue from 'p-queue';
import * as FileSystem from 'expo-file-system';
import { CachedFile, NetworkInfo, UploadQueueItem } from './types';
import { cacheMetadataStore } from './CacheMetadataStore';
import { supabase } from '../../api/supabase';
import { DEFAULT_CACHE_CONFIG, CACHE_DIRECTORIES, getCacheDirectoryForType } from './config';

export class UploadQueue {
  private queue: PQueue;
  private networkInfo: NetworkInfo = {
    type: 'unknown',
    isConnected: false,
    isInternetReachable: null,
  };
  private isProcessing = false;

  constructor() {
    // Initialize queue with default WiFi concurrency
    this.queue = new PQueue({
      concurrency: DEFAULT_CACHE_CONFIG.maxConcurrentUploads.wifi,
    });

    // Listen to network changes
    this.initializeNetworkListener();
  }

  /**
   * Add file to upload queue
   */
  async addToQueue(file: CachedFile, priority: number = 0): Promise<void> {
    console.log(`📤 Adding to upload queue: ${file.fileName}`);

    // Create queue item
    const queueItem: UploadQueueItem = {
      file,
      priority,
      addedAt: new Date().toISOString(),
    };

    // Add to queue with priority
    this.queue.add(() => this.uploadFile(file), { priority });

    // Start processing if not already
    if (!this.isProcessing) {
      this.processQueue();
    }
  }

  /**
   * Process the upload queue
   */
  async processQueue(): Promise<void> {
    if (this.isProcessing) return;

    this.isProcessing = true;
    console.log('📤 Processing upload queue...');

    try {
      // Wait for queue to finish
      await this.queue.onIdle();
      console.log('✅ Upload queue processed');
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Retry all failed uploads
   */
  async retryFailed(): Promise<void> {
    console.log('🔄 Retrying failed uploads...');

    const failedFiles = await cacheMetadataStore.getFilesByState('failed');

    for (const file of failedFiles) {
      // Reset upload attempts (give it a fresh start)
      await cacheMetadataStore.updateFileState(file.id, 'local-only', {
        uploadAttempts: 0,
        error: null,
      });

      // Add to queue
      await this.addToQueue(file, 1); // Higher priority for retries
    }

    console.log(`🔄 Queued ${failedFiles.length} failed uploads for retry`);
  }

  /**
   * Get pending uploads
   */
  async getPendingUploads(): Promise<CachedFile[]> {
    const localOnly = await cacheMetadataStore.getFilesByState('local-only');
    const uploading = await cacheMetadataStore.getFilesByState('uploading');
    return [...localOnly, ...uploading];
  }

  /**
   * Get failed uploads
   */
  async getFailedUploads(): Promise<CachedFile[]> {
    return await cacheMetadataStore.getFilesByState('failed');
  }

  /**
   * Upload a single file with retry logic
   */
  private async uploadFile(file: CachedFile): Promise<void> {
    const maxAttempts = DEFAULT_CACHE_CONFIG.retryConfig.maxAttempts;
    const delays = DEFAULT_CACHE_CONFIG.retryConfig.delays;

    console.log(`📤 Uploading: ${file.fileName} (attempt ${file.uploadAttempts + 1}/${maxAttempts})`);

    // Check network connectivity
    if (!this.networkInfo.isConnected) {
      console.log(`⏸️ Offline, skipping upload: ${file.fileName}`);
      return; // Will retry when back online
    }

    // Check file size limits based on network type
    if (this.networkInfo.type === 'cellular') {
      const maxSize = DEFAULT_CACHE_CONFIG.maxConcurrentUploads.cellular;
      if (file.fileSize > 5 * 1024 * 1024) {
        console.log(`⏸️ File too large for cellular, will wait for WiFi: ${file.fileName}`);
        return; // Don't mark as failed, just skip for now
      }
    }

    // Update state to uploading
    await cacheMetadataStore.updateFileState(file.id, 'uploading');

    try {
      // Verify file exists
      if (!file.localPath) {
        throw new Error('File has no local path');
      }

      const fileInfo = await FileSystem.getInfoAsync(file.localPath);
      if (!fileInfo.exists) {
        throw new Error('File does not exist');
      }

      // Upload to Supabase Storage
      const result = await this.uploadToSupabase(file);

      // Move file from pending to permanent cache location
      const cacheRoot = FileSystem.cacheDirectory!;
      const permanentDir = `${cacheRoot}${getCacheDirectoryForType(file.mimeType)}/`;
      const newPath = `${permanentDir}${file.id}-${file.fileName}`;

      // Ensure permanent directory exists
      const dirInfo = await FileSystem.getInfoAsync(permanentDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(permanentDir, { intermediates: true });
      }

      // Move file
      await FileSystem.moveAsync({
        from: file.localPath,
        to: newPath,
      });

      // Update metadata
      await cacheMetadataStore.updateFileState(file.id, 'synced', {
        cloudPath: result.path,
        publicUrl: result.publicUrl,
        uploadedAt: new Date().toISOString(),
        localPath: newPath,
        error: null,
      });

      console.log(`✅ Upload successful: ${file.fileName}`);
    } catch (error) {
      console.error(`❌ Upload failed: ${file.fileName}`, error);

      const newAttempts = file.uploadAttempts + 1;

      if (newAttempts >= maxAttempts) {
        // Max attempts reached, mark as failed
        await cacheMetadataStore.updateFileState(file.id, 'failed', {
          uploadAttempts: newAttempts,
          error: error instanceof Error ? error.message : 'Upload failed',
        });

        console.error(`❌ Max upload attempts reached for: ${file.fileName}`);
      } else {
        // Schedule retry with exponential backoff
        const delay = delays[newAttempts - 1] || delays[delays.length - 1];

        console.log(`🔄 Will retry in ${delay}ms: ${file.fileName}`);

        setTimeout(() => {
          cacheMetadataStore.updateFileState(file.id, 'local-only', {
            uploadAttempts: newAttempts,
            error: error instanceof Error ? error.message : 'Upload failed',
          }).then(() => {
            this.addToQueue(file, 1); // Higher priority for retries
          });
        }, delay);
      }
    }
  }

  /**
   * Upload file to Supabase Storage
   */
  private async uploadToSupabase(file: CachedFile): Promise<{
    path: string;
    publicUrl: string;
  }> {
    if (!supabase) {
      throw new Error('Supabase not configured');
    }

    // Read file as base64
    const base64 = await FileSystem.readAsStringAsync(file.localPath!, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Convert base64 to ArrayBuffer
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Generate storage path
    const storagePath = `${file.companyId}/${file.entityType}/${file.entityId}/${file.id}-${file.fileName}`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('buildtrack-files')
      .upload(storagePath, bytes.buffer, {
        contentType: file.mimeType,
        upsert: false,
      });

    if (error) {
      throw error;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('buildtrack-files')
      .getPublicUrl(storagePath);

    return {
      path: storagePath,
      publicUrl: urlData.publicUrl,
    };
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
   * Update network info and adjust queue concurrency
   */
  private updateNetworkInfo(state: any): void {
    const wasOffline = !this.networkInfo.isConnected;

    this.networkInfo = {
      type: this.mapNetworkType(state.type),
      isConnected: state.isConnected ?? false,
      isInternetReachable: state.isInternetReachable,
    };

    // Adjust queue concurrency based on network type
    if (this.networkInfo.type === 'wifi') {
      this.queue.concurrency = DEFAULT_CACHE_CONFIG.maxConcurrentUploads.wifi;
    } else if (this.networkInfo.type === 'cellular') {
      this.queue.concurrency = DEFAULT_CACHE_CONFIG.maxConcurrentUploads.cellular;
    }

    console.log(
      `📡 Network: ${this.networkInfo.type} (${this.networkInfo.isConnected ? 'connected' : 'offline'})`
    );

    // If we just came back online, retry pending uploads
    if (wasOffline && this.networkInfo.isConnected) {
      console.log('📡 Back online, processing pending uploads...');
      this.processPendingUploads();
    }
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
   * Process all pending uploads
   */
  private async processPendingUploads(): Promise<void> {
    const pending = await this.getPendingUploads();
    
    for (const file of pending) {
      if (file.state === 'local-only') {
        await this.addToQueue(file);
      }
    }
  }

  /**
   * Get queue statistics
   */
  getQueueStats(): {
    pending: number;
    concurrency: number;
    networkType: string;
    isConnected: boolean;
  } {
    return {
      pending: this.queue.size + this.queue.pending,
      concurrency: this.queue.concurrency,
      networkType: this.networkInfo.type,
      isConnected: this.networkInfo.isConnected,
    };
  }
}

// Singleton instance
export const uploadQueue = new UploadQueue();

