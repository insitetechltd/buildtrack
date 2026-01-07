import React, { useState, useEffect } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
  Dimensions,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import Constants from 'expo-constants';
import IMGLYEditor, {
  EditorPreset,
  EditorSettingsModel,
  SourceType,
} from '@imgly/editor-react-native';
import * as FileSystem from 'expo-file-system';
import { uploadFileWithVerification } from "../api/fileUploadService";
import { cn } from "../utils/cn";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const PHOTO_SIZE = (SCREEN_WIDTH - 48) / 3; // 3 columns with padding

interface SelectedPhoto {
  uri: string;
  fileName: string;
  isAnnotated: boolean;
  annotatedUri?: string;
}

interface PhotoSelectionScreenProps {
  taskId: string;
  subTaskId?: string;
  companyId: string;
  userId: string;
  initialCompletionPercentage: number;
  onNavigateBack: () => void;
  onNavigateToUpdateProgress?: (taskId: string, subTaskId?: string, initialCompletionPercentage?: number) => void;
  onPhotosUploaded?: (photoUrls: string[]) => void; // Callback for when photos are uploaded (for CreateTaskScreen)
  initialPhotos?: SelectedPhoto[];
}

export default function PhotoSelectionScreen({
  taskId,
  subTaskId,
  companyId,
  userId,
  initialCompletionPercentage,
  onNavigateBack,
  onNavigateToUpdateProgress,
  onPhotosUploaded,
  initialPhotos = [],
}: PhotoSelectionScreenProps) {
  const [selectedPhotos, setSelectedPhotos] = useState<SelectedPhoto[]>(initialPhotos);
  const [enlargedPhotoIndex, setEnlargedPhotoIndex] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isAnnotating, setIsAnnotating] = useState(false);
  const insets = useSafeAreaInsets();
  const topPadding = insets.top > 0 ? insets.top + 8 : 16;

  const handleAddPhotos = async () => {
    Alert.alert(
      "Add Photos",
      "Choose how you want to add photos",
      [
        {
          text: "Take Photo",
          onPress: async () => {
            try {
              const { status } = await ImagePicker.requestCameraPermissionsAsync();
              if (status !== 'granted') {
                Alert.alert('Permission Denied', 'Camera permission is required to take photos.');
                return;
              }

              const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images as any,
                allowsEditing: false,
                quality: 0.8,
              });

              if (result.canceled || !result.assets || result.assets.length === 0) {
                return;
              }

              const asset = result.assets[0];
              setSelectedPhotos(prev => [...prev, {
                uri: asset.uri,
                fileName: asset.fileName || `photo_${Date.now()}.jpg`,
                isAnnotated: false,
              }]);
            } catch (error: any) {
              console.error('Failed to take photo:', error);
              Alert.alert("Error", "Failed to take photo");
            }
          },
        },
        {
          text: "Choose from Library",
          onPress: async () => {
            try {
              const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
              if (status !== 'granted') {
                Alert.alert('Permission Denied', 'Photo library permission is required.');
                return;
              }

              const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images as any,
                allowsMultipleSelection: true,
                quality: 0.8,
              });

              if (result.canceled || !result.assets || result.assets.length === 0) {
                return;
              }

              const newPhotos: SelectedPhoto[] = result.assets.map(asset => ({
                uri: asset.uri,
                fileName: asset.fileName || `photo_${Date.now()}_${Math.random()}.jpg`,
                isAnnotated: false,
              }));

              setSelectedPhotos(prev => [...prev, ...newPhotos]);
            } catch (error: any) {
              console.error('Failed to pick images:', error);
              Alert.alert("Error", "Failed to pick images");
            }
          },
        },
        {
          text: "Cancel",
          style: "cancel",
        },
      ]
    );
  };

  const handlePhotoPress = (index: number) => {
    setEnlargedPhotoIndex(index);
  };

  const handleAnnotatePhoto = async (index: number) => {
    const photo = selectedPhotos[index];
    console.log('📝 [PhotoSelection] Annotate button pressed for photo:', index, photo.uri);
    
    try {
      setIsAnnotating(true);
      
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
      const settings = new EditorSettingsModel({
        license: null, // Replace with your license key for production
        userId: 'user-' + Date.now(),
      });

      console.log('🎨 [PhotoSelection] Opening editor for photo:', photo.uri);

      // Open the editor with the photo
      const result = await IMGLYEditor.openEditor(
        settings,
        {
          source: photo.uri,
          type: SourceType.IMAGE,
        },
        EditorPreset.PHOTO,
      );

      if (result && result.source) {
        const annotatedUri = result.source as string;
        let finalUri = annotatedUri;
        
        // Copy to cache directory for persistence if needed
        if (annotatedUri.startsWith('file://')) {
          const fileName = `annotated_${Date.now()}.jpg`;
          const cacheUri = `${FileSystem.cacheDirectory}${fileName}`;
          await FileSystem.copyAsync({
            from: annotatedUri,
            to: cacheUri,
          });
          finalUri = cacheUri;
        }

        // Update the photo with annotated version
        setSelectedPhotos(prev => {
          const updated = [...prev];
          if (updated[index]) {
            updated[index] = {
              ...updated[index],
              isAnnotated: true,
              annotatedUri: finalUri,
            };
          }
          return updated;
        });
        
        console.log('✅ [PhotoSelection] Photo annotated successfully:', finalUri);
      }
    } catch (error: any) {
      console.error('❌ [PhotoSelection] Error annotating photo:', error);
      Alert.alert(
        'Error',
        error.message || 'Failed to open annotation editor. Please make sure you are using a development build.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsAnnotating(false);
    }
  };

  const handleRemovePhoto = (index: number) => {
    Alert.alert(
      "Remove Photo",
      "Are you sure you want to remove this photo?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => {
            setSelectedPhotos(prev => prev.filter((_, i) => i !== index));
            if (enlargedPhotoIndex === index) {
              setEnlargedPhotoIndex(null);
            } else if (enlargedPhotoIndex !== null && enlargedPhotoIndex > index) {
              setEnlargedPhotoIndex(enlargedPhotoIndex - 1);
            }
          },
        },
      ]
    );
  };

  const handleUploadPhotos = async () => {
    if (selectedPhotos.length === 0) {
      Alert.alert("No Photos", "Please add at least one photo to upload.");
      return;
    }

    setIsUploading(true);
    let successCount = 0;
    let failCount = 0;
    const uploadedUrls: string[] = [];

    try {
      for (const photo of selectedPhotos) {
        try {
          // Use annotated URI if available, otherwise use original
          const uriToUpload = photo.annotatedUri || photo.uri;
          const result = await uploadFileWithVerification({
            file: {
              uri: uriToUpload,
              name: photo.fileName,
              type: 'image/jpeg',
            },
            entityType: 'task-update',
            entityId: taskId,
            companyId: companyId,
            userId: userId,
          });

          if (result.success && result.file) {
            successCount++;
            uploadedUrls.push(result.file.public_url);
          } else {
            failCount++;
          }
        } catch (error: any) {
          console.error('Failed to upload photo:', error);
          failCount++;
        }
      }

      if (successCount > 0) {
        // If onPhotosUploaded callback is provided (e.g., from CreateTaskScreen), use it
        if (onPhotosUploaded) {
          onPhotosUploaded(uploadedUrls);
          onNavigateBack();
        } else if (onNavigateToUpdateProgress) {
          // Navigate to update progress screen (default behavior for TaskDetailScreen)
          onNavigateToUpdateProgress(taskId, subTaskId, initialCompletionPercentage);
        } else {
          // Just go back if neither callback is provided
          onNavigateBack();
        }
      } else {
        Alert.alert("Upload Failed", "All photos failed to upload. Please try again.");
      }

      if (failCount > 0 && successCount > 0) {
        Alert.alert(
          "Partial Upload",
          `${successCount} photo(s) uploaded successfully, ${failCount} failed.`
        );
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      Alert.alert("Error", "Failed to upload photos. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <SafeAreaView edges={['bottom', 'left', 'right']} className="flex-1 bg-gray-50">
      <StatusBar style="dark" />
      
      {/* Header */}
      <View 
        className="flex-row items-center justify-between px-6 pb-4 bg-white border-b border-gray-200"
        style={{ paddingTop: topPadding }}
      >
        <Pressable
          onPress={onNavigateBack}
          className="flex-row items-center"
        >
          <Ionicons name="arrow-back" size={24} color="#374151" />
          <Text className="text-gray-700 text-base font-medium ml-2">Back</Text>
        </Pressable>
        
        <Text className="text-gray-900 text-lg font-semibold">
          Select Photos ({selectedPhotos.length})
        </Text>
        
        <View style={{ width: 80 }} />
      </View>

      {/* Enlarged Photo View */}
      {enlargedPhotoIndex !== null && selectedPhotos[enlargedPhotoIndex] && (
        <View className="absolute inset-0 bg-black z-50">
          <SafeAreaView edges={['top']} className="flex-1">
            {/* Header */}
            <View 
              className="flex-row items-center justify-between px-6 py-4 bg-black/80"
              style={{ paddingTop: topPadding }}
            >
              <Pressable
                onPress={() => setEnlargedPhotoIndex(null)}
                className="flex-row items-center"
              >
                <Ionicons name="arrow-back" size={24} color="white" />
                <Text className="text-white text-base font-medium ml-2">Back</Text>
              </Pressable>
              
              <Text className="text-white text-base font-medium">
                {enlargedPhotoIndex + 1} / {selectedPhotos.length}
              </Text>
              
              <Pressable
                onPress={() => handleRemovePhoto(enlargedPhotoIndex)}
                className="p-2"
              >
                <Ionicons name="trash-outline" size={24} color="white" />
              </Pressable>
            </View>

            {/* Photo */}
            <View className="flex-1 items-center justify-center">
              <Image
                source={{ 
                  uri: selectedPhotos[enlargedPhotoIndex].annotatedUri || 
                        selectedPhotos[enlargedPhotoIndex].uri 
                }}
                style={{ width: SCREEN_WIDTH, height: '100%' }}
                resizeMode="contain"
              />
            </View>

            {/* Bottom Actions */}
            <View className="px-6 py-4 bg-black/80">
              <Pressable
                onPress={() => handleAnnotatePhoto(enlargedPhotoIndex)}
                disabled={isAnnotating}
                className={cn(
                  "rounded-xl py-4 px-6 flex-row items-center justify-center mb-3",
                  isAnnotating ? "bg-gray-600" : "bg-blue-600"
                )}
              >
                {isAnnotating ? (
                  <>
                    <ActivityIndicator size="small" color="white" />
                    <Text className="text-white text-base font-semibold ml-2">
                      Opening Editor...
                    </Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="create-outline" size={20} color="white" />
                    <Text className="text-white text-base font-semibold ml-2">
                      {selectedPhotos[enlargedPhotoIndex].isAnnotated ? "Re-annotate" : "Annotate"}
                    </Text>
                  </>
                )}
              </Pressable>
              
              {selectedPhotos[enlargedPhotoIndex].isAnnotated && (
                <View className="bg-green-600 rounded-xl py-2 px-4 flex-row items-center justify-center">
                  <Ionicons name="checkmark-circle" size={16} color="white" />
                  <Text className="text-white text-sm font-medium ml-1">
                    Photo has been annotated
                  </Text>
                </View>
              )}
            </View>
          </SafeAreaView>
        </View>
      )}

      {/* Main Content */}
      <View className="flex-1">
        {selectedPhotos.length === 0 ? (
          <View className="flex-1 items-center justify-center px-6">
            <Ionicons name="images-outline" size={64} color="#9ca3af" />
            <Text className="text-xl font-semibold text-gray-900 mt-4 text-center">
              No Photos Selected
            </Text>
            <Text className="text-base text-gray-600 mt-2 text-center">
              Add photos to get started. You can annotate them before uploading.
            </Text>
            <Pressable
              onPress={handleAddPhotos}
              className="bg-blue-600 rounded-xl py-4 px-8 mt-6 flex-row items-center"
            >
              <Ionicons name="add" size={20} color="white" />
              <Text className="text-white text-base font-semibold ml-2">Add Photos</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {/* Photo Grid */}
            <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }}>
              <View className="flex-row flex-wrap" style={{ gap: 8 }}>
                {selectedPhotos.map((photo, index) => (
                  <Pressable
                    key={index}
                    onPress={() => handlePhotoPress(index)}
                    className="relative"
                    style={{ width: PHOTO_SIZE, height: PHOTO_SIZE }}
                  >
                    <Image
                      source={{ uri: photo.annotatedUri || photo.uri }}
                      style={{ width: PHOTO_SIZE, height: PHOTO_SIZE, borderRadius: 8 }}
                      resizeMode="cover"
                    />
                    {photo.isAnnotated && (
                      <View className="absolute top-2 right-2 bg-green-600 rounded-full p-1">
                        <Ionicons name="checkmark" size={12} color="white" />
                      </View>
                    )}
                    <View className="absolute bottom-2 right-2 bg-black/60 rounded-full p-1">
                      <Ionicons name="expand" size={12} color="white" />
                    </View>
                  </Pressable>
                ))}
              </View>
            </ScrollView>

            {/* Bottom Action Bar */}
            <View className="bg-white border-t border-gray-200 px-6 py-4">
              <View className="flex-row gap-3">
                <Pressable
                  onPress={handleAddPhotos}
                  className="flex-1 bg-gray-100 rounded-xl py-3 px-4 flex-row items-center justify-center"
                >
                  <Ionicons name="add" size={18} color="#374151" />
                  <Text className="text-gray-700 text-base font-semibold ml-2">Add More</Text>
                </Pressable>
                
                <Pressable
                  onPress={handleUploadPhotos}
                  disabled={isUploading || selectedPhotos.length === 0}
                  className={cn(
                    "flex-1 rounded-xl py-3 px-4 flex-row items-center justify-center",
                    isUploading || selectedPhotos.length === 0
                      ? "bg-gray-300"
                      : "bg-blue-600"
                  )}
                >
                  {isUploading ? (
                    <>
                      <ActivityIndicator size="small" color="white" />
                      <Text className="text-white text-base font-semibold ml-2">Uploading...</Text>
                    </>
                  ) : (
                    <>
                      <Ionicons name="cloud-upload-outline" size={18} color="white" />
                      <Text className="text-white text-base font-semibold ml-2">
                        Upload {selectedPhotos.length} Photo{selectedPhotos.length !== 1 ? 's' : ''}
                      </Text>
                    </>
                  )}
                </Pressable>
              </View>
            </View>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

