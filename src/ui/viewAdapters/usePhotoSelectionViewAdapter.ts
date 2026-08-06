import { useMemo, useState } from 'react';
import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import Constants from 'expo-constants';
import IMGLYEditor, {
  EditorPreset,
  EditorSettingsModel,
  SourceType,
} from '@imgly/editor-react-native';
import * as FileSystem from 'expo-file-system/legacy';

import { uploadFileWithVerification } from '../../api/fileUploadService';
import { pinDraftMedia } from '../../utils/draftMediaCache';
import type { SelectedPhoto } from '../../utils/usePhotoSelection';
import type {
  MiniPickerTask,
  PhotoSelectionSaveIntent,
  PhotoSelectionScreenViewAdapterOutput,
} from '../contracts/viewAdapters';
import { useTaskStore } from '../../state/taskStore.supabase';
import { useUnattachedPhotoBatchStore } from '../../state/unattachedPhotoBatchStore';

export interface PhotoSelectionViewAdapterProps {
  taskId: string;
  subTaskId?: string;
  projectId?: string;
  companyId: string;
  userId: string;
  initialCompletionPercentage: number;
  initialPhotos?: SelectedPhoto[];
  entityType?: 'task' | 'task-update' | 'project' | 'user';
  uploadImmediately?: boolean;
  saveIntent?: PhotoSelectionSaveIntent;
  selectedTaskId?: string;
  onNavigateBack: () => void;
  onNavigateToUpdateProgress?: (
    taskId: string,
    subTaskId?: string,
    initialCompletionPercentage?: number,
    uploadedPhotoUrls?: string[]
  ) => void;
  onPhotosUploaded?: (photoUrls: string[]) => void;
  onPhotosSelected?: (photos: SelectedPhoto[]) => void;
  onAttachedToExistingTask?: (taskId: string, uploadedPhotoUrls: string[]) => void;
  onSaveUnattachedDone?: () => void;
}

const MINI_PICKER_LIMIT = 20;

function swap<T>(list: T[], from: number, to: number): T[] {
  if (from < 0 || to < 0 || from >= list.length || to >= list.length) return list;
  const next = list.slice();
  const tmp = next[from];
  next[from] = next[to];
  next[to] = tmp;
  return next;
}

export function usePhotoSelectionViewAdapter({
  taskId,
  subTaskId,
  projectId,
  companyId,
  userId,
  initialCompletionPercentage,
  initialPhotos = [],
  entityType = 'task-update',
  uploadImmediately = true,
  saveIntent: initialSaveIntent = 'attach_task',
  selectedTaskId: initialSelectedTaskId,
  onNavigateBack,
  onNavigateToUpdateProgress,
  onPhotosUploaded,
  onPhotosSelected,
  onAttachedToExistingTask,
  onSaveUnattachedDone,
}: PhotoSelectionViewAdapterProps): {
  output: PhotoSelectionScreenViewAdapterOutput;
  handleAddPhotos: () => Promise<void>;
  handlePhotoPress: (index: number) => void;
  handleAnnotatePhoto: (index: number) => Promise<void>;
  handleRemovePhoto: (index: number) => void;
  handleUploadPhotos: () => Promise<void>;
  setEnlargedPhotoIndex: (index: number | null) => void;
  handleMovePhotoUp: (index: number) => void;
  handleMovePhotoDown: (index: number) => void;
  handleSetCaption: (index: number, caption: string) => void;
  handleSetSaveIntent: (intent: PhotoSelectionSaveIntent) => void;
  handleToggleMiniPicker: () => void;
  handleSelectTaskForAttach: (taskId: string) => void;
} {
  const [selectedPhotos, setSelectedPhotos] = useState<SelectedPhoto[]>(initialPhotos);
  const [enlargedPhotoIndex, setEnlargedPhotoIndex] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isAnnotating, setIsAnnotating] = useState(false);
  const [saveIntent, setSaveIntent] = useState<PhotoSelectionSaveIntent>(initialSaveIntent);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(
    initialSelectedTaskId ?? null,
  );
  const [isMiniPickerVisible, setIsMiniPickerVisible] = useState(false);

  const getTasksByProject = useTaskStore((state) => state.getTasksByProject);
  const addBatch = useUnattachedPhotoBatchStore((state) => state.addBatch);

  const tasksForPicker: MiniPickerTask[] = useMemo(() => {
    if (!projectId) return [];
    const tasks = getTasksByProject?.(projectId) ?? [];
    const withTime = tasks
      .filter((t) => !(t as any).deletedAt && !(t as any).cancelledAt)
      .map((t) => ({
        id: t.id,
        title: t.title,
        time: t.updatedAt ? new Date(t.updatedAt).getTime() : new Date(t.createdAt).getTime(),
      }));
    withTime.sort((a, b) => b.time - a.time);
    return withTime.slice(0, MINI_PICKER_LIMIT).map(({ id, title }) => ({ id, title }));
  }, [projectId, getTasksByProject]);

  const createPinnedPhoto = async (
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
              const pinnedPhoto = await createPinnedPhoto(
                asset.uri,
                asset.fileName || `photo_${Date.now()}.jpg`
              );
              setSelectedPhotos(prev => [...prev, pinnedPhoto]);
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

              const newPhotos = await Promise.all(
                result.assets.map((asset, index) =>
                  createPinnedPhoto(
                    asset.uri,
                    asset.fileName || `photo_${Date.now()}_${index}.jpg`
                  )
                )
              );

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
      
      const isExpoGo = Constants.executionEnvironment === 'storeClient';
      if (isExpoGo) {
        throw new Error('Photo annotation requires a development build. Expo Go does not support native modules like @imgly/editor-react-native. Please build a development build using: eas build --profile development --platform ios/android');
      }

      if (!IMGLYEditor) {
        throw new Error('IMGLY Editor is not available. Please use a development build.');
      }

      const settings = new EditorSettingsModel({
        license: undefined,
        userId: 'user-' + Date.now(),
      });

      console.log('🎨 [PhotoSelection] Opening editor for photo:', photo.uri);

      const result = await IMGLYEditor.openEditor(
        settings,
        {
          source: photo.uri,
          type: SourceType.IMAGE,
        },
        EditorPreset.PHOTO,
      );

      const resultSource = (result as any)?.source as string | undefined;

      if (result && resultSource) {
        const annotatedUri = resultSource;
        let finalUri = annotatedUri;
        
        if (annotatedUri.startsWith('file://')) {
          const fileName = `annotated_${Date.now()}.jpg`;
          finalUri = await pinDraftMedia(annotatedUri, fileName);
        }

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

  const handleMovePhotoUp = (index: number) => {
    if (index <= 0) return;
    setSelectedPhotos(prev => swap(prev, index, index - 1));
    if (enlargedPhotoIndex === index) {
      setEnlargedPhotoIndex(index - 1);
    } else if (enlargedPhotoIndex === index - 1) {
      setEnlargedPhotoIndex(index);
    }
  };

  const handleMovePhotoDown = (index: number) => {
    setSelectedPhotos(prev => {
      if (index >= prev.length - 1) return prev;
      return swap(prev, index, index + 1);
    });
    if (enlargedPhotoIndex === index) {
      setEnlargedPhotoIndex(index + 1);
    } else if (enlargedPhotoIndex === index + 1) {
      setEnlargedPhotoIndex(index);
    }
  };

  const handleSetCaption = (index: number, caption: string) => {
    setSelectedPhotos(prev => {
      if (index < 0 || index >= prev.length) return prev;
      const next = prev.slice();
      next[index] = { ...next[index], caption };
      return next;
    });
  };

  const handleSetSaveIntent = (intent: PhotoSelectionSaveIntent) => {
    setSaveIntent(intent);
  };

  const handleToggleMiniPicker = () => {
    setIsMiniPickerVisible(prev => !prev);
  };

  const handleSelectTaskForAttach = (taskId: string) => {
    setSelectedTaskId(taskId);
    setIsMiniPickerVisible(false);
  };

  const handleUploadPhotos = async () => {
    if (selectedPhotos.length === 0) {
      Alert.alert("No Photos", "Please add at least one photo.");
      return;
    }

    if (!uploadImmediately) {
      console.log('📸 [PhotoSelection] Returning photos without uploading (uploadImmediately=false)');
      if (onPhotosSelected) {
        try {
          onPhotosSelected(selectedPhotos);
        } catch (error) {
          console.error('❌ [PhotoSelection] Error calling onPhotosSelected:', error);
          Alert.alert("Error", "Failed to return photos. Please try again.");
          onNavigateBack();
        }
      } else {
        console.warn('⚠️ [PhotoSelection] onPhotosSelected callback not provided, but uploadImmediately is false');
        Alert.alert(
          "Configuration Error",
          "Photo selection callback is missing. Photos cannot be returned. Please try again or contact support."
        );
        onNavigateBack();
      }
      return;
    }

    if (saveIntent === 'project_unattached') {
      if (!projectId || !companyId || !userId) {
        const missing = [];
        if (!projectId) missing.push('projectId');
        if (!companyId) missing.push('companyId');
        if (!userId) missing.push('userId');
        Alert.alert(
          "Configuration Error",
          `Missing required parameters for Save to Project: ${missing.join(', ')}`
        );
        return;
      }
    } else if (selectedTaskId) {
      if (!tasksForPicker.find(t => t.id === selectedTaskId)) {
        Alert.alert(
          "Task Unavailable",
          "Task was archived or deleted. Please re-select a task."
        );
        setSelectedTaskId(null);
        setIsMiniPickerVisible(false);
        return;
      }
      if (!companyId || !userId) {
        const missing = [];
        if (!companyId) missing.push('companyId');
        if (!userId) missing.push('userId');
        Alert.alert(
          "Configuration Error",
          `Missing required parameters for attach to task: ${missing.join(', ')}`
        );
        return;
      }
    } else {
      if (!companyId || !userId || !taskId) {
        const missing = [];
        if (!companyId) missing.push('companyId');
        if (!userId) missing.push('userId');
        if (!taskId) missing.push('taskId');
        Alert.alert(
          "Configuration Error",
          `Missing required parameters: ${missing.join(', ')}\n\nPlease contact support if this issue persists.`
        );
        return;
      }
    }

    setIsUploading(true);
    let successCount = 0;
    let failCount = 0;
    const uploadedUrls: string[] = [];
    const errorMessages: string[] = [];

    const resolvedEntityType: 'task' | 'task-update' | 'project' | 'user' =
      saveIntent === 'project_unattached' ? 'project' : selectedTaskId ? 'task-update' : entityType;
    const resolvedEntityId: string =
      saveIntent === 'project_unattached'
        ? (projectId as string)
        : selectedTaskId ?? taskId;

    try {
      for (let i = 0; i < selectedPhotos.length; i++) {
        const photo = selectedPhotos[i];
        try {
          const uriToUpload = photo.annotatedUri || photo.uri;
          
          const fileInfo = await FileSystem.getInfoAsync(uriToUpload);
          if (!fileInfo.exists) {
            const errorMsg = `File not found: ${photo.fileName}`;
            errorMessages.push(errorMsg);
            failCount++;
            continue;
          }

          const result = await uploadFileWithVerification({
            file: {
              uri: uriToUpload,
              name: photo.fileName,
              type: 'image/jpeg',
            },
            entityType: resolvedEntityType,
            entityId: resolvedEntityId,
            companyId: companyId,
            userId: userId,
            description: photo.caption,
          });

          if (result.success && result.file) {
            successCount++;
            uploadedUrls.push(result.file.public_url);
          } else {
            const errorMsg = result.error || `Unknown error uploading ${photo.fileName}`;
            errorMessages.push(`${photo.fileName}: ${errorMsg}`);
            failCount++;
          }
        } catch (error: any) {
          const errorMsg = error.message || `Failed to upload ${photo.fileName}`;
          errorMessages.push(`${photo.fileName}: ${errorMsg}`);
          failCount++;
        }
      }

      const hasPartialFailure = successCount > 0 && failCount > 0;
      const buildPartialAlert = (onContinue: () => void) => {
        const errorDetails = errorMessages.length > 0 
          ? `\n\nFailed:\n${errorMessages.slice(0, 2).join('\n')}${errorMessages.length > 2 ? `\n... and ${errorMessages.length - 2} more` : ''}`
          : '';
        Alert.alert(
          "Partial Upload",
          `${successCount} photo(s) uploaded successfully, ${failCount} failed.${errorDetails}`,
          [
            {
              text: "Continue",
              onPress: onContinue,
            },
          ]
        );
      };

      if (saveIntent === 'project_unattached' && successCount > 0) {
        const proceed = () => {
          addBatch({
            id: `batch-${Date.now()}`,
            projectId: projectId as string,
            companyId,
            userId,
            photoUrls: uploadedUrls,
            captions: selectedPhotos.map((p) => p.caption ?? ''),
            savedAt: Date.now(),
          });
          onSaveUnattachedDone?.();
        };
        if (hasPartialFailure) {
          buildPartialAlert(proceed);
        } else {
          proceed();
        }
        return;
      }

      if (selectedTaskId && successCount > 0) {
        const proceed = () => {
          onAttachedToExistingTask?.(selectedTaskId, uploadedUrls);
        };
        if (hasPartialFailure) {
          buildPartialAlert(proceed);
        } else {
          proceed();
        }
        return;
      }

      if (successCount > 0) {
        const proceed = () => {
          if (onPhotosUploaded) {
            onPhotosUploaded(uploadedUrls);
            onNavigateBack();
          } else if (onNavigateToUpdateProgress) {
            onNavigateToUpdateProgress(taskId, subTaskId, initialCompletionPercentage, uploadedUrls);
          } else {
            onNavigateBack();
          }
        };
        if (hasPartialFailure) {
          buildPartialAlert(proceed);
        } else {
          proceed();
        }
      } else {
        const errorDetails = errorMessages.length > 0 
          ? `\n\nErrors:\n${errorMessages.slice(0, 3).join('\n')}${errorMessages.length > 3 ? `\n... and ${errorMessages.length - 3} more` : ''}`
          : '';
        Alert.alert(
          "Upload Failed", 
          `All ${selectedPhotos.length} photo(s) failed to upload.${errorDetails}\n\nPlease check:\n• Your internet connection\n• Supabase storage configuration\n• Developer Settings → Test File Upload`
        );
      }
    } catch (error: any) {
      Alert.alert(
        "Error", 
        `Failed to upload photos: ${error.message || 'Unknown error'}\n\nCheck the console for details.`
      );
    } finally {
      setIsUploading(false);
    }
  };

  const output: PhotoSelectionScreenViewAdapterOutput = {
    screenId: "PhotoSelectionScreen",
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
      shouldRenderEmptyState: selectedPhotos.length === 0,
      freshnessLabel: "Just now",
    },
    photos: selectedPhotos.map((photo, idx) => ({
      id: `photo-${idx}`,
      density: 'standard' as const,
      structuralState: 'loading' as const,
      uri: photo.uri,
      annotatedUri: photo.annotatedUri,
      fileName: photo.fileName,
      isAnnotated: photo.isAnnotated || false,
      caption: photo.caption,
    })),
    enlargedPhotoIndex,
    isUploading,
    isAnnotating,
    saveIntent,
    selectedTaskId,
    tasksForPicker,
    isMiniPickerVisible,
  };

  return {
    output,
    handleAddPhotos,
    handlePhotoPress,
    handleAnnotatePhoto,
    handleRemovePhoto,
    handleUploadPhotos,
    setEnlargedPhotoIndex,
    handleMovePhotoUp,
    handleMovePhotoDown,
    handleSetCaption,
    handleSetSaveIntent,
    handleToggleMiniPicker,
    handleSelectTaskForAttach,
  };
}
