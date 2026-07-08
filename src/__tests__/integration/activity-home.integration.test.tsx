import React from "react";
import { fireEvent, render } from "@testing-library/react-native";

import DashboardScreen from "@/screens/DashboardScreen";
import { useDashboardViewAdapter } from "@/ui/viewAdapters/useDashboardViewAdapter";

jest.mock("@/ui/viewAdapters/useDashboardViewAdapter");
jest.mock("@/components/AppScreenHeader", () => {
  const React = require("react");
  const { Pressable, Text, View } = require("react-native");

  return function MockAppScreenHeader({
    title,
    rightSlot,
    className,
  }: {
    title: string;
    rightSlot?: React.ReactNode;
    className?: string;
  }) {
    return (
      <View testID="app-screen-header__root" className={className}>
        <Text>{title}</Text>
        {rightSlot}
        <Pressable testID="app-screen-header__profile-trigger">
          <Text>Profile</Text>
        </Pressable>
      </View>
    );
  };
});
jest.mock("@/state/projectFilterStore", () => ({
  useProjectFilterStore: () => ({
    setSectionFilter: jest.fn(),
    setStatusFilter: jest.fn(),
    setButtonLabel: jest.fn(),
  }),
}));
jest.mock("@/components/primitives/container/ContainerCard", () => {
  return function MockContainerCard() {
    return null;
  };
});

const mockUseDashboardViewAdapter = useDashboardViewAdapter as jest.Mock;

describe("Activity home integration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows the approved Activity home for the active project", async () => {
    mockUseDashboardViewAdapter.mockReturnValue({
      output: {
        activeProject: {
          id: "project-1",
          title: "North Tower",
          subtitle: "Level 12",
        },
        projectSummaryCard: {
          title: "North Tower",
          todayLabel: "Saturday · Jul 4",
          elapsedDayLabel: "Day 185",
          weatherIconLabel: "☁️",
          weatherTemperatureLabel: "28°C",
          criticalDates: [
            {
              id: "critical-date-1",
              dateLabel: "Jul 7",
              title: "Concrete inspection",
              subtitle: "Submitted For Review · Critical",
            },
          ],
        },
        queueDashboard: {
          groups: [
            {
              id: "group-my",
              title: "My Queue",
              cells: [
                { id: "my-new", queue: "my_queue", bucket: "new", title: "New", countLabel: "4" },
                { id: "my-wip", queue: "my_queue", bucket: "wip", title: "Doing", countLabel: "3" },
                { id: "my-review", queue: "my_queue", bucket: "review", title: "Review", countLabel: "1" },
              ],
            },
            {
              id: "group-team",
              title: "Team Queue",
              cells: [
                { id: "team-new", queue: "team_queue", bucket: "new", title: "New", countLabel: "2" },
                { id: "team-wip", queue: "team_queue", bucket: "wip", title: "Doing", countLabel: "5" },
                { id: "team-review", queue: "team_queue", bucket: "review", title: "Review", countLabel: "2" },
              ],
            },
          ],
        },
        summaryPills: [],
        draftItems: [],
        activityItems: [
          {
            id: "activity-1",
            taskId: "task-1",
            title: "Concrete pour",
            subtitle: "North Tower",
            timestampLabel: "Just now",
            statusLabel: "In Progress",
          },
        ],
        taskShortcut: null,
      },
      visibility: {
        showProjectPickerShortcut: true,
        showProfileShortcut: true,
        showDeveloperSettingsShortcut: false,
        showCreateTaskFab: true,
      },
    });

    const onNavigateToTasks = jest.fn();
    const onNavigateToCreateTask = jest.fn();
    const onNavigateToProjectPicker = jest.fn();

    const screen = render(
      <DashboardScreen
        onNavigateToTasks={onNavigateToTasks}
        onNavigateToCreateTask={onNavigateToCreateTask}
        onNavigateToProfile={jest.fn()}
        onNavigateToTaskDetail={jest.fn()}
        onNavigateToProjectPicker={onNavigateToProjectPicker}
      />,
    );

    expect(screen.getByTestId("dashboard-screen__project_summary_section")).toBeTruthy();
    expect(screen.getAllByText("North Tower").length).toBeGreaterThan(0);
    expect(screen.getByText("Saturday · Jul 4 · Day 185 · ☁️ 28°C")).toBeTruthy();
    expect(screen.queryByText("Partly Cloudy")).toBeNull();
    expect(screen.getByTestId("app-screen-header__profile-trigger")).toBeTruthy();
    expect(screen.getByTestId("app-screen-header__root").props.className).toContain("pb-2");
    expect(screen.getByText("This Week's Critical Dates")).toBeTruthy();
    expect(screen.getByText("Queue Overview")).toBeTruthy();
    expect(screen.getByText("My Queue")).toBeTruthy();
    expect(screen.getByText("Team Queue")).toBeTruthy();
    expect(screen.getByText("Concrete pour")).toBeTruthy();
    expect(screen.queryByTestId("dashboard-screen__fab_open_camera")).toBeNull();

    fireEvent.press(screen.getByTestId("dashboard-screen__queue_cell_my_queue_new"));
    expect(onNavigateToTasks).toHaveBeenCalledWith({
      launchQueue: "my_queue",
      launchBucket: "new",
      launchSource: "activity_dashboard",
    });
    expect(onNavigateToProjectPicker).not.toHaveBeenCalled();
    expect(onNavigateToCreateTask).not.toHaveBeenCalled();
  });

  it("shows a selection prompt when no active project is set", () => {
    mockUseDashboardViewAdapter.mockReturnValue({
      output: {
        activeProject: null,
        projectSummaryCard: null,
        queueDashboard: {
          groups: [],
        },
        summaryPills: [],
        draftItems: [],
        activityItems: [],
        taskShortcut: null,
      },
      visibility: {
        showProjectPickerShortcut: true,
        showProfileShortcut: true,
        showDeveloperSettingsShortcut: false,
        showCreateTaskFab: true,
      },
    });

    const screen = render(
      <DashboardScreen
        onNavigateToTasks={jest.fn()}
        onNavigateToCreateTask={jest.fn()}
        onNavigateToProfile={jest.fn()}
        onNavigateToTaskDetail={jest.fn()}
        onNavigateToProjectPicker={jest.fn()}
      />,
    );

    expect(
      screen.getByText("Select a project to view the active project summary and queue overview."),
    ).toBeTruthy();
    expect(screen.getByText("Select a project to view recent activity.")).toBeTruthy();
  });
});
