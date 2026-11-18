import {
  uploadFileWithVerification,
  type FileUploadOptions,
  type UploadResult,
} from "./fileUploadService";

/** Default Storage retry budget for weak site Wi-Fi / congestion (idea-bank B+C). */
export const UPLOAD_RETRY_MAX_ATTEMPTS = 3;
export const UPLOAD_RETRY_BASE_DELAY_MS = 400;
export const UPLOAD_RETRY_MAX_DELAY_MS = 4_000;

export type UploadRetryBudget = {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  /** Injected for tests. Defaults to setTimeout. */
  sleep?: (ms: number) => Promise<void>;
};

export type UploadRetryResult = UploadResult & {
  attempts: number;
};

const defaultSleep = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

/**
 * Delay before attempt N (0-based) after a failure.
 * attempt 0 → base, 1 → 2×base, … capped at maxDelayMs.
 */
export function nextUploadRetryDelayMs(
  attempt: number,
  baseDelayMs: number = UPLOAD_RETRY_BASE_DELAY_MS,
  maxDelayMs: number = UPLOAD_RETRY_MAX_DELAY_MS,
): number {
  const safeAttempt = Math.max(0, Math.floor(attempt));
  const raw = baseDelayMs * 2 ** safeAttempt;
  return Math.min(maxDelayMs, raw);
}

/** Auth / client validation failures should not burn the Storage retry budget. */
export function isRetryableUploadError(error: string | undefined | null): boolean {
  const message = (error || "").toLowerCase();
  if (!message) return true;
  if (
    message.includes("not authenticated") ||
    message.includes("not configured") ||
    message.includes("permission") ||
    message.includes("forbidden") ||
    message.includes("unauthorized") ||
    message.includes("row-level security")
  ) {
    return false;
  }
  return true;
}

/**
 * Run an upload fn with exponential back-off. Does not cancel sibling uploads —
 * callers should keep Promise.all and surface per-tile failures.
 */
export async function withUploadRetry(
  run: () => Promise<UploadResult>,
  budget: UploadRetryBudget = {},
): Promise<UploadRetryResult> {
  const maxAttempts = Math.max(1, budget.maxAttempts ?? UPLOAD_RETRY_MAX_ATTEMPTS);
  const baseDelayMs = budget.baseDelayMs ?? UPLOAD_RETRY_BASE_DELAY_MS;
  const maxDelayMs = budget.maxDelayMs ?? UPLOAD_RETRY_MAX_DELAY_MS;
  const sleep = budget.sleep ?? defaultSleep;

  let last: UploadResult = { success: false, error: "Upload failed" };
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    last = await run();
    if (last.success) {
      return { ...last, attempts: attempt };
    }
    if (attempt >= maxAttempts || !isRetryableUploadError(last.error)) {
      return { ...last, attempts: attempt };
    }
    await sleep(nextUploadRetryDelayMs(attempt - 1, baseDelayMs, maxDelayMs));
  }
  return { ...last, attempts: maxAttempts };
}

export async function uploadFileWithRetry(
  options: FileUploadOptions,
  budget?: UploadRetryBudget,
): Promise<UploadRetryResult> {
  return withUploadRetry(() => uploadFileWithVerification(options), budget);
}
