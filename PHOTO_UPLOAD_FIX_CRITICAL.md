# 🚨 CRITICAL FIX: Photos Not Showing for Assignees

## 🐛 The Problem

**Issue**: Photos attached to tasks are **NOT showing up** for assignees in preview or full-screen view.

**Root Cause**: Photos were being stored as **local device URIs** (like `file:///...`) instead of being uploaded to cloud storage.

**Impact**:
- ❌ Uploader can see photos (they're on their device)
- ❌ Assignees can't see photos (files don't exist on their devices)
- ❌ Photos lost if user uninstalls app
- ❌ No persistence across devices
- ❌ **Critical workflow blocker**

## ✅ The Solution

Implemented proper file upload to **Supabase Storage** with public URLs that work for all users.

### Changes Made

#### 1. Created File Upload Service ⭐ NEW FILE

**File**: `src/api/fileUploadService.ts`

**What it does**:
- Reads photos as base64
- Uploads to Supabase Storage bucket
- Generates public URLs
- Returns file metadata
- Includes delete and URL retrieval functions

**Key Features**:
- 📤 Uploads to cloud storage
- 🔗 Generates public URLs accessible by all users
- 🗂️ Organized folder structure: `{companyId}/{entityType}s/{entityId}/{file}`
- 🔒 Company-isolated storage
- 📊 File size tracking
- 🏷️ MIME type detection

#### 2. Updated TaskDetailScreen ⭐ MODIFIED

**File**: `src/screens/TaskDetailScreen.tsx`

**Changes**:
- Added `useFileUpload` hook import
- Added file upload state (`isUploading`, `uploadProgress`, `isCompressing`)
- Modified `handleAddPhotos` function to upload to cloud storage
- Photos now stored as **public URLs** instead of local URIs

**Before** (Broken):
```typescript
// Stored local URI - only works on uploader's device
const newPhotos = result.assets.map(asset => asset.uri);
// Example: "file:///var/mobile/Containers/Data/Application/..."
```

**After** (Fixed):
```typescript
// Upload to cloud and store public URL - works for everyone
const uploadedFiles = await pickAndUploadImages({
  entityType: 'task-update',
  entityId: task.id,
  companyId: user.companyId,
  userId: user.id,
}, 'camera');

const newPhotoUrls = uploadedFiles.map(file => file.public_url);
// Example: "https://supabase.co/storage/v1/object/public/buildtrack-files/..."
```

## ⚙️ REQUIRED: Supabase Setup

### STEP 1: Create Storage Bucket 🪣 (REQUIRED)

**You MUST create this bucket in Supabase before photos will upload!**

1. Go to Supabase Dashboard → **Storage**
2. Click **"New Bucket"**
3. Enter these settings:

```
Bucket Name: buildtrack-files
Public:      NO (unchecked)
File Size Limit: 50MB
Allowed MIME types: (leave blank for all types)
```

4. Click **"Create Bucket"**

### STEP 2: Set Storage Policies 🔐 (REQUIRED)

After creating the bucket, set up Row Level Security policies:

1. Go to Supabase Dashboard → **Storage** → **Policies**
2. Select the `buildtrack-files` bucket
3. Click **"New Policy"**

**Policy 1: Upload Files** (Users can upload):
```sql
CREATE POLICY "Users can upload to their company folder"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'buildtrack-files'
  AND (storage.foldername(name))[1] = auth.jwt() ->>'company_id'
);
```

**Policy 2: View Files** (Users can view their company's files):
```sql
CREATE POLICY "Users can view their company files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'buildtrack-files'
  AND (storage.foldername(name))[1] = auth.jwt() ->>'company_id'
);
```

**Policy 3: Delete Files** (Users can delete their company's files):
```sql
CREATE POLICY "Users can delete their company files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'buildtrack-files'
  AND (storage.foldername(name))[1] = auth.jwt() ->>'company_id'
);
```

### STEP 3: Make Bucket Public (Alternative Simple Setup)

If RLS policies don't work initially, you can make the bucket public temporarily:

1. Go to Supabase Dashboard → **Storage** → **buildtrack-files**
2. Click bucket settings (gear icon)
3. Toggle **"Public bucket"** to ON
4. This allows anyone with the URL to view files
5. **Note**: Less secure but faster to setup for testing

## 📁 File Structure

Photos are now organized in Supabase Storage:

```
buildtrack-files/
├── {company-id-1}/
│   ├── task-updates/
│   │   └── {task-id}/
│   │       ├── 1730000000000-photo1.jpg
│   │       ├── 1730000001000-photo2.jpg
│   │       └── 1730000002000-photo3.jpg
│   ├── tasks/
│   │   └── {task-id}/
│   │       └── {timestamp}-attachment.pdf
│   └── projects/
│       └── {project-id}/
│           └── {timestamp}-image.jpg
└── {company-id-2}/
    └── task-updates/
        └── ...
```

**Benefits**:
- ✅ Company isolation (each company has own folder)
- ✅ Entity organization (task-updates, tasks, projects separate)
- ✅ Unique filenames (timestamp prevents conflicts)
- ✅ Easy cleanup (delete entire company folder)

## 🚀 How It Works Now

### Upload Flow

```
1. User selects photo
   ↓
2. Photo compressed (if > 5MB)
   ↓
3. Read file as base64
   ↓
4. Upload to Supabase Storage
   ↓
5. Get public URL
   ↓
6. Store URL in database
   ↓
7. Display photo using URL
```

### View Flow

```
1. Fetch task updates from database
   ↓
2. Get photo URLs (public URLs)
   ↓
3. Display using <Image source={{ uri: publicUrl }} />
   ↓
4. Works for ALL users (not just uploader)
```

## 📊 Before vs After

### Before (Broken)

| Aspect | Behavior |
|--------|----------|
| Photo storage | Local device only |
| URL format | `file:///...` (local path) |
| Uploader can see | ✅ Yes |
| Assignees can see | ❌ No |
| Persistence | ❌ Lost on uninstall |
| Cross-device | ❌ Doesn't work |
| File size | Uncompressed |

### After (Fixed)

| Aspect | Behavior |
|--------|----------|
| Photo storage | Supabase Cloud Storage |
| URL format | `https://...` (public URL) |
| Uploader can see | ✅ Yes |
| Assignees can see | ✅ Yes |
| Persistence | ✅ Permanent |
| Cross-device | ✅ Works everywhere |
| File size | Compressed to < 5MB |

## 🧪 Testing Steps

### Test 1: Upload and View (Same User)
1. User A uploads a photo to a task
2. Photo should compress (if needed)
3. Upload progress should show
4. Photo should appear in preview
5. Tap photo → should open full-screen
6. ✅ **Expected**: Photo shows correctly

### Test 2: View as Assignee (Different User) ⭐ CRITICAL
1. User A uploads photos to a task
2. Log in as User B (assignee)
3. Open the same task
4. ✅ **Expected**: Photos should appear in preview
5. Tap photo → should open full-screen
6. ✅ **Expected**: Photos show correctly

### Test 3: Multiple Photos
1. Upload 3-5 photos at once
2. All should compress and upload
3. All should show in horizontal scroll
4. ✅ **Expected**: All photos visible and tappable

### Test 4: Network Conditions
1. Test on slow 3G connection
2. Upload should show progress
3. Compression should happen first
4. ✅ **Expected**: Eventually succeeds

### Test 5: Offline Upload
1. Turn off internet
2. Try to upload photo
3. ✅ **Expected**: Shows error "Upload failed"
4. Turn on internet and retry
5. ✅ **Expected**: Upload succeeds

## ⚠️ Important Notes

### 1. Existing Photos Won't Work

**Issue**: Photos uploaded BEFORE this fix have local URIs and won't show for assignees.

**Solution Options**:
- **Option A**: Leave old photos as-is (they'll be broken for assignees)
- **Option B**: Delete old photo URLs from database
- **Option C**: Show placeholder for old photos with "Photo unavailable"

**Recommendation**: Option A for now, old updates are historical.

### 2. Storage Bucket Must Exist

**Critical**: The `buildtrack-files` bucket **MUST** be created in Supabase or uploads will fail!

**Check**:
```typescript
// In console logs, look for:
✅ [File Upload] File uploaded successfully
🔗 [File Upload] Public URL generated

// If you see:
❌ [File Upload] Upload failed: Bucket not found
```

Then you need to create the bucket!

### 3. File Size Limits

- **Images**: Automatically compressed to < 5MB
- **Documents**: Maximum 50MB
- **Total storage**: Check Supabase plan limits

### 4. MIME Type Detection

The service auto-detects file types:
- `image/*` → Image
- `application/pdf`, `*/word`, `*/excel` → Document
- `video/*` → Video
- Everything else → Other

## 🔧 Troubleshooting

### "Upload failed: Bucket not found"
**Solution**: Create `buildtrack-files` bucket in Supabase Dashboard

### "Upload failed: Permission denied"
**Solution**: 
1. Check storage policies are set up
2. OR temporarily make bucket public for testing

### Photos still don't show for assignees
**Check**:
1. Are URLs starting with `https://` (not `file://`)?
2. Can you paste the URL in a browser and see the image?
3. Is the bucket public OR do policies allow access?

### Upload hangs forever
**Check**:
1. Network connection
2. File size (should be < 50MB)
3. Supabase service is online

### "No public URL" error
**Solution**: Bucket might be private without proper policies. Make it public temporarily.

## 📝 Migration Plan

### For New Photos
✅ **Automatic**: All new photos will upload to cloud storage

### For Old Photos
❌ **Manual migration needed**: Old photos with local URIs won't work

**Migration Script** (optional, future enhancement):
```typescript
// Pseudo-code for migrating old photos
async function migrateOldPhotos() {
  // 1. Find all task updates with file:// URIs
  // 2. Skip them (can't access local files)
  // 3. Log which updates have broken photos
  // 4. Notify users to re-upload if critical
}
```

## ✅ Deployment Checklist

Before deploying this fix:

- [x] fileUploadService.ts created
- [x] TaskDetailScreen.tsx updated
- [x] useFileUpload.ts exists (already created)
- [x] imageCompressionService.ts exists (already created)
- [ ] **Create `buildtrack-files` bucket in Supabase** ⭐ CRITICAL
- [ ] **Set up storage policies** (or make bucket public)
- [ ] Test upload from one device
- [ ] Test view from different device/user
- [ ] Verify URLs start with `https://`
- [ ] Commit and push code
- [ ] Publish to EAS

## 🎯 Success Criteria

Fix is successful when:
- ✅ User A uploads photo
- ✅ Photo appears for User A
- ✅ User B (assignee) can see the same photo
- ✅ Photo opens in full-screen for both users
- ✅ URLs are public `https://` links
- ✅ Photos persist after app restart
- ✅ Photos work on different devices

## 📚 Related Files

**Created**:
- `src/api/fileUploadService.ts` - Core upload logic

**Modified**:
- `src/screens/TaskDetailScreen.tsx` - Uses upload service

**Already Exists**:
- `src/utils/useFileUpload.ts` - React hook
- `src/api/imageCompressionService.ts` - Image compression

**Documentation**:
- `PHOTO_UPLOAD_FIX_CRITICAL.md` - This file
- `FILE_UPLOAD_IMPLEMENTATION_PLAN.md` - Detailed specs
- `FILE_UPLOAD_QUICK_REFERENCE.md` - Quick setup guide

---

## 🚨 ACTION REQUIRED

**BEFORE TESTING**: You MUST create the Supabase storage bucket!

1. Go to https://supabase.com/dashboard/project/YOUR_PROJECT/storage/buckets
2. Click "New Bucket"
3. Name it `buildtrack-files`
4. Set to Private (or Public for easier testing)
5. Click "Create Bucket"

**Then test the fix!**

---

**Status**: ✅ Code Complete, ⚠️ Requires Supabase Setup  
**Priority**: 🚨 CRITICAL (blocks core functionality)  
**Impact**: Fixes photos not showing for assignees  
**Date**: October 30, 2025

