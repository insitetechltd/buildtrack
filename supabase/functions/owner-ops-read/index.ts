// M-OPS-03 HQ ops READ-ONLY enrichments (no DDL, no mutations).
// Actions: monitoringSnapshot | economicsStripe | listAuditLogs |
//          searchUsers | getSupportSnapshot | getUserSessionDebug
// Auth: JWT + platform_owners. Never returns secret values / password hashes.
// Deploy: bash scripts/supabase/deploy-owner-ops-read.sh --project-ref zusulknbhaumougqckec

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { isCallerPlatformOwner } from "../_shared/ownerAllowlist.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type OpsAction =
  | "monitoringSnapshot"
  | "economicsStripe"
  | "listAuditLogs"
  | "searchUsers"
  | "getSupportSnapshot"
  | "getUserSessionDebug";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function parseUuid(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const id = raw.trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      .test(id)
    ? id
    : null;
}

function clampInt(raw: unknown, fallback: number, max: number): number {
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return Math.min(Math.floor(n), max);
}

function isMissingColumnError(message: string | undefined): boolean {
  return /42703|PGRST204|does not exist/i.test(message || "");
}

function redactPayload(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactPayload);
  if (!value || typeof value !== "object") return value;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (/password|secret|token|key|authorization/i.test(k)) continue;
    out[k] = redactPayload(v);
  }
  return out;
}

async function probeProviderStatus(
  name: string,
  url: string,
): Promise<{
  name: string;
  state: "operational" | "degraded" | "unavailable";
  detail: string;
  scope: string;
}> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 4000);
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(t);
    if (!res.ok) {
      return {
        name,
        state: "degraded",
        detail: `HTTP ${res.status}`,
        scope: "global_provider",
      };
    }
    const body = await res.json();
    const ind = body?.status?.indicator;
    const state: "operational" | "degraded" | "unavailable" =
      ind === "none" ? "operational" : ind ? "degraded" : "unavailable";
    return {
      name,
      state,
      detail: String(body?.status?.description ?? "ok"),
      scope: "global_provider",
    };
  } catch {
    return {
      name,
      state: "unavailable",
      detail: "unreachable",
      scope: "global_provider",
    };
  }
}

async function handleMonitoring(
  admin: ReturnType<typeof createClient>,
) {
  const [stripeStatus, githubStatus, supabaseStatus] = await Promise.all([
    probeProviderStatus("stripe", "https://status.stripe.com/api/v2/status.json"),
    probeProviderStatus(
      "github",
      "https://www.githubstatus.com/api/v2/status.json",
    ),
    probeProviderStatus(
      "supabase",
      "https://status.supabase.com/api/v2/status.json",
    ),
  ]);

  // Boolean presence only — never values
  const secrets = {
    STRIPE_SECRET_KEY: Boolean(Deno.env.get("STRIPE_SECRET_KEY")),
    STRIPE_WEBHOOK_SECRET: Boolean(Deno.env.get("STRIPE_WEBHOOK_SECRET")),
    SUPABASE_SERVICE_ROLE_KEY: Boolean(Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")),
    PLATFORM_OWNER_IDS: Boolean(Deno.env.get("PLATFORM_OWNER_IDS")),
    GITHUB_TOKEN: Boolean(Deno.env.get("GITHUB_TOKEN")),
  };

  const githubToken = Deno.env.get("GITHUB_TOKEN");
  let githubRepo: {
    configured: boolean;
    openIssues?: number;
    defaultBranch?: string;
    detail: string;
  } = {
    configured: Boolean(githubToken),
    detail: githubToken
      ? "token present"
      : "Not configured on DEV — set GITHUB_TOKEN for repo health",
  };
  if (githubToken) {
    try {
      const repo = Deno.env.get("GITHUB_REPO") || "insitetechltd/buildtrack";
      const res = await fetch(`https://api.github.com/repos/${repo}`, {
        headers: {
          Authorization: `Bearer ${githubToken}`,
          Accept: "application/vnd.github+json",
          "User-Agent": "insite-hq-owner-ops",
        },
      });
      if (res.ok) {
        const body = await res.json();
        githubRepo = {
          configured: true,
          openIssues: body.open_issues_count,
          defaultBranch: body.default_branch,
          detail: "ok",
        };
      } else {
        githubRepo = {
          configured: true,
          detail: `GitHub API HTTP ${res.status}`,
        };
      }
    } catch {
      githubRepo = { configured: true, detail: "GitHub API unreachable" };
    }
  }

  // Auth signals — paginate lightly, sanitize; never false-zero on failure
  let authSignals: {
    state: "ok" | "unavailable";
    listed: number | null;
    unconfirmed: number | null;
    banned: number | null;
    signedInLast7d: number | null;
    truncated: boolean;
    detail: string;
  } = {
    state: "unavailable",
    listed: null,
    unconfirmed: null,
    banned: null,
    signedInLast7d: null,
    truncated: false,
    detail: "Auth list unavailable",
  };
  try {
    const { data, error } = await admin.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    });
    if (error || !data?.users) {
      authSignals.detail = error?.message
        ? "Auth Admin listUsers failed"
        : "Auth Admin listUsers empty";
    } else {
      const now = Date.now();
      const week = 7 * 24 * 60 * 60 * 1000;
      let unconfirmed = 0;
      let banned = 0;
      let signedInLast7d = 0;
      for (const u of data.users) {
        if (!u.email_confirmed_at) unconfirmed += 1;
        if (u.banned_until && new Date(u.banned_until).getTime() > now) {
          banned += 1;
        }
        if (
          u.last_sign_in_at &&
          now - new Date(u.last_sign_in_at).getTime() < week
        ) {
          signedInLast7d += 1;
        }
      }
      authSignals = {
        state: "ok",
        listed: data.users.length,
        unconfirmed,
        banned,
        signedInLast7d,
        truncated: data.users.length >= 200,
        detail: "sample ≤200 users",
      };
    }
  } catch (err) {
    console.error(
      "owner-ops-read auth list",
      err instanceof Error ? err.message : String(err),
    );
    authSignals.detail = "Auth Admin listUsers threw";
  }

  return jsonResponse({
    generatedAt: new Date().toISOString(),
    providers: [stripeStatus, githubStatus, supabaseStatus],
    secretsPresent: secrets,
    githubRepo,
    supabaseBackup: {
      state: "unavailable",
      detail:
        "Requires Supabase Management API PAT — not available via service-role (placeholder)",
    },
    edgeLogs: {
      state: "unavailable",
      detail: "Edge log streams need Management API — use Dashboard Logs",
    },
    authSignals,
    note:
      "Provider badges are global status pages, not this project's SLA.",
  });
}

async function stripeGet(
  path: string,
  secret: string,
): Promise<{ ok: boolean; status: number; body: unknown }> {
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    headers: { Authorization: `Bearer ${secret}` },
  });
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, body };
}

async function handleEconomicsStripe(
  admin: ReturnType<typeof createClient>,
) {
  const secret = Deno.env.get("STRIPE_SECRET_KEY");
  if (!secret) {
    return jsonResponse({
      generatedAt: new Date().toISOString(),
      stripeConfigured: false,
      providerState: "unavailable",
      detail: "Stripe: Not configured on DEV",
      mrrCents: null,
      currency: null,
      subscriptionStatusCounts: {},
      trialCount: 0,
      pastDueCount: 0,
      reconcile: {
        state: "unknown",
        aligned: 0,
        dbOnly: 0,
        stripeOnly: 0,
        statusMismatch: 0,
        flags: [] as { companyId: string | null; kind: string; detail: string }[],
      },
    });
  }

  const { data: dbSubs, error: dbErr } = await admin
    .from("company_subscriptions")
    .select("company_id, status, stripe_subscription_id");
  if (dbErr) throw dbErr;

  // Bulk list (Gate A) — one page is enough for DEV scale
  const listed = await stripeGet(
    "subscriptions?limit=100&status=all",
    secret,
  );
  if (!listed.ok) {
    return jsonResponse({
      generatedAt: new Date().toISOString(),
      stripeConfigured: true,
      providerState: "unavailable",
      detail: `Stripe API HTTP ${listed.status}`,
      mrrCents: null,
      currency: null,
      subscriptionStatusCounts: {},
      trialCount: 0,
      pastDueCount: 0,
      reconcile: {
        state: "unknown",
        aligned: 0,
        dbOnly: 0,
        stripeOnly: 0,
        statusMismatch: 0,
        flags: [],
      },
    });
  }

  const listedBody = listed.body as {
    data?: unknown[];
    has_more?: boolean;
  };
  const listIncomplete = Boolean(listedBody.has_more);
  const stripeSubs = (listedBody.data ?? []) as {
    id: string;
    status: string;
    currency?: string;
    items?: {
      data?: {
        quantity?: number | null;
        price?: {
          unit_amount?: number | null;
          recurring?: { interval?: string; interval_count?: number } | null;
        };
      }[];
    };
  }[];

  const statusCounts: Record<string, number> = {};
  let mrrCents = 0;
  let currency: string | null = null;
  let mixedCurrency = false;
  let trialCount = 0;
  let pastDueCount = 0;
  const stripeById = new Map<string, { status: string }>();

  function monthlyAmount(
    unit: number,
    qty: number,
    interval: string | undefined,
    intervalCount: number,
  ): number | null {
    const n = Math.max(1, intervalCount || 1);
    const total = unit * Math.max(1, qty);
    if (!interval || interval === "month") return total / n;
    if (interval === "year") return total / (12 * n);
    if (interval === "week") return (total * 52) / (12 * n);
    if (interval === "day") return (total * 365) / (12 * n);
    return null; // unknown / metered-ish — exclude from estimate
  }

  for (const sub of stripeSubs) {
    const st = (sub.status || "unknown").toLowerCase();
    statusCounts[st] = (statusCounts[st] ?? 0) + 1;
    stripeById.set(sub.id, { status: st });
    if (st === "trialing") trialCount += 1;
    if (st === "past_due") pastDueCount += 1;
    if (st === "active" || st === "trialing") {
      const cur = sub.currency?.toUpperCase() || null;
      if (currency && cur && currency !== cur) mixedCurrency = true;
      currency = currency ?? cur;
      for (const item of sub.items?.data ?? []) {
        const amount = item.price?.unit_amount;
        const recurring = item.price?.recurring;
        if (typeof amount !== "number" || !recurring) continue;
        const monthly = monthlyAmount(
          amount,
          typeof item.quantity === "number" ? item.quantity : 1,
          recurring.interval,
          recurring.interval_count ?? 1,
        );
        if (monthly != null) mrrCents += Math.round(monthly);
      }
    }
  }

  // Gate B: do not present a precise MRR when list incomplete or mixed currency
  const mrrReliable = !listIncomplete && !mixedCurrency;
  const mrrOut = mrrReliable ? mrrCents : null;

  const flags: { companyId: string | null; kind: string; detail: string }[] =
    [];
  let aligned = 0;
  let dbOnly = 0;
  let statusMismatch = 0;
  const seenStripe = new Set<string>();

  for (const row of dbSubs ?? []) {
    const r = row as {
      company_id: string;
      status: string | null;
      stripe_subscription_id: string | null;
    };
    if (!r.stripe_subscription_id) {
      dbOnly += 1;
      flags.push({
        companyId: r.company_id,
        kind: "db_only",
        detail: "DB subscription row without stripe_subscription_id",
      });
      continue;
    }
    seenStripe.add(r.stripe_subscription_id);
    const stripe = stripeById.get(r.stripe_subscription_id);
    if (!stripe) {
      dbOnly += 1;
      flags.push({
        companyId: r.company_id,
        kind: "db_only",
        detail: `Stripe id missing in list page (orphan or beyond page): ${r.stripe_subscription_id.slice(0, 14)}…`,
      });
      continue;
    }
    const dbStatus = (r.status || "").toLowerCase();
    if (dbStatus && dbStatus !== stripe.status) {
      statusMismatch += 1;
      flags.push({
        companyId: r.company_id,
        kind: "status_mismatch",
        detail: `db=${dbStatus} stripe=${stripe.status}`,
      });
    } else {
      aligned += 1;
    }
  }

  let stripeOnly = 0;
  for (const id of stripeById.keys()) {
    if (!seenStripe.has(id)) {
      stripeOnly += 1;
      flags.push({
        companyId: null,
        kind: "stripe_only",
        detail: `Stripe sub not in DB: ${id.slice(0, 14)}…`,
      });
    }
  }

  const detailParts = [
    "Stripe API estimate — quantity × unit_amount normalized to monthly",
  ];
  if (listIncomplete) {
    detailParts.push("list incomplete (has_more) — MRR withheld; reconcile may flag false db_only");
  }
  if (mixedCurrency) detailParts.push("mixed currencies — MRR withheld");

  return jsonResponse({
    generatedAt: new Date().toISOString(),
    stripeConfigured: true,
    providerState: listIncomplete ? "incomplete" : "ok",
    detail: detailParts.join(". "),
    mrrCents: mrrOut,
    mrrEstimate: mrrReliable,
    currency: mixedCurrency ? null : currency,
    listIncomplete,
    subscriptionStatusCounts: statusCounts,
    trialCount,
    pastDueCount,
    stripeListed: stripeSubs.length,
    dbSubscriptionRows: (dbSubs ?? []).length,
    reconcile: {
      state: listIncomplete ? "incomplete" : "computed",
      aligned,
      dbOnly,
      stripeOnly,
      statusMismatch,
      flags: flags.slice(0, 50),
      truncated: flags.length > 50,
    },
  });
}

async function handleListAudit(
  admin: ReturnType<typeof createClient>,
  body: Record<string, unknown>,
) {
  const limit = clampInt(body.limit, 50, 100);
  const { data, error } = await admin
    .from("owner_audit_log")
    .select(
      "id, occurred_at, actor_user_id, action, company_id, target_user_id, payload",
    )
    .order("occurred_at", { ascending: false })
    .limit(limit);
  if (error) throw error;

  const actorIds = [
    ...new Set(
      (data ?? [])
        .map((r) => (r as { actor_user_id?: string | null }).actor_user_id)
        .filter(Boolean) as string[],
    ),
  ];
  const emailById = new Map<string, string>();
  for (const id of actorIds.slice(0, 40)) {
    try {
      const { data: u } = await admin.auth.admin.getUserById(id);
      if (u.user?.email) emailById.set(id, u.user.email);
    } catch {
      /* ignore */
    }
  }

  return jsonResponse({
    entries: (data ?? []).map((row) => {
      const r = row as {
        id: string;
        occurred_at: string;
        actor_user_id: string | null;
        action: string;
        company_id: string | null;
        target_user_id: string | null;
        payload: Record<string, unknown>;
      };
      const payload = redactPayload(r.payload || {}) as Record<string, unknown>;
      return {
        id: r.id,
        occurredAt: r.occurred_at,
        actorUserId: r.actor_user_id,
        actorEmail: r.actor_user_id
          ? emailById.get(r.actor_user_id) ?? null
          : null,
        action: r.action,
        companyId: r.company_id,
        targetUserId: r.target_user_id,
        payload,
      };
    }),
    limit,
  });
}

async function handleSearchUsers(
  admin: ReturnType<typeof createClient>,
  body: Record<string, unknown>,
) {
  const raw = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  // Bounded exact/prefix email — no user wildcards (Gate B)
  if (!raw.includes("@") || raw.length < 5 || /[%*_]/.test(raw)) {
    return jsonResponse({ error: "email_required" }, 400);
  }
  const limit = clampInt(body.limit, 20, 20);
  // Exact email match only (Gate B) — no prefix wildcards
  let { data, error } = await admin
    .from("users")
    .select("id, name, email, company_id, role, is_active, is_pending")
    .ilike("email", raw)
    .limit(limit);
  if (error && isMissingColumnError(error.message)) {
    const alt = await admin
      .from("users")
      .select(
        "id, name, email, company_id, system_permission, is_active, is_pending",
      )
      .ilike("email", raw)
      .limit(limit);
    data = alt.data;
    error = alt.error;
  }
  if (error) throw error;

  const companyIds = [
    ...new Set(
      (data ?? [])
        .map((u) => (u as { company_id?: string | null }).company_id)
        .filter(Boolean) as string[],
    ),
  ];
  const nameByCompany = new Map<string, string>();
  if (companyIds.length) {
    const { data: cos } = await admin
      .from("companies")
      .select("id, name")
      .in("id", companyIds);
    for (const c of cos ?? []) {
      const row = c as { id: string; name: string };
      nameByCompany.set(row.id, row.name);
    }
  }

  return jsonResponse({
    users: (data ?? []).map((row) => {
      const u = row as {
        id: string;
        name: string;
        email: string;
        company_id: string | null;
        role?: string;
        system_permission?: string;
        is_active?: boolean;
        is_pending?: boolean;
      };
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        companyId: u.company_id,
        companyName: u.company_id
          ? nameByCompany.get(u.company_id) ?? null
          : null,
        role: u.role || u.system_permission || "member",
        isActive: u.is_active !== false,
        isPending: Boolean(u.is_pending),
      };
    }),
    limit,
  });
}

async function handleSupportSnapshot(
  admin: ReturnType<typeof createClient>,
  body: Record<string, unknown>,
) {
  const companyId = parseUuid(body.companyId);
  if (!companyId) return jsonResponse({ error: "invalid_company_id" }, 400);

  const { data: company, error } = await admin
    .from("companies")
    .select("id, name, type, email, is_active, created_at")
    .eq("id", companyId)
    .maybeSingle();
  if (error) throw error;
  if (!company) return jsonResponse({ error: "not_found" }, 404);

  const entRes = await admin
    .from("company_entitlements")
    .select(
      "subscription_status, billing_phase, pm_seat_limit, worker_seat_limit, project_limit",
    )
    .eq("company_id", companyId)
    .maybeSingle();

  const subRes = await admin
    .from("company_subscriptions")
    .select("status, stripe_subscription_id, stripe_customer_id")
    .eq("company_id", companyId)
    .maybeSingle();

  let users: unknown[] | null = null;
  let usersState: "ok" | "unavailable" = "ok";
  const usersRes = await admin
    .from("users")
    .select("id, role, is_active, deployable_seat")
    .eq("company_id", companyId);
  if (usersRes.error && isMissingColumnError(usersRes.error.message)) {
    const alt = await admin
      .from("users")
      .select("id, role, is_active")
      .eq("company_id", companyId);
    if (alt.error) {
      usersState = "unavailable";
    } else {
      users = alt.data ?? [];
    }
  } else if (usersRes.error) {
    usersState = "unavailable";
  } else {
    users = usersRes.data ?? [];
  }

  const projectsRes = await admin
    .from("projects")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId);

  const subRow = (!subRes.error ? subRes.data : null) as {
    status?: string;
    stripe_subscription_id?: string | null;
    stripe_customer_id?: string | null;
  } | null;

  const ent = !entRes.error ? entRes.data : null;

  return jsonResponse({
    generatedAt: new Date().toISOString(),
    company: {
      id: (company as { id: string }).id,
      name: (company as { name: string }).name,
      type: (company as { type: string }).type,
      email: (company as { email: string | null }).email,
      isActive: (company as { is_active: boolean }).is_active,
      createdAt: (company as { created_at: string }).created_at,
    },
    sections: {
      entitlement: entRes.error ? "unavailable" : "ok",
      subscription: subRes.error ? "unavailable" : "ok",
      users: usersState,
      projects: projectsRes.error ? "unavailable" : "ok",
    },
    entitlement: ent ?? null,
    subscription: subRes.error
      ? { status: null, stripeSubscriptionId: null, stripeCustomerId: null }
      : {
        status: subRow?.status ?? null,
        stripeSubscriptionId: subRow?.stripe_subscription_id ?? null,
        stripeCustomerId: subRow?.stripe_customer_id
          ? `${subRow.stripe_customer_id.slice(0, 8)}…`
          : null,
      },
    usage: {
      userCount: usersState === "ok" && users ? users.length : null,
      activeUsers:
        usersState === "ok" && users
          ? users.filter((u) =>
            (u as { is_active?: boolean }).is_active !== false
          ).length
          : null,
      projectCount: projectsRes.error ? null : (projectsRes.count ?? 0),
      projectLimit:
        (ent as { project_limit?: number | null } | null)?.project_limit ?? null,
    },
  });
}

async function handleSessionDebug(
  admin: ReturnType<typeof createClient>,
  body: Record<string, unknown>,
) {
  const userId = parseUuid(body.userId);
  if (!userId) return jsonResponse({ error: "invalid_user_id" }, 400);

  const { data, error } = await admin.auth.admin.getUserById(userId);
  if (error || !data.user) {
    return jsonResponse({ error: "not_found" }, 404);
  }
  const u = data.user;
  // Explicit allowlist — never encrypted_password / tokens
  return jsonResponse({
    user: {
      id: u.id,
      email: u.email ?? null,
      emailConfirmedAt: u.email_confirmed_at ?? null,
      lastSignInAt: u.last_sign_in_at ?? null,
      createdAt: u.created_at ?? null,
      bannedUntil: u.banned_until ?? null,
      appMetadataKeys: Object.keys(u.app_metadata || {}),
      userMetadataKeys: Object.keys(u.user_metadata || {}).filter(
        (k) => !/password|secret|token/i.test(k),
      ),
    },
  });
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
    if (!authHeader) return jsonResponse({ error: "not_authenticated" }, 401);

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const admin = createClient(supabaseUrl, serviceRoleKey);

    const {
      data: { user: caller },
      error: callerError,
    } = await userClient.auth.getUser();
    if (callerError || !caller) {
      return jsonResponse({ error: "not_authenticated" }, 401);
    }
    if (!(await isCallerPlatformOwner(admin, caller.id))) {
      return jsonResponse({ error: "forbidden" }, 403);
    }

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const action = body.action as OpsAction | undefined;

    switch (action) {
      case "monitoringSnapshot":
        return await handleMonitoring(admin);
      case "economicsStripe":
        return await handleEconomicsStripe(admin);
      case "listAuditLogs":
        return await handleListAudit(admin, body);
      case "searchUsers":
        return await handleSearchUsers(admin, body);
      case "getSupportSnapshot":
        return await handleSupportSnapshot(admin, body);
      case "getUserSessionDebug":
        return await handleSessionDebug(admin, body);
      default:
        return jsonResponse({ error: "invalid_action" }, 400);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("owner-ops-read", message);
    // Stable public envelope — no raw SQL/provider dumps (Gate A/B)
    return jsonResponse({ error: "internal_error" }, 500);
  }
});
