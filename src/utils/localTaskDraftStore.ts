import AsyncStorage from "@react-native-async-storage/async-storage";
import type { CreateTaskFormModel } from "@/ui/contracts/viewAdapters";

export const LOCAL_TASK_DRAFTS_STORAGE_KEY = "@insite/localTaskDrafts/v1";
export const LOCAL_TASK_DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type StoredCreateTaskFormModel = Omit<CreateTaskFormModel, "dueDate"> & {
  dueDate: string;
};

export type LocalTaskDraft = {
  id: string;
  savedAt: string;
  expiresAt: string;
  titlePreview: string;
  projectId?: string;
  form: StoredCreateTaskFormModel;
};

function generateDraftId(): string {
  return `draft-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function serializeCreateTaskForm(
  form: CreateTaskFormModel,
): StoredCreateTaskFormModel {
  return {
    ...form,
    dueDate: form.dueDate.toISOString(),
  };
}

export function deserializeCreateTaskForm(
  stored: StoredCreateTaskFormModel,
): CreateTaskFormModel {
  return {
    ...stored,
    dueDate: new Date(stored.dueDate),
  };
}

export function isDraftTitleValid(title: string | undefined): boolean {
  return typeof title === "string" && title.trim().length > 0;
}

export function draftTitleValidationMessage(): string {
  return "Title is required to save a draft";
}

async function readAllDraftsRaw(): Promise<LocalTaskDraft[]> {
  try {
    const raw = await AsyncStorage.getItem(LOCAL_TASK_DRAFTS_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as LocalTaskDraft[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeAllDrafts(drafts: LocalTaskDraft[]): Promise<void> {
  await AsyncStorage.setItem(
    LOCAL_TASK_DRAFTS_STORAGE_KEY,
    JSON.stringify(drafts),
  );
}

export function filterActiveDrafts(
  drafts: LocalTaskDraft[],
  nowMs: number = Date.now(),
): LocalTaskDraft[] {
  return drafts.filter((draft) => {
    const expiresAt = Date.parse(draft.expiresAt);
    return Number.isFinite(expiresAt) && expiresAt > nowMs;
  });
}

/** Remove expired drafts from storage; returns count purged. */
export async function purgeExpiredLocalTaskDrafts(
  nowMs: number = Date.now(),
): Promise<number> {
  const all = await readAllDraftsRaw();
  const active = filterActiveDrafts(all, nowMs);
  if (active.length === all.length) {
    return 0;
  }
  await writeAllDrafts(active);
  return all.length - active.length;
}

/** Non-expired drafts, newest first. */
export async function listLocalTaskDrafts(
  nowMs: number = Date.now(),
): Promise<LocalTaskDraft[]> {
  await purgeExpiredLocalTaskDrafts(nowMs);
  const active = filterActiveDrafts(await readAllDraftsRaw(), nowMs);
  return active.sort(
    (a, b) => Date.parse(b.savedAt) - Date.parse(a.savedAt),
  );
}

export async function getLocalTaskDraft(
  id: string,
  nowMs: number = Date.now(),
): Promise<LocalTaskDraft | null> {
  const drafts = await listLocalTaskDrafts(nowMs);
  return drafts.find((draft) => draft.id === id) ?? null;
}

export type SaveLocalTaskDraftInput = {
  id?: string;
  form: CreateTaskFormModel;
  nowMs?: number;
};

export async function saveLocalTaskDraft(
  input: SaveLocalTaskDraftInput,
): Promise<LocalTaskDraft> {
  const nowMs = input.nowMs ?? Date.now();
  const title = input.form.title.trim();
  if (!isDraftTitleValid(title)) {
    throw new Error(draftTitleValidationMessage());
  }

  await purgeExpiredLocalTaskDrafts(nowMs);
  const drafts = filterActiveDrafts(await readAllDraftsRaw(), nowMs);
  const savedAt = new Date(nowMs).toISOString();
  const expiresAt = new Date(nowMs + LOCAL_TASK_DRAFT_TTL_MS).toISOString();
  const serializedForm = serializeCreateTaskForm(input.form);

  const nextDraft: LocalTaskDraft = {
    id: input.id ?? generateDraftId(),
    savedAt,
    expiresAt,
    titlePreview: title,
    projectId: input.form.projectId || undefined,
    form: serializedForm,
  };

  const withoutExisting = input.id
    ? drafts.filter((draft) => draft.id !== input.id)
    : drafts;

  await writeAllDrafts([nextDraft, ...withoutExisting]);
  return nextDraft;
}

export async function deleteLocalTaskDraft(id: string): Promise<void> {
  const drafts = await readAllDraftsRaw();
  const next = drafts.filter((draft) => draft.id !== id);
  if (next.length === drafts.length) {
    throw new Error("Draft not found");
  }
  await writeAllDrafts(next);
}
