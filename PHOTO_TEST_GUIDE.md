# 📸 Photo Upload/Download Test Guide

## ✅ Automated Tests: PASSED

All backend tests have passed successfully:

- ✅ Storage bucket is PUBLIC
- ✅ Photos can be uploaded to Supabase
- ✅ Public URLs are generated correctly
- ✅ Photos are accessible from public internet
- ✅ Photos can be downloaded without authentication
- ✅ Cross-device compatibility is ready

**Test URL Example:**
```
https://your-project-id.supabase.co/storage/v1/object/public/buildtrack-files/...
```

---

## 📱 Manual App Testing Required

Now you need to test the actual app to ensure photos work end-to-end.

### Test 1: Single Device Photo Upload ✓

**Objective**: Verify photos upload correctly and display

**Steps**:
1. Open the BuildTrack app
2. Navigate to any task
3. Click the **FAB camera button** (floating button, bottom right)
4. Select "Take Photo" or "Choose from Library"
5. Select/take a photo
6. **Watch the console logs** - should see:
   ```
   📸 [Task Detail FAB] Taking photo from camera...
   🔄 Compressing image 1/1...
   ✅ Image 1 compressed
   📤 [File Upload] Starting upload for photo.jpg
   ✅ [File Upload] File uploaded successfully
   🔗 [File Upload] Public URL generated
   🎉 [File Upload] Complete! File available at: https://...
   ✅ [Task Detail FAB] 1 photo(s) uploaded and ready
   ```
7. Add a description (e.g., "Testing photo upload")
8. Submit the update
9. **Verify**: Photo appears in the task update

**Expected Result**: ✅ Photo uploads and displays

---

### Test 2: Verify Supabase URL (Critical) ✓

**Objective**: Confirm photos are using Supabase URLs, not local paths

**Steps**:
1. After uploading a photo (from Test 1)
2. Run this command in terminal:
   ```bash
   node scripts/check-photo-data.js | head -30
   ```
3. Look for the most recent update
4. **Check the URL format**

**Expected Result**:
```
✅ Update xxx... HAS 1 photo(s):
   1. https://your-project-id.supabase.co/storage/v1/object/public/buildtrack-files/...
```

**FAIL** if you see:
```
❌ file:///var/mobile/Containers/...
```

---

### Test 3: Cross-Device Visibility (Most Important) ✓

**Objective**: Verify photos sync across devices

**Prerequisites**: 
- Two devices OR one device + web browser
- Same user account on both

**Steps**:

#### Device A (Upload):
1. Open BuildTrack app
2. Go to a task
3. Click FAB camera button
4. Upload a new photo
5. Add description: "Cross-device test photo"
6. Submit the update
7. **Note the task name/ID**

#### Device B (View):
1. Open BuildTrack app (or refresh if already open)
2. Pull to refresh the task list
3. Navigate to the **same task**
4. Open the task details
5. **Check if the photo is visible**

**Expected Result**: ✅ Photo is visible on Device B

**If photo NOT visible**:
- Check Device B has network connection
- Try force-closing and reopening app
- Check console logs on Device B for errors
- Run `node scripts/diagnose-photo-upload.js` to verify bucket is still public

---

### Test 4: Photo Accessibility Test ✓

**Objective**: Verify photo URLs work in any browser

**Steps**:
1. After uploading a photo, run:
   ```bash
   node scripts/check-photo-data.js
   ```
2. Copy one of the `https://` URLs
3. Paste it into a **different browser** (or incognito mode)
4. Press Enter

**Expected Result**: ✅ Photo loads in the browser

**FAIL** if you get:
- 403 Forbidden → Bucket might not be fully public
- 404 Not Found → Photo wasn't actually uploaded
- Network error → URL is malformed

---

### Test 5: Multiple Photos Upload ✓

**Objective**: Test uploading multiple photos at once

**Steps**:
1. Open a task
2. Click FAB camera button
3. Select "Choose from Library"
4. **Select 3-5 photos**
5. Wait for upload (watch console logs)
6. Add description
7. Submit update

**Expected Result**: 
- ✅ All photos upload successfully
- ✅ All photos display in the update
- ✅ Console shows success for each photo

---

### Test 6: Photo Compression Test ✓

**Objective**: Verify large photos are compressed

**Steps**:
1. Find a large photo (>5MB) on your device
2. Upload it via the app
3. **Watch console logs** for compression:
   ```
   🔄 Compressing image 1/1...
   ✅ Image 1 compressed: original: 8.5MB, compressed: 3.2MB, savings: 62.4%
   ```
4. Submit the update

**Expected Result**: 
- ✅ Photo is compressed to <5MB
- ✅ Photo uploads successfully
- ✅ Quality is still acceptable

---

### Test 7: Offline Behavior Test ✓

**Objective**: Verify graceful failure when offline

**Steps**:
1. Turn on **Airplane Mode**
2. Try to upload a photo
3. Observe the behavior

**Expected Result**: 
- ❌ Upload fails gracefully
- ✅ Error message shown
- ✅ App doesn't crash
- ✅ Failed upload can be retried later

---

### Test 8: Old Photos Still Visible ✓

**Objective**: Verify old photos with local paths still display on original device

**Steps**:
1. Find a task with **old photos** (uploaded before the fix)
2. Open the task on the **same device** that uploaded them
3. Check if photos are visible

**Expected Result**: 
- ✅ Old photos still visible on original device
- ⚠️ Old photos NOT visible on other devices (this is expected)

**Note**: Only NEW photos (after the fix) will sync across devices.

---

## 🔍 Debugging Failed Tests

### Console Logs to Check

Look for these log prefixes:
- `📸` - Photo picker opened
- `🔄` - Compression in progress
- `📤` - Upload started
- `✅` - Success
- `❌` - Error
- `⚠️` - Warning

### Common Issues

| Issue | Likely Cause | Solution |
|-------|-------------|----------|
| Upload fails | Network issue | Check internet connection |
| 403 Forbidden | Bucket not public | Re-run public SQL command |
| Local paths saved | Using old code | Check code was updated correctly |
| Photo not on Device B | Not refreshed | Pull to refresh on Device B |
| Compression fails | Image too large/corrupt | Try different image |

---

## 📊 Test Results Template

Use this to track your test results:

```
PHOTO UPLOAD/DOWNLOAD TEST RESULTS
===================================

Date: _____________
Tester: _____________

Test 1: Single Device Upload         [ ] PASS  [ ] FAIL
Test 2: Supabase URL Verification    [ ] PASS  [ ] FAIL
Test 3: Cross-Device Visibility      [ ] PASS  [ ] FAIL
Test 4: Photo Accessibility          [ ] PASS  [ ] FAIL
Test 5: Multiple Photos Upload       [ ] PASS  [ ] FAIL
Test 6: Photo Compression            [ ] PASS  [ ] FAIL
Test 7: Offline Behavior             [ ] PASS  [ ] FAIL
Test 8: Old Photos Visibility        [ ] PASS  [ ] FAIL

Overall: [ ] ALL PASS  [ ] SOME FAIL

Notes:
_____________________________________________________________
_____________________________________________________________
_____________________________________________________________
```

---

## ✅ Success Criteria

All tests should pass with these results:
- ✅ Photos upload to Supabase Storage
- ✅ URLs start with `https://` (not `file://`)
- ✅ Photos visible on all devices
- ✅ Photos accessible in browser
- ✅ Multiple photos work
- ✅ Large photos are compressed
- ✅ Offline fails gracefully

---

## 🆘 If Tests Fail

### Step 1: Check Bucket Status
```bash
node scripts/diagnose-photo-upload.js
```
Should show: `buildtrack-files bucket exists (PUBLIC)`

### Step 2: Check Recent URLs
```bash
node scripts/check-photo-data.js
```
Should show `https://` URLs for new uploads

### Step 3: Re-run Automated Tests
```bash
node scripts/test-photo-upload-download.js
```
Should pass all tests

### Step 4: Check Code
Verify `TaskDetailScreen.tsx` is using `pickAndUploadImages()` for both:
- Modal "Add Photos" button (line 367)
- FAB camera button (line 1803)

### Step 5: Get Help
If tests still fail:
1. Copy console logs
2. Note which test failed
3. Check error messages
4. Review the documentation files

---

## 🎉 After All Tests Pass

Once all tests pass:
1. ✅ Photo upload/download is fully working
2. ✅ Cross-device sync is operational
3. ✅ Ready for production use

Next steps:
- Start using photos in real tasks
- Monitor for any issues
- Consider cleaning up old local-path photos (optional)

---

## 📝 Quick Test Command

For a quick verification, run:
```bash
# Check bucket is public
node scripts/diagnose-photo-upload.js | grep -A1 "buildtrack-files"

# Run automated test
node scripts/test-photo-upload-download.js

# Check recent uploads
node scripts/check-photo-data.js | head -20
```

All should show success! ✅
