import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';
import { supabase } from './supabase';

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
    const fileExt = file.name.split('.').pop() || 'bin';
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const uniqueName = `${timestamp}-${sanitizedName}`;

    // 4. Determine storage path
    const storagePath = `${companyId}/${entityType}s/${entityId}/${uniqueName}`;

    console.log(`📁 [File Upload] Storage path: ${storagePath}`);

    // 5. Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('buildtrack-files')
      .upload(storagePath, decode(base64), {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('❌ [File Upload] Upload error:', uploadError);
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    console.log(`✅ [File Upload] File uploaded successfully`);

    // 6. Get public URL
    const { data: urlData } = supabase.storage
      .from('buildtrack-files')
      .getPublicUrl(storagePath);

    if (!urlData?.publicUrl) {
      throw new Error('Failed to get public URL');
    }

    console.log(`🔗 [File Upload] Public URL generated`);

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
      public_url: urlData.publicUrl,
      entity_type: entityType,
      entity_id: entityId,
      uploaded_by: userId,
      company_id: companyId,
      description,
      tags,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    console.log(`🎉 [File Upload] Complete! File available at: ${urlData.publicUrl}`);

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
      .from('buildtrack-files')
      .remove([storagePath]);

    if (error) {
      throw new Error(`Delete failed: ${error.message}`);
    }

    console.log(`🗑️ [File Upload] File deleted: ${storagePath}`);
  } catch (error: any) {
    console.error('❌ [File Upload] Delete failed:', error);
    throw error;
  }
}

/**
 * Get download URL for a file
 */
export function getFileUrl(storagePath: string): string | null {
  if (!supabase) {
    return null;
  }

  const { data } = supabase.storage
    .from('buildtrack-files')
    .getPublicUrl(storagePath);

  return data?.publicUrl || null;
}

