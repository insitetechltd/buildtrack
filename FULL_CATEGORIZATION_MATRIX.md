# Full Task Categorization Matrix

## Task State Variables
- **Creator**: Who created the task (`assignedBy`)
- **Assignee**: Who is assigned (`assignedTo` array)
- **Accepted**: Whether task is accepted (`accepted` boolean)
- **Completion**: Completion percentage (`completionPercentage`: 0-100)
- **Status**: Current status (`currentStatus`: "not_started" | "in_progress" | "rejected" | "completed")
- **Review**: Review workflow state (`readyForReview`, `reviewAccepted`)
- **Overdue**: Whether task is past due date

---

## My Tasks - Full Matrix

| Creator | Assignee | Accepted | Completion | Overdue | Status | Review | Category | Notes |
|---------|----------|----------|------------|---------|--------|--------|-----------|-------|
| Me | Me | true | <100% | No | not_rejected | - | **WIP** | Self-assigned, in progress |
| Me | Me | true | <100% | Yes | not_rejected | - | **Overdue** | Self-assigned, overdue |
| Me | Me | true | 100% | No | not_rejected | - | **Done** | Self-assigned, complete |
| Me | Me | true | 100% | Yes | not_rejected | - | **Done** | Overdue but complete = Done |
| Me | Me | false | <100% | No | not_rejected | - | **WIP** | Should auto-accept (edge case) |
| Me | Me | false | 100% | No | not_rejected | - | **Done** | Should auto-accept (edge case) |
| Me | Others | - | - | - | rejected | - | **Rejected** | Auto-reassigned to creator |

**Note**: Self-assigned tasks should auto-accept, so `accepted = false` is an edge case.

---

## Inbox - Full Matrix

Tasks assigned to me by OTHERS (need my acceptance)

| Creator | Assignee | Accepted | Completion | Overdue | Status | Review | Category | Notes |
|---------|----------|----------|------------|---------|--------|--------|-----------|-------|
| Others | Me | false | <100% | No | not_rejected | - | **Received** | Need to accept |
| Others | Me | false | 100% | No | not_rejected | - | **Received** | Can update even if 100% |
| Others | Me | true | <100% | No | not_rejected | - | **WIP** | Accepted, in progress |
| Others | Me | true | <100% | Yes | not_rejected | - | **Overdue** | Accepted, overdue |
| Others | Me | true | 100% | No | not_rejected | !readyForReview | **WIP** | Completed but not submitted |
| Others | Me | true | 100% | No | not_rejected | readyForReview, !reviewAccepted | **Reviewing** | Submitted for review |
| Others | Me | true | 100% | No | not_rejected | reviewAccepted | **Done** | Review accepted |

---

## Outbox - Full Matrix

Tasks I created and assigned to OTHERS (tracking delegated work)

| Creator | Assignee | Accepted | Completion | Overdue | Status | Review | Category | Notes |
|---------|----------|----------|------------|---------|--------|--------|-----------|-------|
| Me | Others | false | <100% | No | not_rejected | - | **Assigned** | Not accepted yet |
| Me | Others | false | 100% | No | not_rejected | - | **Assigned** | Can update even if 100% |
| Me | Others | true | <100% | No | not_rejected | - | **WIP** | Accepted, in progress |
| Me | Others | true | <100% | Yes | not_rejected | - | **Overdue** | Accepted, overdue |
| Me | Others | true | 100% | No | not_rejected | !readyForReview | **WIP** | Completed but not submitted |
| Me | Others | true | 100% | No | not_rejected | readyForReview, !reviewAccepted | **Reviewing** | Submitted for review |
| Me | Others | true | 100% | No | not_rejected | reviewAccepted | **Done** | Review accepted |

**Note**: Excludes pure self-assigned tasks (only me assigned) and rejected tasks.

---

## Quick Reference Matrix

### My Tasks (4 categories)

| Category | Criteria |
|----------|----------|
| **Rejected** | `currentStatus === "rejected"` |
| **WIP** | `accepted && completionPercentage < 100 && !overdue && status !== "rejected"` |
| **Done** | `completionPercentage === 100 && status !== "rejected"` |
| **Overdue** | `completionPercentage < 100 && overdue && status !== "rejected"` |

### Inbox (5 categories)

| Category | Criteria |
|----------|----------|
| **Received** | `!accepted && status !== "rejected"` |
| **WIP** | `accepted && !overdue && status !== "rejected" && (completion < 100 || (completion === 100 && !readyForReview))` |
| **Reviewing** | `completion === 100 && readyForReview && !reviewAccepted` |
| **Done** | `completion === 100 && reviewAccepted` |
| **Overdue** | `completion < 100 && overdue && status !== "rejected"` |

### Outbox (5 categories)

| Category | Criteria |
|----------|----------|
| **Assigned** | `!accepted && status !== "rejected"` |
| **WIP** | `accepted && !overdue && status !== "rejected" && (completion < 100 || (completion === 100 && !readyForReview))` |
| **Reviewing** | `completion === 100 && readyForReview && !reviewAccepted` |
| **Done** | `completion === 100 && reviewAccepted` |
| **Overdue** | `completion < 100 && overdue && status !== "rejected"` |

---

## Edge Cases Handled

### 1. Self-Assigned 100% Tasks
- **Location**: My Tasks → Done
- **Logic**: Self-assigned tasks at 100% are considered Done (comment #1)

### 2. Unaccepted 100% Tasks
- **Inbox**: Appear in "Received" (can be updated)
- **Outbox**: Appear in "Assigned" (can be updated)
- **Logic**: Unaccepted tasks can be updated regardless of completion (comment #2, #3)

### 3. Completed but Not Submitted
- **Location**: WIP category (not Done)
- **Logic**: `completionPercentage === 100 && !readyForReview`
- **Note**: Different from Done which requires `reviewAccepted === true`

### 4. Overdue + 100% Complete
- **Location**: Done category (not Overdue)
- **Logic**: Overdue only applies to incomplete tasks
- **Rationale**: Completed tasks shouldn't show as overdue

### 5. Rejected Tasks
- **My Tasks**: Shows in "Rejected" category
- **Inbox**: Excluded from all categories (`status !== "rejected"`)
- **Outbox**: Excluded from all categories (`status !== "rejected"`)
- **Note**: Rejected tasks are auto-reassigned to creator

---

## Review Workflow States

### For Inbox (Tasks assigned to me by others):
1. **Received**: Not accepted yet
2. **WIP**: Accepted, working on it
3. **Reviewing**: ⚠️ **Assigner's Inbox** - Assignee completed it, submitted for review, **awaiting assigner's action**
4. **Done**: Assigner accepted completion

### For Outbox (Tasks I assigned to others):
1. **Assigned**: Not accepted yet
2. **WIP**: Accepted, working on it
3. **Reviewing**: ⚠️ **Assignee's Outbox** - I completed it, submitted for review, **I submitted it**
4. **Done**: Assigner accepted completion

**Key Principle**: 
- When work is submitted for review, task appears in **assigner's Inbox** (awaiting assigner's action)
- When work is submitted for review, task appears in **assignee's Outbox** (assignee submitted it)

---

## Mutual Exclusivity Check

All categories are mutually exclusive within each section:

- **My Tasks**: Rejected OR WIP OR Done OR Overdue (4 categories)
- **Inbox**: Received OR WIP OR Reviewing OR Done OR Overdue (5 categories)
- **Outbox**: Assigned OR WIP OR Reviewing OR Done OR Overdue (5 categories)

**Verification**: Each task matches exactly ONE category per section.

---

## Total Calculation

Each section's total = sum of all category counts:

- **My Tasks Total** = Rejected + WIP + Done + Overdue
- **Inbox Total** = Received + WIP + Reviewing + Done + Overdue
- **Outbox Total** = Assigned + WIP + Reviewing + Done + Overdue

This ensures totals match the sum of category buttons exactly.

