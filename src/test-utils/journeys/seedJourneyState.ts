import { useAuthStore } from "@/state/authStore";
import { useProjectFilterStore } from "@/state/projectFilterStore";

export type JourneySeedOptions = {
  authUser?: { id: string; role?: string } | null;
  selectedProjectId?: string | null;
  taskIds?: string[];
};

export function seedJourneyState(options: JourneySeedOptions): void {
  const authUser = options.authUser
    ? {
        ...options.authUser,
        role: options.authUser.role ?? "worker",
      }
    : null;

  useAuthStore.setState({
    user: authUser as never,
    isAuthenticated: Boolean(authUser),
    isInitialized: true,
    isLoading: false,
    session: null,
    error: null,
  });

  useProjectFilterStore.setState({
    selectedProjectId: options.selectedProjectId ?? null,
    workspaceReady: true,
    workspaceReadyUserId: authUser?.id ?? null,
  });
}
