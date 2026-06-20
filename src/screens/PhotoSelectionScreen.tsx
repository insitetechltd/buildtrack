import React from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { Image as ExpoImage } from "expo-image";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";

import ModernUiMarker from "../components/migration/ModernUiMarker";
import { cn } from "../utils/cn";
import type { SelectedPhoto } from "../utils/usePhotoSelection";
import { usePhotoSelectionViewAdapter } from "../ui/viewAdapters/usePhotoSelectionViewAdapter";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const PHOTO_SIZE = (SCREEN_WIDTH - 48) / 3; // 3 columns with padding

interface PhotoSelectionScreenProps {
  taskId: string;
  subTaskId?: string;
  companyId: string;
  userId: string;
  initialCompletionPercentage: number;
  onNavigateBack: () => void;
  onNavigateToUpdateProgress?: (taskId: string, subTaskId?: string, initialCompletionPercentage?: number, uploadedPhotoUrls?: string[]) => void;
  onPhotosUploaded?: (photoUrls: string[]) => void; // Callback for when photos are uploaded (for UpdateProgressScreen - legacy)
  onPhotosSelected?: (photos: SelectedPhoto[]) => void; // Callback for when photos are selected (for CreateTaskScreen - new)
  initialPhotos?: SelectedPhoto[];
  entityType?: 'task' | 'task-update' | 'project' | 'user'; // Entity type for file upload path
  uploadImmediately?: boolean; // If true, upload immediately (for UpdateProgressScreen). If false, just return photos (for CreateTaskScreen)
}

export default function PhotoSelectionScreen(props: PhotoSelectionScreenProps) {
  const insets = useSafeAreaInsets();
  const topPadding = insets.top > 0 ? insets.top + 8 : 16;

  const {
    output,
    handleAddPhotos,
    handlePhotoPress,
    handleAnnotatePhoto,
    handleRemovePhoto,
    handleUploadPhotos,
    setEnlargedPhotoIndex,
  } = usePhotoSelectionViewAdapter(props);

  const {
    photos,
    enlargedPhotoIndex,
    isUploading,
    isAnnotating,
  } = output;

  const enlargedPhoto = enlargedPhotoIndex !== null ? photos[enlargedPhotoIndex] : null;

  return (
    <SafeAreaView edges={['bottom', 'left', 'right']} className="flex-1 bg-gray-50">
      <StatusBar style="dark" />
      
      {/* Header */}
      <View 
        className="flex-row items-center justify-between px-6 pb-4 bg-white border-b border-gray-200"
        style={{ paddingTop: topPadding }}
      >
        <Pressable
          onPress={props.onNavigateBack}
          className="flex-row items-center"
        >
          <Ionicons name="arrow-back" size={24} color="#374151" />
          <Text className="text-gray-700 text-base font-medium ml-2">Back</Text>
        </Pressable>
        
        <Text className="text-gray-900 text-lg font-semibold">
          Select Photos ({photos.length})
        </Text>
        
        <ModernUiMarker />
      </View>

      {/* Enlarged Photo View */}
      {enlargedPhotoIndex !== null && enlargedPhoto && (
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
                {enlargedPhotoIndex + 1} / {photos.length}
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
              <ExpoImage
                source={{ 
                  uri: enlargedPhoto.annotatedUri || enlargedPhoto.uri 
                }}
                cachePolicy="memory-disk"
                contentFit="contain"
                transition={120}
                style={{ width: SCREEN_WIDTH, height: '100%' }}
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
                      {enlargedPhoto.isAnnotated ? "Re-annotate" : "Annotate"}
                    </Text>
                  </>
                )}
              </Pressable>
              
              {enlargedPhoto.isAnnotated && (
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
        {photos.length === 0 ? (
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
                {photos.map((photo, index) => (
                  <Pressable
                    key={photo.id || index}
                    onPress={() => handlePhotoPress(index)}
                    className="relative"
                    style={{ width: PHOTO_SIZE, height: PHOTO_SIZE }}
                  >
                    <ExpoImage
                      source={{ uri: photo.annotatedUri || photo.uri }}
                      cachePolicy="memory-disk"
                      contentFit="cover"
                      transition={120}
                      style={{ width: PHOTO_SIZE, height: PHOTO_SIZE, borderRadius: 8 }}
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
                  disabled={isUploading || photos.length === 0}
                  className={cn(
                    "flex-1 rounded-xl py-3 px-4 flex-row items-center justify-center",
                    isUploading || photos.length === 0
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
                      {props.uploadImmediately !== false ? (
                        <>
                          <Ionicons name="cloud-upload-outline" size={18} color="white" />
                          <Text className="text-white text-base font-semibold ml-2">
                            Upload {photos.length} Photo{photos.length !== 1 ? 's' : ''}
                          </Text>
                        </>
                      ) : (
                        <>
                          <Ionicons name="checkmark-circle-outline" size={18} color="white" />
                          <Text className="text-white text-base font-semibold ml-2">
                            Done ({photos.length} Photo{photos.length !== 1 ? 's' : ''})
                          </Text>
                        </>
                      )}
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
