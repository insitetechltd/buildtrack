import React from "react";
import { fireEvent, render } from "@testing-library/react-native";

import DeveloperSettingsScreen from "@/screens/DeveloperSettingsScreen";

jest.mock("@/ui/viewAdapters/useDeveloperSettingsViewAdapter", () => ({
  useDeveloperSettingsViewAdapter: jest.fn(),
}));

jest.mock("@/components/StandardHeader", () => ({
  __esModule: true,
  default: function MockStandardHeader({
    title,
    rightElement,
  }: {
    title: string;
    rightElement?: React.ReactNode;
  }) {
    const { View, Text } = require("react-native");

    return (
      <View>
        <Text>{title}</Text>
        {rightElement}
      </View>
    );
  },
}));

jest.mock("@/components/migration/ModernUiMarker", () => ({
  __esModule: true,
  default: function MockModernUiMarker() {
    return null;
  },
}));

jest.mock("@/state/authStore", () => ({
  useAuthStore: () => ({
    user: {
      id: "user-1",
      companyId: "company-1",
      role: "admin",
    },
    logout: jest.fn(),
  }),
}));

jest.mock("@/state/taskStore.supabase", () => ({
  useTaskStore: () => ({
    tasks: [{ id: "task-1" }, { id: "task-2" }],
    fetchTasks: jest.fn().mockResolvedValue(undefined),
  }),
}));

jest.mock("@/state/projectStore.supabase", () => ({
  useProjectStoreWithInit: () => ({
    projects: [{ id: "project-1" }],
    fetchProjects: jest.fn().mockResolvedValue(undefined),
    fetchUserProjectAssignments: jest.fn().mockResolvedValue(undefined),
  }),
}));

jest.mock("@/state/userStore.supabase", () => ({
  useUserStore: () => ({
    users: [{ id: "user-1" }],
    fetchUsers: jest.fn().mockResolvedValue(undefined),
  }),
}));

jest.mock("@/state/companyStore", () => ({
  useCompanyStore: () => ({
    companies: [{ id: "company-1" }],
    fetchCompanies: jest.fn().mockResolvedValue(undefined),
  }),
}));

jest.mock("@/state/projectFilterStore", () => ({
  useProjectFilterStore: () => ({}),
}));

jest.mock("@/state/themeStore", () => ({
  useThemeStore: () => ({
    isDarkMode: false,
  }),
}));

jest.mock("@/state/languageStore", () => ({
  useLanguageStore: () => ({
    language: "en",
  }),
}));

jest.mock("@/state/devToggleStore", () => ({
  useDevToggleStore: () => ({
    uiModernizationMode: "modern",
    toggleUiMode: jest.fn(),
  }),
}));

jest.mock("@/api/supabase", () => ({
  supabase: {},
}));

jest.mock("@/api/storageUploadDiagnostic", () => ({
  runStorageUploadDiagnostic: jest.fn().mockResolvedValue(["ok"]),
}));

jest.mock("@/test-utils/sprint7RuntimeSandbox", () => ({
  initializeSprint7RuntimeSandbox: jest.fn().mockResolvedValue(undefined),
  isSprint7RuntimeSandboxLoaded: jest.fn(() => true),
  loadScenarioAPreset: jest.fn().mockResolvedValue(undefined),
  loadScenarioBPreset: jest.fn().mockResolvedValue(undefined),
  loadScenarioCPreset: jest.fn().mockResolvedValue(undefined),
  switchSprint7RuntimeSandboxActor: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: {
    getAllKeys: jest.fn().mockResolvedValue([]),
    multiRemove: jest.fn().mockResolvedValue(undefined),
    removeItem: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock("@expo/vector-icons", () => ({
  Ionicons: () => null,
}));

jest.mock("expo-status-bar", () => ({
  StatusBar: () => null,
}));

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe("DeveloperSettingsScreen", () => {
  const mockHandleForceSyncAll = jest.fn();
  const mockHandleOpenTaskDetailVerification = jest.fn();
  const mockHandleToggleUiMode = jest.fn();
  const mockHandleScenarioPreset = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    const { useDeveloperSettingsViewAdapter } = require("@/ui/viewAdapters/useDeveloperSettingsViewAdapter");

    useDeveloperSettingsViewAdapter.mockReturnValue({
      output: {
        screenId: "DeveloperSettingsScreen",
        readiness: {
          hasInitialFrame: true,
          hasUsableData: true,
          isBackgroundRefreshing: false,
          isNavigationTransitionActive: false,
        },
        continuity: {
          isInitialLoading: false,
          isBackgroundRefreshing: false,
          hasCachedFrame: true,
          shouldRenderSkeletonShell: false,
          shouldRenderEmptyState: false,
          freshnessLabel: "Ready",
        },
        access: {
          isAuthenticated: true,
        },
        title: "Developer Settings",
        warningTitle: "Developer Tools",
        warningMessage: "These tools are for testing and development. Use with caution!",
        statistics: [
          { id: "tasks", label: "Tasks", count: 2 },
          { id: "projects", label: "Projects", count: 1 },
        ],
        uiMode: {
          currentMode: "modern",
          currentModeLabel: "Modern",
          description: "Long-press to toggle between legacy and modern screens",
        },
        loadingState: {
          isClearing: false,
          isTestingUpload: false,
          isInitializingSprint7Sandbox: false,
        },
        actionGroups: [
          {
            id: "sync",
            title: "Sync Actions",
            actions: [
              {
                id: "force-sync-all",
                actionId: "force-sync-all",
                label: "Force Sync All Data",
                description: "Re-fetch all data from Supabase",
                icon: "sync",
                color: "blue",
                isDisabled: false,
              },
            ],
          },
          {
            id: "screen-verification",
            title: "Screen Verification",
            actions: [
              {
                id: "open-task-detail-verification",
                actionId: "open-task-detail-verification",
                label: "Open Task Detail Verification",
                description: "Open the canonical Task Detail verification route",
                icon: "open-outline",
                color: "purple",
                isDisabled: false,
              },
            ],
          },
          {
            id: "debug",
            title: "Debug Tools",
            actions: [
              {
                id: "initialize-sandbox",
                actionId: "initialize-sprint7-sandbox",
                label: "Initialize Sprint 7 Staging Sandbox",
                description: "Load or switch the canonical Tristan/Herman QA dataset",
                icon: "flask-outline",
                color: "blue",
                isDisabled: false,
              },
            ],
            supplementaryLabel: "Sprint 7 Quick Presets",
          },
        ],
        scenarioPresets: [
          {
            id: "preset-a",
            preset: "A",
            label: "Preset A: Rejection Loop",
            isDisabled: false,
            testID: "developer-settings__preset_a",
          },
        ],
        scenarioPresetHint: null,
        infoMessage:
          "Note: Clearing local data does NOT affect your Supabase database. All data will be re-downloaded when you login again.",
      },
      actions: {
        handleNavigateBack: jest.fn(),
        handleForceSyncAll: mockHandleForceSyncAll,
        handleOpenTaskDetailVerification: mockHandleOpenTaskDetailVerification,
        handleClearTaskCache: jest.fn(),
        handleClearProjectCache: jest.fn(),
        handleClearUserCache: jest.fn(),
        handleViewStorageKeys: jest.fn(),
        handleInitializeSprint7Sandbox: jest.fn(),
        handleToggleUiMode: mockHandleToggleUiMode,
        handleScenarioPresetPress: mockHandleScenarioPreset,
        handleTestUpload: jest.fn(),
        handleClearAllLocalData: jest.fn(),
      },
    });
  });

  it("renders adapter-driven developer sections and delegates force sync through the adapter", () => {
    const screen = render(
      <DeveloperSettingsScreen
        onNavigateBack={jest.fn()}
        onOpenTaskDetailVerification={jest.fn()}
      />,
    );

    expect(screen.getByText("Developer Settings")).toBeTruthy();
    expect(screen.getByText("Sync Actions")).toBeTruthy();
    expect(screen.getByText("Screen Verification")).toBeTruthy();
    expect(screen.getByText("Debug Tools")).toBeTruthy();
    expect(screen.getByText("Open Task Detail Verification")).toBeTruthy();

    fireEvent.press(screen.getByText(/force sync all/i));
    fireEvent.press(screen.getByText(/open task detail verification/i));

    expect(mockHandleForceSyncAll).toHaveBeenCalled();
    expect(mockHandleOpenTaskDetailVerification).toHaveBeenCalled();
  });
});
