import React, { useState } from "react";
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
import { useNavigation, useRoute } from "@react-navigation/native";
import { useAuthStore } from "../state/authStore";
import { useTaskStore } from "../state/taskStore.supabase";
import { cn } from "../utils/cn";
import StandardHeader from "../components/StandardHeader";
import { useFileUpload, UploadResults } from "../utils/useFileUpload";
import { useTranslation } from "../utils/useTranslation";

interface RejectTaskScreenParams {
  taskId: string;
  subTaskId?: string;
}

export default function RejectTaskScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const { taskId, subTaskId } = (route.params || {}) as RejectTaskScreenParams;
  const t = useTranslation();
  const { user } = useAuthStore();
  const tasks = useTaskStore(state => state.tasks);
  const fetchTaskById = useTaskStore(state => state.fetchTaskById);
  const rejectTaskCompletion = useTaskStore(state => state.rejectTaskCompletion);
  const rejectSubTaskCompletion = useTaskStore(state => state.rejectSubTaskCompletion);
  const { pickAndUploadImages } = useFileUpload();

  const task = tasks.find(t => t.id === taskId);
  const isViewingSubTask = !!subTaskId;

  const [rejectForm, setRejectForm] = useState({
    reason: "",
    photos: [] as string[],
  });
  const [isSubmittingReject, setIsSubmittingReject] = useState(false);

  const handleAddPhotos = async () => {
    if (!user || !task) return;

    Alert.alert(
      "Add Photos",
      "Choose how you want to add photos",
      [
        {
          text: "Take Photo",
          onPress: async () => {
            try {
              const results: UploadResults = await pickAndUploadImages(
                {
                  entityType: 'task-update',
                  entityId: task.id,
                  companyId: user.companyId,
                  userId: user.id,
                },
                'camera'
              );

              if (results.successful.length > 0) {
                const newPhotoUrls = results.successful.map(file => file.public_url);
                setRejectForm(prev => ({
                  ...prev,
                  photos: [...prev.photos, ...newPhotoUrls],
                }));
              }
            } catch (error) {
              Alert.alert("Error", "Failed to take photo");
            }
          },
        },
        {
          text: "Choose from Library",
          onPress: async () => {
            try {
              const results: UploadResults = await pickAndUploadImages(
                {
                  entityType: 'task-update',
                  entityId: task.id,
                  companyId: user.companyId,
                  userId: user.id,
                },
                'library'
              );

              if (results.successful.length > 0) {
                const newPhotoUrls = results.successful.map(file => file.public_url);
                setRejectForm(prev => ({
                  ...prev,
                  photos: [...prev.photos, ...newPhotoUrls],
                }));
              }
            } catch (error) {
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

  const handleSubmitReject = async () => {
    if (!rejectForm.reason.trim()) {
      Alert.alert("Error", "Please provide a reason for rejecting this task");
      return;
    }

    if (!user || !task) return;

    setIsSubmittingReject(true);

    try {
      if (isViewingSubTask && subTaskId) {
        await rejectSubTaskCompletion(taskId, subTaskId, {
          reason: rejectForm.reason,
          photos: rejectForm.photos,
          userId: user.id,
        });
      } else {
        await rejectTaskCompletion(task.id, {
          reason: rejectForm.reason,
          photos: rejectForm.photos,
          userId: user.id,
        });
      }

      await fetchTaskById(task.id);
      Alert.alert("Success", "Task rejected successfully");
      navigation.goBack();
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to reject task");
    } finally {
      setIsSubmittingReject(false);
    }
  };

  if (!task) {
    return (
      <SafeAreaView edges={['bottom', 'left', 'right']} className="flex-1 bg-gray-50">
        <StatusBar style="dark" />
        
        {/* Standard Header */}
        <StandardHeader 
          title={t.taskDetail.reject}
          showBackButton={true}
          onBackPress={() => navigation.goBack()}
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
        title={t.taskDetail.reject}
        showBackButton={true}
        onBackPress={() => navigation.goBack()}
      />

      <ScrollView className="flex-1 px-6 py-4" contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Photos Section */}
        <View className="mb-6">
          <Text className="text-xl font-semibold text-gray-900 mb-3">
            Photos (Optional)
          </Text>
          
          {rejectForm.photos.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3">
              <View className="flex-row">
                {rejectForm.photos.map((photo, index) => (
                  <View key={index} className="mr-3 relative">
                    <Image
                      source={{ uri: photo }}
                      className="w-24 h-24 rounded-lg"
                      resizeMode="cover"
                    />
                    <Pressable
                      onPress={() => {
                        setRejectForm(prev => ({
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

          <Pressable
            onPress={handleAddPhotos}
            className="flex-row items-center justify-center border-2 border-dashed border-gray-300 rounded-lg py-4"
          >
            <Ionicons name="camera-outline" size={24} color="#6b7280" />
            <Text className="text-gray-600 ml-2 font-medium">
              Add Photos
            </Text>
          </Pressable>
        </View>

        {/* Rejection Reason Text */}
        <View className="mb-6">
          <Text className="text-xl font-semibold text-gray-900 mb-3">
            Reason for Rejection <Text className="text-red-500">*</Text>
          </Text>
          <TextInput
            className="bg-white border border-gray-300 rounded-lg p-4 text-base min-h-[120]"
            placeholder="Please provide a reason for rejecting this task..."
            value={rejectForm.reason}
            onChangeText={(text) => setRejectForm(prev => ({ ...prev, reason: text }))}
            multiline
            textAlignVertical="top"
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
            onPress={handleSubmitReject}
            disabled={isSubmittingReject || !rejectForm.reason.trim()}
            className={cn(
              "w-full rounded-xl py-3 px-4 flex-row items-center justify-center",
              (isSubmittingReject || !rejectForm.reason.trim()) ? "bg-gray-300" : "bg-red-600"
            )}
          >
            <Ionicons 
              name="close-circle-outline" 
              size={18} 
              color="white" 
            />
            <Text className="text-white font-semibold text-base ml-2">
              {isSubmittingReject ? t.common.loading : t.taskDetail.reject}
            </Text>
          </Pressable>
        </SafeAreaView>
      </View>
    </SafeAreaView>
  );
}

