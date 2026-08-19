import type { TaskStatus } from "@/types/buildtrack";

/** Signed-off work. Archive (declutter) is allowed only in this set. */
export function isCompletedLifecycleStatus(status: TaskStatus | string | undefined): boolean {
  return status === "approved" || status === "completed" || status === "done";
}
