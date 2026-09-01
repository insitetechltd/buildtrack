import {
  expandPhotokitLibraryFull,
  isPhotokitLibrary2bAvailable,
  isPhotokitLibraryIndexAvailable,
  isPhotokitLibraryWithIdsAvailable,
  openPhotokitLibrary,
  openPhotokitLibraryLimited,
  openPhotokitLibraryWithIds,
  photokitIdAt,
  type PhotokitLibrarySession,
} from "@/modules/mediaLibrary/PhotokitThumbView";
import { ALL_PHOTOS_ALBUM_ID } from "@/modules/mediaLibrary/libraryAlbumConstants";
import {
  LIBRARY_FIRST_PHOTO_BUDGET_MS,
  LIBRARY_PICKER_2B_FIRST_BATCH,
  isLibraryPickerNative2b,
} from "@/utils/libraryPickerPerf";
import { subscribeLibraryPickerTiming } from "@/utils/libraryPickerTiming";
import {
  hydratePhotokitPreviewIds,
  peekPhotokitPreviewIds,
  persistPhotokitPreviewIds,
} from "@/utils/libraryPreviewIds";

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
let expandInFlight: Promise<PhotokitLibrarySession | null> | null = null;
let expandPaused = false;
let scheduledExpandCancel: (() => void) | null = null;

function cacheSession(
  albumKey: string | null,
  session: PhotokitLibrarySession | null,
): PhotokitLibrarySession | null {
  if (session) {
    cachedSession = session;
    cachedAlbumKey = albumKey;
  }
  return session;
}

function persistPreviewFromSession(session: PhotokitLibrarySession): void {
  const n = Math.min(session.count, LIBRARY_PICKER_2B_FIRST_BATCH);
  const ids: string[] = [];
  for (let i = 0; i < n; i += 1) {
    const id = photokitIdAt(session.token, i);
    if (id) {
      ids.push(id);
    }
  }
  if (ids.length > 0) {
    void persistPhotokitPreviewIds(ids);
  }
}

/**
 * Start index early (camera tab). Path depends on A/B flag:
 * - warm: full openLibrary
 * - native2b: persisted ids (if any) then limited Recents — expand after first screen
 */
export function prefetchPhotokitLibraryIndex(
  albumKey: string | null = null,
): Promise<PhotokitLibrarySession | null> | null {
  if (!isPhotokitLibraryIndexAvailable()) {
    return null;
  }
  if (cachedSession && cachedAlbumKey === albumKey) {
    return Promise.resolve(cachedSession);
  }
  if (inFlight && inFlightAlbumKey === albumKey) {
    return inFlight;
  }
  inFlightAlbumKey = albumKey;
  const use2b = isLibraryPickerNative2b() && isPhotokitLibrary2bAvailable();
  inFlight = (async () => {
    try {
      if (use2b) {
        if (!peekPhotokitPreviewIds()) {
          await hydratePhotokitPreviewIds();
        }
        const persisted = peekPhotokitPreviewIds();
        if (
          albumKey == null &&
          persisted &&
          persisted.length >= LIBRARY_PICKER_2B_FIRST_BATCH &&
          isPhotokitLibraryWithIdsAvailable()
        ) {
          const preview = await openPhotokitLibraryWithIds(persisted);
          if (preview) {
            return cacheSession(albumKey, preview);
          }
        }
        const limited = await openPhotokitLibraryLimited(
          albumKey,
          LIBRARY_PICKER_2B_FIRST_BATCH,
        );
        if (!limited) {
          return cacheSession(albumKey, await openPhotokitLibrary(albumKey));
        }
        persistPreviewFromSession(limited);
        return cacheSession(albumKey, limited);
      }
      return cacheSession(albumKey, await openPhotokitLibrary(albumKey));
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}

/** Await limited or full session; kicks expand if 2b and still limited. */
export async function awaitPhotokitLibraryIndex(
  albumKey: string | null,
): Promise<PhotokitLibrarySession | null> {
  if (!isPhotokitLibraryIndexAvailable()) {
    return null;
  }
  if (cachedSession && cachedAlbumKey === albumKey) {
    return cachedSession;
  }
  const run = prefetchPhotokitLibraryIndex(albumKey);
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
): Promise<PhotokitLibrarySession | null> {
  if (expandPaused) {
    return cachedSession;
  }
  if (cachedSession && cachedAlbumKey === albumKey && cachedSession.token === token) {
    // Already expanded (count grew) or still limited — kick expand if needed.
    if (expandInFlight) {
      return expandInFlight;
    }
    if (isLibraryPickerNative2b() && isPhotokitLibrary2bAvailable()) {
      expandInFlight = expandPhotokitLibraryFull(token).then((full) => {
        expandInFlight = null;
        if (expandPaused) {
          return cachedSession;
        }
        if (full && full.token === token) {
          return cacheSession(albumKey, full);
        }
        return cachedSession;
      });
      return expandInFlight;
    }
    return cachedSession;
  }
  return awaitPhotokitLibraryIndex(albumKey);
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
): () => void {
  let cancelled = false;
  let started = false;
  const start = () => {
    if (cancelled || started || expandPaused) {
      return;
    }
    started = true;
    void awaitPhotokitLibraryExpand(albumKey, token).then((full) => {
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
 * Grow limited Recents only after the user scrolls near the end of the
 * first batch. Auto-expand on first paint blocked Accept originals (TF 235).
 */
export function requestPhotokitLibraryExpandIfScrolled(
  albumKey: string | null,
  token: number,
  lastVisibleIndex: number,
  sessionCount: number,
  userScrolled: boolean,
  onExpanded?: (session: PhotokitLibrarySession) => void,
): void {
  if (expandPaused || !userScrolled || token < 1 || sessionCount < 1) {
    return;
  }
  if (sessionCount > LIBRARY_PICKER_2B_FIRST_BATCH) {
    return;
  }
  if (lastVisibleIndex < sessionCount - 3) {
    return;
  }
  void awaitPhotokitLibraryExpand(albumKey, token).then((full) => {
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
  expandInFlight = null;
  expandPaused = false;
  scheduledExpandCancel?.();
  scheduledExpandCancel = null;
}
