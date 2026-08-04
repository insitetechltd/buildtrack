import type { Task, TaskStatus } from '@/types/buildtrack';

const VOLATILE = new Set([
  'id',
  'updatedAt',
  'createdAt',
  'timestamp',
  'acceptedAt',
  'reviewedAt',
  'cancelledAt',
  'archivedAt',
  'deletedAt',
  'lastEditedAt',
  'notifiedAt',
]);

export type CanonicalTaskSnapshot = {
  projectId: string;
  title: string;
  status: TaskStatus;
  completionPercentage: number;
  assignedTo: string[];
  assignedBy: string;
  declinedReason?: string;
  rejectedReason?: string;
  locationOnSite?: string;
  activityTypes: string[];
  parentTaskId?: string | null;
  nestingLevel?: number;
};

export function toCanonicalTask(task: Partial<Task> & { status: TaskStatus }): CanonicalTaskSnapshot {
  const activities = task.activities || [];
  return {
    projectId: String(task.projectId || ''),
    title: String(task.title || ''),
    status: task.status,
    completionPercentage: Number(task.completionPercentage ?? 0),
    assignedTo: [...(task.assignedTo || [])].map(String).sort(),
    assignedBy: String(task.assignedBy || ''),
    declinedReason: task.declinedReason || task.declineReason,
    rejectedReason: task.rejectedReason,
    locationOnSite: task.locationOnSite,
    activityTypes: activities.map((a) => String(a.activityType)).sort(),
    parentTaskId: task.parentTaskId ?? null,
    nestingLevel: task.nestingLevel,
  };
}

export function expectCanonicalTask(
  task: Partial<Task> & { status: TaskStatus },
  expected: Partial<CanonicalTaskSnapshot>,
): void {
  const actual = toCanonicalTask(task);
  for (const [key, value] of Object.entries(expected)) {
    expect((actual as Record<string, unknown>)[key]).toEqual(value);
  }
}

export function stripVolatileDeep(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(stripVolatileDeep);
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value as object).sort()) {
      if (VOLATILE.has(key)) {
        continue;
      }
      out[key] = stripVolatileDeep((value as Record<string, unknown>)[key]);
    }
    return out;
  }
  return value;
}

export function matchGoldenShape(actual: unknown, golden: unknown): void {
  expect(stripVolatileDeep(actual)).toEqual(stripVolatileDeep(golden));
}
