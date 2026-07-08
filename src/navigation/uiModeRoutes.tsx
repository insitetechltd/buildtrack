import React from "react";
import DashboardScreen from "@/screens/DashboardScreen";
import TasksScreen from "@/screens/TasksScreen";
import LegacyDashboardScreen from "@/screens/legacy/LegacyDashboardScreen";
import LegacyTasksScreen from "@/screens/legacy/LegacyTasksScreen";
import type { TasksListParams } from "@/navigation/navigationTypes";
import { useDevToggleStore } from "@/state/devToggleStore";

interface DashboardRouteProps {
  onNavigateToTasks: (params?: TasksListParams) => void;
  onNavigateToCreateTask: () => void;
  onNavigateToProfile: () => void;
  onNavigateToDeveloperSettings?: () => void;
  onNavigateToTaskDetail?: (taskId: string, subTaskId?: string) => void;
  onNavigateToProjectPicker?: (allowBack?: boolean) => void;
}

interface TasksRouteProps {
  onNavigateToTaskDetail: (taskId: string, subTaskId?: string) => void;
  onNavigateToCreateTask: () => void;
  onNavigateBack?: () => void;
  onNavigateToProfile?: () => void;
  onNavigateToProjectPicker?: (allowBack?: boolean) => void;
  onNavigateToDeveloperSettings?: () => void;
}

export function DashboardRoute(props: DashboardRouteProps) {
  const uiModernizationMode = useDevToggleStore((state) => state.uiModernizationMode);

  if (uiModernizationMode === "legacy") {
    return <LegacyDashboardScreen {...props} />;
  }

  return <DashboardScreen {...props} />;
}

export function TasksRoute(props: TasksRouteProps) {
  const uiModernizationMode = useDevToggleStore((state) => state.uiModernizationMode);

  if (uiModernizationMode === "legacy") {
    return <LegacyTasksScreen {...props} />;
  }

  return <TasksScreen {...props} />;
}
