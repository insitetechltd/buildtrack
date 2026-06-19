import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTaskStore } from '../../state/taskStore.supabase';
import { useAuthStore } from '../../state/authStore';
import { useProjectStoreWithCompanyInit } from '../../state/projectStore.supabase';
import { useUserStoreWithInit } from '../../state/userStore.supabase';
import { useFileUpload } from '../../utils/useFileUpload';
import { usePhotoSelection } from '../../utils/usePhotoSelection';
import { useTaskLLMAssistant } from '../../hooks/useTaskLLMAssistant';
import type { CreateTaskScreenViewAdapterOutput, CreateTaskFormModel } from '../contracts/viewAdapters';

export interface UseCreateTaskViewAdapterProps {
  editTaskId?: string;
  parentTaskId?: string;
  parentSubTaskId?: string;
  clearForm?: boolean;
}

export function useCreateTaskViewAdapter({
  editTaskId,
  parentTaskId,
  parentSubTaskId,
  clearForm
}: UseCreateTaskViewAdapterProps) {
  const { user } = useAuthStore();
  const { tasks, fetchTaskById } = useTaskStore();
  const { getUsersByRole } = useUserStoreWithInit();
  const projectStore = useProjectStoreWithCompanyInit(user?.companyId || "");
  const { getProjectsByUser, getProjectUserAssignments, fetchProjectUserAssignments } = projectStore;
  
  const [formData, setFormData] = useState<CreateTaskFormModel>({
    title: '',
    description: '',
    taskReference: '',
    billingStatus: 'non_billable',
    priority: 'medium',
    category: 'general',
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    assignedTo: [],
    attachments: [],
    projectId: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  
  const [pickers, setPickers] = useState({
    showDatePicker: false,
    showUserPicker: false,
    showPriorityPicker: false,
    showCategoryPicker: false,
    showBillingStatusPicker: false,
    showProjectPicker: false,
  });

  const {
    suggestTaskFromText,
    isLoading: isProcessing,
    lastSuggestion,
    clearSuggestion,
  } = useTaskLLMAssistant();
  
  const [textInput, setTextInput] = useState('');
  const [showSuggestionPreview, setShowSuggestionPreview] = useState(false);
  const [acceptedFields, setAcceptedFields] = useState<Record<string, boolean>>({});

  const updateField = useCallback((field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const togglePicker = useCallback((picker: string, show: boolean) => {
    setPickers(prev => ({ ...prev, [picker]: show }));
  }, []);

  const submit = async () => {
    setIsSubmitting(true);
    // submit logic
    setIsSubmitting(false);
  };

  const output: CreateTaskScreenViewAdapterOutput = {
    readiness: {
      isSubmitting,
      isLoadingUsers,
      isUploading: false,
    },
    formData,
    errors,
    pickers,
    aiAssistant: {
      textInput,
      showSuggestionPreview,
      acceptedFields,
      isProcessing,
    }
  };

  return {
    output,
    actions: {
      updateField,
      togglePicker,
      submit,
      setTextInput,
      setShowSuggestionPreview,
      setAcceptedFields,
      // add more actions as needed
    }
  };
}
