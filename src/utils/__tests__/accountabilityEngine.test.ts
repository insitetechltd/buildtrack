import type { Task } from "@/types/buildtrack";
import {
  getResponsibilityToken,
  isTaskOverdue,
  type ResponsibilityToken,
} from "../accountabilityEngine";

const CURRENT_USER_ID = "user-1";
const OTHER_USER_ID = "user-2";

function buildTask(overrides: Partial<Task> = {}): Task {
  return {
    id: "task-1",
    projectId: "project-1",
    title: "Install guardrails",
    description: "Install safety guardrails",
    priority: "high",
    dueDate: "2099-01-01T00:00:00.000Z",
    category: "safety",
    attachments: [],
    assignedTo: [OTHER_USER_ID],
    assignedBy: CURRENT_USER_ID,
    createdAt: "2026-01-01T00:00:00.000Z",
    updates: [],
    status: "new",
    completionPercentage: 0,
    ...overrides,
  };
}

function expectResponsibilityToken(
  description: string,
  task: Task,
  expected: ResponsibilityToken,
) {
  it(description, () => {
    expect(getResponsibilityToken(task, CURRENT_USER_ID)).toBe(expected);
  });
}

describe("accountabilityEngine", () => {
  describe("getResponsibilityToken", () => {
    expectResponsibilityToken(
      "returns ACTION_REQUIRED for executor tasks that are new",
      buildTask({
        assignedBy: OTHER_USER_ID,
        assignedTo: [CURRENT_USER_ID],
        status: "new",
      }),
      "ACTION_REQUIRED",
    );

    expectResponsibilityToken(
      "returns ACTION_REQUIRED for executor tasks that were rejected back for rework",
      buildTask({
        assignedBy: OTHER_USER_ID,
        assignedTo: [CURRENT_USER_ID],
        status: "rejected",
        completionPercentage: 50,
      }),
      "ACTION_REQUIRED",
    );

    expectResponsibilityToken(
      "returns OTHER_OPEN for executor tasks that are accepted",
      buildTask({
        assignedBy: OTHER_USER_ID,
        assignedTo: [CURRENT_USER_ID],
        status: "accepted",
        completionPercentage: 25,
      }),
      "OTHER_OPEN",
    );

    expectResponsibilityToken(
      "returns OTHER_OPEN for executor tasks that are in progress",
      buildTask({
        assignedBy: OTHER_USER_ID,
        assignedTo: [CURRENT_USER_ID],
        status: "in_progress",
        completionPercentage: 60,
      }),
      "OTHER_OPEN",
    );

    expectResponsibilityToken(
      "returns IN_PROGRESS_SENT for originator tasks that are new",
      buildTask({
        assignedBy: CURRENT_USER_ID,
        assignedTo: [OTHER_USER_ID],
        status: "new",
      }),
      "IN_PROGRESS_SENT",
    );

    expectResponsibilityToken(
      "returns IN_PROGRESS_SENT for originator tasks that are accepted by another user",
      buildTask({
        assignedBy: CURRENT_USER_ID,
        assignedTo: [OTHER_USER_ID],
        status: "accepted",
        completionPercentage: 20,
      }),
      "IN_PROGRESS_SENT",
    );

    expectResponsibilityToken(
      "returns IN_PROGRESS_SENT for originator tasks that are in progress by another user",
      buildTask({
        assignedBy: CURRENT_USER_ID,
        assignedTo: [OTHER_USER_ID],
        status: "in_progress",
        completionPercentage: 55,
      }),
      "IN_PROGRESS_SENT",
    );

    expectResponsibilityToken(
      "returns IN_PROGRESS_SENT for self-assigned tasks in accepted state",
      buildTask({
        assignedBy: CURRENT_USER_ID,
        assignedTo: [CURRENT_USER_ID],
        status: "accepted",
        completionPercentage: 10,
      }),
      "IN_PROGRESS_SENT",
    );

    expectResponsibilityToken(
      "returns IN_PROGRESS_SENT for self-assigned tasks in progress",
      buildTask({
        assignedBy: CURRENT_USER_ID,
        assignedTo: [CURRENT_USER_ID],
        status: "in_progress",
        completionPercentage: 80,
      }),
      "IN_PROGRESS_SENT",
    );

    expectResponsibilityToken(
      "returns IN_PROGRESS_SENT for self-assigned tasks rejected for rework",
      buildTask({
        assignedBy: CURRENT_USER_ID,
        assignedTo: [CURRENT_USER_ID],
        status: "rejected",
        completionPercentage: 40,
      }),
      "IN_PROGRESS_SENT",
    );

    expectResponsibilityToken(
      "returns AWAITING_APPROVAL for executor tasks submitted for review",
      buildTask({
        assignedBy: OTHER_USER_ID,
        assignedTo: [CURRENT_USER_ID],
        status: "submitted_for_review",
        completionPercentage: 100,
      }),
      "AWAITING_APPROVAL",
    );

    expectResponsibilityToken(
      "returns AWAITING_APPROVAL for originator tasks submitted for review",
      buildTask({
        assignedBy: CURRENT_USER_ID,
        assignedTo: [OTHER_USER_ID],
        status: "submitted_for_review",
        completionPercentage: 100,
      }),
      "AWAITING_APPROVAL",
    );

    expectResponsibilityToken(
      "returns VOID_ARCHIVED for approved tasks",
      buildTask({
        status: "approved",
        completionPercentage: 100,
      }),
      "VOID_ARCHIVED",
    );

    expectResponsibilityToken(
      "returns VOID_ARCHIVED for completed legacy tasks",
      buildTask({
        status: "completed",
        completionPercentage: 100,
      }),
      "VOID_ARCHIVED",
    );

    expectResponsibilityToken(
      "returns VOID_ARCHIVED for cancelled tasks",
      buildTask({
        status: "cancelled",
      }),
      "VOID_ARCHIVED",
    );

    expectResponsibilityToken(
      "returns ACTION_REQUIRED when an originator task carries a declined reason",
      buildTask({
        assignedBy: CURRENT_USER_ID,
        assignedTo: [OTHER_USER_ID],
        status: "new",
        declinedReason: "Cannot take this on",
      }),
      "ACTION_REQUIRED",
    );

    expectResponsibilityToken(
      "returns ACTION_REQUIRED when an originator task is explicitly declined",
      buildTask({
        assignedBy: CURRENT_USER_ID,
        assignedTo: [OTHER_USER_ID],
        status: "declined",
        declinedReason: "Subcontractor unavailable",
      }),
      "ACTION_REQUIRED",
    );

    expectResponsibilityToken(
      "returns VOID_ARCHIVED when an executor task has declined the work",
      buildTask({
        assignedBy: OTHER_USER_ID,
        assignedTo: [CURRENT_USER_ID],
        status: "declined",
        declinedReason: "Cannot take this on",
      }),
      "VOID_ARCHIVED",
    );

    expectResponsibilityToken(
      "returns OTHER_OPEN for statuses outside the explicit matrix but not terminal",
      buildTask({
        assignedBy: OTHER_USER_ID,
        assignedTo: [CURRENT_USER_ID],
        status: "wip",
        completionPercentage: 45,
      }),
      "OTHER_OPEN",
    );
  });

  describe("isTaskOverdue", () => {
    it("returns true when completion is below 100, due date is in the past, and task is not terminal", () => {
      expect(
        isTaskOverdue(
          buildTask({
            status: "in_progress",
            completionPercentage: 90,
            dueDate: "2000-01-01T00:00:00.000Z",
          }),
        ),
      ).toBe(true);
    });

    it("returns true for submitted_for_review tasks past due even when completion is 100", () => {
      expect(
        isTaskOverdue(
          buildTask({
            status: "submitted_for_review",
            completionPercentage: 100,
            dueDate: "2000-01-01T00:00:00.000Z",
          }),
        ),
      ).toBe(true);
    });

    it("returns false for approved tasks even when due date is in the past", () => {
      expect(
        isTaskOverdue(
          buildTask({
            status: "approved",
            completionPercentage: 90,
            dueDate: "2000-01-01T00:00:00.000Z",
          }),
        ),
      ).toBe(false);
    });

    it("returns false for completed legacy tasks even when due date is in the past", () => {
      expect(
        isTaskOverdue(
          buildTask({
            status: "completed",
            completionPercentage: 90,
            dueDate: "2000-01-01T00:00:00.000Z",
          }),
        ),
      ).toBe(false);
    });

    it("returns false for cancelled tasks even when due date is in the past", () => {
      expect(
        isTaskOverdue(
          buildTask({
            status: "cancelled",
            completionPercentage: 90,
            dueDate: "2000-01-01T00:00:00.000Z",
          }),
        ),
      ).toBe(false);
    });

    it("returns false when the due date is in the future", () => {
      expect(
        isTaskOverdue(
          buildTask({
            status: "accepted",
            completionPercentage: 10,
            dueDate: "2099-01-01T00:00:00.000Z",
          }),
        ),
      ).toBe(false);
    });
  });
});
