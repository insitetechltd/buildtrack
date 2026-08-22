import type { Task, TaskStatus } from "@/types/buildtrack";

/** Gap codes ordered by primary rank (1 = highest priority). */
export const WORKFLOW_GAP_CODES = [
  "GAP_NO_TITLE",
  "GAP_NO_PROJECT",
  "GAP_NO_ORIGINATOR",
  "GAP_UNASSIGNED_WIP",
  "GAP_UNASSIGNED_OPEN",
  "GAP_LEGACY_STATUS",
  "GAP_PHASE_UNKNOWN",
  "GAP_REVIEW_INCOMPLETE",
  "GAP_SELF_NEW",
] as const;

export type WorkflowGapCode = (typeof WORKFLOW_GAP_CODES)[number];

const GAP_PRIMARY_RANK: Record<WorkflowGapCode, number> = {
  GAP_NO_TITLE: 1,
  GAP_NO_PROJECT: 2,
  GAP_NO_ORIGINATOR: 3,
  GAP_UNASSIGNED_WIP: 4,
  GAP_UNASSIGNED_OPEN: 5,
  GAP_LEGACY_STATUS: 6,
  GAP_PHASE_UNKNOWN: 7,
  GAP_REVIEW_INCOMPLETE: 8,
  GAP_SELF_NEW: 9,
};

const INTENDED_OPEN: ReadonlySet<TaskStatus> = new Set([
  "new",
  "declined",
  "accepted",
  "in_progress",
  "rejected",
  "submitted_for_review",
]);

const TERMINAL: ReadonlySet<TaskStatus> = new Set([
  "approved",
  "completed",
  "done",
  "cancelled",
]);

/** Legacy aliases that are not intended open/terminal in the current machine. */
const LEGACY_ALIAS: ReadonlySet<TaskStatus> = new Set([
  "not_started",
  "received",
  "reviewing",
  "wip",
  "assigned",
]);

const WIP_STATUSES: ReadonlySet<TaskStatus> = new Set([
  "in_progress",
  "accepted",
  "rejected",
]);

export type TaskWorkflowGapResult = {
  taskId: string;
  title: string;
  status: TaskStatus;
  codes: WorkflowGapCode[];
  primary: WorkflowGapCode;
};

function normalizeAssigneeIds(assignedTo: string[] | undefined): string[] {
  return (assignedTo ?? [])
    .map((id) => (typeof id === "string" ? id.trim() : ""))
    .filter((id) => id.length > 0);
}

function pickPrimary(codes: WorkflowGapCode[]): WorkflowGapCode {
  return [...codes].sort(
    (a, b) => GAP_PRIMARY_RANK[a] - GAP_PRIMARY_RANK[b],
  )[0]!;
}

/**
 * Classify a single task for illegal / unintended workflow states.
 * Soft-deleted tasks are excluded (returns null).
 */
export function classifyTaskWorkflowGaps(
  task: Task,
): TaskWorkflowGapResult | null {
  if (task.deletedAt) {
    return null;
  }

  const codes: WorkflowGapCode[] = [];
  const title = typeof task.title === "string" ? task.title.trim() : "";
  const projectId =
    typeof task.projectId === "string" ? task.projectId.trim() : "";
  const assignedBy =
    typeof task.assignedBy === "string" ? task.assignedBy.trim() : "";
  const assignees = normalizeAssigneeIds(task.assignedTo);
  const status = task.status;

  if (!title) {
    codes.push("GAP_NO_TITLE");
  }
  if (!projectId) {
    codes.push("GAP_NO_PROJECT");
  }
  if (!assignedBy) {
    codes.push("GAP_NO_ORIGINATOR");
  }

  const emptyAssignees = assignees.length === 0;
  if (emptyAssignees && WIP_STATUSES.has(status)) {
    codes.push("GAP_UNASSIGNED_WIP");
  } else if (
    emptyAssignees &&
    INTENDED_OPEN.has(status) &&
    !WIP_STATUSES.has(status)
  ) {
    // new / declined / submitted_for_review with no assignees
    codes.push("GAP_UNASSIGNED_OPEN");
  }

  if (LEGACY_ALIAS.has(status)) {
    codes.push("GAP_LEGACY_STATUS");
  } else if (
    !INTENDED_OPEN.has(status) &&
    !TERMINAL.has(status) &&
    !LEGACY_ALIAS.has(status)
  ) {
    codes.push("GAP_PHASE_UNKNOWN");
  }

  if (
    status === "submitted_for_review" &&
    Number(task.completionPercentage) !== 100
  ) {
    codes.push("GAP_REVIEW_INCOMPLETE");
  }

  if (
    status === "new" &&
    assignedBy &&
    assignees.some((id) => id === assignedBy)
  ) {
    codes.push("GAP_SELF_NEW");
  }

  if (codes.length === 0) {
    return null;
  }

  return {
    taskId: task.id,
    title: title || "(untitled)",
    status,
    codes,
    primary: pickPrimary(codes),
  };
}

/** Classify all loaded tasks; skips soft-deleted and clean rows. */
export function classifyLoadedTaskWorkflowGaps(
  tasks: Task[],
): TaskWorkflowGapResult[] {
  const results: TaskWorkflowGapResult[] = [];
  for (const task of tasks) {
    const gap = classifyTaskWorkflowGaps(task);
    if (gap) {
      results.push(gap);
    }
  }
  return results.sort((a, b) => {
    const rank = GAP_PRIMARY_RANK[a.primary] - GAP_PRIMARY_RANK[b.primary];
    if (rank !== 0) return rank;
    return a.title.localeCompare(b.title);
  });
}

export function workflowGapPrimaryRank(code: WorkflowGapCode): number {
  return GAP_PRIMARY_RANK[code];
}
