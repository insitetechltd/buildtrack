import { compressImage, MAX_IMAGE_WIDTH } from "@/api/imageCompressionService";
import { exportPhotokitCappedJpeg } from "@/modules/mediaLibrary/PhotokitThumbView";
import { resolveLibraryLocalUri } from "@/modules/captureSession/materializeLibrarySelection";
import { pinDraftMedia } from "@/utils/draftMediaCache";
import { isSystemLibraryDisplayUri } from "@/utils/libraryDisplayUri";

export const LIBRARY_EXPORT_MAX_EDGE_PX = MAX_IMAGE_WIDTH;

type CappedPhotoInput = {
  uri: string;
  fileName: string;
  annotatedUri?: string;
  mediaLibraryAssetId?: string;
};

const cache = new Map<string, string>();
const inflight = new Map<string, Promise<string>>();

function cacheKey(photo: CappedPhotoInput): string | null {
  if (photo.mediaLibraryAssetId) {
    return `id:${photo.mediaLibraryAssetId}`;
  }
  if (isSystemLibraryDisplayUri(photo.uri)) {
    return `uri:${photo.uri}`;
  }
  return null;
}

/** Jest only. */
export function resetEnsureCappedLocalPhotoForTests(): void {
  cache.clear();
  inflight.clear();
}

/**
 * Local JPEG at the upload/annotation cap. Select Photos may keep `ph://`
 * until this runs (Draw/rotate/crop or upload confirm).
 */
export async function ensureCappedLocalPhoto(
  photo: CappedPhotoInput,
): Promise<string> {
  const working = photo.annotatedUri || photo.uri;
  if (working.startsWith("file://")) {
    return working;
  }

  const key = cacheKey(photo);
  if (key) {
    const hit = cache.get(key);
    if (hit) {
      return hit;
    }
    const pending = inflight.get(key);
    if (pending) {
      return pending;
    }
  }

  const run = (async () => {
    let fileUri: string | null = null;
    if (photo.mediaLibraryAssetId) {
      fileUri = await exportPhotokitCappedJpeg(
        photo.mediaLibraryAssetId,
        LIBRARY_EXPORT_MAX_EDGE_PX,
      );
    }
    if (!fileUri && photo.mediaLibraryAssetId) {
      const original = await resolveLibraryLocalUri(
        photo.mediaLibraryAssetId,
        photo.uri,
      );
      const compressed = await compressImage(original);
      fileUri = compressed.uri;
    }
    if (!fileUri || !fileUri.startsWith("file://")) {
      throw new Error(`Could not export a local file for ${photo.fileName}`);
    }
    const pinned = await pinDraftMedia(fileUri, photo.fileName);
    if (key) {
      cache.set(key, pinned);
    }
    return pinned;
  })();

  if (key) {
    inflight.set(key, run);
  }
  try {
    return await run;
  } finally {
    if (key) {
      inflight.delete(key);
    }
  }
}
