 # Testing Supabase File Upload Functionality

## Overview

I've added a diagnostic test function to the Developer Settings screen that will help you identify and fix issues with Supabase file uploads.

## How to Use

1. **Open the Developer Settings screen** in your app
2. **Navigate to the "Debug Tools" section**
3. **Tap "Test File Upload"**
4. **Review the test results** in the alert dialog

## What the Test Checks

The test performs the following checks:

1. ✅ **Supabase Connection**: Verifies that the Supabase client is initialized
2. ✅ **User Session**: Checks if you're logged in (required for uploads)
3. ✅ **Storage Bucket**: Verifies that the `buildtrack-files` bucket exists
4. ✅ **Upload Test**: Attempts to upload a small test file
5. ✅ **URL Generation**: Tests public URL generation
6. ✅ **Verification**: Verifies the uploaded file is accessible
7. ✅ **Cleanup**: Removes the test file after testing

## Common Issues and Solutions

### Issue: "Bucket 'buildtrack-files' not found"

**Solution**: Create the bucket in Supabase Dashboard:
1. Go to your Supabase project dashboard
2. Navigate to **Storage** → **Buckets**
3. Click **"New bucket"**
4. Name: `buildtrack-files`
5. Public: **Yes** (check this box)
6. Click **"Create bucket"**

### Issue: "new row violates row-level security" or "RLS" error

**Solution**: Create storage policies in Supabase:
1. Go to **Storage** → **Policies** (or click on the `buildtrack-files` bucket → **Policies**)
2. Click **"New Policy"**
3. Policy name: `Allow authenticated uploads`
4. Policy definition:
   - **INSERT**: `auth.role() = 'authenticated'`
   - **SELECT**: `auth.role() = 'authenticated'`
   - **UPDATE**: `auth.role() = 'authenticated'`
   - **DELETE**: `auth.role() = 'authenticated'`
5. Click **"Save"**

### Issue: "Permission denied" or "Forbidden"

**Solution**: This usually means:
1. The bucket is not public, OR
2. Storage policies are not configured correctly

**Fix**:
- Make sure the bucket is set to **Public** in bucket settings
- Ensure storage policies allow authenticated users (see above)

### Issue: "No active session found"

**Solution**: You must be logged in to upload files. Make sure you're authenticated in the app.

## Testing in the App

After running the test, you'll see a detailed report showing:
- ✅ What's working
- ❌ What's failing
- 💡 Suggestions for fixing issues

The test creates a temporary file, uploads it, verifies it, and then cleans it up automatically.

## Next Steps

If the test passes, your upload functionality should be working. If it fails, follow the suggestions in the test results to fix the configuration issues.

## Manual Testing

You can also test uploads manually by:
1. Taking a photo in the app
2. Uploading it to a task
3. Checking if it appears in Supabase Storage

If manual uploads fail, check the console logs for detailed error messages.

