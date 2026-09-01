import AsyncStorage from "@react-native-async-storage/async-storage";

import { LIBRARY_PICKER_2B_FIRST_BATCH } from "./libraryPickerPerf";

const STORAGE_KEY = "@insite/photokit-recents-preview-ids";
const MAX_IDS = LIBRARY_PICKER_2B_FIRST_BATCH;

let memory: string[] | null = null;

function sanitizeIds(ids: unknown): string[] {
  if (!Array.isArray(ids)) {
    return [];
  }
  return ids.filter(
    (id): id is string => typeof id === "string" && id.length > 0,
  ).slice(0, MAX_IDS);
}

export function peekPhotokitPreviewIds(): string[] | null {
  if (memory && memory.length > 0) {
    return memory;
  }
  return null;
}

export async function hydratePhotokitPreviewIds(): Promise<string[] | null> {
  if (memory && memory.length > 0) {
    return memory;
  }
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const ids = sanitizeIds(JSON.parse(raw));
    memory = ids.length > 0 ? ids : null;
    return memory;
  } catch {
    return null;
  }
}

export async function persistPhotokitPreviewIds(ids: string[]): Promise<void> {
  const next = sanitizeIds(ids);
  if (next.length === 0) {
    return;
  }
  memory = next;
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Disk persist is best-effort; memory still warms this process.
  }
}

/** Jest only. */
export function resetPhotokitPreviewIdsForTests(): void {
  memory = null;
}
