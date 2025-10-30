import React, { useState, useEffect } from "react";
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
import { TaskStatus, Priority, Task } from "../types/buildtrack";
import { cn } from "../utils/cn";
import StandardHeader from "../components/StandardHeader";
import ModalHandle from "../components/ModalHandle";
import TaskDetailUtilityFAB from "../components/TaskDetailUtilityFAB";
import TaskCard from "../components/TaskCard";

interface TaskDetailScreenProps {
  taskId: string;
  subTaskId?: string; // Optional: if provided, show only this subtask
  onNavigateBack: () => void;
  onNavigateToCreateTask?: (parentTaskId?: string, parentSubTaskId?: string) => void;
}

export default function TaskDetailScreen({ taskId, subTaskId, onNavigateBack, onNavigateToCreateTask }: TaskDetailScreenProps) {
  const { user } = useAuthStore();
  const tasks = useTaskStore(state => state.tasks);
  const markTaskAsRead = useTaskStore(state => state.markTaskAsRead);
  const updateTask = useTaskStore(state => state.updateTask);
  const updateSubTaskStatus = useTaskStore(state => state.updateSubTaskStatus);
  const acceptSubTask = useTaskStore(state => state.acceptSubTask);
  const declineSubTask = useTaskStore(state => state.declineSubTask);
  const deleteSubTask = useTaskStore(state => state.deleteSubTask);
  const addTaskUpdate = useTaskStore(state => state.addTaskUpdate);
  const addSubTaskUpdate = useTaskStore(state => state.addSubTaskUpdate);
  const acceptTask = useTaskStore(state => state.acceptTask);
  const declineTask = useTaskStore(state => state.declineTask);
  const submitTaskForReview = useTaskStore(state => state.submitTaskForReview);
  const acceptTaskCompletion = useTaskStore(state => state.acceptTaskCompletion);
  const submitSubTaskForReview = useTaskStore(state => state.submitSubTaskForReview);
  const acceptSubTaskCompletion = useTaskStore(state => state.acceptSubTaskCompletion);
  const { getUserById, getAllUsers } = useUserStore();
  const { getProjectUserAssignments } = useProjectStoreWithCompanyInit(user?.companyId || "");
  const { getCompanyBanner } = useCompanyStore();

  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updateForm, setUpdateForm] = useState({
    description: "",
    photos: [] as string[],
    completionPercentage: 0,
    status: "in_progress" as TaskStatus,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showUserPicker, setShowUserPicker] = useState(false);
  const [showTaskDetailModal, setShowTaskDetailModal] = useState(false);
  const [selectedTaskForDetail, setSelectedTaskForDetail] = useState<Task | null>(null);
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [selectedUsersForReassign, setSelectedUsersForReassign] = useState<string[]>([]);
  const [reassignSearchQuery, setReassignSearchQuery] = useState("");
  const [showProgressDetails, setShowProgressDetails] = useState(false);
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);

  // Get the parent task
  const parentTask = tasks.find(t => t.id === taskId);
  
  // If subTaskId is provided, find and display that subtask as the main task
  const subTask = subTaskId && parentTask 
    ? parentTask.subTasks?.find(st => st.id === subTaskId)
    : null;
  
  // Use subtask if viewing subtask, otherwise use parent task
  const task = subTask || parentTask;
  const isViewingSubTask = !!subTask;
  
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
            {task?.title || (isViewingSubTask ? "Sub-Task Details" : "Task Details")}
          </Text>
        </View>

        <View className="flex-1 items-center justify-center px-6">
          <Ionicons name="alert-circle-outline" size={64} color="#ef4444" />
          <Text className="text-2xl font-semibold text-gray-900 mt-4 mb-2">
            {isViewingSubTask ? "Sub-Task Not Found" : "Task Not Found"}
          </Text>
          <Text className="text-gray-600 text-center mb-6">
            The {isViewingSubTask ? "sub-task" : "task"} you're looking for doesn't exist or has been removed.
          </Text>
          <Pressable 
            onPress={onNavigateBack} 
            className="px-6 py-3 bg-blue-600 rounded-lg"
          >
            <Text className="text-white font-semibold">Go Back</Text>
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
  
  // Users can only create subtasks if:
  // 1. They created the task, OR
  // 2. They are assigned AND have accepted the task
  const canCreateSubTask = isTaskCreator || (isAssignedToMe && task.accepted === true);

  const handleAcceptTask = () => {
    Alert.alert(
      "Accept Task",
      `Are you sure you want to accept "${task.title}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Accept",
          onPress: () => {
            acceptTask(task.id, user.id);
            Alert.alert("Success", "Task accepted successfully! You can now start working on it.");
          }
        }
      ]
    );
  };

  const handleDeclineTask = () => {
    Alert.prompt(
      "Decline Task",
      "Please provide a reason for declining this task:",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Decline",
          style: "destructive",
          onPress: (reason: string | undefined) => {
            if (reason && reason.trim()) {
              declineTask(task.id, user.id, reason.trim());
              Alert.alert("Task Declined", "The task has been declined.");
            }
          },
        },
      ],
      "plain-text"
    );
  };

  const handleReassignTask = async () => {
    if (selectedUsersForReassign.length === 0) {
      Alert.alert("Error", "Please select at least one user to reassign the task to.");
      return;
    }

    try {
      await updateTask(task.id, {
        assignedTo: selectedUsersForReassign,
        accepted: undefined,
        currentStatus: "not_started",
        declineReason: undefined,
      });

      Alert.alert(
        "Task Reassigned",
        `Task has been reassigned to ${selectedUsersForReassign.length} user(s).`,
        [{ text: "OK", onPress: () => setShowReassignModal(false) }]
      );
      setSelectedUsersForReassign([]);
      setReassignSearchQuery("");
    } catch (error) {
      console.error("Error reassigning task:", error);
      Alert.alert("Error", "Failed to reassign task. Please try again.");
    }
  };


  const handleApproveTask = () => {
    Alert.alert(
      "Approve Task",
      "Mark this task as completed and approved?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Approve",
          onPress: async () => {
            try {
              if (isViewingSubTask && subTaskId) {
                await acceptSubTaskCompletion(taskId, subTaskId, user.id);
              } else {
                await acceptTaskCompletion(task.id, user.id);
              }
              Alert.alert("Success", "🎉 Task approved and marked as completed!");
            } catch (error) {
              Alert.alert("Error", "Failed to approve task.");
            }
          }
        }
      ]
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

  const handleAddPhotos = async () => {
    Alert.alert(
      "Add Photos",
      "Choose how you want to add photos",
      [
        {
          text: "Take Photo",
          onPress: async () => {
            try {
              // Request camera permissions
              const { status } = await ImagePicker.requestCameraPermissionsAsync();
              if (status !== 'granted') {
                Alert.alert('Permission Denied', 'Camera permission is required to take photos.');
                return;
              }

              const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images as any,
                quality: 0.8,
                allowsEditing: false,
              });

              if (!result.canceled && result.assets) {
                const newPhotos = result.assets.map(asset => asset.uri);
                setUpdateForm(prev => ({
                  ...prev,
                  photos: [...prev.photos, ...newPhotos],
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
              // Request media library permissions
              const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
              if (status !== 'granted') {
                Alert.alert('Permission Denied', 'Photo library permission is required to select photos.');
                return;
              }

              const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images as any,
                allowsMultipleSelection: true,
                quality: 0.8,
              });

              if (!result.canceled && result.assets) {
                const newPhotos = result.assets.map(asset => asset.uri);
                setUpdateForm(prev => ({
                  ...prev,
                  photos: [...prev.photos, ...newPhotos],
                }));
              }
            } catch (error) {
              Alert.alert("Error", "Failed to pick images");
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
                // Convert base64 to URI format
                const uri = `data:image/png;base64,${imageUri.data}`;
                setUpdateForm(prev => ({
                  ...prev,
                  photos: [...prev.photos, uri],
                }));
                Alert.alert("Success", "Image pasted from clipboard!");
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
                text: "Submit for Review",
                onPress: async () => {
                  try {
                    if (isViewingSubTask && subTaskId) {
                      await submitSubTaskForReview(taskId, subTaskId);
                    } else {
                      await submitTaskForReview(task.id);
                    }
                    Alert.alert("Success", "🎉 Task completed and submitted for review!");
                  } catch (error) {
                    Alert.alert("Error", "Failed to submit for review, but task is marked as complete.");
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
      Alert.alert("Error", "Failed to submit update");
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
        title={task?.title || (isViewingSubTask ? "Sub-Task Details" : "Task Details")}
        showBackButton={true}
        onBackPress={onNavigateBack}
      />

      {/* Accept/Reject Banner - Shown at top when task is pending acceptance */}
      {isAssignedToMe && (task.accepted === undefined || task.accepted === null) && (
        <View className="bg-amber-50 border-b-2 border-amber-200 px-6 py-4">
          <View className="flex-row items-center mb-3">
            <View className="w-10 h-10 bg-amber-100 rounded-full items-center justify-center mr-3">
              <Ionicons name="alert-circle" size={24} color="#f59e0b" />
            </View>
            <View className="flex-1">
              <Text className="text-xl font-bold text-amber-900">
                Action Required
              </Text>
              <Text className="text-base text-amber-700">
                You have been assigned to this {isViewingSubTask ? "sub-task" : "task"}
              </Text>
            </View>
          </View>
          <View className="flex-row gap-3">
            <Pressable
              onPress={() => {
                if (isViewingSubTask && subTaskId) {
                  acceptSubTask(taskId, subTaskId, user.id);
                  Alert.alert("Success", "Sub-task accepted successfully! You can now start working on it.");
                } else {
                  handleAcceptTask();
                }
              }}
              className="flex-1 bg-green-600 py-3.5 rounded-lg items-center flex-row justify-center"
            >
              <Ionicons name="checkmark-circle" size={20} color="white" />
              <Text className="text-white font-semibold text-lg ml-2">Accept</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                if (isViewingSubTask && subTaskId) {
                  Alert.prompt(
                    "Decline Sub-Task",
                    "Please provide a reason for declining this sub-task:",
                    (reason) => {
                      if (reason && reason.trim()) {
                        declineSubTask(taskId, subTaskId, user.id, reason.trim());
                        Alert.alert("Sub-Task Declined", "The sub-task has been declined.");
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
              <Text className="text-white font-semibold text-lg ml-2">Decline</Text>
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
                Submitted for Review
              </Text>
              <Text className="text-base text-amber-700">
                Your task has been submitted and is awaiting approval from the task creator
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
                Ready for Review
              </Text>
              <Text className="text-base text-purple-700">
                The assignee has submitted this task for your approval
              </Text>
            </View>
          </View>
          <Pressable
            onPress={handleApproveTask}
            className="bg-purple-600 py-3.5 rounded-lg items-center flex-row justify-center"
          >
            <Ionicons name="checkmark-done-circle" size={20} color="white" />
            <Text className="text-white font-semibold text-lg ml-2">Approve & Complete</Text>
          </Pressable>
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
                ✓ Task Approved
              </Text>
              <Text className="text-base text-green-700">
                Reviewed and approved by {getUserById(task.reviewedBy)?.name || "Unknown"}
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
                Task Rejected
              </Text>
              <Text className="text-base text-red-700">
                This task was declined by the assignee
              </Text>
              {task.declineReason && (
                <Text className="text-base text-red-600 mt-1 italic">
                  Reason: {task.declineReason}
                </Text>
              )}
            </View>
          </View>
          <Pressable
            onPress={() => setShowReassignModal(true)}
            className="bg-blue-600 py-3.5 rounded-lg items-center flex-row justify-center"
          >
            <Ionicons name="people" size={20} color="white" />
            <Text className="text-white font-semibold text-lg ml-2">Reassign to Another User</Text>
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
              <Text className="text-sm font-medium text-gray-500 mb-2">Assigned By</Text>
              <View className="flex-row items-center mb-2">
                <View className="w-8 h-8 bg-blue-100 rounded-full items-center justify-center mr-2">
                  <Ionicons name="person" size={16} color="#3b82f6" />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-semibold text-gray-900" numberOfLines={1}>
                    {assignedBy?.id === user.id ? `${assignedBy?.name || "Unknown"} (me)` : (assignedBy?.name || "Unknown")}
                  </Text>
                  <Text className="text-sm text-gray-500 capitalize">
                    {assignedBy?.role || "Unknown"}
                  </Text>
                </View>
              </View>
              {assignedBy?.phone && (
                <Text className="text-sm text-gray-600">{assignedBy.phone}</Text>
              )}
            </Pressable>

            {/* Assigned To Card */}
            <View className="flex-1 bg-gray-50 rounded-lg p-3">
              <Text className="text-sm font-medium text-gray-500 mb-2">Assigned To</Text>
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
                          <Text className="text-sm text-gray-500 capitalize">
                            {assignedUser.role}
                          </Text>
                        </View>
                      </View>
                      
                      {assignedUser.phone && (
                        <Text className="text-sm text-gray-600">{assignedUser.phone}</Text>
                      )}
                    </Pressable>
                  );
                })
              ) : (
                <Text className="text-sm text-gray-500">No assignees</Text>
              )}
            </View>
          </View>

          {/* Due Date, Status, Priority - Single Row Below */}
          <View className="flex-row items-center flex-wrap gap-2 mt-4">
            <View className="flex-row items-center">
              <Ionicons name="calendar-outline" size={16} color="#6b7280" />
              <Text className="text-base font-medium text-gray-600 ml-1">Due: </Text>
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
            onPress={() => setShowProgressDetails(true)}
            className="flex-row items-center justify-between mb-2 active:opacity-70"
          >
            <Text className="text-lg font-semibold text-gray-900">Progress</Text>
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
                  </View>
                );
              })}
            </View>
          ) : (
            <View className="py-6 items-center">
              <Ionicons name="chatbubble-outline" size={40} color="#d1d5db" />
              <Text className="text-gray-500 mt-2 text-base">No updates yet</Text>
            </View>
          )}
        </View>

        {/* Subtasks Section - Only show for parent tasks (not when viewing a subtask) */}
        {!isViewingSubTask && task?.subTasks && task.subTasks.length > 0 && (
          <View className="bg-white mx-4 mt-3 rounded-xl border border-gray-200 p-4 mb-4">
            <View className="flex-row items-center justify-between mb-3">
              <View className="flex-row items-center">
                <Ionicons name="git-branch-outline" size={20} color="#7c3aed" />
                <Text className="text-xl font-semibold text-gray-900 ml-2">
                  Sub-Tasks ({task.subTasks.length})
                </Text>
              </View>
            </View>

            {/* Subtasks List using TaskCard */}
            <View>
              {task.subTasks.map((subtask, index) => (
                <View key={subtask.id} className={index > 0 ? "mt-2" : ""}>
                  <TaskCard 
                    task={{ ...subtask, isSubTask: true as const }} 
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
              onPress={() => setShowUpdateModal(false)}
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
                Update Description
              </Text>
              <TextInput
                className="border border-gray-300 rounded-lg px-4 py-3 text-gray-900 bg-white"
                placeholder="Describe what you've accomplished..."
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
                  Completion Percentage
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
                  <Text className="text-xl font-semibold text-gray-900">Updates</Text>
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
                    <Text className="text-gray-500 mt-2">No updates yet</Text>
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

              const filteredUsers = projectUsers.filter(u => 
                u && (
                  u.name.toLowerCase().includes(reassignSearchQuery.toLowerCase()) ||
                  (u.email && u.email.toLowerCase().includes(reassignSearchQuery.toLowerCase()))
                )
              );

              return filteredUsers.map((projectUser) => {
                if (!projectUser) return null;
                const isSelected = selectedUsersForReassign.includes(projectUser.id);
                
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
                  
                  return (
                    <View 
                      key={update.id} 
                      className={cn(
                        "bg-white rounded-xl p-4 border-l-4",
                        isLatest ? "border-blue-500 border-2" : "border-gray-300 border"
                      )}
                    >
                      {/* Header */}
                      <View className="flex-row items-center justify-between mb-2">
                        <View className="flex-row items-center flex-1">
                          <View className={cn(
                            "w-8 h-8 rounded-full items-center justify-center mr-2",
                            isLatest ? "bg-blue-100" : "bg-gray-100"
                          )}>
                            <Ionicons 
                              name="person" 
                              size={16} 
                              color={isLatest ? "#3b82f6" : "#6b7280"} 
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
                        {isLatest && (
                          <View className="bg-blue-100 px-2 py-1 rounded">
                            <Text className="text-sm font-medium text-blue-700">Latest</Text>
                          </View>
                        )}
                      </View>

                      {/* Progress Change */}
                      <View className="flex-row items-center mb-2">
                        <Text className="text-3xl font-bold text-blue-600 mr-2">
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
          <SafeAreaView className="flex-1">
            {/* Header */}
            <View className="flex-row items-center justify-between px-4 py-3">
              <Pressable
                onPress={() => setShowImagePreview(false)}
                className="w-10 h-10 items-center justify-center bg-white/20 rounded-full"
              >
                <Ionicons name="close" size={24} color="white" />
              </Pressable>
              <Text className="text-white font-semibold">Image Preview</Text>
              <View className="w-10" />
            </View>

            {/* Image */}
            <View className="flex-1 items-center justify-center">
              {selectedImageUri && (
                <Image
                  source={{ uri: selectedImageUri }}
                  className="w-full h-full"
                  resizeMode="contain"
                />
              )}
            </View>
          </SafeAreaView>
        </View>
      </Modal>

      {/* Task Detail Utility FAB */}
      <TaskDetailUtilityFAB
        onUpdate={() => setShowUpdateModal(true)}
        onEdit={() => {
          // Navigate to edit - you may need to implement this
          Alert.alert("Edit", "Edit task functionality");
        }}
        onCameraUpdate={() => {
          Alert.alert(
            "Add Photos or Files",
            "Choose how you want to add content",
            [
              {
                text: "Take Photo",
                onPress: async () => {
                  try {
                    const { status } = await ImagePicker.requestCameraPermissionsAsync();
                    
                    if (status !== 'granted') {
                      Alert.alert("Permission Required", "Camera permission is required to take photos.");
                      return;
                    }
                    
                    const result = await ImagePicker.launchCameraAsync({
                      mediaTypes: "images" as any,
                      allowsEditing: false,
                      quality: 0.8,
                    });
                    
                    if (!result.canceled && result.assets && result.assets.length > 0) {
                      const newPhotos = result.assets.map(asset => asset.uri);
                      setUpdateForm(prev => ({
                        description: prev.description || "",
                        photos: [...prev.photos, ...newPhotos],
                        completionPercentage: task.completionPercentage,
                        status: task.currentStatus,
                      }));
                      setShowUpdateModal(true);
                    }
                  } catch (error) {
                    console.error("Error launching camera:", error);
                    Alert.alert("Error", "Failed to access camera");
                  }
                },
              },
              {
                text: "Choose from Library",
                onPress: async () => {
                  try {
                    const result = await ImagePicker.launchImageLibraryAsync({
                      mediaTypes: "images" as any,
                      allowsMultipleSelection: true,
                      quality: 0.8,
                    });
                    
                    if (!result.canceled && result.assets && result.assets.length > 0) {
                      const newPhotos = result.assets.map(asset => asset.uri);
                      setUpdateForm(prev => ({
                        description: prev.description || "",
                        photos: [...prev.photos, ...newPhotos],
                        completionPercentage: task.completionPercentage,
                        status: task.currentStatus,
                      }));
                      setShowUpdateModal(true);
                    }
                  } catch (error) {
                    console.error("Error opening library:", error);
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
        canUpdate={true}
        canEdit={task?.assignedBy === user?.id}
        canCreateSubTask={!!onNavigateToCreateTask}
      />
    </SafeAreaView>
  );
}