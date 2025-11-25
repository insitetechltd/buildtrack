# 🎭 Roles vs Categories: Complete Guide

## 📋 **Overview**

The BuildTrack app uses **TWO different role systems** that serve different purposes:

1. **System Roles (UserRole)** - Job titles with system-wide permissions
2. **Project Roles (UserCategory)** - Project-specific capacities

---

## 🔐 **System Roles (UserRole)**

### **Definition**
System-wide permission level that determines what a user can do across the **entire application**.

### **Type Definition**
```typescript
export type UserRole = "admin" | "manager" | "worker";
```

### **Storage**
- **Database Table**: `users`
- **Database Column**: `role`
- **TypeScript Interface**: `User.role`

### **Purpose**
Controls **system-wide permissions** and **feature access**.

### **Roles Explained**

#### **1. Admin**
- ✅ Full system access
- ✅ Can manage all projects
- ✅ Can manage all users
- ✅ Can assign users to projects
- ✅ Can approve/reject new users
- ✅ Can create/edit/delete projects
- ✅ Access to Admin Dashboard
- ✅ Access to User Management screen

#### **2. Manager**
- ✅ Can manage assigned projects
- ✅ Can create and assign tasks
- ✅ Can view team members
- ✅ Can update project status
- ❌ Cannot manage users
- ❌ Cannot approve new users
- ❌ Limited to assigned projects

#### **3. Worker**
- ✅ Can view assigned tasks
- ✅ Can update task status
- ✅ Can add task updates
- ❌ Cannot create projects
- ❌ Cannot assign users
- ❌ Cannot manage other users
- ❌ Limited to own tasks

### **How It's Used**

```typescript
// In User interface
interface User {
  role: UserRole;  // "admin" | "manager" | "worker"
  // ... other fields
}

// Permission checks
if (user.role === "admin") {
  // Show admin features
}

if (user.role === "manager" || user.role === "admin") {
  // Show project management features
}
```

### **Frequency of Change**
**Rarely changes** - Usually set when user joins company and only changes with promotions/role changes.

---

## 🏗️ **Project Roles (UserCategory)**

### **Definition**
Project-specific capacity that defines what a user does on a **specific project**.

### **Type Definition**
```typescript
export type UserCategory = 
  | "lead_project_manager"
  | "contractor"
  | "subcontractor"
  | "inspector"
  | "architect"
  | "engineer"
  | "worker"
  | "foreman";
```

### **Storage**
- **Database Table**: `user_project_assignments`
- **Database Column**: `category`
- **TypeScript Interface**: `UserProjectAssignment.category`

### **Purpose**
Defines **what the user does** on a specific project and **what tasks they see**.

### **Categories Explained**

#### **1. Lead Project Manager** 🟣
- Oversees entire project
- Sees all tasks on the project
- Coordinates all team members
- Makes project-level decisions

#### **2. Contractor** 🔵
- Main contractor for project work
- Manages subcontractors
- Executes primary construction work

#### **3. Subcontractor** 🟢
- Specialized contractor for specific tasks
- Works under main contractor
- Handles specific trade work (electrical, plumbing, etc.)

#### **4. Inspector** 🔴
- Reviews and inspects work quality
- Ensures compliance with standards
- Approves completed work

#### **5. Architect** 🟣
- Provides architectural guidance
- Reviews design implementation
- Approves design changes

#### **6. Engineer** 🟠
- Provides engineering guidance
- Reviews structural integrity
- Approves technical changes

#### **7. Worker** ⚪
- Executes assigned tasks
- General labor on project
- Reports to foreman/contractor

#### **8. Foreman** 🟡
- Supervises workers on-site
- Manages day-to-day operations
- Reports to project manager

### **How It's Used**

```typescript
// In UserProjectAssignment interface
interface UserProjectAssignment {
  userId: string;
  projectId: string;
  category: UserCategory;  // Project role
  assignedBy: string;
  isActive: boolean;
}

// Assigning a user to a project
assignUserToProject(
  userId: "user-123",
  projectId: "project-456",
  category: "contractor",  // Project role
  assignedBy: currentUser.id
);

// Getting user's role on a specific project
const assignments = getProjectUserAssignments(projectId);
const userAssignment = assignments.find(a => a.userId === userId);
const projectRole = userAssignment?.category; // "contractor"
```

### **Frequency of Change**
**Changes per project** - Same user can have different categories on different projects.

---

## 🎯 **Key Differences**

| Aspect | System Role (UserRole) | Project Role (UserCategory) |
|--------|----------------------|---------------------------|
| **Scope** | System-wide | Project-specific |
| **Storage** | `users.role` | `user_project_assignments.category` |
| **Purpose** | Permission level | Project capacity |
| **Examples** | admin, manager, worker | contractor, inspector, architect |
| **Changes** | Rarely | Per project |
| **Controls** | Feature access | Task visibility |
| **Count** | 1 per user | Many (1 per project assignment) |

---

## 💡 **Real-World Example**

### **Scenario: Sarah's Roles**

**Sarah's System Role (Job Title):**
```typescript
{
  name: "Sarah Johnson",
  role: "manager",  // System role - she's a manager
  position: "Senior Construction Manager",
  companyId: "company-xyz"
}
```

**Sarah's Project Roles:**
```typescript
// Project A: Office Building
{
  userId: "sarah-123",
  projectId: "project-office",
  category: "lead_project_manager"  // She leads this project
}

// Project B: Residential Complex
{
  userId: "sarah-123",
  projectId: "project-residential",
  category: "contractor"  // She's the main contractor here
}

// Project C: Shopping Mall
{
  userId: "sarah-123",
  projectId: "project-mall",
  category: "inspector"  // She inspects work here
}
```

**What This Means:**
- ✅ Sarah has **manager** permissions system-wide (can create tasks, manage teams)
- ✅ On Project A, she's the **lead PM** (sees all tasks, coordinates everything)
- ✅ On Project B, she's the **contractor** (executes main work)
- ✅ On Project C, she's an **inspector** (reviews and approves work)

---

## ⚠️ **Important Note: "worker" Appears in Both!**

### **UserRole "worker"**
```typescript
role: "worker"  // Job title with limited system permissions
```
- System-wide permission level
- Cannot create projects
- Cannot assign users
- Limited feature access

### **UserCategory "worker"**
```typescript
category: "worker"  // Project role doing general labor
```
- Project-specific capacity
- Executes assigned tasks
- General labor on project
- Can be assigned to any user (even admins!)

### **Example:**
```typescript
// An admin doing worker tasks on a project
{
  name: "John Admin",
  role: "admin",  // System role - full permissions
}

// But on Project X:
{
  userId: "john-123",
  projectId: "project-x",
  category: "worker"  // Project role - doing labor work
}
```

John has **admin** permissions system-wide, but on Project X, he's assigned as a **worker** (project role).

---

## 🔄 **How They Work Together**

### **Permission Check Example**

```typescript
// Can user access User Management screen?
if (user.role === "admin") {
  // YES - system role check
  showUserManagementButton();
}

// Can user see a specific task?
const userProjectAssignment = getUserProjectAssignment(user.id, task.projectId);
if (userProjectAssignment) {
  // YES - user is assigned to this project
  if (userProjectAssignment.category === "lead_project_manager") {
    // Show ALL tasks on project
  } else {
    // Show only tasks assigned to this user
  }
}
```

### **Assignment Flow**

1. **User joins company** → Gets a **system role** (admin/manager/worker)
2. **Admin assigns user to project** → User gets a **project role** (contractor/inspector/etc.)
3. **User accesses project** → System checks **both**:
   - System role: Can they access this feature?
   - Project role: What tasks can they see?

---

## 📊 **Database Schema**

### **users table**
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL,  -- System role: 'admin', 'manager', 'worker'
  position TEXT,       -- Job title: 'Senior Manager', 'Electrician'
  company_id UUID NOT NULL,
  -- ... other fields
);
```

### **user_project_assignments table**
```sql
CREATE TABLE user_project_assignments (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  project_id UUID NOT NULL,
  category TEXT NOT NULL,  -- Project role: 'contractor', 'inspector', etc.
  assigned_by UUID NOT NULL,
  assigned_at TIMESTAMP NOT NULL,
  is_active BOOLEAN DEFAULT true,
  UNIQUE(user_id, project_id, category)
);
```

---

## 🎨 **UI Display**

### **User Profile**
```
Name: Sarah Johnson
Job Title: manager  ← System Role
Position: Senior Construction Manager
```

### **Project Team List**
```
Project: Office Building Renovation

Team Members:
- Sarah Johnson (Lead Project Manager)  ← Project Role
- Mike Chen (Contractor)                ← Project Role
- Lisa Wang (Inspector)                 ← Project Role
```

### **User Management Screen**
```
Sarah Johnson
Role: Manager  ← System Role (badge color: blue)

Project Assignments:
- Office Building: Lead PM      ← Project Role (badge color: purple)
- Residential: Contractor       ← Project Role (badge color: blue)
- Mall: Inspector               ← Project Role (badge color: red)
```

---

## 🚀 **Best Practices**

### **1. Use System Roles for Permissions**
```typescript
// ✅ Good
if (user.role === "admin") {
  showAdminFeatures();
}

// ❌ Bad
if (userProjectAssignment.category === "lead_project_manager") {
  showAdminFeatures();  // Wrong! Project role ≠ system permissions
}
```

### **2. Use Project Roles for Task Visibility**
```typescript
// ✅ Good
if (userProjectAssignment.category === "lead_project_manager") {
  showAllProjectTasks();
}

// ❌ Bad
if (user.role === "manager") {
  showAllProjectTasks();  // Wrong! System role ≠ project visibility
}
```

### **3. Check Both When Needed**
```typescript
// ✅ Good - Check both
if (user.role === "admin" || userProjectAssignment.category === "lead_project_manager") {
  allowProjectManagement();
}
```

---

## 📝 **Summary**

- **System Role (UserRole)** = Who you are in the company (job title)
- **Project Role (UserCategory)** = What you do on a specific project (capacity)
- **System Role** controls **feature access** (can you use this feature?)
- **Project Role** controls **data visibility** (what tasks can you see?)
- **System Role** is **singular** (1 per user)
- **Project Role** is **multiple** (1 per project assignment)
- **System Role** changes **rarely**
- **Project Role** changes **per project**

---

## 🔗 **Related Files**

- `src/types/buildtrack.ts` - Type definitions
- `src/state/projectStore.supabase.ts` - Project assignment logic
- `src/screens/UserManagementScreen.tsx` - User assignment UI
- `ROLE_VS_CATEGORY_GUIDE.md` - Original documentation

---

**Last Updated:** November 17, 2025


