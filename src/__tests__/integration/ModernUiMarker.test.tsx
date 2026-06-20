import React from "react";
import { render } from "@testing-library/react-native";

import DashboardScreen from "@/screens/DashboardScreen";
import TaskDetailScreen from "@/screens/TaskDetailScreen";

jest.mock("@/ui/viewAdapters/useDashboardViewAdapter", () => ({
  useDashboardViewAdapter: jest.fn(),
}));

jest.mock("@/ui/viewAdapters/useTaskDetailViewAdapter", () => ({
  useTaskDetailViewAdapter: jest.fn(),
}));

jest.mock("@/state/projectFilterStore", () => ({
  useProjectFilterStore: () => ({
    sectionFilter: "all",
    setSectionFilter: jest.fn(),
    setStatusFilter: jest.fn(),
    setButtonLabel: jest.fn(),
  }),
}));

jest.mock("@/state/authStore", () => ({
  useAuthStore: () => ({
    user: {
      id: "user-1",
      name: "Alex",
      companyId: "company-1",
    },
  }),
}));

jest.mock("@/state/companyStore", () => ({
  useCompanyStore: () => ({
    getCompanyBanner: () => null,
  }),
}));

jest.mock("@/state/themeStore", () => ({
  useThemeStore: () => ({
    isDarkMode: false,
  }),
}));

jest.mock("@/utils/useTranslation", () => ({
  useTranslation: () => ({
    common: {},
  }),
}));

jest.mock("@/api/supabase", () => ({
  checkSupabaseConnection: jest.fn(() => new Promise(() => {})),
}));

jest.mock("@/utils/environmentDetector", () => ({
  detectEnvironment: () => ({ environment: "test" }),
  getEnvironmentStyles: () => ({}),
}));

jest.mock("@/components/ProfileMenu", () => ({
  __esModule: true,
  default: function MockProfileMenu() {
    return null;
  },
}));

jest.mock("@/components/primitives/container/ContainerCard", () => ({
  __esModule: true,
  default: function MockContainerCard({ contract }: { contract: { title?: string } }) {
    const React = require("react");
    const { Text } = require("react-native");

    return React.createElement(Text, null, contract.title ?? "Container card");
  },
}));

jest.mock("@/components/TaskCard", () => ({
  __esModule: true,
  default: function MockTaskCard() {
    return null;
  },
}));

jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({
    getParent: () => ({
      navigate: jest.fn(),
    }),
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
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

describe("ModernUiMarker", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    const { useDashboardViewAdapter } = require("@/ui/viewAdapters/useDashboardViewAdapter");
    const { useTaskDetailViewAdapter } = require("@/ui/viewAdapters/useTaskDetailViewAdapter");

    useDashboardViewAdapter.mockReturnValue({
      output: {
        projectSummaryItems: [
          {
            id: "project-summary-1",
            projectId: "project-1",
            title: "North Tower",
            subtitle: "Package A",
            statusToken: "project_active",
            statusLabel: "Active",
            openTaskCount: 1,
            overdueTaskCount: 0,
            density: "standard",
            structuralState: "stable",
          },
        ],
        scalarMetrics: {
          inboxNewCount: 1,
          inboxNewOverdueCount: 0,
          inboxWipCount: 2,
          inboxWipOverdueCount: 0,
          inboxReviewingCount: 0,
          inboxReviewingOverdueCount: 0,
          outboxNewCount: 0,
          outboxNewOverdueCount: 0,
          outboxWipCount: 0,
          outboxWipOverdueCount: 0,
          outboxReviewingCount: 0,
          outboxReviewingOverdueCount: 0,
        },
      },
      visibility: {
        showCreateTaskFab: false,
        showProfileShortcut: false,
        showProjectPickerShortcut: false,
        showDeveloperSettingsShortcut: false,
      },
    });

    useTaskDetailViewAdapter.mockReturnValue({
      output: {
        readiness: {
          hasUsableData: true,
        },
        header: {
          title: "Task Details",
        },
        banners: [],
        detailSections: [],
        assigners: [],
        assignees: [],
        activities: [],
        childTasks: [],
        actionItems: [],
      },
      actions: {
        acceptTask: jest.fn(),
        declineTask: jest.fn(),
        submitForReview: jest.fn(),
        approveTask: jest.fn(),
      },
    });
  });

  it("renders the shared marker in custom-header and StandardHeader-based modern screens", () => {
    const dashboardScreen = render(
      <DashboardScreen
        onNavigateToTasks={jest.fn()}
        onNavigateToCreateTask={jest.fn()}
        onNavigateToProfile={jest.fn()}
      />,
    );

    const taskDetailScreen = render(
      <TaskDetailScreen
        taskId="task-1"
        onNavigateBack={jest.fn()}
      />,
    );

    expect(dashboardScreen.getByText("Modern UI")).toBeTruthy();
    expect(taskDetailScreen.getByText("Modern UI")).toBeTruthy();
  });
});
