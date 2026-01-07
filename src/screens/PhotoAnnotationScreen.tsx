import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import Constants from 'expo-constants';
import IMGLYEditor, {
  EditorPreset,
  EditorSettingsModel,
  SourceType,
} from '@imgly/editor-react-native';
import * as FileSystem from 'expo-file-system';

interface PhotoAnnotationScreenProps {
  photoUri: string;
  onSave: (annotatedPhotoUri: string) => void;
  onCancel: () => void;
}

export default function PhotoAnnotationScreen({
  photoUri,
  onSave,
  onCancel,
}: PhotoAnnotationScreenProps) {
  const [isLoading, setIsLoading] = useState(false);
  const insets = useSafeAreaInsets();
  const topPadding = insets.top > 0 ? insets.top + 8 : 16;

  const openEditor = async () => {
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
        license: null, // Replace with your license key for production
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

      if (result && result.source) {
        // Save the annotated image
        // The result.source contains the URI of the edited image
        const annotatedUri = result.source as string;
        
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
  };

  // Open editor when component mounts
  React.useEffect(() => {
    openEditor();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <SafeAreaView edges={['bottom', 'left', 'right']} className="flex-1 bg-gray-50">
      <StatusBar style="dark" />
      
      {/* Header */}
      <View 
        className="flex-row items-center justify-between px-6 pb-4 bg-white border-b border-gray-200"
        style={{ paddingTop: topPadding }}
      >
        <Pressable
          onPress={onCancel}
          className="flex-row items-center"
        >
          <Ionicons name="arrow-back" size={24} color="#374151" />
          <Text className="text-gray-700 text-base font-medium ml-2">Cancel</Text>
        </Pressable>
        
        <Text className="text-gray-900 text-lg font-semibold">Annotate Photo</Text>
        
        <View style={{ width: 80 }} />
      </View>

      {/* Loading State */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text className="text-gray-600 mt-4">Opening editor...</Text>
        </View>
      ) : (
        <View className="flex-1 items-center justify-center px-6">
          <Ionicons name="create-outline" size={64} color="#3b82f6" />
          <Text className="text-xl font-semibold text-gray-900 mt-4 text-center">
            Photo Editor
          </Text>
          <Text className="text-base text-gray-600 mt-2 text-center">
            The photo editor will open in a moment. You can draw, add text, and annotate your photo.
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}

