# Role Model Normalization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Normalize the user type, system permission, backward-compatible role, and project-role model so runtime authorization and project-admin behavior consistently follow helper-based source-of-truth rules while preserving backward compatibility.

**Architecture:** Keep the current Expo, React Navigation, Zustand, and Supabase architecture intact, but tighten the authorization seams around shared normalization helpers. The migration should first normalize reads, then normalize project-role resolution, then bring the role-catalog layer into alignment without turning this into a full RBAC rewrite.

**Tech Stack:** TypeScript, Expo-managed React Native, Zustand, Supabase, Jest, React Navigation

---

## Scope

This plan addresses only the approved role-model issues:

1. runtime authorization still branching on deprecated `user.role`
2. Lead PM / project-admin detection still branching on deprecated assignment `category`
3. the new role-catalog layer not cleanly representing `member` and mixing system/project concepts

Out of scope:

- broad auth redesign
- backend schema redesign beyond compatibility-safe field mapping
- unrelated task workflow changes
- unrelated screen modernization work

## File Map

### Primary Runtime Contracts

- Modify: `src/types/buildtrack.ts`
  - keep canonical helper behavior for `getUserSystemPermission()` and `getProjectRole()`
  - add or tighten any helper comments needed for migration

### Active User / Auth Normalization

- Modify: `src/state/authStore.ts`
  - materialize `systemPermission` anywhere a `User` object is hydrated or updated
- Review: `src/state/authStore.supabase.ts`
  - use as the reference implementation to keep behavior aligned
- Modify: `src/state/userStore.supabase.ts`
  - ensure fetched users remain normalized consistently

### Project Assignment Normalization

- Modify: `src/state/projectStore.supabase.ts`
  - route reads through `getProjectRole()`
  - preserve compatibility writes while eliminating direct `category`-only logic where possible

### Runtime Permission Consumers

- Modify: `src/screens/ProjectsScreen.tsx`
- Modify: `src/ui/viewAdapters/useProjectsViewAdapter.ts`
- Modify: `src/ui/viewAdapters/useProjectDetailViewAdapter.ts`
- Modify: `src/ui/viewAdapters/useProfileViewAdapter.ts`
- Search and modify any additional direct `user.role` or direct `assignment.category` checks found during execution

### Role-Catalog Alignment

- Modify: `src/types/buildtrack.ts`
  - separate the catalog intent from system/project permission concepts as much as possible without a broad rewrite
- Modify: `src/state/roleStore.ts`
  - align fetched/written data shape with the `Role` interface
- Review: `src/state/roleStore 2.ts`
  - determine whether it is dead duplicate state and document the answer before changing behavior

### Documentation

- Create or update: `documentation/role-permission-matrix.md`
- Create or update: `docs/superpowers/plans/2026-06-20-role-model-normalization-plan.md`
- Update any role migration status docs only if implementation changes make them materially more correct

### Validation

- Test: targeted Jest suites covering affected screens or adapters
- Validate: `npx tsc --noEmit`

## Phase Order

### Phase 1

Make runtime user objects consistently expose normalized `systemPermission`.

### Phase 2

Make project-role reads consistently resolve through `getProjectRole()` and stop direct Lead PM checks on `category`.

### Phase 3

Replace direct `user.role` authorization checks in screens/adapters with helper-based permission checks.

### Phase 4

Align the role-catalog layer enough that `member` is represented cleanly and the type/store mismatch is reduced without broadening into a full metadata-system rewrite.

### Phase 5

Reconcile documentation with the true implementation state.

## Task 1: Lock The Current Matrix In Tests

**Files:**
- Modify: `src/types/buildtrack.ts`
- Create: `src/__tests__/unit/rolePermissionNormalization.test.ts`
- Test: `src/__tests__/unit/rolePermissionNormalization.test.ts`

- [ ] **Step 1: Write the failing normalization tests**

```ts
import {
  getProjectRole,
  getUserSystemPermission,
  isLeadProjectManager,
} from "@/types/buildtrack";

describe("role and permission normalization", () => {
  it("maps legacy worker to member system permission", () => {
    expect(
      getUserSystemPermission({
        id: "user-1",
        role: "worker",
      } as any),
    ).toBe("member");
  });

  it("prefers systemPermission when present", () => {
    expect(
      getUserSystemPermission({
        id: "user-2",
        role: "worker",
        systemPermission: "manager",
      } as any),
    ).toBe("manager");
  });

  it("prefers projectRole over category", () => {
    expect(
      getProjectRole({
        id: "assignment-1",
        userId: "user-1",
        projectId: "project-1",
        category: "worker",
        projectRole: "lead_project_manager",
        assignedAt: "2026-06-20T00:00:00.000Z",
        assignedBy: "user-9",
        isActive: true,
      }),
    ).toBe("lead_project_manager");
  });

  it("detects lead PM from normalized project role", () => {
    expect(
      isLeadProjectManager({
        id: "assignment-2",
        userId: "user-1",
        projectId: "project-1",
        projectRole: "lead_project_manager",
        assignedAt: "2026-06-20T00:00:00.000Z",
        assignedBy: "user-9",
        isActive: true,
      } as any),
    ).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify current helper expectations**

Run: `PATH=/opt/homebrew/bin:$PATH npx jest src/__tests__/unit/rolePermissionNormalization.test.ts --runInBand`

Expected:

- either PASS immediately for the helper expectations
- or FAIL with a clear mismatch that must be corrected before downstream runtime work begins

- [ ] **Step 3: If any helper expectation fails, write the minimal helper fix**

Target snippet in `src/types/buildtrack.ts`:

```ts
export function getUserSystemPermission(user: User): SystemPermission {
  if (user.systemPermission) {
    return user.systemPermission;
  }

  if (user.role === "worker") {
    return "member";
  }

  if (user.role === "admin" || user.role === "manager" || user.role === "member") {
    return user.role as SystemPermission;
  }

  return "member";
}
```

- [ ] **Step 4: Re-run the test to verify helper behavior is green**

Run: `PATH=/opt/homebrew/bin:$PATH npx jest src/__tests__/unit/rolePermissionNormalization.test.ts --runInBand`

Expected: `PASS`

- [ ] **Step 5: Commit the locked helper baseline**

```bash
git add src/__tests__/unit/rolePermissionNormalization.test.ts src/types/buildtrack.ts
git commit -m "test: lock role normalization helpers"
```

## Task 2: Normalize Active Auth Hydration

**Files:**
- Modify: `src/state/authStore.ts`
- Review: `src/state/authStore.supabase.ts`
- Test: `src/__tests__/unit/authStoreRoleNormalization.test.ts`

- [ ] **Step 1: Write a failing auth-store normalization test**

```ts
import { useAuthStore } from "@/state/authStore";

describe("auth store user normalization", () => {
  it("materializes systemPermission from legacy role", async () => {
    const state = useAuthStore.getState();
    const user = {
      id: "user-1",
      name: "Worker User",
      email: "worker@example.com",
      role: "worker",
    } as any;

    state.setUser(user);

    expect(useAuthStore.getState().user?.systemPermission).toBe("member");
  });
});
```

- [ ] **Step 2: Run test to verify it fails on the active store path**

Run: `PATH=/opt/homebrew/bin:$PATH npx jest src/__tests__/unit/authStoreRoleNormalization.test.ts --runInBand`

Expected: FAIL because `authStore.ts` currently preserves `role` but does not consistently populate `systemPermission`

- [ ] **Step 3: Write the minimal normalization helper inside `authStore.ts` and use it in all user hydration/update paths**

Target snippet:

```ts
function normalizeAuthUser(user: User): User {
  return {
    ...user,
    systemPermission: getUserSystemPermission(user),
  };
}
```

Apply it anywhere the store sets `user`, including:

- login success
- register success
- session restore
- profile update
- explicit `setUser`

- [ ] **Step 4: Re-run the targeted auth-store test**

Run: `PATH=/opt/homebrew/bin:$PATH npx jest src/__tests__/unit/authStoreRoleNormalization.test.ts --runInBand`

Expected: `PASS`

- [ ] **Step 5: Run TypeScript after auth normalization**

Run: `PATH=/opt/homebrew/bin:$PATH npx tsc --noEmit`

Expected: `PASS`

- [ ] **Step 6: Commit the auth normalization**

```bash
git add src/state/authStore.ts src/__tests__/unit/authStoreRoleNormalization.test.ts
git commit -m "fix: normalize auth store system permission"
```

## Task 3: Normalize Project Assignment Reads And Lead PM Detection

**Files:**
- Modify: `src/state/projectStore.supabase.ts`
- Modify: `src/types/buildtrack.ts` if helper comments need clarification
- Test: `src/__tests__/unit/projectRoleNormalization.test.ts`

- [ ] **Step 1: Write failing tests for Lead PM and assignment-role reads**

```ts
import { getProjectRole, isLeadProjectManager } from "@/types/buildtrack";

describe("project assignment normalization", () => {
  it("reads lead PM from projectRole without requiring category", () => {
    const assignment = {
      id: "assignment-1",
      userId: "user-1",
      projectId: "project-1",
      projectRole: "lead_project_manager",
      assignedAt: "2026-06-20T00:00:00.000Z",
      assignedBy: "user-9",
      isActive: true,
    };

    expect(getProjectRole(assignment as any)).toBe("lead_project_manager");
    expect(isLeadProjectManager(assignment as any)).toBe(true);
  });
});
```

- [ ] **Step 2: Add a store-level failing test for Lead PM lookup**

```ts
it("finds a lead PM when assignment uses projectRole", () => {
  const assignments = [
    {
      id: "assignment-1",
      userId: "user-1",
      projectId: "project-1",
      projectRole: "lead_project_manager",
      assignedAt: "2026-06-20T00:00:00.000Z",
      assignedBy: "user-9",
      isActive: true,
    },
  ];

  const lead = assignments.find((a) => isLeadProjectManager(a as any));
  expect(lead?.userId).toBe("user-1");
});
```

- [ ] **Step 3: Run tests to verify current failure or coverage gap**

Run: `PATH=/opt/homebrew/bin:$PATH npx jest src/__tests__/unit/projectRoleNormalization.test.ts --runInBand`

Expected:

- either FAIL due to store logic still inspecting `category`
- or PASS for helper-only tests, revealing the store callsites still need refactoring

- [ ] **Step 4: Replace direct `assignment.category` Lead PM checks in `projectStore.supabase.ts`**

Target snippet:

```ts
const leadAssignment = assignments.find(
  (assignment) =>
    assignment.projectId === projectId &&
    assignment.isActive &&
    isLeadProjectManager(assignment),
);
```

Use the same normalization for:

- Lead PM lookup helpers
- assignment-derived stats
- any assignment-role reads touched in the same file

- [ ] **Step 5: Preserve backward-compatible writes while reducing direct `category` coupling**

Target write shape:

```ts
const normalizedProjectRole = category as ProjectRole;

await supabase.from("user_project_assignments").insert({
  user_id: userId,
  project_id: projectId,
  category: normalizedProjectRole,
  assigned_by: assignedBy,
  is_active: true,
});
```

This step keeps DB compatibility while making the in-memory meaning explicit.

- [ ] **Step 6: Re-run the targeted tests**

Run: `PATH=/opt/homebrew/bin:$PATH npx jest src/__tests__/unit/projectRoleNormalization.test.ts --runInBand`

Expected: `PASS`

- [ ] **Step 7: Commit the project-role normalization**

```bash
git add src/state/projectStore.supabase.ts src/__tests__/unit/projectRoleNormalization.test.ts src/types/buildtrack.ts
git commit -m "fix: normalize project role resolution"
```

## Task 4: Replace Direct `user.role` Authorization Checks In Active UI Paths

**Files:**
- Modify: `src/screens/ProjectsScreen.tsx`
- Modify: `src/ui/viewAdapters/useProjectsViewAdapter.ts`
- Modify: `src/ui/viewAdapters/useProjectDetailViewAdapter.ts`
- Modify: `src/ui/viewAdapters/useProfileViewAdapter.ts`
- Search: `src/**/*.ts`, `src/**/*.tsx`
- Test: targeted integration or unit tests for affected behavior

- [ ] **Step 1: Search for direct authorization checks**

Use repository search tooling during execution to enumerate matches for:

- `user.role === "admin"`
- `user.role === "manager"`
- `u.role === "manager"`
- `role !== "admin"`

- [ ] **Step 2: Write a failing test around one admin-gated path**

Example for a view adapter:

```ts
it("treats admin access from systemPermission instead of raw role", () => {
  const user = {
    id: "user-1",
    role: "worker",
    systemPermission: "admin",
  } as any;

  expect(isAdmin(user)).toBe(true);
});
```

- [ ] **Step 3: Run the test to verify the permission helper path is required**

Run: `PATH=/opt/homebrew/bin:$PATH npx jest src/__tests__/unit/rolePermissionNormalization.test.ts --runInBand`

Expected: PASS for the helper, confirming the callsites should delegate to helpers instead of duplicating role checks

- [ ] **Step 4: Replace direct admin checks with helper-based checks**

Target snippets:

```ts
const canAdministerProjects = isAdmin(user);
```

```ts
const canManageProjects = isManagerOrAdmin(user);
```

```ts
const eligibleLeadPMs = companyUsers.filter(
  (candidate) => getUserSystemPermission(candidate) === "manager",
);
```

- [ ] **Step 5: Re-run affected tests**

Run:

```bash
PATH=/opt/homebrew/bin:$PATH npx jest \
  src/__tests__/integration/ProjectDetailScreen.test.tsx \
  src/__tests__/integration/ProjectsScreen.test.tsx \
  src/__tests__/integration/ProfileScreen.test.tsx \
  --runInBand
```

Expected:

- passing existing tests, if present
- or a clean report identifying which nearby tests need to be created

- [ ] **Step 6: Add targeted tests only where a real behavior boundary exists**

Example:

```ts
it("shows pending approvals when the normalized user is admin", () => {
  expect(output.sections.some((section) => section.id === "pending-approvals")).toBe(true);
});
```

- [ ] **Step 7: Commit the UI authorization normalization**

```bash
git add src/screens/ProjectsScreen.tsx src/ui/viewAdapters/useProjectsViewAdapter.ts src/ui/viewAdapters/useProjectDetailViewAdapter.ts src/ui/viewAdapters/useProfileViewAdapter.ts src/__tests__
git commit -m "fix: use normalized permission helpers in ui"
```

## Task 5: Align The Role Catalog Enough To Represent `member`

**Files:**
- Modify: `src/types/buildtrack.ts`
- Modify: `src/state/roleStore.ts`
- Review: `src/state/roleStore 2.ts`
- Test: `src/__tests__/unit/roleStoreShape.test.ts`

- [ ] **Step 1: Write a failing test for role-catalog completeness**

```ts
describe("role catalog alignment", () => {
  it("can represent member as a first-class system role", () => {
    const roleNames = ["admin", "manager", "member"];
    expect(roleNames).toContain("member");
  });
});
```

- [ ] **Step 2: Write a failing test for store shape mapping**

```ts
it("maps snake_case role rows into the Role interface", () => {
  const row = {
    id: "role-1",
    name: "member",
    display_name: "Member",
    is_system_role: true,
    created_at: "2026-06-20T00:00:00.000Z",
    updated_at: "2026-06-20T00:00:00.000Z",
  };

  const mapped = {
    id: row.id,
    name: row.name,
    displayName: row.display_name,
    isSystemRole: row.is_system_role,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };

  expect(mapped.displayName).toBe("Member");
  expect(mapped.isSystemRole).toBe(true);
});
```

- [ ] **Step 3: Run the targeted tests**

Run: `PATH=/opt/homebrew/bin:$PATH npx jest src/__tests__/unit/roleStoreShape.test.ts --runInBand`

Expected: FAIL until the role-catalog layer is made internally consistent

- [ ] **Step 4: Make the smallest safe type-layer correction**

Recommended direction:

- include `member` if `RoleName` remains the live catalog enum
- add explicit comments that `RoleName` is still transitional and not the authorization source of truth

Target snippet:

```ts
export type RoleName =
  | "admin"
  | "manager"
  | "member"
  | "worker"
  | "lead_project_manager"
  | "contractor"
  | "subcontractor"
  | "inspector"
  | "architect"
  | "engineer"
  | "foreman";
```

- [ ] **Step 5: Map Supabase rows explicitly in `roleStore.ts`**

Target snippet:

```ts
const transformedRoles = (data || []).map((role) => ({
  id: role.id,
  name: role.name,
  displayName: role.display_name,
  description: role.description,
  level: role.level,
  permissions: role.permissions,
  isSystemRole: role.is_system_role,
  createdAt: role.created_at,
  updatedAt: role.updated_at,
}));
```

- [ ] **Step 6: Re-run the role-catalog tests**

Run: `PATH=/opt/homebrew/bin:$PATH npx jest src/__tests__/unit/roleStoreShape.test.ts --runInBand`

Expected: `PASS`

- [ ] **Step 7: Commit the role-catalog alignment**

```bash
git add src/types/buildtrack.ts src/state/roleStore.ts src/__tests__/unit/roleStoreShape.test.ts
git commit -m "fix: align role catalog with permission matrix"
```

## Task 6: Reconcile Documentation With Implementation State

**Files:**
- Modify: `documentation/role-permission-matrix.md`
- Review: `documentation/history/analysis/ROLE_SYSTEM_ANALYSIS.md`
- Review: `documentation/history/analysis/ROLE_SYSTEM_MIGRATION_COMPLETE.md`
- Review: `documentation/history/analysis/ROLE_SYSTEM_SIMPLIFICATION_SUMMARY.md`

- [ ] **Step 1: Re-read the canonical matrix and the changed code paths**

Use repository tools to inspect:

- `src/types/buildtrack.ts`
- `src/state/authStore.ts`
- `src/state/projectStore.supabase.ts`
- updated authorization consumers

- [ ] **Step 2: Update the matrix document so it reflects the post-change runtime truth**

Target additions:

```md
## Post-Normalization Status

- active auth hydration now materializes `systemPermission`
- active project-role reads now normalize through `getProjectRole()`
- direct UI authorization checks now delegate to helper functions
- role catalog remains transitional and is not the runtime authorization source of truth
```

- [ ] **Step 3: Update migration-status docs only if they are materially wrong after the implementation**

Target phrasing:

```md
- runtime helper normalization is complete for active user and project-role read paths
- persistence compatibility shims remain in place for `users.role` and `user_project_assignments.category`
- broader role-catalog redesign remains out of scope
```

- [ ] **Step 4: Run final TypeScript validation**

Run: `PATH=/opt/homebrew/bin:$PATH npx tsc --noEmit`

Expected: `PASS`

- [ ] **Step 5: Run the focused role-model Jest sweep**

Run:

```bash
PATH=/opt/homebrew/bin:$PATH npx jest \
  src/__tests__/unit/rolePermissionNormalization.test.ts \
  src/__tests__/unit/authStoreRoleNormalization.test.ts \
  src/__tests__/unit/projectRoleNormalization.test.ts \
  src/__tests__/unit/roleStoreShape.test.ts \
  --runInBand
```

Expected: `PASS`

- [ ] **Step 6: Commit the documentation reconciliation**

```bash
git add documentation/role-permission-matrix.md documentation/history/analysis/ROLE_SYSTEM_ANALYSIS.md documentation/history/analysis/ROLE_SYSTEM_MIGRATION_COMPLETE.md documentation/history/analysis/ROLE_SYSTEM_SIMPLIFICATION_SUMMARY.md
git commit -m "docs: reconcile role model migration state"
```

## Risks

- The app currently uses more than one auth-store variant, so execution must confirm which store is live before making assumptions.
- Replacing direct `user.role` checks can subtly widen or narrow access if helper semantics are misunderstood.
- The role catalog is partially wired and may have hidden consumers; do not expand this into a generalized role-engine redesign.
- Assignment persistence likely still depends on legacy field names at the database boundary, so compatibility writes must remain intact during this phase.

## Validation Strategy

- lock helper behavior with unit tests first
- normalize active auth hydration before touching UI permission consumers
- normalize project-role reads before changing project-admin UI assumptions
- prefer helper-based tests and focused adapter/integration tests over broad end-to-end work
- run `npx tsc --noEmit` after each major phase

## Recommended Execution Order

1. Task 1
2. Task 2
3. Task 3
4. Task 4
5. Task 5
6. Task 6

This order minimizes risk by fixing source-of-truth reads before changing downstream consumers.
