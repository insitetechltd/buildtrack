/**
 * Web desk KPI buckets — shared classifications for Company + Desk overviews.
 *
 * Assumptions (spike):
 * - Task lifecycle (mutually exclusive): closed | active | idle
 *   - closed = approved / completed / done / cancelled
 *   - active = doing + in-review (work in motion)
 *   - idle = new / assigned / not started (queued, not moving)
 * - Overdue is a separate flag on non-closed tasks (can overlap active/idle).
 * - Project stage: active = on-going; idle = planning; closed = completed|cancelled.
 * - User engagement (7d): active = authored ≥1 task_activity; idle = seated but quiet.
 */

import { normalizeProjectStatus } from "@/ui/contracts/projectStatus";
import {
  isWebTaskOverdue,
  matchesNewStatusFilter,
  matchesReviewingStatusFilter,
  matchesWipStatusFilter,
} from "@/web/tasks/webTaskPresentation";

export const KPI_ENGAGEMENT_WINDOW_MS = 1000 * 60 * 60 * 24 * 7;

export type TaskLifecycleBucket = "closed" | "active" | "idle";
export type ProjectStageBucket = "active" | "idle" | "closed";

export type TaskCountBuckets = {
  closed: number;
  active: number;
  idle: number;
  overdue: number;
  total: number;
};

export type StageCountBuckets = {
  active: number;
  idle: number;
  closed: number;
  total: number;
};

export type EngagementBuckets = {
  active: number;
  idle: number;
  pending: number;
  total: number;
};

export function isClosedTaskStatus(status: string): boolean {
  const s = String(status || "").toLowerCase();
  return (
    s === "approved" ||
    s === "completed" ||
    s === "done" ||
    s === "cancelled"
  );
}

export function classifyTaskLifecycle(status: string): TaskLifecycleBucket {
  if (isClosedTaskStatus(status)) return "closed";
  if (matchesWipStatusFilter(status) || matchesReviewingStatusFilter(status)) {
    return "active";
  }
  if (matchesNewStatusFilter(status)) return "idle";
  // Unknown open-ish → treat as idle queued
  return "idle";
}

export function classifyProjectStage(status: string): ProjectStageBucket {
  const normalized = normalizeProjectStatus(status);
  if (normalized === "active") return "active";
  if (normalized === "planning") return "idle";
  return "closed";
}

export function emptyTaskCounts(): TaskCountBuckets {
  return { closed: 0, active: 0, idle: 0, overdue: 0, total: 0 };
}

export function accumulateTaskCounts(
  tasks: Array<{ status: string; due_date?: string | null; dueDate?: string | null }>,
): TaskCountBuckets {
  const out = emptyTaskCounts();
  for (const t of tasks) {
    const status = String(t.status || "");
    const dueDate =
      t.due_date != null
        ? String(t.due_date)
        : t.dueDate != null
          ? String(t.dueDate)
          : null;
    out.total += 1;
    const bucket = classifyTaskLifecycle(status);
    out[bucket] += 1;
    if (!isClosedTaskStatus(status) && isWebTaskOverdue({ status, dueDate })) {
      out.overdue += 1;
    }
  }
  return out;
}

export function emptyStageCounts(): StageCountBuckets {
  return { active: 0, idle: 0, closed: 0, total: 0 };
}

export function accumulateProjectStages(
  projects: Array<{ status: string }>,
): StageCountBuckets {
  const out = emptyStageCounts();
  for (const p of projects) {
    out.total += 1;
    out[classifyProjectStage(p.status)] += 1;
  }
  return out;
}

export function wasTouchedInWindow(args: {
  createdAt?: string | null;
  updatedAt?: string | null;
  sinceIso: string;
}): boolean {
  const since = Date.parse(args.sinceIso);
  if (!Number.isFinite(since)) return false;
  for (const raw of [args.updatedAt, args.createdAt]) {
    if (!raw) continue;
    const t = Date.parse(String(raw));
    if (Number.isFinite(t) && t >= since) return true;
  }
  return false;
}
