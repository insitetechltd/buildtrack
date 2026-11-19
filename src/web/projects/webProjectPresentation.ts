/**
 * Presentation helpers for web Projects list — mirrors mobile ProjectsScreen.
 */
import type { ProjectStatus } from "@/types/buildtrack";
import {
  normalizeProjectStatus,
  PROJECT_STATUS_LABELS,
} from "@/ui/contracts/projectStatus";
import type { ProjectsScreenProjectItem } from "@/ui/contracts/viewAdapters";
import type { WebCompanyProjectRow } from "@/web/data/companyDesk";

export type WebProjectsStatusFilter = ProjectStatus | "all";

export function webProjectStatusLabel(status: string): string {
  return PROJECT_STATUS_LABELS[normalizeProjectStatus(status)] || status;
}

export function webProjectStatusTone(
  status: string,
): ProjectsScreenProjectItem["statusTone"] {
  switch (normalizeProjectStatus(status)) {
    case "active":
      return "success";
    case "planning":
      return "info";
    case "cancelled":
      return "danger";
    case "completed":
    default:
      return "neutral";
  }
}

export function formatWebProjectStartDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function toProjectsScreenItem(
  project: WebCompanyProjectRow,
  opts?: { canEdit?: boolean },
): ProjectsScreenProjectItem {
  const statusValue = normalizeProjectStatus(project.status);
  const members = project.memberCount ?? 0;
  const tasks = project.taskCount ?? 0;
  return {
    id: `projects:${project.id}`,
    projectId: project.id,
    title: project.name,
    description: project.description || "No description",
    statusValue,
    statusLabel: webProjectStatusLabel(project.status),
    statusTone: webProjectStatusTone(project.status),
    locationLabel: project.location || "No location",
    memberCountLabel: `${members} ${members === 1 ? "member" : "members"}`,
    taskCountLabel: `${tasks} ${tasks === 1 ? "task" : "tasks"}`,
    clientName: project.clientName || "—",
    startDateLabel: formatWebProjectStartDate(project.startDate),
    createdByLabel: project.createdByName || "Unknown",
    leadPmName: project.leadPmName ?? undefined,
    budgetLabel:
      project.budget != null && Number.isFinite(project.budget)
        ? `Budget: $${project.budget.toLocaleString()}`
        : undefined,
    canEdit: Boolean(opts?.canEdit),
    density: "compact",
    structuralState: "stale",
  };
}

export function filterWebProjects(
  projects: WebCompanyProjectRow[],
  searchQuery: string,
  statusFilter: WebProjectsStatusFilter,
): WebCompanyProjectRow[] {
  const q = searchQuery.trim().toLowerCase();
  return projects.filter((project) => {
    if (statusFilter !== "all" && normalizeProjectStatus(project.status) !== statusFilter) {
      return false;
    }
    if (!q) return true;
    const hay = [
      project.name,
      project.description,
      project.location,
      project.clientName,
      project.status,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return hay.includes(q);
  });
}
