import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Dimensions,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Image as ExpoImage } from "expo-image";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { ScrollView as GestureScrollView } from "react-native-gesture-handler";

import { CropOverlay } from "../components/photoEdit/CropOverlay";
import { PreviewEditToolbar } from "../components/photoEdit/PreviewEditToolbar";
import SortablePhotoGrid from "../components/photoEdit/SortablePhotoGrid";
import { cn } from "../utils/cn";
import type { SelectedPhoto } from "../utils/usePhotoSelection";
import { usePhotoSelectionViewAdapter } from "../ui/viewAdapters/usePhotoSelectionViewAdapter";
import type { PhotoSelectionSaveIntent } from "../ui/contracts/viewAdapters";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const GRID_PAD = 16;
const GRID_GAP = 8;
const GRID_COLS = 3;
const PHOTO_SIZE =
  (SCREEN_WIDTH - GRID_PAD * 2 - GRID_GAP * (GRID_COLS - 1)) / GRID_COLS;

interface PhotoSelectionScreenProps {
  taskId: string;
  subTaskId?: string;
  projectId?: string;
  companyId: string;
  userId: string;
  initialCompletionPercentage: number;
  onNavigateBack: () => void;
  onNavigateToUpdateProgress?: (
    taskId: string,
    subTaskId?: string,
    initialCompletionPercentage?: number,
    uploadedPhotoUrls?: string[],
  ) => void;
  onPhotosUploaded?: (photoUrls: string[]) => void;
  onPhotosSelected?: (photos: SelectedPhoto[]) => void;
  onAttachedToExistingTask?: (taskId: string, uploadedPhotoUrls: string[]) => void;
  onSaveUnattachedDone?: () => void;
  initialPhotos?: SelectedPhoto[];
  entityType?: "task" | "task-update" | "project" | "user";
  uploadImmediately?: boolean;
  saveIntent?: PhotoSelectionSaveIntent;
  selectedTaskId?: string;
  selectionRevision?: number;
  onOpenInAppLibrary?: (currentPhotos: SelectedPhoto[]) => void;
}

export default function PhotoSelectionScreen(props: PhotoSelectionScreenProps) {
  const insets = useSafeAreaInsets();
  const topPadding = insets.top > 0 ? insets.top + 8 : 16;
  const isDeferredReturn = props.uploadImmediately === false;
  const [cropMode, setCropMode] = useState(false);
  const [previewImageSize, setPreviewImageSize] = useState({
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  });

  const {
    output,
    handleAddPhotos,
    handlePhotoPress,
    handleRotatePhoto,
    handleApplyCrop,
    handleResetEdits,
    handleRemovePhoto,
    handleUploadPhotos,
    setEnlargedPhotoIndex,
    handleSetPhotoOrder,
    handleSetSaveIntent,
    handleToggleMiniPicker,
    handleSelectTaskForAttach,
  } = usePhotoSelectionViewAdapter(props);

  const {
    photos,
    enlargedPhotoIndex,
    isUploading,
    isAnnotating: isEditingPhoto,
    saveIntent,
    tasksForPicker,
    isMiniPickerVisible,
    selectedTaskId,
  } = output;

  const enlargedPhoto = enlargedPhotoIndex !== null ? photos[enlargedPhotoIndex] : null;
  const previewUri =
    enlargedPhoto?.annotatedUri || enlargedPhoto?.uri || undefined;

  const selectedTaskTitle =
    tasksForPicker.find((t) => t.id === selectedTaskId)?.title ?? null;

  const confirmDisabled = isUploading || photos.length === 0;
  const isEditOpen =
    enlargedPhotoIndex !== null && enlargedPhoto != null && Boolean(previewUri);

  /** Step 2: N-Photos / tile → open rotate·crop·reset editor (not accept). */
  const openEditScreen = (index: number) => {
    if (index < 0 || index >= photos.length) return;
    setCropMode(false);
    handlePhotoPress(index);
  };

  /** Leave editor only — does not accept the batch. */
  const closeEditScreen = () => {
    setCropMode(false);
    setEnlargedPhotoIndex(null);
  };

  // Step 2: full-screen edit (rotate / crop / reset) — replaces selection until Done/X
  if (isEditOpen && enlargedPhotoIndex !== null && enlargedPhoto && previewUri) {
    return (
      <SafeAreaView edges={["bottom", "left", "right"]} className="flex-1 bg-black">
        <StatusBar style="light" />
        <View
          testID="photo-selection__preview"
          className="flex-1 bg-black"
          style={{ paddingTop: topPadding }}
        >
          <View
            className="flex-1 items-center justify-center bg-black"
            onLayout={(e) => {
              const { width, height } = e.nativeEvent.layout;
              if (width > 0 && height > 0) {
                setPreviewImageSize({ width, height });
              }
            }}
          >
            <ExpoImage
              source={{ uri: previewUri }}
              cachePolicy="memory-disk"
              contentFit="contain"
              transition={120}
              style={{
                width: previewImageSize.width,
                height: previewImageSize.height,
              }}
            />
            {cropMode ? (
              <CropOverlay
                uri={previewUri}
                containerWidth={previewImageSize.width}
                containerHeight={previewImageSize.height}
                disabled={isEditingPhoto}
                onCancel={() => setCropMode(false)}
                onApply={async (crop) => {
                  await handleApplyCrop(enlargedPhotoIndex, crop);
                  setCropMode(false);
                }}
              />
            ) : null}

            <View
              pointerEvents="box-none"
              className="absolute left-0 right-0 top-0 flex-row items-center justify-between px-4 py-3"
            >
              <Pressable
                testID="photo-selection__preview_close"
                onPress={closeEditScreen}
                className="h-11 w-11 items-center justify-center rounded-full bg-black/55"
                accessibilityRole="button"
                accessibilityLabel="Back to selection"
              >
                <Ionicons name="close" size={22} color="white" />
              </Pressable>

              <View className="rounded-full bg-black/55 px-3 py-1.5">
                <Text className="text-white text-base font-medium">
                  Edit {enlargedPhotoIndex + 1} / {photos.length}
                </Text>
              </View>

              <Pressable
                testID="photo-selection__preview_confirm"
                onPress={closeEditScreen}
                disabled={cropMode}
                className={cn(
                  "h-11 w-11 items-center justify-center rounded-full",
                  cropMode ? "bg-gray-600" : "bg-zinc-700",
                )}
                accessibilityRole="button"
                accessibilityLabel="Done editing photo"
              >
                <Ionicons name="checkmark" size={24} color="white" />
              </Pressable>
            </View>
          </View>

          <View
            testID="photo-selection__preview_tools_band"
            className="bg-zinc-900"
            style={{ paddingBottom: Math.max(insets.bottom, 12) }}
          >
            <PreviewEditToolbar
              disabled={isUploading}
              isEditing={isEditingPhoto}
              cropMode={cropMode}
              onRotate={() => handleRotatePhoto(enlargedPhotoIndex)}
              onToggleCrop={() => setCropMode((v) => !v)}
              onReset={() => handleResetEdits(enlargedPhotoIndex)}
              onRemove={() => handleRemovePhoto(enlargedPhotoIndex)}
            />

            {!cropMode ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                className="max-h-20"
                contentContainerStyle={{
                  paddingHorizontal: 16,
                  paddingTop: 4,
                  paddingBottom: 8,
                  gap: 8,
                }}
              >
                {photos.map((photo, index) => (
                  <Pressable
                    key={photo.id || `preview-thumb-${index}`}
                    testID={`photo-selection__preview_thumb_${index}`}
                    onPress={() => openEditScreen(index)}
                    className={cn(
                      "rounded-lg overflow-hidden border-2",
                      index === enlargedPhotoIndex ? "border-blue-500" : "border-transparent",
                    )}
                  >
                    <ExpoImage
                      source={{ uri: photo.annotatedUri || photo.uri }}
                      cachePolicy="memory-disk"
                      contentFit="cover"
                      style={{ width: 56, height: 56, borderRadius: 6 }}
                    />
                  </Pressable>
                ))}
              </ScrollView>
            ) : null}

            {enlargedPhoto.isAnnotated && !cropMode ? (
              <View className="px-4 pb-2">
                <View className="bg-green-600 rounded-xl py-2 px-4 flex-row items-center justify-center">
                  <Ionicons name="checkmark-circle" size={16} color="white" />
                  <Text className="text-white text-sm font-medium ml-1">Edits applied</Text>
                </View>
              </View>
            ) : null}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["bottom", "left", "right"]} className="flex-1 bg-gray-50">
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={88}
      >
        <View
          testID="photo-selection__header"
          className="flex-row items-center justify-between px-4 pb-3 bg-white border-b border-gray-200"
          style={{ paddingTop: topPadding }}
        >
          <Pressable
            testID="photo-selection__close"
            onPress={props.onNavigateBack}
            className="h-11 w-11 items-center justify-center rounded-full bg-gray-100"
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <Ionicons name="close" size={22} color="#111827" />
          </Pressable>

          <Text className="text-gray-900 text-lg font-semibold">
            Select Photos ({photos.length})
          </Text>

          <Pressable
            testID="photo-selection__confirm"
            onPress={handleUploadPhotos}
            disabled={confirmDisabled}
            className={cn(
              "h-11 w-11 items-center justify-center rounded-full",
              confirmDisabled ? "bg-gray-300" : "bg-blue-600",
            )}
            accessibilityRole="button"
            accessibilityLabel="Accept photos and continue"
          >
            {isUploading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Ionicons name="checkmark" size={24} color="white" />
            )}
          </Pressable>
        </View>

        <View className="flex-1">
          {photos.length === 0 ? (
            <View className="flex-1 items-center justify-center px-6">
              <Ionicons name="images-outline" size={64} color="#9ca3af" />
              <Text className="text-xl font-semibold text-gray-900 mt-4 text-center">
                No Photos Selected
              </Text>
              <Text className="text-base text-gray-600 mt-2 text-center">
                Add photos, then tap a photo to rotate or crop before accepting.
              </Text>
              <Pressable
                testID="photo-selection__add_empty"
                onPress={handleAddPhotos}
                className="bg-blue-600 rounded-xl py-4 px-8 mt-6 flex-row items-center"
              >
                <Ionicons name="add" size={20} color="white" />
                <Text className="text-white text-base font-semibold ml-2">Add Photos</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <GestureScrollView
                className="flex-1"
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ flexGrow: 1 }}
              >
                <SortablePhotoGrid
                  photos={photos}
                  layout={{ pad: GRID_PAD, gap: GRID_GAP, tileSize: PHOTO_SIZE }}
                  onReorder={handleSetPhotoOrder}
                  onPressPhoto={openEditScreen}
                  onPressAdd={handleAddPhotos}
                />
              </GestureScrollView>

              {!isDeferredReturn ? (
              <View className="bg-white border-t border-gray-200 px-4 pt-3 pb-4">
                    <View className="flex-row gap-3 mb-4">
                      <Pressable
                        onPress={() => handleSetSaveIntent("attach_task")}
                        className={cn(
                          "flex-1 rounded-2xl border p-3",
                          saveIntent === "attach_task"
                            ? "border-slate-900 bg-slate-900"
                            : "border-gray-200 bg-white",
                        )}
                      >
                        <Text
                          className={cn(
                            "text-sm font-semibold text-center",
                            saveIntent === "attach_task" ? "text-white" : "text-gray-900",
                          )}
                        >
                          Attach to Task
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={() => handleSetSaveIntent("project_unattached")}
                        className={cn(
                          "flex-1 rounded-2xl border p-3",
                          saveIntent === "project_unattached"
                            ? "border-blue-600 bg-blue-50"
                            : "border-gray-200 bg-white",
                        )}
                      >
                        <Text
                          className={cn(
                            "text-sm font-semibold text-center",
                            saveIntent === "project_unattached"
                              ? "text-blue-900"
                              : "text-gray-900",
                          )}
                        >
                          Save to Project
                        </Text>
                      </Pressable>
                    </View>

                    {saveIntent === "attach_task" ? (
                      <View className="mb-4">
                        {!isMiniPickerVisible ? (
                          <>
                            {selectedTaskTitle ? (
                              <View className="bg-green-50 border border-green-200 rounded-xl px-3 py-3 flex-row items-center justify-between">
                                <View className="flex-1 flex-row items-center">
                                  <Ionicons name="checkmark-circle" size={18} color="#166534" />
                                  <Text
                                    className="ml-2 text-sm font-medium text-green-900 flex-1"
                                    numberOfLines={1}
                                  >
                                    Attach to: {selectedTaskTitle}
                                  </Text>
                                </View>
                                <Pressable onPress={handleToggleMiniPicker} className="ml-3 px-2 py-1">
                                  <Text className="text-sm font-semibold text-blue-700">Change</Text>
                                </Pressable>
                              </View>
                            ) : (
                              <Pressable
                                onPress={handleToggleMiniPicker}
                                className="bg-gray-50 border border-dashed border-gray-300 rounded-xl px-4 py-3 flex-row items-center justify-center"
                              >
                                <Ionicons name="add-circle-outline" size={18} color="#374151" />
                                <Text className="ml-2 text-sm font-semibold text-gray-700">
                                  + Choose task to attach
                                </Text>
                              </Pressable>
                            )}
                          </>
                        ) : (
                          <View className="bg-gray-50 border border-gray-200 rounded-xl p-2 max-h-48">
                            {tasksForPicker.length === 0 ? (
                              <Text className="text-sm text-gray-500 text-center py-3">
                                No tasks for this project yet
                              </Text>
                            ) : (
                              <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled">
                                {tasksForPicker.map((task) => (
                                  <Pressable
                                    key={task.id}
                                    onPress={() => handleSelectTaskForAttach(task.id)}
                                    className={cn(
                                      "px-3 py-3 rounded-lg mb-1 flex-row items-center",
                                      selectedTaskId === task.id
                                        ? "bg-blue-100"
                                        : "bg-white border border-gray-100",
                                    )}
                                  >
                                    <Ionicons
                                      name={
                                        selectedTaskId === task.id
                                          ? "checkmark-circle"
                                          : "ellipse-outline"
                                      }
                                      size={18}
                                      color={selectedTaskId === task.id ? "#2563EB" : "#9CA3AF"}
                                    />
                                    <Text
                                      className={cn(
                                        "ml-2 text-sm flex-1",
                                        selectedTaskId === task.id
                                          ? "text-blue-900 font-semibold"
                                          : "text-gray-800",
                                      )}
                                      numberOfLines={1}
                                    >
                                      {task.title}
                                    </Text>
                                  </Pressable>
                                ))}
                              </ScrollView>
                            )}
                          </View>
                        )}
                      </View>
                    ) : null}
              </View>
              ) : null}
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
