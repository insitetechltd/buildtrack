import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Alert } from 'react-native';
import { uploadFileWithVerification, FileUploadOptions, FileAttachment, UploadResult } from '../api/fileUploadService';
import { compressImage, compressImages, formatFileSize } from '../api/imageCompressionService';
import { useUploadFailureStore } from '../state/uploadFailureStore';

export interface UploadResults {
  successful: FileAttachment[];
  failed: Array<{ fileName: string; error: string; originalFile: any }>;
}

export function useFileUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressionProgress, setCompressionProgress] = useState(0);
  const { addFailure } = useUploadFailureStore();

  /**
   * Pick and upload images from camera or gallery
   * Automatically compresses images to be under 5MB
   * Returns UploadResults with successful and failed uploads
   */
  const pickAndUploadImages = async (
    options: Omit<FileUploadOptions, 'file'>,
    source: 'camera' | 'library' = 'library'
  ): Promise<UploadResults> => {
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
          allowsEditing: false, // Don't allow editing - we'll compress instead
          quality: 0.8, // Initial quality
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
          quality: 0.8, // Initial quality
        });
      }

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return { successful: [], failed: [] };
      }

      console.log(`📸 Selected ${result.assets.length} image(s)`);

      // Step 1: Compress images
      setIsCompressing(true);
      setCompressionProgress(0);

      const compressedImages: Array<{
        uri: string;
        fileName: string;
        width: number;
        height: number;
        originalAsset: any;
      }> = [];

      for (let i = 0; i < result.assets.length; i++) {
        const asset = result.assets[i];
        setCompressionProgress(((i + 1) / result.assets.length) * 100);

        try {
          console.log(`🔄 Compressing image ${i + 1}/${result.assets.length}...`);
          
          // Compress the image
          const compressed = await compressImage(asset.uri, 5 * 1024 * 1024); // 5MB target

          compressedImages.push({
            uri: compressed.uri,
            fileName: asset.fileName || `image-${Date.now()}-${i}.jpg`,
            width: compressed.width,
            height: compressed.height,
            originalAsset: asset,
          });

          console.log(`✅ Image ${i + 1} compressed:`, {
            original: formatFileSize(compressed.originalSize),
            compressed: formatFileSize(compressed.size),
            savings: `${((1 - compressed.compressionRatio) * 100).toFixed(1)}%`
          });
        } catch (error) {
          console.error(`❌ Failed to compress image ${i + 1}:`, error);
          Alert.alert(
            'Compression Failed',
            `Failed to compress image ${i + 1}. It will be skipped.`
          );
        }
      }

      setIsCompressing(false);
      setCompressionProgress(0);

      if (compressedImages.length === 0) {
        Alert.alert('Error', 'No images could be processed. Please try again.');
        return { successful: [], failed: [] };
      }

      // Step 2: Upload compressed images with verification
      setIsUploading(true);
      setUploadProgress(0);

      const uploadedFiles: FileAttachment[] = [];
      const failedUploads: Array<{ fileName: string; error: string; originalFile: any }> = [];

      for (let i = 0; i < compressedImages.length; i++) {
        const compressed = compressedImages[i];
        setUploadProgress(((i + 1) / compressedImages.length) * 100);

        try {
          console.log(`📤 Uploading image ${i + 1}/${compressedImages.length}...`);

          const file = {
            uri: compressed.uri,
            name: compressed.fileName,
            type: 'image/jpeg', // Compressed images are always JPEG
          };

          // Upload with verification
          const result: UploadResult = await uploadFileWithVerification({ ...options, file });

          if (result.success && result.file) {
            uploadedFiles.push(result.file);
            console.log(`✅ Image ${i + 1} uploaded and verified successfully`);
          } else {
            // Upload failed or verification failed
            const errorMsg = result.error || 'Upload verification failed';
            console.error(`❌ Image ${i + 1} upload failed:`, errorMsg);
            
            failedUploads.push({
              fileName: compressed.fileName,
              error: errorMsg,
              originalFile: {
                uri: compressed.uri,
                name: compressed.fileName,
                type: 'image/jpeg',
              },
            });

            // Store failure in persistent store
            addFailure({
              taskId: options.entityId,
              fileName: compressed.fileName,
              fileUri: compressed.uri,
              fileType: 'image/jpeg',
              error: errorMsg,
              entityType: options.entityType,
              entityId: options.entityId,
              companyId: options.companyId,
              userId: options.userId,
            });
          }
        } catch (error: any) {
          const errorMsg = error.message || 'Unknown error';
          console.error(`❌ Failed to upload image ${i + 1}:`, errorMsg);
          
          failedUploads.push({
            fileName: compressed.fileName,
            error: errorMsg,
            originalFile: {
              uri: compressed.uri,
              name: compressed.fileName,
              type: 'image/jpeg',
            },
          });

          // Store failure in persistent store
          addFailure({
            taskId: options.entityId,
            fileName: compressed.fileName,
            fileUri: compressed.uri,
            fileType: 'image/jpeg',
            error: errorMsg,
            entityType: options.entityType,
            entityId: options.entityId,
            companyId: options.companyId,
            userId: options.userId,
          });
        }
      }

      setIsUploading(false);
      setUploadProgress(0);

      // Show summary alert
      if (uploadedFiles.length > 0 && failedUploads.length > 0) {
        Alert.alert(
          'Upload Complete',
          `${uploadedFiles.length} photo(s) uploaded successfully.\n${failedUploads.length} photo(s) failed - you can retry them below.`
        );
      } else if (uploadedFiles.length > 0) {
        console.log(`✅ Successfully uploaded ${uploadedFiles.length} image(s)`);
      } else if (failedUploads.length > 0) {
        Alert.alert(
          'Upload Failed',
          `All ${failedUploads.length} photo(s) failed to upload. Please check your connection and retry.`
        );
      }

      return {
        successful: uploadedFiles,
        failed: failedUploads,
      };
    } catch (error) {
      setIsUploading(false);
      setUploadProgress(0);
      setIsCompressing(false);
      setCompressionProgress(0);
      
      console.error('Image upload error:', error);
      Alert.alert('Upload Failed', 'Failed to upload images. Please try again.');
      return { successful: [], failed: [] };
    }
  };

  /**
   * Pick and upload images with size estimation
   * Shows user what will happen before compressing
   * Returns UploadResults with successful and failed uploads
   */
  const pickAndUploadImagesWithPreview = async (
    options: Omit<FileUploadOptions, 'file'>,
    source: 'camera' | 'library' = 'library'
  ): Promise<UploadResults> => {
    try {
      let result;

      if (source === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Denied', 'Camera permission is required to take photos.');
          return { successful: [], failed: [] };
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
          return { successful: [], failed: [] };
        }

        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images as any,
          allowsMultipleSelection: true,
          quality: 0.8,
        });
      }

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return { successful: [], failed: [] };
      }

      // Check if any images need compression
      const needsCompressionCheck = result.assets.some(asset => {
        const estimatedSize = asset.fileSize || 0;
        return estimatedSize > 5 * 1024 * 1024; // 5MB
      });

      if (needsCompressionCheck) {
        // Show compression warning
        return new Promise((resolve) => {
          Alert.alert(
            'Image Compression',
            'Some images are larger than 5MB and will be automatically compressed to ensure fast uploads. Image quality will remain high.',
            [
              {
                text: 'Cancel',
                style: 'cancel',
                onPress: () => resolve({ successful: [], failed: [] }),
              },
              {
                text: 'Continue',
                onPress: async () => {
                  const uploaded = await pickAndUploadImages(options, source);
                  resolve(uploaded);
                },
              },
            ]
          );
        });
      }

      // No compression needed, proceed directly
      return await pickAndUploadImages(options, source);
    } catch (error) {
      console.error('Image upload error:', error);
      Alert.alert('Upload Failed', 'Failed to upload images. Please try again.');
      return { successful: [], failed: [] };
    }
  };

  /**
   * Pick and upload documents (no compression for documents)
   */
  const pickAndUploadDocuments = async (
    options: Omit<FileUploadOptions, 'file'>
  ): Promise<FileAttachment[]> => {
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
          `${oversized.length} file(s) exceed the 50MB limit and cannot be uploaded. Please select smaller files.`
        );
        
        // Filter out oversized files
        const validAssets = result.assets.filter(asset => {
          const size = asset.size || 0;
          return size <= 50 * 1024 * 1024;
        });

        if (validAssets.length === 0) {
          return [];
        }
      }

      setIsUploading(true);
      const uploadedFiles: FileAttachment[] = [];

      for (let i = 0; i < result.assets.length; i++) {
        const asset = result.assets[i];
        const size = asset.size || 0;

        // Skip oversized files
        if (size > 50 * 1024 * 1024) {
          continue;
        }

        setUploadProgress(((i + 1) / result.assets.length) * 100);

        const file = {
          uri: asset.uri,
          name: asset.name,
          type: asset.mimeType || 'application/octet-stream',
        };

        try {
          const uploadedFile = await uploadFile({ ...options, file });
          uploadedFiles.push(uploadedFile);
        } catch (error) {
          console.error(`Failed to upload ${asset.name}:`, error);
          Alert.alert(
            'Upload Failed',
            `Failed to upload ${asset.name}. It will be skipped.`
          );
        }
      }

      setIsUploading(false);
      setUploadProgress(0);
      return uploadedFiles;
    } catch (error) {
      setIsUploading(false);
      setUploadProgress(0);
      console.error('Document upload error:', error);
      Alert.alert('Upload Failed', 'Failed to upload documents. Please try again.');
      return [];
    }
  };

  return {
    pickAndUploadImages,
    pickAndUploadImagesWithPreview,
    pickAndUploadDocuments,
    isUploading,
    uploadProgress,
    isCompressing,
    compressionProgress,
    isBusy: isUploading || isCompressing,
  };
}

