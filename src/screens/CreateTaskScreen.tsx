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
  Modal as RNModal,
  Image,
  ActivityIndicator,
} from "react-native";

const Modal = RNModal || View;
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import Slider from "@react-native-community/slider";
import * as ImagePicker from "expo-image-picker";
import * as Clipboard from "expo-clipboard";
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import { useAuthStore } from "../state/authStore";
import { useCreateTaskViewAdapter } from "../ui/viewAdapters/useCreateTaskViewAdapter";
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
import ModernUiMarker from "../components/migration/ModernUiMarker";
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

export default function CreateTaskScreen({
  onNavigateBack,
  parentTaskId,
  parentSubTaskId,
  editTaskId,
  actionType,
  uploadedPhotoUrls,
  selectedPhotos: selectedPhotosProp,
  clearForm,
  clearFormTimestamp,
  onNavigateToProfile,
  onNavigateToProjectPicker
}: CreateTaskScreenProps) {
  const effectiveActionType = actionType || (editTaskId ? 'edit' : undefined);

  if (effectiveActionType && effectiveActionType !== 'edit' && editTaskId) {
    return <TaskActionScreen 
      actionType={effectiveActionType} 
      taskId={editTaskId} 
      onNavigateBack={onNavigateBack}
      onNavigateToProfile={onNavigateToProfile}
      onNavigateToProjectPicker={onNavigateToProjectPicker}
    />;
  }

  console.log("InputField is:", InputField); const t = useTranslation();
  const dateFormatter = useDateFormatter();
  const { user } = useAuthStore();
  const { getCompanyBanner } = useCompanyStore();
  const { isFavoriteUser, toggleFavoriteUser } = useUserPreferencesStore();
  const { tasks } = useTaskStore();
  const { getUsersByRole } = useUserStoreWithInit();
  const projectStore = useProjectStoreWithCompanyInit(user?.companyId || "");
  const { getProjectsByUser } = projectStore;

  const scrollViewRef = useRef<ScrollView>(null);
  const titleInputRef = useRef<TextInput>(null);
  const descriptionInputRef = useRef<TextInput>(null);
  const taskReferenceInputRef = useRef<TextInput>(null);

  const { output, actions } = useCreateTaskViewAdapter({
    editTaskId,
    parentTaskId,
    parentSubTaskId,
    clearForm
  });

  const { formData, errors, pickers, readiness, aiAssistant } = output;
  const { updateField, togglePicker, submit, setTextInput, setShowSuggestionPreview, setAcceptedFields, suggestTaskFromText, clearSuggestion } = actions;

  const parentTask = parentTaskId ? tasks.find(t => t.id === parentTaskId) : null;
  const parentSubTask = parentSubTaskId ? tasks.find(t => t.id === parentSubTaskId && t.parentTaskId === parentTaskId) : null;
  const editTask = editTaskId ? tasks.find(t => t.id === editTaskId) : null;
  const userProjects = getProjectsByUser(user?.id || "");
  
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [showEditReasonModal, setShowEditReasonModal] = useState(false);
  const [editReason, setEditReason] = useState("");
  const [llmError, setLLMError] = useState<string | null>(null);

  const clearLLMError = () => setLLMError(null);

  const allAssignableUsers = [
    ...getUsersByRole('admin'),
    ...getUsersByRole('manager'),
    ...getUsersByRole('worker'),
    ...getUsersByRole('member')
  ];
  const filteredAssignableUsers = allAssignableUsers.filter((u) => {
    if (!userSearchQuery) return true;
    const q = userSearchQuery.toLowerCase();
    return (
      (u.name?.toLowerCase() || "").includes(q) ||
      (u.email?.toLowerCase() || "").includes(q)
    );
  });

  const setFormData = (val: any) => {
    if (typeof val === 'function') {
      const next = val(formData as any);
      Object.keys(next).forEach(k => updateField(k as any, next[k]));
    } else {
      Object.keys(val).forEach(k => updateField(k as any, val[k]));
    }
  };

  const handleTitleChange = (val: string) => updateField('title', val);
  const handleDescriptionChange = (val: string) => updateField('description', val);
  const handleTaskReferenceChange = (val: string) => updateField('taskReference', val);
  const handleDateChange = (date: Date) => updateField('dueDate', date);

  const handlePriorityChange = (val: string) => { updateField('priority', val); setShowPriorityPicker(false); };
  const handleCategoryChange = (val: string) => { updateField('category', val); setShowCategoryPicker(false); };
  const handleBillingStatusChange = (val: string) => { updateField('billingStatus', val); setShowBillingStatusPicker(false); };

  const showDatePicker = pickers.showDatePicker;
  const setShowDatePicker = (val: boolean) => togglePicker('showDatePicker', val);
  
  const showPriorityPicker = pickers.showPriorityPicker;
  const setShowPriorityPicker = (val: boolean) => togglePicker('showPriorityPicker', val);
  
  const showCategoryPicker = pickers.showCategoryPicker;
  const setShowCategoryPicker = (val: boolean) => togglePicker('showCategoryPicker', val);
  
  const showBillingStatusPicker = pickers.showBillingStatusPicker;
  const setShowBillingStatusPicker = (val: boolean) => togglePicker('showBillingStatusPicker', val);

  const showProjectPicker = pickers.showProjectPicker;
  const setShowProjectPicker = (val: boolean) => togglePicker('showProjectPicker', val);

  const showUserPicker = pickers.showUserPicker;
  const setShowUserPicker = (val: boolean) => togglePicker('showUserPicker', val);

  const selectedUsers = formData.assignedTo;
  const setSelectedUsers = (val: string[]) => updateField('assignedTo', val);
  
  const handleOpenUserPicker = () => setShowUserPicker(true);
  
  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(
      selectedUsers.includes(userId)
        ? selectedUsers.filter((id) => id !== userId)
        : [...selectedUsers, userId]
    );
  };

  const handleUserSelect = toggleUserSelection;

  const textInput = aiAssistant.textInput;
  const showSuggestionPreview = aiAssistant.showSuggestionPreview;
  const acceptedFields = aiAssistant.acceptedFields;
  const isLLMLoading = aiAssistant.isProcessing;
  // Use lastSuggestion if available, else stub
  const lastSuggestion = (aiAssistant as any).lastSuggestion || {};

  const isUploading = readiness.isUploading;
  const isLoadingUsers = readiness.isLoadingUsers;
  const setIsLoadingUsers = (val: boolean) => {}; // Stub since adapter handles it
  const isSubmitting = readiness.isSubmitting;

  const handleOpenPhotoSelection = () => {};
  const handleAddPhotos = () => {};
  
  const removePhoto = (index: number) => {
    const newAttachments = [...formData.attachments];
    newAttachments.splice(index, 1);
    updateField('attachments', newAttachments);
  };

  const asyncStoragePhotoCount = 0;

  const handleCancel = () => onNavigateBack();
  const handleClearForm = () => {};
  const saveFormDataToStorage = async () => {};

  const performSubmit = async () => {
    await submit();
    onNavigateBack();
  };

  const handleSubmit = performSubmit;
  const handleEditReasonSubmit = async () => {
    setShowEditReasonModal(false);
    await performSubmit();
  };

  useEffect(() => {
    if (selectedPhotosProp && selectedPhotosProp.length > 0) {
      updateField('attachments', [...formData.attachments, ...selectedPhotosProp]);
    }
  }, [selectedPhotosProp]);

  useEffect(() => {
    if (uploadedPhotoUrls && uploadedPhotoUrls.length > 0) {
      updateField('attachments', [...formData.attachments, ...uploadedPhotoUrls]);
    }
  }, [uploadedPhotoUrls]);

  useEffect(() => {
    if (editTask) {
      updateField('title', editTask.title);
      updateField('description', editTask.description || "");
      updateField('taskReference', editTask.taskReference || "");
      updateField('billingStatus', editTask.billingStatus || "non_billable");
      updateField('priority', editTask.priority || "medium");
      updateField('category', editTask.category || "general");
      updateField('dueDate', new Date(editTask.dueDate));
      updateField('projectId', editTask.projectId || "");
      updateField('assignedTo', editTask.assignedTo || []);
      updateField('attachments', editTask.attachments || []);
    }
  }, [editTask]);

  if (!user) return null;
  if (isAdmin(user)) {
    return (
      <SafeAreaView edges={['bottom', 'left', 'right']} className="flex-1 bg-gray-50">
        <StatusBar style="dark" />
        <StandardHeader 
          title={t.tasks.createTask}
          showBackButton={true}
          onBackPress={onNavigateBack}
          rightElement={<ModernUiMarker />}
        />
        <View className="flex-1 items-center justify-center px-6">
          <Text>{t.createTask.adminCannotCreateTasks}</Text>
        </View>
      </SafeAreaView>
    );
  }

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
        rightElement={<ModernUiMarker />}
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
                            setFormData((prev: any) => ({ ...prev, title: lastSuggestion.title! }));
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
                          setFormData((prev: any) => ({ ...prev, description: lastSuggestion.description! }));
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
                          setFormData((prev: any) => ({ ...prev, category: lastSuggestion.category! }));
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
                          setFormData((prev: any) => ({ ...prev, priority: lastSuggestion.priority! }));
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
                          setFormData((prev: any) => ({ ...prev, dueDate: new Date(lastSuggestion.dueDate!) }));
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
                          setFormData((prev: any) => ({ ...prev, billingStatus: lastSuggestion.billingStatus! }));
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
                          setFormData((prev: any) => ({ ...prev, taskReference: lastSuggestion.taskReference! }));
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
                            setFormData((prev: any) => ({
                              ...prev,
                              attachments: prev.attachments.filter((_: any, i: number) => i !== index)
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
                  setFormData((prev: any) => ({ ...prev, projectId: project.id }));
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
  console.log("InputField is:", InputField); const t = useTranslation();
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
            rightElement={<ModernUiMarker />}
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
            rightElement={<ModernUiMarker />}
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
                              photos: prev.photos.filter((_: any, i: number) => i !== index)
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
            rightElement={<ModernUiMarker />}
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
                              photos: prev.photos.filter((_: any, i: number) => i !== index)
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
          rightElement={<ModernUiMarker />}
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
                            photos: prev.photos.filter((_: any, i: number) => i !== index)
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
