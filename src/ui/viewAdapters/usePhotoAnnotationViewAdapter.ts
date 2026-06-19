import { useState, useEffect, useCallback } from "react";
import { Alert } from "react-native";
import Constants from 'expo-constants';
import IMGLYEditor, {
  EditorPreset,
  EditorSettingsModel,
  SourceType,
} from '@imgly/editor-react-native';
// Use legacy API to avoid deprecation warnings
import * as FileSystem from 'expo-file-system/legacy';

import type { PhotoAnnotationScreenViewAdapterOutput } from "../contracts/viewAdapters";

export interface UsePhotoAnnotationViewAdapterProps {
  photoUri: string;
  onSave: (annotatedPhotoUri: string) => void;
  onCancel: () => void;
}

export function usePhotoAnnotationViewAdapter({
  photoUri,
  onSave,
  onCancel,
}: UsePhotoAnnotationViewAdapterProps): PhotoAnnotationScreenViewAdapterOutput {
  const [isLoading, setIsLoading] = useState(false);

  const openEditor = useCallback(async () => {
    try {
      console.log('🎨 [PhotoAnnotation] Opening editor with photo:', photoUri);
      setIsLoading(true);

      // Check if we're in Expo Go (which doesn't support native modules)
      const isExpoGo = Constants.executionEnvironment === 'storeClient';
      if (isExpoGo) {
        throw new Error('Photo annotation requires a development build. Expo Go does not support native modules like @imgly/editor-react-native. Please build a development build using: eas build --profile development --platform ios/android');
      }

      // Check if IMGLYEditor is available
      if (!IMGLYEditor) {
        throw new Error('IMGLY Editor is not available. Please use a development build.');
      }

      // Configure editor settings
      // Use null for license to run in evaluation mode (with watermark)
      // For production, you'll need to get a license from IMG.LY
      const settings = new EditorSettingsModel({
        license: undefined, // Replace with your license key for production
        userId: 'user-' + Date.now(), // Unique user ID
      });

      console.log('🎨 [PhotoAnnotation] Editor settings configured, opening editor...');

      // Open the editor with the photo
      const result = await IMGLYEditor.openEditor(
        settings,
        {
          source: photoUri,
          type: SourceType.IMAGE,
        },
        EditorPreset.PHOTO, // Use PHOTO preset for drawing and text tools
      );

      console.log('🎨 [PhotoAnnotation] Editor closed with result:', result);

      const resultSource = (result as any)?.source as string | undefined;

      if (result && resultSource) {
        // Save the annotated image
        // The result.source contains the URI of the edited image
        const annotatedUri = resultSource;
        
        // If the result is a local file path, we can use it directly
        // Otherwise, we might need to copy it to our cache directory
        let finalUri = annotatedUri;
        
        // Check if we need to copy the file to a permanent location
        if (annotatedUri.startsWith('file://')) {
          // Copy to cache directory for persistence
          const fileName = `annotated_${Date.now()}.jpg`;
          const cacheUri = `${FileSystem.cacheDirectory}${fileName}`;
          await FileSystem.copyAsync({
            from: annotatedUri,
            to: cacheUri,
          });
          finalUri = cacheUri;
        }

        setIsLoading(false);
        onSave(finalUri);
      } else {
        setIsLoading(false);
        // User cancelled
        onCancel();
      }
    } catch (error: any) {
      console.error('Error opening photo editor:', error);
      setIsLoading(false);
      Alert.alert(
        'Error',
        error.message || 'Failed to open photo editor. Please make sure you are using a development build.',
        [
          {
            text: 'OK',
            onPress: onCancel,
          },
        ]
      );
    }
  }, [photoUri, onSave, onCancel]);

  useEffect(() => {
    openEditor();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    screenId: "PhotoAnnotationScreen",
    readiness: {
      hasInitialFrame: true,
      hasUsableData: true,
      isBackgroundRefreshing: false,
      isNavigationTransitionActive: false,
    },
    continuity: {
      isInitialLoading: false,
      isBackgroundRefreshing: false,
      hasCachedFrame: true,
      shouldRenderSkeletonShell: false,
      shouldRenderEmptyState: false,
      freshnessLabel: "Just now",
    },
    isLoading,
  };
}
