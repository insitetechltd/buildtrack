# ✅ File Upload Implementation Checklist

**Project:** BuildTrack File Upload System  
**Date Started:** _____________  
**Expected Completion:** 7-10 days  
**Status:** 🔴 Not Started

---

## 📋 Pre-Implementation

- [ ] Review `FILE_UPLOAD_IMPLEMENTATION_PLAN.md`
- [ ] Review `FILE_UPLOAD_QUICK_REFERENCE.md`
- [ ] Backup current database
- [ ] Ensure Supabase credentials are in `.env`
- [ ] Test current app functionality
- [ ] Create feature branch: `git checkout -b feature/file-upload`

---

## Phase 1: Database & Storage Setup ⚡ HIGH PRIORITY

**Estimated Time:** 2-3 days  
**Status:** 🔴 Not Started

### Database Migration
- [ ] Open Supabase Dashboard → SQL Editor
- [ ] Copy contents of `scripts/file-attachments-migration.sql`
- [ ] Run migration script
- [ ] Verify table created: `SELECT * FROM file_attachments LIMIT 1;`
- [ ] Verify indexes created (check output)
- [ ] Verify RLS enabled: `SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'file_attachments';`
- [ ] Verify policies created: `SELECT policyname FROM pg_policies WHERE tablename = 'file_attachments';`
- [ ] Test validation trigger with invalid file:
  ```sql
  -- Should fail with file size error
  INSERT INTO file_attachments (
    file_name, file_type, file_size, mime_type, 
    storage_path, public_url, entity_type, entity_id,
    uploaded_by, company_id
  ) VALUES (
    'test.jpg', 'image', 999999999, 'image/jpeg',
    '/test/path', 'http://example.com/test.jpg',
    'task', '00000000-0000-0000-0000-000000000000',
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-0000-0000-000000000000'
  );
  ```
- [ ] Screenshot/save verification output

### Storage Buckets
- [ ] Open Supabase Dashboard → Storage
- [ ] Create bucket: `buildtrack-files`
  - [ ] Name: `buildtrack-files`
  - [ ] Public: **NO**
  - [ ] File size limit: 50000000 (50MB)
  - [ ] Allowed MIME types: Leave empty (validated by trigger)
- [ ] Create bucket: `buildtrack-public`
  - [ ] Name: `buildtrack-public`
  - [ ] Public: **YES**
  - [ ] File size limit: 10000000 (10MB)
- [ ] Screenshot both buckets

### Storage Policies
- [ ] Open Supabase Dashboard → SQL Editor
- [ ] Copy contents of `scripts/file-storage-policies.sql`
- [ ] Run storage policies script
- [ ] Verify policies in Dashboard → Storage → Policies
- [ ] Screenshot policies for buildtrack-files
- [ ] Screenshot policies for buildtrack-public

### Manual Testing (Database)
- [ ] Test query as authenticated user:
  ```sql
  SELECT auth.uid(), auth.role();
  ```
- [ ] Test file statistics function:
  ```sql
  SELECT * FROM get_file_statistics('your-company-id');
  ```
- [ ] Test cleanup function (don't actually run):
  ```sql
  SELECT cleanup_deleted_files(30);
  ```

**Phase 1 Complete:** [ ]  
**Date Completed:** _____________

---

## Phase 2: Backend Services ⚡ HIGH PRIORITY

**Estimated Time:** 2-3 days  
**Status:** 🔴 Not Started

### Create Service Files
- [ ] Create `src/api/fileUploadService.ts`
- [ ] Copy implementation from plan document
- [ ] Add TypeScript types
- [ ] Implement `uploadFile` function
- [ ] Implement `getFilesForEntity` function
- [ ] Implement `deleteFile` function
- [ ] Implement `permanentlyDeleteFile` function
- [ ] Implement helper functions:
  - [ ] `getFileType`
  - [ ] `formatFileSize`
  - [ ] `getFileIcon`

### Create Upload Hook
- [ ] Create `src/utils/useFileUpload.ts`
- [ ] Copy implementation from plan document
- [ ] Implement `pickAndUploadImages` function
- [ ] Implement `pickAndUploadDocuments` function
- [ ] Add loading states
- [ ] Add progress tracking
- [ ] Add error handling

### Test Services (Unit Testing)
- [ ] Test `uploadFile` with image
- [ ] Test `uploadFile` with document
- [ ] Test `uploadFile` with invalid file type (should fail)
- [ ] Test `uploadFile` with oversized file (should fail)
- [ ] Test `getFilesForEntity` returns correct files
- [ ] Test `deleteFile` soft deletes
- [ ] Test `permanentlyDeleteFile` removes from storage
- [ ] Test `formatFileSize` with various sizes
- [ ] Test `getFileIcon` with various MIME types

### Error Handling
- [ ] Add try-catch blocks to all functions
- [ ] Add proper error messages
- [ ] Add network error handling
- [ ] Add timeout handling
- [ ] Add retry logic for failed uploads

**Phase 2 Complete:** [ ]  
**Date Completed:** _____________

---

## Phase 3: Frontend Components 🔶 MEDIUM PRIORITY

**Estimated Time:** 1-2 days  
**Status:** 🔴 Not Started

### File Preview Component
- [ ] Create `src/components/FileAttachmentPreview.tsx`
- [ ] Copy implementation from plan document
- [ ] Style component with Tailwind
- [ ] Add image preview
- [ ] Add document icon
- [ ] Add file size display
- [ ] Add delete button
- [ ] Add press handler for viewing

### File Gallery Component (Optional)
- [ ] Create `src/components/FileGallery.tsx`
- [ ] Implement horizontal scroll view
- [ ] Add empty state
- [ ] Add loading state
- [ ] Add error state

### Upload Button Component (Optional)
- [ ] Create `src/components/UploadButton.tsx`
- [ ] Add camera/gallery/document options
- [ ] Add progress indicator
- [ ] Add loading spinner
- [ ] Style with Tailwind

### Test Components
- [ ] Test FileAttachmentPreview with image
- [ ] Test FileAttachmentPreview with document
- [ ] Test delete button
- [ ] Test press handler
- [ ] Test with missing/broken URLs
- [ ] Screenshot components for documentation

**Phase 3 Complete:** [ ]  
**Date Completed:** _____________

---

## Phase 4: Screen Integration 🔶 MEDIUM PRIORITY

**Estimated Time:** 2-3 days  
**Status:** 🔴 Not Started

### CreateTaskScreen Integration
- [ ] Open `src/screens/CreateTaskScreen.tsx`
- [ ] Import `useFileUpload` hook
- [ ] Import `FileAttachmentPreview` component
- [ ] Replace mock file picker with real upload
- [ ] Update state to store `FileAttachment[]` instead of URIs
- [ ] Update form submission to include file IDs
- [ ] Add loading indicator during upload
- [ ] Add error handling
- [ ] Test creating task with attachments
- [ ] Test creating task without attachments

### TaskDetailScreen Integration
- [ ] Open `src/screens/TaskDetailScreen.tsx`
- [ ] Import `useFileUpload` hook
- [ ] Import `getFilesForEntity` function
- [ ] Fetch files on component mount
- [ ] Display existing attachments
- [ ] Add "Add Photos" button using new upload
- [ ] Update task updates to include file uploads
- [ ] Add delete file functionality
- [ ] Add view file functionality
- [ ] Test viewing task with attachments
- [ ] Test adding photos to task update
- [ ] Test deleting attachments

### AdminDashboardScreen Integration
- [ ] Open `src/screens/AdminDashboardScreen.tsx`
- [ ] Update banner image upload to use new system
- [ ] Update company logo upload to use new system
- [ ] Use `buildtrack-public` bucket for public assets
- [ ] Test banner upload
- [ ] Test logo upload
- [ ] Test banner display
- [ ] Test logo display

### Update Task Store
- [ ] Open `src/state/taskStore.ts`
- [ ] Add `addAttachmentToTask` method
- [ ] Add `removeAttachmentFromTask` method
- [ ] Add `getTaskAttachments` method
- [ ] Update `createTask` to handle file attachments
- [ ] Update `updateTask` to handle file attachments
- [ ] Test all store methods

**Phase 4 Complete:** [ ]  
**Date Completed:** _____________

---

## Phase 5: Additional Features 🟡 LOW PRIORITY

**Estimated Time:** 1-2 days  
**Status:** 🔴 Not Started

### Image Viewer
- [ ] Install image viewer library (optional)
- [ ] Create image viewer modal
- [ ] Add zoom functionality
- [ ] Add swipe between images
- [ ] Test image viewer

### Document Viewer
- [ ] Research document viewer options
- [ ] Implement PDF viewer
- [ ] Add download functionality
- [ ] Test document viewer

### Bulk Upload
- [ ] Add select all functionality
- [ ] Add progress for multiple files
- [ ] Add cancel functionality
- [ ] Test bulk upload

### File Search & Filtering
- [ ] Add search by filename
- [ ] Add filter by file type
- [ ] Add filter by date
- [ ] Add sort options
- [ ] Test search and filters

### File Tagging
- [ ] Add tag input UI
- [ ] Update upload to include tags
- [ ] Add tag filtering
- [ ] Test tagging system

**Phase 5 Complete:** [ ]  
**Date Completed:** _____________

---

## Phase 6: Optimization 🟡 LOW PRIORITY

**Estimated Time:** 1-2 days  
**Status:** 🔴 Not Started

### Image Compression
- [ ] Install `expo-image-manipulator`
- [ ] Implement compression before upload
- [ ] Configure compression settings (quality: 0.7)
- [ ] Resize large images (max width: 1920px)
- [ ] Test compression quality vs size
- [ ] Verify images look good after compression

### Thumbnail Generation
- [ ] Create thumbnail on upload
- [ ] Store thumbnail URL in database
- [ ] Use thumbnails for previews
- [ ] Load full image on demand
- [ ] Test thumbnail system

### Lazy Loading
- [ ] Implement pagination for file lists
- [ ] Add infinite scroll
- [ ] Load thumbnails first, then full images
- [ ] Test with many files (50+)

### Caching
- [ ] Implement file URL caching
- [ ] Cache downloaded files locally
- [ ] Add cache expiration
- [ ] Test cache hit rate

### Storage Optimization
- [ ] Set up lifecycle policies
- [ ] Archive old files (optional)
- [ ] Implement file compression
- [ ] Monitor storage usage

**Phase 6 Complete:** [ ]  
**Date Completed:** _____________

---

## Phase 7: Polish & Production 🔶 MEDIUM PRIORITY

**Estimated Time:** 1-2 days  
**Status:** 🔴 Not Started

### Error Handling
- [ ] Add user-friendly error messages
- [ ] Handle network errors
- [ ] Handle permission errors
- [ ] Handle quota exceeded errors
- [ ] Add retry mechanism
- [ ] Test all error scenarios

### Upload Retry
- [ ] Implement automatic retry (max 3 attempts)
- [ ] Add exponential backoff
- [ ] Show retry status to user
- [ ] Test retry mechanism

### Offline Queue (Advanced)
- [ ] Detect offline state
- [ ] Queue uploads in AsyncStorage
- [ ] Retry when online
- [ ] Show queue status
- [ ] Test offline uploads

### Analytics
- [ ] Track upload attempts
- [ ] Track upload success rate
- [ ] Track file sizes
- [ ] Track file types
- [ ] Create usage dashboard

### Admin Panel
- [ ] Create file management screen
- [ ] Add bulk delete
- [ ] Add storage statistics
- [ ] Add usage reports
- [ ] Test admin features

### Documentation
- [ ] Update README with file upload docs
- [ ] Create user guide
- [ ] Create admin guide
- [ ] Document API endpoints
- [ ] Add code comments

**Phase 7 Complete:** [ ]  
**Date Completed:** _____________

---

## Testing & Quality Assurance

**Estimated Time:** 2-3 days  
**Status:** 🔴 Not Started

### Functional Testing
- [ ] Upload image from camera (iOS)
- [ ] Upload image from camera (Android)
- [ ] Upload image from gallery (iOS)
- [ ] Upload image from gallery (Android)
- [ ] Upload multiple images
- [ ] Upload PDF document
- [ ] Upload Word document
- [ ] Upload Excel document
- [ ] Upload text file
- [ ] View uploaded files
- [ ] Delete uploaded file
- [ ] Download file
- [ ] Share file (optional)

### Performance Testing
- [ ] Upload 1MB image - record time
- [ ] Upload 10MB image - record time
- [ ] Upload 50MB file - record time
- [ ] Upload on slow network (3G simulation)
- [ ] Upload 10 files simultaneously
- [ ] Load screen with 50+ files
- [ ] Scroll through 100+ files
- [ ] Test memory usage during uploads
- [ ] Test battery impact

### Security Testing
- [ ] Try accessing another company's files
- [ ] Try uploading to another company's folder
- [ ] Try deleting another user's file
- [ ] Try uploading oversized file (should fail)
- [ ] Try uploading invalid file type (should fail)
- [ ] Try uploading without authentication (should fail)
- [ ] Verify RLS policies work correctly
- [ ] Test JWT token expiration handling

### Edge Cases
- [ ] Upload with no internet connection
- [ ] Upload while app is backgrounded
- [ ] Upload with low storage space
- [ ] Upload with low battery
- [ ] Upload with app kill during upload
- [ ] Upload file with special characters in name
- [ ] Upload file with very long name
- [ ] Upload file with no extension
- [ ] Upload same file twice (duplicate)
- [ ] Delete file that doesn't exist

### Cross-Platform Testing
- [ ] Test on iOS Simulator
- [ ] Test on iOS Device
- [ ] Test on Android Emulator
- [ ] Test on Android Device
- [ ] Test on different iOS versions
- [ ] Test on different Android versions
- [ ] Test on different screen sizes

### Regression Testing
- [ ] All existing features still work
- [ ] Task creation still works
- [ ] Task updates still work
- [ ] Project creation still works
- [ ] User management still works
- [ ] No new console errors
- [ ] No performance degradation

**Testing Complete:** [ ]  
**Date Completed:** _____________

---

## Deployment & Monitoring

**Status:** 🔴 Not Started

### Pre-Deployment
- [ ] Code review completed
- [ ] All tests passing
- [ ] Documentation updated
- [ ] Changelog updated
- [ ] Version bumped
- [ ] Build succeeds on CI/CD

### Deployment Steps
- [ ] Merge feature branch to main
- [ ] Push to repository
- [ ] Publish EAS Update: `npx eas-cli update --branch main`
- [ ] Verify update appears in EAS Dashboard
- [ ] Test on development device
- [ ] Monitor Sentry for errors

### Post-Deployment Monitoring
- [ ] Monitor Supabase Storage usage (Day 1)
- [ ] Monitor Supabase Storage usage (Day 7)
- [ ] Monitor Supabase Storage usage (Day 30)
- [ ] Check for error logs
- [ ] Check user feedback
- [ ] Monitor upload success rate
- [ ] Monitor average upload time
- [ ] Check storage costs

### User Communication
- [ ] Announce new feature to users
- [ ] Create tutorial/guide
- [ ] Update in-app help
- [ ] Monitor support requests

**Deployment Complete:** [ ]  
**Date Completed:** _____________

---

## Rollback Plan (If Needed)

- [ ] Revert database migration:
  ```sql
  DROP TABLE IF EXISTS file_attachments CASCADE;
  ```
- [ ] Delete storage buckets in Supabase Dashboard
- [ ] Revert code changes: `git revert <commit-hash>`
- [ ] Publish rollback update
- [ ] Communicate to users
- [ ] Document issues for future reference

---

## Success Metrics

### Technical Metrics
- [ ] Upload success rate > 95%
- [ ] Average upload time < 10 seconds (for 5MB file)
- [ ] Zero security vulnerabilities
- [ ] Storage usage within budget
- [ ] No performance degradation

### User Metrics
- [ ] File upload feature adopted by > 50% of users
- [ ] Average 5+ files uploaded per project
- [ ] Less than 5 support tickets related to file uploads
- [ ] Positive user feedback (> 4 stars)

---

## Notes & Issues

### Blockers
_Document any blockers here_

### Decisions Made
_Document key decisions here_

### Lessons Learned
_Document lessons learned here_

---

## Sign-Off

**Developer:** _______________ Date: ___________  
**Reviewer:** _______________ Date: ___________  
**QA:** _______________ Date: ___________  
**Product Owner:** _______________ Date: ___________

---

## Appendix: Quick Commands

### Database Queries
```sql
-- Check table
SELECT * FROM file_attachments LIMIT 10;

-- Check storage usage
SELECT * FROM get_file_statistics('company-id');

-- Check recent uploads
SELECT file_name, created_at FROM file_attachments ORDER BY created_at DESC LIMIT 10;

-- Cleanup old deleted files
SELECT cleanup_deleted_files(30);
```

### Supabase CLI
```bash
# List buckets
supabase storage list

# Check policies
supabase storage policies list buildtrack-files
```

### Testing Commands
```bash
# Run app
npx expo start

# Clear cache
npx expo start -c

# Test on iOS
npx expo run:ios

# Test on Android
npx expo run:android
```

---

**Last Updated:** October 23, 2025  
**Version:** 1.0  
**Status:** Ready for Implementation ✅

