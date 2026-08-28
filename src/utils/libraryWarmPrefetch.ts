import * as MediaLibrary from "expo-media-library";

import {
  computeLibraryThumbPixelSize,
  prefetchLibraryThumbnails,
  requestLibraryThumbnail,
} from "./libraryThumbnailCache";
import {
  LIBRARY_THUMB_PRIORITY_BACKGROUND,
  LIBRARY_WARM_PAGE_SIZE,
  LIBRARY_WARM_THUMB_COUNT,
} from "./libraryPickerPerf";

const DEFAULT_TILE_PT = 130;
const DEFAULT_SCALE = 3;

type WarmSnapshot = {
  assets: MediaLibrary.Asset[];
  endCursor: string | undefined;
  hasNextPage: boolean;
};

let warmSnapshot: WarmSnapshot | null = null;
let warmRun: Promise<void> | null = null;

export { LIBRARY_WARM_PAGE_SIZE, LIBRARY_WARM_THUMB_COUNT } from "./libraryPickerPerf";

/**
 * Prefetch first-page metadata (+ lower-res thumbs) from the camera screen so
 * hybrid library open feels instant.
 */
export function warmLibraryFirstPage(options?: {
  tileSizePt?: number;
  scale?: number;
}): Promise<void> {
  if (warmRun) {
    return warmRun;
  }

  warmRun = (async () => {
    try {
      const current = await MediaLibrary.getPermissionsAsync();
      let granted = current.granted;
      if (!granted && current.canAskAgain) {
        const requested = await MediaLibrary.requestPermissionsAsync();
        granted = requested.granted;
      }
      if (!granted) {
        return;
      }

      const page = await MediaLibrary.getAssetsAsync({
        first: LIBRARY_WARM_PAGE_SIZE,
        mediaType: MediaLibrary.MediaType.photo,
        sortBy: [[MediaLibrary.SortBy.modificationTime, false]],
      });

      warmSnapshot = {
        assets: page.assets,
        endCursor: page.endCursor,
        hasNextPage: page.hasNextPage,
      };

      const pixelSize = computeLibraryThumbPixelSize(
        options?.tileSizePt ?? DEFAULT_TILE_PT,
        options?.scale ?? DEFAULT_SCALE,
      );

      const warmAssets = page.assets.slice(0, LIBRARY_WARM_THUMB_COUNT);
      prefetchLibraryThumbnails(
        warmAssets.map((asset) => ({
          assetId: asset.id,
          pixelSize,
          fallbackUri: asset.uri,
          shouldDownloadFromNetwork: false,
          priority: LIBRARY_THUMB_PRIORITY_BACKGROUND,
        })),
      );

      await Promise.allSettled(
        warmAssets.map((asset) =>
          requestLibraryThumbnail({
            assetId: asset.id,
            pixelSize,
            fallbackUri: asset.uri,
            shouldDownloadFromNetwork: false,
            priority: LIBRARY_THUMB_PRIORITY_BACKGROUND,
          }),
        ),
      );
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

/** Prefetch thumbs for newly paginated assets (scroll continuity). */
export function prefetchLibraryPageThumbnails(
  assets: MediaLibrary.Asset[],
  pixelSize: number,
  count = 12,
): void {
  prefetchLibraryThumbnails(
    assets.slice(0, count).map((asset) => ({
      assetId: asset.id,
      pixelSize,
      fallbackUri: asset.uri,
      shouldDownloadFromNetwork: false,
      priority: LIBRARY_THUMB_PRIORITY_BACKGROUND,
    })),
  );
}
