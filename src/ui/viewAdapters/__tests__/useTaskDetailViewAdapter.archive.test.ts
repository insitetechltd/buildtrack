import { act, renderHook } from "@testing-library/react-native";

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

describe("useTaskDetailViewAdapter archive actions", () => {
  const mockArchiveTask = jest.fn();
  const mockFetchArchivedTasks = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockArchiveTask.mockReset();
    mockArchiveTask.mockResolvedValue(undefined);
    mockFetchArchivedTasks.mockReset();
    mockFetchArchivedTasks.mockResolvedValue(undefined);

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
          assignedTo: ["user-1", "user-2"],
          primaryAssigneeId: "user-2",
          assignedBy: "manager-1",
          dueDate: "2026-10-10T08:00:00.000Z",
          status: "approved",
          priority: "medium",
          category: "general",
          description: "Install the final light fixtures in the lobby.",
          attachments: [],
          tags: [],
          updates: [],
          activities: [],
          completionPercentage: 100,
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
      archiveTask: mockArchiveTask,
      fetchArchivedTasks: mockFetchArchivedTasks,
      cancelTask: jest.fn(),
      updateTask: jest.fn(),
    });
  });

  it("adds archive to other actions for approved top-level tasks and archives through the store", async () => {
    const { result } = renderHook(() =>
      useTaskDetailViewAdapter({
        taskId: "task-parent",
      }),
    );

    expect(result.current.output.actionItems.map((item) => item.actionId)).toContain("archive_task");

    await act(async () => {
      await result.current.actions.archiveTask();
    });

    expect(mockArchiveTask).toHaveBeenCalledWith("task-parent", "user-1");
    expect(mockFetchArchivedTasks).toHaveBeenCalledTimes(1);
  });

  it("does not offer archive on in-progress work", () => {
    const { useTaskStore } = require("@/state/taskStore.supabase");
    useTaskStore.mockReturnValue({
      tasks: [
        {
          id: "task-parent",
          title: "Parent Task",
          projectId: "project-1",
          assignedTo: ["user-1", "user-2"],
          primaryAssigneeId: "user-2",
          assignedBy: "manager-1",
          dueDate: "2026-10-10T08:00:00.000Z",
          status: "in_progress",
          priority: "medium",
          category: "general",
          description: "Install the final light fixtures in the lobby.",
          attachments: [],
          tags: [],
          updates: [],
          activities: [],
          completionPercentage: 40,
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
      archiveTask: mockArchiveTask,
      cancelTask: jest.fn(),
      updateTask: jest.fn(),
    });

    const { result } = renderHook(() =>
      useTaskDetailViewAdapter({
        taskId: "task-parent",
      }),
    );

    expect(result.current.output.actionItems.map((item) => item.actionId)).not.toContain(
      "archive_task",
    );
  });
});
