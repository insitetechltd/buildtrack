# Sam's Tasks Database Check

## Overview
This document provides SQL queries to check how many tasks exist in the database for Sam.

## How to Use

### Option 1: Run in Supabase SQL Editor
1. Open your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy and paste the queries from `check_sam_tasks.sql`
4. Run each query sequentially

### Option 2: Run via Supabase CLI
```bash
supabase db execute --file check_sam_tasks.sql
```

## Query Breakdown

### Step 1: Find Sam's User ID
The first query finds Sam's user record by searching for "sam" in the name or email fields.

**Expected Result:**
- Sam's user ID (UUID)
- Sam's name
- Sam's email
- Sam's phone number

### Step 2: Count Tasks for Sam
The second query counts all tasks assigned to Sam, including:
- **Total tasks**: All tasks where Sam is in the `assigned_to` array
- **Active tasks**: Tasks that are not cancelled
- **Cancelled tasks**: Tasks that have been cancelled
- **Accepted by Sam**: Tasks that Sam has accepted (for multi-user assignments)
- **Not accepted by Sam**: Tasks that Sam hasn't accepted yet
- **Completed tasks**: Tasks at 100% completion
- **In progress tasks**: Tasks below 100% completion

**Key Points:**
- Uses `ANY(assigned_to)` to check if Sam's ID is in the array
- Handles multi-user assignments correctly
- Distinguishes between tasks Sam has accepted vs. tasks Sam hasn't accepted

### Step 3: Detailed Task List
The third query provides a detailed list of all tasks assigned to Sam, including:
- Task ID, title, status
- Assignment details (`assigned_to`, `assigned_by`)
- Acceptance status (`accepted`, `accepted_by`, `accepted_at`)
- Completion status (`completion_percentage`, `current_status`)
- Review status (`ready_for_review`, `review_accepted`)
- Cancellation status (`cancelled_at`)
- Timestamps (`created_at`, `updated_at`)
- **Sam's acceptance status**: Whether Sam has specifically accepted this task

## Understanding the Results

### Multi-User Assignment Behavior
When a task is assigned to multiple users (e.g., Task 5 assigned to both Paul and Sam):
- The task appears in the count for each assigned user
- `accepted_by` stores the ID of the **last user who accepted**
- If Paul accepts first, then Sam accepts, `accepted_by` will be Sam's ID
- To check if Sam has accepted, compare `accepted_by = Sam's ID`

### Acceptance Status
- **`accepted = true`**: At least one user has accepted the task
- **`accepted_by = Sam's ID`**: Sam is the one who accepted (or last accepted)
- **`sam_has_accepted = 'Yes'`**: Sam has specifically accepted this task

### Task States
- **Active**: `cancelled_at IS NULL`
- **Cancelled**: `cancelled_at IS NOT NULL`
- **Completed**: `completion_percentage = 100`
- **In Progress**: `completion_percentage < 100`

## Troubleshooting

### If Sam's user is not found:
- Check the exact spelling of Sam's name in the database
- Try searching by email or phone number
- Verify Sam exists in the `users` table

### If no tasks are returned:
- Verify Sam's user ID is correct
- Check that tasks have Sam's ID in the `assigned_to` array
- Ensure tasks are not filtered out by `cancelled_at` (if needed)

### If counts seem incorrect:
- Remember that multi-user assignments count the task for each user
- Check `accepted_by` to see who actually accepted
- Verify the `assigned_to` array contains Sam's ID

## Related Files
- `check_sam_tasks.sql`: SQL queries for checking Sam's tasks
- `src/screens/TasksScreen.tsx`: Task filtering logic in the app
- `src/screens/DashboardScreen.tsx`: Dashboard task display logic

