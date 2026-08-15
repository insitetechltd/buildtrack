import React from "react";
import { fireEvent, render, renderHook } from "@testing-library/react-native";

import TaskDetailQuickActions from "../TaskDetailQuickActions";
import { useTaskDetailViewAdapter } from "../../../ui/viewAdapters/useTaskDetailViewAdapter";
import type { Task, TaskStatus } from "../../../types/buildtrack";

jest.mock("@/state/taskStore.supabase", () => ({
  useTaskStore: jest.fn(),
}));

jest.mock("@/state/authStore", () => ({
  useAuthStore: jest.fn(),
}));

jest.mock("@/state/userStore.supabase", () => ({
  useUserStore: jest.fn(),
}));

jest.mock("@/utils/dateFormatter", () => ({
  useDateFormatter: jest.fn(),
}));

jest.mock("@/utils/useTranslation", () => ({
  useTranslation: jest.fn(),
}));

const dueDate = "2026-10-10T08:00:00.000Z";

function buildTask({
  status,
  assignedBy = "manager-1",
  assignedTo = ["user-1"],
  primaryAssigneeId = assignedTo[0],
  completionPercentage = 0,
}: {
  status: TaskStatus;
  assignedBy?: string;
  assignedTo?: string[];
  primaryAssigneeId?: string;
  completionPercentage?: number;
}): Task {
  return {
    id: "task-1",
    title: "Task Detail Quick Action Task",
    projectId: "project-1",
    assignedTo,
    primaryAssigneeId,
    assignedBy,
    dueDate,
    status,
    priority: "medium",
    category: "general",
    description: "Task detail quick action coverage.",
    attachments: [],
    tags: [],
    updates: [],
    activities: [],
    completionPercentage,
    createdAt: new Date().toISOString(),
  } as Task;
}

function mockTaskStoreForTask(task: Task) {
  const { useTaskStore } = require("@/state/taskStore.supabase");

  useTaskStore.mockReturnValue({
    tasks: [task],
    fetchTaskById: jest.fn().mockResolvedValue(undefined),
    acceptTask: jest.fn(),
    declineTask: jest.fn(),
    submitTaskForReview: jest.fn(),
    acceptTaskCompletion: jest.fn(),
    acceptSubTaskCompletion: jest.fn(),
    submitSubTaskForReview: jest.fn(),
    acceptSubTask: jest.fn(),
    declineSubTask: jest.fn(),
    cancelTask: jest.fn(),
    updateTask: jest.fn(),
  });
}

function buildTaskDetailForStatus(status: TaskStatus) {
  if (status === "submitted_for_review") {
    mockTaskStoreForTask(
      buildTask({
        status,
        assignedBy: "user-1",
        assignedTo: ["user-2"],
        primaryAssigneeId: "user-2",
        completionPercentage: 100,
      }),
    );
  } else if (status === "accepted") {
    mockTaskStoreForTask(
      buildTask({
        status,
        completionPercentage: 40,
      }),
    );
  } else {
    mockTaskStoreForTask(buildTask({ status }));
  }

  return renderHook(() =>
    useTaskDetailViewAdapter({
      taskId: "task-1",
    }),
  ).result.current;
}

function buildQuickActionModel(actionIds: string[]) {
  const labels: Record<string, string> = {
    accept_task: "Accept",
    decline_task: "Decline",
    update_progress: "Add Photos",
    add_comment: "Add Comment",
  };

  return {
    id: "task-quick-actions",
    density: "standard" as const,
    structuralState: "ready" as const,
    actions: actionIds.map((actionId) => ({
      id: `action-${actionId}`,
      actionId,
      label: labels[actionId] ?? actionId,
      isDisabled: false,
      density: "standard" as const,
      structuralState: "ready" as const,
    })),
  };
}

describe("TaskDetailQuickActions", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    const { useAuthStore } = require("@/state/authStore");
    const { useUserStore } = require("@/state/userStore.supabase");
    const { useDateFormatter } = require("@/utils/dateFormatter");
    const { useTranslation } = require("@/utils/useTranslation");

    useAuthStore.mockReturnValue({
      user: {
        id: "user-1",
        companyId: "company-1",
        name: "Casey",
      },
    });

    useUserStore.mockReturnValue({
      getUserById: jest.fn((id: string) => ({
        id,
        name: `User ${id}`,
      })),
    });

    useDateFormatter.mockReturnValue({
      formatDateShort: jest.fn(() => "Oct 10, 2026"),
      formatDateTime: jest.fn(() => "Oct 10, 2026, 8:00 AM"),
    });

    useTranslation.mockReturnValue({
      taskDetail: {
        submittedForReview: "Submitted for Review",
        taskApproved: "Task Approved",
        reviewedAndApproved: "Reviewed and approved by",
        taskDeclined: "Task Declined",
        taskRejected: "Task Rejected",
        completionRejected: "Completion rejected",
        reason: "Reason:",
        editTaskDetails: "Edit Task Details",
        accept: "Accept",
        decline: "Decline",
        updateTask: "Update Progress",
        due: "Due",
      },
      projects: {
        unknown: "Unknown",
      },
    });
  });

  it("renders the quick actions as a fixed two-button row", () => {
    const screen = render(
      <TaskDetailQuickActions
        model={buildQuickActionModel(["accept_task", "decline_task"])}
        onPress={jest.fn()}
      />,
    );

    expect(screen.getByTestId("task-detail__quick-actions")).toBeTruthy();
    expect(screen.getByTestId("task-detail__quick-actions-row")).toBeTruthy();
    expect(screen.queryByText("Quick Actions")).toBeNull();
    expect(screen.getByText("Accept")).toBeTruthy();
    expect(screen.getByText("Decline")).toBeTruthy();
  });

  it("renders both action buttons with equal width in the bottom bar", () => {
    const screen = render(
      <TaskDetailQuickActions
        model={buildQuickActionModel(["update_progress", "add_comment"])}
        onPress={jest.fn()}
      />,
    );

    const addPhotosButton = screen.getByTestId(
      "task-detail__quick-action-update_progress",
    );
    const addCommentButton = screen.getByTestId(
      "task-detail__quick-action-add_comment",
    );

    expect(addPhotosButton).toBeTruthy();
    expect(addCommentButton).toBeTruthy();
    expect(addPhotosButton.props.className).toContain("flex-1");
    expect(addCommentButton.props.className).toContain("flex-1");
  });

  it("calls onPress with the tapped action id", () => {
    const onPress = jest.fn();
    const screen = render(
      <TaskDetailQuickActions
        model={buildQuickActionModel(["accept_task"])}
        onPress={onPress}
      />,
    );

    fireEvent.press(screen.getByTestId("task-detail__quick-action-accept_task"));

    expect(onPress).toHaveBeenCalledWith("accept_task");
  });

  it("shows accept_task and decline_task before the task is accepted", () => {
    const { output } = buildTaskDetailForStatus("assigned");

    expect(output.quickActions?.actions.map((action) => action.actionId)).toEqual([
      "accept_task",
      "decline_task",
    ]);
  });

  it("does not promote photos or comment into in-screen quick actions after accept", () => {
    const { output } = buildTaskDetailForStatus("accepted");

    expect(output.quickActions).toBeUndefined();
    expect(output.actionItems.some((action) => action.actionId === "update_progress")).toBe(true);
    expect(output.actionItems.find((action) => action.actionId === "update_progress")?.label).toBe(
      "Update",
    );
  });

  it("does not promote photos or comment into in-screen quick actions during review", () => {
    const { output } = buildTaskDetailForStatus("submitted_for_review");

    expect(output.quickActions).toBeUndefined();
    expect(output.actionItems.some((action) => action.actionId === "approve_task")).toBe(true);
    expect(output.actionItems.some((action) => action.actionId === "reject_task")).toBe(true);
  });
});
