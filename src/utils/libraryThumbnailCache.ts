import { Platform } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as ImageManipulator from "expo-image-manipulator";
import * as MediaLibrary from "expo-media-library";

/** Max concurrent PhotoKit → resize jobs for grid browse. */
export const LIBRARY_THUMB_DECODE_CONCURRENCY = 3;
/** In-memory LRU cap (disk entries may exceed until next trim). */
export const LIBRARY_THUMB_LRU_MAX = 150;
/** Upper bound on long-edge pixels for grid thumbs. */
export const LIBRARY_THUMB_MAX_PIXELS = 384;

const THUMB_DIR_NAME = "library-thumbs";
const THUMB_QUALITY = 0.72;

export type LibraryThumbnailRequest = {
  assetId: string;
  pixelSize: number;
  fallbackUri: string;
  /** Grid browse defaults false — do not block on iCloud during scroll. */
  shouldDownloadFromNetwork?: boolean;
};

type CacheEntry = {
  uri: string;
  lastAccess: number;
};

const memoryCache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<string>>();

let decodeQueue: Array<() => void> = [];
let activeDecodes = 0;

function cacheKey(assetId: string, pixelSize: number): string {
  return `${assetId}@${pixelSize}`;
}

function thumbFileName(assetId: string, pixelSize: number): string {
  const safeId = assetId.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${safeId}_${pixelSize}.jpg`;
}

async function ensureThumbDirectory(): Promise<string> {
  if (!FileSystem.documentDirectory) {
    throw new Error("Document directory is unavailable");
  }
  const directory = `${FileSystem.documentDirectory}${THUMB_DIR_NAME}/`;
  await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
  return directory;
}

function touchMemory(key: string, uri: string): string {
  memoryCache.set(key, { uri, lastAccess: Date.now() });
  trimMemoryCache();
  return uri;
}

function trimMemoryCache(): void {
  if (memoryCache.size <= LIBRARY_THUMB_LRU_MAX) {
    return;
  }
  const entries = [...memoryCache.entries()].sort(
    (a, b) => a[1].lastAccess - b[1].lastAccess,
  );
  const removeCount = memoryCache.size - LIBRARY_THUMB_LRU_MAX;
  for (let i = 0; i < removeCount; i += 1) {
    memoryCache.delete(entries[i][0]);
  }
}

function runDecodeQueue(): void {
  while (activeDecodes < LIBRARY_THUMB_DECODE_CONCURRENCY && decodeQueue.length > 0) {
    const next = decodeQueue.shift();
    if (!next) {
      return;
    }
    activeDecodes += 1;
    next();
  }
}

function scheduleDecode<T>(task: () => Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const run = () => {
      task()
        .then(resolve, reject)
        .finally(() => {
          activeDecodes -= 1;
          runDecodeQueue();
        });
    };
    decodeQueue.push(run);
    runDecodeQueue();
  });
}

function clampPixelSize(pixelSize: number): number {
  return Math.min(
    LIBRARY_THUMB_MAX_PIXELS,
    Math.max(64, Math.ceil(pixelSize)),
  );
}

async function resolveLocalSourceUri(
  assetId: string,
  fallbackUri: string,
  shouldDownloadFromNetwork: boolean,
): Promise<string | null> {
  if (fallbackUri.startsWith("file://")) {
    return fallbackUri;
  }
  if (Platform.OS === "web") {
    return fallbackUri.startsWith("http") ? fallbackUri : null;
  }
  try {
    const info = await MediaLibrary.getAssetInfoAsync(assetId, {
      shouldDownloadFromNetwork,
    });
    if (info.localUri?.startsWith("file://")) {
      return info.localUri;
    }
  } catch (error) {
    console.warn("[libraryThumbnailCache] getAssetInfoAsync failed", assetId, error);
  }
  return null;
}

async function buildThumbnailFile(
  sourceUri: string,
  targetUri: string,
  pixelSize: number,
): Promise<string> {
  const existing = await FileSystem.getInfoAsync(targetUri);
  if (existing.exists) {
    return targetUri;
  }

  const probe = await ImageManipulator.manipulateAsync(sourceUri, [], {
    compress: 1,
    format: ImageManipulator.SaveFormat.JPEG,
  });

  const actions: ImageManipulator.Action[] = [];
  const longEdge = Math.max(probe.width, probe.height);
  if (longEdge > pixelSize) {
    if (probe.width >= probe.height) {
      actions.push({
        resize: { width: pixelSize },
      });
    } else {
      actions.push({
        resize: { height: pixelSize },
      });
    }
  }

  const result = await ImageManipulator.manipulateAsync(
    sourceUri,
    actions,
    {
      compress: THUMB_QUALITY,
      format: ImageManipulator.SaveFormat.JPEG,
    },
  );

  if (result.uri === targetUri) {
    return targetUri;
  }

  await FileSystem.copyAsync({ from: result.uri, to: targetUri });
  return targetUri;
}

async function decodeThumbnail(request: LibraryThumbnailRequest): Promise<string> {
  const pixelSize = clampPixelSize(request.pixelSize);
  const key = cacheKey(request.assetId, pixelSize);
  const cached = memoryCache.get(key);
  if (cached) {
    cached.lastAccess = Date.now();
    return cached.uri;
  }

  const directory = await ensureThumbDirectory();
  const targetUri = `${directory}${thumbFileName(request.assetId, pixelSize)}`;
  const onDisk = await FileSystem.getInfoAsync(targetUri);
  if (onDisk.exists) {
    return touchMemory(key, targetUri);
  }

  const sourceUri = await resolveLocalSourceUri(
    request.assetId,
    request.fallbackUri,
    request.shouldDownloadFromNetwork ?? false,
  );
  if (!sourceUri) {
    return request.fallbackUri;
  }

  const thumbUri = await buildThumbnailFile(sourceUri, targetUri, pixelSize);
  return touchMemory(key, thumbUri);
}

/**
 * Returns a cached `file://` thumb when possible; falls back to `ph://` / original URI.
 * Decode work is capped at {@link LIBRARY_THUMB_DECODE_CONCURRENCY}.
 */
export async function requestLibraryThumbnail(
  request: LibraryThumbnailRequest,
): Promise<string> {
  const pixelSize = clampPixelSize(request.pixelSize);
  const key = cacheKey(request.assetId, pixelSize);

  const cached = memoryCache.get(key);
  if (cached) {
    cached.lastAccess = Date.now();
    return cached.uri;
  }

  const existing = inflight.get(key);
  if (existing) {
    return existing;
  }

  const promise = scheduleDecode(() => decodeThumbnail(request)).finally(() => {
    inflight.delete(key);
  });
  inflight.set(key, promise);
  return promise;
}

/** Drop in-memory LRU entries (disk cache preserved). Call on album switch. */
export function clearLibraryThumbnailMemoryCache(): void {
  memoryCache.clear();
  inflight.clear();
  decodeQueue = [];
  activeDecodes = 0;
}

export function computeLibraryThumbPixelSize(tileSizePt: number, scale: number): number {
  return clampPixelSize(tileSizePt * scale);
}
