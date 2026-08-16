import React from "react";
import { render } from "@testing-library/react-native";

import DashboardScreen from "@/screens/DashboardScreen";
import TaskDetailScreen from "@/screens/TaskDetailScreen";
import type { TaskDetailScreenViewAdapterOutput } from "@/ui/contracts/viewAdapters";

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

jest.mock("@/components/taskDetail/TaskDetailHero", () => ({
  __esModule: true,
  default: function MockTaskDetailHero() {
    return null;
  },
}));

jest.mock("@/components/taskDetail/TaskDetailInfoCard", () => ({
  __esModule: true,
  default: function MockTaskDetailInfoCard() {
    return null;
  },
}));

jest.mock("@/components/taskDetail/TaskDetailQuickActions", () => ({
  __esModule: true,
  default: function MockTaskDetailQuickActions() {
    return null;
  },
}));

jest.mock("@/components/taskDetail/TaskActivityTimeline", () => ({
  __esModule: true,
  default: function MockTaskActivityTimeline() {
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

function createTaskDetailOutput(): TaskDetailScreenViewAdapterOutput {
  return {
    screenId: "TaskDetailScreen",
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
      freshnessLabel: "Fresh",
    },
    header: {
      taskId: "task-1",
      title: "Task Details",
      statusLabel: "In Progress",
      projectName: "Project Alpha",
      assigneeSummary: "Alex",
    },
    taskHero: {
      id: "task-hero",
      density: "standard",
      structuralState: "ready",
      title: "Replace ceiling tiles",
      statusLabel: "In Progress",
      categoryLabel: "Interior",
      projectLabel: "Project Alpha",
      completionLabel: "50% complete",
      dueDateLabel: "Jul 10, 2026",
      isCritical: false,
    },
    delegationSummary: {
      id: "delegation-summary",
      density: "standard",
      structuralState: "ready",
      assignedByLabel: "Casey",
      assignedToLabel: "Alex",
      primaryOwnerLabel: "Alex",
      teamSummaryLabel: "1 assignee",
    },
    infoCard: null,
    quickActions: undefined,
    activeStage: {
      id: "active-stage",
      density: "standard",
      structuralState: "ready",
      stageMode: "no_photo",
      title: "Added status note",
      summary: "Waiting on supplier confirmation.",
      actorLabel: "Alex",
      timestampLabel: "Jul 5, 09:30",
      photos: [],
    },
    evidenceSummary: {
      id: "evidence-summary",
      density: "standard",
      structuralState: "ready",
      latestPhotoUrls: [],
      totalPhotoCount: 0,
      emptyLabel: "No photo evidence yet.",
    },
    activityThread: [],
    subtaskSummary: {
      id: "subtask-summary",
      density: "standard",
      structuralState: "ready",
      title: "Subtasks",
      totalCount: 0,
    },
    detailSections: [],
    actionItems: [],
    scalarMetrics: {
      attachmentCount: 0,
      updateCount: 0,
      childTaskCount: 0,
      completionPercentage: 50,
    },
    banners: [],
    activities: [],
    assigners: [],
    assignees: [],
    childTasks: [],
    canEditDelegation: true,
  };
}

describe("ModernUiMarker", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    const { useDashboardViewAdapter } = require("@/ui/viewAdapters/useDashboardViewAdapter");
    const { useTaskDetailViewAdapter } = require("@/ui/viewAdapters/useTaskDetailViewAdapter");

    useDashboardViewAdapter.mockReturnValue({
      output: {
        activeProject: null,
        projectSummaryCard: null,
        queueDashboard: { groups: [] },
        summaryPills: [],
        draftItems: [],
        activityItems: [],
        taskShortcut: null,
      },
      visibility: {
        showCreateTaskFab: false,
        showProfileShortcut: false,
        showProjectPickerShortcut: false,
        showDeveloperSettingsShortcut: false,
      },
    });

    useTaskDetailViewAdapter.mockReturnValue({
      output: createTaskDetailOutput(),
      actions: {
        acceptTask: jest.fn(),
        declineTask: jest.fn(),
        submitForReview: jest.fn(),
        approveTask: jest.fn(),
        toggleCriticalThisWeek: jest.fn(),
      },
    });
  });

  it("does not render the deprecated Modern UI marker on modern screens", () => {
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

    expect(dashboardScreen.getByText("Recent Activity")).toBeTruthy();
    expect(dashboardScreen.queryByText("Modern UI")).toBeNull();

    // BrandHeaderTitle uppercases the label ("Task Details" → "TASK DETAILS")
    expect(taskDetailScreen.getByTestId("task-detail__header_title")).toBeTruthy();
    expect(taskDetailScreen.getByText("TASK DETAILS")).toBeTruthy();
    expect(taskDetailScreen.queryByText("Modern UI")).toBeNull();
  });
});
