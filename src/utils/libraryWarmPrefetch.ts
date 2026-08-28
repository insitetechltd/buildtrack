import * as MediaLibrary from "expo-media-library";

import { ensureMediaLibraryChecked } from "./mediaLibraryPermission";
import { LIBRARY_WARM_PAGE_SIZE } from "./libraryPickerPerf";

type WarmSnapshot = {
  assets: MediaLibrary.Asset[];
  endCursor: string | undefined;
  hasNextPage: boolean;
};

let warmSnapshot: WarmSnapshot | null = null;
let warmRun: Promise<void> | null = null;

export { LIBRARY_WARM_PAGE_SIZE } from "./libraryPickerPerf";

/**
 * Prefetch first-page metadata (no permission prompt). Used on app wake and from
 * CaptureSession camera so library grids can skip the initial getAssetsAsync wait.
 */
export function warmLibraryFirstPage(): Promise<void> {
  if (warmRun) {
    return warmRun;
  }

  warmRun = (async () => {
    try {
      const permission = await ensureMediaLibraryChecked();
      if (!permission.granted) {
        return;
      }

      const page = await MediaLibrary.getAssetsAsync({
        first: LIBRARY_WARM_PAGE_SIZE,
        mediaType: MediaLibrary.MediaType.photo,
        sortBy: [[MediaLibrary.SortBy.creationTime, false]],
      });

      warmSnapshot = {
        assets: page.assets,
        endCursor: page.endCursor,
        hasNextPage: page.hasNextPage,
      };
    } catch (error) {
      console.warn("[libraryWarmPrefetch] warm failed", error);
    } finally {
      warmRun = null;
    }
  })();

  return warmRun;
}

/** Returns prefetched first page once; subsequent calls return null. */
export function consumeWarmLibraryPage(): WarmSnapshot | null {
  const snapshot = warmSnapshot;
  warmSnapshot = null;
  return snapshot;
}

/** Peek first asset URI for camera library button (does not consume warm page). */
export function peekWarmLibraryThumbUri(): string | null {
  return warmSnapshot?.assets[0]?.uri ?? null;
}
