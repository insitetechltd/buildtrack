import { ensureMediaLibraryChecked } from "./mediaLibraryPermission";

let capturePrefetchRun: Promise<void> | null = null;

/**
 * Camera tab / Add Photos entry — single-flight permission check.
 * Module + CameraScreen both call this; a second call joins the same run.
 *
 * The overlay open starts the user-library walk. A camera-tab walk would
 * be the grid if the library changed before the tap.
 */
export function startLibraryCapturePrefetch(): void {
  if (capturePrefetchRun) {
    return;
  }
  capturePrefetchRun = (async () => {
    await ensureMediaLibraryChecked();
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
