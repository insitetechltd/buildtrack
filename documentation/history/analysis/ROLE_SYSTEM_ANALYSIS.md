# Role System Analysis: UserRole vs UserCategory

## Executive Summary

This analysis examines the dual categorization system in the BuildTrack app:
- **UserRole**: System-wide permissions (`admin`, `manager`, `worker`)
- **UserCategory**: Project-specific roles (`lead_project_manager`, `contractor`, `inspector`, etc.)

**Key Finding**: The two systems serve **distinct purposes** with minimal overlap. However, there is complexity and confusion, particularly around the "worker" term appearing in both systems.

---

## 1. UserRole Usage Analysis

### 1.1 What UserRole Controls

UserRole (`user.role`) is used for **system-wide feature access** and **company-level permissions**:

#### Admin-Only Features
1. **User Management Screen** (`UserManagementScreen.tsx:61`)
   - Access to manage all company users
   - Approve/reject pending users
   - Change user roles
   - Assign users to projects

2. **Admin Dashboard** (`AdminDashboardScreen.tsx:77`)
   - Company-wide statistics
   - User role distribution
   - Project management overview

3. **Create Project** (`CreateProjectScreen.tsx:23`)
   - Only admins can create new projects

4. **Project Editing** (`ProjectDetailScreen.tsx:194, 331`)
   - Edit project details
   - Add/remove team members
   - Delete members (except Lead PM)

5. **Navigation Access** (`AppNavigator.tsx:410, 428, 440, 461, 486`)
   - Admins see Admin Dashboard instead of regular Dashboard
   - Admins don't see Create Task, Reports, or Tasks tabs
   - Admins have different navigation structure

6. **Task Creation Restriction** (`CreateTaskScreen.tsx:515`)
   - Admins are explicitly blocked from creating tasks

#### Manager+ Features
1. **Project Visibility** (`ProjectsScreen.tsx:146, projectStore.ts:319`)
   - Admins see all company projects
   - Managers see all projects (if no assignments)
   - Workers only see assigned projects

2. **Company Information** (`ProjectsScreen.tsx:141`)
   - Admins can view company details

#### Role-Based Statistics
1. **User Role Distribution** (`AdminDashboardScreen.tsx:163-167`)
   - Counts users by role (admin/manager/worker)
   - Displayed in admin dashboard

### 1.2 UserRole Permission Patterns

```typescript
// Pattern 1: Admin-only access
if (user.role !== "admin") {
  return <AccessDenied />;
}

// Pattern 2: Admin-specific navigation
{user?.role === "admin" ? (
  <AdminDashboard />
) : (
  <RegularDashboard />
)}

// Pattern 3: Manager+ access
if (user.role === "admin" || user.role === "manager") {
  // Allow access
}

// Pattern 4: Role-based project visibility
if (user.role === "admin") {
  return getProjectsByCompany(user.companyId);
} else {
  return getProjectsByUser(user.id);
}
```

### 1.3 UserRole Usage Locations

| File | Line | Purpose |
|------|------|---------|
| `AppNavigator.tsx` | 410, 428, 440, 461, 486 | Navigation structure |
| `AdminDashboardScreen.tsx` | 77, 163-167 | Admin access & stats |
| `UserManagementScreen.tsx` | 61 | Admin-only screen |
| `CreateProjectScreen.tsx` | 23 | Admin-only feature |
| `ProjectDetailScreen.tsx` | 194, 331 | Admin editing rights |
| `ProjectsScreen.tsx` | 141, 146, 203, 322, 359, 399, 404 | Project visibility & admin features |
| `CreateTaskScreen.tsx` | 515 | Block admin from creating tasks |
| `TasksScreen.tsx` | 1218 | Hide tasks tab for admins |
| `ProfileScreen.tsx` | 239 | Show pending approvals (admin only) |
| `projectStore.ts` | 319 | Manager+ project visibility |
| `userStore.supabase.ts` | 189, 244, 254, 268 | Role-based filtering & validation |

**Total**: ~50+ direct checks of `user.role`

---

## 2. UserCategory Usage Analysis

### 2.1 What UserCategory Controls

UserCategory (`user_project_assignments.category`) is used for **project-specific capacity** and **task visibility**:

#### Project Assignment Roles
1. **Lead Project Manager** (`lead_project_manager`)
   - Special status in project
   - Cannot be removed from project
   - Identified via `getLeadPMForProject()` (`projectStore.supabase.ts:718`)
   - Used to determine project leadership

2. **Project Team Roles**
   - `contractor`: Main contractor
   - `subcontractor`: Specialized contractor
   - `inspector`: Quality inspector
   - `architect`: Design guidance
   - `engineer`: Engineering guidance
   - `worker`: General labor
   - `foreman`: On-site supervisor

#### Category Usage Patterns

1. **Project Assignment** (`UserManagementScreen.tsx:150, ProjectDetailScreen.tsx:510`)
   - When assigning user to project, specify their category
   - Displayed in project team member list

2. **Lead PM Identification** (`projectStore.supabase.ts:703-723`)
   - `getUserLeadProjects()`: Find projects where user is Lead PM
   - `isUserLeadPMForProject()`: Check if user is Lead PM
   - `getLeadPMForProject()`: Get Lead PM for a project

3. **Project Statistics** (`projectStore.supabase.ts:726-740`)
   - Count users by category per project
   - Display team composition

4. **Display in UI** (`ProjectDetailScreen.tsx:370-373`)
   - Show user's project role (category) in team member list
   - Display as badge/label

### 2.2 UserCategory Permission Patterns

```typescript
// Pattern 1: Lead PM special handling
const isLeadPM = assignment.category === 'lead_project_manager';
if (isLeadPM) {
  // Cannot remove Lead PM
  // Show special badge
}

// Pattern 2: Category-based filtering
const leadAssignments = userAssignments.filter(
  a => a.category === 'lead_project_manager' && a.isActive
);

// Pattern 3: Category display
<Text>{assignment.category.replace("_", " ")}</Text>
```

### 2.3 UserCategory Usage Locations

| File | Line | Purpose |
|------|------|---------|
| `projectStore.supabase.ts` | 705, 714, 720, 730 | Lead PM utilities & stats |
| `ProjectDetailScreen.tsx` | 370-373, 510 | Display & assignment |
| `UserManagementScreen.tsx` | 39, 116, 135, 150, 673 | Assignment UI |
| `ProjectsScreen.tsx` | 537 | Lead PM assignment |
| `types/buildtrack.ts` | 84 | Type definition |

**Total**: ~15-20 direct uses of `category`

---

## 3. Overlap and Conflict Analysis

### 3.1 Direct Overlaps

#### The "worker" Confusion
- **UserRole "worker"**: System permission level (limited features)
- **UserCategory "worker"**: Project role (general labor)

**Problem**: Same term, different meanings causes confusion.

**Example**:
```typescript
// A user with role="worker" can be assigned category="worker" on a project
// But they're different concepts!
user.role === "worker"  // System permission
assignment.category === "worker"  // Project role
```

### 3.2 Indirect Overlaps

#### Project Visibility Logic
**Current Implementation**:
- Admins: See all company projects (via `user.role === "admin"`)
- Managers: See all projects if no assignments (via `user.role === "manager"`)
- Workers: Only see assigned projects (via project assignments)

**Potential Overlap**:
- If a user is Lead PM on a project, they should see it (via category)
- But they also see it if they're admin (via role)
- This creates redundancy but serves different purposes

#### Task Creation
- **UserRole**: Admins are blocked from creating tasks (`CreateTaskScreen.tsx:515`)
- **UserCategory**: Not used for task creation permissions
- **No overlap**: Clear separation

### 3.3 Where They Work Together

1. **Project Member Management** (`ProjectDetailScreen.tsx:331-379`)
   - `user.role === "admin"` determines if user can add/remove members
   - `assignment.category` determines what role the member has on project
   - **Complementary, not overlapping**

2. **Lead PM Protection** (`ProjectDetailScreen.tsx:379`)
   - Admin can remove members (`user.role === "admin"`)
   - But cannot remove Lead PM (`assignment.category === "lead_project_manager"`)
   - **Complementary protection**

### 3.4 No Overlap Areas

1. **User Management**: Only UserRole (admin-only)
2. **Company Administration**: Only UserRole (admin-only)
3. **Project Role Assignment**: Only UserCategory
4. **Task Visibility**: Based on project assignments (UserCategory), not UserRole
5. **Navigation Structure**: Only UserRole

---

## 4. Simplification Analysis

### 4.1 Option A: Eliminate UserRole, Use Only UserCategory

**Feasibility**: ❌ **NOT VIABLE**

**Reasons**:
1. **System-wide permissions need**: UserRole controls company-level features (user management, project creation) that cannot be project-specific
2. **Navigation structure**: Admin dashboard vs regular dashboard is a system-wide decision
3. **Company administration**: Managing users, approving registrations requires system-level permissions
4. **Project creation**: Creating projects is a company-level action, not project-specific

**What Would Break**:
- Admin dashboard access
- User management screen
- Project creation
- Company-wide statistics
- Navigation structure

**Conclusion**: UserRole is essential for system-wide permissions that cannot be derived from project assignments.

---

### 4.2 Option B: Eliminate UserCategory, Use Only UserRole

**Feasibility**: ❌ **NOT VIABLE**

**Reasons**:
1. **Project-specific roles**: Users need different roles on different projects (e.g., contractor on Project A, inspector on Project B)
2. **Lead PM concept**: Lead Project Manager is a project-specific designation, not a system role
3. **Team composition**: Projects need to track what each person does on that specific project
4. **Task visibility**: Task visibility is project-based, not system-role-based

**What Would Break**:
- Multi-project role assignment
- Lead PM functionality
- Project team composition tracking
- Project-specific permissions

**Conclusion**: UserCategory is essential for project-specific capacity that cannot be represented by a single system role.

---

### 4.3 Option C: Merge into Single Unified System

**Feasibility**: ⚠️ **COMPLEX BUT POSSIBLE**

**Approach**: Create a unified role system that handles both system-wide and project-specific permissions.

**Challenges**:
1. Need to distinguish system-level vs project-level permissions
2. Migration complexity
3. Backward compatibility
4. Type system changes

**Potential Implementation**:
```typescript
interface UnifiedRole {
  id: string;
  name: string;
  scope: "system" | "project";
  permissions: {
    system?: SystemPermissions;
    project?: ProjectPermissions;
  };
}

// System roles
{ name: "admin", scope: "system", permissions: { system: {...} } }
{ name: "manager", scope: "system", permissions: { system: {...} } }
{ name: "worker", scope: "system", permissions: { system: {...} } }

// Project roles
{ name: "lead_project_manager", scope: "project", permissions: { project: {...} } }
{ name: "contractor", scope: "project", permissions: { project: {...} } }
// etc.
```

**Pros**:
- Single source of truth
- Eliminates confusion
- More flexible permissions

**Cons**:
- Major refactoring required
- Migration complexity
- Risk of breaking changes
- May be over-engineered

**Conclusion**: Possible but high effort, may introduce more complexity than it solves.

---

### 4.4 Option D: Keep Both, Clarify Boundaries (RECOMMENDED)

**Feasibility**: ✅ **VIABLE**

**Approach**: Keep both systems but improve clarity and documentation.

**Improvements**:
1. **Rename for clarity**:
   - UserRole → `SystemPermission` or `UserPermission`
   - UserCategory → `ProjectRole` or `ProjectCapacity`

2. **Fix "worker" confusion**:
   - Rename UserRole "worker" → "member" or "basic_user"
   - Keep UserCategory "worker" as is

3. **Better documentation**:
   - Clear examples in code comments
   - Type-level documentation
   - Usage guidelines

4. **Type safety improvements**:
   - Separate types more clearly
   - Add helper functions to distinguish usage

**Pros**:
- Minimal code changes
- Low risk
- Maintains current functionality
- Improves developer understanding

**Cons**:
- Still two systems (but clearer)
- Some refactoring needed for renaming

**Conclusion**: **BEST OPTION** - Simplifies without breaking functionality.

---

## 5. Recommendations

### 5.1 Primary Recommendation: Option D (Clarify Boundaries)

**Action Items**:

1. **Rename Types for Clarity**
   ```typescript
   // OLD
   export type UserRole = "admin" | "manager" | "worker";
   export type UserCategory = "lead_project_manager" | ...;
   
   // NEW
   export type SystemPermission = "admin" | "manager" | "member";
   export type ProjectRole = "lead_project_manager" | ...;
   ```

2. **Update User Interface**
   ```typescript
   interface User {
     // OLD: role: UserRole;
     systemPermission: SystemPermission;  // System-wide access level
     // ...
   }
   
   interface UserProjectAssignment {
     // OLD: category: UserCategory;
     projectRole: ProjectRole;  // What they do on this project
     // ...
   }
   ```

3. **Fix "worker" Confusion**
   - Rename UserRole "worker" → "member"
   - Keep ProjectRole "worker" as is
   - Update all references

4. **Add Helper Functions**
   ```typescript
   // Clear separation of concerns
   function hasSystemPermission(user: User, permission: SystemPermission): boolean {
     return user.systemPermission === permission;
   }
   
   function getProjectRole(userId: string, projectId: string): ProjectRole | null {
     // Get from user_project_assignments
   }
   ```

5. **Improve Documentation**
   - Add JSDoc comments explaining when to use each
   - Create migration guide
   - Update existing documentation

### 5.2 Migration Plan (If Implementing Option D)

**Phase 1: Type Renaming (Low Risk)**
1. Create new type aliases
2. Update type definitions
3. Add deprecation warnings on old types
4. Update imports gradually

**Phase 2: Field Renaming (Medium Risk)**
1. Add new fields alongside old ones
2. Update code to use new fields
3. Migrate database schema
4. Remove old fields

**Phase 3: "worker" → "member" (Medium Risk)**
1. Add "member" as new role
2. Migrate existing "worker" users
3. Update all checks
4. Remove "worker" from SystemPermission type

**Estimated Effort**: 2-3 days of focused work

---

## 6. Conclusion

### 6.1 Key Findings

1. **UserRole and UserCategory serve different purposes**:
   - UserRole: System-wide permissions (what features you can access)
   - UserCategory: Project-specific capacity (what you do on a project)

2. **Minimal functional overlap**: They complement each other rather than duplicate functionality

3. **Main issue is clarity**: The "worker" term appearing in both systems causes confusion

4. **Both systems are necessary**: Neither can be eliminated without losing functionality

### 6.2 Recommended Path Forward

**Implement Option D: Clarify Boundaries**

- Rename types for clarity (`SystemPermission` vs `ProjectRole`)
- Fix "worker" confusion (rename to "member" in system permissions)
- Improve documentation and type safety
- Keep both systems but make boundaries clear

This approach:
- ✅ Maintains all current functionality
- ✅ Reduces confusion
- ✅ Low risk
- ✅ Minimal code changes
- ✅ Improves developer experience

### 6.3 Long-term Consideration

If the app grows to need more complex permissions (e.g., role-based access control with fine-grained permissions), consider Option C (unified system) in the future. For now, Option D provides the best balance of simplicity and functionality.

---

## Appendix: Usage Statistics

### UserRole Checks by File
- `AppNavigator.tsx`: 5 checks
- `AdminDashboardScreen.tsx`: 3 checks
- `ProjectsScreen.tsx`: 7 checks
- `ProjectDetailScreen.tsx`: 3 checks
- `UserManagementScreen.tsx`: 3 checks
- `CreateProjectScreen.tsx`: 1 check
- `CreateTaskScreen.tsx`: 1 check
- `TasksScreen.tsx`: 1 check
- `ProfileScreen.tsx`: 1 check
- Store files: ~10 checks
- **Total**: ~35-40 direct checks

### UserCategory Checks by File
- `projectStore.supabase.ts`: 5 checks
- `ProjectDetailScreen.tsx`: 2 checks
- `UserManagementScreen.tsx`: 5 checks
- `ProjectsScreen.tsx`: 1 check
- **Total**: ~13-15 direct uses

### Combined Usage
- Places where both are checked together: ~5-7 locations
- Mostly in project management screens where admin permissions + project roles are both relevant

---

**Analysis Date**: 2025-01-20
**Analyst**: AI Code Analysis
**Status**: Complete

