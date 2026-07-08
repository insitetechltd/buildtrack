import React from "react";
import { render } from "@testing-library/react-native";

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
    quickActions: {
      id: "task-quick-actions",
      density: "standard",
      structuralState: "ready",
      actions: [
        {
          id: "quick-action-comment",
          actionId: "add_comment",
          label: "Add Comment",
          icon: "chatbubble-outline",
          isDisabled: false,
          density: "standard",
          structuralState: "ready",
        },
      ],
    },
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

  it("renders the hero outside the bounded scroll region so thread content never scrolls behind it", () => {
    const screen = render(<TaskDetailScreen taskId="task-1" onNavigateBack={jest.fn()} />);
    const workThreadScroll = screen.getByTestId("task-detail__workthread_scroll");

    expect(screen.getByTestId("task-detail__hero_shell")).toBeTruthy();
    expect(screen.getByTestId("task-detail__hero")).toBeTruthy();
    expect(screen.getByTestId("task-detail__scroll_region")).toBeTruthy();
    expect(screen.getByTestId("task-detail__info_card")).toBeTruthy();
    expect(screen.queryByTestId("task-detail__evidence_pinned_region")).toBeNull();
    expect(screen.queryByTestId("task-detail__active_entry_stage")).toBeNull();
    expect(workThreadScroll).toBeTruthy();
    expect(screen.getByTestId("task-detail__activity_thread")).toBeTruthy();
    expect(workThreadScroll.props.scrollEnabled).not.toBe(false);
    expect(workThreadScroll.props.stickyHeaderIndices).toBeUndefined();
    expect(workThreadScroll.props.contentContainerStyle).toEqual(
      expect.objectContaining({ flexGrow: 1 }),
    );
  });

  it("renders quick actions above the work thread and keeps other actions below the thread", () => {
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
          ],
        },
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
    expect(screen.getByTestId("task-detail__quick-actions")).toBeTruthy();
    expect(screen.getByTestId("task-detail__activity_thread")).toBeTruthy();
    expect(screen.getByTestId("task-detail__secondary-actions")).toBeTruthy();
    expect(screen.getByTestId("task-detail__info_card")).toBeTruthy();
  });

  it("anchors the quick actions in a bottom action bar outside the scroll region", () => {
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
    const bottomBarNode = findNodeByTestId(tree, "task-detail__bottom_action_bar");

    expect(screen.getByTestId("task-detail__quick-actions")).toBeTruthy();
    expect(bottomBarNode).toBeTruthy();
    expect(collectTestIds(bottomBarNode)).toContain("task-detail__quick-actions");
    expect(collectTestIds(scrollRegionNode)).not.toContain("task-detail__quick-actions");
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

    expect(screen.getByText("Description")).toBeTruthy();
    expect(screen.queryByTestId("task-detail__delegation_summary")).toBeNull();
    expect(screen.queryByText("Delegation details")).toBeNull();
    expect(screen.queryByTestId("task-detail__subtasks")).toBeNull();
    expect(screen.queryByText("Subtasks")).toBeNull();
    expect(screen.queryByTestId("task-detail__detail_section_card")).toBeNull();
  });
});
