const fs = require('fs');

const screenPath = 'src/screens/CreateTaskScreen.tsx';
const adapterPath = 'src/ui/viewAdapters/useCreateTaskViewAdapter.ts';

const lines = fs.readFileSync(screenPath, 'utf8').split('\n');

const startIndex = lines.findIndex(line => line.includes('export default function CreateTaskScreen'));

// Find the main return by looking for the one after handleEditReasonSubmit
const editReasonIndex = lines.findIndex(line => line.includes('const handleEditReasonSubmit = async () => {'));
let returnIndex = -1;
for (let i = editReasonIndex; i < lines.length; i++) {
  if (lines[i] === '  return (') {
    returnIndex = i;
    break;
  }
}

const imports = `import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { AppState, AppStateStatus, Alert, ScrollView, TextInput } from 'react-native';
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
import { isAdmin } from "../../types/buildtrack";
import type { CreateTaskScreenViewAdapterOutput, CreateTaskFormModel } from '../contracts/viewAdapters';
`;

// Find type definitions
const typeStart = lines.findIndex(line => line.includes('type Attachment = string'));
const typeEnd = startIndex - 1;
const typesBlock = lines.slice(typeStart, typeEnd).join('\n');

let componentBody = lines.slice(startIndex + 1, returnIndex).join('\n');

// Remove early returns from componentBody
componentBody = componentBody.replace(/if \(!user\) return null;/, '');
componentBody = componentBody.replace(/if \(isAdmin\(user\)\) \{[\s\S]*?\}\s*$/, '');

const adapterCode = `${imports}

${typesBlock}

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
  onNavigateToProfile?: () => void;
  onNavigateToProjectPicker?: (allowBack?: boolean) => void;
}

export function useCreateTaskViewAdapter(props: UseCreateTaskViewAdapterProps) {
  const { 
    editTaskId, parentTaskId, parentSubTaskId, clearForm, 
    actionType, uploadedPhotoUrls, selectedPhotos: selectedPhotosProp, 
    clearFormTimestamp, onNavigateBack, onNavigateToProfile, onNavigateToProjectPicker
  } = props;
  
${componentBody}

  return {
    isTaskActionScreen: effectiveActionType && effectiveActionType !== 'edit' && editTaskId,
    effectiveActionType,
    isAdminUser: !!user && isAdmin(user),
    user,
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
      flushPersistDraft,
      handleEditReasonSubmit,
      setShowEditReasonModal,
      editReason,
      setEditReason,
      showEditReasonModal,
      scrollViewRef,
      titleInputRef,
      descriptionInputRef,
      taskReferenceInputRef
    }
  };
}
`;

fs.writeFileSync(adapterPath, adapterCode);

const screenCode = lines.slice(0, typeStart).join('\n') + `
import { useCreateTaskViewAdapter } from '../ui/viewAdapters/useCreateTaskViewAdapter';

interface CreateTaskScreenProps {
  onNavigateBack: () => void;
  parentTaskId?: string;
  parentSubTaskId?: string;
  editTaskId?: string;
  actionType?: 'edit' | 'update' | 'photos' | 'comment' | 'reassign';
  uploadedPhotoUrls?: string[];
  selectedPhotos?: SelectedPhoto[];
  clearForm?: boolean;
  clearFormTimestamp?: number;
  onNavigateToProfile?: () => void;
  onNavigateToProjectPicker?: (allowBack?: boolean) => void;
}

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

export default function CreateTaskScreen(props: CreateTaskScreenProps) {
  const adapter = useCreateTaskViewAdapter(props);
  const t = useTranslation();
  
  if (adapter.isTaskActionScreen) {
    return <TaskActionScreen 
      actionType={adapter.effectiveActionType as any} 
      taskId={props.editTaskId!} 
      onNavigateBack={props.onNavigateBack}
      onNavigateToProfile={props.onNavigateToProfile}
      onNavigateToProjectPicker={props.onNavigateToProjectPicker}
    />;
  }

  if (!adapter.user) return null;

  if (adapter.isAdminUser) {
    return (
      <SafeAreaView edges={['bottom', 'left', 'right']} className="flex-1 bg-gray-50">
        <StatusBar style="dark" />
        <StandardHeader
          title={t.tasks.createTask}
          showBackButton={true}
          onBackPress={props.onNavigateBack}
          onProfilePress={props.onNavigateToProfile}
        />
        <View className="flex-1 items-center justify-center p-6">
          <Ionicons name="shield-half" size={64} color="#9CA3AF" />
          <Text className="text-xl font-bold text-gray-900 mt-4 text-center">
            {t.tasks.adminAccessOnly}
          </Text>
          <Text className="text-base text-gray-500 text-center mt-2">
            {t.tasks.adminCannotCreate}
          </Text>
          <Pressable
            onPress={props.onNavigateBack}
            className="mt-8 bg-blue-600 px-6 py-3 rounded-xl"
          >
            <Text className="text-white font-semibold text-base">
              {t.common.goBack}
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
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
    filteredAssignableUsers, userProjects, editTask, parentTask, submit,
    handleEditReasonSubmit, setShowEditReasonModal, editReason, setEditReason, showEditReasonModal,
    scrollViewRef, titleInputRef, descriptionInputRef, taskReferenceInputRef
  } = actions;

  const dateFormatter = useDateFormatter();
  const parentTaskId = props.parentTaskId;
  const parentSubTaskId = props.parentSubTaskId;
  const editTaskId = props.editTaskId;

` + lines.slice(returnIndex).join('\n');

fs.writeFileSync(screenPath, screenCode);
console.log("Refactored properly!");
