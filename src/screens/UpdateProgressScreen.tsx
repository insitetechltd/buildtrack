import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute, useFocusEffect } from "@react-navigation/native";
import Slider from "@react-native-community/slider";
import { useAuthStore } from "../state/authStore";
import { useTaskStore } from "../state/taskStore.supabase";
import { TaskStatus } from "../types/buildtrack";
import { cn } from "../utils/cn";
import StandardHeader from "../components/StandardHeader";
import { useFileUpload, UploadResults } from "../utils/useFileUpload";
import { usePhotoSelection } from "../utils/usePhotoSelection";
import { useTranslation } from "../utils/useTranslation";
import { useCallback } from "react";

interface UpdateProgressScreenParams {
  taskId: string;
  subTaskId?: string;
  initialCompletionPercentage?: number;
  uploadedPhotoUrls?: string[];
  actionType?: string;
}

interface UpdateProgressScreenProps {
  onNavigateToProfile?: () => void;
  onNavigateToProjectPicker?: (allowBack?: boolean) => void;
}

export default function UpdateProgressScreen({ onNavigateToProfile, onNavigateToProjectPicker }: UpdateProgressScreenProps = {}) {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const { taskId, subTaskId, initialCompletionPercentage } = (route.params || {}) as UpdateProgressScreenParams;
  const t = useTranslation();
  const { user } = useAuthStore();
  const tasks = useTaskStore(state => state.tasks);
  const fetchTaskById = useTaskStore(state => state.fetchTaskById);
  const addTaskUpdate = useTaskStore(state => state.addTaskUpdate);
  const addSubTaskUpdate = useTaskStore(state => state.addSubTaskUpdate);
  const { pickAndUploadImages } = useFileUpload();
  const { showPhotoSelectionDialog } = usePhotoSelection();

  const task = tasks.find(t => t.id === taskId);
  const isViewingSubTask = !!subTaskId;

  const [updateForm, setUpdateForm] = useState({
    description: "",
    photos: [] as string[],
    completionPercentage: initialCompletionPercentage || task?.completionPercentage || 0,
    status: "in_progress" as TaskStatus,
  });
  const [failedUploadsInSession, setFailedUploadsInSession] = useState<Array<{ fileName: string; error: string; originalFile: any }>>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Update completion percentage when task changes
  useEffect(() => {
    if (task) {
      setUpdateForm(prev => ({
        ...prev,
        completionPercentage: task.completionPercentage || prev.completionPercentage,
      }));
    }
  }, [task?.completionPercentage]);

  // Handle uploaded photo URLs from PhotoSelectionScreen
  useFocusEffect(
    useCallback(() => {
      // Check for uploaded photo URLs in navigation params
      const params = route.params as UpdateProgressScreenParams;
      if (params?.uploadedPhotoUrls && Array.isArray(params.uploadedPhotoUrls) && params.uploadedPhotoUrls.length > 0) {
        // Update form data with uploaded photo URLs
        setUpdateForm(prev => ({
          ...prev,
          photos: [...prev.photos, ...params.uploadedPhotoUrls!],
        }));
        console.log('✅ [UpdateProgress] Added uploaded photos to form:', params.uploadedPhotoUrls);
        // Clear the params to prevent re-adding
        navigation.setParams({ uploadedPhotoUrls: undefined });
      }
    }, [route.params, navigation])
  );

  const handleAddPhotos = async () => {
    if (!user || !task) return;

    // Use unified photo selection utility
    showPhotoSelectionDialog({
      onPhotosSelected: (photos) => {
        // Navigate to PhotoSelectionScreen
        navigation.navigate("PhotoSelection", {
          taskId: task.id,
          subTaskId: subTaskId,
          companyId: user.companyId,
          userId: user.id,
          initialCompletionPercentage: task.completionPercentage || 0,
          initialPhotos: photos,
          returnScreen: 'UpdateProgress',
        });
      },
      allowClipboard: true,
      allowMultiple: true,
    });
  };

  const handleRetryUpload = async (failedUpload: { fileName: string; error: string; originalFile: any }) => {
    if (!user || !task) return;

    try {
      const { uploadFileWithVerification } = require('../api/fileUploadService');
      
      const result = await uploadFileWithVerification({
        file: failedUpload.originalFile,
        entityType: 'task-update',
        entityId: task.id,
        companyId: user.companyId,
        userId: user.id,
      });

      if (result.success && result.file) {
        setUpdateForm(prev => ({
          ...prev,
          photos: [...prev.photos, result.file!.public_url],
        }));
        
        setFailedUploadsInSession(prev => 
          prev.filter(f => f.fileName !== failedUpload.fileName)
        );
        
        Alert.alert("Success", `${failedUpload.fileName} uploaded successfully!`);
      } else {
        Alert.alert(
          "Retry Failed", 
          result.error || "Upload failed again. Please check your connection and try again."
        );
      }
    } catch (error: any) {
      Alert.alert("Error", error.message || "Retry failed. Please try again.");
    }
  };

  const handleSubmitUpdate = async () => {
    if (!updateForm.description.trim()) {
      Alert.alert("Error", "Please provide a description for this update");
      return;
    }

    if (!task) return;

    setIsSubmitting(true);

    try {
      const calculatedStatus: TaskStatus = 
        (task.status === "accepted" || task.status === "in_progress" || task.status === "submitted_for_review") ? 
          "in_progress" :
        task.status || "in_progress";

      const updatePayload = {
        description: updateForm.description,
        photos: updateForm.photos,
        completionPercentage: updateForm.completionPercentage,
        status: calculatedStatus,
        userId: user!.id,
      };

      if (isViewingSubTask && subTaskId) {
        await addSubTaskUpdate(taskId, subTaskId, updatePayload);
      } else {
        await addTaskUpdate(task.id, updatePayload);
      }

      await fetchTaskById(task.id);

      if (updateForm.completionPercentage === 100) {
        Alert.alert("Success", "🎉 Task marked as 100% complete! You can submit it for review when ready.");
      } else {
        Alert.alert(t.errors.success, t.taskDetail.progressUpdateAdded);
      }

      navigation.goBack();
    } catch (error) {
      Alert.alert(t.errors.error, t.taskDetail.failedToSubmitUpdate);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!task) {
    return (
      <SafeAreaView edges={['bottom', 'left', 'right']} className="flex-1 bg-gray-50">
        <StatusBar style="dark" />
        
        {/* Standard Header */}
        <StandardHeader 
          title={t.taskDetail.progressUpdate}
          showBackButton={true}
          onBackPress={() => navigation.goBack()}
          onNavigateToProfile={onNavigateToProfile}
          onNavigateToProjectPicker={onNavigateToProjectPicker}
        />
        <View className="flex-1 items-center justify-center">
          <Text className="text-gray-500">Task not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['bottom', 'left', 'right']} className="flex-1 bg-gray-50">
      <StatusBar style="dark" />
      
      {/* Standard Header */}
      <StandardHeader 
        title={t.taskDetail.progressUpdate}
        showBackButton={true}
        onBackPress={() => navigation.goBack()}
        onNavigateToProfile={onNavigateToProfile}
        onNavigateToProjectPicker={onNavigateToProjectPicker}
      />

      <ScrollView className="flex-1 px-6 py-4" contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Photos & Files - Top Section */}
        <View className="mb-6">
          <Text className="text-xl font-semibold text-gray-900 mb-3">
            {t.taskDetail.photosAndFiles}
          </Text>
          
          {updateForm.photos.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3">
              <View className="flex-row">
                {updateForm.photos.map((photo, index) => (
                  <View key={index} className="mr-3 relative">
                    <Image
                      source={{ uri: photo }}
                      className="w-24 h-24 rounded-lg"
                      resizeMode="cover"
                    />
                    <View className="absolute top-1 left-1 w-6 h-6 bg-green-500 rounded-full items-center justify-center">
                      <Ionicons name="checkmark" size={14} color="white" />
                    </View>
                    <Pressable
                      onPress={() => {
                        setUpdateForm(prev => ({
                          ...prev,
                          photos: prev.photos.filter((_, i) => i !== index)
                        }));
                      }}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full items-center justify-center"
                    >
                      <Ionicons name="close" size={14} color="white" />
                    </Pressable>
                  </View>
                ))}
              </View>
            </ScrollView>
          ) : null}

          {/* Failed Uploads Section with Retry */}
          {failedUploadsInSession.length > 0 && (
            <View className="mb-3">
              <View className="bg-red-50 border border-red-200 rounded-lg p-3 mb-2">
                <View className="flex-row items-center mb-2">
                  <Ionicons name="alert-circle" size={20} color="#dc2626" />
                  <Text className="text-red-800 font-semibold ml-2">
                    {failedUploadsInSession.length} photo(s) failed to upload
                  </Text>
                </View>
                <Text className="text-red-700 text-sm">
                  Check your connection and tap retry below
                </Text>
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View className="flex-row">
                  {failedUploadsInSession.map((failedUpload, index) => (
                    <View key={index} className="mr-3 w-24">
                      <View className="w-24 h-24 rounded-lg bg-red-100 border-2 border-red-300 items-center justify-center mb-2">
                        <Ionicons name="close-circle" size={40} color="#dc2626" />
                      </View>
                      <Text className="text-xs text-gray-700 mb-1" numberOfLines={1}>
                        {failedUpload.fileName}
                      </Text>
                      <Text className="text-xs text-red-600 mb-2" numberOfLines={2}>
                        {failedUpload.error}
                      </Text>
                      <Pressable
                        onPress={() => handleRetryUpload(failedUpload)}
                        className="bg-blue-600 py-2 rounded-lg items-center"
                      >
                        <Text className="text-white text-xs font-semibold">Retry</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => {
                          setFailedUploadsInSession(prev => 
                            prev.filter((_, i) => i !== index)
                          );
                        }}
                        className="mt-1 py-1"
                      >
                        <Text className="text-gray-500 text-xs text-center">Dismiss</Text>
                      </Pressable>
                    </View>
                  ))}
                </View>
              </ScrollView>
            </View>
          )}
          
          <Pressable
            onPress={handleAddPhotos}
            className="flex-row items-center justify-between border-2 border-dashed border-gray-300 rounded-lg px-4 py-3 bg-gray-50"
          >
            <View className="flex-row items-center flex-1">
              <Ionicons name="cloud-upload-outline" size={20} color="#9ca3af" />
              <Text className="text-gray-600 font-medium ml-2 text-sm">
                {updateForm.photos.length === 0 ? t.taskDetail.tapToAddFiles : `${updateForm.photos.length} file(s) added`}
              </Text>
            </View>
            {updateForm.photos.length > 0 && (
              <Ionicons name="checkmark-circle" size={20} color="#10b981" />
            )}
          </Pressable>
        </View>

        {/* Update Description */}
        <View className="mb-6">
          <Text className="text-xl font-semibold text-gray-900 mb-3">
            {t.taskDetail.updateDescription}
          </Text>
          <TextInput
            className="border border-gray-300 rounded-lg px-4 py-3 text-gray-900 bg-white"
            placeholder={t.taskDetail.updateDescriptionPlaceholder}
            value={updateForm.description}
            onChangeText={(text) => setUpdateForm(prev => ({ ...prev, description: text }))}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
            maxLength={500}
            style={{ height: 120 }}
          />
        </View>

        {/* Completion Percentage - Bottom with Horizontal Slider */}
        <View className="mb-6">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-xl font-semibold text-gray-900">
              {t.taskDetail.completionPercentage}
            </Text>
            <Text className="text-3xl font-bold text-blue-600">
              {updateForm.completionPercentage}%
            </Text>
          </View>
          
          {/* Current Progress Indicator */}
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-base text-gray-600">{t.taskDetail.current}: {task.completionPercentage}%</Text>
            <View className="flex-row items-center">
              <View className="w-3 h-3 bg-red-500 rounded-full mr-2"></View>
              <Text className="text-base text-red-600 font-medium">{t.taskDetail.previous}</Text>
            </View>
          </View>
          
          {/* Horizontal Slider */}
          <Slider
            style={{ width: '100%', height: 40 }}
            minimumValue={0}
            maximumValue={100}
            step={5}
            value={updateForm.completionPercentage}
            onValueChange={(value: number) => setUpdateForm(prev => ({ ...prev, completionPercentage: value }))}
            minimumTrackTintColor="#ffffff"
            maximumTrackTintColor="#d1d5db"
            thumbTintColor="#ffffff"
          />
        </View>
      </ScrollView>

      {/* Fixed Bottom Bar */}
      <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3"
        style={{
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 8
        }}
      >
        <SafeAreaView edges={['bottom']}>
          <Pressable
            onPress={handleSubmitUpdate}
            disabled={isSubmitting}
            className={cn(
              "w-full rounded-xl py-3 px-4 flex-row items-center justify-center",
              isSubmitting ? "bg-gray-300" : "bg-blue-600"
            )}
          >
            <Ionicons 
              name="checkmark-circle-outline" 
              size={18} 
              color="white" 
            />
            <Text className="text-white font-semibold text-base ml-2">
              {isSubmitting ? t.common.loading : t.taskDetail.submitUpdate}
            </Text>
          </Pressable>
        </SafeAreaView>
      </View>
    </SafeAreaView>
  );
}
