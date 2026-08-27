import type { TranslationKeys } from "@/locales";
import { fillTemplate, getTranslations } from "@/utils/useTranslation";

type ActivityCopy = TranslationKeys["activity"];

function copy(t?: TranslationKeys): ActivityCopy {
  return (t ?? getTranslations()).activity;
}

/** Status → localized activity headline (not stored user prose). */
export function formatLocalizedActivityHeadline(
  status: string,
  t?: TranslationKeys,
): string {
  const a = copy(t);
  switch (status.trim().toLowerCase()) {
    case "new":
    case "not_started":
    case "assigned":
    case "received":
      return a.newTask;
    case "accepted":
      return a.taskAccepted;
    case "in_progress":
      return a.taskInProgress;
    case "submitted_for_review":
    case "pending_review":
      return a.submittedForReview;
    case "rejected":
    case "declined":
      return a.taskRejected;
    case "approved":
    case "completed":
    case "done":
      return a.taskCompleted;
    case "cancelled":
      return a.taskCancelled;
    default: {
      const label = status
        .replace(/_/g, " ")
        .replace(/\b\w/g, (character) => character.toUpperCase());
      if (label.toLowerCase().includes("task") || label.includes("工作") || label.includes("工序")) {
        return label;
      }
      return fillTemplate(a.statusTaskSuffix, { status: label });
    }
  }
}

export function formatPhotosCapturedLabel(
  count: number,
  t?: TranslationKeys,
): string {
  return fillTemplate(copy(t).photosCaptured, { count });
}

/**
 * Remap known English (or already-localized) stored activity descriptions
 * for display. Unknown prose (user progress notes) passes through unchanged.
 */
export function localizeStoredActivityDescription(
  text: string,
  t?: TranslationKeys,
): string {
  const trimmed = text.trim();
  if (!trimmed) {
    return text;
  }

  const a = copy(t);

  const patterns: Array<{ re: RegExp; to: (m: RegExpMatchArray) => string }> = [
    {
      re: /^Task created by (.+)$/i,
      to: (m) => fillTemplate(a.createdBy, { name: m[1] }),
    },
    {
      re: /^Task auto-accepted by (.+)$/i,
      to: (m) => fillTemplate(a.autoAcceptedBy, { name: m[1] }),
    },
    {
      re: /^Task accepted by (.+)$/i,
      to: (m) => fillTemplate(a.acceptedBy, { name: m[1] }),
    },
    {
      re: /^Task assigned to (.+) by (.+)$/i,
      to: (m) =>
        fillTemplate(a.assignedToBy, { assignees: m[1], assigner: m[2] }),
    },
    {
      re: /^Task assignment updated by (.+)$/i,
      to: (m) => fillTemplate(a.assignmentUpdatedBy, { name: m[1] }),
    },
    {
      re: /^Task declined by (.+)\. Reason: (.+)$/i,
      to: (m) => fillTemplate(a.declinedByReason, { name: m[1], reason: m[2] }),
    },
    {
      re: /^Task submitted for review by (.+)$/i,
      to: (m) => fillTemplate(a.submittedForReviewBy, { name: m[1] }),
    },
    {
      re: /^Task completion accepted by (.+)$/i,
      to: (m) => fillTemplate(a.completionAcceptedBy, { name: m[1] }),
    },
    {
      re: /^Task completion rejected by (.+)\. Reason: (.+)$/i,
      to: (m) =>
        fillTemplate(a.completionRejectedByReason, {
          name: m[1],
          reason: m[2],
        }),
    },
    {
      re: /^Task deleted by (.+)$/i,
      to: (m) => fillTemplate(a.deletedBy, { name: m[1] }),
    },
    {
      re: /^Task cancelled by (.+)$/i,
      to: (m) => fillTemplate(a.cancelledBy, { name: m[1] }),
    },
    {
      re: /^Task archived by (.+)$/i,
      to: (m) => fillTemplate(a.archivedBy, { name: m[1] }),
    },
    {
      re: /^(\d+)\s+photos captured$/i,
      to: (m) => fillTemplate(a.photosCaptured, { count: m[1] }),
    },
  ];

  for (const { re, to } of patterns) {
    const match = trimmed.match(re);
    if (match) {
      return to(match);
    }
  }

  // Already a known English headline token
  const headlineMap: Record<string, string> = {
    "New Task": a.newTask,
    "Task Accepted": a.taskAccepted,
    "Task In Progress": a.taskInProgress,
    "Submitted for Review": a.submittedForReview,
    "Task Rejected": a.taskRejected,
    "Task Completed": a.taskCompleted,
    "Task Cancelled": a.taskCancelled,
    "Task activity": a.taskActivity,
    "Saved to project": a.savedToProject,
  };
  if (headlineMap[trimmed]) {
    return headlineMap[trimmed];
  }

  return text;
}
