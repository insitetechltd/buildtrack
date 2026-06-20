import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import TasksScreen from "../../../src/screens/TasksScreen";
import { useTasksViewAdapter } from "../../../src/ui/viewAdapters/useTasksViewAdapter";
import { useProjectFilterStore } from "../../../src/state/projectFilterStore";

// Mock the view adapter
jest.mock("../../../src/ui/viewAdapters/useTasksViewAdapter");
const mockUseTasksViewAdapter = useTasksViewAdapter as jest.Mock;

// Mock the filter store
jest.mock("../../../src/state/projectFilterStore", () => ({
  useProjectFilterStore: jest.fn(),
}));
const mockUseProjectFilterStore = useProjectFilterStore as unknown as jest.Mock;

// Mock child components
jest.mock("../../../src/components/primitives/container/ContainerCard", () => {
  return function MockContainerCard() {
    return <></>;
  };
});
jest.mock("../../../src/components/primitives/input/TextField", () => {
  return function MockTextField() {
    return <></>;
  };
});

describe("TasksScreen Interactions", () => {
  let mockSetSectionFilter: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSetSectionFilter = jest.fn();

    mockUseProjectFilterStore.mockReturnValue({
      sectionFilter: "all",
      setSectionFilter: mockSetSectionFilter,
    });

    mockUseTasksViewAdapter.mockReturnValue({
      output: {
        taskRowItems: [],
        scalarMetrics: {
          totalVisibleTaskCount: 0,
        },
      },
      searchInput: {
        id: "test",
        label: "Search",
        value: "",
        density: "standard",
        structuralState: "empty",
      },
      setSearchQuery: jest.fn(),
      visibility: {
        showCreateTaskFab: false,
        showProfileShortcut: true,
        showProjectPickerShortcut: true,
        showDeveloperSettingsShortcut: false,
        showResetFiltersShortcut: true,
      },
      actions: {
        resetFilters: jest.fn(),
      },
    });
  });

  it("renders section filter buckets and responds to press", () => {
    const { getByText } = render(
      <TasksScreen
        onNavigateToTaskDetail={jest.fn()}
        onNavigateToCreateTask={jest.fn()}
      />
    );

    const inboxButton = getByText("Inbox");
    const outboxButton = getByText("Outbox");
    const myWorkButton = getByText("My Work");

    expect(inboxButton).toBeTruthy();
    expect(outboxButton).toBeTruthy();
    expect(myWorkButton).toBeTruthy();

    fireEvent.press(inboxButton);
    expect(mockSetSectionFilter).toHaveBeenCalledWith("inbox");

    fireEvent.press(outboxButton);
    expect(mockSetSectionFilter).toHaveBeenCalledWith("outbox");

    fireEvent.press(myWorkButton);
    expect(mockSetSectionFilter).toHaveBeenCalledWith("my_work");
  });
});
