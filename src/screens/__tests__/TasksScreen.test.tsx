import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import TasksScreen from "../TasksScreen";
import type { TasksScreenViewAdapterOutput } from "@/ui/contracts/viewAdapters";

jest.mock("@/ui/viewAdapters/useTasksViewAdapter", () => {
  const React = require("react");
  const baseOutput: TasksScreenViewAdapterOutput = {
    screenId: "TasksScreen",
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
    filterSummary: {
      selectedProjectId: null,
      sectionFilterLabel: "All",
      statusFilterLabel: "All",
      sortLabel: "Default",
    },
    taskRowItems: [
      {
        id: "row-1",
        taskId: "task-1",
        title: "Install guardrails",
        statusToken: "task_in_progress",
        statusLabel: "In progress",
        responsibilityToken: "OTHER_OPEN",
        priorityLabel: "High",
        dueDateLabel: "Tomorrow",
        assigneeSummary: "Sam",
        projectName: "North Tower",
        isOverdue: false,
        density: "standard",
        structuralState: "stale",
      },
      {
        id: "row-2",
        taskId: "task-2",
        title: "Verify anchor points",
        statusToken: "task_new",
        statusLabel: "New",
        responsibilityToken: "ACTION_REQUIRED",
        priorityLabel: "Critical",
        dueDateLabel: "Today",
        assigneeSummary: "Alex",
        projectName: "North Tower",
        isOverdue: false,
        density: "standard",
        structuralState: "stale",
      },
    ],
    scalarMetrics: {
      totalVisibleTaskCount: 2,
      overdueVisibleTaskCount: 0,
      selectedProjectTaskCount: 2,
      hasActiveFilters: false,
    },
  };

  const useTasksViewAdapter = () => {
    const [searchQuery, setSearchQuery] = React.useState("");
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const filtered =
      normalizedQuery.length === 0
        ? baseOutput.taskRowItems
        : baseOutput.taskRowItems.filter((row) =>
            row.title.toLowerCase().includes(normalizedQuery),
          );

    return {
      output: {
        ...baseOutput,
        taskRowItems: filtered,
        scalarMetrics: {
          ...baseOutput.scalarMetrics,
          totalVisibleTaskCount: filtered.length,
          selectedProjectTaskCount: filtered.length,
        },
      },
      searchQuery,
      setSearchQuery,
      searchInput: {
        id: "tasks-search",
        label: "Search",
        value: searchQuery,
        placeholder: "Search tasks",
        density: "standard",
        structuralState: "stale",
      },
      visibility: {
        showCreateTaskFab: true,
        showProfileShortcut: true,
        showProjectPickerShortcut: true,
        showDeveloperSettingsShortcut: true,
        showResetFiltersShortcut: true,
      },
      actions: {
        resetFilters: () => {
          setSearchQuery("");
        },
      },
    };
  };

  return { useTasksViewAdapter };
});

describe("TasksScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders global actions (header shortcuts + create task FAB) and filters list without breaking virtualization", () => {
    const onNavigateToCreateTask = jest.fn();
    const onNavigateToProfile = jest.fn();
    const onNavigateToProjectPicker = jest.fn();
    const onNavigateToDeveloperSettings = jest.fn();

    const screen = render(
      <TasksScreen
        onNavigateToTaskDetail={jest.fn()}
        onNavigateToCreateTask={onNavigateToCreateTask}
        onNavigateBack={jest.fn()}
        onNavigateToProfile={onNavigateToProfile}
        onNavigateToProjectPicker={onNavigateToProjectPicker}
        onNavigateToDeveloperSettings={onNavigateToDeveloperSettings}
      />,
    );

    expect(screen.getByTestId("container-card:task-1")).toBeTruthy();
    expect(screen.getByTestId("container-card:task-2")).toBeTruthy();
    expect(screen.getByTestId("tasks-screen__list")).toBeTruthy();

    fireEvent.press(screen.getByTestId("tasks-screen__fab_create_task"));
    expect(onNavigateToCreateTask).toHaveBeenCalledTimes(1);

    fireEvent.press(screen.getByTestId("tasks-screen__header_profile"));
    expect(onNavigateToProfile).toHaveBeenCalledTimes(1);

    fireEvent.press(screen.getByTestId("tasks-screen__header_project_picker"));
    expect(onNavigateToProjectPicker).toHaveBeenCalledTimes(1);

    fireEvent.press(screen.getByTestId("tasks-screen__header_developer_settings"));
    expect(onNavigateToDeveloperSettings).toHaveBeenCalledTimes(1);

    const input = screen.getByTestId("text-field:tasks-search__input");
    fireEvent.changeText(input, "guardrails");

    expect(screen.getByTestId("tasks-screen__list")).toBeTruthy();
    expect(screen.getByTestId("container-card:task-1")).toBeTruthy();
    expect(screen.queryByTestId("container-card:task-2")).toBeNull();

    fireEvent.press(screen.getByTestId("tasks-screen__header_reset_filters"));
    expect(screen.getByTestId("tasks-screen__list")).toBeTruthy();
    expect(screen.getByTestId("container-card:task-1")).toBeTruthy();
    expect(screen.getByTestId("container-card:task-2")).toBeTruthy();
  });
});
