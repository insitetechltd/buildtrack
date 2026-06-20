import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert } from "react-native";

import { useAuthStore } from "@/state/authStore";
import { useProjectStoreWithCompanyInit } from "@/state/projectStore.supabase";
import { useUserStoreWithInit } from "@/state/userStore.supabase";
import type { Project, ProjectStatus } from "@/types/buildtrack";
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
    saveEditedProject: (project: Project) => void;
  };
}

function getStatusLabel(
  status: ProjectStatus,
  labels: Record<ProjectStatus, string>,
): string {
  return labels[status] || status.replace(/_/g, " ");
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
    fetchUserProjectAssignments,
    getProjectsByCompany,
    getProjectsByUser,
    getProjectStats,
    getLeadPMForProject,
    updateProject,
  } = projectStore;
  const { fetchUsers, getUserById } = userStore;

  const [searchQuery, setSearchQuery] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | "all">("all");
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

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

        while (retries < maxRetries && !dataLoaded) {
          await Promise.all([
            fetchProjects(),
            fetchUsers(),
            fetchUserProjectAssignments(user.id),
          ]);

          const currentProjects =
            user.role === "admin"
              ? getProjectsByCompany(user.companyId)
              : getProjectsByUser(user.id);
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
          } else if (currentProjects.length > 0 || retries >= maxRetries - 1) {
            dataLoaded = true;
            console.log("ProjectsScreen: Fresh data loaded from database");
          } else {
            retries += 1;
            console.log(
              `ProjectsScreen: No projects found, retrying (${retries}/${maxRetries})`,
            );
            await new Promise((resolve) => setTimeout(resolve, 500));
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
    fetchProjects,
    fetchUserProjectAssignments,
    fetchUsers,
    getProjectsByCompany,
    getProjectsByUser,
    newProjectId,
    user,
  ]);

  const allProjects = useMemo(() => {
    if (!user) {
      return [];
    }

    if (user.role === "admin") {
      return getProjectsByCompany(user.companyId);
    }

    return getProjectsByUser(user.id);
  }, [getProjectsByCompany, getProjectsByUser, user]);

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

  const handleRefresh = useCallback(async () => {
    if (!user) {
      return;
    }

    setIsRefreshing(true);

    try {
      await Promise.all([
        fetchProjects(),
        fetchUserProjectAssignments(user.id),
      ]);
    } finally {
      setIsRefreshing(false);
    }
  }, [fetchProjects, fetchUserProjectAssignments, user]);

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
    (project: Project) => {
      void updateProject(project.id, project).catch((error) => {
        console.error("ProjectsScreen: Failed to update project:", error);
      });

      setIsEditModalVisible(false);
      setEditingProject(null);
      Alert.alert(t.errors.success, t.projects.projectUpdated);
    },
    [t.errors.success, t.projects.projectUpdated, updateProject],
  );

  const output = useMemo<ProjectsScreenViewAdapterOutput>(() => {
    const isAdmin = user?.role === "admin";
    const isInitialLoading = isLoading && allProjects.length === 0;
    const isBackgroundRefreshing = isRefreshing && allProjects.length > 0;
    const density = "standard" as const;
    const structuralState = filteredProjects.length === 0 ? "empty" : "stale";

    const projectCountLabel = [
      filteredProjects.length,
      filteredProjects.length === 1
        ? t.projects.project
        : t.projects.projectsPlural,
      !isAdmin ? t.projects.assignedToYou : null,
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
      searchQuery,
      statusFilter,
      projectCountLabel,
      isRefreshing,
      isAdmin,
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
          canEdit: isAdmin,
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
        title: searchQuery ? t.projects.noProjectsFound : t.projects.noProjects,
        message: searchQuery
          ? t.projects.tryAdjustingSearch
          : isAdmin
            ? t.projects.createFirstProject
            : t.projects.noProjectsMessage,
        showCreateAction: isAdmin && searchQuery.length === 0,
      },
      editingProject,
      isEditModalVisible,
    };
  }, [
    allProjects.length,
    dateFormatter,
    editingProject,
    filteredProjects,
    isEditModalVisible,
    isLoading,
    isRefreshing,
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
    },
  };
}
