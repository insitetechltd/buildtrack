# Complete App Screen Flow - BuildTrack

## Overview
This document provides a comprehensive map of all screens in the BuildTrack app, organized by user role and navigation hierarchy.

---

## Screen Categories

### 1. **Authentication Screens** (Unauthenticated)
### 2. **Worker/Manager Screens** (Non-Admin)
### 3. **Admin Screens** (Admin Only)
### 4. **Shared Screens** (All Roles)

---

## 1. AUTHENTICATION SCREENS

### **LoginScreen** (`src/screens/LoginScreen.tsx`)
**Purpose**: User authentication  
**Access**: Unauthenticated users  
**Features**:
- Email/password login
- Quick login buttons (test users)
- Toggle to registration screen
- Environment indicator

**Navigation**:
- Login success → Dashboard/AdminDashboard
- Click "Register" → RegisterScreen

---

### **RegisterScreen** (`src/screens/RegisterScreen.tsx`)
**Purpose**: New user registration  
**Access**: Unauthenticated users  
**Features**:
- User registration form
- Email, password, name, phone, company
- Role selection (admin/manager/worker)
- Toggle back to login

**Navigation**:
- Registration success → LoginScreen
- Click "Back to Login" → LoginScreen

---

## 2. WORKER/MANAGER SCREENS (Non-Admin)

### **DashboardScreen** (`src/screens/DashboardScreen.tsx`)
**Purpose**: Main dashboard with task overview  
**Access**: Non-admin users (workers, managers)  
**Tab**: Home (first tab)

**Features**:
- ✅ Company banner (image or text)
- ✅ Project picker (assigned projects)
- ✅ Today's Tasks (starred tasks section)
- ✅ Quick Overview categories:
  - **My Tasks**: Rejected, WIP, Done, Overdue
  - **Inbox**: Received, WIP, Reviewing, Done, Overdue
  - **Outbox**: Assigned, WIP, Reviewing, Done, Overdue
- ✅ Expandable Utility FAB (Reload, Logout, New Task)
- ✅ Pull-to-refresh

**Navigation**:
- Click category button → ProjectsTasksScreen (filtered)
- Click starred task → TaskDetailScreen
- Click "New Task" FAB → CreateTaskScreen
- Click profile icon → ProfileScreen
- Click "Reports" → ReportsScreen

---

### **CreateTaskScreen** (`src/screens/CreateTaskScreen.tsx`)
**Purpose**: Create and edit tasks  
**Access**: Non-admin users  
**Tab**: New (second tab)

**Features**:
- ✅ Create parent tasks
- ✅ Create subtasks (nested)
- ✅ Edit existing tasks (if creator)
- ✅ Assign to users
- ✅ Set priority, due date, description
- ✅ Upload photos/documents
- ✅ Camera integration

**Modes**:
- **Create Mode**: New task
- **Edit Mode**: Pre-filled with existing task data
- **Sub-Task Mode**: Create as subtask of parent

**Navigation**:
- Back button → Previous screen
- After creation → Return to previous screen

---

### **ReportsScreen** (`src/screens/ReportsScreen.tsx`)
**Purpose**: View task statistics  
**Access**: Non-admin users  
**Tab**: Reports (third tab)

**Features**:
- ✅ Task completion statistics
- ✅ Project progress reports
- ✅ Task distribution charts
- ✅ Time-based analytics

**Navigation**:
- Back button → Dashboard

---

### **ProjectsTasksScreen** (`src/screens/ProjectsTasksScreen.tsx`)
**Purpose**: Filtered task list view  
**Access**: Non-admin users  
**Tab**: Hidden (navigable from Dashboard)

**Features**:
- ✅ Search bar (filter by title/description)
- ✅ Project filter dropdown
- ✅ Category filters (section + status)
- ✅ Task cards with:
  - Priority badges
  - Status indicators
  - Star/unstar functionality
  - Photo thumbnails
  - Due dates
- ✅ Dynamic banner title (e.g., "Tasks in Inbox - Done")
- ✅ Expandable Utility FAB

**Navigation**:
- Click task card → TaskDetailScreen
- Click "New Task" FAB → CreateTaskScreen
- Back button → Dashboard

---

### **TaskDetailScreen** (`src/screens/TaskDetailScreen.tsx`)
**Purpose**: View and update task details  
**Access**: Non-admin users  
**Presentation**: Modal

**Features**:
- ✅ **Task Information**:
  - Title, description, priority
  - Due date, completion percentage
  - Status badges
  - Assigned By/To cards (clickable for phone calls)
- ✅ **Task Updates**:
  - Update history timeline
  - Photo gallery from updates
  - Completion progress
- ✅ **Subtasks**:
  - View nested subtasks
  - Add new subtasks (if assigned)
- ✅ **Review Workflow**:
  - "Ready for Review" button (assignee, 100% complete)
  - "Accept Completion" button (creator)
- ✅ **Task Actions**:
  - Accept/Decline task (if assigned)
  - Update progress (if assigned)
- ✅ **Task Detail Utility FAB**:
  - Camera button (take photo & update)
  - Update button (update progress)
  - Edit button (if creator, else greyed out)

**Navigation**:
- Back button → Previous screen
- Click "Add Sub-Task" → CreateTaskScreen (subtask mode)
- Click "Edit Task" → CreateTaskScreen (edit mode)
- Click user card → Phone dialer (if not current user)

---

### **ProfileScreen** (`src/screens/ProfileScreen.tsx`)
**Purpose**: User profile and settings  
**Access**: All authenticated users  
**Tab**: Hidden (accessible via navigation)

**Features**:
- ✅ User information:
  - Name, email, phone
  - Company name
  - Role (Worker/Manager/Admin)
- ✅ App settings:
  - Environment indicator (Dev/Staging/Prod)
  - Supabase connection status
  - Reload button (manual sync)
- ✅ Expandable Utility FAB

**Navigation**:
- Back button → Dashboard/AdminDashboard
- Click "New Task" FAB → CreateTaskScreen
- Click "Logout" FAB → LoginScreen

---

## 3. ADMIN SCREENS

### **AdminDashboardScreen** (`src/screens/AdminDashboardScreen.tsx`)
**Purpose**: Admin overview dashboard  
**Access**: Admin users only  
**Tab**: Dashboard (first tab for admins)

**Features**:
- ✅ Company information banner
- ✅ Company statistics:
  - Total users
  - Total projects
  - Total tasks
  - Users by role (admin, manager, worker)
- ✅ Self-test panel (v4.0-FINAL):
  - 5 automated tests
  - Company isolation verification
- ✅ Quick actions:
  - Navigate to Projects
  - Navigate to User Management
  - Navigate to Profile
- ✅ Company-filtered data (no system-wide access)

**Navigation**:
- Click "Projects" → ProjectsScreen
- Click "User Management" → UserManagementScreen
- Click profile icon → ProfileScreen

---

### **ProjectsScreen** (`src/screens/ProjectsScreen.tsx`)
**Purpose**: Project list and management  
**Access**: Admin users  
**Navigation**: From AdminDashboard

**Features**:
- ✅ List of all company projects
- ✅ Project cards with:
  - Project name, status
  - Description
  - Created date
  - Assigned users count
- ✅ Search bar (filter projects)
- ✅ Create new project button
- ✅ Navigate to project details

**Filtering**:
- Admins: Projects created by company users
- Non-admins: Projects assigned to user

**Navigation**:
- Click project card → ProjectDetailScreen
- Click "Create Project" → CreateProjectScreen
- Back button → AdminDashboardScreen

---

### **CreateProjectScreen** (`src/screens/CreateProjectScreen.tsx`)
**Purpose**: Create new projects  
**Access**: Admin users  
**Navigation**: From ProjectsScreen

**Features**:
- ✅ Project form:
  - Name, description
  - Start date, end date
  - Status (planning/active/on_hold/completed/cancelled)
- ✅ Auto-scoped to admin's company
- ✅ Created by: Current admin user

**Navigation**:
- Back button → ProjectsScreen
- After creation → ProjectsScreen

---

### **ProjectDetailScreen** (`src/screens/ProjectDetailScreen.tsx`)
**Purpose**: View and manage project details  
**Access**: Admin users  
**Navigation**: From ProjectsScreen

**Features**:
- ✅ Project information:
  - Name, description, status
  - Dates, timeline
- ✅ Assigned users list:
  - View project members
  - Add users to project
  - Remove users from project
  - Assign project roles/categories
- ✅ Project tasks (if implemented)
- ✅ Company banner customization (if implemented)

**Navigation**:
- Back button → ProjectsScreen
- Click "Add User" → User assignment modal

---

### **UserManagementScreen** (`src/screens/UserManagementScreen.tsx`)
**Purpose**: Manage company users  
**Access**: Admin users only  
**Navigation**: From AdminDashboard

**Features**:
- ✅ List of all company users
- ✅ User cards with:
  - Name, email, phone
  - Role badge (Admin/Manager/Worker)
  - Company name
  - "Protected" indicator (if last admin)
- ✅ Search bar (filter users)
- ✅ User actions:
  - Assign to projects
  - Change user role
  - Remove from project
  - Invite new users
- ✅ Admin protection:
  - Cannot delete/demote last admin
  - Visual "Protected" badge
- ✅ Company-scoped (only own company users)

**Navigation**:
- Back button → AdminDashboardScreen
- Click user card → User actions modal
- Click "Invite User" → Invite modal

---

## 4. SHARED SCREENS


---

## Navigation Hierarchy

### **Worker/Manager Flow**
```
LoginScreen
    ↓
DashboardScreen (Home Tab)
    ├─> ProjectsTasksScreen (filtered) → TaskDetailScreen
    │                                        ├─> CreateTaskScreen (subtask)
    │                                        └─> CreateTaskScreen (edit)
    ├─> CreateTaskScreen (New Tab)
    ├─> ReportsScreen (Reports Tab)
    └─> ProfileScreen (hidden)
```

### **Admin Flow**
```
LoginScreen
    ↓
AdminDashboardScreen (Dashboard Tab)
    ├─> ProjectsScreen → ProjectDetailScreen
    │                     └─> CreateProjectScreen
    ├─> UserManagementScreen
    └─> ProfileScreen (hidden)
```

---

## Tab Navigator Structure

### **Non-Admin Tabs** (Hidden Tab Bar)
```typescript
MainTabs
├── Dashboard (Home)           // DashboardScreen
├── CreateTask (New)          // CreateTaskScreen
├── Reports                    // ReportsScreen
├── Tasks (hidden)            // ProjectsTasksScreen
└── Profile (hidden)          // ProfileScreen
```

### **Admin Tabs** (Hidden Tab Bar)
```typescript
MainTabs
├── AdminDashboard (Dashboard) // AdminDashboardScreen
├── Profile (hidden)          // ProfileScreen
```

---

## Stack Navigators

### **Dashboard Stack** (Non-Admin)
```typescript
DashboardStack
├── DashboardMain             // DashboardScreen
└── TaskDetail (modal)       // TaskDetailScreen
```

### **Tasks Stack** (Non-Admin)
```typescript
TasksStack
├── TasksList                 // ProjectsTasksScreen
├── TaskDetail (modal)       // TaskDetailScreen
└── CreateTaskFromTask (modal) // CreateTaskScreen
```

### **CreateTask Stack** (Non-Admin)
```typescript
CreateTaskStack
└── CreateTaskMain            // CreateTaskScreen
```

### **Reports Stack** (Non-Admin)
```typescript
ReportsStack
└── ReportsMain               // ReportsScreen
```

### **Admin Dashboard Stack** (Admin)
```typescript
AdminDashboardStack
├── AdminDashboardMain        // AdminDashboardScreen
├── ProjectsList              // ProjectsScreen
├── ProjectDetail             // ProjectDetailScreen
├── CreateProject             // CreateProjectScreen
└── UserManagement            // UserManagementScreen
```

### **Profile Stack** (All Roles)
```typescript
ProfileStack
└── ProfileMain               // ProfileScreen
```

---

## Screen Access Matrix

| Screen | Worker | Manager | Admin | Auth Required |
|--------|-------|--------|-------|--------------|
| LoginScreen | ✅ | ✅ | ✅ | ❌ No |
| RegisterScreen | ✅ | ✅ | ✅ | ❌ No |
| DashboardScreen | ✅ | ✅ | ❌ | ✅ Yes |
| AdminDashboardScreen | ❌ | ❌ | ✅ | ✅ Yes |
| CreateTaskScreen | ✅ | ✅ | ❌ | ✅ Yes |
| ReportsScreen | ✅ | ✅ | ❌ | ✅ Yes |
| ProjectsTasksScreen | ✅ | ✅ | ❌ | ✅ Yes |
| TaskDetailScreen | ✅ | ✅ | ❌ | ✅ Yes |
| ProfileScreen | ✅ | ✅ | ✅ | ✅ Yes |
| ProjectsScreen | ❌ | ❌ | ✅ | ✅ Yes |
| CreateProjectScreen | ❌ | ❌ | ✅ | ✅ Yes |
| ProjectDetailScreen | ❌ | ❌ | ✅ | ✅ Yes |
| UserManagementScreen | ❌ | ❌ | ✅ | ✅ Yes |
| TasksScreen | ✅ | ✅ | ❌ | ✅ Yes |

---

## Utility Components

### **ExpandableUtilityFAB**
**Appears on**: DashboardScreen, ProjectsTasksScreen, ProfileScreen  
**Buttons**:
- Reload (refresh data)
- Logout (sign out)
- New Task (create task)

**Behavior**: Expands on short press

---

### **TaskDetailUtilityFAB**
**Appears on**: TaskDetailScreen  
**Buttons**:
- Camera (take photo & update)
- Update (update progress)
- Edit (edit task - greyed if not creator)

**Behavior**: Expands on short press

---

## Permission Summary

### **Worker Permissions**
- ✅ View dashboard
- ✅ Create tasks
- ✅ Edit own tasks
- ✅ Update assigned tasks
- ✅ Submit for review
- ✅ Accept/decline tasks
- ✅ View reports
- ❌ Cannot manage projects
- ❌ Cannot manage users
- ❌ Cannot access admin dashboard

### **Manager Permissions**
- ✅ All worker permissions
- ✅ (Same as worker in current implementation)
- ❌ Cannot manage projects (unless admin)
- ❌ Cannot manage users (unless admin)

### **Admin Permissions**
- ✅ All worker permissions
- ✅ Create/edit projects
- ✅ Manage users
- ✅ View admin dashboard
- ✅ Company management
- ✅ User role management

---

## Key Navigation Patterns

1. **Dashboard → Tasks**: Click Quick Overview category button
2. **Dashboard → Task Detail**: Click starred task in Today's Tasks
3. **Tasks → Task Detail**: Click task card in list
4. **Task Detail → Create Sub-Task**: Click "Add Sub-Task" button
5. **Task Detail → Edit Task**: Click "Edit" in Utility FAB (if creator)
6. **Anywhere → Create Task**: Click "New Task" in Utility FAB or Tab
7. **Anywhere → Profile**: Click profile icon or navigate programmatically
8. **Anywhere → Logout**: Click "Logout" in Utility FAB
9. **Admin Dashboard → Projects**: Click "Projects" button
10. **Admin Dashboard → Users**: Click "User Management" button

---

## Screen File Locations

```
src/screens/
├── LoginScreen.tsx
├── RegisterScreen.tsx
├── DashboardScreen.tsx
├── AdminDashboardScreen.tsx
├── CreateTaskScreen.tsx
├── ReportsScreen.tsx
├── ProjectsTasksScreen.tsx
├── TasksScreen.tsx
├── TaskDetailScreen.tsx
├── ProfileScreen.tsx
├── ProjectsScreen.tsx
├── CreateProjectScreen.tsx
├── ProjectDetailScreen.tsx
└── UserManagementScreen.tsx
```

---

## Notes

1. **Tab Bar**: Hidden (`display: 'none'`) but screens still navigable programmatically
2. **Role-Based Access**: Navigation structure changes based on user role
3. **Modal Presentation**: TaskDetailScreen and CreateTaskScreen appear as modals
4. **Company Isolation**: Admin screens filter by company (no system-wide access)
5. **User Scoping**: Non-admin screens filter by user assignments
6. **Data Sync**: All screens sync with Supabase via DataSyncManager
7. **Utility FABs**: Context-specific floating action buttons for quick actions

---

## Screen Count Summary

- **Total Screens**: 13
- **Authentication**: 2
- **Worker/Manager**: 6
- **Admin**: 4
- **Shared**: 1

