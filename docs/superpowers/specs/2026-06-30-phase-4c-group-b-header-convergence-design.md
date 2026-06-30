# Phase 4C Group B Header Convergence Design

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this design through an approved implementation plan. Do not start code changes directly from this document.

**Goal:** Replace the Group B “bridge header” usage (`StandardHeader`) with a shared modern header component across `TaskDetailScreen`, `UpdateProgressScreen`, and `CreateTaskScreen`, while preserving existing navigation behavior and header footprint.

**Architecture:** Introduce a reusable screen-level header component that mirrors the modern header composition style used by Group A screens (Dashboard/Tasks/PhotoSelection) while retaining the behavioral affordances currently provided by `StandardHeader` (safe-area handling, optional back button, optional profile menu entry points, and `rightElement` support for the temporary `ModernUiMarker`). Migrate Group B screens to the new header with test-first regression freezing, then remove `StandardHeader` usage from those screens.

**Tech Stack:** Expo-managed React Native, TypeScript, React Navigation, Zustand, NativeWind, Jest, `@testing-library/react-native`.

---

## Context

Group B (“modernized body with bridge header”) is explicitly called out as a follow-up milestone in:

- [2026-06-20-modern-ui-marker-and-screen-batch-design.md](file:///Volumes/KooDrive/Insite%20App/docs/superpowers/specs/2026-06-20-modern-ui-marker-and-screen-batch-design.md)
- [ui-migration-foundations-wave1-matrix.md](file:///Volumes/KooDrive/Insite%20App/documentation/ui-migration-foundations-wave1-matrix.md#L47-L54)
- [2026-06-28-post-sprint7-master-roadmap.md](file:///Volumes/KooDrive/Insite%20App/docs/superpowers/plans/2026-06-28-post-sprint7-master-roadmap.md#L219-L257)

Current Group B screens and their bridge header usage:

- `TaskDetailScreen` uses `StandardHeader` with `rightElement={<ModernUiMarker />}`
- `UpdateProgressScreen` uses `StandardHeader` with `rightElement={<ModernUiMarker />}`
- `CreateTaskScreen` uses `StandardHeader` in multiple render paths (create/edit and embedded action-mode sections), also with `rightElement={<ModernUiMarker />}`

Navigator headers remain disabled (`headerShown: false`) and must remain so for this slice to avoid double-header regressions.

## Problem Statement

Group B screens are partially modernized but still depend on `StandardHeader` for the screen header region. This creates:

- a visible inconsistency between Group A modern headers and Group B bridge headers
- duplicated “temporary marker” wiring across screens (`rightElement={<ModernUiMarker />}`)
- friction for further modernization because header behavior and layout are coupled to `StandardHeader` internals

The desired milestone is to converge Group B onto a shared modern header composition pattern while keeping the migration marker removable later.

## Objectives

### Primary Objectives

- Introduce a shared modern screen header component to replace `StandardHeader` in Group B.
- Preserve existing header footprint (safe-area and height) during transitions.
- Preserve existing navigation and action behaviors:
  - back button behavior on screens that currently show it
  - profile/avatar interaction behavior where currently supported
  - `onNavigateToProfile` / `onNavigateToProjectPicker` behavior where currently supported
  - `rightElement` behavior for `ModernUiMarker`
- Freeze behavior with focused regression coverage before any refactor.
- Checkpoint commit only after the full Phase 4C gate is green.

### Non-Objectives

- Do not re-enable navigator-native headers.
- Do not remove or hardcode `ModernUiMarker` inside the new header; it must remain an optional injected element.
- Do not redesign screen bodies, view adapters, or store logic for these screens.
- Do not migrate additional `StandardHeader` consumers outside Group B in this slice.

## Proposed Component

### New Component: `ModernScreenHeader`

**Location (proposed):**

- `src/components/ModernScreenHeader.tsx`

**Design intent:**

- visually align with Group A modern headers (simple modern title row + right-side action cluster)
- preserve Group B behavioral affordances from `StandardHeader`
- keep footprint stability by matching existing safe-area/top padding behavior

**API (design-level):**

- `title: string`
- `subtitle?: string`
- `showBackButton?: boolean`
- `onBackPress?: () => void`
- `rightElement?: React.ReactNode`
  - used for `ModernUiMarker` during the migration period
- `onProfilePress?: () => void`
- `onNavigateToProfile?: () => void`
- `onNavigateToProjectPicker?: (allowBack?: boolean) => void`
- `className?: string`

The intent is to keep the prop surface close to `StandardHeader` so callsites can migrate without semantic drift.

### Behavioral Rules

- Back button renders only when `showBackButton` is true, matching current `StandardHeader` behavior.
- Profile/avatar press remains available when user is present, matching the current pattern.
- `rightElement` remains a slot and must not be mandatory.
- Safe-area/top padding rules should preserve current footprint rather than introduce new spacing.

## Migration Plan (Design-Level)

### Target Screens

- `src/screens/TaskDetailScreen.tsx`
- `src/screens/UpdateProgressScreen.tsx`
- `src/screens/CreateTaskScreen.tsx`
  - includes the embedded action-mode header render blocks that currently use `StandardHeader`

### Steps

1. **Regression Freeze (Test-First)**
   - Add/expand focused regression coverage that locks down:
     - header title rendering for both loading and main paths
     - back-button presence/absence per path
     - `rightElement` rendering and placement (marker presence)
     - navigation callbacks (back, profile, project picker) are delegated correctly
   - Tests should confirm the existing behavior before migrating the header component.

2. **Introduce `ModernScreenHeader`**
   - Implement the new header component without changing screen behaviors.
   - Ensure the component keeps the footprint stable.

3. **Migrate Group B Screens**
   - Replace `StandardHeader` usage with `ModernScreenHeader` in the three screens.
   - Keep `rightElement={<ModernUiMarker />}` in place in each screen for now.

4. **Verification Gate**
   - Run the focused suites for the three screens plus `tsc --noEmit`.
   - If any navigation or header behavior drifts, fix it before checkpointing.

5. **Checkpoint Commit**
   - Commit only the Phase 4C files and tests after the gate is green.

## Testing Strategy

### Required Coverage

- Screen integration tests for:
  - `TaskDetailScreen`
  - `UpdateProgressScreen`
  - `CreateTaskScreen`

Focus on header behavior rather than deep task/project store semantics.

### Minimum Verification Gate

- `PATH=/opt/homebrew/bin:$PATH ./node_modules/.bin/jest <TaskDetail suite> --runInBand`
- `PATH=/opt/homebrew/bin:$PATH ./node_modules/.bin/jest <UpdateProgress suite> --runInBand`
- `PATH=/opt/homebrew/bin:$PATH ./node_modules/.bin/jest <CreateTask suite> --runInBand`
- `PATH=/opt/homebrew/bin:$PATH ./node_modules/.bin/tsc --noEmit`

## Risks

- Footprint drift if safe-area padding differs from `StandardHeader` behavior.
- Regression risk in screens that have multiple header render paths (notably `CreateTaskScreen` action-mode blocks).
- Navigation param compatibility risk if any screen wrapper expectations change (must not happen in this slice).

## Definition Of Done

Phase 4C is complete when:

- Group B screens no longer import/use `StandardHeader`.
- `ModernScreenHeader` is the shared header component for those screens.
- The focused regression freeze suite is green.
- The verification gate is green (`jest` targeted + `tsc --noEmit`).
- A single checkpoint commit exists for the closed slice.

## Follow-On

After Phase 4C closes, a separate milestone can remove `ModernUiMarker` across migrated screens, since it remains a slot and not a baked-in header dependency.

