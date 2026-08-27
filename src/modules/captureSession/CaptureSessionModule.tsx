import React, { useEffect, useMemo, useState } from "react";

import {
  CaptureSessionHostProvider,
  type CaptureSessionHostProps,
} from "./CaptureSessionHostContext";
import { CaptureSessionCameraScreen } from "./CaptureSessionCameraScreen";
import { HybridLibraryPickerScreen } from "./HybridLibraryPickerScreen";
import { resetCaptureSession, useCaptureSessionStore } from "./sessionDraftStore";

export type { CaptureSessionHostProps } from "./CaptureSessionHostContext";

type Step = "camera" | "hybridLibrary";

/**
 * Self-contained capture flow (camera → hybrid library).
 * No AppNavigator routes — mount this root when A/B-swapping.
 */
export function CaptureSessionModule({
  onCancel,
  onComplete,
  selectionLimit = 20,
}: CaptureSessionHostProps) {
  const [step, setStep] = useState<Step>("camera");
  const setSelectionLimit = useCaptureSessionStore((s) => s.setSelectionLimit);

  useEffect(() => {
    resetCaptureSession();
    setSelectionLimit(selectionLimit);
    setStep("camera");
    return () => {
      resetCaptureSession();
    };
  }, [selectionLimit, setSelectionLimit]);

  const value = useMemo(
    () => ({
      onCancel,
      onComplete,
      selectionLimit,
      goToHybridLibrary: () => setStep("hybridLibrary"),
      goToCamera: () => setStep("camera"),
    }),
    [onCancel, onComplete, selectionLimit],
  );

  return (
    <CaptureSessionHostProvider value={value}>
      {step === "camera" ? (
        <CaptureSessionCameraScreen />
      ) : (
        <HybridLibraryPickerScreen />
      )}
    </CaptureSessionHostProvider>
  );
}
