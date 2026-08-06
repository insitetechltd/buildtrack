import { useAuthStore } from "@/state/authStore";
import { useProjectFilterStore } from "@/state/projectFilterStore";

export type JourneySeedOptions = {
  authUser?: { id: string; role?: string } | null;
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

  useAuthStore.setState({
    user: resolvedUser as never,
    isAuthenticated: Boolean(resolvedUser),
    isLoading: false,
    isInitialized: true,
    error: null,
    session: null,
  });

  useProjectFilterStore.setState({
    selectedProjectId: options.selectedProjectId ?? null,
    workspaceReady: !resolvedUser || Boolean(authenticatedUserId),
    workspaceReadyUserId: authenticatedUserId,
    tasksLaunchPreset: null,
  });
}
