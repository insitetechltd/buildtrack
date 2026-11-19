/**
 * M-WEB-02 project workspace — KPIs + project metadata for the desk header.
 */
import { getSessionScopedSupabase } from "@/api/supabaseSessionGate";
import type { ProjectStatus } from "@/types/buildtrack";
import type { ProjectsScreenProjectItem } from "@/ui/contracts/viewAdapters";
import {
  formatWebProjectStartDate,
  webProjectStatusLabel,
  webProjectStatusTone,
} from "@/web/projects/webProjectPresentation";
import {
  isWebTaskOverdue,
  matchesReviewingStatusFilter,
  matchesWipStatusFilter,
} from "@/web/tasks/webTaskPresentation";
import { loadProjectTasks } from "./projectTasks";
import { loadProjectTeam } from "./projectTeam";

export type WebProjectWorkspaceKpis = {
  projectName: string | null;
  openTasks: number;
  doing: number;
  inReview: number;
  overdue: number;
  members: number;
  projectAdmins: number;
};

export type WebProjectWorkspaceDetail = {
  id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  statusLabel: string;
  statusTone: ProjectsScreenProjectItem["statusTone"];
  location: string | null;
  clientName: string | null;
  startDate: string | null;
  startDateLabel: string;
  budget: number | null;
  budgetLabel: string | null;
  leadPmName: string | null;
  createdByName: string | null;
  memberCount: number;
  taskCount: number;
  memberCountLabel: string;
  taskCountLabel: string;
};

export type WebProjectWorkspacePayload = {
  detail: WebProjectWorkspaceDetail | null;
  kpis: WebProjectWorkspaceKpis;
  error: string | null;
};

function clientNameFromInfo(raw: unknown): string | null {
  if (!raw || typeof raw !== "object") return null;
  const name = (raw as { name?: unknown }).name;
  return name != null && String(name).trim() ? String(name) : null;
}

function asProjectStatus(raw: unknown): ProjectStatus {
  const v = String(raw || "active");
  if (v === "planning" || v === "active" || v === "completed" || v === "cancelled") {
    return v;
  }
  return "active";
}

const EMPTY_KPIS: WebProjectWorkspaceKpis = {
  projectName: null,
  openTasks: 0,
  doing: 0,
  inReview: 0,
  overdue: 0,
  members: 0,
  projectAdmins: 0,
};

export async function loadProjectWorkspace(
  projectId: string,
): Promise<WebProjectWorkspacePayload> {
  if (!projectId) {
    return { detail: null, kpis: EMPTY_KPIS, error: "Missing project" };
  }
  const client = await getSessionScopedSupabase();
  if (!client) {
    return { detail: null, kpis: EMPTY_KPIS, error: "Not signed in" };
  }

  const [{ data, error }, tasksResult, teamResult] = await Promise.all([
    client
      .from("projects")
      .select(
        "id,name,description,status,location,start_date,budget,client_info,created_by",
      )
      .eq("id", projectId)
      .maybeSingle(),
    loadProjectTasks(projectId),
    loadProjectTeam(projectId),
  ]);

  if (error) {
    return { detail: null, kpis: EMPTY_KPIS, error: error.message };
  }
  if (!data) {
    return { detail: null, kpis: EMPTY_KPIS, error: "Project not found" };
  }

  const loadError = tasksResult.error || teamResult.error;
  const members = teamResult.members;
  const list = tasksResult.tasks;
  const lead = members.find((m) => m.isProjectAdmin);

  let createdByName: string | null = null;
  if (data.created_by) {
    const { data: creator } = await client
      .from("users")
      .select("id,name")
      .eq("id", String(data.created_by))
      .maybeSingle();
    createdByName = creator?.name ? String(creator.name) : null;
  }

  const status = asProjectStatus(data.status);
  const budgetRaw = data.budget == null || data.budget === "" ? null : Number(data.budget);
  const budget = Number.isFinite(budgetRaw as number) ? (budgetRaw as number) : null;
  const memberCount = members.length;
  const taskCount = list.length;
  const startDate = data.start_date != null ? String(data.start_date) : null;
  const projectName = String(data.name ?? "Untitled");

  const openStatuses = new Set([
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

  return {
    detail: {
      id: String(data.id),
      name: projectName,
      description: data.description != null ? String(data.description) : null,
      status,
      statusLabel: webProjectStatusLabel(status),
      statusTone: webProjectStatusTone(status),
      location: data.location != null ? String(data.location) : null,
      clientName: clientNameFromInfo(data.client_info),
      startDate,
      startDateLabel: formatWebProjectStartDate(startDate),
      budget,
      budgetLabel: budget != null ? `Budget: $${budget.toLocaleString()}` : null,
      leadPmName: lead?.name ?? null,
      createdByName,
      memberCount,
      taskCount,
      memberCountLabel: `${memberCount} ${memberCount === 1 ? "member" : "members"}`,
      taskCountLabel: `${taskCount} ${taskCount === 1 ? "task" : "tasks"}`,
    },
    kpis: {
      projectName,
      openTasks: list.filter((t) => openStatuses.has(t.status.toLowerCase())).length,
      doing: list.filter((t) => matchesWipStatusFilter(t.status)).length,
      inReview: list.filter((t) => matchesReviewingStatusFilter(t.status)).length,
      overdue: list.filter((t) => isWebTaskOverdue(t)).length,
      members: memberCount,
      projectAdmins: members.filter((m) => m.isProjectAdmin).length,
    },
    error: loadError,
  };
}

/** @deprecated Prefer loadProjectWorkspace */
export async function loadProjectWorkspaceDetail(projectId: string) {
  const result = await loadProjectWorkspace(projectId);
  return { detail: result.detail, error: result.error };
}

/** @deprecated Prefer loadProjectWorkspace */
export async function loadProjectWorkspaceKpis(projectId: string) {
  const result = await loadProjectWorkspace(projectId);
  return { kpis: result.kpis, error: result.error };
}
