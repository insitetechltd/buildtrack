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
 * Default crop frame over the image layout.
 * insetFraction 0 = crop encompasses the entire image (edit-canvas SoT).
 * Positive inset (0–0.45) shrinks the frame inside the image.
 */
export function defaultCropRectInImageLayout(imageLayout: Rect, insetFraction = 0): Rect {
  const clamped = Math.max(0, Math.min(0.45, insetFraction));
  const insetX = imageLayout.width * clamped;
  const insetY = imageLayout.height * clamped;
  return {
    x: imageLayout.x + insetX,
    y: imageLayout.y + insetY,
    width: Math.max(1, imageLayout.width - insetX * 2),
    height: Math.max(1, imageLayout.height - insetY * 2),
  };
}
