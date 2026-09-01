import type { ComponentType } from "react";
import { Platform } from "react-native";
import {
  requireNativeModule,
  requireNativeViewManager,
} from "expo-modules-core";

import { runExclusivePhotokitJob } from "@/utils/libraryPhotokitGate";

type PhotokitThumbsNative = {
  startCaching?: (assetIds: string[], pixelSize: number) => void;
  stopCaching?: () => void;
  openLibrary?: (
    albumId: string,
  ) => { token: number; count: number } | Promise<{ token: number; count: number }>;
  openLibraryLimited?: (
    albumId: string,
    limit: number,
  ) => { token: number; count: number } | Promise<{ token: number; count: number }>;
  expandLibraryFull?: (
    token: number,
  ) => { token: number; count: number } | Promise<{ token: number; count: number }>;
  openLibraryWithIds?: (
    ids: string[],
  ) => { token: number; count: number } | Promise<{ token: number; count: number }>;
  previewNewestIds?: (limit: number) => string[] | Promise<string[]>;
  idAt?: (token: number, index: number) => string;
  startCachingRange?: (
    token: number,
    from: number,
    to: number,
    pixelSize: number,
  ) => void;
  pauseLibraryForAccept?: () => void;
  resumeLibraryAfterAccept?: () => void;
  exportCappedJpeg?: (assetId: string, maxPixel: number) => string | Promise<string>;
};

export type PhotokitLibrarySession = {
  token: number;
  count: number;
};

export type PhotokitThumbNativeProps = {
  assetId?: string;
  index?: number;
  token?: number;
  pixelSize: number;
  style?: object;
  testID?: string;
  onPainted?: () => void;
};

let nativeModule: PhotokitThumbsNative | null | undefined;
let nativeView: ComponentType<PhotokitThumbNativeProps> | null | undefined;

function loadNativeModule(): PhotokitThumbsNative | null {
  if (nativeModule !== undefined) {
    return nativeModule;
  }
  if (Platform.OS !== "ios") {
    nativeModule = null;
    return null;
  }
  try {
    nativeModule = requireNativeModule("PhotokitThumbs") as PhotokitThumbsNative;
  } catch {
    nativeModule = null;
  }
  return nativeModule;
}

function loadNativeView(): ComponentType<PhotokitThumbNativeProps> | null {
  if (nativeView !== undefined) {
    return nativeView;
  }
  if (loadNativeModule() == null) {
    nativeView = null;
    return null;
  }
  try {
    nativeView = requireNativeViewManager(
      "PhotokitThumbs",
    ) as ComponentType<PhotokitThumbNativeProps>;
  } catch {
    nativeView = null;
  }
  return nativeView;
}

export function isPhotokitThumbsAvailable(): boolean {
  const native = loadNativeModule();
  return (
    loadNativeView() != null && typeof native?.startCaching === "function"
  );
}

/** TF 213 binaries have thumbs but not the index API — must feature-detect. */
export function isPhotokitLibraryIndexAvailable(): boolean {
  const native = loadNativeModule();
  return (
    loadNativeView() != null &&
    typeof native?.openLibrary === "function" &&
    typeof native?.idAt === "function" &&
    typeof native?.startCachingRange === "function"
  );
}

export function getPhotokitThumbNativeView(): ComponentType<PhotokitThumbNativeProps> | null {
  return loadNativeView();
}

/** Option 2B APIs present (limited open + same-token expand). */
export function isPhotokitLibrary2bAvailable(): boolean {
  const native = loadNativeModule();
  return (
    isPhotokitLibraryIndexAvailable() &&
    typeof native?.openLibraryLimited === "function" &&
    typeof native?.expandLibraryFull === "function"
  );
}

export function isPhotokitLibraryWithIdsAvailable(): boolean {
  const native = loadNativeModule();
  return typeof native?.openLibraryWithIds === "function";
}

function parseSession(
  opened: { token: number; count: number } | null | undefined,
): PhotokitLibrarySession | null {
  if (
    !opened ||
    typeof opened.token !== "number" ||
    typeof opened.count !== "number" ||
    opened.token < 1
  ) {
    return null;
  }
  return { token: opened.token, count: Math.max(0, opened.count) };
}

export async function openPhotokitLibrary(
  albumId: string | null,
): Promise<PhotokitLibrarySession | null> {
  const native = loadNativeModule();
  if (!native?.openLibrary) {
    return null;
  }
  return runExclusivePhotokitJob("openLibrary", async () => {
    try {
      const opened = await Promise.resolve(native.openLibrary!(albumId ?? ""));
      return parseSession(opened);
    } catch {
      return null;
    }
  });
}

/** Option 2B: newest `limit` Recents via unsorted index-from-end (no sort). */
export async function openPhotokitLibraryLimited(
  albumId: string | null,
  limit: number,
): Promise<PhotokitLibrarySession | null> {
  const native = loadNativeModule();
  if (!native?.openLibraryLimited || limit < 1) {
    return null;
  }
  return runExclusivePhotokitJob("openLibraryLimited", async () => {
    try {
      const opened = await Promise.resolve(
        native.openLibraryLimited!(albumId ?? "", limit),
      );
      return parseSession(opened);
    } catch {
      return null;
    }
  });
}

/** Fast path: persisted local IDs. Not exclusive — ID-open must not wait behind expand. */
export async function openPhotokitLibraryWithIds(
  ids: string[],
): Promise<PhotokitLibrarySession | null> {
  const native = loadNativeModule();
  if (!native?.openLibraryWithIds || ids.length < 1) {
    return null;
  }
  try {
    const opened = await Promise.resolve(native.openLibraryWithIds(ids));
    return parseSession(opened);
  } catch {
    return null;
  }
}

/** Option 2B: grow session to full Recents; token must stay the same. */
export async function expandPhotokitLibraryFull(
  token: number,
): Promise<PhotokitLibrarySession | null> {
  const native = loadNativeModule();
  if (!native?.expandLibraryFull || token < 1) {
    return null;
  }
  return runExclusivePhotokitJob("expandLibraryFull", async () => {
    try {
      const opened = await Promise.resolve(native.expandLibraryFull!(token));
      const session = parseSession(opened);
      if (!session || session.token !== token) {
        return null;
      }
      return session;
    } catch {
      return null;
    }
  });
}

/** Fast Recents reverse-enum slice (TF 225). Empty if native API missing. */
export async function previewPhotokitNewestIds(
  limit: number,
): Promise<string[]> {
  const native = loadNativeModule();
  if (!native?.previewNewestIds || limit < 1) {
    return [];
  }
  return runExclusivePhotokitJob("previewNewestIds", async () => {
    try {
      const ids = await Promise.resolve(native.previewNewestIds!(limit));
      if (!Array.isArray(ids)) {
        return [];
      }
      return ids.filter(
        (id): id is string => typeof id === "string" && id.length > 0,
      );
    } catch {
      return [];
    }
  });
}

export function photokitIdAt(token: number, index: number): string | null {
  const native = loadNativeModule();
  if (!native?.idAt || token < 1 || index < 0) {
    return null;
  }
  const id = native.idAt(token, index);
  return id ? id : null;
}

export function startPhotokitThumbCaching(
  assetIds: string[],
  pixelSize: number,
): void {
  const native = loadNativeModule();
  if (!native?.startCaching || assetIds.length === 0 || pixelSize < 1) {
    return;
  }
  native.startCaching(assetIds, pixelSize);
}

export function startPhotokitRangeCaching(
  token: number,
  from: number,
  to: number,
  pixelSize: number,
): void {
  const native = loadNativeModule();
  if (!native?.startCachingRange || token < 1 || pixelSize < 1 || to <= from) {
    return;
  }
  native.startCachingRange(token, from, to, pixelSize);
}

export function stopPhotokitThumbCaching(): void {
  loadNativeModule()?.stopCaching?.();
}

/** Cancel in-flight grid thumbs so Accept can export originals. */
export function pausePhotokitLibraryForAccept(): void {
  stopPhotokitThumbCaching();
  loadNativeModule()?.pauseLibraryForAccept?.();
}

export function resumePhotokitLibraryAfterAccept(): void {
  loadNativeModule()?.resumeLibraryAfterAccept?.();
}

/**
 * Capped JPEG for annotation/upload. Not first-paint thumbs (those stay .fastFormat).
 * Empty string / null = native missing or asset unresolved.
 */
export async function exportPhotokitCappedJpeg(
  assetId: string,
  maxPixel: number,
): Promise<string | null> {
  const native = loadNativeModule();
  if (!native?.exportCappedJpeg || !assetId || maxPixel < 1) {
    return null;
  }
  return runExclusivePhotokitJob("exportCappedJpeg", async () => {
    try {
      const uri = await Promise.resolve(native.exportCappedJpeg!(assetId, maxPixel));
      return typeof uri === "string" && uri.startsWith("file://") ? uri : null;
    } catch {
      return null;
    }
  });
}
