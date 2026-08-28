import * as MediaLibrary from "expo-media-library";

import {
  computeLibraryThumbPixelSize,
  requestLibraryThumbnail,
} from "./libraryThumbnailCache";

/** Matches HybridLibraryPickerScreen PAGE_SIZE. */
export const LIBRARY_WARM_PAGE_SIZE = 36;
/** Thumbnails to pre-decode while the user is still on the camera screen. */
export const LIBRARY_WARM_THUMB_COUNT = 12;
const DEFAULT_TILE_PT = 130;
const DEFAULT_SCALE = 3;

type WarmSnapshot = {
  assets: MediaLibrary.Asset[];
  endCursor: string | undefined;
  hasNextPage: boolean;
};

let warmSnapshot: WarmSnapshot | null = null;
let warmRun: Promise<void> | null = null;

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
      await Promise.allSettled(
        warmAssets.map((asset) =>
          requestLibraryThumbnail({
            assetId: asset.id,
            pixelSize,
            fallbackUri: asset.uri,
            shouldDownloadFromNetwork: false,
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
