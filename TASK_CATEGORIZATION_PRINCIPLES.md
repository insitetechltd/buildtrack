# Task Categorization Principles

## Overview
Tasks are categorized into three main sections: **My Tasks**, **Inbox**, and **Outbox**. Each section has its own categorization logic based on task status, completion, and review workflow.

---

## Section 1: My Tasks
**Purpose**: Tasks I assigned to MYSELF (self-assigned tasks) + Rejected tasks auto-reassigned to me

### Inclusion Criteria:
- **Assigned to me** AND **Created by me** (self-assigned), OR
- **Created by me** AND **Rejected** (auto-reassigned back to creator after rejection)

### Categories (4 total):

#### 1.1 Rejected (Yellow)
- Tasks with `currentStatus === "rejected"`
- These are tasks I assigned to others that were rejected and auto-reassigned back to me

#### 1.2 WIP (Orange) - Work In Progress
- Tasks where:
  - `accepted === true`
  - `completionPercentage < 100`
  - NOT overdue
  - `currentStatus !== "rejected"`

#### 1.3 Done (Green)
- Tasks where:
  - `completionPercentage === 100`
  - `currentStatus !== "rejected"`

#### 1.4 Overdue (Red)
- Tasks where:
  - `completionPercentage < 100`
  - Due date has passed
  - `currentStatus !== "rejected"`

### Key Notes:
- No "Incoming" category (self-assigned tasks auto-accept)
- No "Reviewing" category (I don't review my own completed tasks)
- Rejected tasks show separately to help with re-assignment

---

## Section 2: Inbox
**Purpose**: Tasks assigned to me by OTHERS (need my acceptance)

### Inclusion Criteria:
- **Assigned to me** AND **NOT created by me**
- These are tasks others assigned to me

### Categories (5 total):

#### 2.1 Received (Yellow)
- Tasks where:
  - `accepted === false` (not yet accepted)
  - `currentStatus !== "rejected"`

#### 2.2 WIP (Orange) - Work In Progress
- Tasks where:
  - `accepted === true`
  - NOT overdue
  - `currentStatus !== "rejected"`
  - Either:
    - `completionPercentage < 100` (still in progress), OR
    - `completionPercentage === 100` AND `readyForReview === false` (completed but not submitted)

#### 2.3 Reviewing (Blue)
- Tasks where:
  - `completionPercentage === 100`
  - `readyForReview === true` (assignee submitted for review)
  - `reviewAccepted !== true` (waiting for my approval)
- **Example**: Tristan assigns Task A to Dennis. When Dennis submits for review, Task A appears in **Tristan's Inbox → Reviewing**

#### 2.4 Done (Green)
- Tasks where:
  - `completionPercentage === 100`
  - `reviewAccepted === true` (I've accepted the completion)

#### 2.5 Overdue (Red)
- Tasks where:
  - `completionPercentage < 100`
  - Due date has passed
  - `currentStatus !== "rejected"`

### Key Notes:
- These are tasks I need to accept and work on
- When I complete and submit for review, they move to Outbox → Reviewing
- Review workflow: Assignee submits → Shows in Assigner's Inbox → Reviewing

---

## Section 3: Outbox
**Purpose**: Tasks I assigned to OTHERS (tracking work I delegated)

### Inclusion Criteria:
- **Created by me** AND **Assigned to others**
- Includes tasks where I'm also assigned (as long as others are assigned too)
- Excludes pure self-assigned tasks (only me assigned)
- Excludes rejected tasks (they show in My Tasks)

### Categories (5 total):

#### 3.1 Assigned (Yellow)
- Tasks where:
  - `accepted === false` (assignee hasn't accepted yet)
  - `currentStatus !== "rejected"`

#### 3.2 WIP (Orange) - Work In Progress
- Tasks where:
  - `accepted === true`
  - NOT overdue
  - `currentStatus !== "rejected"`
  - Either:
    - `completionPercentage < 100` (still in progress), OR
    - `completionPercentage === 100` AND `readyForReview === false` (completed but not submitted)

#### 3.3 Reviewing (Blue)
- Tasks where:
  - `completionPercentage === 100`
  - `readyForReview === true` (assignee submitted for review)
  - `reviewAccepted !== true` (waiting for my approval)
- **Example**: Tristan assigns Task A to Dennis. When Dennis submits for review, Task A appears in **Dennis's Outbox → Reviewing** (he submitted it)

#### 3.4 Done (Green)
- Tasks where:
  - `completionPercentage === 100`
  - `reviewAccepted === true` (I've accepted the completion)

#### 3.5 Overdue (Red)
- Tasks where:
  - `completionPercentage < 100`
  - Due date has passed
  - `currentStatus !== "rejected"`

### Key Notes:
- These are tasks I created and delegated to others
- I track their progress and review their completion
- Review workflow: Assignee submits → Shows in Assignee's Outbox → Reviewing

---

## Common Filtering Logic

### Overdue Check:
```typescript
const isOverdue = (task: any) => {
  const dueDate = new Date(task.dueDate);
  const now = new Date();
  return dueDate < now;
};
```

### Exclusions:
- All sections exclude tasks with `currentStatus === "rejected"` (except My Tasks → Rejected category)
- Rejected tasks are auto-reassigned to the creator and appear in My Tasks → Rejected

---

## Review Workflow Example

**Scenario**: Tristan assigns Task A to Dennis

### Before Completion:
- **Tristan's Outbox** → WIP (task assigned, in progress)
- **Dennis's Inbox** → WIP (task assigned, in progress)

### After Dennis Completes and Submits for Review:
- **Tristan's Inbox** → Reviewing (`readyForReview = true`)
- **Dennis's Outbox** → Reviewing (`readyForReview = true`)

### After Tristan Accepts Completion:
- **Tristan's Outbox** → Done (`reviewAccepted = true`)
- **Dennis's Inbox** → Done (`reviewAccepted = true`)

---

## Summary Table

| Section | Purpose | Key Filter | Categories |
|---------|---------|------------|------------|
| **My Tasks** | Self-assigned + Rejected | `isAssignedToMe && isCreatedByMe` OR `isCreatedByMe && rejected` | Rejected, WIP, Done, Overdue (4) |
| **Inbox** | Assigned to me by others | `isAssignedToMe && !isCreatedByMe` | Received, WIP, Reviewing, Done, Overdue (5) |
| **Outbox** | I assigned to others | `isCreatedByMe && !isSelfAssignedOnly && !rejected` | Assigned, WIP, Reviewing, Done, Overdue (5) |

---

## Total Calculation
Each section's total is calculated as the **sum of all category counts** to avoid double-counting:

- **My Tasks Total** = Rejected + WIP + Done + Overdue
- **Inbox Total** = Received + WIP + Reviewing + Done + Overdue
- **Outbox Total** = Assigned + WIP + Reviewing + Done + Overdue

This ensures totals match the sum of category buttons exactly.

