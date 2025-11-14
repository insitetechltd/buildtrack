import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  Modal,
  Image,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import * as Clipboard from "expo-clipboard";
import { useAuthStore } from "../state/authStore";
import { useTaskStore } from "../state/taskStore.supabase";
import { useUserStore } from "../state/userStore.supabase";
import { useProjectStoreWithCompanyInit } from "../state/projectStore.supabase";
import { useCompanyStore } from "../state/companyStore";
import { useUserPreferencesStore } from "../state/userPreferencesStore";
import { TaskStatus, Priority, Task } from "../types/buildtrack";
import { cn } from "../utils/cn";
import StandardHeader from "../components/StandardHeader";
import ModalHandle from "../components/ModalHandle";
import TaskDetailUtilityFAB from "../components/TaskDetailUtilityFAB";
import TaskCard from "../components/TaskCard";
import { useFileUpload, UploadResults } from "../utils/useFileUpload";
import { useUploadFailureStore } from "../state/uploadFailureStore";
import { useTranslation } from "../utils/useTranslation";

interface TaskDetailScreenProps {
  taskId: string;
  subTaskId?: string; // Optional: if provided, show only this subtask
  onNavigateBack: () => void;
  onNavigateToCreateTask?: (parentTaskId?: string, parentSubTaskId?: string, editTaskId?: string) => void;
}

export default function TaskDetailScreen({ taskId, subTaskId, onNavigateBack, onNavigateToCreateTask }: TaskDetailScreenProps) {
  const t = useTranslation();
  const { user } = useAuthStore();
  const tasks = useTaskStore(state => state.tasks);
  const fetchTasks = useTaskStore(state => state.fetchTasks);
  const fetchTaskById = useTaskStore(state => state.fetchTaskById);
  const markTaskAsRead = useTaskStore(state => state.markTaskAsRead);
  const updateTask = useTaskStore(state => state.updateTask);
  const updateSubTaskStatus = useTaskStore(state => state.updateSubTaskStatus);
  const { isFavoriteUser, toggleFavoriteUser } = useUserPreferencesStore();
  const acceptSubTask = useTaskStore(state => state.acceptSubTask);
  const declineSubTask = useTaskStore(state => state.declineSubTask);
  const deleteSubTask = useTaskStore(state => state.deleteSubTask);
  const addTaskUpdate = useTaskStore(state => state.addTaskUpdate);
  const addSubTaskUpdate = useTaskStore(state => state.addSubTaskUpdate);
  const acceptTask = useTaskStore(state => state.acceptTask);
  const declineTask = useTaskStore(state => state.declineTask);
  const submitTaskForReview = useTaskStore(state => state.submitTaskForReview);
  const acceptTaskCompletion = useTaskStore(state => state.acceptTaskCompletion);
  const rejectTaskCompletion = useTaskStore(state => state.rejectTaskCompletion);
  const submitSubTaskForReview = useTaskStore(state => state.submitSubTaskForReview);
  const acceptSubTaskCompletion = useTaskStore(state => state.acceptSubTaskCompletion);
  const rejectSubTaskCompletion = useTaskStore(state => state.rejectSubTaskCompletion);
  const cancelTask = useTaskStore(state => state.cancelTask);
  const { getUserById, getAllUsers } = useUserStore();
  const { getProjectUserAssignments } = useProjectStoreWithCompanyInit(user?.companyId || "");
  const { getCompanyBanner } = useCompanyStore();
  const { pickAndUploadImages, isUploading, uploadProgress, isCompressing, compressionProgress } = useFileUpload();
  const { getFailuresForTask, dismissFailure, incrementRetryCount } = useUploadFailureStore();

  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updateForm, setUpdateForm] = useState({
    description: "",
    photos: [] as string[],
    completionPercentage: 0,
    status: "in_progress" as TaskStatus,
  });
  const [failedUploadsInSession, setFailedUploadsInSession] = useState<Array<{ fileName: string; error: string; originalFile: any }>>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showUserPicker, setShowUserPicker] = useState(false);
  const [showTaskDetailModal, setShowTaskDetailModal] = useState(false);
  const [selectedTaskForDetail, setSelectedTaskForDetail] = useState<Task | null>(null);
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [selectedUsersForReassign, setSelectedUsersForReassign] = useState<string[]>([]);
  const [reassignSearchQuery, setReassignSearchQuery] = useState("");
  const [showProgressDetails, setShowProgressDetails] = useState(false);
  const [selectedUpdateId, setSelectedUpdateId] = useState<string | null>(null);
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);

  // Get the parent task
  const parentTask = tasks.find(t => t.id === taskId);
  
  // ✅ UPDATED: If subTaskId is provided, find the subtask directly from the unified tasks table
  // (not from nested subTasks array - that's the old schema)
  const subTask = subTaskId 
    ? tasks.find(t => t.id === subTaskId)
    : null;
  
  // Use subtask if viewing subtask, otherwise use parent task
  const task = subTask || parentTask;
  const isViewingSubTask = !!subTask;
  
  // Get children tasks from the unified tasks table - memoized to avoid infinite loops
  const childTasks = useMemo(() => 
    task ? tasks.filter(t => t.parentTaskId === task.id) : [],
    [tasks, task?.id]
  );
  
  const assignedBy = task ? getUserById(task.assignedBy) : null;
  const assignedUsers = task ? task.assignedTo.map(userId => getUserById(userId)).filter(Boolean) : [];

  // Helper functions for styling
  const getPriorityColor = (priority: Priority) => {
    switch (priority) {
      case "critical": return "text-red-600 bg-red-50 border-red-200";
      case "high": return "text-orange-600 bg-orange-50 border-orange-200";
      case "medium": return "text-yellow-600 bg-yellow-50 border-yellow-200";
      case "low": return "text-green-600 bg-green-50 border-green-200";
      default: return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  const getStatusColor = (status: TaskStatus) => {
    switch (status) {
      case "completed": return "text-green-600 bg-green-50";
      case "in_progress": return "text-blue-600 bg-blue-50";
      case "rejected": return "text-red-600 bg-red-50";
      case "not_started": return "text-gray-600 bg-gray-50";
      default: return "text-gray-600 bg-gray-50";
    }
  };

  // Fetch task data when screen opens to ensure we have latest completion percentage
  useEffect(() => {
    if (taskId) {
      fetchTaskById(taskId);
    }
    if (subTaskId) {
      fetchTaskById(subTaskId);
    }
  }, [taskId, subTaskId, fetchTaskById]);

  // Mark task as read when viewing
  useEffect(() => {
    if (user && taskId) {
      markTaskAsRead(user.id, taskId);
      if (subTaskId) {
        markTaskAsRead(user.id, subTaskId);
      }
    }
  }, [taskId, subTaskId, user?.id, markTaskAsRead]);

  if (!user || !task) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <StatusBar style="dark" />
        
        {/* Header */}
        <View className="flex-row items-center bg-white border-b border-gray-200 px-6 py-4">
          <Text className="text-2xl font-semibold text-gray-900 flex-1">
            {task?.title || (isViewingSubTask ? t.tasks.taskDetails : t.tasks.taskDetails)}
          </Text>
        </View>

        <View className="flex-1 items-center justify-center px-6">
          <Ionicons name="alert-circle-outline" size={64} color="#ef4444" />
          <Text className="text-2xl font-semibold text-gray-900 mt-4 mb-2">
            {isViewingSubTask ? t.taskDetail.noChildren : t.tasks.noTasks}
          </Text>
          <Text className="text-gray-600 text-center mb-6">
            {isViewingSubTask ? t.taskDetail.noChildren : t.tasks.noTasks}
          </Text>
          <Pressable 
            onPress={onNavigateBack} 
            className="px-6 py-3 bg-blue-600 rounded-lg"
          >
            <Text className="text-white font-semibold">{t.common.back}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const assignedTo = task.assignedTo || [];
  const isAssignedToMe = Array.isArray(assignedTo) && assignedTo.includes(user.id);
  const isTaskCreator = task.assignedBy === user.id;

  // Users can only update if:
  // 1. They created the task, OR
  // 2. They are assigned AND have accepted the task
  const canUpdateProgress = isTaskCreator || (isAssignedToMe && task.accepted === true);
  const canEditTask = isTaskCreator;
  
  // Users can only create subtasks if:
  // 1. They created the task, OR
  // 2. They are assigned AND have accepted the task
  const canCreateSubTask = isTaskCreator || (isAssignedToMe && task.accepted === true);

  const handleAcceptTask = () => {
    Alert.alert(
      t.taskDetail.acceptTask,
      `${t.taskDetail.acceptTaskConfirm} "${task.title}"?`,
      [
        { text: t.common.cancel, style: "cancel" },
        {
          text: t.taskDetail.accept,
          onPress: async () => {
            try {
              await acceptTask(task.id, user.id);
              // Refetch tasks to ensure the dashboard shows updated state
              await fetchTasks();
              Alert.alert(t.errors.success, t.taskDetail.taskAccepted);
            } catch (error) {
              console.error('Error accepting task:', error);
              Alert.alert(t.errors.error, 'Failed to accept task. Please try again.');
            }
          }
        }
      ]
    );
  };

  const handleDeclineTask = () => {
    Alert.prompt(
      t.taskDetail.declineTask,
      t.taskDetail.declineTaskConfirm,
      [
        {
          text: t.common.cancel,
          style: "cancel",
        },
        {
          text: t.taskDetail.decline,
          style: "destructive",
          onPress: (reason: string | undefined) => {
            if (reason && reason.trim()) {
              declineTask(task.id, user.id, reason.trim());
              Alert.alert(t.taskDetail.taskDeclined, t.taskDetail.taskDeclined);
            }
          },
        }
      ],
      "plain-text"
    );
  };

  const handleCancelTask = () => {
    Alert.alert(
      t.taskDetail.cancelTask,
      `${t.taskDetail.cancelTaskConfirm} "${task.title}"?`,
      [
        {
          text: t.common.no,
          style: "cancel",
        },
        {
          text: t.common.yes,
          style: "destructive",
          onPress: async () => {
            try {
              await cancelTask(task.id, user.id);
              Alert.alert(t.taskDetail.taskCancelled, t.taskDetail.taskCancelled, [
                {
                  text: t.common.ok,
                  onPress: () => {
                    onNavigateBack();
                  }
                }
              ]);
            } catch (error: any) {
              Alert.alert(t.errors.error, error.message || t.taskDetail.taskCancelled);
            }
          },
        },
      ]
    );
  };

  const handleReassignTask = async () => {
    if (selectedUsersForReassign.length === 0) {
      Alert.alert(t.errors.error, t.taskDetail.selectUsers);
      return;
    }

    try {
      await updateTask(task.id, {
        assignedTo: selectedUsersForReassign,
        accepted: false,
        currentStatus: "not_started",
        declineReason: undefined,
      });

      Alert.alert(
        t.taskDetail.taskReassigned,
        `${t.taskDetail.taskReassigned} ${selectedUsersForReassign.length} ${t.phrases.users}.`,
        [{ text: t.common.ok, onPress: () => setShowReassignModal(false) }]
      );
      setSelectedUsersForReassign([]);
      setReassignSearchQuery("");
    } catch (error) {
      console.error("Error reassigning task:", error);
      Alert.alert(t.errors.error, t.taskDetail.taskReassigned);
    }
  };


  const handleApproveTask = () => {
    Alert.alert(
      t.taskDetail.acceptCompletionConfirm,
      t.taskDetail.acceptCompletionConfirm,
      [
        { text: t.common.cancel, style: "cancel" },
        {
          text: t.taskDetail.accept,
          onPress: async () => {
            try {
              if (isViewingSubTask && subTaskId) {
                await acceptSubTaskCompletion(taskId, subTaskId, user.id);
              } else {
                await acceptTaskCompletion(task.id, user.id);
              }
              Alert.alert(t.errors.success, t.taskDetail.completionAccepted);
            } catch (error) {
              Alert.alert(t.errors.error, t.taskDetail.completionAccepted);
            }
          }
        }
      ]
    );
  };

  const handleRejectTask = () => {
    Alert.prompt(
      t.taskDetail.rejectCompletionConfirm,
      t.taskDetail.rejectCompletionConfirm,
      [
        { text: t.common.cancel, style: "cancel" },
        {
          text: t.taskDetail.reject,
          style: "destructive",
          onPress: async (reason: string | undefined) => {
            if (!reason || !reason.trim()) {
              Alert.alert(t.errors.error, t.taskDetail.rejectCompletionConfirm);
              return;
            }

            try {
              if (isViewingSubTask && subTaskId) {
                await rejectSubTaskCompletion(taskId, subTaskId, user.id, reason.trim());
              } else {
                await rejectTaskCompletion(task.id, user.id, reason.trim());
              }
              Alert.alert(
                "Task Rejected", 
                "The task has been sent back to the assignee for corrections."
              );
            } catch (error) {
              Alert.alert("Error", "Failed to reject task.");
            }
          }
        }
      ],
      "plain-text",
      "",
      "default"
    );
  };

  const handleAttachmentPress = (uri: string) => {
    const isPDF = uri.toLowerCase().endsWith('.pdf') || uri.includes('application/pdf');
    
    if (isPDF) {
      // Open PDF in browser or external viewer
      Linking.openURL(uri).catch(() => {
        Alert.alert("Error", "Unable to open PDF file");
      });
    } else {
      // Open image in preview modal
      setSelectedImageUri(uri);
      setShowImagePreview(true);
    }
  };

  const handleRetryUpload = async (failedUpload: { fileName: string; error: string; originalFile: any }) => {
    if (!user || !task) return;

    try {
      console.log(`🔄 [Task Detail] Retrying upload for ${failedUpload.fileName}...`);
      
      // Import the uploadFileWithVerification directly
      const { uploadFileWithVerification } = require('../api/fileUploadService');
      
      const result = await uploadFileWithVerification({
        file: failedUpload.originalFile,
        entityType: 'task-update',
        entityId: task.id,
        companyId: user.companyId,
        userId: user.id,
      });

      if (result.success && result.file) {
        // Success - add to photos
        setUpdateForm(prev => ({
          ...prev,
          photos: [...prev.photos, result.file!.public_url],
        }));
        
        // Remove from failed list
        setFailedUploadsInSession(prev => 
          prev.filter(f => f.fileName !== failedUpload.fileName)
        );
        
        Alert.alert("Success", `${failedUpload.fileName} uploaded successfully!`);
        console.log(`✅ [Task Detail] Retry successful for ${failedUpload.fileName}`);
      } else {
        // Still failed
        Alert.alert(
          "Retry Failed", 
          result.error || "Upload failed again. Please check your connection and try again."
        );
        console.error(`❌ [Task Detail] Retry failed:`, result.error);
      }
    } catch (error: any) {
      console.error('❌ [Task Detail] Retry error:', error);
      Alert.alert("Error", error.message || "Retry failed. Please try again.");
    }
  };

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
              console.log('📸 [Task Detail] Taking photo from camera...');
              
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
                setUpdateForm(prev => ({
                  ...prev,
                  photos: [...prev.photos, ...newPhotoUrls],
                }));
                console.log(`✅ [Task Detail] ${results.successful.length} photo(s) uploaded and ready`);
              }

              if (results.failed.length > 0) {
                setFailedUploadsInSession(prev => [...prev, ...results.failed]);
              }
            } catch (error) {
              console.error('❌ [Task Detail] Failed to take photo:', error);
              Alert.alert("Error", "Failed to take photo");
            }
          },
        },
        {
          text: "Choose from Library",
          onPress: async () => {
            try {
              console.log('📚 [Task Detail] Selecting photos from library...');
              
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
                setUpdateForm(prev => ({
                  ...prev,
                  photos: [...prev.photos, ...newPhotoUrls],
                }));
                console.log(`✅ [Task Detail] ${results.successful.length} photo(s) uploaded and ready`);
              }

              if (results.failed.length > 0) {
                setFailedUploadsInSession(prev => [...prev, ...results.failed]);
              }
            } catch (error) {
              console.error('❌ [Task Detail] Failed to pick images:', error);
              Alert.alert("Error", "Failed to pick images");
            }
          },
        },
        {
          text: "Paste from Clipboard",
          onPress: async () => {
            Alert.alert(
              "Not Available",
              "Clipboard paste is temporarily disabled. Please use Camera or Library to upload photos."
            );
          },
        },
        {
          text: "Cancel",
          style: "cancel",
        },
      ]
    );
  };

  const handleSubmitUpdate = async () => {
    if (!updateForm.description.trim()) {
      Alert.alert("Error", "Please provide a description for this update");
      return;
    }

    setIsSubmitting(true);

    try {
      // Status is automatically calculated in the store based on completion percentage
      const calculatedStatus: TaskStatus = 
        updateForm.completionPercentage === 0 ? "not_started" :
        updateForm.completionPercentage === 100 ? "completed" :
        "in_progress";

      const updatePayload = {
        description: updateForm.description,
        photos: updateForm.photos,
        completionPercentage: updateForm.completionPercentage,
        status: calculatedStatus,
        userId: user.id,
      };

      // Use appropriate method based on whether viewing subtask
      if (isViewingSubTask && subTaskId) {
        addSubTaskUpdate(taskId, subTaskId, updatePayload);
      } else {
        addTaskUpdate(task.id, updatePayload);
      }

      setUpdateForm({
        description: "",
        photos: [],
        completionPercentage: updateForm.completionPercentage,
        status: calculatedStatus,
      });

      // Clear failed uploads after successful submission
      setFailedUploadsInSession([]);

      setShowUpdateModal(false);
      
      // Check if task reached 100% and prompt for review submission
      if (updateForm.completionPercentage === 100) {
        // Check if task is self-assigned (no review needed, auto-accepted)
        const assignedTo = task.assignedTo || [];
        const isSelfAssigned = task.assignedBy === user.id && 
                              assignedTo.length === 1 && 
                              assignedTo[0] === user.id;
        
        if (!isSelfAssigned && !task.readyForReview) {
          // Not self-assigned and not already submitted - prompt for review
          Alert.alert(
            "Task Complete!",
            "Great job! Would you like to submit this task for review by the task creator?",
            [
              {
                text: "Not Yet",
                style: "cancel",
                onPress: () => {
                  Alert.alert("Success", "🎉 Task marked as completed!");
                }
              },
              {
                text: t.taskDetail.submitForReview,
                onPress: async () => {
                  try {
                    if (isViewingSubTask && subTaskId) {
                      await submitSubTaskForReview(taskId, subTaskId);
                    } else {
                      await submitTaskForReview(task.id);
                    }
                    Alert.alert(t.errors.success, t.taskDetail.taskSubmitted);
                  } catch (error) {
                    Alert.alert(t.errors.error, t.taskDetail.taskSubmitted);
                  }
                }
              }
            ]
          );
        } else {
          // Self-assigned or already submitted
          Alert.alert("Success", "🎉 Task marked as completed! Great job!");
        }
      } else {
        // Not 100%, show normal success message
        Alert.alert("Success", "Progress update added successfully!");
      }
    } catch (error) {
      Alert.alert(t.errors.error, t.taskDetail.failedToSubmitUpdate);
    } finally {
      setIsSubmitting(false);
    }
  };


  const isOverdue = new Date(task.dueDate) < new Date() && task.currentStatus !== "completed";

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <StatusBar style="dark" />
      
      {/* Standard Header */}
      <StandardHeader 
        title={task?.title || t.tasks.taskDetails}
        showBackButton={true}
        onBackPress={onNavigateBack}
      />

      {/* Accept/Reject Banner - Shown at top when task is pending acceptance */}
      {isAssignedToMe && task.accepted === false && !task.declineReason && task.currentStatus !== "rejected" && (
        <View className="bg-amber-50 border-4 border-red-500 px-6 py-4 mx-6 mt-4 rounded-lg">
          <View className="flex-row gap-3">
            <Pressable
              onPress={() => {
                if (isViewingSubTask && subTaskId) {
                  acceptSubTask(taskId, subTaskId, user.id);
                  Alert.alert(t.errors.success, t.taskDetail.subTaskAccepted);
                } else {
                  handleAcceptTask();
                }
              }}
              className="flex-1 bg-green-600 py-3.5 rounded-lg items-center flex-row justify-center"
            >
              <Ionicons name="checkmark-circle" size={20} color="white" />
              <Text className="text-white font-semibold text-lg ml-2">{t.taskDetail.accept}</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                if (isViewingSubTask && subTaskId) {
                  Alert.prompt(
                    t.taskDetail.declineSubTask,
                    t.taskDetail.declineSubTaskReason,
                    (reason) => {
                      if (reason && reason.trim()) {
                        declineSubTask(taskId, subTaskId, user.id, reason.trim());
                        Alert.alert(t.taskDetail.subTaskDeclined, t.taskDetail.subTaskDeclinedMessage);
                      }
                    },
                    "plain-text"
                  );
                } else {
                  handleDeclineTask();
                }
              }}
              className="flex-1 bg-red-600 py-3.5 rounded-lg items-center flex-row justify-center"
            >
              <Ionicons name="close-circle" size={20} color="white" />
              <Text className="text-white font-semibold text-lg ml-2">{t.taskDetail.decline}</Text>
            </Pressable>
          </View>
        </View>
      )}


      {/* Awaiting Approval Banner - Shown to assignee after submitting for review */}
      {isAssignedToMe && 
       task.accepted === true && 
       task.completionPercentage === 100 && 
       task.readyForReview && 
       !task.reviewAccepted && (
        <View className="bg-amber-50 border-b-2 border-amber-200 px-6 py-4">
          <View className="flex-row items-center">
            <View className="w-10 h-10 bg-amber-100 rounded-full items-center justify-center mr-3">
              <Ionicons name="time-outline" size={24} color="#f59e0b" />
            </View>
            <View className="flex-1">
              <Text className="text-xl font-bold text-amber-900">
                {t.taskDetail.submittedForReview}
              </Text>
              <Text className="text-base text-amber-700">
                {t.taskDetail.awaitingApproval}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Approval Banner - Shown when task is submitted for review and user is the creator */}
      {isTaskCreator && 
       task.readyForReview && 
       !task.reviewAccepted && 
       task.completionPercentage === 100 && (
        <View className="bg-purple-50 border-b-2 border-purple-200 px-6 py-4">
          <View className="flex-row items-center mb-3">
            <View className="w-10 h-10 bg-purple-100 rounded-full items-center justify-center mr-3">
              <Ionicons name="eye" size={24} color="#9333ea" />
            </View>
            <View className="flex-1">
              <Text className="text-xl font-bold text-purple-900">
                {t.taskDetail.readyForReview}
              </Text>
              <Text className="text-base text-purple-700">
                {t.taskDetail.assigneeSubmitted}
              </Text>
            </View>
          </View>
          <View className="flex-row gap-3">
            <Pressable
              onPress={handleRejectTask}
              className="flex-1 bg-red-600 py-3.5 rounded-lg items-center flex-row justify-center"
            >
              <Ionicons name="close-circle" size={20} color="white" />
              <Text className="text-white font-semibold text-lg ml-2">{t.taskDetail.reject}</Text>
            </Pressable>
            <Pressable
              onPress={handleApproveTask}
              className="flex-1 bg-green-600 py-3.5 rounded-lg items-center flex-row justify-center"
            >
              <Ionicons name="checkmark-done-circle" size={20} color="white" />
              <Text className="text-white font-semibold text-lg ml-2">{t.taskDetail.accept}</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Task Approved Banner - Shown when task is approved */}
      {task.reviewAccepted && task.reviewedBy && (
        <View className="bg-green-50 border-b-2 border-green-200 px-6 py-4">
          <View className="flex-row items-center">
            <View className="w-10 h-10 bg-green-100 rounded-full items-center justify-center mr-3">
              <Ionicons name="checkmark-done-circle" size={24} color="#16a34a" />
            </View>
            <View className="flex-1">
              <Text className="text-xl font-bold text-green-900">
                ✓ {t.taskDetail.taskApproved}
              </Text>
              <Text className="text-base text-green-700">
                {t.taskDetail.reviewedAndApproved} {getUserById(task.reviewedBy)?.name || "Unknown"}
                {task.reviewedAt && ` on ${new Date(task.reviewedAt).toLocaleDateString()}`}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Rejected Task Banner - Shown when task is rejected and user is the assigner */}
      {task.currentStatus === "rejected" && task.assignedBy === user.id && (
        <View className="bg-red-50 border-b-2 border-red-200 px-6 py-4">
          <View className="flex-row items-center mb-3">
            <View className="w-10 h-10 bg-red-100 rounded-full items-center justify-center mr-3">
              <Ionicons name="close-circle" size={24} color="#dc2626" />
            </View>
            <View className="flex-1">
              <Text className="text-xl font-bold text-red-900">
                {t.taskDetail.taskRejected}
              </Text>
              <Text className="text-base text-red-700">
                {t.taskDetail.taskDeclined}
              </Text>
              {task.declineReason && (
                <Text className="text-base text-red-600 mt-1 italic">
                  {t.taskDetail.reason} {task.declineReason}
                </Text>
              )}
            </View>
          </View>
          <Pressable
            onPress={() => setShowReassignModal(true)}
            className="bg-blue-600 py-3.5 rounded-lg items-center flex-row justify-center"
          >
            <Ionicons name="people" size={20} color="white" />
            <Text className="text-white font-semibold text-lg ml-2">{t.taskDetail.reassignToAnotherUser}</Text>
          </Pressable>
        </View>
      )}

      <ScrollView className="flex-1">
        {/* Assignment Information Card - Side by Side Layout */}
        <View className="bg-white mx-4 mt-3 rounded-xl border border-gray-200 p-4">
          
          {/* Assigned By and Assigned To - Side by Side */}
          <View className="flex-row gap-2">
            {/* Assigned By Card */}
            <Pressable 
              className="flex-1 bg-gray-50 rounded-lg p-3"
              onPress={() => {
                if (assignedBy?.phone && assignedBy.id !== user.id) {
                  Linking.openURL(`tel:${assignedBy.phone}`);
                }
              }}
              disabled={!assignedBy?.phone || assignedBy.id === user.id}
            >
              <Text className="text-sm font-medium text-gray-500 mb-2">{t.taskDetail.assignedBy}</Text>
              <View className="flex-row items-center mb-2">
                <View className="w-8 h-8 bg-blue-100 rounded-full items-center justify-center mr-2">
                  <Ionicons name="person" size={16} color="#3b82f6" />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-semibold text-gray-900" numberOfLines={1}>
                    {assignedBy?.id === user.id ? `${assignedBy?.name || "Unknown"} (me)` : (assignedBy?.name || "Unknown")}
                  </Text>
                  {assignedBy?.phone && (
                    <Text className="text-sm text-gray-500">
                      {assignedBy.phone}
                    </Text>
                  )}
                </View>
              </View>
            </Pressable>

            {/* Assigned To Card */}
            <View className="flex-1 bg-gray-50 rounded-lg p-3">
              <Text className="text-sm font-medium text-gray-500 mb-2">{t.taskDetail.assignedTo}</Text>
              {assignedUsers.length > 0 ? (
                assignedUsers.map((assignedUser, index) => {
                  if (!assignedUser) return null;
                  
                  // Get progress for this user
                  const userUpdates = task.updates?.filter(update => update.userId === assignedUser.id) || [];
                  const latestUpdate = userUpdates[userUpdates.length - 1];
                  const userProgress = latestUpdate?.completionPercentage || task.completionPercentage || 0;
                  
                  return (
                    <Pressable 
                      key={assignedUser.id} 
                      className={index > 0 ? "mt-3 pt-3 border-t border-gray-200" : ""}
                      onPress={() => {
                        if (assignedUser.phone && assignedUser.id !== user.id) {
                          Linking.openURL(`tel:${assignedUser.phone}`);
                        }
                      }}
                      disabled={!assignedUser.phone || assignedUser.id === user.id}
                    >
                      <View className="flex-row items-center mb-2">
                        <View className="w-8 h-8 bg-green-100 rounded-full items-center justify-center mr-2">
                          <Ionicons name="person" size={16} color="#10b981" />
                        </View>
                        <View className="flex-1">
                          <Text className="text-base font-semibold text-gray-900" numberOfLines={1}>
                            {assignedUser.id === user.id ? `${assignedUser.name} (me)` : assignedUser.name}
                          </Text>
                          {assignedUser.phone && (
                            <Text className="text-sm text-gray-500">
                              {assignedUser.phone}
                            </Text>
                          )}
                        </View>
                      </View>
                    </Pressable>
                  );
                })
              ) : (
                <Text className="text-sm text-gray-500">{t.taskDetail.noAssignees}</Text>
              )}
            </View>
          </View>

          {/* Due Date, Status, Priority - Single Row Below */}
          <View className="flex-row items-center flex-wrap gap-2 mt-4">
            <View className="flex-row items-center">
              <Ionicons name="calendar-outline" size={16} color="#6b7280" />
              <Text className="text-base font-medium text-gray-600 ml-1">{t.taskDetail.due} </Text>
              <Text className="text-base font-semibold text-gray-900">
                {new Date(task.dueDate).toLocaleDateString()}
              </Text>
            </View>
            <View className={cn(
              "px-2 py-1 rounded-full",
              task.currentStatus === "completed" ? "bg-green-50" :
              task.currentStatus === "in_progress" ? "bg-blue-50" :
              task.currentStatus === "rejected" ? "bg-red-50" :
              "bg-gray-50"
            )}>
              <Text className={cn(
                "text-sm font-medium capitalize",
                task.currentStatus === "completed" ? "text-green-700" :
                task.currentStatus === "in_progress" ? "text-blue-700" :
                task.currentStatus === "rejected" ? "text-red-700" :
                "text-gray-700"
              )}>
                {task.currentStatus.replace("_", " ")}
              </Text>
            </View>
            <View className={cn(
              "px-2 py-1 rounded-full",
              task.priority === "critical" ? "bg-red-50" :
              task.priority === "high" ? "bg-orange-50" :
              task.priority === "medium" ? "bg-yellow-50" :
              "bg-green-50"
            )}>
              <Text className={cn(
                "text-sm font-medium capitalize",
                task.priority === "critical" ? "text-red-700" :
                task.priority === "high" ? "text-orange-700" :
                task.priority === "medium" ? "text-yellow-700" :
                "text-green-700"
              )}>
                {task.priority}
              </Text>
            </View>
          </View>

          {/* Description */}
          <View className="mt-3">
            <Text className="text-base text-gray-700">
              {task.description}
            </Text>
          </View>
        </View>

        {/* Attachments Section */}
        {task.attachments && task.attachments.length > 0 && (
          <View className="bg-white mx-4 mt-3 rounded-xl border border-gray-200 p-4">
            <View className="flex-row items-center mb-3">
              <Ionicons name="images-outline" size={18} color="#6b7280" />
              <Text className="text-lg font-semibold text-gray-900 ml-2">
                Attachments ({task.attachments.length})
              </Text>
            </View>
            
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row gap-3">
                {task.attachments.map((attachment, index) => {
                  const isPDF = attachment.toLowerCase().endsWith('.pdf') || attachment.includes('application/pdf');
                  
                  return (
                    <Pressable
                      key={index}
                      onPress={() => handleAttachmentPress(attachment)}
                      className="relative"
                    >
                      {isPDF ? (
                        // PDF preview - show PDF icon
                        <View className="w-28 h-28 rounded-xl bg-red-50 border-2 border-red-200 items-center justify-center">
                          <Ionicons name="document-text" size={48} color="#dc2626" />
                          <Text className="text-sm text-red-700 font-semibold mt-1">PDF</Text>
                        </View>
                      ) : (
                        // Image preview
                        <Image
                          source={{ uri: attachment }}
                          className="w-28 h-28 rounded-xl"
                          resizeMode="cover"
                        />
                      )}
                      
                      {/* Preview indicator */}
                      <View className="absolute top-1 right-1 bg-black/60 rounded-full p-1">
                        <Ionicons name="expand" size={12} color="white" />
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        )}

        {/* Progress & Updates Combined Section */}
        <View className="bg-white mx-4 mt-3 rounded-xl border border-gray-200 p-3 mb-4">
          {/* Header with Progress */}
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-xl font-semibold text-gray-900">Comp. %</Text>
            <Text className="text-2xl font-bold text-blue-600">{task.completionPercentage}%</Text>
          </View>
          
          {/* Progress Bar */}
          <View className="w-full bg-gray-200 rounded-full h-3 mb-1">
            <View 
              className={cn(
                "h-3 rounded-full",
                task.completionPercentage === 100 ? "bg-green-500" :
                task.completionPercentage >= 75 ? "bg-blue-500" :
                task.completionPercentage >= 50 ? "bg-yellow-500" :
                task.completionPercentage >= 25 ? "bg-orange-500" :
                "bg-gray-400"
              )}
              style={{ width: `${task.completionPercentage}%` }}
            />
          </View>
          
          {/* Completion Message */}
          {task.completionPercentage === 100 && (
            <View className="flex-row items-center mt-2 mb-3 p-2 bg-green-50 rounded-lg">
              <Ionicons name="checkmark-circle" size={16} color="#10b981" />
              <Text className="text-green-700 text-base font-medium ml-2">
                Completed! 🎉
              </Text>
            </View>
          )}

          {/* Divider */}
          <View className="border-t border-gray-200 my-3" />

          {/* Updates Header - Clickable */}
          <Pressable 
            onPress={() => {
              setSelectedUpdateId(null); // Reset selection when opening from header
              setShowProgressDetails(true);
            }}
            className="flex-row items-center justify-between mb-2 active:opacity-70"
          >
            <Text className="text-lg font-semibold text-gray-900">{t.tasks.progress}</Text>
            <View className="flex-row items-center">
              <Text className="text-sm text-gray-500 mr-1">{task.updates.length} updates</Text>
              <Ionicons name="chevron-forward" size={16} color="#6b7280" />
            </View>
          </Pressable>
          
          {/* Updates List */}
          {task.updates.length > 0 ? (
            <View className="space-y-3">
              {task.updates.map((update) => {
                const updateUser = getUserById(update.userId);
                return (
                  <Pressable 
                    key={update.id} 
                    onPress={() => {
                      setSelectedUpdateId(update.id);
                      setShowProgressDetails(true);
                    }}
                    className="border-l-4 border-blue-200 pl-4 active:opacity-70"
                  >
                    <View className="flex-row items-center justify-between mb-2">
                      <Text className="font-medium text-gray-900">
                        {updateUser?.name || "Unknown User"}
                      </Text>
                      <Text className="text-sm text-gray-500">
                        {new Date(update.timestamp).toLocaleString()}
                      </Text>
                    </View>
                    <Text className="text-gray-700 mb-2">{update.description}</Text>
                    <View className="flex-row items-center space-x-4 mb-2">
                      <Text className="text-base text-gray-500">
                        Progress: {update.completionPercentage}%
                      </Text>
                      <View className={cn("px-2 py-1 rounded", getStatusColor(update.status))}>
                        <Text className="text-sm capitalize">
                          {update.status.replace("_", " ")}
                        </Text>
                      </View>
                    </View>
                    
                    {/* Photos in update */}
                    {update.photos && update.photos.length > 0 && (
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-1">
                        <View className="flex-row gap-2">
                          {update.photos.map((photo, photoIndex) => {
                            const isPDF = photo.toLowerCase().endsWith('.pdf') || photo.includes('application/pdf');
                            
                            return (
                              <Pressable
                                key={photoIndex}
                                onPress={() => handleAttachmentPress(photo)}
                                className="relative"
                              >
                                {isPDF ? (
                                  <View className="w-16 h-16 rounded-lg bg-red-50 border border-red-200 items-center justify-center">
                                    <Ionicons name="document-text" size={24} color="#dc2626" />
                                  </View>
                                ) : (
                                  <Image
                                    source={{ uri: photo }}
                                    className="w-16 h-16 rounded-lg"
                                    resizeMode="cover"
                                  />
                                )}
                                <View className="absolute top-0.5 right-0.5 bg-black/60 rounded-full p-0.5">
                                  <Ionicons name="expand" size={8} color="white" />
                                </View>
                              </Pressable>
                            );
                          })}
                        </View>
                      </ScrollView>
                    )}
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <View className="py-6 items-center">
              <Ionicons name="chatbubble-outline" size={40} color="#d1d5db" />
              <Text className="text-gray-500 mt-2 text-base">{t.taskDetail.noUpdates}</Text>
            </View>
          )}
        </View>

        {/* Subtasks Section - Only show for parent tasks (not when viewing a subtask) */}
        {!isViewingSubTask && childTasks.length > 0 && (
            <View className="bg-white mx-4 mt-3 rounded-xl border border-gray-200 p-4 mb-4">
              <View className="flex-row items-center justify-between mb-3">
                <View className="flex-row items-center">
                  <Ionicons name="git-branch-outline" size={20} color="#7c3aed" />
                  <Text className="text-xl font-semibold text-gray-900 ml-2">
                    Sub-Tasks ({childTasks.length})
                  </Text>
                </View>
              </View>

              {/* Subtasks List using TaskCard */}
              <View>
                {childTasks.map((subtask, index) => (
                  <View key={subtask.id} className={index > 0 ? "mt-2" : ""}>
                    <TaskCard 
                      task={subtask}
                      onNavigateToTaskDetail={(taskId, subTaskId) => {
                        // Navigate to subtask detail
                        if (onNavigateToCreateTask) {
                          onNavigateToCreateTask(taskId, subTaskId);
                        }
                      }}
                    />
                  </View>
                ))}
              </View>
            </View>
        )}

      </ScrollView>

      {/* Update Modal */}
      <Modal
        visible={showUpdateModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView className="flex-1 bg-gray-50">
          <ModalHandle />
          
          <View className="flex-row items-center bg-white border-b border-gray-200 px-6 py-4">
            <Pressable 
              onPress={() => {
                setShowUpdateModal(false);
                // Clear failed uploads when canceling
                setFailedUploadsInSession([]);
              }}
              className="mr-4"
            >
              <Text className="text-blue-600 font-medium">Cancel</Text>
            </Pressable>
            <Text className="text-xl font-semibold text-gray-900 flex-1">
              Progress Update
            </Text>
            <Pressable
              onPress={handleSubmitUpdate}
              disabled={isSubmitting}
              className={cn(
                "px-4 py-2 rounded-lg",
                isSubmitting ? "bg-gray-300" : "bg-blue-600"
              )}
            >
              <Text className="text-white font-medium">
                {isSubmitting ? "Submitting..." : "Submit"}
              </Text>
            </Pressable>
          </View>

          <ScrollView className="flex-1 px-6 py-4">
            {/* Photos & Files - Top Section */}
            <View className="mb-6">
              <Text className="text-xl font-semibold text-gray-900 mb-3">
                Photos & Files
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
                        {/* Success badge */}
                        <View className="absolute top-1 left-1 w-6 h-6 bg-green-500 rounded-full items-center justify-center">
                          <Ionicons name="checkmark" size={14} color="white" />
                        </View>
                        {/* Remove button */}
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
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 items-center bg-gray-50"
              >
                <Ionicons name="cloud-upload-outline" size={48} color="#9ca3af" />
                <Text className="text-gray-600 font-medium mt-3">Tap to Add Files</Text>
                <Text className="text-gray-400 text-base mt-1">
                  {updateForm.photos.length === 0 ? "No files added" : `${updateForm.photos.length} file(s) added`}
                </Text>
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
                <Text className="text-base text-gray-600">Current: {task.completionPercentage}%</Text>
                <View className="flex-row items-center">
                  <View className="w-3 h-3 bg-red-500 rounded-full mr-2"></View>
                  <Text className="text-base text-red-600 font-medium">Previous</Text>
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
        </SafeAreaView>
      </Modal>

      {/* Task Detail Slider Modal */}
      <Modal
        visible={showTaskDetailModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView className="flex-1 bg-gray-50">
          <ModalHandle />
          
          <View className="flex-row items-center bg-white border-b border-gray-200 px-6 py-4">
            <Pressable 
              onPress={() => {
                setShowTaskDetailModal(false);
                setSelectedTaskForDetail(null);
              }}
              className="mr-4"
            >
              <Text className="text-blue-600 font-medium">Close</Text>
            </Pressable>
            <Text className="text-xl font-semibold text-gray-900 flex-1">
              {selectedTaskForDetail?.title || "Task Details"}
            </Text>
          </View>

          {selectedTaskForDetail && (
            <ScrollView className="flex-1 px-6 py-4">
              {/* Task Info Card */}
              <View className="bg-white rounded-xl p-6 mb-4">
                {/* Title */}
                <Text className="text-3xl font-bold text-gray-900 mb-4">
                  {selectedTaskForDetail.title}
                </Text>

                {/* Status and Priority */}
                <View className="flex-row items-center mb-4">
                  <View className={cn("px-3 py-1.5 rounded-full mr-3", getStatusColor(selectedTaskForDetail.currentStatus))}>
                    <Text className="text-base font-medium capitalize">
                      {selectedTaskForDetail.currentStatus.replace("_", " ")}
                    </Text>
                  </View>
                  <View className={cn("px-3 py-1.5 rounded-full border", getPriorityColor(selectedTaskForDetail.priority))}>
                    <Text className="text-base font-medium capitalize">
                      {selectedTaskForDetail.priority} Priority
                    </Text>
                  </View>
                </View>

                {/* Description */}
                <Text className="text-gray-700 text-lg leading-6 mb-6">
                  {selectedTaskForDetail.description}
                </Text>

                {/* Task Details Grid */}
                <View className="space-y-4">
                  <View className="flex-row items-center">
                    <Ionicons name="calendar-outline" size={20} color="#6b7280" />
                    <View className="ml-3 flex-1">
                      <Text className="text-base text-gray-500">Due Date</Text>
                      <Text className={cn("font-medium", new Date(selectedTaskForDetail.dueDate) < new Date() && selectedTaskForDetail.currentStatus !== "completed" ? "text-red-600" : "text-gray-900")}>
                        {new Date(selectedTaskForDetail.dueDate).toLocaleDateString()} 
                        {new Date(selectedTaskForDetail.dueDate) < new Date() && selectedTaskForDetail.currentStatus !== "completed" && " (Overdue)"}
                      </Text>
                    </View>
                  </View>

                  <View className="flex-row items-center">
                    <Ionicons name="pricetag-outline" size={20} color="#6b7280" />
                    <View className="ml-3 flex-1">
                      <Text className="text-base text-gray-500">Category</Text>
                      <Text className="font-medium text-gray-900 capitalize">
                        {selectedTaskForDetail.category}
                      </Text>
                    </View>
                  </View>

                  <View className="flex-row items-center">
                    <Ionicons name="person-outline" size={20} color="#6b7280" />
                    <View className="ml-3 flex-1">
                      <Text className="text-base text-gray-500">Assigned By</Text>
                      <Text className="font-medium text-gray-900">
                        {getUserById(selectedTaskForDetail.assignedBy)?.name || "Unknown"}
                      </Text>
                    </View>
                  </View>

                  <View className="flex-row items-center">
                    <Ionicons name="people-outline" size={20} color="#6b7280" />
                    <View className="ml-3 flex-1">
                      <Text className="text-base text-gray-500">Assigned To</Text>
                      <Text className="font-medium text-gray-900">
                        {selectedTaskForDetail.assignedTo.map(userId => getUserById(userId)?.name).filter(Boolean).join(", ")}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Progress Card */}
              <View className="bg-white rounded-xl p-6 mb-4">
                <Text className="text-xl font-semibold text-gray-900 mb-4">Progress</Text>
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-gray-600">Completion</Text>
                  <Text className={cn(
                    "font-semibold text-3xl",
                    selectedTaskForDetail.completionPercentage === 100 ? "text-green-600" :
                    selectedTaskForDetail.completionPercentage >= 75 ? "text-blue-600" :
                    selectedTaskForDetail.completionPercentage >= 50 ? "text-yellow-600" :
                    selectedTaskForDetail.completionPercentage >= 25 ? "text-orange-600" :
                    "text-gray-600"
                  )}>
                    {selectedTaskForDetail.completionPercentage}%
                  </Text>
                </View>
                <View className="w-full bg-gray-200 rounded-full h-4">
                  <View 
                    className={cn(
                      "h-4 rounded-full",
                      selectedTaskForDetail.completionPercentage === 100 ? "bg-green-500" :
                      selectedTaskForDetail.completionPercentage >= 75 ? "bg-blue-500" :
                      selectedTaskForDetail.completionPercentage >= 50 ? "bg-yellow-500" :
                      selectedTaskForDetail.completionPercentage >= 25 ? "bg-orange-500" :
                      "bg-gray-400"
                    )} 
                    style={{ width: `${selectedTaskForDetail.completionPercentage}%` }}
                  />
                </View>
                {selectedTaskForDetail.completionPercentage === 100 && (
                  <View className="flex-row items-center mt-2">
                    <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                    <Text className="text-green-600 text-base font-medium ml-1">
                      Task Completed!
                    </Text>
                  </View>
                )}
              </View>

              {/* Task Updates */}
              <View className="bg-white rounded-xl p-6 mb-6">
                <View className="flex-row items-center justify-between mb-4">
                  <Text className="text-xl font-semibold text-gray-900">{t.taskDetail.updates}</Text>
                  <Text className="text-base text-gray-500">{selectedTaskForDetail.updates.length} updates</Text>
                </View>
                
                {selectedTaskForDetail.updates.length > 0 ? (
                  <View className="space-y-4">
                    {selectedTaskForDetail.updates.map((update) => {
                      const updateUser = getUserById(update.userId);
                      return (
                        <View key={update.id} className="border-l-4 border-blue-200 pl-4">
                          <View className="flex-row items-center justify-between mb-2">
                            <Text className="font-medium text-gray-900">
                              {updateUser?.name || "Unknown User"}
                            </Text>
                            <Text className="text-sm text-gray-500">
                              {new Date(update.timestamp).toLocaleString()}
                            </Text>
                          </View>
                          <Text className="text-gray-700 mb-2">{update.description}</Text>
                          <View className="flex-row items-center space-x-4">
                            <Text className="text-base text-gray-500">
                              Progress: {update.completionPercentage}%
                            </Text>
                            <View className={cn("px-2 py-1 rounded", getStatusColor(update.status))}>
                              <Text className="text-sm capitalize">
                                {update.status.replace("_", " ")}
                              </Text>
                            </View>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                ) : (
                  <View className="py-8 items-center">
                    <Ionicons name="chatbubble-outline" size={48} color="#d1d5db" />
                    <Text className="text-gray-500 mt-2">{t.taskDetail.noUpdates}</Text>
                  </View>
                )}
              </View>
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>

      {/* Reassign Modal */}
      <Modal
        visible={showReassignModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowReassignModal(false)}
      >
        <SafeAreaView className="flex-1 bg-gray-50">
          <StatusBar style="dark" />
          
          <ModalHandle />

          {/* Modal Header */}
          <View className="flex-row items-center bg-white border-b border-gray-200 px-6 py-4">
            <Pressable onPress={() => setShowReassignModal(false)} className="mr-4">
              <Ionicons name="close" size={24} color="#374151" />
            </Pressable>
            <Text className="flex-1 text-xl font-semibold text-gray-900">
              Reassign Task
            </Text>
            <Pressable
              onPress={handleReassignTask}
              className="bg-blue-600 px-4 py-2 rounded-lg"
            >
              <Text className="text-white font-medium">Reassign</Text>
            </Pressable>
          </View>

          {/* Search */}
          <View className="px-6 pt-4 pb-3">
            <View className="flex-row items-center bg-white border border-gray-300 rounded-lg px-4 py-3">
              <Ionicons name="search" size={20} color="#6b7280" />
              <TextInput
                className="flex-1 ml-2 text-lg"
                placeholder="Search users..."
                value={reassignSearchQuery}
                onChangeText={setReassignSearchQuery}
              />
            </View>
          </View>

          {/* User List */}
          <ScrollView className="flex-1 px-6">
            <Text className="text-base text-gray-600 mb-3">
              Select user(s) to reassign this task to:
            </Text>
            
            {(() => {
              const projectUsers = task?.projectId 
                ? getProjectUserAssignments(task.projectId)
                    .filter(assignment => assignment.isActive)
                    .map(assignment => getUserById(assignment.userId))
                    .filter(Boolean)
                : [];

              let filteredUsers = projectUsers.filter(u => 
                u && (
                  u.name.toLowerCase().includes(reassignSearchQuery.toLowerCase()) ||
                  (u.email && u.email.toLowerCase().includes(reassignSearchQuery.toLowerCase()))
                )
              );

              // Sort favorites to top
              if (user?.id) {
                filteredUsers = [...filteredUsers].sort((a, b) => {
                  const aIsFavorite = isFavoriteUser(user.id, a.id);
                  const bIsFavorite = isFavoriteUser(user.id, b.id);
                  
                  if (aIsFavorite && !bIsFavorite) return -1;
                  if (!aIsFavorite && bIsFavorite) return 1;
                  return 0;
                });
              }

              return filteredUsers.map((projectUser) => {
                if (!projectUser) return null;
                const isSelected = selectedUsersForReassign.includes(projectUser.id);
                const isFavorite = user?.id ? isFavoriteUser(user.id, projectUser.id) : false;
                
                return (
                  <Pressable
                    key={projectUser.id}
                    onPress={() => {
                      if (isSelected) {
                        setSelectedUsersForReassign(prev => prev.filter(id => id !== projectUser.id));
                      } else {
                        setSelectedUsersForReassign(prev => [...prev, projectUser.id]);
                      }
                    }}
                    className={cn(
                      "flex-row items-center p-4 rounded-lg border mb-3",
                      isSelected ? "bg-blue-50 border-blue-300" : "bg-white border-gray-200"
                    )}
                  >
                    <View className={cn(
                      "w-6 h-6 rounded border-2 items-center justify-center mr-3",
                      isSelected ? "bg-blue-600 border-blue-600" : "bg-white border-gray-300"
                    )}>
                      {isSelected && <Ionicons name="checkmark" size={16} color="white" />}
                    </View>
                    <View className="flex-1">
                      <Text className="text-lg font-semibold text-gray-900">
                        {projectUser.name}
                      </Text>
                      <Text className="text-base text-gray-500 capitalize">
                        {projectUser.role}
                      </Text>
                      <Text className="text-sm text-gray-400">
                        {projectUser.email}
                      </Text>
                    </View>
                    
                    {/* Favorite Star */}
                    <Pressable
                      onPress={(e) => {
                        e.stopPropagation();
                        if (user?.id) {
                          toggleFavoriteUser(user.id, projectUser.id);
                        }
                      }}
                      className="p-2"
                    >
                      <Ionicons 
                        name={isFavorite ? "star" : "star-outline"} 
                        size={24} 
                        color={isFavorite ? "#fbbf24" : "#9ca3af"} 
                      />
                    </Pressable>
                  </Pressable>
                );
              });
            })()}
          </ScrollView>

          {/* Selected Count */}
          <View className="bg-white border-t border-gray-200 px-6 py-4">
            <Text className="text-base text-gray-600 text-center">
              {selectedUsersForReassign.length} user(s) selected
            </Text>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Progress Details Modal */}
      <Modal
        visible={showProgressDetails}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowProgressDetails(false)}
      >
        <SafeAreaView className="flex-1 bg-gray-50">
          <StatusBar style="dark" />
          
          <ModalHandle />
          
          <View className="flex-row items-center bg-white border-b border-gray-200 px-6 py-4">
            <Pressable 
              onPress={() => setShowProgressDetails(false)}
              className="mr-4 w-10 h-10 items-center justify-center"
            >
              <Ionicons name="close" size={24} color="#374151" />
            </Pressable>
            <Text className="text-xl font-semibold text-gray-900 flex-1">
              Progress Details
            </Text>
            <Text className="text-base text-blue-600 font-medium">
              {task.updates.length} updates
            </Text>
          </View>

          <ScrollView className="flex-1 px-6 py-4">
            {/* Overall Progress */}
            <View className="bg-white rounded-xl p-4 mb-4 border border-gray-200">
              <Text className="text-base font-semibold text-gray-700 mb-2">Overall Completion</Text>
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-4xl font-bold text-blue-600">{task.completionPercentage}%</Text>
                <View className={cn(
                  "px-3 py-1 rounded-full",
                  task.completionPercentage === 100 ? "bg-green-50" :
                  task.completionPercentage >= 50 ? "bg-blue-50" : "bg-gray-50"
                )}>
                  <Text className={cn(
                    "text-sm font-medium capitalize",
                    task.completionPercentage === 100 ? "text-green-700" :
                    task.completionPercentage >= 50 ? "text-blue-700" : "text-gray-700"
                  )}>
                    {task.currentStatus.replace("_", " ")}
                  </Text>
                </View>
              </View>
              
              {/* Progress Bar */}
              <View className="w-full bg-gray-200 rounded-full h-3">
                <View 
                  className={cn(
                    "h-3 rounded-full",
                    task.completionPercentage === 100 ? "bg-green-500" :
                    task.completionPercentage >= 75 ? "bg-blue-500" :
                    task.completionPercentage >= 50 ? "bg-yellow-500" :
                    task.completionPercentage >= 25 ? "bg-orange-500" : "bg-red-500"
                  )}
                  style={{ width: `${task.completionPercentage}%` }}
                />
              </View>
            </View>

            {/* Progress History */}
            <Text className="text-base font-semibold text-gray-700 mb-3">Update History</Text>
            
            {task.updates.length > 0 ? (
              <View className="space-y-4">
                {task.updates.map((update, index) => {
                  const updateUser = getUserById(update.userId);
                  const isLatest = index === task.updates.length - 1;
                  const isSelected = selectedUpdateId === update.id;
                  
                  return (
                    <View 
                      key={update.id} 
                      className={cn(
                        "bg-white rounded-xl p-4 border-l-4",
                        isSelected ? "border-purple-500 border-4 shadow-lg" : 
                        isLatest ? "border-blue-500 border-2" : "border-gray-300 border"
                      )}
                    >
                      {/* Header */}
                      <View className="flex-row items-center justify-between mb-2">
                        <View className="flex-row items-center flex-1">
                          <View className={cn(
                            "w-8 h-8 rounded-full items-center justify-center mr-2",
                            isSelected ? "bg-purple-100" : isLatest ? "bg-blue-100" : "bg-gray-100"
                          )}>
                            <Ionicons 
                              name="person" 
                              size={16} 
                              color={isSelected ? "#9333ea" : isLatest ? "#3b82f6" : "#6b7280"} 
                            />
                          </View>
                          <View className="flex-1">
                            <Text className="font-semibold text-gray-900">
                              {updateUser?.name || "Unknown User"}
                            </Text>
                            <Text className="text-sm text-gray-500">
                              {new Date(update.timestamp).toLocaleString()}
                            </Text>
                          </View>
                        </View>
                        {isSelected ? (
                          <View className="bg-purple-100 px-2 py-1 rounded">
                            <Text className="text-sm font-medium text-purple-700">Selected</Text>
                          </View>
                        ) : isLatest ? (
                          <View className="bg-blue-100 px-2 py-1 rounded">
                            <Text className="text-sm font-medium text-blue-700">Latest</Text>
                          </View>
                        ) : null}
                      </View>

                      {/* Progress Change */}
                      <View className="flex-row items-center mb-2">
                        <Text className={cn(
                          "text-3xl font-bold mr-2",
                          isSelected ? "text-purple-600" : "text-blue-600"
                        )}>
                          {update.completionPercentage}%
                        </Text>
                        <View className={cn("px-2 py-1 rounded", getStatusColor(update.status))}>
                          <Text className="text-sm capitalize font-medium">
                            {update.status.replace("_", " ")}
                          </Text>
                        </View>
                      </View>

                      {/* Description */}
                      {update.description && (
                        <Text className="text-gray-700 mb-3">{update.description}</Text>
                      )}

                      {/* Photos */}
                      {update.photos && update.photos.length > 0 && (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-2">
                          <View className="flex-row gap-2">
                            {update.photos.map((photo, photoIndex) => {
                              const isPDF = photo.toLowerCase().endsWith('.pdf') || photo.includes('application/pdf');
                              
                              return (
                                <Pressable
                                  key={photoIndex}
                                  onPress={() => handleAttachmentPress(photo)}
                                  className="relative"
                                >
                                  {isPDF ? (
                                    // PDF preview
                                    <View className="w-20 h-20 rounded-lg bg-red-50 border border-red-200 items-center justify-center">
                                      <Ionicons name="document-text" size={32} color="#dc2626" />
                                      <Text className="text-sm text-red-700 font-semibold">PDF</Text>
                                    </View>
                                  ) : (
                                    // Image preview
                                    <Image
                                      source={{ uri: photo }}
                                      className="w-20 h-20 rounded-lg"
                                      resizeMode="cover"
                                    />
                                  )}
                                  
                                  {/* Preview indicator */}
                                  <View className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5">
                                    <Ionicons name="expand" size={10} color="white" />
                                  </View>
                                </Pressable>
                              );
                            })}
                          </View>
                        </ScrollView>
                      )}
                    </View>
                  );
                })}
              </View>
            ) : (
              <View className="bg-white rounded-xl p-8 items-center border border-gray-200">
                <Ionicons name="time-outline" size={48} color="#9ca3af" />
                <Text className="text-gray-500 text-center mt-3">
                  No progress updates yet
                </Text>
              </View>
            )}
            
            {/* Bottom spacing */}
            <View className="h-6" />
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Image Preview Modal */}
      <Modal
        visible={showImagePreview}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowImagePreview(false)}
      >
        <View className="flex-1 bg-black">
          {/* Image - Full screen */}
          <View className="flex-1 items-center justify-center">
            {selectedImageUri && (
              <Image
                source={{ uri: selectedImageUri }}
                className="w-full h-full"
                resizeMode="contain"
              />
            )}
          </View>

          {/* Close Button - Positioned lower and larger for easy reach */}
          <SafeAreaView className="absolute top-0 left-0 right-0">
            <View className="px-6 pt-4">
              <Pressable
                onPress={() => setShowImagePreview(false)}
                className="w-12 h-12 items-center justify-center bg-black/60 rounded-full self-start"
                style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84, elevation: 5 }}
              >
                <Ionicons name="close" size={28} color="white" />
              </Pressable>
            </View>
          </SafeAreaView>

          {/* Optional: Tap anywhere to close hint */}
          <Pressable 
            className="absolute bottom-0 left-0 right-0 pb-8 items-center"
            onPress={() => setShowImagePreview(false)}
            style={{ pointerEvents: 'box-none' }}
          >
            <View className="bg-black/60 px-4 py-2 rounded-full">
              <Text className="text-white/80 text-sm">Tap anywhere to close</Text>
            </View>
          </Pressable>
        </View>
      </Modal>

      {/* Task Detail Utility FAB */}
      <TaskDetailUtilityFAB
        onUpdate={() => setShowUpdateModal(true)}
        onEdit={() => {
          if (onNavigateToCreateTask && task) {
            // Navigate to edit screen by passing the task ID as editTaskId
            onNavigateToCreateTask(undefined, undefined, task.id);
          }
        }}
        onCancel={isTaskCreator && !task.cancelledAt && !isViewingSubTask ? handleCancelTask : undefined}
        canCancel={isTaskCreator && !task.cancelledAt && !isViewingSubTask}
        onCameraUpdate={() => {
          Alert.alert(
            "Add Photos or Files",
            "Choose how you want to add content",
            [
              {
                text: "Take Photo",
                onPress: async () => {
                  if (!user || !task) return;
                  
                  try {
                    console.log('📸 [Task Detail FAB] Taking photo from camera...');
                    
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
                      setUpdateForm(prev => ({
                        description: prev.description || "",
                        photos: [...prev.photos, ...newPhotoUrls],
                        completionPercentage: task.completionPercentage,
                        status: task.currentStatus,
                      }));
                      setShowUpdateModal(true);
                      console.log(`✅ [Task Detail FAB] ${results.successful.length} photo(s) uploaded and ready`);
                    }

                    if (results.failed.length > 0) {
                      setFailedUploadsInSession(prev => [...prev, ...results.failed]);
                    }
                  } catch (error) {
                    console.error("❌ [Task Detail FAB] Error launching camera:", error);
                    Alert.alert("Error", "Failed to access camera");
                  }
                },
              },
              {
                text: "Choose from Library",
                onPress: async () => {
                  if (!user || !task) return;
                  
                  try {
                    console.log('📚 [Task Detail FAB] Selecting photos from library...');
                    
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
                      setUpdateForm(prev => ({
                        description: prev.description || "",
                        photos: [...prev.photos, ...newPhotoUrls],
                        completionPercentage: task.completionPercentage,
                        status: task.currentStatus,
                      }));
                      setShowUpdateModal(true);
                      console.log(`✅ [Task Detail FAB] ${results.successful.length} photo(s) uploaded and ready`);
                    }

                    if (results.failed.length > 0) {
                      setFailedUploadsInSession(prev => [...prev, ...results.failed]);
                    }
                  } catch (error) {
                    console.error("❌ [Task Detail FAB] Error opening library:", error);
                    Alert.alert("Error", "Failed to access photo library");
                  }
                },
              },
              {
                text: "Upload PDF",
                onPress: async () => {
                  try {
                    const result = await DocumentPicker.getDocumentAsync({
                      type: 'application/pdf',
                      copyToCacheDirectory: true,
                    });
                    
                    if (!result.canceled && result.assets && result.assets.length > 0) {
                      const newFiles = result.assets.map((asset: DocumentPicker.DocumentPickerAsset) => asset.uri);
                      setUpdateForm(prev => ({
                        description: prev.description || "",
                        photos: [...prev.photos, ...newFiles],
                        completionPercentage: task.completionPercentage,
                        status: task.currentStatus,
                      }));
                      setShowUpdateModal(true);
                    }
                  } catch (error) {
                    console.error("Error picking document:", error);
                    Alert.alert("Error", "Failed to pick document");
                  }
                },
              },
              {
                text: "Cancel",
                style: "cancel",
              },
            ]
          );
        }}
        onCreateSubTask={onNavigateToCreateTask ? () => {
          if (subTaskId) {
            onNavigateToCreateTask(taskId, subTaskId);
          } else {
            onNavigateToCreateTask(taskId);
          }
        } : undefined}
        canUpdate={canUpdateProgress}
        canEdit={canEditTask}
        canCreateSubTask={canCreateSubTask && !!onNavigateToCreateTask}
      />
    </SafeAreaView>
  );
}