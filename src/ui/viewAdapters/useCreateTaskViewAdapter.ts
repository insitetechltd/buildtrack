import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTaskStore } from '../../state/taskStore.supabase';
import { useAuthStore } from '../../state/authStore';
import { useProjectStoreWithCompanyInit } from '../../state/projectStore.supabase';
import { useUserStoreWithInit } from '../../state/userStore.supabase';
import { useProjectFilterStore } from '../../state/projectFilterStore';
import { uploadFileWithVerification } from '../../api/fileUploadService';
import { useFileUpload } from '../../utils/useFileUpload';
import { usePhotoSelection, SelectedPhoto } from '../../utils/usePhotoSelection';
import { useTaskLLMAssistant } from '../../hooks/useTaskLLMAssistant';
import type {
  CreateTaskScreenViewAdapterOutput,
  CreateTaskFormModel,
  CreateTaskLocationOptionModel,
} from '../contracts/viewAdapters';
import {
  getCustomTaskTags,
  hasCriticalThisWeekTag,
  mergeTaskTags,
  resolvePrimaryAssigneeId,
} from '../contracts/taskTags';
import { Priority, TaskCategory, BillingStatus, TaskStatus } from '../../types/buildtrack';
import { getAssignableProjectUsers } from '../../screens/createTaskAssignees';
import { useTranslation } from '../../utils/useTranslation';

export interface UseCreateTaskViewAdapterProps {
  editTaskId?: string;
  parentTaskId?: string;
  parentSubTaskId?: string;
  clearForm?: boolean;
  clearFormTimestamp?: number;
}

const FORM_DATA_STORAGE_KEY = '@createTask_formData';
const ADD_NEW_LOCATION_OPTION_VALUE = '__add_new_location__';
const NOOP_FETCH_PROJECT_LOCATIONS = async () => [];
const NOOP_ENSURE_PROJECT_LOCATION = async () => undefined;

function createEmptyFormData(): CreateTaskFormModel {
  return {
    title: '',
    description: '',
    taskReference: '',
    billingStatus: 'non_billable',
    priority: 'medium',
    category: 'general',
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    locationOnSite: '',
    assignedTo: [],
    primaryAssigneeId: '',
    customTags: [],
    isCriticalThisWeek: false,
    attachments: [],
    projectId: '',
  };
}

function buildRedesignMetadataPayload(formData: CreateTaskFormModel) {
  const assignedTo = formData.assignedTo;
  const primaryAssigneeId = resolvePrimaryAssigneeId(
    assignedTo,
    formData.primaryAssigneeId || undefined,
  );
  return {
    assignedTo,
    primaryAssigneeId: primaryAssigneeId || undefined,
    tags: mergeTaskTags({
      customTags: formData.customTags,
      isCriticalThisWeek: formData.isCriticalThisWeek,
    }),
  };
}

function isSelectedPhotoAttachment(attachment: unknown): attachment is SelectedPhoto {
  return Boolean(
    attachment &&
      typeof attachment === 'object' &&
      'uri' in (attachment as Record<string, unknown>) &&
      'fileName' in (attachment as Record<string, unknown>)
  );
}

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

function getProjectScopedLocationOptions(
  locationLabels: string[],
  addNewLabel: string,
  currentLocationOnSite?: string,
) {
  const normalizedOptions = new Set<string>();

  locationLabels.forEach((locationLabel) => {
    const normalizedLocation = locationLabel.trim();
    if (normalizedLocation) {
      normalizedOptions.add(normalizedLocation);
    }
  });

  const normalizedCurrentLocation = currentLocationOnSite?.trim();
  if (normalizedCurrentLocation) {
    normalizedOptions.add(normalizedCurrentLocation);
  }

  const options: CreateTaskLocationOptionModel[] = [{
    id: 'location-option-add-new',
    label: addNewLabel,
    value: ADD_NEW_LOCATION_OPTION_VALUE,
    isAddNew: true,
  }];

  options.push(...Array.from(normalizedOptions).map((locationValue) => ({
    id: `location-option-${locationValue}`,
    label: locationValue,
    value: locationValue,
  })));

  return options;
}

function areLocationLabelListsEqual(currentLabels: string[], nextLabels: string[]) {
  if (currentLabels.length !== nextLabels.length) {
    return false;
  }

  return currentLabels.every((label, index) => label === nextLabels[index]);
}

function appendUniqueLocationLabel(currentLabels: string[], nextLabel: string) {
  const normalizedNextLabel = nextLabel.trim();
  if (!normalizedNextLabel) {
    return currentLabels;
  }

  const normalizedNextLabelKey = normalizedNextLabel.toLocaleLowerCase();
  const hasMatch = currentLabels.some(
    (label) => label.trim().toLocaleLowerCase() === normalizedNextLabelKey,
  );

  if (hasMatch) {
    return currentLabels;
  }

  return [...currentLabels, normalizedNextLabel];
}

export function useCreateTaskViewAdapter({
  editTaskId,
  parentTaskId,
  parentSubTaskId,
  clearForm,
  clearFormTimestamp,
}: UseCreateTaskViewAdapterProps) {
  const { user } = useAuthStore();
  const t = useTranslation();
  const taskStore = useTaskStore();
  const {
    tasks,
    fetchTaskById,
    createTask,
    createSubTask,
    updateTask,
    fetchProjectLocations = NOOP_FETCH_PROJECT_LOCATIONS,
    ensureProjectLocation = NOOP_ENSURE_PROJECT_LOCATION,
  } = taskStore;
  const { getAllUsers } = useUserStoreWithInit();
  const projectStore = useProjectStoreWithCompanyInit(user?.companyId || "");
  const { getProjectsByUser, getProjectUserAssignments, fetchProjectUserAssignments } = projectStore;
  const selectedProjectId = useProjectFilterStore((state) => state.selectedProjectId);
  
  const [formData, setFormData] = useState<CreateTaskFormModel>(createEmptyFormData);

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
  const [projectLocationLabels, setProjectLocationLabels] = useState<string[]>([]);
  const handledClearFormRequestRef = useRef<string | null>(null);

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

  const clearFormRequestKey = clearForm
    ? String(clearFormTimestamp ?? "__legacy_clear_form__")
    : null;

  useEffect(() => {
    if (!clearFormRequestKey) {
      return;
    }

    if (handledClearFormRequestRef.current === clearFormRequestKey) {
      return;
    }

    handledClearFormRequestRef.current = clearFormRequestKey;
    AsyncStorage.removeItem(FORM_DATA_STORAGE_KEY);
    setFormData(createEmptyFormData());
  }, [clearFormRequestKey]);

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
    setFormData((previous) => {
      const assignedTo = previous.assignedTo.includes(userId)
        ? previous.assignedTo.filter((id) => id !== userId)
        : [...previous.assignedTo, userId];
      return {
        ...previous,
        assignedTo,
        primaryAssigneeId: resolvePrimaryAssigneeId(assignedTo, previous.primaryAssigneeId) || '',
      };
    });
  }, []);

  const setPrimaryAssignee = useCallback((userId: string) => {
    setFormData((previous) => {
      if (!previous.assignedTo.includes(userId)) {
        return previous;
      }
      return { ...previous, primaryAssigneeId: userId };
    });
  }, []);

  const addCustomTag = useCallback((rawTag: string) => {
    const tag = rawTag.trim().toLowerCase().replace(/\s+/g, '_');
    if (!tag) {
      return;
    }
    setFormData((previous) => {
      if (previous.customTags.includes(tag)) {
        return previous;
      }
      return { ...previous, customTags: [...previous.customTags, tag] };
    });
  }, []);

  const removeCustomTag = useCallback((tag: string) => {
    setFormData((previous) => ({
      ...previous,
      customTags: previous.customTags.filter((entry) => entry !== tag),
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
        locationOnSite: editTask.locationOnSite || '',
        assignedTo: editTask.assignedTo || [],
        primaryAssigneeId:
          resolvePrimaryAssigneeId(editTask.assignedTo || [], editTask.primaryAssigneeId) || '',
        customTags: getCustomTaskTags(editTask.tags),
        isCriticalThisWeek: hasCriticalThisWeekTag(editTask.tags),
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

  useEffect(() => {
    let cancelled = false;

    if (!activeProjectId) {
      setProjectLocationLabels((currentLabels) => (
        currentLabels.length === 0 ? currentLabels : []
      ));
      return () => {
        cancelled = true;
      };
    }

    void (async () => {
      try {
        const locations = await fetchProjectLocations(activeProjectId);
        if (cancelled) {
          return;
        }

        const nextLabels = locations
          .map((location) => location.label?.trim())
          .filter((locationLabel): locationLabel is string => Boolean(locationLabel));

        setProjectLocationLabels((currentLabels) => (
          areLocationLabelListsEqual(currentLabels, nextLabels) ? currentLabels : nextLabels
        ));
      } catch (error) {
        console.error('Failed to fetch project locations', error);
        if (!cancelled) {
          setProjectLocationLabels((currentLabels) => (
            currentLabels.length === 0 ? currentLabels : []
          ));
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeProjectId, fetchProjectLocations]);

  const locationOptions = useMemo(
    () =>
      getProjectScopedLocationOptions(
        projectLocationLabels,
        t.createTask.addNewLocation,
        formData.locationOnSite,
      ),
    [formData.locationOnSite, projectLocationLabels, t.createTask.addNewLocation]
  );

  const saveLocationOnSiteSelection = async (locationLabel: string) => {
    const trimmedLocationOnSite = locationLabel.trim();
    if (!trimmedLocationOnSite) {
      return false;
    }

    updateField("locationOnSite", trimmedLocationOnSite);
    setProjectLocationLabels((currentLabels) => appendUniqueLocationLabel(currentLabels, trimmedLocationOnSite));

    if (!formData.projectId) {
      return true;
    }

    await ensureProjectLocation(formData.projectId, trimmedLocationOnSite, user?.id);
    return true;
  };

  const normalizeAttachmentsForSubmission = useCallback(async (
    attachments: CreateTaskFormModel['attachments'],
    entityId?: string,
  ) => {
    const durableAttachments = attachments.filter(
      (attachment): attachment is string => typeof attachment === 'string',
    );
    const localPhotos = attachments.filter(isSelectedPhotoAttachment);

    if (!entityId || localPhotos.length === 0 || !user?.companyId || !user?.id) {
      return {
        baseAttachments: durableAttachments,
        uploadedAttachments: [] as string[],
      };
    }

    const uploadedAttachments: string[] = [];

    for (const photo of localPhotos) {
      const result = await uploadFileWithVerification({
        file: {
          uri: photo.annotatedUri || photo.uri,
          name: photo.fileName,
          type: 'image/jpeg',
        },
        entityType: 'task',
        entityId,
        companyId: user.companyId,
        userId: user.id,
      });

      if (!result.success || !result.file?.public_url) {
        throw new Error(result.error || 'Photo upload failed');
      }

      uploadedAttachments.push(result.file.public_url);
    }

    return {
      baseAttachments: durableAttachments,
      uploadedAttachments,
    };
  }, [user?.companyId, user?.id]);

  const submit = async (options?: { editReason?: string }) => {
    if (!validateForm()) return false;
    setIsSubmitting(true);
    try {
      const trimmedLocationOnSite = formData.locationOnSite.trim() || undefined;
      const existingAttachmentUrls = formData.attachments.filter(
        (attachment): attachment is string => typeof attachment === 'string',
      );

      if (formData.projectId && trimmedLocationOnSite) {
        await ensureProjectLocation(formData.projectId, trimmedLocationOnSite, user?.id);
      }

      // Basic submit logic extracted from screen
      const redesignMetadata = buildRedesignMetadataPayload(formData);

      if (editTaskId) {
        const { baseAttachments, uploadedAttachments } = await normalizeAttachmentsForSubmission(
          formData.attachments,
          editTaskId,
        );
        await updateTask(editTaskId, {
          title: formData.title,
          description: formData.description,
          taskReference: formData.taskReference || undefined,
          projectId: formData.projectId,
          priority: formData.priority as Priority,
          category: formData.category as TaskCategory,
          billingStatus: formData.billingStatus as BillingStatus,
          dueDate: formData.dueDate.toISOString(),
          locationOnSite: trimmedLocationOnSite,
          ...redesignMetadata,
          attachments: [...baseAttachments, ...uploadedAttachments],
          _editReason: options?.editReason,
        } as Partial<any>);
      } else if (parentTaskId) {
        const createdSubTaskId = await createSubTask(parentTaskId, {
          title: formData.title,
          description: formData.description,
          taskReference: formData.taskReference || undefined,
          billingStatus: formData.billingStatus as BillingStatus,
          projectId: formData.projectId,
          priority: formData.priority as Priority,
          category: formData.category as TaskCategory,
          dueDate: formData.dueDate.toISOString(),
          locationOnSite: trimmedLocationOnSite,
          ...redesignMetadata,
          assignedBy: user?.id || '',
          attachments: existingAttachmentUrls,
        });
        const { baseAttachments, uploadedAttachments } = await normalizeAttachmentsForSubmission(
          formData.attachments,
          createdSubTaskId,
        );
        if (uploadedAttachments.length > 0) {
          await updateTask(createdSubTaskId, {
            attachments: [...baseAttachments, ...uploadedAttachments],
          } as Partial<any>);
        }
      } else {
        const createdTaskId = await createTask({
          title: formData.title,
          description: formData.description,
          taskReference: formData.taskReference || undefined,
          billingStatus: formData.billingStatus as BillingStatus,
          projectId: formData.projectId,
          priority: formData.priority as Priority,
          category: formData.category as TaskCategory,
          dueDate: formData.dueDate.toISOString(),
          locationOnSite: trimmedLocationOnSite,
          ...redesignMetadata,
          assignedBy: user?.id || '',
          attachments: existingAttachmentUrls,
        });
        const { baseAttachments, uploadedAttachments } = await normalizeAttachmentsForSubmission(
          formData.attachments,
          createdTaskId,
        );
        if (uploadedAttachments.length > 0) {
          await updateTask(createdTaskId, {
            attachments: [...baseAttachments, ...uploadedAttachments],
          } as Partial<any>);
        }
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

  const clearDraftPayloads = useCallback(async () => {
    try {
      await AsyncStorage.multiRemove([
        "draftCreateTask",
        "createTask_camera_return_photos",
        "createTask_camera_return_context",
        "createTask_camera_return_timestamp",
      ]);
      setFormData(createEmptyFormData());
    } catch (e) {
      console.error("Failed to clear task drafts", e);
    }
  }, []);

  const outputGenerateSuggestionFromText = useCallback(async () => {
    await generateSuggestionFromText();
  }, [generateSuggestionFromText]);

  const outputSuggestTaskFromText = useCallback(async () => {
    await generateSuggestionFromText();
  }, [generateSuggestionFromText]);

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
    },
    generateSuggestionFromText: outputGenerateSuggestionFromText,
    suggestTaskFromText: outputSuggestTaskFromText,
    clearSuggestion,
    clearDraftPayloads,
  };

  return {
    output,
    actions: {
      clearDraftPayloads,
      updateField,
      togglePicker,
      submit,
      setUserSearchQuery,
      toggleUserSelection,
      setPrimaryAssignee,
      addCustomTag,
      removeCustomTag,
      removeAttachment,
      setTextInput,
      saveLocationOnSiteSelection,
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
      clearSuggestion,
    },
  };
}
