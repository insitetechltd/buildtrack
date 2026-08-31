import type { SelectedPhoto } from "@/navigation/navigationTypes";

export type LibrarySelectionDraft = {
  assetId: string;
  uri: string;
  fileName: string;
  order: number;
};

/**
 * Map picker drafts to Select Photos rows. Keep system URIs (`ph://`).
 * Re-accept merges prior caption / annotatedUri by asset id.
 */
export function materializeLibrarySelections(
  drafts: LibrarySelectionDraft[],
  previous: SelectedPhoto[] = [],
): SelectedPhoto[] {
  const previousByAssetId = new Map(
    previous
      .filter((photo) => Boolean(photo.mediaLibraryAssetId))
      .map((photo) => [photo.mediaLibraryAssetId as string, photo]),
  );

  return [...drafts]
    .sort((a, b) => a.order - b.order)
    .map((draft) => {
      const prior = previousByAssetId.get(draft.assetId);
      if (prior) {
        return {
          ...prior,
          mediaLibraryAssetId: draft.assetId,
        };
      }
      return {
        uri: draft.uri,
        fileName: draft.fileName,
        isAnnotated: false,
        mediaLibraryAssetId: draft.assetId,
      };
    });
}

export function assetToSelectionDraft(
  asset: { id: string; uri: string; filename?: string | null },
  order: number,
): LibrarySelectionDraft {
  return {
    assetId: asset.id,
    uri: asset.uri,
    fileName: asset.filename || `library_${Date.now()}_${order}.jpg`,
    order,
  };
}
