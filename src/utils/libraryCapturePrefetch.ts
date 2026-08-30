import { ensureMediaLibraryChecked } from "./mediaLibraryPermission";
import { warmLibraryFirstPage } from "./libraryWarmPrefetch";
import { prefetchPhotokitLibraryIndex } from "./libraryIndexPrefetch";
import { isLibraryPickerNative2b } from "./libraryPickerPerf";

let capturePrefetchRun: Promise<void> | null = null;

/**
 * Camera tab / Add Photos entry — single-flight.
 * Module + CameraScreen both call this; a second call joins the same run.
 *
 * Always warm first (cheap MediaLibrary page for ≤3s first paint), then
 * PhotoKit index (full open or limited+expand) on the exclusive gate.
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
    await warmLibraryFirstPage();
    // Index after warm — never parallel with warm (PhotoKit gate / daemon).
    await prefetchPhotokitLibraryIndex(null);
  })().finally(() => {
    capturePrefetchRun = null;
  });
}

/** Test helper. */
export function isLibraryCapturePrefetchInFlight(): boolean {
  return capturePrefetchRun != null;
}
