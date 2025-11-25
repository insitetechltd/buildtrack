import * as ImageManipulator from 'expo-image-manipulator';
// Use legacy API to avoid deprecation warnings
import * as FileSystem from 'expo-file-system/legacy';

/**
 * Image Compression Service
 * Automatically compresses images to ensure they're under 5MB
 */

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB in bytes
const MAX_IMAGE_WIDTH = 1920; // Max width for images
const MAX_IMAGE_HEIGHT = 1920; // Max height for images
const INITIAL_QUALITY = 0.8; // Initial compression quality (80%)
const MIN_QUALITY = 0.3; // Minimum quality we'll go (30%)

export interface CompressionResult {
  uri: string;
  width: number;
  height: number;
  size: number;
  originalSize: number;
  compressionRatio: number; // e.g., 0.3 means compressed to 30% of original
}

/**
 * Get file size from URI
 */
async function getFileSize(uri: string): Promise<number> {
  try {
    const fileInfo = await FileSystem.getInfoAsync(uri);
    if (fileInfo.exists && 'size' in fileInfo) {
      return fileInfo.size;
    }
    return 0;
  } catch (error) {
    console.error('Error getting file size:', error);
    return 0;
  }
}

/**
 * Compress image to be under target size
 * Uses adaptive compression - tries different quality levels until size is acceptable
 */
export async function compressImage(
  uri: string,
  targetSizeBytes: number = MAX_FILE_SIZE
): Promise<CompressionResult> {
  try {
    // Get original file size
    const originalSize = await getFileSize(uri);
    
    // If already under target size and reasonable dimensions, return as-is
    if (originalSize <= targetSizeBytes && originalSize > 0) {
      const imageInfo = await ImageManipulator.manipulateAsync(uri, [], {
        compress: 1,
        format: ImageManipulator.SaveFormat.JPEG,
      });
      
      // Still check dimensions
      if (imageInfo.width <= MAX_IMAGE_WIDTH && imageInfo.height <= MAX_IMAGE_HEIGHT) {
        console.log('✅ Image already optimal:', {
          size: `${(originalSize / 1024 / 1024).toFixed(2)}MB`,
          dimensions: `${imageInfo.width}x${imageInfo.height}`
        });
        
        return {
          uri,
          width: imageInfo.width,
          height: imageInfo.height,
          size: originalSize,
          originalSize,
          compressionRatio: 1.0,
        };
      }
    }

    console.log('📦 Compressing image...', {
      originalSize: `${(originalSize / 1024 / 1024).toFixed(2)}MB`,
      target: `${(targetSizeBytes / 1024 / 1024).toFixed(2)}MB`
    });

    // Step 1: Resize if dimensions are too large
    let resizeActions: ImageManipulator.Action[] = [];
    
    // Get image info to check dimensions
    const tempResult = await ImageManipulator.manipulateAsync(uri, [], {
      compress: 1,
      format: ImageManipulator.SaveFormat.JPEG,
    });
    
    if (tempResult.width > MAX_IMAGE_WIDTH || tempResult.height > MAX_IMAGE_HEIGHT) {
      // Calculate resize ratio
      const widthRatio = MAX_IMAGE_WIDTH / tempResult.width;
      const heightRatio = MAX_IMAGE_HEIGHT / tempResult.height;
      const ratio = Math.min(widthRatio, heightRatio);
      
      resizeActions.push({
        resize: {
          width: Math.round(tempResult.width * ratio),
          height: Math.round(tempResult.height * ratio),
        },
      });
      
      console.log('📐 Resizing:', {
        from: `${tempResult.width}x${tempResult.height}`,
        to: `${Math.round(tempResult.width * ratio)}x${Math.round(tempResult.height * ratio)}`,
        ratio: ratio.toFixed(2)
      });
    }

    // Step 2: Apply compression with adaptive quality
    let quality = INITIAL_QUALITY;
    let compressed = await ImageManipulator.manipulateAsync(
      uri,
      resizeActions,
      {
        compress: quality,
        format: ImageManipulator.SaveFormat.JPEG,
      }
    );

    let compressedSize = await getFileSize(compressed.uri);

    // Step 3: If still too large, reduce quality iteratively
    let attempts = 0;
    const maxAttempts = 5;
    
    while (compressedSize > targetSizeBytes && quality > MIN_QUALITY && attempts < maxAttempts) {
      attempts++;
      
      // Reduce quality by 15% each iteration
      quality = Math.max(MIN_QUALITY, quality - 0.15);
      
      console.log(`🔄 Attempt ${attempts}: Trying quality ${(quality * 100).toFixed(0)}%`);
      
      // Delete previous attempt to free memory
      try {
        await FileSystem.deleteAsync(compressed.uri, { idempotent: true });
      } catch (e) {
        // Ignore deletion errors
      }
      
      compressed = await ImageManipulator.manipulateAsync(
        uri,
        resizeActions,
        {
          compress: quality,
          format: ImageManipulator.SaveFormat.JPEG,
        }
      );
      
      compressedSize = await getFileSize(compressed.uri);
      
      console.log(`   Result: ${(compressedSize / 1024 / 1024).toFixed(2)}MB`);
    }

    // Final check
    if (compressedSize > targetSizeBytes) {
      console.warn('⚠️ Could not compress below target size', {
        final: `${(compressedSize / 1024 / 1024).toFixed(2)}MB`,
        target: `${(targetSizeBytes / 1024 / 1024).toFixed(2)}MB`,
        quality: `${(quality * 100).toFixed(0)}%`
      });
      
      // If still too large, try one more aggressive resize
      if (compressedSize > targetSizeBytes * 1.2) { // 20% over target
        console.log('🔥 Applying aggressive resize...');
        
        try {
          await FileSystem.deleteAsync(compressed.uri, { idempotent: true });
        } catch (e) {
          // Ignore
        }
        
        // Reduce dimensions by 30%
        const aggressiveResize: ImageManipulator.Action[] = [
          {
            resize: {
              width: Math.round(compressed.width * 0.7),
              height: Math.round(compressed.height * 0.7),
            },
          },
        ];
        
        compressed = await ImageManipulator.manipulateAsync(
          uri,
          aggressiveResize,
          {
            compress: MIN_QUALITY,
            format: ImageManipulator.SaveFormat.JPEG,
          }
        );
        
        compressedSize = await getFileSize(compressed.uri);
      }
    }

    const compressionRatio = originalSize > 0 ? compressedSize / originalSize : 1.0;

    console.log('✅ Compression complete:', {
      originalSize: `${(originalSize / 1024 / 1024).toFixed(2)}MB`,
      compressedSize: `${(compressedSize / 1024 / 1024).toFixed(2)}MB`,
      savings: `${((1 - compressionRatio) * 100).toFixed(1)}%`,
      dimensions: `${compressed.width}x${compressed.height}`,
      quality: `${(quality * 100).toFixed(0)}%`
    });

    return {
      uri: compressed.uri,
      width: compressed.width,
      height: compressed.height,
      size: compressedSize,
      originalSize,
      compressionRatio,
    };
  } catch (error) {
    console.error('Error compressing image:', error);
    throw new Error(`Image compression failed: ${error.message}`);
  }
}

/**
 * Compress multiple images in parallel
 */
export async function compressImages(
  uris: string[],
  targetSizeBytes: number = MAX_FILE_SIZE
): Promise<CompressionResult[]> {
  console.log(`📦 Compressing ${uris.length} images...`);
  
  const results = await Promise.all(
    uris.map(uri => compressImage(uri, targetSizeBytes))
  );
  
  const totalOriginal = results.reduce((sum, r) => sum + r.originalSize, 0);
  const totalCompressed = results.reduce((sum, r) => sum + r.size, 0);
  const totalSavings = ((1 - totalCompressed / totalOriginal) * 100).toFixed(1);
  
  console.log('✅ Batch compression complete:', {
    images: results.length,
    totalOriginal: `${(totalOriginal / 1024 / 1024).toFixed(2)}MB`,
    totalCompressed: `${(totalCompressed / 1024 / 1024).toFixed(2)}MB`,
    totalSavings: `${totalSavings}%`
  });
  
  return results;
}

/**
 * Check if a file needs compression
 */
export async function needsCompression(
  uri: string,
  targetSizeBytes: number = MAX_FILE_SIZE
): Promise<boolean> {
  const size = await getFileSize(uri);
  return size > targetSizeBytes;
}

/**
 * Estimate compression result without actually compressing
 * (Useful for showing user what will happen)
 */
export async function estimateCompression(uri: string): Promise<{
  currentSize: number;
  estimatedSize: number;
  willCompress: boolean;
  estimatedSavings: string;
}> {
  const currentSize = await getFileSize(uri);
  const willCompress = currentSize > MAX_FILE_SIZE;
  
  // Rough estimate: 70% size reduction with compression
  const estimatedSize = willCompress ? Math.round(currentSize * 0.3) : currentSize;
  const savings = willCompress ? `${(((currentSize - estimatedSize) / currentSize) * 100).toFixed(0)}%` : '0%';
  
  return {
    currentSize,
    estimatedSize,
    willCompress,
    estimatedSavings: savings,
  };
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

