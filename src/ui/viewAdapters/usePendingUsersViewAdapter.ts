import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert } from "react-native";

import { useAuthStore } from "@/state/authStore";
import { useUserStore } from "@/state/userStore.supabase";
import type { User } from "@/types/buildtrack";
import type { PendingUsersScreenViewAdapterOutput } from "@/ui/contracts/viewAdapters";
import { useTranslation } from "@/utils/useTranslation";

export interface PendingUsersViewAdapterProps {
  onNavigateBack: () => void;
}

export interface PendingUsersViewAdapterHookResult {
  output: PendingUsersScreenViewAdapterOutput;
  actions: {
    handleRefresh: () => Promise<void>;
    requestApproveUser: (userId: string) => void;
    requestRejectUser: (userId: string) => void;
  };
}

export function usePendingUsersViewAdapter(
  _props: PendingUsersViewAdapterProps,
): PendingUsersViewAdapterHookResult {
  const t = useTranslation();
  const { user: currentUser } = useAuthStore();
  const {
    getPendingUsersByCompany,
    approveUser,
    rejectUser,
    fetchUsersByCompany,
    isLoading,
  } = useUserStore();

  const [pendingUsers, setPendingUsers] = useState<User[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  const loadPendingUsers = useCallback(async () => {
    const companyId = currentUser?.companyId;

    if (!companyId) {
      setPendingUsers([]);
      setHasLoadedOnce(true);
      return;
    }

    await fetchUsersByCompany(companyId);
    setPendingUsers(getPendingUsersByCompany(companyId));
    setHasLoadedOnce(true);
  }, [currentUser?.companyId, fetchUsersByCompany, getPendingUsersByCompany]);

  useEffect(() => {
    void loadPendingUsers();
  }, [loadPendingUsers]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);

    try {
      await loadPendingUsers();
    } finally {
      setIsRefreshing(false);
    }
  }, [loadPendingUsers]);

  const confirmApproveUser = useCallback(
    async (pendingUser: User) => {
      if (!currentUser?.id) {
        return;
      }

      const didApprove = await approveUser(pendingUser.id, currentUser.id);

      if (didApprove) {
        Alert.alert(
          t.errors.success,
          t.userManagement.approveSuccess.replace("{name}", pendingUser.name),
        );
        await loadPendingUsers();
        return;
      }

      Alert.alert(t.errors.error, t.userManagement.approveFailed);
    },
    [approveUser, currentUser?.id, loadPendingUsers, t.errors.error, t.errors.success, t.userManagement],
  );

  const confirmRejectUser = useCallback(
    async (pendingUser: User) => {
      const didReject = await rejectUser(pendingUser.id);

      if (didReject) {
        Alert.alert(
          t.userManagement.reject,
          t.userManagement.rejectSuccess.replace("{name}", pendingUser.name),
        );
        await loadPendingUsers();
        return;
      }

      Alert.alert(t.errors.error, t.userManagement.rejectFailed);
    },
    [loadPendingUsers, rejectUser, t.errors.error, t.userManagement],
  );

  const requestApproveUser = useCallback(
    (userId: string) => {
      const pendingUser = pendingUsers.find((candidate) => candidate.id === userId);

      if (!pendingUser) {
        return;
      }

      Alert.alert(
        t.userManagement.approveUser,
        t.userManagement.approveMessage.replace("{name}", pendingUser.name),
        [
          { text: t.common.cancel, style: "cancel" },
          {
            text: t.userManagement.approve,
            onPress: () => {
              void confirmApproveUser(pendingUser);
            },
          },
        ],
      );
    },
    [confirmApproveUser, pendingUsers, t.common.cancel, t.userManagement],
  );

  const requestRejectUser = useCallback(
    (userId: string) => {
      const pendingUser = pendingUsers.find((candidate) => candidate.id === userId);

      if (!pendingUser) {
        return;
      }

      Alert.alert(
        t.userManagement.rejectUser,
        t.userManagement.rejectMessage.replace("{name}", pendingUser.name),
        [
          { text: t.common.cancel, style: "cancel" },
          {
            text: t.userManagement.reject,
            style: "destructive",
            onPress: () => {
              void confirmRejectUser(pendingUser);
            },
          },
        ],
      );
    },
    [confirmRejectUser, pendingUsers, t.common.cancel, t.userManagement],
  );

  const output = useMemo<PendingUsersScreenViewAdapterOutput>(() => {
    const pendingUserCards = pendingUsers.map((pendingUser) => ({
      id: `pending-user-card:${pendingUser.id}`,
      userId: pendingUser.id,
      name: pendingUser.name,
      positionLabel: pendingUser.position,
      email: pendingUser.email,
      phone: pendingUser.phone,
      statusLabel: t.userManagement.pending,
      approveActionLabel: t.userManagement.approve,
      rejectActionLabel: t.userManagement.reject,
      density: "standard" as const,
      structuralState: "stale" as const,
    }));
    const isInitialLoading = isLoading && !hasLoadedOnce;

    return {
      screenId: "PendingUsersScreen",
      readiness: {
        hasInitialFrame: true,
        hasUsableData: Boolean(currentUser),
        isBackgroundRefreshing: isRefreshing || (isLoading && hasLoadedOnce),
        isNavigationTransitionActive: false,
      },
      continuity: {
        isInitialLoading,
        isBackgroundRefreshing: isRefreshing || (isLoading && hasLoadedOnce),
        hasCachedFrame: Boolean(currentUser),
        shouldRenderSkeletonShell: false,
        shouldRenderEmptyState: !isInitialLoading && pendingUserCards.length === 0,
        freshnessLabel: isRefreshing ? "Refreshing" : isInitialLoading ? "Loading" : "Ready",
      },
      title: t.userManagement.pendingApprovals,
      subtitle: `${pendingUserCards.length} ${
        pendingUserCards.length === 1
          ? t.userManagement.userWaiting
          : t.userManagement.usersWaiting
      }`,
      pendingUserCards,
      refreshState: {
        isRefreshing,
      },
      emptyState: {
        title: t.userManagement.noPendingApprovals,
        message: t.userManagement.allRequestsProcessed,
      },
    };
  }, [
    currentUser,
    hasLoadedOnce,
    isLoading,
    isRefreshing,
    pendingUsers,
    t.userManagement.allRequestsProcessed,
    t.userManagement.approve,
    t.userManagement.noPendingApprovals,
    t.userManagement.pending,
    t.userManagement.pendingApprovals,
    t.userManagement.reject,
    t.userManagement.userWaiting,
    t.userManagement.usersWaiting,
  ]);

  return {
    output,
    actions: {
      handleRefresh,
      requestApproveUser,
      requestRejectUser,
    },
  };
}
