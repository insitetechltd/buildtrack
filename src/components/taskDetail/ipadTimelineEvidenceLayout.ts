/**
 * iPad Task Detail timeline photos — fixed tiles, left-aligned.
 * Portrait 3-up, landscape 4-up. Phone keeps the square hero.
 * Do not reuse useTabletCardGridLayout (Tasks/Dashboard columns).
 */

export const IPAD_EVIDENCE_TILE_GAP = 8;
export const IPAD_EVIDENCE_CORNER_RADIUS = 12;
/** Trailing peek of the next tile when count exceeds the slot row. */
export const IPAD_EVIDENCE_PEEK_WIDTH = 36;
export const IPAD_EVIDENCE_SLOTS_PORTRAIT = 3;
export const IPAD_EVIDENCE_SLOTS_LANDSCAPE = 4;
/**
 * Tile aspect width:height (3:4). Most field photos are phone-portrait;
 * cover-crop into a portrait cell (IG/FB-style) so there is no letterbox.
 * Landscape shots crop on the sides. Tap still opens the uncropped gallery.
 */
export const IPAD_EVIDENCE_TILE_ASPECT_WIDTH = 3;
export const IPAD_EVIDENCE_TILE_ASPECT_HEIGHT = 4;
/** Card mx-4 + inner p-4 + rail (~12+12) — used only as a first-layout fallback. */
export const IPAD_EVIDENCE_WIDTH_CHROME_FALLBACK = 88;
/** Landscape page split: project/task info ~1/3, thread ~2/3. */
export const IPAD_TASK_DETAIL_META_FLEX = 1;
export const IPAD_TASK_DETAIL_THREAD_FLEX = 2;

export type IpadEvidenceLayout = {
  isLandscape: boolean;
  slotCount: number;
  tileWidth: number;
  tileHeight: number;
  gap: number;
  peekWidth: number;
  canSlide: boolean;
  photoCount: number;
};

export function isIpadTimelineHost(platform: {
  OS: string;
  isPad?: boolean;
}): boolean {
  return platform.OS === "ios" && platform.isPad === true;
}

export function isIpadLandscapeMetaSplit(
  platform: { OS: string; isPad?: boolean },
  windowWidth: number,
  windowHeight: number,
): boolean {
  return isIpadTimelineHost(platform) && windowWidth > windowHeight;
}

export function estimateIpadEvidenceContentWidth(input: {
  platform: { OS: string; isPad?: boolean };
  windowWidth: number;
  windowHeight: number;
}): number {
  const split = isIpadLandscapeMetaSplit(
    input.platform,
    input.windowWidth,
    input.windowHeight,
  );
  const threadShare =
    IPAD_TASK_DETAIL_THREAD_FLEX /
    (IPAD_TASK_DETAIL_META_FLEX + IPAD_TASK_DETAIL_THREAD_FLEX);
  const threadWidth = split ? input.windowWidth * threadShare : input.windowWidth;
  return Math.max(threadWidth - IPAD_EVIDENCE_WIDTH_CHROME_FALLBACK, 0);
}

export function resolveIpadEvidenceTileSize(input: {
  contentWidth: number;
  slotCount: number;
}): { tileWidth: number; tileHeight: number } {
  const slotCount = Math.max(1, Math.floor(input.slotCount));
  const usable = Math.max(0, input.contentWidth - IPAD_EVIDENCE_PEEK_WIDTH);
  const gaps = (slotCount - 1) * IPAD_EVIDENCE_TILE_GAP;
  const tileWidth = Math.floor(Math.max(0, usable - gaps) / slotCount);
  const tileHeight = Math.round(
    (tileWidth * IPAD_EVIDENCE_TILE_ASPECT_HEIGHT) /
      IPAD_EVIDENCE_TILE_ASPECT_WIDTH,
  );
  return { tileWidth, tileHeight };
}

export function resolveIpadEvidenceLayout(input: {
  photoCount: number;
  contentWidth: number;
  windowWidth: number;
  windowHeight: number;
}): IpadEvidenceLayout {
  const photoCount = Math.max(0, Math.floor(input.photoCount));
  const isLandscape = input.windowWidth > input.windowHeight;
  const slotCount = isLandscape
    ? IPAD_EVIDENCE_SLOTS_LANDSCAPE
    : IPAD_EVIDENCE_SLOTS_PORTRAIT;
  const { tileWidth, tileHeight } = resolveIpadEvidenceTileSize({
    contentWidth: Math.max(0, input.contentWidth),
    slotCount,
  });

  return {
    isLandscape,
    slotCount,
    tileWidth,
    tileHeight,
    gap: IPAD_EVIDENCE_TILE_GAP,
    peekWidth: IPAD_EVIDENCE_PEEK_WIDTH,
    canSlide: photoCount > slotCount,
    photoCount,
  };
}
