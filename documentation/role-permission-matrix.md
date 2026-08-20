# Role And Permission Matrix

## Purpose

This document defines the current runtime truth and the intended normalized model for user type, system permission, backward-compatible user role, project role, and the emerging role-catalog system.

It is written to resolve ambiguity across:

- `users.role` and `User.role`
- `User.systemPermission`
- `user_project_assignments.category`
- `UserProjectAssignment.projectRole`
- `Role`, `RoleName`, `defaultRole`, and `defaultRoleId`

This document reflects actual code paths in the repository today. It records what has been normalized already and what remains transitional.

## Terms

### User Type

`User.type` describes the company or organization type the user belongs to, not their authority level.

Current known values:

- `general_contractor`
- `subcontractor`
- `supplier`
- `consultant`
- `owner`

Defined in [buildtrack.ts](file:///Volumes/KooDrive/Insite%20App/src/types/buildtrack.ts#L58-L58).

### System Permission

`SystemPermission` is the normalized system-wide access model.

Values:

- `admin`
- `manager`
- `member`

Meaning:

- `admin`: full system-level access
- `manager`: project and task management authority
- `member`: limited execution-oriented access

Defined in [buildtrack.ts](file:///Volumes/KooDrive/Insite%20App/src/types/buildtrack.ts#L42-L56) and normalized by [getUserSystemPermission()`](file:///Volumes/KooDrive/Insite%20App/src/types/buildtrack.ts#L674-L692).

### Backward-Compatible User Role

`User.role` is the legacy application-level role field and remains the persisted source in `users.role`.

Current values:

- `admin`
- `manager`
- `worker`
- `member`

Notes:

- `worker` is a legacy value that is mapped to `member`
- this field is explicitly deprecated in favor of `systemPermission`

Defined in [buildtrack.ts](file:///Volumes/KooDrive/Insite%20App/src/types/buildtrack.ts#L24-L40) and [buildtrack.ts](file:///Volumes/KooDrive/Insite%20App/src/types/buildtrack.ts#L320-L335).

### Project Role

`ProjectRole` is the normalized project-scoped responsibility model.

Values:

- `lead_project_manager`
- `contractor`
- `subcontractor`
- `inspector`
- `architect`
- `engineer`
- `worker`
- `foreman`

Meaning:

- this describes what the user is on a specific project
- this is separate from system-wide authority

Defined in [buildtrack.ts](file:///Volumes/KooDrive/Insite%20App/src/types/buildtrack.ts#L95-L139).

### Backward-Compatible Project Assignment Category

`UserProjectAssignment.category` is the persisted legacy project-role field.

Notes:

- it is deprecated in favor of `projectRole`
- it still drives most project assignment writes and several reads

Defined in [buildtrack.ts](file:///Volumes/KooDrive/Insite%20App/src/types/buildtrack.ts#L248-L261).

### New Role-System Entities

The repository also contains a role-catalog layer:

- `Role`
- `RoleName`
- `defaultRole`
- `defaultRoleId`
- `useRoleStore`

This layer is not the runtime source of truth for permissions today.

It is also not fully normalized because `RoleName` still mixes system-level roles and project-level roles in one enum.

Defined in [buildtrack.ts](file:///Volumes/KooDrive/Insite%20App/src/types/buildtrack.ts#L145-L165) and surfaced via [roleStore.ts](file:///Volumes/KooDrive/Insite%20App/src/state/roleStore.ts).

## Current Runtime Truth

### System Permission Resolution

Current intended runtime rule:

- app code should prefer `user.systemPermission`
- if missing, it should derive from `user.role`
- `worker` should normalize to `member`

That rule is implemented in [getUserSystemPermission()`](file:///Volumes/KooDrive/Insite%20App/src/types/buildtrack.ts#L674-L692).

### Actual Active Runtime Source

The repository currently has two auth-store variants:

- [authStore.ts](file:///Volumes/KooDrive/Insite%20App/src/state/authStore.ts)
- [authStore.supabase.ts](file:///Volumes/KooDrive/Insite%20App/src/state/authStore.supabase.ts)

The app navigator imports the non-suffixed store in [AppNavigator.tsx](file:///Volumes/KooDrive/Insite%20App/src/navigation/AppNavigator.tsx#L7-L8), which means the active runtime path is currently centered on `authStore.ts`.

Current status:

- `authStore.ts` is the active runtime auth path
- active auth hydration now materializes `systemPermission`
- the persistence bridge still uses `users.role`
- helper-based permission checks are now preferred in active adapters and screens

### Project Role Resolution

The normalized helper is [getProjectRole()`](file:///Volumes/KooDrive/Insite%20App/src/types/buildtrack.ts#L721-L734).

Current intended rule:

- prefer `projectRole`
- fall back to `category`

Current status:

- the project store still writes `category` for compatibility
- active Lead PM and project-role reads now normalize through helper-based resolution
- the database field remains transitional even though runtime reads are more consistent

## Post-Normalization Status

- active auth hydration materializes `systemPermission`
- active project-role reads normalize through `getProjectRole()` and `isLeadProjectManager()`
- active UI permission checks now delegate to permission helpers rather than raw `user.role` comparisons
- the role catalog remains transitional metadata and is not the runtime authorization source of truth

## Canonical Matrix

| Concept | Scope | Current stored field | Current runtime source of truth | Transitional? | Target source of truth |
|---|---|---|---|---|---|
| User type | Organization identity | `users.type` | `User.type` | No | `User.type` |
| System permission | Whole app | `users.role` | `User.systemPermission` when present, otherwise normalized from `User.role` | Yes | `User.systemPermission` |
| Backward-compatible user role | Whole app | `users.role` | Compatibility field with helper fallback support | Yes | Persistence shim only |
| Project role | Per project | currently still effectively `user_project_assignments.category` | `getProjectRole()` for active runtime reads | Yes | `projectRole` plus helper normalization |
| Assignment category | Per project | `user_project_assignments.category` | Compatibility write field and legacy fallback | Yes | Persistence shim only |
| Role catalog / new role system | Metadata / future admin model | `roles` table plus optional user references | Not a runtime permission authority today | Yes | Separate, normalized role metadata system |

## What Is Source Of Truth Today

### Safe To Treat As Truth

- `User.type` for organization classification
- `SystemPermission` as the normalized conceptual system model
- `ProjectRole` as the normalized conceptual project model
- `getUserSystemPermission()` as the best current normalization helper
- `getProjectRole()` as the best current project-role normalization helper

### Still Transitional

- `User.role`
- `users.role`
- `UserProjectAssignment.category`
- `user_project_assignments.category`
- `RoleName`
- `defaultRole`
- `defaultRoleId`
- `useRoleStore`

## Current Mismatches

### 1. Legacy `role` Still Exists As A Persistence Bridge

Current status:

- active authorization reads have been moved to helpers in current adapters and screens
- `users.role` still remains the persisted compatibility field

Impact:

- future drift remains possible if new callsites bypass helpers
- `users.role` still needs to remain backward compatible until persistence changes are made

### 2. Assignment Persistence Is Still Transitional

Current status:

- active Lead PM reads now use normalized project-role helpers
- writes still persist through `user_project_assignments.category`

Impact:

- database compatibility still depends on the legacy field name
- full persistence normalization remains out of scope for this pass

### 3. Role Catalog Is Not Aligned To The Permission Matrix

Examples:

- [buildtrack.ts](file:///Volumes/KooDrive/Insite%20App/src/types/buildtrack.ts#L145-L165)

Problems:

- `RoleName` mixes job-title-like concepts and project-role concepts
- `member` is now represented in `RoleName`
- role-catalog entities are therefore not a complete reflection of system permissions

### 4. Documentation Still Needs To Track Transitional Boundaries

Relevant docs:

- [ROLE_SYSTEM_ANALYSIS.md](file:///Volumes/KooDrive/Insite%20App/documentation/history/analysis/ROLE_SYSTEM_ANALYSIS.md)
- [ROLE_SYSTEM_MIGRATION_COMPLETE.md](file:///Volumes/KooDrive/Insite%20App/documentation/history/analysis/ROLE_SYSTEM_MIGRATION_COMPLETE.md)
- [ROLE_SYSTEM_SIMPLIFICATION_SUMMARY.md](file:///Volumes/KooDrive/Insite%20App/documentation/history/analysis/ROLE_SYSTEM_SIMPLIFICATION_SUMMARY.md)

Impact:

- canonical docs now distinguish active runtime truth from archived migration analysis
- broader role-catalog redesign is still not complete

## Recommended Normalized Model

### System Layer

Use:

- `User.type` for company classification
- `SystemPermission` for app-wide authorization

Treat:

- `User.role` as a legacy persistence bridge only

### Project Layer

Use:

- `ProjectRole` for project-scoped authority and identity
- `getProjectRole()` for all reads

Treat:

- `category` as a legacy persistence bridge only

### Role Catalog Layer

Use:

- role-catalog entities only after they are clearly separated from both system permissions and project roles

Until then:

- do not treat the role store as an authorization source of truth

## Multi-company project membership (target law — post-RC)

**Canonical product SoT:** [multi-company-project-membership.md](./multi-company-project-membership.md)  
**Milestone:** `WS-AUTHZ / M-AUTHZ-02` (after `M-OPS-02`; not commercial RC)

Locked distinctions (implementation may lag):

1. **Company admin ≠ project authority.** Org admin may need **roster knowledge** (who of ours is on which projects, including other companies’ projects) without gaining project manage rights.
2. **Project membership** is via `user_project_assignments` (and project invites), not via browsing global `users`.
3. **Partner liaison** is a project-scoped delegation: host appoints one person at a partner company to manage **same-company** inclusion on that project.
4. **Seat billing:** default = member’s company; optional host-absorb path bills host seats explicitly.
5. **Company seat invite** (`inviteCompanyUser`) remains “add teammate inside our company” — distinct from project invite.

Until M-AUTHZ-02 ships, do not treat current admin `getAllUsers()` team pickers as approved product behavior.

## Recommended Relationship Going Forward

1. `User.type` answers: what kind of company is this user from?
2. `SystemPermission` answers: what can this user do across the app?
3. `ProjectRole` answers: what is this user on this project?
4. legacy `role` and `category` remain storage-compatibility shims until migration completes
5. the role catalog becomes optional metadata or future administration infrastructure only after it cleanly models `member` and stops mixing system and project concepts
6. multi-company inclusion follows [multi-company-project-membership.md](./multi-company-project-membership.md) (liaison / project invite / host-absorb) — not a global directory

## Practical Reading Guide

If you need the best current contract source, start here:

- [buildtrack.ts](file:///Volumes/KooDrive/Insite%20App/src/types/buildtrack.ts)

If you need to understand current user normalization, inspect:

- [authStore.ts](file:///Volumes/KooDrive/Insite%20App/src/state/authStore.ts)
- [authStore.supabase.ts](file:///Volumes/KooDrive/Insite%20App/src/state/authStore.supabase.ts)
- [userStore.supabase.ts](file:///Volumes/KooDrive/Insite%20App/src/state/userStore.supabase.ts)

If you need to understand project-role drift, inspect:

- [projectStore.supabase.ts](file:///Volumes/KooDrive/Insite%20App/src/state/projectStore.supabase.ts)

## Summary

The normalized model is conceptually clear:

- system-wide authority should be `SystemPermission`
- project-scoped authority should be `ProjectRole`

But the runtime is still transitional:

- `role` still drives many permissions
- `category` still drives project-role behavior
- the role catalog is not yet a trustworthy runtime authority

Any implementation work should therefore normalize reads first, keep persistence compatibility second, and postpone broader role-catalog redesign until the system and project permission layers are internally consistent.
