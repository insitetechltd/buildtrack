# Bug Inventory

This document is the canonical live bug tracker for the repository.

Use it to track open defects, bugs currently in progress, locally fixed issues that still need verification, and deferred items that should not be lost between sessions.

If a bug needs a deeper one-off writeup after resolution, store that writeup under `documentation/history/incidents/` and link it from this inventory.

## Status Rules

- `Open`: confirmed and not yet being fixed
- `In Progress`: actively being investigated or implemented
- `Fixed Locally`: code or docs changes exist locally but are not yet fully verified in QA
- `Verified`: fix is validated and no immediate follow-up is required
- `Deferred`: acknowledged but intentionally postponed

## Inventory

| Bug ID | Title | Status | Severity | Area | Screen/Flow | Summary | Source | Owner | Links |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| BUG-001 | Create Task back control uses text instead of arrow icon | Fixed Locally | Medium | Navigation UI | `CreateTaskScreen` header | The create-task header rendered a literal `Back` label instead of the shared arrow-style back control used by other screens. | User report on 2026-07-01 | Agent | [ModernScreenHeader.tsx](file:///Volumes/KooDrive/Insite%20App/src/components/ModernScreenHeader.tsx) |
| BUG-002 | Create Task form clears after photo upload | Fixed Locally | High | Form state | `CreateTaskScreen` attachment flow | Returning from `Tap to add files` could re-enter the create-task route with a stale one-time reset flag, clearing previously entered form data. | User report on 2026-07-01 | Agent | [AppNavigator.tsx](file:///Volumes/KooDrive/Insite%20App/src/navigation/AppNavigator.tsx), [createTaskRouteParams.ts](file:///Volumes/KooDrive/Insite%20App/src/navigation/createTaskRouteParams.ts) |

## Entry Template

Use this template for new bugs:

```md
| BUG-XXX | Short bug title | Open | Low/Medium/High/Critical | Area | Screen or flow | One-sentence summary of actual behavior and expected behavior | Source and date | Owner | Relevant code/docs links |
```
