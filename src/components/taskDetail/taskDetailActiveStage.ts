export interface ActiveStageEntryPosition {
  id: string;
  top: number;
}

export interface ActiveStageMeasuredEntry extends ActiveStageEntryPosition {
  height: number;
}

export type ThreadStageSourceMode = "photo" | "text" | "pdf";

export interface ThreadStageSource {
  id: string;
  mode: ThreadStageSourceMode;
  title: string;
  summary: string;
}

export type TaskDetailActiveStageMode = "photo" | "no_photo" | "pdf_preview";

export function resolveActiveStageEntry<T extends ActiveStageEntryPosition>({
  entries,
  topEdge,
}: {
  entries: T[];
  topEdge: number;
}): T | undefined;
export function resolveActiveStageEntry<T extends ActiveStageMeasuredEntry>({
  entries,
  focusY,
  scrollY,
}: {
  entries: T[];
  focusY: number;
  scrollY: number;
}): T | undefined;
export function resolveActiveStageEntry<T extends ActiveStageEntryPosition>({
  entries,
  topEdge,
  focusY,
  scrollY,
}: {
  entries: T[];
  topEdge?: number;
  focusY?: number;
  scrollY?: number;
}): T | undefined {
  const sortedEntries = [...entries].sort((left, right) => left.top - right.top);

  if (sortedEntries.length === 0) {
    return undefined;
  }

  if (typeof focusY === "number" && typeof scrollY === "number") {
    const focusLine = scrollY + focusY;
    const measuredEntries = sortedEntries as Array<T & ActiveStageMeasuredEntry>;
    const intersectingEntry = measuredEntries.find(
      (entry) => entry.top <= focusLine && entry.top + entry.height > focusLine,
    );

    if (intersectingEntry) {
      return intersectingEntry as T;
    }

    const previousEntries = measuredEntries.filter((entry) => entry.top <= focusLine);

    return (previousEntries[previousEntries.length - 1] ?? measuredEntries[0]) as T;
  }

  return sortedEntries.find((entry) => entry.top >= (topEdge ?? 0));
}

export function resolveActiveStageMode(
  entry: Pick<ThreadStageSource, "mode">,
): TaskDetailActiveStageMode {
  if (entry.mode === "pdf") {
    return "pdf_preview";
  }

  if (entry.mode === "text") {
    return "no_photo";
  }

  return "photo";
}

export function buildActiveStageModel<T extends ThreadStageSource>(
  entry: T,
): T & { stageMode: TaskDetailActiveStageMode } {
  return {
    ...entry,
    stageMode: resolveActiveStageMode(entry),
  };
}
