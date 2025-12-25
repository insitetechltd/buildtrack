import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  Image,
  Linking,
  RefreshControl,
} from "react-native";
import Modal from "react-native-modal";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
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
import ReassignTaskModal from "../components/ReassignTaskModal";
import TaskCard from "../components/TaskCard";
import { useFileUpload, UploadResults } from "../utils/useFileUpload";
import { useUploadFailureStore } from "../state/uploadFailureStore";
import { useTranslation } from "../utils/useTranslation";
import { useDateFormatter } from "../utils/dateFormatter";

interface TaskDetailScreenProps {
  taskId: string;
  subTaskId?: string; // Optional: if provided, show only this subtask
  onNavigateBack: () => void;
  onNavigateToCreateTask?: (parentTaskId?: string, parentSubTaskId?: string, editTaskId?: string, actionType?: 'edit' | 'update' | 'photos' | 'comment' | 'reassign') => void;
  onNavigateToTaskDetail?: (taskId: string, subTaskId?: string) => void; // For navigating to sub-task details
}

export default function TaskDetailScreen({ taskId, subTaskId, onNavigateBack, onNavigateToCreateTask, onNavigateToTaskDetail }: TaskDetailScreenProps) {
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
  const fetchTaskEditHistory = useTaskStore(state => state.fetchTaskEditHistory);
  const { getUserById, getAllUsers } = useUserStore();
  const { getProjectUserAssignments } = useProjectStoreWithCompanyInit(user?.companyId || "");
  const { getCompanyBanner } = useCompanyStore();
  const { pickAndUploadImages, isUploading, uploadProgress, isCompressing, compressionProgress } = useFileUpload();
  const { getFailuresForTask, dismissFailure, incrementRetryCount } = useUploadFailureStore();

  const [refreshing, setRefreshing] = useState(false);
  const [showUpdatePanel, setShowUpdatePanel] = useState(false);
  const [showCommentPanel, setShowCommentPanel] = useState(false);
  const [showRejectPanel, setShowRejectPanel] = useState(false);
  const [updateForm, setUpdateForm] = useState({
    description: "",
    photos: [] as string[],
    completionPercentage: 0,
    status: "in_progress" as TaskStatus,
  });
  const [failedUploadsInSession, setFailedUploadsInSession] = useState<Array<{ fileName: string; error: string; originalFile: any }>>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [commentForm, setCommentForm] = useState({
    description: "",
    photos: [] as string[],
  });
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [rejectForm, setRejectForm] = useState({
    reason: "",
    photos: [] as string[],
  });
  const [isSubmittingReject, setIsSubmittingReject] = useState(false);
  const [showUserPicker, setShowUserPicker] = useState(false);
  const [showTaskDetailModal, setShowTaskDetailModal] = useState(false);
  const [selectedTaskForDetail, setSelectedTaskForDetail] = useState<Task | null>(null);
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [progressLogSortOrder, setProgressLogSortOrder] = useState<'asc' | 'desc'>('desc');
  const [expandedUpdateIds, setExpandedUpdateIds] = useState<Set<string>>(new Set());
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
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

  // Refresh task data when screen comes into focus (e.g., after returning from update modal)
  useFocusEffect(
    useCallback(() => {
      if (taskId) {
        console.log('🔄 TaskDetailScreen focused - refreshing task data...');
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
  const allTaskFiles = useMemo(() => {
    const files: string[] = [];
    
    // Add task attachments
    if (task.attachments && task.attachments.length > 0) {
      files.push(...task.attachments);
    }
    
    // Add photos from activities
    if (task.activities && task.activities.length > 0) {
      task.activities.forEach((activity: any) => {
        const photos = (activity.data as any)?.photos || [];
        if (photos && photos.length > 0) {
          files.push(...photos);
        }
      });
    }
    
    // Add photos from updates (legacy support)
    if (task.updates && task.updates.length > 0) {
      task.updates.forEach((update: any) => {
        if (update.photos && update.photos.length > 0) {
          files.push(...update.photos);
        }
      });
    }
    
    // Remove duplicates and return
    return Array.from(new Set(files));
  }, [task.attachments, task.activities, task.updates]);

  // Panel animation functions
  const openUpdatePanel = () => {
    setShowUpdatePanel(true);
  };

  const closeUpdatePanel = () => {
    setShowUpdatePanel(false);
    setFailedUploadsInSession([]);
  };

  const openCommentPanel = () => {
    setShowCommentPanel(true);
  };

  const closeCommentPanel = () => {
    setShowCommentPanel(false);
    setCommentForm({ description: "", photos: [] });
  };

  const openRejectPanel = () => {
    setShowRejectPanel(true);
  };

  const closeRejectPanel = () => {
    setShowRejectPanel(false);
    setRejectForm({ reason: "", photos: [] });
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
              await fetchTaskById(task.id);
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
                await fetchTaskById(task.id);
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
      // Update task assignment
      await updateTask(task.id, {
        assignedTo: selectedUserIds,
        status: "new" as TaskStatus,
        declinedReason: undefined,
      });

      // Create an update for the reassignment
      const reassignedUserNames = selectedUserIds.map(id => getUserById(id)?.name || "Unknown").join(", ");
      await addTaskUpdate(task.id, {
        userId: user.id,
        description: `Task reassigned to ${reassignedUserNames}.`,
        photos: [],
        completionPercentage: task.completionPercentage,
        status: "new" as TaskStatus,
      });

      // Refresh task data
      await fetchTaskById(task.id);

      Alert.alert(
        t.taskDetail.taskReassigned,
        `${t.taskDetail.taskReassigned} ${selectedUserIds.length} ${t.phrases.users}.`,
        [{ text: t.common.ok, onPress: () => setShowReassignModal(false) }]
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
              await fetchTaskById(task.id);
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

  const handleAddPhotosToReject = async () => {
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

              if (results.failed.length > 0) {
                Alert.alert("Upload Failed", `${results.failed.length} photo(s) failed to upload. Please try again.`);
              }
            } catch (error: any) {
              console.error('Error adding photos:', error);
              Alert.alert("Error", error.message || "Failed to add photos");
            }
          }
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

              if (results.failed.length > 0) {
                Alert.alert("Upload Failed", `${results.failed.length} photo(s) failed to upload. Please try again.`);
              }
            } catch (error: any) {
              console.error('Error adding photos:', error);
              Alert.alert("Error", error.message || "Failed to add photos");
            }
          }
        },
        { text: "Cancel", style: "cancel" }
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
        await rejectSubTaskCompletion(taskId, subTaskId, user.id, rejectForm.reason.trim(), rejectForm.photos);
      } else {
        await rejectTaskCompletion(task.id, user.id, rejectForm.reason.trim(), rejectForm.photos);
      }
      await fetchTaskById(task.id);
      
      // Reset form
      setRejectForm({
        reason: "",
        photos: [],
      });

      closeRejectPanel();
      Alert.alert(
        "Task Rejected", 
        "The task has been sent back to the assignee for corrections."
      );
    } catch (error: any) {
      console.error('Error rejecting task:', error);
      Alert.alert("Error", error.message || "Failed to reject task.");
    } finally {
      setIsSubmittingReject(false);
    }
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
                  description: prev.description || "",
                  photos: [...prev.photos, ...newPhotoUrls],
                  completionPercentage: task.completionPercentage || prev.completionPercentage,
                  status: task.status || prev.status,
                }));
                console.log(`✅ [Task Detail] ${results.successful.length} photo(s) uploaded and ready`);
                // Open update panel after photos are added
                openUpdatePanel();
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
                  description: prev.description || "",
                  photos: [...prev.photos, ...newPhotoUrls],
                  completionPercentage: task.completionPercentage || prev.completionPercentage,
                  status: task.status || prev.status,
                }));
                console.log(`✅ [Task Detail] ${results.successful.length} photo(s) uploaded and ready`);
                // Open update panel after photos are added
                openUpdatePanel();
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
      // Status is automatically calculated based on completion percentage
      // Use valid status values from the unified status system
      // Note: 100% completion does NOT automatically submit for review - user must submit manually
      const calculatedStatus: TaskStatus = 
        (task.status === "accepted" || task.status === "in_progress" || task.status === "submitted_for_review") ? 
          "in_progress" :
        task.status || "in_progress";

      const updatePayload = {
        description: updateForm.description,
        photos: updateForm.photos,
        completionPercentage: updateForm.completionPercentage,
        status: calculatedStatus,
        userId: user.id,
      };

      // Use appropriate method based on whether viewing subtask
      if (isViewingSubTask && subTaskId) {
        await addSubTaskUpdate(taskId, subTaskId, updatePayload);
      } else {
        await addTaskUpdate(task.id, updatePayload);
      }

      // Refresh task data to get the latest state
      await fetchTaskById(task.id);

      setUpdateForm({
        description: "",
        photos: [],
        completionPercentage: updateForm.completionPercentage,
        status: calculatedStatus,
      });

      // Clear failed uploads after successful submission
      setFailedUploadsInSession([]);

      closeUpdatePanel();
      
      // Show success message
      if (updateForm.completionPercentage === 100) {
        Alert.alert("Success", "🎉 Task marked as 100% complete! You can submit it for review when ready.");
      } else {
        Alert.alert(t.errors.success, t.taskDetail.progressUpdateAdded);
      }
    } catch (error) {
      Alert.alert(t.errors.error, t.taskDetail.failedToSubmitUpdate);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!commentForm.description.trim()) {
      Alert.alert("Error", "Please provide a comment");
      return;
    }

    if (!user || !task) return;

    setIsSubmittingComment(true);

    try {
      await addAssignerComment(task.id, {
        description: commentForm.description,
        photos: commentForm.photos,
        userId: user.id,
      });

      // Refresh task data to get the new comment
      await fetchTaskById(task.id);

      // Reset form
      setCommentForm({
        description: "",
        photos: [],
      });

      closeCommentPanel();
      Alert.alert("Success", "Comment added successfully");
    } catch (error: any) {
      console.error('Error adding comment:', error);
      Alert.alert("Error", error.message || "Failed to add comment");
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleAddPhotosToComment = async () => {
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
                setCommentForm(prev => ({
                  ...prev,
                  photos: [...prev.photos, ...newPhotoUrls],
                }));
              }

              if (results.failed.length > 0) {
                setFailedUploadsInSession(prev => [...prev, ...results.failed]);
              }
            } catch (error) {
              console.error('Failed to take photo:', error);
              Alert.alert("Error", "Failed to take photo");
            }
          }
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
                setCommentForm(prev => ({
                  ...prev,
                  photos: [...prev.photos, ...newPhotoUrls],
                }));
              }

              if (results.failed.length > 0) {
                setFailedUploadsInSession(prev => [...prev, ...results.failed]);
              }
            } catch (error) {
              console.error('Failed to pick photos:', error);
              Alert.alert("Error", "Failed to pick photos");
            }
          }
        },
        { text: "Cancel", style: "cancel" }
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
                await fetchTaskById(task.id);
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

      {/* Approval Banner - Shown when task is submitted for review and user is the creator */}
      {isTaskCreator && 
       task.status === "submitted_for_review" && 
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
      {task.status === "declined" && task.assignedBy === user.id && (
        <View className="bg-red-50 border-b-2 border-red-200 px-6 py-4">
          <View className="flex-row items-center">
            <View className="w-10 h-10 bg-red-100 rounded-full items-center justify-center mr-3">
              <Ionicons name="close-circle" size={24} color="#dc2626" />
            </View>
            <View className="flex-1">
              <Text className="text-xl font-bold text-red-900">
                {t.taskDetail.taskDeclined}
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
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={async () => {
              setRefreshing(true);
              try {
                if (subTaskId) {
                  await fetchTaskById(subTaskId);
                } else {
                  await fetchTaskById(taskId);
                }
              } catch (error) {
                console.error('Error refreshing task:', error);
              } finally {
                setRefreshing(false);
              }
            }} 
          />
        }
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
                        <Image
                          source={{ uri: file }}
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
          {/* Header with Progress Log title, sort toggle, and completion percentage */}
          <View className="flex-row items-center justify-between mb-2">
            <View className="flex-row items-center flex-1">
              <Text className="text-xl font-semibold text-gray-900">Progress Log</Text>
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
            <Text className={cn(
              "text-2xl font-bold",
              task.completionPercentage === 100 ? "text-green-600" : "text-gray-900"
            )}>
              {task.completionPercentage}%
            </Text>
          </View>


          {/* Divider */}
          {(task.activities?.length || task.updates.length) > 0 && <View className="border-t border-gray-200 mt-2 mb-3" />}
          
          {/* Activities List - Expandable (unified from task_activities) */}
          {(task.activities?.length || task.updates.length) > 0 ? (
            <View className="space-y-3">
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
                
                // Filter out first item (creation activity)
                const filteredActivities = allActivities.filter((_: any, index: number) => index !== 0);
                
                // Sort by timestamp
                const sortedActivities = [...filteredActivities].sort((a: any, b: any) => {
                  const timeA = new Date(a.timestamp || a.createdAt || 0).getTime();
                  const timeB = new Date(b.timestamp || b.createdAt || 0).getTime();
                  return progressLogSortOrder === 'asc' ? timeA - timeB : timeB - timeA;
                });
                
                return sortedActivities.map((activity: any) => {
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
                  <View key={activity.id} className="border-l-4 pl-4" style={{ borderLeftColor: getActivityColor(activityType) }}>
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
                            {/* Show progress % on right side */}
                            {(activity.completionPercentage !== undefined || activityType === 'assigner_comment') && (
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

                    {/* Expanded Content */}
                    {isExpanded && (() => {
                      const hasDescription = !!activity.description;
                      const hasStatusChange = activityType === 'status_change' && activity.data && 
                        !(activityType === 'status_change' && activity.data && 
                          ((activity.data as any).fromStatus === 'new' && 
                           ((activity.data as any).toStatus === 'accepted' || (activity.data as any).toStatus === 'in_progress')));
                      const hasMetadataEdit = activityType === 'metadata_edit' && activity.data;
                      const hasPhotos = ((activity.data as any)?.photos || update.photos || []).length > 0;
                      
                      // Determine which sections have content and their order
                      const sections: JSX.Element[] = [];
                      
                      // Add activity type as first line
                      sections.push(
                        <Text key="activity-type" className="text-base font-medium text-gray-900 capitalize mb-2">
                          {activityType?.replace(/_/g, " ") || activityType}
                        </Text>
                      );
                      
                      if (activity.description) {
                        sections.push(
                          <Text key="description" className="text-gray-700">{activity.description}</Text>
                        );
                      }
                      
                      if (hasStatusChange && activityType === 'status_change' && activity.data) {
                        sections.push(
                          <View key="status" className={sections.length > 0 ? "mt-3" : ""}>
                            <Text className="text-sm text-gray-600">
                              Status: {(activity.data as any).fromStatus || 'N/A'} → {(activity.data as any).toStatus || 'N/A'}
                            </Text>
                            {(activity.data as any).reason && (
                              <Text className="text-sm text-gray-500 mt-1">
                                Reason: {(activity.data as any).reason}
                              </Text>
                            )}
                          </View>
                        );
                      }
                      
                      if (hasMetadataEdit && activityType === 'metadata_edit' && activity.data) {
                        sections.push(
                          <View key="metadata" className={sections.length > 0 ? "mt-3" : ""}>
                            <Text className="text-sm font-medium text-gray-700 mb-2">Changes:</Text>
                            {Object.entries((activity.data as any).changes || {}).map(([field, change]: [string, any]) => (
                              <View key={field} className="mb-2">
                                <Text className="text-sm text-gray-600 capitalize">{field}:</Text>
                                <Text className="text-xs text-gray-500">Old: {String(change.old || 'N/A')}</Text>
                                <Text className="text-xs text-gray-500">New: {String(change.new || 'N/A')}</Text>
                              </View>
                            ))}
                          </View>
                        );
                      }
                      
                      if (hasPhotos) {
                        sections.push(
                          <View key="photos" className={sections.length > 0 ? "mt-3" : ""}>
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
                          </View>
                        );
                      }
                      
                      return (
                        <View className="mt-3">
                          {sections}
                        </View>
                      );
                    })()}
                  </View>
                );
              });
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
                        setShowReassignModal(true);
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

      {/* Update Panel - React Native Modal */}
      <Modal
        isVisible={showUpdatePanel}
        onBackdropPress={closeUpdatePanel}
        onSwipeComplete={closeUpdatePanel}
        swipeDirection="right"
        animationIn="slideInRight"
        animationOut="slideOutRight"
        style={{ margin: 0 }}
        backdropOpacity={0.5}
        swipeThreshold={100}
        propagateSwipe={true}
      >
        <SafeAreaView edges={['bottom', 'left', 'right']} className="flex-1 bg-gray-50">
          <View className="flex-row items-center bg-white border-b border-gray-200 px-6 py-4 pt-3">
            <Pressable 
              onPress={closeUpdatePanel}
              className="w-10 h-10 items-center justify-center mr-3"
            >
              <Ionicons name="arrow-back" size={24} color="#374151" />
            </Pressable>
            <Text className="text-xl font-semibold text-gray-900 flex-1">
              {t.taskDetail.progressUpdate}
            </Text>
          </View>

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
                <Text className="text-gray-600 font-medium mt-3">{t.taskDetail.tapToAddFiles}</Text>
                <Text className="text-gray-400 text-base mt-1">
                  {updateForm.photos.length === 0 ? t.taskDetail.noFilesAdded : `${updateForm.photos.length} file(s) added`}
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
          <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-4">
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
      </Modal>

      {/* Comment Panel - React Native Modal */}
      <Modal
        isVisible={showCommentPanel}
        onBackdropPress={closeCommentPanel}
        onSwipeComplete={closeCommentPanel}
        swipeDirection="right"
        animationIn="slideInRight"
        animationOut="slideOutRight"
        style={{ margin: 0 }}
        backdropOpacity={0.5}
        swipeThreshold={100}
        propagateSwipe={true}
      >
        <SafeAreaView edges={['bottom', 'left', 'right']} className="flex-1 bg-gray-50">
          <View className="flex-row items-center bg-white border-b border-gray-200 px-6 py-4 pt-3">
            <Pressable 
              onPress={closeCommentPanel}
              className="w-10 h-10 items-center justify-center mr-3"
            >
              <Ionicons name="arrow-back" size={24} color="#374151" />
            </Pressable>
            <Text className="text-xl font-semibold text-gray-900 flex-1">
              Add Comment
            </Text>
          </View>

          <ScrollView className="flex-1 px-6 py-4" contentContainerStyle={{ paddingBottom: 100 }}>
            {/* Photos Section */}
            <View className="mb-6">
              <Text className="text-xl font-semibold text-gray-900 mb-3">
                Photos (Optional)
              </Text>
              
              {commentForm.photos.length > 0 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3">
                  <View className="flex-row">
                    {commentForm.photos.map((photo, index) => (
                      <View key={index} className="mr-3 relative">
                        <Image
                          source={{ uri: photo }}
                          className="w-24 h-24 rounded-lg"
                          resizeMode="cover"
                        />
                        <Pressable
                          onPress={() => {
                            setCommentForm(prev => ({
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
                onPress={handleAddPhotosToComment}
                className="flex-row items-center justify-center border-2 border-dashed border-gray-300 rounded-lg py-4"
              >
                <Ionicons name="camera-outline" size={24} color="#6b7280" />
                <Text className="text-gray-600 ml-2 font-medium">
                  Add Photos
                </Text>
              </Pressable>
            </View>

            {/* Comment Text */}
            <View className="mb-6">
              <Text className="text-xl font-semibold text-gray-900 mb-3">
                Comment
              </Text>
              <TextInput
                className="bg-white border border-gray-300 rounded-lg p-4 text-base min-h-[120]"
                placeholder="Add your comment here..."
                value={commentForm.description}
                onChangeText={(text) => setCommentForm(prev => ({ ...prev, description: text }))}
                multiline
                textAlignVertical="top"
              />
            </View>
          </ScrollView>

          {/* Fixed Bottom Bar */}
          <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-4">
            <SafeAreaView edges={['bottom']}>
              <Pressable
                onPress={handleSubmitComment}
                disabled={isSubmittingComment || !commentForm.description.trim()}
                className={cn(
                  "w-full rounded-xl py-3 px-4 flex-row items-center justify-center",
                  (isSubmittingComment || !commentForm.description.trim()) ? "bg-gray-300" : "bg-indigo-600"
                )}
              >
                <Ionicons 
                  name="send-outline" 
                  size={18} 
                  color="white" 
                />
                <Text className="text-white font-semibold text-base ml-2">
                  {isSubmittingComment ? t.common.loading : "Post"}
                </Text>
              </Pressable>
            </SafeAreaView>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Reject Panel - React Native Modal */}
      <Modal
        isVisible={showRejectPanel}
        onBackdropPress={closeRejectPanel}
        onSwipeComplete={closeRejectPanel}
        swipeDirection="right"
        animationIn="slideInRight"
        animationOut="slideOutRight"
        style={{ margin: 0 }}
        backdropOpacity={0.5}
      >
        <SafeAreaView edges={['bottom', 'left', 'right', 'top']} className="flex-1 bg-gray-50">
          <View className="flex-row items-center bg-white border-b border-gray-200 px-6 py-4">
            <Pressable 
              onPress={closeRejectPanel}
              className="w-10 h-10 items-center justify-center mr-3"
            >
              <Ionicons name="arrow-back" size={24} color="#374151" />
            </Pressable>
            <Text className="text-xl font-semibold text-gray-900 flex-1">
              Reject Task
            </Text>
          </View>

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
                onPress={handleAddPhotosToReject}
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
          <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-4">
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
      </Modal>

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

      {/* Reassign Modal */}
      <ReassignTaskModal
        visible={showReassignModal}
        taskId={taskId}
        onClose={() => setShowReassignModal(false)}
        onReassign={handleReassignTask}
      />


      {/* Image Preview Modal */}
      <Modal
        isVisible={showImagePreview}
        onBackdropPress={() => setShowImagePreview(false)}
        animationIn="fadeIn"
        animationOut="fadeOut"
        style={{ margin: 0 }}
        backdropOpacity={1}
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