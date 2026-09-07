import React from "react";
import { fireEvent, render, within } from "@testing-library/react-native";
import { View } from "react-native";

import TaskDetailHero from "../../components/taskDetail/TaskDetailHero";
import TaskDetailInfoCard from "../../components/taskDetail/TaskDetailInfoCard";
import TaskDetailQuickActions from "../../components/taskDetail/TaskDetailQuickActions";
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
  useAuthStore: (selector?: (state: { user: { id: string; companyId: string; name: string } }) => unknown) => {
    const state = { user: { id: "user-1", companyId: "company-1", name: "Casey" } };
    return typeof selector === "function" ? selector(state) : state;
  },
}));

jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    push: jest.fn(),
    getParent: () => ({ getState: () => undefined }),
  }),
}));

jest.mock("../../navigation/captureFirstCameraFlow", () => ({
  navigateToAddPhotosCaptureSession: jest.fn(),
}));

jest.mock("../../navigation/reportTriageSpeedDialStore", () => ({
  useReportTriageDialExpanded: () => false,
  setReportTriageDialExpanded: jest.fn(),
  toggleReportTriageDialExpanded: jest.fn(),
}));

jest.mock("../../navigation/taskDetailBackNavigation", () => ({
  navigateReportTriageAction: jest.fn(),
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
      categoryLabel: "Interior",
      projectLabel: "Project Alpha",
      completionLabel: "50% complete",
      dueDateLabel: "Jul 10, 2026",
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
      title: "Replace ceiling tiles",
      descriptionLabel: "Confirm supplier lead times before final delivery.",
      siteLocationLabel: "Level 9 Rooftop",
      assignedByLabel: "Casey",
      assignedToLabel: "Sam, Alex",
      primaryOwnerLabel: "Sam",
      statusLabel: "In Progress",
      categoryLabel: "Interior",
      completionLabel: "50% complete",
      dueDateLabel: "Jul 10, 2026",
      detailRows: [],
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
    replyToReport: jest.fn().mockResolvedValue(undefined),
    fetchTask: jest.fn(),
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseTaskDetailViewAdapter.mockReturnValue({
      output: createAdapterOutput(),
      actions: createAdapterActions(),
    } as ReturnType<typeof useTaskDetailViewAdapter>);
  });

  it("renders one scrolling info card with the task title and compact metadata chips", () => {
    const screen = render(
      <TaskDetailInfoCard
        model={{
          id: "task-info-card",
          density: "standard",
          structuralState: "ready",
          title: "Replace ceiling tiles",
          descriptionLabel: "Confirm supplier lead times before final delivery.",
          siteLocationLabel: "Level 9 Rooftop",
          assignedByLabel: "Casey",
          assignedToLabel: "Sam, Alex",
          primaryOwnerLabel: "Sam",
          detailRows: [],
        }}
      />,
    );

    expect(screen.getByTestId("task-detail__info_card")).toBeTruthy();
    expect(screen.getByTestId("task-detail__info_card_title")).toBeTruthy();
    expect(screen.getByText("Replace ceiling tiles")).toBeTruthy();
    expect(screen.queryByText("Confirm supplier lead times before final delivery.")).toBeNull();
    expect(screen.getByTestId("task-detail__location_group")).toBeTruthy();
    expect(screen.getByTestId("task-detail__location_group__summary")).toBeTruthy();
    fireEvent.press(screen.getByTestId("task-detail__location_group__toggle"));
    expect(screen.getByText("Site")).toBeTruthy();
    expect(screen.getByText("Level 9 Rooftop")).toBeTruthy();
    expect(screen.getByTestId("task-detail__people_group")).toBeTruthy();
    expect(screen.getByText("Team")).toBeTruthy();
    expect(screen.getByTestId("task-detail__people_group__summary").props.children).toBe(
      "Assigned to Sam, Alex",
    );
    fireEvent.press(screen.getByTestId("task-detail__people_group__toggle"));
    expect(screen.getByText("Assigned by")).toBeTruthy();
    expect(screen.getByText("Casey")).toBeTruthy();
    expect(screen.getByText("Assigned to")).toBeTruthy();
    expect(screen.getByText("Sam, Alex")).toBeTruthy();
    expect(screen.getByText("Owner")).toBeTruthy();
    expect(screen.getByText("Sam")).toBeTruthy();
  });

  it("collapses Task Details groups by default and expands labeled rows on toggle", () => {
    const screen = render(
      <TaskDetailInfoCard
        model={{
          id: "task-info-card",
          density: "standard",
          structuralState: "ready",
          statusLabel: "In Progress",
          categoryLabel: "Interior",
          completionLabel: "50% complete",
          dueDateLabel: "Jul 10, 2026",
          siteLocationLabel: "Level 9 Rooftop",
          assignedByLabel: "Casey",
          assignedToLabel: "Sam, Alex",
          primaryOwnerLabel: "Sam",
          detailRows: [],
        }}
      />,
    );

    expect(screen.getByTestId("task-detail__status_chips__summary")).toBeTruthy();
    expect(screen.queryByText("Status")).toBeNull();
    expect(screen.queryByText("Category")).toBeNull();
    expect(screen.getByTestId("task-detail__location_group__summary")).toBeTruthy();
    expect(screen.queryByText("Site")).toBeNull();

    fireEvent.press(screen.getByTestId("task-detail__status_chips__toggle"));
    expect(screen.queryByTestId("task-detail__status_chips__summary")).toBeNull();
    expect(screen.getByText("Status")).toBeTruthy();
    expect(screen.getByText("Category")).toBeTruthy();
    expect(screen.getByText("Interior")).toBeTruthy();

    fireEvent.press(screen.getByTestId("task-detail__status_chips__toggle"));
    expect(screen.getByTestId("task-detail__status_chips__summary")).toBeTruthy();
    expect(screen.queryByText("Status")).toBeNull();
  });

  it("summarizes Team as Assigned by when the current user is an assignee", () => {
    const screen = render(
      <TaskDetailInfoCard
        model={{
          id: "task-info-card",
          density: "standard",
          structuralState: "ready",
          assignedByLabel: "Casey",
          assignedToLabel: "Sam, Alex",
          primaryOwnerLabel: "Sam",
          isAssignedToCurrentUser: true,
          detailRows: [],
        }}
      />,
    );

    expect(screen.getByText("Team")).toBeTruthy();
    expect(screen.getByTestId("task-detail__people_group__summary").props.children).toBe(
      "Assigned by Casey",
    );
    expect(screen.queryByText("Owner Sam")).toBeNull();
  });

  it("summarizes Team as Assigned to when the current user is not an assignee", () => {
    const screen = render(
      <TaskDetailInfoCard
        model={{
          id: "task-info-card",
          density: "standard",
          structuralState: "ready",
          assignedByLabel: "Casey",
          assignedToLabel: "Sam, Alex",
          primaryOwnerLabel: "Sam",
          isAssignedToCurrentUser: false,
          detailRows: [],
        }}
      />,
    );

    expect(screen.getByTestId("task-detail__people_group__summary").props.children).toBe(
      "Assigned to Sam, Alex",
    );
    expect(screen.queryByText("Owner Sam")).toBeNull();
  });

  it("uses larger readable sizes for hero and compact Task Details chip text", () => {
    const { taskHero, infoCard } = createAdapterOutput();

    const hero = render(<TaskDetailHero model={taskHero} />);
    const infoCardScreen = render(<TaskDetailInfoCard model={infoCard} />);

    expect(hero.getByText("In Progress").props.className).toContain("text-base");
    expect(hero.getByText("Interior").props.className).toContain("text-base");
    expect(hero.getByText("50% complete").props.className).toContain("text-base");
    expect(hero.getByText("Due Jul 10, 2026").props.className).toContain("text-base");

    expect(infoCardScreen.getByTestId("task-detail__info_card").props.className).toContain("p-[14px]");
    expect(infoCardScreen.getByText("Replace ceiling tiles").props.className).toContain("text-lg");
    expect(infoCardScreen.queryByText("Confirm supplier lead times before final delivery.")).toBeNull();
    expect(infoCardScreen.getByTestId("task-detail__status_chips")).toBeTruthy();
    fireEvent.press(infoCardScreen.getByTestId("task-detail__status_chips__toggle"));
    expect(infoCardScreen.getByText("Interior").props.className).toContain("text-sm");
    expect(infoCardScreen.getByText("In Progress").props.className).toContain("text-sm");
    expect(infoCardScreen.getByText("50% complete").props.className).toContain("text-sm");
    expect(infoCardScreen.getByText("Jul 10, 2026").props.className).toContain("text-sm");
    expect(infoCardScreen.getByTestId("task-detail__detail_chips")).toBeTruthy();
    expect(infoCardScreen.getByTestId("task-detail__location_group")).toBeTruthy();
    fireEvent.press(infoCardScreen.getByTestId("task-detail__location_group__toggle"));
    expect(infoCardScreen.getByTestId("task-detail__people_group")).toBeTruthy();
    fireEvent.press(infoCardScreen.getByTestId("task-detail__people_group__toggle"));
    expect(infoCardScreen.getByText("Level 9 Rooftop").props.className).toContain("text-sm");
    expect(infoCardScreen.getByText("Casey").props.className).toContain("text-sm");
    expect(infoCardScreen.getByText("Sam, Alex").props.className).toContain("text-sm");
  });

  it("keeps quick actions below the info card in the task-detail content stack", () => {
    const infoCard = createAdapterOutput().infoCard;
    const screen = render(
      <View>
        <TaskDetailInfoCard model={infoCard} />
        <TaskDetailQuickActions
          model={{
            id: "task-quick-actions",
            density: "standard",
            structuralState: "ready",
            actions: [
              {
                id: "action-accept",
                actionId: "accept_task",
                label: "Accept",
                isDisabled: false,
                density: "standard",
                structuralState: "ready",
              },
              {
                id: "action-decline",
                actionId: "decline_task",
                label: "Decline",
                isDisabled: false,
                density: "standard",
                structuralState: "ready",
              },
            ],
          }}
          onPress={jest.fn()}
        />
      </View>,
    );

    const tree = screen.toJSON();
    const childTestIds =
      tree && !Array.isArray(tree) && Array.isArray(tree.children)
        ? tree.children.map((child: any) => child?.props?.testID)
        : [];

    expect(screen.getByTestId("task-detail__info_card")).toBeTruthy();
    expect(screen.getByTestId("task-detail__quick-actions")).toBeTruthy();
    expect(screen.getByText("Accept")).toBeTruthy();
    expect(screen.getByText("Decline")).toBeTruthy();
    expect(childTestIds).toEqual(["task-detail__info_card", "task-detail__quick-actions"]);
  });

  it("renders accept_task and decline_task in the bottom quick-action set before acceptance", () => {
    mockUseTaskDetailViewAdapter.mockReturnValue({
      output: createAdapterOutput({
        quickActions: {
          id: "task-quick-actions",
          density: "standard",
          structuralState: "ready",
          actions: [
            {
              id: "action-accept",
              actionId: "accept_task",
              label: "Accept",
              isDisabled: false,
              density: "standard",
              structuralState: "ready",
            },
            {
              id: "action-decline",
              actionId: "decline_task",
              label: "Decline",
              isDisabled: false,
              density: "standard",
              structuralState: "ready",
            },
          ],
        },
        actionItems: [
          {
            id: "action-accept",
            actionId: "accept_task",
            label: "Accept",
            icon: "checkmark-circle-outline",
            isDisabled: false,
            density: "standard",
            structuralState: "ready",
          },
          {
            id: "action-decline",
            actionId: "decline_task",
            label: "Decline",
            icon: "close-circle-outline",
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
    expect(screen.getByTestId("task-detail__quick-action-accept_task")).toBeTruthy();
    expect(screen.getByTestId("task-detail__quick-action-decline_task")).toBeTruthy();
    expect(screen.queryByTestId("task-detail__quick-action-approve_task")).toBeNull();
    expect(screen.queryByTestId("task-detail__quick-action-reject_task")).toBeNull();
  });

  it("does not render Add Photos or Add Comment on task detail", () => {
    mockUseTaskDetailViewAdapter.mockReturnValue({
      output: createAdapterOutput({
        quickActions: {
          id: "task-quick-actions",
          density: "standard",
          structuralState: "ready",
          actions: [
            {
              id: "action-approve",
              actionId: "approve_task",
              label: "Approve",
              icon: "checkmark-circle-outline",
              isDisabled: false,
              density: "standard",
              structuralState: "ready",
            },
            {
              id: "action-reject",
              actionId: "reject_task",
              label: "Reject",
              icon: "close-circle-outline",
              isDisabled: false,
              density: "standard",
              structuralState: "ready",
            },
          ],
        },
        actionItems: [
          {
            id: "action-update",
            actionId: "update_progress",
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

    expect(screen.queryByTestId("task-detail__quick-action-update_progress")).toBeNull();
    expect(screen.queryByTestId("task-detail__quick-action-add_comment")).toBeNull();
    expect(screen.queryByText("Add Photos")).toBeNull();
    expect(screen.queryByText("Add Comment")).toBeNull();
    expect(screen.getByTestId("task-detail__quick-action-approve_task")).toBeTruthy();
    expect(screen.getByTestId("task-detail__quick-action-reject_task")).toBeTruthy();
  });

  it("renders task detail as a work-thread surface with status chips in Task Details, and no hero", () => {
    const screen = render(<TaskDetailScreen taskId="task-1" onNavigateBack={jest.fn()} />);

    expect(screen.queryByTestId("task-detail__hero")).toBeNull();
    expect(screen.queryByTestId("task-detail__header_badges")).toBeNull();
    expect(screen.getByTestId("task-detail__status_chips")).toBeTruthy();
    expect(screen.getByTestId("task-detail__info_card")).toBeTruthy();
    expect(screen.queryByTestId("task-detail__delegation_summary")).toBeNull();
    expect(screen.queryByTestId("task-detail__evidence_pinned_region")).toBeNull();
    expect(screen.queryByTestId("task-detail__active_entry_stage")).toBeNull();
    expect(screen.getByTestId("task-detail__activity_thread")).toBeTruthy();
    expect(screen.getByTestId("task-activity-timeline__metadata_line_1-activity-1")).toBeTruthy();
    expect(screen.getByTestId("task-activity-timeline__metadata_line_2-activity-1")).toBeTruthy();
    expect(screen.getByTestId("task-activity-timeline__description-activity-1")).toBeTruthy();
    expect(screen.getByTestId("task-activity-timeline__photo_stack-activity-1")).toBeTruthy();
    expect(screen.getByTestId("task-activity-timeline__photo_swipe_surface-activity-1")).toBeTruthy();
    expect(screen.queryByTestId("task-detail__subtasks")).toBeNull();
    expect(screen.getByText("Subtask")).toBeTruthy();
    expect(screen.getByText("Inspect ceiling grid")).toBeTruthy();
  });

  it("surfaces subtask context inside the unified thread entry", () => {
    const screen = render(<TaskDetailScreen taskId="task-1" onNavigateBack={jest.fn()} />);

    expect(screen.getByText("Subtask")).toBeTruthy();
    expect(screen.getByText("Inspect ceiling grid")).toBeTruthy();
    expect(screen.getByText("Submitted task for review")).toBeTruthy();
  });

  it("highlights due date in red when critical this week (no separate Priority badge)", () => {
    const baseOutput = createAdapterOutput();

    mockUseTaskDetailViewAdapter.mockReturnValue({
      output: createAdapterOutput({
        infoCard: {
          ...baseOutput.infoCard,
          isCritical: true,
          dueDateLabel: "Jul 10, 2026",
          criticalLabel: undefined,
          showEditAction: true,
          editActionLabel: "Edit Task Details",
        },
        taskHero: {
          ...baseOutput.taskHero,
          isCritical: true,
          dueDateLabel: "Jul 10, 2026",
          criticalLabel: undefined,
        },
      }),
      actions: createAdapterActions(),
    } as ReturnType<typeof useTaskDetailViewAdapter>);

    const screen = render(<TaskDetailScreen taskId="task-1" onNavigateBack={jest.fn()} />);

    expect(screen.queryByTestId("task-detail__header_badges")).toBeNull();
    expect(screen.queryByText("Critical this week")).toBeNull();
    expect(screen.getByTestId("task-detail__info_card_edit")).toBeTruthy();
    fireEvent.press(screen.getByTestId("task-detail__status_chips__toggle"));
    expect(screen.queryByText("Priority")).toBeNull();
    expect(screen.getByTestId("task-detail__due_date")).toBeTruthy();
    const dueText = within(screen.getByTestId("task-detail__due_date")).getByText(
      "Jul 10, 2026",
    );
    expect(dueText).toBeTruthy();
    expect(dueText.props.style).toEqual(
      expect.objectContaining({ color: "#DC2626" }),
    );
    expect(screen.queryByTestId("task-detail__toggle_critical_this_week")).toBeNull();
  });

  it("keeps the hero status-only even when delegation labels exist on the model", () => {
    const screen = render(<TaskDetailHero model={createAdapterOutput().taskHero} />);

    expect(screen.queryByText("Next step")).toBeNull();
    expect(screen.queryByText("Delegation")).toBeNull();
    expect(screen.queryByTestId("task-detail__hero_delegation")).toBeNull();
  });

  it("does not render the active update stage surface anywhere on the screen", () => {
    const screen = render(<TaskDetailScreen taskId="task-1" onNavigateBack={jest.fn()} />);

    expect(screen.queryByText("Active update")).toBeNull();
    expect(screen.queryByTestId("task-detail__active_entry_stage")).toBeNull();
  });

  it("keeps photo storytelling inside the work thread instead of a pinned evidence surface", () => {
    const screen = render(<TaskDetailScreen taskId="task-1" onNavigateBack={jest.fn()} />);

    expect(screen.getByTestId("task-activity-timeline__photo_stack-activity-1")).toBeTruthy();
    expect(screen.queryByTestId("task-activity-timeline__photo_caption-activity-1")).toBeNull();
    expect(screen.queryByText("Added 2 photos")).toBeNull();
    expect(screen.getByTestId("task-activity-timeline__photo_swipe_surface-activity-1")).toBeTruthy();
    expect(screen.getByTestId("task-activity-timeline__gallery_pager-activity-1")).toBeTruthy();
    expect(screen.queryByTestId("task-activity-timeline__gallery_previous-activity-1")).toBeNull();
    expect(screen.queryByTestId("task-activity-timeline__gallery_next-activity-1")).toBeNull();
    expect(screen.queryByTestId("task-detail__active_stage_photo_featured")).toBeNull();
  });

  it("renders subtask context in the work thread and opens the full-photo viewer from the swiped gallery photo", () => {
    const screen = render(<TaskDetailScreen taskId="task-1" onNavigateBack={jest.fn()} />);

    expect(screen.getByText("Subtask")).toBeTruthy();
    expect(screen.getByText("Inspect ceiling grid")).toBeTruthy();

    fireEvent(screen.getByTestId("task-activity-timeline__photo_swipe_surface-activity-1"), "momentumScrollEnd", {
      nativeEvent: {
        contentOffset: { x: 320, y: 0 },
        layoutMeasurement: { width: 320, height: 240 },
      },
    });
    fireEvent.press(screen.getByTestId("task-activity-timeline__lead-photo-pressable-activity-1"));

    expect(screen.getByTestId("task-activity-timeline__photo_viewer")).toBeTruthy();
    expect(screen.getByTestId("task-activity-timeline__photo_viewer_image").props.source).toEqual(
      expect.objectContaining({
        uri: "https://example.com/activity-photo-2.jpg",
      }),
    );
    expect(screen.getByText("2 / 2")).toBeTruthy();
  });

  it("anchors creation-time photos to the created event only in the rendered thread contract", () => {
    mockUseTaskDetailViewAdapter.mockReturnValue({
      output: createAdapterOutput({
        activityThread: [
          {
            id: "created-1",
            actorLabel: "Casey",
            eventLabel: "Created task",
            timestampLabel: "Jul 1, 08:00",
            progressLabel: "0%",
            detailLabel: "Created the task with initial site photos.",
            photoUrls: [
              "https://example.com/create-photo-1.jpg",
              "https://example.com/create-photo-2.jpg",
              "https://example.com/create-photo-3.jpg",
            ],
            density: "standard",
            structuralState: "ready",
          },
          {
            id: "progress-1",
            actorLabel: "Sam",
            eventLabel: "Updated progress to 40%",
            timestampLabel: "Jul 2, 09:30",
            progressLabel: "40%",
            detailLabel: "Added the first progress update.",
            photoUrls: [],
            density: "standard",
            structuralState: "ready",
          },
        ],
      }),
      actions: createAdapterActions(),
    } as ReturnType<typeof useTaskDetailViewAdapter>);

    const screen = render(<TaskDetailScreen taskId="task-1" onNavigateBack={jest.fn()} />);

    expect(screen.getByTestId("task-activity-timeline__entry-created-1")).toBeTruthy();
    expect(screen.getByTestId("task-activity-timeline__photo_stack-created-1")).toBeTruthy();
    expect(screen.queryByTestId("task-activity-timeline__photo_caption-created-1")).toBeNull();
    expect(screen.queryByText("Added 3 photos")).toBeNull();
    expect(screen.queryByTestId("task-activity-timeline__photo_caption-progress-1")).toBeNull();
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

    expect(screen.getByTestId("task-detail__header_title_block")).toBeTruthy();
    expect(screen.queryByText("Hero Project Label")).toBeNull();
  });

  it("hides Other actions card; edit lives on the hero card when allowed", () => {
    mockUseTaskDetailViewAdapter.mockReturnValue({
      output: createAdapterOutput({
        infoCard: {
          ...createAdapterOutput().infoCard!,
          showEditAction: true,
          editActionLabel: "Edit Task Details",
        },
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

    expect(screen.queryByTestId("task-detail__secondary-actions")).toBeNull();
    expect(screen.queryByText("Other actions")).toBeNull();
    expect(screen.getByTestId("task-detail__info_card_edit")).toBeTruthy();
    expect(screen.queryByText("Add Comment")).toBeNull();
  });

  it("hides edit action for non-creators while omitting photos and comment from the screen", () => {
    const screen = render(<TaskDetailScreen taskId="task-1" onNavigateBack={jest.fn()} />);

    expect(screen.queryByTestId("task-detail__info_card_edit")).toBeNull();
    expect(screen.queryByText("Edit Task Details")).toBeNull();
    expect(screen.queryByText("Add Comment")).toBeNull();
    expect(screen.queryByText("Add Photos")).toBeNull();
    expect(screen.queryByTestId("task-detail__location_editor")).toBeNull();
    expect(screen.queryByTestId("task-detail__tags_primary_editor")).toBeNull();
  });
});
