import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import TasksScreen from "../TasksScreen";
import type { TasksScreenViewAdapterOutput } from "@/ui/contracts/viewAdapters";

jest.mock("@/ui/viewAdapters/useTasksViewAdapter", () => {
  const React = require("react");
  let overrideOutput: Partial<TasksScreenViewAdapterOutput> | null = null;
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
        attachmentUris: [],
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
        attachmentUris: [],
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
    const [collapsedSectionIds, setCollapsedSectionIds] = React.useState<string[]>([]);
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const filtered =
      normalizedQuery.length === 0
        ? baseOutput.taskRowItems
        : baseOutput.taskRowItems.filter((row) =>
            row.title.toLowerCase().includes(normalizedQuery),
          );

    const compactSections = [
      {
        id: "section-project-1-uncontainered",
        projectId: "project-1",
        title: "Uncontained Tasks",
        taskCountLabel: "1 task",
        isCollapsed: collapsedSectionIds.includes("section-project-1-uncontainered"),
        rows: filtered.filter((row) => row.taskId === "task-1"),
      },
      {
        id: "section-project-1-level-12",
        projectId: "project-1",
        title: "Level 12",
        subtitle: "Container",
        taskCountLabel: "1 task",
        isCollapsed: collapsedSectionIds.includes("section-project-1-level-12"),
        rows: filtered.filter((row) => row.taskId === "task-2"),
      },
    ];

    if (overrideOutput) {
      return {
        output: {
          ...baseOutput,
          ...overrideOutput,
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
          toggleSection: jest.fn(),
        },
      };
    }

    return {
      output: {
        ...baseOutput,
        compactSections,
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
        toggleSection: (sectionId: string) => {
          setCollapsedSectionIds((current) =>
            current.includes(sectionId)
              ? current.filter((id) => id !== sectionId)
              : [...current, sectionId],
          );
        },
      },
    };
  };

  const __setTasksScreenOverride = (value: Partial<TasksScreenViewAdapterOutput> | null) => {
    overrideOutput = value;
  };

  return { useTasksViewAdapter, __setTasksScreenOverride };
});

describe("TasksScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const mockedModule = require("@/ui/viewAdapters/useTasksViewAdapter");
    mockedModule.__setTasksScreenOverride(null);
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

    expect(screen.getByTestId("tasks-screen__section_section-project-1-uncontainered")).toBeTruthy();
    expect(screen.getByTestId("tasks-screen__section_section-project-1-level-12")).toBeTruthy();
    expect(screen.getByTestId("tasks-screen__list")).toBeTruthy();
    expect(screen.getByTestId("container-card:task-1")).toBeTruthy();
    expect(screen.getByTestId("container-card:task-2")).toBeTruthy();

    fireEvent.press(screen.getByTestId("tasks-screen__fab_create_task"));
    expect(onNavigateToCreateTask).toHaveBeenCalledTimes(1);

    fireEvent.press(screen.getByTestId("tasks-screen__header_profile"));
    expect(onNavigateToProfile).toHaveBeenCalledTimes(1);

    fireEvent.press(screen.getByTestId("tasks-screen__header_project_picker"));
    expect(onNavigateToProjectPicker).toHaveBeenCalledWith(true);

    fireEvent.press(screen.getByTestId("tasks-screen__header_developer_settings"));
    expect(onNavigateToDeveloperSettings).toHaveBeenCalledTimes(1);

    const input = screen.getByTestId("text-field:tasks-search__input");
    fireEvent.changeText(input, "guardrails");

    expect(screen.getByTestId("container-card:task-1")).toBeTruthy();
    expect(screen.queryByTestId("container-card:task-2")).toBeNull();

    fireEvent.press(screen.getByTestId("tasks-screen__header_reset_filters"));
    expect(screen.getByTestId("container-card:task-1")).toBeTruthy();
    expect(screen.getByTestId("container-card:task-2")).toBeTruthy();
  });

  it("toggles a compact section open and closed", () => {
    const screen = render(
      <TasksScreen
        onNavigateToTaskDetail={jest.fn()}
        onNavigateToCreateTask={jest.fn()}
      />,
    );

    expect(screen.getByTestId("container-card:task-2")).toBeTruthy();

    fireEvent.press(screen.getByTestId("tasks-screen__section_toggle_section-project-1-level-12"));
    expect(screen.queryByTestId("container-card:task-2")).toBeNull();

    fireEvent.press(screen.getByTestId("tasks-screen__section_toggle_section-project-1-level-12"));
    expect(screen.getByTestId("container-card:task-2")).toBeTruthy();
  });

  it("renders the compact empty state when there are no visible task sections", () => {
    const mockedModule = require("@/ui/viewAdapters/useTasksViewAdapter");
    mockedModule.__setTasksScreenOverride({
      compactSections: [],
      taskRowItems: [],
      scalarMetrics: {
        totalVisibleTaskCount: 0,
        overdueVisibleTaskCount: 0,
        selectedProjectTaskCount: 0,
        hasActiveFilters: false,
      },
    });

    const screen = render(
      <TasksScreen
        onNavigateToTaskDetail={jest.fn()}
        onNavigateToCreateTask={jest.fn()}
      />,
    );

    expect(screen.getByTestId("tasks-screen__empty_state")).toBeTruthy();
    expect(screen.getByText("No Tasks")).toBeTruthy();
  });
});
