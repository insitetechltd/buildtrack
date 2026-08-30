/**
 * Exclusive queue for Photos-heavy work (MediaLibrary warm + native PhotoKit
 * open/preview/expand). Parallel jobs starve each other on device (TF 231–232:
 * warm∥openLibrary → 20s+; open-during-warm + short wait → warm miss → full open).
 *
 * Rule for future picker code: every Photos-daemon call goes through
 * `runExclusivePhotokitJob`. Do not fire-and-forget a second job "to go faster."
 */

let tail: Promise<unknown> = Promise.resolve();
let queued = 0;
let running = 0;
let waiters: Array<() => void> = [];

export function isPhotokitGateBusy(): boolean {
  return queued > 0 || running > 0;
}

function notifyIdle(): void {
  if (queued !== 0 || running !== 0) {
    return;
  }
  const pending = waiters;
  waiters = [];
  for (const resolve of pending) {
    resolve();
  }
}

/** Wait until the gate is idle (or timeout). Resolves even on timeout. */
export function waitForPhotokitGateIdle(timeoutMs: number = 20000): Promise<void> {
  if (!isPhotokitGateBusy()) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) {
        return;
      }
      settled = true;
      resolve();
    };
    waiters.push(finish);
    if (timeoutMs > 0) {
      const timer = setTimeout(finish, timeoutMs);
      if (typeof timer === "object" && typeof timer.unref === "function") {
        timer.unref();
      }
    }
  });
}

/**
 * Enqueue work so only one Photos-heavy job runs at a time.
 * Failures do not break the queue.
 */
export function runExclusivePhotokitJob<T>(
  _label: string,
  fn: () => Promise<T>,
): Promise<T> {
  queued += 1;
  const run = tail.then(async () => {
    queued -= 1;
    running += 1;
    try {
      return await fn();
    } finally {
      running -= 1;
      notifyIdle();
    }
  }) as Promise<T>;
  // Keep the chain alive after rejection.
  tail = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

/** Jest only — reset poisoned queue between tests. */
export function resetPhotokitGateForTests(): void {
  tail = Promise.resolve();
  queued = 0;
  running = 0;
  waiters = [];
}
