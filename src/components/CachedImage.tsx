import React, { useState, useEffect } from 'react';
import { View, Image, ImageProps, ImageStyle, StyleProp } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getCachedFileUri } from '../utils/useFileCache';

interface CachedImageProps extends Omit<ImageProps, 'source'> {
  uri: string;
  style?: StyleProp<ImageStyle>;
  className?: string;
  fallbackIcon?: keyof typeof Ionicons.glyphMap;
  fallbackColor?: string;
}

/**
 * CachedImage component that handles caching for images
 * Uses native Image component (which has basic caching) or expo-image if available
 * For now, uses React Native Image with the caching utility for better control
 */
export default function CachedImage({
  uri,
  style,
  className,
  fallbackIcon = 'image-outline',
  fallbackColor = '#9ca3af',
  onError,
  ...props
}: CachedImageProps) {
  const [cachedUri, setCachedUri] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (!uri) {
      setHasError(true);
      setIsLoading(false);
      return;
    }

    // For local URIs, use directly
    if (!uri.startsWith('http')) {
      setCachedUri(uri);
      setIsLoading(false);
      return;
    }

    // For remote images, get cached URI (for images, this returns original URI)
    // The native Image component will handle basic caching
    // Use a small delay to batch updates and reduce layout shifts
    const loadImage = async () => {
      try {
        const cached = await getCachedFileUri(uri, 'image/jpeg');
        setCachedUri(cached);
        setIsLoading(false);
      } catch (error) {
        console.error('Error getting cached image:', error);
        setCachedUri(uri); // Fallback to original
        setIsLoading(false);
      }
    };
    
    loadImage();
  }, [uri]);

  const handleError = (error: any) => {
    setHasError(true);
    setIsLoading(false);
    if (onError) {
      onError(error);
    }
  };

  // Show placeholder while loading to prevent layout shift
  if (isLoading || !cachedUri) {
    return (
      <View
        style={[
          style,
          { alignItems: 'center', justifyContent: 'center', backgroundColor: '#f3f4f6' },
        ]}
        className={className}
      >
        {isLoading ? (
          <View style={{ width: 20, height: 20, borderRadius: 4, backgroundColor: '#e5e7eb' }} />
        ) : (
          <Ionicons name={fallbackIcon} size={24} color={fallbackColor} />
        )}
      </View>
    );
  }

  if (hasError) {
    return (
      <View
        style={[
          style,
          { alignItems: 'center', justifyContent: 'center', backgroundColor: '#f3f4f6' },
        ]}
        className={className}
      >
        <Ionicons name={fallbackIcon} size={24} color={fallbackColor} />
      </View>
    );
  }

  return (
    <Image
      {...props}
      source={{ uri: cachedUri }}
      style={style}
      className={className}
      onError={handleError}
      onLoad={() => setIsLoading(false)}
    />
  );
}

