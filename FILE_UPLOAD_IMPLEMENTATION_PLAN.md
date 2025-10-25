# 📁 File Upload Implementation Plan for BuildTrack

## Executive Summary

This document outlines the complete infrastructure and backend changes required to implement cloud-based photo and document uploads for BuildTrack using Supabase Storage.

**Current State:**
- ✅ UI components for file selection exist
- ✅ Local file picking works (expo-image-picker, expo-document-picker)
- ✅ Database has TEXT[] fields for attachment URLs
- ❌ No actual cloud storage integration
- ❌ Files only stored as local URIs (lost on app restart/reinstall)

**Goal:**
Implement a production-ready file upload system with proper cloud storage, security, and file management.

---

## 📊 Architecture Overview

```
┌─────────────────┐
│   Mobile App    │
│   (React Native)│
└────────┬────────┘
         │
         ├── 1. Pick File (expo-image-picker/document-picker)
         │
         ├── 2. Upload to Supabase Storage
         │   └── /buildtrack-files/{company_id}/{entity_type}/{entity_id}/{file}
         │
         ├── 3. Get Public URL
         │
         └── 4. Save metadata to database (file_attachments table)
                └── Link to task/project/company
```

---

## 🗄️ Database Schema Changes

### 1. Create `file_attachments` Table

This table will store metadata for all uploaded files across the system.

```sql
-- File Attachments Table
CREATE TABLE file_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- File Information
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL, -- 'image', 'document', 'video', 'other'
  file_size INTEGER NOT NULL, -- in bytes
  mime_type TEXT NOT NULL, -- e.g., 'image/jpeg', 'application/pdf'
  storage_path TEXT NOT NULL UNIQUE, -- Path in Supabase Storage
  public_url TEXT NOT NULL, -- Public accessible URL
  
  -- Entity Association (what this file is attached to)
  entity_type TEXT NOT NULL CHECK (entity_type IN ('task', 'sub_task', 'task_update', 'project', 'company_logo', 'company_banner', 'user_avatar')),
  entity_id UUID NOT NULL, -- ID of the entity (task_id, project_id, etc.)
  
  -- Metadata
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Optional metadata
  description TEXT,
  tags TEXT[] DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Soft delete (for recovery)
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes for performance
CREATE INDEX idx_file_attachments_entity ON file_attachments(entity_type, entity_id);
CREATE INDEX idx_file_attachments_company ON file_attachments(company_id);
CREATE INDEX idx_file_attachments_uploaded_by ON file_attachments(uploaded_by);
CREATE INDEX idx_file_attachments_created_at ON file_attachments(created_at);
CREATE INDEX idx_file_attachments_deleted_at ON file_attachments(deleted_at);

-- Composite index for common query pattern
CREATE INDEX idx_file_attachments_entity_not_deleted ON file_attachments(entity_type, entity_id, company_id) 
  WHERE deleted_at IS NULL;
```

### 2. Add Triggers

```sql
-- Updated_at trigger for file_attachments
CREATE TRIGGER update_file_attachments_updated_at BEFORE UPDATE ON file_attachments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 3. Row Level Security (RLS) Policies

```sql
-- Enable RLS
ALTER TABLE file_attachments ENABLE ROW LEVEL SECURITY;

-- SELECT: Users can view files from their company (not deleted)
CREATE POLICY "Users can view company files" ON file_attachments
  FOR SELECT USING (
    company_id = (SELECT company_id FROM users WHERE id = auth.uid())
    AND deleted_at IS NULL
  );

-- INSERT: Authenticated users can upload files
CREATE POLICY "Authenticated users can upload files" ON file_attachments
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND company_id = (SELECT company_id FROM users WHERE id = auth.uid())
  );

-- UPDATE: Users can update their own uploads or admins can update any
CREATE POLICY "Users can update own files" ON file_attachments
  FOR UPDATE USING (
    uploaded_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND company_id = file_attachments.company_id
      AND role IN ('admin', 'manager')
    )
  );

-- DELETE: Soft delete only - admins and file owners
CREATE POLICY "Users can delete own files" ON file_attachments
  FOR UPDATE USING (
    uploaded_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND company_id = file_attachments.company_id
      AND role = 'admin'
    )
  );
```

### 4. Migration for Existing Data (Optional)

If you have existing attachment URLs stored in `tasks.attachments` or `task_updates.photos`:

```sql
-- Function to migrate existing attachments
CREATE OR REPLACE FUNCTION migrate_existing_attachments()
RETURNS void AS $$
BEGIN
  -- This is a placeholder
  -- You would need to handle existing local URIs appropriately
  -- Most likely these will be invalid after app reinstall anyway
  RAISE NOTICE 'Existing local URIs cannot be migrated - users will need to re-upload';
END;
$$ LANGUAGE plpgsql;
```

**Recommendation:** Keep the existing `attachments` and `photos` TEXT[] columns for backward compatibility during migration, but deprecate them in favor of the new `file_attachments` table.

---

## ☁️ Supabase Storage Configuration

### 1. Create Storage Buckets

In Supabase Dashboard → Storage, create these buckets:

#### Bucket 1: `buildtrack-files` (Main bucket)
- **Public:** No (private by default)
- **File size limit:** 50MB per file
- **Allowed MIME types:** 
  - Images: `image/jpeg`, `image/png`, `image/gif`, `image/webp`, `image/heic`
  - Documents: `application/pdf`, `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
  - Spreadsheets: `application/vnd.ms-excel`, `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
  - Other: `text/plain`, `application/zip`

#### Bucket 2: `buildtrack-public` (For public assets)
- **Public:** Yes
- **File size limit:** 10MB
- **Use for:** Company logos, banners, public project images

### 2. Folder Structure in Storage

```
buildtrack-files/
├── {company_id}/
│   ├── tasks/
│   │   └── {task_id}/
│   │       ├── {timestamp}-{filename}.jpg
│   │       └── {timestamp}-document.pdf
│   ├── projects/
│   │   └── {project_id}/
│   │       └── {timestamp}-{filename}.jpg
│   ├── task-updates/
│   │   └── {task_update_id}/
│   │       └── {timestamp}-{filename}.jpg
│   └── users/
│       └── {user_id}/
│           └── avatar-{timestamp}.jpg

buildtrack-public/
├── companies/
│   └── {company_id}/
│       ├── logo.png
│       └── banner.jpg
```

### 3. Storage Policies (RLS for Buckets)

```sql
-- Policy for buildtrack-files bucket
-- Users can upload to their company folder
CREATE POLICY "Users can upload to company folder"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'buildtrack-files'
  AND (storage.foldername(name))[1] = (
    SELECT company_id::text FROM users WHERE id = auth.uid()
  )
);

-- Users can view their company's files
CREATE POLICY "Users can view company files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'buildtrack-files'
  AND (storage.foldername(name))[1] = (
    SELECT company_id::text FROM users WHERE id = auth.uid()
  )
);

-- Users can delete their own uploads
CREATE POLICY "Users can delete own files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'buildtrack-files'
  AND (storage.foldername(name))[1] = (
    SELECT company_id::text FROM users WHERE id = auth.uid()
  )
  AND owner = auth.uid()
);

-- Policy for buildtrack-public bucket (anyone can view)
CREATE POLICY "Public files are viewable by all"
ON storage.objects FOR SELECT
USING (bucket_id = 'buildtrack-public');

-- Only authenticated users can upload to public bucket
CREATE POLICY "Authenticated users can upload public files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'buildtrack-public'
  AND auth.uid() IS NOT NULL
);
```

---

## 💻 Frontend/Backend Implementation

### 1. Create File Upload Service

**File:** `src/api/fileUploadService.ts`

```typescript
import { supabase } from './supabase';
import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';

export interface FileUploadOptions {
  file: {
    uri: string;
    name: string;
    type: string;
  };
  entityType: 'task' | 'sub_task' | 'task_update' | 'project' | 'company_logo' | 'company_banner';
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
 * Upload a file to Supabase Storage and create database record
 */
export async function uploadFile(options: FileUploadOptions): Promise<FileAttachment> {
  if (!supabase) {
    throw new Error('Supabase not configured');
  }

  const { file, entityType, entityId, companyId, userId, description, tags } = options;

  try {
    // 1. Read file as base64
    const base64 = await FileSystem.readAsStringAsync(file.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // 2. Get file info
    const fileInfo = await FileSystem.getInfoAsync(file.uri);
    const fileSize = fileInfo.exists ? (fileInfo as any).size || 0 : 0;

    // 3. Generate unique file name
    const timestamp = Date.now();
    const fileExt = file.name.split('.').pop() || 'bin';
    const uniqueName = `${timestamp}-${file.name}`;

    // 4. Determine storage path
    const storagePath = `${companyId}/${entityType}s/${entityId}/${uniqueName}`;

    // 5. Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('buildtrack-files')
      .upload(storagePath, decode(base64), {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    // 6. Get public URL
    const { data: urlData } = supabase.storage
      .from('buildtrack-files')
      .getPublicUrl(storagePath);

    if (!urlData?.publicUrl) {
      throw new Error('Failed to get public URL');
    }

    // 7. Determine file type
    const fileType = getFileType(file.type);

    // 8. Create database record
    const { data: dbData, error: dbError } = await supabase
      .from('file_attachments')
      .insert({
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
        tags: tags || [],
      })
      .select()
      .single();

    if (dbError) {
      // If database insert fails, try to delete the uploaded file
      await supabase.storage.from('buildtrack-files').remove([storagePath]);
      throw new Error(`Database error: ${dbError.message}`);
    }

    return dbData;
  } catch (error) {
    console.error('File upload error:', error);
    throw error;
  }
}

/**
 * Get all files for an entity
 */
export async function getFilesForEntity(
  entityType: string,
  entityId: string
): Promise<FileAttachment[]> {
  if (!supabase) {
    throw new Error('Supabase not configured');
  }

  const { data, error } = await supabase
    .from('file_attachments')
    .select('*')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch files: ${error.message}`);
  }

  return data || [];
}

/**
 * Delete a file (soft delete)
 */
export async function deleteFile(fileId: string, userId: string): Promise<boolean> {
  if (!supabase) {
    throw new Error('Supabase not configured');
  }

  const { error } = await supabase
    .from('file_attachments')
    .update({
      deleted_at: new Date().toISOString(),
      deleted_by: userId,
    })
    .eq('id', fileId);

  if (error) {
    throw new Error(`Failed to delete file: ${error.message}`);
  }

  return true;
}

/**
 * Permanently delete a file from storage and database
 */
export async function permanentlyDeleteFile(fileId: string): Promise<boolean> {
  if (!supabase) {
    throw new Error('Supabase not configured');
  }

  try {
    // 1. Get file info
    const { data: fileData, error: fetchError } = await supabase
      .from('file_attachments')
      .select('storage_path')
      .eq('id', fileId)
      .single();

    if (fetchError) throw fetchError;

    // 2. Delete from storage
    const { error: storageError } = await supabase.storage
      .from('buildtrack-files')
      .remove([fileData.storage_path]);

    if (storageError) {
      console.error('Storage deletion error:', storageError);
    }

    // 3. Delete from database
    const { error: dbError } = await supabase
      .from('file_attachments')
      .delete()
      .eq('id', fileId);

    if (dbError) throw dbError;

    return true;
  } catch (error) {
    console.error('Permanent deletion error:', error);
    throw error;
  }
}

/**
 * Helper: Determine file type from MIME type
 */
function getFileType(mimeType: string): 'image' | 'document' | 'video' | 'other' {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (
    mimeType.includes('pdf') ||
    mimeType.includes('document') ||
    mimeType.includes('word') ||
    mimeType.includes('excel') ||
    mimeType.includes('spreadsheet') ||
    mimeType.includes('text')
  ) {
    return 'document';
  }
  return 'other';
}

/**
 * Helper: Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Helper: Get file icon based on type
 */
export function getFileIcon(mimeType: string): string {
  if (mimeType.startsWith('image/')) return 'image-outline';
  if (mimeType.includes('pdf')) return 'document-text-outline';
  if (mimeType.includes('word') || mimeType.includes('document')) return 'document-outline';
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'grid-outline';
  if (mimeType.includes('video')) return 'videocam-outline';
  return 'attach-outline';
}
```

### 2. Create File Upload Hook

**File:** `src/utils/useFileUpload.ts`

```typescript
import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Alert } from 'react-native';
import { uploadFile, FileUploadOptions, FileAttachment } from '@/api/fileUploadService';

export function useFileUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  /**
   * Pick and upload images from camera or gallery
   */
  const pickAndUploadImages = async (
    options: Omit<FileUploadOptions, 'file'>,
    source: 'camera' | 'library' = 'library'
  ): Promise<FileAttachment[]> => {
    try {
      let result;

      if (source === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Denied', 'Camera permission is required to take photos.');
          return [];
        }

        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images as any,
          allowsEditing: true,
          quality: 0.8,
        });
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Denied', 'Photo library permission is required.');
          return [];
        }

        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images as any,
          allowsMultipleSelection: true,
          quality: 0.8,
        });
      }

      if (result.canceled || !result.assets) {
        return [];
      }

      setIsUploading(true);
      const uploadedFiles: FileAttachment[] = [];

      for (let i = 0; i < result.assets.length; i++) {
        const asset = result.assets[i];
        setUploadProgress(((i + 1) / result.assets.length) * 100);

        const file = {
          uri: asset.uri,
          name: asset.fileName || `image-${Date.now()}.jpg`,
          type: asset.type === 'image' ? 'image/jpeg' : 'image/jpeg',
        };

        const uploadedFile = await uploadFile({ ...options, file });
        uploadedFiles.push(uploadedFile);
      }

      setIsUploading(false);
      setUploadProgress(0);
      return uploadedFiles;
    } catch (error) {
      setIsUploading(false);
      setUploadProgress(0);
      console.error('Image upload error:', error);
      Alert.alert('Upload Failed', 'Failed to upload images. Please try again.');
      return [];
    }
  };

  /**
   * Pick and upload documents
   */
  const pickAndUploadDocuments = async (
    options: Omit<FileUploadOptions, 'file'>
  ): Promise<FileAttachment[]> => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        multiple: true,
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets) {
        return [];
      }

      setIsUploading(true);
      const uploadedFiles: FileAttachment[] = [];

      for (let i = 0; i < result.assets.length; i++) {
        const asset = result.assets[i];
        setUploadProgress(((i + 1) / result.assets.length) * 100);

        const file = {
          uri: asset.uri,
          name: asset.name,
          type: asset.mimeType || 'application/octet-stream',
        };

        const uploadedFile = await uploadFile({ ...options, file });
        uploadedFiles.push(uploadedFile);
      }

      setIsUploading(false);
      setUploadProgress(0);
      return uploadedFiles;
    } catch (error) {
      setIsUploading(false);
      setUploadProgress(0);
      console.error('Document upload error:', error);
      Alert.alert('Upload Failed', 'Failed to upload documents. Please try again.');
      return [];
    }
  };

  return {
    pickAndUploadImages,
    pickAndUploadDocuments,
    isUploading,
    uploadProgress,
  };
}
```

### 3. Update Task Store to use File Attachments

**File:** `src/state/taskStore.ts` (add these methods)

```typescript
// Add to TaskStore interface
interface TaskStore {
  // ... existing methods
  
  // File attachment methods
  addAttachmentToTask: (taskId: string, attachment: FileAttachment) => void;
  removeAttachmentFromTask: (taskId: string, attachmentId: string) => void;
  getTaskAttachments: (taskId: string) => Promise<FileAttachment[]>;
}

// Add to store implementation
addAttachmentToTask: (taskId, attachment) => {
  set((state) => ({
    tasks: state.tasks.map((task) =>
      task.id === taskId
        ? {
            ...task,
            attachments: [...(task.attachments || []), attachment.public_url],
          }
        : task
    ),
  }));
},

removeAttachmentFromTask: (taskId, attachmentId) => {
  // This will be handled by deleteFile in fileUploadService
  // Just update local state
  set((state) => ({
    tasks: state.tasks.map((task) => {
      if (task.id === taskId) {
        // You might want to filter out the attachment URL
        return task;
      }
      return task;
    }),
  }));
},

getTaskAttachments: async (taskId) => {
  if (!supabase) return [];
  
  const { data, error } = await supabase
    .from('file_attachments')
    .select('*')
    .eq('entity_type', 'task')
    .eq('entity_id', taskId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });
    
  if (error) {
    console.error('Error fetching attachments:', error);
    return [];
  }
  
  return data || [];
},
```

---

## 🔒 Security Considerations

### 1. File Validation

**Backend (Database Function):**

```sql
-- Function to validate file uploads
CREATE OR REPLACE FUNCTION validate_file_upload()
RETURNS TRIGGER AS $$
BEGIN
  -- Check file size (50MB max)
  IF NEW.file_size > 52428800 THEN
    RAISE EXCEPTION 'File size exceeds 50MB limit';
  END IF;
  
  -- Check MIME type
  IF NEW.mime_type NOT IN (
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'application/zip'
  ) THEN
    RAISE EXCEPTION 'Invalid file type: %', NEW.mime_type;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger
CREATE TRIGGER validate_file_before_insert
BEFORE INSERT ON file_attachments
FOR EACH ROW
EXECUTE FUNCTION validate_file_upload();
```

### 2. Rate Limiting

Implement rate limiting in your app to prevent abuse:

```typescript
// Simple rate limiter
const uploadAttempts = new Map<string, number[]>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const attempts = uploadAttempts.get(userId) || [];
  
  // Remove attempts older than 1 minute
  const recentAttempts = attempts.filter(time => now - time < 60000);
  
  // Allow max 20 uploads per minute
  if (recentAttempts.length >= 20) {
    return false;
  }
  
  recentAttempts.push(now);
  uploadAttempts.set(userId, recentAttempts);
  return true;
}
```

### 3. Virus Scanning (Optional, Advanced)

For production, consider integrating ClamAV or a cloud-based virus scanning service.

---

## 📱 UI/UX Updates

### 1. Update CreateTaskScreen

Replace the current file picker with the new upload hook:

```typescript
import { useFileUpload } from '@/utils/useFileUpload';
import { FileAttachment } from '@/api/fileUploadService';

// Inside component
const { pickAndUploadImages, pickAndUploadDocuments, isUploading, uploadProgress } = useFileUpload();
const [attachments, setAttachments] = useState<FileAttachment[]>([]);

const handlePickImages = async () => {
  const uploaded = await pickAndUploadImages({
    entityType: 'task',
    entityId: taskId,
    companyId: currentUser.company_id,
    userId: currentUser.id,
  });
  
  setAttachments([...attachments, ...uploaded]);
};
```

### 2. Create File Preview Component

```typescript
// src/components/FileAttachmentPreview.tsx
import React from 'react';
import { View, Text, Image, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FileAttachment, formatFileSize, getFileIcon } from '@/api/fileUploadService';

interface Props {
  attachment: FileAttachment;
  onDelete?: () => void;
  onPress?: () => void;
}

export function FileAttachmentPreview({ attachment, onDelete, onPress }: Props) {
  const isImage = attachment.file_type === 'image';

  return (
    <Pressable
      onPress={onPress}
      className="bg-white border border-gray-300 rounded-lg p-3 mr-3 w-32"
    >
      {isImage ? (
        <Image
          source={{ uri: attachment.public_url }}
          className="w-full h-24 rounded mb-2"
          resizeMode="cover"
        />
      ) : (
        <View className="w-full h-24 bg-gray-100 rounded mb-2 items-center justify-center">
          <Ionicons name={getFileIcon(attachment.mime_type) as any} size={40} color="#6b7280" />
        </View>
      )}

      <Text className="text-xs text-gray-700 font-medium" numberOfLines={2}>
        {attachment.file_name}
      </Text>
      <Text className="text-xs text-gray-500 mt-1">
        {formatFileSize(attachment.file_size)}
      </Text>

      {onDelete && (
        <Pressable
          onPress={onDelete}
          className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full items-center justify-center"
        >
          <Ionicons name="close" size={14} color="white" />
        </Pressable>
      )}
    </Pressable>
  );
}
```

---

## 🧪 Testing Strategy

### 1. Unit Tests

- Test `uploadFile` with various file types
- Test file size validation
- Test error handling

### 2. Integration Tests

- Test end-to-end upload flow
- Test RLS policies work correctly
- Test file deletion (soft and hard delete)

### 3. Performance Tests

- Test with large files (close to 50MB)
- Test with multiple simultaneous uploads
- Test on slow networks

### 4. Security Tests

- Test unauthorized access attempts
- Test cross-company file access
- Test malicious file uploads

---

## 📋 Implementation Checklist

### Phase 1: Database & Storage Setup (Priority: HIGH)
- [ ] Create `file_attachments` table in Supabase
- [ ] Add indexes and triggers
- [ ] Set up RLS policies for `file_attachments`
- [ ] Create `buildtrack-files` storage bucket
- [ ] Create `buildtrack-public` storage bucket
- [ ] Configure storage bucket policies
- [ ] Test database and storage setup manually

### Phase 2: Backend Services (Priority: HIGH)
- [ ] Create `fileUploadService.ts`
- [ ] Implement `uploadFile` function
- [ ] Implement `getFilesForEntity` function
- [ ] Implement `deleteFile` function
- [ ] Implement `permanentlyDeleteFile` function
- [ ] Add validation and error handling
- [ ] Test all service functions

### Phase 3: Frontend Hooks & Components (Priority: MEDIUM)
- [ ] Create `useFileUpload` hook
- [ ] Create `FileAttachmentPreview` component
- [ ] Create `FileGallery` component (for viewing all files)
- [ ] Add loading states and progress indicators
- [ ] Add error handling and user feedback

### Phase 4: Integration (Priority: MEDIUM)
- [ ] Update `CreateTaskScreen` to use new upload system
- [ ] Update `TaskDetailScreen` to display uploaded files
- [ ] Update `taskStore` with attachment methods
- [ ] Update `AdminDashboardScreen` for logo/banner uploads
- [ ] Test uploads across all screens

### Phase 5: Additional Features (Priority: LOW)
- [ ] Add image preview/viewer
- [ ] Add document viewer
- [ ] Add bulk upload
- [ ] Add drag-and-drop (web)
- [ ] Add file search and filtering
- [ ] Add file tagging system

### Phase 6: Optimization (Priority: LOW)
- [ ] Implement image compression before upload
- [ ] Add thumbnail generation
- [ ] Implement lazy loading for file lists
- [ ] Add caching for frequently accessed files
- [ ] Optimize storage costs (lifecycle policies)

### Phase 7: Polish & Production (Priority: MEDIUM)
- [ ] Add comprehensive error messages
- [ ] Add upload retry mechanism
- [ ] Add offline queue for uploads
- [ ] Add analytics for file uploads
- [ ] Add admin panel for file management
- [ ] Documentation and user guides

---

## 💰 Cost Estimation (Supabase Free Tier)

**Free Tier Limits:**
- Database: 500 MB
- Storage: 1 GB
- Bandwidth: 2 GB/month

**Recommendations:**
- Implement image compression (reduce size by 50-70%)
- Set up lifecycle policies to archive old files
- Monitor usage in Supabase dashboard
- Upgrade to Pro plan ($25/mo) when needed:
  - 8 GB database
  - 100 GB storage
  - 200 GB bandwidth

---

## 🚀 Deployment Steps

1. **Supabase Setup**
   ```bash
   # Run in Supabase SQL Editor
   # 1. Copy and run the file_attachments table creation script
   # 2. Copy and run the RLS policies
   # 3. Create storage buckets via UI
   # 4. Copy and run the storage policies
   ```

2. **Frontend Implementation**
   ```bash
   # 1. Create service files
   touch src/api/fileUploadService.ts
   touch src/utils/useFileUpload.ts
   touch src/components/FileAttachmentPreview.tsx

   # 2. Implement the code from this plan
   # 3. Update existing screens
   # 4. Test thoroughly
   ```

3. **Verification**
   ```bash
   # Test checklist:
   # - Upload image from camera
   # - Upload image from gallery
   # - Upload document
   # - View uploaded files
   # - Delete file
   # - Check Supabase dashboard for files
   # - Check database for file records
   # - Test RLS policies with different users
   ```

---

## 📚 Additional Resources

- [Supabase Storage Documentation](https://supabase.com/docs/guides/storage)
- [Expo ImagePicker Documentation](https://docs.expo.dev/versions/latest/sdk/imagepicker/)
- [Expo DocumentPicker Documentation](https://docs.expo.dev/versions/latest/sdk/document-picker/)
- [Expo FileSystem Documentation](https://docs.expo.dev/versions/latest/sdk/filesystem/)

---

## 🐛 Known Issues & Limitations

1. **File Size Limit:** 50MB per file (Supabase limitation)
2. **HEIC Images:** May need conversion to JPEG on iOS
3. **Network Issues:** Large uploads may fail on poor connections
4. **Storage Costs:** Monitor usage to avoid overages

---

## 🔄 Migration Path from Current System

If you have existing local file URIs:

1. **Option 1:** One-time migration script (complex)
2. **Option 2:** Deprecate old attachments, start fresh
3. **Option 3:** Hybrid approach - keep old, use new for future uploads

**Recommended:** Option 3 - Add a flag to distinguish between legacy and new attachments:

```typescript
interface Task {
  // ... existing fields
  attachments: string[]; // Legacy local URIs (deprecated)
  file_attachment_ids?: string[]; // New - references to file_attachments table
}
```

---

## 📝 Summary

This plan provides a complete, production-ready implementation for cloud-based file uploads in BuildTrack. The architecture is:

✅ **Scalable** - Supabase Storage handles growing file volumes
✅ **Secure** - RLS policies enforce proper access control
✅ **Organized** - Clear folder structure and metadata tracking
✅ **Maintainable** - Clean separation of concerns
✅ **Cost-effective** - Optimized for Supabase free tier
✅ **User-friendly** - Smooth upload experience with progress indicators

**Estimated Implementation Time:**
- Phase 1-2 (Database + Backend): 2-3 days
- Phase 3-4 (Frontend + Integration): 3-4 days
- Phase 5-7 (Features + Polish): 2-3 days
- **Total: 7-10 days** for full implementation

---

**Next Steps:**
1. Review and approve this plan
2. Set up Supabase storage buckets
3. Run database migrations
4. Begin Phase 1 implementation
5. Test incrementally
6. Deploy to production

Let me know if you need clarification on any part of this plan!

