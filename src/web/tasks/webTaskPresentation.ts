/**
 * Presentation helpers for web Tasks list — mirrors mobile TasksScreen buckets/labels.
 */
import type { TaskStatus } from "@/types/buildtrack";
import { isTaskOverdue } from "@/utils/accountabilityEngine";
import { formatVisibleTaskStatus } from "@/utils/taskStatusLabel";

export type WebTasksStatusFilter = "all" | "new" | "doing" | "review" | "overdue";
export type WebTasksSort = "updated_desc" | "due_asc";

export function formatWebTaskStatusLabel(status: string): string {
  return formatVisibleTaskStatus(status);
}

export function matchesNewStatusFilter(status: string): boolean {
  return (
    status === "new" ||
    status === "reported" ||
    status === "not_started" ||
    status === "assigned" ||
    status === "received"
  );
}

export function matchesWipStatusFilter(status: string): boolean {
  return (
    status === "accepted" ||
    status === "in_progress" ||
    status === "wip" ||
    status === "rejected"
  );
}

export function matchesReviewingStatusFilter(status: string): boolean {
  return (
    status === "submitted_for_review" ||
    status === "reviewing" ||
    status === "declined"
  );
}

export function isWebTaskOverdue(task: {
  status: string;
  dueDate: string | null;
}): boolean {
  if (!task.dueDate) return false;
  return isTaskOverdue({
    status: task.status as TaskStatus,
    dueDate: task.dueDate,
  } as Parameters<typeof isTaskOverdue>[0]);
}

export function matchesWebStatusFilter(
  task: { status: string; dueDate: string | null },
  filter: WebTasksStatusFilter,
): boolean {
  switch (filter) {
    case "new":
      return matchesNewStatusFilter(task.status);
    case "doing":
      return matchesWipStatusFilter(task.status);
    case "review":
      return matchesReviewingStatusFilter(task.status);
    case "overdue":
      return isWebTaskOverdue(task);
    case "all":
    default:
      return true;
  }
}

export function webStatusFilterChipLabel(filter: WebTasksStatusFilter): string | null {
  switch (filter) {
    case "new":
      return "Status: New";
    case "doing":
      return "Status: Active";
    case "review":
      return "Status: Review";
    case "overdue":
      return "Status: Overdue";
    default:
      return null;
  }
}

export function sortWebTasks<T extends { dueDate: string | null; updatedAt: string | null }>(
  tasks: T[],
  sort: WebTasksSort,
): T[] {
  const copy = [...tasks];
  if (sort === "due_asc") {
    copy.sort((a, b) => {
      const ad = a.dueDate ? Date.parse(a.dueDate) : Number.POSITIVE_INFINITY;
      const bd = b.dueDate ? Date.parse(b.dueDate) : Number.POSITIVE_INFINITY;
      return ad - bd;
    });
    return copy;
  }
  copy.sort((a, b) => {
    const au = a.updatedAt ? Date.parse(a.updatedAt) : 0;
    const bu = b.updatedAt ? Date.parse(b.updatedAt) : 0;
    return bu - au;
  });
  return copy;
}

export function formatWebUpdatedLabel(iso: string | null): string {
  if (!iso) return "Task activity";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Task activity";
  return `Updated ${d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}`;
}
