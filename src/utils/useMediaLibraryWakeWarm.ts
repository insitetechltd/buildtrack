import { useEffect } from "react";
import { AppState } from "react-native";

import {
  invalidateMediaLibraryPermissionCache,
  refreshMediaLibraryPermission,
} from "./mediaLibraryPermission";
import { warmLibraryFirstPage } from "./libraryWarmPrefetch";
import { refreshCameraPermission } from "./cameraPermission";

/** App launch + foreground: refresh permission cache and warm library metadata. */
export function useMediaLibraryWakeWarm(): void {
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      void refreshCameraPermission();
      invalidateMediaLibraryPermissionCache();
      const permission = await refreshMediaLibraryPermission();
      if (cancelled || !permission.granted) {
        return;
      }
      void warmLibraryFirstPage();
    };

    void run();

    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        void run();
      }
    });

    return () => {
      cancelled = true;
      subscription.remove();
    };
  }, []);
}
