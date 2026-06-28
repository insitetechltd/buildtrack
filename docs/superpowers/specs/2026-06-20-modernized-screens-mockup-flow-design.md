# Modernized Screens Mockup Flow Design

**Goal**

Create a browser-reviewable mockup artifact that renders all currently modernized screens as one coherent visual review package, combining a user-journey flow, a grouped screen gallery, and a dedicated assessment of whether `ProjectsTasksScreen` is obsolete or should contribute its task-card layout to the current modern flow.

## Scope

This design covers three coordinated outputs in one local visual artifact:

1. A **flow view** that shows the high-level journey through the modernized screens.
2. A **gallery view** that shows all completed modernized screens grouped by function.
3. A **`ProjectsTasksScreen` comparison panel** that explains why the screen is out of the active flow and evaluates how its task-card layout could be reused inside the current modern architecture.

This design is for review and alignment only. It does not rewire app navigation or implement new runtime UI behavior yet.

## Current State

The repository now has a large set of completed adapter-driven or modernized screens, including:

- task workflow screens such as `TasksScreen`, `TaskDetailScreen`, `UpdateProgressScreen`, `AddCommentScreen`, `RejectTaskScreen`, `ReassignTaskScreen`, and `CreateTaskScreen`
- media workflow screens such as `PhotoSelectionScreen`, `PhotoAnnotationScreen`, and `PhotoViewerScreen`
- project and admin screens such as `ProjectsScreen`, `ProjectDetailScreen`, `CreateProjectScreen`, `UserManagementScreen`, `AdminDashboardScreen`, `PendingUsersScreen`, `DeveloperSettingsScreen`, and `DevAdminScreen`
- entry and utility screens such as `DashboardScreen`, `LoginScreen`, `ReportsScreen`, `ProfileScreen`, and `ProjectPickerScreen`

At the same time, `ProjectsTasksScreen` still exists as a standalone screen file but is no longer connected to the active navigator. The current app flow appears to distribute its old responsibilities across the modern `TasksScreen`, `ProjectsScreen`, and `ProjectDetailScreen`.

## Design Decisions

### 1. Present Both Flow And Gallery

The artifact should include both:

- a **flow-first narrative** for understanding the modernized experience as a journey
- a **gallery-style inventory** for auditing what has already been modernized

Reason:

- the flow view answers how the app experience hangs together
- the gallery view answers whether coverage is complete and visually consistent

### 2. Use Grouped Mockups, Not Raw Screen Dumps

The visual should use polished, lightweight browser mockups that reflect each screen's structure and role rather than trying to mirror every pixel of the native UI.

Reason:

- easier to compare screens side-by-side
- lower effort and lower noise than attempting pixel-perfect replicas
- better for communicating architecture and flow at a glance

### 3. Group Screens By Functional Domain

The gallery should be grouped into these buckets:

- **Core Task Flow**
- **Media And Attachments**
- **Projects And Admin**
- **Profile, Auth, And Utility**

Reason:

- reduces visual clutter
- makes completion status easier to scan
- aligns with how users mentally navigate the app

### 4. Include A `ProjectsTasksScreen` Assessment Panel

The review artifact should explicitly show:

- why `ProjectsTasksScreen` is out of the active flow
- which current modern screens now cover its responsibilities
- what is still valuable about its layout, especially the compact task-card design

It should then recommend one of two outcomes:

1. **Obsolete, no action needed**
2. **Obsolete as a route, but donate task-card layout ideas into the current modern task/project experience**

Current evidence suggests the second outcome is more likely.

### 5. Treat The Task-Card Layout As A Reusable Design Input

The mockup should highlight the user's stated preference for the old `ProjectsTasksScreen` card layout and show how that compact layout could be adapted into:

- `TasksScreen` for broader task browsing
- `ProjectDetailScreen` for project-admin visibility into all tasks for a single project

This is only a design recommendation in the mockup artifact, not an implementation commitment yet.

## Artifact Structure

The local browser artifact should have these sections in order:

### 1. Overview

- short explanation of what is included
- total count of completed modernized screens
- note that the artifact is a review mockup, not a running app build

### 2. Modernized Flow

A journey-oriented section showing likely navigation paths such as:

- login to dashboard
- dashboard to tasks to task detail to progress/comment/reject/reassign
- dashboard/profile to project picker
- admin dashboard to projects, project detail, create project, user management, pending users, developer/admin tools

### 3. Screen Gallery

A grouped gallery containing all completed modernized screens, with one small visual card per screen showing:

- screen name
- short purpose
- header style cues
- notable UI traits

### 4. `ProjectsTasksScreen` Comparison

A dedicated section containing:

- a mockup of the legacy/orphaned combined screen
- a mapping to current modern screens
- a recommendation about obsolescence
- a design note on reusing its compact task-card presentation

## Validation

The output is considered successful if:

- the user can open one local URL and visually review the completed modernization set
- the flow and gallery both clearly represent the completed screens
- the `ProjectsTasksScreen` panel makes its status and potential layout reuse obvious
- the artifact is easy to scan and discuss in follow-up iterations

## Out Of Scope

- rewiring `ProjectsTasksScreen` back into the app
- implementing a new task-card layout in native code
- changing navigation behavior
- changing business logic, adapters, or stores
