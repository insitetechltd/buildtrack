export interface ActiveStageEntryPosition {
  id: string;
  top: number;
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
}): T | undefined {
  return [...entries]
    .filter((entry) => entry.top >= topEdge)
    .sort((left, right) => left.top - right.top)[0];
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
