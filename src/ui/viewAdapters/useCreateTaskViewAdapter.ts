import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTaskStore } from '../../state/taskStore.supabase';
import { useAuthStore } from '../../state/authStore';
import { useProjectStoreWithCompanyInit } from '../../state/projectStore.supabase';
import { useUserStoreWithInit } from '../../state/userStore.supabase';
import { useProjectFilterStore } from '../../state/projectFilterStore';
import { useFileUpload } from '../../utils/useFileUpload';
import { usePhotoSelection, SelectedPhoto } from '../../utils/usePhotoSelection';
import { useTaskLLMAssistant } from '../../hooks/useTaskLLMAssistant';
import { CRITICAL_THIS_WEEK_TAG } from '../contracts/viewAdapters';
import type { CreateTaskScreenViewAdapterOutput, CreateTaskFormModel } from '../contracts/viewAdapters';
import { Priority, TaskCategory, BillingStatus, TaskStatus } from '../../types/buildtrack';
import { getAssignableProjectUsers } from '../../screens/createTaskAssignees';
import { useTranslation } from '../../utils/useTranslation';

export interface UseCreateTaskViewAdapterProps {
  editTaskId?: string;
  parentTaskId?: string;
  parentSubTaskId?: string;
  clearForm?: boolean;
}

const FORM_DATA_STORAGE_KEY = '@createTask_formData';
const ADD_NEW_LOCATION_OPTION_VALUE = '__add_new_location__';

function areAssigneesLockedForStatus(status?: TaskStatus): boolean {
  return Boolean(
    status &&
      status !== 'new' &&
      status !== 'not_started' &&
      status !== 'rejected' &&
      status !== 'declined'
  );
}

function requiresEditReasonForStatus(status?: TaskStatus): boolean {
  return status === 'accepted' || status === 'in_progress' || status === 'submitted_for_review';
}

function hasCriticalThisWeekTag(tags?: string[]): boolean {
  return Array.isArray(tags) && tags.includes(CRITICAL_THIS_WEEK_TAG);
}

function withCriticalThisWeekTag(tags: string[] | undefined, isEnabled: boolean): string[] {
  const normalizedTags = Array.isArray(tags)
    ? tags.filter((tag) => Boolean(tag) && tag !== CRITICAL_THIS_WEEK_TAG)
    : [];

  return isEnabled ? [...normalizedTags, CRITICAL_THIS_WEEK_TAG] : normalizedTags;
}

function getProjectScopedLocationOptions(
  tasks: Array<{ projectId?: string; locationOnSite?: string }>,
  projectId: string,
  currentLocationOnSite?: string,
) {
  const normalizedOptions = new Set<string>();

  tasks.forEach((task) => {
    if (task.projectId !== projectId) {
      return;
    }

    const normalizedLocation = task.locationOnSite?.trim();
    if (normalizedLocation) {
      normalizedOptions.add(normalizedLocation);
    }
  });

  const normalizedCurrentLocation = currentLocationOnSite?.trim();
  if (normalizedCurrentLocation) {
    normalizedOptions.add(normalizedCurrentLocation);
  }

  const options = Array.from(normalizedOptions).map((locationValue) => ({
    id: `location-option-${locationValue}`,
    label: locationValue,
    value: locationValue,
  }));

  options.push({
    id: 'location-option-add-new',
    label: 'Add new location',
    value: ADD_NEW_LOCATION_OPTION_VALUE,
    isAddNew: true,
  });

  return options;
}

export function useCreateTaskViewAdapter({
  editTaskId,
  parentTaskId,
  parentSubTaskId,
  clearForm
}: UseCreateTaskViewAdapterProps) {
  const { user } = useAuthStore();
  const t = useTranslation();
  const { tasks, fetchTaskById, createTask, createSubTask, updateTask } = useTaskStore();
  const { getAllUsers } = useUserStoreWithInit();
  const projectStore = useProjectStoreWithCompanyInit(user?.companyId || "");
  const { getProjectsByUser, getProjectUserAssignments, fetchProjectUserAssignments } = projectStore;
  const selectedProjectId = useProjectFilterStore((state) => state.selectedProjectId);
  
  const [formData, setFormData] = useState<CreateTaskFormModel>({
    title: '',
    description: '',
    taskReference: '',
    billingStatus: 'non_billable',
    priority: 'medium',
    category: 'general',
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    criticalThisWeek: false,
    locationOnSite: '',
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
    error: llmError,
    lastSuggestion,
    clearSuggestion,
    clearError,
  } = useTaskLLMAssistant();
  
  const [textInput, setTextInput] = useState('');
  const [showSuggestionPreview, setShowSuggestionPreview] = useState(false);
  const [acceptedFields, setAcceptedFields] = useState<Set<string>>(new Set());
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [showEditReasonModal, setShowEditReasonModal] = useState(false);
  const [editReason, setEditReason] = useState('');

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
    let cancelled = false;

    if (clearForm || editTaskId) {
      return () => {
        cancelled = true;
      };
    }

    void (async () => {
      try {
        const storedDraft = await AsyncStorage.getItem(FORM_DATA_STORAGE_KEY);
        if (!storedDraft) {
          return;
        }

        const parsedDraft = JSON.parse(storedDraft) as Partial<CreateTaskFormModel> & {
          dueDate?: string;
        };

        if (cancelled) {
          return;
        }

        setFormData((previous) => {
          const isPristine =
            !previous.title &&
            !previous.description &&
            !previous.taskReference &&
            !previous.projectId &&
            previous.assignedTo.length === 0 &&
            previous.attachments.length === 0;

          if (!isPristine) {
            return previous;
          }

          const nextDueDate = parsedDraft.dueDate ? new Date(parsedDraft.dueDate) : previous.dueDate;

          return {
            ...previous,
            ...parsedDraft,
            dueDate: nextDueDate,
          };
        });
      } catch (e) {
        console.error('Failed to hydrate draft', e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [clearForm, editTaskId]);

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
        criticalThisWeek: false,
        locationOnSite: '',
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

  const editTask = useMemo(
    () => (editTaskId ? tasks.find((task) => task.id === editTaskId) : null),
    [editTaskId, tasks]
  );
  const parentTask = useMemo(
    () => (parentTaskId ? tasks.find((task) => task.id === parentTaskId) : null),
    [parentTaskId, tasks]
  );
  const parentSubTask = useMemo(
    () =>
      parentSubTaskId
        ? tasks.find(
            (task) => task.id === parentSubTaskId && task.parentTaskId === parentTaskId,
          )
        : null,
    [parentSubTaskId, parentTaskId, tasks]
  );
  const userProjects = useMemo(() => getProjectsByUser(user?.id || ''), [getProjectsByUser, user?.id]);
  const activeProjectId = formData.projectId || selectedProjectId || '';
  const activeProject = useMemo(
    () => userProjects.find((project) => project.id === activeProjectId),
    [activeProjectId, userProjects]
  );
  const allAssignableUsers = useMemo(
    () =>
      getAssignableProjectUsers({
        projectId: activeProjectId,
        assignments: getProjectUserAssignments(activeProjectId),
        users: getAllUsers(),
      }),
    [activeProjectId, getAllUsers, getProjectUserAssignments]
  );
  const filteredAssignableUsers = useMemo(() => {
    if (!userSearchQuery) {
      return allAssignableUsers;
    }

    const query = userSearchQuery.toLowerCase();
    return allAssignableUsers.filter((assignableUser) => {
      return (
        (assignableUser.name?.toLowerCase() || '').includes(query) ||
        (assignableUser.email?.toLowerCase() || '').includes(query)
      );
    });
  }, [allAssignableUsers, userSearchQuery]);
  const assigneesLocked = areAssigneesLockedForStatus(editTask?.status as TaskStatus | undefined);
  const requiresEditReason = requiresEditReasonForStatus(editTask?.status as TaskStatus | undefined);

  const context = useMemo(() => {
    const headerTitle = editTaskId
      ? t.createTask.editTask
      : parentTaskId
        ? parentSubTaskId && parentSubTask
          ? t.createTask.nestedSubTask
          : t.createTask.createSubTask
        : t.createTask.createNewTask;

    const parentBanner =
      parentTask && (parentSubTask || parentTask)
        ? {
            label: parentSubTask ? t.createTask.nestedUnder : t.createTask.subTaskOf,
            title: parentSubTask?.title || parentTask.title,
          }
        : null;

    return {
      headerTitle,
      activeProjectId,
      activeProjectName: activeProject?.name,
      assigneesLocked,
      requiresEditReason,
      parentBanner,
    };
  }, [
    activeProject?.name,
    activeProjectId,
    assigneesLocked,
    editTaskId,
    parentSubTask,
    parentSubTaskId,
    parentTask,
    parentTaskId,
    requiresEditReason,
    t.createTask.createNewTask,
    t.createTask.createSubTask,
    t.createTask.editTask,
    t.createTask.nestedSubTask,
    t.createTask.nestedUnder,
    t.createTask.subTaskOf,
  ]);

  const toggleUserSelection = useCallback((userId: string) => {
    setFormData((previous) => ({
      ...previous,
      assignedTo: previous.assignedTo.includes(userId)
        ? previous.assignedTo.filter((id) => id !== userId)
        : [...previous.assignedTo, userId],
    }));
  }, []);

  const removeAttachment = useCallback((index: number) => {
    setFormData((previous) => ({
      ...previous,
      attachments: previous.attachments.filter((_, attachmentIndex) => attachmentIndex !== index),
    }));
  }, []);

  const updateSuggestionField = useCallback(
    (field: keyof CreateTaskFormModel, value: CreateTaskFormModel[keyof CreateTaskFormModel]) => {
      updateField(field, value);
      setAcceptedFields((previous) => {
        const next = new Set(previous);
        next.add(field);
        return next;
      });
    },
    [updateField]
  );

  const toggleSuggestionField = useCallback(
    (field: keyof CreateTaskFormModel, value: CreateTaskFormModel[keyof CreateTaskFormModel]) => {
      setAcceptedFields((previous) => {
        const next = new Set(previous);
        if (next.has(field)) {
          next.delete(field);
        } else {
          next.add(field);
          updateField(field, value);
        }
        return next;
      });
    },
    [updateField]
  );

  const dismissSuggestionPreview = useCallback(() => {
    setShowSuggestionPreview(false);
    clearSuggestion();
    setAcceptedFields(new Set());
  }, [clearSuggestion]);

  const generateSuggestionFromText = useCallback(async () => {
    if (!textInput.trim()) {
      return null;
    }

    const suggestion = await suggestTaskFromText(textInput.trim(), editTask || undefined);
    if (suggestion) {
      setShowSuggestionPreview(true);
      setAcceptedFields(new Set());
      setTextInput('');
    }

    return suggestion;
  }, [editTask, suggestTaskFromText, textInput]);

  useEffect(() => {
    if (editTask) {
      setFormData({
        title: editTask.title,
        description: editTask.description || '',
        taskReference: editTask.taskReference || '',
        billingStatus: editTask.billingStatus || 'non_billable',
        priority: editTask.priority || 'medium',
        category: editTask.category || 'general',
        dueDate: new Date(editTask.dueDate),
        criticalThisWeek: hasCriticalThisWeekTag(editTask.tags),
        locationOnSite: editTask.locationOnSite || '',
        assignedTo: editTask.assignedTo || [],
        attachments: editTask.attachments || [],
        projectId: editTask.projectId || '',
      });
    }
  }, [editTask]);

  useEffect(() => {
    if (!editTaskId && !formData.projectId && selectedProjectId) {
      updateField('projectId', selectedProjectId);
    }
  }, [editTaskId, formData.projectId, selectedProjectId, updateField]);

  useEffect(() => {
    if (activeProjectId) {
      void fetchProjectUserAssignments(activeProjectId);
    }
  }, [activeProjectId, fetchProjectUserAssignments]);

  const locationOptions = useMemo(
    () => getProjectScopedLocationOptions(tasks, activeProjectId, formData.locationOnSite),
    [activeProjectId, formData.locationOnSite, tasks]
  );

  const submit = async (options?: { editReason?: string }) => {
    if (!validateForm()) return false;
    setIsSubmitting(true);
    try {
      const tags = withCriticalThisWeekTag(editTask?.tags, formData.criticalThisWeek);

      // Basic submit logic extracted from screen
      if (editTaskId) {
        await updateTask(editTaskId, {
          title: formData.title,
          description: formData.description,
          taskReference: formData.taskReference || undefined,
          projectId: formData.projectId,
          priority: formData.priority as Priority,
          category: formData.category as TaskCategory,
          billingStatus: formData.billingStatus as BillingStatus,
          dueDate: formData.dueDate.toISOString(),
          locationOnSite: formData.locationOnSite.trim() || undefined,
          assignedTo: formData.assignedTo,
          attachments: formData.attachments,
          tags,
          _editReason: options?.editReason,
        } as Partial<any>);
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
          locationOnSite: formData.locationOnSite.trim() || undefined,
          assignedTo: formData.assignedTo,
          assignedBy: user?.id || '',
          attachments: formData.attachments,
          tags,
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
          locationOnSite: formData.locationOnSite.trim() || undefined,
          assignedTo: formData.assignedTo,
          assignedBy: user?.id || '',
          attachments: formData.attachments,
          tags,
        });
      }
      await AsyncStorage.removeItem(FORM_DATA_STORAGE_KEY);
      return true;
    } catch (e) {
      console.error(e);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasUsableData = Boolean(user);
  const isInitialLoading = !hasUsableData;

  const output: CreateTaskScreenViewAdapterOutput = {
    screenId: "CreateTaskScreen",
    readiness: {
      hasInitialFrame: true,
      hasUsableData,
      isBackgroundRefreshing: false,
      isNavigationTransitionActive: false,
    },
    continuity: {
      isInitialLoading,
      isBackgroundRefreshing: false,
      hasCachedFrame: hasUsableData,
      shouldRenderSkeletonShell: isInitialLoading,
      shouldRenderEmptyState: !hasUsableData,
      freshnessLabel: hasUsableData ? (isSubmitting ? "Submitting" : "Ready") : "Unavailable",
    },
    context,
    activity: {
      isSubmitting,
      isLoadingUsers,
      isUploading,
    },
    formData,
    errors,
    pickers,
    assigneePicker: {
      availableUsers: allAssignableUsers,
      userSearchQuery,
      filteredUsers: filteredAssignableUsers,
      selectedUserIds: formData.assignedTo,
    },
    locationPicker: {
      projectId: activeProjectId,
      options: locationOptions,
    },
    projects: {
      availableProjects: userProjects,
    },
    modals: {
      showEditReasonModal,
      editReason,
    },
    aiAssistant: {
      textInput,
      showSuggestionPreview,
      acceptedFields,
      isProcessing,
      lastSuggestion,
      error: llmError,
    }
  };

  return {
    output,
    actions: {
      updateField,
      togglePicker,
      submit,
      setUserSearchQuery,
      toggleUserSelection,
      removeAttachment,
      setTextInput,
      setShowSuggestionPreview,
      setAcceptedFields,
      setShowEditReasonModal,
      setEditReason,
      clearError,
      updateSuggestionField,
      toggleSuggestionField,
      dismissSuggestionPreview,
      generateSuggestionFromText,
      suggestTaskFromText,
      clearSuggestion
    }
  };
}
