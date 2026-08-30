import * as MediaLibrary from "expo-media-library";

import { ensureMediaLibraryChecked } from "./mediaLibraryPermission";
import { LIBRARY_WARM_PAGE_SIZE } from "./libraryPickerPerf";
import { runExclusivePhotokitJob } from "./libraryPhotokitGate";

type WarmSnapshot = {
  assets: MediaLibrary.Asset[];
  endCursor: string | undefined;
  hasNextPage: boolean;
};

let warmSnapshot: WarmSnapshot | null = null;
let warmRun: Promise<void> | null = null;

/** When warm is already running, never race-timeout into another Photos job. */
export const WARM_IN_FLIGHT_WAIT_MS = 20000;

export { LIBRARY_WARM_PAGE_SIZE } from "./libraryPickerPerf";

export function isWarmLibraryPrefetchInFlight(): boolean {
  return warmRun != null;
}

/**
 * Prefetch first-page metadata (no permission prompt). Started from capture entry
 * (camera tab / Add Photos) — not at app launch.
 *
 * Idempotent: ready snapshot or in-flight run is reused. Runs inside the
 * exclusive PhotoKit gate so it cannot overlap openLibrary/preview.
 */
export function warmLibraryFirstPage(): Promise<void> {
  if (warmSnapshot && warmSnapshot.assets.length > 0) {
    return Promise.resolve();
  }
  if (warmRun) {
    return warmRun;
  }

  warmRun = runExclusivePhotokitJob("warmLibraryFirstPage", async () => {
    try {
      // Re-check after queue wait — another caller may have filled the snapshot.
      if (warmSnapshot && warmSnapshot.assets.length > 0) {
        return;
      }
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
    }
  }).finally(() => {
    warmRun = null;
  });

  return warmRun;
}

/** Returns prefetched first page once; subsequent calls return null. */
export function consumeWarmLibraryPage(): WarmSnapshot | null {
  const snapshot = warmSnapshot;
  warmSnapshot = null;
  return snapshot;
}

/**
 * Prefer a ready snapshot; otherwise wait for an in-flight warm (camera path).
 * Does not start a new warm.
 *
 * If warm is in flight, wait up to WARM_IN_FLIGHT_WAIT_MS (not a short race).
 */
export async function consumeWarmLibraryPageAsync(
  timeoutMs?: number,
): Promise<WarmSnapshot | null> {
  const ready = consumeWarmLibraryPage();
  if (ready) {
    return ready;
  }
  const peek = peekWarmLibraryPage();
  if (peek && peek.assets.length > 0) {
    return consumeWarmLibraryPage();
  }
  if (!warmRun) {
    return null;
  }
  const waitMs =
    timeoutMs != null
      ? Math.max(timeoutMs, WARM_IN_FLIGHT_WAIT_MS)
      : WARM_IN_FLIGHT_WAIT_MS;
  await Promise.race([
    warmRun,
    new Promise<void>((resolve) => setTimeout(resolve, Math.max(0, waitMs))),
  ]);
  return consumeWarmLibraryPage();
}

/** Wait for warm without consuming — for bridge paint while index prefetches. */
export async function awaitWarmLibraryPage(
  timeoutMs: number = WARM_IN_FLIGHT_WAIT_MS,
): Promise<WarmSnapshot | null> {
  const peek = peekWarmLibraryPage();
  if (peek && peek.assets.length > 0) {
    return peek;
  }
  if (!warmRun) {
    return null;
  }
  await Promise.race([
    warmRun,
    new Promise<void>((resolve) =>
      setTimeout(resolve, Math.max(0, timeoutMs)),
    ),
  ]);
  return peekWarmLibraryPage();
}

/** Peek first asset URI for camera library button (does not consume warm page). */
export function peekWarmLibraryThumbUri(): string | null {
  return warmSnapshot?.assets[0]?.uri ?? null;
}

/** Peek warm page for bridge paint without consuming (library may consume later). */
export function peekWarmLibraryPage(): WarmSnapshot | null {
  return warmSnapshot;
}
