const fs = require('fs');

const screenPath = 'src/screens/CreateTaskScreen.tsx';
let content = fs.readFileSync(screenPath, 'utf8');

const adapterPath = 'src/ui/viewAdapters/useCreateTaskViewAdapter.ts';

// Extract logic from CreateTaskScreen
const match = content.match(/export default function CreateTaskScreen\([^)]+\) \{([\s\S]*?)(\n  return \(\s*<View className="flex-1)/);

if (!match) {
  console.log("Could not find the component body.");
  process.exit(1);
}

const componentBody = match[1];

// We need to create the view adapter
const adapterCode = `
import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { AppState, AppStateStatus, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useRoute, useFocusEffect } from "@react-navigation/native";
import { useTaskStore } from '../../state/taskStore.supabase';
import { useAuthStore } from '../../state/authStore';
import { useProjectStoreWithCompanyInit } from '../../state/projectStore.supabase';
import { useUserStoreWithInit } from '../../state/userStore.supabase';
import { useCompanyStore } from "../../state/companyStore";
import { useProjectFilterStore } from "../../state/projectFilterStore";
import { useUserPreferencesStore } from "../../state/userPreferencesStore";
import { useFileUpload } from '../../utils/useFileUpload';
import { usePhotoSelection, SelectedPhoto } from '../../utils/usePhotoSelection';
import { useTaskLLMAssistant } from '../../hooks/useTaskLLMAssistant';
import { useTranslation } from "../../utils/useTranslation";
import { useDateFormatter } from "../../utils/dateFormatter";
import { notifyDataMutation } from "../../utils/DataRefreshManager";
import { Priority, TaskCategory, BillingStatus } from "../../types/buildtrack";
import type { CreateTaskScreenViewAdapterOutput, CreateTaskFormModel } from '../contracts/viewAdapters';

type Attachment = string | SelectedPhoto;

interface CreateTaskDraftFormData {
  title: string;
  description: string;
  taskReference: string;
  billingStatus: BillingStatus;
  priority: Priority;
  category: TaskCategory;
  dueDate: Date;
  assignedTo: string[];
  attachments: Attachment[];
  projectId: string;
}

interface PersistedCreateTaskDraftFormData
  extends Omit<CreateTaskDraftFormData, "dueDate"> {
  dueDate: string;
}

const getDefaultDraftDueDate = () =>
  new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

const getAttachmentUri = (attachment: Attachment): string =>
  typeof attachment === "string"
    ? attachment
    : attachment.annotatedUri || attachment.uri;

const toPersistedDraftFormData = (
  value: CreateTaskDraftFormData
): PersistedCreateTaskDraftFormData => ({
  ...value,
  dueDate: value.dueDate.toISOString(),
});

const fromPersistedDraftFormData = (
  value: Partial<PersistedCreateTaskDraftFormData>
): CreateTaskDraftFormData => ({
  title: value.title ?? "",
  description: value.description ?? "",
  taskReference: value.taskReference ?? "",
  billingStatus: (value.billingStatus ?? "non_billable") as BillingStatus,
  priority: (value.priority ?? "medium") as Priority,
  category: (value.category ?? "general") as TaskCategory,
  dueDate: value.dueDate ? new Date(value.dueDate) : getDefaultDraftDueDate(),
  assignedTo: Array.isArray(value.assignedTo) ? value.assignedTo : [],
  attachments: Array.isArray(value.attachments)
    ? (value.attachments as Attachment[])
    : [],
  projectId: value.projectId ?? "",
});

const hasDraftContent = (
  formData: CreateTaskDraftFormData,
  selectedUsers: string[]
): boolean =>
  Boolean(
    formData.title.trim() ||
      formData.description.trim() ||
      formData.taskReference.trim() ||
      formData.projectId ||
      formData.attachments.length > 0 ||
      selectedUsers.length > 0
  );

const mergeAttachments = (
  existingAttachments: Attachment[],
  incomingAttachments: Attachment[]
): Attachment[] => {
  const seenUris = new Set(existingAttachments.map(getAttachmentUri));
  const merged = [...existingAttachments];

  incomingAttachments.forEach(attachment => {
    const uri = getAttachmentUri(attachment);
    if (!seenUris.has(uri)) {
      seenUris.add(uri);
      merged.push(attachment);
    }
  });

  return merged;
};

export interface UseCreateTaskViewAdapterProps {
  editTaskId?: string;
  parentTaskId?: string;
  parentSubTaskId?: string;
  clearForm?: boolean;
  actionType?: 'edit' | 'update' | 'photos' | 'comment' | 'reassign';
  uploadedPhotoUrls?: string[];
  selectedPhotos?: SelectedPhoto[];
  clearFormTimestamp?: number;
  onNavigateBack: () => void;
}

export function useCreateTaskViewAdapter(props: UseCreateTaskViewAdapterProps) {
  const { 
    editTaskId, parentTaskId, parentSubTaskId, clearForm, 
    actionType, uploadedPhotoUrls, selectedPhotos: selectedPhotosProp, 
    clearFormTimestamp, onNavigateBack 
  } = props;
  
  const effectiveActionType = actionType || (editTaskId ? 'edit' : undefined);
  
${componentBody.replace(/return <TaskActionScreen[\s\S]*?\/>;/g, 'return { isTaskActionScreen: true, effectiveActionType };')}

  return {
    isTaskActionScreen: false,
    effectiveActionType,
    output: {
      readiness: {
        isSubmitting,
        isLoadingUsers,
        isUploading: false,
      },
      formData,
      errors,
      pickers: {
        showDatePicker,
        showUserPicker,
        showPriorityPicker,
        showCategoryPicker,
        showBillingStatusPicker,
        showProjectPicker,
      },
      aiAssistant: {
        textInput,
        showSuggestionPreview,
        acceptedFields,
        isProcessing: isLLMLoading,
      }
    },
    actions: {
      updateField: (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
      },
      togglePicker: (picker: string, show: boolean) => {
        if (picker === 'showDatePicker') setShowDatePicker(show);
        if (picker === 'showUserPicker') setShowUserPicker(show);
        if (picker === 'showPriorityPicker') setShowPriorityPicker(show);
        if (picker === 'showCategoryPicker') setShowCategoryPicker(show);
        if (picker === 'showBillingStatusPicker') setShowBillingStatusPicker(show);
        if (picker === 'showProjectPicker') setShowProjectPicker(show);
      },
      submit: handleSubmit,
      setTextInput,
      setShowSuggestionPreview,
      setAcceptedFields,
      handleOpenUserPicker,
      handleTitleChange,
      handleDescriptionChange,
      handleTaskReferenceChange,
      handleBillingStatusChange,
      handlePriorityChange,
      handleCategoryChange,
      handleDateChange,
      toggleUserSelection,
      handleAddPhotos,
      handleRemovePhoto,
      suggestTaskFromText,
      clearSuggestion,
      applySuggestion,
      userSearchQuery,
      setUserSearchQuery,
      filteredAssignableUsers,
      userProjects,
      editTask,
      parentTask,
      isRestoringFormDataRef,
      hasDraftContent,
      flushPersistDraft
    }
  };
}
`;

fs.writeFileSync(adapterPath, adapterCode);

// Now refactor CreateTaskScreen.tsx
const screenCode = content.replace(
  /export default function CreateTaskScreen\([^)]+\) \{([\s\S]*?)(\n  return \(\s*<View className="flex-1)/,
  `import { useCreateTaskViewAdapter } from '../ui/viewAdapters/useCreateTaskViewAdapter';\n\nexport default function CreateTaskScreen(props: CreateTaskScreenProps) {
  const adapter = useCreateTaskViewAdapter(props);
  
  if (adapter.isTaskActionScreen) {
    return <TaskActionScreen 
      actionType={adapter.effectiveActionType as any} 
      taskId={props.editTaskId!} 
      onNavigateBack={props.onNavigateBack}
      onNavigateToProfile={props.onNavigateToProfile}
      onNavigateToProjectPicker={props.onNavigateToProjectPicker}
    />;
  }
  
  const { output, actions } = adapter;
  const { formData, errors, pickers, readiness, aiAssistant } = output;
  const { 
    showDatePicker, showUserPicker, showPriorityPicker, showCategoryPicker, 
    showBillingStatusPicker, showProjectPicker 
  } = pickers;
  const { isSubmitting, isLoadingUsers } = readiness;
  const { textInput, showSuggestionPreview, acceptedFields, isProcessing: isLLMLoading } = aiAssistant;
  const {
    handleOpenUserPicker, handleTitleChange, handleDescriptionChange, 
    handleTaskReferenceChange, handleBillingStatusChange, handlePriorityChange, 
    handleCategoryChange, handleDateChange, toggleUserSelection, handleAddPhotos, 
    handleRemovePhoto, suggestTaskFromText, clearSuggestion, applySuggestion, 
    setTextInput, setShowSuggestionPreview, userSearchQuery, setUserSearchQuery, 
    filteredAssignableUsers, userProjects, editTask, parentTask, submit
  } = actions;
$2`
);

fs.writeFileSync(screenPath, screenCode);
console.log("Refactored successfully.");
