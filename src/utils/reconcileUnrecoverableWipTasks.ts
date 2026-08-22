import type { Task } from "@/types/buildtrack";
import {
  classifyTaskWorkflowGaps,
  type WorkflowGapCode,
} from "@/utils/taskWorkflowGaps";

const UNRECOVERABLE_GAP_CODES: ReadonlySet<WorkflowGapCode> = new Set([
  "GAP_UNASSIGNED_WIP",
  "GAP_UNASSIGNED_OPEN",
]);

const reconciledTaskIds = new Set<string>();

export function resetReconciledWipTaskIdsForTests(): void {
  reconciledTaskIds.clear();
}

export function wasWipTaskReconciled(taskId: string): boolean {
  return reconciledTaskIds.has(taskId);
}

function isUnrecoverableWipTask(task: Task): boolean {
  const gap = classifyTaskWorkflowGaps(task);
  if (!gap) {
    return false;
  }
  return UNRECOVERABLE_GAP_CODES.has(gap.primary);
}

/**
 * Cancels originator-owned tasks stuck in illegal unassigned open/WIP states.
 * Idempotent per task id for the app session.
 */
export async function reconcileUnrecoverableWipTasks(args: {
  tasks: Task[];
  userId: string;
  cancelTask: (taskId: string, userId: string) => Promise<void>;
}): Promise<string[]> {
  const cancelled: string[] = [];

  for (const task of args.tasks) {
    if (task.deletedAt || task.cancelledAt) {
      continue;
    }
    if (task.assignedBy !== args.userId) {
      continue;
    }
    if (reconciledTaskIds.has(task.id)) {
      continue;
    }
    if (!isUnrecoverableWipTask(task)) {
      continue;
    }

    reconciledTaskIds.add(task.id);
    try {
      await args.cancelTask(task.id, args.userId);
      cancelled.push(task.id);
    } catch {
      reconciledTaskIds.delete(task.id);
    }
  }

  return cancelled;
}
