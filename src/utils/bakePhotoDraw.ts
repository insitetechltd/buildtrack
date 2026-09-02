import { NativeModules, TurboModuleRegistry } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as ImageManipulator from "expo-image-manipulator";

import { writeClipboardImageToDraft } from "./draftMediaCache";
import type { DrawStroke } from "./photoPreviewDraw";
import { isValidStroke } from "./photoPreviewDraw";

const SKIA_REBUILD_HINT =
  "Drawing requires a native rebuild after installing Skia (RNSkiaModule missing). Run: npx expo run:ios";

function hasSkiaNativeModule(): boolean {
  try {
    if (TurboModuleRegistry.get?.("RNSkiaModule")) {
      return true;
    }
  } catch {
    // fall through
  }
  try {
    return Boolean((NativeModules as Record<string, unknown>).RNSkiaModule);
  } catch {
    return false;
  }
}

function loadSkiaModule(): {
  Skia: any;
  ImageFormat: any;
  PaintStyle: any;
  StrokeCap: any;
  StrokeJoin: any;
} {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const skia = require("@shopify/react-native-skia");
    if (!skia?.Skia) {
      throw new Error("Skia object is missing in module");
    }
    return skia;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`${SKIA_REBUILD_HINT}. Details: ${message}`);
  }
}

/**
 * Library / camera assets are often HEIC (or other formats RN Image can show).
 * Skia MakeImageFromEncoded does not reliably decode HEIC — normalize to JPEG first
 * the same way rotate/crop already do via expo-image-manipulator.
 */
async function normalizePhotoToJpegUri(photoUri: string): Promise<string> {
  const result = await ImageManipulator.manipulateAsync(photoUri, [], {
    compress: 1,
    format: ImageManipulator.SaveFormat.JPEG,
  });
  if (!result?.uri) {
    throw new Error("Failed to normalize photo for draw bake");
  }
  return result.uri;
}

/**
 * Composite strokes onto a photo at source resolution and pin a JPEG draft.
 * Uses Skia offscreen surface (not a view screenshot).
 * Skia is required only when this function runs (Draw → Done).
 */
export async function bakeStrokesOntoPhoto(
  photoUri: string,
  strokes: DrawStroke[],
): Promise<string> {
  const validStrokes = strokes.filter(isValidStroke);
  if (validStrokes.length === 0) {
    throw new Error("No strokes to bake");
  }

  const { Skia, ImageFormat, PaintStyle, StrokeCap, StrokeJoin } = loadSkiaModule();

  const jpegUri = await normalizePhotoToJpegUri(photoUri);
  const base64 = await FileSystem.readAsStringAsync(jpegUri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const data = Skia.Data.fromBase64(base64);
  const image = Skia.Image.MakeImageFromEncoded(data);
  if (!image) {
    throw new Error("Failed to decode photo for draw bake");
  }

  const width = image.width();
  const height = image.height();
  const surface =
    Skia.Surface.MakeOffscreen(width, height) ?? Skia.Surface.Make(width, height);
  if (!surface) {
    throw new Error("Failed to create Skia surface for draw bake");
  }

  const canvas = surface.getCanvas();
  canvas.drawImage(image, 0, 0);

  const paint = Skia.Paint();
  paint.setStyle(PaintStyle.Stroke);
  paint.setStrokeCap(StrokeCap.Round);
  paint.setStrokeJoin(StrokeJoin.Round);
  paint.setAntiAlias(true);

  const fillPaint = Skia.Paint();
  fillPaint.setStyle(PaintStyle.Fill);
  fillPaint.setAntiAlias(true);

  for (const stroke of validStrokes) {
    if (stroke.points.length === 1) {
      fillPaint.setColor(Skia.Color(stroke.color));
      canvas.drawCircle(
        stroke.points[0].x,
        stroke.points[0].y,
        Math.max(1, stroke.width / 2),
        fillPaint,
      );
    } else {
      paint.setColor(Skia.Color(stroke.color));
      paint.setStrokeWidth(stroke.width);
      const path = Skia.Path.Make();
      const [first, ...rest] = stroke.points;
      path.moveTo(first.x, first.y);
      for (const point of rest) {
        path.lineTo(point.x, point.y);
      }
      canvas.drawPath(path, paint);
    }
  }

  surface.flush();
  const snapshot = surface.makeImageSnapshot();
  const encoded = snapshot.encodeToBase64(ImageFormat.JPEG, 92);
  if (!encoded) {
    throw new Error("Failed to encode drawn photo");
  }

  return writeClipboardImageToDraft(encoded, `draw_${Date.now()}.jpg`);
}
