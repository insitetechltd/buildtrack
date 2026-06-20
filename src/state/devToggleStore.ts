import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type UiModernizationMode = "legacy" | "modern";

interface DevToggleStore {
  uiModernizationMode: UiModernizationMode;
  toggleUiMode: () => void;
}

export const useDevToggleStore = create<DevToggleStore>()(
  persist(
    (set, get) => ({
      uiModernizationMode: "modern",
      toggleUiMode: () => {
        if (!__DEV__) {
          set({ uiModernizationMode: "modern" });
          return;
        }

        const next: UiModernizationMode =
          get().uiModernizationMode === "modern" ? "legacy" : "modern";

        set({ uiModernizationMode: next });
      },
    }),
    {
      name: "buildtrack-dev-toggle",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

