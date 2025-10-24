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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";
import * as ImagePicker from "expo-image-picker";
import { useAuthStore } from "../state/authStore";
import { useTaskStore } from "../state/taskStore.supabase";
import { useUserStore } from "../state/userStore.supabase";
import { useProjectStoreWithCompanyInit } from "../state/projectStore.supabase";
import { useCompanyStore } from "../state/companyStore";
import { TaskStatus, Priority, Task } from "../types/buildtrack";
import { cn } from "../utils/cn";
import StandardHeader from "../components/StandardHeader";
import ModalHandle from "../components/ModalHandle";

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
          <Text className="text-xl font-semibold text-gray-900 flex-1">
            {task?.title || (isViewingSubTask ? "Sub-Task Details" : "Task Details")}
          </Text>
        </View>

        <View className="flex-1 items-center justify-center px-6">
          <Ionicons name="alert-circle-outline" size={64} color="#ef4444" />
          <Text className="text-xl font-semibold text-gray-900 mt-4 mb-2">
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

  const canUpdateProgress = isAssignedToMe || isTaskCreator;

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
        accepted: undefined, // Reset acceptance status
        currentStatus: "not_started", // Reset status back to not_started
        declineReason: undefined, // Clear decline reason
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
      
      let successMessage = "Progress update added successfully!";
      if (updateForm.completionPercentage === 100) {
        successMessage = "🎉 Task marked as completed! Great job!";
      }
      
      Alert.alert("Success", successMessage);
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
        rightElement={
          canUpdateProgress ? (
            <Pressable
              onPress={() => {
                setUpdateForm({
                  description: "",
                  photos: [],
                  completionPercentage: task.completionPercentage,
                  status: task.currentStatus,
                });
                setShowUpdateModal(true);
              }}
              className="px-4 py-2 bg-blue-600 rounded-lg"
            >
              <Text className="text-white font-medium">Update</Text>
            </Pressable>
          ) : undefined
        }
      />

      {/* Accept/Reject Banner - Shown at top when task is pending acceptance */}
      {isAssignedToMe && (task.accepted === undefined || task.accepted === null) && (
        <View className="bg-amber-50 border-b-2 border-amber-200 px-6 py-4">
          <View className="flex-row items-center mb-3">
            <View className="w-10 h-10 bg-amber-100 rounded-full items-center justify-center mr-3">
              <Ionicons name="alert-circle" size={24} color="#f59e0b" />
            </View>
            <View className="flex-1">
              <Text className="text-lg font-bold text-amber-900">
                Action Required
              </Text>
              <Text className="text-sm text-amber-700">
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
              <Text className="text-white font-semibold text-base ml-2">Accept</Text>
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
              <Text className="text-white font-semibold text-base ml-2">Decline</Text>
            </Pressable>
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
              <Text className="text-lg font-bold text-red-900">
                Task Rejected
              </Text>
              <Text className="text-sm text-red-700">
                This task was declined by the assignee
              </Text>
              {task.declineReason && (
                <Text className="text-sm text-red-600 mt-1 italic">
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
            <Text className="text-white font-semibold text-base ml-2">Reassign to Another User</Text>
          </Pressable>
        </View>
      )}

      <ScrollView className="flex-1">
        {/* Task Status, Priority, and Due Date */}
        <View className="bg-white mx-4 mt-3 rounded-xl border border-gray-200 p-4">
          {/* Status and Priority Row */}
          <View className="flex-row items-center mb-3">
            <View className={cn("px-3 py-1.5 rounded-full mr-3", getStatusColor(task.currentStatus))}>
              <Text className="text-sm font-medium capitalize">
                {task.currentStatus.replace("_", " ")}
              </Text>
            </View>
            <View className={cn("px-3 py-1.5 rounded-full border", getPriorityColor(task.priority))}>
              <Text className="text-sm font-medium capitalize">
                {task.priority} Priority
              </Text>
            </View>
          </View>
          
          {/* Due Date Row */}
          <View className="flex-row items-center">
            <Ionicons name="calendar-outline" size={16} color="#6b7280" />
            <Text className="text-sm text-gray-600 ml-2 mr-2">Due Date:</Text>
            <Text className={cn("text-sm font-medium", isOverdue ? "text-red-600" : "text-gray-900")}>
              {new Date(task.dueDate).toLocaleDateString()}
              {isOverdue && " (Overdue)"}
            </Text>
          </View>
        </View>

        {/* Assignment Information Card - Moved to top */}
        <View className="bg-white mx-4 mt-3 rounded-xl border border-gray-200 p-4">
          
          {/* Assigned By */}
          <View className="mb-3">
            <Text className="text-sm font-medium text-gray-600 mb-1">Assigned By</Text>
            <View className="flex-row items-center">
              <View className="w-10 h-10 bg-blue-100 rounded-full items-center justify-center mr-3">
                <Ionicons name="person" size={20} color="#3b82f6" />
              </View>
              <View className="flex-1">
                <Text className="text-base font-semibold text-gray-900">
                  {assignedBy?.id === user.id ? `${assignedBy?.name || "Unknown User"} (me)` : (assignedBy?.name || "Unknown User")}
                </Text>
                <Text className="text-sm text-gray-500 capitalize">
                  {assignedBy?.role || "Unknown Role"}
                </Text>
                <Text className="text-xs text-gray-400">
                  {assignedBy?.email || ""}
                </Text>
              </View>
            </View>
          </View>

          {/* Assigned To */}
          <View>
            <Text className="text-sm font-medium text-gray-600 mb-1">Assigned To</Text>
            {assignedUsers.length > 0 ? (
              <View className="space-y-2">
                {assignedUsers.map((assignedUser) => {
                  if (!assignedUser) return null;
                  
                  // Get progress for this user from task updates
                  const userUpdates = task.updates?.filter(update => update.userId === assignedUser.id) || [];
                  const latestUpdate = userUpdates[userUpdates.length - 1];
                  const userProgress = latestUpdate?.completionPercentage || 0;
                  
                  return (
                    <View key={assignedUser.id} className="flex-row items-center">
                      <View className="w-10 h-10 bg-green-100 rounded-full items-center justify-center mr-3">
                        <Ionicons name="person" size={20} color="#10b981" />
                      </View>
                      <View className="flex-1">
                        <View className="flex-row items-center justify-between mb-1">
                          <Text className="text-base font-semibold text-gray-900">
                            {assignedUser.id === user.id ? `${assignedUser.name} (me)` : assignedUser.name}
                          </Text>
                          <View className="flex-row items-center">
                            <View className="w-20 bg-gray-200 rounded-full h-2 mr-2">
                              <View 
                                className={cn(
                                  "h-2 rounded-full",
                                  userProgress === 100 ? "bg-green-500" :
                                  userProgress >= 75 ? "bg-blue-500" :
                                  userProgress >= 50 ? "bg-yellow-500" :
                                  userProgress >= 25 ? "bg-orange-500" :
                                  "bg-gray-400"
                                )}
                                style={{ width: `${userProgress}%` }}
                              />
                            </View>
                            <Text className="text-xs font-medium text-gray-600 w-8">
                              {userProgress}%
                            </Text>
                          </View>
                        </View>
                        <Text className="text-sm text-gray-500 capitalize">
                          {assignedUser.role}
                        </Text>
                        <Text className="text-xs text-gray-400">
                          {assignedUser.email}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            ) : (
              <View className="flex-row items-center">
                <View className="w-10 h-10 bg-gray-100 rounded-full items-center justify-center mr-3">
                  <Ionicons name="person-outline" size={20} color="#6b7280" />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-medium text-gray-500">
                    No one assigned
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Progress & Updates Combined Section */}
        <View className="bg-white mx-4 mt-3 rounded-xl border border-gray-200 p-3 mb-4">
          {/* Header with Progress */}
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-lg font-semibold text-gray-900">Comp. %</Text>
            <Text className="text-xl font-bold text-blue-600">{task.completionPercentage}%</Text>
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
              <Text className="text-green-700 text-sm font-medium ml-2">
                Completed! 🎉
              </Text>
            </View>
          )}

          {/* Divider */}
          <View className="border-t border-gray-200 my-3" />

          {/* Updates Header */}
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-base font-semibold text-gray-900">Progress</Text>
            <Text className="text-xs text-gray-500">{task.updates.length} updates</Text>
          </View>
          
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
                      <Text className="text-xs text-gray-500">
                        {new Date(update.timestamp).toLocaleString()}
                      </Text>
                    </View>
                    <Text className="text-gray-700 mb-2">{update.description}</Text>
                    <View className="flex-row items-center space-x-4">
                      <Text className="text-sm text-gray-500">
                        Progress: {update.completionPercentage}%
                      </Text>
                      <View className={cn("px-2 py-1 rounded", getStatusColor(update.status))}>
                        <Text className="text-xs capitalize">
                          {update.status.replace("_", " ")}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            <View className="py-6 items-center">
              <Ionicons name="chatbubble-outline" size={40} color="#d1d5db" />
              <Text className="text-gray-500 mt-2 text-sm">No updates yet</Text>
            </View>
          )}
        </View>

        {/* Add Sub-Task Button */}
        {(isAssignedToMe || isTaskCreator) && (
          <View className="bg-white mx-4 mb-3 rounded-xl border border-gray-200 p-4">
            <Pressable
              onPress={() => {
                if (onNavigateToCreateTask) {
                  if (isViewingSubTask && subTaskId) {
                    onNavigateToCreateTask(taskId, subTaskId);
                  } else {
                    onNavigateToCreateTask(taskId);
                  }
                } else {
                  Alert.alert('Error', 'Navigation function is not available. Please try again.');
                }
              }}
              className="flex-row items-center justify-center bg-blue-50 px-4 py-3 rounded-lg"
            >
              <Ionicons name="add-circle-outline" size={20} color="#3b82f6" />
              <Text className="text-blue-600 font-medium ml-2">
                Add {isViewingSubTask ? "Nested Sub-Task" : "Sub-Task"}
              </Text>
            </Pressable>
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
            <Text className="text-lg font-semibold text-gray-900 flex-1">
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
            {/* Photos */}
            <View className="mb-6">
              <Text className="text-lg font-semibold text-gray-900 mb-2">Photos</Text>
              <Pressable
                onPress={handleAddPhotos}
                className="border-2 border-dashed border-gray-300 rounded-lg p-6 bg-white items-center"
              >
                <Ionicons name="camera-outline" size={32} color="#6b7280" />
                <Text className="text-gray-600 mt-2">Add photos to document progress</Text>
              </Pressable>
              
              {updateForm.photos.length > 0 && (
                <View className="mt-4">
                  <Text className="text-sm text-gray-600 mb-2">
                    {updateForm.photos.length} photo{updateForm.photos.length > 1 ? "s" : ""} selected
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View className="flex-row">
                      {updateForm.photos.map((_photo, index) => (
                        <View key={index} className="mr-3 bg-gray-100 rounded-lg p-4">
                          <Ionicons name="image-outline" size={32} color="#6b7280" />
                        </View>
                      ))}
                    </View>
                  </ScrollView>
                </View>
              )}
            </View>

            {/* Description */}
            <View className="mb-6">
              <Text className="text-lg font-semibold text-gray-900 mb-2">
                Update Description
              </Text>
              <TextInput
                className="border border-gray-300 rounded-lg px-3 py-3 text-gray-900 bg-white"
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

            {/* Progress Slider - Compact */}
            <View className="mb-6">
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-lg font-semibold text-gray-900">
                  Completion Percentage
                </Text>
                <Text className="text-2xl font-bold text-blue-600">
                  {updateForm.completionPercentage}%
                </Text>
              </View>
              
              {/* Current Progress Indicator */}
              <View className="mb-2">
                <View className="flex-row items-center justify-between">
                  <Text className="text-sm text-gray-600">Current: {task.completionPercentage}%</Text>
                  <View className="flex-row items-center">
                    <View className="w-3 h-3 bg-red-500 rounded-full mr-2"></View>
                    <Text className="text-sm text-red-600 font-medium">Previous</Text>
                  </View>
                </View>
              </View>
              
              <View className="py-4">
                <Slider
                  style={{ width: '100%', height: 300 }}
                  minimumValue={0}
                  maximumValue={100}
                  step={5}
                  value={updateForm.completionPercentage}
                  onValueChange={(value: number) => setUpdateForm(prev => ({ ...prev, completionPercentage: value }))}
                  minimumTrackTintColor="#3b82f6"
                  maximumTrackTintColor="#d1d5db"
                  vertical={true}
                />
              </View>
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
            <Text className="text-lg font-semibold text-gray-900 flex-1">
              {selectedTaskForDetail?.title || "Task Details"}
            </Text>
          </View>

          {selectedTaskForDetail && (
            <ScrollView className="flex-1 px-6 py-4">
              {/* Task Info Card */}
              <View className="bg-white rounded-xl p-6 mb-4">
                {/* Title */}
                <Text className="text-2xl font-bold text-gray-900 mb-4">
                  {selectedTaskForDetail.title}
                </Text>

                {/* Status and Priority */}
                <View className="flex-row items-center mb-4">
                  <View className={cn("px-3 py-1.5 rounded-full mr-3", getStatusColor(selectedTaskForDetail.currentStatus))}>
                    <Text className="text-sm font-medium capitalize">
                      {selectedTaskForDetail.currentStatus.replace("_", " ")}
                    </Text>
                  </View>
                  <View className={cn("px-3 py-1.5 rounded-full border", getPriorityColor(selectedTaskForDetail.priority))}>
                    <Text className="text-sm font-medium capitalize">
                      {selectedTaskForDetail.priority} Priority
                    </Text>
                  </View>
                </View>

                {/* Description */}
                <Text className="text-gray-700 text-base leading-6 mb-6">
                  {selectedTaskForDetail.description}
                </Text>

                {/* Task Details Grid */}
                <View className="space-y-4">
                  <View className="flex-row items-center">
                    <Ionicons name="calendar-outline" size={20} color="#6b7280" />
                    <View className="ml-3 flex-1">
                      <Text className="text-sm text-gray-500">Due Date</Text>
                      <Text className={cn("font-medium", new Date(selectedTaskForDetail.dueDate) < new Date() && selectedTaskForDetail.currentStatus !== "completed" ? "text-red-600" : "text-gray-900")}>
                        {new Date(selectedTaskForDetail.dueDate).toLocaleDateString()} 
                        {new Date(selectedTaskForDetail.dueDate) < new Date() && selectedTaskForDetail.currentStatus !== "completed" && " (Overdue)"}
                      </Text>
                    </View>
                  </View>

                  <View className="flex-row items-center">
                    <Ionicons name="pricetag-outline" size={20} color="#6b7280" />
                    <View className="ml-3 flex-1">
                      <Text className="text-sm text-gray-500">Category</Text>
                      <Text className="font-medium text-gray-900 capitalize">
                        {selectedTaskForDetail.category}
                      </Text>
                    </View>
                  </View>

                  <View className="flex-row items-center">
                    <Ionicons name="person-outline" size={20} color="#6b7280" />
                    <View className="ml-3 flex-1">
                      <Text className="text-sm text-gray-500">Assigned By</Text>
                      <Text className="font-medium text-gray-900">
                        {getUserById(selectedTaskForDetail.assignedBy)?.name || "Unknown"}
                      </Text>
                    </View>
                  </View>

                  <View className="flex-row items-center">
                    <Ionicons name="people-outline" size={20} color="#6b7280" />
                    <View className="ml-3 flex-1">
                      <Text className="text-sm text-gray-500">Assigned To</Text>
                      <Text className="font-medium text-gray-900">
                        {selectedTaskForDetail.assignedTo.map(userId => getUserById(userId)?.name).filter(Boolean).join(", ")}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Progress Card */}
              <View className="bg-white rounded-xl p-6 mb-4">
                <Text className="text-lg font-semibold text-gray-900 mb-4">Progress</Text>
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-gray-600">Completion</Text>
                  <Text className={cn(
                    "font-semibold text-2xl",
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
                    <Text className="text-green-600 text-sm font-medium ml-1">
                      Task Completed!
                    </Text>
                  </View>
                )}
              </View>

              {/* Task Updates */}
              <View className="bg-white rounded-xl p-6 mb-6">
                <View className="flex-row items-center justify-between mb-4">
                  <Text className="text-lg font-semibold text-gray-900">Updates</Text>
                  <Text className="text-sm text-gray-500">{selectedTaskForDetail.updates.length} updates</Text>
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
                            <Text className="text-xs text-gray-500">
                              {new Date(update.timestamp).toLocaleString()}
                            </Text>
                          </View>
                          <Text className="text-gray-700 mb-2">{update.description}</Text>
                          <View className="flex-row items-center space-x-4">
                            <Text className="text-sm text-gray-500">
                              Progress: {update.completionPercentage}%
                            </Text>
                            <View className={cn("px-2 py-1 rounded", getStatusColor(update.status))}>
                              <Text className="text-xs capitalize">
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
            <Text className="flex-1 text-lg font-semibold text-gray-900">
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
                className="flex-1 ml-2 text-base"
                placeholder="Search users..."
                value={reassignSearchQuery}
                onChangeText={setReassignSearchQuery}
              />
            </View>
          </View>

          {/* User List */}
          <ScrollView className="flex-1 px-6">
            <Text className="text-sm text-gray-600 mb-3">
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
                      <Text className="text-base font-semibold text-gray-900">
                        {projectUser.name}
                      </Text>
                      <Text className="text-sm text-gray-500 capitalize">
                        {projectUser.role}
                      </Text>
                      <Text className="text-xs text-gray-400">
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
            <Text className="text-sm text-gray-600 text-center">
              {selectedUsersForReassign.length} user(s) selected
            </Text>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}