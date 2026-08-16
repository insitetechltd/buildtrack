import { Platform } from 'react-native';
import { useAuthStore } from '@/state/authStore';
import { useCompanyStore } from '@/state/companyStore';
import { useProjectFilterStore } from '@/state/projectFilterStore';
import { useProjectStore } from '@/state/projectStore.supabase';
import { useTaskStore } from '@/state/taskStore.supabase';
import { useUserStore } from '@/state/userStore.supabase';
import {
  applySprint7OverdueCrunchScenario,
  applySprint7RejectionLoopScenario,
  createSprint7SeedDataset,
  getSprint7IsolationWallView,
  SPRINT7_PROJECT_IDS,
  SPRINT7_SCENARIO_TASK_IDS,
  SPRINT7_USER_IDS,
  type Sprint7SandboxActor,
  type Sprint7SeedDataset,
} from './sprint7Seeds';

export type Sprint7RuntimeScenario =
  | 'baseline'
  | 'rejection-loop'
  | 'overdue-crunch'
  | 'isolation-wall';

interface InitializeSprint7RuntimeSandboxOptions {
  activeActor?: Sprint7SandboxActor;
  scenario?: Sprint7RuntimeScenario;
  now?: Date;
}

function assertSprint7SandboxAvailable() {
  if (typeof __DEV__ !== 'undefined' && !__DEV__) {
    throw new Error('Sprint 7 sandbox is only available in development builds.');
  }
}

function getSelectedProjectIdForActor(dataset: Sprint7SeedDataset, actor: Sprint7SandboxActor): string | null {
  const isolationView = getSprint7IsolationWallView(dataset, actor);
  return isolationView.visibleProjects.length === 1 ? isolationView.visibleProjects[0].id : null;
}

function setAuthenticatedActor(dataset: Sprint7SeedDataset, actor: Sprint7SandboxActor) {
  const authUser = dataset.actors[actor];
  const selectedProjectId = getSelectedProjectIdForActor(dataset, actor);

  useAuthStore.setState({
    user: authUser,
    session: null,
    isAuthenticated: true,
    isLoading: false,
    isInitialized: true,
    error: null,
  });

  useProjectFilterStore.setState((state) => ({
    ...state,
    selectedProjectId,
    sectionFilter: 'all',
    statusFilter: 'all',
    buttonLabel: null,
    showSelfAssignedOnly: false,
    sortByPriority: null,
    sortByDueDate: null,
    lastSelectedProjects: selectedProjectId
      ? {
          ...state.lastSelectedProjects,
          [authUser.id]: selectedProjectId,
        }
      : state.lastSelectedProjects,
  }));
}

function resolveScenarioDataset(
  dataset: Sprint7SeedDataset,
  scenario: Sprint7RuntimeScenario,
  now: Date,
): Sprint7SeedDataset {
  switch (scenario) {
    case 'rejection-loop':
      return applySprint7RejectionLoopScenario(dataset, now);
    case 'overdue-crunch':
      return applySprint7OverdueCrunchScenario(dataset, now);
    case 'isolation-wall':
    case 'baseline':
    default:
      return dataset;
  }
}

export function isSprint7RuntimeSandboxLoaded(): boolean {
  const authUser = useAuthStore.getState().user;
  const projectIds = useProjectStore.getState().projects.map((project) => project.id);
  const taskIds = useTaskStore.getState().tasks.map((task) => task.id);

  return Boolean(
    authUser &&
      (authUser.id === SPRINT7_USER_IDS.tristan || authUser.id === SPRINT7_USER_IDS.herman) &&
      projectIds.includes(SPRINT7_PROJECT_IDS.shared) &&
      taskIds.includes(SPRINT7_SCENARIO_TASK_IDS.rejectionLoop),
  );
}

export async function resetSprint7RuntimeSandbox(): Promise<void> {
  useAuthStore.setState({
    user: null,
    session: null,
    isAuthenticated: false,
    isLoading: false,
    isInitialized: true,
    error: null,
  });

  useCompanyStore.setState({
    companies: [],
    company: null,
    companyStats: null,
    isLoading: false,
    error: null,
  });

  useUserStore.setState({
    users: [],
    isLoading: false,
    error: null,
  });

  useProjectStore.setState({
    projects: [],
    userAssignments: [],
    projectQueryMeta: {},
    assignmentQueryMeta: {},
    isLoading: false,
    error: null,
  });

  useTaskStore.setState({
    tasks: [],
    taskReadStatuses: [],
    taskQueryMeta: {},
    taskFetchTimestamps: {},
    allTasksFetchTimestamp: null,
    isLoading: false,
    error: null,
  });

  useProjectFilterStore.setState({
    selectedProjectId: null,
    sectionFilter: 'all',
    statusFilter: 'all',
    buttonLabel: null,
    showSelfAssignedOnly: false,
    sortByPriority: null,
    sortByDueDate: null,
    lastSelectedProjects: {},
  });
}

export async function initializeSprint7RuntimeSandbox(
  options: InitializeSprint7RuntimeSandboxOptions = {},
): Promise<Sprint7SeedDataset> {
  assertSprint7SandboxAvailable();

  const activeActor = options.activeActor ?? 'tristan';
  const now = options.now ?? new Date();
  const baseDataset = createSprint7SeedDataset(now);
  const dataset = resolveScenarioDataset(baseDataset, options.scenario ?? 'baseline', now);

  await resetSprint7RuntimeSandbox();

  useCompanyStore.setState({
    companies: dataset.companies,
    company: null,
    companyStats: null,
    isLoading: false,
    error: null,
  });

  useUserStore.setState({
    users: dataset.users,
    isLoading: false,
    error: null,
  });

  useProjectStore.setState({
    projects: dataset.projects,
    userAssignments: dataset.assignments,
    projectQueryMeta: {},
    assignmentQueryMeta: {},
    isLoading: false,
    error: null,
  });

  useTaskStore.setState({
    tasks: dataset.tasks,
    taskReadStatuses: [],
    taskQueryMeta: {},
    taskFetchTimestamps: {},
    allTasksFetchTimestamp: Date.now(),
    isLoading: false,
    error: null,
  });

  setAuthenticatedActor(dataset, activeActor);

  const authUser = useAuthStore.getState().user;
  if (authUser) {
    try {
      await useProjectFilterStore.getState().initializeWorkspaceProject(authUser.id);
    } catch (workspaceError: any) {
      console.warn('[sprint7] workspace bootstrap:', workspaceError?.message ?? workspaceError);
    }
  }

  return dataset;
}

export async function switchSprint7RuntimeSandboxActor(
  actor: Sprint7SandboxActor,
): Promise<Sprint7SeedDataset> {
  assertSprint7SandboxAvailable();

  if (!isSprint7RuntimeSandboxLoaded()) {
    return initializeSprint7RuntimeSandbox({ activeActor: actor });
  }

  const dataset: Sprint7SeedDataset = {
    actors: {
      tristan: useUserStore.getState().getUserById(SPRINT7_USER_IDS.tristan)!,
      herman: useUserStore.getState().getUserById(SPRINT7_USER_IDS.herman)!,
    },
    companies: useCompanyStore.getState().companies,
    users: useUserStore.getState().users,
    projects: useProjectStore.getState().projects,
    assignments: useProjectStore.getState().userAssignments,
    tasks: useTaskStore.getState().tasks,
    primaryProjectId: SPRINT7_PROJECT_IDS.shared,
    privateProjectId: SPRINT7_PROJECT_IDS.private,
    createdAt: useTaskStore.getState().tasks[0]?.createdAt ?? new Date().toISOString(),
  };

  setAuthenticatedActor(dataset, actor);

  const authUser = useAuthStore.getState().user;
  if (authUser) {
    try {
      await useProjectFilterStore.getState().initializeWorkspaceProject(authUser.id);
    } catch (workspaceError: any) {
      console.warn('[sprint7] workspace bootstrap:', workspaceError?.message ?? workspaceError);
    }
  }

  return dataset;
}

export async function loadScenarioAPreset(now = new Date()): Promise<Sprint7SeedDataset> {
  return initializeSprint7RuntimeSandbox({
    activeActor: 'tristan',
    scenario: 'rejection-loop',
    now,
  });
}

export async function loadScenarioBPreset(now = new Date()): Promise<Sprint7SeedDataset> {
  return initializeSprint7RuntimeSandbox({
    activeActor: 'tristan',
    scenario: 'overdue-crunch',
    now,
  });
}

export async function loadScenarioCPreset(now = new Date()): Promise<Sprint7SeedDataset> {
  return initializeSprint7RuntimeSandbox({
    activeActor: 'herman',
    scenario: 'isolation-wall',
    now,
  });
}

let maestroAutoBootstrapAttempted = false;

export async function autoBootstrapSprint7SandboxForMaestroIfNeeded(): Promise<boolean> {
  if (maestroAutoBootstrapAttempted) {
    return false;
  }
  maestroAutoBootstrapAttempted = true;

  if (typeof __DEV__ === 'undefined' || !__DEV__) {
    return false;
  }

  if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
    return false;
  }

  const authState = useAuthStore.getState();
  if (!authState.isInitialized) {
    return false;
  }

  if (isSprint7RuntimeSandboxLoaded()) {
    return false;
  }

  // Only resume an already-active Sprint7 actor. Never invent Tristan for an
  // empty/live session — that leaves AuthStore "logged in" without a JWT and
  // floods LogBox with SQLSTATE 42501 (anon REVOKE after M-SUPABASE-02a).
  if (!authState.user || !authState.isAuthenticated) {
    return false;
  }

  const uid = authState.user.id;
  if (uid !== SPRINT7_USER_IDS.tristan && uid !== SPRINT7_USER_IDS.herman) {
    return false;
  }

  try {
    await initializeSprint7RuntimeSandbox({ activeActor: uid === SPRINT7_USER_IDS.herman ? 'herman' : 'tristan' });
    console.info('[sprint7] auto-bootstrap: resumed Sprint7 sandbox for Maestro');
    return true;
  } catch (err: any) {
    maestroAutoBootstrapAttempted = false;
    console.warn('[sprint7] auto-bootstrap failed:', err?.message ?? err);
    return false;
  }
}
