# Contact Person System - Visual Guide

This document provides visual representations of how the Contact Person system works.

---

## 📊 System Architecture

### Database Relationships

```
┌─────────────────┐
│   companies     │
│  - id           │
│  - name         │
│  - type         │
└────────┬────────┘
         │
         │ 1:N
         │
┌────────▼────────┐         ┌──────────────────┐
│     users       │         │    projects      │
│  - id           │         │  - id            │
│  - name         │         │  - name          │
│  - company_id   │         │  - company_id ◄──┼─── Owner Company
│  - email        │         │  - created_by ◄──┼─── Initial Contact Person
└────────┬────────┘         └─────────┬────────┘
         │                            │
         │                            │
         │  ┌─────────────────────────┘
         │  │
         │  │    ┌──────────────────────────────────────┐
         └──┼────┤ company_project_relationships        │
            │    │  - id                                │
            │    │  - project_id                        │
            └────┤  - company_id                        │
                 │  - parent_company_id (hierarchy)     │
            ┌────┤  - contact_person_user_id ◄──────────┼─── WHO is contact
            │    │  - relationship_type                 │
            │    │  - invited_by_user_id                │
            │    └──────────────────────────────────────┘
            │
            │
       ┌────▼───────────────┐
       │ user_project_roles │
       │  - user_id         │
       │  - project_id      │
       │  - role_id         │
       │  - is_contact_person (flag)
       └────────────────────┘
```

---

## 🏗️ Company Hierarchy Examples

### Example 1: Simple Two-Level Hierarchy

```
┌─────────────────────────────────────────────────────────┐
│                  PROJECT: Office Building                │
└─────────────────────────────────────────────────────────┘
                            │
                ┌───────────┴───────────┐
                │                       │
      ┌─────────▼──────────┐  ┌─────────▼──────────┐
      │   BuildTrack Inc.  │  │   Task Flow        │
      │      (Owner)       │  │                    │
      │  Level: 0          │  │                    │
      └─────────┬──────────┘  └────────────────────┘
                │
        ┌───────┴────────┐
        │                │
┌───────▼────────┐  ┌────▼──────────┐
│ ⭐ John Doe    │  │ Sarah Worker  │
│ Contact Person │  │ Team Member   │
└───────┬────────┘  └───────────────┘
        │
        │ Can invite subcontractors
        │
    ┌───┴────┬────────────┬──────────┐
    │        │            │          │
┌───▼────┐ ┌─▼──────┐ ┌──▼──────┐ ┌─▼─────┐
│Electric│ │Plumbing│ │ HVAC    │ │Painting│
│Co.     │ │Pro     │ │Systems  │ │Plus    │
│        │ │        │ │         │ │        │
│⭐Mike  │ │⭐Susan │ │⭐Carlos │ │⭐David │
└────────┘ └────────┘ └─────────┘ └────────┘
  Level 1    Level 1    Level 1     Level 1
```

### Example 2: Three-Level Hierarchy (Sub-subcontractors)

```
                    🏢 BuildTrack Inc. (Owner)
                         ⭐ John (Contact)
                         👤 Sarah
                         👤 Alex
                              │
                 ┌────────────┼────────────┐
                 │            │            │
         🏢 Electric Co.  🏢 Plumbing  🏢 HVAC
         ⭐ Mike (Contact)  ⭐ Susan    ⭐ Carlos
         👤 Lisa                          │
              │                           │
              │                      ┌────┴────┐
              │                      │         │
     🏢 Wire Specialists      🏢 Duct Co.  🏢 Controls
     ⭐ Bob (Contact)         ⭐ Frank     ⭐ Grace
     👤 Tom
     👤 Jerry
```

**Visibility in Example 2:**

| User | Can See Users |
|------|---------------|
| **John (Owner)** | John, Sarah, Alex, Mike, Susan, Carlos |
| **Sarah (Owner Team)** | John, Sarah, Alex |
| **Mike (Level 1)** | John, Sarah, Alex, Mike, Lisa |
| **Lisa (Level 1 Team)** | John, Sarah, Alex, Mike, Lisa |
| **Bob (Level 2)** | John, Sarah, Alex, Mike, Lisa, Bob, Tom, Jerry |
| **Tom (Level 2 Team)** | John, Sarah, Alex, Mike, Lisa, Bob, Tom, Jerry |
| **Carlos (Level 1)** | John, Sarah, Alex, Carlos, Frank, Grace |

**Key Point:** John CANNOT see Bob, Tom, or Jerry (they're downstream of Mike)

---

## 🔄 Task Assignment Flow

### Scenario: Owner Assigns Task to Subcontractor

```
STEP 1: Task Creation
┌─────────────────────┐
│  John (BuildTrack)  │
│  "Paint the lobby"  │
└──────────┬──────────┘
           │
           │ assigns to
           ▼
     ┌─────────────┐
     │ Task #123   │
     │ Status: New │
     │ Owner: John │
     │ Assigned:   │
     │  - David    │
     └─────────────┘

STEP 2: David Accepts
┌──────────────────────┐
│ David (Painting Plus)│
│ Accepts task         │
└──────────┬───────────┘
           │
           ▼
     ┌─────────────┐
     │ Task #123   │
     │ Status:     │
     │  Accepted   │
     └─────────────┘

STEP 3: David Delegates to Team
┌──────────────────────┐
│ David                │
│ "I'll assign this to"│
│ "my team members"    │
└──────────┬───────────┘
           │
           │ can assign to:
           │  ✅ His team members
           │  ✅ His subcontractors
           │  ✅ Upstream (John, Sarah, Alex)
           │
           ▼
     ┌─────────────┐
     │ Sub-Task A  │
     │ Assigned:   │
     │  - Emma     │ ◄─── David's team member
     └─────────────┘
     ┌─────────────┐
     │ Sub-Task B  │
     │ Assigned:   │
     │  - Frank    │ ◄─── David's subcontractor
     └─────────────┘

STEP 4: John's View
┌──────────────────────┐
│ John sees:           │
│                      │
│ Task #123            │
│  Assigned to: David  │
│  Status: In Progress │
│                      │
│  ❌ Cannot see       │
│     Sub-Task A (Emma)│
│  ❌ Cannot see       │
│     Sub-Task B (Frank│
└──────────────────────┘
```

---

## 👥 User Selection UI Mockups

### When Creating a Task (Contact Person View)

```
┌────────────────────────────────────────────┐
│  Create Task                               │
├────────────────────────────────────────────┤
│  Title: Install electrical panels          │
│  Description: ________________________     │
│              ________________________     │
│                                            │
│  📍 Assign To:                             │
│  ┌──────────────────────────────────────┐ │
│  │ 🔍 Search users...                   │ │
│  └──────────────────────────────────────┘ │
│                                            │
│  ▼ My Team (BuildTrack Inc.)              │
│  ┌──────────────────────────────────────┐ │
│  │ ☐ 👤 Sarah Worker                    │ │
│  │ ☐ 👤 Alex Admin                      │ │
│  └──────────────────────────────────────┘ │
│                                            │
│  ▼ Subcontractors                         │
│  ┌──────────────────────────────────────┐ │
│  │ ☑ ⭐ Mike Johnson                    │ │
│  │    Elite Electric Co.                │ │
│  │                                       │ │
│  │ ☐ ⭐ Susan Smith                     │ │
│  │    Plumbing Pro                      │ │
│  └──────────────────────────────────────┘ │
│                                            │
│  ⚠️ Note: Only contact persons of         │
│     subcontractors are shown              │
│                                            │
│  [Cancel]                   [Create Task] │
└────────────────────────────────────────────┘
```

### When Creating a Task (Regular Team Member View)

```
┌────────────────────────────────────────────┐
│  Create Task                               │
├────────────────────────────────────────────┤
│  Title: Review blueprints                  │
│  Description: ________________________     │
│              ________________________     │
│                                            │
│  📍 Assign To:                             │
│  ┌──────────────────────────────────────┐ │
│  │ 🔍 Search users...                   │ │
│  └──────────────────────────────────────┘ │
│                                            │
│  ▼ My Team (BuildTrack Inc.)              │
│  ┌──────────────────────────────────────┐ │
│  │ ☐ ⭐ John Doe (Contact Person)       │ │
│  │ ☐ 👤 Sarah Worker                    │ │
│  │ ☐ 👤 Alex Admin                      │ │
│  └──────────────────────────────────────┘ │
│                                            │
│  ℹ️ You can only assign to your team      │
│                                            │
│  [Cancel]                   [Create Task] │
└────────────────────────────────────────────┘
```

---

## 📨 Invitation Flow

### Flow 1: Invite Team Member (Same Company)

```
┌──────────────────────┐
│  John (Contact)      │
│  BuildTrack Inc.     │
└──────────┬───────────┘
           │
           │ clicks "Add Team Member"
           ▼
┌─────────────────────────────────────┐
│  Add Team Member                    │
├─────────────────────────────────────┤
│  Select from company:               │
│  ┌───────────────────────────────┐ │
│  │ ☐ Emma Johnson                │ │
│  │   Not on this project         │ │
│  │                               │ │
│  │ ☐ Robert Lee                  │ │
│  │   Not on this project         │ │
│  └───────────────────────────────┘ │
│                                     │
│  [Cancel]              [Add (2)]   │
└─────────────────────────────────────┘
           │
           │ adds
           ▼
┌──────────────────────┐
│  Emma & Robert       │
│  Added to project    │
│  Role: Worker        │
└──────────────────────┘
```

### Flow 2: Invite Subcontractor (External Company)

```
┌──────────────────────┐
│  John (Contact)      │
│  BuildTrack Inc.     │
└──────────┬───────────┘
           │
           │ clicks "Invite Subcontractor"
           ▼
┌─────────────────────────────────────┐
│  Invite Subcontractor               │
├─────────────────────────────────────┤
│  Contact Information:               │
│  Email: mike@electric.com           │
│  Phone: (555) 123-4567              │
│                                     │
│  ☑ Designate as Contact Person     │
│     for their company               │
│                                     │
│  Proposed Role:                     │
│  ⚪ Contractor                      │
│  ⦿ Subcontractor                   │
│  ⚪ Inspector                       │
│                                     │
│  Message (optional):                │
│  ┌───────────────────────────────┐ │
│  │ We need electrical work for   │ │
│  │ the office building project.  │ │
│  └───────────────────────────────┘ │
│                                     │
│  [Cancel]           [Send Invite]  │
└─────────────────────────────────────┘
           │
           │ sends
           ▼
┌──────────────────────────────────────┐
│  📧 Email/SMS to Mike                │
│  "John invited you to join           │
│   Office Building project as         │
│   Contact Person for Elite Electric" │
└──────────┬───────────────────────────┘
           │
           │ Mike clicks link
           ▼
┌─────────────────────────────────────┐
│  Accept Invitation                  │
├─────────────────────────────────────┤
│  Project: Office Building           │
│  Invited by: John (BuildTrack Inc.) │
│                                     │
│  You will be the Contact Person     │
│  for Elite Electric Co. on this     │
│  project.                           │
│                                     │
│  As Contact Person you can:         │
│  ✓ Add your team members            │
│  ✓ Invite your subcontractors       │
│  ✓ Assign tasks to your team        │
│                                     │
│  [Decline]              [Accept]    │
└─────────────────────────────────────┘
           │
           │ accepts
           ▼
┌──────────────────────────────────────┐
│  ✅ Success!                         │
│  You are now part of the project    │
│  as Contact Person.                 │
│                                      │
│  Next steps:                         │
│  • Add your team members             │
│  • Review assigned tasks             │
└──────────────────────────────────────┘
```

---

## 🎭 Visibility States

### Example: Multi-Company Project View

#### John's View (Owner Company Contact Person)
```
┌────────────────────────────────────┐
│  Project Members (8)               │
├────────────────────────────────────┤
│  🏢 BuildTrack Inc. (My Company)   │
│    ⭐ John Doe (You)               │
│    👤 Sarah Worker                 │
│    👤 Alex Admin                   │
│                                    │
│  🏢 Elite Electric Co.             │
│    ⭐ Mike Johnson (Contact)       │
│    ℹ️ 2 team members               │ ◄─ Can't see details
│                                    │
│  🏢 Plumbing Pro                   │
│    ⭐ Susan Smith (Contact)        │
│    ℹ️ 1 team member                │ ◄─ Can't see details
│                                    │
│  🏢 HVAC Systems                   │
│    ⭐ Carlos Rodriguez (Contact)   │
│    ℹ️ 3 team members               │ ◄─ Can't see details
└────────────────────────────────────┘
```

#### Mike's View (Subcontractor Contact Person)
```
┌────────────────────────────────────┐
│  Project Members (6)               │
├────────────────────────────────────┤
│  🏢 BuildTrack Inc. (Owner)        │
│    ⭐ John Doe (Contact)           │
│    👤 Sarah Worker                 │
│    👤 Alex Admin                   │
│                                    │
│  🏢 Elite Electric Co. (My Company)│
│    ⭐ Mike Johnson (You)           │
│    👤 Lisa Martinez                │
│                                    │
│  🏢 Wire Specialists               │  ◄─ Mike's subcontractor
│    ⭐ Bob Smith (Contact)          │
└────────────────────────────────────┘

❌ Cannot see: Plumbing Pro, HVAC Systems (sibling subcontractors)
```

#### Sarah's View (Owner Company Team Member)
```
┌────────────────────────────────────┐
│  Project Members (3)               │
├────────────────────────────────────┤
│  🏢 BuildTrack Inc. (My Company)   │
│    ⭐ John Doe (Contact)           │
│    👤 Sarah Worker (You)           │
│    👤 Alex Admin                   │
└────────────────────────────────────┘

❌ Cannot see: Any subcontractors (not contact person)
✅ Can see them if assigned task by/to them
```

---

## 🔀 Contact Person Transfer Flow

```
BEFORE TRANSFER:
┌─────────────────────────┐
│ BuildTrack Inc.         │
│ ⭐ John (Contact)       │ ◄─── Has all permissions
│ 👤 Sarah                │
│ 👤 Alex                 │
└─────────────────────────┘

STEP 1: John initiates transfer
┌─────────────────────────────────────┐
│  Transfer Contact Person Role       │
├─────────────────────────────────────┤
│  Current: John Doe (You)            │
│                                     │
│  Transfer to:                       │
│  ⦿ Sarah Worker                     │
│  ⚪ Alex Admin                      │
│                                     │
│  ⚠️ Warning:                        │
│  You will lose the ability to:     │
│  • Invite subcontractors            │
│  • Add team members                 │
│  • Manage project access            │
│                                     │
│  This action cannot be undone.      │
│                                     │
│  [Cancel]              [Transfer]   │
└─────────────────────────────────────┘

STEP 2: Confirm
┌─────────────────────────────────────┐
│  ⚠️ Confirm Transfer                │
├─────────────────────────────────────┤
│  Are you sure you want to transfer  │
│  Contact Person role to Sarah?      │
│                                     │
│  Type "TRANSFER" to confirm:        │
│  ┌───────────────────────────────┐ │
│  │ TRANSFER                      │ │
│  └───────────────────────────────┘ │
│                                     │
│  [Cancel]              [Confirm]    │
└─────────────────────────────────────┘

AFTER TRANSFER:
┌─────────────────────────┐
│ BuildTrack Inc.         │
│ 👤 John                 │
│ ⭐ Sarah (Contact)      │ ◄─── Now has all permissions
│ 👤 Alex                 │
└─────────────────────────┘
```

---

## 📊 Permission Matrix

### Actions by User Type

| Action | Owner Contact | Subcontractor Contact | Team Member | Admin |
|--------|---------------|----------------------|-------------|-------|
| **Add team members from own company** | ✅ | ✅ | ❌ | ✅ |
| **Remove team members from own company** | ✅ | ✅ | ❌ | ✅ |
| **Invite subcontractor company** | ✅ | ✅ | ❌ | ✅ |
| **See all subcontractor team members** | ❌ | ❌ | ❌ | ✅ |
| **See upstream company members** | N/A | ✅ | ✅ | ✅ |
| **Assign task to subcontractor contact** | ✅ | ✅ | ❌ | ✅ |
| **Assign task to own team** | ✅ | ✅ | ✅ | ✅ |
| **Transfer contact person role** | ✅ | ✅ | ❌ | ✅ |
| **Leave project** | ❌* | ❌* | ✅ | ✅ |

*Must transfer contact person role first

---

## 🔍 Search & Filter UI

### User Search with Visibility
```
┌────────────────────────────────────────────┐
│  Select User                               │
├────────────────────────────────────────────┤
│  🔍 Search: "john"                         │
│                                            │
│  Results (showing only visible users):     │
│  ┌──────────────────────────────────────┐ │
│  │ ⭐ John Doe                          │ │
│  │    BuildTrack Inc. (Contact Person)  │ │
│  │    ✓ Can assign tasks                │ │
│  │                                       │ │
│  │ 👤 John Smith                        │ │
│  │    BuildTrack Inc.                   │ │
│  │    ✓ Same company                    │ │
│  └──────────────────────────────────────┘ │
│                                            │
│  Filters:                                  │
│  ☑ My Company                              │
│  ☑ Contact Persons                         │
│  ☐ Subcontractors                          │
│  ☐ Task-related only                       │
└────────────────────────────────────────────┘
```

---

## 📈 Scalability Visualization

### Large Project with Many Subcontractors
```
                        🏢 Owner (Level 0)
                        ⭐ 1 Contact + 10 team
                                │
          ┌─────────────────────┼─────────────────────┐
          │                     │                     │
    🏢 Sub 1 (L1)         🏢 Sub 2 (L1)        🏢 Sub 3 (L1)
    ⭐ 1 + 5 team         ⭐ 1 + 8 team        ⭐ 1 + 3 team
          │                     │                     │
     ┌────┴────┐           ┌────┴────┐          ┌────┴────┐
     │         │           │         │          │         │
  Sub 1.1   Sub 1.2     Sub 2.1   Sub 2.2    Sub 3.1   Sub 3.2
  ⭐1+2     ⭐1+4       ⭐1+6     ⭐1+3      ⭐1+5     ⭐1+7
     │
  Sub 1.1.1
  ⭐1+3

Total: 15 companies, ~70 users
Owner sees: 1 + 10 + 3 = 14 users (own team + 3 L1 contacts)
Sub 1 sees: 1 + 5 + 11 + 2 = 19 users (own, owner, 2 L2 contacts)
```

**Visibility Scales:**
- User only sees relevant people
- Database queries use indexes
- RLS ensures security
- O(1) lookup for contact person
- O(log n) for hierarchy traversal

---

*For complete technical implementation details, see `CONTACT_PERSON_IMPLEMENTATION_PLAN.md`*

