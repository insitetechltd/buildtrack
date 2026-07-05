import React from "react";
import { render } from "@testing-library/react-native";

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
    evidenceSummary: {
      id: "evidence-summary",
      density: "standard",
      structuralState: "ready",
      latestPhotoUrls: ["https://example.com/photo-1.jpg", "https://example.com/photo-2.jpg"],
      totalPhotoCount: 2,
      emptyLabel: "No photo evidence yet.",
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

  it("renders task detail with a pinned evidence rail and nested work-thread scroll region", () => {
    const screen = render(<TaskDetailScreen taskId="task-1" onNavigateBack={jest.fn()} />);

    expect(screen.getByTestId("task-detail__evidence_pinned_region")).toBeTruthy();
    expect(screen.getByTestId("task-detail__workthread_scroll")).toBeTruthy();
    expect(screen.getByTestId("task-detail__activity_thread")).toBeTruthy();
  });

  it("renders stable evidence thumbnail test surfaces in the pinned rail", () => {
    const screen = render(
      <TaskDetailEvidenceStrip
        model={{
          id: "evidence-summary",
          density: "standard",
          structuralState: "ready",
          latestPhotoUrls: ["https://example.com/a.jpg", "https://example.com/b.jpg"],
          totalPhotoCount: 2,
          emptyLabel: "No photo evidence yet.",
        }}
      />,
    );

    expect(screen.getByTestId("task-detail__evidence_thumbnail_0")).toBeTruthy();
    expect(screen.getByTestId("task-detail__evidence_thumbnail_1")).toBeTruthy();
  });
});
