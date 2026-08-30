import { ensureMediaLibraryChecked } from "./mediaLibraryPermission";
import { warmLibraryFirstPage } from "./libraryWarmPrefetch";
import { prefetchPhotokitLibraryIndex } from "./libraryIndexPrefetch";
import { isLibraryPickerNative2b } from "./libraryPickerPerf";

let capturePrefetchRun: Promise<void> | null = null;

/**
 * Camera tab / Add Photos entry — single-flight.
 * Module + CameraScreen both call this; a second call joins the same run.
 *
 * - warm path: serialize warm then full openLibrary (via PhotoKit gate)
 * - native2b: skip MediaLibrary warm; limited open + background expand
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
      await prefetchPhotokitLibraryIndex(null);
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
