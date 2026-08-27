import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

function buildActivityFeedSeenKey(userId: string, projectId: string): string {
  return `${userId}:${projectId}`;
}

interface ActivityFeedReadState {
  lastSeenAtByScope: Record<string, number>;
  getLastSeenAt: (userId: string, projectId: string) => number | null;
  markActivityFeedSeen: (
    userId: string,
    projectId: string,
    seenAtMs: number,
  ) => void;
}

export const useActivityFeedReadStore = create<ActivityFeedReadState>()(
  persist(
    (set, get) => ({
      lastSeenAtByScope: {},

      getLastSeenAt: (userId, projectId) => {
        const key = buildActivityFeedSeenKey(userId, projectId);
        const seenAt = get().lastSeenAtByScope[key];
        return typeof seenAt === "number" && Number.isFinite(seenAt) ? seenAt : null;
      },

      markActivityFeedSeen: (userId, projectId, seenAtMs) => {
        if (!Number.isFinite(seenAtMs)) {
          return;
        }

        const key = buildActivityFeedSeenKey(userId, projectId);
        set((state) => ({
          lastSeenAtByScope: {
            ...state.lastSeenAtByScope,
            [key]: Math.max(state.lastSeenAtByScope[key] ?? 0, seenAtMs),
          },
        }));
      },
    }),
    {
      name: "buildtrack-activity-feed-read",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        lastSeenAtByScope: state.lastSeenAtByScope,
      }),
    },
  ),
);
