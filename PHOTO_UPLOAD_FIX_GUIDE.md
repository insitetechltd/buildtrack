# Photo Upload Fix Guide

## Issues Found

### 🔴 CRITICAL: Storage Bucket is Private

The `buildtrack-files` storage bucket is currently set to **PRIVATE**. This prevents photos from being accessible via public URLs on other devices.

**Impact**: Photos uploaded on one device cannot be viewed on another device because the URLs require authentication.

### 🔴 ISSUE: Photo URLs Not Being Saved

Task updates in the database show 0 photos even though photos are being uploaded.

## Step-by-Step Fix

### 1. Make Storage Bucket Public ⭐ CRITICAL

**Option A: Using Supabase Dashboard (Recommended)**

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Navigate to **Storage** in the left sidebar
4. Click on **buildtrack-files** bucket
5. Click **Settings** (gear icon)
6. Toggle **"Public bucket"** to **ON**
7. Click **Save**

**Option B: Using SQL**

Run this in Supabase SQL Editor:

```sql
-- Make buildtrack-files bucket public
UPDATE storage.buckets 
SET public = true 
WHERE name = 'buildtrack-files';
```

**Option C: Recreate Bucket as Public**

If the bucket is empty or you can backup files:

```sql
-- Delete old bucket (WARNING: Deletes all files!)
DELETE FROM storage.buckets WHERE name = 'buildtrack-files';

-- Create new public bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'buildtrack-files',
  'buildtrack-files', 
  true,  -- PUBLIC
  52428800,  -- 50MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'video/mp4']
);
```

### 2. Verify Storage Bucket Settings

Run the diagnostic script:

```bash
node scripts/diagnose-photo-upload.js
```

You should see:
```
✅ buildtrack-files bucket exists (PUBLIC)
```

### 3. Test Photo Upload

1. Open the BuildTrack app
2. Go to any task
3. Click "Update Progress"
4. Take or select a photo
5. Watch the console logs for:
   ```
   📤 [File Upload] Starting upload for ...
   ✅ [File Upload] File uploaded successfully
   🔗 [File Upload] Public URL generated
   ```
6. Submit the update

### 4. Verify Photos Are Saved to Database

Run the check script:

```bash
node scripts/check-photo-data.js
```

You should see updates with photos listed.

### 5. Test Cross-Device Viewing

1. **Device 1**: Upload a photo to a task update
2. **Device 2**: Pull to refresh the task list
3. **Device 2**: Open the same task
4. **Device 2**: You should see the photo in the task updates

### 6. Check Photo Accessibility

If photos still don't show, test if the URLs are accessible:

```bash
# Get a photo URL from the database
node scripts/check-photo-data.js

# Copy one of the URLs and test in browser or curl:
curl -I "https://YOUR_SUPABASE_URL/storage/v1/object/public/buildtrack-files/..."
```

You should get `HTTP/1.1 200 OK`

## Common Issues and Solutions

### Issue: "Photos array is empty in database"

**Cause**: The photo URLs are not being passed to `addTaskUpdate()`

**Solution**: Check the upload flow in TaskDetailScreen.tsx:
- After upload, URLs should be added to `updateForm.photos`
- When submitting, `updateForm.photos` should be passed to `addTaskUpdate()`

**Debug**:
```javascript
// In handleSubmitUpdate, add logging:
console.log('📸 Photos being submitted:', updateForm.photos);
```

### Issue: "Photos return 403 Forbidden"

**Cause**: Bucket is still private or RLS policies are blocking access

**Solution**: 
1. Verify bucket is public (see Step 1)
2. Check RLS policies don't block public access to files

### Issue: "Photos return 404 Not Found"

**Cause**: Files weren't actually uploaded to storage

**Solution**:
1. Check for upload errors in console
2. Verify file sizes are under 50MB
3. Check network connectivity during upload

### Issue: "Photos show on same device but not others"

**Cause**: 
- Bucket is private (URLs require authentication)
- Other devices aren't fetching latest data
- Photos array is empty in database

**Solution**:
1. Make bucket public (Step 1)
2. Pull to refresh on other devices
3. Check photos are in database (Step 4)

## Verification Checklist

After completing the fixes, verify:

- [ ] Storage bucket is PUBLIC
- [ ] Photos can be uploaded without errors
- [ ] Photo URLs are saved to task_updates.photos array
- [ ] Photo URLs return 200 OK when accessed
- [ ] Photos appear in task updates on same device
- [ ] Photos appear in task updates on different devices
- [ ] Photos persist after app restart

## Support

If issues persist after following this guide:

1. Run diagnostic: `node scripts/diagnose-photo-upload.js`
2. Check photo data: `node scripts/check-photo-data.js`
3. Check console logs for errors
4. Verify network connectivity
5. Check Supabase dashboard for storage usage and errors

## Architecture Notes

**Current Flow**:
1. User selects/takes photo
2. Photo is compressed (if needed)
3. Photo is uploaded to Supabase Storage (`buildtrack-files` bucket)
4. Public URL is returned
5. URL is added to `updateForm.photos` array
6. When update is submitted, photos array is saved to `task_updates.photos`
7. When other clients fetch task updates, they get the photos array
8. Images are rendered using the public URLs

**Why Public Bucket is Critical**:
- Private buckets require authentication for every file access
- Mobile apps can't easily manage storage-specific auth tokens
- Public buckets allow direct image loading in `<Image>` components
- RLS policies on the `task_updates` table still control who can see which task updates

