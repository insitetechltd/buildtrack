import * as MediaLibrary from "expo-media-library";

import type { SelectedPhoto } from "@/navigation/navigationTypes";
import { resolveLibraryLocalUri } from "@/modules/captureSession/materializeLibrarySelection";
import { pinDraftMedia } from "@/utils/draftMediaCache";

const PIN_CONCURRENCY = 2;

export type LibrarySelectionDraft = {
  assetId: string;
  uri: string;
  fileName: string;
  order: number;
};

export async function materializeLibrarySelections(
  drafts: LibrarySelectionDraft[],
  previous: SelectedPhoto[] = [],
): Promise<SelectedPhoto[]> {
  const previousByAssetId = new Map(
    previous
      .filter((photo) => Boolean(photo.mediaLibraryAssetId))
      .map((photo) => [photo.mediaLibraryAssetId as string, photo]),
  );

  const sorted = [...drafts].sort((a, b) => a.order - b.order);
  const out: SelectedPhoto[] = new Array(sorted.length);
  let next = 0;

  async function worker() {
    while (next < sorted.length) {
      const index = next;
      next += 1;
      const draft = sorted[index];
      const prior = previousByAssetId.get(draft.assetId);
      if (prior) {
        out[index] = {
          ...prior,
          mediaLibraryAssetId: draft.assetId,
        };
        continue;
      }

      const localUri = await resolveLibraryLocalUri(draft.assetId, draft.uri);
      const pinnedUri = await pinDraftMedia(localUri, draft.fileName);
      out[index] = {
        uri: pinnedUri,
        fileName: draft.fileName,
        isAnnotated: false,
        mediaLibraryAssetId: draft.assetId,
      };
    }
  }

  const workers = Array.from(
    { length: Math.min(PIN_CONCURRENCY, sorted.length) },
    () => worker(),
  );
  await Promise.all(workers);
  return out;
}

export function assetToSelectionDraft(
  asset: MediaLibrary.Asset,
  order: number,
): LibrarySelectionDraft {
  return {
    assetId: asset.id,
    uri: asset.uri,
    fileName: asset.filename || `library_${Date.now()}_${order}.jpg`,
    order,
  };
}
