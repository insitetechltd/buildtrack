# Billing Status Feature Implementation

## Overview
Added a billing status picker to the task creation/editing screen that allows users to select:
- **Non-Billable**: Task is not billable (default)
- **Billable**: Task is billable to the client
- **Billed**: Task has been billed

## Changes Made

### 1. Type Definitions (`src/types/buildtrack.ts`)
- Added `BillingStatus` type: `"billable" | "non_billable" | "billed"`
- Added `billingStatus?: BillingStatus` field to `Task` interface (defaults to `"non_billable"`)

### 2. UI Components (`src/screens/CreateTaskScreen.tsx`)
- Added billing status picker below the Task Reference field
- Added modal with 3 options: Non-Billable (default), Billable, Billed
- Label shows "Billing Status" (removed "Optional" wording)
- Defaults to "Non-Billable" for all new tasks
- Integrated with form data and submission logic
- Added proper state management and handlers

### 3. Database Schema (`ADD_BILLING_STATUS_MIGRATION.sql`)
- Created migration SQL to add `billing_status` column to `tasks` table
- Column type: `TEXT` with CHECK constraint
- NOT NULL with default value: `'non_billable'`
- Values: `'billable'`, `'non_billable'`, or `'billed'`
- Existing tasks are updated to `'non_billable'` if NULL

### 4. Data Layer (`src/state/taskStore.supabase.ts`)
- Updated `fetchTasks()` to include `billingStatus` in transformed tasks
- Updated `fetchTaskById()` to include `billingStatus`
- Updated `createTask()` to save `billing_status` to database
- Updated `createSubTask()` to save `billing_status` to database
- Updated `createNestedSubTask()` to save `billing_status` to database
- Updated `updateTask()` to handle `billingStatus` updates
- Updated `updateSubTask()` to handle `billingStatus` updates

## Database Migration

### To Apply the Migration:

1. **Via Supabase Dashboard:**
   - Go to SQL Editor
   - Copy and paste the contents of `ADD_BILLING_STATUS_MIGRATION.sql`
   - Run the query

2. **Via Supabase CLI:**
   ```bash
   supabase db execute --file ADD_BILLING_STATUS_MIGRATION.sql
   ```

### Migration Details:
- **Column Name:** `billing_status`
- **Type:** `TEXT`
- **Nullable:** Yes (defaults to NULL)
- **Constraint:** CHECK constraint ensures only valid values
- **Default:** NULL (if not selected)

## Usage

### In Create Task Screen:
1. User fills in task details
2. Below "Task Reference #" field, user sees "Billing Status" picker
3. Picker shows "Non-Billable" by default
4. User taps the picker to open modal
5. User selects one of:
   - **Non-Billable** (default)
   - **Billable**
   - **Billed**
6. Selection is saved when task is created/updated

### In Edit Task Screen:
- Task's current billing status is pre-filled in the form
- If no status exists, defaults to "Non-Billable"
- User can change the billing status
- Changes are saved when task is updated

## Data Flow

1. **User Selection** → `formData.billingStatus` (BillingStatus, defaults to "non_billable")
2. **Form Submission** → `createTask()` / `updateTask()` receives `billingStatus`
3. **Database Save** → `billing_status` column in `tasks` table (defaults to 'non_billable')
4. **Data Fetch** → `billingStatus` included in transformed Task objects (defaults to "non_billable" if null)
5. **UI Display** → Billing status shown in picker (defaults to "Non-Billable")

## Field Mapping

| TypeScript | Database | Description |
|------------|----------|-------------|
| `billingStatus: "non_billable"` | `billing_status: 'non_billable'` | Task is not billable (default) |
| `billingStatus: "billable"` | `billing_status: 'billable'` | Task is billable |
| `billingStatus: "billed"` | `billing_status: 'billed'` | Task has been billed |

## Testing Checklist

- [ ] Run database migration successfully
- [ ] Create new task (should default to "Non-Billable")
- [ ] Create new task with "Billable" status
- [ ] Create new task with "Non-Billable" status
- [ ] Create new task with "Billed" status
- [ ] Edit existing task and change billing status
- [ ] Verify billing status persists after app reload
- [ ] Verify billing status appears correctly in task detail view (if displayed)

## Related Files

- `src/types/buildtrack.ts`: Type definitions
- `src/screens/CreateTaskScreen.tsx`: UI implementation
- `src/state/taskStore.supabase.ts`: Data layer
- `ADD_BILLING_STATUS_MIGRATION.sql`: Database migration

## Notes

- The field defaults to "Non-Billable" for all new tasks
- The picker follows the same design pattern as Priority and Category pickers
- All existing tasks will have `billing_status = 'non_billable'` after migration
- The field is required (NOT NULL) in the database with a default value
- The field is included in both top-level tasks and sub-tasks

