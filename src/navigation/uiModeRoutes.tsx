import React from "react";
import DashboardScreen from "@/screens/DashboardScreen";
import TasksScreen from "@/screens/TasksScreen";
import type { CreateTaskParams, TasksListParams } from "@/navigation/navigationTypes";

interface DashboardRouteProps {
  onNavigateToTasks: (params?: TasksListParams) => void;
  onNavigateToCreateTask: (params?: CreateTaskParams) => void;
  onNavigateToProfile: () => void;
  onNavigateToDeveloperSettings?: () => void;
  onNavigateToTaskDetail?: (taskId: string, subTaskId?: string) => void;
  onNavigateToProjectPicker?: (allowBack?: boolean) => void;
}

interface TasksRouteProps {
  onNavigateToTaskDetail: (taskId: string, subTaskId?: string) => void;
  onNavigateToCreateTask: (params?: CreateTaskParams) => void;
  onNavigateToUpdateProgress?: (taskId: string) => void;
  onNavigateBack?: () => void;
  onNavigateToProfile?: () => void;
  onNavigateToProjectPicker?: (allowBack?: boolean) => void;
  onNavigateToDeveloperSettings?: () => void;
}

/** Always modern Dashboard / Tasks — legacy dual-path removed (S-UX-01Q C4). */
export function DashboardRoute(props: DashboardRouteProps) {
  return <DashboardScreen {...props} />;
}

export function TasksRoute(props: TasksRouteProps) {
  return <TasksScreen {...props} />;
}
