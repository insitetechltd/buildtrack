import React, { useCallback, useMemo, useState } from "react";
import * as MediaLibrary from "expo-media-library";

import { clearLibraryThumbnailMemoryCache } from "@/utils/libraryThumbnailCache";
import {
  ALL_PHOTOS_ALBUM_ID,
  type LibraryAlbumChoice,
} from "./libraryAlbumConstants";
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
    ALL_PHOTOS_ALBUM_ID,
  );
  const [albumPickerOpen, setAlbumPickerOpen] = useState(false);

  const grid = useLibraryGridAssets({
    enabled,
    selectedAlbumId,
    consumeWarmPage,
  });

  const selectedAlbumTitle = useMemo(() => {
    const match = grid.albums.find((a) => a.id === selectedAlbumId);
    return match?.title ?? "All photos";
  }, [grid.albums, selectedAlbumId]);

  const onSelectAlbum = useCallback((albumId: string) => {
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
