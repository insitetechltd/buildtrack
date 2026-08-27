import { useCallback, useMemo, useState } from "react";
import { Alert } from "react-native";

import { useAuthStore } from "@/state/authStore";
import { useCompanyStore } from "@/state/companyStore";
import {
  useProjectStore,
  useProjectStoreWithCompanyInit,
} from "@/state/projectStore.supabase";
import { isAdmin, type ProjectStatus } from "@/types/buildtrack";
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
  const { createProject, fetchProjects } = projectStore;
  const { getCompanyBanner } = useCompanyStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitProject = useCallback(
    async (formData: CreateProjectFormSubmission) => {
      if (!user || !isAdmin(user)) {
        return;
      }

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
    [createProject, fetchProjects, onNavigateBack, t, user],
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
    };
  }, [getCompanyBanner, isSubmitting, t, user]);

  return {
    output,
    actions: {
      submitProject,
      cancel: () => onNavigateBack(),
    },
  };
}
