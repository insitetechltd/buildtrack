import React from "react";
import { fireEvent, render } from "@testing-library/react-native";

import TaskDetailEvidenceStrip from "../../components/taskDetail/TaskDetailEvidenceStrip";
import TaskDetailScreen from "../TaskDetailScreen";
import { useTaskDetailViewAdapter } from "../../ui/viewAdapters/useTaskDetailViewAdapter";

jest.mock("../../ui/viewAdapters/useTaskDetailViewAdapter", () => ({
  useTaskDetailViewAdapter: jest.fn(),
}));

jest.mock("../../components/primitives/container/ContainerCard", () => ({
  __esModule: true,
  default: function MockContainerCard() {
    return null;
  },
}));

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock("expo-status-bar", () => ({
  StatusBar: () => null,
}));

jest.mock("@expo/vector-icons", () => ({
  Ionicons: () => null,
}));

jest.mock("../../components/ProfileMenu", () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock("../../components/ModernScreenHeader", () => ({
  __esModule: true,
  default: ({ title }: { title: string }) => {
    const ReactNative = require("react-native");
    const MockText = ReactNative.Text;
    return <MockText>{title}</MockText>;
  },
}));

jest.mock("../../api/supabase", () => ({
  checkSupabaseConnection: jest.fn().mockResolvedValue(true),
}));

jest.mock("../../utils/environmentDetector", () => ({
  detectEnvironment: () => ({ mode: "test" }),
  getEnvironmentStyles: () => ({}),
}));

describe("TaskDetailScreen sticky layout", () => {
  const mockUseTaskDetailViewAdapter = useTaskDetailViewAdapter as jest.MockedFunction<
    typeof useTaskDetailViewAdapter
  >;

  const createAdapterOutput = (overrides: Record<string, unknown> = {}) => ({
    readiness: {
      hasUsableData: true,
    },
    header: {
      title: "Task Details",
    },
    taskHero: {
      id: "task-hero",
      density: "standard",
      structuralState: "ready",
      title: "Replace ceiling tiles",
      statusLabel: "In Progress",
      projectLabel: "Project Alpha",
      completionLabel: "50% complete",
      dueDateLabel: "Jul 10, 2026",
      nextStepLabel: "Update progress and add photo evidence.",
      isCritical: false,
      criticalLabel: undefined,
    },
    delegationSummary: {
      id: "delegation-summary",
      density: "standard",
      structuralState: "ready",
      assignedByLabel: "Casey",
      assignedToLabel: "Sam",
      primaryOwnerLabel: "Sam",
      teamSummaryLabel: "1 assignee",
    },
    activeStage: {
      id: "active-stage",
      density: "standard",
      structuralState: "ready",
      stageMode: "photo",
      title: "Submitted task for review",
      summary: "Marked 100% complete",
      actorLabel: "Sam",
      timestampLabel: "Jul 5, 09:30",
      photos: ["https://example.com/photo-1.jpg", "https://example.com/photo-2.jpg"],
      activePhotoIndex: 0,
    },
    activityThread: [
      {
        id: "activity-1",
        actorLabel: "Sam",
        eventLabel: "Submitted task for review",
        timestampLabel: "Jul 5, 09:30",
        detailLabel: "Marked 100% complete",
        photoUrls: ["https://example.com/activity-photo.jpg"],
        density: "standard",
        structuralState: "ready",
      },
    ],
    subtaskSummary: {
      id: "subtask-summary",
      density: "standard",
      structuralState: "ready",
      title: "Subtasks",
      totalCount: 0,
    },
    banners: [],
    detailSections: [],
    assigners: [],
    assignees: [],
    activities: [],
    childTasks: [],
    actionItems: [],
    ...overrides,
  });

  const createAdapterActions = () => ({
    acceptTask: jest.fn(),
    declineTask: jest.fn(),
    submitForReview: jest.fn(),
    approveTask: jest.fn(),
    toggleCriticalThisWeek: jest.fn(),
    cancelTask: jest.fn(),
    fetchTask: jest.fn(),
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseTaskDetailViewAdapter.mockReturnValue({
      output: createAdapterOutput(),
      actions: createAdapterActions(),
    } as ReturnType<typeof useTaskDetailViewAdapter>);
  });

  it("keeps the hero scrollable while the active-entry stage remains sticky at index 1", () => {
    const screen = render(<TaskDetailScreen taskId="task-1" onNavigateBack={jest.fn()} />);
    const workThreadScroll = screen.getByTestId("task-detail__workthread_scroll");

    expect(screen.getByTestId("task-detail__hero")).toBeTruthy();
    expect(screen.getByTestId("task-detail__evidence_pinned_region")).toBeTruthy();
    expect(screen.getByTestId("task-detail__active_entry_stage")).toBeTruthy();
    expect(workThreadScroll).toBeTruthy();
    expect(screen.getByTestId("task-detail__activity_thread")).toBeTruthy();
    expect(workThreadScroll.props.scrollEnabled).not.toBe(false);
    expect(workThreadScroll.props.stickyHeaderIndices).toEqual([1]);
    expect(workThreadScroll.props.contentContainerStyle).toEqual(
      expect.objectContaining({ flexGrow: 1 }),
    );
  });

  it("updates the pinned stage from measured thread rows as the work thread scrolls", () => {
    mockUseTaskDetailViewAdapter.mockReturnValue({
      output: createAdapterOutput({
        activeStage: {
          id: "placeholder-stage",
          density: "standard",
          structuralState: "ready",
          stageMode: "no_photo",
          title: "Static placeholder",
          summary: "This should be replaced by the active thread entry.",
          actorLabel: "Casey",
          timestampLabel: "Jul 5, 08:00",
          photos: [],
        },
        activityThread: [
          {
            id: "activity-1",
            actorLabel: "Sam",
            eventLabel: "Added status note",
            timestampLabel: "Jul 5, 09:00",
            detailLabel: "Waiting on supplier confirmation.",
            photoUrls: [],
            density: "standard",
            structuralState: "ready",
          },
          {
            id: "activity-2",
            actorLabel: "Sam",
            eventLabel: "Uploaded site photos",
            timestampLabel: "Jul 5, 10:00",
            detailLabel: "Captured the finished ceiling install.",
            photoUrls: ["https://example.com/activity-photo-2.jpg"],
            density: "standard",
            structuralState: "ready",
          },
        ],
      }),
      actions: createAdapterActions(),
    } as ReturnType<typeof useTaskDetailViewAdapter>);

    const screen = render(<TaskDetailScreen taskId="task-1" onNavigateBack={jest.fn()} />);
    const workThreadScroll = screen.getByTestId("task-detail__workthread_scroll");
    const activityThreadRegion = screen.getByTestId("task-detail__activity_thread_region");
    const firstEntry = screen.getByTestId("task-activity-timeline__entry-activity-1");
    const secondEntry = screen.getByTestId("task-activity-timeline__entry-activity-2");

    fireEvent(activityThreadRegion, "layout", {
      nativeEvent: { layout: { x: 0, y: 400, width: 320, height: 300 } },
    });
    fireEvent(firstEntry, "layout", {
      nativeEvent: { layout: { x: 0, y: 0, width: 320, height: 140 } },
    });
    fireEvent(secondEntry, "layout", {
      nativeEvent: { layout: { x: 0, y: 180, width: 320, height: 140 } },
    });

    expect(screen.getByText("No photos for this update")).toBeTruthy();
    expect(screen.queryByTestId("task-detail__active_stage_photo_featured")).toBeNull();
    expect(screen.getByTestId("task-activity-timeline__entry-activity-1").props.accessibilityState).toEqual(
      expect.objectContaining({ selected: true }),
    );

    fireEvent.scroll(workThreadScroll, {
      nativeEvent: {
        contentOffset: { x: 0, y: 560 },
        contentSize: { width: 320, height: 1400 },
        layoutMeasurement: { width: 320, height: 640 },
      },
    });

    expect(screen.getByTestId("task-detail__active_stage_photo_featured")).toBeTruthy();
    expect(screen.getByTestId("task-activity-timeline__entry-activity-2").props.accessibilityState).toEqual(
      expect.objectContaining({ selected: true }),
    );
  });

  it("renders stable photo surfaces in the pinned active-entry stage", () => {
    const screen = render(
      <TaskDetailEvidenceStrip
        model={{
          id: "active-stage",
          density: "standard",
          structuralState: "ready",
          stageMode: "photo",
          title: "Added progress photos",
          summary: "Installed the replacement panels.",
          actorLabel: "Sam",
          timestampLabel: "Jul 5, 09:30",
          photos: ["https://example.com/a.jpg", "https://example.com/b.jpg"],
          activePhotoIndex: 0,
        }}
      />,
    );

    expect(screen.getByTestId("task-detail__active_stage_photo_0")).toBeTruthy();
    expect(screen.getByTestId("task-detail__active_stage_photo_1")).toBeTruthy();
  });

  it("renders a neutral no-photo stage when the active entry has no photos", () => {
    const screen = render(
      <TaskDetailEvidenceStrip
        model={{
          id: "active-stage-no-photo",
          density: "standard",
          structuralState: "ready",
          stageMode: "no_photo",
          title: "Added status note",
          summary: "Waiting on supplier confirmation.",
          actorLabel: "Casey",
          timestampLabel: "Jul 5, 10:15",
          photos: [],
        }}
      />,
    );

    expect(screen.getByText("No photos for this update")).toBeTruthy();
  });

  it("renders a document preview stage for PDF-bearing entries", () => {
    const screen = render(
      <TaskDetailEvidenceStrip
        model={{
          id: "active-stage-pdf",
          density: "standard",
          structuralState: "ready",
          stageMode: "pdf_preview",
          title: "Attached site report",
          summary: "Weekly report uploaded.",
          actorLabel: "Casey",
          timestampLabel: "Jul 5, 11:45",
          photos: [],
          documentName: "site-report.pdf",
        }}
      />,
    );

    expect(screen.getByText("Document attached")).toBeTruthy();
    expect(screen.getByText("site-report.pdf")).toBeTruthy();
  });
});
