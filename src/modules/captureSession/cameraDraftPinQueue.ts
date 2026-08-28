import { pinDraftMedia } from "../../utils/draftMediaCache";
import { materializeSelectedCapturePhotos } from "./materializeLibrarySelection";
import { useCaptureSessionStore } from "./sessionDraftStore";
import type { CaptureSessionResult } from "./types";

type PendingPin = {
  id: string;
  generation: number;
  promise: Promise<void>;
};

const pending: PendingPin[] = [];
const failed: Array<{ id: string; generation: number }> = [];

export type CameraDraftPinRequest = {
  id: string;
  sourceUri: string;
  fileName: string;
};

/**
 * Start pinning a camera capture immediately. Does not serialize copies.
 * Late completions after resetCaptureSession (pinGeneration bump) are no-ops.
 */
export function enqueueCameraDraftPin(request: CameraDraftPinRequest): void {
  const generation = useCaptureSessionStore.getState().pinGeneration;
  const work = (async () => {
    try {
      const pinnedUri = await pinDraftMedia(request.sourceUri, request.fileName);
      const state = useCaptureSessionStore.getState();
      if (state.pinGeneration !== generation) {
        return;
      }
      if (!state.photos.some((photo) => photo.id === request.id)) {
        return;
      }
      state.updatePhotoUri(request.id, pinnedUri);
    } catch {
      const state = useCaptureSessionStore.getState();
      if (state.pinGeneration !== generation) {
        return;
      }
      if (state.photos.some((photo) => photo.id === request.id)) {
        state.removePhoto(request.id);
      }
      failed.push({ id: request.id, generation });
    }
  })();

  const entry: PendingPin = { id: request.id, generation, promise: work };
  pending.push(entry);
  void work.finally(() => {
    const index = pending.indexOf(entry);
    if (index >= 0) {
      pending.splice(index, 1);
    }
  });
}

export async function flushCameraDraftPins(): Promise<{ failedCount: number }> {
  const generation = useCaptureSessionStore.getState().pinGeneration;
  const current = pending.filter((entry) => entry.generation === generation);
  if (current.length > 0) {
    await Promise.all(current.map((entry) => entry.promise));
  }
  const failedNow = failed.filter((entry) => entry.generation === generation);
  for (const entry of failedNow) {
    const index = failed.indexOf(entry);
    if (index >= 0) {
      failed.splice(index, 1);
    }
  }
  return { failedCount: failedNow.length };
}

/** Accept path: settle camera pins, re-read store, then materialize. */
export async function prepareCaptureSessionAccept(): Promise<
  CaptureSessionResult & { failedCount: number }
> {
  const { failedCount } = await flushCameraDraftPins();
  const photos = useCaptureSessionStore.getState().photos;
  const mapped = await materializeSelectedCapturePhotos(photos);
  return { photos: mapped, failedCount };
}

/** Test helper — not used in production UI. */
export function resetCameraDraftPinQueueForTests(): void {
  pending.length = 0;
  failed.length = 0;
}
