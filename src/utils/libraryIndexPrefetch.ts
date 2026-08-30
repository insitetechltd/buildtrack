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
  LIBRARY_PICKER_2B_FIRST_BATCH,
  isLibraryPickerNative2b,
} from "@/utils/libraryPickerPerf";

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

/**
 * Start index early (camera tab). Path depends on A/B flag:
 * - warm: full openLibrary
 * - native2b: openLibraryLimited(60) then background expandLibraryFull (same token)
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
        const limited = await openPhotokitLibraryLimited(
          albumKey,
          LIBRARY_PICKER_2B_FIRST_BATCH,
        );
        if (!limited) {
          return cacheSession(albumKey, await openPhotokitLibrary(albumKey));
        }
        cacheSession(albumKey, limited);
        // Expand in background; callers of await get limited immediately via cache.
        expandInFlight = expandPhotokitLibraryFull(limited.token).then(
          (full) => {
            expandInFlight = null;
            if (full && full.token === limited.token) {
              return cacheSession(albumKey, full);
            }
            return cachedSession;
          },
        );
        return limited;
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

/** After limited session is showing, wait for same-token full expand (2b). */
export async function awaitPhotokitLibraryExpand(
  albumKey: string | null,
  token: number,
): Promise<PhotokitLibrarySession | null> {
  if (cachedSession && cachedAlbumKey === albumKey && cachedSession.token === token) {
    // Already expanded (count grew) or still limited — kick expand if needed.
    if (expandInFlight) {
      return expandInFlight;
    }
    if (isLibraryPickerNative2b() && isPhotokitLibrary2bAvailable()) {
      expandInFlight = expandPhotokitLibraryFull(token).then((full) => {
        expandInFlight = null;
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
}
