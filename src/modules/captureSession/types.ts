import type { SelectedPhoto } from "../../navigation/navigationTypes";

/** One draft in the capture session (camera or library). */
export type CaptureSessionPhoto = {
  id: string;
  uri: string;
  fileName: string;
  source: "camera" | "library";
  mediaLibraryAssetId?: string;
  /** Highlighted for Accept in hybrid picker. */
  selected: boolean;
};

export type CaptureSessionResult = {
  /** Drop-in shape for existing PhotoSelection / form handoff when A/B wired. */
  photos: SelectedPhoto[];
};

/** Reserved for a future nested stack if A/B host prefers route-based mounting. */
export type CaptureSessionStackParamList = {
  CaptureSessionCamera: undefined;
  CaptureSessionHybridLibrary: undefined;
};
