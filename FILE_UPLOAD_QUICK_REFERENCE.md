# 📋 File Upload Quick Reference Guide

## TL;DR - What You Need to Know

### Current State ❌
- Files are selected but only stored as local URIs
- No cloud storage
- Files lost on app reinstall

### After Implementation ✅
- Files uploaded to Supabase Storage
- Persistent across devices
- Secure, company-isolated storage
- Full file management (view, delete, download)

---

## 🚀 Quick Start Implementation

### Step 1: Database Setup (5 minutes)

```bash
# In Supabase Dashboard → SQL Editor
# 1. Copy contents of: scripts/file-attachments-migration.sql
# 2. Click "Run"
# 3. Verify: You should see "MIGRATION COMPLETE! ✅"
```

### Step 2: Create Storage Buckets (2 minutes)

```bash
# In Supabase Dashboard → Storage → New Bucket

Bucket 1:
- Name: buildtrack-files
- Public: NO
- File size limit: 50MB

Bucket 2:
- Name: buildtrack-public
- Public: YES
- File size limit: 10MB
```

### Step 3: Apply Storage Policies (2 minutes)

```bash
# In Supabase Dashboard → SQL Editor
# 1. Copy contents of: scripts/file-storage-policies.sql
# 2. Click "Run"
# 3. Verify: Check policies appear in Dashboard → Storage → Policies
```

### Step 4: Add Service Files (10 minutes)

Create these 3 files in your project:
1. `src/api/fileUploadService.ts` - Core upload logic
2. `src/utils/useFileUpload.ts` - React hook
3. `src/components/FileAttachmentPreview.tsx` - UI component

Copy the code from `FILE_UPLOAD_IMPLEMENTATION_PLAN.md` sections:
- Section "💻 Frontend/Backend Implementation"

### Step 5: Update Existing Screens (20 minutes)

Update these files to use the new upload system:
- `src/screens/CreateTaskScreen.tsx` - Task attachments
- `src/screens/TaskDetailScreen.tsx` - Task update photos
- `src/screens/AdminDashboardScreen.tsx` - Company logos/banners

### Step 6: Test (10 minutes)

- [ ] Upload an image from camera
- [ ] Upload an image from gallery
- [ ] Upload a PDF document
- [ ] View uploaded files
- [ ] Delete a file
- [ ] Check files in Supabase Dashboard

**Total Time: ~1 hour**

---

## 📊 File Upload Architecture

```
User selects file
    ↓
expo-image-picker / expo-document-picker
    ↓
Read file as base64 (expo-file-system)
    ↓
Upload to Supabase Storage
    ↓
Get public URL
    ↓
Save metadata to file_attachments table
    ↓
Display in app
```

---

## 🗄️ Database Schema

### file_attachments table

```sql
id                 UUID      - Primary key
file_name          TEXT      - Original filename
file_type          TEXT      - 'image', 'document', 'video', 'other'
file_size          INTEGER   - Size in bytes
mime_type          TEXT      - e.g., 'image/jpeg'
storage_path       TEXT      - Path in Supabase Storage
public_url         TEXT      - Public accessible URL
entity_type        TEXT      - 'task', 'project', 'company_logo', etc.
entity_id          UUID      - ID of the entity
uploaded_by        UUID      - User who uploaded
company_id         UUID      - Company isolation
description        TEXT      - Optional description
tags               TEXT[]    - Optional tags
created_at         TIMESTAMP - Upload time
updated_at         TIMESTAMP - Last modified
deleted_at         TIMESTAMP - Soft delete timestamp
deleted_by         UUID      - Who deleted it
```

---

## 📁 Storage Structure

### buildtrack-files (Private)
```
{company_id}/
  tasks/
    {task_id}/
      1234567890-photo.jpg
      1234567891-document.pdf
  projects/
    {project_id}/
      1234567892-blueprint.pdf
  task-updates/
    {task_update_id}/
      1234567893-progress-photo.jpg
```

### buildtrack-public (Public)
```
companies/
  {company_id}/
    logo.png
    banner.jpg
```

---

## 💻 Code Examples

### Upload an Image

```typescript
import { useFileUpload } from '@/utils/useFileUpload';
import { useAuthStore } from '@/state/authStore';

function MyComponent() {
  const { pickAndUploadImages, isUploading } = useFileUpload();
  const currentUser = useAuthStore((state) => state.currentUser);

  const handleUpload = async () => {
    const uploaded = await pickAndUploadImages({
      entityType: 'task',
      entityId: taskId,
      companyId: currentUser.company_id,
      userId: currentUser.id,
    }, 'camera'); // or 'library'

    console.log('Uploaded:', uploaded);
  };

  return (
    <Button onPress={handleUpload} disabled={isUploading}>
      {isUploading ? 'Uploading...' : 'Upload Image'}
    </Button>
  );
}
```

### Get Files for a Task

```typescript
import { getFilesForEntity } from '@/api/fileUploadService';

const files = await getFilesForEntity('task', taskId);
console.log('Files:', files);
```

### Delete a File

```typescript
import { deleteFile } from '@/api/fileUploadService';

await deleteFile(fileId, currentUser.id);
```

### Display File Preview

```typescript
import { FileAttachmentPreview } from '@/components/FileAttachmentPreview';

<FileAttachmentPreview
  attachment={file}
  onDelete={() => handleDelete(file.id)}
  onPress={() => handleView(file)}
/>
```

---

## 🔒 Security

### Row Level Security (RLS)
- ✅ Users can only view files from their company
- ✅ Users can only upload to their company's folder
- ✅ Users can only delete their own files (or admins)
- ✅ Files are isolated by company

### File Validation
- ✅ Max file size: 50MB
- ✅ Allowed types: Images, PDFs, Office docs, text
- ✅ MIME type validation
- ✅ Automatic malicious file rejection

### Storage Policies
- ✅ Company folder isolation
- ✅ Authenticated user requirement
- ✅ Owner verification for deletes

---

## 📱 UI Components

### FileAttachmentPreview
Shows a preview of an uploaded file with delete button.

### Upload Button with Progress
```typescript
<Button disabled={isUploading}>
  {isUploading 
    ? `Uploading ${uploadProgress}%` 
    : 'Upload File'
  }
</Button>
```

### File Gallery
```typescript
<ScrollView horizontal>
  {files.map(file => (
    <FileAttachmentPreview
      key={file.id}
      attachment={file}
      onDelete={() => handleDelete(file.id)}
    />
  ))}
</ScrollView>
```

---

## 🧪 Testing Checklist

### Manual Testing
- [ ] Upload image from camera
- [ ] Upload image from gallery
- [ ] Upload PDF document
- [ ] Upload large file (close to 50MB)
- [ ] Try uploading invalid file type (should fail)
- [ ] View uploaded files
- [ ] Delete file
- [ ] Check file appears in Supabase Dashboard
- [ ] Check metadata in file_attachments table

### Security Testing
- [ ] Try accessing another company's files (should fail)
- [ ] Try uploading to another company's folder (should fail)
- [ ] Try deleting another user's file (should fail for non-admins)
- [ ] Verify RLS policies work

### Performance Testing
- [ ] Upload multiple files simultaneously
- [ ] Upload on slow network
- [ ] Upload very large file (45-50MB)
- [ ] Check app doesn't freeze during upload

---

## 🐛 Troubleshooting

### "Upload failed: Permission denied"
- Check user is authenticated
- Check user has company_id
- Check storage policies are applied
- Verify bucket exists

### "Invalid file type"
- Check MIME type is in allowed list
- Check file extension matches MIME type
- Update validation function if needed

### "File too large"
- Max size is 50MB
- Implement image compression for large images
- Split large files if necessary

### "Files not appearing in app"
- Check file_attachments table has records
- Check RLS policies allow SELECT
- Verify company_id matches
- Check deleted_at is NULL

### "Storage quota exceeded"
- Check Supabase Dashboard → Storage → Usage
- Upgrade to Pro plan if needed
- Clean up old files
- Implement file compression

---

## 💰 Cost Management

### Supabase Free Tier
- Storage: 1 GB
- Bandwidth: 2 GB/month
- Database: 500 MB

### Tips to Stay in Free Tier
1. **Compress images before upload** (reduce by 50-70%)
2. **Delete old files** (run cleanup_deleted_files function)
3. **Use thumbnails** for previews
4. **Monitor usage** in Supabase Dashboard

### When to Upgrade ($25/mo Pro)
- Storage: 100 GB
- Bandwidth: 200 GB/month
- Database: 8 GB

---

## 📊 Monitoring

### Check Storage Usage
```sql
-- Run in Supabase SQL Editor
SELECT * FROM get_file_statistics('your-company-id');
```

### Recent Uploads
```sql
SELECT 
  file_name,
  file_type,
  file_size,
  uploaded_by,
  created_at
FROM file_attachments
WHERE company_id = 'your-company-id'
  AND deleted_at IS NULL
ORDER BY created_at DESC
LIMIT 10;
```

### Storage by Entity Type
```sql
SELECT 
  entity_type,
  COUNT(*) as file_count,
  ROUND(SUM(file_size) / 1048576.0, 2) as size_mb
FROM file_attachments
WHERE company_id = 'your-company-id'
  AND deleted_at IS NULL
GROUP BY entity_type;
```

---

## 🔄 Migration from Old System

### Option 1: Clean Start (Recommended)
- New attachments use new system
- Old local URIs remain (deprecated)
- Simplest approach

### Option 2: Hybrid
```typescript
interface Task {
  attachments: string[]; // Old local URIs
  file_attachment_ids: string[]; // New cloud file IDs
}

// Display both:
const displayFiles = [
  ...task.attachments.map(uri => ({ type: 'local', uri })),
  ...cloudFiles.map(file => ({ type: 'cloud', ...file }))
];
```

### Option 3: Force Re-upload
- Show banner: "Please re-upload your files"
- Clear old attachments
- Users upload again

**Recommended: Option 1** (clean start)

---

## 📚 Key Files Reference

### Backend/API
- `src/api/supabase.ts` - Supabase client
- `src/api/fileUploadService.ts` - Upload/download logic

### Frontend
- `src/utils/useFileUpload.ts` - Upload hook
- `src/components/FileAttachmentPreview.tsx` - File preview UI

### Database
- `scripts/file-attachments-migration.sql` - Database schema
- `scripts/file-storage-policies.sql` - Storage policies

### Documentation
- `FILE_UPLOAD_IMPLEMENTATION_PLAN.md` - Full implementation plan
- `FILE_UPLOAD_QUICK_REFERENCE.md` - This file

---

## ⚡ Performance Tips

1. **Compress images** before upload
   ```typescript
   import * as ImageManipulator from 'expo-image-manipulator';
   
   const compressed = await ImageManipulator.manipulateAsync(
     uri,
     [{ resize: { width: 1920 } }],
     { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
   );
   ```

2. **Use thumbnails** for previews
3. **Lazy load** file lists
4. **Cache** frequently accessed files
5. **Show progress** for large uploads

---

## 🎯 Implementation Priority

### Phase 1: Essential (Do First)
1. Database setup ✅
2. Storage buckets ✅
3. Core upload service ✅
4. Task attachments ✅

### Phase 2: Important (Do Next)
1. File preview component
2. Delete functionality
3. Error handling
4. Progress indicators

### Phase 3: Nice to Have (Later)
1. Image compression
2. Thumbnails
3. File search
4. Bulk operations

---

## 📞 Support

### Resources
- [Supabase Storage Docs](https://supabase.com/docs/guides/storage)
- [Expo ImagePicker](https://docs.expo.dev/versions/latest/sdk/imagepicker/)
- [Expo FileSystem](https://docs.expo.dev/versions/latest/sdk/filesystem/)

### Common Questions

**Q: Can I store videos?**
A: Yes, but be mindful of file size (50MB limit). Consider video compression.

**Q: How do I handle offline uploads?**
A: Implement a queue system with AsyncStorage to retry failed uploads.

**Q: Can I share files between companies?**
A: Not by default. You'd need to implement a sharing mechanism.

**Q: How do I backup files?**
A: Supabase handles backups. You can also export via Storage API.

---

## ✅ Success Criteria

You'll know implementation is successful when:

- [x] Files upload to Supabase Storage
- [x] Files appear in Supabase Dashboard
- [x] File metadata saved to database
- [x] Files display in app
- [x] Delete works correctly
- [x] RLS policies block unauthorized access
- [x] No console errors
- [x] Upload progress shows
- [x] Error messages display clearly
- [x] Works on both iOS and Android

---

**Last Updated:** October 23, 2025  
**Version:** 1.0  
**Author:** BuildTrack Development Team

