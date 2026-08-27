import { useCallback, useMemo, useState } from "react";
import { Alert } from "react-native";
import * as Clipboard from "expo-clipboard";

import {
  copyCompanyInviteLink,
  inviteCompanyUser,
  type InviteSeatType,
} from "@/api/inviteUser";
import { fetchCompanyEntitlementView } from "@/api/fetchCompanyEntitlements";
import { fetchSellablePlanCatalog } from "@/api/fetchSellablePlanCatalog";
import { updateCompanyAddons } from "@/api/updateCompanyAddons";
import {
  countCompanySeatUsage,
  formatSeatUsageSummary,
  seatLimitReached,
  type SeatUsageLimits,
} from "@/billing/seatUsage";
import {
  readSeatLimitsFromEntitlement,
  waitForSeatLimitIncrease,
} from "@/billing/waitForSeatLimitIncrease";
import {
  addonExtraQtyFromTotals,
} from "@/billing/serverAddonBaseline";
import { findAddonTier, findBaseTier, resolveAddonPriceLabels } from "@/billing/planCatalog";
import { useAuthStore } from "@/state/authStore";
import { useCompanyStore } from "@/state/companyStore";
import {
  useProjectStore,
  useProjectStoreWithCompanyInit,
} from "@/state/projectStore.supabase";
import { useUserStoreWithInit } from "@/state/userStore.supabase";
import {
  getProjectRole,
  getUserSystemPermission,
  isAdmin,
  type Project,
  type User,
} from "@/types/buildtrack";
import {
  getProjectRoleLabel,
  upsertProjectMembership,
} from "@/ui/contracts/projectMembership";
import type {
  UserManagementInviteFormModel,
  UserManagementInviteResultModel,
  UserManagementScreenViewAdapterOutput,
  UserManagementSelectedUserSummary,
} from "@/ui/contracts/viewAdapters";
import { notifyDataMutation } from "@/utils/DataRefreshManager";
import { useTranslation } from "@/utils/useTranslation";
import { userAccountIsDeleted } from "@/types/userAccountRetention";

/** Staff roster ACL on User Management: CA vs Member (staff). */
function getStaffPageLabel(user: User): string {
  return isAdmin(user) ? "CA" : "Member";
}

/** Company seat shown on the project-assignments line: CA | PM | Worker. */
function getCompanySeatLabel(user: User): string {
  const permission = getUserSystemPermission(user);
  if (permission === "admin") {
    return "CA";
  }
  if (permission === "manager") {
    return "PM";
  }
  return "Worker";
}

function getSelectedUserSummary(user: User | null): UserManagementSelectedUserSummary | null {
  if (!user) {
    return null;
  }

  return {
    userId: user.id,
    name: user.name,
    email: user.email,
    roleLabel: getStaffPageLabel(user),
  };
}

export function canShowCopyInviteLinkForUser(
  companyUser: Pick<
    User,
    "id" | "email" | "isPending" | "mustSetPassword" | "must_set_password"
  >,
  currentUserId?: string,
): boolean {
  const needsPassword =
    companyUser.mustSetPassword === true ||
    companyUser.must_set_password === true;

  return Boolean(
    companyUser.email &&
      companyUser.id !== currentUserId &&
      !companyUser.isPending &&
      needsPassword,
  );
}

export interface UserManagementViewAdapterProps {
  onNavigateBack: () => void;
  onNavigateToCompanyPlan?: () => void;
}

export interface UserManagementViewAdapterHookResult {
  output: UserManagementScreenViewAdapterOutput;
  actions: {
    setSearchQuery: (value: string) => void;
    handleRefresh: () => Promise<void>;
    openInviteModal: () => void;
    setInviteName: (value: string) => void;
    setInviteEmail: (value: string) => void;
    setInviteSeatType: (value: InviteSeatType) => void;
    submitInvite: () => Promise<void>;
    closeActiveModal: () => void;
    closeAssignmentFlow: () => void;
    openProjectPicker: () => void;
    returnToAssignmentModal: () => void;
    toggleProfileMenu: () => void;
    confirmLogout: () => void;
    requestAssignUser: (userId: string) => void;
    requestApproveUser: (userId: string) => void;
    requestRejectUser: (userId: string) => void;
    requestRemoveAssignment: (userId: string, projectId: string) => void;
    selectProject: (projectId: string) => void;
    saveAssignment: () => Promise<void>;
    confirmApproveUser: () => Promise<void>;
    confirmRejectUser: () => Promise<void>;
    confirmRemoveAssignment: () => Promise<void>;
    copyInviteLink: (userId: string) => Promise<void>;
    requestDeactivateUser: (userId: string) => void;
  };
}

export function useUserManagementViewAdapter(
  props: UserManagementViewAdapterProps,
): UserManagementViewAdapterHookResult {
  const { onNavigateToCompanyPlan } = props;
  const t = useTranslation();
  const { user: currentUser, logout } = useAuthStore();
  const currentCompanyId = currentUser?.companyId ?? "";
  const projectStore = useProjectStoreWithCompanyInit(currentCompanyId);
  const userStore = useUserStoreWithInit();
  const { getCompanyById } = useCompanyStore();
  const {
    getProjectsByCompany,
    assignUserToProject,
    fetchProjectUserAssignments,
    fetchProjectsByCompany,
    removeUserFromProject,
    getUserProjectAssignments,
    getProjectUserAssignments,
    updateUserProjectCategory,
  } = projectStore;
  const {
    getUsersByCompany,
    getAdminCountByCompany,
    fetchUsers,
    approveUser,
    rejectUser,
    deactivateUserSeat,
  } = userStore;

  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [activeModal, setActiveModal] =
    useState<UserManagementScreenViewAdapterOutput["activeModal"]>(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [pendingRemoval, setPendingRemoval] =
    useState<UserManagementScreenViewAdapterOutput["pendingRemoval"]>(null);
  const [pendingApprovalUser, setPendingApprovalUser] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isProfileMenuVisible, setIsProfileMenuVisible] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteSeatType, setInviteSeatType] = useState<InviteSeatType>("worker");
  const [inviteSubmitting, setInviteSubmitting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteResult, setInviteResult] =
    useState<UserManagementInviteResultModel | null>(null);
  const [copyingInviteUserId, setCopyingInviteUserId] = useState<string | null>(
    null,
  );
  const [seatUsageLabel, setSeatUsageLabel] = useState<string | null>(null);

  const companyUsers = useMemo(
    () => (currentCompanyId ? getUsersByCompany(currentCompanyId) : []),
    [currentCompanyId, getUsersByCompany],
  );
  const projects = useMemo(
    () => (currentCompanyId ? getProjectsByCompany(currentCompanyId) : []),
    [currentCompanyId, getProjectsByCompany],
  );
  const currentCompany = useMemo(
    () => (currentCompanyId ? getCompanyById(currentCompanyId) : null),
    [currentCompanyId, getCompanyById],
  );
  const filteredUsers = useMemo(() => {
    const activeRoster = companyUsers.filter(
      (companyUser) => companyUser.isActive !== false && !userAccountIsDeleted(companyUser),
    );
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const matched = !normalizedQuery
      ? activeRoster
      : activeRoster.filter(
          (companyUser) =>
            companyUser.name.toLowerCase().includes(normalizedQuery) ||
            companyUser.email?.toLowerCase().includes(normalizedQuery) ||
            companyUser.phone?.toLowerCase().includes(normalizedQuery),
        );

    const selfId = currentUser?.id;
    if (!selfId) {
      return matched;
    }

    return [...matched].sort((left, right) => {
      if (left.id === selfId) return -1;
      if (right.id === selfId) return 1;
      return 0;
    });
  }, [companyUsers, currentUser?.id, searchQuery]);

  const resetAssignmentFlow = useCallback(() => {
    setSelectedUser(null);
    setSelectedProject(null);
  }, []);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);

    try {
      await Promise.all([
        fetchUsers(),
        currentCompanyId ? fetchProjectsByCompany(currentCompanyId, true) : Promise.resolve(),
      ]);

      if (currentCompanyId) {
        const currentProjects = useProjectStore.getState().getProjectsByCompany(currentCompanyId);

        await Promise.all(
          currentProjects.map((project) => fetchProjectUserAssignments(project.id, true)),
        );
      }
    } catch (error) {
      console.error("UserManagementScreen: Error refreshing users", error);
    } finally {
      setIsRefreshing(false);
    }
  }, [currentCompanyId, fetchProjectUserAssignments, fetchProjectsByCompany, fetchUsers]);

  const closeActiveModal = useCallback(() => {
    setActiveModal(null);
    setPendingApprovalUser(null);
    setPendingRemoval(null);
    setSuccessMessage("");
    setInviteError(null);
    setInviteResult(null);
    setInviteName("");
    setInviteEmail("");
    setInviteSeatType("worker");
    setInviteSubmitting(false);
  }, []);

  const refreshSeatUsage = useCallback(async (): Promise<{
    usage: ReturnType<typeof countCompanySeatUsage>;
    limits: SeatUsageLimits | null;
  }> => {
    await fetchUsers();
    const roster = currentCompanyId ? getUsersByCompany(currentCompanyId) : [];
    const usage = countCompanySeatUsage(roster);
    const entitlement = currentCompanyId
      ? await fetchCompanyEntitlementView(currentCompanyId)
      : null;
    const limits = readSeatLimitsFromEntitlement(entitlement);
    setSeatUsageLabel(limits ? formatSeatUsageSummary(usage, limits) : null);
    return { usage, limits };
  }, [currentCompanyId, fetchUsers, getUsersByCompany]);

  const offerSeatUpsell = useCallback(
    (seatType: InviteSeatType, detailMessage: string) => {
      void (async () => {
        if (!currentCompanyId) {
          return;
        }

        const catalog = await fetchSellablePlanCatalog().catch(() => null);
        const priceLabels = resolveAddonPriceLabels(catalog);
        const addonPrice =
          seatType === "pm"
            ? priceLabels.addon_pm_seat
            : priceLabels.addon_worker_pack;
        const addNoun = seatType === "pm" ? "1 PM" : "1 Worker";
        const addLabel = addonPrice
          ? `Add ${addNoun} · ${addonPrice}`
          : `Add ${addNoun}`;
        const priceLine = addonPrice
          ? `\n\n${seatType === "pm" ? "PM" : "Worker"}: ${addonPrice} / month`
          : "";

        Alert.alert("Seat limit reached", `${detailMessage}${priceLine}`, [
          { text: "Not now", style: "cancel" },
          {
            text: "Company Plan",
            onPress: () => {
              setActiveModal(null);
              onNavigateToCompanyPlan?.();
            },
          },
          {
            text: addLabel,
            onPress: () => {
              void (async () => {
                try {
                  const [entitlement, freshCatalog] = await Promise.all([
                    fetchCompanyEntitlementView(currentCompanyId),
                    catalog
                      ? Promise.resolve(catalog)
                      : fetchSellablePlanCatalog(),
                  ]);

                  if (
                    !entitlement?.hasStripeSubscription ||
                    !entitlement.tierSlug ||
                    entitlement.tierSlug === "pilot"
                  ) {
                    Alert.alert(
                      "Subscribe first",
                      `Add-on seats need an active company plan.${priceLine}\n\nOpen Company Plan to subscribe, then return here to add seats.`,
                      [
                        { text: "Cancel", style: "cancel" },
                        {
                          text: "Company Plan",
                          onPress: () => {
                            setActiveModal(null);
                            onNavigateToCompanyPlan?.();
                          },
                        },
                      ],
                    );
                    return;
                  }

                  const baseTier = findBaseTier(
                    freshCatalog,
                    entitlement.tierSlug,
                  );
                  const workerAddon = findAddonTier(
                    freshCatalog,
                    "addon_worker_pack",
                  );
                  const pmAddon = findAddonTier(freshCatalog, "addon_pm_seat");
                  if (!baseTier || !workerAddon || !pmAddon) {
                    setActiveModal(null);
                    onNavigateToCompanyPlan?.();
                    return;
                  }

                  const currentWorkerTotal =
                    entitlement.meterLimits?.worker_seats ?? 0;
                  const currentPmTotal = entitlement.meterLimits?.pm_seats ?? 0;
                  const baseWorkerTotal = baseTier.meters.worker_seats ?? 0;
                  const basePmTotal = baseTier.meters.pm_seats ?? 0;
                  // Product law: +1 seat per unit — ignore stale catalog pack meters (e.g. 5).
                  const workerSeatQty = addonExtraQtyFromTotals(
                    currentWorkerTotal,
                    baseWorkerTotal,
                  );
                  const pmSeatQty = addonExtraQtyFromTotals(
                    currentPmTotal,
                    basePmTotal,
                  );

                  const nextWorker =
                    seatType === "worker" ? workerSeatQty + 1 : workerSeatQty;
                  const nextPm = seatType === "pm" ? pmSeatQty + 1 : pmSeatQty;

                  const baseline = readSeatLimitsFromEntitlement(entitlement) ?? {
                    pmSeatLimit: currentPmTotal,
                    workerSeatLimit: currentWorkerTotal,
                  };

                  const result = await updateCompanyAddons({
                    companyId: currentCompanyId,
                    addonWorkerPacks: nextWorker,
                    addonPmSeats: nextPm,
                  });

                  if (!result.success) {
                    Alert.alert(
                      "Could not add seats",
                      result.error || "Open Company Plan to add seats.",
                      [
                        { text: "Cancel", style: "cancel" },
                        {
                          text: "Company Plan",
                          onPress: () => {
                            setActiveModal(null);
                            onNavigateToCompanyPlan?.();
                          },
                        },
                      ],
                    );
                    return;
                  }

                  Alert.alert(
                    "Updating seats",
                    "Waiting for billing to confirm the new seat limit before inviting…",
                  );

                  const confirmed = await waitForSeatLimitIncrease({
                    companyId: currentCompanyId,
                    baseline,
                    seatType,
                  });

                  if (!confirmed) {
                    Alert.alert(
                      "Seats not ready yet",
                      "Billing has not confirmed the new seats. Open Company Plan, wait a moment, then invite again. Do not invite until the usage label shows the higher limit.",
                      [
                        {
                          text: "Company Plan",
                          onPress: () => {
                            setActiveModal(null);
                            onNavigateToCompanyPlan?.();
                          },
                        },
                        { text: "OK", style: "cancel" },
                      ],
                    );
                    void refreshSeatUsage();
                    return;
                  }

                  await refreshSeatUsage();
                  Alert.alert(
                    "Seats ready",
                    `Limits updated to PM ${confirmed.pmSeatLimit} · Worker ${confirmed.workerSeatLimit}. You can invite now.`,
                  );
                } catch (error) {
                  console.error("UserManagement: add seats failed", error);
                  setActiveModal(null);
                  onNavigateToCompanyPlan?.();
                }
              })();
            },
          },
        ]);
      })();
    },
    [currentCompanyId, onNavigateToCompanyPlan, refreshSeatUsage],
  );

  const openInviteModal = useCallback(() => {
    setInviteName("");
    setInviteEmail("");
    setInviteSeatType("worker");
    setInviteError(null);
    setInviteResult(null);
    setActiveModal("invite");
    void refreshSeatUsage();
  }, [refreshSeatUsage]);

  const submitInvite = useCallback(async () => {
    if (!currentCompanyId) {
      setInviteError("No company on this account");
      return;
    }
    if (!inviteName.trim() || !inviteEmail.trim()) {
      setInviteError("Name and email are required");
      return;
    }

    setInviteSubmitting(true);
    setInviteError(null);

    const { usage, limits } = await refreshSeatUsage();
    if (limits && seatLimitReached(inviteSeatType, usage, limits)) {
      setInviteSubmitting(false);
      const summary = formatSeatUsageSummary(usage, limits);
      setInviteError(summary);
      offerSeatUpsell(
        inviteSeatType,
        `${summary}. Add seats to continue inviting.`,
      );
      return;
    }

    const result = await inviteCompanyUser({
      companyId: currentCompanyId,
      name: inviteName,
      email: inviteEmail,
      seatType: inviteSeatType,
    });

    setInviteSubmitting(false);

    if (!result.success || !result.signInLink || !result.email) {
      const message = result.error || "Invite failed";
      setInviteError(message);
      if (
        result.errorCode === "pm_seat_limit" ||
        result.errorCode === "worker_seat_limit"
      ) {
        offerSeatUpsell(inviteSeatType, message);
      }
      void refreshSeatUsage();
      return;
    }

    setInviteResult({
      email: result.email,
      signInLink: result.signInLink,
      seatType: result.seatType || inviteSeatType,
    });
    setActiveModal("inviteResult");
    void refreshSeatUsage();
  }, [
    currentCompanyId,
    inviteEmail,
    inviteName,
    inviteSeatType,
    offerSeatUpsell,
    refreshSeatUsage,
  ]);

  const copyInviteLink = useCallback(
    async (userId: string) => {
      if (!currentCompanyId || copyingInviteUserId === userId) {
        return;
      }

      const companyUser = companyUsers.find((candidate) => candidate.id === userId);
      if (!companyUser?.email) {
        Alert.alert("Copy failed", "This teammate has no email on file.");
        return;
      }

      setCopyingInviteUserId(userId);
      try {
        const result = await copyCompanyInviteLink({
          companyId: currentCompanyId,
          email: companyUser.email,
        });

        if (!result.success || !result.signInLink) {
          Alert.alert("Copy failed", result.error || "Could not create an invite link.");
          return;
        }

        try {
          await Clipboard.setStringAsync(result.signInLink);
        } catch {
          Alert.alert(
            "Copy failed",
            "Invite link was created but could not be copied. Try again.",
          );
          return;
        }
        Alert.alert("Copied", "Invite link copied. Send it to this teammate.");
      } catch {
        Alert.alert("Copy failed", "Could not create an invite link.");
      } finally {
        setCopyingInviteUserId(null);
      }
    },
    [companyUsers, copyingInviteUserId, currentCompanyId],
  );

  const requestAssignUser = useCallback(
    (userId: string) => {
      const companyUser = companyUsers.find((candidate) => candidate.id === userId);

      if (!companyUser) {
        return;
      }

      setSelectedUser(companyUser);
      setSelectedProject(null);
      setActiveModal("assign");
    },
    [companyUsers],
  );

  const requestApproveUser = useCallback(
    (userId: string) => {
      const companyUser = companyUsers.find((candidate) => candidate.id === userId);

      if (!companyUser) {
        return;
      }

      setPendingApprovalUser(companyUser);
      setActiveModal("approveConfirm");
    },
    [companyUsers],
  );

  const requestRejectUser = useCallback(
    (userId: string) => {
      const companyUser = companyUsers.find((candidate) => candidate.id === userId);

      if (!companyUser) {
        return;
      }

      setPendingApprovalUser(companyUser);
      setActiveModal("rejectConfirm");
    },
    [companyUsers],
  );

  const requestRemoveAssignment = useCallback(
    (userId: string, projectId: string) => {
      const companyUser = companyUsers.find((candidate) => candidate.id === userId);
      const project = projects.find((candidate) => candidate.id === projectId);

      if (!companyUser || !project) {
        return;
      }

      setPendingRemoval({
        userId,
        projectId,
        userName: companyUser.name,
        projectName: project.name,
      });
      setActiveModal("removeConfirm");
    },
    [companyUsers, projects],
  );

  const closeAssignmentFlow = useCallback(() => {
    setActiveModal(null);
    resetAssignmentFlow();
  }, [resetAssignmentFlow]);

  const openProjectPicker = useCallback(() => {
    if (!selectedUser) {
      return;
    }

    setActiveModal("project");
  }, [selectedUser]);

  const returnToAssignmentModal = useCallback(() => {
    if (!selectedUser) {
      return;
    }

    setActiveModal("assign");
  }, [selectedUser]);

  const selectProject = useCallback(
    (projectId: string) => {
      const project = projects.find((candidate) => candidate.id === projectId);

      if (!project) {
        return;
      }

      setSelectedProject(project);
      setActiveModal("assign");
    },
    [projects],
  );

  const saveAssignment = useCallback(async () => {
    if (!selectedUser || !selectedProject || !currentUser) {
      return;
    }

    try {
      const result = await upsertProjectMembership(
        { assignUserToProject, updateUserProjectCategory },
        {
          userId: selectedUser.id,
          projectId: selectedProject.id,
          assignedBy: currentUser.id,
          assignments: getProjectUserAssignments(selectedProject.id),
        },
      );
      notifyDataMutation("assignment");
      const verb = result === "updated" ? "updated on" : "placed on";
      setSuccessMessage(
        `${selectedUser.name} has been ${verb} ${selectedProject.name}.`,
      );
      setActiveModal("success");
      resetAssignmentFlow();
    } catch (error) {
      console.error("UserManagementScreen: Error assigning user", error);
      Alert.alert("Error", "Failed to assign user. Please try again.");
    }
  }, [
    assignUserToProject,
    currentUser,
    getProjectUserAssignments,
    resetAssignmentFlow,
    selectedProject,
    selectedUser,
    updateUserProjectCategory,
  ]);

  const requestDeactivateUser = useCallback(
    (userId: string) => {
      const target = companyUsers.find((candidate) => candidate.id === userId);
      if (!target) {
        return;
      }
      if (target.id === currentUser?.id) {
        Alert.alert("Not allowed", "You cannot deactivate your own seat.");
        return;
      }
      if (isAdmin(target) && getAdminCountByCompany(target.companyId) === 1) {
        Alert.alert(
          "Protected admin",
          "The last company admin cannot be deactivated. Promote another admin first.",
        );
        return;
      }

      Alert.alert(
        "Make inactive?",
        `${target.name} will keep their profile but stop using a company seat so you can invite someone else.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Make inactive",
            style: "destructive",
            onPress: () => {
              void (async () => {
                try {
                  const ok = await deactivateUserSeat(userId);
                  if (!ok) {
                    Alert.alert("Error", "Could not make this user inactive. Please try again.");
                    return;
                  }
                  notifyDataMutation("user");
                  await fetchUsers();
                  setSuccessMessage(
                    `${target.name} is inactive. Their seat is free for another invite.`,
                  );
                  setActiveModal("success");
                } catch (error) {
                  console.error("UserManagementScreen: Error deactivating user", error);
                  Alert.alert("Error", "Could not make this user inactive. Please try again.");
                }
              })();
            },
          },
        ],
      );
    },
    [
      companyUsers,
      currentUser?.id,
      deactivateUserSeat,
      fetchUsers,
      getAdminCountByCompany,
    ],
  );

  const confirmRemoveAssignment = useCallback(async () => {
    if (!pendingRemoval) {
      return;
    }

    try {
      await removeUserFromProject(pendingRemoval.userId, pendingRemoval.projectId);
      notifyDataMutation("assignment");
      setSuccessMessage(
        `${pendingRemoval.userName} has been removed from ${pendingRemoval.projectName}.`,
      );
      setPendingRemoval(null);
      setActiveModal("success");
    } catch (error) {
      console.error("UserManagementScreen: Error removing assignment", error);
      Alert.alert("Error", "Failed to remove assignment. Please try again.");
    }
  }, [pendingRemoval, removeUserFromProject]);

  const confirmApproveUser = useCallback(async () => {
    if (!pendingApprovalUser || !currentUser) {
      return;
    }

    try {
      await approveUser(pendingApprovalUser.id, currentUser.id);
      notifyDataMutation("user");
      setSuccessMessage(`${pendingApprovalUser.name} has been approved and can now log in.`);
      setPendingApprovalUser(null);
      setActiveModal("success");
    } catch (error) {
      console.error("UserManagementScreen: Error approving user", error);
      Alert.alert("Error", "Failed to approve user. Please try again.");
      setPendingApprovalUser(null);
      setActiveModal(null);
    }
  }, [approveUser, currentUser, pendingApprovalUser]);

  const confirmRejectUser = useCallback(async () => {
    if (!pendingApprovalUser) {
      return;
    }

    try {
      await rejectUser(pendingApprovalUser.id);
      notifyDataMutation("user");
      setSuccessMessage(`${pendingApprovalUser.name} has been rejected and removed from the system.`);
      setPendingApprovalUser(null);
      setActiveModal("success");
    } catch (error) {
      console.error("UserManagementScreen: Error rejecting user", error);
      Alert.alert("Error", "Failed to reject user. Please try again.");
      setPendingApprovalUser(null);
      setActiveModal(null);
    }
  }, [pendingApprovalUser, rejectUser]);

  const confirmLogout = useCallback(() => {
    setIsProfileMenuVisible(false);
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: logout,
      },
    ]);
  }, [logout]);

  const availableProjects = useMemo(
    () =>
      projects.map((project) => ({
        id: `user-management-project:${project.id}`,
        projectId: project.id,
        projectName: project.name,
        isSelected: selectedProject?.id === project.id,
        density: "standard" as const,
        structuralState: "stale" as const,
      })),
    [projects, selectedProject?.id],
  );

  const userCards = useMemo(
    () =>
      filteredUsers.map((companyUser) => {
        const assignments = getUserProjectAssignments(companyUser.id);
        const assignmentRows = assignments
          .map((assignment) => {
            const project = projects.find((candidate) => candidate.id === assignment.projectId);

            if (!project) {
              return null;
            }

            const projectRole = getProjectRole(assignment);

            return {
              id: assignment.id || `user-assignment:${companyUser.id}:${project.id}`,
              projectId: project.id,
              projectName: project.name,
              projectRole,
              projectRoleLabel: getProjectRoleLabel(projectRole),
              removeTestId: `user-management__remove-assignment-${companyUser.id}-${project.id}`,
              canRemove: true,
              density: "standard" as const,
              structuralState: "stale" as const,
            };
          })
          .filter((assignment): assignment is NonNullable<typeof assignment> => Boolean(assignment));
        const isPending = Boolean(companyUser.isPending);
        const isProtected = isAdmin(companyUser) && getAdminCountByCompany(companyUser.companyId) === 1;
        const canDeactivate =
          companyUser.id !== currentUser?.id &&
          !isProtected &&
          !isPending &&
          companyUser.isActive !== false;

        return {
          id: `user-card:${companyUser.id}`,
          userId: companyUser.id,
          name: companyUser.name,
          email: companyUser.email,
          phone: companyUser.phone,
          systemRoleLabel: getStaffPageLabel(companyUser),
          /** Kept for contract; seat class for assignments is companySeatLabel. */
          positionLabel: getCompanySeatLabel(companyUser),
          companySeatLabel: getCompanySeatLabel(companyUser),
          isAdmin: isAdmin(companyUser),
          isProtected,
          isPending,
          isActive: companyUser.isActive !== false,
          canDeactivate,
          pendingMessage: isPending
            ? "Awaiting approval - cannot be assigned to projects yet"
            : null,
          canCopyInviteLink: canShowCopyInviteLinkForUser(companyUser, currentUser?.id),
          assignmentCountLabel: assignmentRows.length
            ? `${assignmentRows.length} project assignment${assignmentRows.length === 1 ? "" : "s"}`
            : null,
          assignmentRows,
          primaryAction: {
            id: isPending ? `approve-user:${companyUser.id}` : `assign-user:${companyUser.id}`,
            label: isPending ? "Approve" : "Assign",
            testId: isPending
              ? `user-management__approve-user-${companyUser.id}`
              : `user-management__assign-user-${companyUser.id}`,
          },
          secondaryAction: isPending
            ? {
                id: `reject-user:${companyUser.id}`,
                label: "Reject",
                testId: `user-management__reject-user-${companyUser.id}`,
              }
            : null,
          density: "standard" as const,
          structuralState: "stale" as const,
        };
      }),
    [
      currentUser?.id,
      filteredUsers,
      getAdminCountByCompany,
      getUserProjectAssignments,
      projects,
    ],
  );

  const output = useMemo<UserManagementScreenViewAdapterOutput>(() => {
    const isAllowed = isAdmin(currentUser);

    return {
      screenId: "UserManagementScreen",
      readiness: {
        hasInitialFrame: true,
        hasUsableData: Boolean(currentUser),
        isBackgroundRefreshing: isRefreshing,
        isNavigationTransitionActive: false,
      },
      continuity: {
        isInitialLoading: false,
        isBackgroundRefreshing: isRefreshing,
        hasCachedFrame: Boolean(currentUser),
        shouldRenderSkeletonShell: false,
        shouldRenderEmptyState: isAllowed && userCards.length === 0,
        freshnessLabel: isRefreshing ? "Refreshing" : "Ready",
      },
      access: {
        isAllowed,
        deniedMessage: isAllowed
          ? null
          : t.userManagement?.accessDenied || "Access denied. Admin role required.",
      },
      companyScope: {
        companyName: currentCompany?.name,
        subtitle: currentCompany ? "Showing users from your company only" : undefined,
      },
      searchQuery,
      userCountLabel: `${userCards.length} user${userCards.length === 1 ? "" : "s"} in your company`,
      userCards,
      activeModal,
      successMessage,
      pendingApprovalUser: getSelectedUserSummary(pendingApprovalUser),
      pendingRemoval,
      inviteForm: {
        name: inviteName,
        email: inviteEmail,
        seatType: inviteSeatType,
        isSubmitting: inviteSubmitting,
        error: inviteError,
        seatUsageLabel,
      } satisfies UserManagementInviteFormModel,
      inviteResult,
      copyingInviteUserId,
      refreshState: {
        isRefreshing,
      },
      profileMenu: {
        isVisible: isProfileMenuVisible,
        displayName: currentUser?.name || "Admin",
        roleLabel: currentUser?.role || "admin",
        avatarInitial: currentUser?.name?.charAt(0).toUpperCase() || "A",
      },
      selectedUserSummary: getSelectedUserSummary(selectedUser),
      selectedProjectId: selectedProject?.id || null,
      selectedProjectName: selectedProject?.name || null,
      availableProjects,
      emptyState: {
        title: "No Users Found",
        message: searchQuery
          ? "No users match your search criteria"
          : "No users in your company yet. Invite team members to get started.",
        showInviteAction: !searchQuery,
      },
    };
  }, [
    activeModal,
    availableProjects,
    currentCompany?.name,
    currentUser,
    copyingInviteUserId,
    inviteEmail,
    inviteError,
    inviteName,
    inviteResult,
    inviteSeatType,
    inviteSubmitting,
    seatUsageLabel,
    isProfileMenuVisible,
    isRefreshing,
    pendingApprovalUser,
    pendingRemoval,
    searchQuery,
    selectedProject?.id,
    selectedProject?.name,
    selectedUser,
    successMessage,
    t.userManagement,
    userCards,
  ]);

  return {
    output,
    actions: {
      setSearchQuery,
      handleRefresh,
      openInviteModal,
      setInviteName,
      setInviteEmail,
      setInviteSeatType,
      submitInvite,
      closeActiveModal,
      closeAssignmentFlow,
      openProjectPicker,
      returnToAssignmentModal,
      toggleProfileMenu: () => setIsProfileMenuVisible((current) => !current),
      confirmLogout,
      requestAssignUser,
      requestApproveUser,
      requestRejectUser,
      requestRemoveAssignment,
      selectProject,
      saveAssignment,
      confirmApproveUser,
      confirmRejectUser,
      confirmRemoveAssignment,
      copyInviteLink,
      requestDeactivateUser,
    },
  };
}
