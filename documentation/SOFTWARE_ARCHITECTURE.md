# Software Architecture

## Purpose

This document is the canonical system-level architecture reference for the app as implemented in this repository.

Use it together with:

- `documentation/INSITE_APP_LATEST.md` for current product behavior
- `documentation/UI_ARCHITECTURE.md` for UI-layer ownership rules
- `documentation/DATABASE_ARCHITECTURE.md` for Supabase and schema architecture

If this document conflicts with implemented code, trust the code and update this file.

## Scope

This architecture describes the current mobile application runtime built with Expo, React Native, Zustand, React Navigation, and Supabase.

It focuses on:

- top-level runtime entrypoints
- authenticated and unauthenticated app shell structure
- navigation boundaries
- UI, state, API, and sync-layer ownership
- major data flows for auth, projects, tasks, and synchronization
- transitional boundaries that still exist in the current codebase

## Runtime Stack

- Runtime platform: Expo-managed React Native app
- Language: TypeScript
- Navigation: React Navigation native stack plus bottom-tab application shell
- State management: Zustand with persisted slices backed by AsyncStorage
- Backend integration: Supabase Auth, PostgREST, Realtime, and Storage
- UI mode split: hybrid modern and legacy screen routing via `src/navigation/uiModeRoutes.tsx`

## Canonical Entry Points

### Application bootstrap

- `App.tsx`
- `index.ts`
- `src/navigation/AppNavigator.tsx`

### Core runtime integrations

- `src/api/supabase.ts`
- `src/state/authStore.ts`
- `src/state/projectStore.supabase.ts`
- `src/state/taskStore.supabase.ts`
- `src/state/userStore.supabase.ts`
- `src/state/projectFilterStore.ts`

### Runtime sync managers

- `src/utils/DataRefreshManager.tsx`
- `src/utils/NetworkSyncManager.tsx`
- `src/utils/RealtimeSyncManager.tsx`

## System Model

At a high level, the app is a screen-driven mobile client that authenticates through Supabase, persists local state with Zustand + AsyncStorage, and coordinates project/task data through Supabase-backed stores.

The main runtime layers are:

1. navigation and app shell
2. screens and screen wrappers
3. view adapters and UI contracts
4. persisted domain stores
5. Supabase client and service integration
6. sync and refresh managers

## Top-Level App Shell

### Authentication shell

The unauthenticated flow is intentionally narrow:

- `LoginScreen` is the active auth entry
- registration is disabled in the navigator for the current production posture
- `src/state/authStore.ts` owns session restoration, login, logout, and post-login data warmup

### Authenticated shell

`src/navigation/AppNavigator.tsx` is the central composition point for the authenticated app runtime.

It mounts:

- the bottom-tab navigator used as the main route partition
- separate stacks for dashboard/activity, tasks, create-task, profile, and admin flows
- background sync components:
  - `DataRefreshManager`
  - `NetworkSyncManager`
  - `RealtimeSyncManager`

### User-mode split

The authenticated shell branches by system permission:

- admin users get the admin dashboard stack
- non-admin users get the standard multi-stack shell

That split currently relies on permission helpers derived from the authenticated user model.

## Navigation Architecture

### Structure

The app uses:

- a bottom-tab navigator as the root authenticated shell
- multiple native stack navigators for domain-specific flows
- typed navigation params in `src/navigation/navigationTypes.ts`

For non-admin users, the tab bar is a visible part of the main shell and currently presents:

- `Activity`
- `Tasks`
- `Camera`
- `Profile`

For admin users, the shell exposes the admin dashboard tab and hides the profile tab button while still mounting the profile stack.

The tab structure remains important for:

- route partitioning
- programmatic navigation
- fallback routing between shell areas

### Screen routing split

`src/navigation/uiModeRoutes.tsx` selects between modern and legacy screen implementations:

- `DashboardRoute`
- `TasksRoute`

This means the current architecture is intentionally hybrid:

- modernized screens and adapters can coexist with legacy screen implementations
- navigator contracts remain stable while view-level migration proceeds

### Navigation ownership

Navigation ownership is split as follows:

- navigators and wrappers own route definitions and navigation calls
- screens own UI wiring and handler passing
- the intended long-term adapter contract is that view adapters should not call `navigation.navigate(...)` directly

Current implementation note:

- some adapters still perform navigation directly during the hybrid migration period, especially in update-progress and rejection flows
- `documentation/UI_ARCHITECTURE.md` remains the canonical target-state ownership rule for reducing that drift over time

## Layer Responsibilities

### 1. Screens

Primary location:

- `src/screens/`

Screens own:

- layout composition
- visual state rendering
- user interaction wiring
- invoking adapters and store selectors

Screens should not own:

- Supabase client access
- persistence rules
- reusable domain orchestration that belongs in stores

### 2. View adapters and UI contracts

Primary locations:

- `src/ui/viewAdapters/`
- `src/ui/contracts/`

View adapters exist as a UI-facing transformation layer between domain stores and rendered screens.

They own:

- derived UI-ready models
- stable output contracts such as `screenId`, `readiness`, and `continuity`
- adapter-level action shaping for non-navigation behavior

They should not own:

- navigation calls
- direct backend access
- domain persistence

### 3. Domain stores

Primary locations:

- `src/state/authStore.ts`
- `src/state/taskStore.supabase.ts`
- `src/state/projectStore.supabase.ts`
- `src/state/userStore.supabase.ts`
- `src/state/projectFilterStore.ts`
- `src/state/roleStore.ts`

Stores own:

- authoritative client-side domain state
- local persistence through Zustand middleware and AsyncStorage
- Supabase fetch, transform, normalization, and cache coordination
- derived indices used to make screen reads fast

Important runtime pattern:

- storage uses persisted Zustand slices
- online authority comes from Supabase-backed fetches and invalidation
- runtime shapes are usually camelCase, even when Supabase rows are snake_case

### 4. API and backend integration

Primary location:

- `src/api/`

`src/api/supabase.ts` is the most important integration module because it owns:

- Supabase client creation
- auth persistence wiring through AsyncStorage
- request single-flight and cache-envelope helpers
- health and connectivity helpers
- typed database client scaffolding

Other API modules provide focused external-service integrations, but Supabase remains the main production backend surface for app state.

### 5. Sync and refresh managers

Primary location:

- `src/utils/`

The current runtime uses three always-on logic components:

- `DataRefreshManager.tsx`
  - handles foreground refresh and periodic fallback polling
  - warms tasks, projects, assignments, and users in parallel
- `NetworkSyncManager.tsx`
  - listens for connectivity restoration and triggers a refresh on reconnect
- `RealtimeSyncManager.tsx`
  - subscribes to Supabase Realtime events and performs incremental invalidation and refetch

Together they form a layered sync model:

- realtime first
- polling and foreground refresh as fallback
- network reconnect refresh as recovery path

## Major Runtime Flows

### Authentication flow

1. User signs in through `useAuthStore` in `src/state/authStore.ts`.
2. Phone-number login is translated to email when necessary via the `users` table.
3. Supabase Auth validates credentials.
4. The app loads the matching `users` row and normalizes legacy role fields into `systemPermission`.
5. After login, the store warms project, task, and user data from the authoritative Supabase-backed stores.

### Project workspace flow

1. `projectFilterStore` resolves the selected workspace project.
2. Selection is persisted locally and synchronized to `users.last_selected_project_id`.
3. Project data and user assignments are fetched through `projectStore.supabase.ts`.
4. Screens and adapters consume normalized project and assignment state rather than raw rows.

### Task flow

1. `taskStore.supabase.ts` fetches tasks and task activities from Supabase.
2. Rows are normalized into the unified `Task` and `TaskActivity` models.
3. The store maintains derived maps such as:
   - tasks by id
   - task ids by project
   - task ids by assignee
   - top-level vs child task relationships
4. Screens and adapters consume task trees, previews, and filtered task sets from store selectors and helper methods.

### Realtime and cache invalidation flow

1. `RealtimeSyncManager` subscribes to `tasks`, `task_activities`, `projects`, and `users`.
2. On change, it invalidates affected resource keys.
3. The relevant store refetches the scoped entity or list.
4. `DataRefreshManager` and `NetworkSyncManager` provide fallback refreshes if realtime coverage is incomplete or unavailable.

## Caching, Persistence, and Normalization

### Local persistence

The app persists selected Zustand slices through:

- `persist(...)`
- `createJSONStorage(...)`
- `AsyncStorage`

This provides:

- session restoration
- cached store state between launches
- offline-friendly continuity for some user flows

### Request coordination

`src/api/supabase.ts` implements a request coordinator that provides:

- resource keys
- stale and TTL windows
- single-flight suppression
- cache metadata envelopes
- invalidation hooks for realtime updates

This is a key system-level pattern because it reduces duplicated fetches while still allowing targeted refresh.

### Row-to-model normalization

A repeated architecture pattern in the stores is:

1. fetch snake_case rows from Supabase
2. transform them to camelCase runtime models
3. preserve some legacy compatibility fields while migrating
4. compute derived indexes for screen consumption

## Architectural Boundaries

### Stable boundaries

These boundaries are intended and should be preserved:

- navigators define route structure
- screens render and wire UI
- adapters shape UI-facing contracts
- stores own domain state and persistence
- `src/api/` owns backend integration
- sync managers own cross-cutting refresh behavior

### Current transitional boundaries

The current codebase still contains several transitional seams:

- hybrid modern and legacy screen routing
- legacy compatibility fields in the domain types
- role-system transition between `users.role`, `systemPermission`, project `category`, and the `roles` table
- SQL migration artifacts in the repo root that describe history rather than guaranteed current production schema

These do not invalidate the architecture, but they must be documented so future cleanup work does not mistake transitional scaffolding for final-state design.

## Known Transitional Models

### Auth and user permission model

The runtime now prefers normalized permission helpers, but persistence still bridges through older role fields.

Canonical deeper reference:

- `documentation/role-permission-matrix.md`

### UI migration state

The app is still in a hybrid UI phase where some routes choose between modern and legacy implementations.

Canonical deeper references:

- `documentation/UI_ARCHITECTURE.md`
- `documentation/m-fnd-04-ui-migration-wave-matrix.md`

### Task activity unification

The task domain has been moving from multiple history/update models toward the unified `task_activities` model.

Canonical deeper reference:

- `documentation/DATABASE_ARCHITECTURE.md`

## Source-Of-Truth References

Use these documents together to reconstruct the implemented system:

- `documentation/SOURCE_OF_TRUTH.md`
- `documentation/ROADMAP.md`
- `documentation/INSITE_APP_LATEST.md`
- `documentation/UI_ARCHITECTURE.md`
- `documentation/DATABASE_ARCHITECTURE.md`
- `documentation/role-permission-matrix.md`

## Summary

The current app architecture is a Supabase-backed, screen-driven Expo mobile client with:

- a bottom-tab plus native-stack navigation shell
- persisted Zustand domain stores
- a hybrid modern/legacy UI transition layer
- request coordination and realtime invalidation around Supabase
- explicit ownership boundaries between UI, state, backend, and sync concerns

This file is the canonical system-level architecture reference for that runtime.
