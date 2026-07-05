import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import { Pressable, Text } from "react-native";

import TaskDetailInfoCard from "../../components/taskDetail/TaskDetailInfoCard";
import TaskDetailScreen from "../../screens/TaskDetailScreen";
import { useTaskDetailViewAdapter } from "../../ui/viewAdapters/useTaskDetailViewAdapter";

jest.mock("../../ui/viewAdapters/useTaskDetailViewAdapter", () => ({
  useTaskDetailViewAdapter: jest.fn(),
}));

jest.mock("../../components/primitives/container/ContainerCard", () => ({
  __esModule: true,
  default: function MockContainerCard({ contract }: { contract: any }) {
    const ReactNative = require("react-native");
    const MockPressable = ReactNative.Pressable;
    const MockText = ReactNative.Text;

    return (
      <MockPressable testID={contract.testId} onPress={contract.onPress}>
        <MockText>{contract.chrome?.title}</MockText>
      </MockPressable>
    );
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

describe("TaskDetailScreen acceptance UI", () => {
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
      assignedByLabel: "Casey",
      assignedToLabel: "Sam, Alex",
      primaryOwnerLabel: "Sam",
      teamSummaryLabel: "2 assignees",
      isCritical: false,
      criticalLabel: undefined,
    },
    delegationSummary: {
      id: "delegation-summary",
      density: "standard",
      structuralState: "ready",
      assignedByLabel: "Casey",
      assignedToLabel: "Sam, Alex",
      primaryOwnerLabel: "Sam",
      teamSummaryLabel: "2 assignees",
    },
    infoCard: {
      id: "task-info-card",
      density: "standard",
      structuralState: "ready",
      descriptionLabel: "Confirm supplier lead times before final delivery.",
      assignedByLabel: "Casey",
      assignedToLabel: "Sam, Alex",
      primaryOwnerLabel: "Sam",
      detailRows: [
        { id: "row-due", label: "Due", value: "Jul 10, 2026" },
        { id: "row-category", label: "Category", value: "General" },
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
        photoUrls: [
          "https://example.com/activity-photo.jpg",
          "https://example.com/activity-photo-2.jpg",
        ],
        subtaskBadgeLabel: "Subtask",
        subtaskTitleLabel: "Inspect ceiling grid",
        density: "standard",
        structuralState: "ready",
      },
    ],
    subtaskSummary: {
      id: "subtask-summary",
      density: "standard",
      structuralState: "ready",
      title: "Subtasks",
      totalCount: 1,
    },
    banners: [],
    detailSections: [],
    assigners: [],
    assignees: [],
    activities: [],
    childTasks: [
      {
        id: "child-1",
        taskId: "child-1",
        title: "Inspect ceiling grid",
        statusToken: "task_in_progress",
        statusLabel: "In Progress",
        responsibilityToken: "assigned_to_me",
        priorityLabel: "Medium",
        assigneeSummary: "Sam",
        projectName: "Project Alpha",
        attachmentUris: [],
        density: "standard",
        structuralState: "ready",
        isOverdue: false,
      },
    ],
    actionItems: [
      {
        id: "action-update",
        actionId: "update_progress",
        label: "Update Progress",
        icon: "trending-up-outline",
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

  it("renders one scrolling info card containing description, delegation, and compact details", () => {
    const screen = render(
      <TaskDetailInfoCard
        model={{
          id: "task-info-card",
          density: "standard",
          structuralState: "ready",
          descriptionLabel: "Confirm supplier lead times before final delivery.",
          assignedByLabel: "Casey",
          assignedToLabel: "Sam, Alex",
          primaryOwnerLabel: "Sam",
          detailRows: [
            { id: "row-due", label: "Due", value: "Jul 10, 2026" },
            { id: "row-category", label: "Category", value: "Procurement" },
          ],
        }}
      />,
    );

    expect(screen.getByTestId("task-detail__info_card")).toBeTruthy();
    expect(screen.getByText("Description")).toBeTruthy();
    expect(screen.getByText("Delegation")).toBeTruthy();
    expect(screen.getByText("Details")).toBeTruthy();
    expect(screen.getByText("Confirm supplier lead times before final delivery.")).toBeTruthy();
    expect(screen.getByText("Assigned by")).toBeTruthy();
    expect(screen.getByText("Assigned to")).toBeTruthy();
    expect(screen.getByText("Casey")).toBeTruthy();
    expect(screen.getByText("Sam, Alex")).toBeTruthy();
    expect(screen.getByText("Due")).toBeTruthy();
    expect(screen.getByText("Jul 10, 2026")).toBeTruthy();
  });

  it("renders task detail as a work-thread surface with hero, info card, and unified thread but no evidence or separate subtasks card", () => {
    const screen = render(<TaskDetailScreen taskId="task-1" onNavigateBack={jest.fn()} />);

    expect(screen.getByTestId("task-detail__hero")).toBeTruthy();
    expect(screen.getByTestId("task-detail__info_card")).toBeTruthy();
    expect(screen.queryByTestId("task-detail__delegation_summary")).toBeNull();
    expect(screen.queryByTestId("task-detail__evidence_pinned_region")).toBeNull();
    expect(screen.queryByTestId("task-detail__active_entry_stage")).toBeNull();
    expect(screen.getByTestId("task-detail__activity_thread")).toBeTruthy();
    expect(screen.queryByTestId("task-detail__subtasks")).toBeNull();
    expect(screen.getByText("Subtask")).toBeTruthy();
    expect(screen.getByText("Inspect ceiling grid")).toBeTruthy();
  });

  it("surfaces subtask context inside the unified thread entry", () => {
    const screen = render(<TaskDetailScreen taskId="task-1" onNavigateBack={jest.fn()} />);

    expect(screen.getByText("Subtask")).toBeTruthy();
    expect(screen.getByText("Inspect ceiling grid")).toBeTruthy();
    expect(screen.getByText("Marked 100% complete")).toBeTruthy();
  });

  it("renders a small critical flag in the hero and no standalone critical section", () => {
    const baseOutput = createAdapterOutput();

    mockUseTaskDetailViewAdapter.mockReturnValue({
      output: createAdapterOutput({
        taskHero: {
          ...baseOutput.taskHero,
          isCritical: true,
          criticalLabel: "Critical this week",
        },
      }),
      actions: createAdapterActions(),
    } as ReturnType<typeof useTaskDetailViewAdapter>);

    const screen = render(<TaskDetailScreen taskId="task-1" onNavigateBack={jest.fn()} />);

    expect(screen.getByTestId("task-detail__hero_critical_flag")).toBeTruthy();
    expect(screen.queryByTestId("task-detail__toggle_critical_this_week")).toBeNull();
  });

  it("renders delegation in the hero and no longer renders the Next step block", () => {
    const screen = render(<TaskDetailScreen taskId="task-1" onNavigateBack={jest.fn()} />);

    expect(screen.queryByText("Next step")).toBeNull();
    expect(screen.getByTestId("task-detail__hero_delegation")).toBeTruthy();
  });

  it("does not render the active update stage surface anywhere on the screen", () => {
    const screen = render(<TaskDetailScreen taskId="task-1" onNavigateBack={jest.fn()} />);

    expect(screen.queryByText("Active update")).toBeNull();
    expect(screen.queryByTestId("task-detail__active_entry_stage")).toBeNull();
  });

  it("keeps photo storytelling inside the work thread instead of a pinned evidence surface", () => {
    const screen = render(<TaskDetailScreen taskId="task-1" onNavigateBack={jest.fn()} />);

    expect(screen.getByTestId("task-activity-timeline__lead-photo-activity-1")).toBeTruthy();
    expect(screen.queryByTestId("task-detail__active_stage_photo_featured")).toBeNull();
  });

  it("renders subtask context in the work thread and opens the full-photo viewer on tap", () => {
    const screen = render(<TaskDetailScreen taskId="task-1" onNavigateBack={jest.fn()} />);

    expect(screen.getByText("Subtask")).toBeTruthy();
    expect(screen.getByText("Inspect ceiling grid")).toBeTruthy();

    fireEvent.press(screen.getByTestId("task-activity-timeline__lead-photo-pressable-activity-1"));

    expect(screen.getByTestId("task-activity-timeline__photo_viewer")).toBeTruthy();
    expect(screen.getByTestId("task-activity-timeline__photo_viewer_image").props.source).toEqual({
      uri: "https://example.com/activity-photo.jpg",
    });
  });

  it("does not render the top project-label string in the compact hero", () => {
    const baseOutput = createAdapterOutput();

    mockUseTaskDetailViewAdapter.mockReturnValue({
      output: createAdapterOutput({
        taskHero: {
          ...baseOutput.taskHero,
          projectLabel: "Hero Project Label",
        },
      }),
      actions: createAdapterActions(),
    } as ReturnType<typeof useTaskDetailViewAdapter>);

    const screen = render(<TaskDetailScreen taskId="task-1" onNavigateBack={jest.fn()} />);

    expect(screen.getByText("Replace ceiling tiles")).toBeTruthy();
    expect(screen.queryByText("Hero Project Label")).toBeNull();
  });

  it("keeps secondary actions visible inline for creators and demotes edit below the promoted primary action", () => {
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
    expect(screen.getByText("Edit Task Details")).toBeTruthy();
    expect(screen.getByText("Add Comment")).toBeTruthy();
  });

  it("hides edit action for non-creators while keeping other secondary actions visible", () => {
    const screen = render(<TaskDetailScreen taskId="task-1" onNavigateBack={jest.fn()} />);

    expect(screen.getByTestId("task-detail__secondary-actions")).toBeTruthy();
    expect(screen.getByText("Other actions")).toBeTruthy();
    expect(screen.queryByText("Edit Task Details")).toBeNull();
    expect(screen.getByText("Add Comment")).toBeTruthy();
  });
});
