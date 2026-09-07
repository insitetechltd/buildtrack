import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { AppState, AppStateStatus, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTaskStore } from '../../state/taskStore.supabase';
import { useAuthStore } from '../../state/authStore';
import { useProjectStoreWithCompanyInit } from '../../state/projectStore.supabase';
import { useUserStoreWithInit } from '../../state/userStore.supabase';
import { useProjectFilterStore } from '../../state/projectFilterStore';
import { uploadFileWithVerification } from '../../api/fileUploadService';
import { ensureCappedLocalPhoto } from '../../utils/ensureCappedLocalPhoto';
import { useFileUpload } from '../../utils/useFileUpload';
import { usePhotoSelection, SelectedPhoto } from '../../utils/usePhotoSelection';
import { useTaskLLMAssistant } from '../../hooks/useTaskLLMAssistant';
import type {
  CreateTaskScreenViewAdapterOutput,
  CreateTaskFormModel,
  CreateTaskLocationOptionModel,
  CreateTaskIntentMode,
} from '../contracts/viewAdapters';
import {
  getCustomTaskTags,
  hasCriticalThisWeekTag,
  mergeTaskTags,
  resolvePrimaryAssigneeId,
} from '../contracts/taskTags';
import {
  mergeAssignedToIds,
  normalizeDelegatedUserIds,
} from '../contracts/taskDelegation';
import {
  canEditTaskDelegation,
  canSelectUserAsAssignee,
  filterSelectableAssigneeUsers,
  resolveAssigneeRoleFromUser,
} from '../contracts/taskDelegationPermissions';
import {
  normalizeContainerLabel,
  shouldShowContainerOrganization,
  type ProjectContainerRecord,
} from '../contracts/taskContainers';
import { Priority, TaskCategory, BillingStatus, TaskStatus, isManagerOrAdmin } from '../../types/buildtrack';
import { getSessionScopedSupabase } from '../../api/supabaseSessionGate';
import { getAssignableProjectUsers } from '../../screens/createTaskAssignees';
import { resolveWorkspaceProjectId } from '../contracts/workspaceProject';
import { useTranslation, getNestedTranslation } from '../../utils/useTranslation';
import { mergeUniqueAttachments } from '../../utils/mergeTaskAttachments';
import { taskRequiresAssignees } from '../../utils/taskUpdateValidation';
import { resolveInitialTaskCreateStatus } from '../../utils/taskCreateValidation';
import {
  deleteLocalTaskDraft,
  deserializeCreateTaskForm,
  draftTitleValidationMessage,
  getLocalTaskDraft,
  isDraftTitleValid,
  saveLocalTaskDraft,
} from '../../utils/localTaskDraftStore';

export interface UseCreateTaskViewAdapterProps {
  editTaskId?: string;
  localDraftId?: string;
  parentTaskId?: string;
  parentSubTaskId?: string;
  clearForm?: boolean;
  clearFormTimestamp?: number;
  /** Peer entry from Report | New Task chooser. */
  intent?: "report" | "create";
  /** edit | triage (promote reported) | other Task Detail actions */
  actionType?: "edit" | "update" | "photos" | "comment" | "reassign" | "triage";
}
const ADD_NEW_LOCATION_OPTION_VALUE = '__add_new_location__';
const NOOP_FETCH_PROJECT_LOCATIONS = async () => [];
const NOOP_ENSURE_PROJECT_LOCATION = async () => undefined;
const NOOP_FETCH_PROJECT_CONTAINERS = async (): Promise<ProjectContainerRecord[]> => [];
const NOOP_ENSURE_PROJECT_CONTAINER = async () => null;

function createEmptyFormData(defaultIntent?: CreateTaskIntentMode): CreateTaskFormModel {
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
    containerId: '',
    subContainerId: '',
    customTags: [],
    isCriticalThisWeek: false,
    attachments: [],
    projectId: '',
    intentMode: defaultIntent ?? 'full_task',
  };
}

function createFormDataForIntentMode(
  intentMode: CreateTaskIntentMode,
  userId?: string,
): CreateTaskFormModel {
  const empty = createEmptyFormData(intentMode);
  if (intentMode === "my_task" && userId) {
    return {
      ...empty,
      assignedTo: [userId],
      primaryAssigneeId: userId,
    };
  }
  return empty;
}

function buildRedesignMetadataPayload(formData: CreateTaskFormModel) {
  const primaryAssigneeId = resolvePrimaryAssigneeId(
    formData.assignedTo,
    formData.primaryAssigneeId || undefined,
  );
  const delegatedUserIds = normalizeDelegatedUserIds(
    formData.assignedTo,
    primaryAssigneeId,
  );
  const assignedTo = mergeAssignedToIds({
    assignedTo: formData.assignedTo,
    primaryAssigneeId,
    delegatedUserIds,
  });
  return {
    assignedTo,
    primaryAssigneeId: primaryAssigneeId || undefined,
    delegatedUserIds,
    containerId: formData.containerId || undefined,
    subContainerId: formData.subContainerId || undefined,
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
  localDraftId,
  parentTaskId,
  parentSubTaskId,
  clearForm,
  clearFormTimestamp,
  intent: routeIntent,
  actionType,
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
    triageTask,
    fetchProjectLocations = NOOP_FETCH_PROJECT_LOCATIONS,
    ensureProjectLocation = NOOP_ENSURE_PROJECT_LOCATION,
    fetchProjectContainers = NOOP_FETCH_PROJECT_CONTAINERS,
    ensureProjectContainer = NOOP_ENSURE_PROJECT_CONTAINER,
  } = taskStore;
  const { getAllUsers, fetchUsers, fetchUsersByCompany } = useUserStoreWithInit();
  const projectStore = useProjectStoreWithCompanyInit(user?.companyId || "");
  const { getProjectsByUser, getProjectUserAssignments, fetchProjectUserAssignments } = projectStore;
  const selectedProjectId = useProjectFilterStore((state) => state.selectedProjectId);
  const setSelectedProject = useProjectFilterStore((state) => state.setSelectedProject);

  const isWorker = !isManagerOrAdmin(user);
  const defaultIntentMode: CreateTaskIntentMode = (() => {
    if (editTaskId || parentTaskId) {
      return "full_task";
    }
    if (routeIntent === "report") {
      // PMs must not enter report this pass — fall through to create.
      return isWorker ? "report_issue" : "full_task";
    }
    if (routeIntent === "create") {
      return isWorker ? "my_task" : "full_task";
    }
    // Deep links / drafts without chooser: workers default to create-for-self (not report).
    return isWorker ? "my_task" : "full_task";
  })();

  const [formData, setFormData] = useState<CreateTaskFormModel>(() =>
    createFormDataForIntentMode(defaultIntentMode, user?.id),
  );

  const setIntentMode = useCallback(
    (intentMode: CreateTaskIntentMode) => {
      setFormData((previous) => ({
        ...previous,
        intentMode,
        assignedTo:
          intentMode === 'my_task' && user?.id
            ? [user.id]
            : intentMode === 'report_issue'
              ? []
              : previous.assignedTo,
        primaryAssigneeId:
          intentMode === 'my_task' && user?.id
            ? user.id
            : intentMode === 'report_issue'
              ? ''
              : previous.primaryAssigneeId,
      }));
      setErrors((previous) => {
        const next = { ...previous };
        delete next.assignedTo;
        return next;
      });
    },
    [user?.id],
  );

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
  const [projectContainers, setProjectContainers] = useState<ProjectContainerRecord[]>([]);
  const [containerOrganizationExpanded, setContainerOrganizationExpanded] = useState(false);
  const [containerDraft, setContainerDraft] = useState('');
  const [activeLocalDraftId, setActiveLocalDraftId] = useState<string | undefined>(
    localDraftId,
  );
  const handledClearFormRequestRef = useRef<string | null>(null);
  const handledLocalDraftLoadRef = useRef<string | null>(null);

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
    setFormData(createFormDataForIntentMode(defaultIntentMode, user?.id));
    setActiveLocalDraftId(undefined);
  }, [clearFormRequestKey, defaultIntentMode, user?.id]);

  useEffect(() => {
    if (!localDraftId) {
      return;
    }

    if (handledLocalDraftLoadRef.current === localDraftId) {
      return;
    }

    let cancelled = false;
    void (async () => {
      const draft = await getLocalTaskDraft(localDraftId);
      if (!draft || cancelled) {
        return;
      }

      handledLocalDraftLoadRef.current = localDraftId;
      setActiveLocalDraftId(draft.id);
      setFormData(deserializeCreateTaskForm(draft.form));
    })();

    return () => {
      cancelled = true;
    };
  }, [localDraftId]);

  // 3. Actions (declared early so workspace hydrate can call updateField)
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
  const availableProjectIds = useMemo(
    () => userProjects.map((project) => project.id),
    [userProjects],
  );
  const resolvedWorkspaceProjectId = useMemo(
    () => resolveWorkspaceProjectId(selectedProjectId, availableProjectIds),
    [availableProjectIds, selectedProjectId],
  );
  // Prefer explicit form selection; otherwise inherit Activity workspace project.
  const activeProjectId = formData.projectId || resolvedWorkspaceProjectId || '';
  const activeProject = useMemo(
    () => userProjects.find((project) => project.id === activeProjectId),
    [activeProjectId, userProjects]
  );

  // 2. Validation Logic — require workspace-resolved project, not only form field.
  const validateForm = useCallback(() => {
    const newErrors: Record<string, string> = {};
    if (!formData.title.trim()) newErrors.title = 'Title is required';
    if (!formData.description.trim()) newErrors.description = 'Description is required';
    if (!activeProjectId) newErrors.projectId = 'Project is required';

    const isReportIntent = formData.intentMode === 'report_issue';
    const isMyTaskIntent = formData.intentMode === 'my_task';

    if (!editTaskId) {
      if (!isReportIntent && !isMyTaskIntent) {
        const { assignedTo } = buildRedesignMetadataPayload(formData);
        if (assignedTo.length === 0) {
          newErrors.assignedTo = getNestedTranslation(t, 'validation.assigneeRequired');
        }
      }
    } else if (
      actionType === "triage" ||
      editTask?.status === "reported" ||
      (editTask && taskRequiresAssignees(editTask.status))
    ) {
      const { assignedTo } = buildRedesignMetadataPayload(formData);
      if (assignedTo.length === 0) {
        newErrors.assignedTo = getNestedTranslation(t, 'validation.assigneeRequired');
      }
    }

    setErrors(newErrors);
    const messages = Object.values(newErrors);
    if (messages.length > 0) {
      Alert.alert('Cannot create task', messages[0]!);
      return false;
    }
    return true;
  }, [actionType, activeProjectId, editTask, editTaskId, formData, t]);
  const actorAssigneeRole = useMemo(
    () => resolveAssigneeRoleFromUser(user),
    [user],
  );
  const allAssignableUsers = useMemo(() => {
    const projectMembers = getAssignableProjectUsers({
      projectId: activeProjectId,
      assignments: getProjectUserAssignments(activeProjectId),
      users: getAllUsers(),
    });
    return filterSelectableAssigneeUsers(projectMembers, {
      actorRole: actorAssigneeRole,
      actorUserId: user?.id,
      resolveRole: resolveAssigneeRoleFromUser,
    });
  }, [
    activeProjectId,
    actorAssigneeRole,
    getAllUsers,
    getProjectUserAssignments,
    user?.id,
  ]);
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
  const assigneesLocked = !canEditTaskDelegation({
    actorUserId: user?.id,
    taskAssignedBy: editTask?.assignedBy,
    taskStatus: editTask?.status as TaskStatus | undefined,
    isCreateFlow: !editTaskId,
    isTriageFlow: actionType === "triage",
  });

  const requiresEditReason = requiresEditReasonForStatus(
    editTask?.status as TaskStatus | undefined,
  );
  const resolvedLocalDraftId = activeLocalDraftId ?? localDraftId;
  const isLocalDraft = Boolean(resolvedLocalDraftId);

  const context = useMemo(() => {
    const isTriageFlow =
      actionType === "triage" || editTask?.status === "reported";
    const headerTitle = isTriageFlow
      ? t.createTask.triageTaskHeader || t.createTask.createTaskFromReport || "Create task"
      : editTaskId
      ? t.createTask.editTask
      : parentTaskId
        ? parentSubTaskId && parentSubTask
          ? t.createTask.nestedSubTask
          : t.createTask.createSubTask
        : formData.intentMode === "report_issue"
          ? (t.createTask.report || t.createTask.reportIssue || "Report")
          : (t.createTask.assign || t.createTask.newTask || t.createTask.createNewTask || "Assign");

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
      isLocalDraft,
      localDraftId: resolvedLocalDraftId,
      draftBadgeLabel: isLocalDraft ? "Draft — not submitted" : undefined,
      parentBanner,
    };
  }, [
    actionType,
    activeProject?.name,
    activeProjectId,
    assigneesLocked,
    editTask?.status,
    editTaskId,
    formData.intentMode,
    isLocalDraft,
    parentSubTask,
    parentSubTaskId,
    parentTask,
    parentTaskId,
    requiresEditReason,
    resolvedLocalDraftId,
    t.createTask.createNewTask,
    t.createTask.createSubTask,
    t.createTask.createTaskFromReport,
    t.createTask.editTask,
    t.createTask.nestedSubTask,
    t.createTask.nestedUnder,
    t.createTask.assign,
    t.createTask.newTask,
    t.createTask.report,
    t.createTask.reportIssue,
    t.createTask.subTaskOf,
    t.createTask.triageTaskHeader,
  ]);

  const toggleUserSelection = useCallback(
    (userId: string) => {
      if (assigneesLocked) {
        return;
      }
      const assignableIds = allAssignableUsers.map((assignableUser) => assignableUser.id);
      const alreadySelected = formData.assignedTo.includes(userId);
      const candidate = allAssignableUsers.find(
        (assignableUser) => assignableUser.id === userId,
      );
      if (
        !alreadySelected &&
        !canSelectUserAsAssignee({
          candidateUserId: userId,
          assignableUserIds: assignableIds,
          actorRole: actorAssigneeRole,
          actorUserId: user?.id,
          candidateRole: resolveAssigneeRoleFromUser(candidate),
        })
      ) {
        return;
      }
      setFormData((previous) => {
        const assignedTo = previous.assignedTo.includes(userId)
          ? previous.assignedTo.filter((id) => id !== userId)
          : [...previous.assignedTo, userId];
        return {
          ...previous,
          assignedTo,
          primaryAssigneeId:
            resolvePrimaryAssigneeId(assignedTo, previous.primaryAssigneeId) || '',
        };
      });
    },
    [actorAssigneeRole, allAssignableUsers, assigneesLocked, formData.assignedTo, user?.id],
  );

  const setPrimaryAssignee = useCallback(
    (userId: string) => {
      if (assigneesLocked) {
        return;
      }
      setFormData((previous) => {
        if (!previous.assignedTo.includes(userId)) {
          return previous;
        }
        return { ...previous, primaryAssigneeId: userId };
      });
    },
    [assigneesLocked],
  );

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

  const mergeIncomingAttachments = useCallback(
    (incoming: CreateTaskFormModel["attachments"]) => {
      if (!incoming.length) {
        return;
      }
      setFormData((previous) => ({
        ...previous,
        attachments: mergeUniqueAttachments(previous.attachments, incoming),
      }));
    },
    [],
  );

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
    if (editTaskId && editTask && !localDraftId) {
      let mergedAssignedTo = mergeAssignedToIds({
        assignedTo: editTask.assignedTo || [],
        primaryAssigneeId: editTask.primaryAssigneeId,
        delegatedUserIds: editTask.delegatedUserIds || [],
      });
      const isTriagePrefill =
        actionType === "triage" || editTask.status === "reported";
      // Default primary assignee = report creator when promoting a report.
      if (isTriagePrefill && mergedAssignedTo.length === 0 && editTask.assignedBy) {
        mergedAssignedTo = [editTask.assignedBy];
      }
      const taggedCritical = hasCriticalThisWeekTag(editTask.tags);
      setFormData({
        title: editTask.title,
        description: editTask.description || '',
        taskReference: editTask.taskReference || '',
        billingStatus: editTask.billingStatus || 'non_billable',
        priority: editTask.priority || 'medium',
        category: editTask.category || 'general',
        dueDate: new Date(editTask.dueDate),
        locationOnSite: editTask.locationOnSite || '',
        assignedTo: mergedAssignedTo,
        primaryAssigneeId:
          resolvePrimaryAssigneeId(mergedAssignedTo, editTask.primaryAssigneeId) || '',
        containerId: editTask.containerId || '',
        subContainerId: editTask.subContainerId || '',
        customTags: getCustomTaskTags(editTask.tags),
        isCriticalThisWeek: taggedCritical,
        attachments: editTask.attachments || [],
        projectId: editTask.projectId || '',
        intentMode: 'full_task',
      });
    }
  }, [actionType, editTask, editTaskId, localDraftId]);

  useEffect(() => {
    if (editTaskId) {
      return;
    }
    if (!resolvedWorkspaceProjectId) {
      return;
    }
    if (formData.projectId) {
      return;
    }
    updateField('projectId', resolvedWorkspaceProjectId);
  }, [editTaskId, formData.projectId, resolvedWorkspaceProjectId, updateField]);

  // Mirror Dashboard: persist sole-project workspace so Location / filters stay aligned.
  useEffect(() => {
    if (!user?.id || selectedProjectId || availableProjectIds.length !== 1) {
      return;
    }
    const onlyProjectId = availableProjectIds[0];
    if (!onlyProjectId) {
      return;
    }
    void setSelectedProject(onlyProjectId, user.id);
  }, [availableProjectIds, selectedProjectId, setSelectedProject, user?.id]);

  useEffect(() => {
    if (!activeProjectId) {
      setIsLoadingUsers(false);
      return;
    }

    let cancelled = false;
    setIsLoadingUsers(true);

    const waitForSession = async (timeoutMs = 20000) => {
      const started = Date.now();
      while (!cancelled && Date.now() - started < timeoutMs) {
        const sessionClient = await getSessionScopedSupabase();
        if (sessionClient) {
          return sessionClient;
        }
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
      return null;
    };

    void (async () => {
      try {
        const sessionClient = await waitForSession();
        if (!sessionClient || cancelled) {
          return;
        }

        // Assignee picker = local join(project assignments ∩ company users).
        // Both must be fetched under JWT after login — service-role ensure scripts
        // do not populate in-memory Zustand stores.
        const userFetch = user?.companyId
          ? fetchUsersByCompany(user.companyId)
          : fetchUsers();
        await Promise.all([
          userFetch,
          fetchProjectUserAssignments(activeProjectId, true),
        ]);
      } finally {
        if (!cancelled) {
          setIsLoadingUsers(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    activeProjectId,
    fetchProjectUserAssignments,
    fetchUsers,
    fetchUsersByCompany,
    user?.companyId,
  ]);

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

  useEffect(() => {
    let cancelled = false;

    if (!activeProjectId) {
      setProjectContainers((current) => (current.length === 0 ? current : []));
      return () => {
        cancelled = true;
      };
    }

    void (async () => {
      try {
        const containers = await fetchProjectContainers(activeProjectId);
        if (!cancelled) {
          setProjectContainers(containers);
        }
      } catch (error) {
        console.error('Failed to fetch project containers', error);
        if (!cancelled) {
          setProjectContainers([]);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeProjectId, fetchProjectContainers]);

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

    if (!activeProjectId) {
      return true;
    }

    await ensureProjectLocation(activeProjectId, trimmedLocationOnSite, user?.id);
    return true;
  };

  const setContainerId = useCallback((containerId: string) => {
    setFormData((previous) => ({
      ...previous,
      containerId,
      subContainerId:
        previous.containerId === containerId ? previous.subContainerId : '',
    }));
  }, []);

  const setSubContainerId = useCallback((subContainerId: string) => {
    setFormData((previous) => ({ ...previous, subContainerId }));
  }, []);

  const expandContainerOrganization = useCallback(() => {
    setContainerOrganizationExpanded(true);
  }, []);

  const addProjectContainer = useCallback(
    async (rawLabel: string, parentId?: string) => {
      const label = normalizeContainerLabel(rawLabel);
      if (!activeProjectId || !label) {
        return null;
      }
      const created = await ensureProjectContainer(activeProjectId, label, {
        parentId: parentId || null,
        createdBy: user?.id,
      });
      const refreshed = await fetchProjectContainers(activeProjectId);
      setProjectContainers(refreshed);
      setContainerOrganizationExpanded(true);
      if (created) {
        if (parentId) {
          setFormData((previous) => ({
            ...previous,
            containerId: parentId,
            subContainerId: created.id,
          }));
        } else {
          setFormData((previous) => ({
            ...previous,
            containerId: created.id,
            subContainerId: '',
          }));
        }
      }
      setContainerDraft('');
      return created;
    },
    [
      ensureProjectContainer,
      fetchProjectContainers,
      activeProjectId,
      user?.id,
    ],
  );

  const containerOrganizationVisible = shouldShowContainerOrganization({
    containerCount: projectContainers.length,
    selectedContainerId: formData.containerId,
    selectedSubContainerId: formData.subContainerId,
    userExpanded: containerOrganizationExpanded,
  });

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
      const uri = await ensureCappedLocalPhoto(photo);
      const result = await uploadFileWithVerification({
        file: {
          uri,
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

  const saveDraft = useCallback(async (): Promise<boolean> => {
    if (editTaskId) {
      return false;
    }

    const title = formData.title.trim();
    if (!isDraftTitleValid(title)) {
      setErrors((previous) => ({
        ...previous,
        title: draftTitleValidationMessage(),
      }));
      return false;
    }

    try {
      const saved = await saveLocalTaskDraft({
        id: activeLocalDraftId ?? localDraftId,
        form: formData,
      });
      setActiveLocalDraftId(saved.id);
      setErrors((previous) => {
        const next = { ...previous };
        delete next.title;
        return next;
      });
      return true;
    } catch (error) {
      console.error("Failed to save local task draft", error);
      return false;
    }
  }, [activeLocalDraftId, editTaskId, formData, localDraftId]);

  const submit = async (options?: { editReason?: string }) => {
    if (!validateForm()) return false;
    setIsSubmitting(true);
    try {
      const submitProjectId = activeProjectId;
      const trimmedLocationOnSite = formData.locationOnSite.trim() || undefined;
      const existingAttachmentUrls = formData.attachments.filter(
        (attachment): attachment is string => typeof attachment === 'string',
      );

      if (submitProjectId && trimmedLocationOnSite) {
        await ensureProjectLocation(submitProjectId, trimmedLocationOnSite, user?.id);
      }

      // Basic submit logic extracted from screen
      const redesignMetadata = buildRedesignMetadataPayload(formData);

      if (editTaskId) {
        const { baseAttachments, uploadedAttachments } = await normalizeAttachmentsForSubmission(
          formData.attachments,
          editTaskId,
        );
        const isTriageSubmit =
          actionType === "triage" || editTask?.status === "reported";

        if (isTriageSubmit) {
          // Persist editable report fields first; promotion MUST go through triageTask
          // (plain updateTask alone left status stuck on reported — Stage-1 bug).
          await updateTask(editTaskId, {
            title: formData.title,
            description: formData.description,
            taskReference: formData.taskReference || undefined,
            projectId: submitProjectId,
            category: formData.category as TaskCategory,
            billingStatus: formData.billingStatus as BillingStatus,
            locationOnSite: trimmedLocationOnSite,
            containerId: redesignMetadata.containerId,
            subContainerId: redesignMetadata.subContainerId,
            tags: redesignMetadata.tags,
            attachments: [...baseAttachments, ...uploadedAttachments],
          } as Partial<any>);

          if (!user?.id) {
            throw new Error("Missing user for triage");
          }
          await triageTask(
            editTaskId,
            {
              assignedTo: redesignMetadata.assignedTo,
              primaryAssigneeId: redesignMetadata.primaryAssigneeId,
              delegatedUserIds: redesignMetadata.delegatedUserIds,
              dueDate: formData.dueDate.toISOString(),
              priority: formData.priority as Priority,
              category: formData.category as TaskCategory,
              billingStatus: formData.billingStatus as BillingStatus,
              locationOnSite: trimmedLocationOnSite,
            },
            user.id,
          );
          await fetchTaskById(editTaskId);
        } else {
          await updateTask(editTaskId, {
            title: formData.title,
            description: formData.description,
            taskReference: formData.taskReference || undefined,
            projectId: submitProjectId,
            priority: formData.priority as Priority,
            category: formData.category as TaskCategory,
            billingStatus: formData.billingStatus as BillingStatus,
            dueDate: formData.dueDate.toISOString(),
            locationOnSite: trimmedLocationOnSite,
            ...redesignMetadata,
            attachments: [...baseAttachments, ...uploadedAttachments],
            _editReason: options?.editReason,
          } as Partial<any>);
        }
      } else if (parentTaskId) {
        const createdSubTaskId = await createSubTask(parentTaskId, {
          title: formData.title,
          description: formData.description,
          taskReference: formData.taskReference || undefined,
          billingStatus: formData.billingStatus as BillingStatus,
          projectId: submitProjectId,
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
        const isReportIntent =
          formData.intentMode === 'report_issue' && redesignMetadata.assignedTo.length === 0;
        const isMyTaskIntent = formData.intentMode === 'my_task';
        const submitAssignedTo = isReportIntent
          ? []
          : isMyTaskIntent
            ? [user?.id || '']
            : redesignMetadata.assignedTo;
        const submitStatus: TaskStatus = isReportIntent
          ? 'reported'
          : isMyTaskIntent
            ? 'in_progress'
            : resolveInitialTaskCreateStatus(user?.id || '', submitAssignedTo);

        const createdTaskId = await createTask({
          title: formData.title,
          description: formData.description,
          taskReference: formData.taskReference || undefined,
          billingStatus: (formData.billingStatus || 'non_billable') as BillingStatus,
          projectId: submitProjectId,
          priority: (formData.priority || 'medium') as Priority,
          category: (formData.category || 'general') as TaskCategory,
          dueDate: formData.dueDate.toISOString(),
          locationOnSite: trimmedLocationOnSite,
          ...redesignMetadata,
          assignedTo: submitAssignedTo,
          assignedBy: user?.id || '',
          status: submitStatus,
          attachments: existingAttachmentUrls,
        } as Parameters<typeof createTask>[0]);
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

      const draftIdToClear = activeLocalDraftId ?? localDraftId;
      if (draftIdToClear) {
        try {
          await deleteLocalTaskDraft(draftIdToClear);
        } catch {
          // Promoted successfully; stale local draft cleanup is best-effort.
        }
        setActiveLocalDraftId(undefined);
      }
      return true;
    } catch (e) {
      console.error(e);
      const message =
        e instanceof Error && e.message
          ? e.message
          : typeof e === "object" &&
              e &&
              "message" in e &&
              typeof (e as { message?: unknown }).message === "string"
            ? String((e as { message: string }).message)
            : "Something went wrong while creating the task.";
      Alert.alert("Could not create task", message);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasUsableData = Boolean(user);
  const isInitialLoading = !hasUsableData;

  const clearDraftPayloads = useCallback(async () => {
    const draftIdToClear = activeLocalDraftId ?? localDraftId;
    if (draftIdToClear) {
      try {
        await deleteLocalTaskDraft(draftIdToClear);
      } catch {
        // Discard or post-submit cleanup is best-effort.
      }
      setActiveLocalDraftId(undefined);
    }

    try {
      if (typeof AsyncStorage?.multiRemove === "function") {
        await AsyncStorage.multiRemove([
          "draftCreateTask",
          "createTask_camera_return_photos",
          "createTask_camera_return_context",
          "createTask_camera_return_timestamp",
        ]);
      }
      setFormData(createEmptyFormData(defaultIntentMode));
    } catch (e) {
      console.error("Failed to clear task draft payloads", e);
    }
  }, [activeLocalDraftId, localDraftId]);

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
    containerOrganization: {
      isVisible: containerOrganizationVisible,
      isExpanded: containerOrganizationExpanded || containerOrganizationVisible,
      catalogueAvailable: projectContainers.length > 0,
      containers: projectContainers.map((container) => ({
        id: container.id,
        label: container.label,
        parentId: container.parentId,
      })),
      selectedContainerId: formData.containerId,
      selectedSubContainerId: formData.subContainerId,
      draftLabel: containerDraft,
    },
    projects: {
      availableProjects: userProjects,
    },
    modals: {
      showEditReasonModal,
      editReason,
    },
    intentSelector: {
      // Peer choice is at entry chooser, not inside the form.
      visible: false,
      activeMode: formData.intentMode ?? defaultIntentMode,
      availableModes: [],
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
      setIntentMode,
      togglePicker,
      submit,
      saveDraft,
      setUserSearchQuery,
      toggleUserSelection,
      setPrimaryAssignee,
      addCustomTag,
      removeCustomTag,
      removeAttachment,
      mergeIncomingAttachments,
      setTextInput,
      saveLocationOnSiteSelection,
      expandContainerOrganization,
      setContainerId,
      setSubContainerId,
      addProjectContainer,
      setContainerDraft,
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
