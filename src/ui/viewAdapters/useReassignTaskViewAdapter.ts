import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigation, useRoute } from "@react-navigation/native";

import { useAuthStore } from "@/state/authStore";
import { useProjectStoreWithCompanyInit } from "@/state/projectStore.supabase";
import { useTaskStore } from "@/state/taskStore.supabase";
import { useUserPreferencesStore } from "@/state/userPreferencesStore";
import { useUserStore } from "@/state/userStore.supabase";
import type { User } from "@/types/buildtrack";
import { userAccountIsDeleted } from "@/types/userAccountRetention";
import type { ReassignTaskScreenViewAdapterOutput } from "@/ui/contracts/viewAdapters";

export interface ReassignTaskScreenParams {
  taskId: string;
  onReassign?: (selectedUserIds: string[]) => Promise<void> | void;
}

export interface ReassignTaskScreenProps {
  onNavigateToProfile?: () => void;
  onNavigateToProjectPicker?: (allowBack?: boolean) => void;
}

export interface ReassignTaskViewAdapterHookResult {
  output: ReassignTaskScreenViewAdapterOutput;
  actions: {
    setSearchQuery: (value: string) => void;
    toggleUserSelection: (userId: string) => void;
    toggleFavoriteUser: (userId: string) => void;
    handleReassign: () => Promise<void>;
  };
}

export function useReassignTaskViewAdapter(): ReassignTaskViewAdapterHookResult {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const { taskId, onReassign } = (route.params || {}) as ReassignTaskScreenParams;
  const { user } = useAuthStore();
  const tasks = useTaskStore((state) => state.tasks);
  const { getUserById } = useUserStore();
  const projectStore = useProjectStoreWithCompanyInit(user?.companyId || "");
  const { getProjectUserAssignments } = projectStore;
  const {
    isFavoriteUser,
    toggleFavoriteUser: toggleFavoriteUserPreference,
  } = useUserPreferencesStore();
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const task = tasks.find((item) => item.id === taskId);

  useEffect(() => {
    setSelectedUserIds([]);
    setSearchQuery("");
  }, [taskId]);

  const projectUsers = useMemo(() => {
    if (!task?.projectId) {
      return [];
    }

    return getProjectUserAssignments(task.projectId)
      .filter((assignment) => assignment.isActive)
      .map((assignment) => getUserById(assignment.userId))
      .filter((projectUser): projectUser is User =>
        Boolean(projectUser) && !userAccountIsDeleted(projectUser),
      );
  }, [getProjectUserAssignments, getUserById, task?.projectId]);

  const filteredUsers = useMemo(() => {
    const normalizedSearchQuery = searchQuery.trim().toLowerCase();

    const searchableUsers =
      normalizedSearchQuery.length === 0
        ? projectUsers
        : projectUsers.filter((projectUser) => {
            const normalizedName = projectUser.name.toLowerCase();
            const normalizedEmail = projectUser.email?.toLowerCase() ?? "";

            return (
              normalizedName.includes(normalizedSearchQuery) ||
              normalizedEmail.includes(normalizedSearchQuery)
            );
          });

    if (!user?.id) {
      return searchableUsers;
    }

    return [...searchableUsers].sort((userA, userB) => {
      const userAIsFavorite = isFavoriteUser(user.id, userA.id);
      const userBIsFavorite = isFavoriteUser(user.id, userB.id);

      if (userAIsFavorite === userBIsFavorite) {
        return userA.name.localeCompare(userB.name);
      }

      return userAIsFavorite ? -1 : 1;
    });
  }, [isFavoriteUser, projectUsers, searchQuery, user?.id]);

  const toggleUserSelection = useCallback((userId: string) => {
    setSelectedUserIds((currentSelectedUserIds) => {
      if (currentSelectedUserIds.includes(userId)) {
        return currentSelectedUserIds.filter((currentUserId) => currentUserId !== userId);
      }

      return [...currentSelectedUserIds, userId];
    });
  }, []);

  const toggleFavoriteUser = useCallback(
    (userId: string) => {
      if (!user?.id) {
        return;
      }

      toggleFavoriteUserPreference(user.id, userId);
    },
    [toggleFavoriteUserPreference, user?.id],
  );

  const handleReassign = useCallback(async () => {
    if (selectedUserIds.length === 0) {
      return;
    }

    if (onReassign) {
      await onReassign(selectedUserIds);
    }

    navigation.goBack();
  }, [navigation, onReassign, selectedUserIds]);

  const output = useMemo<ReassignTaskScreenViewAdapterOutput>(
    () => ({
      screenId: "ReassignTaskScreen",
      readiness: {
        hasInitialFrame: true,
        hasUsableData: Boolean(task),
        isBackgroundRefreshing: false,
        isNavigationTransitionActive: false,
      },
      continuity: {
        isInitialLoading: false,
        isBackgroundRefreshing: false,
        hasCachedFrame: Boolean(task),
        shouldRenderSkeletonShell: false,
        shouldRenderEmptyState: !task,
        freshnessLabel: task ? "Ready" : "Unavailable",
      },
      searchQuery,
      selectedUserIds,
      assigneeItems: filteredUsers.map((projectUser) => ({
        id: `reassign-user:${projectUser.id}`,
        userId: projectUser.id,
        name: projectUser.name,
        roleLabel: projectUser.role,
        email: projectUser.email,
        isSelected: selectedUserIds.includes(projectUser.id),
        isFavorite: user?.id ? isFavoriteUser(user.id, projectUser.id) : false,
        density: "standard",
        structuralState: "stale",
      })),
    }),
    [filteredUsers, isFavoriteUser, searchQuery, selectedUserIds, task, user?.id],
  );

  return {
    output,
    actions: {
      setSearchQuery,
      toggleUserSelection,
      toggleFavoriteUser,
      handleReassign,
    },
  };
}
