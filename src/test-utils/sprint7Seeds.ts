import type {
  Company,
  Project,
  Task,
  User,
  UserProjectAssignment,
} from '@/types/buildtrack';

export type Sprint7SandboxActor = 'tristan' | 'herman';

export const SPRINT7_COMPANY_IDS = {
  tristan: 'sprint7-company-main-contractor',
  herman: 'sprint7-company-subcontractor',
} as const;

export const SPRINT7_PROJECT_IDS = {
  shared: 'sprint7-project-shared-harbor-tower',
  private: 'sprint7-project-tristan-private-fitout',
} as const;

export const SPRINT7_USER_IDS = {
  tristan: 'sprint7-user-tristan',
  herman: 'sprint7-user-herman',
} as const;

export const SPRINT7_SCENARIO_TASK_IDS = {
  rejectionLoop: 'sprint7-task-rejection-loop',
  overdueReview: 'sprint7-task-overdue-review',
  newRequest: 'sprint7-task-new-request',
  activeFieldWork: 'sprint7-task-active-field-work',
  privateTristanWork: 'sprint7-task-private-tristan-work',
} as const;

export interface Sprint7SeedDataset {
  actors: Record<Sprint7SandboxActor, User>;
  companies: Company[];
  users: User[];
  projects: Project[];
  assignments: UserProjectAssignment[];
  tasks: Task[];
  primaryProjectId: string;
  privateProjectId: string;
  createdAt: string;
}

function toIso(value: Date): string {
  return value.toISOString();
}

function shiftDays(reference: Date, dayDelta: number): string {
  const next = new Date(reference);
  next.setUTCDate(next.getUTCDate() + dayDelta);
  return next.toISOString();
}

function buildUser(base: User): User {
  return {
    ...base,
    company_id: base.companyId,
    lastSelectedProjectId: base.lastSelectedProjectId ?? null,
    isPending: base.isPending ?? false,
    is_pending: base.isPending ?? false,
    approvedBy: base.approvedBy ?? null,
    approvedAt: base.approvedAt ?? null,
  };
}

function buildTask(base: Task): Task {
  const accepted =
    base.status === 'accepted' ||
    base.status === 'in_progress' ||
    base.status === 'submitted_for_review';

  return {
    ...base,
    attachments: base.attachments ?? [],
    updates: base.updates ?? [],
    activities: base.activities ?? [],
    currentStatus: base.currentStatus ?? base.status,
    accepted,
    acceptedAt: accepted ? base.acceptedAt ?? base.createdAt : null,
    subTasks: base.subTasks ?? [],
    children: base.children ?? [],
  };
}

function replaceTask(tasks: Task[], taskId: string, updates: Partial<Task>): Task[] {
  return tasks.map((task) =>
    task.id === taskId
      ? buildTask({
          ...task,
          ...updates,
        })
      : task,
  );
}

export function createSprint7SeedDataset(referenceNow = new Date()): Sprint7SeedDataset {
  const createdAt = toIso(referenceNow);

  const mainContractorCompany: Company = {
    id: SPRINT7_COMPANY_IDS.tristan,
    name: 'Insite Main Contracting',
    type: 'general_contractor',
    description: 'Sprint 7 staging main contractor',
    address: '101 Harbour Road',
    phone: '555-1001',
    email: 'staging-main@insite.test',
    website: 'https://example.com/main',
    createdAt,
    createdBy: SPRINT7_USER_IDS.tristan,
    isActive: true,
  };

  const subcontractorCompany: Company = {
    id: SPRINT7_COMPANY_IDS.herman,
    name: 'Herman Field Services',
    type: 'subcontractor',
    description: 'Sprint 7 staging subcontractor',
    address: '202 Dock Lane',
    phone: '555-2002',
    email: 'staging-field@insite.test',
    website: 'https://example.com/field',
    createdAt,
    createdBy: SPRINT7_USER_IDS.tristan,
    isActive: true,
  };

  const tristan = buildUser({
    id: SPRINT7_USER_IDS.tristan,
    email: 'tristan@insite.test',
    name: 'Tristan',
    role: 'manager',
    systemPermission: 'manager',
    companyId: SPRINT7_COMPANY_IDS.tristan,
    company_id: SPRINT7_COMPANY_IDS.tristan,
    position: 'Main Contractor',
    phone: '555-3003',
    createdAt,
    updatedAt: createdAt,
    lastSelectedProjectId: null,
    isPending: false,
    approvedBy: SPRINT7_USER_IDS.tristan,
    approvedAt: createdAt,
  });

  const herman = buildUser({
    id: SPRINT7_USER_IDS.herman,
    email: 'herman@insite.test',
    name: 'Herman',
    role: 'worker',
    systemPermission: 'member',
    companyId: SPRINT7_COMPANY_IDS.herman,
    company_id: SPRINT7_COMPANY_IDS.herman,
    position: 'Subcontractor / Executor',
    phone: '555-4004',
    createdAt,
    updatedAt: createdAt,
    lastSelectedProjectId: SPRINT7_PROJECT_IDS.shared,
    isPending: false,
    approvedBy: SPRINT7_USER_IDS.tristan,
    approvedAt: createdAt,
  });

  const sharedProject: Project = {
    id: SPRINT7_PROJECT_IDS.shared,
    name: 'Harbor Tower - Level 12 Fitout',
    description: 'Primary shared project for Tristan and Herman Sprint 7 validation.',
    status: 'active',
    startDate: shiftDays(referenceNow, -14),
    endDate: shiftDays(referenceNow, 30),
    budget: 250000,
    location: '12 Ocean View Blvd',
    clientInfo: {
      name: 'Harbor Tower Holdings',
      email: 'client@harbortower.test',
      phone: '555-5100',
    },
    createdBy: SPRINT7_USER_IDS.tristan,
    companyId: SPRINT7_COMPANY_IDS.tristan,
    createdAt,
    updatedAt: createdAt,
  };

  const privateProject: Project = {
    id: SPRINT7_PROJECT_IDS.private,
    name: 'Private Penthouse Defects',
    description: 'Tristan-only project used to validate isolation boundaries.',
    status: 'active',
    startDate: shiftDays(referenceNow, -7),
    endDate: shiftDays(referenceNow, 14),
    budget: 85000,
    location: '88 Skyline Terrace',
    clientInfo: {
      name: 'Penthouse Client',
      email: 'penthouse@client.test',
      phone: '555-5200',
    },
    createdBy: SPRINT7_USER_IDS.tristan,
    companyId: SPRINT7_COMPANY_IDS.tristan,
    createdAt,
    updatedAt: createdAt,
  };

  const assignments: UserProjectAssignment[] = [
    {
      id: 'sprint7-assignment-tristan-shared',
      userId: tristan.id,
      projectId: sharedProject.id,
      category: 'contractor',
      projectRole: 'contractor',
      assignedAt: createdAt,
      assignedBy: tristan.id,
      isActive: true,
    },
    {
      id: 'sprint7-assignment-herman-shared',
      userId: herman.id,
      projectId: sharedProject.id,
      category: 'subcontractor',
      projectRole: 'subcontractor',
      assignedAt: createdAt,
      assignedBy: tristan.id,
      isActive: true,
    },
    {
      id: 'sprint7-assignment-tristan-private',
      userId: tristan.id,
      projectId: privateProject.id,
      category: 'contractor',
      projectRole: 'contractor',
      assignedAt: createdAt,
      assignedBy: tristan.id,
      isActive: true,
    },
  ];

  const tasks: Task[] = [
    buildTask({
      id: SPRINT7_SCENARIO_TASK_IDS.overdueReview,
      projectId: sharedProject.id,
      title: 'Review fire-stop penetrations',
      description: 'Completed work is waiting for Tristan to review.',
      priority: 'high',
      dueDate: shiftDays(referenceNow, -1),
      category: 'safety',
      attachments: [],
      assignedTo: [herman.id],
      assignedBy: tristan.id,
      originalAssignedBy: tristan.id,
      createdAt,
      updates: [],
      status: 'submitted_for_review',
      completionPercentage: 100,
      activities: [],
      reviewedBy: null,
      reviewedAt: null,
    }),
    buildTask({
      id: SPRINT7_SCENARIO_TASK_IDS.rejectionLoop,
      projectId: sharedProject.id,
      title: 'Seal corridor ceiling joints',
      description: 'Scenario A task for the rejection loop workflow.',
      priority: 'critical',
      dueDate: shiftDays(referenceNow, 1),
      category: 'general',
      attachments: [],
      assignedTo: [herman.id],
      assignedBy: tristan.id,
      originalAssignedBy: tristan.id,
      createdAt,
      updates: [],
      status: 'in_progress',
      completionPercentage: 65,
      activities: [],
    }),
    buildTask({
      id: SPRINT7_SCENARIO_TASK_IDS.newRequest,
      projectId: sharedProject.id,
      title: 'Install temporary edge protection',
      description: 'Fresh assignment that should land in Herman’s action-required bucket.',
      priority: 'medium',
      dueDate: shiftDays(referenceNow, 4),
      category: 'safety',
      attachments: [],
      assignedTo: [herman.id],
      assignedBy: tristan.id,
      originalAssignedBy: tristan.id,
      createdAt,
      updates: [],
      status: 'new',
      completionPercentage: 0,
      activities: [],
    }),
    buildTask({
      id: SPRINT7_SCENARIO_TASK_IDS.activeFieldWork,
      projectId: sharedProject.id,
      title: 'Coordinate riser access and material delivery',
      description: 'Active field work used to exercise open-task metrics.',
      priority: 'high',
      dueDate: shiftDays(referenceNow, 2),
      category: 'materials',
      attachments: [],
      assignedTo: [herman.id],
      assignedBy: tristan.id,
      originalAssignedBy: tristan.id,
      createdAt,
      updates: [],
      status: 'accepted',
      completionPercentage: 20,
      activities: [],
    }),
    buildTask({
      id: SPRINT7_SCENARIO_TASK_IDS.privateTristanWork,
      projectId: privateProject.id,
      title: 'Audit penthouse handover defects',
      description: 'Tristan-only task to validate the isolation wall.',
      priority: 'medium',
      dueDate: shiftDays(referenceNow, 3),
      category: 'general',
      attachments: [],
      assignedTo: [tristan.id],
      assignedBy: tristan.id,
      originalAssignedBy: tristan.id,
      createdAt,
      updates: [],
      status: 'in_progress',
      completionPercentage: 45,
      activities: [],
    }),
  ];

  return {
    actors: {
      tristan,
      herman,
    },
    companies: [mainContractorCompany, subcontractorCompany],
    users: [tristan, herman],
    projects: [sharedProject, privateProject],
    assignments,
    tasks,
    primaryProjectId: sharedProject.id,
    privateProjectId: privateProject.id,
    createdAt,
  };
}

export function applySprint7RejectionLoopScenario(
  seed: Sprint7SeedDataset,
  scenarioNow = new Date(),
): Sprint7SeedDataset {
  return {
    ...seed,
    tasks: replaceTask(seed.tasks, SPRINT7_SCENARIO_TASK_IDS.rejectionLoop, {
      status: 'declined',
      completionPercentage: 100,
      declinedReason: `Declined by Tristan at ${scenarioNow.toISOString()} for incomplete supporting evidence.`,
      reviewedBy: seed.actors.tristan.id,
      reviewedAt: scenarioNow.toISOString(),
      accepted: false,
      acceptedAt: null,
    }),
  };
}

export function applySprint7OverdueCrunchScenario(
  seed: Sprint7SeedDataset,
  scenarioNow = new Date(),
): Sprint7SeedDataset {
  return {
    ...seed,
    tasks: replaceTask(seed.tasks, SPRINT7_SCENARIO_TASK_IDS.overdueReview, {
      status: 'submitted_for_review',
      completionPercentage: 100,
      dueDate: shiftDays(scenarioNow, -2),
      reviewedBy: null,
      reviewedAt: null,
    }),
  };
}

export function getSprint7IsolationWallView(
  seed: Sprint7SeedDataset,
  actor: Sprint7SandboxActor,
): {
  actor: User;
  visibleProjects: Project[];
  visibleTasks: Task[];
  hiddenProjectIds: string[];
} {
  const actorUser = seed.actors[actor];
  const visibleProjectIds = new Set(
    seed.assignments
      .filter((assignment) => assignment.userId === actorUser.id && assignment.isActive)
      .map((assignment) => assignment.projectId),
  );

  const visibleProjects = seed.projects.filter((project) => visibleProjectIds.has(project.id));
  const visibleTasks = seed.tasks.filter((task) => visibleProjectIds.has(task.projectId));
  const hiddenProjectIds = seed.projects
    .map((project) => project.id)
    .filter((projectId) => !visibleProjectIds.has(projectId));

  return {
    actor: actorUser,
    visibleProjects,
    visibleTasks,
    hiddenProjectIds,
  };
}
