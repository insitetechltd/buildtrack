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

describe("useTaskDetailViewAdapter", () => {
  const mockUpdateTask = jest.fn();
  const dueDate = "2026-10-10T08:00:00.000Z";
  const mergedInfoCardDueDate = "2026-10-12T08:00:00.000Z";
  const childActivityTimestamp = "2026-10-10T16:15:00.000Z";
  const activityTimestampOlder = "2026-10-09T09:30:00.000Z";
  const activityTimestampLatest = "2026-10-10T14:45:00.000Z";

  beforeEach(() => {
    jest.clearAllMocks();
    mockUpdateTask.mockReset();
    mockUpdateTask.mockResolvedValue(undefined);

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
      formatDateShort: jest.fn((date: string) => {
        if (date === dueDate) {
          return "Oct 10, 2026";
        }

        if (date === mergedInfoCardDueDate) {
          return "Oct 12, 2026";
        }

        if (date === childActivityTimestamp) {
          return "Oct 8, 2026";
        }

        if (date === activityTimestampOlder) {
          return "Oct 9, 2026";
        }

        if (date === activityTimestampLatest) {
          return "Oct 10, 2026";
        }

        return "Oct 10, 2026";
      }),
      formatDateTime: jest.fn((date: string) => {
        if (date === childActivityTimestamp) {
          return "Oct 10, 2026, 4:15 PM";
        }

        if (date === activityTimestampOlder) {
          return "Oct 9, 2026, 9:30 AM";
        }

        if (date === activityTimestampLatest) {
          return "Oct 10, 2026, 2:45 PM";
        }

        return "Oct 10, 2026, 8:00 AM";
      }),
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
          dueDate,
          status: "in_progress",
          priority: "medium",
          category: "general",
          description: "Install the final light fixtures in the lobby.",
          attachments: [
            "https://example.com/task-attachment-1.jpg",
          ],
          tags: [],
          updates: [],
          activities: [
            {
              id: "activity-1",
              taskId: "task-parent",
              userId: "user-1",
              activityType: "progress_update",
              timestamp: activityTimestampOlder,
              data: {
                description: "Installed conduit and verified the wiring path.",
                photos: ["https://example.com/progress-photo-1.jpg"],
                completionPercentage: 40,
                status: "in_progress",
              },
              description: "Installed conduit and verified the wiring path.",
              completionPercentage: 40,
              status: "in_progress",
              createdAt: activityTimestampOlder,
            },
            {
              id: "activity-2",
              taskId: "task-parent",
              userId: "user-2",
              activityType: "review_submission",
              timestamp: activityTimestampLatest,
              data: {
                completionPercentage: 100,
              },
              description: "Submitted the completed installation for review.",
              completionPercentage: 100,
              status: "submitted_for_review",
              createdAt: activityTimestampLatest,
            },
          ],
          completionPercentage: 50,
          createdAt: new Date().toISOString(),
        },
        {
          id: "task-child-completed",
          title: "Install ceiling grid",
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
          activities: [
            {
              id: "activity-child-1",
              taskId: "task-child-completed",
              userId: "user-1",
              activityType: "progress_update",
              timestamp: childActivityTimestamp,
              data: {
                description: "Installed the suspended ceiling grid.",
                completionPercentage: 80,
              },
              description: "Installed the suspended ceiling grid.",
              completionPercentage: 80,
              status: "completed",
              createdAt: childActivityTimestamp,
            },
          ],
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
      updateTask: mockUpdateTask,
    });
  });

  it("surfaces critical state as compact hero metadata when the task is critical", () => {
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
          dueDate,
          status: "in_progress",
          priority: "medium",
          category: "general",
          description: "Install the final light fixtures in the lobby.",
          attachments: ["https://example.com/task-attachment-1.jpg"],
          tags: ["critical_this_week"],
          updates: [],
          activities: [],
          completionPercentage: 50,
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
      updateTask: mockUpdateTask,
    });

    const { result } = renderHook(() =>
      useTaskDetailViewAdapter({
        taskId: "task-parent",
      }),
    );

    expect(result.current.output.taskHero).toMatchObject({
      isCritical: true,
      criticalLabel: "Critical this week",
    });
    expect(result.current.output.actionItems.map((item) => item.actionId)).not.toContain(
      "toggle_critical_this_week",
    );
  });

  it("still updates task tags when critical state is toggled", async () => {
    const { result } = renderHook(() =>
      useTaskDetailViewAdapter({
        taskId: "task-parent",
      }),
    );

    await act(async () => {
      await result.current.actions.toggleCriticalThisWeek();
    });

    expect(mockUpdateTask).toHaveBeenCalledWith(
      "task-parent",
      expect.objectContaining({
        tags: ["critical_this_week"],
      }),
    );
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

  it("treats assigned and received tasks as pre-acceptance work", () => {
    const { useTaskStore } = require("@/state/taskStore.supabase");

    useTaskStore.mockReturnValue({
      tasks: [
        {
          id: "task-parent",
          title: "Parent Task",
          projectId: "project-1",
          assignedTo: ["user-1"],
          assignedBy: "manager-1",
          dueDate: new Date().toISOString(),
          status: "assigned",
          priority: "medium",
          category: "general",
          description: "",
          attachments: [],
          tags: [],
          updates: [],
          activities: [],
          completionPercentage: 0,
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
      updateTask: mockUpdateTask,
    });

    const { result } = renderHook(() =>
      useTaskDetailViewAdapter({
        taskId: "task-parent",
      }),
    );

    expect(result.current.output.quickActions?.actions.map((item) => item.actionId)).toEqual([
      "accept_task",
      "decline_task",
    ]);
  });

  it("returns explicit task-detail redesign groups for the visual work-thread surface", () => {
    const { result } = renderHook(() =>
      useTaskDetailViewAdapter({
        taskId: "task-parent",
      }),
    );

    expect(result.current.output.taskHero).toBeDefined();
    expect(result.current.output.delegationSummary).toBeDefined();
    expect(result.current.output.evidenceSummary).toBeDefined();
    expect(Array.isArray(result.current.output.activityThread)).toBe(true);
    expect(result.current.output.subtaskSummary).toBeDefined();
  });

  it("keeps legacy actionItems while exposing redesigned task-detail groups", () => {
    const { result } = renderHook(() =>
      useTaskDetailViewAdapter({
        taskId: "task-parent",
      }),
    );

    expect(Array.isArray(result.current.output.actionItems)).toBe(true);
    expect(result.current.output.taskHero.title).toBeTruthy();
  });

  it("builds quick actions for active work on parent task detail", () => {
    const { result } = renderHook(() =>
      useTaskDetailViewAdapter({
        taskId: "task-parent",
      }),
    );

    expect(result.current.output.quickActions?.actions.map((item) => item.actionId)).toEqual([
      "update_progress",
      "add_comment",
      "add_subtask",
    ]);
  });

  it("does not produce nextStepLabel for the task-detail hero", () => {
    const { result } = renderHook(() =>
      useTaskDetailViewAdapter({
        taskId: "task-parent",
      }),
    );

    expect(result.current.output.taskHero.nextStepLabel).toBeUndefined();
  });

  it("builds one merged info card that combines description, delegation, and compact details", () => {
    const { useTaskStore } = require("@/state/taskStore.supabase");

    useTaskStore.mockReturnValue({
      tasks: [
        {
          id: "task-parent",
          title: "Parent Task",
          projectId: "project-1",
          assignedTo: ["user-2", "user-3"],
          primaryAssigneeId: "user-2",
          assignedBy: "user-1",
          dueDate: mergedInfoCardDueDate,
          status: "in_progress",
          priority: "medium",
          category: "general",
          description: "Confirm supplier lead times before final delivery.",
          attachments: [],
          tags: [],
          updates: [],
          activities: [],
          completionPercentage: 50,
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
      updateTask: mockUpdateTask,
    });

    const { result } = renderHook(() =>
      useTaskDetailViewAdapter({
        taskId: "task-parent",
      }),
    );

    expect(result.current.output.infoCard).toMatchObject({
      descriptionLabel: "Confirm supplier lead times before final delivery.",
      assignedByLabel: "User user-1",
      assignedToLabel: "User user-2, User user-3",
      primaryOwnerLabel: "User user-2",
    });
    expect(result.current.output.infoCard?.detailRows).toEqual([]);
  });

  it("omits delegation from the hero model and keeps delegation only in the info card", () => {
    const { result } = renderHook(() =>
      useTaskDetailViewAdapter({
        taskId: "task-parent",
      }),
    );

    expect(result.current.output.taskHero).not.toHaveProperty("assignedByLabel");
    expect(result.current.output.taskHero).not.toHaveProperty("assignedToLabel");
    expect(result.current.output.taskHero).not.toHaveProperty("primaryOwnerLabel");
    expect(result.current.output.taskHero).not.toHaveProperty("teamSummaryLabel");
    expect(result.current.output.infoCard?.assignedToLabel).toBe("User user-1, User user-2");
  });

  it("builds quick actions for reviewer approval state", () => {
    const { useTaskStore } = require("@/state/taskStore.supabase");

    useTaskStore.mockReturnValue({
      tasks: [
        {
          id: "task-pending-review",
          title: "Pending Review Task",
          projectId: "project-1",
          assignedTo: ["user-2"],
          primaryAssigneeId: "user-2",
          assignedBy: "user-1",
          dueDate,
          status: "submitted_for_review",
          priority: "medium",
          category: "general",
          description: "Review the work package.",
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
      cancelTask: jest.fn(),
      updateTask: mockUpdateTask,
    });

    const { result } = renderHook(() =>
      useTaskDetailViewAdapter({
        taskId: "task-pending-review",
      }),
    );

    expect(result.current.output.quickActions?.actions.map((item) => item.actionId)).toEqual([
      "approve_task",
      "reject_task",
      "add_comment",
    ]);
  });

  it("builds quick actions for contributor review state", () => {
    const { useTaskStore } = require("@/state/taskStore.supabase");

    useTaskStore.mockReturnValue({
      tasks: [
        {
          id: "task-ready-for-review",
          title: "Ready for Review Task",
          projectId: "project-1",
          assignedTo: ["user-1"],
          primaryAssigneeId: "user-1",
          assignedBy: "manager-1",
          dueDate,
          status: "in_progress",
          priority: "medium",
          category: "general",
          description: "Wrap up the remaining work.",
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
      cancelTask: jest.fn(),
      updateTask: mockUpdateTask,
    });

    const { result } = renderHook(() =>
      useTaskDetailViewAdapter({
        taskId: "task-ready-for-review",
      }),
    );

    expect(result.current.output.quickActions?.actions.map((item) => item.actionId)).toEqual([
      "submit_review",
      "add_comment",
      "update_progress",
    ]);
  });

  it("excludes add_subtask on subtask detail active work", () => {
    const { useTaskStore } = require("@/state/taskStore.supabase");

    useTaskStore.mockReturnValue({
      tasks: [
        {
          id: "task-parent",
          title: "Parent Task",
          projectId: "project-1",
          assignedTo: ["user-2"],
          primaryAssigneeId: "user-2",
          assignedBy: "manager-1",
          dueDate,
          status: "in_progress",
          priority: "medium",
          category: "general",
          description: "Parent task shell.",
          attachments: [],
          tags: [],
          updates: [],
          activities: [],
          completionPercentage: 50,
          createdAt: new Date().toISOString(),
        },
        {
          id: "task-subtask",
          title: "Subtask",
          projectId: "project-1",
          parentTaskId: "task-parent",
          assignedTo: ["user-1"],
          primaryAssigneeId: "user-1",
          assignedBy: "manager-1",
          dueDate,
          status: "in_progress",
          priority: "medium",
          category: "general",
          description: "Subtask work item.",
          attachments: [],
          tags: [],
          updates: [],
          activities: [],
          completionPercentage: 35,
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
      updateTask: mockUpdateTask,
    });

    const { result } = renderHook(() =>
      useTaskDetailViewAdapter({
        taskId: "task-parent",
        subTaskId: "task-subtask",
      }),
    );

    expect(result.current.output.quickActions?.actions.map((item) => item.actionId)).toEqual([
      "update_progress",
      "add_comment",
    ]);
  });

  it("shows edit_task for the task creator", () => {
    const { useTaskStore } = require("@/state/taskStore.supabase");

    useTaskStore.mockReturnValue({
      tasks: [
        {
          id: "task-parent",
          title: "Parent Task",
          projectId: "project-1",
          assignedTo: ["user-2"],
          primaryAssigneeId: "user-2",
          assignedBy: "user-1",
          dueDate,
          status: "in_progress",
          priority: "medium",
          category: "general",
          description: "Install the final light fixtures in the lobby.",
          attachments: [],
          tags: [],
          updates: [],
          activities: [],
          completionPercentage: 50,
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
      updateTask: mockUpdateTask,
    });

    const { result } = renderHook(() =>
      useTaskDetailViewAdapter({
        taskId: "task-parent",
      }),
    );

    expect(result.current.output.actionItems.map((item) => item.actionId)).toContain("edit_task");
  });

  it("hides edit_task for non-creators", () => {
    const { result } = renderHook(() =>
      useTaskDetailViewAdapter({
        taskId: "task-parent",
      }),
    );

    expect(result.current.output.actionItems.map((item) => item.actionId)).not.toContain("edit_task");
  });

  it("maps task activities into readable work-thread events", () => {
    const { result } = renderHook(() =>
      useTaskDetailViewAdapter({
        taskId: "task-parent",
      }),
    );

    const submittedForReviewRow = result.current.output.activityThread.find(
      (activity) => activity.id === "activity-2",
    );
    const progressUpdateRow = result.current.output.activityThread.find(
      (activity) => activity.id === "activity-1",
    );

    expect(submittedForReviewRow).toMatchObject({
      actorLabel: "User user-2",
      eventLabel: "Submitted the completed installation for review.",
      timestampLabel: "Oct 10, 2026, 2:45 PM",
      detailLabel: undefined,
      statusLabel: "Submitted For Review",
    });

    expect(progressUpdateRow).toMatchObject({
      actorLabel: "User user-1",
      eventLabel: "Installed conduit and verified the wiring path.",
      timestampLabel: "Oct 9, 2026, 9:30 AM",
      detailLabel: undefined,
      photoUrls: ["https://example.com/progress-photo-1.jpg"],
      statusLabel: "In Progress",
    });
  });

  it("marks child-task activity rows with lightweight subtask context inside the main activity thread", () => {
    const { result } = renderHook(() =>
      useTaskDetailViewAdapter({
        taskId: "task-parent",
      }),
    );

    expect(result.current.output.activityThread).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "activity-child-1",
          subtaskTitleLabel: "Install ceiling grid",
          subtaskBadgeLabel: "Subtask",
        }),
      ]),
    );
  });

  it("merges parent-task and child-task activities into one newest-first activity thread", () => {
    const { result } = renderHook(() =>
      useTaskDetailViewAdapter({
        taskId: "task-parent",
      }),
    );

    expect(result.current.output.activityThread[0]).toMatchObject({
      id: "activity-child-1",
      timestampLabel: "Oct 10, 2026, 4:15 PM",
      subtaskTitleLabel: "Install ceiling grid",
      subtaskBadgeLabel: "Subtask",
    });
    expect(result.current.output.activityThread.map((activity) => activity.id)).toEqual([
      "activity-child-1",
      "activity-2",
      "activity-1",
    ]);
  });

  it("builds thread rows with a dedicated progress label from the activity completion percentage", () => {
    const { result } = renderHook(() =>
      useTaskDetailViewAdapter({
        taskId: "task-parent",
      }),
    );

    const submittedForReviewRow = result.current.output.activityThread.find(
      (activity) => activity.id === "activity-2",
    );

    expect(submittedForReviewRow).toMatchObject({
      timestampLabel: "Oct 10, 2026, 2:45 PM",
      actorLabel: "User user-2",
      progressLabel: "100%",
    });
  });

  it("uses a photo-update headline for legacy photo-only updates without a meaningful progress change", () => {
    const { useTaskStore } = require("@/state/taskStore.supabase");

    useTaskStore.mockReturnValue({
      tasks: [
        {
          id: "task-photo-only",
          title: "Photo-only Task",
          projectId: "project-1",
          assignedTo: ["user-1"],
          assignedBy: "manager-1",
          dueDate,
          status: "in_progress",
          priority: "medium",
          category: "general",
          description: "Capture site conditions.",
          attachments: [],
          tags: [],
          updates: [],
          activities: [
            {
              id: "activity-photo-only",
              taskId: "task-photo-only",
              userId: "user-1",
              activityType: "progress_update",
              timestamp: activityTimestampLatest,
              data: {
                photos: ["https://example.com/photo-only-update.jpg"],
                completionPercentage: 0,
                status: "in_progress",
              },
              completionPercentage: 0,
              status: "in_progress",
              createdAt: activityTimestampLatest,
            },
          ],
          completionPercentage: 0,
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
      updateTask: mockUpdateTask,
    });

    const { result } = renderHook(() =>
      useTaskDetailViewAdapter({
        taskId: "task-photo-only",
      }),
    );

    expect(result.current.output.activityThread[0]).toMatchObject({
      actorLabel: "User user-1",
      eventLabel: "Added photo update",
      progressLabel: "0%",
      detailLabel: undefined,
      photoUrls: ["https://example.com/photo-only-update.jpg"],
    });
  });

  it("keeps a progress headline when the update actually changes progress", () => {
    const { useTaskStore } = require("@/state/taskStore.supabase");

    useTaskStore.mockReturnValue({
      tasks: [
        {
          id: "task-progress-change",
          title: "Progress Change Task",
          projectId: "project-1",
          assignedTo: ["user-1"],
          assignedBy: "manager-1",
          dueDate,
          status: "in_progress",
          priority: "medium",
          category: "general",
          description: "Advance the install.",
          attachments: [],
          tags: [],
          updates: [],
          activities: [
            {
              id: "activity-progress-new",
              taskId: "task-progress-change",
              userId: "user-1",
              activityType: "progress_update",
              timestamp: activityTimestampLatest,
              data: {
                completionPercentage: 40,
                status: "in_progress",
              },
              completionPercentage: 40,
              status: "in_progress",
              createdAt: activityTimestampLatest,
            },
            {
              id: "activity-progress-old",
              taskId: "task-progress-change",
              userId: "user-1",
              activityType: "progress_update",
              timestamp: activityTimestampOlder,
              data: {
                completionPercentage: 10,
                status: "in_progress",
              },
              completionPercentage: 10,
              status: "in_progress",
              createdAt: activityTimestampOlder,
            },
          ],
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
      cancelTask: jest.fn(),
      updateTask: mockUpdateTask,
    });

    const { result } = renderHook(() =>
      useTaskDetailViewAdapter({
        taskId: "task-progress-change",
      }),
    );

    expect(result.current.output.activityThread[0]).toMatchObject({
      actorLabel: "User user-1",
      eventLabel: "Updated progress to 40%",
      progressLabel: "40%",
      detailLabel: undefined,
    });
  });

  it("falls back to the task completion percentage when an activity does not include one", () => {
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
          dueDate,
          status: "in_progress",
          priority: "medium",
          category: "general",
          description: "Install the final light fixtures in the lobby.",
          attachments: [
            "https://example.com/task-attachment-1.jpg",
          ],
          tags: [],
          updates: [],
          activities: [
            {
              id: "activity-1",
              taskId: "task-parent",
              userId: "user-1",
              activityType: "progress_update",
              timestamp: activityTimestampLatest,
              data: {
                description: "Installed conduit and verified the wiring path.",
                photos: ["https://example.com/progress-photo-1.jpg"],
                status: "in_progress",
              },
              description: "Installed conduit and verified the wiring path.",
              status: "in_progress",
              createdAt: activityTimestampLatest,
            },
          ],
          completionPercentage: 50,
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
      updateTask: mockUpdateTask,
    });

    const { result } = renderHook(() =>
      useTaskDetailViewAdapter({
        taskId: "task-parent",
      }),
    );

    expect(result.current.output.activityThread[0]).toMatchObject({
      actorLabel: "User user-1",
      progressLabel: "50%",
    });
  });

  it("surfaces latest photo evidence in the redesigned evidence summary", () => {
    const { result } = renderHook(() =>
      useTaskDetailViewAdapter({
        taskId: "task-parent",
      }),
    );

    expect(result.current.output.evidenceSummary).toMatchObject({
      latestPhotoUrls: [
        "https://example.com/progress-photo-1.jpg",
        "https://example.com/task-attachment-1.jpg",
      ],
      totalPhotoCount: 2,
      emptyLabel: "No photo evidence yet.",
    });
  });

  it("maps task hero and delegation summary from existing task details", () => {
    const { result } = renderHook(() =>
      useTaskDetailViewAdapter({
        taskId: "task-parent",
      }),
    );

    expect(result.current.output.taskHero).toMatchObject({
      title: "Parent Task",
      statusLabel: "In Progress",
      categoryLabel: "General",
      projectLabel: "project-1",
      completionLabel: "50% complete",
      dueDateLabel: "Oct 10, 2026",
    });
    expect(result.current.output.taskHero.nextStepLabel).toBeUndefined();
    expect(result.current.output.taskHero).not.toHaveProperty("assignedByLabel");

    expect(result.current.output.delegationSummary).toMatchObject({
      assignedByLabel: "User manager-1",
      assignedToLabel: "User user-1, User user-2",
      primaryOwnerLabel: "User user-2",
      teamSummaryLabel: "2 assignees",
    });
  });
});
