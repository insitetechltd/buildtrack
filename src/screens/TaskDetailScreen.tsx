import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  Linking,
  RefreshControl,
  FlatList,
} from "react-native";
import { ScrollView as GestureScrollView } from "react-native-gesture-handler";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import Modal from "react-native-modal";
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
import { TaskStatus, Priority, Task, TaskEditHistory } from "../types/buildtrack";
import { cn } from "../utils/cn";
import StandardHeader from "../components/StandardHeader";
import ModalHandle from "../components/ModalHandle";
import TaskDetailUtilityFAB from "../components/TaskDetailUtilityFAB";
import TaskCard from "../components/TaskCard";
import { useFileUpload, UploadResults } from "../utils/useFileUpload";
import { useUploadFailureStore } from "../state/uploadFailureStore";
import { useTranslation } from "../utils/useTranslation";
import { useDateFormatter } from "../utils/dateFormatter";
import CachedImage from "../components/CachedImage";
import { getCachedFileUri } from "../utils/useFileCache";

interface TaskDetailScreenProps {
  taskId: string;
  subTaskId?: string; // Optional: if provided, show only this subtask
  onNavigateBack: () => void;
  onNavigateToCreateTask?: (parentTaskId?: string, parentSubTaskId?: string, editTaskId?: string, actionType?: 'edit' | 'update' | 'photos' | 'comment' | 'reassign') => void;
  onNavigateToTaskDetail?: (taskId: string, subTaskId?: string) => void; // For navigating to sub-task details
}

export default function TaskDetailScreen({ taskId, subTaskId, onNavigateBack, onNavigateToCreateTask, onNavigateToTaskDetail }: TaskDetailScreenProps) {
  const navigation = useNavigation<any>();
  const t = useTranslation();
  const dateFormatter = useDateFormatter();
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
  const addAssignerComment = useTaskStore(state => state.addAssignerComment);
  const acceptTask = useTaskStore(state => state.acceptTask);
  const declineTask = useTaskStore(state => state.declineTask);
  const submitTaskForReview = useTaskStore(state => state.submitTaskForReview);
  const acceptTaskCompletion = useTaskStore(state => state.acceptTaskCompletion);
  const rejectTaskCompletion = useTaskStore(state => state.rejectTaskCompletion);
  const submitSubTaskForReview = useTaskStore(state => state.submitSubTaskForReview);
  const acceptSubTaskCompletion = useTaskStore(state => state.acceptSubTaskCompletion);
  const rejectSubTaskCompletion = useTaskStore(state => state.rejectSubTaskCompletion);
  const cancelTask = useTaskStore(state => state.cancelTask);
  const deleteTaskById = useTaskStore(state => state.deleteTaskById);
  const archiveTask = useTaskStore(state => state.archiveTask);
  const fetchTaskEditHistory = useTaskStore(state => state.fetchTaskEditHistory);
  const { getUserById, getAllUsers } = useUserStore();
  const { getProjectUserAssignments } = useProjectStoreWithCompanyInit(user?.companyId || "");
  const { getCompanyBanner } = useCompanyStore();
  const { pickAndUploadImages, isUploading, uploadProgress, isCompressing, compressionProgress } = useFileUpload();
  const { getFailuresForTask, dismissFailure, incrementRetryCount } = useUploadFailureStore();

  const [refreshing, setRefreshing] = useState(false);
  const [showUserPicker, setShowUserPicker] = useState(false);
  const [showTaskDetailModal, setShowTaskDetailModal] = useState(false);
  const [selectedTaskForDetail, setSelectedTaskForDetail] = useState<Task | null>(null);
  const [progressLogSortOrder, setProgressLogSortOrder] = useState<'asc' | 'desc'>('desc');
  const [expandedUpdateIds, setExpandedUpdateIds] = useState<Set<string>>(new Set());
  const [isAssigneesExpanded, setIsAssigneesExpanded] = useState(false);
  // Photo viewer navigation is now handled via navigation to PhotoViewerScreen
  const [editHistory, setEditHistory] = useState<TaskEditHistory[]>([]);
  const [showEditHistory, setShowEditHistory] = useState(false);
  

  // Get the task - could be a top-level task or a sub-task
  const foundTask = tasks.find(t => t.id === taskId);
  
  // ✅ UPDATED: If subTaskId is provided, find the subtask directly from the unified tasks table
  // (not from nested subTasks array - that's the old schema)
  // Otherwise, if the found task has a parentTaskId, it's a sub-task being viewed directly
  const subTask = subTaskId 
    ? tasks.find(t => t.id === subTaskId)
    : (foundTask?.parentTaskId ? foundTask : null);
  
  // Use subtask if viewing subtask, otherwise use the found task
  const task = subTask || foundTask;
  const isViewingSubTask = !!subTask;
  
  // Get the parent task if viewing a sub-task
  const parentTask = isViewingSubTask && task?.parentTaskId
    ? tasks.find(t => t.id === task.parentTaskId)
    : null;
  
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
      case "approved": return "text-green-600 bg-green-50";
      case "in_progress": return "text-blue-600 bg-blue-50";
      case "rejected": return "text-red-600 bg-red-50";
      case "declined": return "text-red-600 bg-red-50";
      case "new": return "text-gray-600 bg-gray-50";
      case "accepted": return "text-blue-600 bg-blue-50";
      case "submitted_for_review": return "text-purple-600 bg-purple-50";
      case "cancelled": return "text-gray-600 bg-gray-50";
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

  // Refresh task data when screen comes into focus (cache-first - only fetches if stale)
  // This uses cache-first strategy: returns cached data if fresh (< 30s), otherwise fetches
  useFocusEffect(
    useCallback(() => {
      if (taskId) {
        // Cache-first: only fetches if data is stale (> 30s old)
        fetchTaskById(taskId).catch((error) => {
          console.error('🔄❌ Error refreshing task on focus:', error);
        });
      }
      if (subTaskId) {
        fetchTaskById(subTaskId).catch((error) => {
          console.error('🔄❌ Error refreshing subtask on focus:', error);
        });
      }
    }, [taskId, subTaskId, fetchTaskById])
  );

  // Mark task as read when viewing
  useEffect(() => {
    if (user && taskId) {
      markTaskAsRead(user.id, taskId);
      if (subTaskId) {
        markTaskAsRead(user.id, subTaskId);
      }
    }
  }, [taskId, subTaskId, user?.id, markTaskAsRead]);

  // Fetch edit history when task loads
  useEffect(() => {
    const loadEditHistory = async () => {
      const taskIdToLoad = subTaskId || taskId;
      if (taskIdToLoad) {
        try {
          console.log('📚 Fetching edit history for task:', taskIdToLoad);
          const history = await fetchTaskEditHistory(taskIdToLoad);
          console.log('📚 Edit history fetched:', history.length, 'entries');
          setEditHistory(history);
        } catch (error) {
          console.error('Error fetching edit history:', error);
        }
      }
    };
    loadEditHistory();
  }, [taskId, subTaskId, fetchTaskEditHistory]);

  // Refresh edit history when screen comes into focus (e.g., after editing)
  useFocusEffect(
    useCallback(() => {
      const taskIdToLoad = subTaskId || taskId;
      if (taskIdToLoad) {
        console.log('🔄 Screen focused, refreshing edit history for task:', taskIdToLoad);
        fetchTaskEditHistory(taskIdToLoad).then((history) => {
          console.log('🔄 Edit history refreshed:', history.length, 'entries');
          setEditHistory(history);
        }).catch((error) => {
          console.error('Error refreshing edit history:', error);
        });
      }
    }, [taskId, subTaskId, fetchTaskEditHistory])
  );

  if (!user || !task) {
    return (
      <SafeAreaView edges={['bottom', 'left', 'right']} className="flex-1 bg-gray-50">
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
  // Use String() comparison to handle type mismatches (UUID vs string)
  const isTaskCreator = String(task.assignedBy) === String(user.id);

  // Check if task was reassigned after being declined
  const wasReassigned = useMemo(() => {
    if (task.status !== "new" || !isTaskCreator) return false;
    // Check activities for reassignment
    const activities = task.activities || [];
    const hasReassignmentActivity = activities.some((activity: any) => {
      const description = activity.description || "";
      return description.toLowerCase().includes("reassigned");
    });
    // Check updates for reassignment
    const updates = task.updates || [];
    const hasReassignmentUpdate = updates.some((update: any) => {
      const description = update.description || "";
      return description.toLowerCase().includes("reassigned");
    });
    return hasReassignmentActivity || hasReassignmentUpdate;
  }, [task.activities, task.updates, task.status, isTaskCreator]);

  // Collect all files from the task (attachments + photos from activities/updates)
  // Also create a mapping of file URLs to activity IDs for expanding related activities
  const { allTaskFiles, fileToActivityMap } = useMemo(() => {
    const files: string[] = [];
    const fileMap: Record<string, string> = {}; // Maps file URL to activity ID
    
    // Add task attachments (these don't have associated activities)
    if (task.attachments && task.attachments.length > 0) {
      files.push(...task.attachments);
    }
    
    // Add photos from activities
    if (task.activities && task.activities.length > 0) {
      task.activities.forEach((activity: any) => {
        const photos = (activity.data as any)?.photos || [];
        if (photos && photos.length > 0) {
          photos.forEach((photo: string) => {
            files.push(photo);
            fileMap[photo] = activity.id;
          });
        }
      });
    }
    
    // Add photos from updates (legacy support)
    if (task.updates && task.updates.length > 0) {
      task.updates.forEach((update: any) => {
        if (update.photos && update.photos.length > 0) {
          update.photos.forEach((photo: string) => {
            files.push(photo);
            fileMap[photo] = update.id;
          });
        }
      });
    }
    
    // Remove duplicates and return
    const uniqueFiles = Array.from(new Set(files));
    return { allTaskFiles: uniqueFiles, fileToActivityMap: fileMap };
  }, [task.attachments, task.activities, task.updates]);

  // Navigation functions for screens
  const openUpdatePanel = () => {
    navigation.navigate("UpdateProgress", {
      taskId: task?.id,
      subTaskId: subTaskId,
      initialCompletionPercentage: task?.completionPercentage || 0,
    });
  };

  const openCommentPanel = () => {
    navigation.navigate("AddComment", {
      taskId: task?.id,
    });
  };

  const openRejectPanel = () => {
    navigation.navigate("RejectTask", {
      taskId: task?.id,
      subTaskId: subTaskId,
    });
  };


  
  // Debug logging for review banner visibility
  if (task.completionPercentage === 100 && task.status === "submitted_for_review") {
    console.log('🔍 [DEBUG] Review Banner Check:', {
      title: task.title,
      taskId: task.id,
      isTaskCreator,
      assignedBy: task.assignedBy,
      assignedByType: typeof task.assignedBy,
      userId: user.id,
      userIdType: typeof user.id,
      status: task.status,
      completionPercentage: task.completionPercentage,
      shouldShowBanner: isTaskCreator && task.completionPercentage === 100
    });
  }

  // Users can update progress if:
  // 1. They are assigned to the task (not the creator) AND the task has been accepted (status is "accepted" or "in_progress")
  // 2. OR the task is rejected after completion (status is "rejected" and completionPercentage === 100) - allows corrections
  // Task must be accepted before progress updates are allowed, except for rejected tasks that need rework
  // Note: Task creators (assigners) cannot update progress - they can only add comments
  const canUpdateProgress = isAssignedToMe && !isTaskCreator && (
    task.status === "accepted" || 
    task.status === "in_progress" || 
    (task.status === "rejected" && task.completionPercentage === 100)
  );
  const canEditTask = isTaskCreator;
  
  // DISABLED: Sub-task creation is temporarily disabled for all users
  const canCreateSubTask = false; // Always disabled - button will be greyed out

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
              // Refresh the specific task to get updated accepted/acceptedBy fields
              await fetchTaskById(task.id, true); // Force refresh after acceptance
              // Also refetch all tasks to ensure the dashboard shows updated state
              await fetchTasks();
              Alert.alert(t.errors.success, t.taskDetail.taskAccepted);
            } catch (error: any) {
              console.error('Error accepting task:', error);
              Alert.alert(t.errors.error, error.message || 'Failed to accept task. Please try again.');
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
          onPress: async (reason: string | undefined) => {
            if (reason && reason.trim()) {
              try {
                await declineTask(task.id, user.id, reason.trim());
                // Refresh the task to get updated status
                await fetchTaskById(task.id, true); // Force refresh after decline
                await fetchTasks();
                Alert.alert(t.taskDetail.taskDeclined, t.taskDetail.taskDeclinedMessage);
              } catch (error: any) {
                console.error('Error declining task:', error);
                Alert.alert(t.errors.error, error.message || 'Failed to decline task. Please try again.');
              }
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

  const handleReassignTask = async (selectedUserIds: string[]) => {
    if (selectedUserIds.length === 0) {
      Alert.alert(t.errors.error, t.taskDetail.selectUsers);
      return;
    }

    if (!user || !task) return;

    try {
      // Update task assignment and reset acceptance fields
      // This ensures the task appears as "new" for the new assignee
      // and disappears from the original assignee's inbox
      // Note: updateTask will automatically log an "assignment" activity
      await updateTask(task.id, {
        assignedTo: selectedUserIds,
        status: "new" as TaskStatus,
        declinedReason: undefined,
        accepted: false,
        acceptedBy: null,
        acceptedAt: null,
      });

      // Refresh task data
      await fetchTaskById(task.id);

      Alert.alert(
        t.taskDetail.taskReassigned,
        `${t.taskDetail.taskReassigned} ${selectedUserIds.length} ${t.phrases.users}.`,
        [{ text: t.common.ok }]
      );
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
              await fetchTaskById(task.id, true); // Force refresh after completion acceptance
              Alert.alert(t.errors.success, t.taskDetail.completionAccepted);
            } catch (error: any) {
              Alert.alert(t.errors.error, error.message || t.taskDetail.completionAccepted);
            }
          }
        }
      ]
    );
  };

  const handleRejectTask = () => {
    // Open reject panel instead of Alert.prompt
    openRejectPanel();
  };


  const handleAttachmentPress = async (uri: string) => {
    const isPDF = uri.toLowerCase().endsWith('.pdf') || uri.includes('application/pdf');
    
    // Check if this file is associated with an activity/update
    const relatedActivityId = fileToActivityMap[uri];
    if (relatedActivityId) {
      // Expand the related activity in the Activities section
      const newExpanded = new Set(expandedUpdateIds);
      if (!newExpanded.has(relatedActivityId)) {
        newExpanded.add(relatedActivityId);
        setExpandedUpdateIds(newExpanded);
      }
      
      // Find the activity and get all its photos
      const allActivities = task.activities || task.updates.map((update: any) => ({
        id: update.id,
        activityType: update.status ? 'status_change' : 'progress_update',
        timestamp: update.timestamp,
        userId: update.userId,
        description: update.description,
        completionPercentage: update.completionPercentage,
        status: update.status,
        data: { photos: update.photos || [] },
      }));
      
      const activity = allActivities.find((a: any) => a.id === relatedActivityId);
      if (activity) {
        // Get photos from activity.data.photos
        const photos = (activity.data as any)?.photos || [];
        console.log('Activity photos found:', photos.length, photos);
        const photoIndex = photos.indexOf(uri);
        console.log('Clicked photo index:', photoIndex, 'URI:', uri);
        
        if (photoIndex !== -1 && photos.length > 0) {
          // Navigate to PhotoViewerScreen
          navigation.navigate("PhotoViewer", {
            photos: photos,
            initialIndex: photoIndex,
            activityInfo: activity,
          });
        } else {
          // Fallback: just show the single image
          navigation.navigate("PhotoViewer", {
            photos: [uri],
            initialIndex: 0,
            activityInfo: null,
          });
        }
      } else {
        // Fallback: just show the single image
        navigation.navigate("PhotoViewer", {
          photos: [uri],
          initialIndex: 0,
          activityInfo: null,
        });
      }
    } else {
      // File not associated with an activity (e.g., task attachment)
      if (isPDF) {
        // Get cached PDF URI (downloads if not cached)
        // Cached URI will have file:// protocol for local files
        try {
          const cachedUri = await getCachedFileUri(uri, 'application/pdf');
          // Open cached PDF (local file:// URI) or original remote URL
          Linking.openURL(cachedUri).catch(() => {
            Alert.alert("Error", "Unable to open PDF file");
          });
        } catch (error) {
          console.error('Error getting cached PDF:', error);
          // Fallback to original URI
          Linking.openURL(uri).catch(() => {
            Alert.alert("Error", "Unable to open PDF file");
          });
        }
      } else {
        // Navigate to PhotoViewerScreen without activity info
        navigation.navigate("PhotoViewer", {
          photos: [uri],
          initialIndex: 0,
          activityInfo: null,
        });
      }
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
                console.log(`✅ ${results.successful.length} photo(s) uploaded and ready`);
                // Navigate to update progress screen after photos are added
                navigation.navigate("UpdateProgress", {
                  taskId: task.id,
                  subTaskId: subTaskId,
                  initialCompletionPercentage: task.completionPercentage || 0,
                });
              }

              if (results.failed.length > 0) {
                Alert.alert("Upload Failed", `${results.failed.length} photo(s) failed to upload. Please try again.`);
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
                console.log(`✅ ${results.successful.length} photo(s) uploaded and ready`);
                // Navigate to update progress screen after photos are added
                navigation.navigate("UpdateProgress", {
                  taskId: task.id,
                  subTaskId: subTaskId,
                  initialCompletionPercentage: task.completionPercentage || 0,
                });
              }

              if (results.failed.length > 0) {
                Alert.alert("Upload Failed", `${results.failed.length} photo(s) failed to upload. Please try again.`);
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


  const isOverdue = new Date(task.dueDate) < new Date() && task.status !== "approved" && task.completionPercentage < 100;

  return (
    <SafeAreaView edges={['bottom', 'left', 'right']} className="flex-1 bg-gray-50">
      <StatusBar style="dark" />
      
      {/* Standard Header */}
      <StandardHeader 
        title={task?.title || t.tasks.taskDetails}
        showBackButton={true}
        onBackPress={onNavigateBack}
      />

      {/* Sub-task indicator - Shown when viewing a sub-task */}
      {isViewingSubTask && (
        <View className={cn(
          "flex-row items-center mx-4 mt-2 px-4 py-2.5 rounded-lg",
          "bg-purple-50 border border-purple-200"
        )}>
          <Ionicons name="git-branch-outline" size={18} color="#7c3aed" />
          <Text className="text-base font-semibold text-purple-700 ml-2">
            Sub-task
          </Text>
          {parentTask && (
            <Text className="text-sm text-purple-600 ml-2 flex-1" numberOfLines={1}>
              • Parent: {parentTask.title}
            </Text>
          )}
        </View>
      )}



      {/* Awaiting Approval Banner - Shown to assignee after submitting for review */}
      {isAssignedToMe && 
       task.completionPercentage === 100 && 
       task.status === "submitted_for_review" && (
        <View className="bg-amber-50 border-b-2 border-amber-200 px-6 py-4">
          <View className="flex-row items-center">
            <View className="w-10 h-10 bg-amber-100 rounded-full items-center justify-center mr-3">
              <Ionicons name="time-outline" size={24} color="#f59e0b" />
            </View>
            <View className="flex-1">
              <Text className="text-xl font-bold text-amber-900">
                {t.taskDetail.submittedForReview}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Submit for Review Button - Shown when task is at 100% but not yet submitted (for assignee) */}
      {/* Mutually exclusive with the "Submitted for Review" banner above */}
      {/* Should not appear if task is already approved */}
      {isAssignedToMe && 
       !isTaskCreator && 
       task.completionPercentage === 100 && 
       task.status !== "submitted_for_review" &&
       task.status !== "approved" && (
        <View className="px-6 py-3 border-b border-gray-200">
          <Pressable
            onPress={async () => {
              try {
                if (isViewingSubTask && subTaskId) {
                  await submitSubTaskForReview(taskId, subTaskId);
                } else {
                  await submitTaskForReview(task.id);
                }
                await fetchTaskById(task.id, true); // Force refresh after submission
                Alert.alert(
                  "Submitted for Review! ✅",
                  "Your task has been submitted for review by the task creator.",
                  [{ text: "OK" }]
                );
              } catch (error: any) {
                Alert.alert("Error", error.message || "Failed to submit task for review.");
              }
            }}
            className="bg-blue-600 py-3.5 rounded-lg items-center flex-row justify-center"
          >
            <Text className="text-white font-semibold text-lg">Completed - Review Submission</Text>
          </Pressable>
        </View>
      )}

      {/* Please Review Complete Task Banner - Shown when task is submitted for review and user is the creator */}
      {isTaskCreator && 
       task.status === "submitted_for_review" && 
       task.completionPercentage === 100 && (
        <View className="bg-amber-50 border-b-2 border-amber-200 px-6 py-4">
          <View className="flex-row items-center">
            <View className="w-10 h-10 bg-amber-100 rounded-full items-center justify-center mr-3">
              <Ionicons name="time-outline" size={24} color="#f59e0b" />
            </View>
            <View className="flex-1">
              <Text className="text-xl font-bold text-amber-900">
                Please Review Complete Task
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Task Approved Banner - Shown when task is approved */}
      {task.status === "approved" && task.reviewedBy && (
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
                {t.taskDetail.reviewedAndApproved} {getUserById(task.reviewedBy)?.name || t.projects.unknown}
                {task.reviewedAt && ` ${dateFormatter.formatDateShort(task.reviewedAt)}`}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Declined Task Banner - Shown when task is declined (before acceptance) and user is the assigner */}
      {task.status === "declined" && task.assignedBy === user.id && (() => {
        // Find the user who declined the task from activities
        const declineActivity = task.activities?.find((activity: any) => 
          activity.activityType === 'status_change' && 
          activity.status === 'declined'
        );
        const declinedByUserId = declineActivity?.userId;
        const declinedByUser = declinedByUserId ? getUserById(declinedByUserId) : null;
        
        return (
          <View className="bg-red-50 border-b-2 border-red-200 px-6 py-4">
            <View className="flex-row items-center">
              <View className="w-10 h-10 bg-red-100 rounded-full items-center justify-center mr-3">
                <Ionicons name="close-circle" size={24} color="#dc2626" />
              </View>
              <View className="flex-1">
                <Text className="text-xl font-bold text-red-900">
                  {declinedByUser 
                    ? `Task Declined by ${declinedByUser.name}`
                    : t.taskDetail.taskDeclined
                  }
                </Text>
                {task.declinedReason && (
                  <Text className="text-base text-red-600 mt-1 italic">
                    {t.taskDetail.reason} {task.declinedReason}
                  </Text>
                )}
              </View>
            </View>
          </View>
        );
      })()}

      {/* Rejected Task Banner - Shown when task is rejected after completion (100%) and user is the assigner */}
      {task.status === "rejected" && task.completionPercentage === 100 && task.assignedBy === user.id && (
        <View className="bg-red-50 border-b-2 border-red-200 px-6 py-4">
          <View className="flex-row items-center">
            <View className="w-10 h-10 bg-red-100 rounded-full items-center justify-center mr-3">
              <Ionicons name="close-circle" size={24} color="#dc2626" />
            </View>
            <View className="flex-1">
              <Text className="text-xl font-bold text-red-900">
                {t.taskDetail.taskRejected}
              </Text>
              <Text className="text-base text-red-700">
                {t.taskDetail.completionRejected || "Task completion was rejected. The assignee needs to make corrections."}
              </Text>
              {task.declinedReason && (
                <Text className="text-base text-red-600 mt-1 italic">
                  {t.taskDetail.reason} {task.declinedReason}
                </Text>
              )}
            </View>
          </View>
        </View>
      )}

      <ScrollView 
        className="flex-1"
        showsVerticalScrollIndicator={true}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
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
              <Pressable
                onPress={() => {
                  if (assignedUsers.length > 1) {
                    setIsAssigneesExpanded(!isAssigneesExpanded);
                  }
                }}
                disabled={assignedUsers.length <= 1}
                className="flex-row items-center justify-between mb-2"
              >
                <Text className="text-sm font-medium text-gray-500">
                  {t.taskDetail.assignedTo} {assignedUsers.length > 1 && `(${assignedUsers.length})`}
                </Text>
                {assignedUsers.length > 1 && (
                  <Ionicons 
                    name={isAssigneesExpanded ? "chevron-up" : "chevron-down"} 
                    size={18} 
                    color="#6b7280" 
                  />
                )}
              </Pressable>
              {assignedUsers.length > 0 ? (
                <>
                  {/* Always show first assignee */}
                  {assignedUsers[0] && (() => {
                    const assignedUser = assignedUsers[0];
                    const userUpdates = task.updates?.filter(update => update.userId === assignedUser.id) || [];
                    const latestUpdate = userUpdates[userUpdates.length - 1];
                    const userProgress = latestUpdate?.completionPercentage || task.completionPercentage || 0;
                    
                    return (
                      <Pressable 
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
                  })()}
                  
                  {/* Show remaining assignees if expanded */}
                  {isAssigneesExpanded && assignedUsers.length > 1 && (
                    <View className="mt-2">
                      {assignedUsers.slice(1).map((assignedUser) => {
                        if (!assignedUser) return null;
                        
                        const userUpdates = task.updates?.filter(update => update.userId === assignedUser.id) || [];
                        const latestUpdate = userUpdates[userUpdates.length - 1];
                        const userProgress = latestUpdate?.completionPercentage || task.completionPercentage || 0;
                        
                        return (
                          <Pressable 
                            key={assignedUser.id} 
                            className="mt-3 pt-3 border-t border-gray-200"
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
                      })}
                    </View>
                  )}
                </>
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
                {dateFormatter.formatDateShort(task.dueDate)}
              </Text>
            </View>
            <View className={cn(
              "px-2 py-1 rounded-full",
              task.status === "approved" ? "bg-green-50" :
              task.status === "in_progress" ? "bg-blue-50" :
              task.status === "rejected" ? "bg-red-50" :
              task.status === "declined" ? "bg-red-50" :
              task.status === "submitted_for_review" ? "bg-purple-50" :
              "bg-gray-50"
            )}>
              <Text className={cn(
                "text-sm font-medium capitalize",
                task.status === "approved" ? "text-green-700" :
                task.status === "in_progress" ? "text-blue-700" :
                task.status === "rejected" ? "text-red-700" :
                task.status === "declined" ? "text-red-700" :
                task.status === "submitted_for_review" ? "text-purple-700" :
                "text-gray-700"
              )}>
                {task.status?.replace(/_/g, " ") || "new"}
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

          {/* Edit History Section - Inside task information card */}
          {editHistory.length > 0 && (
            <>
              <View className="border-t border-gray-200 my-4" />
              <Pressable
                onPress={() => setShowEditHistory(!showEditHistory)}
                className="flex-row items-center justify-between mb-2 active:opacity-70"
              >
                <View className="flex-row items-center">
                  <Ionicons name="time-outline" size={20} color="#6b7280" style={{ marginRight: 8 }} />
                  <Text className="text-lg font-semibold text-gray-900">{t.taskDetail.editHistory}</Text>
                  {task.hasUnreadChanges && (
                    <View className="ml-2 w-2 h-2 bg-blue-500 rounded-full" />
                  )}
                </View>
                <View className="flex-row items-center">
                  <Text className="text-sm text-gray-500 mr-1">{editHistory.length} {editHistory.length === 1 ? 'edit' : 'edits'}</Text>
                  <Ionicons 
                    name={showEditHistory ? "chevron-up" : "chevron-down"} 
                    size={16} 
                    color="#6b7280" 
                  />
                </View>
              </Pressable>

              {showEditHistory && (
                <View className="mt-2">
                  {editHistory.map((edit, index) => {
                    const editor = getUserById(edit.editedBy);
                    return (
                      <View 
                        key={edit.id} 
                        className={index < editHistory.length - 1 ? "mb-4 pb-4 border-b border-gray-100" : ""}
                      >
                        <View className="flex-row justify-between mb-2">
                          <View className="flex-row items-center">
                            <Ionicons name="pencil" size={16} color="#6b7280" style={{ marginRight: 8 }} />
                            <Text className="font-medium text-gray-900">
                              {t.taskDetail.editedBy} {editor?.name || 'Unknown'}
                            </Text>
                          </View>
                          <Text className="text-gray-500 text-sm">
                            {dateFormatter.formatDateTime(edit.editedAt)}
                          </Text>
                        </View>
                        
                        {edit.editReason && (
                          <View className="mb-2 p-2 bg-blue-50 rounded-lg">
                            <Text className="text-sm font-medium text-gray-700 mb-1">{t.taskDetail.editReason}:</Text>
                            <Text className="text-sm text-gray-600">{edit.editReason}</Text>
                          </View>
                        )}

                        <View className="space-y-2">
                          {Object.entries(edit.changes).map(([field, change]) => {
                            const fieldLabel = field === 'dueDate' ? t.tasks.dueDate :
                                              field === 'assignedTo' ? t.taskDetail.assignees :
                                              field === 'taskReference' ? t.createTask.taskReference :
                                              field.charAt(0).toUpperCase() + field.slice(1);
                            
                            const formatValue = (value: any, fieldName: string) => {
                              if (fieldName === 'dueDate') {
                                return value ? dateFormatter.formatDateShort(value) : t.projects.noLocation;
                              }
                              if (fieldName === 'assignedTo' && Array.isArray(value)) {
                                return value.map(id => getUserById(id)?.name || id).join(', ') || t.taskDetail.noAssignees;
                              }
                              if (fieldName === 'priority' || fieldName === 'category') {
                                return String(value).charAt(0).toUpperCase() + String(value).slice(1);
                              }
                              return String(value || '');
                            };

                            return (
                              <View key={field} className="p-2 bg-gray-50 rounded">
                                <Text className="text-sm font-medium text-gray-700 mb-1">
                                  {fieldLabel}
                                </Text>
                                <View className="flex-row items-center">
                                  <Text className="text-sm text-red-600 line-through mr-2">
                                    {formatValue(change.old, field)}
                                  </Text>
                                  <Ionicons name="arrow-forward" size={14} color="#6b7280" />
                                  <Text className="text-sm text-green-600 ml-2 font-medium">
                                    {formatValue(change.new, field)}
                                  </Text>
                                </View>
                              </View>
                            );
                          })}
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </>
          )}
        </View>

        {/* All Files Section - Shows all attachments and photos from activities/updates */}
        {allTaskFiles.length > 0 && (
          <View className="bg-white mx-4 mt-3 rounded-xl border border-gray-200 p-4">
            <View className="flex-row items-center mb-3">
              <Ionicons name="folder-outline" size={20} color="#6b7280" />
              <Text className="text-lg font-semibold text-gray-900 ml-2">
                All Files ({allTaskFiles.length})
              </Text>
            </View>
            
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row gap-3">
                {allTaskFiles.map((file, index) => {
                  const isPDF = file.toLowerCase().endsWith('.pdf') || file.includes('application/pdf');
                  
                  return (
                    <Pressable
                      key={index}
                      onPress={() => handleAttachmentPress(file)}
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
                        <CachedImage
                          uri={file}
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
        <View className="bg-white mx-4 mt-3 rounded-xl border border-gray-200 p-4 mb-4">
          {/* Header with Activities title, sort toggle, expand/collapse all, and completion percentage */}
          <View className="flex-row items-center justify-between mb-2" style={{ flexShrink: 1 }}>
            <View className="flex-row items-center flex-1" style={{ minWidth: 0 }}>
              <Text className="text-lg font-semibold text-gray-900" numberOfLines={1}>Activities</Text>
              <Pressable
                onPress={() => setProgressLogSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                className="ml-2 flex-row items-center px-1.5 py-1 bg-gray-100 rounded-lg"
                style={{ flexShrink: 0 }}
              >
                <Ionicons 
                  name={progressLogSortOrder === 'asc' ? "arrow-up" : "arrow-down"} 
                  size={16} 
                  color="#374151" 
                />
                <Text className="text-base text-gray-700 ml-1 font-medium" numberOfLines={1}>
                  {progressLogSortOrder === 'asc' ? 'Oldest' : 'Newest'}
                </Text>
              </Pressable>
              {(() => {
                // Get all activity IDs to check if all are expanded (include all activities, including creation)
                const allActivities = task.activities || task.updates.map((update: any) => ({
                  id: update.id,
                }));
                const allActivityIds = new Set(allActivities.map((a: any) => a.id));
                const allExpanded = allActivityIds.size > 0 && 
                  Array.from(allActivityIds).every(id => expandedUpdateIds.has(id));
                
                return (
                  <Pressable
                    onPress={() => {
                      if (allExpanded) {
                        // Collapse all
                        setExpandedUpdateIds(new Set());
                      } else {
                        // Expand all
                        setExpandedUpdateIds(new Set(allActivityIds));
                      }
                    }}
                    className="ml-1.5 flex-row items-center px-1.5 py-1 bg-blue-100 rounded-lg"
                    style={{ flexShrink: 0 }}
                  >
                    <Ionicons 
                      name={allExpanded ? "chevron-up" : "chevron-down"} 
                      size={16} 
                      color="#2563eb" 
                    />
                    <Text className="text-base text-blue-700 ml-1 font-medium" numberOfLines={1}>
                      {allExpanded ? 'Collapse' : 'Expand'}
                    </Text>
                  </Pressable>
                );
              })()}
            </View>
            <Text 
              className={cn(
                "text-lg font-bold ml-2",
                task.completionPercentage === 100 ? "text-green-600" : "text-gray-900"
              )}
              numberOfLines={1}
              style={{ flexShrink: 0 }}
            >
              {task.completionPercentage}%
            </Text>
          </View>


          {/* Divider */}
          {(task.activities?.length || task.updates.length) > 0 && <View className="border-t border-gray-200 mt-2 mb-3" />}
          
          {/* Activities List - Expandable (unified from task_activities) - Dynamic height container for up to 10 collapsed activities */}
          {(task.activities?.length || task.updates.length) > 0 ? (
            <View style={{ margin: 0, padding: 0 }}>
              {(() => {
                // Get all activities
                const allActivities = task.activities || task.updates.map((update: any) => ({
                  id: update.id,
                  activityType: update.status ? 'status_change' : 'progress_update',
                  timestamp: update.timestamp,
                  userId: update.userId,
                  description: update.description,
                  completionPercentage: update.completionPercentage,
                  status: update.status,
                  data: { photos: update.photos || [] },
                }));
                
                // Sort by timestamp (include all activities, including creation)
                const sortedActivities = [...allActivities].sort((a: any, b: any) => {
                  const timeA = new Date(a.timestamp || a.createdAt || 0).getTime();
                  const timeB = new Date(b.timestamp || b.createdAt || 0).getTime();
                  return progressLogSortOrder === 'asc' ? timeA - timeB : timeB - timeA;
                });
                
                const activityCount = sortedActivities.length;
                const maxDisplayCount = 10;
                
                // Use onLayout to measure actual heights instead of estimating
                // Store measured heights in state so container updates when heights change
                const [measuredHeights, setMeasuredHeights] = React.useState<Map<string, number>>(new Map());
                
                // Calculate dynamic height: Use measured heights when available, fallback to estimates
                const collapsedHeight = 42; // More accurate collapsed height (measured)
                const gap = 12; // Gap between activities
                
                // Calculate height for each activity based on expanded state
                const calculateActivityHeight = (activity: any, index: number) => {
                  // Use measured height if available
                  const measuredHeight = measuredHeights.get(activity.id);
                  if (measuredHeight !== undefined) {
                    return measuredHeight;
                  }
                  
                  // Fallback to estimation
                  const isExpanded = expandedUpdateIds.has(activity.id);
                  if (!isExpanded) {
                    return collapsedHeight;
                  }
                  
                  // Estimate expanded height (conservative estimates)
                  const activityData = activity.data as any;
                  const hasPhotos = ((activityData?.photos || activity.photos || []).length > 0);
                  const hasReason = !!(activityData?.reason || activity.description?.includes('Reason:'));
                  
                  let actionText = activity.description || '';
                  if (activityData?.reason) {
                    const reasonPattern = new RegExp(`\\.?\\s*Reason:\\s*${activityData.reason.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i');
                    actionText = actionText.replace(reasonPattern, '').trim();
                  } else if (activity.description?.includes('Reason:')) {
                    actionText = activity.description.replace(/\s*Reason:.*$/i, '').trim();
                  }
                  const hasDescription = !!actionText;
                  
                  let expandedHeight = collapsedHeight; // Start with collapsed height
                  expandedHeight += 12; // mt-3
                  expandedHeight += 28; // Label (text-base font-medium + mb-2)
                  
                  if (hasDescription) {
                    const estimatedLines = Math.max(1, Math.ceil(actionText.length / 50));
                    expandedHeight += (estimatedLines * 20) + 8; // Text + mb-2
                  }
                  
                  if (hasReason) {
                    expandedHeight += 30; // Reason section
                  }
                  
                  if (hasPhotos) {
                    expandedHeight += 80; // Photos section
                  }
                  
                  return expandedHeight;
                };
                
                // Calculate total height for displayed activities (up to 10)
                const displayCount = Math.min(activityCount, maxDisplayCount);
                let totalHeight = 0;
                
                if (displayCount > 0) {
                  for (let i = 0; i < displayCount; i++) {
                    totalHeight += calculateActivityHeight(sortedActivities[i], i);
                    if (i < displayCount - 1) {
                      totalHeight += gap;
                    }
                  }
                }
                
                const dynamicHeight = totalHeight;
                
                // Render function for each activity item
                const renderActivityItem = ({ item: activity }: { item: any }) => {
                  // Use activities if available, otherwise fall back to updates
                  const activityType = activity.activityType || (activity.status ? 'status_change' : 'progress_update');
                  const update = activity;
                  const activityUserId = activity.userId || update.userId;
                  const activityUser = getUserById(activityUserId);
                  const isExpanded = expandedUpdateIds.has(activity.id);
                  
                  // Get activity type icon and color
                  const getActivityIcon = (type: string) => {
                  switch (type) {
                    case 'creation': return 'add-circle';
                    case 'assignment': return 'person-add';
                    case 'status_change': return 'sync';
                    case 'progress_update': return 'trending-up';
                    case 'metadata_edit': return 'create';
                    case 'review_submission': return 'send';
                    case 'review_acceptance': return 'checkmark-circle';
                    case 'review_rejection': return 'close-circle';
                    case 'cancellation': return 'ban';
                    case 'assigner_comment': return 'chatbubble';
                    default: return 'document-text';
                  }
                };

                const getActivityColor = (type: string) => {
                  switch (type) {
                    case 'creation': return '#10b981'; // green
                    case 'assignment': return '#3b82f6'; // blue
                    case 'status_change': return '#8b5cf6'; // purple
                    case 'progress_update': return '#f59e0b'; // amber
                    case 'metadata_edit': return '#6366f1'; // indigo
                    case 'review_submission': return '#06b6d4'; // cyan
                    case 'review_acceptance': return '#10b981'; // green
                    case 'review_rejection': return '#ef4444'; // red
                    case 'cancellation': return '#6b7280'; // gray
                    case 'assigner_comment': return '#3b82f6'; // blue
                    default: return '#6b7280';
                  }
                };
                
                  return (
                    <View 
                      className="border-l-4 pl-4" 
                      style={{ borderLeftColor: getActivityColor(activityType) }}
                      onLayout={(event) => {
                        const { height } = event.nativeEvent.layout;
                        if (height > 0 && height !== measuredHeights.get(activity.id)) {
                          setMeasuredHeights(prev => {
                            const newMap = new Map(prev);
                            newMap.set(activity.id, height);
                            return newMap;
                          });
                        }
                      }}
                    >
                    <Pressable 
                      onPress={() => {
                        const newExpanded = new Set(expandedUpdateIds);
                        if (isExpanded) {
                          newExpanded.delete(activity.id);
                        } else {
                          newExpanded.add(activity.id);
                        }
                        setExpandedUpdateIds(newExpanded);
                      }}
                      className="flex-row items-center justify-between active:opacity-70"
                    >
                      <View className="flex-1">
                        <View className="flex-row items-center">
                          <View className="flex-row items-center" style={{ flex: 1 }}>
                            <Ionicons 
                              name={getActivityIcon(activityType) as any} 
                              size={16} 
                              color={getActivityColor(activityType)} 
                              style={{ marginRight: 6 }}
                            />
                            <Text className="font-medium text-gray-900">
                              {activityUser?.name || "Unknown User"}
                            </Text>
                          </View>
                          <View className="absolute left-0 right-0 items-center pointer-events-none" style={{ zIndex: 0 }}>
                            <Text className="text-xs text-gray-500">
                              {dateFormatter.formatDateShort(activity.timestamp || update.timestamp)} {dateFormatter.formatTime(activity.timestamp || update.timestamp)}
                            </Text>
                          </View>
                          <View className="flex-row items-center" style={{ flex: 1, justifyContent: 'flex-end', zIndex: 1 }}>
                            {/* Show progress % on right side - Only for activities that actually update progress */}
                            {/* Exclude metadata_edit, creation, assignment, etc. that don't affect completion % */}
                            {activityType !== 'metadata_edit' && 
                             activityType !== 'creation' && 
                             activityType !== 'assignment' &&
                             (activity.completionPercentage !== undefined || activityType === 'assigner_comment') && (
                              <Text className="text-base font-bold text-gray-500 mr-2">
                                {activityType === 'assigner_comment' 
                                  ? (activity.completionPercentage ?? (activity.data as any)?.completionPercentage ?? 0)
                                  : (activity.completionPercentage !== undefined && activity.completionPercentage !== null 
                                      ? activity.completionPercentage 
                                      : 0)}%
                              </Text>
                            )}
                            <Ionicons 
                              name={isExpanded ? "chevron-up" : "chevron-down"} 
                              size={20} 
                              color="#6b7280" 
                            />
                          </View>
                        </View>
                      </View>
                    </Pressable>

                    {/* Expanded Content - Standardized Format for All Activity Types */}
                    {isExpanded && (() => {
                      // Extract reason from activity.data if available (for status_change, review_rejection, etc.)
                      const activityData = activity.data as any;
                      const reason = activityData?.reason;
                      
                      // Parse description to separate action from reason (for backward compatibility)
                      // If description contains "Reason:", split it
                      let actionText = activity.description || '';
                      let extractedReason: string | undefined = undefined;
                      
                      if (reason) {
                        // Use reason from activity.data if available (preferred)
                        extractedReason = reason;
                        // Try to remove reason from description if it's embedded
                        const reasonPattern = new RegExp(`\\.?\\s*Reason:\\s*${reason.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i');
                        actionText = actionText.replace(reasonPattern, '').trim();
                      } else if (activity.description?.includes('Reason:')) {
                        // Fallback: extract from description for backward compatibility
                        const reasonMatch = activity.description.match(/Reason:\s*(.+)$/i);
                        if (reasonMatch) {
                          extractedReason = reasonMatch[1].trim();
                          actionText = activity.description.replace(/\s*Reason:.*$/i, '').trim();
                        }
                      }
                      
                      return (
                        <View className="mt-3">
                          {/* 1. Activity Type Label - Always shown */}
                          {/* For metadata_edit, show "Task Information" instead of "Metadata Edit" */}
                          <Text className="text-base font-medium text-gray-900 capitalize mb-2">
                            {activityType === 'metadata_edit' 
                              ? 'Task Information' 
                              : (activityType?.replace(/_/g, " ") || activityType)}
                          </Text>
                          
                          {/* 2. Action/Description - Always shown if exists */}
                          {actionText && (
                            <Text className="text-gray-700 mb-2">{actionText}</Text>
                          )}
                          
                          {/* 2b. Reason - Shown if available (for declined, rejected, etc.) */}
                          {extractedReason && (
                            <View className="mb-3">
                              <Text className="text-sm text-gray-700">
                                <Text className="font-medium">Reason:</Text> {extractedReason}
                              </Text>
                            </View>
                          )}
                          
                          {/* 3. Photos - Always shown if exists (for all activity types) */}
                          {((activity.data as any)?.photos || update.photos || []).length > 0 && (
                          <View>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                              <View className="flex-row gap-2">
                                {((activity.data as any)?.photos || update.photos || []).map((photo: string, photoIndex: number) => {
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
                                        <CachedImage
                                          uri={photo}
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
                          </View>
                          )}
                        </View>
                      );
                    })()}
                    </View>
                  );
                };
                
                // Determine if scrolling is needed
                // Scrolling is needed if:
                // 1. There are more than 10 activities (need to scroll to see beyond first 10)
                // 2. OR the calculated height exceeds the max display height (activities expanded beyond viewport)
                const maxCollapsedHeight = maxDisplayCount * collapsedHeight + (maxDisplayCount - 1) * gap;
                const needsScrolling = activityCount > maxDisplayCount || dynamicHeight > maxCollapsedHeight;
                
                // When there are 10 or fewer activities, completely remove height constraint
                // This eliminates any phantom space from miscalculations
                // When there are more than 10, use fixed height to show exactly 10 with scrolling
                const shouldUseFixedHeight = activityCount > maxDisplayCount;
                
                return (
                  <View 
                    style={{ 
                      // For 10 or fewer: use maxHeight to eliminate empty space (allows shrinking to content)
                      // For more than 10: use fixed height to show exactly 10 with scrolling
                      ...(shouldUseFixedHeight 
                        ? { height: dynamicHeight, overflow: 'hidden' } 
                        : {
                            maxHeight: dynamicHeight > 0 ? dynamicHeight : undefined,
                            overflow: 'hidden',
                          })
                    }}
                  >
                    <ScrollView
                      nestedScrollEnabled={true}
                      scrollEnabled={needsScrolling}
                      showsVerticalScrollIndicator={needsScrolling}
                      contentContainerStyle={{ 
                        paddingBottom: 0,
                        paddingTop: 0,
                        paddingLeft: 0,
                        paddingRight: 0,
                        flexGrow: 0,
                        flexShrink: 0,
                      }}
                      style={{
                        margin: 0,
                        padding: 0,
                      }}
                      bounces={false}
                      keyboardShouldPersistTaps="handled"
                    >
                      {sortedActivities.map((activity: any, index: number) => (
                        <View key={activity.id} style={{ margin: 0, padding: 0 }}>
                          {renderActivityItem({ item: activity })}
                          {index < sortedActivities.length - 1 && <View style={{ height: 12, margin: 0, padding: 0 }} />}
                        </View>
                      ))}
                    </ScrollView>
                  </View>
                );
              })()}
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
                        // Navigate to subtask detail screen
                        if (onNavigateToTaskDetail) {
                          onNavigateToTaskDetail(taskId, subTaskId);
                        } else if (onNavigateToCreateTask) {
                          // Fallback: if no navigation handler, use create task (for editing)
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

      {/* Fixed Bottom Action Bar */}
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
          <View className="flex-row gap-3">
            {/* Edit Task Details Button - Only show if user can edit AND task is not submitted for review */}
            {canEditTask && !(isTaskCreator && task.status === "submitted_for_review" && task.completionPercentage === 100) && (
              <Pressable
                onPress={() => {
                  if (onNavigateToCreateTask) {
                    if (isViewingSubTask && subTaskId) {
                      onNavigateToCreateTask(taskId, subTaskId, task.id, 'edit');
                    } else {
                      onNavigateToCreateTask(undefined, undefined, task.id, 'edit');
                    }
                  }
                }}
                className={cn(
                  "flex-1 rounded-xl py-3 px-4 flex-row items-center justify-center",
                  "bg-gray-600"
                )}
              >
                <Ionicons 
                  name="create-outline" 
                  size={18} 
                  color="white" 
                />
                <Text className="font-semibold text-base ml-2 text-white">
                  {t.taskDetail.editTaskDetails}
                </Text>
              </Pressable>
            )}

            {/* Accept/Decline Buttons - Show if task is new and user is assigned */}
            {/* Note: Declined tasks don't show accept/decline buttons - creator needs to reassign */}
            {isAssignedToMe && 
             task.status === "new" ? (
              <>
                <Pressable
                  onPress={() => {
                    if (isViewingSubTask && subTaskId) {
                      acceptSubTask(taskId, subTaskId, user.id);
                      Alert.alert(t.errors.success, t.taskDetail.subTaskAccepted);
                    } else {
                      handleAcceptTask();
                    }
                  }}
                  className={cn(
                    "flex-1 rounded-xl py-3 px-4 flex-row items-center justify-center",
                    "bg-green-600"
                  )}
                >
                  <Ionicons 
                    name="checkmark-circle-outline" 
                    size={18} 
                    color="white" 
                  />
                  <Text className="font-semibold text-base ml-2 text-white">
                    {t.taskDetail.accept}
                  </Text>
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
                  className={cn(
                    "flex-1 rounded-xl py-3 px-4 flex-row items-center justify-center",
                    "bg-red-600"
                  )}
                >
                  <Ionicons 
                    name="close-circle-outline" 
                    size={18} 
                    color="white" 
                  />
                  <Text className="font-semibold text-base ml-2 text-white">
                    {t.taskDetail.decline}
                  </Text>
                </Pressable>
              </>
            ) : (
              /* Approval/Reject Buttons - Show if task is submitted for review and user is the assigner */
              isTaskCreator && task.status === "submitted_for_review" && task.completionPercentage === 100 ? (
                <>
                  <Pressable
                    onPress={handleApproveTask}
                    className={cn(
                      "flex-1 rounded-xl py-3 px-4 flex-row items-center justify-center",
                      "bg-green-600"
                    )}
                  >
                    <Ionicons 
                      name="checkmark-circle-outline" 
                      size={18} 
                      color="white" 
                    />
                    <Text className="font-semibold text-base ml-2 text-white">
                      Approve
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={handleRejectTask}
                    className={cn(
                      "flex-1 rounded-xl py-3 px-4 flex-row items-center justify-center",
                      "bg-red-600"
                    )}
                  >
                    <Ionicons 
                      name="close-circle-outline" 
                      size={18} 
                      color="white" 
                    />
                    <Text className="font-semibold text-base ml-2 text-white">
                      Reject
                    </Text>
                  </Pressable>
                </>
              ) : (
                <>
                  {/* Reassign Button - Show if task is declined and user is the creator */}
                  {isTaskCreator && task.status === "declined" && (
                    <Pressable
                      onPress={() => {
                        navigation.navigate("ReassignTask", {
                          taskId: task.id,
                          onReassign: handleReassignTask,
                        });
                      }}
                      className={cn(
                        "flex-1 rounded-xl py-3 px-4 flex-row items-center justify-center",
                        "bg-blue-600"
                      )}
                    >
                      <Ionicons 
                        name="people-outline" 
                        size={18} 
                        color="white" 
                      />
                      <Text className="font-semibold text-base ml-2 text-white">
                        Reassign
                      </Text>
                    </Pressable>
                  )}

                  {/* Add Comment Button - Show if task was reassigned (status is new after being declined) and user is the creator */}
                  {isTaskCreator && wasReassigned && (
                    <Pressable
                      onPress={() => {
                        openCommentPanel();
                      }}
                      className={cn(
                        "flex-1 rounded-xl py-3 px-4 flex-row items-center justify-center",
                        "bg-indigo-600"
                      )}
                    >
                      <Ionicons 
                        name="chatbubble-outline" 
                        size={18} 
                        color="white" 
                      />
                      <Text className="font-semibold text-base ml-2 text-white">
                        Add Comment
                      </Text>
                    </Pressable>
                  )}

                  {/* Update Progress Button - Show if user can update progress */}
                  {canUpdateProgress && (
                    <Pressable
                      onPress={() => {
                        openUpdatePanel();
                      }}
                      className={cn(
                        "flex-1 rounded-xl py-3 px-4 flex-row items-center justify-center",
                        "bg-green-600"
                      )}
                    >
                      <Ionicons 
                        name="trending-up-outline" 
                        size={18} 
                        color="white" 
                      />
                      <Text className="font-semibold text-base ml-2 text-white">
                        {t.taskDetail.updateTask}
                      </Text>
                    </Pressable>
                  )}

                  {/* Upload Photos Button - Show if user can update progress */}
                  {canUpdateProgress && (
                    <Pressable
                      onPress={() => {
                        handleAddPhotos();
                      }}
                      className={cn(
                        "flex-1 rounded-xl py-3 px-4 flex-row items-center justify-center",
                        "bg-blue-600"
                      )}
                    >
                      <Ionicons 
                        name="camera-outline" 
                        size={18} 
                        color="white" 
                      />
                      <Text className="font-semibold text-base ml-2 text-white">
                        {t.taskDetail.photosUpdates}
                      </Text>
                    </Pressable>
                  )}

                  {/* Add Comment Button - Show if user is the assigner (task creator) and task is not declined and not reassigned */}
                  {isTaskCreator && task.status !== "declined" && !wasReassigned && (
                    <Pressable
                      onPress={() => {
                        openCommentPanel();
                      }}
                      className={cn(
                        "flex-1 rounded-xl py-3 px-4 flex-row items-center justify-center",
                        "bg-indigo-600"
                      )}
                    >
                      <Ionicons 
                        name="chatbubble-outline" 
                        size={18} 
                        color="white" 
                      />
                      <Text className="font-semibold text-base ml-2 text-white">
                        Add Comment
                      </Text>
                    </Pressable>
                  )}
                </>
              )
            )}
          </View>
        </SafeAreaView>
      </View>


      {/* Task Detail Slider Modal */}
      <Modal
        isVisible={showTaskDetailModal}
        onBackdropPress={() => {
          setShowTaskDetailModal(false);
          setSelectedTaskForDetail(null);
        }}
        animationIn="slideInUp"
        animationOut="slideOutDown"
        style={{ margin: 0 }}
        backdropOpacity={0.5}
      >
        <SafeAreaView edges={['bottom', 'left', 'right']} className="flex-1 bg-gray-50">
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
                  <View className={cn("px-3 py-1.5 rounded-full mr-3", getStatusColor(selectedTaskForDetail.status))}>
                    <Text className="text-base font-medium capitalize">
                      {selectedTaskForDetail.status?.replace(/_/g, " ") || "new"}
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
                      <Text className="text-base text-gray-500">{t.tasks.dueDate}</Text>
                      <Text className={cn("font-medium", new Date(selectedTaskForDetail.dueDate) < new Date() && selectedTaskForDetail.status !== "approved" && selectedTaskForDetail.completionPercentage < 100 ? "text-red-600" : "text-gray-900")}>
                        {dateFormatter.formatDateShort(selectedTaskForDetail.dueDate)} 
                        {new Date(selectedTaskForDetail.dueDate) < new Date() && selectedTaskForDetail.status !== "approved" && selectedTaskForDetail.completionPercentage < 100 && ` (${t.dashboard.overdue})`}
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
                  <View className="flex-row items-center flex-1">
                    <Text className="text-xl font-semibold text-gray-900">{t.taskDetail.updates}</Text>
                    <Pressable
                      onPress={() => setProgressLogSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                      className="ml-3 flex-row items-center px-2 py-1.5 bg-gray-100 rounded-lg"
                    >
                      <Ionicons 
                        name={progressLogSortOrder === 'asc' ? "arrow-up" : "arrow-down"} 
                        size={18} 
                        color="#374151" 
                      />
                      <Text className="text-sm text-gray-700 ml-1.5 font-medium">
                        {progressLogSortOrder === 'asc' ? 'Oldest First' : 'Newest First'}
                      </Text>
                    </Pressable>
                  </View>
                  <Text className="text-base text-gray-500">{selectedTaskForDetail.activities?.length || selectedTaskForDetail.updates.length} activities</Text>
                </View>
                
                {(selectedTaskForDetail.activities?.length || selectedTaskForDetail.updates.length) > 0 ? (
                  <View className="space-y-4">
                    {(() => {
                      // Get all activities
                      const allActivities = selectedTaskForDetail.activities || selectedTaskForDetail.updates.map((update: any) => ({
                        id: update.id,
                        activityType: update.status ? 'status_change' : 'progress_update',
                        timestamp: update.timestamp,
                        userId: update.userId,
                        description: update.description,
                        completionPercentage: update.completionPercentage,
                        status: update.status,
                        data: { photos: update.photos || [] },
                      }));
                      
                      // Sort by timestamp
                      const sortedActivities = [...allActivities].sort((a: any, b: any) => {
                        const timeA = new Date(a.timestamp || a.createdAt || 0).getTime();
                        const timeB = new Date(b.timestamp || b.createdAt || 0).getTime();
                        return progressLogSortOrder === 'asc' ? timeA - timeB : timeB - timeA;
                      });
                      
                      return sortedActivities.map((activity: any) => {
                        const activityType = activity.activityType || (activity.status ? 'status_change' : 'progress_update');
                        const activityUser = getUserById(activity.userId);
                        return (
                          <View key={activity.id} className="border-l-4 border-blue-200 pl-4">
                          <View className="flex-row items-center justify-between mb-2">
                            <View className="flex-row items-center">
                              <Ionicons 
                                name={activityType === 'status_change' ? 'sync' : activityType === 'progress_update' ? 'trending-up' : 'document-text'} 
                                size={16} 
                                color="#3b82f6" 
                                style={{ marginRight: 6 }}
                              />
                              <Text className="font-medium text-gray-900">
                                {activityUser?.name || "Unknown User"}
                              </Text>
                            </View>
                            <Text className="text-sm text-gray-500">
                              {new Date(activity.timestamp).toLocaleString()}
                            </Text>
                          </View>
                          <Text className="text-gray-700 mb-2">{activity.description}</Text>
                          {activity.completionPercentage !== undefined && activity.status && (
                            <View className="flex-row items-center space-x-4">
                              <Text className="text-base text-gray-500">
                                Progress: {activity.completionPercentage}%
                              </Text>
                              <View className={cn("px-2 py-1 rounded", getStatusColor(activity.status))}>
                                <Text className="text-sm capitalize">
                                  {activity.status.replace("_", " ")}
                                </Text>
                              </View>
                            </View>
                          )}
                          </View>
                        );
                      });
                    })()}
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


      {/* Task Detail Utility FAB */}
      <TaskDetailUtilityFAB
        onEdit={() => {
          if (onNavigateToCreateTask && task && canEditTask) {
            // Navigate to edit screen by passing the task ID as editTaskId
            onNavigateToCreateTask(undefined, undefined, task.id);
          }
        }}
        onCancel={isTaskCreator && !task.cancelledAt && !isViewingSubTask ? handleCancelTask : undefined}
        canCancel={isTaskCreator && !task.cancelledAt && !isViewingSubTask}
        onCreateSubTask={onNavigateToCreateTask ? () => {
          // Temporarily disabled - do nothing
          return;
        } : undefined}
        canEdit={canEditTask}
        canCreateSubTask={false} // Always disabled for all users - button will be greyed out
      />
    </SafeAreaView>
  );
}