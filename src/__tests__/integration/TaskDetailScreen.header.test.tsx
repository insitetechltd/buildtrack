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
    const ReactNative = require("react-native");
    const MockView = ReactNative.View;
    return <MockView testID="task-detail__detail_section_card" />;
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
      categoryLabel: "Interior",
      projectLabel: "Project Alpha",
      completionLabel: "50% complete",
      dueDateLabel: "Jul 10, 2026",
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
    infoCard: {
      id: "task-info-card",
      density: "standard",
      structuralState: "ready",
      descriptionLabel: "Confirm supplier lead times before final delivery.",
      siteLocationLabel: "Level 9 Rooftop",
      assignedByLabel: "Casey",
      assignedToLabel: "Sam",
      primaryOwnerLabel: "Sam",
      detailRows: [],
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
    canEditDelegation: true,
    quickActions: undefined,
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

  it("renders the loading header title and workspace menu trigger while data is unavailable", () => {
    mockUseTaskDetailViewAdapter.mockReturnValue({
      output: {
        readiness: {
          hasUsableData: false,
        },
      },
      actions: createAdapterActions(),
    } as ReturnType<typeof useTaskDetailViewAdapter>);

    const screen = render(<TaskDetailScreen taskId="task-1" onNavigateBack={jest.fn()} />);

    expect(screen.getByTestId("task-detail__header_title")).toBeTruthy();
    expect(screen.getByText("LOADING...")).toBeTruthy();
    expect(screen.getByText("Task details")).toBeTruthy();
    expect(screen.queryByTestId("app-screen-header__back")).toBeNull();
    expect(screen.getByTestId("app-screen-header__profile-trigger")).toBeTruthy();
  });

  it("renders the loaded two-line header without a back arrow", () => {
    const onNavigateBack = jest.fn();

    mockUseTaskDetailViewAdapter.mockReturnValue({
      output: createAdapterOutput(),
      actions: createAdapterActions(),
    } as ReturnType<typeof useTaskDetailViewAdapter>);

    const screen = render(<TaskDetailScreen taskId="task-1" onNavigateBack={onNavigateBack} />);

    expect(screen.getByTestId("task-detail__header_title_block")).toBeTruthy();
    expect(screen.getByTestId("brand-header-title")).toBeTruthy();
    expect(screen.getByTestId("task-detail__header_title_subtitle")).toBeTruthy();
    expect(screen.getByText("Task details")).toBeTruthy();
    expect(screen.getByTestId("task-detail__header_title").props.className).toContain("text-[24px]");
    expect(screen.getByTestId("task-detail__header_title_subtitle").props.className).toContain("text-xs");
    expect(screen.getByTestId("app-screen-header__profile-trigger")).toBeTruthy();
    expect(screen.queryByTestId("app-screen-header__back")).toBeNull();
    expect(screen.queryByTestId("task-detail__hero_shell")).toBeNull();
    expect(screen.queryByTestId("task-detail__header_badges")).toBeNull();
    expect(screen.getByTestId("task-detail__status_chips")).toBeTruthy();
    fireEvent.press(screen.getByTestId("task-detail__status_chips__toggle"));
    expect(within(screen.getByTestId("task-detail__info_card")).getByText("Interior")).toBeTruthy();
    expect(within(screen.getByTestId("task-detail__info_card")).getByText("In Progress")).toBeTruthy();
    expect(within(screen.getByTestId("task-detail__info_card")).getByText("50% complete")).toBeTruthy();
    expect(within(screen.getByTestId("task-detail__info_card")).getByText("Jul 10, 2026")).toBeTruthy();
    expect(screen.getByTestId("task-detail__scroll_region")).toBeTruthy();
    expect(screen.queryByTestId("app-screen-header__back")).toBeNull();
  });

  it("toggles the task detail header title inline when the title text is pressed", () => {
    mockUseTaskDetailViewAdapter.mockReturnValue({
      output: createAdapterOutput({
        header: {
          title:
            "A very long task detail title that should expand inline when the header title text is pressed",
        },
      }),
      actions: createAdapterActions(),
    } as ReturnType<typeof useTaskDetailViewAdapter>);

    const screen = render(<TaskDetailScreen taskId="task-1" onNavigateBack={jest.fn()} />);
    const headerTitle = screen.getByTestId("task-detail__header_title");

    expect(headerTitle.props.numberOfLines).toBe(1);

    fireEvent.press(screen.getByTestId("task-detail__header_title_pressable"));

    expect(screen.getByTestId("task-detail__header_title").props.numberOfLines).toBeUndefined();

    fireEvent.press(screen.getByTestId("task-detail__header_title_pressable"));

    expect(screen.getByTestId("task-detail__header_title").props.numberOfLines).toBe(1);
  });

  it("keeps quick actions inside the bounded scroll region between the info card and lower actions", () => {
    mockUseTaskDetailViewAdapter.mockReturnValue({
      output: createAdapterOutput({
        quickActions: {
          id: "task-quick-actions",
          density: "standard",
          structuralState: "ready",
          actions: [
            {
              id: "quick-action-approve",
              actionId: "approve_task",
              label: "Approve",
              icon: "checkmark-circle-outline",
              isDisabled: false,
              density: "standard",
              structuralState: "ready",
            },
          ],
        },
        activityThread: [
          {
            id: "activity-1",
            actorLabel: "Sam",
            eventLabel: "Submitted for review",
            timestampLabel: "Jul 2, 10:00 AM",
            progressLabel: "100%",
            density: "standard",
            structuralState: "ready",
            detailLabel: "Marked 100% complete",
            photoUrls: [],
          },
        ],
        actionItems: [
          {
            id: "secondary-action-reassign",
            actionId: "reassign_task",
            label: "Reassign",
            icon: "swap-horizontal-outline",
            isDisabled: false,
            density: "standard",
            structuralState: "ready",
          },
        ],
      }),
      actions: createAdapterActions(),
    } as ReturnType<typeof useTaskDetailViewAdapter>);

    const screen = render(<TaskDetailScreen taskId="task-1" onNavigateBack={jest.fn()} />);
    expect(screen.getByTestId("task-detail__quick-actions")).toBeTruthy();
    expect(screen.getByTestId("task-detail__workthread_scroll").props.stickyHeaderIndices).toBeUndefined();
    expect(screen.getByTestId("task-detail__info_card")).toBeTruthy();
    expect(screen.getByTestId("task-detail__secondary-actions")).toBeTruthy();
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

  it("does not render the Add Photos action even if upload_photos is present in actionItems", () => {
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
        } as any)}
      />,
    );

    expect(screen.queryByText("Add Photos")).toBeNull();
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
            progressLabel: "100%",
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

  it("renders the merged info card while keeping separate subtasks and detail cards out of the screen", () => {
    mockUseTaskDetailViewAdapter.mockReturnValue({
      output: createAdapterOutput({
        activityThread: [
          {
            id: "activity-1",
            actorLabel: "Sam",
            eventLabel: "Submitted for review",
            timestampLabel: "Jul 2, 10:00 AM",
            progressLabel: "100%",
            density: "standard",
            structuralState: "ready",
            detailLabel: "Marked 100% complete",
            photoUrls: [],
          },
        ],
        subtaskSummary: {
          id: "subtask-summary",
          density: "standard",
          structuralState: "ready",
          title: "Subtasks",
          totalCount: 2,
        },
        detailSections: [
          {
            id: "task-details",
            title: "Details",
            rows: [
              {
                id: "detail-row-1",
                label: "Due",
                value: "Jul 10, 2026",
              },
            ],
            density: "standard",
            structuralState: "ready",
          },
        ],
      }),
      actions: createAdapterActions(),
    } as ReturnType<typeof useTaskDetailViewAdapter>);

    const screen = render(<TaskDetailScreen taskId="task-1" onNavigateBack={jest.fn()} />);

    expect(screen.getByTestId("task-detail__info_card")).toBeTruthy();
    expect(screen.getByTestId("task-detail__info_card")).toBeTruthy();
    expect(screen.queryByText("Details")).toBeNull();
    expect(screen.getByText("Level 9 Rooftop")).toBeTruthy();
    fireEvent.press(screen.getByTestId("task-detail__people_group__toggle"));
    expect(screen.getByText("Assigned by")).toBeTruthy();
    expect(screen.getByText("Casey")).toBeTruthy();
    expect(screen.getByTestId("task-detail__activity_thread")).toBeTruthy();
    expect(screen.queryByTestId("task-detail__subtasks")).toBeNull();
    expect(screen.queryByText("Subtasks")).toBeNull();
    expect(screen.queryByTestId("task-detail__detail_section_card")).toBeNull();
  });

  it("renders the activity thread without the pinned active-entry stage", () => {
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
            progressLabel: "100%",
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
            progressLabel: "0%",
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
    const activityThread = screen.getByTestId("task-detail__activity_thread");

    expect(screen.queryByTestId("task-detail__active_entry_stage")).toBeNull();
    expect(activityThread).toBeTruthy();
    expect(screen.getByTestId("task-detail__workthread_scroll")).toBeTruthy();
    expect(within(activityThread).getByText("Work thread")).toBeTruthy();
    expect(within(activityThread).getByText("Submitted task for review")).toBeTruthy();
    expect(within(activityThread).getByText("Marked 100% complete")).toBeTruthy();
    expect(within(activityThread).getByText("Jul 5, 09:30")).toBeTruthy();
    expect(within(activityThread).getByText("Sam")).toBeTruthy();
    expect(within(activityThread).getByText("100% complete")).toBeTruthy();
    expect(screen.queryByText("No photos for this update")).toBeNull();
    expect(screen.queryByTestId("task-detail__delegation_summary")).toBeNull();
  });

  it("keeps task-detail actions inline with no promoted primary action bar", () => {
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

    const secondaryActions = screen.getByTestId("task-detail__secondary-actions");
    expect(screen.queryByTestId("task-detail__quick-actions")).toBeNull();
    expect(within(secondaryActions).getByText("Other actions")).toBeTruthy();
    expect(within(secondaryActions).getByText("Edit Task Details")).toBeTruthy();
    expect(within(secondaryActions).queryByText("Add Comment")).toBeNull();
    expect(screen.queryByTestId("task-detail__primary-action-bar")).toBeNull();
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

    expect(screen.queryByTestId("task-detail__quick-actions")).toBeNull();
    expect(screen.queryByText("Add Comment")).toBeNull();
    expect(screen.queryByTestId("task-detail__secondary-actions")).toBeNull();
    expect(screen.queryByTestId("task-detail__location_editor")).toBeNull();
    expect(screen.queryByTestId("task-detail__tags_primary_editor")).toBeNull();
    expect(screen.queryByText("Add Photos")).toBeNull();
    expect(screen.queryByText("Edit Task Details")).toBeNull();
    expect(screen.queryByTestId("task-detail__primary-action-bar")).toBeNull();
  });
});
