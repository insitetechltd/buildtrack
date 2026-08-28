/**
 * Grid browse uses the system Photos URI from getAssetsAsync (ph:// on iOS,
 * content:// on Android). iOS PhotoKit serves an appropriately sized thumbnail
 * for small Image tiles — no ImageManipulator decode needed until Accept/upload.
 */
export function isSystemLibraryDisplayUri(uri: string): boolean {
  return /^(ph:|assets-library:|content:)/i.test(uri);
}

/** URI suitable for immediate grid Image bind; null when empty. */
export function libraryGridDisplayUri(assetUri: string): string | null {
  if (!assetUri) {
    return null;
  }
  if (assetUri.startsWith("file://") || isSystemLibraryDisplayUri(assetUri)) {
    return assetUri;
  }
  return assetUri;
}
