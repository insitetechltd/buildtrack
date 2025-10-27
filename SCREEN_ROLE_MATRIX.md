# Screen / Role Access Matrix - BuildTrack

## Overview
This document provides a comprehensive matrix showing which screens are accessible to which user roles in the BuildTrack app.

---

## User Roles

| Role | Level | Description |
|------|-------|-------------|
| **admin** | 1 | Full system access, can manage everything |
| **manager** | 2 | Can manage projects, tasks, and assign users |
| **worker** | 3 | Can view and update assigned tasks only |

---

## Complete Screen / Role Matrix

| Screen Name | File Location | Worker | Manager | Admin | Auth Required | Tab Visible |
|-------------|---------------|--------|---------|-------|---------------|-------------|
| **LoginScreen** | `src/screens/LoginScreen.tsx` | ✅ | ✅ | ✅ | ❌ No | N/A |
| **RegisterScreen** | `src/screens/RegisterScreen.tsx` | ✅ | ✅ | ✅ | ❌ No | N/A |
| **DashboardScreen** | `src/screens/DashboardScreen.tsx` | ✅ | ✅ | ❌ | ✅ Yes | ✅ Yes (Home) |
| **AdminDashboardScreen** | `src/screens/AdminDashboardScreen.tsx` | ❌ | ❌ | ✅ | ✅ Yes | ✅ Yes (Dashboard) |
| **CreateTaskScreen** | `src/screens/CreateTaskScreen.tsx` | ✅ | ✅ | ❌ | ✅ Yes | ✅ Yes (New) |
| **ReportsScreen** | `src/screens/ReportsScreen.tsx` | ✅ | ✅ | ❌ | ✅ Yes | ✅ Yes (Reports) |
| **ProjectsTasksScreen** | `src/screens/ProjectsTasksScreen.tsx` | ✅ | ✅ | ❌ | ✅ Yes | ❌ Hidden |
| **TaskDetailScreen** | `src/screens/TaskDetailScreen.tsx` | ✅ | ✅ | ❌ | ✅ Yes | ❌ Modal |
| **ProfileScreen** | `src/screens/ProfileScreen.tsx` | ✅ | ✅ | ✅ | ✅ Yes | ❌ Hidden |
| **ProjectsScreen** | `src/screens/ProjectsScreen.tsx` | ❌ | ❌ | ✅ | ✅ Yes | ❌ Hidden |
| **CreateProjectScreen** | `src/screens/CreateProjectScreen.tsx` | ❌ | ❌ | ✅ | ✅ Yes | ❌ Hidden |
| **ProjectDetailScreen** | `src/screens/ProjectDetailScreen.tsx` | ❌ | ❌ | ✅ | ✅ Yes | ❌ Hidden |
| **UserManagementScreen** | `src/screens/UserManagementScreen.tsx` | ❌ | ❌ | ✅ | ✅ Yes | ❌ Hidden |

---

## Detailed Access Breakdown

### 1. Authentication Screens

#### LoginScreen
- **Worker**: ✅ Full access
- **Manager**: ✅ Full access
- **Admin**: ✅ Full access
- **Auth Required**: ❌ No
- **Notes**: First screen for unauthenticated users

#### RegisterScreen
- **Worker**: ✅ Full access
- **Manager**: ✅ Full access
- **Admin**: ✅ Full access
- **Auth Required**: ❌ No
- **Notes**: Can register as any role (admin/manager/worker)

---

### 2. Worker/Manager Screens

#### DashboardScreen
- **Worker**: ✅ Full access
- **Manager**: ✅ Full access
- **Admin**: ❌ Not accessible (uses AdminDashboardScreen instead)
- **Auth Required**: ✅ Yes
- **Tab Visible**: ✅ Yes (Home tab, first position)
- **Features**: 
  - Quick Overview (My Tasks, Inbox, Outbox)
  - Today's Tasks (starred)
  - Project picker
  - Expandable Utility FAB

#### CreateTaskScreen
- **Worker**: ✅ Full access
- **Manager**: ✅ Full access
- **Admin**: ❌ Not accessible
- **Auth Required**: ✅ Yes
- **Tab Visible**: ✅ Yes (New tab, second position)
- **Capabilities**:
  - Create tasks (parent and subtasks)
  - Edit own tasks only
  - Assign to users
  - Upload photos/documents

#### ReportsScreen
- **Worker**: ✅ Full access
- **Manager**: ✅ Full access
- **Admin**: ❌ Not accessible
- **Auth Required**: ✅ Yes
- **Tab Visible**: ✅ Yes (Reports tab, third position)
- **Features**: Task statistics and analytics

#### ProjectsTasksScreen
- **Worker**: ✅ Full access
- **Manager**: ✅ Full access
- **Admin**: ❌ Not accessible
- **Auth Required**: ✅ Yes
- **Tab Visible**: ❌ Hidden (navigable from Dashboard)
- **Features**: 
  - Filtered task list
  - Search functionality
  - Category filters
  - Dynamic banner title

#### TaskDetailScreen
- **Worker**: ✅ Full access (with restrictions)
- **Manager**: ✅ Full access (with restrictions)
- **Admin**: ❌ Not accessible
- **Auth Required**: ✅ Yes
- **Tab Visible**: ❌ Modal presentation
- **Restrictions**:
  - Can only edit tasks they created
  - Can only update tasks assigned to them
  - Edit button greyed out for non-creators

---

### 3. Admin Screens

#### AdminDashboardScreen
- **Worker**: ❌ Not accessible
- **Manager**: ❌ Not accessible
- **Admin**: ✅ Full access
- **Auth Required**: ✅ Yes
- **Tab Visible**: ✅ Yes (Dashboard tab, replaces DashboardScreen)
- **Features**:
  - Company statistics
  - Self-test panel
  - Navigate to Projects
  - Navigate to User Management
  - Company-scoped data only

#### ProjectsScreen
- **Worker**: ❌ Not accessible
- **Manager**: ❌ Not accessible
- **Admin**: ✅ Full access
- **Auth Required**: ✅ Yes
- **Tab Visible**: ❌ Hidden (navigable from AdminDashboard)
- **Features**:
  - List all company projects
  - Create new projects
  - Navigate to project details
  - Company-filtered projects only

#### CreateProjectScreen
- **Worker**: ❌ Not accessible
- **Manager**: ❌ Not accessible
- **Admin**: ✅ Full access
- **Auth Required**: ✅ Yes
- **Tab Visible**: ❌ Hidden (navigable from ProjectsScreen)
- **Features**:
  - Create new projects
  - Auto-scoped to admin's company
  - Set project status and dates

#### ProjectDetailScreen
- **Worker**: ❌ Not accessible
- **Manager**: ❌ Not accessible
- **Admin**: ✅ Full access
- **Auth Required**: ✅ Yes
- **Tab Visible**: ❌ Hidden (navigable from ProjectsScreen)
- **Features**:
  - View project details
  - Manage assigned users
  - Assign project roles/categories
  - Customize company banner

#### UserManagementScreen
- **Worker**: ❌ Not accessible
- **Manager**: ❌ Not accessible
- **Admin**: ✅ Full access
- **Auth Required**: ✅ Yes
- **Tab Visible**: ❌ Hidden (navigable from AdminDashboard)
- **Features**:
  - List all company users
  - Assign users to projects
  - Change user roles
  - Invite new users
  - Admin protection (cannot delete last admin)
  - Company-scoped users only

---

### 4. Shared Screens

#### ProfileScreen
- **Worker**: ✅ Full access
- **Manager**: ✅ Full access
- **Admin**: ✅ Full access
- **Auth Required**: ✅ Yes
- **Tab Visible**: ❌ Hidden (accessible via navigation)
- **Features**:
  - View user profile
  - Environment indicator
  - Supabase connection status
  - Manual reload/sync
  - Expandable Utility FAB

---

## Role-Specific Tab Navigation

### Worker Tab Bar (Hidden)
```
┌─────────────┬─────────────┬─────────────┐
│  Dashboard  │ Create Task │   Reports   │
│    (Home)   │    (New)    │             │
└─────────────┴─────────────┴─────────────┘
     Tab 1         Tab 2        Tab 3
```

### Manager Tab Bar (Hidden)
```
┌─────────────┬─────────────┬─────────────┐
│  Dashboard  │ Create Task │   Reports   │
│    (Home)   │    (New)    │             │
└─────────────┴─────────────┴─────────────┘
     Tab 1         Tab 2        Tab 3
```

### Admin Tab Bar (Hidden)
```
┌─────────────────────────────┐
│    Admin Dashboard          │
│      (Dashboard)            │
└─────────────────────────────┘
           Tab 1
```

**Note**: Tab bar is hidden (`display: 'none'`) but screens are still navigable programmatically.

---

## Permission Summary by Role

### Worker Permissions
| Action | Allowed |
|--------|---------|
| View Dashboard | ✅ Yes |
| Create Tasks | ✅ Yes |
| Edit Own Tasks | ✅ Yes |
| Edit Others' Tasks | ❌ No |
| Update Assigned Tasks | ✅ Yes |
| Submit for Review | ✅ Yes (if assigned & 100%) |
| Accept/Decline Tasks | ✅ Yes (if assigned) |
| Create Subtasks | ✅ Yes (if assigned) |
| View Reports | ✅ Yes |
| View Admin Dashboard | ❌ No |
| Create Projects | ❌ No |
| Edit Projects | ❌ No |
| Manage Users | ❌ No |
| Manage User Roles | ❌ No |

### Manager Permissions
| Action | Allowed |
|--------|---------|
| View Dashboard | ✅ Yes |
| Create Tasks | ✅ Yes |
| Edit Own Tasks | ✅ Yes |
| Edit Others' Tasks | ❌ No |
| Update Assigned Tasks | ✅ Yes |
| Submit for Review | ✅ Yes (if assigned & 100%) |
| Accept/Decline Tasks | ✅ Yes (if assigned) |
| Create Subtasks | ✅ Yes (if assigned) |
| View Reports | ✅ Yes |
| View Admin Dashboard | ❌ No |
| Create Projects | ❌ No |
| Edit Projects | ❌ No |
| Manage Users | ❌ No |
| Manage User Roles | ❌ No |

**Note**: Manager currently has same permissions as Worker. Future enhancement may add project management capabilities.

### Admin Permissions
| Action | Allowed |
|--------|---------|
| View Admin Dashboard | ✅ Yes |
| View Dashboard (Worker) | ❌ No |
| Create Tasks | ❌ No |
| View Reports | ❌ No |
| Create Projects | ✅ Yes |
| Edit Projects | ✅ Yes |
| Manage Users | ✅ Yes |
| Change User Roles | ✅ Yes |
| Assign Users to Projects | ✅ Yes |
| Remove Users from Projects | ✅ Yes |
| Invite New Users | ✅ Yes |
| Delete Last Admin | ❌ No (protected) |
| View Company Users Only | ✅ Yes (company-scoped) |
| View Company Projects Only | ✅ Yes (company-scoped) |

---

## Access Control Implementation

### Role-Based Navigation (`AppNavigator.tsx`)

```typescript
// Worker/Manager Dashboard
{user?.role !== "admin" && (
  <Tab.Screen name="Dashboard" component={DashboardStack} />
)}

// Admin Dashboard
{user?.role === "admin" && (
  <Tab.Screen name="AdminDashboard" component={AdminDashboardStack} />
)}

// Create Task (Non-Admin Only)
{user?.role !== "admin" && (
  <Tab.Screen name="CreateTask" component={CreateTaskStack} />
)}

// Reports (Non-Admin Only)
{user?.role !== "admin" && (
  <Tab.Screen name="Reports" component={ReportsStack} />
)}
```

### Screen-Level Access Control

#### UserManagementScreen Example:
```typescript
if (!currentUser || currentUser.role !== "admin") {
  return (
    <View>
      <Text>Access denied. Admin role required.</Text>
    </View>
  );
}
```

#### Task Edit Permission Example:
```typescript
// In TaskDetailScreen
const canEdit = task.assignedBy === user.id; // Only creator can edit
```

---

## Visual Access Matrix

```
                    Worker    Manager    Admin
LoginScreen         ✅         ✅         ✅
RegisterScreen      ✅         ✅         ✅
DashboardScreen     ✅         ✅         ❌
AdminDashboard      ❌         ❌         ✅
CreateTaskScreen    ✅         ✅         ❌
ReportsScreen       ✅         ✅         ❌
ProjectsTasksScreen ✅         ✅         ❌
TaskDetailScreen    ✅         ✅         ❌
ProfileScreen       ✅         ✅         ✅
ProjectsScreen      ❌         ❌         ✅
CreateProjectScreen ❌         ❌         ✅
ProjectDetailScreen ❌         ❌         ✅
UserManagementScreen ❌        ❌         ✅
```

---

## Summary Statistics

- **Total Screens**: 13
- **Screens Accessible to Workers**: 8
- **Screens Accessible to Managers**: 8
- **Screens Accessible to Admins**: 6
- **Screens Shared by All Roles**: 1 (ProfileScreen)
- **Admin-Only Screens**: 4
- **Worker/Manager-Only Screens**: 6
- **Authentication Screens**: 2 (accessible to all)

---

## Key Differences

### Worker vs Manager
- **Current Implementation**: Identical permissions
- **Future Enhancement**: Managers may get project management capabilities

### Worker/Manager vs Admin
- **Tab Navigation**: Different dashboards (DashboardScreen vs AdminDashboardScreen)
- **Task Management**: Workers can create tasks, Admins cannot
- **Project Management**: Admins can manage projects, Workers cannot
- **User Management**: Admins can manage users, Workers cannot
- **Reports**: Workers can view reports, Admins cannot

### Admin Unique Features
- ✅ Company-scoped data isolation
- ✅ Project creation and management
- ✅ User role management
- ✅ User-project assignments
- ✅ Admin protection (cannot delete last admin)
- ✅ Self-test panel for company isolation

---

## Notes

1. **Tab Bar**: Hidden for all roles (`display: 'none'`), but screens are navigable programmatically
2. **Company Isolation**: Admin screens filter by company (no system-wide access)
3. **User Scoping**: Worker/Manager screens filter by user assignments
4. **Edit Restrictions**: Task editing limited to task creators only
5. **Review Workflow**: Available to Workers/Managers, not Admins
6. **Admin Protection**: Cannot delete or demote the last admin in a company

