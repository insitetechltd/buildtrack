import React from "react";
import { fireEvent, render } from "@testing-library/react-native";

import DashboardScreen from "@/screens/DashboardScreen";
import { useDashboardViewAdapter } from "@/ui/viewAdapters/useDashboardViewAdapter";

jest.mock("@/ui/viewAdapters/useDashboardViewAdapter");
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
        summaryPills: [
          { id: "pill-open", label: "Open", value: "12" },
        ],
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
        taskShortcut: {
          title: "All Tasks",
          subtitle: "North Tower",
          countLabel: "12 active",
        },
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

    expect(screen.getAllByText("Recent Activity")).toHaveLength(2);
    expect(screen.getByText("All Tasks")).toBeTruthy();
    expect(screen.queryByText("Tasks For Me")).toBeNull();
    expect(screen.queryByText("Tasks From Me")).toBeNull();

    fireEvent.press(screen.getByText("All Tasks"));
    expect(onNavigateToTasks).toHaveBeenCalledTimes(1);

    fireEvent.press(screen.getByTestId("dashboard-screen__header_project_picker"));
    expect(onNavigateToProjectPicker).toHaveBeenCalledWith(true);

    fireEvent.press(screen.getByTestId("dashboard-screen__fab_open_camera"));
    expect(onNavigateToCreateTask).toHaveBeenCalledTimes(1);
  });

  it("shows a selection prompt when no active project is set", () => {
    mockUseDashboardViewAdapter.mockReturnValue({
      output: {
        activeProject: null,
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

    expect(screen.getByText("Select a project to see task shortcuts and recent activity.")).toBeTruthy();
    expect(screen.getByText("Select a project to view recent activity.")).toBeTruthy();
  });
});
