import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Image,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as ImagePicker from "expo-image-picker";
import * as Clipboard from "expo-clipboard";
import { useFocusEffect } from "@react-navigation/native";
import { useAuthStore } from "../state/authStore";
import { isAdmin } from "../types/buildtrack";
import { useTaskStore } from "../state/taskStore.supabase";
import { useUserStoreWithInit } from "../state/userStore.supabase";
import { useProjectStoreWithCompanyInit } from "../state/projectStore.supabase";
import { useProjectFilterStore } from "../state/projectFilterStore";
import { useCompanyStore } from "../state/companyStore";
import { useUserPreferencesStore } from "../state/userPreferencesStore";
import { Priority, TaskCategory, BillingStatus } from "../types/buildtrack";
import { cn } from "../utils/cn";
import ModalHandle from "../components/ModalHandle";
import { notifyDataMutation } from "../utils/DataRefreshManager";
import StandardHeader from "../components/StandardHeader";
import LogoutFAB from "../components/LogoutFAB"; // Keep for screens without create task
import { useFileUpload, UploadResults } from "../utils/useFileUpload";
import { useTranslation } from "../utils/useTranslation";

interface CreateTaskScreenProps {
  onNavigateBack: () => void;
  parentTaskId?: string;
  parentSubTaskId?: string;
  editTaskId?: string; // For editing an existing task
}

// InputField component defined outside to prevent re-creation
const InputField = ({ 
  label, 
  required = true, 
  error, 
  children 
}: { 
  label: string; 
  required?: boolean; 
  error?: string; 
  children: React.ReactNode;
}) => (
  <View className="mb-4">
    <Text className="text-base font-semibold text-gray-700 mb-2">
      {label} {required && <Text className="text-red-500">*</Text>}
    </Text>
    {children}
    {error && (
      <Text className="text-red-500 text-sm mt-1">{error}</Text>
    )}
  </View>
);

export default function CreateTaskScreen({ onNavigateBack, parentTaskId, parentSubTaskId, editTaskId }: CreateTaskScreenProps) {
  const t = useTranslation();
  const { user } = useAuthStore();
  const { createTask, createSubTask, createNestedSubTask, updateTask, tasks } = useTaskStore();
  const { getUsersByRole, getUserById } = useUserStoreWithInit();
  const projectStore = useProjectStoreWithCompanyInit(user?.companyId || "");
  const { getProjectsByUser, getProjectUserAssignments, fetchProjectUserAssignments } = projectStore;
  const { selectedProjectId } = useProjectFilterStore();
  const { pickAndUploadImages, isUploading, isCompressing } = useFileUpload();
  const { getCompanyBanner } = useCompanyStore();
  const { isFavoriteUser, toggleFavoriteUser } = useUserPreferencesStore();

  // Get parent task information if creating a sub-task
  const parentTask = parentTaskId ? tasks.find(t => t.id === parentTaskId) : null;
  const parentSubTask = parentTask && parentSubTaskId 
    ? parentTask.subTasks?.find(st => st.id === parentSubTaskId) 
    : null;

  // Get task for editing
  const editTask = editTaskId ? tasks.find(t => t.id === editTaskId) : null;

  // Ensure only the task creator can edit
  useEffect(() => {
    if (!editTaskId || !editTask || !user) return;

    if (editTask.assignedBy !== user.id) {
      Alert.alert(
        "Permission Denied",
        "Only the task creator can edit this task.",
        [
          {
            text: "OK",
            onPress: () => onNavigateBack(),
          },
        ]
      );
    }
  }, [editTaskId, editTask?.assignedBy, user?.id, editTask, onNavigateBack]);

  // Initial form data
  const getInitialFormData = () => {
    // If editing, pre-fill with existing task data
    if (editTask) {
      return {
        title: editTask.title,
        description: editTask.description,
        taskReference: editTask.taskReference || "",
        billingStatus: editTask.billingStatus || "non_billable",
        priority: editTask.priority,
        category: editTask.category,
        dueDate: new Date(editTask.dueDate),
        assignedTo: editTask.assignedTo || [],
        attachments: editTask.attachments || [],
        projectId: editTask.projectId,
      };
    }
    
    // Default form data for new tasks
    return {
      title: "",
      description: "",
      taskReference: "",
        billingStatus: "non_billable" as BillingStatus,
      priority: "medium" as Priority,
      category: "general" as TaskCategory,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Default to 1 week from now
      assignedTo: [] as string[],
      attachments: [] as string[],
      projectId: "",
    };
  };

  const [formData, setFormData] = useState(getInitialFormData());

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>(editTask?.assignedTo || []);
  const [showUserPicker, setShowUserPicker] = useState(false);
  const [showPriorityPicker, setShowPriorityPicker] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [showCompanyPicker, setShowCompanyPicker] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showBillingStatusPicker, setShowBillingStatusPicker] = useState(false);
  const [showProjectPicker, setShowProjectPicker] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  // All hooks must be called before any early returns
  const userProjects = getProjectsByUser(user?.id || "");
  const workers = getUsersByRole("worker");
  const managers = getUsersByRole("manager");
  const { companies } = useCompanyStore();
  
  // Debug logging for user roles
  console.log('=== USER ROLES DEBUG ===');
  console.log('- Workers:', workers.map(u => ({ id: u.id, name: u.name, companyId: u.companyId })));
  console.log('- Managers:', managers.map(u => ({ id: u.id, name: u.name, companyId: u.companyId })));
  console.log('- Current User:', user ? { id: user.id, name: user.name, companyId: user.companyId } : 'No user');
  console.log('========================');
  
  // Filter users based on selected project
  // Show ALL users who are assigned to the selected project (regardless of company)
  const allAssignableUsers = React.useMemo(() => {
    if (!formData.projectId) {
      // If no project selected, show all workers and managers
      return [...workers, ...managers];
    }
    
    // Get users assigned to the selected project
    const projectAssignments = getProjectUserAssignments(formData.projectId);
    const assignedUserIds = new Set(projectAssignments.map(a => a.userId));
    
    // Debug logging
    console.log('=== CREATE TASK USER ASSIGNMENT DEBUG ===');
    console.log('- Selected Project ID:', formData.projectId);
    console.log('- Project Assignments:', projectAssignments);
    console.log('- Assigned User IDs:', Array.from(assignedUserIds));
    console.log('- All Workers:', workers.map(u => ({ id: u.id, name: u.name })));
    console.log('- All Managers:', managers.map(u => ({ id: u.id, name: u.name })));
    
    // Get ALL users from the project (regardless of company)
    // This includes workers and managers assigned to this project
    const eligibleUsers = [...workers, ...managers].filter(u => assignedUserIds.has(u.id));
    
    console.log('- Eligible Users:', eligibleUsers.map(u => ({ id: u.id, name: u.name })));
    console.log('=========================================');
    
    return eligibleUsers;
  }, [formData.projectId, workers, managers, getProjectUserAssignments]);

  // Filter users by search query and sort favorites to top
  const filteredAssignableUsers = React.useMemo(() => {
    let filtered = allAssignableUsers;
    
    // Apply search filter
    if (userSearchQuery.trim()) {
      const query = userSearchQuery.toLowerCase();
      filtered = allAssignableUsers.filter(user => 
        user.name.toLowerCase().includes(query) ||
        (user.email && user.email.toLowerCase().includes(query)) ||
        user.position.toLowerCase().includes(query) ||
        user.role.toLowerCase().includes(query)
      );
    }
    
    // Sort favorites to top
    if (user?.id) {
      return [...filtered].sort((a, b) => {
        const aIsFavorite = isFavoriteUser(user.id, a.id);
        const bIsFavorite = isFavoriteUser(user.id, b.id);
        
        if (aIsFavorite && !bIsFavorite) return -1;
        if (!aIsFavorite && bIsFavorite) return 1;
        return 0; // Keep original order for non-favorites
      });
    }
    
    return filtered;
  }, [allAssignableUsers, userSearchQuery, user?.id, isFavoriteUser]);

  // Reset form every time screen comes into focus (but not for subtasks)
  useFocusEffect(
    useCallback(() => {
      // Only reset if NOT creating a subtask
      if (!parentTaskId) {
        console.log('🔄 Resetting CreateTaskScreen form on focus');
        setFormData(getInitialFormData());
        setSelectedUsers([]);
        setErrors({});
        setUserSearchQuery("");
        setShowUserPicker(false);
        setShowPriorityPicker(false);
        setShowCategoryPicker(false);
        setShowProjectPicker(false);
        setShowDatePicker(false);
      }
    }, [parentTaskId])
  );

  // Inherit parent task title and description when creating sub-task (only once on mount)
  const [hasInitializedFromParent, setHasInitializedFromParent] = React.useState(false);
  
  React.useEffect(() => {
    if (parentTaskId && parentTask && !hasInitializedFromParent) {
      console.log('📋 Copying parent task data to subtask form');
      setFormData(prev => ({
        ...prev,
        title: parentTask.title,
        description: parentTask.description,
        projectId: parentTask.projectId || prev.projectId
      }));
      setHasInitializedFromParent(true);
    }
  }, [parentTaskId, parentTask, hasInitializedFromParent]);

  // Set default project if user has access to projects
  // Priority: 1) Current selected project, 2) First project in list
  React.useEffect(() => {
    if (userProjects.length > 0 && !formData.projectId) {
      const defaultProjectId = selectedProjectId && userProjects.some(p => p.id === selectedProjectId)
        ? selectedProjectId
        : userProjects[0].id;
      setFormData(prev => ({ ...prev, projectId: defaultProjectId }));
    }
  }, [userProjects, formData.projectId, selectedProjectId]);

  // Fetch project user assignments when project changes (pre-fetch for faster modal loading)
  React.useEffect(() => {
    if (formData.projectId) {
      console.log('🔄 Pre-fetching project user assignments for project:', formData.projectId);
      // Pre-fetch project assignments immediately when project is selected
      fetchProjectUserAssignments(formData.projectId).catch(err => {
        console.error('Error fetching project user assignments:', err);
      });
    }
  }, [formData.projectId, fetchProjectUserAssignments]);
  
  // Pre-fetch users when "Assign To" button is pressed (before modal opens)
  const handleOpenUserPicker = useCallback(async () => {
    if (formData.projectId) {
      // Check if we already have cached data
      const existingAssignments = getProjectUserAssignments(formData.projectId);
      
      if (existingAssignments.length === 0) {
        // No cached data, fetch before opening
        setIsLoadingUsers(true);
        try {
          console.log('⚡ Pre-loading users for project:', formData.projectId);
          await fetchProjectUserAssignments(formData.projectId);
          console.log('✅ Users loaded, opening modal');
        } catch (error) {
          console.error('Error pre-loading users:', error);
        } finally {
          setIsLoadingUsers(false);
          setShowUserPicker(true);
        }
      } else {
        // Data already cached, open immediately and refresh in background
        console.log('✅ Using cached users, opening modal immediately');
        setShowUserPicker(true);
        // Refresh in background for latest data
        fetchProjectUserAssignments(formData.projectId).catch(err => {
          console.error('Background refresh error:', err);
        });
      }
    } else {
      // No project selected, open immediately
      setShowUserPicker(true);
    }
  }, [formData.projectId, fetchProjectUserAssignments, getProjectUserAssignments]);

  // Clear selected users when project changes (since eligible users change)
  React.useEffect(() => {
    if (formData.projectId) {
      // Filter out users who are no longer eligible
      const eligibleUserIds = new Set(allAssignableUsers.map(u => u.id));
      const stillEligible = selectedUsers.filter(id => eligibleUserIds.has(id));
      
      if (stillEligible.length !== selectedUsers.length) {
        setSelectedUsers(stillEligible);
        setFormData(prev => ({ ...prev, assignedTo: stillEligible }));
      }
    }
  }, [formData.projectId, allAssignableUsers]);

  const handleTitleChange = useCallback((text: string) => {
    setFormData(prev => ({ ...prev, title: text }));
  }, []);

  const handleDescriptionChange = useCallback((text: string) => {
    setFormData(prev => ({ ...prev, description: text }));
  }, []);

  const handleTaskReferenceChange = useCallback((text: string) => {
    setFormData(prev => ({ ...prev, taskReference: text }));
  }, []);

  const handleBillingStatusChange = useCallback((status: BillingStatus) => {
    setFormData(prev => ({ ...prev, billingStatus: status }));
    setShowBillingStatusPicker(false);
  }, []);

  const handlePriorityChange = useCallback((priority: Priority) => {
    setFormData(prev => ({ ...prev, priority }));
  }, []);

  const handleCategoryChange = useCallback((category: TaskCategory) => {
    setFormData(prev => ({ ...prev, category }));
  }, []);

  const handleDateChange = useCallback((date: Date) => {
    setFormData(prev => ({ ...prev, dueDate: date }));
  }, []);

  const toggleUserSelection = useCallback((userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  }, []);

  const handleAddPhotos = async () => {
    if (!user) return;

    Alert.alert(
      t.createTask.addPhotos,
      t.createTask.photosUploadMessage,
      [
        {
          text: t.createTask.takePhoto,
          onPress: async () => {
            try {
              console.log('📸 [Create Task] Taking photo from camera...');
              
              // Use a temporary task ID for upload path
              const tempTaskId = `temp-${Date.now()}`;
              
              const results: UploadResults = await pickAndUploadImages(
                {
                  entityType: 'task',
                  entityId: tempTaskId,
                  companyId: user.companyId,
                  userId: user.id,
                },
                'camera'
              );

              if (results.successful.length > 0) {
                const newPhotoUrls = results.successful.map(file => file.public_url);
                console.log('📋 [Create Task Camera] New photo URLs:', newPhotoUrls);
                console.log('📋 [Create Task Camera] Current attachments before update:', formData.attachments);
                
                setFormData(prev => {
                  const updated = {
                    ...prev,
                    attachments: [...prev.attachments, ...newPhotoUrls],
                  };
                  console.log('📋 [Create Task Camera] Updated attachments:', updated.attachments);
                  return updated;
                });
                
                console.log(`✅ [Create Task] ${results.successful.length} photo(s) uploaded to Supabase`);
              }

              if (results.failed.length > 0) {
                Alert.alert(
                  t.createTask.uploadWarning,
                  `${results.failed.length} ${t.createTask.photosFailedUpload}`
                );
              }
            } catch (error) {
              console.error('❌ [Create Task] Failed to take photo:', error);
              Alert.alert(t.createTask.error, t.createTask.failedToTakePhoto);
            }
          },
        },
        {
          text: t.createTask.chooseFromLibrary,
          onPress: async () => {
            try {
              console.log('📚 [Create Task] Selecting photos from library...');
              
              // Use a temporary task ID for upload path
              const tempTaskId = `temp-${Date.now()}`;
              
              const results: UploadResults = await pickAndUploadImages(
                {
                  entityType: 'task',
                  entityId: tempTaskId,
                  companyId: user.companyId,
                  userId: user.id,
                },
                'library'
              );

              if (results.successful.length > 0) {
                const newPhotoUrls = results.successful.map(file => file.public_url);
                console.log('📋 [Create Task Library] New photo URLs:', newPhotoUrls);
                console.log('📋 [Create Task Library] Current attachments before update:', formData.attachments);
                
                setFormData(prev => {
                  const updated = {
                    ...prev,
                    attachments: [...prev.attachments, ...newPhotoUrls],
                  };
                  console.log('📋 [Create Task Library] Updated attachments:', updated.attachments);
                  return updated;
                });
                
                console.log(`✅ [Create Task] ${results.successful.length} photo(s) uploaded to Supabase`);
              }

              if (results.failed.length > 0) {
                Alert.alert(
                  'Upload Warning',
                  `${results.failed.length} photo(s) failed to upload. Please try again.`
                );
              }
              } catch (error) {
                console.error('❌ [Create Task] Failed to pick images:', error);
                Alert.alert(t.createTask.error, t.createTask.failedToPickImages);
              }
            },
          },
          {
            text: t.createTask.pasteFromClipboard,
          onPress: async () => {
            try {
              const hasImage = await Clipboard.hasImageAsync();
              
              if (!hasImage) {
                Alert.alert(t.createTask.error, t.createTask.noImageInClipboard);
                return;
              }

              const imageUri = await Clipboard.getImageAsync({ format: 'png' });
              
              if (imageUri && imageUri.data) {
                const uri = `data:image/png;base64,${imageUri.data}`;
                setFormData(prev => ({
                  ...prev,
                  attachments: [...prev.attachments, uri],
                }));
                Alert.alert(t.errors.success, t.createTask.imagePasted);
              } else {
                Alert.alert(t.createTask.error, t.createTask.pasteImageError);
              }
            } catch (error) {
              console.error("Clipboard paste error:", error);
              Alert.alert(t.createTask.error, t.createTask.failedToPaste);
            }
          },
        },
        {
          text: t.common.cancel,
          style: "cancel",
        },
      ]
    );
  };

  // Early returns AFTER all hooks
  if (!user) return null;

  // Admin users should not be able to create tasks
  if (isAdmin(user)) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <StatusBar style="dark" />
        
        {/* Header */}
        <View className="flex-row items-center justify-between px-6 py-4 bg-white border-b border-gray-200">
          <Pressable onPress={onNavigateBack} className="mr-4">
            <Ionicons name="arrow-back" size={24} color="#374151" />
          </Pressable>
          <Text className="flex-1 text-2xl font-semibold text-gray-900">
            Create Task
          </Text>
        </View>

        <View className="flex-1 items-center justify-center px-6">
          <View className="bg-amber-50 border border-amber-200 rounded-xl p-6 w-full max-w-sm">
            <View className="items-center mb-4">
              <View className="w-16 h-16 bg-amber-100 rounded-full items-center justify-center mb-3">
                <Ionicons name="shield-outline" size={32} color="#f59e0b" />
              </View>
              <Text className="text-xl font-semibold text-amber-900 text-center mb-2">
                Access Restricted
              </Text>
              <Text className="text-base text-amber-800 text-center leading-5">
                Administrator accounts cannot create or be assigned tasks. This function is reserved for managers and workers.
              </Text>
            </View>
            <Pressable 
              onPress={onNavigateBack}
              className="bg-amber-600 rounded-lg py-3 px-4"
            >
              <Text className="text-white font-semibold text-center">
                Go Back
              </Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = t.validation.titleRequired;
    }

    if (!formData.description.trim()) {
      newErrors.description = t.validation.descriptionRequired;
    }

    if (!formData.projectId) {
      newErrors.projectId = t.validation.projectRequired;
    }

    if (selectedUsers.length === 0) {
      newErrors.assignedTo = t.validation.assigneeRequired;
    }

    if (formData.dueDate <= new Date()) {
      newErrors.dueDate = t.validation.dueDateFuture;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    // Clear any existing errors before validation
    setErrors({});
    
    if (!validateForm()) return;

    if (editTaskId) {
      if (!editTask) {
        Alert.alert("Task Not Found", "Unable to edit this task because it could not be loaded.");
        return;
      }
      if (!user || editTask.assignedBy !== user.id) {
        Alert.alert("Permission Denied", "Only the task creator can edit this task.");
        return;
      }
    }

    setIsSubmitting(true);

    try {
      let taskId: string;
      let successMessage: string;

      if (editTaskId) {
        // Editing existing task
        await updateTask(editTaskId, {
          title: formData.title,
          description: formData.description,
          taskReference: formData.taskReference || undefined,
          billingStatus: formData.billingStatus,
          priority: formData.priority,
          category: formData.category,
          dueDate: formData.dueDate.toISOString(),
          assignedTo: selectedUsers,
          attachments: formData.attachments,
          projectId: formData.projectId,
        });
        successMessage = t.createTask.taskUpdatedSuccess;
        taskId = editTaskId;
      } else if (parentTaskId) {
        // Creating a sub-task
        const subTaskPayload = {
          title: formData.title,
          description: formData.description,
          taskReference: formData.taskReference || undefined,
          billingStatus: formData.billingStatus,
          priority: formData.priority,
          category: formData.category,
          dueDate: formData.dueDate.toISOString(),
          assignedTo: selectedUsers,
          assignedBy: user.id,
          attachments: formData.attachments,
          projectId: formData.projectId,
          updates: [],
        };

        if (parentSubTaskId) {
          // Creating a nested sub-task
          taskId = await createNestedSubTask(parentTaskId, parentSubTaskId, subTaskPayload);
          successMessage = t.createTask.nestedSubTaskCreatedSuccess;
        } else {
          // Creating a direct sub-task
          taskId = await createSubTask(parentTaskId, subTaskPayload);
          successMessage = t.createTask.subTaskCreatedSuccess;
        }
      } else {
        // Creating a regular task
        console.log('📋 [Create Task] About to create task with attachments:', formData.attachments);
        console.log('📋 [Create Task] Attachments count:', formData.attachments.length);
        
        taskId = await createTask({
          title: formData.title,
          description: formData.description,
          taskReference: formData.taskReference || undefined,
          billingStatus: formData.billingStatus,
          priority: formData.priority,
          category: formData.category,
          dueDate: formData.dueDate.toISOString(),
          assignedTo: selectedUsers,
          assignedBy: user.id,
          attachments: formData.attachments,
          projectId: formData.projectId,
        });
        successMessage = t.createTask.taskCreatedSuccess;
      }

      console.log(`=== TASK ${editTaskId ? 'UPDATE' : 'CREATION'} DEBUG ===`);
      console.log('- Task ID:', taskId);
      console.log('- Assigned to users:', selectedUsers);
      console.log('- Project ID:', formData.projectId);
      console.log('- Attachments:', formData.attachments);
      console.log('- Assigned by:', user.id);
      console.log('- Parent Task ID:', parentTaskId);
      console.log('- Parent Sub-Task ID:', parentSubTaskId);
      console.log('===========================');

      // Notify all users about the task change
      notifyDataMutation('task');

      Alert.alert(
        editTaskId ? t.createTask.taskUpdated : (parentTaskId ? t.createTask.subTaskCreated : t.createTask.taskCreated),
        successMessage,
        [
          {
            text: t.common.ok,
            onPress: () => onNavigateBack(),
          },
        ]
      );
    } catch (error: any) {
      console.error('❌ [CreateTaskScreen] Error:', error);
      console.error('❌ [CreateTaskScreen] Error details:', JSON.stringify(error, null, 2));
      
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      Alert.alert(
        t.createTask.error,
        `${editTaskId ? t.createTask.failedToUpdateTask : t.createTask.failedToCreateTask}\n\nError: ${errorMessage}`,
        [{ text: t.common.ok }]
      );
    } finally {
      setIsSubmitting(false);
    }
  };


  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <StatusBar style="dark" />
      
      {/* Standard Header */}
      <StandardHeader 
        title={
          editTaskId
            ? t.createTask.editTask
            : parentTaskId 
              ? parentSubTaskId && parentSubTask
                ? t.createTask.nestedSubTask
                : parentTask
                  ? t.createTask.createSubTask
                  : t.createTask.createSubTask
              : t.createTask.createNewTask
        }
        showBackButton={true}
        onBackPress={onNavigateBack}
      />

      {/* Parent Task Info Banner */}
      {parentTask && (
        <View className="bg-blue-50 border-b border-blue-100 px-6 py-3">
          <View className="flex-row items-center">
            <Ionicons name="link-outline" size={18} color="#3b82f6" />
            <Text className="text-base text-gray-600 ml-2">
              {parentSubTask ? t.createTask.nestedUnder : t.createTask.subTaskOf}
            </Text>
            <Text className="text-base font-semibold text-gray-900 flex-1" numberOfLines={1}>
              {parentSubTask?.title || parentTask.title}
            </Text>
          </View>
        </View>
      )}

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView 
          className="flex-1 px-6 py-4" 
          keyboardShouldPersistTaps="handled"
        >
          {/* Title */}
          <InputField label={t.tasks.title} error={errors.title}>
              <TextInput
                className={cn(
                  "border rounded-lg px-3 py-3 text-lg text-gray-900 bg-white",
                  errors.title ? "border-red-300" : "border-gray-300"
                )}
                placeholder={t.createTask.titlePlaceholder}
                value={formData.title}
                onChangeText={handleTitleChange}
                maxLength={100}
                autoCorrect={false}
                returnKeyType="next"
              />
          </InputField>

          {/* Description */}
          <InputField label={t.tasks.description} error={errors.description}>
              <TextInput
                className={cn(
                  "border rounded-lg px-3 py-3 text-lg text-gray-900 bg-white",
                  errors.description ? "border-red-300" : "border-gray-300"
                )}
                placeholder="Describe the task in detail..."
                value={formData.description}
                onChangeText={handleDescriptionChange}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                maxLength={500}
                autoCorrect={false}
                returnKeyType="done"
              />
          </InputField>

          {/* Task Reference # */}
          <InputField label="Task Reference # (Optional)">
              <TextInput
                className="border rounded-lg px-3 py-3 text-lg text-gray-900 bg-white border-gray-300"
                placeholder="Enter task reference number"
                value={formData.taskReference}
                onChangeText={handleTaskReferenceChange}
                maxLength={50}
                autoCorrect={false}
                returnKeyType="next"
              />
          </InputField>

          {/* Billing Status */}
          <InputField label="Billing Status">
            <Pressable
              onPress={() => setShowBillingStatusPicker(true)}
              className="border rounded-lg px-3 py-3 bg-white flex-row items-center justify-between border-gray-300"
            >
              <Text className="text-lg text-gray-900">
                {formData.billingStatus === "billable" ? "Billable"
                  : formData.billingStatus === "non_billable" ? "Non-Billable"
                  : "Billed"}
              </Text>
              <Ionicons name="chevron-forward" size={20} color="#6b7280" />
            </Pressable>
          </InputField>

          {/* Project Selection - Read Only */}
          <InputField label="Project" error={errors.projectId}>
            <View
              className={cn(
                "border rounded-lg px-3 py-3 bg-gray-100 flex-row items-center justify-between",
                errors.projectId ? "border-red-300" : "border-gray-300"
              )}
            >
              <Text className={cn(
                "flex-1 text-lg",
                formData.projectId ? "text-gray-900" : "text-gray-500"
              )}>
                {formData.projectId 
                  ? userProjects.find(p => p.id === formData.projectId)?.name 
                  : "Select a project"
                }
              </Text>
              <Ionicons name="lock-closed" size={16} color="#9ca3af" />
            </View>
          </InputField>

          {/* Priority */}
          <InputField label="Priority">
            <Pressable
              onPress={() => setShowPriorityPicker(true)}
              className="border rounded-lg px-3 py-3 bg-white flex-row items-center justify-between"
            >
              <Text className="text-lg text-gray-900 capitalize flex-1">
                {formData.priority}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#6b7280" />
            </Pressable>
          </InputField>

          {/* Category */}
          <InputField label="Category">
            <Pressable
              onPress={() => setShowCategoryPicker(true)}
              className="border rounded-lg px-3 py-3 bg-white flex-row items-center justify-between"
            >
              <Text className="text-lg text-gray-900 capitalize flex-1">
                {formData.category}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#6b7280" />
            </Pressable>
          </InputField>

          {/* Due Date */}
          <InputField label="Due Date" error={errors.dueDate}>
            <Pressable
              onPress={() => setShowDatePicker(!showDatePicker)}
              className={cn(
                "border-2 rounded-lg px-3 py-3 bg-white flex-row items-center justify-between",
                showDatePicker ? "border-blue-600" : errors.dueDate ? "border-red-300" : "border-gray-300"
              )}
            >
              <Text className={cn(
                "text-lg",
                showDatePicker ? "text-blue-600" : "text-gray-900"
              )}>
                {formData.dueDate.toLocaleDateString("en-US", { 
                  weekday: 'short',
                  year: 'numeric', 
                  month: 'short', 
                  day: 'numeric' 
                })}
              </Text>
              <Ionicons 
                name={showDatePicker ? "calendar" : "calendar-outline"} 
                size={20} 
                color={showDatePicker ? "#3b82f6" : "#6b7280"} 
              />
            </Pressable>
          </InputField>

          {/* Date Picker - Visible when showDatePicker is true */}
          {showDatePicker && (
            <View className="bg-white border-2 border-blue-600 rounded-lg mb-4 overflow-hidden">
              <DateTimePicker
                value={formData.dueDate}
                mode="date"
                display="spinner"
                minimumDate={new Date()}
                onChange={(_event, selectedDate) => {
                  if (selectedDate) {
                    handleDateChange(selectedDate);
                  }
                }}
                textColor="#000000"
                style={{ height: 200 }}
              />
              <View className="flex-row justify-end p-3 border-t border-gray-200">
                <Pressable
                  onPress={() => setShowDatePicker(false)}
                  className="bg-blue-600 px-6 py-2 rounded-lg"
                >
                  <Text className="text-white font-semibold">Done</Text>
                </Pressable>
              </View>
            </View>
          )}

          {/* Assign To */}
          <InputField label="Assign To" error={errors.assignedTo}>
            <Pressable
              onPress={handleOpenUserPicker}
              disabled={isLoadingUsers}
              className={cn(
                "border rounded-lg px-3 py-3 bg-white flex-row items-center justify-between",
                errors.assignedTo ? "border-red-300" : "border-gray-300",
                isLoadingUsers && "opacity-50"
              )}
            >
              <Text className="text-lg text-gray-900">
                {isLoadingUsers 
                  ? "Loading users..."
                  : selectedUsers.length > 0 
                    ? `${selectedUsers.length} user${selectedUsers.length > 1 ? "s" : ""} selected`
                    : "Select users to assign"
                }
              </Text>
              {isLoadingUsers ? (
                <Ionicons name="hourglass-outline" size={20} color="#6b7280" />
              ) : (
                <Ionicons 
                  name="chevron-forward" 
                  size={20} 
                  color="#6b7280" 
                />
              )}
            </Pressable>
          </InputField>

          {/* Show selected users */}
          {selectedUsers.length > 0 && (
            <View className="bg-gray-50 border border-gray-200 rounded-lg p-3 -mt-6 mb-4">
              <Text className="text-sm font-medium text-gray-700 mb-2">Selected Users:</Text>
              <View className="flex-row flex-wrap">
                {selectedUsers.map((userId) => {
                  const user = allAssignableUsers.find(u => u.id === userId);
                  if (!user) return null;
                  return (
                    <View key={userId} className="bg-blue-100 rounded-full px-3 py-1 mr-2 mb-2 flex-row items-center">
                      <Text className="text-blue-900 text-sm font-medium mr-1">{user.name}</Text>
                      <Pressable onPress={() => toggleUserSelection(userId)}>
                        <Ionicons name="close-circle" size={16} color="#1e40af" />
                      </Pressable>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* Attachments */}
          <View className="mb-6">
            <View className="flex-row items-center mb-2">
              <Text className="text-lg font-semibold text-gray-900">
                Attachments
              </Text>
            </View>
            
            {formData.attachments.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3">
                <View className="flex-row">
                  {formData.attachments.map((photo, index) => (
                    <View key={index} className="mr-3 relative">
                      <Image
                        source={{ uri: photo }}
                        className="w-24 h-24 rounded-lg"
                        resizeMode="cover"
                      />
                      <Pressable
                        onPress={() => {
                          setFormData(prev => ({
                            ...prev,
                            attachments: prev.attachments.filter((_, i) => i !== index)
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
                {formData.attachments.length === 0 ? "No attachments added" : `${formData.attachments.length} file(s) added`}
              </Text>
            </Pressable>
          </View>

          {/* Bottom Spacing for Fixed Button */}
          <View className="h-24" />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Fixed Create Button at Bottom */}
      <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-4 pb-6">
        <Pressable
          onPress={handleSubmit}
          disabled={isSubmitting}
          className={cn(
            "rounded-lg py-4 items-center shadow-lg",
            isSubmitting 
              ? "bg-gray-300" 
              : "bg-blue-600"
          )}
        >
          <Text className="text-white font-semibold text-lg">
            {isSubmitting 
              ? (editTaskId ? "Updating..." : "Creating...") 
              : (editTaskId ? "Update Task" : "Create Task")
            }
          </Text>
        </Pressable>
      </View>

      {/* Priority Picker Modal */}
      <Modal
        visible={showPriorityPicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPriorityPicker(false)}
      >
        <SafeAreaView className="flex-1 bg-gray-50">
          <StatusBar style="dark" />
          
          <ModalHandle />
          
          <View className="flex-row items-center bg-white border-b border-gray-200 px-6 py-4">
            <Pressable 
              onPress={() => setShowPriorityPicker(false)}
              className="mr-4 w-10 h-10 items-center justify-center"
            >
              <Ionicons name="close" size={24} color="#374151" />
            </Pressable>
            <Text className="text-xl font-semibold text-gray-900 flex-1">
              Select Priority
            </Text>
          </View>

          <ScrollView className="flex-1 px-6 py-4">
            {(["critical", "high", "medium", "low"] as Priority[]).map((priority) => {
              // Define colors for each priority
              const priorityColors = {
                critical: {
                  bg: "bg-black",
                  border: "border-black",
                  text: "text-white",
                  icon: "#ffffff",
                  selectedDot: "bg-white"
                },
                high: {
                  bg: "bg-red-500",
                  border: "border-red-500",
                  text: "text-white",
                  icon: "#ffffff",
                  selectedDot: "bg-white"
                },
                medium: {
                  bg: "bg-yellow-400",
                  border: "border-yellow-400",
                  text: "text-gray-900",
                  icon: "#1f2937",
                  selectedDot: "bg-gray-900"
                },
                low: {
                  bg: "bg-green-500",
                  border: "border-green-500",
                  text: "text-white",
                  icon: "#ffffff",
                  selectedDot: "bg-white"
                }
              };

              const colors = priorityColors[priority];
              const isSelected = formData.priority === priority;

              return (
                <Pressable
                  key={priority}
                  onPress={() => {
                    handlePriorityChange(priority);
                    setShowPriorityPicker(false);
                  }}
                  className={cn(
                    "border rounded-lg px-4 py-4 mb-3 flex-row items-center",
                    isSelected ? `${colors.bg} ${colors.border}` : `${colors.bg} ${colors.border} opacity-60`
                  )}
                >
                  <View className={cn(
                    "w-5 h-5 rounded-full border-2 items-center justify-center mr-3",
                    isSelected ? "border-white" : "border-white opacity-70"
                  )}>
                    {isSelected && (
                      <View className={cn("w-3 h-3 rounded-full", colors.selectedDot)} />
                    )}
                  </View>
                  <Text className={cn(
                    "text-lg font-medium capitalize flex-1",
                    colors.text
                  )}>
                    {priority}
                  </Text>
                  <Ionicons 
                    name={priority === "critical" ? "alert-circle" : priority === "high" ? "arrow-up-circle" : priority === "medium" ? "remove-circle" : "arrow-down-circle"} 
                    size={24} 
                    color={colors.icon} 
                  />
                </Pressable>
              );
            })}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Billing Status Picker Modal */}
      <Modal
        visible={showBillingStatusPicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowBillingStatusPicker(false)}
      >
        <SafeAreaView className="flex-1 bg-gray-50">
          <StatusBar style="dark" />
          
          <ModalHandle />
          
          <View className="flex-row items-center bg-white border-b border-gray-200 px-6 py-4">
            <Pressable 
              onPress={() => setShowBillingStatusPicker(false)}
              className="mr-4 w-10 h-10 items-center justify-center"
            >
              <Ionicons name="close" size={24} color="#374151" />
            </Pressable>
            <Text className="text-xl font-semibold text-gray-900 flex-1">
              Select Billing Status
            </Text>
          </View>

          <ScrollView className="flex-1 px-6 py-4">
            {/* Non-Billable option */}
            <Pressable
              onPress={() => handleBillingStatusChange("non_billable")}
              className={cn(
                "bg-white border rounded-lg px-4 py-4 mb-3 flex-row items-center",
                formData.billingStatus === "non_billable" ? "border-blue-500 bg-blue-50" : "border-gray-300"
              )}
            >
              <View className={cn(
                "w-5 h-5 rounded-full border-2 items-center justify-center mr-3",
                formData.billingStatus === "non_billable" ? "border-blue-500" : "border-gray-300"
              )}>
                {formData.billingStatus === "non_billable" && (
                  <View className="w-3 h-3 rounded-full bg-blue-500" />
                )}
              </View>
              <Text className={cn(
                "text-lg font-medium flex-1",
                formData.billingStatus === "non_billable" ? "text-blue-900" : "text-gray-900"
              )}>
                Non-Billable
              </Text>
              <Ionicons 
                name="ban-outline" 
                size={24} 
                color={formData.billingStatus === "non_billable" ? "#3b82f6" : "#6b7280"} 
              />
            </Pressable>

            {/* Billable option */}
            <Pressable
              onPress={() => handleBillingStatusChange("billable")}
              className={cn(
                "bg-white border rounded-lg px-4 py-4 mb-3 flex-row items-center",
                formData.billingStatus === "billable" ? "border-blue-500 bg-blue-50" : "border-gray-300"
              )}
            >
              <View className={cn(
                "w-5 h-5 rounded-full border-2 items-center justify-center mr-3",
                formData.billingStatus === "billable" ? "border-blue-500" : "border-gray-300"
              )}>
                {formData.billingStatus === "billable" && (
                  <View className="w-3 h-3 rounded-full bg-blue-500" />
                )}
              </View>
              <Text className={cn(
                "text-lg font-medium flex-1",
                formData.billingStatus === "billable" ? "text-blue-900" : "text-gray-900"
              )}>
                Billable
              </Text>
              <Ionicons 
                name="cash-outline" 
                size={24} 
                color={formData.billingStatus === "billable" ? "#3b82f6" : "#6b7280"} 
              />
            </Pressable>

            {/* Billed option */}
            <Pressable
              onPress={() => handleBillingStatusChange("billed")}
              className={cn(
                "bg-white border rounded-lg px-4 py-4 mb-3 flex-row items-center",
                formData.billingStatus === "billed" ? "border-blue-500 bg-blue-50" : "border-gray-300"
              )}
            >
              <View className={cn(
                "w-5 h-5 rounded-full border-2 items-center justify-center mr-3",
                formData.billingStatus === "billed" ? "border-blue-500" : "border-gray-300"
              )}>
                {formData.billingStatus === "billed" && (
                  <View className="w-3 h-3 rounded-full bg-blue-500" />
                )}
              </View>
              <Text className={cn(
                "text-lg font-medium flex-1",
                formData.billingStatus === "billed" ? "text-blue-900" : "text-gray-900"
              )}>
                Billed
              </Text>
              <Ionicons 
                name="checkmark-circle-outline" 
                size={24} 
                color={formData.billingStatus === "billed" ? "#3b82f6" : "#6b7280"} 
              />
            </Pressable>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Category Picker Modal */}
      <Modal
        visible={showCategoryPicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCategoryPicker(false)}
      >
        <SafeAreaView className="flex-1 bg-gray-50">
          <StatusBar style="dark" />
          
          <ModalHandle />
          
          <View className="flex-row items-center bg-white border-b border-gray-200 px-6 py-4">
            <Pressable 
              onPress={() => setShowCategoryPicker(false)}
              className="mr-4 w-10 h-10 items-center justify-center"
            >
              <Ionicons name="close" size={24} color="#374151" />
            </Pressable>
            <Text className="text-xl font-semibold text-gray-900 flex-1">
              Select Category
            </Text>
          </View>

          <ScrollView className="flex-1 px-6 py-4">
            {(["general", "safety", "electrical", "plumbing", "structural", "materials"] as TaskCategory[]).map((category) => (
              <Pressable
                key={category}
                onPress={() => {
                  handleCategoryChange(category);
                  setShowCategoryPicker(false);
                }}
                className={cn(
                  "bg-white border rounded-lg px-4 py-4 mb-3 flex-row items-center",
                  formData.category === category ? "border-blue-500 bg-blue-50" : "border-gray-300"
                )}
              >
                <View className={cn(
                  "w-5 h-5 rounded-full border-2 items-center justify-center mr-3",
                  formData.category === category ? "border-blue-500" : "border-gray-300"
                )}>
                  {formData.category === category && (
                    <View className="w-3 h-3 rounded-full bg-blue-500" />
                  )}
                </View>
                <Text className={cn(
                  "text-lg font-medium capitalize flex-1",
                  formData.category === category ? "text-blue-900" : "text-gray-900"
                )}>
                  {category}
                </Text>
                <Ionicons 
                  name={
                    category === "safety" ? "shield-checkmark" :
                    category === "electrical" ? "flash" :
                    category === "plumbing" ? "water" :
                    category === "structural" ? "hammer" :
                    category === "materials" ? "cube" :
                    "list"
                  } 
                  size={24} 
                  color={formData.category === category ? "#3b82f6" : "#6b7280"} 
                />
              </Pressable>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Project Picker Modal */}
      <Modal
        visible={showProjectPicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowProjectPicker(false)}
      >
        <SafeAreaView className="flex-1 bg-gray-50">
          <StatusBar style="dark" />
          
          <ModalHandle />
          
          <View className="flex-row items-center bg-white border-b border-gray-200 px-6 py-4">
            <Pressable 
              onPress={() => setShowProjectPicker(false)}
              className="mr-4 w-10 h-10 items-center justify-center"
            >
              <Ionicons name="close" size={24} color="#374151" />
            </Pressable>
            <Text className="text-xl font-semibold text-gray-900 flex-1">
              Select Project
            </Text>
          </View>

          <ScrollView className="flex-1 px-6 py-4">
            {userProjects.map((project) => (
              <Pressable
                key={project.id}
                onPress={() => {
                  setFormData(prev => ({ ...prev, projectId: project.id }));
                  setShowProjectPicker(false);
                }}
                className={cn(
                  "bg-white border rounded-lg px-4 py-4 mb-3 flex-row items-center",
                  formData.projectId === project.id ? "border-blue-500 bg-blue-50" : "border-gray-300"
                )}
              >
                <View className={cn(
                  "w-5 h-5 rounded-full border-2 items-center justify-center mr-3",
                  formData.projectId === project.id ? "border-blue-500" : "border-gray-300"
                )}>
                  {formData.projectId === project.id && (
                    <View className="w-3 h-3 rounded-full bg-blue-500" />
                  )}
                </View>
                <View className="flex-1">
                  <Text className={cn(
                    "text-lg font-medium",
                    formData.projectId === project.id ? "text-blue-900" : "text-gray-900"
                  )} numberOfLines={1}>
                    {project.name}
                  </Text>
                  <Text className="text-sm text-gray-600 mt-0.5" numberOfLines={1}>
                    {project.location || "No location"}
                  </Text>
                </View>
                <Ionicons name="folder-outline" size={24} color={formData.projectId === project.id ? "#3b82f6" : "#6b7280"} />
              </Pressable>
            ))}
            
            {userProjects.length === 0 && (
              <View className="bg-white border border-gray-200 rounded-lg p-8 items-center">
                <Ionicons name="folder-open-outline" size={48} color="#9ca3af" />
                <Text className="text-gray-500 text-center mt-2">
                  No projects available
                </Text>
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* User Picker Modal with Search */}
      <Modal
        visible={showUserPicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          setShowUserPicker(false);
          setUserSearchQuery("");
          setIsLoadingUsers(false);
        }}
      >
        <SafeAreaView className="flex-1 bg-gray-50">
          <StatusBar style="dark" />
          
          <ModalHandle />
          
          <View className="flex-row items-center bg-white border-b border-gray-200 px-6 py-4">
            <Pressable 
              onPress={() => {
                setShowUserPicker(false);
                setUserSearchQuery("");
                setIsLoadingUsers(false);
              }}
              className="mr-4 w-10 h-10 items-center justify-center"
            >
              <Ionicons name="close" size={24} color="#374151" />
            </Pressable>
            <Text className="text-xl font-semibold text-gray-900 flex-1">
              Assign To
            </Text>
            <Text className="text-base text-blue-600 font-medium">
              {selectedUsers.length} selected
            </Text>
          </View>

          {/* Search Bar */}
          <View className="bg-white px-6 py-3 border-b border-gray-200">
            <View className="flex-row items-center bg-gray-100 rounded-lg px-3 py-2">
              <Ionicons name="search" size={20} color="#6b7280" />
              <TextInput
                className="flex-1 ml-2 text-lg text-gray-900"
                placeholder="Search by name, email, position, or role..."
                placeholderTextColor="#9ca3af"
                value={userSearchQuery}
                onChangeText={setUserSearchQuery}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {userSearchQuery.length > 0 && (
                <Pressable onPress={() => setUserSearchQuery("")}>
                  <Ionicons name="close-circle" size={20} color="#6b7280" />
                </Pressable>
              )}
            </View>
            
            {/* Results count */}
            <Text className="text-sm text-gray-600 mt-2">
              {filteredAssignableUsers.length} user{filteredAssignableUsers.length !== 1 ? 's' : ''} available
              {userSearchQuery && ` (filtered from ${allAssignableUsers.length})`}
            </Text>
          </View>

          {/* User List */}
          <ScrollView className="flex-1 px-6 py-4">
            {isLoadingUsers ? (
              // Loading state
              <View className="bg-white border border-gray-200 rounded-lg p-8 items-center">
                <ActivityIndicator size="large" color="#3b82f6" />
                <Text className="text-gray-600 text-center mt-4 font-medium">
                  Loading users...
                </Text>
                <Text className="text-gray-400 text-center mt-2 text-base">
                  Fetching project team members
                </Text>
              </View>
            ) : filteredAssignableUsers.length > 0 ? (
              filteredAssignableUsers.map((assignableUser) => {
                const isSelected = selectedUsers.includes(assignableUser.id);
                const isFavorite = user?.id ? isFavoriteUser(user.id, assignableUser.id) : false;
                
                return (
                  <Pressable
                    key={assignableUser.id}
                    onPress={() => toggleUserSelection(assignableUser.id)}
                    className={cn(
                      "bg-white border rounded-lg px-4 py-3 mb-3 flex-row items-center",
                      isSelected ? "border-blue-500 bg-blue-50" : "border-gray-300"
                    )}
                  >
                    {/* Checkbox */}
                    <View className={cn(
                      "w-5 h-5 rounded border-2 mr-3 items-center justify-center",
                      isSelected 
                        ? "border-blue-600 bg-blue-600" 
                        : "border-gray-300"
                    )}>
                      {isSelected && (
                        <Ionicons name="checkmark" size={14} color="white" />
                      )}
                    </View>

                    {/* User Info */}
                    <View className="flex-1">
                      <Text className={cn(
                        "text-lg font-semibold",
                        isSelected ? "text-blue-900" : "text-gray-900"
                      )}>
                        {assignableUser.name}
                      </Text>
                      <View className="flex-row items-center mt-1">
                        <Text className="text-sm text-gray-600 capitalize">
                          {assignableUser.position}
                        </Text>
                        <View className="w-1 h-1 rounded-full bg-gray-400 mx-2" />
                        <Text className="text-sm text-gray-500 capitalize">
                          {assignableUser.role}
                        </Text>
                      </View>
                      {assignableUser.email && (
                        <Text className="text-sm text-gray-500 mt-0.5">
                          {assignableUser.email}
                        </Text>
                      )}
                    </View>

                    {/* Favorite Star */}
                    <Pressable
                      onPress={(e) => {
                        e.stopPropagation();
                        if (user?.id) {
                          toggleFavoriteUser(user.id, assignableUser.id);
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
              })
            ) : allAssignableUsers.length > 0 ? (
              // No results found (filtered out)
              <View className="bg-white border border-gray-200 rounded-lg p-8 items-center">
                <Ionicons name="search-outline" size={48} color="#9ca3af" />
                <Text className="text-gray-500 text-center mt-3 font-medium">
                  No users found
                </Text>
                <Text className="text-gray-400 text-center mt-1 text-base">
                  Try adjusting your search
                </Text>
                <Pressable
                  onPress={() => setUserSearchQuery("")}
                  className="mt-4 bg-blue-600 px-4 py-2 rounded-lg"
                >
                  <Text className="text-white font-medium">Clear Search</Text>
                </Pressable>
              </View>
            ) : (
              // No users assigned to project
              <View className="bg-white border border-gray-200 rounded-lg p-8 items-center">
                <Ionicons name="people-outline" size={48} color="#9ca3af" />
                <Text className="text-gray-500 text-center mt-3 font-medium">
                  No users assigned to this project
                </Text>
                <Text className="text-gray-400 text-center mt-1 text-base">
                  Add team members to the project first
                </Text>
              </View>
            )}
          </ScrollView>

          {/* Footer - Done Button */}
          <View className="bg-white border-t border-gray-200 px-6 py-4">
            <Pressable
              onPress={() => {
                setShowUserPicker(false);
                setUserSearchQuery("");
                setIsLoadingUsers(false);
              }}
              className="bg-blue-600 rounded-lg py-3 items-center"
            >
              <Text className="text-white font-semibold text-lg">
                Done ({selectedUsers.length} selected)
              </Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Logout FAB */}
      <LogoutFAB />
    </SafeAreaView>
  );
}