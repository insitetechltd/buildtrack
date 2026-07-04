import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import DashboardScreen from "../../../src/screens/DashboardScreen";
import { useDashboardViewAdapter } from "../../../src/ui/viewAdapters/useDashboardViewAdapter";

// Mock the view adapter
jest.mock("../../../src/ui/viewAdapters/useDashboardViewAdapter");
const mockUseDashboardViewAdapter = useDashboardViewAdapter as jest.Mock;

// Mock child components that might complain about missing Context or Navigation
jest.mock("../../../src/components/primitives/container/ContainerCard", () => {
  return function MockContainerCard() {
    return <></>;
  };
});

describe("DashboardScreen Interactions", () => {
  let mockOnNavigateToTasks: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockOnNavigateToTasks = jest.fn();

    mockUseDashboardViewAdapter.mockReturnValue({
      output: {
        activeProject: {
          id: "project-1",
          title: "North Tower",
          subtitle: "Site A",
        },
        projectSummaryCard: {
          title: "North Tower",
          todayLabel: "Today · Jul 4",
          elapsedDayLabel: "Day 185",
          weatherLabel: "Partly Cloudy",
          weatherTemperatureLabel: "28°C",
          criticalDates: [],
        },
        queueDashboard: {
          groups: [
            {
              id: "group-my",
              title: "My Queue",
              cells: [
                { id: "my-new", queue: "my_queue", bucket: "new", title: "New", countLabel: "5" },
                { id: "my-wip", queue: "my_queue", bucket: "wip", title: "Doing", countLabel: "3" },
                { id: "my-review", queue: "my_queue", bucket: "review", title: "Review", countLabel: "2" },
              ],
            },
            {
              id: "group-team",
              title: "Team Queue",
              cells: [
                { id: "team-new", queue: "team_queue", bucket: "new", title: "New", countLabel: "4" },
                { id: "team-wip", queue: "team_queue", bucket: "wip", title: "Doing", countLabel: "1" },
                { id: "team-review", queue: "team_queue", bucket: "review", title: "Review", countLabel: "2" },
              ],
            },
          ],
        },
        summaryPills: [],
        draftItems: [],
        activityItems: [],
        taskShortcut: null,
        projectSummaryItems: [],
        highlightedTaskItems: [],
        quickActionItems: [],
        scalarMetrics: {
          openTaskCount: 0,
          overdueTaskCount: 0,
          projectCount: 1,
          hasSelectedProject: true,
          actionRequiredCount: 0,
          inProgressSentCount: 0,
          awaitingApprovalCount: 0,
          actionRequiredOverdueCount: 0,
          inProgressSentOverdueCount: 0,
          awaitingApprovalOverdueCount: 0,
          inboxNewCount: 0,
          inboxNewOverdueCount: 0,
          inboxWipCount: 0,
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
        showProjectPickerShortcut: true,
        showProfileShortcut: true,
        showDeveloperSettingsShortcut: false,
        showCreateTaskFab: false,
      },
    });
  });

  it("navigates to Tasks with the selected My Queue bucket", () => {
    const { getByTestId } = render(
      <DashboardScreen
        onNavigateToTasks={mockOnNavigateToTasks}
        onNavigateToCreateTask={jest.fn()}
        onNavigateToProfile={jest.fn()}
      />
    );

    fireEvent.press(getByTestId("dashboard-screen__queue_cell_my_queue_new"));

    expect(mockOnNavigateToTasks).toHaveBeenCalledWith({
      launchQueue: "my_queue",
      launchBucket: "new",
      launchSource: "activity_dashboard",
    });
  });

  it("navigates to Tasks with the selected Team Queue bucket", () => {
    const { getByTestId } = render(
      <DashboardScreen
        onNavigateToTasks={mockOnNavigateToTasks}
        onNavigateToCreateTask={jest.fn()}
        onNavigateToProfile={jest.fn()}
      />
    );

    fireEvent.press(getByTestId("dashboard-screen__queue_cell_team_queue_review"));

    expect(mockOnNavigateToTasks).toHaveBeenCalledWith({
      launchQueue: "team_queue",
      launchBucket: "review",
      launchSource: "activity_dashboard",
    });
  });
});
