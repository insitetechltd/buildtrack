/**
 * Desk home summary — company rollups (CA) + projects visible to the signed-in user.
 */
import { getSessionScopedSupabase } from "@/api/supabaseSessionGate";
import {
  isWebTaskOverdue,
  matchesReviewingStatusFilter,
  matchesWipStatusFilter,
} from "@/web/tasks/webTaskPresentation";
import { normalizeProjectStatus } from "@/ui/contracts/projectStatus";

export type WebDeskProjectStat = {
  id: string;
  name: string;
  status: string;
  location: string | null;
  isProjectAdmin: boolean;
  memberCount: number;
  taskCount: number;
  openTasks: number;
  doing: number;
  inReview: number;
  overdue: number;
};

export type WebDeskCompanyStat = {
  people: number;
  pendingPeople: number;
  projects: number;
  activeProjects: number;
  tasks: number;
  openTasks: number;
  overdue: number;
};

export type WebDeskSummary = {
  company: WebDeskCompanyStat | null;
  projects: WebDeskProjectStat[];
  totals: {
    projectCount: number;
    taskCount: number;
    openTasks: number;
    overdue: number;
    doing: number;
    inReview: number;
  };
};

const OPEN_STATUSES = new Set([
  "new",
  "assigned",
  "received",
  "accepted",
  "in_progress",
  "wip",
  "submitted_for_review",
  "reviewing",
  "rejected",
  "reported",
]);

function emptyCompany(): WebDeskCompanyStat {
  return {
    people: 0,
    pendingPeople: 0,
    projects: 0,
    activeProjects: 0,
    tasks: 0,
    openTasks: 0,
    overdue: 0,
  };
}

function emptySummary(): WebDeskSummary {
  return {
    company: null,
    projects: [],
    totals: {
      projectCount: 0,
      taskCount: 0,
      openTasks: 0,
      overdue: 0,
      doing: 0,
      inReview: 0,
    },
  };
}

type TaskLite = {
  project_id: string;
  status: string;
  due_date: string | null;
  deleted_at?: string | null;
  archived_at?: string | null;
};

function accumulateTasks(tasks: TaskLite[]) {
  let openTasks = 0;
  let overdue = 0;
  let doing = 0;
  let inReview = 0;
  for (const t of tasks) {
    const status = String(t.status || "").toLowerCase();
    const dueDate = t.due_date != null ? String(t.due_date) : null;
    if (OPEN_STATUSES.has(status)) openTasks += 1;
    if (matchesWipStatusFilter(status)) doing += 1;
    if (matchesReviewingStatusFilter(status)) inReview += 1;
    if (isWebTaskOverdue({ status, dueDate })) overdue += 1;
  }
  return { openTasks, overdue, doing, inReview, taskCount: tasks.length };
}

export function buildDeskProjectStat(
  project: {
    id: string;
    name: string;
    status: string;
    location: string | null;
  },
  opts: {
    isProjectAdmin: boolean;
    memberCount: number;
    tasks: TaskLite[];
  },
): WebDeskProjectStat {
  const acc = accumulateTasks(opts.tasks);
  return {
    id: project.id,
    name: project.name,
    status: project.status,
    location: project.location,
    isProjectAdmin: opts.isProjectAdmin,
    memberCount: opts.memberCount,
    taskCount: acc.taskCount,
    openTasks: acc.openTasks,
    doing: acc.doing,
    inReview: acc.inReview,
    overdue: acc.overdue,
  };
}

export async function loadDeskSummary(args: {
  userId: string;
  companyId: string | null | undefined;
  isCompanyAdmin: boolean;
}): Promise<{ summary: WebDeskSummary; error: string | null }> {
  const { userId, companyId, isCompanyAdmin } = args;
  if (!userId) {
    return { summary: emptySummary(), error: "Not signed in" };
  }
  const client = await getSessionScopedSupabase();
  if (!client) {
    return { summary: emptySummary(), error: "Not signed in" };
  }

  // Projects the user can see: CA → company projects; else → active assignments.
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
    if (error) return { summary: emptySummary(), error: error.message };
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
    if (aErr) return { summary: emptySummary(), error: aErr.message };

    const ids = [
      ...new Set(
        (assignments || []).map((a) => String((a as { project_id: string }).project_id)),
      ),
    ];
    for (const a of assignments || []) {
      const role = String((a as { project_role?: string }).project_role || "").toLowerCase();
      if (role === "lead_project_manager" || role === "project_admin") {
        paProjectIds.add(String((a as { project_id: string }).project_id));
      }
    }
    if (ids.length === 0) {
      // Still try company rollup for CA-shaped empty; non-CA empty projects.
      return {
        summary: {
          ...emptySummary(),
          company: isCompanyAdmin && companyId ? emptyCompany() : null,
        },
        error: null,
      };
    }
    const { data, error } = await client
      .from("projects")
      .select("id,name,status,location")
      .in("id", ids)
      .order("name");
    if (error) return { summary: emptySummary(), error: error.message };
    projectRows = (data || []).map((p) => ({
      id: String(p.id),
      name: String(p.name ?? "Untitled"),
      status: String(p.status ?? "active"),
      location: p.location != null ? String(p.location) : null,
    }));
  }

  const projectIds = projectRows.map((p) => p.id);
  const memberCountByProject: Record<string, number> = {};
  const tasksByProject: Record<string, TaskLite[]> = {};

  if (projectIds.length > 0) {
    const [{ data: assignmentRows }, { data: taskRows, error: tErr }] = await Promise.all([
      client
        .from("user_project_assignments")
        .select("project_id,is_active")
        .in("project_id", projectIds)
        .eq("is_active", true),
      client
        .from("tasks")
        .select("id,project_id,status,due_date,deleted_at,archived_at")
        .in("project_id", projectIds)
        .is("deleted_at", null)
        .is("archived_at", null),
    ]);
    if (tErr) return { summary: emptySummary(), error: tErr.message };

    for (const row of assignmentRows || []) {
      const pid = String((row as { project_id: string }).project_id);
      memberCountByProject[pid] = (memberCountByProject[pid] || 0) + 1;
    }
    for (const row of (taskRows || []) as TaskLite[]) {
      const pid = String(row.project_id);
      if (!tasksByProject[pid]) tasksByProject[pid] = [];
      tasksByProject[pid].push(row);
    }

    // CA: detect PA on company projects from assignments for this user
    if (isCompanyAdmin) {
      const { data: myAssign } = await client
        .from("user_project_assignments")
        .select("project_id,project_role,is_active")
        .eq("user_id", userId)
        .eq("is_active", true)
        .in("project_id", projectIds);
      for (const a of myAssign || []) {
        const role = String((a as { project_role?: string }).project_role || "").toLowerCase();
        if (role === "lead_project_manager" || role === "project_admin") {
          paProjectIds.add(String((a as { project_id: string }).project_id));
        }
      }
    }
  }

  const projects = projectRows.map((p) =>
    buildDeskProjectStat(p, {
      isProjectAdmin: isCompanyAdmin || paProjectIds.has(p.id),
      memberCount: memberCountByProject[p.id] || 0,
      tasks: tasksByProject[p.id] || [],
    }),
  );

  const totals = projects.reduce(
    (acc, p) => {
      acc.projectCount += 1;
      acc.taskCount += p.taskCount;
      acc.openTasks += p.openTasks;
      acc.overdue += p.overdue;
      acc.doing += p.doing;
      acc.inReview += p.inReview;
      return acc;
    },
    {
      projectCount: 0,
      taskCount: 0,
      openTasks: 0,
      overdue: 0,
      doing: 0,
      inReview: 0,
    },
  );

  let company: WebDeskCompanyStat | null = null;
  if (isCompanyAdmin && companyId) {
    const { data: users, error: uErr } = await client
      .from("users")
      .select("id,is_pending,is_active,deleted_at")
      .eq("company_id", companyId)
      .is("deleted_at", null);
    if (uErr) return { summary: emptySummary(), error: uErr.message };
    const people = (users || []).filter((u) => (u as { is_active?: boolean }).is_active !== false);
    company = {
      people: people.length,
      pendingPeople: people.filter((u) => Boolean((u as { is_pending?: boolean }).is_pending))
        .length,
      projects: projects.length,
      activeProjects: projects.filter(
        (p) => normalizeProjectStatus(p.status) === "active",
      ).length,
      tasks: totals.taskCount,
      openTasks: totals.openTasks,
      overdue: totals.overdue,
    };
  }

  return {
    summary: { company, projects, totals },
    error: null,
  };
}
