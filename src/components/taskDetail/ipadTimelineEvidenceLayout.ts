/**
 * iPad Task Detail timeline — Variant C (filmstrip / evidence grid).
 * Phone keeps the square hero in TaskActivityTimeline; do not reuse
 * useTabletCardGridLayout (Tasks/Dashboard columns).
 */

export const IPAD_EVIDENCE_TILE_GAP = 8;
export const IPAD_EVIDENCE_CORNER_RADIUS = 12;
export const IPAD_EVIDENCE_SINGLE_HEIGHT_PORTRAIT = 200;
export const IPAD_EVIDENCE_SINGLE_HEIGHT_LANDSCAPE = 220;
export const IPAD_EVIDENCE_TWO_UP_HEIGHT = 180;
export const IPAD_EVIDENCE_TILE_PORTRAIT = 160;
export const IPAD_EVIDENCE_TILE_LANDSCAPE = 180;
export const IPAD_EVIDENCE_MEDIA_MAX_HEIGHT = 220;
export const IPAD_EVIDENCE_PREFERRED_SLOTS_PORTRAIT = 3;
export const IPAD_EVIDENCE_PREFERRED_SLOTS_LANDSCAPE = 4;
/** Card mx-4 + inner p-4 + rail (~12+12) — used only as a first-layout fallback. */
export const IPAD_EVIDENCE_WIDTH_CHROME_FALLBACK = 88;

export type IpadEvidenceMode = "single" | "two-up" | "filmstrip";

export type IpadEvidenceLayout = {
  mode: IpadEvidenceMode;
  isLandscape: boolean;
  mediaHeight: number;
  tileWidth: number;
  tileHeight: number;
  visibleSlots: number;
  overflowCount: number;
  showOverflowBadge: boolean;
};

export function isIpadTimelineHost(platform: {
  OS: string;
  isPad?: boolean;
}): boolean {
  return platform.OS === "ios" && platform.isPad === true;
}

export function resolveIpadEvidenceLayout(input: {
  photoCount: number;
  contentWidth: number;
  windowWidth: number;
  windowHeight: number;
}): IpadEvidenceLayout {
  const photoCount = Math.max(0, Math.floor(input.photoCount));
  const contentWidth = Math.max(0, input.contentWidth);
  const isLandscape = input.windowWidth > input.windowHeight;

  if (photoCount <= 1) {
    const mediaHeight = Math.min(
      isLandscape
        ? IPAD_EVIDENCE_SINGLE_HEIGHT_LANDSCAPE
        : IPAD_EVIDENCE_SINGLE_HEIGHT_PORTRAIT,
      IPAD_EVIDENCE_MEDIA_MAX_HEIGHT,
    );
    return {
      mode: "single",
      isLandscape,
      mediaHeight,
      tileWidth: contentWidth,
      tileHeight: mediaHeight,
      visibleSlots: 1,
      overflowCount: 0,
      showOverflowBadge: false,
    };
  }

  if (photoCount === 2) {
    const tileWidth = Math.max(0, (contentWidth - IPAD_EVIDENCE_TILE_GAP) / 2);
    return {
      mode: "two-up",
      isLandscape,
      mediaHeight: IPAD_EVIDENCE_TWO_UP_HEIGHT,
      tileWidth,
      tileHeight: IPAD_EVIDENCE_TWO_UP_HEIGHT,
      visibleSlots: 2,
      overflowCount: 0,
      showOverflowBadge: false,
    };
  }

  const preferredSlots = isLandscape
    ? IPAD_EVIDENCE_PREFERRED_SLOTS_LANDSCAPE
    : IPAD_EVIDENCE_PREFERRED_SLOTS_PORTRAIT;
  const tileSize = isLandscape
    ? IPAD_EVIDENCE_TILE_LANDSCAPE
    : IPAD_EVIDENCE_TILE_PORTRAIT;
  const maxFit =
    contentWidth <= 0
      ? preferredSlots
      : Math.max(
          1,
          Math.floor(
            (contentWidth + IPAD_EVIDENCE_TILE_GAP) /
              (tileSize + IPAD_EVIDENCE_TILE_GAP),
          ),
        );
  const visibleSlots = Math.min(photoCount, Math.min(preferredSlots, maxFit));
  const overflowCount = Math.max(0, photoCount - visibleSlots);

  return {
    mode: "filmstrip",
    isLandscape,
    mediaHeight: Math.min(tileSize, IPAD_EVIDENCE_MEDIA_MAX_HEIGHT),
    tileWidth: tileSize,
    tileHeight: tileSize,
    visibleSlots,
    overflowCount,
    showOverflowBadge: overflowCount > 0,
  };
}
