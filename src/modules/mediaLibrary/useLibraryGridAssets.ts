import React, { useCallback, useEffect, useRef, useState } from "react";
import * as MediaLibrary from "expo-media-library";

import { ensureMediaLibraryAccess } from "@/utils/mediaLibraryPermission";
import {
  awaitPhotokitLibraryIndex,
  requestPhotokitLibraryExpandIfScrolled,
} from "@/utils/libraryIndexPrefetch";
import { markLibraryPickerLoadPage } from "@/utils/libraryPickerTiming";
import {
  isPhotokitLibrary2bAvailable,
  isPhotokitLibraryIndexAvailable,
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
import { albumsWithRecentsSentinel, recentsSentinelAlbum } from "./libraryAlbumSearch";
import {
  peekRememberedAlbums,
  rememberAlbums,
} from "./libraryAlbumPickerMemory";

const DEFAULT_ALBUMS: LibraryAlbumChoice[] = [recentsSentinelAlbum()];

type UseLibraryGridAssetsOptions = {
  enabled: boolean;
  selectedAlbumId: string;
  sortOrder?: "descending" | "ascending";
  afterEpochSeconds?: number | null;
  beforeEpochSeconds?: number | null;
};

export function useLibraryGridAssets({
  enabled,
  selectedAlbumId,
  sortOrder = "descending",
  afterEpochSeconds = null,
  beforeEpochSeconds = null,
}: UseLibraryGridAssetsOptions) {
  const [albums, setAlbums] = useState<LibraryAlbumChoice[]>(
    () => peekRememberedAlbums() ?? DEFAULT_ALBUMS,
  );
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
  /** Native open in flight — stop MediaLibrary pages (PhotoKit contention). */
  const indexOpeningRef = useRef(false);

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
      const next = albumsWithRecentsSentinel(mapped);
      rememberAlbums(next);
      setAlbums(next);
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
        sortBy: [[MediaLibrary.SortBy.creationTime, sortOrder === "descending" ? false : true]],
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
  }, [sortOrder]);

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

      if (isPhotokitLibraryIndexAvailable()) {
        const albumArg =
          selectedAlbumId === ALL_PHOTOS_ALBUM_ID ? null : selectedAlbumId;
        const defaultFetch =
          sortOrder === "descending" &&
          afterEpochSeconds == null &&
          beforeEpochSeconds == null;

        // Live user-library walk, including oldest-first and date filters.
        // Gray tiles until it returns. Empty walk stays empty.
        if (
          selectedAlbumId === ALL_PHOTOS_ALBUM_ID &&
          isPhotokitLibrary2bAvailable()
        ) {
          indexOpeningRef.current = true;
          setLoadingPage(true);
          pageRequestRef.current += 1;
          const ascending = sortOrder === "ascending";
          const limited = await awaitPhotokitLibraryIndex(albumArg, ascending, afterEpochSeconds, beforeEpochSeconds);
          if (cancelled || openGenRef.current !== openGen) {
            indexOpeningRef.current = false;
            setLoadingPage(false);
            return;
          }
          indexOpeningRef.current = false;
          setLoadingPage(false);
          if (limited && limited.count > 0) {
            indexSessionRef.current = limited;
            setAssets([]);
            assetsByIdRef.current = new Map();
            setIndexSession(limited);
            setInitialLoadDone(true);
            return;
          }
          setAssets([]);
          assetsByIdRef.current = new Map();
          setIndexSession(null);
          setHasNextPage(false);
          hasNextPageRef.current = false;
          setInitialLoadDone(true);
          return;
        }

        // Walk API missing on the default newest-first album: stay empty.
        // Do not paint a MediaLibrary page beside a missing user-library walk.
        if (selectedAlbumId === ALL_PHOTOS_ALBUM_ID && defaultFetch) {
          setAssets([]);
          assetsByIdRef.current = new Map();
          setIndexSession(null);
          setHasNextPage(false);
          hasNextPageRef.current = false;
          setInitialLoadDone(true);
          return;
        }

        // Named albums. Oldest-first and date filters use the walk above when that
        // API exists; this open is the sorted fetch when it does not.
        if (cancelled || openGenRef.current !== openGen) {
          return;
        }

        indexOpeningRef.current = true;
        setLoadingPage(true);
        pageRequestRef.current += 1;
        const ascending = sortOrder === "ascending";
        const opened = await awaitPhotokitLibraryIndex(albumArg, ascending, afterEpochSeconds, beforeEpochSeconds);
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
    afterEpochSeconds,
    beforeEpochSeconds,
    enabled,
    loadPage,
    permission,
    selectedAlbumId,
    sortOrder,
  ]);

  useEffect(() => {
    if (!enabled || permission !== "granted") {
      return;
    }
    if (indexSession != null || indexSessionRef.current != null) {
      return;
    }
    if (indexOpeningRef.current) {
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
    if (indexOpeningRef.current) return;
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

  const onIndexNearEnd = useCallback(
    (lastVisibleIndex: number, userScrolled: boolean) => {
      const session = indexSessionRef.current;
      if (!session) {
        return;
      }
      const albumArg =
        selectedAlbumId === ALL_PHOTOS_ALBUM_ID ? null : selectedAlbumId;
      const ascending = sortOrder === "ascending";
      requestPhotokitLibraryExpandIfScrolled(
        albumArg,
        session.token,
        lastVisibleIndex,
        session.count,
        userScrolled,
        (expanded) => {
          if (expanded.token !== session.token) {
            return;
          }
          if (expanded.count === session.count) {
            return;
          }
          indexSessionRef.current = expanded;
          setIndexSession(expanded);
        },
        ascending,
        afterEpochSeconds,
        beforeEpochSeconds,
      );
    },
    [selectedAlbumId, sortOrder, afterEpochSeconds, beforeEpochSeconds],
  );

  return {
    albums,
    assets,
    assetsByIdRef,
    loadingPage,
    initialLoadDone,
    permission,
    onEndReached,
    onIndexNearEnd,
    loadAlbumsIfNeeded,
    indexSession,
  };
}
