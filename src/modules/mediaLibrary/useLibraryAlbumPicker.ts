import React, { useCallback, useEffect, useMemo, useState } from "react";

import { clearLibraryThumbnailMemoryCache } from "@/utils/libraryThumbnailCache";
import {
  ALL_PHOTOS_ALBUM_ID,
  RECENTS_ALBUM_TITLE,
  type LibraryAlbumChoice,
} from "./libraryAlbumConstants";
import {
  peekRememberedAlbumId,
  rememberAlbumId,
} from "./libraryAlbumPickerMemory";
import { useLibraryGridAssets } from "./useLibraryGridAssets";

type UseLibraryAlbumPickerOptions = {
  enabled: boolean;
  consumeWarmPage?: boolean;
};

export function useLibraryAlbumPicker({
  enabled,
  consumeWarmPage = false,
}: UseLibraryAlbumPickerOptions) {
  const [selectedAlbumId, setSelectedAlbumId] = useState<string>(
    () => peekRememberedAlbumId() || ALL_PHOTOS_ALBUM_ID,
  );
  const [albumPickerOpen, setAlbumPickerOpen] = useState(false);

  const grid = useLibraryGridAssets({
    enabled,
    selectedAlbumId,
    consumeWarmPage,
  });

  useEffect(() => {
    if (enabled) {
      void grid.loadAlbumsIfNeeded();
    }
  }, [albumPickerOpen, enabled, grid.loadAlbumsIfNeeded]);

  useEffect(() => {
    rememberAlbumId(selectedAlbumId);
  }, [selectedAlbumId]);

  const selectedAlbumTitle = useMemo(() => {
    const match = grid.albums.find((a) => a.id === selectedAlbumId);
    return match?.title ?? RECENTS_ALBUM_TITLE;
  }, [grid.albums, selectedAlbumId]);

  const onSelectAlbum = useCallback((albumId: string) => {
    rememberAlbumId(albumId);
    setAlbumPickerOpen(false);
    clearLibraryThumbnailMemoryCache();
    setSelectedAlbumId(albumId);
  }, []);

  return {
    ...grid,
    selectedAlbumId,
    selectedAlbumTitle,
    albumPickerOpen,
    setAlbumPickerOpen,
    onSelectAlbum,
  };
}

export type { LibraryAlbumChoice };
