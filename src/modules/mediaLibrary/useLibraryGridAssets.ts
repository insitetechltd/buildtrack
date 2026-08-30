import React, { useCallback, useEffect, useRef, useState } from "react";
import * as MediaLibrary from "expo-media-library";

import { ensureMediaLibraryAccess } from "@/utils/mediaLibraryPermission";
import {
  awaitWarmLibraryPage,
  consumeWarmLibraryPage,
  consumeWarmLibraryPageAsync,
  isWarmLibraryPrefetchInFlight,
  peekWarmLibraryPage,
} from "@/utils/libraryWarmPrefetch";
import {
  awaitPhotokitLibraryExpand,
  awaitPhotokitLibraryIndex,
  isPhotokitLibraryIndexPrefetchInFlight,
  peekPhotokitLibraryIndex,
} from "@/utils/libraryIndexPrefetch";
import { markLibraryPickerLoadPage } from "@/utils/libraryPickerTiming";
import { isLibraryPickerNative2b } from "@/utils/libraryPickerPerf";
import {
  isPhotokitLibrary2bAvailable,
  isPhotokitLibraryIndexAvailable,
  previewPhotokitNewestIds,
  type PhotokitLibrarySession,
} from "./PhotokitThumbView";
import {
  ALL_PHOTOS_ALBUM_ID,
  LIBRARY_ASSET_SORT,
  LIBRARY_INITIAL_PAGE_SIZE,
  LIBRARY_PAGE_SIZE,
  LIBRARY_PREFETCH_UNTIL_COUNT,
  type LibraryAlbumChoice,
} from "./libraryAlbumConstants";

const DEFAULT_ALBUMS: LibraryAlbumChoice[] = [
  { id: ALL_PHOTOS_ALBUM_ID, title: "All photos", assetCount: 0 },
];

function stubAssetFromId(id: string): MediaLibrary.Asset {
  return {
    id,
    filename: `library_${id}.jpg`,
    uri: `ph://${id}`,
    mediaType: MediaLibrary.MediaType.photo,
    mediaSubtypes: [],
    width: 0,
    height: 0,
    creationTime: 0,
    modificationTime: 0,
    duration: 0,
  } as MediaLibrary.Asset;
}

type UseLibraryGridAssetsOptions = {
  enabled: boolean;
  selectedAlbumId: string;
  consumeWarmPage?: boolean;
};

export function useLibraryGridAssets({
  enabled,
  selectedAlbumId,
  consumeWarmPage = false,
}: UseLibraryGridAssetsOptions) {
  const [albums, setAlbums] = useState<LibraryAlbumChoice[]>(DEFAULT_ALBUMS);
  const [assets, setAssets] = useState<MediaLibrary.Asset[]>([]);
  const [endCursor, setEndCursor] = useState<string | undefined>();
  const [hasNextPage, setHasNextPage] = useState(true);
  const [loadingPage, setLoadingPage] = useState(false);
  const [permission, setPermission] = useState<string | null>(null);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [indexSession, setIndexSession] = useState<PhotokitLibrarySession | null>(
    null,
  );
  const pageRequestRef = useRef(0);
  const openGenRef = useRef(0);
  const assetsByIdRef = useRef(new Map<string, MediaLibrary.Asset>());
  const albumsLoadedRef = useRef(false);
  const albumsLoadingRef = useRef(false);
  const autoFillCursorRef = useRef<string | undefined>(undefined);
  const endCursorRef = useRef<string | undefined>(undefined);
  const hasNextPageRef = useRef(true);
  /** Sync gate — set before React commits indexSession (blocks auto-fill race). */
  const indexSessionRef = useRef<PhotokitLibrarySession | null>(null);
  /** Sequential first-buffer fill — auto-fill must not interleave. */
  const bridgeBootstrappingRef = useRef(false);
  /** Native open in flight — stop MediaLibrary pages (PhotoKit contention). */
  const indexOpeningRef = useRef(false);

  const applyBridgeAssets = useCallback((next: MediaLibrary.Asset[]) => {
    const map = new Map<string, MediaLibrary.Asset>();
    for (const asset of next) {
      map.set(asset.id, asset);
    }
    assetsByIdRef.current = map;
    setAssets(next);
  }, []);

  const loadAlbumsIfNeeded = useCallback(async () => {
    if (albumsLoadedRef.current || albumsLoadingRef.current) {
      return;
    }
    albumsLoadingRef.current = true;
    try {
      const list = await MediaLibrary.getAlbumsAsync({
        includeSmartAlbums: true,
      });
      const mapped: LibraryAlbumChoice[] = list
        .filter((album) => (album.assetCount ?? 0) > 0)
        .map((album) => ({
          id: album.id,
          title: album.title || "Album",
          assetCount: album.assetCount ?? 0,
        }))
        .sort((a, b) => a.title.localeCompare(b.title));

      albumsLoadedRef.current = true;
      setAlbums([...DEFAULT_ALBUMS, ...mapped]);
    } catch (error) {
      console.warn("[LibraryGrid] albums failed", error);
      albumsLoadedRef.current = true;
      setAlbums(DEFAULT_ALBUMS);
    } finally {
      albumsLoadingRef.current = false;
    }
  }, []);

  const loadPage = useCallback(async (albumId: string, after?: string) => {
    if (indexOpeningRef.current || indexSessionRef.current != null) {
      return;
    }
    markLibraryPickerLoadPage(after ? "pagination" : "fallback");
    const requestId = pageRequestRef.current + 1;
    pageRequestRef.current = requestId;
    setLoadingPage(true);
    const first = after ? LIBRARY_PAGE_SIZE : LIBRARY_INITIAL_PAGE_SIZE;
    try {
      const page = await MediaLibrary.getAssetsAsync({
        first,
        after,
        album: albumId === ALL_PHOTOS_ALBUM_ID ? undefined : albumId,
        mediaType: MediaLibrary.MediaType.photo,
        sortBy: LIBRARY_ASSET_SORT,
      });
      if (
        pageRequestRef.current !== requestId ||
        indexOpeningRef.current ||
        indexSessionRef.current != null
      ) {
        return;
      }
      setAssets((prev) => {
        const next = after ? [...prev, ...page.assets] : page.assets;
        const map = new Map<string, MediaLibrary.Asset>();
        for (const asset of next) {
          map.set(asset.id, asset);
        }
        assetsByIdRef.current = map;
        return next;
      });
      setEndCursor(page.endCursor);
      setHasNextPage(page.hasNextPage);
      endCursorRef.current = page.endCursor;
      hasNextPageRef.current = page.hasNextPage;
    } catch (error) {
      console.warn("[LibraryGrid] library page failed", error);
    } finally {
      if (pageRequestRef.current === requestId) {
        setLoadingPage(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    let cancelled = false;
    (async () => {
      const granted = await ensureMediaLibraryAccess();
      if (cancelled) {
        return;
      }
      setPermission(granted ? "granted" : "denied");
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled || permission !== "granted") {
      return;
    }
    let cancelled = false;
    openGenRef.current += 1;
    const openGen = openGenRef.current;
    (async () => {
      setInitialLoadDone(false);
      indexSessionRef.current = null;
      setIndexSession(null);
      setAssets([]);
      assetsByIdRef.current = new Map();
      pageRequestRef.current += 1;
      autoFillCursorRef.current = undefined;
      endCursorRef.current = undefined;
      hasNextPageRef.current = true;
      indexOpeningRef.current = false;
      bridgeBootstrappingRef.current = false;

      if (isPhotokitLibraryIndexAvailable()) {
        const albumArg =
          selectedAlbumId === ALL_PHOTOS_ALBUM_ID ? null : selectedAlbumId;

        // Option 2B: warm bridge for first paint, then limited native → same-token expand.
        if (
          selectedAlbumId === ALL_PHOTOS_ALBUM_ID &&
          isLibraryPickerNative2b() &&
          isPhotokitLibrary2bAvailable()
        ) {
          bridgeBootstrappingRef.current = true;
          try {
            const peekWarm = peekWarmLibraryPage();
            if (peekWarm && peekWarm.assets.length > 0) {
              applyBridgeAssets(peekWarm.assets);
              setEndCursor(peekWarm.endCursor);
              setHasNextPage(peekWarm.hasNextPage);
              endCursorRef.current = peekWarm.endCursor;
              hasNextPageRef.current = peekWarm.hasNextPage;
            }
            if (consumeWarmPage) {
              const warm = await consumeWarmLibraryPageAsync();
              if (cancelled || openGenRef.current !== openGen) {
                return;
              }
              if (warm && warm.assets.length > 0) {
                applyBridgeAssets(warm.assets);
                setEndCursor(warm.endCursor);
                setHasNextPage(warm.hasNextPage);
                endCursorRef.current = warm.endCursor;
                hasNextPageRef.current = warm.hasNextPage;
              }
            }
            if (
              assetsByIdRef.current.size === 0 &&
              (isWarmLibraryPrefetchInFlight() ||
                isPhotokitLibraryIndexPrefetchInFlight(null))
            ) {
              const warmLate = await awaitWarmLibraryPage();
              if (cancelled || openGenRef.current !== openGen) {
                return;
              }
              if (warmLate && warmLate.assets.length > 0) {
                applyBridgeAssets(warmLate.assets);
                setEndCursor(warmLate.endCursor);
                setHasNextPage(warmLate.hasNextPage);
                endCursorRef.current = warmLate.endCursor;
                hasNextPageRef.current = warmLate.hasNextPage;
                if (consumeWarmPage) {
                  consumeWarmLibraryPage();
                }
              }
            }
            if (assetsByIdRef.current.size > 0) {
              setInitialLoadDone(true);
            }
          } finally {
            bridgeBootstrappingRef.current = false;
          }

          indexOpeningRef.current = true;
          setLoadingPage(true);
          pageRequestRef.current += 1;
          const limited = await awaitPhotokitLibraryIndex(albumArg);
          if (cancelled || openGenRef.current !== openGen) {
            indexOpeningRef.current = false;
            setLoadingPage(false);
            return;
          }
          if (limited) {
            indexSessionRef.current = limited;
            setAssets([]);
            assetsByIdRef.current = new Map();
            setIndexSession(limited);
            setInitialLoadDone(true);
            setLoadingPage(false);
            indexOpeningRef.current = false;
            const expanded = await awaitPhotokitLibraryExpand(
              albumArg,
              limited.token,
            );
            if (cancelled || openGenRef.current !== openGen) {
              return;
            }
            if (
              expanded &&
              expanded.token === limited.token &&
              expanded.count !== limited.count
            ) {
              indexSessionRef.current = expanded;
              setIndexSession(expanded);
            }
            return;
          }
          indexOpeningRef.current = false;
          setLoadingPage(false);
          // Fall through to warm path if limited open failed.
        }

        // Warm path: warm bridge while full openLibrary runs (TF 232 serialize).
        if (selectedAlbumId === ALL_PHOTOS_ALBUM_ID) {
          bridgeBootstrappingRef.current = true;
          try {
            const peekWarm = peekWarmLibraryPage();
            if (peekWarm && peekWarm.assets.length > 0) {
              applyBridgeAssets(peekWarm.assets);
              setEndCursor(peekWarm.endCursor);
              setHasNextPage(peekWarm.hasNextPage);
              endCursorRef.current = peekWarm.endCursor;
              hasNextPageRef.current = peekWarm.hasNextPage;
            }
            if (consumeWarmPage) {
              // Always wait out an in-flight warm (gate + WARM_IN_FLIGHT_WAIT_MS).
              // Short race timeouts caused TF 232 warm-miss → full openLibrary ~20s.
              const warm = await consumeWarmLibraryPageAsync();
              if (cancelled || openGenRef.current !== openGen) {
                return;
              }
              if (warm && warm.assets.length > 0) {
                applyBridgeAssets(warm.assets);
                setEndCursor(warm.endCursor);
                setHasNextPage(warm.hasNextPage);
                endCursorRef.current = warm.endCursor;
                hasNextPageRef.current = warm.hasNextPage;
              }
            }
            const indexReady = peekPhotokitLibraryIndex(null);
            const indexBusy =
              indexReady != null || isPhotokitLibraryIndexPrefetchInFlight(null);
            const warmBusy = isWarmLibraryPrefetchInFlight();
            if (
              assetsByIdRef.current.size === 0 &&
              (indexBusy || warmBusy) &&
              !cancelled &&
              openGenRef.current === openGen
            ) {
              const warmLate = await awaitWarmLibraryPage();
              if (cancelled || openGenRef.current !== openGen) {
                return;
              }
              if (warmLate && warmLate.assets.length > 0) {
                applyBridgeAssets(warmLate.assets);
                setEndCursor(warmLate.endCursor);
                setHasNextPage(warmLate.hasNextPage);
                endCursorRef.current = warmLate.endCursor;
                hasNextPageRef.current = warmLate.hasNextPage;
                if (consumeWarmPage) {
                  consumeWarmLibraryPage();
                }
              }
            }
            if (
              assetsByIdRef.current.size === 0 &&
              !indexBusy &&
              !warmBusy &&
              !cancelled &&
              openGenRef.current === openGen
            ) {
              const ids = await previewPhotokitNewestIds(
                LIBRARY_PREFETCH_UNTIL_COUNT,
              );
              if (cancelled || openGenRef.current !== openGen) {
                return;
              }
              if (ids.length > 0) {
                applyBridgeAssets(ids.map(stubAssetFromId));
                setHasNextPage(true);
                hasNextPageRef.current = true;
              }
            }
            if (assetsByIdRef.current.size === 0 && !indexBusy && !warmBusy) {
              await loadPage(selectedAlbumId);
              if (cancelled || openGenRef.current !== openGen) {
                return;
              }
              setInitialLoadDone(true);
            }
          } finally {
            bridgeBootstrappingRef.current = false;
          }
        }

        if (cancelled || openGenRef.current !== openGen) {
          return;
        }

        indexOpeningRef.current = true;
        setLoadingPage(true);
        pageRequestRef.current += 1;
        const opened = await awaitPhotokitLibraryIndex(albumArg);
        if (cancelled || openGenRef.current !== openGen) {
          indexOpeningRef.current = false;
          setLoadingPage(false);
          return;
        }
        if (opened) {
          indexSessionRef.current = opened;
          pageRequestRef.current += 1;
          setAssets([]);
          setEndCursor(undefined);
          setHasNextPage(false);
          setLoadingPage(false);
          endCursorRef.current = undefined;
          hasNextPageRef.current = false;
          assetsByIdRef.current = new Map();
          setIndexSession(opened);
          setInitialLoadDone(true);
          indexOpeningRef.current = false;
          return;
        }
        indexOpeningRef.current = false;
        setLoadingPage(false);
        if (assetsByIdRef.current.size > 0) {
          setInitialLoadDone(true);
          return;
        }
      }

      if (consumeWarmPage && selectedAlbumId === ALL_PHOTOS_ALBUM_ID) {
        const warm = await consumeWarmLibraryPageAsync();
        if (cancelled || openGenRef.current !== openGen) {
          return;
        }
        if (warm) {
          applyBridgeAssets(warm.assets);
          setEndCursor(warm.endCursor);
          setHasNextPage(warm.hasNextPage);
          endCursorRef.current = warm.endCursor;
          hasNextPageRef.current = warm.hasNextPage;
          setInitialLoadDone(true);
          return;
        }
      }

      setAssets([]);
      setEndCursor(undefined);
      setHasNextPage(true);
      endCursorRef.current = undefined;
      hasNextPageRef.current = true;
      autoFillCursorRef.current = undefined;
      markLibraryPickerLoadPage("album");
      await loadPage(selectedAlbumId);
      if (cancelled || openGenRef.current !== openGen) return;
      setInitialLoadDone(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [
    applyBridgeAssets,
    consumeWarmPage,
    enabled,
    loadPage,
    permission,
    selectedAlbumId,
  ]);

  useEffect(() => {
    if (!enabled || permission !== "granted") {
      return;
    }
    if (indexSession != null || indexSessionRef.current != null) {
      return;
    }
    if (bridgeBootstrappingRef.current || indexOpeningRef.current) {
      return;
    }
    if (!hasNextPage) {
      return;
    }
    if (assets.length >= LIBRARY_PREFETCH_UNTIL_COUNT) {
      return;
    }
    if (autoFillCursorRef.current === endCursor) {
      return;
    }
    autoFillCursorRef.current = endCursor;
    void loadPage(selectedAlbumId, endCursor);
  }, [
    assets.length,
    enabled,
    endCursor,
    hasNextPage,
    indexSession,
    loadPage,
    loadingPage,
    permission,
    selectedAlbumId,
  ]);

  const onEndReached = useCallback(() => {
    if (indexSession != null || indexSessionRef.current != null) return;
    if (bridgeBootstrappingRef.current || indexOpeningRef.current) return;
    if (!hasNextPage || loadingPage || !endCursor) return;
    if (assets.length < LIBRARY_PREFETCH_UNTIL_COUNT) return;
    void loadPage(selectedAlbumId, endCursor);
  }, [
    assets.length,
    endCursor,
    hasNextPage,
    indexSession,
    loadPage,
    loadingPage,
    selectedAlbumId,
  ]);

  return {
    albums,
    assets,
    assetsByIdRef,
    loadingPage,
    initialLoadDone,
    permission,
    onEndReached,
    loadAlbumsIfNeeded,
    indexSession,
  };
}
