/**
 * M-SUPABASE-03d — deferred-schema compat fallback observability.
 *
 * Structured hit whenever taskStore strips redesign columns after
 * SQLSTATE 42703 / PostgREST PGRST204. In-process counters + JSON log line
 * so Maestro / CI can assert fire-rate → 0 after 03b on all tenants.
 */

export type DeferredFallbackOperation = "createTask" | "updateTask";

export interface DeferredFallbackFireEvent {
  op: DeferredFallbackOperation;
  deferredField: string | null;
  errorCode?: string | null;
  at: string;
}

export interface DeferredFallbackFireCounts {
  total: number;
  byOp: Record<DeferredFallbackOperation, number>;
  byField: Record<string, number>;
  recent: DeferredFallbackFireEvent[];
}

const MAX_RECENT = 50;

let total = 0;
const byOp: Record<DeferredFallbackOperation, number> = {
  createTask: 0,
  updateTask: 0,
};
const byField: Record<string, number> = {};
const recent: DeferredFallbackFireEvent[] = [];

export function resetDeferredFallbackObservability(): void {
  total = 0;
  byOp.createTask = 0;
  byOp.updateTask = 0;
  Object.keys(byField).forEach((key) => {
    delete byField[key];
  });
  recent.length = 0;
}

export function getDeferredFallbackFireCounts(): DeferredFallbackFireCounts {
  return {
    total,
    byOp: { ...byOp },
    byField: { ...byField },
    recent: [...recent],
  };
}

export function recordDeferredFallbackFire(args: {
  op: DeferredFallbackOperation;
  deferredField?: string | null;
  errorCode?: string | null;
}): DeferredFallbackFireEvent {
  const event: DeferredFallbackFireEvent = {
    op: args.op,
    deferredField: args.deferredField ?? null,
    errorCode: args.errorCode ?? null,
    at: new Date().toISOString(),
  };

  total += 1;
  byOp[args.op] += 1;
  const fieldKey = event.deferredField || "_unknown";
  byField[fieldKey] = (byField[fieldKey] || 0) + 1;
  recent.push(event);
  if (recent.length > MAX_RECENT) {
    recent.shift();
  }

  // Machine-readable single-line event for log scrapers / Maestro asserts.
  console.warn(
    `[deferred_schema_fallback] ${JSON.stringify({
      event: "deferred_schema_fallback",
      ...event,
      totals: { total, byOp: { ...byOp } },
    })}`,
  );

  return event;
}
