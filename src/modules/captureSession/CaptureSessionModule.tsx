import React, { useCallback, useEffect, useMemo, useState } from "react";
import { BackHandler, Platform, StyleSheet, View } from "react-native";

import {
  CaptureSessionHostProvider,
  type CaptureSessionHostProps,
} from "./CaptureSessionHostContext";
import { CaptureSessionCameraScreen } from "./CaptureSessionCameraScreen";
import { HybridLibraryPickerScreen } from "./HybridLibraryPickerScreen";
import { resetCaptureSession, useCaptureSessionStore } from "./sessionDraftStore";
import { warmLibraryFirstPage } from "../../utils/libraryWarmPrefetch";

export type { CaptureSessionHostProps } from "./CaptureSessionHostContext";

type Step = "camera" | "hybridLibrary";

/**
 * Self-contained capture flow (camera → hybrid library).
 * Camera stays mounted under an opaque library overlay so CameraView does not
 * remount (M-PERF-04 C1). No AppNavigator routes — mount this root when A/B-swapping.
 */
export function CaptureSessionModule({
  onCancel,
  onComplete,
  selectionLimit = 20,
}: CaptureSessionHostProps) {
  const [step, setStep] = useState<Step>("camera");
  const setSelectionLimit = useCaptureSessionStore((s) => s.setSelectionLimit);
  const libraryOpen = step === "hybridLibrary";

  useEffect(() => {
    resetCaptureSession();
    setSelectionLimit(selectionLimit);
    setStep("camera");
    return () => {
      resetCaptureSession();
    };
  }, [selectionLimit, setSelectionLimit]);

  const goToHybridLibrary = useCallback(() => {
    setStep("hybridLibrary");
  }, []);

  const goToCamera = useCallback(() => {
    setStep("camera");
    void warmLibraryFirstPage();
  }, []);

  useEffect(() => {
    if (!libraryOpen || Platform.OS !== "android") {
      return;
    }
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      goToCamera();
      return true;
    });
    return () => sub.remove();
  }, [goToCamera, libraryOpen]);

  const value = useMemo(
    () => ({
      onCancel,
      onComplete,
      selectionLimit,
      goToHybridLibrary,
      goToCamera,
    }),
    [onCancel, onComplete, selectionLimit, goToHybridLibrary, goToCamera],
  );

  return (
    <CaptureSessionHostProvider value={value}>
      <View style={styles.root}>
        <View
          testID="capture-session__camera_layer"
          style={styles.cameraLayer}
          pointerEvents={libraryOpen ? "none" : "auto"}
          accessibilityElementsHidden={libraryOpen}
          importantForAccessibility={
            libraryOpen ? "no-hide-descendants" : "auto"
          }
        >
          <CaptureSessionCameraScreen />
        </View>
        {libraryOpen ? (
          <View
            testID="capture-session__library_overlay"
            style={styles.libraryOverlay}
            pointerEvents="auto"
          >
            <HybridLibraryPickerScreen />
          </View>
        ) : null}
      </View>
    </CaptureSessionHostProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  cameraLayer: {
    flex: 1,
  },
  libraryOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#ffffff",
    zIndex: 10,
    elevation: 10,
  },
});
