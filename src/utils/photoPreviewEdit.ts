import { Image } from "react-native";
import * as ImageManipulator from "expo-image-manipulator";

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

/**
 * Resolve dimensions for any image URI (file://, ph://, content://, https://).
 * Tries React Native Image.getSize first, and falls back to ImageManipulator.
 */
export async function resolveImageDimensions(
  uri: string,
): Promise<{ width: number; height: number }> {
  if (!uri) {
    throw new Error("No URI provided for image dimension resolution");
  }

  // 1. Try Image.getSize first (fast for file://, http://, and bundled assets)
  try {
    const size = await new Promise<{ width: number; height: number }>((resolve, reject) => {
      Image.getSize(
        uri,
        (width, height) => {
          if (width > 0 && height > 0) {
            resolve({ width, height });
          } else {
            reject(new Error(`Invalid dimensions ${width}x${height}`));
          }
        },
        (error) => reject(error),
      );
    });
    return size;
  } catch {
    // Fall back to ImageManipulator if Image.getSize fails (e.g. ph:// on iOS)
  }

  // 2. Try ImageManipulator.manipulateAsync without actions
  try {
    const result = await ImageManipulator.manipulateAsync(uri, [], {});
    if (result.width > 0 && result.height > 0) {
      return { width: result.width, height: result.height };
    }
  } catch (error) {
    throw new Error(
      `Could not resolve image dimensions for ${uri}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }

  throw new Error(`Invalid dimensions for ${uri}`);
}

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

/**
 * Contain-fit the image inside a centered pad of the container.
 * Default padScale 0.85 (= 15% margin) so a full-size crop rect still leaves
 * finger room outside the image to drag corner handles.
 */
export function getEditCanvasImageLayout(
  containerWidth: number,
  containerHeight: number,
  imageWidth: number,
  imageHeight: number,
  padScale = 0.85,
): Rect {
  const safePad = Math.max(0.5, Math.min(1, padScale));
  const padWidth = containerWidth * safePad;
  const padHeight = containerHeight * safePad;
  const nested = getContainedImageLayout(
    padWidth,
    padHeight,
    imageWidth,
    imageHeight,
  );
  return {
    x: nested.x + (containerWidth - padWidth) / 2,
    y: nested.y + (containerHeight - padHeight) / 2,
    width: nested.width,
    height: nested.height,
  };
}

/** Screen-space drag of the photo. The crop rect stays where it is. */
export function cropRectForImageOffset(
  crop: Rect,
  offset: { x: number; y: number },
): Rect {
  return {
    x: crop.x - offset.x,
    y: crop.y - offset.y,
    width: crop.width,
    height: crop.height,
  };
}

/**
 * Undo a clockwise screen rotation. Matches the image transform, whose
 * positive angle turns the photo the same way as the dial.
 */
function inverseRotateScreen(
  dx: number,
  dy: number,
  rotationDeg: number,
): { x: number; y: number } {
  const rad = (-rotationDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return {
    x: dx * cos - dy * sin,
    y: dx * sin + dy * cos,
  };
}

function rotateLocalToScreen(
  lx: number,
  ly: number,
  rotationDeg: number,
): { x: number; y: number } {
  const rad = (rotationDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return {
    x: lx * cos - ly * sin,
    y: lx * sin + ly * cos,
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

/**
 * Uniform scale so a width×height photo rotated by `rotationDeg` still covers
 * that same axis-aligned frame. At 0° this is 1. A square at 45° is √2.
 */
export function rotationCoverScale(
  width: number,
  height: number,
  rotationDeg: number,
): number {
  if (width <= 0 || height <= 0) return 1;
  const rad = (rotationDeg * Math.PI) / 180;
  const c = Math.abs(Math.cos(rad));
  const s = Math.abs(Math.sin(rad));
  const scale = Math.max(1, c + (height / width) * s, c + (width / height) * s);
  return Math.abs(scale - 1) < 1e-6 ? 1 : scale;
}

/**
 * Smallest scale ≥ 1 so the rotated photo still covers `crop`.
 * Stays at 1 when every crop corner is already on the picture.
 */
export function cropRotationCoverScale(
  imageLayout: Rect,
  crop: Rect,
  rotationDeg: number,
): number {
  const w = imageLayout.width;
  const h = imageLayout.height;
  if (w <= 0 || h <= 0 || crop.width <= 0 || crop.height <= 0) return 1;

  const cx = imageLayout.x + w / 2;
  const cy = imageLayout.y + h / 2;
  const halfW = w / 2;
  const halfH = h / 2;
  const corners: Array<[number, number]> = [
    [crop.x, crop.y],
    [crop.x + crop.width, crop.y],
    [crop.x, crop.y + crop.height],
    [crop.x + crop.width, crop.y + crop.height],
  ];

  let scale = 1;
  for (const [x, y] of corners) {
    const local = inverseRotateScreen(x - cx, y - cy, rotationDeg);
    scale = Math.max(scale, Math.abs(local.x) / halfW, Math.abs(local.y) / halfH);
  }
  return Math.abs(scale - 1) < 1e-6 ? 1 : scale;
}

/**
 * Largest pan that keeps every crop corner on the scaled, rotated photo.
 * `scale` is the cover scale already applied on screen. Offset is in screen pixels.
 */
export function clampImagePan(
  imageLayout: Rect,
  crop: Rect,
  rotationDeg: number,
  scale: number,
  offset: { x: number; y: number },
): { x: number; y: number } {
  const w = imageLayout.width;
  const h = imageLayout.height;
  if (w <= 0 || h <= 0 || crop.width <= 0 || crop.height <= 0 || scale <= 0) {
    return { x: 0, y: 0 };
  }

  const halfW = (w * scale) / 2;
  const halfH = (h * scale) / 2;
  const cx = imageLayout.x + w / 2;
  const cy = imageLayout.y + h / 2;
  const corners: Array<[number, number]> = [
    [crop.x, crop.y],
    [crop.x + crop.width, crop.y],
    [crop.x, crop.y + crop.height],
    [crop.x + crop.width, crop.y + crop.height],
  ];

  let minX = Number.NEGATIVE_INFINITY;
  let maxX = Number.POSITIVE_INFINITY;
  let minY = Number.NEGATIVE_INFINITY;
  let maxY = Number.POSITIVE_INFINITY;
  for (const [x, y] of corners) {
    const local = inverseRotateScreen(x - cx, y - cy, rotationDeg);
    minX = Math.max(minX, local.x - halfW);
    maxX = Math.min(maxX, local.x + halfW);
    minY = Math.max(minY, local.y - halfH);
    maxY = Math.min(maxY, local.y + halfH);
  }

  if (minX > maxX || minY > maxY) return { x: 0, y: 0 };

  const desired = inverseRotateScreen(offset.x, offset.y, rotationDeg);
  const clamped = rotateLocalToScreen(
    Math.min(maxX, Math.max(minX, desired.x)),
    Math.min(maxY, Math.max(minY, desired.y)),
    rotationDeg,
  );
  const snap = (value: number) => (Math.abs(value) < 1e-4 ? 0 : value);
  return { x: snap(clamped.x), y: snap(clamped.y) };
}

/** Axis-aligned size of a source bitmap after `rotationDeg` (expo rotate expands the canvas). */
export function rotatedBitmapSize(
  sourceWidth: number,
  sourceHeight: number,
  rotationDeg: number,
): { width: number; height: number } {
  const rad = (rotationDeg * Math.PI) / 180;
  const c = Math.abs(Math.cos(rad));
  const s = Math.abs(Math.sin(rad));
  return {
    width: sourceWidth * c + sourceHeight * s,
    height: sourceWidth * s + sourceHeight * c,
  };
}

/**
 * Crop in the rotated bitmap that matches the on-screen frame after the photo
 * has been rotated and scaled to cover that frame. Apply rotation first, then
 * this crop.
 */
export function mapCoverCropAfterRotation(
  cropInContainer: Rect,
  imageLayout: Rect,
  sourceWidth: number,
  sourceHeight: number,
  rotationDeg: number,
  displayScale?: number,
): SourceCrop | null {
  if (
    sourceWidth <= 0 ||
    sourceHeight <= 0 ||
    imageLayout.width <= 0 ||
    imageLayout.height <= 0 ||
    cropInContainer.width <= 0 ||
    cropInContainer.height <= 0
  ) {
    return null;
  }

  const scale =
    displayScale != null && displayScale > 0
      ? displayScale
      : cropRotationCoverScale(imageLayout, cropInContainer, rotationDeg);
  const bitmap = rotatedBitmapSize(sourceWidth, sourceHeight, rotationDeg);
  const centerX = imageLayout.x + imageLayout.width / 2;
  const centerY = imageLayout.y + imageLayout.height / 2;
  const kx = sourceWidth / imageLayout.width;
  const ky = sourceHeight / imageLayout.height;
  const left = cropInContainer.x - centerX;
  const top = cropInContainer.y - centerY;

  let originX = Math.round(bitmap.width / 2 + (left / scale) * kx);
  let originY = Math.round(bitmap.height / 2 + (top / scale) * ky);
  let width = Math.round((cropInContainer.width / scale) * kx);
  let height = Math.round((cropInContainer.height / scale) * ky);

  const bitmapWidth = Math.max(1, Math.round(bitmap.width));
  const bitmapHeight = Math.max(1, Math.round(bitmap.height));
  originX = Math.max(0, Math.min(originX, bitmapWidth - 1));
  originY = Math.max(0, Math.min(originY, bitmapHeight - 1));
  width = Math.max(1, Math.min(width, bitmapWidth - originX));
  height = Math.max(1, Math.min(height, bitmapHeight - originY));

  if (width < 1 || height < 1) return null;
  return { originX, originY, width, height };
}

/** Share of the dial circle left visible. The rest stays behind the photo. */
export const DIAL_VISIBLE_ARC_FRACTION = 0.3;

/**
 * Circle center for a dial whose bottom arc peeks out under `imageBottom`.
 * The center does not depend on the current rotation.
 */
export function dialPeekCenterY(
  imageBottom: number,
  radius: number,
  visibleFraction = DIAL_VISIBLE_ARC_FRACTION,
): number {
  const fraction = Math.max(0.05, Math.min(0.5, visibleFraction));
  const halfAngle = (fraction * Math.PI * 2) / 2;
  return imageBottom - radius * Math.cos(halfAngle);
}

/**
 * Mark position relative to a fixed dial center. `rotationDeg` turns the
 * markings; the center itself is not an input.
 * Angle 0 sits at the bottom of the circle (the pointer).
 */
export function dialMarkOffset(
  markDeg: number,
  rotationDeg: number,
  radius: number,
): { x: number; y: number } {
  const phi = ((markDeg - rotationDeg) * Math.PI) / 180;
  return {
    x: radius * Math.sin(phi),
    y: radius * Math.cos(phi),
  };
}

/** Default crop frame: full image layout (no inset) for crop mode. */
export function defaultCropRectInImageLayout(imageLayout: Rect, insetFraction = 0): Rect {
  const insetX = imageLayout.width * insetFraction;
  const insetY = imageLayout.height * insetFraction;
  return {
    x: imageLayout.x + insetX,
    y: imageLayout.y + insetY,
    width: Math.max(1, imageLayout.width - insetX * 2),
    height: Math.max(1, imageLayout.height - insetY * 2),
  };
}
