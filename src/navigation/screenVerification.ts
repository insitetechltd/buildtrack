export const TASK_DETAIL_VERIFICATION_PATH = "verify/task/:taskId";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuidLike(value?: string | null): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

export function buildTaskDetailVerificationUrl(taskId: string) {
  return `taskr://verify/task/${encodeURIComponent(taskId)}`;
}
