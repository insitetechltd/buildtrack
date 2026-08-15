/**
 * Pure geometry helpers for in-preview crop (contain-fit → source pixels).
 */

export type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type SourceCrop = {
  originX: number;
  originY: number;
  width: number;
  height: number;
};

/** Layout of an image drawn with contentFit="contain" inside a container. */
export function getContainedImageLayout(
  containerWidth: number,
  containerHeight: number,
  imageWidth: number,
  imageHeight: number,
): Rect {
  if (
    containerWidth <= 0 ||
    containerHeight <= 0 ||
    imageWidth <= 0 ||
    imageHeight <= 0
  ) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }

  const scale = Math.min(containerWidth / imageWidth, containerHeight / imageHeight);
  const width = imageWidth * scale;
  const height = imageHeight * scale;
  return {
    x: (containerWidth - width) / 2,
    y: (containerHeight - height) / 2,
    width,
    height,
  };
}

function intersectRects(a: Rect, b: Rect): Rect | null {
  const left = Math.max(a.x, b.x);
  const top = Math.max(a.y, b.y);
  const right = Math.min(a.x + a.width, b.x + b.width);
  const bottom = Math.min(a.y + a.height, b.y + b.height);
  const width = right - left;
  const height = bottom - top;
  if (width <= 0 || height <= 0) return null;
  return { x: left, y: top, width, height };
}

/**
 * Map a crop rectangle in container coordinates to source-image pixel crop
 * for expo-image-manipulator.
 */
export function mapCropRectToSourcePixels(
  cropInContainer: Rect,
  imageLayout: Rect,
  sourceWidth: number,
  sourceHeight: number,
): SourceCrop | null {
  if (sourceWidth <= 0 || sourceHeight <= 0 || imageLayout.width <= 0 || imageLayout.height <= 0) {
    return null;
  }

  const clipped = intersectRects(cropInContainer, imageLayout);
  if (!clipped) return null;

  const scaleX = sourceWidth / imageLayout.width;
  const scaleY = sourceHeight / imageLayout.height;

  let originX = Math.round((clipped.x - imageLayout.x) * scaleX);
  let originY = Math.round((clipped.y - imageLayout.y) * scaleY);
  let width = Math.round(clipped.width * scaleX);
  let height = Math.round(clipped.height * scaleY);

  originX = Math.max(0, Math.min(originX, sourceWidth - 1));
  originY = Math.max(0, Math.min(originY, sourceHeight - 1));
  width = Math.max(1, Math.min(width, sourceWidth - originX));
  height = Math.max(1, Math.min(height, sourceHeight - originY));

  if (width < 1 || height < 1) return null;

  return { originX, originY, width, height };
}

/** Default crop frame: inset fraction of the contained image (0–0.45). */
export function defaultCropRectInImageLayout(imageLayout: Rect, insetFraction = 0.08): Rect {
  const insetX = imageLayout.width * insetFraction;
  const insetY = imageLayout.height * insetFraction;
  return {
    x: imageLayout.x + insetX,
    y: imageLayout.y + insetY,
    width: Math.max(1, imageLayout.width - insetX * 2),
    height: Math.max(1, imageLayout.height - insetY * 2),
  };
}
