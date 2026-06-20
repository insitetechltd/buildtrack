import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import DashboardScreen from "../../../src/screens/DashboardScreen";
import { useDashboardViewAdapter } from "../../../src/ui/viewAdapters/useDashboardViewAdapter";
import { useProjectFilterStore } from "../../../src/state/projectFilterStore";

// Mock the view adapter
jest.mock("../../../src/ui/viewAdapters/useDashboardViewAdapter");
const mockUseDashboardViewAdapter = useDashboardViewAdapter as jest.Mock;

// Mock the filter store
jest.mock("../../../src/state/projectFilterStore", () => ({
  useProjectFilterStore: jest.fn(),
}));
const mockUseProjectFilterStore = useProjectFilterStore as unknown as jest.Mock;

// Mock child components that might complain about missing Context or Navigation
jest.mock("../../../src/components/primitives/container/ContainerCard", () => {
  return function MockContainerCard() {
    return <></>;
  };
});

describe("DashboardScreen Interactions", () => {
  let mockSetSectionFilter: jest.Mock;
  let mockSetStatusFilter: jest.Mock;
  let mockSetButtonLabel: jest.Mock;
  let mockOnNavigateToTasks: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSetSectionFilter = jest.fn();
    mockSetStatusFilter = jest.fn();
    mockSetButtonLabel = jest.fn();
    mockOnNavigateToTasks = jest.fn();

    mockUseProjectFilterStore.mockReturnValue({
      setSectionFilter: mockSetSectionFilter,
      setStatusFilter: mockSetStatusFilter,
      setButtonLabel: mockSetButtonLabel,
    });

    mockUseDashboardViewAdapter.mockReturnValue({
      output: {
        scalarMetrics: {
          actionRequiredCount: 5,
          actionRequiredOverdueCount: 1,
          inProgressSentCount: 3,
          inProgressSentOverdueCount: 0,
          awaitingApprovalCount: 2,
          awaitingApprovalOverdueCount: 2,
        },
        projectSummaryItems: [],
      },
      visibility: {
        showProjectPickerShortcut: true,
        showProfileShortcut: true,
        showDeveloperSettingsShortcut: false,
        showCreateTaskFab: false,
      },
    });
  });

  it("navigates to Inbox tasks correctly", () => {
    const { getByTestId } = render(
      <DashboardScreen
        onNavigateToTasks={mockOnNavigateToTasks}
        onNavigateToCreateTask={jest.fn()}
        onNavigateToProfile={jest.fn()}
      />
    );

    const inboxNewBtn = getByTestId("dashboard-screen__metric_inbox_new");
    fireEvent.press(inboxNewBtn);

    expect(mockSetSectionFilter).toHaveBeenCalledWith("inbox");
    expect(mockSetStatusFilter).toHaveBeenCalledWith("new");
    expect(mockSetButtonLabel).toHaveBeenCalledWith("New Requests");
    expect(mockOnNavigateToTasks).toHaveBeenCalled();
  });

  it("navigates to Outbox tasks correctly", () => {
    const { getByTestId } = render(
      <DashboardScreen
        onNavigateToTasks={mockOnNavigateToTasks}
        onNavigateToCreateTask={jest.fn()}
        onNavigateToProfile={jest.fn()}
      />
    );

    const outboxReviewingBtn = getByTestId("dashboard-screen__metric_outbox_reviewing");
    fireEvent.press(outboxReviewingBtn);

    expect(mockSetSectionFilter).toHaveBeenCalledWith("outbox");
    expect(mockSetStatusFilter).toHaveBeenCalledWith("reviewing");
    expect(mockSetButtonLabel).toHaveBeenCalledWith("Pending Approval");
    expect(mockOnNavigateToTasks).toHaveBeenCalled();
  });
});
