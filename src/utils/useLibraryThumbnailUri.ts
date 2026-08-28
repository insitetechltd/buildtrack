import { useEffect, useState } from "react";

import {
  peekLibraryThumbnailUri,
  requestLibraryThumbnail,
} from "./libraryThumbnailCache";
import { LIBRARY_THUMB_PRIORITY_VIEWPORT } from "./libraryPickerPerf";

/**
 * Resolve a grid-sized library thumb URI for a mounted tile.
 * Uses sync memory peek so recycled FlatList cells paint instantly.
 */
export function useLibraryThumbnailUri(
  assetId: string,
  pixelSize: number,
  fallbackUri: string,
  enabled: boolean,
): string | null {
  const [uri, setUri] = useState<string | null>(() =>
    enabled ? peekLibraryThumbnailUri(assetId, pixelSize) : null,
  );

  useEffect(() => {
    if (!enabled) {
      setUri(null);
      return;
    }

    const cached = peekLibraryThumbnailUri(assetId, pixelSize);
    if (cached) {
      setUri(cached);
      return;
    }

    let cancelled = false;
    setUri(null);

    void requestLibraryThumbnail({
      assetId,
      pixelSize,
      fallbackUri,
      shouldDownloadFromNetwork: false,
      priority: LIBRARY_THUMB_PRIORITY_VIEWPORT,
    })
      .then((resolved) => {
        if (!cancelled) {
          setUri(resolved);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setUri(fallbackUri);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [assetId, enabled, fallbackUri, pixelSize]);

  return uri;
}
