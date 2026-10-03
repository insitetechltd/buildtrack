import {
  expandPhotokitLibraryFull,
  isPhotokitLibrary2bAvailable,
  isPhotokitLibraryIndexAvailable,
  openPhotokitLibrary,
  openPhotokitLibraryLimited,
  type PhotokitLibrarySession,
} from "@/modules/mediaLibrary/PhotokitThumbView";
import { ALL_PHOTOS_ALBUM_ID } from "@/modules/mediaLibrary/libraryAlbumConstants";
import {
  LIBRARY_FIRST_PHOTO_BUDGET_MS,
  LIBRARY_PICKER_2B_FIRST_BATCH,
  isLibraryPickerNative2b,
} from "@/utils/libraryPickerPerf";
import { subscribeLibraryPickerTiming } from "@/utils/libraryPickerTiming";

/** Normalized album key for prefetch cache (`null` = Recents / all photos). */
export function photokitLibraryAlbumKey(
  selectedAlbumId: string,
): string | null {
  return selectedAlbumId === ALL_PHOTOS_ALBUM_ID ? null : selectedAlbumId;
}

let cachedSession: PhotokitLibrarySession | null = null;
let cachedAlbumKey: string | null | undefined;
let inFlight: Promise<PhotokitLibrarySession | null> | null = null;
let inFlightAlbumKey: string | null | undefined;
let pickerOpenGeneration = 0;
let inFlightGeneration = 0;
let expandInFlight: Promise<PhotokitLibrarySession | null> | null = null;
let expandPaused = false;
let scheduledExpandCancel: (() => void) | null = null;

/** Default newest-first keeps the album key so peek(album) still hits. Any other sort or date window is its own session. */
export function libraryIndexCacheKey(
  albumKey: string | null,
  ascending = false,
  afterEpochSeconds: number | null = null,
  beforeEpochSeconds: number | null = null,
): string | null {
  if (!ascending && afterEpochSeconds == null && beforeEpochSeconds == null) {
    return albumKey;
  }
  return `filter:${albumKey ?? "*"}:${ascending ? "asc" : "desc"}:${afterEpochSeconds ?? ""}:${beforeEpochSeconds ?? ""}`;
}

function cacheSession(
  cacheKey: string | null,
  session: PhotokitLibrarySession | null,
): PhotokitLibrarySession | null {
  if (session) {
    cachedSession = session;
    cachedAlbumKey = cacheKey;
  }
  return session;
}

/**
 * Bump when the library overlay opens. A walk started before this open
 * is not the grid, even if it is still running.
 */
export function markLibraryPickerOpen(): void {
  pickerOpenGeneration += 1;
}

/**
 * Start a live library query for the current open.
 * - warm: full openLibrary
 * - native2b: live user-library walk — scroll continues that walk
 *
 * Join only a walk started for this same open. A finished walk is not the next grid.
 * If an older walk is still running, return null so the caller can wait, then start fresh.
 */
export function prefetchPhotokitLibraryIndex(
  albumKey: string | null = null,
  ascending = false,
  afterEpochSeconds: number | null = null,
  beforeEpochSeconds: number | null = null,
): Promise<PhotokitLibrarySession | null> | null {
  if (!isPhotokitLibraryIndexAvailable()) {
    return null;
  }
  const cacheKey = libraryIndexCacheKey(
    albumKey,
    ascending,
    afterEpochSeconds,
    beforeEpochSeconds,
  );
  if (
    inFlight &&
    inFlightAlbumKey === cacheKey &&
    inFlightGeneration === pickerOpenGeneration
  ) {
    return inFlight;
  }
  if (inFlight) {
    return null;
  }
  inFlightAlbumKey = cacheKey;
  inFlightGeneration = pickerOpenGeneration;
  const use2b = isLibraryPickerNative2b() && isPhotokitLibrary2bAvailable();
  inFlight = (async () => {
    try {
      if (use2b) {
        const hasActiveFilters = ascending || afterEpochSeconds !== null || beforeEpochSeconds !== null;
        const limited = await openPhotokitLibraryLimited(
          albumKey,
          LIBRARY_PICKER_2B_FIRST_BATCH,
          ascending,
          afterEpochSeconds,
          beforeEpochSeconds,
        );
        if (!limited) {
          // Default first paint must not fall through to a sorted full-library fetch.
          if (albumKey == null && !hasActiveFilters) {
            return null;
          }
          return cacheSession(cacheKey, await openPhotokitLibrary(albumKey, ascending, afterEpochSeconds, beforeEpochSeconds));
        }
        return cacheSession(cacheKey, limited);
      }
      return cacheSession(cacheKey, await openPhotokitLibrary(albumKey, ascending, afterEpochSeconds, beforeEpochSeconds));
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}

/** Await this open's walk. An older in-flight walk is finished and discarded first. */
export async function awaitPhotokitLibraryIndex(
  albumKey: string | null,
  ascending = false,
  afterEpochSeconds: number | null = null,
  beforeEpochSeconds: number | null = null,
): Promise<PhotokitLibrarySession | null> {
  if (!isPhotokitLibraryIndexAvailable()) {
    return null;
  }
  const generation = pickerOpenGeneration;
  const cacheKey = libraryIndexCacheKey(
    albumKey,
    ascending,
    afterEpochSeconds,
    beforeEpochSeconds,
  );
  while (inFlight && inFlightGeneration !== generation) {
    const stale = inFlight;
    try {
      await stale;
    } catch {
      // The stale walk is not this open's grid.
    }
    if (inFlight === stale) {
      break;
    }
  }
  if (
    inFlight &&
    inFlightGeneration === generation &&
    inFlightAlbumKey !== cacheKey
  ) {
    try {
      await inFlight;
    } catch {
      // Different album for this open; start the requested one next.
    }
  }
  const run = prefetchPhotokitLibraryIndex(
    albumKey,
    ascending,
    afterEpochSeconds,
    beforeEpochSeconds,
  );
  if (!run) {
    return null;
  }
  return run;
}

/** Stop a pending first-paint/scroll expand so Accept can export originals. */
export function cancelPhotokitLibraryExpandForAccept(): void {
  expandPaused = true;
  scheduledExpandCancel?.();
  scheduledExpandCancel = null;
}

export function resumePhotokitLibraryExpandAfterAccept(): void {
  expandPaused = false;
}

/** After limited session is showing, wait for same-token full expand (2b). */
export async function awaitPhotokitLibraryExpand(
  albumKey: string | null,
  token: number,
  ascending = false,
  afterEpochSeconds: number | null = null,
  beforeEpochSeconds: number | null = null,
): Promise<PhotokitLibrarySession | null> {
  if (expandPaused) {
    return cachedSession;
  }
  const cacheKey = libraryIndexCacheKey(
    albumKey,
    ascending,
    afterEpochSeconds,
    beforeEpochSeconds,
  );
  if (cachedSession && cachedAlbumKey === cacheKey && cachedSession.token === token) {
    // Already expanded (count grew) or still limited — kick expand if needed.
    if (expandInFlight) {
      return expandInFlight;
    }
    if (isLibraryPickerNative2b() && isPhotokitLibrary2bAvailable()) {
      expandInFlight = expandPhotokitLibraryFull(token, ascending, afterEpochSeconds, beforeEpochSeconds).then((full) => {
        expandInFlight = null;
        if (expandPaused) {
          return cachedSession;
        }
        if (full && full.token === token) {
          return cacheSession(cacheKey, full);
        }
        return cachedSession;
      });
      return expandInFlight;
    }
    return cachedSession;
  }
  return awaitPhotokitLibraryIndex(albumKey, ascending, afterEpochSeconds, beforeEpochSeconds);
}

/**
 * TF 234: expanding immediately after limited starved first thumbs (~6s after meta).
 * Wait for first-screen paint, or the 3s budget timeout.
 */
export function schedulePhotokitLibraryExpandAfterFirstPaint(
  albumKey: string | null,
  token: number,
  onExpanded?: (session: PhotokitLibrarySession) => void,
  timeoutMs: number = LIBRARY_FIRST_PHOTO_BUDGET_MS,
  ascending = false,
  afterEpochSeconds: number | null = null,
  beforeEpochSeconds: number | null = null,
): () => void {
  let cancelled = false;
  let started = false;
  const start = () => {
    if (cancelled || started || expandPaused) {
      return;
    }
    started = true;
    void awaitPhotokitLibraryExpand(albumKey, token, ascending, afterEpochSeconds, beforeEpochSeconds).then((full) => {
      if (cancelled || !full) {
        return;
      }
      onExpanded?.(full);
    });
  };
  const unsub = subscribeLibraryPickerTiming((snap) => {
    if (snap.firstScreenAt != null) {
      start();
    }
  });
  const timer = setTimeout(start, Math.max(0, timeoutMs));
  const cancel = () => {
    cancelled = true;
    clearTimeout(timer);
    unsub();
    if (scheduledExpandCancel === cancel) {
      scheduledExpandCancel = null;
    }
  };
  scheduledExpandCancel = cancel;
  return cancel;
}

/**
 * Grow limited Library only after the user scrolls near the end of the
 * first batch. Auto-expand on first paint blocked Accept originals (TF 235).
 */
export function requestPhotokitLibraryExpandIfScrolled(
  albumKey: string | null,
  token: number,
  lastVisibleIndex: number,
  sessionCount: number,
  userScrolled: boolean,
  onExpanded?: (session: PhotokitLibrarySession) => void,
  ascending = false,
  afterEpochSeconds: number | null = null,
  beforeEpochSeconds: number | null = null,
): void {
  if (expandPaused || !userScrolled || token < 1 || sessionCount < 1) {
    return;
  }
  if (lastVisibleIndex < sessionCount - 3) {
    return;
  }
  void awaitPhotokitLibraryExpand(albumKey, token, ascending, afterEpochSeconds, beforeEpochSeconds).then((full) => {
    if (expandPaused || !full) {
      return;
    }
    onExpanded?.(full);
  });
}

export function peekPhotokitLibraryIndex(
  albumKey: string | null,
): PhotokitLibrarySession | null {
  if (cachedSession && cachedAlbumKey === albumKey) {
    return cachedSession;
  }
  return null;
}

export function isPhotokitLibraryIndexPrefetchInFlight(
  albumKey: string | null = null,
): boolean {
  return inFlight != null && inFlightAlbumKey === albumKey;
}

export function clearPhotokitLibraryIndexPrefetch(): void {
  cachedSession = null;
  cachedAlbumKey = undefined;
  inFlight = null;
  inFlightAlbumKey = undefined;
  pickerOpenGeneration = 0;
  inFlightGeneration = 0;
  expandInFlight = null;
  expandPaused = false;
  scheduledExpandCancel?.();
  scheduledExpandCancel = null;
}
