import { useAuthStore } from "@/state/authStore";
import { useProjectFilterStore } from "@/state/projectFilterStore";
import { useProjectStore } from "@/state/projectStore.supabase";

export type JourneySeedOptions = {
  authUser?: { id: string; role?: string; companyId?: string } | null;
  selectedProjectId?: string | null;
};

export function seedJourneyState(options: JourneySeedOptions): void {
  const authUser = options.authUser ?? null;
  const resolvedUser = authUser
    ? {
        ...authUser,
        role: authUser.role ?? "worker",
      }
    : null;
  const authenticatedUserId = resolvedUser?.id ?? null;
  const selectedProjectId = options.selectedProjectId ?? null;

  useAuthStore.setState({
    user: resolvedUser as never,
    isAuthenticated: Boolean(resolvedUser),
    isLoading: false,
    isInitialized: true,
    error: null,
    session: null,
  });

  useProjectFilterStore.setState({
    selectedProjectId,
    workspaceReady: !resolvedUser || Boolean(authenticatedUserId),
    workspaceReadyUserId: authenticatedUserId,
    tasksLaunchPreset: null,
  });

  // RequireWorkspaceProjectGate derives membership from userAssignments
  // (projectIdsByUser is rebuilt by syncProjectDerivedState — do not set it alone).
  if (authenticatedUserId && selectedProjectId) {
    const companyId =
      typeof resolvedUser?.companyId === "string" && resolvedUser.companyId
        ? resolvedUser.companyId
        : "company-1";
    useProjectStore.setState({
      projects: [
        {
          id: selectedProjectId,
          name: "Journey Project",
          companyId,
        } as never,
      ],
      userAssignments: [
        {
          userId: authenticatedUserId,
          projectId: selectedProjectId,
          isActive: true,
          category: "worker",
        } as never,
      ],
      projectQueryMeta: {
        "projects:all": { hasFetchedOnce: true } as never,
      },
      assignmentQueryMeta: {
        [`assignments:user:${authenticatedUserId}`]: {
          hasFetchedOnce: true,
        } as never,
      },
      isLoading: false,
      error: null,
    });
  } else {
    useProjectStore.setState({
      projects: [],
      userAssignments: [],
      projectQueryMeta: {},
      assignmentQueryMeta: {},
      isLoading: false,
      error: null,
    });
  }
}
