# Activity Card Examples - Expanded Content

## Current Display Structure

Each activity card shows:
- **Header (always visible)**: Icon | User Name | Activity Type Text | Timestamp
- **Expanded Content (on click)**: Description | Reason (if applicable) | Photos (if applicable)

---

## 1. `progress_update`

**Header:**
```
📈 John Doe | Progress update 75% | 12/15/2024 14:30
```

**Expanded Content:**
```
Description: "Completed installation of electrical panels. All wiring tested and verified."

[Photos: 3 images shown horizontally]
```

---

## 2. `status_change` (Decline Example)

**Header:**
```
🔄 Sarah Smith | Pending → Declined | 12/15/2024 10:15
```

**Expanded Content:**
```
Description: "Task declined by Sarah Smith. Reason: Insufficient materials available"

Reason: Insufficient materials available

[No photos]
```

---

## 3. `metadata_edit`

**Header (Single field changed):**
```
✏️ Mike Johnson | Update task info: Title | 12/14/2024 16:45
```

**Header (Multiple fields changed - up to 3):**
```
✏️ Mike Johnson | Update task info: Title, Priority, Due Date | 12/14/2024 16:45
```

**Header (Many fields changed - 4+):**
```
✏️ Mike Johnson | Update task info: Title, Priority +2 more | 12/14/2024 16:45
```

**Expanded Content:**
```
Description: "Task title changed from Install Windows to Install Windows and Doors. Task priority changed from Medium to High. Task due date changed from Dec 20, 2024 to Dec 18, 2024"

[No photos]
```

**OR if editReason provided:**
```
Description: "Updated task details to reflect scope change"

[No photos]
```

---

## 4. `assignment`

**Header:**
```
👤 Lisa Chen | Task assigned to John Doe, Mike Johnson | 12/14/2024 09:00
```

**Expanded Content:**
```
Description: "Task assigned to John Doe, Mike Johnson by Lisa Chen"

[No photos]
```

**OR:**
```
Description: "Task assignment updated by Lisa Chen"

[No photos]
```

---

## 5. `creation`

**Header:**
```
➕ David Kim | Task created by David Kim | 12/13/2024 08:00
```

**Expanded Content:**
```
Description: "Task created by David Kim"

[No photos]
```

---

## 6. `cancellation`

**Header:**
```
🚫 Emma Wilson | Task cancelled by Emma Wilson | 12/12/2024 15:20
```

**Expanded Content:**
```
Description: "Task cancelled by Emma Wilson"

Reason: Project scope changed, task no longer needed

[No photos]
```

**OR (for deletion):**
```
Description: "Task deleted by Emma Wilson"

Reason: Task deleted by Emma Wilson

[No photos]
```

**OR (for archive):**
```
Description: "Task archived by Emma Wilson"

Reason: Task archived by Emma Wilson

[No photos]
```

---

## 7. `review_submission`

**Header:**
```
📤 John Doe | Submitted for review | 12/15/2024 17:00
```

**Expanded Content:**
```
Description: "Task submitted for review by John Doe"

[No photos]
```

---

## 8. `review_acceptance`

**Header:**
```
✅ Lisa Chen | Works accepted | 12/15/2024 18:30
```

**Expanded Content:**
```
Description: "Task completion accepted by Lisa Chen"

[No photos]
```

---

## 9. `review_rejection`

**Header:**
```
❌ Lisa Chen | Works rejected | 12/15/2024 18:00
```

**Expanded Content:**
```
Description: "Task completion rejected by Lisa Chen. Reason: Quality standards not met, requires additional work"

Reason: Quality standards not met, requires additional work

[Photos: 2 images shown horizontally - showing issues]
```

---

## 10. `assigner_comment`

**Header:**
```
💬 David Kim | Comments | 12/15/2024 11:00
```

**Expanded Content:**
```
Description: "Please ensure all safety protocols are followed. The site inspection is scheduled for next week."

[Photos: 1 image shown - safety checklist document]
```

---

## Notes

1. **Redundancy**: Many descriptions repeat information already shown in the header (e.g., "Task created by David Kim" appears in both header and description).

2. **Reason Extraction**: The system extracts reasons from:
   - `activity.data.reason` (preferred)
   - Parsed from description if it contains "Reason: ..."

3. **Photos**: All activity types can have photos, displayed as a horizontal scrollable gallery with 64x64 thumbnails.

4. **Description Format**: 
   - User-generated: For `progress_update` and `assigner_comment`, the description is what the user typed.
   - System-generated: For other types, descriptions are auto-generated based on the action.

