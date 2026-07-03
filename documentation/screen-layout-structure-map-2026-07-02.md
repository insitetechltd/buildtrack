# Insite App Screen Layout Structure Map

Date: 2026-07-02

## Purpose

This document maps the current screen layout structure in the repo so you can refer to the **exact screen region or reusable component** that needs to change.

It is based on the current code in:

- `src/navigation/AppNavigator.tsx`
- `src/screens/`
- `src/components/`

## How To Use This

When asking for a UI change, refer to:

1. the screen name
2. the layout region
3. the reusable component if one exists

Example phrasing:

- "On `CreateTaskScreen`, change the `Task Basics` section header spacing."
- "On `ProjectsScreen`, update `ProjectsOverviewHero`."
- "On `TaskDetailScreen`, restyle `TaskActivityTimeline`."
- "In the password change modal inside `ProfileScreen`, change the input card spacing."

## Navigation Structure

Current navigation in `AppNavigator.tsx` is organized into these top-level stacks:

- `Dashboard` tab -> `DashboardStack`
- `Tasks` tab -> `TasksStack`
- `CreateTask` tab -> `CreateTaskStack`
- `Reports` tab -> `ReportsStack`
- `AdminDashboard` tab -> `AdminDashboardStack` for admins
- `Profile` tab route exists but is hidden from the tab bar

Important note:

- In the **current repo state**, the bottom tab bar with `Dashboard`, `Tasks`, `Create`, and `Reports` is visible in `AppNavigator.tsx`.
- `Profile` is hidden from the tab bar and accessed through navigation triggers.

## Shared Layout Building Blocks

These are the main reusable layout primitives currently visible across screens:

- `AppScreenHeader`
- `ModernScreenHeader`
- `StandardHeader`
- `ScreenSection`
- `PrimaryActionBar`
- `ProjectsOverviewHero`
- `AdminOverviewHero`
- `ReportsOverviewHero`
- `TaskActivityTimeline`
- `ContainerCard`
- `ProjectForm`
- `EditProjectModal`

## Screen Map

### `LoginScreen`

File:

- `src/screens/LoginScreen.tsx`

Top-level structure:

- `SafeAreaView`
- absolute build identifier label
- `KeyboardAvoidingView`
- `ScrollView`
- centered auth content wrapper
- logo/title block
- login form block
- email/phone input row
- password input row
- submit button

Exact change targets:

- brand/hero area -> logo/title block
- form field chrome -> `TextInput` rows inside the login form block
- submit CTA -> `login-submit`

### `DashboardScreen`

File:

- `src/screens/DashboardScreen.tsx`

Top-level structure:

- `SafeAreaView`
- custom inline header row
- title: `Dashboard`
- right-side shortcut icons
- `ModernUiMarker`
- project picker shortcut
- profile shortcut
- developer settings shortcut
- project summary section
- `FlatList` of `ContainerCard`
- tasks-for-me metric grid
- tasks-from-me metric grid

Exact change targets:

- header actions -> custom inline header row
- project summary cards -> `ContainerCard`
- metric cards -> local `renderGridCard`

### `TasksScreen`

File:

- `src/screens/TasksScreen.tsx`

Top-level structure:

- `SafeAreaView`
- custom inline header row
- optional back button
- title: `Tasks`
- right-side shortcuts
- search row using `TextField`
- horizontal section filter chips
- `FlatList` of `ContainerCard`
- floating create-task FAB

Exact change targets:

- search bar -> `TextField`
- section filters -> local chip row
- task list cards -> `ContainerCard`
- create action -> floating FAB

### `CreateTaskScreen`

File:

- `src/screens/CreateTaskScreen.tsx`

Top-level structure for the main create/edit form:

- `SafeAreaView`
- `ModernScreenHeader`
- `ScrollView`
- `ScreenSection` -> `Task Basics`
- `ScreenSection` -> `Assignment`
- `ScreenSection` -> `Schedule`
- `ScreenSection` -> `More Details`
- `CreateTaskAttachmentSection`
- `PrimaryActionBar`

Important reusable subcomponents:

- `CreateTaskAttachmentSection`
- `CreateTaskSuggestionPreview`
- `PrimaryActionBar`
- local `InputField`

Important alternate modes inside the same file:

- edit mode
- update mode
- comment mode
- reassign mode
- photo shortcut mode

Those render different task-action shells inside the same file rather than separate dedicated layout files.

Exact change targets:

- top shell/header -> `ModernScreenHeader`
- section spacing -> `ScreenSection`
- task basics fields -> local `InputField` block inside `Task Basics`
- assignment controls -> `Assignment` section
- attachments card -> `CreateTaskAttachmentSection`
- bottom submit action -> `PrimaryActionBar`

### `TaskDetailScreen`

File:

- `src/screens/TaskDetailScreen.tsx`

Top-level structure:

- `SafeAreaView`
- `ModernScreenHeader`
- `ScrollView`
- banner/status region
- mapped detail sections using `ContainerCard`
- `TaskActivityTimeline`
- child-task area
- secondary action row
- `PrimaryActionBar`

Important reusable subcomponents:

- `TaskActivityTimeline`
- `ContainerCard`
- `PrimaryActionBar`

Exact change targets:

- task header shell -> `ModernScreenHeader`
- details blocks -> `ContainerCard`
- activity/history UI -> `TaskActivityTimeline`
- secondary actions strip -> `task-detail__secondary-actions`
- primary footer CTA -> `PrimaryActionBar`

### `ProfileScreen`

File:

- `src/screens/ProfileScreen.tsx`

Top-level structure:

- `SafeAreaView`
- `StandardHeader`
- `ScrollView`
- profile card
- mapped settings/menu sections
- `MenuOption` rows
- system status card
- password change modal

Exact change targets:

- top header -> `StandardHeader`
- profile identity card -> profile card block
- settings rows -> `MenuOption`
- system status area -> system status card

Embedded modal:

- password change modal
- modal handle
- modal header row
- scroll content with password inputs

If you want to change the password UI specifically, refer to:

- "password change modal inside `ProfileScreen`"

### `ReportsScreen`

File:

- `src/screens/ReportsScreen.tsx`

Top-level structure:

- `SafeAreaView`
- shared header shell
- `ScrollView`
- `ReportsOverviewHero`
- `ScreenSection` -> report configuration
- `ScreenSection` -> statistics overview
- `ScreenSection` -> task preview

Exact change targets:

- hero summary -> `ReportsOverviewHero`
- config block -> report configuration `ScreenSection`
- stats block -> statistics overview `ScreenSection`
- preview block -> task preview `ScreenSection`

### `AdminDashboardScreen`

File:

- `src/screens/AdminDashboardScreen.tsx`

Top-level structure:

- `SafeAreaView`
- shared header shell
- `ScrollView`
- `AdminOverviewHero`
- `ScreenSection` -> company overview
- stat card grid
- `ScreenSection` -> administrative actions

Exact change targets:

- hero summary -> `AdminOverviewHero`
- stat cards -> company overview section content
- quick actions -> administrative actions section

### `ProjectsScreen`

File:

- `src/screens/ProjectsScreen.tsx`

Top-level structure:

- `SafeAreaView`
- shared header shell
- `ScrollView`
- `ProjectsOverviewHero`
- `ScreenSection` -> filters
- `ProjectsScreenFilterChips`
- `ScreenSection` -> project list
- repeated `ProjectsScreenProjectCard`
- `EditProjectModal`

Important reusable subcomponents:

- `ProjectsOverviewHero`
- `ProjectsScreenFilterChips`
- `ProjectsScreenProjectCard`
- `EditProjectModal`

Exact change targets:

- hero summary -> `ProjectsOverviewHero`
- filter row -> `ProjectsScreenFilterChips`
- project card layout -> `ProjectsScreenProjectCard`
- project edit UI -> `EditProjectModal`

### `CreateProjectScreen`

File:

- `src/screens/CreateProjectScreen.tsx`

Top-level structure:

- `SafeAreaView`
- `StandardHeader`
- optional company banner / subtitle card
- `ProjectForm`

Exact change targets:

- page header -> `StandardHeader`
- company context strip -> banner/subtitle card
- form layout -> `ProjectForm`

### `ProjectDetailScreen`

File:

- `src/screens/ProjectDetailScreen.tsx`

Top-level structure:

- `SafeAreaView`
- `StandardHeader`
- edit action in header
- `ScrollView`
- hero-style project header block
- lead PM banner
- stat cards grid
- project information card
- team members section
- `EditProjectModal`
- add-member modal

Exact change targets:

- top page header -> `StandardHeader`
- edit affordance -> header right action
- hero info block -> project header block
- team members row layout -> team members section
- edit form -> `EditProjectModal` or `ProjectForm`

Embedded modals:

- `EditProjectModal`
- add-member modal

### `UserManagementScreen`

File:

- `src/screens/UserManagementScreen.tsx`

Top-level structure:

- `SafeAreaView`
- `StandardHeader`
- company scope banner
- search + invite row
- user count label
- `FlatList` of user cards
- assignment modal
- project picker modal
- project role modal

Exact change targets:

- screen header -> `StandardHeader`
- company banner -> company scope card
- search row -> search + invite row
- user list item layout -> rendered user card
- assign flow -> assignment modal
- project selection flow -> project modal
- role selection flow -> category modal

### `ProjectPickerScreen`

File:

- `src/screens/ProjectPickerScreen.tsx`

Top-level structure:

- `SafeAreaView`
- `StandardHeader`
- `ScrollView`
- section title/count label
- empty state or mapped project cards

Exact change targets:

- screen header -> `StandardHeader`
- project tile styling -> mapped project card `Pressable`
- empty state -> empty-state block inside the scroll view

### `UpdateProgressScreen`

File:

- `src/screens/UpdateProgressScreen.tsx`

Top-level structure:

- `SafeAreaView`
- `ModernScreenHeader`
- `ScrollView`
- photos/files section
- uploaded photo carousel
- failed uploads block
- add-files dashed uploader
- update description input
- completion percentage section
- slider
- fixed bottom submit bar

Exact change targets:

- header -> `ModernScreenHeader`
- photo management area -> photos/files section
- description field -> update description block
- completion control -> slider section
- submit CTA -> fixed bottom bar

### `AddCommentScreen`

File:

- `src/screens/AddCommentScreen.tsx`

Top-level structure:

- `SafeAreaView`
- `StandardHeader`
- `ScrollView`
- photos section
- add-photos dashed CTA
- comment text block
- fixed bottom submit bar

Exact change targets:

- header -> `StandardHeader`
- photo attachment UX -> photos section
- comment input styling -> comment text block
- submit action -> fixed bottom bar

### `RejectTaskScreen`

File:

- `src/screens/RejectTaskScreen.tsx`

Top-level structure:

- `SafeAreaView`
- `StandardHeader`
- `ScrollView`
- photos section
- add-photos CTA
- rejection reason block
- fixed bottom submit bar

Exact change targets:

- header -> `StandardHeader`
- reason input -> rejection reason block
- submit action -> fixed bottom bar

### `ReassignTaskScreen`

File:

- `src/screens/ReassignTaskScreen.tsx`

Top-level structure:

- `SafeAreaView`
- `StandardHeader`
- search row
- `ScrollView`
- assignee list rows
- favorite star action
- fixed bottom submit bar

Exact change targets:

- search input -> search row
- user row styling -> assignee list row
- favorite interaction -> star action
- submit CTA -> fixed bottom bar

## Reusable Form And Modal Components

### `ProjectForm`

File:

- `src/components/ProjectForm.tsx`

Structure:

- `KeyboardAvoidingView`
- `ScrollView`
- project information card
- client name input
- project title input
- description input
- status dropdown
- date pickers
- location input
- client email/phone inputs
- bottom submit/cancel actions

Use this when the request is about:

- create-project form layout
- edit-project form field order
- project text-input styling
- project form validation surface

### `EditProjectModal`

Files:

- `src/screens/projects/EditProjectModal.tsx`
- embedded variant also exists inside `src/screens/ProjectDetailScreen.tsx`

Structure:

- `Modal`
- `SafeAreaView`
- `ModalHandle`
- modal header row
- scrollable form content
- project information card
- text fields
- status/date pickers
- lead PM selector
- save action

Use this when the request is about:

- project editing as a modal sheet
- modal header chrome
- lead PM picker area

## Media Screens

These are navigable but more utility-oriented than layout-heavy:

- `PhotoSelectionScreen`
- `PhotoViewerScreen`
- `PhotoAnnotationScreen`

If you want those mapped in the same detail level, I can add a second appendix for media/editor screens.

## Legacy And Duplicate Files

The repo also contains legacy or duplicate files that are not the best source of truth for current user-facing structure, including:

- `src/screens/legacy/LegacyDashboardScreen.tsx`
- `src/screens/legacy/LegacyTasksScreen.tsx`
- duplicate/numbered screen files such as `ProjectDetailScreen_EditModalOnly 2.tsx`

For current UI discussions, prefer the screens wired through `AppNavigator.tsx`.

## Fast Reference

If you want to describe a change precisely, use one of these patterns:

- "Change the header component on `ProfileScreen` (`StandardHeader`)."
- "Change the hero card on `ProjectsScreen` (`ProjectsOverviewHero`)."
- "Change the filter chips on `ProjectsScreen` (`ProjectsScreenFilterChips`)."
- "Change the list card UI on `TasksScreen` (`ContainerCard`)."
- "Change the activity/history area on `TaskDetailScreen` (`TaskActivityTimeline`)."
- "Change the footer submit bar on `CreateTaskScreen` (`PrimaryActionBar`)."
- "Change the project create/edit form (`ProjectForm`)."

## Recommended Next Step

If you want, I can produce a **screen-to-component index** next in one of two formats:

1. a very short cheat sheet with only `screen -> exact components`
2. a deeper editable-region matrix with `screen -> region -> source file -> change risk`
