# Inbox and Outbox Definitions

## Definitions

### Inbox
**Purpose**: Tasks assigned to me by OTHERS (tasks others want me to work on)

**Inclusion Criteria**:
- `assignedTo` includes my user ID (`assignedTo.includes(user.id)`)
- `assignedBy` is NOT my user ID (`assignedBy !== user.id`)
- Tasks created by others and assigned to me

**Categories** (5 total):
1. **Received** - Not accepted yet (`!accepted`)
2. **WIP** - Accepted, in progress or completed but not submitted
3. **Reviewing** - ⚠️ **Special Logic**: Tasks I CREATED that are submitted for review (awaiting my action)
   - Note: This breaks the normal Inbox rule (tasks assigned to me)
   - Exception: When tasks I created are submitted for review, they appear in my Inbox (awaiting my review action)
4. **Done** - Review accepted
5. **Overdue** - Past due date, not completed

**Key Principle**: 
- **Inbox = Actions for me** - Tasks that require my action or attention
- **Standard rule**: Tasks assigned to me by others (`assignedTo.includes(me) && assignedBy !== me`)
- **Exception for Reviewing**: Tasks I CREATED (`assignedBy === me`) that are submitted for review
- When assignee submits for review → Appears in **assigner's Inbox** (assigner needs to review)

---

### Outbox
**Purpose**: Tasks I CREATED and assigned to OTHERS (tasks I delegated and am tracking)

**Inclusion Criteria**:
- `assignedBy` is my user ID (`assignedBy === user.id`)
- Task is assigned to others (not purely self-assigned)
- Excludes rejected tasks (they show in My Tasks)

**Categories** (5 total):
1. **Assigned** - Not accepted yet (`!accepted`)
2. **WIP** - Accepted, in progress or completed but not submitted
3. **Reviewing** - ⚠️ **Special Logic**: Tasks I'm ASSIGNED TO that I submitted for review (I submitted them)
   - Note: This breaks the normal Outbox rule (tasks I created)
   - Exception: When tasks assigned to me are submitted for review, they appear in my Outbox (I submitted them)
4. **Done** - Review accepted
5. **Overdue** - Past due date, not completed

**Key Principle**: 
- **Outbox = Things I initiated** - Tasks I created/delegated to others
- **Standard rule**: Tasks I created (`assignedBy === me`) and assigned to others
- **Exception for Reviewing**: Tasks I'm ASSIGNED TO (`assignedTo.includes(me) && assignedBy !== me`) that I submitted
- When assignee submits for review → Appears in **assignee's Outbox** (they submitted it)

---

## Summary Table

| Section | Purpose | Key Filter | What It Shows |
|---------|---------|------------|---------------|
| **Inbox** | Tasks assigned to me by others | `assignedTo.includes(me) && assignedBy !== me` | Tasks others want me to work on |
| **Outbox** | Tasks I created and assigned to others | `assignedBy === me && assignedTo !== [me]` | Tasks I delegated to others |

---

## Example: Tristan assigns Task A to Dennis

### Tristan's View (Assigner)
- **Inbox**:
  - Reviewing: Task A (after Dennis submits - awaiting Tristan's action)
  - Done: Task A (after Tristan accepts)
- **Outbox**:
  - Assigned: Task A (before Dennis accepts)
  - WIP: Task A (while Dennis is working)
  - Done: Task A (after Tristan accepts)

### Dennis's View (Assignee)
- **Inbox**:
  - Received: Task A (before accepting)
  - WIP: Task A (while working)
  - Done: Task A (after Tristan accepts)
- **Outbox**:
  - Reviewing: Task A (after Dennis submits - he submitted it)

---

## Special Cases

### Reviewing Category Logic

**Inbox → Reviewing**:
- Filters tasks I CREATED (`assignedBy === user.id`)
- These are tasks awaiting my review action
- Example: I assigned Task A to Dennis, Dennis submitted → My Inbox → Reviewing

**Outbox → Reviewing**:
- Filters tasks I'm ASSIGNED TO (`assignedTo.includes(user.id) && assignedBy !== user.id`)
- These are tasks I submitted for review
- Example: Dennis assigned Task A to me, I submitted → My Outbox → Reviewing

**Why Different?**
- Inbox Reviewing: Shows what I need to DO (review tasks I assigned)
- Outbox Reviewing: Shows what I SUBMITTED (tasks I completed and submitted)

---

## Differences from Other Sections

### Inbox vs My Tasks
- **Inbox**: Tasks assigned to me by OTHERS
- **My Tasks**: Tasks I assigned to MYSELF (self-assigned)

### Outbox vs My Tasks
- **Outbox**: Tasks I assigned to OTHERS (tracking their work)
- **My Tasks**: Tasks I assigned to MYSELF (my own work)

### Inbox vs Outbox
- **Inbox**: Tasks others want me to work on (they created, I'm assigned)
- **Outbox**: Tasks I want others to work on (I created, they're assigned)

---

## Complete Definition

### Inbox Definition
**Tasks assigned to me by others that require my action or attention.**

Includes:
- Tasks created by others and assigned to me
- Tasks awaiting my acceptance
- Tasks I'm working on (assigned by others)
- Tasks I created that are submitted for review (awaiting my review action)
- Tasks where review was accepted (assigned by others)

### Outbox Definition
**Tasks I created and assigned to others that I'm tracking.**

Includes:
- Tasks I created and assigned to others
- Tasks awaiting assignee acceptance
- Tasks assignee is working on
- Tasks I'm assigned to that I submitted for review (I submitted them)
- Tasks where review was accepted (I accepted the completion)

---

## Code Implementation

### Inbox Filter
```typescript
const inboxTasks = projectFilteredTasks.filter(task => {
  const assignedTo = task.assignedTo || [];
  const isAssignedToMe = assignedTo.includes(user.id);
  const isCreatedByMe = task.assignedBy === user.id;
  
  // Include if assigned to me but NOT created by me
  return isAssignedToMe && !isCreatedByMe;
});
```

### Outbox Filter
```typescript
const outboxTasks = projectFilteredTasks.filter(task => {
  const assignedTo = task.assignedTo || [];
  const isAssignedToMe = assignedTo.includes(user.id);
  const isCreatedByMe = task.assignedBy === user.id;
  const isSelfAssignedOnly = isCreatedByMe && isAssignedToMe && assignedTo.length === 1;
  
  // Include if created by me (regardless of whether I'm also assigned)
  // Exclude rejected tasks and pure self-assigned tasks
  return isCreatedByMe && !isSelfAssignedOnly && task.currentStatus !== "rejected";
});
```

---

## Key Takeaways

1. **Inbox = Tasks for me**: What others want me to do
2. **Outbox = Tasks from me**: What I want others to do
3. **Reviewing is special**: 
   - Inbox Reviewing = Tasks I created awaiting my review
   - Outbox Reviewing = Tasks I'm assigned to that I submitted
4. **Mutually exclusive**: A task can't be in both Inbox and Outbox (except reviewing category which uses different filters)

