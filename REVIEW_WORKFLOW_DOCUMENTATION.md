# Review Workflow Documentation

## Overview
When a task is submitted for review, it appears in different sections for different users based on their role in the task (assigner vs assignee).

---

## Review Workflow Flow

### Step 1: Task Assignment
**Tristan assigns Task A to Dennis**

| User | Section | Category | Description |
|------|---------|----------|-------------|
| **Tristan** (Assigner) | Outbox | WIP | Task is assigned, Dennis is working on it |
| **Dennis** (Assignee) | Inbox | WIP | Task is accepted, working on it |

---

### Step 2: Assignee Completes and Submits for Review
**Dennis completes Task A (100%) and submits for review**

When `readyForReview = true`:
- Task appears in **assigner's Inbox** → **Reviewing** (awaiting assigner's action)
- Task appears in **assignee's Outbox** → **Reviewing** (assignee submitted it)

| User | Section | Category | Description |
|------|---------|----------|-------------|
| **Tristan** (Assigner) | **Inbox** | **Reviewing** | ⚠️ **Awaiting assigner's action** - Dennis submitted for review |
| **Dennis** (Assignee) | **Outbox** | **Reviewing** | Assignee submitted for review |

**Key Point**: 
- Assigner sees it in **Inbox** because they need to **take action** (accept or reject)
- Assignee sees it in **Outbox** because they **submitted** it

---

### Step 3: Assigner Accepts Completion
**Tristan accepts Dennis's completion**

When `reviewAccepted = true`:
- Task appears in **assigner's Outbox** → **Done** (I accepted the completion)
- Task appears in **assignee's Inbox** → **Done** (Assigner accepted my completion)

| User | Section | Category | Description |
|------|---------|----------|-------------|
| **Tristan** (Assigner) | Outbox | Done | ✅ I accepted the completion |
| **Dennis** (Assignee) | Inbox | Done | ✅ Assigner accepted my completion |

---

## Logic Implementation

### Inbox → Reviewing Category
**Purpose**: Tasks assigned to me by others that need my review action

```typescript
const inboxReviewingTasks = inboxAllTasks.filter(task => 
  task.completionPercentage === 100 &&
  task.readyForReview === true &&
  task.reviewAccepted !== true
);
```

**Criteria**:
- Task is in my **Inbox** (assigned to me by others)
- Task is 100% complete
- Task is submitted for review (`readyForReview === true`)
- Review not yet accepted (`reviewAccepted !== true`)

**Result**: Assigner sees tasks waiting for their review action in **Inbox → Reviewing**

---

### Outbox → Reviewing Category
**Purpose**: Tasks I assigned to others that have been submitted for review

```typescript
const outboxReviewingTasks = outboxAllTasks.filter(task => 
  task.completionPercentage === 100 &&
  task.readyForReview === true &&
  task.reviewAccepted !== true
);
```

**Criteria**:
- Task is in my **Outbox** (I created and assigned it)
- Task is 100% complete
- Task is submitted for review (`readyForReview === true`)
- Review not yet accepted (`reviewAccepted !== true`)

**Result**: Assignee sees tasks they submitted for review in **Outbox → Reviewing**

---

## Tallying Logic

### For Assigner (Tristan)

**Inbox Total** includes:
- Received (not accepted yet)
- WIP (accepted, in progress)
- **Reviewing** (assignee submitted for review - **awaiting my action**) ⚠️
- Done (review accepted)
- Overdue (past due date)

**Outbox Total** includes:
- Assigned (not accepted yet)
- WIP (accepted, in progress)
- **Reviewing** (assignee submitted for review - they submitted it)
- Done (review accepted)
- Overdue (past due date)

**Important**: 
- When Dennis submits for review, Task A appears in **Tristan's Inbox → Reviewing** (awaiting action)
- When Tristan accepts, Task A moves to **Tristan's Outbox → Done**

---

### For Assignee (Dennis)

**Inbox Total** includes:
- Received (not accepted yet)
- WIP (accepted, in progress)
- Reviewing (assignee submitted for review - waiting for assigner)
- Done (review accepted)
- Overdue (past due date)

**Outbox Total** includes:
- Assigned (not accepted yet)
- WIP (accepted, in progress)
- **Reviewing** (I submitted for review - **I submitted it**) ⚠️
- Done (review accepted)
- Overdue (past due date)

**Important**: 
- When Dennis submits for review, Task A appears in **Dennis's Outbox → Reviewing** (he submitted it)
- When Tristan accepts, Task A moves to **Dennis's Inbox → Done**

---

## Complete Workflow Example

### Scenario: Tristan assigns "Build Feature X" to Dennis

| Stage | Tristan's View | Dennis's View |
|-------|----------------|---------------|
| **1. Assignment** | Outbox → Assigned | Inbox → Received |
| **2. Dennis Accepts** | Outbox → WIP | Inbox → WIP |
| **3. Dennis Completes** | Outbox → WIP (100%, not submitted) | Inbox → WIP (100%, not submitted) |
| **4. Dennis Submits for Review** | **Inbox → Reviewing** ⚠️ | **Outbox → Reviewing** ⚠️ |
| **5. Tristan Accepts** | Outbox → Done ✅ | Inbox → Done ✅ |

---

## Key Principles

1. **Inbox = Actions for me**: Tasks that require my action appear in Inbox
   - When assignee submits for review → **Assigner's Inbox → Reviewing** (assigner needs to review)

2. **Outbox = Things I initiated**: Tasks I created/assigned appear in Outbox
   - When assignee submits for review → **Assignee's Outbox → Reviewing** (they submitted it)

3. **Reviewing Category Logic**:
   - **Assigner's Inbox → Reviewing**: Tasks waiting for my review action
   - **Assignee's Outbox → Reviewing**: Tasks I submitted for review

4. **Done Category Logic**:
   - **Assigner's Outbox → Done**: I accepted the completion
   - **Assignee's Inbox → Done**: Assigner accepted my completion

---

## Database Fields

- `readyForReview`: Boolean - Indicates task is submitted for review
- `reviewAccepted`: Boolean - Indicates review has been accepted
- `reviewedBy`: UUID - User ID who reviewed the task
- `reviewedAt`: Timestamp - When the task was reviewed

---

## Edge Cases

### Case 1: Assigner Rejects Review
If assigner rejects the review:
- Reset `readyForReview = false`
- Task returns to **assignee's Inbox → WIP** (needs revision)
- Task returns to **assigner's Outbox → WIP** (awaiting revision)

### Case 2: Multiple Assignees
If task has multiple assignees:
- When one assignee submits for review, it appears in **assigner's Inbox → Reviewing**
- Each assignee who submitted sees it in their **Outbox → Reviewing**

### Case 3: Self-Assigned Tasks
Self-assigned tasks don't have review workflow:
- When I complete a self-assigned task → **My Tasks → Done** (no review needed)

---

## Summary

✅ **Tasks submitted for review appear in assigner's Inbox** (awaiting action)
✅ **Tasks submitted for review appear in assignee's Outbox** (they submitted it)
✅ **Tallying correctly reflects this behavior**
✅ **Categories are mutually exclusive**
✅ **Complete workflow documented**

