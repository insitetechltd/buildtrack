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
import { useFileUpload, UploadResults } from "../utils/useFileUpload";
import { useTranslation } from "../utils/useTranslation";
import { useDateFormatter } from "../utils/dateFormatter";
import { useTaskLLMAssistant } from "../hooks/useTaskLLMAssistant";
// Temporarily disabled due to expo-av CMake build issues
// import VoiceTaskInput, { Language } from "../components/VoiceTaskInput";

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
  // Debug: Log the props received
  console.log('🎯 CreateTaskScreen props:', {
    editTaskId,
    parentTaskId,
    parentSubTaskId,
    hasEditTaskId: !!editTaskId
  });

  const t = useTranslation();
  const dateFormatter = useDateFormatter();
  const { user } = useAuthStore();
  const { createTask, createSubTask, createNestedSubTask, updateTask, tasks, fetchTaskById } = useTaskStore();
  const { getUsersByRole, getUserById } = useUserStoreWithInit();
  const projectStore = useProjectStoreWithCompanyInit(user?.companyId || "");
  const { getProjectsByUser, getProjectUserAssignments, fetchProjectUserAssignments } = projectStore;
  const { selectedProjectId } = useProjectFilterStore();
  const { pickAndUploadImages, isUploading, isCompressing } = useFileUpload();
  const { getCompanyBanner } = useCompanyStore();
  const { isFavoriteUser, toggleFavoriteUser } = useUserPreferencesStore();

  // Get parent task information if creating a sub-task
  const parentTask = parentTaskId ? tasks.find(t => t.id === parentTaskId) : null;
  // Note: subTasks are now in the unified tasks table with parentTaskId, not nested
  const parentSubTask = parentSubTaskId ? tasks.find(t => t.id === parentSubTaskId && t.parentTaskId === parentTaskId) : null;

  // Get task for editing - use useMemo to ensure it updates when tasks array changes
  const editTask = React.useMemo(() => {
    if (!editTaskId) return null;
    const found = tasks.find(t => t.id === editTaskId);
    console.log('🔍 editTask memo:', { editTaskId, found: found ? found.title : 'NOT FOUND', tasksCount: tasks.length });
    return found || null;
  }, [editTaskId, tasks]);

  // Fetch task data when editing to ensure we have the latest data
  useEffect(() => {
    if (editTaskId) {
      console.log('📥 Fetching task for editing:', editTaskId);
      console.log('📥 Current tasks in store:', tasks.length);
      console.log('📥 Looking for task ID:', editTaskId);
      const taskInStore = tasks.find(t => t.id === editTaskId);
      console.log('📥 Task found in store?', taskInStore ? 'YES - ' + taskInStore.title : 'NO');
      
      // Always try to fetch to ensure we have the latest data
      fetchTaskById(editTaskId).then((fetchedTask) => {
        console.log('✅ Task fetched successfully:', fetchedTask?.title);
        console.log('✅ Task data:', {
          id: fetchedTask?.id,
          title: fetchedTask?.title,
          description: fetchedTask?.description,
          assignedTo: fetchedTask?.assignedTo,
        });
        // After fetch, the tasks array will update and editTask should become available
        // The form pre-fill useEffect will then trigger
      }).catch((error) => {
        console.error('❌ Error fetching task for editing:', error);
      });
    }
  }, [editTaskId, fetchTaskById, tasks]);

  // Also check when screen comes into focus (in case task was just created)
  useFocusEffect(
    useCallback(() => {
      if (editTaskId) {
        console.log('🔄 Screen focused, checking for task:', editTaskId);
        const currentTask = tasks.find(t => t.id === editTaskId);
        if (currentTask) {
          console.log('✅ Task found in store on focus:', currentTask.title);
        } else {
          console.log('⏳ Task not in store, fetching...');
          fetchTaskById(editTaskId).catch((error) => {
            console.error('❌ Error fetching task on focus:', error);
          });
        }
      }
    }, [editTaskId, tasks, fetchTaskById])
  );

  // Ensure only the task creator can edit
  // Note: Editing is now allowed even after acceptance (with audit logging)
  useEffect(() => {
    if (!editTaskId || !editTask || !user) return;

    // Check if user is the creator
    if (editTask.assignedBy !== user.id) {
      Alert.alert(
        t.createTask.permissionDenied,
        t.createTask.onlyCreatorCanEdit,
        [
          {
            text: t.common.ok,
            onPress: () => onNavigateBack(),
          },
        ]
      );
      return;
    }

    // Allow editing accepted tasks (changes will be logged)
    // Allow editing rejected tasks so creator can fix issues and reassign
  }, [editTaskId, editTask?.assignedBy, editTask?.declineReason, editTask?.currentStatus, user?.id, editTask, onNavigateBack, t]);

  // Track if we've initialized form from editTask to prevent overwriting user changes
  const [hasInitializedFromEditTask, setHasInitializedFromEditTask] = React.useState(false);

  // Reset initialization flag when editTaskId changes
  useEffect(() => {
    setHasInitializedFromEditTask(false);
  }, [editTaskId]);

  // Update form data when editTask becomes available (e.g., after loading from store)
  // Only do this once per editTaskId to avoid overwriting user changes
  useEffect(() => {
      console.log('🔄 Form pre-fill effect running:', {
      editTaskId,
      hasEditTask: !!editTask,
      editTaskIdMatch: editTask?.id === editTaskId,
      editTaskTitle: editTask?.title,
      hasInitialized: hasInitializedFromEditTask,
      tasksCount: tasks.length
    });

    if (editTaskId && editTask && editTask.id === editTaskId && !hasInitializedFromEditTask) {
      console.log('📝 Pre-filling form with task data:', editTask.title);
      console.log('📝 Full task object:', {
        id: editTask.id,
        title: editTask.title,
        description: editTask.description,
        priority: editTask.priority,
        category: editTask.category,
        assignedTo: editTask.assignedTo,
        projectId: editTask.projectId,
        taskReference: editTask.taskReference,
        billingStatus: editTask.billingStatus,
        dueDate: editTask.dueDate,
        attachmentsCount: editTask.attachments?.length || 0,
      });
      
      const newFormData = {
        title: editTask.title || "",
        description: editTask.description || "",
        taskReference: editTask.taskReference || "",
        billingStatus: editTask.billingStatus || "non_billable",
        priority: editTask.priority || "medium",
        category: editTask.category || "general",
        dueDate: editTask.dueDate ? new Date(editTask.dueDate) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        assignedTo: editTask.assignedTo || [],
        attachments: editTask.attachments || [],
        projectId: editTask.projectId || "",
      };
      
      console.log('📝 Setting form data to:', {
        title: newFormData.title,
        description: newFormData.description,
        priority: newFormData.priority,
        assignedTo: newFormData.assignedTo,
        projectId: newFormData.projectId,
      });
      setFormData(newFormData);
      // Also update selectedUsers to match assignedTo
      setSelectedUsers(editTask.assignedTo || []);
      setHasInitializedFromEditTask(true);
      console.log('✅ Form pre-filled successfully!');
    } else if (editTaskId && !editTask) {
      console.log('⏳ Waiting for task to be loaded... editTaskId:', editTaskId, 'tasks in store:', tasks.length);
    } else if (editTaskId && hasInitializedFromEditTask) {
      console.log('ℹ️ Form already initialized, skipping');
    } else if (editTaskId && editTask && editTask.id !== editTaskId) {
      console.log('⚠️ Task ID mismatch! editTaskId:', editTaskId, 'editTask.id:', editTask?.id);
    }
  }, [editTaskId, editTask, hasInitializedFromEditTask, tasks]); // Watch editTask and tasks array to catch when task becomes available

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

  // Initialize form data - will be updated by useEffect if editing
  const [formData, setFormData] = useState(() => {
    const initial = getInitialFormData();
    console.log('🔧 Initial form data set:', { 
      hasEditTaskId: !!editTaskId, 
      hasEditTask: !!editTask,
      title: initial.title,
      description: initial.description 
    });
    return initial;
  });

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
  const [showEditReasonModal, setShowEditReasonModal] = useState(false);
  const [editReason, setEditReason] = useState("");
  const [pendingSubmit, setPendingSubmit] = useState(false);
  
  // LLM Assistant state
  const {
    suggestTaskFromText,
    suggestTaskFromVoice,
    isLoading: isLLMLoading,
    error: llmError,
    lastSuggestion,
    clearError: clearLLMError,
    clearSuggestion,
  } = useTaskLLMAssistant();
  const [textInput, setTextInput] = useState("");
  const [showSuggestionPreview, setShowSuggestionPreview] = useState(false);
  const [acceptedFields, setAcceptedFields] = useState<Set<string>>(new Set());

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
      // Only reset if NOT editing a task and NOT creating a subtask
      if (!editTaskId && !parentTaskId) {
        console.log('🔄 Resetting CreateTaskScreen form on focus (new task mode)');
        setFormData(getInitialFormData());
        setSelectedUsers([]);
        setErrors({});
        setUserSearchQuery("");
        setShowUserPicker(false);
        setShowPriorityPicker(false);
        setShowCategoryPicker(false);
        setShowProjectPicker(false);
        setShowDatePicker(false);
      } else if (editTaskId) {
        console.log('📝 Edit mode - not resetting form on focus');
      }
    }, [parentTaskId, editTaskId])
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
      <SafeAreaView edges={['bottom', 'left', 'right']} className="flex-1 bg-gray-50">
        <StatusBar style="dark" />
        
        {/* Header */}
        <View className="flex-row items-center justify-between px-6 py-4 bg-white border-b border-gray-200">
          <Pressable onPress={onNavigateBack} className="mr-4">
            <Ionicons name="arrow-back" size={24} color="#374151" />
          </Pressable>
          <Text className="flex-1 text-2xl font-semibold text-gray-900">
            {t.tasks.createTask}
          </Text>
        </View>

        <View className="flex-1 items-center justify-center px-6">
          <View className="bg-amber-50 border border-amber-200 rounded-xl p-6 w-full max-w-sm">
            <View className="items-center mb-4">
              <View className="w-16 h-16 bg-amber-100 rounded-full items-center justify-center mb-3">
                <Ionicons name="shield-outline" size={32} color="#f59e0b" />
              </View>
              <Text className="text-xl font-semibold text-amber-900 text-center mb-2">
                {t.createTask.accessRestricted}
              </Text>
              <Text className="text-base text-amber-800 text-center leading-5">
                {t.createTask.adminCannotCreateTasks}
              </Text>
            </View>
            <Pressable 
              onPress={onNavigateBack}
              className="bg-amber-600 rounded-lg py-3 px-4"
            >
              <Text className="text-white font-semibold text-center">
                {t.createTask.goBack}
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

  const performSubmit = async (providedEditReason?: string) => {
    setIsSubmitting(true);

    try {
      let taskId: string;
      let successMessage: string;

      if (editTaskId) {
        // Editing existing task
        const updatePayload: any = {
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
        };

        // If editing an accepted task, include the edit reason for audit logging
        if (editTask && editTask.accepted === true && providedEditReason) {
          updatePayload._editReason = providedEditReason.trim() || undefined;
        }

        // If editing a rejected task, reset the rejection state so it can be reassigned
        // This allows the creator to fix issues and send to original or new assignees
        if (editTask && (editTask.declineReason || editTask.currentStatus === "rejected")) {
          updatePayload.declineReason = undefined;
          updatePayload.currentStatus = "not_started";
          updatePayload.accepted = false;
          updatePayload.acceptedBy = undefined;
          updatePayload.acceptedAt = undefined;
          // Reset review fields for a fresh start
          updatePayload.readyForReview = false;
          updatePayload.reviewAccepted = undefined;
          updatePayload.reviewedBy = undefined;
          updatePayload.reviewedAt = undefined;
          // Reset completion for a fresh start
          updatePayload.completionPercentage = 0;
          console.log('🔄 Resetting rejection state for task edit - task can now be reassigned');
        }

        await updateTask(editTaskId, updatePayload);
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

  const handleSubmit = async () => {
    // Clear any existing errors before validation
    setErrors({});
    
    if (!validateForm()) return;

    if (editTaskId) {
      if (!editTask) {
        Alert.alert(t.createTask.taskNotFound, t.createTask.unableToEditTask);
        return;
      }
      if (!user || editTask.assignedBy !== user.id) {
        Alert.alert(t.createTask.permissionDenied, t.createTask.onlyCreatorCanEdit);
        return;
      }

      // If editing an accepted task, show modal to prompt for edit reason
      if (editTask.accepted === true) {
        setEditReason("");
        setShowEditReasonModal(true);
        return;
      }
    }

    // For new tasks or non-accepted tasks, submit directly
    await performSubmit();
  };

  const handleEditReasonSubmit = async () => {
    setShowEditReasonModal(false);
    await performSubmit(editReason);
  };


  return (
    <SafeAreaView edges={['bottom', 'left', 'right']} className="flex-1 bg-gray-50">
      <StatusBar style="dark" />
      
      {/* Standard Header */}
      <StandardHeader 
        title={(() => {
          const title = editTaskId
            ? t.createTask.editTask
            : parentTaskId 
              ? parentSubTaskId && parentSubTask
                ? t.createTask.nestedSubTask
                : parentTask
                  ? t.createTask.createSubTask
                  : t.createTask.createSubTask
              : t.createTask.createNewTask;
          console.log('📋 Header title determined:', { editTaskId, title, hasEditTaskId: !!editTaskId });
          return title;
        })()}
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
          {/* Voice Input - Temporarily disabled due to expo-av CMake build issues */}
          {/* <VoiceTaskInput
            onTranscriptionComplete={async (audioUri, language) => {
              try {
                const suggestion = await suggestTaskFromVoice(audioUri, language, editTask || undefined);
                if (suggestion) {
                  setShowSuggestionPreview(true);
                  setAcceptedFields(new Set());
                }
              } catch (error) {
                console.error("Voice input error:", error);
              }
            }}
            onError={(error) => {
              Alert.alert(t.voiceInput.error, error);
            }}
            defaultLanguage="yue"
          /> */}

          {/* Text Input for Manual Entry */}
          <View className="mb-4">
            <Text className="text-base font-semibold text-gray-700 mb-2">
              {t.createTask.textInput}
            </Text>
            <View className="flex-row gap-2">
              <TextInput
                className="flex-1 border rounded-lg px-3 py-3 text-base text-gray-900 bg-white border-gray-300"
                placeholder={t.createTask.textInputPlaceholder}
                value={textInput}
                onChangeText={setTextInput}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
              <Pressable
                onPress={async () => {
                  if (!textInput.trim()) {
                    Alert.alert(t.errors.error, "Please enter some text");
                    return;
                  }
                  try {
                    const suggestion = await suggestTaskFromText(textInput.trim(), editTask || undefined);
                    if (suggestion) {
                      setShowSuggestionPreview(true);
                      setAcceptedFields(new Set());
                      setTextInput("");
                    }
                  } catch (error) {
                    console.error("Text input error:", error);
                  }
                }}
                disabled={isLLMLoading || !textInput.trim()}
                className={cn(
                  "px-4 py-3 rounded-lg bg-blue-500",
                  (isLLMLoading || !textInput.trim()) && "opacity-50"
                )}
              >
                {isLLMLoading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Ionicons name="send" size={20} color="white" />
                )}
              </Pressable>
            </View>
          </View>

          {/* LLM Error Display */}
          {llmError && (
            <View className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <View className="flex-row items-center justify-between">
                <Text className="text-red-700 text-sm flex-1">{llmError}</Text>
                <Pressable onPress={clearLLMError}>
                  <Ionicons name="close" size={20} color="#991b1b" />
                </Pressable>
              </View>
            </View>
          )}

          {/* Suggestion Preview */}
          {lastSuggestion && showSuggestionPreview && (
            <View className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-base font-semibold text-gray-900">
                  {t.createTask.aiSuggestions}
                </Text>
                <Pressable
                  onPress={() => {
                    setShowSuggestionPreview(false);
                    clearSuggestion();
                    setAcceptedFields(new Set());
                  }}
                >
                  <Ionicons name="close" size={20} color="#1e40af" />
                </Pressable>
              </View>

              {lastSuggestion.title && (
                <View className="mb-3">
                  <View className="flex-row items-center justify-between mb-1">
                    <Text className="text-sm font-medium text-gray-700">{t.tasks.title}</Text>
                    <View className="flex-row gap-2">
                      <Pressable
                        onPress={() => {
                          if (acceptedFields.has("title")) {
                            setAcceptedFields((prev) => {
                              const next = new Set(prev);
                              next.delete("title");
                              return next;
                            });
                          } else {
                            setAcceptedFields((prev) => new Set(prev).add("title"));
                            setFormData((prev) => ({ ...prev, title: lastSuggestion.title! }));
                          }
                        }}
                        className={cn(
                          "px-2 py-1 rounded",
                          acceptedFields.has("title") ? "bg-green-200" : "bg-gray-200"
                        )}
                      >
                        <Text className="text-xs">
                          {acceptedFields.has("title") ? t.createTask.acceptField : t.createTask.rejectField}
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                  <Text className="text-sm text-gray-600">{lastSuggestion.title}</Text>
                </View>
              )}

              {lastSuggestion.description && (
                <View className="mb-3">
                  <View className="flex-row items-center justify-between mb-1">
                    <Text className="text-sm font-medium text-gray-700">{t.tasks.description}</Text>
                    <Pressable
                      onPress={() => {
                        if (acceptedFields.has("description")) {
                          setAcceptedFields((prev) => {
                            const next = new Set(prev);
                            next.delete("description");
                            return next;
                          });
                        } else {
                          setAcceptedFields((prev) => new Set(prev).add("description"));
                          setFormData((prev) => ({ ...prev, description: lastSuggestion.description! }));
                        }
                      }}
                      className={cn(
                        "px-2 py-1 rounded",
                        acceptedFields.has("description") ? "bg-green-200" : "bg-gray-200"
                      )}
                    >
                      <Text className="text-xs">
                        {acceptedFields.has("description") ? t.createTask.acceptField : t.createTask.rejectField}
                      </Text>
                    </Pressable>
                  </View>
                  <Text className="text-sm text-gray-600">{lastSuggestion.description}</Text>
                </View>
              )}

              {lastSuggestion.category && (
                <View className="mb-3">
                  <View className="flex-row items-center justify-between mb-1">
                    <Text className="text-sm font-medium text-gray-700">{t.tasks.category}</Text>
                    <Pressable
                      onPress={() => {
                        if (acceptedFields.has("category")) {
                          setAcceptedFields((prev) => {
                            const next = new Set(prev);
                            next.delete("category");
                            return next;
                          });
                        } else {
                          setAcceptedFields((prev) => new Set(prev).add("category"));
                          setFormData((prev) => ({ ...prev, category: lastSuggestion.category! }));
                        }
                      }}
                      className={cn(
                        "px-2 py-1 rounded",
                        acceptedFields.has("category") ? "bg-green-200" : "bg-gray-200"
                      )}
                    >
                      <Text className="text-xs">
                        {acceptedFields.has("category") ? t.createTask.acceptField : t.createTask.rejectField}
                      </Text>
                    </Pressable>
                  </View>
                  <Text className="text-sm text-gray-600">{lastSuggestion.category}</Text>
                </View>
              )}

              {lastSuggestion.priority && (
                <View className="mb-3">
                  <View className="flex-row items-center justify-between mb-1">
                    <Text className="text-sm font-medium text-gray-700">{t.tasks.priority}</Text>
                    <Pressable
                      onPress={() => {
                        if (acceptedFields.has("priority")) {
                          setAcceptedFields((prev) => {
                            const next = new Set(prev);
                            next.delete("priority");
                            return next;
                          });
                        } else {
                          setAcceptedFields((prev) => new Set(prev).add("priority"));
                          setFormData((prev) => ({ ...prev, priority: lastSuggestion.priority! }));
                        }
                      }}
                      className={cn(
                        "px-2 py-1 rounded",
                        acceptedFields.has("priority") ? "bg-green-200" : "bg-gray-200"
                      )}
                    >
                      <Text className="text-xs">
                        {acceptedFields.has("priority") ? t.createTask.acceptField : t.createTask.rejectField}
                      </Text>
                    </Pressable>
                  </View>
                  <Text className="text-sm text-gray-600">{lastSuggestion.priority}</Text>
                </View>
              )}

              {lastSuggestion.dueDate && (
                <View className="mb-3">
                  <View className="flex-row items-center justify-between mb-1">
                    <Text className="text-sm font-medium text-gray-700">{t.tasks.dueDate}</Text>
                    <Pressable
                      onPress={() => {
                        if (acceptedFields.has("dueDate")) {
                          setAcceptedFields((prev) => {
                            const next = new Set(prev);
                            next.delete("dueDate");
                            return next;
                          });
                        } else {
                          setAcceptedFields((prev) => new Set(prev).add("dueDate"));
                          setFormData((prev) => ({ ...prev, dueDate: new Date(lastSuggestion.dueDate!) }));
                        }
                      }}
                      className={cn(
                        "px-2 py-1 rounded",
                        acceptedFields.has("dueDate") ? "bg-green-200" : "bg-gray-200"
                      )}
                    >
                      <Text className="text-xs">
                        {acceptedFields.has("dueDate") ? t.createTask.acceptField : t.createTask.rejectField}
                      </Text>
                    </Pressable>
                  </View>
                  <Text className="text-sm text-gray-600">
                    {dateFormatter.formatDate(new Date(lastSuggestion.dueDate))}
                  </Text>
                </View>
              )}

              {lastSuggestion.billingStatus && (
                <View className="mb-3">
                  <View className="flex-row items-center justify-between mb-1">
                    <Text className="text-sm font-medium text-gray-700">{t.createTask.billingStatus}</Text>
                    <Pressable
                      onPress={() => {
                        if (acceptedFields.has("billingStatus")) {
                          setAcceptedFields((prev) => {
                            const next = new Set(prev);
                            next.delete("billingStatus");
                            return next;
                          });
                        } else {
                          setAcceptedFields((prev) => new Set(prev).add("billingStatus"));
                          setFormData((prev) => ({ ...prev, billingStatus: lastSuggestion.billingStatus! }));
                        }
                      }}
                      className={cn(
                        "px-2 py-1 rounded",
                        acceptedFields.has("billingStatus") ? "bg-green-200" : "bg-gray-200"
                      )}
                    >
                      <Text className="text-xs">
                        {acceptedFields.has("billingStatus") ? t.createTask.acceptField : t.createTask.rejectField}
                      </Text>
                    </Pressable>
                  </View>
                  <Text className="text-sm text-gray-600">{lastSuggestion.billingStatus}</Text>
                </View>
              )}

              {lastSuggestion.taskReference && (
                <View className="mb-3">
                  <View className="flex-row items-center justify-between mb-1">
                    <Text className="text-sm font-medium text-gray-700">{t.createTask.taskReference}</Text>
                    <Pressable
                      onPress={() => {
                        if (acceptedFields.has("taskReference")) {
                          setAcceptedFields((prev) => {
                            const next = new Set(prev);
                            next.delete("taskReference");
                            return next;
                          });
                        } else {
                          setAcceptedFields((prev) => new Set(prev).add("taskReference"));
                          setFormData((prev) => ({ ...prev, taskReference: lastSuggestion.taskReference! }));
                        }
                      }}
                      className={cn(
                        "px-2 py-1 rounded",
                        acceptedFields.has("taskReference") ? "bg-green-200" : "bg-gray-200"
                      )}
                    >
                      <Text className="text-xs">
                        {acceptedFields.has("taskReference") ? t.createTask.acceptField : t.createTask.rejectField}
                      </Text>
                    </Pressable>
                  </View>
                  <Text className="text-sm text-gray-600">{lastSuggestion.taskReference}</Text>
                </View>
              )}

              <Pressable
                onPress={() => {
                  setShowSuggestionPreview(false);
                  clearSuggestion();
                  setAcceptedFields(new Set());
                }}
                className="mt-2 px-4 py-2 bg-blue-500 rounded-lg"
              >
                <Text className="text-white text-center font-semibold">
                  {t.createTask.clearSuggestions}
                </Text>
              </Pressable>
            </View>
          )}

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
                placeholder={t.createTask.descriptionPlaceholder}
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
          <InputField label={t.createTask.taskReference} required={false}>
              <TextInput
                className="border rounded-lg px-3 py-3 text-lg text-gray-900 bg-white border-gray-300"
                placeholder={t.createTask.taskReferencePlaceholder}
                value={formData.taskReference}
                onChangeText={handleTaskReferenceChange}
                maxLength={50}
                autoCorrect={false}
                returnKeyType="next"
              />
          </InputField>

          {/* Billing Status */}
          <InputField label={t.createTask.billingStatus}>
            <Pressable
              onPress={() => setShowBillingStatusPicker(true)}
              className="border rounded-lg px-3 py-3 bg-white flex-row items-center justify-between border-gray-300"
            >
              <Text className="text-lg text-gray-900">
                {formData.billingStatus === "billable" ? t.createTask.billable
                  : formData.billingStatus === "non_billable" ? t.createTask.nonBillable
                  : t.createTask.billed}
              </Text>
              <Ionicons name="chevron-forward" size={20} color="#6b7280" />
            </Pressable>
          </InputField>

          {/* Project Selection - Read Only */}
          <InputField label={t.createTask.project} error={errors.projectId}>
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
                  : t.createTask.selectProject
                }
              </Text>
              <Ionicons name="lock-closed" size={16} color="#9ca3af" />
            </View>
          </InputField>

          {/* Priority */}
          <InputField label={t.tasks.priority}>
            <Pressable
              onPress={() => setShowPriorityPicker(true)}
              className="border rounded-lg px-3 py-3 bg-white flex-row items-center justify-between"
            >
              <Text className="text-lg text-gray-900 flex-1">
                {t.tasks[formData.priority as keyof typeof t.tasks] || formData.priority}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#6b7280" />
            </Pressable>
          </InputField>

          {/* Category */}
          <InputField label={t.tasks.category}>
            <Pressable
              onPress={() => setShowCategoryPicker(true)}
              className="border rounded-lg px-3 py-3 bg-white flex-row items-center justify-between"
            >
              <Text className="text-lg text-gray-900 flex-1">
                {t.tasks[formData.category as keyof typeof t.tasks] || formData.category}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#6b7280" />
            </Pressable>
          </InputField>

          {/* Due Date */}
          <InputField label={t.tasks.dueDate} error={errors.dueDate}>
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
                {dateFormatter.formatDateWithWeekday(formData.dueDate)}
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
                locale={dateFormatter.locale}
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
                  <Text className="text-white font-semibold">{t.common.done}</Text>
                </Pressable>
              </View>
            </View>
          )}

          {/* Assign To */}
          <InputField label={t.tasks.assignTo} error={errors.assignedTo}>
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
                  ? t.createTask.loadingUsers
                  : selectedUsers.length > 0 
                    ? t.createTask.usersSelected(selectedUsers.length)
                    : t.createTask.selectUsersToAssign
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
              <Text className="text-sm font-medium text-gray-700 mb-2">{t.createTask.selectedUsers}</Text>
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
                {t.createTask.attachments}
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
              <Text className="text-gray-600 font-medium mt-3">{t.createTask.tapToAddFiles}</Text>
              <Text className="text-gray-400 text-base mt-1">
                {formData.attachments.length === 0 ? t.createTask.noAttachmentsAdded : t.createTask.filesAdded(formData.attachments.length)}
              </Text>
            </Pressable>
          </View>

          {/* Create Task Button */}
          <View className="mt-6 mb-6">
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
                  ? (editTaskId ? t.createTask.updating : t.createTask.creating) 
                  : (editTaskId ? t.createTask.updateTaskButton : t.createTask.createTaskButton)
                }
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Priority Picker Modal */}
      <Modal
        visible={showPriorityPicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPriorityPicker(false)}
      >
        <SafeAreaView edges={['bottom', 'left', 'right']} className="flex-1 bg-gray-50">
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
              {t.createTask.selectPriority}
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
                    "text-lg font-medium flex-1",
                    colors.text
                  )}>
                    {t.tasks[priority as keyof typeof t.tasks] || priority}
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
        <SafeAreaView edges={['bottom', 'left', 'right']} className="flex-1 bg-gray-50">
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
              {t.createTask.selectBillingStatus}
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
                {t.createTask.nonBillable}
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
                {t.createTask.billable}
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
                {t.createTask.billed}
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
        <SafeAreaView edges={['bottom', 'left', 'right']} className="flex-1 bg-gray-50">
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
              {t.createTask.selectCategory}
            </Text>
          </View>

          <ScrollView className="flex-1 px-6 py-4">
            {(["general", "safety", "electrical", "plumbing", "structural", "materials", "commercial"] as TaskCategory[]).map((category) => (
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
                  "text-lg font-medium flex-1",
                  formData.category === category ? "text-blue-900" : "text-gray-900"
                )}>
                  {t.tasks[category as keyof typeof t.tasks] || category}
                </Text>
                <Ionicons 
                  name={
                    category === "safety" ? "shield-checkmark" :
                    category === "electrical" ? "flash" :
                    category === "plumbing" ? "water" :
                    category === "structural" ? "hammer" :
                    category === "materials" ? "cube" :
                    category === "commercial" ? "logo-usd" :
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
        <SafeAreaView edges={['bottom', 'left', 'right']} className="flex-1 bg-gray-50">
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
              {t.createTask.selectProject}
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
                    {project.location || t.createTask.noLocation}
                  </Text>
                </View>
                <Ionicons name="folder-outline" size={24} color={formData.projectId === project.id ? "#3b82f6" : "#6b7280"} />
              </Pressable>
            ))}
            
            {userProjects.length === 0 && (
              <View className="bg-white border border-gray-200 rounded-lg p-8 items-center">
                <Ionicons name="folder-open-outline" size={48} color="#9ca3af" />
                <Text className="text-gray-500 text-center mt-2">
                  {t.createTask.noProjectsAvailable}
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
        <SafeAreaView edges={['bottom', 'left', 'right']} className="flex-1 bg-gray-50">
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
              {t.createTask.assignTo}
            </Text>
            <Text className="text-base text-blue-600 font-medium">
              {selectedUsers.length} {t.common.selected.toLowerCase()}
            </Text>
          </View>

          {/* Search Bar */}
          <View className="bg-white px-6 py-3 border-b border-gray-200">
            <View className="flex-row items-center bg-gray-100 rounded-lg px-3 py-2">
              <Ionicons name="search" size={20} color="#6b7280" />
              <TextInput
                className="flex-1 ml-2 text-lg text-gray-900"
                placeholder={t.createTask.searchPlaceholder}
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
              {t.createTask.usersAvailable(filteredAssignableUsers.length, userSearchQuery ? allAssignableUsers.length : undefined)}
            </Text>
          </View>

          {/* User List */}
          <ScrollView className="flex-1 px-6 py-4">
            {isLoadingUsers ? (
              // Loading state
              <View className="bg-white border border-gray-200 rounded-lg p-8 items-center">
                <ActivityIndicator size="large" color="#3b82f6" />
                <Text className="text-gray-600 text-center mt-4 font-medium">
                  {t.createTask.loadingUsers}
                </Text>
                <Text className="text-gray-400 text-center mt-2 text-base">
                  {t.createTask.fetchingTeamMembers}
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
                  {t.createTask.noUsersFound}
                </Text>
                <Text className="text-gray-400 text-center mt-1 text-base">
                  {t.createTask.tryAdjustingSearch}
                </Text>
                <Pressable
                  onPress={() => setUserSearchQuery("")}
                  className="mt-4 bg-blue-600 px-4 py-2 rounded-lg"
                >
                  <Text className="text-white font-medium">{t.createTask.clearSearch}</Text>
                </Pressable>
              </View>
            ) : (
              // No users assigned to project
              <View className="bg-white border border-gray-200 rounded-lg p-8 items-center">
                <Ionicons name="people-outline" size={48} color="#9ca3af" />
                <Text className="text-gray-500 text-center mt-3 font-medium">
                  {t.createTask.noUsersAssigned}
                </Text>
                <Text className="text-gray-400 text-center mt-1 text-base">
                  {t.createTask.addTeamMembersFirst}
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
                {t.createTask.doneSelected(selectedUsers.length)}
              </Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Edit Reason Modal - Shown when editing an accepted task */}
      <Modal
        visible={showEditReasonModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowEditReasonModal(false)}
      >
        <SafeAreaView edges={['bottom', 'left', 'right']} className="flex-1 bg-gray-50">
          <StatusBar style="dark" />
          
          <ModalHandle />

          {/* Modal Header */}
          <View className="flex-row items-center bg-white border-b border-gray-200 px-6 py-4">
            <Pressable onPress={() => setShowEditReasonModal(false)} className="mr-4">
              <Ionicons name="close" size={24} color="#374151" />
            </Pressable>
            <Text className="flex-1 text-xl font-semibold text-gray-900">
              {t.taskDetail.editReasonTitle}
            </Text>
          </View>

          {/* Modal Content */}
          <ScrollView className="flex-1 px-6 py-6">
            <Text className="text-base text-gray-700 mb-4">
              {t.taskDetail.editReasonPrompt}
            </Text>

            <TextInput
              value={editReason}
              onChangeText={setEditReason}
              placeholder={t.taskDetail.editReasonPlaceholder}
              placeholderTextColor="#9ca3af"
              multiline
              numberOfLines={6}
              className="bg-white border border-gray-300 rounded-lg p-4 text-gray-900 text-base"
              style={{
                textAlignVertical: 'top',
                minHeight: 120,
              }}
            />
          </ScrollView>

          {/* Modal Footer */}
          <View className="bg-white border-t border-gray-200 px-6 py-4">
            <View className="flex-row gap-3">
              <Pressable
                onPress={() => {
                  setShowEditReasonModal(false);
                  setEditReason("");
                }}
                className="flex-1 bg-gray-200 rounded-lg py-3 items-center"
              >
                <Text className="text-gray-700 font-semibold text-lg">
                  {t.common.cancel}
                </Text>
              </Pressable>
              <Pressable
                onPress={handleEditReasonSubmit}
                disabled={isSubmitting}
                className="flex-1 bg-blue-600 rounded-lg py-3 items-center disabled:opacity-50"
              >
                {isSubmitting ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-white font-semibold text-lg">
                    {t.common.save}
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </SafeAreaView>
      </Modal>

    </SafeAreaView>
  );
}