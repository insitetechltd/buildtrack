import { CRITICAL_THIS_WEEK_TAG } from "./viewAdapters";

export { CRITICAL_THIS_WEEK_TAG };

export function getTaskTags(tags?: string[] | null): string[] {
  return Array.isArray(tags) ? tags.map((tag) => String(tag).trim()).filter(Boolean) : [];
}

export function hasCriticalThisWeekTag(tags?: string[] | null): boolean {
  return getTaskTags(tags).some((tag) => {
    const normalized = tag.toLowerCase().replace(/[\s-]+/g, "_");
    return (
      normalized === CRITICAL_THIS_WEEK_TAG ||
      normalized === "critical_this_week" ||
      tag.toLowerCase() === "critical this week"
    );
  });
}

export function withCriticalThisWeekTag(
  tags: string[] | undefined | null,
  isEnabled: boolean,
): string[] {
  const normalizedTags = getTaskTags(tags).filter(
    (tag) => !hasCriticalThisWeekTag([tag]),
  );
  return isEnabled ? [...normalizedTags, CRITICAL_THIS_WEEK_TAG] : normalizedTags;
}

/** Custom tags only (excludes system critical_this_week). */
export function getCustomTaskTags(tags?: string[] | null): string[] {
  return getTaskTags(tags).filter((tag) => !hasCriticalThisWeekTag([tag]));
}

export function mergeTaskTags(args: {
  customTags: string[];
  isCriticalThisWeek: boolean;
}): string[] {
  return withCriticalThisWeekTag(getTaskTags(args.customTags), args.isCriticalThisWeek);
}

export function resolvePrimaryAssigneeId(
  assignedTo: string[],
  preferredPrimaryId?: string | null,
): string | undefined {
  if (preferredPrimaryId && assignedTo.includes(preferredPrimaryId)) {
    return preferredPrimaryId;
  }
  return assignedTo[0];
}
