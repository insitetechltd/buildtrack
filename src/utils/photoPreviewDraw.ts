import type { Rect } from "./photoPreviewEdit";

export type DrawPoint = { x: number; y: number };

export type DrawStroke = {
  color: string;
  /** Stroke width in source-image pixels. */
  width: number;
  points: DrawPoint[];
};

export const DRAW_COLORS = ["#ef4444", "#f59e0b", "#ffffff", "#111827"] as const;
export type DrawColor = (typeof DRAW_COLORS)[number];

/** Visible pen width on the contain-fit preview (device px). */
export const DRAW_SCREEN_STROKE_WIDTH = 4;

const MIN_POINTS = 2;

export function isPointInsideImageLayout(
  screenX: number,
  screenY: number,
  imageLayout: Rect,
): boolean {
  return (
    screenX >= imageLayout.x &&
    screenY >= imageLayout.y &&
    screenX <= imageLayout.x + imageLayout.width &&
    screenY <= imageLayout.y + imageLayout.height
  );
}

/** Map a contain-fit screen point to source-image pixels, or null if outside the image. */
export function mapScreenPointToSource(
  screenX: number,
  screenY: number,
  imageLayout: Rect,
  sourceWidth: number,
  sourceHeight: number,
): DrawPoint | null {
  if (
    sourceWidth <= 0 ||
    sourceHeight <= 0 ||
    imageLayout.width <= 0 ||
    imageLayout.height <= 0
  ) {
    return null;
  }
  if (!isPointInsideImageLayout(screenX, screenY, imageLayout)) {
    return null;
  }

  const scaleX = sourceWidth / imageLayout.width;
  const scaleY = sourceHeight / imageLayout.height;
  return {
    x: (screenX - imageLayout.x) * scaleX,
    y: (screenY - imageLayout.y) * scaleY,
  };
}

export function screenStrokeWidthToSource(
  screenStrokeWidth: number,
  imageLayout: Rect,
  sourceWidth: number,
): number {
  if (imageLayout.width <= 0 || sourceWidth <= 0) {
    return Math.max(1, screenStrokeWidth);
  }
  return Math.max(1, screenStrokeWidth * (sourceWidth / imageLayout.width));
}

/** Map source points back to screen for live SVG overlay. */
export function mapSourcePointToScreen(
  point: DrawPoint,
  imageLayout: Rect,
  sourceWidth: number,
  sourceHeight: number,
): DrawPoint {
  const scaleX = imageLayout.width / sourceWidth;
  const scaleY = imageLayout.height / sourceHeight;
  return {
    x: imageLayout.x + point.x * scaleX,
    y: imageLayout.y + point.y * scaleY,
  };
}

export function isValidStroke(stroke: DrawStroke): boolean {
  return stroke.points.length >= MIN_POINTS && stroke.width >= 1;
}

export function appendStroke(strokes: DrawStroke[], stroke: DrawStroke): DrawStroke[] {
  if (!isValidStroke(stroke)) {
    return strokes;
  }
  return [...strokes, stroke];
}

export function undoLastStroke(strokes: DrawStroke[]): DrawStroke[] {
  if (strokes.length === 0) {
    return strokes;
  }
  return strokes.slice(0, -1);
}

export function pointsToSvgPolyline(points: DrawPoint[]): string {
  return points.map((point) => `${point.x},${point.y}`).join(" ");
}
