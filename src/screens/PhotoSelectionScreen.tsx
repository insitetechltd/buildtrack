import React, { useState as _unusedState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Dimensions,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Image as ExpoImage } from "expo-image";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";

import { cn } from "../utils/cn";
import type { SelectedPhoto } from "../utils/usePhotoSelection";
import { usePhotoSelectionViewAdapter } from "../ui/viewAdapters/usePhotoSelectionViewAdapter";
import type { PhotoSelectionSaveIntent } from "../ui/contracts/viewAdapters";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const PHOTO_SIZE = (SCREEN_WIDTH - 48) / 3;

interface PhotoSelectionScreenProps {
  taskId: string;
  subTaskId?: string;
  projectId?: string;
  companyId: string;
  userId: string;
  initialCompletionPercentage: number;
  onNavigateBack: () => void;
  onNavigateToUpdateProgress?: (taskId: string, subTaskId?: string, initialCompletionPercentage?: number, uploadedPhotoUrls?: string[]) => void;
  onPhotosUploaded?: (photoUrls: string[]) => void;
  onPhotosSelected?: (photos: SelectedPhoto[]) => void;
  onAttachedToExistingTask?: (taskId: string, uploadedPhotoUrls: string[]) => void;
  onSaveUnattachedDone?: () => void;
  initialPhotos?: SelectedPhoto[];
  entityType?: 'task' | 'task-update' | 'project' | 'user';
  uploadImmediately?: boolean;
  saveIntent?: PhotoSelectionSaveIntent;
  selectedTaskId?: string;
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
    handleMovePhotoUp,
    handleMovePhotoDown,
    handleSetCaption,
    handleSetSaveIntent,
    handleToggleMiniPicker,
    handleSelectTaskForAttach,
  } = usePhotoSelectionViewAdapter(props);

  const {
    photos,
    enlargedPhotoIndex,
    isUploading,
    isAnnotating,
    saveIntent,
    tasksForPicker,
    isMiniPickerVisible,
    selectedTaskId,
  } = output;

  const enlargedPhoto = enlargedPhotoIndex !== null ? photos[enlargedPhotoIndex] : null;

  const selectedTaskTitle =
    tasksForPicker.find((t) => t.id === selectedTaskId)?.title ?? null;

  return (
    <SafeAreaView edges={['bottom', 'left', 'right']} className="flex-1 bg-gray-50">
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={88}
      >
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
          
        </View>

        {/* Enlarged Photo View */}
        {enlargedPhotoIndex !== null && enlargedPhoto && (
          <View className="absolute inset-0 bg-black z-50" style={{ paddingTop: topPadding }}>
                {/* Header */}
                <View 
                  className="flex-row items-center justify-between px-6 py-4 bg-black/80"
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
                  
                  <View className="flex-row items-center">
                    <Pressable
                      onPress={() => handleMovePhotoUp(enlargedPhotoIndex)}
                      disabled={enlargedPhotoIndex === 0}
                      className={cn(
                        "p-2",
                        enlargedPhotoIndex === 0 && "opacity-40"
                      )}
                    >
                      <Ionicons name="chevron-up" size={24} color="white" />
                    </Pressable>
                    <Pressable
                      onPress={() => handleMovePhotoDown(enlargedPhotoIndex)}
                      disabled={enlargedPhotoIndex === photos.length - 1}
                      className={cn(
                        "p-2",
                        enlargedPhotoIndex === photos.length - 1 && "opacity-40"
                      )}
                    >
                      <Ionicons name="chevron-down" size={24} color="white" />
                    </Pressable>
                    <Pressable
                      onPress={() => handleRemovePhoto(enlargedPhotoIndex)}
                      className="p-2 ml-2"
                    >
                      <Ionicons name="trash-outline" size={24} color="white" />
                    </Pressable>
                  </View>
                </View>

                {/* Caption TextInput between header and photo */}
                <View className="bg-black/60 px-4 py-3">
                  <TextInput
                    value={enlargedPhoto.caption ?? ""}
                    onChangeText={(text) => handleSetCaption(enlargedPhotoIndex, text)}
                    placeholder="Caption this photo..."
                    placeholderTextColor="#9CA3AF"
                    className="text-white text-base bg-white/10 border border-white/20 rounded-xl px-3 py-3"
                  />
                </View>

                {/* Photo */}
                <ScrollView className="flex-1" contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }} keyboardShouldPersistTaps="handled">
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
                </ScrollView>

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
              <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
                <View className="flex-row flex-wrap" style={{ gap: 8 }}>
                  {photos.map((photo, index) => (
                    <View
                      key={photo.id || index}
                      style={{ width: PHOTO_SIZE, marginBottom: 8 }}
                    >
                      <Pressable
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
                        <View className="absolute top-2 left-2 flex-row gap-1">
                          <Pressable
                            onPress={() => handleMovePhotoUp(index)}
                            disabled={index === 0}
                            className={cn(
                              "bg-black/60 rounded-full p-1",
                              index === 0 && "opacity-40"
                            )}
                          >
                            <Ionicons name="chevron-up" size={14} color="white" />
                          </Pressable>
                          <Pressable
                            onPress={() => handleMovePhotoDown(index)}
                            disabled={index === photos.length - 1}
                            className={cn(
                              "bg-black/60 rounded-full p-1",
                              index === photos.length - 1 && "opacity-40"
                            )}
                          >
                            <Ionicons name="chevron-down" size={14} color="white" />
                          </Pressable>
                        </View>
                        <View className="absolute bottom-2 right-2 bg-black/60 rounded-full p-1">
                          <Ionicons name="expand" size={12} color="white" />
                        </View>
                      </Pressable>
                      <View className="mt-2">
                        <TextInput
                          value={photo.caption ?? ""}
                          onChangeText={(text) => handleSetCaption(index, text)}
                          placeholder="Caption"
                          placeholderTextColor="#9CA3AF"
                          className="text-sm text-gray-900 bg-white border border-gray-200 rounded-lg px-2 py-2"
                        />
                      </View>
                    </View>
                  ))}
                </View>
              </ScrollView>

              {/* Bottom Action Bar area with segmented + picker + CTAs */}
              <View className="bg-white border-t border-gray-200 px-6 pt-4 pb-4">
                {/* Segmented control */}
                <View className="flex-row gap-3 mb-4">
                  <Pressable
                    onPress={() => handleSetSaveIntent("attach_task")}
                    className={cn(
                      "flex-1 rounded-2xl border p-3",
                      saveIntent === "attach_task"
                        ? "border-slate-900 bg-slate-900"
                        : "border-gray-200 bg-white"
                    )}
                  >
                    <Text
                      className={cn(
                        "text-sm font-semibold text-center",
                        saveIntent === "attach_task" ? "text-white" : "text-gray-900"
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
                        : "border-gray-200 bg-white"
                    )}
                  >
                    <Text
                      className={cn(
                        "text-sm font-semibold text-center",
                        saveIntent === "project_unattached" ? "text-blue-900" : "text-gray-900"
                      )}
                    >
                      Save to Project
                    </Text>
                  </Pressable>
                </View>

                {/* Task mini-picker section */}
                {saveIntent === "attach_task" && (
                  <View className="mb-4">
                    {!isMiniPickerVisible ? (
                      <>
                        {selectedTaskTitle ? (
                          <View className="bg-green-50 border border-green-200 rounded-xl px-3 py-3 flex-row items-center justify-between">
                            <View className="flex-1 flex-row items-center">
                              <Ionicons name="checkmark-circle" size={18} color="#166534" />
                              <Text className="ml-2 text-sm font-medium text-green-900 flex-1" numberOfLines={1}>
                                Attach to: {selectedTaskTitle}
                              </Text>
                            </View>
                            <Pressable
                              onPress={handleToggleMiniPicker}
                              className="ml-3 px-2 py-1"
                            >
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
                                    : "bg-white border border-gray-100"
                                )}
                              >
                                <Ionicons
                                  name={selectedTaskId === task.id ? "checkmark-circle" : "ellipse-outline"}
                                  size={18}
                                  color={selectedTaskId === task.id ? "#2563EB" : "#9CA3AF"}
                                />
                                <Text
                                  className={cn(
                                    "ml-2 text-sm flex-1",
                                    selectedTaskId === task.id
                                      ? "text-blue-900 font-semibold"
                                      : "text-gray-800"
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
                )}

                {/* CTAs: Add More + Upload/Done */}
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
                              {saveIntent === "project_unattached"
                                ? `Save ${photos.length} Photo${photos.length !== 1 ? 's' : ''}`
                                : `Upload ${photos.length} Photo${photos.length !== 1 ? 's' : ''}`}
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
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
