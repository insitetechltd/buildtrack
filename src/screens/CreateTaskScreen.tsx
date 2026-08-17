import React, { useState, useCallback, useEffect, useMemo, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  type NativeSyntheticEvent,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Modal as RNModal,
  ActivityIndicator,
  type TextInputKeyPressEventData,
} from "react-native";

const Modal = RNModal || View;
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import TextField from "@/components/primitives/input/TextField";
import { buildFormTextFieldContract } from "@/ui/mappers/formTextField";
import {
  type NavigationProp,
  useFocusEffect,
  useNavigation,
  useRoute,
} from "@react-navigation/native";
import { useAuthStore } from "../state/authStore";
import { useCreateTaskViewAdapter } from "../ui/viewAdapters/useCreateTaskViewAdapter";
import { isAdmin } from "../types/buildtrack";
import { useTaskStore } from "../state/taskStore.supabase";
import { useUserStore } from "../state/userStore.supabase";
import { useProjectStoreWithCompanyInit } from "../state/projectStore.supabase";
import { useCompanyStore } from "../state/companyStore";
import { useUserPreferencesStore } from "../state/userPreferencesStore";
import { Priority, TaskCategory, BillingStatus, TaskStatus } from "../types/buildtrack";
import { cn } from "../utils/cn";
import ModalHandle from "../components/ModalHandle";
import { notifyDataMutation } from "../utils/DataRefreshManager";
import ModernScreenHeader from "../components/ModernScreenHeader";
import CompletionPercentageDialer from "../components/ui/CompletionPercentageDialer";
import FileUploadHarness from "../components/ui/FileUploadHarness";
import { useFileUpload, UploadResults } from "../utils/useFileUpload";
import { usePhotoSelection } from "../utils/usePhotoSelection";
import { useTranslation } from "../utils/useTranslation";
import { useDateFormatter } from "../utils/dateFormatter";
import { useTaskLLMAssistant } from "../hooks/useTaskLLMAssistant";
import { uploadFileWithVerification } from "../api/fileUploadService";
import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from "@react-native-async-storage/async-storage";
import type {
  CameraLaunchContext,
  CameraPostCaptureDefault,
  InAppLibraryPickerParams,
  PhotoSelectionParams,
} from "../navigation/navigationTypes";
import CreateTaskAttachmentSection from "./createTask/CreateTaskAttachmentSection";
import CreateTaskSuggestionPreview from "./createTask/CreateTaskSuggestionPreview";
import {
  createFormNavigationRegistry,
  getNextFocusableFieldId,
  getPreviousFocusableFieldId,
  getTabNavigationDirection,
} from "../utils/formNavigation";
// Temporarily disabled due to expo-av CMake build issues
// import VoiceTaskInput, { Language } from "../components/VoiceTaskInput";

// Photo object type (for new photos not yet uploaded)
interface SelectedPhoto {
  uri: string;
  fileName: string;
  isAnnotated: boolean;
  annotatedUri?: string;
  caption?: string;
  mediaLibraryAssetId?: string;
}

// Attachment can be either a URL (already uploaded) or a photo object (to be uploaded)
type Attachment = string | SelectedPhoto;

interface CreateTaskScreenProps {
  onNavigateBack: () => void;
  onCreateSuccess?: () => void;
  parentTaskId?: string;
  parentSubTaskId?: string;
  editTaskId?: string; // For editing an existing task
  actionType?: 'edit' | 'update' | 'photos' | 'comment' | 'reassign'; // Action type for different task actions
  cameraLaunchContext?: CameraLaunchContext;
  postCaptureDefault?: CameraPostCaptureDefault;
  updateTargetSubTaskId?: string;
  uploadedPhotoUrls?: string[]; // Photo URLs uploaded from PhotoSelectionScreen (legacy)
  selectedPhotos?: SelectedPhoto[]; // Photo objects selected but not yet uploaded
  onClearDraftPayloads?: () => void;
  clearForm?: boolean; // Flag to clear form when "Create New Task" is pressed
  clearFormTimestamp?: number; // Timestamp to track when clearForm was set
  onNavigateToProfile?: () => void;
  onNavigateToProjectPicker?: (allowBack?: boolean) => void;
}

type CreateTaskFormFieldId = "title" | "description" | "taskReference" | "submit";

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
  <View testID="create-task__input-field">
    <Text className="mb-2 text-lg font-semibold text-slate-900">
      {label} {required && <Text className="text-red-600">*</Text>}
    </Text>
    {children}
    {error && (
      <Text className="mt-1 text-base text-red-500">{error}</Text>
    )}
  </View>
);

export default function CreateTaskScreen({
  onNavigateBack,
  onCreateSuccess,
  parentTaskId,
  parentSubTaskId,
  editTaskId,
  actionType,
  cameraLaunchContext,
  postCaptureDefault,
  updateTargetSubTaskId,
  uploadedPhotoUrls,
  selectedPhotos: selectedPhotosProp,
  onClearDraftPayloads,
  clearForm,
  clearFormTimestamp,
  onNavigateToProfile,
  onNavigateToProjectPicker
}: CreateTaskScreenProps) {
  return (
    <CreateTaskEditorScreen
      onNavigateBack={onNavigateBack}
      onCreateSuccess={onCreateSuccess}
      parentTaskId={parentTaskId}
      parentSubTaskId={parentSubTaskId}
      editTaskId={editTaskId}
      actionType={actionType || (editTaskId ? "edit" : undefined)}
      cameraLaunchContext={cameraLaunchContext}
      postCaptureDefault={postCaptureDefault}
      updateTargetSubTaskId={updateTargetSubTaskId}
      uploadedPhotoUrls={uploadedPhotoUrls}
      selectedPhotos={selectedPhotosProp}
      onClearDraftPayloads={onClearDraftPayloads}
      clearForm={clearForm}
      clearFormTimestamp={clearFormTimestamp}
      onNavigateToProfile={onNavigateToProfile}
      onNavigateToProjectPicker={onNavigateToProjectPicker}
    />
  );
}

function CreateTaskEditorScreen({
  onNavigateBack,
  onCreateSuccess,
  parentTaskId,
  parentSubTaskId,
  editTaskId,
  actionType,
  cameraLaunchContext,
  postCaptureDefault,
  updateTargetSubTaskId,
  uploadedPhotoUrls,
  selectedPhotos: selectedPhotosProp,
  onClearDraftPayloads,
  clearForm,
  clearFormTimestamp,
  onNavigateToProfile,
  onNavigateToProjectPicker
}: CreateTaskScreenProps) {
  const t = useTranslation();
  const dateFormatter = useDateFormatter();
  const { user } = useAuthStore();
  const { getCompanyBanner } = useCompanyStore();
  const { isFavoriteUser, toggleFavoriteUser } = useUserPreferencesStore();
  const { getAllUsers } = useUserStore();
  const navigation = useNavigation<
    NavigationProp<{
      PhotoSelection: PhotoSelectionParams;
      InAppLibraryPicker: InAppLibraryPickerParams;
    }>
  >();
  const { showPhotoSelectionDialog } = usePhotoSelection();

  const scrollViewRef = useRef<ScrollView>(null);
  const titleInputRef = useRef<TextInput>(null);
  const descriptionInputRef = useRef<TextInput>(null);
  const taskReferenceInputRef = useRef<TextInput>(null);
  const [activeFormFocusTarget, setActiveFormFocusTarget] = useState<CreateTaskFormFieldId | null>(null);
  const [submitSuccessState, setSubmitSuccessState] = useState<null | {
    title: string;
    message: string;
  }>(null);
  const [tagDraft, setTagDraft] = useState("");
  const shouldShowPostCaptureRoutingSheet =
    actionType === "photos" &&
    cameraLaunchContext === "global" &&
    Boolean(selectedPhotosProp?.length || uploadedPhotoUrls?.length);
  const [captureRoutingChoice, setCaptureRoutingChoice] = useState<"create_task" | "existing_task">(
    postCaptureDefault === "existing_task" ? "existing_task" : "create_task",
  );

  const { output, actions } = useCreateTaskViewAdapter({
    editTaskId,
    parentTaskId,
    parentSubTaskId,
    clearForm,
    clearFormTimestamp,
  });

  const { formData, errors, pickers, activity, aiAssistant, context, assigneePicker, locationPicker, containerOrganization, projects, modals } = output;
  const {
    updateField,
    togglePicker,
    submit,
    setTextInput,
    setUserSearchQuery,
    toggleUserSelection,
    setPrimaryAssignee,
    addCustomTag,
    removeCustomTag,
    removeAttachment,
    mergeIncomingAttachments,
    setShowSuggestionPreview,
    saveLocationOnSiteSelection,
    expandContainerOrganization,
    setContainerId,
    setSubContainerId,
    addProjectContainer,
    setContainerDraft,
    setShowEditReasonModal,
    setEditReason,
    clearError,
    toggleSuggestionField,
    dismissSuggestionPreview,
    suggestTaskFromText,
  } = actions;

  const handleTitleChange = (val: string) => updateField('title', val);
  const handleDescriptionChange = (val: string) => updateField('description', val);
  const handleTaskReferenceChange = (val: string) => updateField('taskReference', val);
  const handleDateChange = (date: Date) => updateField('dueDate', date);

  const handlePriorityChange = (val: string) => {
    updateField("priority", val);
    setShowPriorityPicker(false);
  };
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
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [isEnteringCustomLocation, setIsEnteringCustomLocation] = useState(false);
  const [customLocationDraft, setCustomLocationDraft] = useState('');

  const selectedUsers = assigneePicker.selectedUserIds;
  const formNavigationRegistry = useMemo(
    () =>
      createFormNavigationRegistry([
        { fieldId: "title", isFocusable: true },
        { fieldId: "description", isFocusable: true },
        { fieldId: "taskReference", isFocusable: true },
        { fieldId: "submit", isFocusable: true },
      ]),
    [],
  );

  const focusFormField = useCallback((fieldId: CreateTaskFormFieldId | null) => {
    if (!fieldId) {
      return;
    }

    setActiveFormFocusTarget(fieldId);

    if (fieldId === "submit") {
      titleInputRef.current?.blur?.();
      descriptionInputRef.current?.blur?.();
      taskReferenceInputRef.current?.blur?.();
      return;
    }

    const focusTargetMap: Record<Exclude<CreateTaskFormFieldId, "submit">, React.RefObject<TextInput | null>> = {
      title: titleInputRef,
      description: descriptionInputRef,
      taskReference: taskReferenceInputRef,
    };

    focusTargetMap[fieldId].current?.focus?.();
  }, []);

  const moveFormFocus = useCallback(
    (activeFieldId: CreateTaskFormFieldId, direction: "next" | "previous" = "next") => {
      const targetFieldId =
        direction === "previous"
          ? getPreviousFocusableFieldId(formNavigationRegistry, activeFieldId)
          : getNextFocusableFieldId(formNavigationRegistry, activeFieldId);

      focusFormField((targetFieldId as CreateTaskFormFieldId | null) ?? null);
    },
    [focusFormField, formNavigationRegistry],
  );

  const handleFieldKeyPress = useCallback(
    (
      activeFieldId: CreateTaskFormFieldId,
      event: NativeSyntheticEvent<TextInputKeyPressEventData>,
    ) => {
      if (event.nativeEvent.key !== "Tab") {
        return;
      }

      moveFormFocus(activeFieldId, getTabNavigationDirection(event));
    },
    [moveFormFocus],
  );
  
  const handleOpenUserPicker = () => setShowUserPicker(true);

  const textInput = aiAssistant.textInput;
  const showSuggestionPreview = aiAssistant.showSuggestionPreview;
  const acceptedFields = aiAssistant.acceptedFields;
  const isLLMLoading = aiAssistant.isProcessing;
  const lastSuggestion = aiAssistant.lastSuggestion;
  const llmError = aiAssistant.error;

  const isUploading = activity.isUploading;
  const isLoadingUsers = activity.isLoadingUsers;
  const isSubmitting = activity.isSubmitting;

  const handleOpenPhotoSelection = () => {};
  const handleAddPhotos = async () => {
    if (!user) return;

    const goToPhotoSelection = (photos: SelectedPhoto[]) => {
      const serializablePhotos = photos.map((photo) => ({
        uri: photo.uri,
        fileName: photo.fileName,
        isAnnotated: photo.isAnnotated || false,
        annotatedUri: photo.annotatedUri,
        caption: photo.caption,
        mediaLibraryAssetId: photo.mediaLibraryAssetId,
      }));

      requestAnimationFrame(() => {
        setTimeout(() => {
          navigation.navigate("PhotoSelection", {
            taskId: editTaskId,
            subTaskId: parentSubTaskId,
            companyId: user.companyId,
            userId: user.id,
            initialCompletionPercentage: 0,
            initialPhotos: serializablePhotos,
            returnScreen: "CreateTask",
            actionType: actionType,
            parentTaskId,
            parentSubTaskId,
            editTaskId,
          });
        }, 100);
      });
    };

    Alert.alert("Add Photos", "Choose how you want to add photos", [
      {
        text: "Take Photo",
        onPress: () => {
          void showPhotoSelectionDialog({
            source: "camera",
            allowClipboard: false,
            allowMultiple: false,
            onPhotosSelected: (photos) => {
              goToPhotoSelection(
                photos.map((photo) => ({
                  uri: photo.uri,
                  fileName: photo.fileName,
                  isAnnotated: photo.isAnnotated || false,
                  annotatedUri: photo.annotatedUri,
                  caption: photo.caption,
                  mediaLibraryAssetId: photo.mediaLibraryAssetId,
                })),
              );
            },
          });
        },
      },
      {
        text: "Choose from Library",
        onPress: () => {
          const existingPhotos = (formData.attachments || []).filter(
            (attachment): attachment is SelectedPhoto =>
              typeof attachment !== "string",
          );
          // Spike: in-app MediaLibrary gallery (not Apple PHPicker)
          navigation.navigate("InAppLibraryPicker", {
            taskId: editTaskId,
            subTaskId: parentSubTaskId,
            companyId: user.companyId,
            userId: user.id,
            initialCompletionPercentage: 0,
            returnScreen: "CreateTask",
            actionType: actionType,
            parentTaskId,
            parentSubTaskId,
            editTaskId,
            existingPhotos: existingPhotos.map((photo) => ({
              uri: photo.uri,
              fileName: photo.fileName,
              isAnnotated: Boolean(photo.isAnnotated),
              annotatedUri: photo.annotatedUri,
              caption: photo.caption,
              mediaLibraryAssetId: photo.mediaLibraryAssetId,
            })),
          });
        },
      },
      {
        text: "Cancel",
        style: "cancel",
      },
    ]);
  };
  
  const removePhoto = (index: number) => {
    const newAttachments = [...formData.attachments];
    newAttachments.splice(index, 1);
    updateField('attachments', newAttachments);
  };

  const asyncStoragePhotoCount = 0;

  const handleCancel = () => {
    // If the form has any user-entered data, prompt before discarding
    const hasData =
      Boolean(formData.title.trim()) ||
      Boolean(formData.description.trim()) ||
      formData.attachments.length > 0;

    if (hasData) {
      Alert.alert(
        "Discard Task?",
        "You have unsaved changes. Are you sure you want to discard them?",
        [
          {
            text: "Keep Editing",
            style: "cancel",
          },
          {
            text: "Discard",
            style: "destructive",
            onPress: () => {
              actions.clearDraftPayloads?.();
              onNavigateBack();
            },
          },
        ],
      );
    } else {
      actions.clearDraftPayloads?.();
      onNavigateBack();
    }
  };

  const headerSubtitle = editTaskId
    ? t.createTask.headerEditSubtitle
    : t.createTask.headerCreateSubtitle;

  const performSubmit = async (options?: { editReason?: string }) => {
    const wasSuccessful = await submit(options);
    if (wasSuccessful) {
      if (editTaskId) {
        onNavigateBack();
      } else if (parentTaskId && parentSubTaskId) {
        setSubmitSuccessState({
          title: t.createTask.subTaskCreated,
          message: t.createTask.nestedSubTaskCreatedSuccess,
        });
      } else if (parentTaskId) {
        setSubmitSuccessState({
          title: t.createTask.subTaskCreated,
          message: t.createTask.subTaskCreatedSuccess,
        });
      } else {
        setSubmitSuccessState({
          title: t.createTask.taskCreated,
          message: t.createTask.taskCreatedSuccess,
        });
      }
    }

    return wasSuccessful;
  };

  const handleSubmit = async () => {
    if (shouldShowPostCaptureRoutingSheet && captureRoutingChoice === "existing_task") {
      const photos: SelectedPhoto[] =
        (selectedPhotosProp?.length ? selectedPhotosProp : []) as SelectedPhoto[];
      navigation.navigate("PhotoSelection", {
        initialPhotos: photos,
        uploadedPhotoUrls: uploadedPhotoUrls,
        saveIntent: "attach_task",
        projectId: formData.projectId || undefined,
        returnScreen: "CreateTask",
        actionType,
        parentTaskId,
        parentSubTaskId,
        editTaskId,
        updateTargetSubTaskId,
      });
      return;
    }

    if (context.requiresEditReason) {
      setShowEditReasonModal(true);
      return;
    }

    await performSubmit();
  };
  const handleEditReasonSubmit = async () => {
    const wasSuccessful = await performSubmit({ editReason: modals.editReason });
    if (wasSuccessful) {
      setShowEditReasonModal(false);
      setEditReason("");
    }
  };
  const handleSubmitSuccessConfirm = useCallback(() => {
    setSubmitSuccessState(null);
    actions.clearDraftPayloads?.();
    onClearDraftPayloads?.();
    onCreateSuccess?.();
  }, [actions, onClearDraftPayloads, onCreateSuccess]);

  useEffect(() => {
    if (selectedPhotosProp && selectedPhotosProp.length > 0) {
      mergeIncomingAttachments(selectedPhotosProp);
    }
  }, [selectedPhotosProp, mergeIncomingAttachments]);

  useEffect(() => {
    if (uploadedPhotoUrls && uploadedPhotoUrls.length > 0) {
      mergeIncomingAttachments(uploadedPhotoUrls);
    }
  }, [uploadedPhotoUrls, mergeIncomingAttachments]);

  if (!user) return null;
  if (isAdmin(user)) {
    return (
      <SafeAreaView
        testID="create-task__root"
        edges={['bottom', 'left', 'right']}
        className="flex-1 bg-[#E7F4F8]"
      >
        <StatusBar style="light" />
        <View testID="create-task__header">
          <ModernScreenHeader
            title={context.headerTitle}
            subtitle={headerSubtitle}
            showBackButton={true}
            onBackPress={handleCancel}
            onNavigateToProfile={onNavigateToProfile}
            onNavigateToProjectPicker={onNavigateToProjectPicker}
            className="border-b-0 bg-[#08576E] pb-2"
          />
        </View>
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-center text-base text-gray-700">{t.createTask.adminCannotCreateTasks}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      testID="create-task__root"
      edges={['bottom', 'left', 'right']}
      className="flex-1 bg-[#E7F4F8]"
    >
      <StatusBar style="light" />

      <View testID="create-task__header">
        <ModernScreenHeader
          title={context.headerTitle}
          subtitle={headerSubtitle}
          showBackButton={true}
          onBackPress={handleCancel}
          onNavigateToProfile={onNavigateToProfile}
          onNavigateToProjectPicker={onNavigateToProjectPicker}
          className="border-b-0 bg-[#08576E] pb-2"
        />
      </View>

      {/* Parent Task Info Banner */}
      {context.parentBanner && (
        <View className="bg-blue-50 border-b border-blue-100 px-6 py-3">
          <View className="flex-row items-center">
            <Ionicons name="link-outline" size={18} color="#3b82f6" />
            <Text className="text-base text-gray-600 ml-2">
              {context.parentBanner.label}
            </Text>
            <Text className="text-base font-semibold text-gray-900 flex-1" numberOfLines={1}>
              {context.parentBanner.title}
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
          className="flex-1 py-4"
          keyboardShouldPersistTaps="always"
          contentContainerStyle={{ paddingBottom: 32 }}
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
              <Text className="text-lg font-semibold text-slate-900 mb-2">
                {t.createTask.textInput}
              </Text>
              <View className="flex-row gap-2">
                <TextInput
                  className="flex-1 border rounded-lg px-3 py-3 text-lg text-gray-900 bg-white border-gray-300"
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
                      const suggestion = await actions.generateSuggestionFromText();
                      if (suggestion) {
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
                <Pressable onPress={clearError}>
                  <Ionicons name="close" size={20} color="#991b1b" />
                </Pressable>
              </View>
            </View>
          )}

          {/* Suggestion Preview */}
          {lastSuggestion && showSuggestionPreview && (
            <CreateTaskSuggestionPreview
              suggestion={lastSuggestion}
              acceptedFields={acceptedFields}
              onToggleField={toggleSuggestionField}
              onDismiss={dismissSuggestionPreview}
            />
          )}

          {shouldShowPostCaptureRoutingSheet ? (
            <View
              testID="create-task__post_capture_routing_sheet"
              className="mb-6 rounded-3xl border border-gray-200 bg-white p-4"
            >
              <Text className="text-lg font-semibold text-gray-900">
                What should this photo become?
              </Text>
              <Text className="mt-1 text-sm text-gray-500">
                Choose where this capture should go before continuing.
              </Text>

              <View className="mt-4 flex-row gap-3">
                <Pressable
                  testID="create-task__routing_choice_create"
                  accessibilityRole="button"
                  accessibilityState={{ selected: captureRoutingChoice === "create_task" }}
                  onPress={() => setCaptureRoutingChoice("create_task")}
                  className={cn(
                    "flex-1 rounded-2xl border p-4",
                    captureRoutingChoice === "create_task"
                      ? "border-slate-900 bg-slate-900"
                      : "border-gray-200 bg-white",
                  )}
                >
                  <Text
                    className={cn(
                      "text-base font-semibold",
                      captureRoutingChoice === "create_task" ? "text-white" : "text-gray-900",
                    )}
                  >
                    Create New Task
                  </Text>
                  <Text
                    className={cn(
                      "mt-1 text-sm",
                      captureRoutingChoice === "create_task" ? "text-slate-200" : "text-gray-500",
                    )}
                  >
                    Start a task draft with these photos attached.
                  </Text>
                </Pressable>

                <Pressable
                  testID="create-task__routing_choice_existing"
                  accessibilityRole="button"
                  accessibilityState={{ selected: captureRoutingChoice === "existing_task" }}
                  onPress={() => setCaptureRoutingChoice("existing_task")}
                  className={cn(
                    "flex-1 rounded-2xl border p-4",
                    captureRoutingChoice === "existing_task"
                      ? "border-blue-600 bg-blue-50"
                      : "border-gray-200 bg-white",
                  )}
                >
                  <Text className="text-base font-semibold text-gray-900">
                    Add to Existing Task
                  </Text>
                  <Text className="mt-1 text-sm text-gray-500">
                    Route the capture into an existing task instead.
                  </Text>
                </Pressable>
              </View>

              <Text className="mt-3 text-sm text-gray-600">
                {captureRoutingChoice === "create_task"
                  ? "Photos will be attached to the new task you create below."
                  : "Routes to PhotoSelection with task picker enabled to attach the capture below."}
              </Text>
            </View>
          ) : null}

          <View
            testID="create-task__continuous_form"
            className="mx-4 rounded-[28px] border border-gray-200 bg-white px-4 py-4"
          >
            <CreateTaskAttachmentSection
              attachments={formData.attachments as any}
              asyncStoragePhotoCount={asyncStoragePhotoCount}
              onRemoveAttachment={removeAttachment}
              onAddPhotos={handleAddPhotos}
              embedded
            />

            <View
              testID="create-task__field-stack"
              className="border-t border-gray-100 pt-4 gap-4"
            >
              <View testID="create-task__field_title--preview">
                <TextField
                  contract={buildFormTextFieldContract({
                    id: "create-task-title",
                    label: t.tasks.title,
                    value: formData.title,
                    placeholder: t.createTask.titlePlaceholder,
                    error: errors.title,
                    required: true,
                    testId: "create-task__field_title",
                  })}
                  inputTestId="createTask-title"
                  inputRef={titleInputRef}
                  collapseEmptyChrome
                  onChangeText={handleTitleChange}
                  maxLength={100}
                  autoCorrect={false}
                  returnKeyType="next"
                  accessibilityState={{ selected: activeFormFocusTarget === "title" }}
                  onFocus={() => setActiveFormFocusTarget("title")}
                  onKeyPress={(event) => handleFieldKeyPress("title", event)}
                  onSubmitEditing={() => {
                    moveFormFocus("title");
                  }}
                  blurOnSubmit={false}
                />
              </View>

              <TextField
                contract={buildFormTextFieldContract({
                  id: "create-task-description",
                  label: t.tasks.description,
                  value: formData.description,
                  placeholder: t.createTask.descriptionPlaceholder,
                  error: errors.description,
                  required: true,
                  testId: "create-task__field_description",
                })}
                inputTestId="createTask-description"
                inputRef={descriptionInputRef}
                collapseEmptyChrome
                onChangeText={handleDescriptionChange}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                maxLength={500}
                autoCorrect={false}
                returnKeyType="next"
                accessibilityState={{ selected: activeFormFocusTarget === "description" }}
                onFocus={() => setActiveFormFocusTarget("description")}
                onKeyPress={(event) => handleFieldKeyPress("description", event)}
                onSubmitEditing={() => {
                  moveFormFocus("description");
                }}
                blurOnSubmit={false}
              />

              <InputField label={t.tasks.priority}>
                <View className="flex-row flex-wrap gap-2">
                  {(["critical", "high", "medium", "low"] as Priority[]).map((priority) => {
                    const isSelected = formData.priority === priority;
                    const label = t.tasks[priority as keyof typeof t.tasks] || priority;

                    return (
                      <Pressable
                        key={priority}
                        testID={`createTask-priority-${priority}`}
                        onPress={() => handlePriorityChange(priority)}
                        accessibilityState={{ selected: isSelected }}
                        className={cn(
                          "rounded-full border px-4 py-2.5",
                          isSelected ? "border-blue-600 bg-blue-50" : "border-gray-300 bg-white"
                        )}
                      >
                        <Text
                          className={cn(
                            "text-sm font-medium",
                            isSelected ? "text-blue-700" : "text-gray-700"
                          )}
                        >
                          {label}
                        </Text>
                      </Pressable>
                    );
                  })}
                  <Pressable
                    testID="create-task__toggle_critical_this_week"
                    accessibilityRole="button"
                    accessibilityLabel="Critical this week"
                    accessibilityState={{ selected: formData.isCriticalThisWeek }}
                    onPress={() =>
                      updateField("isCriticalThisWeek", !formData.isCriticalThisWeek)
                    }
                    className={cn(
                      "flex-row items-center rounded-full border px-4 py-2.5",
                      formData.isCriticalThisWeek
                        ? "border-amber-500 bg-amber-50"
                        : "border-gray-300 bg-white"
                    )}
                  >
                    <Ionicons
                      name={formData.isCriticalThisWeek ? "flag" : "flag-outline"}
                      size={14}
                      color={formData.isCriticalThisWeek ? "#b45309" : "#6b7280"}
                      style={{ marginRight: 6 }}
                    />
                    <Text
                      className={cn(
                        "text-sm font-medium",
                        formData.isCriticalThisWeek ? "text-amber-800" : "text-gray-700"
                      )}
                    >
                      This week
                    </Text>
                  </Pressable>
                </View>
              </InputField>

              <InputField label={t.createTask.locationOnSite}>
                <Pressable
                  testID="create-task__location-picker-trigger"
                  onPress={() => {
                    setIsEnteringCustomLocation(false);
                    setCustomLocationDraft('');
                    setShowLocationPicker(true);
                  }}
                  disabled={!locationPicker.projectId}
                  className={cn(
                    "border rounded-lg px-3 py-3 bg-white flex-row items-center justify-between",
                    !locationPicker.projectId && "bg-gray-100 opacity-60",
                  )}
                >
                  <Text
                    className={cn(
                      "flex-1 text-lg",
                      formData.locationOnSite ? "text-gray-900" : "text-gray-500",
                    )}
                  >
                    {formData.locationOnSite || t.createTask.selectLocationOnSite}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color="#6b7280" />
                </Pressable>
                {!locationPicker.projectId ? (
                  <Text className="mt-2 text-sm text-gray-500">
                    {t.createTask.selectLocationOnSiteFirstProject}
                  </Text>
                ) : null}
              </InputField>

              {!containerOrganization.isVisible ? (
                <Pressable
                  testID="create-task__expand_container_organization"
                  accessibilityRole="button"
                  onPress={expandContainerOrganization}
                  disabled={!locationPicker.projectId}
                  className={cn(
                    "rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3",
                    !locationPicker.projectId && "opacity-50",
                  )}
                >
                  <Text className="text-base font-medium text-slate-700">
                    Organize by area (optional)
                  </Text>
                  <Text className="mt-1 text-sm text-slate-500">
                    Hidden by default — add floors, zones, or packages only when this project needs them.
                  </Text>
                </Pressable>
              ) : (
                <View
                  testID="create-task__container_organization"
                  className="rounded-xl border border-slate-200 bg-white p-3"
                >
                  <Text className="mb-1 text-base font-semibold uppercase tracking-[1.2px] text-slate-500">
                    Area
                  </Text>
                  <Text className="mb-3 text-base text-slate-600">
                    Optional. Tags stay for flexible labels; use areas only for stable browse groups.
                  </Text>
                  <View className="flex-row flex-wrap gap-2 mb-3">
                    {containerOrganization.containers
                      .filter((container) => !container.parentId)
                      .map((container) => {
                        const selected =
                          containerOrganization.selectedContainerId === container.id;
                        return (
                          <Pressable
                            key={container.id}
                            testID={`create-task__container_${container.id}`}
                            onPress={() => setContainerId(selected ? "" : container.id)}
                            className={cn(
                              "rounded-full px-3 py-1.5 border",
                              selected
                                ? "border-blue-300 bg-blue-50"
                                : "border-slate-200 bg-slate-50",
                            )}
                          >
                            <Text
                              className={cn(
                                "text-sm font-medium",
                                selected ? "text-blue-900" : "text-slate-800",
                              )}
                            >
                              {container.label}
                            </Text>
                          </Pressable>
                        );
                      })}
                  </View>
                  {containerOrganization.selectedContainerId ? (
                    <View className="mb-3">
                      <Text className="mb-2 text-base font-semibold text-slate-900">Sub-area (optional)</Text>
                      <View className="flex-row flex-wrap gap-2">
                        {containerOrganization.containers
                          .filter(
                            (container) =>
                              container.parentId ===
                              containerOrganization.selectedContainerId,
                          )
                          .map((container) => {
                            const selected =
                              containerOrganization.selectedSubContainerId ===
                              container.id;
                            return (
                              <Pressable
                                key={container.id}
                                testID={`create-task__sub_container_${container.id}`}
                                onPress={() =>
                                  setSubContainerId(selected ? "" : container.id)
                                }
                                className={cn(
                                  "rounded-full px-3 py-1.5 border",
                                  selected
                                    ? "border-indigo-300 bg-indigo-50"
                                    : "border-slate-200 bg-slate-50",
                                )}
                              >
                                <Text
                                  className={cn(
                                    "text-sm font-medium",
                                    selected ? "text-indigo-900" : "text-slate-800",
                                  )}
                                >
                                  {container.label}
                                </Text>
                              </Pressable>
                            );
                          })}
                      </View>
                    </View>
                  ) : null}
                  <TextInput
                    testID="create-task__container_input"
                    className="border border-gray-300 rounded-lg px-3 py-3 bg-white text-lg text-gray-900"
                    placeholder={
                      containerOrganization.selectedContainerId
                        ? "Add sub-area, press return"
                        : "Add area, press return"
                    }
                    placeholderTextColor="#9ca3af"
                    value={containerOrganization.draftLabel}
                    onChangeText={setContainerDraft}
                    returnKeyType="done"
                    blurOnSubmit
                    onSubmitEditing={() => {
                      void addProjectContainer(
                        containerOrganization.draftLabel,
                        containerOrganization.selectedContainerId || undefined,
                      );
                    }}
                  />
                </View>
              )}

              <InputField label={t.tasks.assignTo} error={errors.assignedTo}>
                {(() => {
                  const isDisabled = isLoadingUsers || context.assigneesLocked;

                  return (
                    <Pressable
                      onPress={handleOpenUserPicker}
                      disabled={isDisabled}
                      className={cn(
                        "border rounded-lg px-3 py-3 flex-row items-center justify-between",
                        context.assigneesLocked ? "bg-gray-100" : "bg-white",
                        errors.assignedTo ? "border-red-300" : "border-gray-300",
                        isDisabled && "opacity-50"
                      )}
                    >
                      <Text
                        className={cn(
                          "text-lg",
                          context.assigneesLocked ? "text-gray-500" : "text-gray-900"
                        )}
                      >
                        {isLoadingUsers
                          ? t.createTask.loadingUsers
                          : context.assigneesLocked
                            ? t.createTask.assigneesLocked || "Assignees cannot be changed (task accepted)"
                            : selectedUsers.length > 0
                              ? t.createTask.usersSelected(selectedUsers.length)
                              : t.createTask.selectUsersToAssign}
                      </Text>
                      {isLoadingUsers ? (
                        <Ionicons name="hourglass-outline" size={20} color="#6b7280" />
                      ) : context.assigneesLocked ? (
                        <Ionicons name="lock-closed" size={20} color="#9ca3af" />
                      ) : (
                        <Ionicons name="chevron-forward" size={20} color="#6b7280" />
                      )}
                    </Pressable>
                  );
                })()}
              </InputField>

              {selectedUsers.length > 0 && (
                <View
                  testID="create-task__selected_assignees"
                  className="rounded-xl border border-gray-200 bg-gray-50 p-3"
                >
                  <Text className="mb-2 text-base font-semibold text-slate-900">
                    {t.createTask.selectedUsers}
                  </Text>
                  <Text className="mb-2 text-sm text-gray-500">
                    Tap a name to set Primary. Other selected users save as Delegates.
                  </Text>
                  <View className="flex-row flex-wrap">
                    {selectedUsers.map((userId) => {
                      const selectedUser = assigneePicker.availableUsers.find((assignee) => assignee.id === userId);
                      if (!selectedUser) return null;
                      const isPrimary = formData.primaryAssigneeId === userId;

                      return (
                        <View
                          key={userId}
                          className={cn(
                            "rounded-full px-3 py-1 mr-2 mb-2 flex-row items-center",
                            isPrimary ? "bg-amber-100 border border-amber-300" : "bg-blue-100",
                          )}
                        >
                          <Pressable
                            testID={`create-task__set_primary_${userId}`}
                            disabled={context.assigneesLocked}
                            onPress={() => setPrimaryAssignee(userId)}
                          >
                            <Text
                              className={cn(
                                "text-sm font-medium mr-1",
                                isPrimary ? "text-amber-900" : "text-blue-900",
                              )}
                            >
                              {selectedUser.name}
                              {isPrimary ? " · Primary" : " · Delegate"}
                            </Text>
                          </Pressable>
                          {!context.assigneesLocked ? (
                            <Pressable
                              testID={`create-task__remove_assignee_${userId}`}
                              onPress={() => toggleUserSelection(userId)}
                            >
                              <Ionicons
                                name="close-circle"
                                size={16}
                                color={isPrimary ? "#92400e" : "#1e40af"}
                              />
                            </Pressable>
                          ) : null}
                        </View>
                      );
                    })}
                  </View>
                </View>
              )}

              <InputField label="Tags">
                <View testID="create-task__tags_editor">
                  <View className="flex-row flex-wrap mb-2">
                    {formData.customTags.map((tag) => (
                      <View
                        key={tag}
                        className="bg-slate-100 rounded-full px-3 py-1 mr-2 mb-2 flex-row items-center"
                      >
                        <Text className="text-slate-800 text-sm mr-1">{tag}</Text>
                        <Pressable
                          testID={`create-task__remove_tag_${tag}`}
                          onPress={() => removeCustomTag(tag)}
                        >
                          <Ionicons name="close-circle" size={16} color="#475569" />
                        </Pressable>
                      </View>
                    ))}
                  </View>
                  <TextInput
                    testID="create-task__tag_input"
                    className="border border-gray-300 rounded-lg px-3 py-3 bg-white text-lg text-gray-900"
                    placeholder="Add tag, press return"
                    placeholderTextColor="#9ca3af"
                    value={tagDraft}
                    onChangeText={setTagDraft}
                    returnKeyType="done"
                    blurOnSubmit
                    onSubmitEditing={() => {
                      addCustomTag(tagDraft);
                      setTagDraft("");
                    }}
                  />
                </View>
              </InputField>
            </View>

            <View className="border-t border-gray-100 pt-4 gap-4">
              <InputField label={t.tasks.dueDate} error={errors.dueDate}>
              <Pressable
                testID="create-task__due-date-trigger"
                onPress={() => {
                  setShowDatePicker(!showDatePicker);
                }}
                className={cn(
                  "border-2 rounded-lg px-3 py-3 bg-white flex-row items-center justify-between",
                  showDatePicker ? "border-blue-600" : errors.dueDate ? "border-red-300" : "border-gray-300"
                )}
              >
                <Text className={cn("text-lg", showDatePicker ? "text-blue-600" : "text-gray-900")}>
                  {dateFormatter.formatDateWithWeekday(formData.dueDate)}
                </Text>
                <Ionicons
                  name={showDatePicker ? "calendar" : "calendar-outline"}
                  size={20}
                  color={showDatePicker ? "#3b82f6" : "#6b7280"}
                />
              </Pressable>
              </InputField>

              {showDatePicker && (
                <View className="bg-white border-2 border-blue-600 rounded-lg overflow-hidden">
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
                      testID="create-task__due-date-done"
                      onPress={() => setShowDatePicker(false)}
                      className="bg-blue-600 px-6 py-2 rounded-lg"
                    >
                      <Text className="text-white font-semibold">{t.common.done}</Text>
                    </Pressable>
                  </View>
                </View>
              )}

              <TextField
                contract={buildFormTextFieldContract({
                  id: "create-task-taskReference",
                  label: t.createTask.taskReference,
                  value: formData.taskReference,
                  placeholder: t.createTask.taskReferencePlaceholder,
                  required: false,
                  testId: "create-task__field_taskReference",
                })}
                inputTestId="createTask-taskReference"
                inputRef={taskReferenceInputRef}
                collapseEmptyChrome
                onChangeText={handleTaskReferenceChange}
                maxLength={50}
                autoCorrect={false}
                returnKeyType="done"
                accessibilityState={{ selected: activeFormFocusTarget === "taskReference" }}
                onFocus={() => setActiveFormFocusTarget("taskReference")}
                onKeyPress={(event) => handleFieldKeyPress("taskReference", event)}
                onSubmitEditing={() => {
                  taskReferenceInputRef.current?.blur();
                }}
                blurOnSubmit={true}
              />

              <InputField label={t.createTask.billingStatus}>
                <Pressable
                  onPress={() => setShowBillingStatusPicker(true)}
                  className="border rounded-lg px-3 py-3 bg-white flex-row items-center justify-between border-gray-300"
                >
                  <Text className="text-lg text-gray-900">
                    {formData.billingStatus === "billable"
                      ? t.createTask.billable
                      : formData.billingStatus === "non_billable"
                        ? t.createTask.nonBillable
                        : t.createTask.billed}
                  </Text>
                  <Ionicons name="chevron-forward" size={20} color="#6b7280" />
                </Pressable>
              </InputField>

              <InputField label={t.tasks.category}>
                <Pressable
                  onPress={() => {
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
            </View>

            <View
              testID="create-task__submit-inline"
              className="pt-4"
            >
              <View
                testID="createTask-submit-focus-target"
                accessibilityState={{ selected: activeFormFocusTarget === "submit" }}
              >
                <Pressable
                  accessibilityRole="button"
                  onPress={handleSubmit}
                  disabled={isSubmitting}
                  className={cn(
                    "items-center justify-center rounded-xl bg-blue-600 py-3",
                    isSubmitting && "opacity-50",
                  )}
                >
                  <Text className="text-base font-semibold text-white">
                    {editTaskId ? t.createTask.updateTaskButton : t.createTask.createTaskButton}
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={submitSuccessState !== null}
        animationType="fade"
        transparent
        onRequestClose={handleSubmitSuccessConfirm}
      >
        <View className="flex-1 items-center justify-center bg-black/30 px-6">
          <View className="w-full max-w-[360px] rounded-3xl bg-white px-6 py-6">
            <Text className="text-xl font-semibold text-gray-900">
              {submitSuccessState?.title}
            </Text>
            <View testID="create-task__submit-success-message" className="mt-3">
              <Text className="text-base leading-6 text-gray-700">
                {submitSuccessState?.message}
              </Text>
            </View>
            <Pressable
              testID="create-task__submit-success-confirm"
              accessibilityRole="button"
              onPress={handleSubmitSuccessConfirm}
              className="mt-6 items-center justify-center rounded-xl bg-blue-600 py-3"
            >
              <Text className="text-base font-semibold text-white">
                {t.common.ok}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

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
                  testID={`createTask-priority-modal-${priority}`}
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

      <Modal
        visible={showLocationPicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          setShowLocationPicker(false);
          setIsEnteringCustomLocation(false);
          setCustomLocationDraft('');
        }}
      >
        <SafeAreaView edges={['bottom', 'left', 'right']} className="flex-1 bg-gray-50">
          <StatusBar style="dark" />

          <ModalHandle />

          <View className="flex-row items-center bg-white border-b border-gray-200 px-6 py-4">
            <Pressable
              onPress={() => {
                setShowLocationPicker(false);
                setIsEnteringCustomLocation(false);
                setCustomLocationDraft('');
              }}
              className="mr-4 w-10 h-10 items-center justify-center"
            >
              <Ionicons name="close" size={24} color="#374151" />
            </Pressable>
            <Text className="text-xl font-semibold text-gray-900 flex-1">
              {t.createTask.locationOnSite}
            </Text>
          </View>

          <ScrollView className="flex-1 px-6 py-4">
            {locationPicker.options.map((option) => {
              const isSelected = !option.isAddNew && formData.locationOnSite === option.value;

              return (
                <Pressable
                  key={option.id}
                  testID={option.isAddNew ? "create-task__location-option-add-new" : undefined}
                  onPress={() => {
                    if (option.isAddNew) {
                      setIsEnteringCustomLocation(true);
                      setCustomLocationDraft('');
                      return;
                    }

                    updateField("locationOnSite", option.value);
                    setIsEnteringCustomLocation(false);
                    setCustomLocationDraft('');
                    setShowLocationPicker(false);
                  }}
                  className={cn(
                    "bg-white border rounded-lg px-4 py-4 mb-3 flex-row items-center",
                    isSelected ? "border-blue-500 bg-blue-50" : "border-gray-300"
                  )}
                >
                  <Text
                    className={cn(
                      "text-lg font-medium flex-1",
                      isSelected ? "text-blue-900" : "text-gray-900"
                    )}
                  >
                    {option.label}
                  </Text>
                  <Ionicons
                    name={option.isAddNew ? "add-circle-outline" : isSelected ? "checkmark-circle" : "location-outline"}
                    size={22}
                    color={option.isAddNew ? "#2563eb" : isSelected ? "#2563eb" : "#6b7280"}
                  />
                </Pressable>
              );
            })}

            {isEnteringCustomLocation ? (
              <View className="mt-1 gap-3">
                <TextInput
                  testID="create-task__location-input"
                  className="border rounded-lg px-3 py-3 text-lg text-gray-900 bg-white border-gray-300"
                  placeholder={t.createTask.addNewLocationPlaceholder}
                  value={customLocationDraft}
                  onChangeText={setCustomLocationDraft}
                />
                <Pressable
                  testID="create-task__location-save"
                  onPress={() => {
                    const trimmedCustomLocation = customLocationDraft.trim();
                    if (!trimmedCustomLocation) {
                      return;
                    }

                    void saveLocationOnSiteSelection(trimmedCustomLocation);
                    setIsEnteringCustomLocation(false);
                    setCustomLocationDraft('');
                    setShowLocationPicker(false);
                  }}
                  className="items-center justify-center rounded-xl border border-gray-300 bg-white py-3"
                >
                  <Text className="text-base font-semibold text-gray-700">
                    {t.createTask.saveNewLocation}
                  </Text>
                </Pressable>
              </View>
            ) : null}
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
            {projects.availableProjects.map((project) => (
              <Pressable
                key={project.id}
                onPress={() => {
                  updateField('projectId', project.id);
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
            
            {projects.availableProjects.length === 0 && (
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
                className="flex-1 ml-2 text-base text-gray-900"
                style={{ fontSize: 16 }}
                placeholder={t.createTask.searchPlaceholder}
                placeholderTextColor="#9ca3af"
                value={assigneePicker.userSearchQuery}
                onChangeText={setUserSearchQuery}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {assigneePicker.userSearchQuery.length > 0 && (
                <Pressable onPress={() => setUserSearchQuery("")}>
                  <Ionicons name="close-circle" size={20} color="#6b7280" />
                </Pressable>
              )}
            </View>
            
            {/* Results count */}
            <Text className="text-sm text-gray-600 mt-2">
              {t.createTask.usersAvailable(
                assigneePicker.filteredUsers.length,
                assigneePicker.userSearchQuery ? assigneePicker.availableUsers.length : undefined
              )}
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
            ) : assigneePicker.filteredUsers.length > 0 ? (
              assigneePicker.filteredUsers.map((assignableUser) => {
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
            ) : assigneePicker.availableUsers.length > 0 ? (
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
        visible={modals.showEditReasonModal}
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
              value={modals.editReason}
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
