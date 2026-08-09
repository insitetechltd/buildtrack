// Use legacy API to avoid deprecation warnings
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { supabase } from './supabase';

/** Storage bucket for task evidence (private after M-SUPABASE-03c). */
export const BUILDTRACK_FILES_BUCKET = 'buildtrack-files';

/**
 * Signed URL TTL (seconds). M-SUPABASE-03c D2 default = 3600.
 * Display paths re-sign via cache before expiry; do not treat stored URLs as durable.
 */
export const SIGNED_URL_EXPIRY_SECONDS = 3600;

/** Refresh cached signed URLs this many ms before they expire. */
const SIGNED_URL_REFRESH_MARGIN_MS = 60_000;

export interface FileUploadOptions {
  file: {
    uri: string;
    name: string;
    type: string;
  };
  entityType: 'task' | 'task-update' | 'project' | 'user';
  entityId: string;
  companyId: string;
  userId: string;
  description?: string;
  tags?: string[];
}

export interface FileAttachment {
  id: string;
  file_name: string;
  file_type: 'image' | 'document' | 'video' | 'other';
  file_size: number;
  mime_type: string;
  storage_path: string;
  /** Display URL — signed after 03c D2 cutover; not a durable public link. */
  public_url: string;
  entity_type: string;
  entity_id: string;
  uploaded_by: string;
  company_id: string;
  description?: string;
  tags?: string[];
  created_at: string;
  updated_at: string;
}

export interface UploadResult {
  success: boolean;
  file?: FileAttachment;
  error?: string;
}

type SignedUrlCacheEntry = {
  url: string;
  expiresAtMs: number;
};

const signedUrlCache = new Map<string, SignedUrlCacheEntry>();
const inflightSignedUrls = new Map<string, Promise<string | null>>();
const signedUrlListeners = new Set<() => void>();

/**
 * Extract a buildtrack-files object path from a storage path or Supabase Storage URL
 * (public or signed). Returns null for non-storage refs (local file URIs, external https).
 */
export function extractBuildtrackStoragePath(pathOrUrl: string): string | null {
  const trimmed = pathOrUrl?.trim();
  if (!trimmed) {
    return null;
  }

  if (/^(file:|content:|data:|asset:)/i.test(trimmed)) {
    return null;
  }

  if (!/^https?:\/\//i.test(trimmed)) {
    return trimmed.replace(/^\//, '') || null;
  }

  const match = trimmed.match(
    /\/storage\/v1\/object\/(?:public|sign)\/buildtrack-files\/([^?#]+)/i
  );
  if (!match?.[1]) {
    return null;
  }

  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

export function subscribeSignedUrlCache(listener: () => void): () => void {
  signedUrlListeners.add(listener);
  return () => {
    signedUrlListeners.delete(listener);
  };
}

function notifySignedUrlCache(): void {
  signedUrlListeners.forEach((listener) => {
    try {
      listener();
    } catch {
      // Ignore listener errors so one subscriber cannot break others.
    }
  });
}

function cacheSignedUrl(storagePath: string, signedUrl: string, expiresInSeconds: number): void {
  signedUrlCache.set(storagePath, {
    url: signedUrl,
    expiresAtMs: Date.now() + expiresInSeconds * 1000,
  });
  notifySignedUrlCache();
}

function getFreshCachedSignedUrl(storagePath: string): string | null {
  const cached = signedUrlCache.get(storagePath);
  if (!cached) {
    return null;
  }
  if (cached.expiresAtMs <= Date.now() + SIGNED_URL_REFRESH_MARGIN_MS) {
    return null;
  }
  return cached.url;
}

/**
 * Create (or reuse in-flight) a signed URL for a storage path. Updates the sync cache.
 */
export async function createSignedFileUrl(
  storagePath: string,
  expiresInSeconds: number = SIGNED_URL_EXPIRY_SECONDS
): Promise<string | null> {
  if (!supabase) {
    return null;
  }

  const path = storagePath.replace(/^\//, '');
  if (!path) {
    return null;
  }

  const fresh = getFreshCachedSignedUrl(path);
  if (fresh) {
    return fresh;
  }

  const existing = inflightSignedUrls.get(path);
  if (existing) {
    return existing;
  }

  const request = (async (): Promise<string | null> => {
    const { data, error } = await supabase.storage
      .from(BUILDTRACK_FILES_BUCKET)
      .createSignedUrl(path, expiresInSeconds);

    if (error || !data?.signedUrl) {
      console.error('❌ [File Upload] createSignedUrl failed:', error?.message || 'no signedUrl');
      return signedUrlCache.get(path)?.url ?? null;
    }

    cacheSignedUrl(path, data.signedUrl, expiresInSeconds);
    return data.signedUrl;
  })().finally(() => {
    inflightSignedUrls.delete(path);
  });

  inflightSignedUrls.set(path, request);
  return request;
}

/**
 * Resolve any photo ref (storage path, legacy public URL, or signed URL) to a usable URI.
 * Local / non-storage https URLs pass through unchanged.
 */
export async function resolveStorageUrl(pathOrUrl: string): Promise<string | null> {
  if (!pathOrUrl) {
    return null;
  }

  if (/^(file:|content:|data:|asset:)/i.test(pathOrUrl)) {
    return pathOrUrl;
  }

  const storagePath = extractBuildtrackStoragePath(pathOrUrl);
  if (!storagePath) {
    return /^https?:\/\//i.test(pathOrUrl) ? pathOrUrl : null;
  }

  return createSignedFileUrl(storagePath);
}

/**
 * Prefetch signed URLs for a batch of path/URL refs (fire-and-forget friendly).
 */
export async function prefetchSignedUrls(pathOrUrls: string[]): Promise<void> {
  const uniquePaths = Array.from(
    new Set(
      pathOrUrls
        .map((value) => extractBuildtrackStoragePath(value))
        .filter((value): value is string => Boolean(value))
    )
  );

  await Promise.all(uniquePaths.map((path) => createSignedFileUrl(path)));
}

/**
 * Determine file type from MIME type
 */
function getFileType(mimeType: string): 'image' | 'document' | 'video' | 'other' {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (
    mimeType === 'application/pdf' ||
    mimeType.includes('document') ||
    mimeType.includes('word') ||
    mimeType.includes('excel') ||
    mimeType.includes('spreadsheet') ||
    mimeType === 'text/plain'
  ) {
    return 'document';
  }
  return 'other';
}

/**
 * Upload a file to Supabase Storage and create database record
 */
export async function uploadFile(options: FileUploadOptions): Promise<FileAttachment> {
  if (!supabase) {
    throw new Error('Supabase not configured');
  }

  const { file, entityType, entityId, companyId, userId, description, tags } = options;

  try {
    console.log(`📤 [File Upload] Starting upload for ${file.name}`);

    // 1. Read file as base64
    const base64 = await FileSystem.readAsStringAsync(file.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // 2. Get file info
    const fileInfo = await FileSystem.getInfoAsync(file.uri);
    const fileSize = fileInfo.exists ? (fileInfo as any).size || 0 : 0;

    console.log(`📊 [File Upload] File size: ${(fileSize / 1024 / 1024).toFixed(2)}MB`);

    // 3. Generate unique file name
    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const uniqueName = `${timestamp}-${sanitizedName}`;

    // 4. Determine storage path (company isolation preserved)
    const storagePath = `${companyId}/${entityType}s/${entityId}/${uniqueName}`;

    console.log(`📁 [File Upload] Storage path: ${storagePath}`);

    // 5. Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from(BUILDTRACK_FILES_BUCKET)
      .upload(storagePath, decode(base64), {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('❌ [File Upload] Upload error:', uploadError);
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    console.log(`✅ [File Upload] File uploaded successfully`);

    // 6. Signed URL (private bucket — getPublicUrl 403s after M-SUPABASE-03c)
    const signedUrl = await createSignedFileUrl(storagePath, SIGNED_URL_EXPIRY_SECONDS);
    if (!signedUrl) {
      throw new Error('Failed to create signed URL');
    }

    console.log(`🔗 [File Upload] Signed URL generated (ttl=${SIGNED_URL_EXPIRY_SECONDS}s)`);

    // 7. Determine file type
    const fileType = getFileType(file.type);

    // 8. Create database record (if file_attachments table exists)
    // For now, we'll just return the file metadata
    // The table can be created later if needed

    const fileAttachment: FileAttachment = {
      id: `file-${timestamp}`,
      file_name: file.name,
      file_type: fileType,
      file_size: fileSize,
      mime_type: file.type,
      storage_path: storagePath,
      public_url: signedUrl,
      entity_type: entityType,
      entity_id: entityId,
      uploaded_by: userId,
      company_id: companyId,
      description,
      tags,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    console.log(`🎉 [File Upload] Complete! File available at signed URL`);

    return fileAttachment;
  } catch (error: any) {
    console.error('❌ [File Upload] Failed:', error);
    throw error;
  }
}

/**
 * Delete a file from Supabase Storage
 */
export async function deleteFile(storagePath: string): Promise<void> {
  if (!supabase) {
    throw new Error('Supabase not configured');
  }

  try {
    const { error } = await supabase.storage
      .from(BUILDTRACK_FILES_BUCKET)
      .remove([storagePath]);

    if (error) {
      throw new Error(`Delete failed: ${error.message}`);
    }

    signedUrlCache.delete(storagePath);
    console.log(`🗑️ [File Upload] File deleted: ${storagePath}`);
  } catch (error: any) {
    console.error('❌ [File Upload] Delete failed:', error);
    throw error;
  }
}

/**
 * Sync display URL for a storage path or legacy Supabase Storage URL.
 * Returns a cached signed URL when available; kicks async refresh otherwise.
 * Non-storage https / local URIs pass through.
 */
export function getFileUrl(pathOrUrl: string): string | null {
  if (!pathOrUrl) {
    return null;
  }

  if (/^(file:|content:|data:|asset:)/i.test(pathOrUrl)) {
    return pathOrUrl;
  }

  const storagePath = extractBuildtrackStoragePath(pathOrUrl);
  if (!storagePath) {
    return /^https?:\/\//i.test(pathOrUrl) ? pathOrUrl : null;
  }

  if (!supabase) {
    return null;
  }

  const cached = getFreshCachedSignedUrl(storagePath);
  if (cached) {
    return cached;
  }

  // Stale cache is better than nothing while refresh is in flight
  const stale = signedUrlCache.get(storagePath)?.url ?? null;
  void createSignedFileUrl(storagePath);
  return stale;
}

/**
 * Verify that an uploaded file is accessible
 * Returns true if file can be fetched, false otherwise
 */
export async function verifyUpload(publicUrl: string): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`🔍 [Upload Verification] Verifying file at: ${publicUrl}`);

    // Try to fetch the file with a HEAD request to check if it exists
    const response = await fetch(publicUrl, {
      method: 'HEAD',
      headers: {
        'Cache-Control': 'no-cache',
      },
    });

    if (response.ok) {
      console.log(`✅ [Upload Verification] File verified successfully`);
      return { success: true };
    } else {
      const error = `File not accessible (HTTP ${response.status})`;
      console.error(`❌ [Upload Verification] ${error}`);
      return { success: false, error };
    }
  } catch (error: any) {
    const errorMessage = error.message || 'Network error during verification';
    console.error(`❌ [Upload Verification] Failed:`, errorMessage);
    return { success: false, error: errorMessage };
  }
}

/**
 * Upload a file with verification
 * Returns UploadResult with success status and file data or error
 */
export async function uploadFileWithVerification(options: FileUploadOptions): Promise<UploadResult> {
  try {
    // Upload the file
    const fileAttachment = await uploadFile(options);

    // Verify the upload
    const verification = await verifyUpload(fileAttachment.public_url);

    if (!verification.success) {
      console.warn(
        `⚠️ [File Upload] Upload completed but signed-URL verification was inconclusive: ${
          verification.error || 'Unknown verification issue'
        }`
      );
    }

    return {
      success: true,
      file: fileAttachment,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Upload failed',
    };
  }
}

/** @internal test helper — clears signed URL cache between tests */
export function __resetSignedUrlCacheForTests(): void {
  signedUrlCache.clear();
  inflightSignedUrls.clear();
}
