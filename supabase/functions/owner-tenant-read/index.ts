// M-OPS-03 Phase 1c — read-only tenant drill-down for hq (Internal TF / DEV).
// Auth: JWT + fail-closed owner allowlist. Mutations forbidden.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { isCallerPlatformOwner } from "../_shared/ownerAllowlist.ts";
import {
  sanitizeTaskSearchTitle,
  taskEffectiveStatus,
  postgrestEffectiveStatusFilter,
} from "./taskQueryPredicates.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const STARTER_PM_LIMIT = 1;
const STARTER_WORKER_LIMIT = 5;

const TASK_STATUSES = [
  "new",
  "declined",
  "accepted",
  "in_progress",
  "submitted_for_review",
  "approved",
  "rejected",
  "cancelled",
] as const;

type TenantAction =
  | "listCompanies"
  | "getCompany"
  | "listProjects"
  | "listAllProjects"
  | "getProject"
  | "listProjectMembers"
  | "listUsers"
  | "listAllUsers"
  | "getUser"
  | "listTasks"
  | "getTask";

type CompanyUserRow = {
  id: string;
  system_permission?: string | null;
  role?: string | null;
  is_pending?: boolean | null;
  is_active?: boolean | null;
  deployable_seat?: string | null;
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function parseAction(raw: unknown): TenantAction | null {
  const actions: TenantAction[] = [
    "listCompanies",
    "getCompany",
    "listProjects",
    "listAllProjects",
    "getProject",
    "listProjectMembers",
    "listUsers",
    "listAllUsers",
    "getUser",
    "listTasks",
    "getTask",
  ];
  return typeof raw === "string" && actions.includes(raw as TenantAction)
    ? (raw as TenantAction)
    : null;
}

function parseUuid(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const id = raw.trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
    ? id
    : null;
}

function clampInt(raw: unknown, fallback: number, max: number): number {
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return Math.min(Math.floor(n), max);
}

function isMissingColumnError(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false;
  return error.code === "42703" ||
    /does not exist|42703|PGRST204/i.test(error.message ?? "");
}

function isMissingTableError(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false;
  return error.code === "PGRST205" ||
    /schema cache|could not find the table|42P01/i.test(error.message ?? "");
}

function isMissingSchemaError(error: { message?: string; code?: string } | null): boolean {
  return isMissingColumnError(error) || isMissingTableError(error);
}

type TaskQueryBuilder = ReturnType<ReturnType<typeof createClient>["from"]>;

/** Contract §4.1 TASK_LISTABLE — documentation/owner-task-query-contract.md */
function applyTaskListable(q: TaskQueryBuilder): TaskQueryBuilder {
  return q
    .is("deleted_at", null)
    .is("archived_at", null)
    .is("cancelled_at", null);
}

async function countListableTasksForProjects(
  admin: ReturnType<typeof createClient>,
  projectIds: string[],
): Promise<number> {
  if (projectIds.length === 0) return 0;
  const res = await applyTaskListable(
    admin
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .in("project_id", projectIds),
  );
  if (res.error) throw res.error;
  return res.count ?? 0;
}

async function countListableTasksByProjectId(
  admin: ReturnType<typeof createClient>,
  projectIds: string[],
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  for (const pid of projectIds) counts.set(pid, 0);
  if (projectIds.length === 0) return counts;

  const res = await applyTaskListable(
    admin.from("tasks").select("project_id").in("project_id", projectIds),
  );
  if (res.error) throw res.error;
  for (const row of res.data ?? []) {
    const pid = (row as { project_id: string }).project_id;
    counts.set(pid, (counts.get(pid) ?? 0) + 1);
  }
  return counts;
}

function displayRole(user: CompanyUserRow): string {
  return user.system_permission || user.role || "member";
}

async function queryUsersWithPermissionColumn<
  T extends { data: unknown; error: { message?: string; code?: string } | null },
>(
  tryLive: () => PromiseLike<T>,
  tryGreenfield: () => PromiseLike<T>,
): Promise<T> {
  const live = await tryLive();
  if (!isMissingColumnError(live.error)) return live;
  return await tryGreenfield();
}

const COMPANY_DETAIL_SELECT_LIVE =
  "id, name, type, description, address, phone, email, website, logo, is_active, created_at";
const COMPANY_DETAIL_SELECT_GREENFIELD =
  `${COMPANY_DETAIL_SELECT_LIVE}, updated_at`;

async function fetchCompanyDetailRow(
  admin: ReturnType<typeof createClient>,
  companyId: string,
) {
  const greenfield = await admin
    .from("companies")
    .select(COMPANY_DETAIL_SELECT_GREENFIELD)
    .eq("id", companyId)
    .maybeSingle();
  if (!isMissingColumnError(greenfield.error)) return greenfield;
  return admin
    .from("companies")
    .select(COMPANY_DETAIL_SELECT_LIVE)
    .eq("id", companyId)
    .maybeSingle();
}

function seatClassForUser(user: CompanyUserRow): "pm" | "worker" | "none" {
  const deploy = (user.deployable_seat || "").toLowerCase();
  if (deploy === "pm") return "pm";
  if (deploy === "worker") return "worker";
  const role = displayRole(user).toLowerCase();
  if (!role) return "none";
  if (role === "manager" || role === "supervisor") return "pm";
  return "worker";
}

function countSeats(users: CompanyUserRow[]): { pmCount: number; workerCount: number } {
  let pmCount = 0;
  let workerCount = 0;
  for (const user of users) {
    if (user.is_active === false) continue;
    const seat = seatClassForUser(user);
    if (seat === "pm") pmCount += 1;
    else if (seat === "worker") workerCount += 1;
  }
  return { pmCount, workerCount };
}

function metersFromEntitlementRow(row: Record<string, unknown>): Record<string, number | null> {
  const snapshot = row.entitlements_snapshot as {
    meters?: Record<string, number | null>;
  } | null;
  if (snapshot?.meters && typeof snapshot.meters === "object") {
    return { ...snapshot.meters };
  }
  return {
    pm_seats: typeof row.pm_seat_limit === "number" ? row.pm_seat_limit : STARTER_PM_LIMIT,
    worker_seats:
      typeof row.worker_seat_limit === "number"
        ? row.worker_seat_limit
        : STARTER_WORKER_LIMIT,
    projects: typeof row.project_limit === "number" ? row.project_limit : null,
    storage_bytes:
      typeof row.storage_limit_bytes === "number" ? row.storage_limit_bytes : null,
  };
}

function buildEntitlementView(
  entitlements: Record<string, unknown> | null,
  subscription: Record<string, unknown> | null,
) {
  if (!entitlements) {
    return {
      tierSlug: "pilot" as const,
      tierDisplayName: "Pilot",
      subscriptionStatus: "none",
      billingPhase: "pilot",
      hasStripeSubscription: false,
      meterLimits: {
        pm_seats: STARTER_PM_LIMIT,
        worker_seats: STARTER_WORKER_LIMIT,
        projects: null,
      },
      trialEndsAt: null as string | null,
      statusLabel: "Pilot · Starter defaults",
      limitsLabel: `PM ${STARTER_PM_LIMIT} · Worker ${STARTER_WORKER_LIMIT}`,
    };
  }

  const meters = metersFromEntitlementRow(entitlements);
  const planPricesRaw = subscription?.plan_prices;
  const planPrices = Array.isArray(planPricesRaw)
    ? (planPricesRaw[0] as { plan_tiers?: { slug?: string; display_name?: string } | null })
    : (planPricesRaw as { plan_tiers?: { slug?: string; display_name?: string } | null } | null);
  const tierSlug = planPrices?.plan_tiers?.slug ?? null;
  const tierDisplayName =
    planPrices?.plan_tiers?.display_name ??
    (subscription?.stripe_subscription_id ? "Subscribed" : "Pilot");
  const subscriptionStatus = String(entitlements.subscription_status ?? "unknown");
  const billingPhase = String(entitlements.billing_phase ?? "unknown");
  const pm = meters.pm_seats ?? STARTER_PM_LIMIT;
  const worker = meters.worker_seats ?? STARTER_WORKER_LIMIT;
  const projects = meters.projects ?? null;

  return {
    tierSlug,
    tierDisplayName,
    subscriptionStatus,
    billingPhase,
    hasStripeSubscription: Boolean(subscription?.stripe_subscription_id),
    meterLimits: { pm_seats: pm, worker_seats: worker, projects },
    trialEndsAt: (subscription?.trial_ends_at as string | null) ?? null,
    statusLabel: `${tierDisplayName} · ${subscriptionStatus.replace(/_/g, " ")}`,
    limitsLabel: `PM ${pm} · Worker ${worker}${
      projects != null ? ` · Projects ${projects}` : " · Projects ∞"
    }`,
  };
}

async function countByCompanyIds(
  admin: ReturnType<typeof createClient>,
  table: "projects" | "users",
  companyIds: string[],
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  for (const id of companyIds) counts.set(id, 0);
  if (companyIds.length === 0) return counts;

  const { data, error } = await admin
    .from(table)
    .select("company_id")
    .in("company_id", companyIds);
  if (error) throw error;
  for (const row of data ?? []) {
    const cid = (row as { company_id?: string }).company_id;
    if (cid) counts.set(cid, (counts.get(cid) ?? 0) + 1);
  }
  return counts;
}

/** Distinct active project assignments per user (list cards). */
async function countAssignedProjectsByUserIds(
  admin: ReturnType<typeof createClient>,
  userIds: string[],
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  for (const id of userIds) counts.set(id, 0);
  if (userIds.length === 0) return counts;

  let { data, error } = await admin
    .from("user_project_assignments")
    .select("user_id, project_id")
    .in("user_id", userIds)
    .eq("is_active", true);

  if (error) {
    const alt = await admin
      .from("user_project_assignments")
      .select("user_id, project_id")
      .in("user_id", userIds);
    data = alt.data;
    error = alt.error;
  }
  if (error) throw error;

  const seen = new Map<string, Set<string>>();
  for (const row of data ?? []) {
    const r = row as { user_id?: string; project_id?: string };
    if (!r.user_id || !r.project_id) continue;
    if (!seen.has(r.user_id)) seen.set(r.user_id, new Set());
    seen.get(r.user_id)!.add(r.project_id);
  }
  for (const [uid, projects] of seen) {
    counts.set(uid, projects.size);
  }
  return counts;
}

/** Distinct active assignees per project (project list cards). */
async function countMembersByProjectIds(
  admin: ReturnType<typeof createClient>,
  projectIds: string[],
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  for (const id of projectIds) counts.set(id, 0);
  if (projectIds.length === 0) return counts;

  let { data, error } = await admin
    .from("user_project_assignments")
    .select("user_id, project_id")
    .in("project_id", projectIds)
    .eq("is_active", true);

  if (error) {
    const alt = await admin
      .from("user_project_assignments")
      .select("user_id, project_id")
      .in("project_id", projectIds);
    data = alt.data;
    error = alt.error;
  }
  if (error) throw error;

  const seen = new Map<string, Set<string>>();
  for (const row of data ?? []) {
    const r = row as { user_id?: string; project_id?: string };
    if (!r.user_id || !r.project_id) continue;
    if (!seen.has(r.project_id)) seen.set(r.project_id, new Set());
    seen.get(r.project_id)!.add(r.user_id);
  }
  for (const [pid, users] of seen) {
    counts.set(pid, users.size);
  }
  return counts;
}

async function handleListCompanies(
  admin: ReturnType<typeof createClient>,
  body: Record<string, unknown>,
) {
  const limit = clampInt(body.limit, 25, 100);
  const offset = clampInt(body.offset, 0, 10_000);
  const query = typeof body.query === "string" ? body.query.trim() : "";

  let q = admin
    .from("companies")
    .select(
      "id, name, type, is_active, email, phone, created_at",
      { count: "exact" },
    )
    .order("name", { ascending: true })
    .range(offset, offset + limit - 1);

  if (query) {
    q = q.ilike("name", `%${query}%`);
  }

  const { data, error, count } = await q;
  if (error) throw error;

  const rows = data ?? [];
  const ids = rows.map((r) => (r as { id: string }).id);
  const [projectCounts, userCounts] = await Promise.all([
    countByCompanyIds(admin, "projects", ids),
    countByCompanyIds(admin, "users", ids),
  ]);

  const companies = rows.map((row) => {
    const r = row as {
      id: string;
      name: string;
      type: string;
      is_active: boolean;
      email: string | null;
      phone: string | null;
      created_at: string;
    };
    return {
      id: r.id,
      name: r.name,
      type: r.type,
      isActive: r.is_active,
      email: r.email,
      phone: r.phone,
      createdAt: r.created_at,
      projectCount: projectCounts.get(r.id) ?? 0,
      userCount: userCounts.get(r.id) ?? 0,
    };
  });

  return jsonResponse({
    companies,
    total: typeof count === "number" ? count : companies.length,
    limit,
    offset,
  });
}

async function loadCompanyEntitlement(
  admin: ReturnType<typeof createClient>,
  companyId: string,
) {
  const { data: entitlements, error: entError } = await admin
    .from("company_entitlements")
    .select(
      "pm_seat_limit, worker_seat_limit, project_limit, storage_limit_bytes, subscription_status, billing_phase, entitlements_snapshot",
    )
    .eq("company_id", companyId)
    .maybeSingle();

  if (entError && !/does not exist|42703|PGRST204/i.test(entError.message)) {
    console.error("owner-tenant-read entitlements", entError.message);
  }

  const { data: subscription, error: subError } = await admin
    .from("company_subscriptions")
    .select(
      "stripe_subscription_id, status, trial_ends_at, locked_plan_price_id, plan_prices:locked_plan_price_id ( plan_tiers:plan_tier_id ( slug, display_name ) )",
    )
    .eq("company_id", companyId)
    .maybeSingle();

  if (subError) {
    console.error("owner-tenant-read subscription", subError.message);
  }

  return buildEntitlementView(
    (entitlements as Record<string, unknown> | null) ?? null,
    subError ? null : (subscription as Record<string, unknown> | null),
  );
}

async function handleGetCompany(
  admin: ReturnType<typeof createClient>,
  body: Record<string, unknown>,
) {
  const companyId = parseUuid(body.companyId);
  if (!companyId) return jsonResponse({ error: "invalid_company_id" }, 400);

  const { data: company, error } = await fetchCompanyDetailRow(admin, companyId);

  if (error) throw error;
  if (!company) return jsonResponse({ error: "not_found" }, 404);
  const companyRow = company as { created_at: string; updated_at?: string };

  const [entitlement, projectRes, userRes, usersRes] = await Promise.all([
    loadCompanyEntitlement(admin, companyId),
    admin.from("projects").select("id", { count: "exact", head: true }).eq(
      "company_id",
      companyId,
    ),
    admin.from("users").select("id", { count: "exact", head: true }).eq(
      "company_id",
      companyId,
    ),
    queryUsersWithPermissionColumn(
      () =>
        admin
          .from("users")
          .select("id, role, is_pending, is_active, deployable_seat")
          .eq("company_id", companyId),
      () =>
        admin
          .from("users")
          .select("id, system_permission, is_pending, is_active, deployable_seat")
          .eq("company_id", companyId),
    ),
  ]);

  if (projectRes.error) throw projectRes.error;
  if (userRes.error) throw userRes.error;
  if (usersRes.error) throw usersRes.error;

  const { data: companyProjects } = await admin
    .from("projects")
    .select("id")
    .eq("company_id", companyId);
  const projectIds = (companyProjects ?? []).map((p) => (p as { id: string }).id);
  const taskCount = await countListableTasksForProjects(admin, projectIds);

  const stats = {
    projects: projectRes.count ?? 0,
    users: userRes.count ?? 0,
    tasks: taskCount,
  };

  const seatUsage = countSeats((usersRes.data ?? []) as CompanyUserRow[]);
  const limits = entitlement.meterLimits;

  return jsonResponse({
    company: {
      id: (company as { id: string }).id,
      name: (company as { name: string }).name,
      type: (company as { type: string }).type,
      description: (company as { description: string | null }).description,
      address: (company as { address: string | null }).address,
      phone: (company as { phone: string | null }).phone,
      email: (company as { email: string | null }).email,
      website: (company as { website: string | null }).website,
      logo: (company as { logo: string | null }).logo,
      isActive: (company as { is_active: boolean }).is_active,
      createdAt: companyRow.created_at,
      updatedAt: companyRow.updated_at ?? companyRow.created_at,
    },
    entitlement,
    usage: {
      pmSeats: seatUsage.pmCount,
      workerSeats: seatUsage.workerCount,
      pmSeatLimit: limits.pm_seats ?? STARTER_PM_LIMIT,
      workerSeatLimit: limits.worker_seats ?? STARTER_WORKER_LIMIT,
      projectCount: stats.projects,
      projectLimit: limits.projects,
    },
    stats,
  });
}

async function handleListProjects(
  admin: ReturnType<typeof createClient>,
  body: Record<string, unknown>,
) {
  const companyId = parseUuid(body.companyId);
  if (!companyId) return jsonResponse({ error: "invalid_company_id" }, 400);
  const limit = clampInt(body.limit, 100, 100);

  const { data: projects, error } = await admin
    .from("projects")
    .select("id, name, status, start_date, end_date, location, created_at")
    .eq("company_id", companyId)
    .order("name", { ascending: true })
    .limit(limit);

  if (error) throw error;
  const rows = projects ?? [];
  const pids = rows.map((p) => (p as { id: string }).id);
  const taskCounts = await countListableTasksByProjectId(admin, pids);

  const memberCounts = await countMembersByProjectIds(admin, pids);

  return jsonResponse({
    projects: rows.map((row) => {
      const r = row as {
        id: string;
        name: string;
        status: string;
        start_date: string;
        end_date: string | null;
        location: string | null;
        created_at: string;
      };
      return {
        id: r.id,
        name: r.name,
        status: r.status,
        startDate: r.start_date,
        endDate: r.end_date,
        location: r.location,
        createdAt: r.created_at,
        taskCount: taskCounts.get(r.id) ?? 0,
        memberCount: memberCounts.get(r.id) ?? 0,
      };
    }),
    truncated: rows.length >= limit,
    limit,
  });
}

/** Platform-wide project list (all companies) for hq Tenant → Projects. */
async function handleListAllProjects(
  admin: ReturnType<typeof createClient>,
  body: Record<string, unknown>,
) {
  const limit = clampInt(body.limit, 50, 100);
  const offset = clampInt(body.offset, 0, 10_000);
  const rawQuery = typeof body.query === "string" ? body.query.trim() : "";
  // No user wildcards — same discipline as owner-ops-read email search
  const query = rawQuery.replace(/[%*_]/g, "").slice(0, 80);

  let q = admin
    .from("projects")
    .select(
      "id, name, status, start_date, end_date, location, created_at, company_id",
      { count: "exact" },
    )
    .order("name", { ascending: true })
    .range(offset, offset + limit - 1);

  if (query) {
    q = q.ilike("name", `%${query}%`);
  }

  const { data: projects, error, count } = await q;
  if (error) throw error;

  const rows = projects ?? [];
  const companyIds = [
    ...new Set(
      rows
        .map((p) => (p as { company_id?: string | null }).company_id)
        .filter(Boolean) as string[],
    ),
  ];
  const nameByCompany = new Map<string, string>();
  if (companyIds.length > 0) {
    const { data: cos, error: cosErr } = await admin
      .from("companies")
      .select("id, name")
      .in("id", companyIds);
    if (cosErr) throw cosErr;
    for (const c of cos ?? []) {
      const row = c as { id: string; name: string };
      nameByCompany.set(row.id, row.name);
    }
  }

  const pids = rows.map((p) => (p as { id: string }).id);
  const taskCounts = await countListableTasksByProjectId(admin, pids);

  const memberCounts = await countMembersByProjectIds(admin, pids);

  return jsonResponse({
    projects: rows.map((row) => {
      const r = row as {
        id: string;
        name: string;
        status: string;
        start_date: string;
        end_date: string | null;
        location: string | null;
        created_at: string;
        company_id: string | null;
      };
      return {
        id: r.id,
        name: r.name,
        status: r.status,
        startDate: r.start_date,
        endDate: r.end_date,
        location: r.location,
        createdAt: r.created_at,
        taskCount: taskCounts.get(r.id) ?? 0,
        memberCount: memberCounts.get(r.id) ?? 0,
        companyId: r.company_id,
        companyName: r.company_id
          ? nameByCompany.get(r.company_id) ?? null
          : null,
      };
    }),
    total: count ?? rows.length,
    limit,
    offset,
    truncated: (count ?? 0) > offset + rows.length,
  });
}

async function handleGetProject(
  admin: ReturnType<typeof createClient>,
  body: Record<string, unknown>,
) {
  const projectId = parseUuid(body.projectId);
  const companyId = parseUuid(body.companyId);
  if (!projectId) return jsonResponse({ error: "invalid_project_id" }, 400);

  const { data: project, error } = await admin
    .from("projects")
    .select(
      "id, name, description, status, start_date, end_date, location, budget, company_id, created_at, updated_at",
    )
    .eq("id", projectId)
    .maybeSingle();

  if (error) throw error;
  if (!project) return jsonResponse({ error: "not_found" }, 404);

  const row = project as { company_id: string | null };
  if (companyId && row.company_id !== companyId) {
    return jsonResponse({ error: "forbidden" }, 403);
  }

  let taskRes = await applyTaskListable(
    admin.from("tasks").select("status, current_status").eq("project_id", projectId),
  );
  if (taskRes.error && isMissingColumnError(taskRes.error)) {
    taskRes = await applyTaskListable(
      admin.from("tasks").select("status").eq("project_id", projectId),
    );
  }
  if (taskRes.error) throw taskRes.error;

  const tasksByStatus: Record<string, number> = {};
  for (const status of TASK_STATUSES) tasksByStatus[status] = 0;
  for (const t of taskRes.data ?? []) {
    const s = taskEffectiveStatus(t as { status?: string | null; current_status?: string | null });
    if (s in tasksByStatus) tasksByStatus[s] += 1;
  }

  const p = project as {
    id: string;
    name: string;
    description: string;
    status: string;
    start_date: string;
    end_date: string | null;
    location: string | null;
    budget: number | null;
    company_id: string | null;
    created_at: string;
    updated_at: string;
  };

  return jsonResponse({
    project: {
      id: p.id,
      name: p.name,
      description: p.description,
      status: p.status,
      startDate: p.start_date,
      endDate: p.end_date,
      location: p.location,
      budget: p.budget,
      companyId: p.company_id,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
    },
    tasksByStatus,
    taskTotal: Object.values(tasksByStatus).reduce((a, b) => a + b, 0),
  });
}

async function handleListUsers(
  admin: ReturnType<typeof createClient>,
  body: Record<string, unknown>,
) {
  const companyId = parseUuid(body.companyId);
  if (!companyId) return jsonResponse({ error: "invalid_company_id" }, 400);
  const limit = clampInt(body.limit, 100, 100);

  const { data: users, error } = await queryUsersWithPermissionColumn(
    () =>
      admin
        .from("users")
        .select(
          "id, name, email, phone, role, position, is_pending, is_active, deployable_seat, created_at",
        )
        .eq("company_id", companyId)
        .order("name", { ascending: true })
        .limit(limit),
    () =>
      admin
        .from("users")
        .select(
          "id, name, email, phone, system_permission, position, is_pending, is_active, deployable_seat, created_at",
        )
        .eq("company_id", companyId)
        .order("name", { ascending: true })
        .limit(limit),
  );

  if (error) throw error;

  const rows = users ?? [];
  const projectCounts = await countAssignedProjectsByUserIds(
    admin,
    rows.map((row) => (row as { id: string }).id),
  );

  return jsonResponse({
    users: rows.map((row) => {
      const u = row as CompanyUserRow & {
        name: string;
        email: string;
        phone: string;
        position: string;
        created_at: string;
      };
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        role: displayRole(u),
        position: u.position,
        isPending: Boolean(u.is_pending),
        isActive: u.is_active !== false,
        seatClass: seatClassForUser(u),
        createdAt: u.created_at,
        projectCount: projectCounts.get(u.id) ?? 0,
      };
    }),
    truncated: rows.length >= limit,
    limit,
  });
}

async function handleGetUser(
  admin: ReturnType<typeof createClient>,
  body: Record<string, unknown>,
) {
  const userId = parseUuid(body.userId);
  const companyId = parseUuid(body.companyId);
  if (!userId) return jsonResponse({ error: "invalid_user_id" }, 400);

  const { data: user, error } = await queryUsersWithPermissionColumn(
    () =>
      admin
        .from("users")
        .select(
          "id, name, email, phone, company_id, role, position, is_pending, is_active, deployable_seat, created_at, updated_at, approved_at",
        )
        .eq("id", userId)
        .maybeSingle(),
    () =>
      admin
        .from("users")
        .select(
          "id, name, email, phone, company_id, system_permission, position, is_pending, is_active, deployable_seat, created_at, updated_at, approved_at",
        )
        .eq("id", userId)
        .maybeSingle(),
  );

  if (error) throw error;
  if (!user) return jsonResponse({ error: "not_found" }, 404);

  const u = user as CompanyUserRow & {
    name: string;
    email: string;
    phone: string;
    company_id: string | null;
    position: string;
    created_at: string;
    updated_at: string;
    approved_at: string | null;
  };

  if (companyId && u.company_id !== companyId) {
    return jsonResponse({ error: "forbidden" }, 403);
  }

  const joinedAssign = await admin
    .from("user_project_assignments")
    .select("project_role, is_active, projects(id, name, status)")
    .eq("user_id", userId)
    .eq("is_active", true);

  type AssignmentRow = {
    project_id: string;
    project_role?: string;
    category?: string;
    is_active: boolean;
    projects?: { id: string; name: string; status: string } | null;
  };

  let assignmentRows: AssignmentRow[] = [];

  if (!joinedAssign.error) {
    assignmentRows = (joinedAssign.data ?? []).map((row) => {
      const a = row as {
        project_role?: string;
        is_active: boolean;
        projects: { id: string; name: string; status: string } | null;
      };
      return {
        project_id: a.projects?.id ?? "",
        project_role: a.project_role,
        is_active: a.is_active,
        projects: a.projects,
      };
    });
  } else {
    const liveAssign = await admin
      .from("user_project_assignments")
      .select("project_id, category, is_active")
      .eq("user_id", userId)
      .eq("is_active", true);
    if (!liveAssign.error) {
      assignmentRows = (liveAssign.data ?? []) as AssignmentRow[];
    } else {
      const greenfieldAssign = await admin
        .from("user_project_assignments")
        .select("project_id, project_role, is_active")
        .eq("user_id", userId)
        .eq("is_active", true);
      if (greenfieldAssign.error) throw greenfieldAssign.error;
      assignmentRows = (greenfieldAssign.data ?? []) as AssignmentRow[];
    }
  }

  const projectIds = [
    ...new Set(assignmentRows.map((a) => a.project_id).filter(Boolean)),
  ];
  const projectById = new Map<
    string,
    { id: string; name: string; status: string }
  >();
  if (projectIds.length > 0) {
    const { data: projects, error: projectError } = await admin
      .from("projects")
      .select("id, name, status")
      .in("id", projectIds);
    if (projectError) throw projectError;
    for (const p of projects ?? []) {
      const row = p as { id: string; name: string; status: string };
      projectById.set(row.id, row);
    }
  }

  return jsonResponse({
    user: {
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone,
      companyId: u.company_id,
      role: displayRole(u),
      position: u.position,
      isPending: Boolean(u.is_pending),
      isActive: u.is_active !== false,
      seatClass: seatClassForUser(u),
      createdAt: u.created_at,
      updatedAt: u.updated_at,
      approvedAt: u.approved_at,
    },
    assignments: assignmentRows.map((row) => {
      const project = row.projects ??
        (row.project_id ? projectById.get(row.project_id) ?? null : null);
      return {
        projectId: project?.id ?? row.project_id ?? null,
        projectName: project?.name ?? "Unknown",
        projectStatus: project?.status ?? "",
        projectRole: row.project_role ?? row.category ?? "",
        isActive: row.is_active,
      };
    }),
  });
}

async function handleListProjectMembers(
  admin: ReturnType<typeof createClient>,
  body: Record<string, unknown>,
) {
  const projectId = parseUuid(body.projectId);
  const companyId = parseUuid(body.companyId);
  if (!projectId) return jsonResponse({ error: "invalid_project_id" }, 400);
  if (!companyId) return jsonResponse({ error: "invalid_company_id" }, 400);
  const limit = clampInt(body.limit, 100, 100);

  const { data: project, error: projectError } = await admin
    .from("projects")
    .select("id, company_id, name")
    .eq("id", projectId)
    .maybeSingle();
  if (projectError) throw projectError;
  if (!project) return jsonResponse({ error: "not_found" }, 404);
  if ((project as { company_id: string }).company_id !== companyId) {
    return jsonResponse({ error: "forbidden" }, 403);
  }

  let assignRes = await admin
    .from("user_project_assignments")
    .select("user_id, project_role, category, is_active")
    .eq("project_id", projectId)
    .eq("is_active", true)
    .limit(limit);
  if (assignRes.error) {
    assignRes = await admin
      .from("user_project_assignments")
      .select("user_id, project_role, category, is_active")
      .eq("project_id", projectId)
      .limit(limit);
  }
  if (assignRes.error) throw assignRes.error;

  const assignRows = (assignRes.data ?? []) as {
    user_id: string;
    project_role?: string;
    category?: string;
    is_active?: boolean;
  }[];
  const userIds = [...new Set(assignRows.map((a) => a.user_id).filter(Boolean))];
  const userById = new Map<string, CompanyUserRow & {
    name: string;
    email: string;
    phone: string;
    position: string;
  }>();

  if (userIds.length > 0) {
    const { data: users, error: usersError } = await queryUsersWithPermissionColumn(
      () =>
        admin
          .from("users")
          .select(
            "id, name, email, phone, role, position, is_pending, is_active, deployable_seat",
          )
          .in("id", userIds),
      () =>
        admin
          .from("users")
          .select(
            "id, name, email, phone, system_permission, position, is_pending, is_active, deployable_seat",
          )
          .in("id", userIds),
    );
    if (usersError) throw usersError;
    for (const u of users ?? []) {
      const row = u as CompanyUserRow & {
        name: string;
        email: string;
        phone: string;
        position: string;
      };
      userById.set(row.id, row);
    }
  }

  return jsonResponse({
    members: assignRows.map((a) => {
      const u = userById.get(a.user_id);
      return {
        userId: a.user_id,
        name: u?.name ?? "Unknown",
        email: u?.email ?? "",
        phone: u?.phone ?? "",
        role: u ? displayRole(u) : "member",
        position: u?.position ?? "",
        isPending: Boolean(u?.is_pending),
        isActive: u?.is_active !== false,
        seatClass: u ? seatClassForUser(u) : "worker",
        projectRole: a.project_role ?? a.category ?? "",
      };
    }),
    truncated: assignRows.length >= limit,
    limit,
  });
}

async function handleListAllUsers(
  admin: ReturnType<typeof createClient>,
  body: Record<string, unknown>,
) {
  const limit = clampInt(body.limit, 50, 100);
  const offset = clampInt(body.offset, 0, 10_000);
  const rawQuery = typeof body.query === "string" ? body.query.trim() : "";
  const query = rawQuery.replace(/[%*_]/g, "").slice(0, 80);

  let q = admin
    .from("users")
    .select(
      "id, name, email, phone, company_id, role, position, is_pending, is_active, deployable_seat, created_at",
      { count: "exact" },
    )
    .order("name", { ascending: true })
    .range(offset, offset + limit - 1);

  if (query) {
    if (query.includes("@")) {
      q = q.ilike("email", `%${query}%`);
    } else {
      q = q.or(`name.ilike.%${query}%,email.ilike.%${query}%`);
    }
  }

  let { data: users, error, count } = await q;
  if (error && isMissingColumnError(error)) {
    let alt = admin
      .from("users")
      .select(
        "id, name, email, phone, company_id, system_permission, position, is_pending, is_active, deployable_seat, created_at",
        { count: "exact" },
      )
      .order("name", { ascending: true })
      .range(offset, offset + limit - 1);
    if (query) {
      if (query.includes("@")) {
        alt = alt.ilike("email", `%${query}%`);
      } else {
        alt = alt.or(`name.ilike.%${query}%,email.ilike.%${query}%`);
      }
    }
    const retry = await alt;
    users = retry.data;
    error = retry.error;
    count = retry.count;
  }
  if (error) throw error;

  const rows = users ?? [];
  const companyIds = [
    ...new Set(
      rows
        .map((u) => (u as { company_id?: string | null }).company_id)
        .filter(Boolean) as string[],
    ),
  ];
  const nameByCompany = new Map<string, string>();
  if (companyIds.length > 0) {
    const { data: cos, error: cosErr } = await admin
      .from("companies")
      .select("id, name")
      .in("id", companyIds);
    if (cosErr) throw cosErr;
    for (const c of cos ?? []) {
      const row = c as { id: string; name: string };
      nameByCompany.set(row.id, row.name);
    }
  }

  const projectCounts = await countAssignedProjectsByUserIds(
    admin,
    rows.map((u) => (u as { id: string }).id),
  );

  return jsonResponse({
    users: rows.map((row) => {
      const u = row as CompanyUserRow & {
        name: string;
        email: string;
        phone: string;
        company_id: string | null;
        position: string;
        created_at: string;
      };
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        role: displayRole(u),
        position: u.position,
        isPending: Boolean(u.is_pending),
        isActive: u.is_active !== false,
        seatClass: seatClassForUser(u),
        createdAt: u.created_at,
        companyId: u.company_id,
        companyName: u.company_id
          ? nameByCompany.get(u.company_id) ?? null
          : null,
        projectCount: projectCounts.get(u.id) ?? 0,
      };
    }),
    total: count ?? rows.length,
    limit,
    offset,
    truncated: (count ?? 0) > offset + rows.length,
  });
}

async function companyProjectIds(
  admin: ReturnType<typeof createClient>,
  companyId: string,
): Promise<string[]> {
  const { data, error } = await admin
    .from("projects")
    .select("id")
    .eq("company_id", companyId);
  if (error) throw error;
  return (data ?? []).map((p) => (p as { id: string }).id);
}

async function assertProjectInCompany(
  admin: ReturnType<typeof createClient>,
  projectId: string,
  companyId: string,
): Promise<boolean> {
  const { data, error } = await admin
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("company_id", companyId)
    .maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

type TaskRelationRole = "assigner" | "assignee" | "delegate";

type TaskListRow = {
  id: string;
  title: string;
  status: string | null;
  current_status?: string | null;
  priority: string;
  project_id: string;
  primary_assignee_id: string | null;
  completion_percentage: number;
  updated_at: string;
  created_at: string;
};

type StatusFilterMode = "effective" | "status-column";

function mapTaskListItem(
  row: TaskListRow,
  projectById: Map<string, { id: string; name: string }>,
  assigneeById: Map<string, string>,
  relationRoles?: TaskRelationRole[],
) {
  const project = projectById.get(row.project_id);
  const assigneeId = row.primary_assignee_id?.trim() || null;
  return {
    id: row.id,
    title: row.title,
    status: taskEffectiveStatus(row),
    priority: row.priority,
    projectId: row.project_id,
    projectName: project?.name ?? "Unknown",
    primaryAssigneeId: assigneeId,
    primaryAssigneeName: assigneeId ? assigneeById.get(assigneeId) ?? null : null,
    completionPercentage: row.completion_percentage ?? 0,
    updatedAt: row.updated_at,
    createdAt: row.created_at,
    relationRoles: relationRoles && relationRoles.length > 0 ? relationRoles : undefined,
  };
}

function addRelationRole(
  rolesById: Map<string, Set<TaskRelationRole>>,
  taskId: string,
  role: TaskRelationRole,
) {
  const set = rolesById.get(taskId) ?? new Set<TaskRelationRole>();
  set.add(role);
  rolesById.set(taskId, set);
}

const TASK_LIST_SELECT_LIVE =
  "id, title, status, current_status, priority, project_id, primary_assignee_id, completion_percentage, updated_at, created_at";
const TASK_LIST_SELECT_FALLBACK =
  "id, title, status, current_status, priority, project_id, completion_percentage, updated_at, created_at";
const TASK_LIST_SELECT_MIN =
  "id, title, status, priority, project_id, completion_percentage, updated_at, created_at";

type TaskListQuery = TaskQueryBuilder;

function applyTaskListScope(
  q: TaskListQuery,
  projectIds: string[],
  statusFilter: string | null,
  query: string,
  statusMode: StatusFilterMode = "effective",
): TaskListQuery {
  let scoped = applyTaskListable(q.in("project_id", projectIds));
  if (statusFilter) {
    if (statusMode === "effective") {
      scoped = scoped.or(postgrestEffectiveStatusFilter(statusFilter));
    } else {
      scoped = scoped.eq("status", statusFilter);
    }
  }
  if (query) scoped = scoped.ilike("title", `%${query}%`);
  return scoped;
}

function mergeTaskListRows(rows: TaskListRow[]): TaskListRow[] {
  const byId = new Map<string, TaskListRow>();
  for (const row of rows) byId.set(row.id, row);
  return [...byId.values()].sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
  );
}

function formatErrorDetail(err: unknown): string {
  if (err instanceof Error && err.message.trim()) return err.message;
  if (err && typeof err === "object") {
    const row = err as Record<string, unknown>;
    if ("message" in row) {
      const message = formatErrorDetail(row.message);
      if (message !== "Unknown error") return message;
    }
    if ("details" in row) {
      const details = formatErrorDetail(row.details);
      if (details !== "Unknown error") return details;
    }
    if ("hint" in row && typeof row.hint === "string" && row.hint.trim()) {
      return row.hint;
    }
    try {
      return JSON.stringify(err);
    } catch {
      return "Unknown error";
    }
  }
  if (typeof err === "string" && err.trim()) return err.trim();
  return String(err);
}

/** HQ admin SoT: TASK_RELATED_TO_USER — assigner ∪ assignee ∪ delegate. */
async function fetchUserScopedTaskRows(
  admin: ReturnType<typeof createClient>,
  userId: string,
  projectIds: string[],
  statusFilter: string | null,
  query: string,
  select: string = TASK_LIST_SELECT_LIVE,
  statusMode: StatusFilterMode = "effective",
): Promise<{ rows: TaskListRow[]; rolesById: Map<string, Set<TaskRelationRole>> }> {
  const collected: TaskListRow[] = [];
  const rolesById = new Map<string, Set<TaskRelationRole>>();

  const pushRows = (rows: unknown[] | null, role: TaskRelationRole) => {
    for (const raw of rows ?? []) {
      const row = raw as TaskListRow;
      collected.push(row);
      addRelationRole(rolesById, row.id, role);
    }
  };

  let assignedRes = await applyTaskListScope(
    admin.from("tasks").select(select),
    projectIds,
    statusFilter,
    query,
    statusMode,
  ).contains("assigned_to", [userId]);

  if (assignedRes.error && isMissingSchemaError(assignedRes.error)) {
    assignedRes = { data: [], error: null };
  } else if (assignedRes.error) {
    throw assignedRes.error;
  } else {
    pushRows(assignedRes.data, "assignee");
  }

  let primaryRes = await applyTaskListScope(
    admin.from("tasks").select(select),
    projectIds,
    statusFilter,
    query,
    statusMode,
  ).eq("primary_assignee_id", userId);
  if (primaryRes.error && isMissingColumnError(primaryRes.error)) {
    primaryRes = { data: [], error: null };
  } else if (primaryRes.error) {
    throw primaryRes.error;
  } else {
    pushRows(primaryRes.data, "assignee");
  }

  let assignerRes = await applyTaskListScope(
    admin.from("tasks").select(select),
    projectIds,
    statusFilter,
    query,
    statusMode,
  ).eq("assigned_by", userId);
  if (assignerRes.error) throw assignerRes.error;
  pushRows(assignerRes.data, "assigner");

  let delegateRes = await applyTaskListScope(
    admin.from("tasks").select(select),
    projectIds,
    statusFilter,
    query,
    statusMode,
  ).contains("delegated_user_ids", [userId]);
  if (delegateRes.error && isMissingSchemaError(delegateRes.error)) {
    delegateRes = { data: [], error: null };
  } else if (delegateRes.error) {
    throw delegateRes.error;
  } else {
    pushRows(delegateRes.data, "delegate");
  }

  return { rows: mergeTaskListRows(collected), rolesById };
}

function asMissingColumnError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  return isMissingColumnError(err as { message?: string; code?: string });
}

async function enrichTaskListRows(
  admin: ReturnType<typeof createClient>,
  rows: TaskListRow[],
  rolesById?: Map<string, Set<TaskRelationRole>>,
) {
  const pids = [...new Set(rows.map((t) => t.project_id))];
  const projectById = new Map<string, { id: string; name: string }>();
  if (pids.length > 0) {
    const { data: projects, error: projectError } = await admin
      .from("projects")
      .select("id, name")
      .in("id", pids);
    if (projectError) throw projectError;
    for (const p of projects ?? []) {
      const row = p as { id: string; name: string };
      projectById.set(row.id, row);
    }
  }

  const assigneeIds = [
    ...new Set(
      rows
        .map((t) => t.primary_assignee_id?.trim())
        .filter(Boolean) as string[],
    ),
  ];
  const assigneeById = new Map<string, string>();
  if (assigneeIds.length > 0) {
    const { data: users, error: usersError } = await admin
      .from("users")
      .select("id, name")
      .in("id", assigneeIds);
    if (usersError) throw usersError;
    for (const u of users ?? []) {
      const row = u as { id: string; name: string };
      assigneeById.set(row.id, row.name);
    }
  }

  return rows.map((row) => {
    const roles = rolesById?.get(row.id);
    return mapTaskListItem(
      row,
      projectById,
      assigneeById,
      roles ? [...roles] : undefined,
    );
  });
}

async function handleListTasks(
  admin: ReturnType<typeof createClient>,
  body: Record<string, unknown>,
) {
  const companyId = parseUuid(body.companyId);
  if (!companyId) return jsonResponse({ error: "invalid_company_id" }, 400);

  const projectId = body.projectId != null ? parseUuid(body.projectId) : null;
  if (body.projectId != null && !projectId) {
    return jsonResponse({ error: "invalid_project_id" }, 400);
  }
  const userId = body.userId != null ? parseUuid(body.userId) : null;
  if (body.userId != null && !userId) {
    return jsonResponse({ error: "invalid_user_id" }, 400);
  }

  const limit = clampInt(body.limit, 50, 100);
  const offset = clampInt(body.offset, 0, 10_000);
  const query = sanitizeTaskSearchTitle(body.query);
  const statusFilter =
    typeof body.status === "string" && TASK_STATUSES.includes(body.status as typeof TASK_STATUSES[number])
      ? body.status
      : null;

  let projectIds = await companyProjectIds(admin, companyId);
  if (projectIds.length === 0) {
    return jsonResponse({ tasks: [], total: 0, limit, offset, truncated: false });
  }

  if (projectId) {
    const ok = await assertProjectInCompany(admin, projectId, companyId);
    if (!ok) return jsonResponse({ error: "forbidden" }, 403);
    projectIds = [projectId];
  }

  if (userId) {
    const { data: userRow, error: userErr } = await admin
      .from("users")
      .select("id")
      .eq("id", userId)
      .eq("company_id", companyId)
      .maybeSingle();
    if (userErr) throw userErr;
    if (!userRow) return jsonResponse({ error: "forbidden" }, 403);

    let scoped: { rows: TaskListRow[]; rolesById: Map<string, Set<TaskRelationRole>> } | null = null;
    const userAttempts: Array<{ select: string; statusMode: StatusFilterMode }> = [
      { select: TASK_LIST_SELECT_LIVE, statusMode: "effective" },
      { select: TASK_LIST_SELECT_FALLBACK, statusMode: "effective" },
      { select: TASK_LIST_SELECT_MIN, statusMode: "status-column" },
    ];
    let lastUserErr: unknown = null;
    for (const attempt of userAttempts) {
      try {
        scoped = await fetchUserScopedTaskRows(
          admin,
          userId,
          projectIds,
          statusFilter,
          query,
          attempt.select,
          attempt.statusMode,
        );
        lastUserErr = null;
        break;
      } catch (err) {
        lastUserErr = err;
        if (!asMissingColumnError(err)) throw err;
      }
    }
    if (!scoped) throw lastUserErr ?? new Error("listTasks user scope failed");

    const { rows: scopedRows, rolesById } = scoped;
    const total = scopedRows.length;
    const page = scopedRows.slice(offset, offset + limit);
    const tasks = await enrichTaskListRows(admin, page, rolesById);
    return jsonResponse({
      tasks,
      total,
      limit,
      offset,
      truncated: total > offset + page.length,
    });
  }

  let q = applyTaskListScope(
    admin
      .from("tasks")
      .select(TASK_LIST_SELECT_LIVE, { count: "exact" }),
    projectIds,
    statusFilter,
    query,
    "effective",
  )
    .order("updated_at", { ascending: false })
    .range(offset, offset + limit - 1);

  let { data: tasks, error, count } = await q;
  if (error && isMissingColumnError(error)) {
    const retry = await applyTaskListScope(
      admin
        .from("tasks")
        .select(TASK_LIST_SELECT_FALLBACK, { count: "exact" }),
      projectIds,
      statusFilter,
      query,
      "effective",
    )
      .order("updated_at", { ascending: false })
      .range(offset, offset + limit - 1);
    tasks = retry.data?.map((row) => ({
      ...(row as Record<string, unknown>),
      primary_assignee_id: null,
    })) ?? null;
    error = retry.error;
    count = retry.count;
  }
  if (error && isMissingColumnError(error)) {
    const retry = await applyTaskListScope(
      admin
        .from("tasks")
        .select(TASK_LIST_SELECT_MIN, { count: "exact" }),
      projectIds,
      statusFilter,
      query,
      "status-column",
    )
      .order("updated_at", { ascending: false })
      .range(offset, offset + limit - 1);
    tasks = retry.data?.map((row) => ({
      ...(row as Record<string, unknown>),
      primary_assignee_id: null,
    })) ?? null;
    error = retry.error;
    count = retry.count;
  }
  if (error) throw error;

  const rows = (tasks ?? []) as TaskListRow[];
  const enriched = await enrichTaskListRows(admin, rows);

  return jsonResponse({
    tasks: enriched,
    total: count ?? rows.length,
    limit,
    offset,
    truncated: (count ?? 0) > offset + rows.length,
  });
}

async function handleGetTask(
  admin: ReturnType<typeof createClient>,
  body: Record<string, unknown>,
) {
  const taskId = parseUuid(body.taskId);
  const companyId = parseUuid(body.companyId);
  if (!taskId) return jsonResponse({ error: "invalid_task_id" }, 400);
  if (!companyId) return jsonResponse({ error: "invalid_company_id" }, 400);

  const taskSelectLive =
    "id, project_id, title, description, status, current_status, priority, category, task_reference, due_date, completion_percentage, primary_assignee_id, assigned_to, location_on_site, tags, created_at, updated_at, assigned_by, accepted_by, reviewed_by";
  const taskSelectFallback =
    "id, project_id, title, description, status, current_status, priority, category, task_reference, due_date, completion_percentage, assigned_to, location_on_site, tags, created_at, updated_at, assigned_by, accepted_by, reviewed_by";
  const taskSelectMin =
    "id, project_id, title, description, status, priority, category, task_reference, due_date, completion_percentage, assigned_to, location_on_site, tags, created_at, updated_at, assigned_by, accepted_by, reviewed_by";

  let taskRes = await admin.from("tasks").select(taskSelectLive).eq("id", taskId).maybeSingle();
  if (taskRes.error && isMissingColumnError(taskRes.error)) {
    taskRes = await admin.from("tasks").select(taskSelectFallback).eq("id", taskId).maybeSingle();
  }
  if (taskRes.error && isMissingColumnError(taskRes.error)) {
    taskRes = await admin.from("tasks").select(taskSelectMin).eq("id", taskId).maybeSingle();
  }
  if (taskRes.error) throw taskRes.error;
  if (!taskRes.data) return jsonResponse({ error: "not_found" }, 404);

  const task = taskRes.data as {
    id: string;
    project_id: string;
    title: string;
    description: string;
    status: string | null;
    current_status?: string | null;
    priority: string;
    category: string | null;
    task_reference: string | null;
    due_date: string | null;
    completion_percentage: number;
    primary_assignee_id?: string | null;
    assigned_to?: string[] | null;
    location_on_site: string | null;
    tags: string[] | null;
    created_at: string;
    updated_at: string;
    assigned_by: string | null;
    accepted_by: string | null;
    reviewed_by: string | null;
  };

  const { data: project, error: projectError } = await admin
    .from("projects")
    .select("id, name, status, company_id")
    .eq("id", task.project_id)
    .maybeSingle();
  if (projectError) throw projectError;
  if (!project) return jsonResponse({ error: "not_found" }, 404);
  if ((project as { company_id: string }).company_id !== companyId) {
    return jsonResponse({ error: "forbidden" }, 403);
  }

  const userIds = [
    task.primary_assignee_id,
    task.assigned_by,
    task.accepted_by,
    task.reviewed_by,
  ].filter(Boolean) as string[];
  const nameByUserId = new Map<string, string>();
  if (userIds.length > 0) {
    const { data: users, error: usersError } = await admin
      .from("users")
      .select("id, name")
      .in("id", userIds);
    if (usersError) throw usersError;
    for (const u of users ?? []) {
      const row = u as { id: string; name: string };
      nameByUserId.set(row.id, row.name);
    }
  }

  const assigneeCount = Array.isArray(task.assigned_to)
    ? task.assigned_to.filter(Boolean).length
    : task.primary_assignee_id
      ? 1
      : 0;

  const { data: activities, error: actError } = await admin
    .from("task_activities")
    .select("id, activity_type, timestamp, description, completion_percentage, user_id")
    .eq("task_id", taskId)
    .order("timestamp", { ascending: false })
    .limit(8);
  if (actError) throw actError;

  const activityUserIds = [
    ...new Set(
      (activities ?? [])
        .map((a) => (a as { user_id?: string }).user_id)
        .filter(Boolean) as string[],
    ),
  ];
  if (activityUserIds.length > 0) {
    const { data: actUsers, error: actUsersError } = await admin
      .from("users")
      .select("id, name")
      .in("id", activityUserIds);
    if (actUsersError) throw actUsersError;
    for (const u of actUsers ?? []) {
      const row = u as { id: string; name: string };
      nameByUserId.set(row.id, row.name);
    }
  }

  const p = project as { id: string; name: string; status: string; company_id: string };
  const primaryId = task.primary_assignee_id?.trim() || null;

  return jsonResponse({
    task: {
      id: task.id,
      title: task.title,
      description: task.description,
      status: taskEffectiveStatus(task),
      priority: task.priority,
      category: task.category,
      taskReference: task.task_reference,
      dueDate: task.due_date,
      completionPercentage: task.completion_percentage ?? 0,
      locationOnSite: task.location_on_site,
      tags: task.tags ?? [],
      createdAt: task.created_at,
      updatedAt: task.updated_at,
      projectId: p.id,
      projectName: p.name,
      projectStatus: p.status,
      companyId: p.company_id,
      primaryAssigneeId: primaryId,
      primaryAssigneeName: primaryId ? nameByUserId.get(primaryId) ?? null : null,
      assignedById: task.assigned_by,
      assignedByName: task.assigned_by ? nameByUserId.get(task.assigned_by) ?? null : null,
      acceptedById: task.accepted_by,
      acceptedByName: task.accepted_by ? nameByUserId.get(task.accepted_by) ?? null : null,
      reviewedById: task.reviewed_by,
      reviewedByName: task.reviewed_by ? nameByUserId.get(task.reviewed_by) ?? null : null,
      assigneeCount,
    },
    recentActivities: (activities ?? []).map((row) => {
      const a = row as {
        id: string;
        activity_type: string;
        timestamp: string;
        description: string | null;
        completion_percentage: number | null;
        user_id: string;
      };
      return {
        id: a.id,
        activityType: a.activity_type,
        timestamp: a.timestamp,
        description: a.description,
        completionPercentage: a.completion_percentage,
        userId: a.user_id,
        userName: nameByUserId.get(a.user_id) ?? "Unknown",
      };
    }),
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

    const body = await req.json().catch(() => ({}));
    const action = parseAction((body as { action?: unknown }).action);
    if (!action) {
      return jsonResponse({ error: "invalid_action" }, 400);
    }

    switch (action) {
      case "listCompanies":
        return await handleListCompanies(adminClient, body as Record<string, unknown>);
      case "getCompany":
        return await handleGetCompany(adminClient, body as Record<string, unknown>);
      case "listProjects":
        return await handleListProjects(adminClient, body as Record<string, unknown>);
      case "listAllProjects":
        return await handleListAllProjects(adminClient, body as Record<string, unknown>);
      case "getProject":
        return await handleGetProject(adminClient, body as Record<string, unknown>);
      case "listProjectMembers":
        return await handleListProjectMembers(
          adminClient,
          body as Record<string, unknown>,
        );
      case "listUsers":
        return await handleListUsers(adminClient, body as Record<string, unknown>);
      case "listAllUsers":
        return await handleListAllUsers(adminClient, body as Record<string, unknown>);
      case "getUser":
        return await handleGetUser(adminClient, body as Record<string, unknown>);
      case "listTasks":
        return await handleListTasks(adminClient, body as Record<string, unknown>);
      case "getTask":
        return await handleGetTask(adminClient, body as Record<string, unknown>);
      default:
        return jsonResponse({ error: "invalid_action" }, 400);
    }
  } catch (err) {
    const message = formatErrorDetail(err);
    console.error("owner-tenant-read", message);
    return jsonResponse({ error: "internal_error", detail: message }, 500);
  }
});
