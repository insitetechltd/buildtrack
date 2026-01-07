# Activity Translations Needed for Chinese

This document lists all activity descriptions that are logged in the system and need Chinese translation.

## Activity Types

The following activity types are used in the system:
1. `creation` - Task creation
2. `assignment` - Task assignment
3. `status_change` - Status changes (accept, decline, etc.)
4. `progress_update` - Progress updates
5. `metadata_edit` - Task metadata edits
6. `review_submission` - Task submitted for review
7. `review_acceptance` - Task completion accepted
8. `review_rejection` - Task completion rejected
9. `cancellation` - Task cancelled/archived/deleted
10. `assigner_comment` - Assigner comments

## Activity Descriptions (English → Chinese Translation Needed)

### 1. Creation Activities
**Location:** `src/state/taskStore.supabase.ts:889`

- `"Task created by {creatorName}"`
  - Example: "Task created by John Smith"
  - **English:** "Task created by {creatorName}"
  - **Traditional Chinese (zh-TW):** "由 {creatorName} 建立的工作"

- `"Task accepted by {creatorName}"` (auto-accept when creator is assigned)
  - Example: "Task accepted by John Smith"
  - **English:** "Task accepted by {creatorName}"
  - **Traditional Chinese (zh-TW):** "由 {creatorName} 接受的工作"

### 2. Assignment Activities
**Location:** `src/state/taskStore.supabase.ts:1233-1235, 1641`

- `"Task assigned to {assigneesList} by {assignerName}"`
  - Example: "Task assigned to Alice, Bob by John Smith"
  - **English:** "Task assigned to {assigneesList} by {assignerName}"
  - **Traditional Chinese (zh-TW):** "由 {assignerName} 分配給 {assigneesList} 的工作"

- `"Task assignment updated by {assignerName}"`
  - Example: "Task assignment updated by John Smith"
  - **English:** "Task assignment updated by {assignerName}"
  - **Traditional Chinese (zh-TW):** "由 {assignerName} 更新的工作分配"

### 3. Status Change Activities
**Location:** `src/state/taskStore.supabase.ts:1702, 1764`

- `"Task accepted by {acceptingUser}"`
  - Example: "Task accepted by Alice"
  - **English:** "Task accepted by {acceptingUser}"
  - **Traditional Chinese (zh-TW):** "由 {acceptingUser} 接受的工作"

- `"Task declined by {decliningUser}. Reason: {reason}"`
  - Example: "Task declined by Alice. Reason: Too busy"
  - **English:** "Task declined by {decliningUser}. Reason: {reason}"
  - **Traditional Chinese (zh-TW):** "由 {decliningUser} 拒絕的工作。原因：{reason}"

### 4. Review Submission Activities
**Location:** `src/state/taskStore.supabase.ts:1841`

- `"Task submitted for review by {submittingUser}"`
  - Example: "Task submitted for review by Alice"
  - **English:** "Task submitted for review by {submittingUser}"
  - **Traditional Chinese (zh-TW):** "由 {submittingUser} 提交審核的工作"

### 5. Review Acceptance Activities
**Location:** `src/state/taskStore.supabase.ts:1891`

- `"Task completion accepted by {reviewerName}"`
  - Example: "Task completion accepted by John Smith"
  - **English:** "Task completion accepted by {reviewerName}"
  - **Traditional Chinese (zh-TW):** "由 {reviewerName} 接受的工作完成"

### 6. Review Rejection Activities
**Location:** `src/state/taskStore.supabase.ts:1944`

- `"Task completion rejected by {reviewerName}. Reason: {reason}"`
  - Example: "Task completion rejected by John Smith. Reason: Quality issues"
  - **English:** "Task completion rejected by {reviewerName}. Reason: {reason}"
  - **Traditional Chinese (zh-TW):** "由 {reviewerName} 拒絕的工作完成。原因：{reason}"

### 7. Cancellation Activities
**Location:** `src/state/taskStore.supabase.ts:1372, 1465`

- `"Task deleted by {deletingUser}"`
  - Example: "Task deleted by John Smith"
  - **English:** "Task deleted by {deletingUser}"
  - **Traditional Chinese (zh-TW):** "由 {deletingUser} 刪除的工作"

- `"Task cancelled by {cancellingUser}"`
  - Example: "Task cancelled by John Smith"
  - **English:** "Task cancelled by {cancellingUser}"
  - **Traditional Chinese (zh-TW):** "由 {cancellingUser} 取消的工作"

### 8. Archive Activities
**Location:** `src/state/taskStore.supabase.ts:1555`

- `"Task archived by {archivingUser}"`
  - Example: "Task archived by Alice"
  - **English:** "Task archived by {archivingUser}"
  - **Traditional Chinese (zh-TW):** "由 {archivingUser} 歸檔的工作"

### 9. Progress Update Activities
**Location:** `src/state/taskStore.supabase.ts:2044`

- Uses the `description` field from the update itself (user-provided text)
- **Note:** This is user-generated content, so it should be translated in the UI when displaying, not in the database

### 10. Assigner Comment Activities
**Location:** `src/state/taskStore.supabase.ts:2218`

- Uses the `description` field from the comment itself (user-provided text)
- **Note:** This is user-generated content, so it should be translated in the UI when displaying, not in the database

### 11. Metadata Edit Activities
**Location:** `src/state/taskStore.supabase.ts:2937`

- Uses dynamically generated descriptions based on what fields changed
- **Note:** The change descriptions are generated in `trackTaskEdit` method and may need translation

## Activity Type Display Names (UI)

**Location:** `src/screens/TaskDetailScreen.tsx:1639`, `src/screens/PhotoViewerScreen.tsx:214`

Activity types are displayed in the UI by replacing underscores with spaces:
- `creation` → "creation"
- `assignment` → "assignment"
- `status_change` → "status change"
- `progress_update` → "progress update"
- `metadata_edit` → "metadata edit"
- `review_submission` → "review submission"
- `review_acceptance` → "review acceptance"
- `review_rejection` → "review rejection"
- `cancellation` → "cancellation"
- `assigner_comment` → "assigner comment"

**Translation needed for display names:**
- `creation` → **English:** "creation" | **Traditional Chinese (zh-TW):** "建立"
- `assignment` → **English:** "assignment" | **Traditional Chinese (zh-TW):** "分配"
- `status_change` → **English:** "status change" | **Traditional Chinese (zh-TW):** "狀態變更"
- `progress_update` → **English:** "progress update" | **Traditional Chinese (zh-TW):** "進度更新"
- `metadata_edit` → **English:** "metadata edit" | **Traditional Chinese (zh-TW):** "元數據編輯"
- `review_submission` → **English:** "review submission" | **Traditional Chinese (zh-TW):** "提交審核"
- `review_acceptance` → **English:** "review acceptance" | **Traditional Chinese (zh-TW):** "審核通過"
- `review_rejection` → **English:** "review rejection" | **Traditional Chinese (zh-TW):** "審核拒絕"
- `cancellation` → **English:** "cancellation" | **Traditional Chinese (zh-TW):** "取消"
- `assigner_comment` → **English:** "assigner comment" | **Traditional Chinese (zh-TW):** "分配者評論"

## Additional Strings

### Status Change Reasons
**Location:** `src/state/taskStore.supabase.ts:906, 1689, 1751`

- `"Task auto-accepted by {creatorName}"` (in data.reason)
  - **English:** "Task auto-accepted by {creatorName}"
  - **Traditional Chinese (zh-TW):** "由 {creatorName} 自動接受的工作"

- `"Task accepted by {acceptingUser}"` (in data.reason)
  - **English:** "Task accepted by {acceptingUser}"
  - **Traditional Chinese (zh-TW):** "由 {acceptingUser} 接受的工作"

### Archive/Cancel Reasons
**Location:** `src/state/taskStore.supabase.ts:1371, 1452, 1554`

- `"Task deleted by {deletingUser}"` (in data.reason)
- `"Task cancelled by {cancellingUser}"` (in data.reason)
- `"Task archived by {archivingUser}"` (in data.reason)
  - **Note:** These are the same as the descriptions above

## Summary

All activity descriptions are currently stored in English in the database. To support Chinese translation, you need to:

1. **Add activity translations to translation files:**
   - Add an `activities` section to `src/locales/en.ts`
   - Add an `activities` section to `src/locales/zh-TW.ts` with Traditional Chinese translations

2. **Create a translation utility function** that:
   - Takes an English activity description
   - Extracts dynamic parts (user names, reasons, etc.)
   - Returns the translated version with dynamic parts preserved

3. **Update UI components** to use translations:
   - `src/screens/TaskDetailScreen.tsx` - When displaying activity descriptions
   - `src/screens/PhotoViewerScreen.tsx` - When displaying activity context
   - Translate activity type names when displaying them

## Implementation Notes

1. **Static Descriptions:** Most activity descriptions are generated in `taskStore.supabase.ts` and stored in the database. These need to be translated when displayed in the UI.

2. **User-Generated Content:** Progress updates and assigner comments contain user-provided text, which should be displayed as-is (users write in their preferred language).

3. **Dynamic Content:** Metadata edit descriptions are dynamically generated based on field changes. The change descriptions may need translation.

4. **Translation Strategy:**
   - Store English descriptions in the database (for consistency and debugging)
   - Translate descriptions when displaying in the UI based on user's language preference
   - Use a translation function that maps English patterns to Chinese translations
   - Handle dynamic user names and reasons in translations

## Files to Update for Translation

1. **Translation Files:**
   - `src/locales/en.ts` - Add `activities` section
   - `src/locales/zh-TW.ts` - Add `activities` section with Traditional Chinese translations

2. **Activity Description Translation:**
   - `src/screens/TaskDetailScreen.tsx` - Display activities (translate descriptions)
   - `src/screens/PhotoViewerScreen.tsx` - Display activity context (translate descriptions)
   - Create a translation utility function for activity descriptions

3. **Activity Type Display Names:**
   - `src/screens/TaskDetailScreen.tsx:1639` - Activity type label
   - `src/screens/PhotoViewerScreen.tsx:214` - Activity type label
   - Add translation mapping for activity type names in translation files

4. **Translation Utility:**
   - Create or update translation utility to handle activity descriptions
   - Map English patterns to Chinese translations
   - Handle dynamic user names in translations

