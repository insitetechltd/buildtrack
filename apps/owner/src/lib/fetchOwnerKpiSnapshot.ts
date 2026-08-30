export type KpiWindow = "today" | "7d" | "30d";

export type OwnerKpiMetrics = {
  companies: number;
  projects: number;
  tasks: number;
  users: number;
};

export type OwnerKpiHistogramBucket = {
  start: string;
  label: string;
  count: number;
};

export type OwnerKpiHistogram = {
  bucketUnit: "hour" | "day";
  buckets: OwnerKpiHistogramBucket[];
};

export type OwnerKpiHistograms = Partial<
  Record<keyof OwnerKpiMetrics, OwnerKpiHistogram>
>;

export type OwnerKpiSnapshot = {
  window: KpiWindow;
  generatedAt: string;
  since: string;
  timezone: string;
  semantics: string;
  metrics: OwnerKpiMetrics;
  metricModes?: Record<keyof OwnerKpiMetrics, string>;
  histograms?: OwnerKpiHistograms;
};

export type OwnerKpiErrorCode =
  | "not_authenticated"
  | "forbidden"
  | "invalid_window"
  | "server_misconfigured"
  | "internal_error"
  | "network"
  | "bad_response"
  | "not_configured";

export class OwnerKpiError extends Error {
  readonly code: OwnerKpiErrorCode;
  readonly status?: number;

  constructor(code: OwnerKpiErrorCode, message: string, status?: number) {
    super(message);
    this.name = "OwnerKpiError";
    this.code = code;
    this.status = status;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function parseHistogram(value: unknown): OwnerKpiHistogram | null {
  if (!isRecord(value)) return null;
  const bucketUnit = value.bucketUnit;
  if (bucketUnit !== "hour" && bucketUnit !== "day") return null;
  if (!Array.isArray(value.buckets)) return null;
  const buckets: OwnerKpiHistogramBucket[] = [];
  for (const raw of value.buckets) {
    if (!isRecord(raw)) return null;
    const start = typeof raw.start === "string" ? raw.start : "";
    const label = typeof raw.label === "string" ? raw.label : "";
    const count = asNumber(raw.count);
    if (!start || !label || count === null) return null;
    buckets.push({ start, label, count });
  }
  if (buckets.length === 0) return null;
  return { bucketUnit, buckets };
}

function parseHistograms(value: unknown): OwnerKpiHistograms | undefined {
  if (!isRecord(value)) return undefined;
  const keys: (keyof OwnerKpiMetrics)[] = [
    "companies",
    "projects",
    "tasks",
    "users",
  ];
  const out: OwnerKpiHistograms = {};
  for (const key of keys) {
    const parsed = parseHistogram(value[key]);
    if (parsed) out[key] = parsed;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

/** Pure parser — used by Jest and the live invoke path. */
export function parseOwnerKpiSnapshot(payload: unknown): OwnerKpiSnapshot {
  if (!isRecord(payload)) {
    throw new OwnerKpiError("bad_response", "KPI response is not an object");
  }
  const window = payload.window;
  if (window !== "today" && window !== "7d" && window !== "30d") {
    throw new OwnerKpiError("bad_response", "KPI window missing or invalid");
  }
  const metricsRaw = payload.metrics;
  if (!isRecord(metricsRaw)) {
    throw new OwnerKpiError("bad_response", "KPI metrics missing");
  }
  const companies = asNumber(metricsRaw.companies);
  const projects = asNumber(metricsRaw.projects);
  const tasks = asNumber(metricsRaw.tasks);
  const users = asNumber(metricsRaw.users);
  if (
    companies === null ||
    projects === null ||
    tasks === null ||
    users === null
  ) {
    throw new OwnerKpiError("bad_response", "KPI metric counts invalid");
  }
  const generatedAt =
    typeof payload.generatedAt === "string" ? payload.generatedAt : "";
  if (!generatedAt) {
    throw new OwnerKpiError("bad_response", "KPI generatedAt missing");
  }
  return {
    window,
    generatedAt,
    since: typeof payload.since === "string" ? payload.since : "",
    timezone: typeof payload.timezone === "string" ? payload.timezone : "UTC",
    semantics: typeof payload.semantics === "string" ? payload.semantics : "",
    metrics: { companies, projects, tasks, users },
    metricModes: isRecord(payload.metricModes)
      ? (payload.metricModes as OwnerKpiSnapshot["metricModes"])
      : undefined,
    histograms: parseHistograms(payload.histograms),
  };
}

export function mapOwnerKpiHttpError(
  status: number,
  body: unknown,
): OwnerKpiError {
  const code =
    isRecord(body) && typeof body.error === "string" ? body.error : null;
  if (status === 401 || code === "not_authenticated") {
    return new OwnerKpiError("not_authenticated", "Sign in again to load KPIs", 401);
  }
  if (status === 403 || code === "forbidden") {
    return new OwnerKpiError("forbidden", "Not authorized for platform KPIs", 403);
  }
  if (status === 400 || code === "invalid_window") {
    return new OwnerKpiError("invalid_window", "Invalid KPI window", 400);
  }
  if (code === "server_misconfigured") {
    return new OwnerKpiError("server_misconfigured", "KPI service misconfigured", status);
  }
  return new OwnerKpiError(
    "internal_error",
    `KPI request failed (${status})`,
    status,
  );
}

type InvokeClient = {
  functions: {
    invoke: (
      name: string,
      options: { body: { window: KpiWindow } },
    ) => Promise<{ data: unknown; error: { message?: string; context?: Response } | null }>;
  };
};

export async function fetchOwnerKpiSnapshot(
  client: InvokeClient | null,
  window: KpiWindow = "7d",
): Promise<OwnerKpiSnapshot> {
  if (!client) {
    throw new OwnerKpiError("not_configured", "Supabase client not configured");
  }
  const { data, error } = await client.functions.invoke("owner-kpi-snapshot", {
    body: { window },
  });
  if (error) {
    const ctx = error.context;
    if (ctx && typeof (ctx as Response).json === "function") {
      try {
        const body = await (ctx as Response).clone().json();
        throw mapOwnerKpiHttpError((ctx as Response).status, body);
      } catch (mapped) {
        if (mapped instanceof OwnerKpiError) throw mapped;
      }
    }
    throw new OwnerKpiError(
      "network",
      error.message || "KPI network error",
    );
  }
  return parseOwnerKpiSnapshot(data);
}
