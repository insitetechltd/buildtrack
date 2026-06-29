import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTaskStore } from '../../state/taskStore.supabase';
import { useAuthStore } from '../../state/authStore';
import { useProjectStoreWithCompanyInit } from '../../state/projectStore.supabase';
import { useUserStoreWithInit } from '../../state/userStore.supabase';
import { useFileUpload } from '../../utils/useFileUpload';
import { usePhotoSelection, SelectedPhoto } from '../../utils/usePhotoSelection';
import { useTaskLLMAssistant } from '../../hooks/useTaskLLMAssistant';
import type { CreateTaskScreenViewAdapterOutput, CreateTaskFormModel } from '../contracts/viewAdapters';
import { Priority, TaskCategory, BillingStatus } from '../../types/buildtrack';

export interface UseCreateTaskViewAdapterProps {
  editTaskId?: string;
  parentTaskId?: string;
  parentSubTaskId?: string;
  clearForm?: boolean;
}

const FORM_DATA_STORAGE_KEY = '@createTask_formData';
const SELECTED_USERS_STORAGE_KEY = '@createTask_selectedUsers';

export function useCreateTaskViewAdapter({
  editTaskId,
  parentTaskId,
  parentSubTaskId,
  clearForm
}: UseCreateTaskViewAdapterProps) {
  const { user } = useAuthStore();
  const { tasks, fetchTaskById, createTask, createSubTask, updateTask } = useTaskStore();
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
  const { isUploading } = useFileUpload();
  
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
  const [acceptedFields, setAcceptedFields] = useState<Set<string>>(new Set());

  // 1. AsyncStorage Persistence Logic
  const persistDraftTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const persistDraft = useCallback(async (data: CreateTaskFormModel) => {
    try {
      await AsyncStorage.setItem(FORM_DATA_STORAGE_KEY, JSON.stringify({
        ...data,
        dueDate: data.dueDate.toISOString()
      }));
    } catch (e) {
      console.error('Failed to persist draft', e);
    }
  }, []);

  useEffect(() => {
    if (clearForm) {
      AsyncStorage.removeItem(FORM_DATA_STORAGE_KEY);
      setFormData({
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
    }
  }, [clearForm]);

  useEffect(() => {
    if (persistDraftTimeoutRef.current) {
      clearTimeout(persistDraftTimeoutRef.current);
    }
    persistDraftTimeoutRef.current = setTimeout(() => {
      persistDraft(formData);
    }, 1000);
    return () => {
      if (persistDraftTimeoutRef.current) clearTimeout(persistDraftTimeoutRef.current);
    };
  }, [formData, persistDraft]);

  // 2. Validation Logic
  const validateForm = useCallback(() => {
    const newErrors: Record<string, string> = {};
    if (!formData.title.trim()) newErrors.title = 'Title is required';
    if (!formData.description.trim()) newErrors.description = 'Description is required';
    if (!formData.projectId) newErrors.projectId = 'Project is required';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  // 3. Actions
  const updateField = useCallback((field: keyof CreateTaskFormModel, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const togglePicker = useCallback((picker: keyof typeof pickers, show: boolean) => {
    setPickers(prev => ({ ...prev, [picker]: show }));
  }, []);

  const submit = async () => {
    if (!validateForm()) return;
    setIsSubmitting(true);
    try {
      // Basic submit logic extracted from screen
      if (editTaskId) {
        await updateTask(editTaskId, {
          title: formData.title,
          description: formData.description,
          projectId: formData.projectId,
          priority: formData.priority as Priority,
          category: formData.category as TaskCategory,
          billingStatus: formData.billingStatus as BillingStatus,
          dueDate: formData.dueDate.toISOString(),
          assignedTo: formData.assignedTo,
          attachments: formData.attachments,
        });
      } else if (parentTaskId) {
        await createSubTask(parentTaskId, {
          title: formData.title,
          description: formData.description,
          taskReference: formData.taskReference || undefined,
          billingStatus: formData.billingStatus as BillingStatus,
          projectId: formData.projectId,
          priority: formData.priority as Priority,
          category: formData.category as TaskCategory,
          dueDate: formData.dueDate.toISOString(),
          assignedTo: formData.assignedTo,
          assignedBy: user?.id || '',
          attachments: formData.attachments,
        });
      } else {
        await createTask({
          title: formData.title,
          description: formData.description,
          taskReference: formData.taskReference || undefined,
          billingStatus: formData.billingStatus as BillingStatus,
          projectId: formData.projectId,
          priority: formData.priority as Priority,
          category: formData.category as TaskCategory,
          dueDate: formData.dueDate.toISOString(),
          assignedTo: formData.assignedTo,
          assignedBy: user?.id || '',
          attachments: formData.attachments,
        });
      }
      await AsyncStorage.removeItem(FORM_DATA_STORAGE_KEY);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const output: CreateTaskScreenViewAdapterOutput = {
    readiness: {
      isSubmitting,
      isLoadingUsers,
      isUploading,
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
      suggestTaskFromText,
      clearSuggestion
    }
  };
}
