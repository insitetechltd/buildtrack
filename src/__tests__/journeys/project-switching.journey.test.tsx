import React from "react";
import { act, fireEvent, render } from "@testing-library/react-native";

import ProjectPickerScreen from "@/screens/ProjectPickerScreen";

jest.mock("@/ui/viewAdapters/useProjectPickerViewAdapter", () => ({
  useProjectPickerViewAdapter: jest.fn(),
}));

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

describe("project switching journey", () => {
  const mockHandleSelectProject = jest.fn();

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
        selectedProjectId: "project-1",
        isProjectSwitching: false,
        allowBack: true,
        projectItems: [
          {
            id: "project-picker:project-1",
            projectId: "project-1",
            title: "North Tower",
            description: "Concrete package",
            statusLabel: "active",
            isSelected: true,
            density: "standard",
            structuralState: "stale",
          },
          {
            id: "project-picker:project-2",
            projectId: "project-2",
            title: "South Tower",
            description: "Envelope package",
            statusLabel: "active",
            isSelected: false,
            density: "standard",
            structuralState: "stale",
          },
        ],
      },
      actions: {
        handleSelectProject: mockHandleSelectProject,
      },
    });
  });

  it("switches to a new project row through stable row test ids", async () => {
    const onNavigateBack = jest.fn();
    const view = render(<ProjectPickerScreen onNavigateBack={onNavigateBack} allowBack />);

    await act(async () => {
      fireEvent.press(view.getByTestId("projectPicker-project-project-2"));
    });

    expect(mockHandleSelectProject).toHaveBeenCalledWith("project-2");
  });
});
