# Worker Role Screen Flow

## Overview
Workers (`role: "worker"`) have access to task execution features with limited administrative capabilities. They can view, update, and create tasks but cannot manage projects or users.

---

## Screen Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     AUTHENTICATION                            │
├─────────────────────────────────────────────────────────────┤
│  Login Screen                                                │
│  └─> Quick login buttons (test users)                        │
│      └─> OR Manual email/password login                      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    MAIN TAB NAVIGATOR                         │
│                  (Bottom Tab Bar - Hidden)                    │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Dashboard  │  │  Create Task │  │   Reports    │     │
│  │   (Home)     │  │     (New)    │  │              │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                               │
└─────────────────────────────────────────────────────────────┘
         │                │                 │
         │                │                 │
         ▼                ▼                 ▼
```

---

## 1. DASHBOARD (Home Tab)

### Main Screen: `DashboardScreen`
**Purpose**: Overview of tasks, projects, and quick actions

**Features Available**:
- ✅ **Company Banner** (image or text)
- ✅ **Project Picker** (shows assigned projects)
- ✅ **Today's Tasks** (starred tasks section)
- ✅ **Quick Overview** (task categorization):
  - **My Tasks**: Rejected, WIP, Done, Overdue
  - **Inbox**: Received, WIP, Reviewing, Done, Overdue
  - **Outbox**: Assigned, WIP, Reviewing, Done, Overdue
- ✅ **Expandable Utility FAB** (lower right):
  - Reload button
  - Logout button
  - Create New Task button

**Navigation From Dashboard**:
- Click category button → Navigate to `ProjectsTasksScreen` (with filters)
- Click starred task → Navigate to `TaskDetailScreen`
- Click "Create New Task" → Navigate to `CreateTaskScreen`
- Click Profile icon → Navigate to `ProfileScreen`
- Click "Reports" → Navigate to `ReportsScreen`

---

## 2. CREATE TASK (New Tab)

### Main Screen: `CreateTaskScreen`
**Purpose**: Create new tasks and subtasks

**Features Available**:
- ✅ Create parent tasks
- ✅ Create subtasks (nested subtasks supported)
- ✅ Edit existing tasks (if task creator)
- ✅ Assign tasks to self or others
- ✅ Set priority, due date, description
- ✅ Upload photos/documents

**Capabilities**:
- ✅ Can create tasks assigned to self
- ✅ Can create tasks assigned to others
- ✅ Can edit own tasks (pre-filled form)
- ❌ Cannot edit tasks created by others (button greyed out)

**Navigation From Create Task**:
- Back button → Return to previous screen
- After creation → Return to previous screen

---

## 3. REPORTS

### Main Screen: `ReportsScreen`
**Purpose**: View task statistics and reports

**Features Available**:
- ✅ Task completion statistics
- ✅ Project progress reports
- ✅ Task distribution charts

**Navigation From Reports**:
- Back button → Return to Dashboard

---

## 4. TASKS SCREEN (Hidden Tab - Navigable)

### Main Screen: `ProjectsTasksScreen`
**Purpose**: View and filter tasks by project and category

**Features Available**:
- ✅ **Search Bar** (filter tasks by title/description)
- ✅ **Project Filter** (if multiple projects)
- ✅ **Category Filters** (from Quick Overview):
  - Section: My Tasks, Inbox, Outbox
  - Status: Rejected, WIP, Done, Overdue, Received, Reviewing, Assigned
- ✅ **Task Cards**:
  - Priority badges
  - Status indicators
  - Star/unstar functionality
  - Photo thumbnails
  - Due date display
- ✅ **Banner Title**: Shows active filter (e.g., "Tasks in Inbox - Done")
- ✅ **Expandable Utility FAB** (lower right):
  - Reload button
  - Logout button
  - Create New Task button

**Navigation From Tasks**:
- Click task card → Navigate to `TaskDetailScreen`
- Click "Create New Task" → Navigate to `CreateTaskScreen`
- Back button → Return to Dashboard

---

## 5. TASK DETAIL SCREEN (Modal)

### Main Screen: `TaskDetailScreen`
**Purpose**: View and update task details

**Features Available**:
- ✅ **Task Information**:
  - Title, description, priority
  - Due date, completion percentage
  - Status (Not Started, In Progress, Completed, Rejected)
  - Assigned By/To user cards (clickable for phone calls)
- ✅ **Task Updates**:
  - View update history
  - View photos from updates
  - View completion progress
- ✅ **Subtasks**:
  - View nested subtasks
  - Add new subtasks (if assigned)
- ✅ **Review Workflow** (if assigned):
  - "Ready for Review" button (if 100% complete)
  - "Accept Completion" button (if task creator)
- ✅ **Task Actions**:
  - Accept/Decline task (if assigned)
  - Update progress (if assigned)
- ✅ **Task Detail Utility FAB** (lower right):
  - Camera button (take photo & update)
  - Update button (update progress)
  - Edit button (if task creator, else greyed out)

**Capabilities**:
- ✅ Can update own assigned tasks
- ✅ Can submit completed tasks for review
- ✅ Can accept/decline assigned tasks
- ✅ Can create subtasks for assigned tasks
- ✅ Can edit own created tasks
- ❌ Cannot edit tasks created by others

**Navigation From Task Detail**:
- Back button → Return to previous screen
- Click "Add Sub-Task" → Navigate to `CreateTaskScreen` (as subtask)
- Click "Edit Task" → Navigate to `CreateTaskScreen` (edit mode)
- Click user card → Phone dialer opens (if not current user)

---

## 6. PROFILE SCREEN (Hidden Tab - Navigable)

### Main Screen: `ProfileScreen`
**Purpose**: View user profile and app settings

**Features Available**:
- ✅ **User Information**:
  - Name, email, phone
  - Company name
  - Role (Worker)
- ✅ **App Settings**:
  - Environment indicator (Dev/Staging/Prod)
  - Supabase connection status
  - Reload button (manual sync)
- ✅ **Expandable Utility FAB** (lower right):
  - Reload button
  - Logout button
  - Create New Task button

**Navigation From Profile**:
- Back button → Return to Dashboard
- Click "Create New Task" → Navigate to `CreateTaskScreen`
- Click "Logout" → Return to Login Screen

---

## Restricted Features for Workers

### ❌ Admin Dashboard
- Workers do NOT see Admin Dashboard tab
- Workers do NOT have access to admin features

### ❌ Project Management
- Workers cannot create projects
- Workers cannot edit projects
- Workers cannot manage project users
- Workers can only VIEW assigned projects

### ❌ User Management
- Workers cannot access User Management screen
- Workers cannot assign/unassign users to projects
- Workers cannot change user roles

### ❌ Task Editing Restrictions
- Workers can ONLY edit tasks they created
- Workers cannot edit tasks created by others (button greyed out)

---

## Role Permissions Summary

| Feature | Worker Access |
|---------|--------------|
| View Dashboard | ✅ Yes |
| View Tasks | ✅ Yes |
| Create Tasks | ✅ Yes |
| Edit Own Tasks | ✅ Yes |
| Edit Others' Tasks | ❌ No |
| Update Task Progress | ✅ Yes (if assigned) |
| Accept/Decline Tasks | ✅ Yes (if assigned) |
| Submit for Review | ✅ Yes (if assigned & 100%) |
| Create Subtasks | ✅ Yes (if assigned) |
| View Reports | ✅ Yes |
| Create Projects | ❌ No |
| Edit Projects | ❌ No |
| Manage Users | ❌ No |
| Admin Dashboard | ❌ No |

---

## Navigation Stack Structure

```
MainTabs (Hidden Tab Bar)
├── Dashboard Stack
│   ├── DashboardScreen
│   └── TaskDetailScreen (modal)
├── CreateTask Stack
│   └── CreateTaskScreen
├── Reports Stack
│   └── ReportsScreen
├── Tasks Stack (hidden)
│   ├── ProjectsTasksScreen
│   ├── TaskDetailScreen (modal)
│   └── CreateTaskScreen (modal)
└── Profile Stack (hidden)
    └── ProfileScreen
```

---

## Key Navigation Patterns

1. **Dashboard → Tasks**: Click category button in Quick Overview
2. **Dashboard → Task Detail**: Click task card in Today's Tasks
3. **Tasks → Task Detail**: Click task card in list
4. **Task Detail → Create Sub-Task**: Click "Add Sub-Task" button
5. **Task Detail → Edit Task**: Click "Edit" in Utility FAB (if creator)
6. **Anywhere → Create Task**: Click "New Task" in Utility FAB
7. **Anywhere → Profile**: Click profile icon (if available)
8. **Anywhere → Logout**: Click "Logout" in Utility FAB

---

## Utility FAB Behavior

**Expandable Utility FAB** appears on:
- DashboardScreen
- ProjectsTasksScreen
- ProfileScreen

**Task Detail Utility FAB** appears on:
- TaskDetailScreen

**Actions**:
- Short press on main button → Expands to show actions
- Click action button → Executes action (reload/logout/create task)
- Buttons labeled: "Reload", "Logout", "New Task", "Update", "Camera", "Edit"

---

## Data Access

**Workers can view**:
- ✅ Tasks assigned to them
- ✅ Tasks they created
- ✅ Projects they're assigned to
- ✅ Users in their company
- ✅ Task updates for accessible tasks

**Workers can modify**:
- ✅ Tasks they created (edit)
- ✅ Tasks assigned to them (update progress, accept/decline)
- ✅ Create new tasks
- ✅ Create subtasks for assigned tasks

**Workers cannot modify**:
- ❌ Projects
- ❌ Users
- ❌ Tasks created by others (edit disabled)
- ❌ Project assignments

---

## Screen Access Matrix

| Screen | Access Method | Worker Permissions |
|--------|--------------|-------------------|
| LoginScreen | Default (unauth) | ✅ Full access |
| DashboardScreen | Tab navigation | ✅ Full access |
| CreateTaskScreen | Tab/FAB navigation | ✅ Full access |
| ReportsScreen | Tab navigation | ✅ Full access |
| ProjectsTasksScreen | Dashboard navigation | ✅ Full access |
| TaskDetailScreen | Task card click | ✅ Full access (edit restricted) |
| ProfileScreen | Icon/FAB navigation | ✅ Full access |
| AdminDashboardScreen | Tab navigation | ❌ Not accessible |
| ProjectsScreen | Navigation | ❌ Not accessible |
| UserManagementScreen | Navigation | ❌ Not accessible |

---

## Notes

1. **Tab Bar**: The bottom tab bar is hidden (`display: 'none'`) but screens are still navigable programmatically.

2. **Task Creation**: Workers can create tasks assigned to themselves or others, but editing is restricted to own tasks.

3. **Review Workflow**: Workers can submit completed tasks for review and accept completion of tasks they assigned to others.

4. **Project Filtering**: Workers only see projects they're assigned to in the project picker.

5. **Company Isolation**: Workers can only see users and tasks from their own company.

