import type { TaskStatus } from "@/types/buildtrack";

/** Signed-off work (approved path). */
export function isCompletedLifecycleStatus(status: TaskStatus | string | undefined): boolean {
  return status === "approved" || status === "completed" || status === "done";
}

/** Field issue awaiting PM triage. */
export function isTriageStatus(status: TaskStatus | string | undefined): boolean {
  return status === "reported";
}

/** Report closed without promotion (audit retained). */
export function isResolvedReportStatus(status: TaskStatus | string | undefined): boolean {
  return status === "resolved" || status === "dismissed";
}

/** @deprecated Prefer isResolvedReportStatus */
export function isDismissedStatus(status: TaskStatus | string | undefined): boolean {
  return isResolvedReportStatus(status);
}

/**
 * Endpoints that may be decluttered via Archive dock / swipe.
 * Approved sign-off + resolved reports.
 */
export function isArchivableLifecycleStatus(
  status: TaskStatus | string | undefined,
): boolean {
  return isCompletedLifecycleStatus(status) || isResolvedReportStatus(status);
}

/** Terminal lifecycle status (no further progress updates). */
export function isTerminalTaskStatus(status: TaskStatus | string | undefined): boolean {
  return (
    status === "approved" ||
    status === "completed" ||
    status === "done" ||
    status === "cancelled" ||
    status === "resolved" ||
    status === "dismissed"
  );
}
