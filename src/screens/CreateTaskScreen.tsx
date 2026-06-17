import React, { useState, useCallback, useEffect, useRef } from "react";
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
import Slider from "@react-native-community/slider";
import * as ImagePicker from "expo-image-picker";
import * as Clipboard from "expo-clipboard";
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import { useAuthStore } from "../state/authStore";
import { isAdmin } from "../types/buildtrack";
import { useTaskStore } from "../state/taskStore.supabase";
import { useUserStoreWithInit } from "../state/userStore.supabase";
import { useUserStore } from "../state/userStore.supabase";
import { TaskStatus } from "../types/buildtrack";
import { useProjectStoreWithCompanyInit } from "../state/projectStore.supabase";
import { useProjectFilterStore } from "../state/projectFilterStore";
import { useCompanyStore } from "../state/companyStore";
import { useUserPreferencesStore } from "../state/userPreferencesStore";
import { Priority, TaskCategory, BillingStatus } from "../types/buildtrack";
import { cn } from "../utils/cn";
import ModalHandle from "../components/ModalHandle";
import { notifyDataMutation } from "../utils/DataRefreshManager";
import StandardHeader from "../components/StandardHeader";
import ReassignTaskModal from "../components/ReassignTaskModal";
import { useFileUpload, UploadResults } from "../utils/useFileUpload";
import { usePhotoSelection } from "../utils/usePhotoSelection";
import { useTranslation } from "../utils/useTranslation";
import { useDateFormatter } from "../utils/dateFormatter";
import { useTaskLLMAssistant } from "../hooks/useTaskLLMAssistant";
import { uploadFileWithVerification } from "../api/fileUploadService";
import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from "@react-native-async-storage/async-storage";
// Temporarily disabled due to expo-av CMake build issues
// import VoiceTaskInput, { Language } from "../components/VoiceTaskInput";

// Photo object type (for new photos not yet uploaded)
interface SelectedPhoto {
  uri: string;
  fileName: string;
  isAnnotated: boolean;
  annotatedUri?: string;
}

// Attachment can be either a URL (already uploaded) or a photo object (to be uploaded)
type Attachment = string | SelectedPhoto;

interface CreateTaskScreenProps {
  onNavigateBack: () => void;
  parentTaskId?: string;
  parentSubTaskId?: string;
  editTaskId?: string; // For editing an existing task
  actionType?: 'edit' | 'update' | 'photos' | 'comment' | 'reassign'; // Action type for different task actions
  uploadedPhotoUrls?: string[]; // Photo URLs uploaded from PhotoSelectionScreen (legacy)
  selectedPhotos?: SelectedPhoto[]; // Photo objects selected but not yet uploaded
  clearForm?: boolean; // Flag to clear form when "Create New Task" is pressed
  clearFormTimestamp?: number; // Timestamp to track when clearForm was set
  onNavigateToProfile?: () => void;
  onNavigateToProjectPicker?: (allowBack?: boolean) => void;
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

export default function CreateTaskScreen({ onNavigateBack, parentTaskId, parentSubTaskId, editTaskId, actionType, uploadedPhotoUrls, selectedPhotos: selectedPhotosProp, clearForm, clearFormTimestamp, onNavigateToProfile, onNavigateToProjectPicker }: CreateTaskScreenProps) {
  // Only default to 'edit' if editTaskId is provided, otherwise it's a new task
  const effectiveActionType = actionType || (editTaskId ? 'edit' : undefined);
  
  // Track if we've processed clearForm to prevent multiple clears
  const clearFormProcessedRef = React.useRef<number | undefined>(undefined);
  
  // Debug: Log the props received
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎯 [CreateTaskScreen] Props received:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎯 [CreateTaskScreen] Props:', {
    editTaskId,
    parentTaskId,
    parentSubTaskId,
    actionType,
    effectiveActionType,
    hasEditTaskId: !!editTaskId,
    hasSelectedPhotosProp: !!selectedPhotosProp,
    selectedPhotosPropCount: selectedPhotosProp?.length || 0,
    clearForm,
    clearFormProcessed: clearFormProcessedRef.current,
  });
  if (selectedPhotosProp && selectedPhotosProp.length > 0) {
    console.log('📸 [CreateTaskScreen] ✅ Received selectedPhotosProp:', selectedPhotosProp.length, 'photos');
  } else {
    console.log('📸 [CreateTaskScreen] ❌ No selectedPhotosProp received');
  }
  
  // For non-edit actions, show full-screen implementations
  // These provide the tab switch transition experience
  if (effectiveActionType && effectiveActionType !== 'edit' && editTaskId) {
    return <TaskActionScreen 
      actionType={effectiveActionType} 
      taskId={editTaskId} 
      onNavigateBack={onNavigateBack}
      onNavigateToProfile={onNavigateToProfile}
      onNavigateToProjectPicker={onNavigateToProjectPicker}
    />;
  }

  const t = useTranslation();
  const dateFormatter = useDateFormatter();
  const { user } = useAuthStore();
  const { createTask, createSubTask, createNestedSubTask, updateTask, tasks, fetchTaskById } = useTaskStore();
  const { getUsersByRole, getUserById } = useUserStoreWithInit();
  const projectStore = useProjectStoreWithCompanyInit(user?.companyId || "");
  const { getProjectsByUser, getProjectUserAssignments, fetchProjectUserAssignments } = projectStore;
  const { selectedProjectId } = useProjectFilterStore();
  const { pickAndUploadImages, isUploading, isCompressing } = useFileUpload();
  const { showPhotoSelectionDialog } = usePhotoSelection();
  const navigation = useNavigation<any>();
  const route = useRoute();
  const { getCompanyBanner } = useCompanyStore();
  const { isFavoriteUser, toggleFavoriteUser } = useUserPreferencesStore();

  // Get parent task information if creating a sub-task
  const parentTask = parentTaskId ? tasks.find(t => t.id === parentTaskId) : null;
  // Note: subTasks are now in the unified tasks table with parentTaskId, not nested
  const parentSubTask = parentSubTaskId ? tasks.find(t => t.id === parentSubTaskId && t.parentTaskId === parentTaskId) : null;

  // ScrollView ref for scrolling to top
  const scrollViewRef = useRef<ScrollView>(null);
  
  // Ref to track if we're returning with photos (to prevent form reset)
  const returningWithPhotosRef = useRef(false);
  
  // Ref to track if we're restoring form data (to prevent reset during restoration)
  const isRestoringFormDataRef = useRef(false);
  
  // Ref to track processed photo URIs to avoid duplicates
  const processedPhotoUrisRef = useRef<Set<string>>(new Set());
  
  // Refs for TextInput fields to enable Tab key navigation
  const titleInputRef = useRef<TextInput>(null);
  const descriptionInputRef = useRef<TextInput>(null);
  const taskReferenceInputRef = useRef<TextInput>(null);
  
  // Key for storing form data in AsyncStorage
  const FORM_DATA_STORAGE_KEY = '@createTask_formData';
  const SELECTED_USERS_STORAGE_KEY = '@createTask_selectedUsers';

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

  // Combined handler: Restore form data and prevent form reset
  // This MUST run in the correct order to prevent form reset before restoration
  // 
  // PHOTO HANDLING FLOW:
  // 1. Photos come from PhotoSelectionScreen via navigation params
  // 2. Navigation goes to "CreateTaskMain" which uses CreateTaskMainScreen wrapper
  // 3. CreateTaskMainScreen extracts selectedPhotos from route.params and stores in state
  // 4. CreateTaskMainScreen passes selectedPhotos as prop (selectedPhotosProp) to CreateTaskScreen
  // 5. useEffect([selectedPhotosProp]) handles adding photos to formData (see below)
  useFocusEffect(
    useCallback(() => {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🔄 [CreateTask] useFocusEffect - SCREEN FOCUSED');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      // FIRST: If clearForm flag is set, clear everything (fresh "Create New Task")
      // Use timestamp to ensure we process each clearForm request only once
      const shouldClearForm = clearForm && clearFormTimestamp && clearFormProcessedRef.current !== clearFormTimestamp;
      if (shouldClearForm) {
        console.log('🔄 [CreateTask] clearForm flag detected - clearing form and AsyncStorage', {
          clearFormTimestamp,
          previousProcessed: clearFormProcessedRef.current,
        });
        clearFormProcessedRef.current = clearFormTimestamp; // Mark this timestamp as processed
        AsyncStorage.removeItem(FORM_DATA_STORAGE_KEY).catch(() => {});
        AsyncStorage.removeItem(SELECTED_USERS_STORAGE_KEY).catch(() => {});
        setFormData(getInitialFormData());
        setSelectedUsers([]);
        setErrors({});
        setUserSearchQuery("");
        setShowUserPicker(false);
        setShowPriorityPicker(false);
        setShowCategoryPicker(false);
        setShowProjectPicker(false);
        setShowDatePicker(false);
        setAsyncStoragePhotoCount(0);
        isRestoringFormDataRef.current = false;
        returningWithPhotosRef.current = false;
        processedPhotoUrisRef.current.clear();
        // Clear the flag after handling
        navigation.setParams({ clearForm: undefined, _timestamp: undefined });
        return; // Exit early - don't restore or reset
      }
      
      // Check if we're returning with photos (from props) - check multiple times as props may arrive late
      let hasPhotos = !!(selectedPhotosProp && Array.isArray(selectedPhotosProp) && selectedPhotosProp.length > 0);
      if (hasPhotos) {
        returningWithPhotosRef.current = true;
        console.log('📸 [CreateTask] Detected photos in props, preventing form reset');
      }
      
      // SECOND: Check for stored form data IMMEDIATELY and set flag to prevent reset
      const checkAndRestoreFormData = async () => {
        try {
          // Set flag immediately to prevent form reset while we check
          isRestoringFormDataRef.current = true;
          
          const storedFormData = await AsyncStorage.getItem(FORM_DATA_STORAGE_KEY);
          const storedSelectedUsers = await AsyncStorage.getItem(SELECTED_USERS_STORAGE_KEY);
          
          // Check for photos in AsyncStorage for debug info
          if (storedFormData) {
            try {
              const parsedFormData = JSON.parse(storedFormData);
              const photoCount = parsedFormData.attachments?.length || 0;
              setAsyncStoragePhotoCount(photoCount);
              console.log('💾 [CreateTask] AsyncStorage has photos:', photoCount);
            } catch (e) {
              setAsyncStoragePhotoCount(null);
              console.log('💾 [CreateTask] Could not parse AsyncStorage for photo count');
            }
          } else {
            setAsyncStoragePhotoCount(0);
            console.log('💾 [CreateTask] No AsyncStorage data found');
          }
          
          if (storedFormData && storedSelectedUsers) {
            console.log('💾 [CreateTask] Found stored form data, restoring...');
            console.log('💾 [CreateTask] Stored data preview:', {
              hasFormData: !!storedFormData,
              hasUsers: !!storedSelectedUsers,
              formDataLength: storedFormData.length,
            });
            
            const parsedFormData = JSON.parse(storedFormData);
            const parsedSelectedUsers = JSON.parse(storedSelectedUsers);
            
            // CRITICAL: Convert dueDate string back to Date object (JSON.parse doesn't restore Date objects)
            if (parsedFormData.dueDate) {
              parsedFormData.dueDate = new Date(parsedFormData.dueDate);
            }
            
            console.log('💾 [CreateTask] Restoring form data:', {
              title: parsedFormData.title,
              description: parsedFormData.description,
              attachments: parsedFormData.attachments?.length || 0,
              selectedUsers: parsedSelectedUsers.length,
              dueDate: parsedFormData.dueDate instanceof Date ? parsedFormData.dueDate.toISOString() : 'Invalid date',
            });
            
            // Restore form data IMMEDIATELY
            // IMPORTANT: Merge with existing form data to preserve any user input that might have been entered
            // This prevents form data from being lost if user entered data after saving to AsyncStorage
            setFormData(prev => {
              // Preserve existing form data if it has user input (non-empty fields)
              const hasExistingData = prev.title || prev.description || prev.projectId || prev.assignedTo?.length > 0;
              
              if (hasExistingData) {
                console.log('💾 [CreateTask] Merging restored data with existing form data');
                // Merge: use restored data as base, but preserve existing user input if it exists
                const merged = {
                  ...parsedFormData,
                  title: prev.title || parsedFormData.title,
                  description: prev.description || parsedFormData.description,
                  taskReference: prev.taskReference || parsedFormData.taskReference,
                  billingStatus: prev.billingStatus || parsedFormData.billingStatus,
                  priority: prev.priority || parsedFormData.priority,
                  category: prev.category || parsedFormData.category,
                  dueDate: prev.dueDate || parsedFormData.dueDate,
                  projectId: prev.projectId || parsedFormData.projectId,
                  assignedTo: prev.assignedTo?.length > 0 ? prev.assignedTo : parsedFormData.assignedTo,
                };
                
                // Merge attachments: keep existing attachments and add restored ones (avoid duplicates)
                const existingAttachments = prev.attachments || [];
                const restoredAttachments = parsedFormData.attachments || [];
                const existingUris = new Set(
                  existingAttachments.map(att => typeof att === 'string' ? att : att.uri)
                );
                const newRestoredAttachments = restoredAttachments.filter((att: any) => {
                  const uri = typeof att === 'string' ? att : att.uri;
                  return !existingUris.has(uri);
                });
                merged.attachments = [...existingAttachments, ...newRestoredAttachments];
                
                console.log('💾 [CreateTask] Merged form data:', {
                  title: merged.title,
                  description: merged.description,
                  attachments: merged.attachments.length,
                });
                
                return merged;
              } else {
                // No existing data, just restore from storage
                // Merge attachments: keep existing attachments and add restored ones (avoid duplicates)
                const existingAttachments = prev.attachments || [];
                const restoredAttachments = parsedFormData.attachments || [];
                const existingUris = new Set(
                  existingAttachments.map(att => typeof att === 'string' ? att : att.uri)
                );
                const newRestoredAttachments = restoredAttachments.filter((att: any) => {
                  const uri = typeof att === 'string' ? att : att.uri;
                  return !existingUris.has(uri);
                });
                const mergedAttachments = [...existingAttachments, ...newRestoredAttachments];
                
                console.log('💾 [CreateTask] Restoring form data (no existing data to merge):', {
                  existingCount: existingAttachments.length,
                  restoredCount: restoredAttachments.length,
                  mergedCount: mergedAttachments.length,
                });
                
                return {
                  ...parsedFormData,
                  attachments: mergedAttachments, // Use merged attachments
                };
              }
            });
            setSelectedUsers(parsedSelectedUsers);
            
            // IMPORTANT: Do NOT clear AsyncStorage after restoring
            // Keep data in AsyncStorage so it persists if user exits form (draft functionality)
            // Only clear AsyncStorage after successful task creation/update (see performSubmit)
            setAsyncStoragePhotoCount(0); // Clear the count after restoration
            console.log('✅ [CreateTask] Form data restored (keeping in AsyncStorage for draft)');
            
            // Reset flag after restoration completes
            setTimeout(() => {
              isRestoringFormDataRef.current = false;
            }, 500);
          } else {
            // No stored data, clear flag
            console.log('⏸️ [CreateTask] No stored form data found');
            isRestoringFormDataRef.current = false;
          }
        } catch (error) {
          console.error('❌ [CreateTask] Failed to restore form data:', error);
          isRestoringFormDataRef.current = false;
        }
      };
      
      // Start restoration IMMEDIATELY - set flag first to prevent reset
      isRestoringFormDataRef.current = true;
      checkAndRestoreFormData();
      
      // THIRD: Check if we should reset the form
      // NOTE: Form reset only happens if no stored data, no photos, and not editing
      // This ensures form data persists when user exits (draft functionality)
      // Only reset if NOT editing, NOT creating subtask, NOT returning with photos, and NOT restoring
      // Use a longer timeout to ensure async restoration completes first AND props have time to arrive
      setTimeout(() => {
        // Re-check for photos in case props arrived late
        const hasPhotosNow = !!(selectedPhotosProp && Array.isArray(selectedPhotosProp) && selectedPhotosProp.length > 0);
        if (hasPhotosNow) {
          hasPhotos = true;
          returningWithPhotosRef.current = true;
        }
        
        // Re-check flags after async operations have had time to complete
        const shouldReset = 
          !editTaskId && 
          !parentTaskId && 
          !hasPhotos && 
          !hasPhotosNow &&
          !isRestoringFormDataRef.current;
        
        if (shouldReset) {
          // Double-check AsyncStorage one more time before resetting (safety check)
          AsyncStorage.getItem(FORM_DATA_STORAGE_KEY).then(storedData => {
            // Final check - only reset if no stored data AND not restoring AND no photos
            const finalHasPhotos = !!(selectedPhotosProp && Array.isArray(selectedPhotosProp) && selectedPhotosProp.length > 0);
            if (!storedData && !isRestoringFormDataRef.current && !finalHasPhotos) {
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
            } else {
              console.log('⏸️ [CreateTask] Skipping form reset - stored data found, restoration in progress, or photos detected');
            }
          }).catch(() => {
            // If check fails, don't reset (safer to preserve data)
            console.log('⏸️ [CreateTask] Skipping form reset - error checking storage');
          });
        } else {
          if (editTaskId) {
            console.log('📝 Edit mode - not resetting form on focus');
          } else if (hasPhotos || hasPhotosNow) {
            console.log('📸 Returning with photos - not resetting form on focus');
          } else if (isRestoringFormDataRef.current) {
            console.log('💾 Restoring form data - not resetting form on focus');
          }
          
          // Reset flag after a short delay
          setTimeout(() => {
            returningWithPhotosRef.current = false;
          }, 100);
        }
      }, 500); // Longer delay to ensure async restoration completes AND props have time to arrive
    }, [selectedPhotosProp, parentTaskId, editTaskId, clearForm, navigation])
  );

  // Handle uploaded photo URLs from PhotoSelectionScreen (legacy - for UpdateProgressScreen)
  // Check both props and route params
  useEffect(() => {
    // First check props (from wrapper)
    if (uploadedPhotoUrls && Array.isArray(uploadedPhotoUrls) && uploadedPhotoUrls.length > 0) {
      console.log('✅ [CreateTask] Received uploaded photos from props:', uploadedPhotoUrls);
      // Add uploaded photos to form attachments (avoid duplicates)
      setFormData(prev => {
        const existingUrls = new Set(
          prev.attachments.map(att => typeof att === 'string' ? att : att.uri)
        );
        const newUrls = uploadedPhotoUrls.filter(url => !existingUrls.has(url));
        if (newUrls.length > 0) {
          console.log('✅ [CreateTask] Adding new photos to attachments:', newUrls);
          return {
            ...prev,
            attachments: [...prev.attachments, ...newUrls],
          };
        }
        return prev;
      });
    }
  }, [uploadedPhotoUrls]);

  // REMOVED: Navigation listener for route.params.selectedPhotos
  // Photos come via selectedPhotosProp (from CreateTaskMainScreen wrapper), not route.params

  // PRIMARY HANDLER: Watch selectedPhotosProp (photos passed as props from CreateTaskMainScreen wrapper)
  // This is the ONLY handler needed - photos come from the wrapper as props, not route.params
  useEffect(() => {
    if (selectedPhotosProp && Array.isArray(selectedPhotosProp) && selectedPhotosProp.length > 0) {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📸 [CreateTask] useEffect: Received selectedPhotosProp:', selectedPhotosProp.length, 'photos');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      // Use a delay to ensure this runs after form restoration from AsyncStorage
      setTimeout(() => {
        setFormData(prev => {
          const existingUris = new Set(
            prev.attachments.map(att => typeof att === 'string' ? att : (att.uri || ''))
          );
          
          const newPhotos = selectedPhotosProp.filter((photo: SelectedPhoto) => {
            const uri = photo.annotatedUri || photo.uri || '';
            const isNew = !existingUris.has(uri) && !existingUris.has(photo.uri) && !processedPhotoUrisRef.current.has(uri);
            if (isNew) {
              processedPhotoUrisRef.current.add(uri);
              processedPhotoUrisRef.current.add(photo.uri || '');
            } else {
              console.log(`⏭️ [CreateTask] Skipping duplicate photo: ${photo.fileName}`);
            }
            return isNew;
          });
          
          if (newPhotos.length > 0) {
            console.log('✅ [CreateTask] Adding', newPhotos.length, 'photos to attachments');
            const updated = {
              ...prev,
              attachments: [...prev.attachments, ...newPhotos],
            };
            console.log('✅ [CreateTask] Updated attachments:', updated.attachments.length);
            return updated;
          }
          return prev;
        });
      }, 400); // Delay to ensure AsyncStorage restoration completes first
    }
  }, [selectedPhotosProp]);

  // Check AsyncStorage for photos when route params change (for debug display only)
  useEffect(() => {
    const checkAsyncStorage = async () => {
      try {
        const storedFormData = await AsyncStorage.getItem(FORM_DATA_STORAGE_KEY);
        if (storedFormData) {
          const parsedFormData = JSON.parse(storedFormData);
          const photoCount = parsedFormData.attachments?.length || 0;
          setAsyncStoragePhotoCount(photoCount);
          console.log('💾 [CreateTask] AsyncStorage has photos:', photoCount);
        } else {
          setAsyncStoragePhotoCount(0);
        }
      } catch (e) {
        console.log('💾 [CreateTask] Could not check AsyncStorage for photos');
      }
    };
    checkAsyncStorage();
  }, [route.params]);

  useFocusEffect(
    useCallback(() => {
      // Also check route params (for navigation-based updates)
      const params = route.params as any;
      if (params?.uploadedPhotoUrls && Array.isArray(params.uploadedPhotoUrls) && params.uploadedPhotoUrls.length > 0) {
        console.log('✅ [CreateTask] Received uploaded photos from route params:', params.uploadedPhotoUrls);
        // Add uploaded photos to form attachments (avoid duplicates)
        setFormData(prev => {
          const existingUrls = new Set(prev.attachments);
          const newUrls = params.uploadedPhotoUrls.filter((url: string) => !existingUrls.has(url));
          if (newUrls.length > 0) {
            console.log('✅ [CreateTask] Adding new photos to attachments from route:', newUrls);
            return {
              ...prev,
              attachments: [...prev.attachments, ...newUrls],
            };
          }
          return prev;
        });
        // Clear the params to prevent re-adding
        navigation.setParams({ uploadedPhotoUrls: undefined });
      }
    }, [route.params, navigation])
  );

  // Monitor attachments changes for debugging
  useEffect(() => {
    // Safety check: ensure formData and attachments exist
    if (!formData || !formData.attachments) {
      console.log('⏸️ [CreateTask] formData or attachments not yet initialized');
      return;
    }
    
    console.log('🔍 [CreateTask] Attachments state changed:', {
      count: formData.attachments.length,
      attachments: formData.attachments.map((att, idx) => ({
        index: idx,
        type: typeof att,
        uri: typeof att === 'string' ? (att.length > 50 ? att.substring(0, 50) + '...' : att) : (att.uri.length > 50 ? att.uri.substring(0, 50) + '...' : att.uri),
        fileName: typeof att === 'string' ? 'URL' : att.fileName,
        isAnnotated: typeof att === 'string' ? false : att.isAnnotated,
        hasAnnotatedUri: typeof att === 'string' ? false : !!att.annotatedUri,
      })),
    });
    }, []);

  // Also check when screen comes into focus (in case task was just created)
  useFocusEffect(
    useCallback(() => {
      // Scroll to top when screen is focused (for both new task and edit task)
      if (scrollViewRef.current) {
        // Use setTimeout to ensure the ScrollView is fully rendered
        setTimeout(() => {
          scrollViewRef.current?.scrollTo({ y: 0, animated: false });
        }, 100);
      }

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
      attachments: (editTask.attachments || []).map(url => url as Attachment), // URLs are strings
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
      attachments: [] as Attachment[],
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
  const [asyncStoragePhotoCount, setAsyncStoragePhotoCount] = useState<number | null>(null);
  
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
  
  // Helper function to save form data to AsyncStorage
  const saveFormDataToStorage = useCallback(async () => {
    try {
      await AsyncStorage.setItem(FORM_DATA_STORAGE_KEY, JSON.stringify(formData));
      await AsyncStorage.setItem(SELECTED_USERS_STORAGE_KEY, JSON.stringify(selectedUsers));
      console.log('💾 [CreateTask] Form data saved to AsyncStorage:', {
        title: formData.title,
        description: formData.description,
        attachments: formData?.attachments?.length || 0,
        selectedUsers: selectedUsers.length,
      });
    } catch (error: any) {
      console.error('❌ [CreateTask] Failed to save form data to AsyncStorage:', error);
    }
  }, [formData, selectedUsers]);

  // Pre-fetch users when "Assign To" button is pressed (before modal opens)
  // Also save form data before opening picker
  const handleOpenUserPicker = useCallback(async () => {
    // Save form data before opening picker (in case user navigates away)
    await saveFormDataToStorage();
    
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
  }, [formData.projectId, fetchProjectUserAssignments, getProjectUserAssignments, saveFormDataToStorage]);

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
    setFormData(prev => {
      const updated = { ...prev, title: text };
      // Auto-save to AsyncStorage when form fields change (debounced)
      setTimeout(async () => {
        try {
          await AsyncStorage.setItem(FORM_DATA_STORAGE_KEY, JSON.stringify(updated));
          await AsyncStorage.setItem(SELECTED_USERS_STORAGE_KEY, JSON.stringify(selectedUsers));
        } catch (error) {
          // Silent fail for auto-save
        }
      }, 500);
      return updated;
    });
  }, [selectedUsers]);

  const handleDescriptionChange = useCallback((text: string) => {
    setFormData(prev => {
      const updated = { ...prev, description: text };
      // Auto-save to AsyncStorage when form fields change (debounced)
      setTimeout(async () => {
        try {
          await AsyncStorage.setItem(FORM_DATA_STORAGE_KEY, JSON.stringify(updated));
          await AsyncStorage.setItem(SELECTED_USERS_STORAGE_KEY, JSON.stringify(selectedUsers));
        } catch (error) {
          // Silent fail for auto-save
        }
      }, 500);
      return updated;
    });
  }, [selectedUsers]);

  const handleTaskReferenceChange = useCallback((text: string) => {
    setFormData(prev => {
      const updated = { ...prev, taskReference: text };
      // Auto-save to AsyncStorage when form fields change (debounced)
      setTimeout(async () => {
        try {
          await AsyncStorage.setItem(FORM_DATA_STORAGE_KEY, JSON.stringify(updated));
          await AsyncStorage.setItem(SELECTED_USERS_STORAGE_KEY, JSON.stringify(selectedUsers));
        } catch (error) {
          // Silent fail for auto-save
        }
      }, 500);
      return updated;
    });
  }, [selectedUsers]);

  const handleBillingStatusChange = useCallback(async (status: BillingStatus) => {
    setFormData(prev => ({ ...prev, billingStatus: status }));
    setShowBillingStatusPicker(false);
    // Save form data after picker closes
    await saveFormDataToStorage();
  }, [saveFormDataToStorage]);

  const handlePriorityChange = useCallback(async (priority: Priority) => {
    setFormData(prev => ({ ...prev, priority }));
    // Save form data after selection
    await saveFormDataToStorage();
  }, [saveFormDataToStorage]);

  const handleCategoryChange = useCallback(async (category: TaskCategory) => {
    setFormData(prev => ({ ...prev, category }));
    // Save form data after selection
    await saveFormDataToStorage();
  }, [saveFormDataToStorage]);

  const handleDateChange = useCallback(async (date: Date) => {
    setFormData(prev => ({ ...prev, dueDate: date }));
    // Save form data after date selection
    await saveFormDataToStorage();
  }, [saveFormDataToStorage]);

  const toggleUserSelection = useCallback(async (userId: string) => {
    const newSelectedUsers = selectedUsers.includes(userId)
      ? selectedUsers.filter(id => id !== userId)
      : [...selectedUsers, userId];
    setSelectedUsers(newSelectedUsers);
    // Update formData.assignedTo to match
    setFormData(prev => {
      const updated = { ...prev, assignedTo: newSelectedUsers };
      // Save form data after user selection changes
      saveFormDataToStorage();
      return updated;
    });
  }, [selectedUsers, saveFormDataToStorage]);

  const handleAddPhotos = async () => {
    if (!user) return;

    // CRITICAL: Save form data to AsyncStorage BEFORE navigating away
    console.log('💾 [CreateTask] Saving form data to AsyncStorage before photo selection');
    try {
      await AsyncStorage.setItem(FORM_DATA_STORAGE_KEY, JSON.stringify(formData));
      await AsyncStorage.setItem(SELECTED_USERS_STORAGE_KEY, JSON.stringify(selectedUsers));
      console.log('✅ [CreateTask] Form data saved to AsyncStorage:', {
        title: formData.title,
        description: formData.description,
        attachments: formData?.attachments?.length || 0,
        selectedUsers: selectedUsers.length,
      });
    } catch (error: any) {
      console.error('❌ [CreateTask] Failed to save form data to AsyncStorage:', error);
      Alert.alert(
        "Error",
        "Failed to save form data. Your data may be lost when selecting photos. Please try again."
      );
      return; // Don't navigate if we can't save
    }

    // For new tasks, we need a temporary task ID
    // For editing tasks, use the existing task ID
    const taskId = editTaskId || `temp-${Date.now()}`;

    // Use unified photo selection utility
    showPhotoSelectionDialog({
      onPhotosSelected: (photos) => {
        // Ensure photos are serializable (only include necessary fields)
        const serializablePhotos = photos.map(photo => ({
          uri: photo.uri,
          fileName: photo.fileName,
          isAnnotated: photo.isAnnotated || false,
          // Don't include annotatedUri in initial params - it will be set later if needed
        }));

        // Defer navigation to avoid conflicts with Alert dialog
        // Use requestAnimationFrame to ensure navigation happens after Alert is dismissed
        requestAnimationFrame(() => {
          setTimeout(() => {
            try {
              if (!navigation || !navigation.navigate) {
                console.error('❌ [CreateTask] Navigation object not available');
                Alert.alert("Error", "Navigation is not available. Please try again.");
                return;
              }

              // Navigate to PhotoSelectionScreen
              // Use 'task' entityType when editing, 'task-update' for new tasks
              const entityType = editTaskId ? 'task' : 'task-update';
              navigation.navigate("PhotoSelection", {
                taskId: taskId,
                subTaskId: undefined,
                companyId: user.companyId,
                userId: user.id,
                initialCompletionPercentage: 0,
                initialPhotos: serializablePhotos,
                returnScreen: 'CreateTask',
                parentTaskId: parentTaskId,
                parentSubTaskId: parentSubTaskId,
                editTaskId: editTaskId,
                actionType: actionType,
                entityType: entityType, // Pass entityType to PhotoSelectionScreen
                uploadImmediately: false, // Don't upload immediately - wait for task save
              });
            } catch (error: any) {
              console.error('❌ [CreateTask] Navigation error:', error);
              Alert.alert(
                "Navigation Error",
                `Failed to open photo selection: ${error.message || 'Unknown error'}\n\nPlease try again.`
              );
            }
          }, 100); // Small delay to ensure Alert is fully dismissed
        });
      },
      allowClipboard: true,
      allowMultiple: true,
    });
  };

  // Early returns AFTER all hooks
  if (!user) return null;

  // Admin users should not be able to create tasks
  if (isAdmin(user)) {
    return (
      <SafeAreaView edges={['bottom', 'left', 'right']} className="flex-1 bg-gray-50">
        <StatusBar style="dark" />
        
        {/* Standard Header */}
        <StandardHeader 
          title={t.tasks.createTask}
          showBackButton={true}
          onBackPress={onNavigateBack}
          onNavigateToProfile={onNavigateToProfile}
          onNavigateToProjectPicker={onNavigateToProjectPicker}
        />

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

    // Ensure dueDate is a Date object for comparison
    const dueDateForValidation = formData.dueDate instanceof Date ? formData.dueDate : new Date(formData.dueDate);
    if (dueDateForValidation <= new Date()) {
      newErrors.dueDate = t.validation.dueDateFuture;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Upload photo objects to Supabase and return URLs
  const uploadPhotoObjects = async (photos: SelectedPhoto[], taskId: string): Promise<string[]> => {
    if (!user || photos.length === 0) return [];

    const uploadedUrls: string[] = [];
    const entityType = editTaskId ? 'task' : 'task-update';

    console.log(`📤 [CreateTask] Uploading ${photos.length} photo object(s) before task save...`);

    for (let i = 0; i < photos.length; i++) {
      const photo = photos[i];
      try {
        const uriToUpload = photo.annotatedUri || photo.uri;
        
        // Check if file exists
        const fileInfo = await FileSystem.getInfoAsync(uriToUpload);
        if (!fileInfo.exists) {
          console.error(`❌ [CreateTask] File not found: ${photo.fileName}`);
          continue;
        }

        const result = await uploadFileWithVerification({
          file: {
            uri: uriToUpload,
            name: photo.fileName,
            type: 'image/jpeg',
          },
          entityType: entityType,
          entityId: taskId,
          companyId: user.companyId,
          userId: user.id,
        });

        if (result.success && result.file) {
          console.log(`✅ [CreateTask] Photo ${i + 1} uploaded: ${result.file.public_url}`);
          uploadedUrls.push(result.file.public_url);
        } else {
          console.error(`❌ [CreateTask] Photo ${i + 1} upload failed: ${result.error}`);
        }
      } catch (error: any) {
        console.error(`❌ [CreateTask] Photo ${i + 1} upload exception:`, error);
      }
    }

    return uploadedUrls;
  };

  const performSubmit = async (providedEditReason?: string) => {
    setIsSubmitting(true);

    try {
      let taskId: string;
      let successMessage: string;

      // Separate attachments into URLs (already uploaded) and photo objects (to be uploaded)
      const attachmentUrls: string[] = [];
      const photoObjects: SelectedPhoto[] = [];
      
      formData.attachments.forEach(att => {
        if (typeof att === 'string') {
          attachmentUrls.push(att);
        } else {
          photoObjects.push(att);
        }
      });

      // For new tasks, we need to create the task first to get a task ID for photo uploads
      // For editing, we can use the existing task ID
      const targetTaskId = editTaskId || `temp-${Date.now()}`;

      // Upload photo objects if any
      let uploadedPhotoUrls: string[] = [];
      if (photoObjects.length > 0) {
        console.log(`📤 [CreateTask] Uploading ${photoObjects.length} photo(s) before task save...`);
        uploadedPhotoUrls = await uploadPhotoObjects(photoObjects, targetTaskId);
        
        if (uploadedPhotoUrls.length < photoObjects.length) {
          const failedCount = photoObjects.length - uploadedPhotoUrls.length;
          Alert.alert(
            "Upload Warning",
            `${uploadedPhotoUrls.length} of ${photoObjects.length} photo(s) uploaded successfully. ${failedCount} photo(s) failed to upload. The task will be saved with the successfully uploaded photos.`
          );
        }
      }

      // Combine existing URLs with newly uploaded URLs
      const allAttachmentUrls = [...attachmentUrls, ...uploadedPhotoUrls];

      if (editTaskId) {
        // Editing existing task
        
        // VALIDATION: Prevent changing assignees once task is accepted
        if (editTask) {
          const isTaskAccepted = editTask.status === "accepted" || 
                                editTask.status === "in_progress" ||
                                editTask.accepted === true;
          
          // Check if assignees are actually changing
          const currentAssignees = (editTask.assignedTo || []).map(String).sort().join(',');
          const newAssignees = selectedUsers.map(String).sort().join(',');
          const assigneesChanged = currentAssignees !== newAssignees;
          
          if (isTaskAccepted && assigneesChanged) {
            Alert.alert(
              t.errors.error || "Cannot Change Assignees",
              "Cannot change assignees once a task has been accepted. Please reassign the task before it is accepted, or decline it first."
            );
            setIsSubmitting(false);
            return;
          }
        }
        
        // Normalize user IDs to strings to prevent type mismatches
        const normalizedAssignedTo = selectedUsers.map(id => String(id));
        
        // Ensure dueDate is a Date object before calling toISOString
        const dueDateForUpdate = formData.dueDate instanceof Date 
          ? formData.dueDate 
          : new Date(formData.dueDate);
        
        const updatePayload: any = {
          title: formData.title,
          description: formData.description,
          taskReference: formData.taskReference || undefined,
          billingStatus: formData.billingStatus,
          priority: formData.priority,
          category: formData.category,
          dueDate: dueDateForUpdate.toISOString(),
          assignedTo: normalizedAssignedTo,
          attachments: allAttachmentUrls, // Use combined URLs
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
        // Normalize user IDs to strings to prevent type mismatches
        const normalizedAssignedTo = selectedUsers.map(id => String(id));
        const normalizedAssignedBy = String(user.id);
        
        // Debug: Check for ID mismatches when self-assigning subtasks
        if (normalizedAssignedTo.includes(normalizedAssignedBy)) {
          console.log('🔍 [SELF-ASSIGN DEBUG] Creating self-assigned subtask:', {
            assignedBy: normalizedAssignedBy,
            assignedByType: typeof user.id,
            assignedTo: normalizedAssignedTo,
            assignedToTypes: selectedUsers.map(id => typeof id),
            userId: user.id,
            userIdType: typeof user.id,
            selectedUsersRaw: selectedUsers,
            match: normalizedAssignedTo.includes(normalizedAssignedBy)
          });
        }
        
        // Ensure dueDate is a Date object before calling toISOString
        const dueDateForSubTask = formData.dueDate instanceof Date 
          ? formData.dueDate 
          : new Date(formData.dueDate);
        
        const subTaskPayload = {
          title: formData.title,
          description: formData.description,
          taskReference: formData.taskReference || undefined,
          billingStatus: formData.billingStatus,
          priority: formData.priority,
          category: formData.category,
          dueDate: dueDateForSubTask.toISOString(),
          assignedTo: normalizedAssignedTo,
          assignedBy: normalizedAssignedBy,
          attachments: allAttachmentUrls, // Use combined URLs
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
        
        // If there are photo objects, upload them now that we have the real task ID
        if (photoObjects.length > 0 && taskId) {
          console.log(`📤 [CreateTask] Uploading ${photoObjects.length} photo(s) for subtask ${taskId}...`);
          const subtaskUploadedUrls = await uploadPhotoObjects(photoObjects, taskId);
          if (subtaskUploadedUrls.length > 0) {
            // Update the subtask with the uploaded photo URLs
            await updateTask(taskId, {
              attachments: [...allAttachmentUrls, ...subtaskUploadedUrls],
            });
          }
        }
      } else {
        // Creating a regular task
        console.log('📋 [Create Task] About to create task with attachments:', allAttachmentUrls);
        console.log('📋 [Create Task] Attachments count:', allAttachmentUrls.length);
        
        // Normalize user IDs to strings to prevent type mismatches
        const normalizedAssignedTo = selectedUsers.map(id => String(id));
        const normalizedAssignedBy = String(user.id);
        
        // Debug: Check for ID mismatches when self-assigning
        if (normalizedAssignedTo.includes(normalizedAssignedBy)) {
          console.log('🔍 [SELF-ASSIGN DEBUG] Creating self-assigned task:', {
            assignedBy: normalizedAssignedBy,
            assignedByType: typeof user.id,
            assignedTo: normalizedAssignedTo,
            assignedToTypes: selectedUsers.map(id => typeof id),
            userId: user.id,
            userIdType: typeof user.id,
            selectedUsersRaw: selectedUsers,
            match: normalizedAssignedTo.includes(normalizedAssignedBy)
          });
        }
        
        // Ensure dueDate is a Date object before calling toISOString
        const dueDateForTask = formData.dueDate instanceof Date 
          ? formData.dueDate 
          : new Date(formData.dueDate);
        
        // Create task first (with existing URLs if any)
        taskId = await createTask({
          title: formData.title,
          description: formData.description,
          taskReference: formData.taskReference || undefined,
          billingStatus: formData.billingStatus,
          priority: formData.priority,
          category: formData.category,
          dueDate: dueDateForTask.toISOString(),
          assignedTo: normalizedAssignedTo,
          assignedBy: normalizedAssignedBy,
          attachments: attachmentUrls, // Start with existing URLs only
          projectId: formData.projectId,
        });
        
        // If there are photo objects, upload them now that we have the real task ID
        if (photoObjects.length > 0 && taskId) {
          console.log(`📤 [CreateTask] Uploading ${photoObjects.length} photo(s) for task ${taskId}...`);
          const taskUploadedUrls = await uploadPhotoObjects(photoObjects, taskId);
          if (taskUploadedUrls.length > 0) {
            // Update the task with the uploaded photo URLs
            await updateTask(taskId, {
              attachments: [...attachmentUrls, ...taskUploadedUrls],
            });
          }
        }
        
        successMessage = t.createTask.taskCreatedSuccess;
      }

      console.log(`=== TASK ${editTaskId ? 'UPDATE' : 'CREATION'} DEBUG ===`);
      console.log('- Task ID:', taskId);
      console.log('- Assigned to users:', selectedUsers);
      console.log('- Project ID:', formData.projectId);
      console.log('- Attachments (final URLs):', allAttachmentUrls);
      console.log('- Assigned by:', user.id);
      console.log('- Parent Task ID:', parentTaskId);
      console.log('- Parent Sub-Task ID:', parentSubTaskId);
      console.log('===========================');

      // Notify all users about the task change
      notifyDataMutation('task');

      // Clear AsyncStorage after successful task creation/update
      // This ensures form is clean for next task creation
      await AsyncStorage.removeItem(FORM_DATA_STORAGE_KEY);
      await AsyncStorage.removeItem(SELECTED_USERS_STORAGE_KEY);
      console.log('✅ [CreateTask] Form data cleared from AsyncStorage after successful task save');

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
        onNavigateToProfile={onNavigateToProfile}
        onNavigateToProjectPicker={onNavigateToProjectPicker}
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
          ref={scrollViewRef}
          className="flex-1 px-6 py-4" 
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 100 }}
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

          {/* Text Input for Manual Entry - HIDDEN FOR NOW */}
          {false && (
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
          )}

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
                testID="createTask-title"
                ref={titleInputRef}
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
                onSubmitEditing={() => {
                  // Move focus to description field
                  descriptionInputRef.current?.focus();
                }}
                blurOnSubmit={false}
              />
          </InputField>

          {/* Description */}
          <InputField label={t.tasks.description} error={errors.description}>
              <TextInput
                testID="createTask-description"
                ref={descriptionInputRef}
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
                returnKeyType="next"
                onSubmitEditing={() => {
                  // Move focus to task reference field
                  taskReferenceInputRef.current?.focus();
                }}
                blurOnSubmit={false}
              />
          </InputField>

          {/* Task Reference # */}
          <InputField label={t.createTask.taskReference} required={false}>
              <TextInput
                ref={taskReferenceInputRef}
                className="border rounded-lg px-3 py-3 text-lg text-gray-900 bg-white border-gray-300"
                placeholder={t.createTask.taskReferencePlaceholder}
                value={formData.taskReference}
                onChangeText={handleTaskReferenceChange}
                maxLength={50}
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={() => {
                  // Dismiss keyboard when done with task reference
                  taskReferenceInputRef.current?.blur();
                }}
                blurOnSubmit={true}
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
              testID="createTask-priority-open"
              onPress={async () => {
                await saveFormDataToStorage();
                setShowPriorityPicker(true);
              }}
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
              onPress={async () => {
                await saveFormDataToStorage();
                setShowCategoryPicker(true);
              }}
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
              onPress={async () => {
                await saveFormDataToStorage();
                setShowDatePicker(!showDatePicker);
              }}
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
            {(() => {
              // Check if task is accepted - if so, disable assignee editing
              const isTaskAccepted = editTask && (
                editTask.status === "accepted" || 
                editTask.status === "in_progress" ||
                editTask.accepted === true
              );
              const isDisabled = isLoadingUsers || isTaskAccepted;
              
              return (
                <Pressable
                  onPress={handleOpenUserPicker}
                  disabled={isDisabled}
                  className={cn(
                    "border rounded-lg px-3 py-3 flex-row items-center justify-between",
                    isTaskAccepted ? "bg-gray-100" : "bg-white",
                    errors.assignedTo ? "border-red-300" : "border-gray-300",
                    isDisabled && "opacity-50"
                  )}
                >
                  <Text className={cn(
                    "text-lg",
                    isTaskAccepted ? "text-gray-500" : "text-gray-900"
                  )}>
                    {isLoadingUsers 
                      ? t.createTask.loadingUsers
                      : isTaskAccepted
                        ? t.createTask.assigneesLocked || "Assignees cannot be changed (task accepted)"
                      : selectedUsers.length > 0 
                        ? t.createTask.usersSelected(selectedUsers.length)
                        : t.createTask.selectUsersToAssign
                    }
                  </Text>
                  {isLoadingUsers ? (
                    <Ionicons name="hourglass-outline" size={20} color="#6b7280" />
                  ) : isTaskAccepted ? (
                    <Ionicons name="lock-closed" size={20} color="#9ca3af" />
                  ) : (
                    <Ionicons 
                      name="chevron-forward" 
                      size={20} 
                      color="#6b7280" 
                    />
                  )}
                </Pressable>
              );
            })()}
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
              {/* Debug: Show attachment count */}
              {formData && formData.attachments && (
                <Text className="text-xs text-gray-500 ml-2">
                  ({formData.attachments.length} {formData.attachments.length === 1 ? 'item' : 'items'})
                </Text>
              )}
              {/* Debug: Show AsyncStorage photo count */}
              {asyncStoragePhotoCount !== null && asyncStoragePhotoCount > 0 && (
                <Text className="text-xs text-amber-600 ml-2">
                  (Storage: {asyncStoragePhotoCount})
                </Text>
              )}
            </View>
            
            {formData && formData.attachments && (() => {
              console.log('🔍 [CreateTask] Rendering attachments section:', {
                attachmentsCount: formData.attachments.length,
                attachments: formData.attachments.map((att, idx) => ({
                  index: idx,
                  type: typeof att,
                  uri: typeof att === 'string' ? att : att.uri,
                  fileName: typeof att === 'string' ? 'URL' : att.fileName,
                })),
              });
              return null;
            })()}
            
            {formData && formData.attachments && formData.attachments.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3">
                <View className="flex-row">
                  {formData.attachments.map((attachment, index) => {
                    // Handle both URLs (string) and photo objects
                    const photoUri = typeof attachment === 'string' ? attachment : (attachment.annotatedUri || attachment.uri);
                    const isNotUploaded = typeof attachment !== 'string';
                    
                    // Debug logging
                    if (isNotUploaded) {
                      console.log(`📸 [CreateTask] Rendering pending photo ${index}:`, {
                        uri: attachment.uri,
                        fileName: attachment.fileName,
                        isAnnotated: attachment.isAnnotated,
                        annotatedUri: attachment.annotatedUri,
                        photoUri,
                      });
                    }
                    
                    return (
                      <View key={`attachment-${index}-${typeof attachment === 'string' ? attachment : attachment.uri}`} className="mr-3 relative">
                        <Image
                          source={{ 
                            uri: photoUri,
                            // Ensure proper caching for local files
                            cache: Platform.OS === 'ios' ? 'force-cache' : 'default'
                          }}
                          className="w-24 h-24 rounded-lg bg-gray-100"
                          resizeMode="cover"
                          onError={(error) => {
                            console.error(`❌ [CreateTask] Failed to load image ${index}:`, {
                              uri: photoUri,
                              originalUri: typeof attachment === 'string' ? attachment : attachment.uri,
                              annotatedUri: typeof attachment === 'string' ? undefined : attachment.annotatedUri,
                              error: error.nativeEvent?.error || error,
                              attachmentType: typeof attachment,
                              fileName: typeof attachment === 'string' ? 'URL' : attachment.fileName,
                              platform: Platform.OS,
                            });
                          }}
                          onLoad={() => {
                            console.log(`✅ [CreateTask] Successfully loaded image ${index}:`, {
                              uri: photoUri.substring(0, 50) + '...',
                              fileName: typeof attachment === 'string' ? 'URL' : attachment.fileName,
                            });
                          }}
                        />
                        {isNotUploaded && (
                          <View className="absolute top-1 left-1 bg-amber-500 rounded px-1.5 py-0.5">
                            <Text className="text-white text-xs font-semibold">Pending</Text>
                          </View>
                        )}
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
                    );
                  })}
                </View>
              </ScrollView>
            ) : null}
            
            <Pressable
              testID="createTask-add-photos"
              onPress={handleAddPhotos}
              className="flex-row items-center justify-between border-2 border-dashed border-gray-300 rounded-lg px-4 py-3 bg-gray-50"
            >
              <View className="flex-row items-center flex-1">
                <Ionicons name="cloud-upload-outline" size={20} color="#9ca3af" />
                <Text className="text-gray-600 font-medium ml-2 text-sm">
                  {formData && formData.attachments && formData.attachments.length === 0 ? t.createTask.tapToAddFiles : (formData && formData.attachments ? t.createTask.filesAdded(formData.attachments.length) : t.createTask.tapToAddFiles)}
                </Text>
              </View>
              {formData && formData.attachments && formData.attachments.length > 0 && (
                <Ionicons name="checkmark-circle" size={20} color="#10b981" />
              )}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Fixed Bottom Bar with Create Task Button */}
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
            testID="createTask-submit"
            onPress={handleSubmit}
            disabled={isSubmitting}
            className={cn(
              "w-full rounded-xl py-3 px-4 flex-row items-center justify-center",
              isSubmitting 
                ? "bg-gray-300" 
                : "bg-blue-600"
            )}
          >
            <Ionicons 
              name={editTaskId ? "checkmark-circle-outline" : "add-circle-outline"} 
              size={18} 
              color="white" 
            />
            <Text className="text-white font-semibold text-base ml-2">
              {isSubmitting 
                ? (editTaskId ? t.createTask.updating : t.createTask.creating) 
                : (editTaskId ? t.createTask.updateTaskButton : t.createTask.createTaskButton)
              }
            </Text>
          </Pressable>
        </SafeAreaView>
      </View>

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
                  testID={`createTask-priority-${priority}`}
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

// TaskActionScreen - Handles non-edit actions (update, photos, comment, reassign)
function TaskActionScreen({ 
  actionType, 
  taskId, 
  onNavigateBack,
  onNavigateToProfile,
  onNavigateToProjectPicker,
}: { 
  actionType: 'update' | 'photos' | 'comment' | 'reassign';
  taskId: string;
  onNavigateBack: () => void;
  onNavigateToProfile?: () => void;
  onNavigateToProjectPicker?: (allowBack?: boolean) => void;
}) {
  const t = useTranslation();
  const { user } = useAuthStore();
  const tasks = useTaskStore(state => state.tasks);
  const fetchTaskById = useTaskStore(state => state.fetchTaskById);
  const addTaskUpdate = useTaskStore(state => state.addTaskUpdate);
  const addAssignerComment = useTaskStore(state => state.addAssignerComment);
  const updateTask = useTaskStore(state => state.updateTask);
  const { getUserById } = useUserStore();
  const projectStore = useProjectStoreWithCompanyInit(user?.companyId || "");
  const { getProjectUserAssignments } = projectStore;
  const { isFavoriteUser, toggleFavoriteUser } = useUserPreferencesStore();
  const { pickAndUploadImages } = useFileUpload();
  const { showPhotoSelectionDialog } = usePhotoSelection();
  const navigation = useNavigation<any>();

  const task = tasks.find(t => t.id === taskId);
  
  // Update form state
  const [updateForm, setUpdateForm] = useState({
    description: "",
    photos: [] as string[],
    completionPercentage: task?.completionPercentage || 0,
    status: (task?.status || "in_progress") as TaskStatus,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [failedUploadsInSession, setFailedUploadsInSession] = useState<Array<{ fileName: string; error: string; originalFile: any }>>([]);

  // Comment form state
  const [commentForm, setCommentForm] = useState({
    description: "",
    photos: [] as string[],
  });
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);


  // Initialize form when task loads
  useEffect(() => {
    if (task && actionType === 'update') {
      setUpdateForm(prev => ({
        ...prev,
        completionPercentage: task.completionPercentage || 0,
      }));
    }
  }, [task, actionType]);

  // Fetch task on mount
  useEffect(() => {
    if (taskId) {
      fetchTaskById(taskId);
    }
  }, [taskId, fetchTaskById]);

  const handleAddPhotos = async () => {
    if (!user || !task) return;

    // Use unified photo selection utility
    showPhotoSelectionDialog({
      onPhotosSelected: (photos) => {
        // Ensure photos are serializable (only include necessary fields)
        const serializablePhotos = photos.map(photo => ({
          uri: photo.uri,
          fileName: photo.fileName,
          isAnnotated: photo.isAnnotated || false,
        }));

        // Defer navigation to avoid conflicts with Alert dialog
        requestAnimationFrame(() => {
          setTimeout(() => {
            try {
              if (!navigation || !navigation.navigate) {
                console.error('❌ [TaskActionScreen] Navigation object not available');
                Alert.alert("Error", "Navigation is not available. Please try again.");
                return;
              }

              // Navigate to PhotoSelectionScreen
              navigation.navigate("PhotoSelection", {
                taskId: task.id,
                subTaskId: undefined,
                companyId: user.companyId,
                userId: user.id,
                initialCompletionPercentage: task.completionPercentage || 0,
                initialPhotos: serializablePhotos,
                returnScreen: actionType === 'update' ? 'UpdateProgress' : actionType === 'comment' ? 'AddComment' : 'CreateTask',
                actionType: actionType,
              });
            } catch (error: any) {
              console.error('❌ [TaskActionScreen] Navigation error:', error);
              Alert.alert(
                "Navigation Error",
                `Failed to open photo selection: ${error.message || 'Unknown error'}\n\nPlease try again.`
              );
            }
          }, 100);
        });
      },
      allowClipboard: true,
      allowMultiple: true,
    });
  };

  const handleSubmitUpdate = async () => {
    if (!updateForm.description.trim()) {
      Alert.alert("Error", "Please provide a description for this update");
      return;
    }

    if (!user || !task) return;

    setIsSubmitting(true);

    try {
      const calculatedStatus: TaskStatus = 
        (task.status === "accepted" || task.status === "in_progress" || task.status === "submitted_for_review") ? 
          "in_progress" :
        task.status || "in_progress";

      await addTaskUpdate(task.id, {
        description: updateForm.description,
        photos: updateForm.photos,
        completionPercentage: updateForm.completionPercentage,
        status: calculatedStatus,
        userId: user.id,
      });

      await fetchTaskById(task.id);

      Alert.alert("Success", updateForm.completionPercentage === 100 
        ? "🎉 Task marked as 100% complete! You can submit it for review when ready."
        : t.taskDetail.progressUpdateAdded);
      
      onNavigateBack();
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to submit update");
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

      await fetchTaskById(task.id);
      Alert.alert("Success", "Comment added successfully");
      onNavigateBack();
    } catch (error: any) {
      console.error('Error adding comment:', error);
      Alert.alert("Error", error.message || "Failed to add comment");
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleReassignTask = async (selectedUserIds: string[]) => {
    if (selectedUserIds.length === 0) {
      Alert.alert(t.errors.error, t.taskDetail.selectUsers);
      return;
    }

    if (!task) return;

    try {
      await updateTask(task.id, {
        assignedTo: selectedUserIds,
        accepted: false,
        status: "new" as TaskStatus,
        declineReason: undefined,
      });

      Alert.alert(
        t.taskDetail.taskReassigned,
        `${t.taskDetail.taskReassigned} ${selectedUserIds.length} ${t.phrases.users}.`,
        [{ text: t.common.ok, onPress: onNavigateBack }]
      );
    } catch (error) {
      console.error("Error reassigning task:", error);
      Alert.alert(t.errors.error, t.taskDetail.taskReassigned);
    }
  };

  if (!task) {
    return (
      <View className="flex-1 bg-gray-50">
        <SafeAreaView edges={['top']} className="flex-1">
          <StandardHeader
            title={actionType === 'update' ? 'Update Progress' : 
                   actionType === 'photos' ? 'Add Photos' :
                   actionType === 'comment' ? 'Add Comment' :
                   actionType === 'reassign' ? 'Reassign Task' : 'Task Actions'}
            onBackPress={onNavigateBack}
            onNavigateToProfile={onNavigateToProfile}
            onNavigateToProjectPicker={onNavigateToProjectPicker}
          />
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text className="text-gray-500 mt-4">Loading task...</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // Render based on action type
  if (actionType === 'update') {
    return (
      <View className="flex-1 bg-gray-50">
        <SafeAreaView edges={['top']} className="flex-1">
          <StandardHeader
            title={t.taskDetail.progressUpdate}
            onBackPress={onNavigateBack}
            onNavigateToProfile={onNavigateToProfile}
            onNavigateToProjectPicker={onNavigateToProjectPicker}
          />
          <ScrollView className="flex-1 px-6 py-4" contentContainerStyle={{ paddingBottom: 100 }}>
            {/* Photos Section */}
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
                className="flex-row items-center justify-between border-2 border-dashed border-gray-300 rounded-lg px-4 py-3 bg-gray-50"
              >
                <View className="flex-row items-center flex-1">
                  <Ionicons name="cloud-upload-outline" size={20} color="#9ca3af" />
                  <Text className="text-gray-600 font-medium ml-2 text-sm">{t.taskDetail.tapToAddFiles}</Text>
                </View>
                {updateForm.photos.length > 0 && (
                  <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                )}
              </Pressable>
            </View>

            {/* Description */}
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
                style={{ height: 120 }}
              />
            </View>

            {/* Completion Percentage */}
            <View className="mb-6">
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-xl font-semibold text-gray-900">
                  {t.taskDetail.completionPercentage}
                </Text>
                <Text className="text-3xl font-bold text-blue-600">
                  {updateForm.completionPercentage}%
                </Text>
              </View>
              
              <Slider
                style={{ width: '100%', height: 40 }}
                minimumValue={0}
                maximumValue={100}
                step={5}
                value={updateForm.completionPercentage}
                onValueChange={(value: number) => setUpdateForm(prev => ({ ...prev, completionPercentage: value }))}
                minimumTrackTintColor="#3b82f6"
                maximumTrackTintColor="#d1d5db"
                thumbTintColor="#3b82f6"
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
                <Ionicons name="checkmark-circle-outline" size={18} color="white" />
                <Text className="text-white font-semibold text-base ml-2">
                  {isSubmitting ? t.common.loading : t.taskDetail.submitUpdate}
                </Text>
              </Pressable>
            </SafeAreaView>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  if (actionType === 'comment') {
    return (
      <View className="flex-1 bg-gray-50">
        <SafeAreaView edges={['top']} className="flex-1">
          <StandardHeader
            title="Add Comment"
            onBackPress={onNavigateBack}
            onNavigateToProfile={onNavigateToProfile}
            onNavigateToProjectPicker={onNavigateToProjectPicker}
          />
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
                onPress={handleAddPhotos}
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
                onPress={handleSubmitComment}
                disabled={isSubmittingComment || !commentForm.description.trim()}
                className={cn(
                  "w-full rounded-xl py-3 px-4 flex-row items-center justify-center",
                  (isSubmittingComment || !commentForm.description.trim()) ? "bg-gray-300" : "bg-indigo-600"
                )}
              >
                <Ionicons name="send-outline" size={18} color="white" />
                <Text className="text-white font-semibold text-base ml-2">
                  {isSubmittingComment ? t.common.loading : "Post"}
                </Text>
              </Pressable>
            </SafeAreaView>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  if (actionType === 'reassign') {
    return (
      <View className="flex-1 bg-transparent">
        <ReassignTaskModal
          visible={true}
          taskId={taskId}
          onClose={onNavigateBack}
          onReassign={handleReassignTask}
        />
      </View>
    );
  }

  // Photos action - same as update but just for photos
  return (
    <View className="flex-1 bg-gray-50">
      <SafeAreaView edges={['top']} className="flex-1">
        <StandardHeader
          title="Add Photos"
          onBackPress={onNavigateBack}
          onNavigateToProfile={onNavigateToProfile}
          onNavigateToProjectPicker={onNavigateToProjectPicker}
        />
        <ScrollView className="flex-1 px-6 py-4" contentContainerStyle={{ paddingBottom: 100 }}>
          <View className="mb-6">
            <Text className="text-xl font-semibold text-gray-900 mb-3">
              Photos
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
              className="flex-row items-center justify-between border-2 border-dashed border-gray-300 rounded-lg px-4 py-3 bg-gray-50"
            >
              <View className="flex-row items-center flex-1">
                <Ionicons name="cloud-upload-outline" size={20} color="#9ca3af" />
                <Text className="text-gray-600 font-medium ml-2 text-sm">Tap to add photos</Text>
              </View>
              {commentForm.photos.length > 0 && (
                <Ionicons name="checkmark-circle" size={20} color="#10b981" />
              )}
            </Pressable>
          </View>
        </ScrollView>

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
              onPress={() => {
                Alert.alert("Success", "Photos added. You can now submit an update with these photos.");
                onNavigateBack();
              }}
              className="w-full rounded-xl py-3 px-4 flex-row items-center justify-center bg-blue-600"
            >
              <Ionicons name="checkmark-circle-outline" size={18} color="white" />
              <Text className="text-white font-semibold text-base ml-2">
                Done
              </Text>
            </Pressable>
          </SafeAreaView>
        </View>
      </SafeAreaView>
    </View>
  );
}
