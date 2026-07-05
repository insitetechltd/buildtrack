import React from "react";
import { fireEvent, render, within } from "@testing-library/react-native";

import TaskDetailScreen from "../../screens/TaskDetailScreen";
import { buildPhotoShortcutCreateTaskParams } from "../../navigation/photoShortcutRoutes";
import { useTaskDetailViewAdapter } from "../../ui/viewAdapters/useTaskDetailViewAdapter";

const mockNavigate = jest.fn();

jest.mock("../../ui/viewAdapters/useTaskDetailViewAdapter", () => ({
  useTaskDetailViewAdapter: jest.fn(),
}));

jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({
    getParent: () => ({
      navigate: mockNavigate,
    }),
  }),
}));

jest.mock("../../components/primitives/container/ContainerCard", () => ({
  __esModule: true,
  default: function MockContainerCard() {
    return null;
  },
}));

jest.mock("../../state/authStore", () => ({
  useAuthStore: () => ({
    user: { id: "user-1", companyId: "company-1", name: "Casey" },
  }),
}));

jest.mock("../../state/companyStore", () => ({
  useCompanyStore: () => ({
    getCompanyBanner: () => null,
  }),
}));

jest.mock("../../state/themeStore", () => ({
  useThemeStore: () => ({
    isDarkMode: false,
  }),
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

jest.mock("../../api/supabase", () => ({
  checkSupabaseConnection: jest.fn().mockResolvedValue(true),
}));

jest.mock("../../utils/environmentDetector", () => ({
  detectEnvironment: () => ({ mode: "test" }),
  getEnvironmentStyles: () => ({}),
}));

describe("TaskDetailScreen header regression", () => {
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
      nextStepLabel: "Update progress and add photo evidence.",
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
      stageMode: "no_photo",
      title: "Added status note",
      summary: "Waiting on supplier confirmation.",
      actorLabel: "Sam",
      timestampLabel: "Jul 5, 09:30",
      photos: [],
    },
    evidenceSummary: {
      id: "evidence-summary",
      density: "standard",
      structuralState: "ready",
      latestPhotoUrls: [],
      totalPhotoCount: 0,
      emptyLabel: "No photo evidence yet.",
    },
    activityThread: [],
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
  });

  it("renders the loading header title and marker while data is unavailable", () => {
    mockUseTaskDetailViewAdapter.mockReturnValue({
      output: {
        readiness: {
          hasUsableData: false,
        },
      },
      actions: createAdapterActions(),
    } as ReturnType<typeof useTaskDetailViewAdapter>);

    const screen = render(<TaskDetailScreen taskId="task-1" onNavigateBack={jest.fn()} />);

    expect(screen.getByText("Loading...")).toBeTruthy();
    expect(screen.getByText("Modern UI")).toBeTruthy();
  });

  it("renders the loaded header title and calls the provided back callback", () => {
    const onNavigateBack = jest.fn();

    mockUseTaskDetailViewAdapter.mockReturnValue({
      output: createAdapterOutput(),
      actions: createAdapterActions(),
    } as ReturnType<typeof useTaskDetailViewAdapter>);

    const screen = render(<TaskDetailScreen taskId="task-1" onNavigateBack={onNavigateBack} />);

    expect(screen.getByText("Task Details")).toBeTruthy();
    expect(screen.getByText("Modern UI")).toBeTruthy();

    fireEvent.press(screen.getByTestId("app-screen-header__back"));

    expect(onNavigateBack).toHaveBeenCalledTimes(1);
  });

  it("routes reject actions to the dedicated reject flow instead of the comment flow", () => {
    const onNavigateToCreateTask = jest.fn();
    const onNavigateToRejectTask = jest.fn();

    mockUseTaskDetailViewAdapter.mockReturnValue({
      output: createAdapterOutput({
        actionItems: [
          {
            id: "reject-action",
            actionId: "reject_task",
            label: "Reject Task",
            icon: "close-circle",
            isDisabled: false,
            density: "comfortable",
            structuralState: "ready",
          },
        ],
      }),
      actions: createAdapterActions(),
    } as ReturnType<typeof useTaskDetailViewAdapter>);

    const screen = render(
      <TaskDetailScreen
        {...({
          taskId: "task-1",
          subTaskId: "subtask-1",
          onNavigateBack: jest.fn(),
          onNavigateToCreateTask,
          onNavigateToRejectTask,
        } as any)}
      />,
    );

    fireEvent.press(screen.getByText("Reject Task"));

    expect(onNavigateToRejectTask).toHaveBeenCalledWith("task-1", "subtask-1");
    expect(onNavigateToCreateTask).not.toHaveBeenCalled();
  });

  it("routes upload_photos into update mode with the active subtask context", () => {
    const onNavigateToCreateTask = jest.fn();

    mockUseTaskDetailViewAdapter.mockReturnValue({
      output: createAdapterOutput({
        actionItems: [
          {
            id: "photos-action",
            actionId: "upload_photos",
            label: "Add Photos",
            icon: "camera-outline",
            isDisabled: false,
            density: "comfortable",
            structuralState: "ready",
          },
        ],
      }),
      actions: createAdapterActions(),
    } as ReturnType<typeof useTaskDetailViewAdapter>);

    const screen = render(
      <TaskDetailScreen
        {...({
          taskId: "task-1",
          subTaskId: "subtask-1",
          onNavigateBack: jest.fn(),
          onNavigateToCreateTask,
        } as any)}
      />,
    );

    fireEvent.press(screen.getByText("Add Photos"));

    expect(onNavigateToCreateTask).toHaveBeenCalledWith(
      undefined,
      undefined,
      "task-1",
      "update",
      "subtask-1",
    );
  });

  it("does not render a dedicated top camera shortcut on task detail", () => {
    mockUseTaskDetailViewAdapter.mockReturnValue({
      output: createAdapterOutput(),
      actions: createAdapterActions(),
    } as ReturnType<typeof useTaskDetailViewAdapter>);

    const screen = render(
      <TaskDetailScreen
        {...({
          taskId: "task-1",
          subTaskId: "subtask-1",
          onNavigateBack: jest.fn(),
        } as any)}
      />,
    );

    expect(screen.queryByTestId("task-detail__camera_shortcut")).toBeNull();
  });

  it("builds task-detail photo shortcut params for the same-task update path", () => {
    expect(
      buildPhotoShortcutCreateTaskParams({
        taskId: "task-1",
        subTaskId: "subtask-1",
        actionType: "update",
        selectedPhotos: [{ uri: "file:///photo-1.jpg", fileName: "photo-1.jpg", isAnnotated: false }],
      }),
    ).toEqual(
      expect.objectContaining({
        editTaskId: "task-1",
        actionType: "update",
        cameraLaunchContext: "task_detail",
        postCaptureDefault: "same_task_update",
        updateTargetSubTaskId: "subtask-1",
        selectedPhotos: [{ uri: "file:///photo-1.jpg", fileName: "photo-1.jpg", isAnnotated: false }],
      }),
    );
  });

  it("renders the activity timeline title when activities are available", () => {
    mockUseTaskDetailViewAdapter.mockReturnValue({
      output: createAdapterOutput({
        activityThread: [
          {
            id: "activity-1",
            actorLabel: "Sam",
            eventLabel: "Submitted for review",
            timestampLabel: "Jul 2, 10:00 AM",
            density: "standard",
            structuralState: "ready",
            detailLabel: "Marked 100% complete",
            photoUrls: [],
          },
        ],
      }),
      actions: createAdapterActions(),
    } as ReturnType<typeof useTaskDetailViewAdapter>);

    const screen = render(<TaskDetailScreen taskId="task-1" onNavigateBack={jest.fn()} />);

    expect(screen.getByText("Work thread")).toBeTruthy();
  });

  it("keeps the newest-first thread scroll while the pinned stage reflects the concrete top-most thread entry", () => {
    mockUseTaskDetailViewAdapter.mockReturnValue({
      output: createAdapterOutput({
        activeStage: {
          id: "placeholder-stage",
          density: "standard",
          structuralState: "ready",
          stageMode: "no_photo",
          title: "Latest task entry",
          summary: "Static placeholder summary",
          actorLabel: "Placeholder actor",
          timestampLabel: "Latest",
          photos: [],
        },
        activityThread: [
          {
            id: "activity-2",
            actorLabel: "Sam",
            eventLabel: "Submitted task for review",
            timestampLabel: "Jul 5, 09:30",
            detailLabel: "Marked 100% complete",
            photoUrls: [],
            density: "standard",
            structuralState: "ready",
          },
          {
            id: "activity-1",
            actorLabel: "Casey",
            eventLabel: "Accepted the task",
            timestampLabel: "Jul 4, 08:15",
            detailLabel: "Started the ceiling replacement work.",
            photoUrls: [],
            density: "standard",
            structuralState: "ready",
          },
        ],
      }),
      actions: createAdapterActions(),
    } as ReturnType<typeof useTaskDetailViewAdapter>);

    const screen = render(<TaskDetailScreen taskId="task-1" onNavigateBack={jest.fn()} />);
    const activeStage = screen.getByTestId("task-detail__active_entry_stage");

    expect(activeStage).toBeTruthy();
    expect(screen.getByTestId("task-detail__workthread_scroll")).toBeTruthy();
    expect(within(activeStage).getByText("Submitted task for review")).toBeTruthy();
    expect(within(activeStage).getByText("Marked 100% complete")).toBeTruthy();
    expect(within(activeStage).getByText("Sam")).toBeTruthy();
    expect(screen.queryByText("Static placeholder summary")).toBeNull();
  });

  it("keeps secondary actions visible inline and demotes edit_task below the promoted primary action", () => {
    mockUseTaskDetailViewAdapter.mockReturnValue({
      output: createAdapterOutput({
        actionItems: [
          {
            id: "action-edit",
            actionId: "edit_task",
            label: "Edit Task Details",
            icon: "create-outline",
            isDisabled: false,
            density: "standard",
            structuralState: "stale",
          },
          {
            id: "action-comment",
            actionId: "add_comment",
            label: "Add Comment",
            icon: "chatbubble-outline",
            isDisabled: false,
            density: "standard",
            structuralState: "stale",
          },
        ],
      }),
      actions: createAdapterActions(),
    } as ReturnType<typeof useTaskDetailViewAdapter>);

    const screen = render(<TaskDetailScreen taskId="task-1" onNavigateBack={jest.fn()} />);

    const footer = screen.getByTestId("task-detail__primary-action-bar");
    expect(within(footer).getByText("Add Comment")).toBeTruthy();

    const secondaryActions = screen.getByTestId("task-detail__secondary-actions");
    expect(within(secondaryActions).getByText("Other actions")).toBeTruthy();
    expect(within(secondaryActions).getByText("Edit Task Details")).toBeTruthy();
  });

  it("keeps inline secondary actions visible while hiding edit for non-creators", () => {
    mockUseTaskDetailViewAdapter.mockReturnValue({
      output: createAdapterOutput({
        actionItems: [
          {
            id: "action-photos",
            actionId: "upload_photos",
            label: "Add Photos",
            icon: "camera-outline",
            isDisabled: false,
            density: "standard",
            structuralState: "ready",
          },
          {
            id: "action-comment",
            actionId: "add_comment",
            label: "Add Comment",
            icon: "chatbubble-outline",
            isDisabled: false,
            density: "standard",
            structuralState: "ready",
          },
        ],
      }),
      actions: createAdapterActions(),
    } as ReturnType<typeof useTaskDetailViewAdapter>);

    const screen = render(<TaskDetailScreen taskId="task-1" onNavigateBack={jest.fn()} />);

    expect(screen.getByTestId("task-detail__secondary-actions")).toBeTruthy();
    expect(screen.getByText("Other actions")).toBeTruthy();
    expect(screen.getByText("Add Comment")).toBeTruthy();
    expect(screen.queryByText("Edit Task Details")).toBeNull();
  });
});
