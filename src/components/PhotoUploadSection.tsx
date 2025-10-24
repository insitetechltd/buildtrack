import React from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as Clipboard from "expo-clipboard";

interface PhotoUploadSectionProps {
  /** Array of photo URIs */
  photos: string[];
  /** Callback when photos are added */
  onPhotosChange: (photos: string[]) => void;
  /** Optional title for the section (default: "Photos") */
  title?: string;
  /** Optional empty state message (default: "No photos added") */
  emptyMessage?: string;
  /** Maximum number of photos allowed (default: unlimited) */
  maxPhotos?: number;
  /** Whether to show the photo count (default: false) */
  showCount?: boolean;
}

/**
 * Reusable photo upload component with:
 * - Take photo from camera
 * - Choose from library
 * - Paste from clipboard
 * - Photo previews with thumbnails
 * - Individual photo deletion
 * 
 * Used across the app for consistent photo upload UX.
 */
export const PhotoUploadSection: React.FC<PhotoUploadSectionProps> = ({
  photos,
  onPhotosChange,
  title = "Photos",
  emptyMessage = "No photos added",
  maxPhotos,
  showCount = false,
}) => {
  const handleAddPhotos = async () => {
    // Check if max photos limit reached
    if (maxPhotos && photos.length >= maxPhotos) {
      Alert.alert(
        "Limit Reached",
        `You can only upload up to ${maxPhotos} photo${maxPhotos > 1 ? "s" : ""}.`
      );
      return;
    }

    Alert.alert(
      "Add Photos",
      "Choose how you want to add photos",
      [
        {
          text: "Take Photo",
          onPress: async () => {
            try {
              const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
              
              if (!permissionResult.granted) {
                Alert.alert("Permission Required", "Camera permission is required to take photos.");
                return;
              }

              const result = await ImagePicker.launchCameraAsync({
                mediaTypes: "images" as ImagePicker.MediaType,
                allowsEditing: true,
                quality: 0.8,
              });

              if (!result.canceled && result.assets && result.assets.length > 0) {
                const newPhotos = result.assets.map(asset => asset.uri);
                const updatedPhotos = [...photos, ...newPhotos];
                
                // Respect max photos limit
                if (maxPhotos && updatedPhotos.length > maxPhotos) {
                  onPhotosChange(updatedPhotos.slice(0, maxPhotos));
                  Alert.alert(
                    "Limit Reached",
                    `Only the first ${maxPhotos} photo${maxPhotos > 1 ? "s" : ""} were added.`
                  );
                } else {
                  onPhotosChange(updatedPhotos);
                }
              }
            } catch (error) {
              console.error("Camera error:", error);
              Alert.alert("Error", "Failed to take photo");
            }
          },
        },
        {
          text: "Choose from Library",
          onPress: async () => {
            try {
              const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
              
              if (!permissionResult.granted) {
                Alert.alert("Permission Required", "Gallery permission is required to choose photos.");
                return;
              }

              const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: "images" as ImagePicker.MediaType,
                allowsMultipleSelection: true,
                quality: 0.8,
              });

              if (!result.canceled && result.assets && result.assets.length > 0) {
                const newPhotos = result.assets.map(asset => asset.uri);
                const updatedPhotos = [...photos, ...newPhotos];
                
                // Respect max photos limit
                if (maxPhotos && updatedPhotos.length > maxPhotos) {
                  onPhotosChange(updatedPhotos.slice(0, maxPhotos));
                  Alert.alert(
                    "Limit Reached",
                    `Only the first ${maxPhotos} photo${maxPhotos > 1 ? "s" : ""} were added.`
                  );
                } else {
                  onPhotosChange(updatedPhotos);
                }
              }
            } catch (error) {
              console.error("Gallery error:", error);
              Alert.alert("Error", "Failed to select photos");
            }
          },
        },
        {
          text: "Paste from Clipboard",
          onPress: async () => {
            try {
              const hasImage = await Clipboard.hasImageAsync();
              
              if (!hasImage) {
                Alert.alert("No Image", "No image found in clipboard. Copy an image first.");
                return;
              }

              const imageUri = await Clipboard.getImageAsync({ format: 'png' });
              
              if (imageUri && imageUri.data) {
                const uri = `data:image/png;base64,${imageUri.data}`;
                const updatedPhotos = [...photos, uri];
                
                // Respect max photos limit
                if (maxPhotos && updatedPhotos.length > maxPhotos) {
                  Alert.alert(
                    "Limit Reached",
                    `You can only upload up to ${maxPhotos} photo${maxPhotos > 1 ? "s" : ""}.`
                  );
                } else {
                  onPhotosChange(updatedPhotos);
                  Alert.alert("Success", "Image pasted from clipboard!");
                }
              } else {
                Alert.alert("Error", "Could not paste image from clipboard");
              }
            } catch (error) {
              console.error("Clipboard paste error:", error);
              Alert.alert("Error", "Failed to paste from clipboard");
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

  const handleRemovePhoto = (index: number) => {
    const updatedPhotos = photos.filter((_, i) => i !== index);
    onPhotosChange(updatedPhotos);
  };

  return (
    <View className="mb-6">
      {/* Debug logging */}
      {console.log('PhotoUploadSection - photos:', photos)}
      {console.log('PhotoUploadSection - photos.length:', photos.length)}
      
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center">
          <Text className="text-lg font-semibold text-gray-900">{title}</Text>
          {showCount && photos.length > 0 && (
            <View className="ml-2 bg-blue-100 px-2 py-0.5 rounded-full">
              <Text className="text-blue-700 text-xs font-medium">{photos.length}</Text>
            </View>
          )}
        </View>
        <Pressable
          onPress={handleAddPhotos}
          className="flex-row items-center bg-blue-600 px-3 py-2 rounded-lg"
        >
          <Ionicons name="add" size={18} color="white" />
          <Text className="text-white font-medium ml-1">Add</Text>
        </Pressable>
      </View>
      
      {photos.length > 0 ? (
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={{ overflow: 'visible' }}
          contentContainerStyle={{ paddingVertical: 10 }}
        >
          <View className="flex-row" style={{ overflow: 'visible' }}>
            {photos.map((photo, index) => {
              console.log(`Photo ${index}:`, photo);
              return (
                <View 
                  key={index} 
                  className="mr-3" 
                  style={{ position: 'relative', overflow: 'visible' }}
                >
                  <Image
                    source={{ uri: photo }}
                    style={{ 
                      width: 96, 
                      height: 96, 
                      borderRadius: 8,
                      backgroundColor: '#f3f4f6'
                    }}
                    resizeMode="cover"
                    onError={(error) => {
                      console.error(`Image ${index} load error:`, error.nativeEvent.error);
                      console.error(`Failed to load photo URI:`, photo);
                    }}
                    onLoad={() => {
                      console.log(`Image ${index} loaded successfully:`, photo);
                    }}
                  />
                  <Pressable
                    onPress={() => handleRemovePhoto(index)}
                    style={{
                      position: 'absolute',
                      top: -8,
                      right: -8,
                      width: 24,
                      height: 24,
                      backgroundColor: '#ef4444',
                      borderRadius: 12,
                      alignItems: 'center',
                      justifyContent: 'center',
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.25,
                      shadowRadius: 3.84,
                      elevation: 5,
                    }}
                  >
                    <Ionicons name="close" size={14} color="white" />
                  </Pressable>
                </View>
              );
            })}
          </View>
        </ScrollView>
      ) : (
        <View className="border border-dashed border-gray-300 rounded-lg p-4 items-center bg-gray-50">
          <Ionicons name="images-outline" size={24} color="#9ca3af" />
          <Text className="text-gray-400 text-sm mt-1">{emptyMessage}</Text>
        </View>
      )}
    </View>
  );
};

