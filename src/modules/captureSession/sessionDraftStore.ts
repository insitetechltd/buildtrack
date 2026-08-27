import { create } from "zustand";

import type { CaptureSessionPhoto } from "./types";

type CaptureSessionState = {
  photos: CaptureSessionPhoto[];
  selectionLimit: number;
  setSelectionLimit: (limit: number) => void;
  addCameraPhoto: (photo: Omit<CaptureSessionPhoto, "source" | "selected">) => void;
  addOrSelectLibraryPhoto: (
    photo: Omit<CaptureSessionPhoto, "source" | "selected">,
  ) => void;
  toggleSelected: (id: string) => void;
  setSelected: (id: string, selected: boolean) => void;
  selectAllSessionCamera: () => void;
  removePhoto: (id: string) => void;
  reset: () => void;
};

const DEFAULT_LIMIT = 20;

export const useCaptureSessionStore = create<CaptureSessionState>((set, get) => ({
  photos: [],
  selectionLimit: DEFAULT_LIMIT,

  setSelectionLimit: (limit) =>
    set({ selectionLimit: Math.max(1, Math.min(limit, 50)) }),

  addCameraPhoto: (photo) => {
    const { photos, selectionLimit } = get();
    if (photos.length >= selectionLimit) {
      return;
    }
    set({
      photos: [
        ...photos,
        {
          ...photo,
          source: "camera",
          selected: true,
        },
      ],
    });
  },

  addOrSelectLibraryPhoto: (photo) => {
    const { photos, selectionLimit } = get();
    const existing = photos.find(
      (p) =>
        p.mediaLibraryAssetId &&
        p.mediaLibraryAssetId === photo.mediaLibraryAssetId,
    );
    if (existing) {
      if (existing.selected) {
        set({
          photos: photos.map((p) =>
            p.id === existing.id ? { ...p, selected: false } : p,
          ),
        });
        return;
      }
      const selectedCount = photos.filter((p) => p.selected).length;
      if (selectedCount >= selectionLimit) {
        return;
      }
      // Re-select: move to end so order badge reflects latest pick sequence.
      set({
        photos: [
          ...photos.filter((p) => p.id !== existing.id),
          { ...existing, selected: true },
        ],
      });
      return;
    }
    const selectedCount = photos.filter((p) => p.selected).length;
    if (selectedCount >= selectionLimit) {
      return;
    }
    set({
      photos: [
        ...photos,
        {
          ...photo,
          source: "library",
          selected: true,
        },
      ],
    });
  },

  toggleSelected: (id) => {
    const { photos, selectionLimit } = get();
    const target = photos.find((p) => p.id === id);
    if (!target) return;
    if (target.selected) {
      set({
        photos: photos.map((p) =>
          p.id === id ? { ...p, selected: false } : p,
        ),
      });
      return;
    }
    const selectedCount = photos.filter((p) => p.selected).length;
    if (selectedCount >= selectionLimit) return;
    set({
      photos: [
        ...photos.filter((p) => p.id !== id),
        { ...target, selected: true },
      ],
    });
  },

  setSelected: (id, selected) => {
    const { photos, selectionLimit } = get();
    if (selected) {
      const selectedCount = photos.filter((p) => p.selected).length;
      const target = photos.find((p) => p.id === id);
      if (!target?.selected && selectedCount >= selectionLimit) return;
    }
    set({
      photos: photos.map((p) => (p.id === id ? { ...p, selected } : p)),
    });
  },

  selectAllSessionCamera: () => {
    const { photos, selectionLimit } = get();
    let remaining = selectionLimit;
    set({
      photos: photos.map((p) => {
        if (p.source !== "camera") {
          return p;
        }
        if (remaining <= 0) {
          return { ...p, selected: false };
        }
        remaining -= 1;
        return { ...p, selected: true };
      }),
    });
  },

  removePhoto: (id) =>
    set({ photos: get().photos.filter((p) => p.id !== id) }),

  reset: () => set({ photos: [] }),
}));

export function resetCaptureSession(): void {
  useCaptureSessionStore.getState().reset();
}
