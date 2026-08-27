/** @deprecated Parked 2026-08-25 — custom company banner UI disabled; keep for a later post-RC slice. */
import * as FileSystem from "expo-file-system/legacy";
import { decode } from "base64-arraybuffer";

import { supabase } from "./supabase";
import {
  BUILDTRACK_FILES_BUCKET,
  SIGNED_URL_EXPIRY_SECONDS,
  createSignedFileUrl,
  extractBuildtrackStoragePath,
} from "./fileUploadService";

/** Durable object key under company branding (shared by all seats). */
export function companyBannerStoragePath(companyId: string, extension = "jpg"): string {
  const safeExt = extension.replace(/[^a-z0-9]/gi, "").toLowerCase() || "jpg";
  return `${companyId}/branding/banner.${safeExt}`;
}

/** Local / clipboard URIs that must not be persisted to companies.banner. */
export function isEphemeralBannerImageUri(uri: string | undefined | null): boolean {
  if (!uri?.trim()) {
    return false;
  }
  return /^(file:|content:|data:|asset:|ph:|assets-library:)/i.test(uri.trim());
}

function extensionFromMime(mime: string): string {
  if (mime.includes("png")) return "png";
  if (mime.includes("webp")) return "webp";
  if (mime.includes("gif")) return "gif";
  return "jpg";
}

async function materializeUploadSource(
  uri: string,
): Promise<{ fileUri: string; mimeType: string; extension: string }> {
  const trimmed = uri.trim();

  if (trimmed.startsWith("data:")) {
    const match = trimmed.match(/^data:([^;]+);base64,(.+)$/i);
    if (!match) {
      throw new Error("Invalid clipboard/data image");
    }
    const mimeType = match[1] || "image/jpeg";
    const extension = extensionFromMime(mimeType);
    const fileUri = `${FileSystem.cacheDirectory}company-banner-${Date.now()}.${extension}`;
    await FileSystem.writeAsStringAsync(fileUri, match[2], {
      encoding: FileSystem.EncodingType.Base64,
    });
    return { fileUri, mimeType, extension };
  }

  const lower = trimmed.toLowerCase();
  const extension = lower.includes(".png")
    ? "png"
    : lower.includes(".webp")
      ? "webp"
      : "jpg";
  return {
    fileUri: trimmed,
    mimeType: `image/${extension === "jpg" ? "jpeg" : extension}`,
    extension,
  };
}

/**
 * Upload a company banner image to buildtrack-files under
 * `{companyId}/branding/banner.*` (upsert). Returns the durable storage path
 * plus a short-lived signed URL for immediate preview.
 */
export async function uploadCompanyBannerImage(options: {
  companyId: string;
  uri: string;
}): Promise<{ storagePath: string; previewUrl: string }> {
  if (!supabase) {
    throw new Error("Supabase not configured");
  }

  const { companyId, uri } = options;
  if (!companyId || !uri?.trim()) {
    throw new Error("Company banner upload requires companyId and image uri");
  }

  const { fileUri, mimeType, extension } = await materializeUploadSource(uri);
  const storagePath = companyBannerStoragePath(companyId, extension);

  const base64 = await FileSystem.readAsStringAsync(fileUri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const { error: uploadError } = await supabase.storage
    .from(BUILDTRACK_FILES_BUCKET)
    .upload(storagePath, decode(base64), {
      contentType: mimeType,
      upsert: true,
    });

  if (uploadError) {
    throw new Error(`Banner upload failed: ${uploadError.message}`);
  }

  const previewUrl = await createSignedFileUrl(storagePath, SIGNED_URL_EXPIRY_SECONDS);
  if (!previewUrl) {
    throw new Error("Banner uploaded but signed URL could not be created");
  }

  return { storagePath, previewUrl };
}

/** Resolve a displayable URI for a persisted banner image (storage path or legacy URL). */
export async function resolveCompanyBannerImageUrl(
  banner: { imageStoragePath?: string; imageUri?: string } | null | undefined,
): Promise<string | null> {
  if (!banner) {
    return null;
  }

  const durable =
    banner.imageStoragePath?.trim() ||
    extractBuildtrackStoragePath(banner.imageUri || "") ||
    null;

  if (durable) {
    return createSignedFileUrl(durable, SIGNED_URL_EXPIRY_SECONDS);
  }

  const legacy = banner.imageUri?.trim();
  if (!legacy || isEphemeralBannerImageUri(legacy)) {
    return null;
  }

  if (/^https?:\/\//i.test(legacy)) {
    return legacy;
  }

  return null;
}
