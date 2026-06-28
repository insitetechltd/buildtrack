import React from "react";
import { fireEvent, render } from "@testing-library/react-native";

import ReportsScreen from "@/screens/ReportsScreen";

jest.mock(
  "../../ui/viewAdapters/useReportsViewAdapter",
  () => ({
    useReportsViewAdapter: jest.fn(),
  }),
  { virtual: true },
);

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

jest.mock("@/state/authStore", () => ({
  useAuthStore: () => ({
    user: {
      id: "user-1",
      companyId: "company-1",
    },
  }),
}));

jest.mock("@/state/taskStore.supabase", () => ({
  useTaskStore: (selector: (state: { tasks: unknown[] }) => unknown) =>
    selector({ tasks: [] }),
}));

jest.mock("@/state/userStore.supabase", () => ({
  useUserStore: () => ({
    getUserById: jest.fn(),
  }),
}));

jest.mock("@/state/projectStore", () => ({
  useProjectStore: () => ({}),
}));

jest.mock("@/state/projectFilterStore", () => ({
  useProjectFilterStore: () => ({
    selectedProjectId: null,
  }),
}));

jest.mock("@/state/companyStore", () => ({
  useCompanyStore: () => ({
    getCompanyBanner: jest.fn(),
  }),
}));

jest.mock("@/utils/useTranslation", () => ({
  useTranslation: () => ({
    nav: {
      reports: "Reports",
    },
    reports: {
      reportConfiguration: "Report Configuration",
      reportType: "Report Type",
      myTasks: "My Tasks",
      assignedTasks: "Assigned Tasks",
      dateRange: "Date Range",
      from: "From",
      to: "To",
      statisticsOverview: "Statistics Overview",
      totalTasks: "Total Tasks",
      completed: "Completed",
      inProgress: "In Progress",
      overdue: "Overdue",
      avgCompletion: "Avg Completion",
      criticalPriority: "Critical Priority",
      taskPreview: "Task Preview",
      moreTasksInReport: "more tasks in full report",
      noTasksFound: "No tasks found",
      adjustDateRange: "Adjust your date range or report type",
    },
    tasks: {
      tasksPlural: "tasks",
    },
    taskDetail: {
      due: "Due",
    },
    common: {
      done: "Done",
    },
  }),
}));

jest.mock("@/utils/dateFormatter", () => ({
  useDateFormatter: () => ({
    formatDateShort: (value: string | Date) =>
      value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10),
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

jest.mock("@react-native-community/datetimepicker", () => ({
  __esModule: true,
  default: "DateTimePicker",
}));

describe("ReportsScreen", () => {
  const mockSelectReportType = jest.fn();
  const mockGenerateReportSummary = jest.fn();
  const mockOpenFromDatePicker = jest.fn();
  const mockOpenToDatePicker = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    const { useReportsViewAdapter } = require("../../ui/viewAdapters/useReportsViewAdapter");

    useReportsViewAdapter.mockReturnValue({
      output: {
        screenId: "ReportsScreen",
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
        currentReportType: "assigned_tasks",
        reportTypeOptions: [
          {
            id: "reports-type:my_tasks",
            value: "my_tasks",
            label: "My Tasks",
            isSelected: false,
            isVisible: true,
          },
          {
            id: "reports-type:assigned_tasks",
            value: "assigned_tasks",
            label: "Assigned Tasks",
            isSelected: true,
            isVisible: true,
          },
        ],
        dateRange: {
          fromLabel: "From: 2026-05-01",
          toLabel: "To: 2026-06-20",
          from: new Date("2026-05-01T00:00:00.000Z"),
          to: new Date("2026-06-20T00:00:00.000Z"),
          isShowingFromPicker: false,
          isShowingToPicker: false,
        },
        statisticsCards: [
          {
            id: "reports-stat:total",
            label: "Total Tasks",
            value: 1,
            icon: "list-outline",
            color: "bg-blue-50",
            textColor: "text-blue-600",
          },
        ],
        visibleTaskRows: [
          {
            id: "reports-row:task-1",
            taskId: "task-1",
            title: "Punch list",
            statusLabel: "in progress",
            dueDateLabel: "Due: 2026-06-22",
            completionLabel: "60% complete",
            statusTone: "info",
          },
        ],
        totalVisibleTaskCount: 1,
        hiddenTaskCount: 0,
      },
      actions: {
        selectReportType: mockSelectReportType,
        openFromDatePicker: mockOpenFromDatePicker,
        openToDatePicker: mockOpenToDatePicker,
        dismissFromDatePicker: jest.fn(),
        dismissToDatePicker: jest.fn(),
        setFromDate: jest.fn(),
        setToDate: jest.fn(),
        generateReportSummary: mockGenerateReportSummary,
      },
    });
  });

  it("renders report configuration and delegates key controls through the reports adapter", () => {
    const screen = render(<ReportsScreen onNavigateBack={jest.fn()} />);

    expect(screen.getByText("Report Configuration")).toBeTruthy();
    expect(screen.getByText("Assigned Tasks")).toBeTruthy();
    expect(screen.getByText("Punch list")).toBeTruthy();

    fireEvent.press(screen.getByText("My Tasks"));
    fireEvent.press(screen.getByText("From: 2026-05-01"));
    fireEvent.press(screen.getByText("To: 2026-06-20"));
    fireEvent.press(screen.getByText("Done"));

    expect(mockSelectReportType).toHaveBeenCalledWith("my_tasks");
    expect(mockOpenFromDatePicker).toHaveBeenCalledTimes(1);
    expect(mockOpenToDatePicker).toHaveBeenCalledTimes(1);
    expect(mockGenerateReportSummary).toHaveBeenCalledTimes(1);
  });
});
