# Release Notes - Version 1.1.3

**Release Date**: November 12, 2025  
**Build Type**: OTA Update via EAS  
**Branch**: production  
**Runtime Version**: 1.0.0

## 🐛 Bug Fixes

### Critical: Accept Task Error Fixed
Fixed a critical bug that prevented users from accepting tasks. When users tried to accept a task, they would see an error message "Failed to accept task. Please try again." and the task would temporarily disappear from the list.

**Root Causes:**
1. **Missing Import**: The `fetchTasks` function was being called but not imported in `TaskDetailScreen.tsx`
2. **Missing Database Field Mappings**: The `acceptedBy` and `acceptedAt` fields were not being mapped to their database column names (`accepted_by` and `accepted_at`), causing the Supabase update to fail

**Impact:**
- Tasks can now be accepted successfully
- The `accepted_by` and `accepted_at` audit fields are properly saved to the database
- Users can track who accepted tasks and when
- Task acceptance workflow is fully functional

**Files Modified:**
- `src/screens/TaskDetailScreen.tsx` - Added missing `fetchTasks` import
- `src/state/taskStore.supabase.ts` - Added `accepted_by` and `accepted_at` field mappings

## 📦 Deployment Details

**Update IDs:**
- Android: `48dffd79-271c-40ca-a86c-3c6ea20045fc`
- iOS: `bfbf6343-cd8a-4d50-b9d1-c35b2985c707`
- Update Group: `5c3e20cb-7f9c-4200-9424-950e9893d9ee`

**Git Commit:** `aa0a9a068a09fe5374fc8dd49adc2cf5e25f2a12`

**EAS Dashboard:**  
https://expo.dev/accounts/insitetech/projects/buildtrack/updates/5c3e20cb-7f9c-4200-9424-950e9893d9ee

## 📱 User Impact

Users will receive this update automatically when they open the app (if they have an active internet connection). The update includes:
- ✅ Ability to accept tasks without errors
- ✅ Proper tracking of task acceptance (who and when)
- ✅ Improved reliability of the task management workflow

## 🔍 Testing Recommendations

After the update is deployed, verify:
1. Tasks can be accepted without errors
2. Accepted tasks move to the WIP section
3. The `accepted_by` and `accepted_at` fields are populated in the database
4. Task list refreshes correctly after acceptance

## 📚 Documentation

Detailed technical documentation of this fix can be found in:
- `ACCEPT_TASK_ERROR_FIX.md` - Comprehensive explanation of the bug and solution

## 🎯 Next Steps

Monitor user feedback and verify that:
- No more "Failed to accept task" errors are reported
- Task acceptance workflow is working smoothly
- Database audit fields are being populated correctly

