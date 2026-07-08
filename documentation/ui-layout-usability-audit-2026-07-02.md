# UI Layout And Usability Audit

Date: 2026-07-02

## Scope

This audit is based on the current repository state in `Insite App`, with emphasis on:

- `src/navigation/AppNavigator.tsx`
- `src/screens/DashboardScreen.tsx`
- `src/screens/TasksScreen.tsx`
- `src/screens/TaskDetailScreen.tsx`
- `src/screens/CreateTaskScreen.tsx`
- `src/screens/ProjectsScreen.tsx`
- `src/screens/AdminDashboardScreen.tsx`
- `src/screens/ReportsScreen.tsx`
- `src/screens/ProfileScreen.tsx`
- shared UI in `src/components/ModernScreenHeader.tsx`, `src/components/StandardHeader.tsx`, `src/components/ExpandableUtilityFAB.tsx`, `src/components/ProfileMenu.tsx`, and `src/components/primitives/container/ContainerCard.tsx`

It is a repo-level design/usability review, not a live simulator/device acceptance test. Existing screenshots under `Android Screen Shots/` were used as additional visual evidence where useful.

## Executive Summary

The app is in a meaningful transition from older utility-driven layouts to a cleaner card-based UI system. The strongest parts of the current direction are:

- the newer card primitives and view-adapter structure
- clearer task grouping on dashboard/tasks surfaces
- a more modern task-detail shell than the older dashboard/report screens

The main usability problem is not lack of features. It is inconsistency in navigation, header behavior, action placement, and information density across flows. Users are likely to feel that each major area behaves a little differently:

- some screens use `ModernScreenHeader`, others use `StandardHeader`
- the bottom tab navigator is hidden, but navigation is still effectively tab-based
- some screens depend on floating utility menus, others use fixed bottom bars, others use header actions
- some surfaces use the newer container primitives, while admin/projects/reports still use an older visual language

The highest-value opportunity is to unify the app around one mobile interaction model:

1. one consistent header pattern
2. one consistent primary navigation model
3. one consistent action model
4. one consistent spacing and card hierarchy

## What Is Working

### Strong Direction

- `DashboardScreen` and `TasksScreen` already show a cleaner, more modern system direction with restrained color, stronger spacing, and reusable cards.
- `ContainerCard` is a good foundation for future consistency across task, project, and activity surfaces.
- `TaskDetailScreen` has a stronger hierarchy than the legacy screenshot evidence: banner, details, activities, and actions are visually separable.
- `CreateTaskScreen` has solid form coverage and explicit workflow support for attachments, assignees, due dates, and task context.

### Architecture Supports Better UI

- The split between screens, view adapters, and primitives is good for UI iteration.
- The repository is already set up to standardize output shapes and visual components without forcing a full rewrite.

## Key Findings

### 1. Primary Navigation Is Powerful But Not Discoverable

Evidence:

- `AppNavigator.tsx` hides the tab bar with `tabBarStyle: { display: 'none' }`.
- The app still navigates through tab stacks such as `Dashboard`, `CreateTask`, `Reports`, and `Tasks`.
- Utility access is distributed across header icons, hidden routes, and floating action menus.

Impact:

- New or infrequent users will not easily understand the app's top-level structure.
- Navigation recall is required instead of recognition.
- Returning to a previous area depends too much on implementation-specific routes instead of obvious UI affordances.

Recommendation:

- Replace the hidden-tab mental model with an explicit primary shell.
- Choose one of these patterns and apply it consistently:
  - visible bottom navigation with 3-5 core destinations
  - a clear top-level home screen plus a single secondary utility menu
- If `Tasks` is a first-class destination, it should not be effectively hidden.

Priority: High

### 2. Header Behavior Is Inconsistent Across The App

Evidence:

- `ModernScreenHeader` is minimal and modern but visually under-styled.
- `StandardHeader` is more feature-heavy and includes company banner logic, dark mode branching, and profile/menu behaviors.
- Admin areas also implement custom profile-menu behavior instead of fully sharing one header contract.

Impact:

- The product lacks a stable visual identity at the top of the screen.
- Users must relearn where profile, project-switching, and back navigation live.
- Header height, padding, title styling, and accessory treatment vary between flows.

Recommendation:

- Merge toward one canonical app header component.
- Keep a single contract with optional slots:
  - back
  - title/subtitle
  - project context
  - profile/menu
  - contextual actions
- Bring `ModernScreenHeader` up to production visual quality rather than maintaining two parallel header systems.

Priority: High

### 3. The Action Model Changes Too Much Between Screens

Evidence:

- `DashboardScreen` and `TasksScreen` use a FAB.
- `ProfileScreen` uses `ExpandableUtilityFAB`.
- `ProjectsScreen` uses `LogoutFAB`.
- `TaskDetailScreen` uses a fixed bottom action bar.
- Several admin flows place important actions in header buttons.

Impact:

- Action discovery is inconsistent.
- The same task can be initiated from different control patterns depending on location.
- Floating menus compete with content and feel less native when overused.

Recommendation:

- Standardize action placement by screen type:
  - list/index screens: one primary FAB or one persistent CTA
  - detail/workflow screens: fixed bottom action area
  - settings/admin screens: header secondary actions only
- Retire `LogoutFAB` and reduce dependence on expandable floating utility clusters.
- Keep utility menus for overflow actions, not for primary wayfinding.

Priority: High

### 4. Visual Language Is Split Between “Modernized” And “Older Operational” Screens

Evidence:

- `DashboardScreen` and `TasksScreen` use primitive-based `ContainerCard`.
- `ProjectsScreen`, `AdminDashboardScreen`, `ReportsScreen`, and parts of `ProfileScreen` use older bespoke card blocks and spacing conventions.
- Screenshot evidence also shows older dashboard/report layouts that are more utility-dense and less refined.

Impact:

- The app feels like two products stitched together.
- Users moving between worker and admin flows get inconsistent levels of polish.
- Design debt remains visible even if architecture is improving underneath.

Recommendation:

- Expand the primitive/card system into:
  - project cards
  - stat cards
  - filter chips
  - activity rows
  - picker list rows
- Use the same radius, border, elevation, title scale, and metadata treatment across all major screens.

Priority: High

### 5. Dashboard Information Hierarchy Needs Better Prioritization

Evidence:

- `DashboardScreen` gives a large fixed-height project summary area and two metric grids.
- Existing screenshot evidence shows a dense dashboard with many similarly weighted boxes.
- Project summary, personal inbox state, and urgent work can visually compete with one another.

Impact:

- Users may not immediately know what deserves attention first.
- The page reads as multiple adjacent widgets rather than a strong “today’s work” flow.

Recommendation:

- Reframe dashboard hierarchy around urgency:
  - urgent/overdue summary
  - tasks requiring action today
  - project snapshot
  - lower-priority summaries
- Reduce equal visual weight across all metric cards.
- Add stronger sectional contrast so “needs action” stands out more clearly than “reference data.”

Priority: Medium-High

### 6. Create Task Is Capable But Too Long And Modal-Heavy

Evidence:

- `CreateTaskScreen` includes title, description, reference, billing status, project, priority, category, due date, assignees, attachments, and multiple full-screen modals.
- Selection flows for priority, billing status, category, project, and users each open separate modal surfaces.
- The form scroll is long, with one persistent footer CTA and many independent input types.

Impact:

- High cognitive load for quick task entry.
- Too many context switches for one workflow.
- Important fields can feel equally mandatory even when they are not equally important.

Recommendation:

- Split the form into clearer sections:
  - task basics
  - assignment
  - scheduling
  - billing/category
  - attachments
- Use progressive disclosure:
  - show essential fields first
  - collapse optional metadata under “More details”
- Convert simple pickers to lighter-weight inline selectors or bottom sheets where possible.
- Consider a compact “quick create” mode and a full-detail mode.

Priority: High

### 7. Task Detail Is Better Structured, But History And Actions Can Still Be Easier To Scan

Evidence:

- `TaskDetailScreen` mixes banners, detail cards, assignee blocks, activities, child tasks, and a multi-button fixed footer.
- Activity rows are text-heavy and visually repetitive.
- Footer actions can wrap, which risks unstable button rhythm on smaller devices.

Impact:

- Long task histories become hard to scan quickly.
- The user has to parse too much text to understand latest change, owner, and current next action.
- Multi-action footers risk cramped layouts.

Recommendation:

- Make the current state section more compact and always visible near the top.
- Reformat activity history as clearer timeline items with:
  - stronger timestamp grouping
  - event type chips/icons
  - collapsed older items by default
- Move secondary actions into an overflow menu when too many actions are present.
- Keep only the single most likely next action prominent.

Priority: Medium-High

### 8. Projects And Admin Flows Need A More Productive, Less Form-Like Rhythm

Evidence:

- `ProjectsScreen` uses a search field, chip row, and stacked cards, but the content block spacing still feels closer to an admin form than a high-utility workspace.
- `AdminDashboardScreen` stat cards and quick actions are functionally clear, but visually generic.
- `LogoutFAB` on `ProjectsScreen` is a strong sign that the shell/navigation model is not yet carrying the screen.

Impact:

- Admin flows look serviceable but not especially efficient or premium.
- Supporting actions are visually louder than the information architecture.

Recommendation:

- Make project/admin screens feel like the same app as the modernized task flows.
- Increase top-level hierarchy:
  - one hero summary row
  - one primary action area
  - one clearly grouped content section
- Remove floating logout/navigation controls from content screens.

Priority: Medium

### 9. Spacing, Type Scale, And Density Need Stronger System Rules

Evidence:

- Screen padding alternates between `px-4` and `px-6`.
- Headings range from `text-xl` to `text-2xl` without always signaling true hierarchy differences.
- Some metadata rows are dense, while other sections feel padded and sparse.

Impact:

- The UI does not feel rhythmically consistent.
- Smaller devices can feel crowded in some flows and under-structured in others.

Recommendation:

- Define and apply a simple spacing scale for screen shells:
  - outer padding
  - section gap
  - card gap
  - header-to-body spacing
- Define one title scale for:
  - screen title
  - section title
  - card title
  - metadata
- Use this across both modern and legacy-upgraded screens.

Priority: Medium

### 10. Accessibility And Touch Ergonomics Need A Dedicated Pass

Evidence:

- Some icon-only buttons in headers and menus rely on recognition.
- Several control clusters use small circular targets or tightly packed chip/button rows.
- Color is sometimes doing too much work in status differentiation.

Impact:

- Reduced accessibility for low-vision users and high-motion, one-handed field use.
- Higher chance of tap mistakes on smaller devices.

Recommendation:

- Increase explicit labels for critical actions where icon-only controls are currently used.
- Verify minimum touch targets for header actions, chips, and floating utilities.
- Ensure state meaning is not color-only; pair with text/iconography consistently.

Priority: Medium

## Screen-Specific Improvement Opportunities

### Dashboard

- Make “what needs action now” the clear first block.
- Reduce the project summary viewport from fixed widget feel to concise snapshot feel.
- Consolidate shortcut icons into one predictable header utility area.

### Tasks

- Add a stronger summary of active filters above the list.
- Improve empty/filter-result states so users understand why a list is empty.
- Consider sticky filters/search on long lists.

### Task Detail

- Promote latest status and next action more clearly.
- Collapse older activity items by default.
- Reduce footer button count shown at once.

### Create Task

- Group fields semantically.
- Move optional settings below essentials.
- Replace some full-screen pickers with lighter selection patterns.
- Consider a stepper or sectioned composer for long forms.

### Projects

- Strengthen scanability of each card with clearer primary/secondary metadata.
- Reduce visual competition between status, edit, location, member count, client, and dates.
- Replace floating logout/navigation utilities with shell-level controls.

### Admin Dashboard

- Give quick actions a stronger prioritized order and clearer “most used” emphasis.
- Make overview stats feel more dashboard-like and less like equal-value tiles.
- Share the same navigation/header language as the worker experience.

## Recommended Next Iteration Plan

### Phase 1

- Establish one canonical header
- establish one primary navigation model
- remove floating navigation/logout workarounds
- define spacing/type rules for all screen shells

### Phase 2

- refactor `ProjectsScreen`, `AdminDashboardScreen`, and `ReportsScreen` onto the same card/layout language as `DashboardScreen` and `TasksScreen`
- simplify `CreateTaskScreen` into sectioned/progressive disclosure workflow

### Phase 3

- improve `TaskDetailScreen` timeline readability and action prioritization
- perform touch-target and accessibility cleanup

## Highest-Value Wins

If only a few changes are made, these would create the biggest usability lift:

1. make top-level navigation explicit
2. unify headers and profile/project access
3. remove floating utility patterns as a substitute for navigation
4. simplify `CreateTaskScreen`
5. align projects/admin/report screens to the newer visual system

## Conclusion

The app already has the beginnings of a solid modern mobile workspace UI. The biggest opportunity is not inventing a new design direction. It is finishing the transition to one coherent product language so navigation, actions, density, and hierarchy feel stable everywhere.
