/**
 * Desk landing — per-project KPI cards for the signed-in user’s visible projects.
 */
import { getSessionScopedSupabase } from "@/api/supabaseSessionGate";
import {
  accumulateTaskCounts,
  emptyTaskCounts,
  KPI_ENGAGEMENT_WINDOW_MS,
  type EngagementBuckets,
  type TaskCountBuckets,
} from "./kpiBuckets";
import { formatProjectStatusLabel } from "@/ui/contracts/projectStatus";

export type WebDeskProjectOverview = {
  id: string;
  name: string;
  status: string;
  statusLabel: string;
  location: string | null;
  isProjectAdmin: boolean;
  tasks: TaskCountBuckets;
  members: EngagementBuckets;
};

export type WebDeskOverview = {
  projects: WebDeskProjectOverview[];
  totals: {
    projectCount: number;
    tasks: TaskCountBuckets;
    membersActive: number;
    membersIdle: number;
  };
};

function emptyOverview(): WebDeskOverview {
  return {
    projects: [],
    totals: {
      projectCount: 0,
      tasks: emptyTaskCounts(),
      membersActive: 0,
      membersIdle: 0,
    },
  };
}

export function buildDeskProjectOverview(args: {
  project: {
    id: string;
    name: string;
    status: string;
    location: string | null;
  };
  isProjectAdmin: boolean;
  tasks: Array<{ status: string; due_date?: string | null }>;
  memberIds: string[];
  activeMemberIds: Set<string>;
}): WebDeskProjectOverview {
  const tasks = accumulateTaskCounts(args.tasks);
  let active = 0;
  let idle = 0;
  for (const id of args.memberIds) {
    if (args.activeMemberIds.has(id)) active += 1;
    else idle += 1;
  }
  return {
    id: args.project.id,
    name: args.project.name,
    status: args.project.status,
    statusLabel: formatProjectStatusLabel(args.project.status),
    location: args.project.location,
    isProjectAdmin: args.isProjectAdmin,
    tasks,
    members: {
      active,
      idle,
      pending: 0,
      total: args.memberIds.length,
    },
  };
}

export async function loadDeskOverview(args: {
  userId: string;
  companyId: string | null | undefined;
  isCompanyAdmin: boolean;
}): Promise<{ overview: WebDeskOverview; error: string | null }> {
  const { userId, companyId, isCompanyAdmin } = args;
  if (!userId) {
    return { overview: emptyOverview(), error: "Not signed in" };
  }
  const client = await getSessionScopedSupabase();
  if (!client) {
    return { overview: emptyOverview(), error: "Not signed in" };
  }

  let projectRows: {
    id: string;
    name: string;
    status: string;
    location: string | null;
  }[] = [];
  const paProjectIds = new Set<string>();

  if (isCompanyAdmin && companyId) {
    const { data, error } = await client
      .from("projects")
      .select("id,name,status,location")
      .eq("company_id", companyId)
      .order("name");
    if (error) return { overview: emptyOverview(), error: error.message };
    projectRows = (data || []).map((p) => ({
      id: String(p.id),
      name: String(p.name ?? "Untitled"),
      status: String(p.status ?? "active"),
      location: p.location != null ? String(p.location) : null,
    }));
  } else {
    const { data: assignments, error: aErr } = await client
      .from("user_project_assignments")
      .select("project_id,project_role,is_active")
      .eq("user_id", userId)
      .eq("is_active", true);
    if (aErr) return { overview: emptyOverview(), error: aErr.message };
    const ids = [
      ...new Set(
        (assignments || []).map((a) =>
          String((a as { project_id: string }).project_id),
        ),
      ),
    ];
    for (const a of assignments || []) {
      const role = String(
        (a as { project_role?: string }).project_role || "",
      ).toLowerCase();
      if (role === "lead_project_manager" || role === "project_admin") {
        paProjectIds.add(String((a as { project_id: string }).project_id));
      }
    }
    if (ids.length === 0) {
      return { overview: emptyOverview(), error: null };
    }
    const { data, error } = await client
      .from("projects")
      .select("id,name,status,location")
      .in("id", ids)
      .order("name");
    if (error) return { overview: emptyOverview(), error: error.message };
    projectRows = (data || []).map((p) => ({
      id: String(p.id),
      name: String(p.name ?? "Untitled"),
      status: String(p.status ?? "active"),
      location: p.location != null ? String(p.location) : null,
    }));
  }

  const projectIds = projectRows.map((p) => p.id);
  if (projectIds.length === 0) {
    return { overview: emptyOverview(), error: null };
  }

  const sinceIso = new Date(Date.now() - KPI_ENGAGEMENT_WINDOW_MS).toISOString();
  const membersByProject: Record<string, string[]> = {};
  const tasksByProject: Record<string, Array<{ status: string; due_date: string | null }>> =
    {};
  const activeMemberIds = new Set<string>();

  const [
    { data: assignmentRows },
    { data: taskRows, error: tErr },
  ] = await Promise.all([
    client
      .from("user_project_assignments")
      .select("project_id,user_id,is_active")
      .in("project_id", projectIds)
      .eq("is_active", true),
    client
      .from("tasks")
      .select("id,project_id,status,due_date,deleted_at,archived_at")
      .in("project_id", projectIds)
      .is("deleted_at", null)
      .is("archived_at", null),
  ]);
  if (tErr) return { overview: emptyOverview(), error: tErr.message };

  for (const row of assignmentRows || []) {
    const pid = String((row as { project_id: string }).project_id);
    const uid = String((row as { user_id: string }).user_id);
    if (!membersByProject[pid]) membersByProject[pid] = [];
    membersByProject[pid].push(uid);
  }
  for (const row of taskRows || []) {
    const pid = String((row as { project_id: string }).project_id);
    if (!tasksByProject[pid]) tasksByProject[pid] = [];
    tasksByProject[pid].push({
      status: String((row as { status?: string }).status || ""),
      due_date:
        (row as { due_date?: string | null }).due_date != null
          ? String((row as { due_date: string }).due_date)
          : null,
    });
  }

  const taskIds = (taskRows || []).map((t) => String((t as { id: string }).id));
  if (taskIds.length > 0) {
    const { data: activityRows } = await client
      .from("task_activities")
      .select("user_id,timestamp")
      .in("task_id", taskIds.slice(0, 500))
      .gte("timestamp", sinceIso)
      .limit(500);
    for (const a of activityRows || []) {
      const uid = (a as { user_id?: string | null }).user_id;
      if (uid) activeMemberIds.add(String(uid));
    }
  }

  if (isCompanyAdmin) {
    const { data: myAssign } = await client
      .from("user_project_assignments")
      .select("project_id,project_role,is_active")
      .eq("user_id", userId)
      .eq("is_active", true)
      .in("project_id", projectIds);
    for (const a of myAssign || []) {
      const role = String(
        (a as { project_role?: string }).project_role || "",
      ).toLowerCase();
      if (role === "lead_project_manager" || role === "project_admin") {
        paProjectIds.add(String((a as { project_id: string }).project_id));
      }
    }
  }

  const projects = projectRows.map((p) =>
    buildDeskProjectOverview({
      project: p,
      isProjectAdmin: isCompanyAdmin || paProjectIds.has(p.id),
      tasks: tasksByProject[p.id] || [],
      memberIds: membersByProject[p.id] || [],
      activeMemberIds,
    }),
  );

  const totalsTasks = emptyTaskCounts();
  let membersActive = 0;
  let membersIdle = 0;
  for (const p of projects) {
    totalsTasks.closed += p.tasks.closed;
    totalsTasks.active += p.tasks.active;
    totalsTasks.idle += p.tasks.idle;
    totalsTasks.overdue += p.tasks.overdue;
    totalsTasks.total += p.tasks.total;
    membersActive += p.members.active;
    membersIdle += p.members.idle;
  }

  return {
    overview: {
      projects,
      totals: {
        projectCount: projects.length,
        tasks: totalsTasks,
        membersActive,
        membersIdle,
      },
    },
    error: null,
  };
}
