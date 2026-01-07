# Dashboard Buttons → TasksScreen Filter Criteria

This document maps each dashboard button to its corresponding filter logic in TasksScreen.

## Overview

The dashboard has **10 buttons** in the main Priority Summary section:
1. **9 Main Buttons:** Cover the primary task categories
2. **1 Catch-All Button:** Identifies tasks not covered by the 9 main buttons (debugging tool)

---

## Priority Summary Section

### 1. Overdue Section

#### Button: "My Action Required Now"
- **Dashboard Button:** `setSectionFilter("my_work")` + `setStatusFilter("overdue")`
- **Count:** `myOverdueTasks.length + inboxOverdueTasks.length`
- **TasksScreen Filter Criteria:**
  - Section: `my_work`
  - Status: `overdue`
  - **Criteria:**
    - Task is assigned TO me (either self-assigned OR from others)
    - `completionPercentage < 100`
    - Task is overdue (past due date)
    - `status !== "rejected"`

#### Button: "Follow Up Now"
- **Dashboard Button:** `setSectionFilter("outbox")` + `setStatusFilter("overdue")`
- **Count:** `outboxOverdueTasks.length`
- **TasksScreen Filter Criteria:**
  - Section: `outbox`
  - Status: `overdue`
  - **Criteria:**
    - Task is created by me (`assignedBy === user.id`)
    - Task is NOT self-assigned only
    - Task is NOT rejected
    - `status === "in_progress" || status === "accepted"`
    - `completionPercentage < 100`
    - Task is overdue (past due date)

---

### 2. Tasks for Me Section

#### Button: "New Requests"
- **Dashboard Button:** `setSectionFilter("inbox")` + `setStatusFilter("received")`
- **Count:** `inboxReceivedTasks.length`
- **TasksScreen Filter Criteria:**
  - Section: `inbox`
  - Status: `received`
  - **Criteria:**
    - Task is assigned TO me
    - Task is NOT created by me
    - `status === "new"` (no one has accepted yet)
    - `!declinedReason` (no one has rejected yet)
    - `completionPercentage < 100`

#### Button: "Current Tasks"
- **Dashboard Button:** `setSectionFilter("my_work")` + `setStatusFilter("wip")`
- **Count:** `myWIPTasks.length + inboxWIPTasks.length`
- **TasksScreen Filter Criteria:**
  - Section: `my_work`
  - Status: `wip`
  - **Criteria:**
    - Task is assigned TO me
    - If rejected: included (needs rework)
    - If self-assigned: `status === "accepted" || status === "in_progress"`, `completionPercentage < 100`, not overdue, `status !== "approved"`
    - If from inbox: `status === "accepted" || status === "in_progress"`, not overdue, `completionPercentage < 100` OR (`completionPercentage === 100` AND `status !== "submitted_for_review"`), `status !== "approved"`

#### Button: "Pending my review" ⚠️
- **Dashboard Button:** `setSectionFilter("inbox")` + `setStatusFilter("reviewing")`
- **Count:** `inboxReviewingTasks.length` (includes both `submitted_for_review` and `declined`)
- **TasksScreen Filter Criteria:**
  - Section: `inbox`
  - Status: `reviewing`
  - **Criteria:**
    - Task is created by me (`assignedBy === user.id`)
    - **For submitted tasks:** `completionPercentage === 100` AND `status === "submitted_for_review"`
    - **For declined tasks:** `status === "declined"` (at ANY completion percentage)
      - This allows assigners to see what was declined and decide whether to modify/reassign
    - **Note:** This breaks inbox definition - shows tasks I CREATED (not tasks assigned to me)
    - **Note:** Declined tasks with 0% completion appear here for assigners, but NOT for assignees (they rejected it)

---

### 3. Tasks from Me Section

#### Button: "Pending Acceptance"
- **Dashboard Button:** `setSectionFilter("outbox")` + `setStatusFilter("assigned")`
- **Count:** `outboxAssignedTasks.length`
- **TasksScreen Filter Criteria:**
  - Section: `outbox`
  - Status: `assigned`
  - **Criteria:**
    - Task is created by me
    - Task is NOT self-assigned only
    - Task is NOT rejected
    - `status === "new"`
    - `!declinedReason`

#### Button: "Team Proceeding"
- **Dashboard Button:** `setSectionFilter("outbox")` + `setStatusFilter("wip")`
- **Count:** `outboxWIPTasks.length`
- **TasksScreen Filter Criteria:**
  - Section: `outbox`
  - Status: `wip`
  - **Criteria:**
    - Task is created by me
    - Task is NOT self-assigned only
    - Task is NOT rejected
    - If rejected: included (needs rework)
    - Otherwise: `status === "accepted" || status === "in_progress"`, not overdue, `completionPercentage < 100` OR (`completionPercentage === 100` AND `status !== "submitted_for_review"`), `status !== "approved"`

#### Button: "Pending Approval"
- **Dashboard Button:** `setSectionFilter("outbox")` + `setStatusFilter("reviewing")`
- **Count:** `outboxReviewingTasks.length`
- **TasksScreen Filter Criteria:**
  - Section: `outbox`
  - Status: `reviewing`
  - **Criteria:**
    - Task is NOT created by me
    - Task is assigned TO me
    - `completionPercentage === 100`
    - `status === "submitted_for_review"` (declined tasks are NOT included for this filter)
    - **Note:** This breaks outbox definition - shows tasks assigned TO me (not tasks I created)
    - **Note:** This is different from "Pending my review" - this shows tasks I submitted for others' review

---

### 4. Accomplishments Section

#### Button: "Work Accepted"
- **Dashboard Button:** `setSectionFilter("my_work")` + `setStatusFilter("done")`
- **Count:** `myDoneTasks.length + inboxDoneTasks.length + outboxDoneTasks.length`
- **TasksScreen Filter Criteria:**
  - Section: `my_work`
  - Status: `done`
  - **Criteria:**
    - **Outbox tasks (created by me, assigned to others):**
      - `status === "approved"`
    - **My tasks (self-assigned):**
      - If self-assigned only: `completionPercentage === 100`
      - Otherwise: `status === "approved"`
    - **Inbox tasks (from others):**
      - `status === "approved"`

#### Button: "Uncovered Tasks" (Catch-All) 🔍
- **Dashboard Button:** `setSectionFilter("my_work")` + `setStatusFilter("all")` + `buttonLabel("Catch-All - Uncovered Tasks")`
- **Count:** `catchAllTasks.length`
- **Purpose:** Debugging tool to identify tasks that are NOT covered by any of the 9 main buttons above
- **TasksScreen Filter Criteria:**
  - Section: `my_work`
  - Status: `all` (with special catch-all logic)
  - **Criteria:**
    - Task is related to the user (assigned to OR created by)
    - Task does NOT match any of the 9 main button criteria:
      - ❌ NOT in "My Action Required Now" (my_work + overdue)
      - ❌ NOT in "Follow Up Now" (outbox + overdue)
      - ❌ NOT in "New Requests" (inbox + received)
      - ❌ NOT in "Current Tasks" (my_work + wip)
      - ❌ NOT in "Pending my review" (inbox + reviewing)
      - ❌ NOT in "Pending Acceptance" (outbox + assigned)
      - ❌ NOT in "Team Proceeding" (outbox + wip)
      - ❌ NOT in "Pending Approval" (outbox + reviewing)
      - ❌ NOT in "Work Accepted" (my_work + done)
    - **If count > 0:** Indicates a gap in the categorization logic that needs to be addressed

---

## Quick Overview Section (Collapsible)

### My Tasks Subsection

#### Button: "My Tasks - WIP"
- **Dashboard Button:** `setSectionFilter("my_tasks")` + `setStatusFilter("wip")`
- **Count:** `myWIPTasks.length`
- **TasksScreen Filter Criteria:**
  - Section: `my_tasks`
  - Status: `wip`
  - **Criteria:**
    - Task is self-assigned (created by me AND assigned to me) OR rejected task I created
    - `status === "accepted" || status === "in_progress"`
    - `completionPercentage < 100`
    - Not overdue
    - `status !== "rejected"` (unless it's a rejected task I created)
    - `status !== "approved"`

#### Button: "My Tasks - Done"
- **Dashboard Button:** `setSectionFilter("my_tasks")` + `setStatusFilter("done")`
- **Count:** `myDoneTasks.length`
- **TasksScreen Filter Criteria:**
  - Section: `my_tasks`
  - Status: `done`
  - **Criteria:**
    - Task is self-assigned (created by me AND assigned to me) OR rejected task I created
    - `status === "approved"`

#### Button: "My Tasks - Overdue"
- **Dashboard Button:** `setSectionFilter("my_tasks")` + `setStatusFilter("overdue")`
- **Count:** `myOverdueTasks.length`
- **TasksScreen Filter Criteria:**
  - Section: `my_tasks`
  - Status: `overdue`
  - **Criteria:**
    - Task is self-assigned (created by me AND assigned to me) OR rejected task I created
    - `completionPercentage < 100`
    - Task is overdue (past due date)
    - `status !== "rejected"`

---

### Inbox Subsection

#### Button: "Inbox - Received"
- **Dashboard Button:** `setSectionFilter("inbox")` + `setStatusFilter("received")`
- **Count:** `inboxReceivedTasks.length`
- **TasksScreen Filter Criteria:**
  - Same as "New Requests" above

#### Button: "Inbox - WIP"
- **Dashboard Button:** `setSectionFilter("inbox")` + `setStatusFilter("wip")`
- **Count:** `inboxWIPTasks.length`
- **TasksScreen Filter Criteria:**
  - Section: `inbox`
  - Status: `wip`
  - **Criteria:**
    - Task is assigned TO me
    - Task is NOT created by me
    - `status === "accepted" || status === "in_progress"`
    - Not overdue
    - `completionPercentage < 100` OR (`completionPercentage === 100` AND `status !== "submitted_for_review"`)
    - `status !== "approved"`

#### Button: "Inbox - Reviewing"
- **Dashboard Button:** `setSectionFilter("inbox")` + `setStatusFilter("reviewing")`
- **Count:** `inboxReviewingTasks.length`
- **TasksScreen Filter Criteria:**
  - Same as "Pending my review" above
  - **Criteria:**
    - Task is created by me (`assignedBy === user.id`)
    - `completionPercentage === 100`
    - `status === "submitted_for_review"` OR `status === "declined"`

#### Button: "Inbox - Done"
- **Dashboard Button:** `setSectionFilter("inbox")` + `setStatusFilter("done")`
- **Count:** `inboxDoneTasks.length`
- **TasksScreen Filter Criteria:**
  - Section: `inbox`
  - Status: `done`
  - **Criteria:**
    - Task is assigned TO me
    - Task is NOT created by me
    - `status === "approved"`

#### Button: "Inbox - Overdue"
- **Dashboard Button:** `setSectionFilter("inbox")` + `setStatusFilter("overdue")`
- **Count:** `inboxOverdueTasks.length`
- **TasksScreen Filter Criteria:**
  - Section: `inbox`
  - Status: `overdue`
  - **Criteria:**
    - Task is assigned TO me
    - Task is NOT created by me
    - `completionPercentage < 100`
    - Task is overdue (past due date)
    - `status !== "rejected"`

---

### Outbox Subsection

#### Button: "Outbox - Assigned"
- **Dashboard Button:** `setSectionFilter("outbox")` + `setStatusFilter("assigned")`
- **Count:** `outboxAssignedTasks.length`
- **TasksScreen Filter Criteria:**
  - Same as "Pending Acceptance" above

#### Button: "Outbox - WIP"
- **Dashboard Button:** `setSectionFilter("outbox")` + `setStatusFilter("wip")`
- **Count:** `outboxWIPTasks.length`
- **TasksScreen Filter Criteria:**
  - Same as "Team Proceeding" above

#### Button: "Outbox - Reviewing"
- **Dashboard Button:** `setSectionFilter("outbox")` + `setStatusFilter("reviewing")`
- **Count:** `outboxReviewingTasks.length` 
  - **⚠️ NOTE:** This count shows tasks I CREATED (with `submitted_for_review` only)
  - But the TasksScreen filter for outbox+reviewing shows tasks assigned TO me (different logic!)
  - This is a mismatch - the count and filter don't match
- **TasksScreen Filter Criteria:**
  - Section: `outbox`
  - Status: `reviewing`
  - **Criteria:**
    - Task is NOT created by me
    - Task is assigned TO me
    - `completionPercentage === 100`
    - `status === "submitted_for_review"` (declined tasks are NOT included)
    - **Note:** This breaks outbox definition - shows tasks assigned TO me (not tasks I created)
    - **Note:** This is different from "Pending my review" - this shows tasks I submitted for others' review

#### Button: "Outbox - Done"
- **Dashboard Button:** `setSectionFilter("outbox")` + `setStatusFilter("done")`
- **Count:** `outboxDoneTasks.length`
- **TasksScreen Filter Criteria:**
  - Section: `outbox`
  - Status: `done`
  - **Criteria:**
    - Task is created by me
    - Task is NOT self-assigned only
    - Task is NOT rejected
    - `status === "approved"`

#### Button: "Outbox - Overdue"
- **Dashboard Button:** `setSectionFilter("outbox")` + `setStatusFilter("overdue")`
- **Count:** `outboxOverdueTasks.length`
- **TasksScreen Filter Criteria:**
  - Same as "Follow Up Now" above

---

## Catch-All Button

The "Uncovered Tasks" button is a debugging tool that helps identify any gaps in the task categorization logic. It shows all tasks related to the user (assigned to OR created by) that don't match any of the 9 main button criteria.

**When to use:**
- During development to verify all tasks are properly categorized
- When investigating why a task doesn't appear in expected lists
- To identify edge cases or missing status combinations

**Expected result:**
- Ideally, the count should be **0** (all tasks are covered by the 9 main buttons or excluded)
- If count > 0, review the uncovered tasks to determine:
  1. Are they valid tasks that need a new button category?
  2. Are they edge cases that should be included in an existing button?
  3. Are they invalid/archived tasks that should be excluded?

**Automatically Excluded Tasks:**
- **Cancelled tasks** (`status === "cancelled"`) - Not actionable
- **Declined tasks with 0% completion for assignees** (`status === "declined" && completionPercentage === 0 && isInInbox`) - Assignee rejected them, not actionable
  - **For assigners:** Declined tasks at ANY completion % ARE included in "Pending my review" (so they can see what was declined and modify/reassign)
  - **For assignees:** Declined tasks with 0% completion are excluded (they already rejected it)

---

## Important Notes

### Section Definitions

1. **`my_tasks`**: Tasks I created AND assigned to myself (self-assigned)
2. **`inbox`**: Tasks assigned TO me BY others (not self-assigned)
3. **`outbox`**: Tasks I created AND assigned to OTHERS (not self-assigned)
4. **`my_work`**: Combined view of tasks assigned TO me (includes both `my_tasks` and `inbox`)

### Special Cases

1. **"Reviewing" Status Breaks Section Definitions:**
   - **Inbox + Reviewing**: Shows tasks I CREATED (not tasks assigned to me) - breaks inbox definition
   - **Outbox + Reviewing**: Shows tasks assigned TO ME (not tasks I created) - breaks outbox definition

2. **Rejected Tasks:**
   - Rejected tasks appear in WIP filters (they need rework)
   - Rejected tasks are excluded from most other filters

3. **Self-Assigned Tasks:**
   - Self-assigned tasks are tasks where `assignedBy === user.id` AND `assignedTo` includes only `user.id`
   - These appear in `my_tasks` section
   - They auto-accept and don't need review

4. **Completion Percentage:**
   - Tasks at 100% completion can still be in WIP if not yet submitted for review
   - Tasks at 100% with `status === "submitted_for_review"` appear in reviewing filters
   - Tasks with `status === "approved"` appear in done filters

---

## Filter Logic Flow

1. **Section Filter** determines which tasks are considered (my_tasks, inbox, outbox, my_work)
2. **Status Filter** further narrows down based on task status and completion
3. **Special handling** for "reviewing" status that breaks section definitions
4. **Rejected tasks** are included in WIP but excluded from most other filters

---

**Last Updated:** Based on current codebase state
**File Locations:**
- Dashboard buttons: `src/screens/DashboardScreen.tsx`
- Filter logic: `src/screens/TasksScreen.tsx` (lines 482-828)

