# M-FND-04 UI Migration Wave Matrix

This document records the Wave 1 technical priority scoring for the current high-value screen topology.

## Scoring Formula

- Positive weighted score:
  - `User Traffic Weighting x 5`
  - `Workflow Criticality Weighting x 5`
  - `Component Reuse Factor x 4`
  - `Layout Instability Risk x 4`
  - `Navigation Coupling Risk x 4`
  - `Selector Compliance Readiness x 3`
- Risk penalty:
  - `Regression Blast Radius x 3`
- Final priority score:
  - `Positive weighted score - Risk penalty`

## Dimension Definitions

- `User Traffic Weighting`: Daily user visit frequency and operational centrality.
- `Workflow Criticality Weighting`: Importance to task execution, dashboard monitoring, and project movement.
- `Component Reuse Factor`: Likelihood that migrated primitives on the screen unlock reusable patterns elsewhere.
- `Layout Instability Risk`: Current exposure to loading shell collapse, refresh churn, or structural shifts.
- `Navigation Coupling Risk`: Sensitivity to rapid back-and-forth transitions and adjacent flow reuse.
- `Selector Compliance Readiness`: Ease of binding the screen to the selector/view-model boundaries established by `WS-FND / M-FND-02`.
- `Regression Blast Radius`: Penalty dimension measuring how disruptive an early migration failure would be.

## Wave 1 Screen Matrix

| Screen | Path | User Traffic x5 | Workflow Criticality x5 | Reuse x4 | Instability x4 | Navigation x4 | Selector Readiness x3 | Blast Radius x3 Penalty | Positive Score | Penalty | Final Score | Wave |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| TasksScreen | `/Volumes/KooDrive/Insite App/src/screens/TasksScreen.tsx` | 5 x 5 = 25 | 5 x 5 = 25 | 5 x 4 = 20 | 4 x 4 = 16 | 5 x 4 = 20 | 5 x 3 = 15 | 3 x 3 = 9 | 121 | 9 | 112 | Wave 1 |
| DashboardScreen | `/Volumes/KooDrive/Insite App/src/screens/DashboardScreen.tsx` | 5 x 5 = 25 | 5 x 5 = 25 | 5 x 4 = 20 | 4 x 4 = 16 | 5 x 4 = 20 | 4 x 3 = 12 | 3 x 3 = 9 | 118 | 9 | 109 | Wave 1 |
| TaskDetailScreen | `/Volumes/KooDrive/Insite App/src/screens/TaskDetailScreen.tsx` | 4 x 5 = 20 | 5 x 5 = 25 | 4 x 4 = 16 | 4 x 4 = 16 | 5 x 4 = 20 | 5 x 3 = 15 | 3 x 3 = 9 | 112 | 9 | 103 | Wave 1 |
| CreateTaskScreen | `/Volumes/KooDrive/Insite App/src/screens/CreateTaskScreen.tsx` | 4 x 5 = 20 | 5 x 5 = 25 | 4 x 4 = 16 | 5 x 4 = 20 | 4 x 4 = 16 | 3 x 3 = 9 | 5 x 3 = 15 | 106 | 15 | 91 | Wave 2 |
| ProjectsScreen | `/Volumes/KooDrive/Insite App/src/screens/ProjectsScreen.tsx` | 3 x 5 = 15 | 4 x 5 = 20 | 3 x 4 = 12 | 3 x 4 = 12 | 3 x 4 = 12 | 4 x 3 = 12 | 2 x 3 = 6 | 83 | 6 | 77 | Wave 2 |

## Wave 1 Justification

- `TasksScreen` ranks first because it combines the highest daily traffic, strongest primitive reuse potential, and the best selector-compliance readiness.
- `DashboardScreen` ranks second because it is the highest-visibility overview surface and exercises shared cards, summary rows, quick actions, and continuity-sensitive refresh behavior.
- `TaskDetailScreen` ranks third because it is tightly coupled to navigation transitions and detail-shell stability, making it essential to proving the hybrid migrated-to-legacy navigation bridge.
- `CreateTaskScreen` is intentionally deferred to Wave 2 because its high regression blast radius and dense interaction model would slow the primitive foundation phase.
- `ProjectsScreen` remains valuable but ranks lower because its reuse and traffic scores are lower than the Wave 1 foundation trio.

## Group B Header Follow-Up

- Current migrated screens fall into two temporary header groups:
  - fully custom modern headers such as `DashboardScreen` and `TasksScreen`
  - bridge-header migrated screens such as `TaskDetailScreen`, `UpdateProgressScreen`, and `CreateTaskScreen`
- The second group is transitional only. Their business logic and screen shells are already modernized, but they still rely on `StandardHeader` as a lower-risk migration bridge.
- A future migration milestone must complete the full header convergence for Group B by replacing `StandardHeader` usage with the shared custom modern header composition pattern.
- The temporary `Modern UI` marker must remain easy to remove during that follow-up and must not become the permanent indicator of migration status.
