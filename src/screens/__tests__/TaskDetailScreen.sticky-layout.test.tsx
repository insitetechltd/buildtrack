import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import TaskDetailScreen from "../TaskDetailScreen";
import { useTaskDetailViewAdapter } from "../../ui/viewAdapters/useTaskDetailViewAdapter";

jest.mock("../../ui/viewAdapters/useTaskDetailViewAdapter", () => ({
  useTaskDetailViewAdapter: jest.fn(),
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
  useAuthStore: (selector?: (state: { user: { id: string; companyId: string } }) => unknown) => {
    const state = { user: { id: "user-1", companyId: "company-1", name: "Casey" } };
    return typeof selector === "function" ? selector(state) : state;
  },
}));

jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    push: jest.fn(),
    getParent: () => ({
      getState: () => ({
        index: 2,
        routes: [
          { name: "Activity" },
          { name: "Camera" },
          {
            name: "Tasks",
            state: {
              index: 1,
              routes: [
                { name: "TasksList" },
                { name: "TaskDetail", params: { taskId: "task-1" } },
              ],
            },
          },
        ],
      }),
    }),
  }),
}));

jest.mock("../../navigation/reportTriageSpeedDialStore", () => ({
  useReportTriageDialExpanded: () => false,
  setReportTriageDialExpanded: jest.fn(),
  toggleReportTriageDialExpanded: jest.fn(),
}));

jest.mock("../../navigation/taskDetailBackNavigation", () => ({
  navigateReportTriageAction: jest.fn(),
}));

const mockNavigateToAddPhotosCaptureSession = jest.fn();
jest.mock("../../navigation/captureFirstCameraFlow", () => ({
  navigateToAddPhotosCaptureSession: (...args: unknown[]) =>
    mockNavigateToAddPhotosCaptureSession(...args),
}));

jest.mock("../../api/fileUploadService", () => ({
  ...jest.requireActual("../../api/fileUploadService"),
  uploadFileWithVerification: jest.fn(),
}));

jest.mock("../../utils/ensureCappedLocalPhoto", () => ({
  ensureCappedLocalPhoto: jest.fn(async (photo: { uri: string }) => photo.uri),
}));

jest.mock("expo-file-system/legacy", () => ({
  getInfoAsync: jest.fn(async () => ({ exists: true })),
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
  default: ({
    title,
    titleNode,
  }: {
    title: string;
    titleNode?: React.ReactNode;
  }) => {
    const ReactNative = require("react-native");
    const { Text, View } = ReactNative;
    return <View>{titleNode ? titleNode : <Text>{title}</Text>}</View>;
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
    infoCard: {
      id: "task-info-card",
      density: "standard",
      structuralState: "ready",
      descriptionLabel: "Confirm supplier lead times before final delivery.",
      assignedByLabel: "Casey",
      assignedToLabel: "Sam",
      primaryOwnerLabel: "Sam",
      detailRows: [
        {
          id: "row-due",
          label: "Due",
          value: "Jul 10, 2026",
        },
      ],
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
        progressLabel: "100%",
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
    archiveTask: jest.fn(),
    cancelTask: jest.fn(),
    replyToReport: jest.fn().mockResolvedValue(undefined),
    submitDockProgress: jest.fn().mockResolvedValue(undefined),
    cancelDockReview: jest.fn().mockResolvedValue(undefined),
    fetchTask: jest.fn(),
  });

  const findNodeByTestId = (
    node: any,
    testID: string,
  ): any | null => {
    if (!node) {
      return null;
    }

    if (Array.isArray(node)) {
      for (const child of node) {
        const match = findNodeByTestId(child, testID);
        if (match) {
          return match;
        }
      }
      return null;
    }

    if (node?.props?.testID === testID) {
      return node;
    }

    return findNodeByTestId(node?.children, testID);
  };

  const collectTestIds = (node: any): string[] => {
    if (!node) {
      return [];
    }

    if (Array.isArray(node)) {
      return node.flatMap((child) => collectTestIds(child));
    }

    const ownTestId = typeof node?.props?.testID === "string" ? [node.props.testID] : [];
    return ownTestId.concat(collectTestIds(node?.children));
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseTaskDetailViewAdapter.mockReturnValue({
      output: createAdapterOutput(),
      actions: createAdapterActions(),
    } as ReturnType<typeof useTaskDetailViewAdapter>);
  });

  it("keeps the screen bounded without rendering a separate hero above the scroll region", () => {
    const screen = render(<TaskDetailScreen taskId="task-1" onNavigateBack={jest.fn()} />);
    const workThreadScroll = screen.getByTestId("task-detail__workthread_scroll");

    expect(screen.queryByTestId("task-detail__hero_shell")).toBeNull();
    expect(screen.queryByTestId("task-detail__hero")).toBeNull();
    expect(screen.queryByTestId("task-detail__header_badges")).toBeNull();
    expect(screen.getByTestId("task-detail__status_chips")).toBeTruthy();
    expect(screen.getByTestId("task-detail__scroll_region")).toBeTruthy();
    expect(screen.getByTestId("task-detail__info_card")).toBeTruthy();
    expect(screen.queryByTestId("task-detail__evidence_pinned_region")).toBeNull();
    expect(screen.queryByTestId("task-detail__active_entry_stage")).toBeNull();
    expect(workThreadScroll).toBeTruthy();
    expect(screen.getByTestId("task-detail__activity_thread")).toBeTruthy();
    expect(screen.getByTestId("task-activity-timeline__outer-header-activity-1")).toBeTruthy();
    expect(screen.getByTestId("task-activity-timeline__photo_stack-activity-1")).toBeTruthy();
    expect(workThreadScroll.props.scrollEnabled).not.toBe(false);
    expect(workThreadScroll.props.stickyHeaderIndices).toBeUndefined();
    expect(workThreadScroll.props.contentContainerStyle).toEqual(
      expect.objectContaining({ flexGrow: 1 }),
    );
  });

  it("omits Other actions card and keeps location/tags editors out of the work thread", () => {
    mockUseTaskDetailViewAdapter.mockReturnValue({
      output: createAdapterOutput({
        actionItems: [
          {
            id: "secondary-action-edit",
            actionId: "edit_task",
            label: "Edit Task Details",
            icon: "create-outline",
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
    expect(screen.getByTestId("task-detail__activity_thread")).toBeTruthy();
    expect(screen.queryByTestId("task-detail__secondary-actions")).toBeNull();
    expect(screen.queryByText("Other actions")).toBeNull();
    expect(screen.queryByText("Edit Task Details")).toBeNull();
    expect(screen.getByTestId("task-detail__info_card")).toBeTruthy();
    expect(screen.queryByTestId("task-detail__location_editor")).toBeNull();
    expect(screen.queryByTestId("task-detail__tags_primary_editor")).toBeNull();
    expect(screen.queryByText("Location on Site")).toBeNull();
    expect(screen.queryByText("Tags, Primary & Delegates")).toBeNull();
  });

  it("keeps accept and decline in the scroll region instead of a competing bottom action bar", () => {
    mockUseTaskDetailViewAdapter.mockReturnValue({
      output: createAdapterOutput({
        quickActions: {
          id: "task-quick-actions",
          density: "standard",
          structuralState: "ready",
          actions: [
            {
              id: "quick-action-accept",
              actionId: "accept_task",
              label: "Accept",
              icon: "checkmark-circle-outline",
              isDisabled: false,
              density: "standard",
              structuralState: "ready",
            },
            {
              id: "quick-action-decline",
              actionId: "decline_task",
              label: "Reject",
              icon: "close-circle-outline",
              isDisabled: false,
              density: "standard",
              structuralState: "ready",
            },
          ],
        },
      }),
      actions: createAdapterActions(),
    } as ReturnType<typeof useTaskDetailViewAdapter>);

    const screen = render(<TaskDetailScreen taskId="task-1" onNavigateBack={jest.fn()} />);
    const tree = screen.toJSON();
    const scrollRegionNode = findNodeByTestId(tree, "task-detail__scroll_region");

    expect(screen.getByTestId("task-detail__quick-actions")).toBeTruthy();
    expect(findNodeByTestId(tree, "task-detail__bottom_action_bar")).toBeNull();
    expect(collectTestIds(scrollRegionNode)).toContain("task-detail__quick-actions");
  });

  it("does not render separate subtasks or detail cards once info is merged into the new layout", () => {
    mockUseTaskDetailViewAdapter.mockReturnValue({
      output: createAdapterOutput({
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
    expect(screen.queryByTestId("task-detail__delegation_summary")).toBeNull();
    expect(screen.queryByText("Delegation details")).toBeNull();
    expect(screen.queryByTestId("task-detail__subtasks")).toBeNull();
    expect(screen.queryByText("Subtasks")).toBeNull();
    expect(screen.queryByTestId("task-detail__detail_section_card")).toBeNull();
  });

  it("shows bottom report reply composer for PM triage on reported tasks", async () => {
    const replyToReport = jest.fn().mockResolvedValue(undefined);
    mockUseTaskDetailViewAdapter.mockReturnValue({
      output: createAdapterOutput({
        reportTriage: {
          defaultAssigneeId: "worker-1",
          title: "Leak under sink",
          availableUsers: [],
        },
        detailDock: {
          mode: "report_reply",
          completionPercentage: 0,
        },
        taskHero: {
          id: "task-hero",
          density: "standard",
          structuralState: "ready",
          title: "Leak under sink",
          statusLabel: "Reported",
          projectLabel: "Insite Office",
          completionLabel: undefined,
          dueDateLabel: undefined,
          nextStepLabel: undefined,
          isCritical: false,
          criticalLabel: undefined,
        },
      }),
      actions: {
        ...createAdapterActions(),
        replyToReport,
      },
    } as ReturnType<typeof useTaskDetailViewAdapter>);

    const screen = render(<TaskDetailScreen taskId="task-1" onNavigateBack={jest.fn()} />);

    expect(screen.getByTestId("report-reply-composer")).toBeTruthy();
    expect(screen.getByTestId("report-reply-composer__input")).toBeTruthy();
    expect(screen.getByTestId("report-reply-composer__send")).toBeTruthy();
    expect(screen.queryByTestId("report-reply-composer__completion")).toBeNull();

    fireEvent.changeText(
      screen.getByTestId("report-reply-composer__input"),
      "Thanks — looking into it",
    );
    fireEvent.press(screen.getByTestId("report-reply-composer__send"));

    await waitFor(() => {
      expect(replyToReport).toHaveBeenCalledWith({
        description: "Thanks — looking into it",
        photos: [],
      });
    });
  });

  it("opens CaptureSession add-photos flow from report reply camera button", () => {
    mockNavigateToAddPhotosCaptureSession.mockClear();
    mockUseTaskDetailViewAdapter.mockReturnValue({
      output: createAdapterOutput({
        reportTriage: {
          defaultAssigneeId: "worker-1",
          title: "Leak under sink",
          availableUsers: [],
        },
        detailDock: {
          mode: "report_reply",
          completionPercentage: 0,
        },
      }),
      actions: createAdapterActions(),
    } as ReturnType<typeof useTaskDetailViewAdapter>);

    const screen = render(<TaskDetailScreen taskId="task-1" onNavigateBack={jest.fn()} />);
    fireEvent.press(screen.getByTestId("report-reply-composer__photo"));

    expect(mockNavigateToAddPhotosCaptureSession).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        returnScreen: "TaskDetail",
        taskId: "task-1",
        uploadImmediately: false,
        entityType: "task-update",
      }),
    );
    expect(screen.getByTestId("report-reply-composer__triage_action")).toBeTruthy();
  });

  it("shows progress dock green submit affordance at 100% and posts via submitDockProgress", async () => {
    const submitDockProgress = jest.fn().mockResolvedValue(undefined);
    mockUseTaskDetailViewAdapter.mockReturnValue({
      output: createAdapterOutput({
        detailDock: {
          mode: "progress",
          completionPercentage: 100,
        },
      }),
      actions: {
        ...createAdapterActions(),
        submitDockProgress,
      },
    } as ReturnType<typeof useTaskDetailViewAdapter>);

    const screen = render(<TaskDetailScreen taskId="task-1" onNavigateBack={jest.fn()} />);

    expect(screen.getByTestId("report-reply-composer__send").props.accessibilityLabel).toBe(
      "Submit for review",
    );

    fireEvent.changeText(
      screen.getByTestId("report-reply-composer__input"),
      "Ready for PM review",
    );
    fireEvent.press(screen.getByTestId("report-reply-composer__send"));

    await waitFor(() => {
      expect(submitDockProgress).toHaveBeenCalledWith({
        description: "Ready for PM review",
        photos: [],
        completionPercentage: 100,
      });
    });
  });

  it("shows Cancel review dock when awaiting review and locks other controls", async () => {
    const cancelDockReview = jest.fn().mockResolvedValue(undefined);
    mockUseTaskDetailViewAdapter.mockReturnValue({
      output: createAdapterOutput({
        detailDock: {
          mode: "awaiting_review",
          completionPercentage: 100,
        },
      }),
      actions: {
        ...createAdapterActions(),
        cancelDockReview,
      },
    } as ReturnType<typeof useTaskDetailViewAdapter>);

    const screen = render(<TaskDetailScreen taskId="task-1" onNavigateBack={jest.fn()} />);

    expect(screen.getByTestId("report-reply-composer__cancel_review")).toBeTruthy();
    expect(screen.queryByTestId("report-reply-composer__input")).toBeNull();
    expect(screen.getByTestId("report-reply-composer__photo")).toBeDisabled();
    expect(screen.getByTestId("report-reply-composer__send")).toBeDisabled();
    expect(screen.getByText("100%")).toBeTruthy();

    fireEvent.press(screen.getByTestId("report-reply-composer__cancel_review"));
    await waitFor(() => {
      expect(cancelDockReview).toHaveBeenCalledTimes(1);
    });
  });

  it("shows Accept / Reject dock for creator review_decision mode", async () => {
    const approveTask = jest.fn().mockResolvedValue(undefined);
    const onNavigateToRejectTask = jest.fn();
    mockUseTaskDetailViewAdapter.mockReturnValue({
      output: createAdapterOutput({
        detailDock: {
          mode: "review_decision",
          completionPercentage: 100,
        },
      }),
      actions: {
        ...createAdapterActions(),
        approveTask,
      },
    } as ReturnType<typeof useTaskDetailViewAdapter>);

    const screen = render(
      <TaskDetailScreen
        taskId="task-1"
        onNavigateBack={jest.fn()}
        onNavigateToRejectTask={onNavigateToRejectTask}
      />,
    );

    expect(screen.getByTestId("report-reply-composer__approve")).toBeTruthy();
    expect(screen.getByTestId("report-reply-composer__reject")).toBeTruthy();
    expect(screen.queryByTestId("report-reply-composer__input")).toBeNull();
    expect(screen.getByText("100%")).toBeTruthy();

    fireEvent.press(screen.getByTestId("report-reply-composer__reject"));
    expect(onNavigateToRejectTask).toHaveBeenCalledWith("task-1", undefined);

    fireEvent.press(screen.getByTestId("report-reply-composer__approve"));
    await waitFor(() => {
      expect(approveTask).toHaveBeenCalledTimes(1);
    });
  });

  it("shows Archive dock after approval", () => {
    mockUseTaskDetailViewAdapter.mockReturnValue({
      output: createAdapterOutput({
        detailDock: {
          mode: "archive",
          completionPercentage: 100,
        },
      }),
      actions: createAdapterActions(),
    } as ReturnType<typeof useTaskDetailViewAdapter>);

    const screen = render(<TaskDetailScreen taskId="task-1" onNavigateBack={jest.fn()} />);
    expect(screen.getByTestId("report-reply-composer__archive")).toBeTruthy();
    fireEvent.press(screen.getByTestId("report-reply-composer__archive"));
    expect(screen.getByTestId("task-detail__archive-confirm")).toBeTruthy();
  });

  it("shows Reassign dock after decline", () => {
    const onNavigateToCreateTask = jest.fn();
    mockUseTaskDetailViewAdapter.mockReturnValue({
      output: createAdapterOutput({
        detailDock: {
          mode: "reassign",
          completionPercentage: 0,
        },
        infoCard: {
          ...createAdapterOutput().infoCard!,
          showReassignAction: true,
          reassignActionLabel: "Reassign",
        },
        actionItems: [
          {
            id: "action-reassign_task",
            actionId: "reassign_task",
            density: "standard",
            structuralState: "stale",
            label: "Reassign",
            icon: "people-outline",
          },
        ],
      }),
      actions: createAdapterActions(),
    } as ReturnType<typeof useTaskDetailViewAdapter>);

    const screen = render(
      <TaskDetailScreen
        taskId="task-1"
        onNavigateBack={jest.fn()}
        onNavigateToCreateTask={onNavigateToCreateTask}
      />,
    );
    expect(screen.getByTestId("report-reply-composer__reassign")).toBeTruthy();
    fireEvent.press(screen.getByTestId("report-reply-composer__reassign"));
    expect(onNavigateToCreateTask).toHaveBeenCalled();
  });

  it("shows unavailable state instead of endless loading when task is missing", () => {
    mockUseTaskDetailViewAdapter.mockReturnValue({
      output: createAdapterOutput({
        readiness: {
          hasUsableData: false,
        },
        continuity: {
          shouldRenderEmptyState: true,
          isInitialLoading: false,
          shouldRenderSkeletonShell: false,
        },
        header: {
          title: "Unavailable",
        },
      }),
      actions: createAdapterActions(),
    } as ReturnType<typeof useTaskDetailViewAdapter>);

    const onNavigateBack = jest.fn();
    const screen = render(
      <TaskDetailScreen taskId="task-gone" onNavigateBack={onNavigateBack} />,
    );

    expect(screen.getByTestId("task-detail__unavailable")).toBeTruthy();
    expect(screen.queryByText("Loading task details...")).toBeNull();
    fireEvent.press(screen.getByTestId("task-detail__unavailable_back"));
    expect(onNavigateBack).toHaveBeenCalledTimes(1);
  });

  it("hides report reply composer when not in triage mode", () => {
    const screen = render(<TaskDetailScreen taskId="task-1" onNavigateBack={jest.fn()} />);
    expect(screen.queryByTestId("report-reply-composer")).toBeNull();
  });
});
