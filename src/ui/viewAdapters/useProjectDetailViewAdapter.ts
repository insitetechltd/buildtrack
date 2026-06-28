import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";

import { useAuthStore } from "@/state/authStore";
import { useProjectStoreWithCompanyInit } from "@/state/projectStore.supabase";
import { useTaskStore } from "@/state/taskStore.supabase";
import { useUserStoreWithInit } from "@/state/userStore.supabase";
import { getProjectRole, isAdmin, type Project, type ProjectStatus } from "@/types/buildtrack";
import type { ProjectDetailScreenViewAdapterOutput } from "@/ui/contracts/viewAdapters";
import { useDateFormatter } from "@/utils/dateFormatter";

interface ProjectDetailViewAdapterProps {
  projectId: string;
}

interface ProjectFormSubmission {
  name: string;
  description: string;
  status: ProjectStatus;
  startDate: Date;
  endDate: Date;
  location: string;
  clientInfo: {
    name: string;
    email: string;
    phone: string;
  };
}

export interface ProjectDetailViewAdapterHookResult {
  output: ProjectDetailScreenViewAdapterOutput;
  actions: {
    handleRefresh: () => Promise<void>;
    openEditProject: () => void;
    closeEditProject: () => void;
    saveProjectEdits: (formData: ProjectFormSubmission) => Promise<void>;
    openAddMemberModal: () => void;
    closeAddMemberModal: () => void;
    addMembers: (userIds: string[]) => Promise<void>;
    confirmRemoveMember: (userId: string) => void;
  };
}

function formatProjectStatusLabel(status: ProjectStatus): string {
  return status.replace(/_/g, " ");
}

export function useProjectDetailViewAdapter(
  props: ProjectDetailViewAdapterProps,
): ProjectDetailViewAdapterHookResult {
  const { projectId } = props;
  const dateFormatter = useDateFormatter();
  const { user } = useAuthStore();
  const projectStore = useProjectStoreWithCompanyInit(user?.companyId || "");
  const userStore = useUserStoreWithInit();
  const { getTasksByProject } = useTaskStore();
  const {
    getProjectById,
    updateProject,
    getProjectStats,
    getProjectUserAssignments,
    getLeadPMForProject,
    assignUserToProject,
    removeUserFromProject,
    fetchProjectUserAssignments,
    cleanupDuplicateAssignments,
  } = projectStore;
  const { getUserById } = userStore;

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isAddMemberModalVisible, setIsAddMemberModalVisible] = useState(false);
  const canAdministerProject = isAdmin(user);

  const refreshAssignments = useCallback(
    async (shouldCleanupDuplicates: boolean) => {
      if (!user?.companyId || !projectId) {
        return;
      }

      if (shouldCleanupDuplicates) {
        await cleanupDuplicateAssignments(projectId);
      }

      await fetchProjectUserAssignments(projectId);
    },
    [
      cleanupDuplicateAssignments,
      fetchProjectUserAssignments,
      projectId,
      user?.companyId,
    ],
  );

  useEffect(() => {
    void refreshAssignments(true);
  }, [refreshAssignments]);

  useFocusEffect(
    useCallback(() => {
      void refreshAssignments(false);
    }, [refreshAssignments]),
  );

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);

    try {
      await refreshAssignments(true);
    } catch (error) {
      console.error("ProjectDetailScreen: Error refreshing project", error);
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshAssignments]);

  const project = getProjectById(projectId) || null;
  const projectStats = project
    ? getProjectStats(project.id)
    : {
        totalUsers: 0,
        usersByCategory: {},
        isActive: false,
      };
  const projectTasks = project ? getTasksByProject(project.id) : [];
  const createdBy = project ? getUserById(project.createdBy) : null;
  const leadPmId = project ? getLeadPMForProject(project.id) : undefined;
  const leadPm = leadPmId ? getUserById(leadPmId) : null;
  const allAssignments = project ? getProjectUserAssignments(project.id) : [];

  const memberRows = useMemo(() => {
    if (!project) {
      return [];
    }

    const dedupedAssignments = new Map<string, (typeof allAssignments)[number]>();

    allAssignments.forEach((assignment) => {
      const member = getUserById(assignment.userId);

      if (!member) {
        return;
      }

      const existingAssignment = dedupedAssignments.get(assignment.userId);

      if (!existingAssignment) {
        dedupedAssignments.set(assignment.userId, assignment);
        return;
      }

      if (new Date(assignment.assignedAt) > new Date(existingAssignment.assignedAt)) {
        dedupedAssignments.set(assignment.userId, assignment);
      }
    });

    return Array.from(dedupedAssignments.values()).map((assignment) => {
      const member = getUserById(assignment.userId);
      const isLeadPm = assignment.userId === leadPmId;

      return {
        id: assignment.id || `project-member:${assignment.userId}`,
        userId: assignment.userId,
        name: member?.name || "Unknown",
        projectRoleLabel: getProjectRole(assignment).replace(/_/g, " "),
        email: member?.email,
        isLeadPm,
        canRemove: canAdministerProject && !isLeadPm,
        density: "standard" as const,
        structuralState: "stale" as const,
      };
    });
  }, [allAssignments, canAdministerProject, getUserById, leadPmId, project]);

  const saveProjectEdits = useCallback(
    async (formData: ProjectFormSubmission) => {
      if (!project) {
        return;
      }

      const updatedProject: Project = {
        ...project,
        name: formData.name,
        description: formData.description,
        status: formData.status,
        startDate: formData.startDate.toISOString(),
        endDate: formData.endDate.toISOString(),
        location: formData.location,
        clientInfo: formData.clientInfo,
        updatedAt: new Date().toISOString(),
      };

      try {
        await updateProject(updatedProject.id, updatedProject);
        setIsEditModalVisible(false);
        Alert.alert("Success", "Project updated successfully");
      } catch (error) {
        console.error("ProjectDetailScreen: Error updating project", error);
        Alert.alert("Error", "Failed to update project. Please try again.");
      }
    },
    [project, updateProject],
  );

  const addMembers = useCallback(
    async (userIds: string[]) => {
      if (!project || !user) {
        return;
      }

      try {
        const results = await Promise.allSettled(
          userIds.map((userId) =>
            assignUserToProject(userId, project.id, "worker", user.id),
          ),
        );

        const successful = results.filter(
          (result) => result.status === "fulfilled",
        ).length;
        const failed = results.filter(
          (result) => result.status === "rejected",
        ).length;

        setIsAddMemberModalVisible(false);
        await fetchProjectUserAssignments(project.id);

        if (successful > 0 && failed === 0) {
          const memberLabel = successful === 1 ? "member" : "members";
          Alert.alert("Success", `${successful} ${memberLabel} added to project`);
          return;
        }

        if (successful > 0) {
          Alert.alert(
            "Partial Success",
            `${successful} members added successfully. ${failed} members were already assigned to this project.`,
          );
          return;
        }

        Alert.alert(
          "Info",
          "All selected members were already assigned to this project.",
        );
      } catch (error) {
        console.error("ProjectDetailScreen: Error adding members", error);
        Alert.alert("Error", "Failed to add members to project");
      }
    },
    [assignUserToProject, fetchProjectUserAssignments, project, user],
  );

  const confirmRemoveMember = useCallback(
    (userId: string) => {
      if (!project) {
        return;
      }

      Alert.alert(
        "Remove Member",
        "Are you sure you want to remove this member from the project?",
        [
          {
            text: "Cancel",
            style: "cancel",
          },
          {
            text: "Remove",
            style: "destructive",
            onPress: async () => {
              try {
                await removeUserFromProject(userId, project.id);
                await fetchProjectUserAssignments(project.id);
                Alert.alert("Success", "Member removed from project");
              } catch (error) {
                console.error("ProjectDetailScreen: Error removing member", error);
                Alert.alert("Error", "Failed to remove member from project");
              }
            },
          },
        ],
      );
    },
    [fetchProjectUserAssignments, project, removeUserFromProject],
  );

  const output = useMemo<ProjectDetailScreenViewAdapterOutput>(() => {
    const hasProject = Boolean(project);
    const canEdit = canAdministerProject;
    const canManageMembers = canEdit;

    return {
      screenId: "ProjectDetailScreen",
      readiness: {
        hasInitialFrame: true,
        hasUsableData: Boolean(user),
        isBackgroundRefreshing: isRefreshing,
        isNavigationTransitionActive: false,
      },
      continuity: {
        isInitialLoading: false,
        isBackgroundRefreshing: isRefreshing,
        hasCachedFrame: hasProject,
        shouldRenderSkeletonShell: false,
        shouldRenderEmptyState: !hasProject,
        freshnessLabel: isRefreshing ? "Refreshing" : "Ready",
      },
      project,
      header: project
        ? {
            projectId: project.id,
            title: project.name,
            description: project.description,
            statusValue: project.status,
            statusLabel: formatProjectStatusLabel(project.status),
          }
        : null,
      leadPm: leadPm
        ? {
            userId: leadPm.id,
            name: leadPm.name,
            email: leadPm.email,
          }
        : null,
      statCards: project
        ? [
            {
              id: "project-detail-stat:members",
              statId: "members",
              label: "Team Members",
              value: projectStats.totalUsers,
              iconName: "people-outline",
              density: "standard",
              structuralState: "stale",
            },
            {
              id: "project-detail-stat:tasks",
              statId: "tasks",
              label: "Total Tasks",
              value: projectTasks.length,
              iconName: "checkbox-outline",
              density: "standard",
              structuralState: "stale",
            },
          ]
        : [],
      informationRows: project
        ? [
            {
              id: "project-detail-info:location",
              label: "Location",
              value: project.location || "No location specified",
            },
            {
              id: "project-detail-info:timeline",
              label: "Timeline",
              value: `Start: ${dateFormatter.formatDateShort(project.startDate)}`,
              secondaryValue: project.endDate
                ? `End: ${dateFormatter.formatDateShort(project.endDate)}`
                : undefined,
            },
            {
              id: "project-detail-info:client",
              label: "Client",
              value: project.clientInfo.name,
              secondaryValue: [project.clientInfo.email, project.clientInfo.phone]
                .filter(Boolean)
                .join("\n") || undefined,
            },
            {
              id: "project-detail-info:created-by",
              label: "Created By",
              value: createdBy?.name || "Unknown",
              secondaryValue: new Date(project.createdAt).toLocaleString(),
            },
          ].concat(
            project.budget
              ? [
                  {
                    id: "project-detail-info:budget",
                    label: "Budget",
                    value: `$${project.budget.toLocaleString()}`,
                  },
                ]
              : [],
          )
        : [],
      memberRows,
      isRefreshing,
      canEdit,
      canManageMembers,
      editingProject: project,
      isEditModalVisible,
      isAddMemberModalVisible,
      existingMemberIds: memberRows.map((member) => member.userId),
      emptyState: project
        ? null
        : {
            title: "Project not found",
            message:
              "This project may have been deleted or you don't have access to it.",
            primaryActionLabel: "Go Back",
          },
    };
  }, [
    createdBy?.name,
    dateFormatter,
    isAddMemberModalVisible,
    isEditModalVisible,
    isRefreshing,
    leadPm,
    memberRows,
    canAdministerProject,
    project,
    projectStats.totalUsers,
    projectTasks.length,
    user,
  ]);

  return {
    output,
    actions: {
      handleRefresh,
      openEditProject: () => {
        if (project && canAdministerProject) {
          setIsEditModalVisible(true);
        }
      },
      closeEditProject: () => setIsEditModalVisible(false),
      saveProjectEdits,
      openAddMemberModal: () => {
        if (project && canAdministerProject) {
          setIsAddMemberModalVisible(true);
        }
      },
      closeAddMemberModal: () => setIsAddMemberModalVisible(false),
      addMembers,
      confirmRemoveMember,
    },
  };
}
