// M-OPS-03 Phase 1a — platform KPI snapshot for hq (Internal TF / DEV).
// Auth: gateway JWT + in-function getUser; fail-closed owner allowlist.
// Counts: created_at in UTC window on public companies/projects/tasks/users.
// Deploy with JWT verification ON (default) — same contract as invite-user.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { isCallerPlatformOwner } from "../_shared/ownerAllowlist.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type KpiWindow = "today" | "7d" | "30d";

type MetricKey = "companies" | "projects" | "tasks" | "users";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function parseWindow(raw: unknown): KpiWindow | null {
  if (raw === "today" || raw === "7d" || raw === "30d") return raw;
  return null;
}

/** Inclusive UTC lower bound for created_at filters. */
function windowStartUtc(window: KpiWindow, now = new Date()): Date {
  if (window === "today") {
    return new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );
  }
  const ms = window === "7d" ? 7 : 30;
  return new Date(now.getTime() - ms * 24 * 60 * 60 * 1000);
}

type MetricMode = "created_in_window" | "total_fallback";

type HistogramBucket = {
  start: string;
  label: string;
  count: number;
};

type HistogramSeries = {
  bucketUnit: "hour" | "day";
  buckets: HistogramBucket[];
};

type BucketSpec = {
  bucketUnit: "hour" | "day";
  bucketMs: number;
  bucketCount: number;
  start: Date;
};

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function bucketSpecForWindow(window: KpiWindow, now = new Date()): BucketSpec {
  if (window === "today") {
    const start = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );
    return {
      bucketUnit: "hour",
      bucketMs: 60 * 60 * 1000,
      bucketCount: 24,
      start,
    };
  }
  const days = window === "7d" ? 7 : 30;
  const start = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  start.setUTCHours(0, 0, 0, 0);
  return {
    bucketUnit: "day",
    bucketMs: 24 * 60 * 60 * 1000,
    bucketCount: days,
    start,
  };
}

function buildEmptyBuckets(spec: BucketSpec): HistogramBucket[] {
  const buckets: HistogramBucket[] = [];
  for (let i = 0; i < spec.bucketCount; i += 1) {
    const bucketStart = new Date(spec.start.getTime() + i * spec.bucketMs);
    const label =
      spec.bucketUnit === "hour"
        ? pad2(bucketStart.getUTCHours())
        : `${pad2(bucketStart.getUTCMonth() + 1)}/${pad2(bucketStart.getUTCDate())}`;
    buckets.push({
      start: bucketStart.toISOString(),
      label,
      count: 0,
    });
  }
  return buckets;
}

function bucketIndexForTimestamp(
  spec: BucketSpec,
  createdAt: Date,
  now = new Date(),
): number | null {
  if (Number.isNaN(createdAt.getTime())) return null;
  if (createdAt.getTime() < spec.start.getTime()) return null;
  if (spec.bucketUnit === "hour") {
    const end = new Date(spec.start.getTime() + spec.bucketCount * spec.bucketMs);
    if (createdAt.getTime() >= end.getTime()) return null;
    return Math.floor(
      (createdAt.getTime() - spec.start.getTime()) / spec.bucketMs,
    );
  }
  const dayStart = Date.UTC(
    createdAt.getUTCFullYear(),
    createdAt.getUTCMonth(),
    createdAt.getUTCDate(),
  );
  const idx = Math.floor((dayStart - spec.start.getTime()) / spec.bucketMs);
  if (idx < 0 || idx >= spec.bucketCount) return null;
  if (dayStart > now.getTime()) return null;
  return idx;
}

async function fetchCreatedAtInWindow(
  admin: ReturnType<typeof createClient>,
  table: MetricKey,
  sinceIso: string,
): Promise<string[] | null> {
  const timestamps: string[] = [];
  let from = 0;
  const pageSize = 1000;
  while (true) {
    const page = await admin
      .from(table)
      .select("created_at")
      .gte("created_at", sinceIso)
      .order("created_at", { ascending: true })
      .range(from, from + pageSize - 1);
    if (page.error) return null;
    const rows = page.data ?? [];
    for (const row of rows) {
      const ts = (row as { created_at?: string }).created_at;
      if (typeof ts === "string") timestamps.push(ts);
    }
    if (rows.length < pageSize) break;
    from += pageSize;
  }
  return timestamps;
}

function histogramFromTimestamps(
  spec: BucketSpec,
  timestamps: string[],
  now = new Date(),
): HistogramSeries {
  const buckets = buildEmptyBuckets(spec);
  for (const ts of timestamps) {
    const idx = bucketIndexForTimestamp(spec, new Date(ts), now);
    if (idx === null || idx < 0 || idx >= buckets.length) continue;
    buckets[idx].count += 1;
  }
  return { bucketUnit: spec.bucketUnit, buckets };
}

async function metricSnapshot(
  admin: ReturnType<typeof createClient>,
  table: MetricKey,
  sinceIso: string,
  spec: BucketSpec,
  now: Date,
): Promise<{
  count: number;
  mode: MetricMode;
  histogram: HistogramSeries | null;
}> {
  const filtered = await admin
    .from(table)
    .select("id", { count: "exact", head: true })
    .gte("created_at", sinceIso);

  if (filtered.error || typeof filtered.count !== "number") {
    const total = await admin.from(table).select("id", { count: "exact", head: true });
    if (total.error || typeof total.count !== "number") {
      throw total.error ?? new Error(`count_failed:${table}`);
    }
    return { count: total.count, mode: "total_fallback", histogram: null };
  }

  const timestamps = await fetchCreatedAtInWindow(admin, table, sinceIso);
  const histogram =
    timestamps === null ? null : histogramFromTimestamps(spec, timestamps, now);

  return {
    count: filtered.count,
    mode: "created_in_window",
    histogram,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return jsonResponse({ error: "server_misconfigured" }, 500);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "not_authenticated" }, 401);
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const {
      data: { user: caller },
      error: callerError,
    } = await userClient.auth.getUser();

    if (callerError || !caller) {
      return jsonResponse({ error: "not_authenticated" }, 401);
    }

    const allowed = await isCallerPlatformOwner(adminClient, caller.id);
    if (!allowed) {
      return jsonResponse({ error: "forbidden" }, 403);
    }

    let windowRaw: unknown = "7d";
    if (req.method === "GET") {
      const url = new URL(req.url);
      windowRaw = url.searchParams.get("window") ?? "7d";
    } else {
      const body = await req.json().catch(() => ({}));
      windowRaw = (body as { window?: unknown })?.window ?? "7d";
    }

    const window = parseWindow(windowRaw);
    if (!window) {
      return jsonResponse({ error: "invalid_window" }, 400);
    }

    const now = new Date();
    const sinceIso = windowStartUtc(window, now).toISOString();
    const spec = bucketSpecForWindow(window, now);
    const tables: MetricKey[] = ["companies", "projects", "tasks", "users"];
    const metrics: Record<
      MetricKey,
      { count: number; mode: MetricMode; histogram: HistogramSeries | null }
    > = {
      companies: { count: 0, mode: "created_in_window", histogram: null },
      projects: { count: 0, mode: "created_in_window", histogram: null },
      tasks: { count: 0, mode: "created_in_window", histogram: null },
      users: { count: 0, mode: "created_in_window", histogram: null },
    };

    for (const table of tables) {
      metrics[table] = await metricSnapshot(
        adminClient,
        table,
        sinceIso,
        spec,
        now,
      );
    }

    const histograms: Partial<Record<MetricKey, HistogramSeries>> = {};
    for (const table of tables) {
      if (metrics[table].histogram) {
        histograms[table] = metrics[table].histogram!;
      }
    }

    return jsonResponse({
      window,
      generatedAt: now.toISOString(),
      since: sinceIso,
      timezone: "UTC",
      semantics: "created_at >= since (UTC); users = public.users",
      metrics: {
        companies: metrics.companies.count,
        projects: metrics.projects.count,
        tasks: metrics.tasks.count,
        users: metrics.users.count,
      },
      metricModes: {
        companies: metrics.companies.mode,
        projects: metrics.projects.mode,
        tasks: metrics.tasks.mode,
        users: metrics.users.mode,
      },
      histograms,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("owner-kpi-snapshot", message);
    return jsonResponse({ error: "internal_error", detail: message }, 500);
  }
});
