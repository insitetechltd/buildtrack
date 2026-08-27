/**
 * App-side task visibility for RC UX.
 *
 * Rules:
 * - worker / member / foreman: assigned_to contains me OR assigned_by is me
 * - supervisor / manager / admin (field lists): tasks on projects I am assigned to
 * - Company KPI / all-company health stays on management (avatar → Admin Dashboard)
 *
 * Admin field lists must NOT dump every company task — same membership wall as PM.
 * Multi-company later: viewerProjectIds includes host + guest assignments on that job.
 *
 * Callers that need project/assignment maps must hold loading (not fail-open,
 * not claim empty) until `isProjectScopeReady` is true for admin/manager bands.
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

  if (band === "admin" || band === "manager") {
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

/**
 * True once projects (or an empty fetch) are known — not mid-rehydrate.
 * Admin/manager UIs must hold loading until this is true (never fail-open).
 */
export function isProjectScopeReady(args: {
  projectCount: number;
  hasFetchedProjectsOnce?: boolean;
}): boolean {
  return args.projectCount > 0 || args.hasFetchedProjectsOnce === true;
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
