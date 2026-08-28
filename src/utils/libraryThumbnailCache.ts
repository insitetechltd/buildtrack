import { Platform } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as ImageManipulator from "expo-image-manipulator";
import * as MediaLibrary from "expo-media-library";

/**
 * Optional file:// thumb cache (ImageManipulator resize). Grid browse uses system
 * ph:// / content:// URIs — full resolution at Accept via resolveLibraryLocalUri.
 */

import {
  LIBRARY_THUMB_DECODE_CONCURRENCY,
  LIBRARY_THUMB_LRU_MAX,
  LIBRARY_THUMB_MAX_PIXELS,
  LIBRARY_THUMB_PRIORITY_BACKGROUND,
} from "./libraryPickerPerf";

const THUMB_DIR_NAME = "library-thumbs";
const THUMB_QUALITY = 0.68;

export {
  LIBRARY_THUMB_DECODE_CONCURRENCY,
  LIBRARY_THUMB_LRU_MAX,
  LIBRARY_THUMB_MAX_PIXELS,
} from "./libraryPickerPerf";

export type LibraryThumbnailRequest = {
  assetId: string;
  pixelSize: number;
  fallbackUri: string;
  /** Grid browse defaults false — do not block on iCloud during scroll. */
  shouldDownloadFromNetwork?: boolean;
  /** Lower = higher priority in decode queue (viewport prefetch uses 0). */
  priority?: number;
};

type CacheEntry = {
  uri: string;
  lastAccess: number;
};

type QueueEntry = {
  priority: number;
  seq: number;
  run: () => void;
};

const memoryCache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<string>>();

let decodeQueue: QueueEntry[] = [];
let activeDecodes = 0;
let queueSeq = 0;

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

function enqueueDecode(priority: number, run: () => void): void {
  queueSeq += 1;
  decodeQueue.push({ priority, seq: queueSeq, run });
  decodeQueue.sort((a, b) => a.priority - b.priority || a.seq - b.seq);
  runDecodeQueue();
}

function runDecodeQueue(): void {
  while (activeDecodes < LIBRARY_THUMB_DECODE_CONCURRENCY && decodeQueue.length > 0) {
    const next = decodeQueue.shift();
    if (!next) {
      return;
    }
    activeDecodes += 1;
    next.run();
  }
}

function scheduleDecode<T>(priority: number, task: () => Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    enqueueDecode(priority, () => {
      task()
        .then(resolve, reject)
        .finally(() => {
          activeDecodes -= 1;
          runDecodeQueue();
        });
    });
  });
}

function clampPixelSize(pixelSize: number): number {
  return Math.min(
    LIBRARY_THUMB_MAX_PIXELS,
    Math.max(64, Math.ceil(pixelSize)),
  );
}

/** Sync memory hit — instant paint when FlatList recycles a cell. */
export function peekLibraryThumbnailUri(
  assetId: string,
  pixelSize: number,
): string | null {
  const key = cacheKey(assetId, clampPixelSize(pixelSize));
  const cached = memoryCache.get(key);
  if (!cached) {
    return null;
  }
  cached.lastAccess = Date.now();
  return cached.uri;
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

  const result = await ImageManipulator.manipulateAsync(
    sourceUri,
    [{ resize: { width: pixelSize } }],
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

  const priority = request.priority ?? LIBRARY_THUMB_PRIORITY_BACKGROUND;
  const promise = scheduleDecode(priority, () => decodeThumbnail(request)).finally(
    () => {
      inflight.delete(key);
    },
  );
  inflight.set(key, promise);
  return promise;
}

/** Queue viewport + scroll-ahead thumbs without awaiting (continuous scroll). */
export function prefetchLibraryThumbnails(
  requests: LibraryThumbnailRequest[],
): void {
  for (const request of requests) {
    void requestLibraryThumbnail(request);
  }
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
