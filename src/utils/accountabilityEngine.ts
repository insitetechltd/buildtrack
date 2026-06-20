import type { Task } from "@/types/buildtrack";

export type ActorRelationship = "ORIGINATOR" | "EXECUTOR" | "SELF";
export type WorkflowPhase = "DRAFT_OR_NEW" | "WIP" | "REVIEW" | "TERMINAL";
export type ResponsibilityToken =
  | "ACTION_REQUIRED"
  | "IN_PROGRESS_SENT"
  | "AWAITING_APPROVAL"
  | "OTHER_OPEN"
  | "VOID_ARCHIVED";

function isAssignedToUser(task: Task, currentUserId: string): boolean {
  return (task.assignedTo ?? []).some((assignedUserId) => assignedUserId === currentUserId);
}

function getActorRelationship(task: Task, currentUserId: string): ActorRelationship | null {
  const assignedToUser = isAssignedToUser(task, currentUserId);
  const assignedByUser = task.assignedBy === currentUserId;

  if (assignedToUser && assignedByUser) {
    return "SELF";
  }

  if (assignedByUser && !assignedToUser) {
    return "ORIGINATOR";
  }

  if (assignedToUser && !assignedByUser) {
    return "EXECUTOR";
  }

  return null;
}

function getWorkflowPhase(task: Task): WorkflowPhase | null {
  if (task.status === "approved" || task.status === "completed" || task.status === "cancelled") {
    return "TERMINAL";
  }

  if (task.status === "submitted_for_review" && task.completionPercentage === 100) {
    return "REVIEW";
  }

  if (task.status === "new") {
    return "DRAFT_OR_NEW";
  }

  if (
    task.status === "accepted" ||
    task.status === "in_progress" ||
    task.status === "rejected"
  ) {
    return "WIP";
  }

  return null;
}

export function getResponsibilityToken(task: Task, currentUserId: string): ResponsibilityToken {
  const actorRelationship = getActorRelationship(task, currentUserId);

  if (task.status === "declined" || Boolean(task.declinedReason)) {
    if (actorRelationship === "ORIGINATOR") {
      return "ACTION_REQUIRED";
    }

    return "VOID_ARCHIVED";
  }

  const workflowPhase = getWorkflowPhase(task);

  if (workflowPhase === "TERMINAL") {
    return "VOID_ARCHIVED";
  }

  if (workflowPhase === "REVIEW") {
    return "AWAITING_APPROVAL";
  }

  if (actorRelationship === "EXECUTOR") {
    if (workflowPhase === "DRAFT_OR_NEW" || task.status === "rejected") {
      return "ACTION_REQUIRED";
    }

    if (workflowPhase === "WIP") {
      return "OTHER_OPEN";
    }
  }

  if (actorRelationship === "ORIGINATOR") {
    if (workflowPhase === "DRAFT_OR_NEW" || workflowPhase === "WIP") {
      return "IN_PROGRESS_SENT";
    }
  }

  if (actorRelationship === "SELF" && workflowPhase === "WIP") {
    return "IN_PROGRESS_SENT";
  }

  return "OTHER_OPEN";
}

export function isTaskOverdue(task: Task): boolean {
  if (task.status === "approved" || task.status === "completed" || task.status === "cancelled") {
    return false;
  }

  const dueDate = Date.parse(task.dueDate);
  if (!Number.isFinite(dueDate)) {
    return false;
  }

  return dueDate < Date.now();
}
