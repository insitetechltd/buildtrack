import { renderHook, act } from "@testing-library/react-native";
import { Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { useDeveloperSettingsViewAdapter } from "../useDeveloperSettingsViewAdapter";

const mockFetchTasks = jest.fn().mockResolvedValue(undefined);
const mockFetchProjects = jest.fn().mockResolvedValue(undefined);
const mockFetchUserProjectAssignments = jest.fn().mockResolvedValue(undefined);
const mockFetchUsers = jest.fn().mockResolvedValue(undefined);
const mockFetchCompanies = jest.fn().mockResolvedValue(undefined);
const mockLogout = jest.fn();

jest.mock("@/state/authStore", () => ({
  useAuthStore: () => ({
    user: {
      id: "user-1",
      companyId: "company-1",
      role: "admin",
    },
    logout: mockLogout,
  }),
}));

jest.mock("@/state/taskStore.supabase", () => ({
  useTaskStore: () => ({
    tasks: [{ id: "8b55cb26-8af8-4f65-a4b5-5a8d0ff5a001" }],
    fetchTasks: mockFetchTasks,
  }),
}));

jest.mock("@/state/projectStore.supabase", () => ({
  useProjectStoreWithInit: () => ({
    projects: [{ id: "project-1" }],
    fetchProjects: mockFetchProjects,
    fetchUserProjectAssignments: mockFetchUserProjectAssignments,
  }),
}));

jest.mock("@/state/userStore.supabase", () => ({
  useUserStore: () => ({
    users: [{ id: "user-1" }],
    fetchUsers: mockFetchUsers,
  }),
}));

jest.mock("@/state/companyStore", () => ({
  useCompanyStore: () => ({
    companies: [{ id: "company-1" }],
    fetchCompanies: mockFetchCompanies,
  }),
}));

jest.mock("@/api/storageUploadDiagnostic", () => ({
  runStorageUploadDiagnostic: jest.fn().mockResolvedValue(["ok"]),
}));

jest.mock("@/api/supabase", () => ({
  supabase: {},
}));

jest.mock("@/test-utils/sprint7RuntimeSandbox", () => ({
  initializeSprint7RuntimeSandbox: jest.fn().mockResolvedValue(undefined),
  isSprint7RuntimeSandboxLoaded: jest.fn(() => false),
  loadScenarioAPreset: jest.fn().mockResolvedValue(undefined),
  loadScenarioBPreset: jest.fn().mockResolvedValue(undefined),
  loadScenarioCPreset: jest.fn().mockResolvedValue(undefined),
  switchSprint7RuntimeSandboxActor: jest.fn().mockResolvedValue(undefined),
}));

describe("useDeveloperSettingsViewAdapter", () => {
  const mockAlert = jest.spyOn(Alert, "alert");
  const mockRemoveItem = AsyncStorage.removeItem as jest.MockedFunction<
    typeof AsyncStorage.removeItem
  >;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("clears the Sprint 7 task cache key", async () => {
    const { result } = renderHook(() =>
      useDeveloperSettingsViewAdapter({
        onNavigateBack: jest.fn(),
        onOpenTaskDetailVerification: jest.fn(),
      }),
    );

    result.current.actions.handleClearTaskCache();

    const buttons = mockAlert.mock.calls[0]?.[2] ?? [];
    const clearButton = buttons.find((button: { text: string }) => button.text === "Clear");

    await act(async () => {
      await clearButton?.onPress?.();
    });

    expect(mockRemoveItem).toHaveBeenCalledWith("insite-tasks-supabase-v1");
    expect(mockFetchTasks).toHaveBeenCalled();
  });

  it("clears the Sprint 7 user cache key", async () => {
    const { result } = renderHook(() =>
      useDeveloperSettingsViewAdapter({
        onNavigateBack: jest.fn(),
        onOpenTaskDetailVerification: jest.fn(),
      }),
    );

    result.current.actions.handleClearUserCache();

    const buttons = mockAlert.mock.calls[0]?.[2] ?? [];
    const clearButton = buttons.find((button: { text: string }) => button.text === "Clear");

    await act(async () => {
      await clearButton?.onPress?.();
    });

    expect(mockRemoveItem).toHaveBeenCalledWith("insite-users-supabase-v1");
    expect(mockFetchUsers).toHaveBeenCalled();
  });

  it("exposes a screen verification launcher and delegates launching through the adapter action", () => {
    const onOpenTaskDetailVerification = jest.fn();
    const { result } = renderHook(() =>
      useDeveloperSettingsViewAdapter({
        onNavigateBack: jest.fn(),
        onOpenTaskDetailVerification,
      } as any),
    );

    expect(
      result.current.output.actionGroups.some(
        (group) =>
          group.title === "Screen Verification" &&
          group.actions.some(
            (action) => action.label === "Open Task Detail Verification",
          ),
      ),
    ).toBe(true);

    act(() => {
      (result.current.actions as any).handleOpenTaskDetailVerification();
    });

    expect(onOpenTaskDetailVerification).toHaveBeenCalledWith(
      "8b55cb26-8af8-4f65-a4b5-5a8d0ff5a001",
    );
  });
});
