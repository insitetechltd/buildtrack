import { useEffect, useState } from "react";

import { requestLibraryThumbnail } from "./libraryThumbnailCache";

/**
 * Resolve a grid-sized library thumb URI when progressive paint unlocks the tile.
 */
export function useLibraryThumbnailUri(
  assetId: string,
  pixelSize: number,
  fallbackUri: string,
  enabled: boolean,
): string | null {
  const [uri, setUri] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      setUri(null);
      return;
    }

    let cancelled = false;
    setUri(null);

    void requestLibraryThumbnail({
      assetId,
      pixelSize,
      fallbackUri,
      shouldDownloadFromNetwork: false,
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
