import { useCallback, useMemo, useState } from "react";
import { Alert } from "react-native";
import * as Clipboard from "expo-clipboard";

import {
  copyCompanyInviteLink,
  inviteCompanyUser,
  type InviteSeatType,
} from "@/api/inviteUser";
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
  type ProjectRole,
  type User,
} from "@/types/buildtrack";
import type {
  UserManagementInviteFormModel,
  UserManagementInviteResultModel,
  UserManagementProjectRoleOption,
  UserManagementScreenViewAdapterOutput,
  UserManagementSelectedUserSummary,
} from "@/ui/contracts/viewAdapters";
import { notifyDataMutation } from "@/utils/DataRefreshManager";
import { useTranslation } from "@/utils/useTranslation";

const PROJECT_ROLES: ProjectRole[] = [
  "lead_project_manager",
  "contractor",
  "subcontractor",
  "inspector",
  "architect",
  "engineer",
  "worker",
  "foreman",
];

function getProjectRoleLabel(role: ProjectRole): string {
  return role
    .split("_")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function getSystemRoleLabel(user: User): string {
  return getUserSystemPermission(user)
    .split("_")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function getSelectedUserSummary(user: User | null): UserManagementSelectedUserSummary | null {
  if (!user) {
    return null;
  }

  return {
    userId: user.id,
    name: user.name,
    email: user.email,
    roleLabel: getSystemRoleLabel(user),
  };
}

export interface UserManagementViewAdapterProps {
  onNavigateBack: () => void;
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
    openProjectRolePicker: () => void;
    returnToAssignmentModal: () => void;
    toggleProfileMenu: () => void;
    confirmLogout: () => void;
    requestAssignUser: (userId: string) => void;
    requestApproveUser: (userId: string) => void;
    requestRejectUser: (userId: string) => void;
    requestRemoveAssignment: (userId: string, projectId: string) => void;
    selectProject: (projectId: string) => void;
    selectProjectRole: (role: ProjectRole) => void;
    saveAssignment: () => Promise<void>;
    confirmApproveUser: () => Promise<void>;
    confirmRejectUser: () => Promise<void>;
    confirmRemoveAssignment: () => Promise<void>;
    copyInviteLink: (userId: string) => Promise<void>;
  };
}

export function useUserManagementViewAdapter(
  _props: UserManagementViewAdapterProps,
): UserManagementViewAdapterHookResult {
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
  } = projectStore;
  const {
    getUsersByCompany,
    getAdminCountByCompany,
    fetchUsers,
    approveUser,
    rejectUser,
  } = userStore;

  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedProjectRole, setSelectedProjectRole] = useState<ProjectRole>("worker");
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
    const normalizedQuery = searchQuery.trim().toLowerCase();

    if (!normalizedQuery) {
      return companyUsers;
    }

    return companyUsers.filter(
      (companyUser) =>
        companyUser.name.toLowerCase().includes(normalizedQuery) ||
        companyUser.email?.toLowerCase().includes(normalizedQuery),
    );
  }, [companyUsers, searchQuery]);

  const resetAssignmentFlow = useCallback(() => {
    setSelectedUser(null);
    setSelectedProject(null);
    setSelectedProjectRole("worker");
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

  const openInviteModal = useCallback(() => {
    setInviteName("");
    setInviteEmail("");
    setInviteSeatType("worker");
    setInviteError(null);
    setInviteResult(null);
    setActiveModal("invite");
  }, []);

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

    const result = await inviteCompanyUser({
      companyId: currentCompanyId,
      name: inviteName,
      email: inviteEmail,
      seatType: inviteSeatType,
    });

    setInviteSubmitting(false);

    if (!result.success || !result.signInLink || !result.email) {
      setInviteError(result.error || "Invite failed");
      return;
    }

    setInviteResult({
      email: result.email,
      signInLink: result.signInLink,
      seatType: result.seatType || inviteSeatType,
    });
    setActiveModal("inviteResult");
    void fetchUsers();
  }, [
    currentCompanyId,
    fetchUsers,
    inviteEmail,
    inviteName,
    inviteSeatType,
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
      setSelectedProjectRole("worker");
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

  const openProjectRolePicker = useCallback(() => {
    if (!selectedUser) {
      return;
    }

    setActiveModal("category");
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

  const selectProjectRole = useCallback((role: ProjectRole) => {
    setSelectedProjectRole(role);
    setActiveModal("assign");
  }, []);

  const saveAssignment = useCallback(async () => {
    if (!selectedUser || !selectedProject || !currentUser) {
      return;
    }

    try {
      await assignUserToProject(
        selectedUser.id,
        selectedProject.id,
        selectedProjectRole,
        currentUser.id,
      );
      notifyDataMutation("assignment");
      setSuccessMessage(
        `${selectedUser.name} has been assigned to ${selectedProject.name} as ${getProjectRoleLabel(selectedProjectRole)}.`,
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
    resetAssignmentFlow,
    selectedProject,
    selectedProjectRole,
    selectedUser,
  ]);

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

  const projectRoleOptions = useMemo<UserManagementProjectRoleOption[]>(
    () =>
      PROJECT_ROLES.map((role) => ({
        id: `user-management-role:${role}`,
        role,
        label: getProjectRoleLabel(role),
        isSelected: selectedProjectRole === role,
        density: "standard",
        structuralState: "stale",
      })),
    [selectedProjectRole],
  );

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

        return {
          id: `user-card:${companyUser.id}`,
          userId: companyUser.id,
          name: companyUser.name,
          email: companyUser.email,
          systemRoleLabel: getSystemRoleLabel(companyUser),
          positionLabel: companyUser.position,
          isAdmin: isAdmin(companyUser),
          isProtected,
          isPending,
          pendingMessage: isPending
            ? "Awaiting approval - cannot be assigned to projects yet"
            : null,
          canCopyInviteLink: Boolean(
            companyUser.email &&
              companyUser.id !== currentUser?.id &&
              !isPending,
          ),
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
      selectedProjectRole,
      availableProjects,
      projectRoleOptions,
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
    isProfileMenuVisible,
    isRefreshing,
    pendingApprovalUser,
    pendingRemoval,
    projectRoleOptions,
    searchQuery,
    selectedProject?.id,
    selectedProject?.name,
    selectedProjectRole,
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
      openProjectRolePicker,
      returnToAssignmentModal,
      toggleProfileMenu: () => setIsProfileMenuVisible((current) => !current),
      confirmLogout,
      requestAssignUser,
      requestApproveUser,
      requestRejectUser,
      requestRemoveAssignment,
      selectProject,
      selectProjectRole,
      saveAssignment,
      confirmApproveUser,
      confirmRejectUser,
      confirmRemoveAssignment,
      copyInviteLink,
    },
  };
}
