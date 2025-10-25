/**
 * useFileCache Hook
 * 
 * React hook for interacting with the file caching system
 * Provides all caching functionality to components
 */

import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import {
  cacheManager,
  uploadQueue,
  syncManager,
  CachedFile,
  CacheStats,
  ClearCacheOptions,
} from '../services/cache';
import { compressImage } from '../api/imageCompressionService';

export function useFileCache() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressionProgress, setCompressionProgress] = useState(0);
  const [cacheStats, setCacheStats] = useState<CacheStats | null>(null);

  /**
   * Initialize the cache system
   */
  useEffect(() => {
    initializeCache();
  }, []);

  /**
   * Initialize cache manager
   */
  const initializeCache = useCallback(async () => {
    try {
      await cacheManager.initialize();
      setIsInitialized(true);

      // Load initial stats
      const stats = await cacheManager.getStats();
      setCacheStats(stats);
    } catch (error) {
      console.error('Failed to initialize cache:', error);
      Alert.alert('Cache Error', 'Failed to initialize local cache');
    }
  }, []);

  /**
   * Refresh cache statistics
   */
  const refreshStats = useCallback(async () => {
    try {
      const stats = await cacheManager.getStats();
      setCacheStats(stats);
    } catch (error) {
      console.error('Failed to refresh cache stats:', error);
    }
  }, []);

  /**
   * Pick and cache images (with compression)
   */
  const pickAndCacheImages = useCallback(
    async (
      metadata: {
        entityType: string;
        entityId: string;
        uploadedBy: string;
        companyId: string;
      },
      source: 'camera' | 'library' = 'library'
    ): Promise<CachedFile[]> => {
      try {
        let result;

        if (source === 'camera') {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== 'granted') {
            Alert.alert('Permission Denied', 'Camera permission is required to take photos.');
            return [];
          }

          result = await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images as any,
            allowsEditing: false,
            quality: 0.8,
          });
        } else {
          const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (status !== 'granted') {
            Alert.alert('Permission Denied', 'Photo library permission is required.');
            return [];
          }

          result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images as any,
            allowsMultipleSelection: true,
            quality: 0.8,
          });
        }

        if (result.canceled || !result.assets || result.assets.length === 0) {
          return [];
        }

        console.log(`📸 Selected ${result.assets.length} image(s)`);

        // Compress images
        setIsCompressing(true);
        setCompressionProgress(0);

        const compressedImages = [];
        for (let i = 0; i < result.assets.length; i++) {
          const asset = result.assets[i];
          setCompressionProgress(((i + 1) / result.assets.length) * 100);

          try {
            const compressed = await compressImage(asset.uri, 5 * 1024 * 1024);
            compressedImages.push({
              uri: compressed.uri,
              fileName: asset.fileName || `image-${Date.now()}-${i}.jpg`,
              mimeType: 'image/jpeg',
            });
          } catch (error) {
            console.error(`Failed to compress image ${i + 1}:`, error);
            Alert.alert('Compression Failed', `Failed to compress image ${i + 1}`);
          }
        }

        setIsCompressing(false);
        setCompressionProgress(0);

        if (compressedImages.length === 0) {
          return [];
        }

        // Cache images locally
        setIsUploading(true);
        setUploadProgress(0);

        const cachedFiles: CachedFile[] = [];

        for (let i = 0; i < compressedImages.length; i++) {
          const image = compressedImages[i];
          setUploadProgress(((i + 1) / compressedImages.length) * 100);

          try {
            const result = await cacheManager.cacheFile(image.uri, {
              fileName: image.fileName,
              mimeType: image.mimeType,
              ...metadata,
            });

            if (result.success && result.data) {
              cachedFiles.push(result.data);

              // Add to upload queue
              await uploadQueue.addToQueue(result.data);
            } else {
              console.error('Failed to cache image:', result.error);
              Alert.alert('Cache Error', `Failed to cache ${image.fileName}`);
            }
          } catch (error) {
            console.error('Failed to cache image:', error);
          }
        }

        setIsUploading(false);
        setUploadProgress(0);

        // Refresh stats
        await refreshStats();

        return cachedFiles;
      } catch (error) {
        setIsUploading(false);
        setUploadProgress(0);
        setIsCompressing(false);
        setCompressionProgress(0);

        console.error('Image caching error:', error);
        Alert.alert('Error', 'Failed to cache images. Please try again.');
        return [];
      }
    },
    [refreshStats]
  );

  /**
   * Pick and cache documents
   */
  const pickAndCacheDocuments = useCallback(
    async (metadata: {
      entityType: string;
      entityId: string;
      uploadedBy: string;
      companyId: string;
    }): Promise<CachedFile[]> => {
      try {
        const result = await DocumentPicker.getDocumentAsync({
          type: '*/*',
          multiple: true,
          copyToCacheDirectory: true,
        });

        if (result.canceled || !result.assets) {
          return [];
        }

        // Check for oversized documents
        const oversized = result.assets.filter(asset => {
          const size = asset.size || 0;
          return size > 50 * 1024 * 1024; // 50MB limit
        });

        if (oversized.length > 0) {
          Alert.alert(
            'File Too Large',
            `${oversized.length} file(s) exceed the 50MB limit and cannot be uploaded.`
          );

          const validAssets = result.assets.filter(asset => {
            const size = asset.size || 0;
            return size <= 50 * 1024 * 1024;
          });

          if (validAssets.length === 0) {
            return [];
          }
        }

        setIsUploading(true);
        const cachedFiles: CachedFile[] = [];

        for (let i = 0; i < result.assets.length; i++) {
          const asset = result.assets[i];
          const size = asset.size || 0;

          // Skip oversized files
          if (size > 50 * 1024 * 1024) {
            continue;
          }

          setUploadProgress(((i + 1) / result.assets.length) * 100);

          try {
            const cacheResult = await cacheManager.cacheFile(asset.uri, {
              fileName: asset.name,
              mimeType: asset.mimeType || 'application/octet-stream',
              ...metadata,
            });

            if (cacheResult.success && cacheResult.data) {
              cachedFiles.push(cacheResult.data);

              // Add to upload queue
              await uploadQueue.addToQueue(cacheResult.data);
            } else {
              console.error('Failed to cache document:', cacheResult.error);
              Alert.alert('Cache Error', `Failed to cache ${asset.name}`);
            }
          } catch (error) {
            console.error(`Failed to cache ${asset.name}:`, error);
            Alert.alert('Cache Error', `Failed to cache ${asset.name}`);
          }
        }

        setIsUploading(false);
        setUploadProgress(0);

        // Refresh stats
        await refreshStats();

        return cachedFiles;
      } catch (error) {
        setIsUploading(false);
        setUploadProgress(0);
        console.error('Document caching error:', error);
        Alert.alert('Error', 'Failed to cache documents. Please try again.');
        return [];
      }
    },
    [refreshStats]
  );

  /**
   * Get cached file path
   */
  const getCachedFile = useCallback(async (id: string): Promise<string | null> => {
    return await cacheManager.getCachedFile(id);
  }, []);

  /**
   * Get file metadata
   */
  const getFileMetadata = useCallback(async (id: string): Promise<CachedFile | null> => {
    return await cacheManager.getFileMetadata(id);
  }, []);

  /**
   * Get files for entity
   */
  const getFilesForEntity = useCallback(
    async (entityType: string, entityId: string): Promise<CachedFile[]> => {
      return await cacheManager.getFilesForEntity(entityType, entityId);
    },
    []
  );

  /**
   * Clear cache
   */
  const clearCache = useCallback(
    async (options?: ClearCacheOptions): Promise<void> => {
      try {
        const result = await cacheManager.clearCache(options);

        if (result.success && result.data) {
          Alert.alert(
            'Cache Cleared',
            `Removed ${result.data.filesRemoved} files, freed ${formatBytes(result.data.bytesFreed)}`
          );
          await refreshStats();
        } else {
          Alert.alert('Error', result.error || 'Failed to clear cache');
        }
      } catch (error) {
        console.error('Failed to clear cache:', error);
        Alert.alert('Error', 'Failed to clear cache');
      }
    },
    [refreshStats]
  );

  /**
   * Retry failed uploads
   */
  const retryFailedUploads = useCallback(async (): Promise<void> => {
    try {
      await uploadQueue.retryFailed();
      Alert.alert('Retry Started', 'Failed uploads have been queued for retry');
      await refreshStats();
    } catch (error) {
      console.error('Failed to retry uploads:', error);
      Alert.alert('Error', 'Failed to retry uploads');
    }
  }, [refreshStats]);

  /**
   * Get pending uploads count
   */
  const getPendingUploadsCount = useCallback(async (): Promise<number> => {
    const pending = await uploadQueue.getPendingUploads();
    return pending.length;
  }, []);

  /**
   * Get failed uploads count
   */
  const getFailedUploadsCount = useCallback(async (): Promise<number> => {
    const failed = await uploadQueue.getFailedUploads();
    return failed.length;
  }, []);

  /**
   * Format bytes for display
   */
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  return {
    // State
    isInitialized,
    isUploading,
    uploadProgress,
    isCompressing,
    compressionProgress,
    cacheStats,
    isBusy: isUploading || isCompressing,

    // Methods
    pickAndCacheImages,
    pickAndCacheDocuments,
    getCachedFile,
    getFileMetadata,
    getFilesForEntity,
    clearCache,
    refreshStats,
    retryFailedUploads,
    getPendingUploadsCount,
    getFailedUploadsCount,
    formatBytes,
  };
}

