# WS-UIA — UI Architecture Improvement Backlog

## Purpose

Capture the earlier UI architecture recommendations as an explicit P0–P2 backlog so they can be scheduled through the canonical roadmap instead of remaining as analysis-only guidance.

## Priority Bands

### P0 — Contract Safety And Navigation Typing

Focus on correctness and migration safety:

- replace `any`-typed route wrappers and params in `src/navigation/AppNavigator.tsx`
- type navigation param lists end-to-end for the migrated screen surface
- standardize view-adapter output shape where drift exists so screens conform to consistent contracts
- reduce contract ambiguity that can hide regressions during further screen work

### P1 — Portability And Boundary Cleanup

Focus on maintainability and environment portability:

- remove or replace absolute-path assumptions in `src/ui/contracts/screenScoring.ts`
- tighten migration-boundary utilities so they do not depend on machine-specific workspace paths
- align supporting docs and contracts with repository-portable assumptions

### P2 — Performance Hotspot Reduction

Focus on user-visible list and render efficiency:

- convert large `ScrollView + map` patterns to `FlatList` where appropriate, especially in task/project-heavy views
- memoize expensive derived data in high-churn screens
- remove per-row `O(n)` lookup patterns such as repeated status/read-state scans in task cards
- preserve current behavior while reducing layout and render pressure

## Proposed Milestones

### M-UIA-01 — P0 Contract Safety & Navigation Hardening

- primary focus: param typing, wrapper cleanup, adapter contract consistency

### M-UIA-02 — P1 Portability & Boundary Cleanup

- primary focus: absolute-path removal and migration utility portability

### M-UIA-03 — P2 Render Performance Hotspots

- primary focus: list virtualization, memoization, and repeated-lookup cleanup

## Dependencies

- `WS-UI / M-UI-07` closed so the current migration baseline is stable
- `WS-DATA / M-DATA-02` closed so UI work builds on the unified data model

## Validation

- targeted integration tests for touched screens
- `npx tsc --noEmit`
- focused manual smoke checks for screens with navigation or rendering changes

## Notes

- This backlog is intentionally incremental.
- P0 should land before broader UI automation coverage because typed navigation and stable contracts reduce automation churn and false negatives.
