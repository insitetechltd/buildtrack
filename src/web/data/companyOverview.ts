/**
 * CA-only company overview — account-level KPIs (not project list / not activity feed).
 */
import { getSessionScopedSupabase } from "@/api/supabaseSessionGate";
import {
  accumulateProjectStages,
  accumulateTaskCounts,
  emptyStageCounts,
  emptyTaskCounts,
  isClosedTaskStatus,
  KPI_ENGAGEMENT_WINDOW_MS,
  wasTouchedInWindow,
  type EngagementBuckets,
  type StageCountBuckets,
  type TaskCountBuckets,
} from "./kpiBuckets";

export type WebCompanyOverview = {
  companyId: string;
  companyName: string;
  users: EngagementBuckets;
  projects: StageCountBuckets;
  /** Tasks created/updated in the past 7 days, classified by current lifecycle. */
  tasksPastWeek: TaskCountBuckets & { touched: number };
  kpis: {
    openTasks: number;
    overdueOpen: number;
    seats: number;
    projectsOnGoing: number;
    completionRatePct: number | null;
  };
};

function emptyOverview(companyId = ""): WebCompanyOverview {
  return {
    companyId,
    companyName: "Company",
    users: { active: 0, idle: 0, pending: 0, total: 0 },
    projects: emptyStageCounts(),
    tasksPastWeek: { ...emptyTaskCounts(), touched: 0 },
    kpis: {
      openTasks: 0,
      overdueOpen: 0,
      seats: 0,
      projectsOnGoing: 0,
      completionRatePct: null,
    },
  };
}

export function buildCompanyUserEngagement(args: {
  users: Array<{ id: string; is_active?: boolean; is_pending?: boolean }>;
  activeUserIds: Set<string>;
}): EngagementBuckets {
  let active = 0;
  let idle = 0;
  let pending = 0;
  let total = 0;
  for (const u of args.users) {
    if (u.is_active === false) continue;
    total += 1;
    if (u.is_pending) {
      pending += 1;
      continue;
    }
    if (args.activeUserIds.has(String(u.id))) active += 1;
    else idle += 1;
  }
  return { active, idle, pending, total };
}

export async function loadCompanyOverview(args: {
  companyId: string | null | undefined;
}): Promise<{ overview: WebCompanyOverview; error: string | null }> {
  const companyId = args.companyId ? String(args.companyId) : "";
  if (!companyId) {
    return { overview: emptyOverview(), error: "No company on this account" };
  }
  const client = await getSessionScopedSupabase();
  if (!client) {
    return { overview: emptyOverview(companyId), error: "Not signed in" };
  }

  const { data: companyRow, error: cErr } = await client
    .from("companies")
    .select("id,name")
    .eq("id", companyId)
    .maybeSingle();
  if (cErr) {
    return { overview: emptyOverview(companyId), error: cErr.message };
  }
  const companyName = String(
    (companyRow as { name?: string } | null)?.name || "Company",
  );

  const [{ data: userRows, error: uErr }, { data: projectRows, error: pErr }] =
    await Promise.all([
      client
        .from("users")
        .select("id,is_active,is_pending,deleted_at")
        .eq("company_id", companyId)
        .is("deleted_at", null),
      client
        .from("projects")
        .select("id,status")
        .eq("company_id", companyId),
    ]);
  if (uErr) return { overview: emptyOverview(companyId), error: uErr.message };
  if (pErr) return { overview: emptyOverview(companyId), error: pErr.message };

  const projects = (projectRows || []).map((p) => ({
    id: String(p.id),
    status: String(p.status ?? "active"),
  }));
  const projectIds = projects.map((p) => p.id);
  const projectStages = accumulateProjectStages(projects);

  const sinceIso = new Date(Date.now() - KPI_ENGAGEMENT_WINDOW_MS).toISOString();
  const activeUserIds = new Set<string>();

  let allTasks: Array<{
    status: string;
    due_date: string | null;
    created_at?: string | null;
    updated_at?: string | null;
  }> = [];

  if (projectIds.length > 0) {
    const { data: taskRows, error: tErr } = await client
      .from("tasks")
      .select("id,status,due_date,created_at,updated_at,deleted_at,archived_at")
      .in("project_id", projectIds)
      .is("deleted_at", null)
      .is("archived_at", null);
    if (tErr) {
      return {
        overview: {
          ...emptyOverview(companyId),
          companyName,
          projects: projectStages,
        },
        error: tErr.message,
      };
    }
    allTasks = (taskRows || []).map((t) => ({
      status: String((t as { status?: string }).status || ""),
      due_date:
        (t as { due_date?: string | null }).due_date != null
          ? String((t as { due_date: string }).due_date)
          : null,
      created_at: (t as { created_at?: string | null }).created_at ?? null,
      updated_at: (t as { updated_at?: string | null }).updated_at ?? null,
    }));

    const taskIds = (taskRows || []).map((t) => String((t as { id: string }).id));
    if (taskIds.length > 0) {
      // Chunk if huge — company spike tenants are small.
      const { data: activityRows } = await client
        .from("task_activities")
        .select("user_id,timestamp")
        .in("task_id", taskIds.slice(0, 500))
        .gte("timestamp", sinceIso)
        .limit(500);
      for (const a of activityRows || []) {
        const uid = (a as { user_id?: string | null }).user_id;
        if (uid) activeUserIds.add(String(uid));
      }
    }
  }

  const users = buildCompanyUserEngagement({
    users: (userRows || []) as Array<{
      id: string;
      is_active?: boolean;
      is_pending?: boolean;
    }>,
    activeUserIds,
  });

  const allTaskCounts = accumulateTaskCounts(allTasks);
  const weekTasks = allTasks.filter((t) =>
    wasTouchedInWindow({
      createdAt: t.created_at,
      updatedAt: t.updated_at,
      sinceIso,
    }),
  );
  const weekCounts = accumulateTaskCounts(weekTasks);

  const openTasks = allTaskCounts.active + allTaskCounts.idle;
  const closedAll = allTaskCounts.closed;
  const completionRatePct =
    allTaskCounts.total > 0
      ? Math.round((closedAll / allTaskCounts.total) * 100)
      : null;

  return {
    overview: {
      companyId,
      companyName,
      users,
      projects: projectStages,
      tasksPastWeek: { ...weekCounts, touched: weekTasks.length },
      kpis: {
        openTasks,
        overdueOpen: allTaskCounts.overdue,
        seats: users.total,
        projectsOnGoing: projectStages.active,
        completionRatePct,
      },
    },
    error: null,
  };
}

/** Test helper — past-week task filter uses closed detection. */
export function countClosedInList(
  tasks: Array<{ status: string }>,
): number {
  return tasks.filter((t) => isClosedTaskStatus(t.status)).length;
}
