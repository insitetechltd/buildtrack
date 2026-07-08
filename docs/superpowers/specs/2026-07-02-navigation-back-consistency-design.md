# Navigation Back Consistency Design

Date: 2026-07-02

## Goal

Standardize back navigation behavior across all stack-pushed screens so:

- forward navigation always feels like a push from the right
- back navigation always feels like a return to the right
- swipe-back behavior is consistent across the app
- header back buttons use one shared symbol and one shared interaction model

## Problem

Current back behavior is inconsistent in two ways:

1. some flows visually return in the wrong direction
2. back button symbols and behavior vary across screens

A reported example is:

- `Dashboard`
- navigate to task list
- open a task
- press back
- the screen swipes left on return instead of behaving like a rightward back transition

The most likely cause is that some wrapper screens are performing explicit `navigate(...)` calls to sibling/root routes instead of respecting stack history, which turns a back action into a fresh forward navigation.

## Approved Decisions

### 1. Global Stack Direction Rule

All stack-pushed screens should use the same directional navigation behavior:

- forward push: incoming screen enters from the right
- back action: current screen exits to the right
- swipe-back gesture: right-swipe back

This applies to all stack-pushed screens for now, including utility flows such as:

- `PhotoSelection`
- `PhotoViewer`
- `PhotoAnnotation`
- `UpdateProgress`
- `AddComment`
- `RejectTask`
- `ReassignTask`

It also applies to the main application flows such as:

- `TaskDetail`
- `CreateTask`
- `Projects`
- `ProjectDetail`
- `UserManagement`
- `Profile` subpages

### 2. One Back Button Standard

All back-capable screens should use the same shared back affordance.

The standard is:

- one icon
- one touch target size
- one placement
- one accessibility label
- one shared implementation path

The intended shared source is the existing header path built on:

- `AppScreenHeader`
- `ModernScreenHeader`
- `StandardHeader`

### 3. Stack Back Must Respect Stack History

If a user drilled into a screen through a stack flow, the back button and swipe gesture should follow stack history instead of forcing a cross-tab or cross-root redirect.

This means:

- use true stack back behavior where a real stack history exists
- do not replace a back action with `navigate("Tasks")`, `navigate("Dashboard")`, or another sibling/root route unless the flow is intentionally a hard redirect

### 4. Tabs Are Not Back Actions

Tab switching remains separate from stack navigation.

- switching between `Dashboard`, `Tasks`, `CreateTask`, `Reports`, `Profile`, or admin roots is still a top-level navigation action
- stack-pushed screens inside those tabs should still follow the shared push/back transition rule

## Architecture

This should be implemented in three coordinated layers.

### Layer 1: Navigator Defaults

Add one shared stack transition policy to all native stack navigators:

- `DashboardStack`
- `TasksStack`
- `ProfileStack`
- `ReportsStack`
- `CreateTaskStack`
- `AdminDashboardStack`

This is the foundation for making all stack-pushed screens feel directionally consistent.

### Layer 2: Wrapper Back Cleanup

Review wrapper screens that currently override back behavior in a way that breaks stack semantics.

The primary review targets include:

- `TaskDetailFromDashboardWrapper`
- `TaskDetailScreenWrapper`
- `ProjectsTasksListScreen`
- any wrapper that uses a root/tab `navigate(...)` call as its back behavior

These wrappers should only use redirected navigation on purpose, not as the default solution for returning from a pushed screen.

### Layer 3: Header Standardization

Ensure every back-capable screen routes through the shared header path.

That means:

- `AppScreenHeader` defines the canonical back button
- `ModernScreenHeader` and `StandardHeader` stay as thin wrappers over that shared implementation
- any remaining custom inline back affordances should be removed or aligned to the same symbol and interaction behavior

## Screen Scope

This design covers all current stack-driven flows, including:

- dashboard task drill-in
- tasks list drill-in
- create/edit/update/comment/reject/reassign task flows
- photo utility flows
- project detail and create project flows
- user management flows
- profile subpages
- reports and admin subflows where stack push is used

## Implementation Rules

### Back Behavior Rules

- if a screen was pushed onto a stack, back should pop the stack
- if a gesture back is supported, it should match the same pop behavior
- directional animation should never make a normal back action look like a new forward push

### Header Rules

- use the shared back icon from `AppScreenHeader`
- do not mix multiple back symbols across screens
- do not use one-off back button shapes unless intentionally required by a special surface

### Redirect Rules

A wrapper may still intentionally redirect instead of popping when:

- the previous route is not actually the intended destination
- the screen is acting as a routed shortcut rather than a true pushed child

But those cases must be explicit and exceptional, not the default.

## Out Of Scope

This design does not require:

- redesigning the visual style of the tab bar
- changing the app information architecture
- changing task/business logic
- changing screen content/layout outside the back affordance and navigation behavior

## Testing Requirements

Implementation should verify:

- pushed screens return with rightward back behavior
- gesture back matches header back behavior
- `Dashboard -> Tasks -> Task Detail -> Back` no longer returns with the wrong direction
- all back-capable screens use the same header back icon
- wrapper-specific back handlers do not incorrectly replace stack pops with fresh sibling/root navigations

## Risks

- some existing flows may currently rely on root navigation as a shortcut and will need case-by-case review
- shared navigator option changes can affect multiple stacks at once
- some “back” handlers may be masking route-structure issues that become visible once true stack popping is restored

## Guardrails

- apply one shared transition policy first
- then clean up wrapper back handlers that violate stack semantics
- keep intentional hard redirects explicit and documented
- avoid mixing animation fixes with unrelated screen redesign work

## Recommended Next Step

Write an implementation plan that:

1. standardizes stack transition configuration across all native stacks
2. audits and fixes wrapper back handlers that currently force sibling/root navigation
3. confirms all back-capable headers use the same shared symbol
4. adds focused regression checks for the affected flows
