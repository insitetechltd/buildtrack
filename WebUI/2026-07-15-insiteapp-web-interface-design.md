# InsiteApp Web Interface Design

## Overview

Design a clean, modern, and simple web interface for InsiteApp that extends the existing mobile app theme into a desktop-first experience. The web product serves two primary audiences:

- Organization-level and project-level administrators who need oversight, configuration, and management tools
- Regular users who need to log in and perform core task-related work already available on the mobile app

The interface should feel operational, trustworthy, and easy to scan for construction-focused users. It should prioritize clarity, predictable navigation, and fast access to the next action over visual novelty.

## Goals

- Reuse the existing app theme so the web interface feels like the same product family
- Create a role-based experience that sends users into the right workspace immediately after login
- Support high-value admin workflows at the organization and project levels
- Support core regular-user task execution workflows on the web
- Keep the UI clean, simple, and desktop-native while remaining responsive on tablet and mobile web

## Non-Goals

- Full parity with every mobile feature in the first release
- Mobile-web optimization for heavy admin workflows
- A single universal landing page that mixes admin and field-user priorities equally
- Decorative or marketing-style UI treatment

## Recommended Product Direction

The recommended structure is a **role-based split**:

- **Admins** land in an admin control center
- **Regular users** land in a task-first workspace
- **Admins** can still access task workflows when they need to operate like an end user

This approach is preferred over a unified workspace because it reduces cognitive load, keeps administrative functions prominent, and gives operational users a more direct path into their work.

## Information Architecture

### 1. Shared Entry Layer

Shared system-level elements available to all roles:

- Login and authentication
- Role check after login
- Organization and project context selection
- Global search
- Notifications and alerts
- Profile and account menu
- Help and support entry points

### 2. Admin Control Center

The admin area is split across two management scopes.

#### Organization-Level Administration

Primary responsibilities:

- Organization directory and overview
- User and role management
- Permissions and access control
- Standards, templates, and reusable configuration
- Cross-project visibility
- Organization-wide reporting and health summaries

#### Project-Level Administration

Primary responsibilities:

- Project setup and project detail management
- Team assignment and membership controls
- Workflow oversight
- Task pipeline visibility
- Status tracking and issue escalation
- Recent activity and project-level reporting

### 3. Task Workspace

The regular-user workspace is task-first and operational:

- My Tasks
- Task filters and sorting
- Task detail
- Notes and comments
- Attachments and photo/file upload
- Status updates
- Task completion

This area should also be accessible to admins when they need to act within task workflows.

## Navigation Model

Use a **left sidebar plus top context bar** layout for desktop.

### Left Sidebar

Primary navigation categories:

- Dashboard
- Organization
- Projects
- Tasks
- Reports
- Settings

The sidebar should stay stable across the product to reduce disorientation.

### Top Context Bar

Persistent controls:

- Current organization
- Current project
- Search
- Alerts / notifications
- Profile menu

The current context must be visible at all times so users always know whether they are acting at the organization level or inside a specific project.

### Secondary Navigation

Use tabs only within complex pages where sub-areas are clearly related, such as:

- Project settings
- Organization management
- User and permissions administration

Avoid deep multi-level navigation trees.

## Primary Screens

### Admin Dashboard

Purpose:

- Give administrators immediate visibility into system health and operational exceptions

Core content:

- KPI summary cards
- Active projects
- Overdue items
- Approval or review queues
- Recent activity
- Exceptions requiring attention

### Organization Management

Purpose:

- Manage organizations, users, roles, standards, and reporting controls

Core content:

- User list and role assignments
- Permission configuration
- Organization profile and settings
- Standards/templates configuration
- High-level reporting access

### Project Management

Purpose:

- Manage projects and monitor delivery health

Core content:

- Project list
- Project detail
- Team assignment
- Status overview
- Workflow and issue visibility
- Project-level settings

### Task Workspace

Purpose:

- Let regular users complete task work quickly and clearly

Core content:

- Assigned task list
- Task filtering
- Task detail panel or page
- Progress/status updates
- Notes/comments
- Attachments and image/file upload
- Completion actions

### Notifications and Activity

Purpose:

- Show recent changes, mentions, escalations, and reminders

Core content:

- Alert feed
- Activity timeline
- Priority markers
- Direct links back into the relevant project or task

## Visual Design Direction

The web interface should extend the existing app theme rather than replace it.

### Tone

- Clean
- Modern
- Practical
- Reliable

The product should feel operational rather than promotional. It should support focused work in construction environments where users often need to scan information quickly and act decisively.

### Layout Principles

- Use structured panels and clear section headers
- Prefer alignment, spacing, and hierarchy over visual decoration
- Keep interfaces uncluttered
- Use white space to separate concerns and reduce fatigue

### Color Strategy

- Preserve the app’s existing brand palette as the identity layer
- Use mostly neutral surfaces for layout and content areas
- Reserve primary brand color for key actions and emphasis
- Use semantic status colors consistently for warning, overdue, blocked, in progress, and completed states

### Typography

- Highly readable body text
- Medium-weight headings
- Strong contrast
- Sizes optimized for desktop and laptop use in both office and site conditions

## Component Strategy

The design system for the interface should stay repeatable and low-complexity.

### Admin-Oriented Components

- KPI cards
- Data tables
- Status charts
- Filter bars
- Approval queues
- Permission panels
- Detail drawers

### Task-Oriented Components

- Task cards
- Task lists
- Task detail panels
- Quick status actions
- Attachment blocks
- Comment threads
- Progress indicators

### Shared Components

- Search
- Notifications
- Breadcrumbs
- Tabs
- Chips and tags
- File upload
- Date selectors
- Context switchers

Important actions should usually be visible on the page rather than hidden in overflow menus.

## Core User Flows

### Admin Flow

1. Log in
2. Enter organization or project context
3. Review dashboard status and exceptions
4. Manage users, projects, workflows, or settings
5. Drill into problem areas or approval queues

### Project Admin Flow

1. Enter a specific project
2. Review team, assignments, and project status
3. Adjust project-level configuration or workflow state
4. Investigate issues and unblock delivery

### Regular User Flow

1. Log in
2. Land in `My Tasks`
3. Filter or search current work
4. Open task detail
5. Add notes, comments, or attachments
6. Update status
7. Complete task

## UX Rules

- Keep the most important actions directly visible
- Make organization and project context obvious at all times
- Prefer direct drill-down from lists and dashboards over deep navigation
- Use consistent status and urgency cues across all views
- Optimize for fast scanning and straightforward action
- Preserve simplicity for field users even inside a desktop web shell

## Responsive Behavior

### Desktop

- Full admin dashboards
- Persistent sidebar
- Split panels
- Wide tables
- Higher information density

### Tablet

- Collapsible sidebar
- Stacked cards
- Simplified filter controls
- Reduced table density

### Mobile Web

- Prioritize task access and lightweight task updates
- De-emphasize or restrict heavy admin workflows
- Preserve only essential navigation and core task actions

## MVP Scope

The first web release should include:

- Role-based navigation shell
- Admin dashboard
- Organization management core views
- Project management core views
- Task workspace with core execution capabilities
- Notifications / activity layer
- Shared responsive UI based on the current app theme

Regular-user scope for the first version is **core execution**, specifically:

- View assigned tasks
- Update status
- Add notes/comments
- Upload photos/files
- Complete tasks

## Error Handling and Empty States

The interface should handle operational complexity without becoming noisy.

- Show clear empty states for no projects, no tasks, or no alerts
- Use inline validation for forms and settings changes
- Use banner or toast messaging for save success/failure
- Make permission-related restrictions explicit rather than silently hiding context
- Surface blocked or overdue work with strong visual distinction

## Testing and Validation Criteria

The design should be considered successful if it supports the following:

- Admins can understand organization and project health quickly after login
- Admins can move between organization-level and project-level controls without confusion
- Regular users can identify, open, update, and complete tasks with minimal friction
- The current organization/project context remains clear across all primary flows
- The web interface feels visually consistent with the existing app theme
- The product remains readable and usable for construction-focused users on desktop and tablet

## Open Assumptions

These assumptions were used because the local workspace did not contain enough existing product UI or theme files to inspect directly:

- The current app already has an established visual theme worth extending into web
- The mobile app includes broader task functionality, but first-release web scope should focus on core execution
- Organization-level admin and project-level admin are separate responsibilities but belong in a shared admin control center

If product files or reference screens become available later, this spec should be refined to align more precisely with the live app’s visual language and information model.
