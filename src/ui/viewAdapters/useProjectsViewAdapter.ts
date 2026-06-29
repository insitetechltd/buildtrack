import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert } from "react-native";

import { useAuthStore } from "@/state/authStore";
import { useProjectStoreWithCompanyInit } from "@/state/projectStore.supabase";
import { useUserStoreWithInit } from "@/state/userStore.supabase";
import { isAdmin, type Project, type ProjectStatus } from "@/types/buildtrack";
import type { ProjectsScreenViewAdapterOutput } from "@/ui/contracts/viewAdapters";
import { useDateFormatter } from "@/utils/dateFormatter";
import { useTranslation } from "@/utils/useTranslation";

export interface ProjectsViewAdapterProps {
  newProjectId?: string;
}

export interface ProjectsViewAdapterHookResult {
  output: ProjectsScreenViewAdapterOutput;
  actions: {
    setSearchQuery: (value: string) => void;
    selectStatusFilter: (status: ProjectStatus | "all") => void;
    handleRefresh: () => Promise<void>;
    openEditProject: (projectId: string) => void;
    closeEditProject: () => void;
    saveEditedProject: (project: Project) => Promise<void>;
    completeEditedProjectSave: () => void;
  };
}

function getStatusLabel(
  status: ProjectStatus,
  labels: Record<ProjectStatus, string>,
): string {
  return labels[status] || status.replace(/_/g, " ");
}

function getProjectStatusTone(
  status: ProjectStatus,
): "success" | "info" | "warning" | "neutral" | "danger" {
  switch (status) {
    case "active":
      return "success";
    case "planning":
      return "info";
    case "on_hold":
      return "warning";
    case "cancelled":
      return "danger";
    case "completed":
    default:
      return "neutral";
  }
}

export function useProjectsViewAdapter(
  props: ProjectsViewAdapterProps,
): ProjectsViewAdapterHookResult {
  const { newProjectId } = props;
  const t = useTranslation();
  const dateFormatter = useDateFormatter();
  const { user } = useAuthStore();
  const projectStore = useProjectStoreWithCompanyInit(user?.companyId || "");
  const userStore = useUserStoreWithInit();
  const {
    fetchProjects,
    fetchProjectUserAssignments,
    fetchUserProjectAssignments,
    getProjectsByCompany,
    getProjectsByUser,
    getProjectStats,
    getLeadPMForProject,
    projects,
    userAssignments,
    updateProject,
  } = projectStore;
  const { fetchUsers, getUserById, users } = userStore;

  const [searchQuery, setSearchQuery] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | "all">("all");
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const canAdministerProjects = isAdmin(user);

  const hydrateVisibleProjectAssignments = useCallback(
    async (visibleProjects: Project[], forceRefresh = false) => {
      if (visibleProjects.length === 0) {
        return;
      }

      await Promise.all(
        visibleProjects.map((project) =>
          forceRefresh
            ? fetchProjectUserAssignments(project.id, true)
            : fetchProjectUserAssignments(project.id),
        ),
      );
    },
    [fetchProjectUserAssignments],
  );

  const statusLabels = useMemo<Record<ProjectStatus, string>>(
    () => ({
      active: t.projects.active,
      planning: t.projects.planning,
      on_hold: t.projects.onHold,
      completed: t.projects.completed,
      cancelled: t.projects.cancelled,
    }),
    [
      t.projects.active,
      t.projects.cancelled,
      t.projects.completed,
      t.projects.onHold,
      t.projects.planning,
    ],
  );

  useEffect(() => {
    const loadData = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      if (newProjectId) {
        console.log(
          "ProjectsScreen: Loading fresh data and verifying new project:",
          newProjectId,
        );
      } else {
        console.log("ProjectsScreen: Loading fresh data from database...");
      }

      setIsLoading(true);

      try {
        let retries = 0;
        const maxRetries = 10;
        let dataLoaded = false;
        const shouldForceFreshProjectFetch = Boolean(newProjectId);

        while (retries < maxRetries && !dataLoaded) {
          await Promise.all([
            fetchProjects(shouldForceFreshProjectFetch),
            fetchUsers(),
            shouldForceFreshProjectFetch
              ? fetchUserProjectAssignments(user.id, true)
              : fetchUserProjectAssignments(user.id),
          ]);

          const currentProjects = canAdministerProjects
            ? getProjectsByCompany(user.companyId)
            : getProjectsByUser(user.id);

          await hydrateVisibleProjectAssignments(
            currentProjects,
            shouldForceFreshProjectFetch,
          );

          console.log(
            `ProjectsScreen: Loaded ${currentProjects.length} projects from database`,
          );

          if (newProjectId) {
            const newProjectExists = currentProjects.some(
              (project) => project.id === newProjectId,
            );

            if (newProjectExists) {
              console.log(
                `ProjectsScreen: New project "${newProjectId}" confirmed in database`,
              );
              dataLoaded = true;
            } else {
              retries += 1;
              console.log(
                `ProjectsScreen: New project not found yet, retrying (${retries}/${maxRetries})`,
              );
              await new Promise((resolve) => setTimeout(resolve, 800));
            }
          } else {
            dataLoaded = true;
            console.log("ProjectsScreen: Fresh data loaded from database");
          }
        }

        if (!dataLoaded && newProjectId) {
          console.warn(
            `ProjectsScreen: Could not verify new project ${newProjectId} after ${maxRetries} attempts`,
          );
        }
      } catch (error) {
        console.error("ProjectsScreen: Error loading data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    void loadData();
  }, [
    canAdministerProjects,
    fetchProjects,
    fetchProjectUserAssignments,
    fetchUserProjectAssignments,
    fetchUsers,
    getProjectsByCompany,
    getProjectsByUser,
    hydrateVisibleProjectAssignments,
    newProjectId,
    user,
  ]);

  const allProjects = useMemo(() => {
    if (!user) {
      return [];
    }

    if (canAdministerProjects) {
      return getProjectsByCompany(user.companyId);
    }

    return getProjectsByUser(user.id);
  }, [
    canAdministerProjects,
    getProjectsByCompany,
    getProjectsByUser,
    projects,
    user,
    userAssignments,
  ]);

  const filteredProjects = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return allProjects.filter((project) => {
      const matchesSearch =
        normalizedQuery.length === 0 ||
        project.name.toLowerCase().includes(normalizedQuery) ||
        project.description.toLowerCase().includes(normalizedQuery);
      const matchesStatus =
        statusFilter === "all" || project.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [allProjects, searchQuery, statusFilter]);
  const hasActiveSearchQuery = searchQuery.trim().length > 0;

  const handleRefresh = useCallback(async () => {
    if (!user) {
      return;
    }

    setIsRefreshing(true);

    try {
      await Promise.all([
        fetchProjects(true),
        fetchUsers(),
        fetchUserProjectAssignments(user.id, true),
      ]);

      const refreshedProjects = canAdministerProjects
        ? getProjectsByCompany(user.companyId)
        : getProjectsByUser(user.id);

      await hydrateVisibleProjectAssignments(refreshedProjects, true);
    } finally {
      setIsRefreshing(false);
    }
  }, [
    canAdministerProjects,
    fetchProjects,
    fetchUserProjectAssignments,
    fetchUsers,
    getProjectsByCompany,
    getProjectsByUser,
    hydrateVisibleProjectAssignments,
    user,
  ]);

  const openEditProject = useCallback(
    (projectId: string) => {
      const project = allProjects.find((item) => item.id === projectId) || null;
      setEditingProject(project);
      setIsEditModalVisible(Boolean(project));
    },
    [allProjects],
  );

  const closeEditProject = useCallback(() => {
    setIsEditModalVisible(false);
    setEditingProject(null);
  }, []);

  const saveEditedProject = useCallback(
    async (project: Project) => {
      try {
        await updateProject(project.id, project);
      } catch (error) {
        console.error("ProjectsScreen: Failed to update project:", error);
        throw error;
      }
    },
    [updateProject],
  );

  const completeEditedProjectSave = useCallback(() => {
    setIsEditModalVisible(false);
    setEditingProject(null);
    Alert.alert(t.errors.success, t.projects.projectUpdated);
  }, [t.errors.success, t.projects.projectUpdated]);

  const output = useMemo<ProjectsScreenViewAdapterOutput>(() => {
    const isInitialLoading = isLoading && allProjects.length === 0;
    const isBackgroundRefreshing = isRefreshing && allProjects.length > 0;
    const density = "standard" as const;
    const structuralState = filteredProjects.length === 0 ? "empty" : "stale";

    const projectCountLabel = [
      filteredProjects.length,
      filteredProjects.length === 1
        ? t.projects.project
        : t.projects.projectsPlural,
      !canAdministerProjects ? t.projects.assignedToYou : null,
    ]
      .filter(Boolean)
      .join(" ");

    return {
      screenId: "ProjectsScreen",
      readiness: {
        hasInitialFrame: true,
        hasUsableData: Boolean(user),
        isBackgroundRefreshing,
        isNavigationTransitionActive: false,
      },
      continuity: {
        isInitialLoading,
        isBackgroundRefreshing,
        hasCachedFrame: allProjects.length > 0,
        shouldRenderSkeletonShell: false,
        shouldRenderEmptyState: !isLoading && filteredProjects.length === 0,
        freshnessLabel: isBackgroundRefreshing
          ? "Refreshing"
          : isInitialLoading
            ? "Loading"
            : "Ready",
      },
      headerActions: {
        showCreateAction: canAdministerProjects,
        showUserManagementAction: canAdministerProjects,
      },
      searchQuery,
      statusFilter,
      projectCountLabel,
      isRefreshing,
      isAdmin: canAdministerProjects,
      projectItems: filteredProjects.map((project) => {
        const projectStats = getProjectStats(project.id);
        const createdBy = getUserById(project.createdBy);
        const leadPmId = getLeadPMForProject(project.id);
        const leadPm = leadPmId ? getUserById(leadPmId) : null;

        return {
          id: `projects:${project.id}`,
          projectId: project.id,
          title: project.name,
          description: project.description,
          statusValue: project.status,
          statusLabel: getStatusLabel(project.status, statusLabels),
          statusTone: getProjectStatusTone(project.status),
          locationLabel: project.location || t.projects.noLocation,
          memberCountLabel: `${projectStats.totalUsers} ${
            projectStats.totalUsers === 1
              ? t.projects.member
              : t.projects.members
          }`,
          clientName: project.clientInfo.name,
          startDateLabel: dateFormatter.formatDateShort(project.startDate),
          createdByLabel: createdBy?.name || t.projects.unknown,
          leadPmName: leadPm?.name,
          budgetLabel: project.budget
            ? `${t.projects.budget}: $${project.budget.toLocaleString()}`
            : undefined,
          canEdit: canAdministerProjects,
          density,
          structuralState,
        };
      }),
      filterOptions: [
        {
          id: "projects-filter:all",
          value: "all",
          label: t.projects.all,
          isSelected: statusFilter === "all",
        },
        {
          id: "projects-filter:active",
          value: "active",
          label: t.projects.active,
          isSelected: statusFilter === "active",
        },
        {
          id: "projects-filter:planning",
          value: "planning",
          label: t.projects.planning,
          isSelected: statusFilter === "planning",
        },
        {
          id: "projects-filter:on_hold",
          value: "on_hold",
          label: t.projects.onHold,
          isSelected: statusFilter === "on_hold",
        },
        {
          id: "projects-filter:completed",
          value: "completed",
          label: t.projects.completed,
          isSelected: statusFilter === "completed",
        },
        {
          id: "projects-filter:cancelled",
          value: "cancelled",
          label: t.projects.cancelled,
          isSelected: statusFilter === "cancelled",
        },
      ],
      emptyState: {
        title: hasActiveSearchQuery ? t.projects.noProjectsFound : t.projects.noProjects,
        message: hasActiveSearchQuery
          ? t.projects.tryAdjustingSearch
          : canAdministerProjects
            ? t.projects.createFirstProject
            : t.projects.noProjectsMessage,
        showCreateAction: canAdministerProjects && !hasActiveSearchQuery,
      },
      editingProject,
      isEditModalVisible,
    };
  }, [
    allProjects.length,
    canAdministerProjects,
    dateFormatter,
    editingProject,
    filteredProjects,
    isEditModalVisible,
    isLoading,
    isRefreshing,
    hasActiveSearchQuery,
    getLeadPMForProject,
    getProjectStats,
    getUserById,
    searchQuery,
    statusFilter,
    statusLabels,
    t.projects.active,
    t.projects.all,
    t.projects.assignedToYou,
    t.projects.budget,
    t.projects.cancelled,
    t.projects.completed,
    t.projects.createFirstProject,
    t.projects.member,
    t.projects.members,
    t.projects.noLocation,
    t.projects.noProjects,
    t.projects.noProjectsFound,
    t.projects.noProjectsMessage,
    t.projects.onHold,
    t.projects.planning,
    t.projects.project,
    t.projects.projectsPlural,
    t.projects.tryAdjustingSearch,
    t.projects.unknown,
    user,
    users,
  ]);

  return {
    output,
    actions: {
      setSearchQuery,
      selectStatusFilter: setStatusFilter,
      handleRefresh,
      openEditProject,
      closeEditProject,
      saveEditedProject,
      completeEditedProjectSave,
    },
  };
}
