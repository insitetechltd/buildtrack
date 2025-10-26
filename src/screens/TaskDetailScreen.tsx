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
  Dimensions,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";
import { useAuthStore } from "../state/authStore";
import { useTaskStore } from "../state/taskStore.supabase";
import { useUserStore } from "../state/userStore.supabase";
import { useProjectStoreWithCompanyInit } from "../state/projectStore.supabase";
import { useCompanyStore } from "../state/companyStore";
import { PhotoUploadSection } from "../components/PhotoUploadSection";
import FullScreenImageViewer from "../components/FullScreenImageViewer";
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
  const [selectedUpdate, setSelectedUpdate] = useState<any>(null);
  const [showUpdateDetailModal, setShowUpdateDetailModal] = useState(false);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [imageViewerImages, setImageViewerImages] = useState<string[]>([]);
  const [imageViewerInitialIndex, setImageViewerInitialIndex] = useState(0);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

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

      {/* Photo Slider (Full Width, 20% Screen Height) */}
      {task.attachments && task.attachments.length > 0 && (
        <View style={{ height: Dimensions.get('window').height * 0.2 }}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={(event) => {
              const contentOffsetX = event.nativeEvent.contentOffset.x;
              const newIndex = Math.round(contentOffsetX / Dimensions.get('window').width);
              setCurrentPhotoIndex(newIndex);
            }}
            scrollEventThrottle={16}
          >
            {task.attachments.map((attachment: string, index: number) => (
              <Pressable
                key={index}
                style={{ width: Dimensions.get('window').width }}
                onPress={() => {
                  setImageViewerImages(task.attachments);
                  setImageViewerInitialIndex(currentPhotoIndex);
                  setShowImageViewer(true);
                }}
              >
                <Image
                  source={{ uri: attachment }}
                  style={{ 
                    width: Dimensions.get('window').width, 
                    height: Dimensions.get('window').height * 0.2 
                  }}
                  resizeMode="cover"
                />
              </Pressable>
            ))}
          </ScrollView>
          
          {/* Photo Counter Badge */}
          {task.attachments.length > 1 && (
            <View className="absolute bottom-3 right-3 bg-black/60 px-3 py-1.5 rounded-full">
              <Text className="text-white text-xs font-medium">
                {currentPhotoIndex + 1} / {task.attachments.length}
              </Text>
            </View>
          )}
        </View>
      )}

      <ScrollView className="flex-1">
        {/* Combined Task Information & Assignment Card */}
        <View className="bg-white mx-4 mt-3 rounded-xl border border-gray-200 p-4">
          
          {/* Assignment Section - Moved to Top */}
          <View className="flex-row mb-3 pb-3 border-b border-gray-200">
            {/* Assigned By - 50% width */}
            <View style={{ width: '50%' }} className="pr-2">
              <Text className="text-sm font-medium text-gray-600 mb-1">Assigned By</Text>
              <Pressable
                onPress={() => {
                  if (assignedBy?.phone) {
                    Linking.openURL(`tel:${assignedBy.phone}`);
                  }
                }}
                className="flex-row items-center"
              >
                <View className="w-10 h-10 bg-blue-100 rounded-full items-center justify-center mr-2">
                  <Ionicons name="person" size={20} color="#3b82f6" />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-gray-900" numberOfLines={1}>
                    {assignedBy?.id === user.id ? `${assignedBy?.name || "Unknown"} (me)` : (assignedBy?.name || "Unknown")}
                  </Text>
                  <Text className="text-xs text-gray-500 capitalize" numberOfLines={1}>
                    {assignedBy?.role || "Unknown"}
                  </Text>
                  <Pressable onPress={() => {
                    if (assignedBy?.phone) {
                      Linking.openURL(`tel:${assignedBy.phone}`);
                    }
                  }}>
                    <Text className="text-xs text-blue-600" numberOfLines={1}>
                      {assignedBy?.phone || "No phone"}
                    </Text>
                  </Pressable>
                </View>
              </Pressable>
            </View>

            {/* Assigned To - 50% width */}
            <View style={{ width: '50%' }} className="pl-2">
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
                    <Pressable
                      key={assignedUser.id}
                      onPress={() => {
                        if (assignedUser.phone) {
                          Linking.openURL(`tel:${assignedUser.phone}`);
                        }
                      }}
                      className="flex-row items-center"
                    >
                      <View className="w-10 h-10 bg-green-100 rounded-full items-center justify-center mr-2">
                        <Ionicons name="person" size={20} color="#10b981" />
                      </View>
                      <View className="flex-1">
                        <Text className="text-sm font-semibold text-gray-900" numberOfLines={1}>
                          {assignedUser.id === user.id ? `${assignedUser.name} (me)` : assignedUser.name}
                        </Text>
                        <Text className="text-xs text-gray-500 capitalize" numberOfLines={1}>
                          {assignedUser.role}
                        </Text>
                        <Text className="text-xs text-blue-600" numberOfLines={1}>
                          {assignedUser.phone || "No phone"}
                        </Text>
                      </View>
                    </Pressable>
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

          {/* Due Date and Badges Row */}
          <View className="flex-row items-center flex-wrap mb-2">
            <View className="flex-row items-center mr-2 mb-1">
              <Ionicons name="calendar-outline" size={14} color="#6b7280" />
              <Text className="text-sm text-gray-600 ml-1 mr-1">Due:</Text>
              <Text className={cn("text-sm font-semibold", isOverdue ? "text-red-600" : "text-gray-900")}>
                {new Date(task.dueDate).toLocaleDateString()}
                {isOverdue && " (Overdue)"}
              </Text>
            </View>
            
            {/* Status and Priority Badges - Smaller */}
            <View className={cn("px-2 py-1 rounded-full mr-2 mb-1", getStatusColor(task.currentStatus))}>
              <Text className="text-xs font-medium capitalize">
                {task.currentStatus.replace("_", " ")}
              </Text>
            </View>
            <View className={cn("px-2 py-1 rounded-full border mb-1", getPriorityColor(task.priority))}>
              <Text className="text-xs font-medium capitalize">
                {task.priority}
              </Text>
            </View>
          </View>

          {/* Task Description */}
          {task.description && (
            <Text className="text-sm text-gray-700 leading-5">
              {task.description}
            </Text>
          )}
        </View>

        {/* Progress & Updates Combined Section */}
        <View className="bg-white mx-4 mt-3 rounded-xl border border-gray-200 p-3 mb-4">
          {/* Compact Single Line Progress */}
          <View className="flex-row items-center mb-1">
            <Text className="text-sm font-semibold text-gray-700 mr-2">Comp. %</Text>
            <View className="flex-1 bg-gray-200 rounded-full h-2 mr-2">
              <View 
                className={cn(
                  "h-2 rounded-full",
                  task.completionPercentage === 100 ? "bg-green-500" :
                  task.completionPercentage >= 75 ? "bg-blue-500" :
                  task.completionPercentage >= 50 ? "bg-yellow-500" :
                  task.completionPercentage >= 25 ? "bg-orange-500" :
                  "bg-gray-400"
                )}
                style={{ width: `${task.completionPercentage}%` }}
              />
            </View>
            <Text className="text-sm font-bold text-blue-600">{task.completionPercentage}%</Text>
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
                  <Pressable 
                    key={update.id} 
                    className="border-l-4 border-blue-200 pl-4 active:bg-gray-50"
                    onPress={() => {
                      setSelectedUpdate(update);
                      setShowUpdateDetailModal(true);
                    }}
                  >
                    <View className="flex-row items-center justify-between mb-2">
                      <Text className="font-medium text-gray-900">
                        {updateUser?.name || "Unknown User"}
                      </Text>
                      <Text className="text-xs text-gray-500">
                        {new Date(update.timestamp).toLocaleString()}
                      </Text>
                    </View>
                    <Text className="text-gray-700 mb-2" numberOfLines={2}>
                      {update.description}
                    </Text>
                    <View className="flex-row items-center justify-between">
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
                      {update.photos && update.photos.length > 0 && (
                        <View className="flex-row items-center">
                          <Ionicons name="images" size={16} color="#6b7280" />
                          <Text className="text-xs text-gray-500 ml-1">
                            {update.photos.length}
                          </Text>
                        </View>
                      )}
                    </View>
                  </Pressable>
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
        {canCreateSubTask && (
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

        {/* Show message when user cannot create subtask */}
        {!canCreateSubTask && isAssignedToMe && !task.accepted && (
          <View className="bg-amber-50 border border-amber-200 rounded-xl mx-4 mb-3 p-4">
            <View className="flex-row items-center">
              <Ionicons name="lock-closed" size={20} color="#f59e0b" />
              <Text className="text-sm text-amber-700 ml-2 flex-1">
                Accept this task to create subtasks and add updates
              </Text>
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

            {/* Photos */}
            <PhotoUploadSection
              photos={updateForm.photos}
              onPhotosChange={(photos) => setUpdateForm(prev => ({ ...prev, photos }))}
              title="Photos"
              emptyMessage="No photos added"
            />
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

      {/* Update Detail Modal */}
      <Modal
        visible={showUpdateDetailModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowUpdateDetailModal(false)}
      >
        <SafeAreaView className="flex-1 bg-gray-50">
          <ModalHandle />
          
          {/* Header */}
          <View className="flex-row items-center justify-between bg-white border-b border-gray-200 px-6 py-4">
            <Pressable 
              onPress={() => setShowUpdateDetailModal(false)}
              className="mr-4"
            >
              <Text className="text-blue-600 font-medium">Close</Text>
            </Pressable>
            <Text className="text-lg font-semibold text-gray-900 flex-1">
              Update Details
            </Text>
          </View>

          {selectedUpdate && (
            <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
              <View className="p-6">
                {/* User and Timestamp */}
                <View className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
                  <View className="flex-row items-center justify-between mb-3">
                    <View>
                      <Text className="text-sm text-gray-500 mb-1">Updated by</Text>
                      <Text className="text-lg font-semibold text-gray-900">
                        {getUserById(selectedUpdate.userId)?.name || "Unknown User"}
                      </Text>
                    </View>
                    <View>
                      <Text className="text-sm text-gray-500 mb-1">Date</Text>
                      <Text className="text-base text-gray-900">
                        {new Date(selectedUpdate.timestamp).toLocaleDateString()}
                      </Text>
                      <Text className="text-xs text-gray-500">
                        {new Date(selectedUpdate.timestamp).toLocaleTimeString()}
                      </Text>
                    </View>
                  </View>
                  
                  {/* Progress and Status */}
                  <View className="flex-row items-center space-x-3">
                    <View className="flex-1 bg-gray-50 rounded-lg p-3">
                      <Text className="text-xs text-gray-500 mb-1">Progress</Text>
                      <Text className="text-2xl font-bold text-blue-600">
                        {selectedUpdate.completionPercentage}%
                      </Text>
                    </View>
                    <View className="flex-1 bg-gray-50 rounded-lg p-3">
                      <Text className="text-xs text-gray-500 mb-1">Status</Text>
                      <View className={cn("px-3 py-1.5 rounded-lg self-start", getStatusColor(selectedUpdate.status))}>
                        <Text className="text-sm font-medium capitalize">
                          {selectedUpdate.status.replace("_", " ")}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Description */}
                <View className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
                  <Text className="text-base font-semibold text-gray-900 mb-3">Description</Text>
                  <Text className="text-gray-700 leading-6">
                    {selectedUpdate.description}
                  </Text>
                </View>

                {/* Photos */}
                {selectedUpdate.photos && selectedUpdate.photos.length > 0 && (
                  <View className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
                    <View className="flex-row items-center justify-between mb-3">
                      <Text className="text-base font-semibold text-gray-900">Photos</Text>
                      <View className="bg-blue-100 px-2 py-1 rounded-full">
                        <Text className="text-blue-700 text-xs font-medium">
                          {selectedUpdate.photos.length}
                        </Text>
                      </View>
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <View className="flex-row space-x-3">
                        {selectedUpdate.photos.map((photo: string, index: number) => (
                          <Pressable
                            key={index}
                            className="rounded-lg overflow-hidden border border-gray-200"
                            onPress={() => {
                              setImageViewerImages(selectedUpdate.photos);
                              setImageViewerInitialIndex(index);
                              setShowImageViewer(true);
                            }}
                          >
                            <Image
                              source={{ uri: photo }}
                              style={{ width: 150, height: 150 }}
                              resizeMode="cover"
                            />
                          </Pressable>
                        ))}
                      </View>
                    </ScrollView>
                  </View>
                )}
              </View>
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>

      {/* Full Screen Image Viewer */}
      <FullScreenImageViewer
        visible={showImageViewer}
        images={imageViewerImages}
        initialIndex={imageViewerInitialIndex}
        onClose={() => setShowImageViewer(false)}
      />

      {/* Floating Action Button - Update Task */}
      {canUpdateProgress && (
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
          className="absolute bottom-6 right-6 w-14 h-14 bg-blue-600 rounded-full items-center justify-center shadow-lg"
          style={{
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 3.84,
            elevation: 5,
          }}
        >
          <Ionicons name="create-outline" size={24} color="white" />
        </Pressable>
      )}
    </SafeAreaView>
  );
}