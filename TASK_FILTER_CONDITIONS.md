# Complete Task Filter Conditions

This document lists all filter conditions to ensure all tasks are accounted for after removing the two overdue buttons.

## Current Button Structure

### 1. Overdue Section (TO BE REMOVED)
- **"My Action Required Now"** (my_work + overdue)
- **"Follow Up Now"** (outbox + overdue)

### 2. Tasks for Me Section
- **"New Requests"** (inbox + received)
- **"Current Tasks"** (my_work + wip)
- **"Pending my review"** (inbox + reviewing)

### 3. My Tasks Subsection
- **"My Tasks - WIP"** (my_tasks + wip)
- **"My Tasks - Done"** (my_tasks + done)
- **"My Tasks - Overdue"** (my_tasks + overdue) - KEEP THIS

### 4. Inbox Subsection
- **"Inbox - Received"** (inbox + received)
- **"Inbox - WIP"** (inbox + wip)
- **"Inbox - Reviewing"** (inbox + reviewing)
- **"Inbox - Done"** (inbox + done)
- **"Inbox - Overdue"** (inbox + overdue) - KEEP THIS

### 5. Outbox Subsection
- **"Outbox - Assigned"** (outbox + assigned)
- **"Outbox - WIP"** (outbox + wip)
- **"Outbox - Reviewing"** (outbox + reviewing)
- **"Outbox - Done"** (outbox + done)
- **"Outbox - Overdue"** (outbox + overdue) - KEEP THIS

---

## Detailed Filter Conditions

### Section: my_work (Tasks assigned TO me)
**Includes:** Self-assigned tasks + Tasks from others assigned to me

#### Status: received (New Requests)
- Task is assigned TO me
- Task is NOT created by me
- `status === "new"` (no one has accepted yet)
- `!declinedReason` (no one has rejected yet)
- `completionPercentage < 100`

#### Status: wip (Current Tasks) - **WILL INCLUDE OVERDUE TASKS**
- Task is assigned TO me (my_tasks OR inbox)
- **INCLUDES OVERDUE TASKS** (redistributed from "My Action Required Now")
- For my_tasks:
  - `status === "in_progress" || status === "new" || status === "accepted" || status === "rejected"`
  - `completionPercentage < 100`
  - `status !== "approved"`
  - **REMOVED:** `!isOverdue(task)` condition
- For inbox:
  - `status === "accepted" || status === "in_progress" || status === "rejected"`
  - `completionPercentage < 100` OR (`completionPercentage === 100` AND `status !== "submitted_for_review"`)
  - `status !== "approved"`
  - **REMOVED:** `!isOverdue(task)` condition

#### Status: reviewing (Pending my review)
- Task is created by me (`assignedBy === user.id`)
- `completionPercentage === 100` AND `status === "submitted_for_review"` OR
- `status === "declined"` (at any completion %)

#### Status: done
- Task is assigned TO me
- `status === "approved"`

#### Status: overdue (My Action Required Now) - **TO BE REMOVED**
- Task is assigned TO me (my_tasks OR inbox)
- `completionPercentage < 100`
- `isOverdue(task)`
- `status !== "rejected"`
- **REDISTRIBUTED TO:** "Current Tasks" (my_work + wip)

---

### Section: my_tasks (Self-assigned tasks)
**Includes:** Tasks I created AND assigned to myself

#### Status: wip
- Self-assigned task
- `status === "in_progress" || status === "new" || status === "accepted"`
- `completionPercentage < 100`
- `!isOverdue(task)`
- `status !== "rejected" && status !== "approved"`

#### Status: done
- Self-assigned task
- `status === "approved"`

#### Status: overdue
- Self-assigned task
- `completionPercentage < 100`
- `isOverdue(task)`
- `status !== "rejected"`

---

### Section: inbox (Tasks assigned TO me BY others)
**Includes:** Tasks from others assigned to me (not self-assigned)

#### Status: received
- Task is assigned TO me
- Task is NOT created by me
- `status === "new"`
- `!declinedReason`
- `completionPercentage < 100`

#### Status: wip
- Task is assigned TO me
- Task is NOT created by me
- `status === "accepted" || status === "in_progress" || status === "rejected"`
- `completionPercentage < 100` OR (`completionPercentage === 100` AND `status !== "submitted_for_review"`)
- `status !== "approved"`
- **Note:** Already includes overdue tasks (no overdue exclusion)

#### Status: reviewing
- Task is created by me (`assignedBy === user.id`)
- `completionPercentage === 100` AND `status === "submitted_for_review"` OR
- `status === "declined"`

#### Status: done
- Task is assigned TO me
- Task is NOT created by me
- `status === "approved"`

#### Status: overdue
- Task is assigned TO me
- Task is NOT created by me
- `completionPercentage < 100`
- `isOverdue(task)`
- `status !== "rejected"`

---

### Section: outbox (Tasks I assigned TO others)
**Includes:** Tasks I created and assigned to others (not self-assigned only)

#### Status: assigned
- Task is created by me
- Task is NOT self-assigned only
- `status === "new"`
- `!declinedReason`

#### Status: wip (Team Proceeding) - **WILL INCLUDE OVERDUE TASKS**
- Task is created by me
- Task is NOT self-assigned only
- `status !== "rejected"` (rejected tasks shown separately)
- `status !== "submitted_for_review"` (reviewing tasks shown separately)
- `status !== "approved"` (done tasks shown separately)
- `status !== "declined"` (declined tasks shown in reviewing)
- **INCLUDES OVERDUE TASKS** (redistributed from "Follow Up Now")
- For rejected tasks: Always included
- For other tasks:
  - `status === "accepted" || status === "in_progress"`
  - `completionPercentage < 100` OR (`completionPercentage === 100` AND `status !== "submitted_for_review"`)
  - **REMOVED:** `!isOverdue(task)` condition

#### Status: reviewing
- Task is NOT created by me
- Task is assigned TO me
- `completionPercentage === 100`
- `status === "submitted_for_review"`

#### Status: done
- Task is created by me
- Task is NOT self-assigned only
- Task is NOT rejected
- `status === "approved"`

#### Status: overdue (Follow Up Now) - **TO BE REMOVED**
- Task is created by me
- Task is NOT self-assigned only
- `status === "in_progress" || status === "accepted"`
- `completionPercentage < 100`
- `isOverdue(task)`
- `status !== "rejected"`
- **REDISTRIBUTED TO:** "Team Proceeding" (outbox + wip)

---

## Redistribution Summary

### Tasks from "My Action Required Now" (my_work + overdue)
**Redistributed to:** "Current Tasks" (my_work + wip)
- These are tasks assigned TO me (my_tasks OR inbox) that are overdue
- They will now appear in "Current Tasks" along with non-overdue WIP tasks
- Filter change: Remove `!isOverdue(task)` condition from my_work + wip filter

### Tasks from "Follow Up Now" (outbox + overdue)
**Redistributed to:** "Team Proceeding" (outbox + wip)
- These are tasks I created and assigned to others that are overdue
- They will now appear in "Team Proceeding" along with non-overdue WIP tasks
- Filter change: Remove `!isOverdue(task)` condition from outbox + wip filter

---

## Excluded Tasks (Not shown in any button)

1. **Cancelled tasks:** `status === "cancelled"`
2. **Declined tasks with 0% completion (for assignees):** 
   - `status === "declined" && completionPercentage === 0 && isInInbox`
   - Assignee rejected them, not actionable
   - **Note:** Declined tasks created by me ARE shown in "Pending my review"

---

## Verification Checklist

After removing the overdue buttons, verify:
- [ ] All overdue tasks from "My Action Required Now" appear in "Current Tasks"
- [ ] All overdue tasks from "Follow Up Now" appear in "Team Proceeding"
- [ ] No tasks are lost (all tasks are accounted for)
- [ ] Individual overdue buttons (My Tasks - Overdue, Inbox - Overdue, Outbox - Overdue) still work correctly
- [ ] Counts match between dashboard buttons and TasksScreen filters

