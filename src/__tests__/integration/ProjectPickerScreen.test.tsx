import React from "react";
import { fireEvent, render } from "@testing-library/react-native";

import ProjectPickerScreen from "@/screens/ProjectPickerScreen";

jest.mock(
  "@/ui/viewAdapters/useProjectPickerViewAdapter",
  () => ({
    useProjectPickerViewAdapter: jest.fn(),
  }),
);

jest.mock("@/components/StandardHeader", () => ({
  __esModule: true,
  default: function MockStandardHeader({
    title,
  }: {
    title: string;
  }) {
    const { Text } = require("react-native");

    return <Text>{title}</Text>;
  },
}));

jest.mock("@/state/authStore", () => ({
  useAuthStore: () => ({
    user: {
      id: "user-1",
      companyId: "company-1",
    },
  }),
}));

jest.mock("@/state/projectStore.supabase", () => ({
  useProjectStoreWithInit: () => ({
    getProjectsByUser: () => [
      {
        id: "project-1",
        name: "North Tower",
        description: "Concrete package",
        status: "active",
      },
    ],
    fetchProjects: jest.fn().mockResolvedValue(undefined),
    fetchUserProjectAssignments: jest.fn().mockResolvedValue(undefined),
    isLoading: false,
  }),
}));

jest.mock("@/state/projectFilterStore", () => ({
  useProjectFilterStore: () => ({
    selectedProjectId: "project-2",
    setSelectedProject: jest.fn().mockResolvedValue(undefined),
  }),
}));

jest.mock("@/state/taskStore.supabase", () => ({
  useTaskStore: () => ({
    fetchTasks: jest.fn().mockResolvedValue(undefined),
  }),
}));

jest.mock("@/state/userStore.supabase", () => ({
  useUserStore: () => ({
    fetchUsers: jest.fn().mockResolvedValue(undefined),
  }),
}));

jest.mock("@/state/themeStore", () => ({
  useThemeStore: () => ({
    isDarkMode: false,
  }),
}));

jest.mock("@/utils/useTranslation", () => ({
  useTranslation: () => ({
    projects: {
      selectProject: "Select Project",
      yourProjects: "Your Projects",
      noProjectsAvailable: "No projects available",
      noProjectsMessage: "Projects will appear here once available.",
    },
  }),
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

describe("ProjectPickerScreen", () => {
  const mockHandleSelect = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    const { useProjectPickerViewAdapter } = require("@/ui/viewAdapters/useProjectPickerViewAdapter");

    useProjectPickerViewAdapter.mockReturnValue({
      output: {
        screenId: "ProjectPickerScreen",
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
        selectedProjectId: "project-2",
        isProjectSwitching: false,
        allowBack: true,
        projectItems: [
          {
            id: "project-picker:project-1",
            projectId: "project-1",
            title: "North Tower",
            description: "Concrete package",
            statusLabel: "On-going",
            isSelected: false,
            density: "standard",
            structuralState: "stale",
          },
        ],
      },
      actions: {
        handleSelectProject: mockHandleSelect,
      },
    });
  });

  it("renders the project list and delegates selection through the adapter", () => {
    const screen = render(<ProjectPickerScreen onNavigateBack={jest.fn()} />);

    expect(screen.getByText("Select Project")).toBeTruthy();
    expect(screen.getByText("North Tower")).toBeTruthy();

    fireEvent.press(screen.getByTestId("project-picker__row-project-1"));

    expect(mockHandleSelect).toHaveBeenCalledWith("project-1");
  });
});
