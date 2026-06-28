import { renderHook } from "@testing-library/react-native";

import { useTaskDetailViewAdapter } from "../useTaskDetailViewAdapter";

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

describe("useTaskDetailViewAdapter", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    const { useAuthStore } = require("@/state/authStore");
    const { useTaskStore } = require("@/state/taskStore.supabase");
    const { useUserStore } = require("@/state/userStore.supabase");
    const { useDateFormatter } = require("@/utils/dateFormatter");
    const { useTranslation } = require("@/utils/useTranslation");

    useAuthStore.mockReturnValue({
      user: {
        id: "user-1",
        name: "Test User",
      },
    });

    useDateFormatter.mockReturnValue({
      formatDateShort: jest.fn().mockReturnValue("Oct 10, 2026"),
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
        photosUpdates: "Photos & Updates",
        due: "Due",
      },
      projects: {
        unknown: "Unknown",
      },
    });

    useUserStore.mockReturnValue({
      getUserById: jest.fn((id: string) => ({
        id,
        name: `User ${id}`,
      })),
    });

    useTaskStore.mockReturnValue({
      tasks: [
        {
          id: "task-parent",
          title: "Parent Task",
          projectId: "project-1",
          assignedTo: ["user-1"],
          assignedBy: "manager-1",
          dueDate: new Date().toISOString(),
          status: "in_progress",
          priority: "medium",
          category: "general",
          description: "",
          attachments: [],
          updates: [],
          activities: [],
          completionPercentage: 50,
          createdAt: new Date().toISOString(),
        },
        {
          id: "task-child-completed",
          title: "Completed Child Task",
          projectId: "project-1",
          parentTaskId: "task-parent",
          assignedTo: ["user-1"],
          assignedBy: "manager-1",
          dueDate: "2000-01-01T00:00:00.000Z",
          status: "completed",
          priority: "medium",
          category: "general",
          description: "",
          attachments: [],
          updates: [],
          activities: [],
          completionPercentage: 80,
          createdAt: new Date().toISOString(),
        },
      ],
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
    });
  });

  it("does not mark legacy completed child tasks as overdue", () => {
    const { result } = renderHook(() =>
      useTaskDetailViewAdapter({
        taskId: "task-parent",
      }),
    );

    expect(result.current.output.childTasks[0]).toMatchObject({
      taskId: "task-child-completed",
      isOverdue: false,
    });
  });
});
