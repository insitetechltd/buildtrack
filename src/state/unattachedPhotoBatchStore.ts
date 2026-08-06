import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface PhotoBatch {
  id: string;
  projectId: string;
  companyId: string;
  userId: string;
  photoUrls: string[];
  captions: string[];
  savedAt: number;
}

const FIVE_DAYS_MS = 5 * 24 * 60 * 60 * 1000;

interface UnattachedPhotoBatchState {
  batches: PhotoBatch[];
  addBatch: (batch: PhotoBatch) => void;
  dismissBatch: (id: string) => void;
  getBatchesForProject: (projectId: string) => PhotoBatch[];
}

export const useUnattachedPhotoBatchStore = create<UnattachedPhotoBatchState>()(
  persist(
    (set, get) => ({
      batches: [],

      addBatch: (batch) => {
        set((state) => ({
          batches: [...state.batches, batch],
        }));
      },

      dismissBatch: (id) => {
        set((state) => ({
          batches: state.batches.filter((b) => b.id !== id),
        }));
      },

      getBatchesForProject: (projectId) => {
        const now = Date.now();
        return get().batches.filter(
          (b) =>
            b.projectId === projectId && now - b.savedAt <= FIVE_DAYS_MS,
        );
      },
    }),
    {
      name: "buildtrack-unattached-photo-batches",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        batches: state.batches,
      }),
    },
  ),
);
