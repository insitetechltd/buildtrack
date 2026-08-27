import { useMemo } from "react";
import { useAuthStore } from "@/state/authStore";
import { useProjectStoreWithInit } from "@/state/projectStore.supabase";
import { useProjectFilterStore } from "@/state/projectFilterStore";
import { useTaskStore } from "@/state/taskStore.supabase";
import { useUnattachedPhotoBatchStore } from "@/state/unattachedPhotoBatchStore";
import { useActivityFeedReadStore } from "@/state/activityFeedReadStore";
import { resolveWorkspaceProjectId } from "@/ui/contracts/workspaceProject";
import {
  buildActivityFeedRows,
  countUnreadActivityFeedRows,
  formatActivityTabBadgeCount,
} from "@/ui/contracts/activityFeed";
import {
  filterTasksForViewer,
  isProjectScopeReady,
  resolveTaskSelectRoleBand,
} from "@/ui/contracts/taskVisibilityPermissions";

export function useActivityTabBadgeCount(): number | string | undefined {
  const user = useAuthStore((state) => state.user);
  const selectedProjectId = useProjectFilterStore((state) => state.selectedProjectId);
  const projectStore = useProjectStoreWithInit();
  const tasksById = useTaskStore((state) => state.tasksById);
  const getBatchesForProject = useUnattachedPhotoBatchStore(
    (state) => state.getBatchesForProject,
  );
  const getLastSeenAt = useActivityFeedReadStore((state) => state.getLastSeenAt);

  const currentUserId = user?.id ?? "";
  const projects = user ? projectStore.getProjectsByUser(user.id) : [];
  const resolvedProjectId = resolveWorkspaceProjectId(
    selectedProjectId,
    projects.map((project) => project.id),
  );

  const viewerProjectIds = user ? projectStore.projectIdsByUser?.[user.id] ?? [] : [];
  const projectsById = useMemo(() => {
    const byId: Record<string, { id: string; companyId?: string | null }> = {};
    for (const project of projectStore.projects ?? []) {
      byId[project.id] = { id: project.id, companyId: project.companyId };
    }
    return byId;
  }, [projectStore.projects]);

  const projectScopeReady = useMemo(
    () =>
      isProjectScopeReady({
        projectCount: projectStore.projects?.length ?? 0,
        hasFetchedProjectsOnce: Boolean(
          projectStore.projectQueryMeta?.["projects:all"]?.hasFetchedOnce,
        ),
      }),
    [projectStore.projectQueryMeta, projectStore.projects],
  );

  const awaitingProjectScope = useMemo(() => {
    if (!user) {
      return false;
    }
    const band = resolveTaskSelectRoleBand(user);
    return (band === "admin" || band === "manager") && !projectScopeReady;
  }, [projectScopeReady, user]);

  const tasks = useMemo(
    () =>
      filterTasksForViewer({
        viewer: user,
        tasks: Object.values(tasksById ?? {}),
        projectsById,
        viewerProjectIds,
      }),
    [projectsById, tasksById, user, viewerProjectIds],
  );

  const feedRows = useMemo(() => {
    if (!resolvedProjectId || awaitingProjectScope) {
      return [];
    }

    return buildActivityFeedRows({
      projectId: resolvedProjectId,
      tasks,
      photoBatches: getBatchesForProject(resolvedProjectId),
    });
  }, [awaitingProjectScope, getBatchesForProject, resolvedProjectId, tasks]);

  const lastSeenAtMs =
    currentUserId && resolvedProjectId
      ? getLastSeenAt(currentUserId, resolvedProjectId)
      : null;

  const unreadCount = useMemo(
    () => countUnreadActivityFeedRows(feedRows, lastSeenAtMs),
    [feedRows, lastSeenAtMs],
  );

  if (!user || !resolvedProjectId || awaitingProjectScope) {
    return undefined;
  }

  return formatActivityTabBadgeCount(unreadCount);
}
