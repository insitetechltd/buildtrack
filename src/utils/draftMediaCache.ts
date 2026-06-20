import * as FileSystem from "expo-file-system/legacy";

const DRAFT_MEDIA_DIR_NAME = "draft-media";
const UNSAFE_FILE_NAME_CHARS = /[^a-zA-Z0-9._-]/g;

function sanitizeFileName(fileName: string): string {
  return fileName.replace(UNSAFE_FILE_NAME_CHARS, "_");
}

function splitFileName(fileName?: string): { baseName: string; extension: string } {
  const fallbackName = `draft_${Date.now()}.jpg`;
  const sanitized = sanitizeFileName(fileName || fallbackName);
  const lastDotIndex = sanitized.lastIndexOf(".");

  if (lastDotIndex <= 0 || lastDotIndex === sanitized.length - 1) {
    return {
      baseName: sanitized,
      extension: "jpg",
    };
  }

  return {
    baseName: sanitized.slice(0, lastDotIndex),
    extension: sanitized.slice(lastDotIndex + 1).toLowerCase(),
  };
}

export async function ensureDraftMediaDirectory(): Promise<string> {
  if (!FileSystem.documentDirectory) {
    throw new Error("Document directory is unavailable");
  }

  const directory = `${FileSystem.documentDirectory}${DRAFT_MEDIA_DIR_NAME}/`;
  await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
  return directory;
}

export async function pinDraftMedia(
  sourceUri: string,
  suggestedFileName?: string
): Promise<string> {
  if (!sourceUri.startsWith("file://")) {
    return sourceUri;
  }

  const directory = await ensureDraftMediaDirectory();
  if (sourceUri.startsWith(directory)) {
    return sourceUri;
  }

  const { baseName, extension } = splitFileName(suggestedFileName);
  const targetUri = `${directory}${baseName}_${Date.now()}.${extension}`;

  await FileSystem.copyAsync({
    from: sourceUri,
    to: targetUri,
  });

  return targetUri;
}

export async function writeClipboardImageToDraft(
  base64Payload: string,
  suggestedFileName = `clipboard_${Date.now()}.png`
): Promise<string> {
  const directory = await ensureDraftMediaDirectory();
  const { baseName, extension } = splitFileName(suggestedFileName);
  const targetUri = `${directory}${baseName}_${Date.now()}.${extension}`;

  await FileSystem.writeAsStringAsync(targetUri, base64Payload, {
    encoding: FileSystem.EncodingType.Base64,
  });

  return targetUri;
}
