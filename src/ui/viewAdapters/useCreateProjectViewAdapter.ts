import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert } from "react-native";

import { useAuthStore } from "@/state/authStore";
import { useCompanyStore } from "@/state/companyStore";
import {
  useProjectStore,
  useProjectStoreWithCompanyInit,
} from "@/state/projectStore.supabase";
import { useUserStore } from "@/state/userStore.supabase";
import { isAdmin, type ProjectStatus } from "@/types/buildtrack";
import {
  buildCreateProjectRosterCandidates,
  countCreateProjectAdmins,
  normalizeCreateProjectTeamMembers,
  placeCreateProjectTeamMembers,
  type CreateProjectTeamMemberDraft,
} from "@/ui/contracts/createProjectTeam";
import type { CreateProjectScreenViewAdapterOutput } from "@/ui/contracts/viewAdapters";
import { notifyDataMutation } from "@/utils/DataRefreshManager";
import { useTranslation } from "@/utils/useTranslation";

export interface CreateProjectViewAdapterProps {
  onNavigateBack: (projectId?: string) => void;
}

export interface CreateProjectFormSubmission {
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
  initialMembers?: CreateProjectTeamMemberDraft[];
}

export interface CreateProjectViewAdapterHookResult {
  output: CreateProjectScreenViewAdapterOutput;
  actions: {
    submitProject: (formData: CreateProjectFormSubmission) => Promise<void>;
    cancel: () => void;
  };
}

async function wait(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export function useCreateProjectViewAdapter(
  props: CreateProjectViewAdapterProps,
): CreateProjectViewAdapterHookResult {
  const { onNavigateBack } = props;
  const t = useTranslation();
  const { user } = useAuthStore();
  const projectStore = useProjectStoreWithCompanyInit(user?.companyId || "");
  const { createProject, fetchProjects, assignUserToProject, updateUserProjectCategory } =
    projectStore;
  const { getCompanyBanner } = useCompanyStore();
  const users = useUserStore((state) => state.users);
  const fetchUsersByCompany = useUserStore((state) => state.fetchUsersByCompany);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!user?.companyId || !isAdmin(user)) {
      return;
    }
    void fetchUsersByCompany(user.companyId);
  }, [fetchUsersByCompany, user]);

  const rosterCandidates = useMemo(
    () => buildCreateProjectRosterCandidates(users, user?.companyId),
    [user?.companyId, users],
  );

  const usersById = useMemo(() => {
    const map: Record<string, (typeof users)[number]> = {};
    for (const row of users) {
      map[row.id] = row;
    }
    return map;
  }, [users]);

  const submitProject = useCallback(
    async (formData: CreateProjectFormSubmission) => {
      if (!user || !isAdmin(user)) {
        Alert.alert(
          t.errors.error,
          t.userManagement.accessDenied || "Access denied. Admin role required.",
        );
        return;
      }

      if (countCreateProjectAdmins(formData.initialMembers ?? []) > 1) {
        Alert.alert(
          t.errors.error,
          "Choose only one Project Admin for this job.",
        );
        return;
      }

      const members = normalizeCreateProjectTeamMembers(
        formData.initialMembers ?? [],
        usersById,
      );

      setIsSubmitting(true);

      try {
        const createdProjectId = await createProject({
          name: formData.name,
          description: formData.description,
          status: formData.status,
          startDate: formData.startDate.toISOString(),
          endDate: formData.endDate.toISOString(),
          location: formData.location,
          clientInfo: {
            name: formData.clientInfo.name,
            email: formData.clientInfo.email || undefined,
            phone: formData.clientInfo.phone || undefined,
          },
          createdBy: user.id,
          companyId: user.companyId,
        });

        if (members.length > 0) {
          const { failed } = await placeCreateProjectTeamMembers({
            writer: { assignUserToProject, updateUserProjectCategory },
            projectId: createdProjectId,
            assignedBy: user.id,
            members,
            usersById,
          });
          if (failed.length > 0) {
            Alert.alert(
              t.projects.projectCreated,
              `Project created, but ${failed.length} placement(s) failed. Place people from User management.`,
            );
          }
        }

        await wait(1000);

        let retries = 0;
        const maxRetries = 10;
        let projectExists = false;

        while (retries < maxRetries && !projectExists) {
          await fetchProjects();
          const latestProjects = useProjectStore.getState().projects;
          projectExists = latestProjects.some(
            (project) => project.id === createdProjectId,
          );

          if (projectExists) {
            break;
          }

          retries += 1;
          await wait(800);
        }

        if (!projectExists) {
          Alert.alert(
            t.projects.projectCreated,
            t.projects.projectCreatedMessage,
            [{ text: t.common.ok, onPress: () => onNavigateBack(createdProjectId) }],
          );
          return;
        }

        notifyDataMutation("project");
        onNavigateBack(createdProjectId);
      } catch (error) {
        console.error("CreateProjectScreen: Error creating project", error);
        Alert.alert(t.errors.error, t.projects.failedToCreateProject);
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      assignUserToProject,
      createProject,
      fetchProjects,
      onNavigateBack,
      t,
      updateUserProjectCategory,
      user,
      usersById,
    ],
  );

  const output = useMemo<CreateProjectScreenViewAdapterOutput>(() => {
    const isAllowed = isAdmin(user);
    const banner = user?.companyId ? getCompanyBanner(user.companyId) : undefined;
    const companyBanner =
      banner &&
      banner.isVisible &&
      (banner.text || banner.imageStoragePath || banner.imageUri)
        ? {
            text: banner.text,
            backgroundColor: banner.backgroundColor,
            textColor: banner.textColor,
            imageUri: banner.imageUri,
            imageStoragePath: banner.imageStoragePath,
          }
        : null;

    return {
      screenId: "CreateProjectScreen",
      readiness: {
        hasInitialFrame: true,
        hasUsableData: Boolean(user),
        isBackgroundRefreshing: false,
        isNavigationTransitionActive: false,
      },
      continuity: {
        isInitialLoading: false,
        isBackgroundRefreshing: false,
        hasCachedFrame: Boolean(user),
        shouldRenderSkeletonShell: false,
        shouldRenderEmptyState: false,
        freshnessLabel: isSubmitting ? "Submitting" : "Ready",
      },
      access: {
        isAllowed,
        deniedMessage: isAllowed
          ? null
          : t.userManagement.accessDenied || "Access denied. Admin role required.",
      },
      isSubmitting,
      headerTitle: t.projects.createNewProject,
      headerSubtitle: companyBanner?.text || null,
      submitButtonText: t.projects.create,
      canSubmit: isAllowed && !isSubmitting,
      companyBanner,
      rosterCandidates,
    };
  }, [getCompanyBanner, isSubmitting, rosterCandidates, t, user]);

  return {
    output,
    actions: {
      submitProject,
      cancel: () => onNavigateBack(),
    },
  };
}
