import { Alert, Linking, Platform } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as Clipboard from "expo-clipboard";
import { pinDraftMedia, writeClipboardImageToDraft } from "./draftMediaCache";

export interface SelectedPhoto {
  uri: string;
  fileName: string;
  isAnnotated?: boolean;
  annotatedUri?: string;
  caption?: string;
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
  const createSelectedPhoto = async (
    uri: string,
    fileName: string
  ): Promise<SelectedPhoto> => {
    const pinnedUri = await pinDraftMedia(uri, fileName);
    return {
      uri: pinnedUri,
      fileName,
      isAnnotated: false,
    };
  };

  const showPhotoSelectionDialog = async (options: PhotoSelectionOptions) => {
    const { onPhotosSelected, allowClipboard = true, allowMultiple = true } = options;

    const dialogOptions: any[] = [
      {
        text: "Take Photo",
        onPress: async () => {
          try {
            const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
            if (permissionResult.status !== 'granted') {
              const canAskAgain = permissionResult.canAskAgain !== false;
              if (!canAskAgain) {
                // Permission permanently denied, offer to open settings
                Alert.alert(
                  'Permission Denied',
                  'Camera permission is required to take photos. Please enable it in Settings.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Open Settings',
                      onPress: async () => {
                        try {
                          await Linking.openSettings();
                        } catch (error) {
                          console.error('Failed to open settings:', error);
                          // Fallback for iOS if openSettings doesn't work
                          if (Platform.OS === 'ios') {
                            Linking.openURL('app-settings:').catch(() => {});
                          }
                        }
                      },
                    },
                  ]
                );
              } else {
                Alert.alert('Permission Denied', 'Camera permission is required to take photos.');
              }
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
            const photos: SelectedPhoto[] = [
              await createSelectedPhoto(
                asset.uri,
                asset.fileName || `photo_${Date.now()}.jpg`
              ),
            ];

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
            // First check current permission status
            const currentStatus = await ImagePicker.getMediaLibraryPermissionsAsync();
            console.log('📸 [PhotoSelection] Current permission status:', {
              status: currentStatus.status,
              canAskAgain: currentStatus.canAskAgain,
              granted: currentStatus.granted,
            });

            // Request permission (this will show dialog if not already granted/denied)
            const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
            console.log('📸 [PhotoSelection] Permission request result:', {
              status: permissionResult.status,
              canAskAgain: permissionResult.canAskAgain,
              granted: permissionResult.granted,
            });

            if (permissionResult.status !== 'granted') {
              const canAskAgain = permissionResult.canAskAgain !== false;
              console.log('📸 [PhotoSelection] Permission not granted, canAskAgain:', canAskAgain);
              
              if (!canAskAgain) {
                // Permission permanently denied, offer to open settings
                Alert.alert(
                  'Permission Denied',
                  'Photo library permission is required to select photos.\n\nTo enable:\n1. Open Settings app\n2. Go to Privacy & Security → Photos\n3. Find "Taskr" and enable access\n\nOr tap "Open Settings" to go there directly.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Open Settings',
                      onPress: async () => {
                        try {
                          await Linking.openSettings();
                        } catch (error) {
                          console.error('Failed to open settings:', error);
                          // Fallback for iOS if openSettings doesn't work
                          if (Platform.OS === 'ios') {
                            Linking.openURL('app-settings:').catch(() => {});
                          }
                        }
                      },
                    },
                  ]
                );
              } else {
                // Permission was denied but can ask again - this shouldn't happen if request worked
                // But if it does, show a helpful message
                Alert.alert(
                  'Permission Denied',
                  'Photo library permission is required to select photos.\n\nIf you did not see a permission prompt, the app may need to be rebuilt. Please try:\n1. Rebuild the app (expo start --clear)\n2. Or enable permission manually in Settings → Privacy & Security → Photos',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Open Settings',
                      onPress: async () => {
                        try {
                          await Linking.openSettings();
                        } catch (error) {
                          console.error('Failed to open settings:', error);
                          if (Platform.OS === 'ios') {
                            Linking.openURL('app-settings:').catch(() => {});
                          }
                        }
                      },
                    },
                  ]
                );
              }
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

            const photos = await Promise.all(
              result.assets.map((asset, index) =>
                createSelectedPhoto(
                  asset.uri,
                  asset.fileName || `photo_${Date.now()}_${index}.jpg`
                )
              )
            );

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
            if (imageData && imageData.data) {
              const uri = await writeClipboardImageToDraft(
                imageData.data,
                `clipboard_${Date.now()}.png`
              );
              const photos: SelectedPhoto[] = [{
                uri,
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


