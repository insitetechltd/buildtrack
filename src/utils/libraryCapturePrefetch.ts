import { ensureMediaLibraryChecked } from "./mediaLibraryPermission";
import { warmLibraryFirstPage } from "./libraryWarmPrefetch";
import { prefetchPhotokitLibraryIndex } from "./libraryIndexPrefetch";
import { isLibraryPickerNative2b } from "./libraryPickerPerf";

let capturePrefetchRun: Promise<void> | null = null;

/**
 * Camera tab / Add Photos entry — single-flight.
 * Module + CameraScreen both call this; a second call joins the same run.
 *
 * native2b: permission check only. The overlay open starts the walk.
 * A camera-tab walk would be the grid if the library changed before the tap.
 * warm path: MediaLibrary first page, then full openLibrary — never parallel.
 */
export function startLibraryCapturePrefetch(): void {
  if (capturePrefetchRun) {
    return;
  }
  capturePrefetchRun = (async () => {
    const permission = await ensureMediaLibraryChecked();
    if (!permission.granted) {
      return;
    }
    if (isLibraryPickerNative2b()) {
      return;
    }
    await warmLibraryFirstPage();
    await prefetchPhotokitLibraryIndex(null);
  })().finally(() => {
    capturePrefetchRun = null;
  });
}

/** Test helper. */
export function isLibraryCapturePrefetchInFlight(): boolean {
  return capturePrefetchRun != null;
}

/** Jest only. */
export function resetLibraryCapturePrefetchForTests(): void {
  capturePrefetchRun = null;
}
