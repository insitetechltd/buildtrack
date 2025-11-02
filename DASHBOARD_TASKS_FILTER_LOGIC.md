# Dashboard Buttons Logic vs Tasks Screen Filter Logic

## Overview
This document maps the dashboard button logic to the corresponding filter logic in TasksScreen.

---

## Dashboard Buttons → Filter Mapping

### 1. URGENT! Section

#### Button: "My Action Required Now"
- **Dashboard Logic** (lines 602-621):
  - Count: `myOverdueTasks.length + inboxOverdueTasks.length`
  - Sets: `sectionFilter="my_work"`, `statusFilter="overdue"`
  - Label: `"Urgent! - My Action Required Now"`

- **TasksScreen Filter Logic** (lines 511-548):
  - Section: `my_work`
  - Status: `overdue`
  - **Filter Criteria**:
    - Task must be assigned TO current user (`isAssignedToMe`)
    - Completion < 100%
    - Task is overdue (`isOverdue(task)`)
    - Status is not "rejected"
    - Includes: My self-assigned tasks + Tasks from others assigned to me
    - Excludes: Tasks I assigned to others (Outbox)

---

#### Button: "Follow Up Now"
- **Dashboard Logic** (lines 624-648):
  - Count: `outboxOverdueTasks.length`
  - Sets: `sectionFilter="outbox"`, `statusFilter="overdue"`
  - Label: `"Urgent! - Follow Up Now"`

- **TasksScreen Filter Logic** (lines 707-755):
  - Section: `outbox`
  - Status: `overdue`
  - **Filter Criteria**:
    - Task created by me (`isCreatedByMe`)
    - NOT self-assigned only (`!isSelfAssignedOnly`)
    - Status is not "rejected"
    - Completion < 100%
    - Task is overdue (`isOverdue(task)`)

---

### 2. TASKS FOR ME Section

#### Button: "New Requests"
- **Dashboard Logic** (lines 668-692):
  - Count: `inboxReceivedTasks.length`
  - Sets: `sectionFilter="inbox"`, `statusFilter="received"`
  - Label: `"Tasks for me - New Requests"`

- **TasksScreen Filter Logic** (lines 628-686):
  - Section: `inbox`
  - Status: `received`
  - **Filter Criteria**:
    - Task assigned TO me (`isAssignedToMe`)
    - Task NOT created by me (`!isCreatedByMe`)
    - Task not yet accepted (`isNotAccepted`: `accepted === null || undefined || false`)
    - Status is not "rejected"

---

#### Button: "Current Tasks"
- **Dashboard Logic** (lines 695-719):
  - Count: `myWIPTasks.length + inboxWIPTasks.length`
  - Sets: `sectionFilter="my_work"`, `statusFilter="wip"`
  - Label: `"Tasks for me - Current Tasks"`

- **TasksScreen Filter Logic** (lines 511-571):
  - Section: `my_work`
  - Status: `wip`
  - **Filter Criteria**:
    - Task must be assigned TO current user (`isAssignedToMe`)
    - For self-assigned tasks:
      - Accepted or auto-accepted (self-assigned)
      - Completion < 100%
      - Not overdue
      - Status is not "rejected"
      - Not review accepted
    - For inbox tasks:
      - Must be accepted
      - Not overdue
      - Status is not "rejected"
      - Completion < 100% OR (100% but not ready for review)
      - Not review accepted

---

#### Button: "Pending my review"
- **Dashboard Logic** (lines 722-746):
  - Count: `inboxReviewingTasks.length`
  - Sets: `sectionFilter="inbox"`, `statusFilter="reviewing"`
  - Label: `"Tasks for me - Pending my review"`

- **TasksScreen Filter Logic** (lines 653-661):
  - Section: `inbox`
  - Status: `reviewing`
  - **Filter Criteria** (SPECIAL CASE - breaks inbox definition):
    - Task created by me (`isCreatedByMeForReview`)
    - Completion = 100%
    - `readyForReview === true`
    - `reviewAccepted !== true`
    - **Note**: This shows tasks I CREATED that others submitted for MY review (not typical inbox tasks)

---

### 3. TASKS FROM ME Section

#### Button: "Pending Acceptance"
- **Dashboard Logic** (lines 766-790):
  - Count: `outboxAssignedTasks.length`
  - Sets: `sectionFilter="outbox"`, `statusFilter="assigned"`
  - Label: `"Tasks from me - Pending Acceptance"`

- **TasksScreen Filter Logic** (lines 730-735):
  - Section: `outbox`
  - Status: `assigned`
  - **Filter Criteria**:
    - Task created by me (`isCreatedByMe`)
    - NOT self-assigned only (`!isSelfAssignedOnly`)
    - Status is not "rejected"
    - Task not yet accepted (`isNotAccepted`: `accepted === null || undefined || false`)

---

#### Button: "Team Proceeding"
- **Dashboard Logic** (lines 793-817):
  - Count: `outboxWIPTasks.length`
  - Sets: `sectionFilter="outbox"`, `statusFilter="wip"`
  - Label: `"Tasks from me - Team Proceeding"`

- **TasksScreen Filter Logic** (lines 736-744):
  - Section: `outbox`
  - Status: `wip`
  - **Filter Criteria**:
    - Task created by me (`isCreatedByMe`)
    - NOT self-assigned only (`!isSelfAssignedOnly`)
    - Status is not "rejected"
    - Task is accepted (`task.accepted`)
    - Not overdue
    - Completion < 100% OR (100% but not ready for review)
    - Not review accepted

---

#### Button: "Pending Approval"
- **Dashboard Logic** (lines 820-844):
  - Count: `outboxReviewingTasks.length`
  - Sets: `sectionFilter="outbox"`, `statusFilter="reviewing"`
  - Label: `"Tasks from me - Pending Approval"`

- **TasksScreen Filter Logic** (lines 718-726):
  - Section: `outbox`
  - Status: `reviewing`
  - **Filter Criteria** (SPECIAL CASE - breaks outbox definition):
    - Task NOT created by me (`!isCreatedByMe`)
    - Task assigned TO me (`isAssignedToMe`)
    - Completion = 100%
    - `readyForReview === true`
    - `reviewAccepted !== true`
    - **Note**: This shows tasks I'm ASSIGNED TO that I submitted for review (not typical outbox tasks)

---

### 4. ACCOMPLISHMENTS Section

#### Button: "Work Accepted"
- **Dashboard Logic** (lines 864-888):
  - Count: `myDoneTasks.length + inboxDoneTasks.length + outboxDoneTasks.length`
  - Sets: `sectionFilter="my_work"`, `statusFilter="done"`
  - Label: `"Accomplishments - Work Accepted"`

- **TasksScreen Filter Logic** (lines 511-586):
  - Section: `my_work`
  - Status: `done`
  - **Filter Criteria**:
    - Includes My Tasks + Inbox + Outbox (all completed work)
    - Completion = 100%
    - `reviewAccepted === true`
    - Checks outbox FIRST, then myTasks, then inbox

---

### 5. QUICK OVERVIEW Section

#### My Tasks - Rejected
- **Dashboard Logic** (lines 952-972):
  - Count: `myRejectedTasks.length`
  - Sets: `sectionFilter="my_tasks"`, `statusFilter="rejected"`
  - Label: `"My Tasks - Rejected"`

- **TasksScreen Filter Logic** (lines 593-607):
  - Section: `my_tasks`
  - Status: `rejected`
  - **Filter Criteria**:
    - Task assigned to me AND created by me, OR task created by me with rejected status
    - `currentStatus === "rejected"`

---

#### My Tasks - WIP
- **Dashboard Logic** (lines 975-995):
  - Count: `myWIPTasks.length`
  - Sets: `sectionFilter="my_tasks"`, `statusFilter="wip"`
  - Label: `"My Tasks - WIP"`

- **TasksScreen Filter Logic** (lines 608-616):
  - Section: `my_tasks`
  - Status: `wip`
  - **Filter Criteria**:
    - Self-assigned task (`isAssignedToMe && isCreatedByMe`)
    - Accepted or auto-accepted (self-assigned)
    - Completion < 100%
    - Not overdue
    - Status is not "rejected"
    - Not review accepted

---

#### My Tasks - Done
- **Dashboard Logic** (lines 998-1018):
  - Count: `myDoneTasks.length`
  - Sets: `sectionFilter="my_tasks"`, `statusFilter="done"`
  - Label: `"My Tasks - Done"`

- **TasksScreen Filter Logic** (lines 617-620):
  - Section: `my_tasks`
  - Status: `done`
  - **Filter Criteria**:
    - Self-assigned task
    - Completion = 100%
    - `reviewAccepted === true`

---

#### My Tasks - Overdue
- **Dashboard Logic** (lines 1021-1041):
  - Count: `myOverdueTasks.length`
  - Sets: `sectionFilter="my_tasks"`, `statusFilter="overdue"`
  - Label: `"My Tasks - Overdue"`

- **TasksScreen Filter Logic** (lines 621-625):
  - Section: `my_tasks`
  - Status: `overdue`
  - **Filter Criteria**:
    - Self-assigned task
    - Completion < 100%
    - Task is overdue
    - Status is not "rejected"

---

#### Inbox - Received
- **Dashboard Logic** (lines 1064-1084):
  - Count: `inboxReceivedTasks.length`
  - Sets: `sectionFilter="inbox"`, `statusFilter="received"`
  - Label: `"Inbox - Received"`

- **TasksScreen Filter Logic** (lines 666-686):
  - Section: `inbox`
  - Status: `received`
  - **Filter Criteria**: Same as "New Requests" button above

---

#### Inbox - WIP
- **Dashboard Logic** (lines 1087-1107):
  - Count: `inboxWIPTasks.length`
  - Sets: `sectionFilter="inbox"`, `statusFilter="wip"`
  - Label: `"Inbox - WIP"`

- **TasksScreen Filter Logic** (lines 687-695):
  - Section: `inbox`
  - Status: `wip`
  - **Filter Criteria**:
    - Task assigned TO me by others
    - Task is accepted
    - Not overdue
    - Status is not "rejected"
    - Completion < 100% OR (100% but not ready for review)
    - Not review accepted

---

#### Inbox - Reviewing
- **Dashboard Logic** (lines 1110-1130):
  - Count: `inboxReviewingTasks.length`
  - Sets: `sectionFilter="inbox"`, `statusFilter="reviewing"`
  - Label: `"Inbox - Reviewing"`

- **TasksScreen Filter Logic** (lines 653-661):
  - Section: `inbox`
  - Status: `reviewing`
  - **Filter Criteria**: Same as "Pending my review" button above

---

#### Inbox - Done
- **Dashboard Logic** (lines 1133-1153):
  - Count: `inboxDoneTasks.length`
  - Sets: `sectionFilter="inbox"`, `statusFilter="done"`
  - Label: `"Inbox - Done"`

- **TasksScreen Filter Logic** (lines 696-699):
  - Section: `inbox`
  - Status: `done`
  - **Filter Criteria**:
    - Task assigned TO me by others
    - Completion = 100%
    - `reviewAccepted === true`

---

#### Inbox - Overdue
- **Dashboard Logic** (lines 1156-1176):
  - Count: `inboxOverdueTasks.length`
  - Sets: `sectionFilter="inbox"`, `statusFilter="overdue"`
  - Label: `"Inbox - Overdue"`

- **TasksScreen Filter Logic** (lines 700-704):
  - Section: `inbox`
  - Status: `overdue`
  - **Filter Criteria**:
    - Task assigned TO me by others
    - Completion < 100%
    - Task is overdue
    - Status is not "rejected"

---

#### Outbox - Assigned
- **Dashboard Logic** (lines 1199-1219):
  - Count: `outboxAssignedTasks.length`
  - Sets: `sectionFilter="outbox"`, `statusFilter="assigned"`
  - Label: `"Outbox - Assigned"`

- **TasksScreen Filter Logic** (lines 730-735):
  - Section: `outbox`
  - Status: `assigned`
  - **Filter Criteria**: Same as "Pending Acceptance" button above

---

#### Outbox - WIP
- **Dashboard Logic** (lines 1222-1242):
  - Count: `outboxWIPTasks.length`
  - Sets: `sectionFilter="outbox"`, `statusFilter="wip"`
  - Label: `"Outbox - WIP"`

- **TasksScreen Filter Logic** (lines 736-744):
  - Section: `outbox`
  - Status: `wip`
  - **Filter Criteria**: Same as "Team Proceeding" button above

---

#### Outbox - Reviewing
- **Dashboard Logic** (lines 1245-1265):
  - Count: `outboxReviewingTasks.length`
  - Sets: `sectionFilter="outbox"`, `statusFilter="reviewing"`
  - Label: `"Outbox - Reviewing"`

- **TasksScreen Filter Logic** (lines 718-726):
  - Section: `outbox`
  - Status: `reviewing`
  - **Filter Criteria**: Same as "Pending Approval" button above

---

#### Outbox - Done
- **Dashboard Logic** (lines 1268-1288):
  - Count: `outboxDoneTasks.length`
  - Sets: `sectionFilter="outbox"`, `statusFilter="done"`
  - Label: `"Outbox - Done"`

- **TasksScreen Filter Logic** (lines 745-748):
  - Section: `outbox`
  - Status: `done`
  - **Filter Criteria**:
    - Task created by me
    - NOT self-assigned only
    - Status is not "rejected"
    - Completion = 100%
    - `reviewAccepted === true`

---

#### Outbox - Overdue
- **Dashboard Logic** (lines 1291-1311):
  - Count: `outboxOverdueTasks.length`
  - Sets: `sectionFilter="outbox"`, `statusFilter="overdue"`
  - Label: `"Outbox - Overdue"`

- **TasksScreen Filter Logic** (lines 749-753):
  - Section: `outbox`
  - Status: `overdue`
  - **Filter Criteria**:
    - Task created by me
    - NOT self-assigned only
    - Status is not "rejected"
    - Completion < 100%
    - Task is overdue

---

## Key Helper Functions

### DashboardScreen Helpers

1. **`isTopLevelTask(task)`** (line 264-266):
   - Returns `true` if task has no `parentTaskId`

2. **`isNestedTask(task)`** (line 269-271):
   - Returns `true` if task has a `parentTaskId`

3. **`isOverdue(task)`** (line 274-278):
   - Checks if `dueDate < now`

4. **`isNotAccepted(task)`** (line 340-342):
   - Returns `true` if `accepted === null || undefined || false`

### TasksScreen Helpers

1. **`isTopLevelTask(task)`** (line 208-210):
   - Same logic as DashboardScreen

2. **`isNestedTask(task)`** (line 213-215):
   - Same logic as DashboardScreen

3. **`isOverdue(task)`** (line 492-496):
   - Same logic as DashboardScreen

4. **`getNestedTasksAssignedBy(userId, projectId?)`** (line 173-181):
   - Returns nested tasks assigned BY a user

5. **`getNestedTasksAssignedTo(userId, projectId?)`** (line 184-194):
   - Returns nested tasks assigned TO a user

---

## Section Definitions

### My Tasks (`my_tasks`)
- **Definition**: Tasks I created AND assigned to myself (self-assigned)
- **Includes**: Top-level and nested tasks
- **Excludes**: Tasks assigned to others, tasks assigned to me by others

### Inbox (`inbox`)
- **Definition**: Tasks assigned TO me BY others (not self-assigned)
- **Includes**: Top-level and nested tasks
- **Excludes**: Self-assigned tasks, tasks I created
- **Special Case**: "Reviewing" status breaks this definition to show tasks I CREATED waiting for review

### Outbox (`outbox`)
- **Definition**: Tasks I assigned TO others (not self-assigned only)
- **Includes**: Top-level and nested tasks
- **Excludes**: Self-assigned tasks (where I'm the only assignee), rejected tasks
- **Special Case**: "Reviewing" status breaks this definition to show tasks I'm ASSIGNED TO that I submitted for review

### My Work (`my_work`)
- **Definition**: Combines My Tasks + Inbox (all tasks assigned TO me)
- **Includes**: Self-assigned tasks + Tasks from others assigned to me
- **Exception**: "done" status also includes Outbox (all completed work)
- **Excludes**: Tasks I assigned to others (unless "done" status)

---

## Filter Flow

1. **Dashboard Button Press** → Sets `sectionFilter`, `statusFilter`, and `buttonLabel` in `projectFilterStore`
2. **Navigation** → Calls `onNavigateToTasks()`
3. **TasksScreen Mount** → `useEffect` (lines 98-122) reads filters from store
4. **Filter Application** → `getAllTasks()` applies section filter first, then status filter
5. **Filter Clearing** → Filters cleared from store after being applied locally

---

## Notes

- All string comparisons use `String()` conversion to handle UUID type mismatches
- Tasks are filtered by `selectedProjectId` at the project level before section/status filtering
- The "reviewing" status breaks section definitions for both inbox and outbox
- Nested tasks (subtasks) are included in all sections alongside top-level tasks
- Rejected tasks are generally excluded unless explicitly filtering for "rejected" status

