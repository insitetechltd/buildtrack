import React, { useCallback, useEffect, useRef, useState } from "react";
import * as MediaLibrary from "expo-media-library";

import { consumeWarmLibraryPage } from "@/utils/libraryWarmPrefetch";
import {
  ALL_PHOTOS_ALBUM_ID,
  LIBRARY_ASSET_SORT,
  LIBRARY_PAGE_SIZE,
  type LibraryAlbumChoice,
} from "./libraryAlbumConstants";

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
  const [albums, setAlbums] = useState<LibraryAlbumChoice[]>([]);
  const [assets, setAssets] = useState<MediaLibrary.Asset[]>([]);
  const [endCursor, setEndCursor] = useState<string | undefined>();
  const [hasNextPage, setHasNextPage] = useState(true);
  const [loadingPage, setLoadingPage] = useState(false);
  const [permission, setPermission] = useState<string | null>(null);
  const pageRequestRef = useRef(0);
  const assetsByIdRef = useRef(new Map<string, MediaLibrary.Asset>());

  const loadAlbums = useCallback(async () => {
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

      setAlbums([
        {
          id: ALL_PHOTOS_ALBUM_ID,
          title: "All photos",
          assetCount: 0,
        },
        ...mapped,
      ]);
    } catch (error) {
      console.warn("[LibraryGrid] albums failed", error);
      setAlbums([
        { id: ALL_PHOTOS_ALBUM_ID, title: "All photos", assetCount: 0 },
      ]);
    }
  }, []);

  const loadPage = useCallback(
    async (albumId: string, after?: string) => {
      const requestId = pageRequestRef.current + 1;
      pageRequestRef.current = requestId;
      setLoadingPage(true);
      try {
        const page = await MediaLibrary.getAssetsAsync({
          first: LIBRARY_PAGE_SIZE,
          after,
          album: albumId === ALL_PHOTOS_ALBUM_ID ? undefined : albumId,
          mediaType: MediaLibrary.MediaType.photo,
          sortBy: LIBRARY_ASSET_SORT,
        });
        if (pageRequestRef.current !== requestId) {
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
      } catch (error) {
        console.warn("[LibraryGrid] library page failed", error);
      } finally {
        if (pageRequestRef.current === requestId) {
          setLoadingPage(false);
        }
      }
    },
    [selectedAlbumId],
  );

  const ensurePermission = useCallback(async (): Promise<boolean> => {
    const current = await MediaLibrary.getPermissionsAsync();
    if (current.granted) {
      setPermission("granted");
      return true;
    }
    if (!current.canAskAgain) {
      setPermission(current.status ?? "denied");
      return false;
    }
    const requested = await MediaLibrary.requestPermissionsAsync();
    setPermission(requested.granted ? "granted" : (requested.status ?? "denied"));
    return requested.granted;
  }, []);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    let cancelled = false;
    (async () => {
      const granted = await ensurePermission();
      if (cancelled || !granted) return;
      await loadAlbums();
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled, ensurePermission, loadAlbums]);

  useEffect(() => {
    if (!enabled || permission !== "granted") {
      return;
    }
    let cancelled = false;
    (async () => {
      if (consumeWarmPage && selectedAlbumId === ALL_PHOTOS_ALBUM_ID) {
        const warm = consumeWarmLibraryPage();
        if (warm) {
          setAssets(warm.assets);
          setEndCursor(warm.endCursor);
          setHasNextPage(warm.hasNextPage);
          const map = new Map<string, MediaLibrary.Asset>();
          for (const asset of warm.assets) {
            map.set(asset.id, asset);
          }
          assetsByIdRef.current = map;
          return;
        }
      }

      setAssets([]);
      setEndCursor(undefined);
      setHasNextPage(true);
      await loadPage(selectedAlbumId);
      if (cancelled) return;
    })();
    return () => {
      cancelled = true;
    };
  }, [
    consumeWarmPage,
    enabled,
    loadPage,
    permission,
    selectedAlbumId,
  ]);

  const onEndReached = useCallback(() => {
    if (!hasNextPage || loadingPage || !endCursor) return;
    void loadPage(selectedAlbumId, endCursor);
  }, [endCursor, hasNextPage, loadPage, loadingPage, selectedAlbumId]);

  return {
    albums,
    assets,
    assetsByIdRef,
    loadingPage,
    permission,
    onEndReached,
    ensurePermission,
  };
}
