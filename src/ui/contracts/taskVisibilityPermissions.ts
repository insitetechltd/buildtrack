/**
 * App-side task visibility for RC UX.
 *
 * Rules:
 * - worker / member / foreman: assigned_to contains me OR assigned_by is me
 * - supervisor / manager: tasks on projects I am assigned to
 * - admin / company_admin: tasks on my company projects
 *
 * This keeps worker-facing lists focused without changing backend policy.
 */

export type TaskVisibilityViewer = {
  id: string;
  role?: string | null;
  systemPermission?: string | null;
  companyId?: string | null;
};

export type TaskVisibilityTask = {
  id?: string;
  projectId?: string | null;
  assignedBy?: string | null;
  assignedTo?: Array<string | number> | null;
};

export type TaskVisibilityProject = {
  id: string;
  companyId?: string | null;
};

/** Collapse role / systemPermission into the three visibility bands above. */
export function resolveTaskSelectRoleBand(
  viewer: Pick<TaskVisibilityViewer, "role" | "systemPermission">,
): "admin" | "manager" | "worker" {
  const candidates = [viewer.systemPermission, viewer.role]
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .map((value) => value.trim().toLowerCase());

  if (candidates.some((role) => role === "admin" || role === "company_admin")) {
    return "admin";
  }
  if (candidates.some((role) => role === "manager" || role === "supervisor")) {
    return "manager";
  }
  return "worker";
}

export function canViewerSelectTask(args: {
  viewer: TaskVisibilityViewer | null | undefined;
  task: TaskVisibilityTask;
  project?: TaskVisibilityProject | null;
  viewerProjectIds?: ReadonlyArray<string> | null;
}): boolean {
  const viewer = args.viewer;
  const viewerId = viewer?.id == null ? "" : String(viewer.id).trim();
  if (!viewerId) {
    return false;
  }

  const band = resolveTaskSelectRoleBand(viewer);

  if (band === "admin") {
    const viewerCompanyId = viewer.companyId == null ? "" : String(viewer.companyId).trim();
    const projectCompanyId =
      args.project?.companyId == null ? "" : String(args.project.companyId).trim();
    return Boolean(viewerCompanyId && projectCompanyId && viewerCompanyId === projectCompanyId);
  }

  if (band === "manager") {
    const projectId = args.task.projectId == null ? "" : String(args.task.projectId).trim();
    if (!projectId) {
      return false;
    }
    return (args.viewerProjectIds ?? []).map(String).includes(projectId);
  }

  if (args.task.assignedBy != null && String(args.task.assignedBy) === viewerId) {
    return true;
  }

  return (args.task.assignedTo ?? []).map(String).includes(viewerId);
}

export function filterTasksForViewer<T extends TaskVisibilityTask>(args: {
  viewer: TaskVisibilityViewer | null | undefined;
  tasks: ReadonlyArray<T>;
  projectsById?: Readonly<Record<string, TaskVisibilityProject | undefined>>;
  viewerProjectIds?: ReadonlyArray<string> | null;
}): T[] {
  return args.tasks.filter((task) =>
    canViewerSelectTask({
      viewer: args.viewer,
      task,
      project: task.projectId ? args.projectsById?.[String(task.projectId)] : null,
      viewerProjectIds: args.viewerProjectIds,
    }),
  );
}
