import { useCallback, useMemo, useState } from "react";
import { Alert } from "react-native";

import { useAuthStore } from "@/state/authStore";
import { useProjectFilterStore } from "@/state/projectFilterStore";
import { useProjectStoreWithInit } from "@/state/projectStore.supabase";
import { useTaskStore } from "@/state/taskStore.supabase";
import { useUserStore } from "@/state/userStore.supabase";
import type { ProjectPickerScreenViewAdapterOutput } from "@/ui/contracts/viewAdapters";
import { formatProjectStatusLabel } from "@/ui/contracts/projectStatus";

export interface ProjectPickerViewAdapterProps {
  allowBack?: boolean;
  onNavigateBack: () => void;
}

export interface ProjectPickerViewAdapterHookResult {
  output: ProjectPickerScreenViewAdapterOutput;
  actions: {
    handleSelectProject: (projectId: string) => Promise<void>;
  };
}

export function useProjectPickerViewAdapter(
  props: ProjectPickerViewAdapterProps,
): ProjectPickerViewAdapterHookResult {
  const { allowBack = true, onNavigateBack } = props;
  const { user } = useAuthStore();
  const projectStore = useProjectStoreWithInit();
  const taskStore = useTaskStore();
  const userStore = useUserStore();
  const projectFilterStore = useProjectFilterStore();
  const [isProjectSwitching, setIsProjectSwitching] = useState(false);

  const userProjects = user ? projectStore.getProjectsByUser(user.id) : [];
  const isInitialLoading = Boolean(projectStore.isLoading) && userProjects.length === 0;
  const isBackgroundRefreshing = Boolean(projectStore.isLoading) && userProjects.length > 0;
  const structuralState = userProjects.length === 0 ? "empty" : "stale";

  const handleSelectProject = useCallback(
    async (projectId: string) => {
      if (!user || isProjectSwitching) {
        return;
      }

      setIsProjectSwitching(true);

      try {
        // Always refresh — even when re-tapping the already-selected project.
        // Otherwise Create Task Assign To stays empty after clearState login when
        // the default project is already correct (users never fetched).
        await projectFilterStore.setSelectedProject(projectId, user.id);
        await Promise.all([
          taskStore.fetchTasks(),
          projectStore.fetchProjects(),
          projectStore.fetchUserProjectAssignments(user.id),
          projectStore.fetchProjectUserAssignments(projectId, true),
          userStore.fetchUsers(),
        ]);
        onNavigateBack();
      } catch (error) {
        console.error("Error refreshing data after project switch:", error);
        Alert.alert("Error", "Failed to refresh data. Please try again.");
      } finally {
        setIsProjectSwitching(false);
      }
    },
    [
      isProjectSwitching,
      onNavigateBack,
      projectFilterStore,
      projectStore,
      taskStore,
      user,
      userStore,
    ],
  );

  const output = useMemo<ProjectPickerScreenViewAdapterOutput>(() => {
    return {
      screenId: "ProjectPickerScreen",
      readiness: {
        hasInitialFrame: true,
        hasUsableData: !isInitialLoading,
        isBackgroundRefreshing,
        isNavigationTransitionActive: false,
      },
      continuity: {
        isInitialLoading,
        isBackgroundRefreshing,
        hasCachedFrame: userProjects.length > 0,
        shouldRenderSkeletonShell: false,
        shouldRenderEmptyState: !isInitialLoading && userProjects.length === 0,
        freshnessLabel: isBackgroundRefreshing
          ? "Refreshing"
          : isInitialLoading
            ? "Loading"
            : "Ready",
      },
      projectItems: userProjects.map((project) => ({
        id: `project-picker:${project.id}`,
        projectId: project.id,
        title: project.name,
        description: project.description,
        statusLabel: formatProjectStatusLabel(project.status),
        isSelected: projectFilterStore.selectedProjectId === project.id,
        density: "standard",
        structuralState,
      })),
      selectedProjectId: projectFilterStore.selectedProjectId ?? null,
      isProjectSwitching,
      allowBack,
    };
  }, [
    allowBack,
    isBackgroundRefreshing,
    isInitialLoading,
    isProjectSwitching,
    projectFilterStore.selectedProjectId,
    structuralState,
    userProjects,
  ]);

  return {
    output,
    actions: {
      handleSelectProject,
    },
  };
}
