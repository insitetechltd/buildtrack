/**
 * Capture Session module — standalone A/B candidate.
 *
 * NOT wired into AppNavigator / Camera tab / Create Task.
 * Mount via {@link CaptureSessionModule} when swapping flows.
 */

export { CaptureSessionModule } from "./CaptureSessionModule";
export type { CaptureSessionHostProps } from "./CaptureSessionHostContext";

export type {
  CaptureSessionPhoto,
  CaptureSessionResult,
  CaptureSessionStackParamList,
} from "./types";

export {
  useCaptureSessionStore,
  resetCaptureSession,
} from "./sessionDraftStore";

export { mapSessionSelectionToSelectedPhotos } from "./mapToSelectedPhotos";

/** Stable id for feature-flag / A/B docs — not read by runtime yet. */
export const CAPTURE_SESSION_AB_KEY = "captureSession.hybrid.v1" as const;
