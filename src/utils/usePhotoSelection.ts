import { Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as Clipboard from "expo-clipboard";

export interface SelectedPhoto {
  uri: string;
  fileName: string;
  isAnnotated?: boolean;
  annotatedUri?: string;
}

export interface PhotoSelectionOptions {
  onPhotosSelected: (photos: SelectedPhoto[]) => void;
  allowClipboard?: boolean;
  allowMultiple?: boolean;
}

/**
 * Unified photo selection utility that shows an Alert dialog
 * and handles photo selection from camera, library, or clipboard.
 * 
 * This can be used across the app for consistent photo selection UX.
 */
export function usePhotoSelection() {
  const showPhotoSelectionDialog = async (options: PhotoSelectionOptions) => {
    const { onPhotosSelected, allowClipboard = true, allowMultiple = true } = options;

    const dialogOptions: any[] = [
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
            const photos: SelectedPhoto[] = [{
              uri: asset.uri,
              fileName: asset.fileName || `photo_${Date.now()}.jpg`,
              isAnnotated: false,
            }];

            onPhotosSelected(photos);
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
              allowsMultipleSelection: allowMultiple,
              quality: 0.8,
            });

            if (result.canceled || !result.assets || result.assets.length === 0) {
              return;
            }

            const photos: SelectedPhoto[] = result.assets.map(asset => ({
              uri: asset.uri,
              fileName: asset.fileName || `photo_${Date.now()}_${Math.random()}.jpg`,
              isAnnotated: false,
            }));

            onPhotosSelected(photos);
          } catch (error: any) {
            console.error('Failed to pick images:', error);
            Alert.alert("Error", "Failed to pick images");
          }
        },
      },
    ];

    if (allowClipboard) {
      dialogOptions.push({
        text: "Paste from Clipboard",
        onPress: async () => {
          try {
            const hasImage = await Clipboard.hasImageAsync();
            if (!hasImage) {
              Alert.alert("No Image", "No image found in clipboard. Copy an image first.");
              return;
            }

            const imageData = await Clipboard.getImageAsync({ format: 'png' });
            if (imageData && imageData.uri) {
              const photos: SelectedPhoto[] = [{
                uri: imageData.uri,
                fileName: `clipboard_${Date.now()}.png`,
                isAnnotated: false,
              }];

              onPhotosSelected(photos);
            } else {
              Alert.alert("Error", "Could not paste image from clipboard");
            }
          } catch (error: any) {
            console.error("Clipboard paste error:", error);
            Alert.alert("Error", "Failed to paste from clipboard");
          }
        },
      });
    }

    dialogOptions.push({
      text: "Cancel",
      style: "cancel",
    });

    Alert.alert(
      "Add Photos",
      "Choose how you want to add photos",
      dialogOptions
    );
  };

  return {
    showPhotoSelectionDialog,
  };
}


