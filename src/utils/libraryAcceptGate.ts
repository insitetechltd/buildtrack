import {
  pausePhotokitLibraryForAccept,
  resumePhotokitLibraryAfterAccept,
} from "@/modules/mediaLibrary/PhotokitThumbView";
import {
  cancelPhotokitLibraryExpandForAccept,
  resumePhotokitLibraryExpandAfterAccept,
} from "@/utils/libraryIndexPrefetch";
import {
  runExclusivePhotokitJob,
  waitForPhotokitGateIdle,
} from "@/utils/libraryPhotokitGate";

const ACCEPT_GATE_IDLE_MS = 20000;

/**
 * Checkmark / Accept: Recents expand + live thumbs occupy PhotoKit so
 * `getAssetInfoAsync` never returns (TF 235 spinner). Pause thumbs, wait
 * out an in-flight expand, then export originals alone on the exclusive gate.
 */
export async function withPhotokitReleasedForOriginals<T>(
  fn: () => Promise<T>,
): Promise<T> {
  cancelPhotokitLibraryExpandForAccept();
  pausePhotokitLibraryForAccept();
  try {
    await waitForPhotokitGateIdle(ACCEPT_GATE_IDLE_MS);
    return await runExclusivePhotokitJob("libraryAcceptOriginals", fn);
  } finally {
    resumePhotokitLibraryAfterAccept();
    resumePhotokitLibraryExpandAfterAccept();
  }
}
