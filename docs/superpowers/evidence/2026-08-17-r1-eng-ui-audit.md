# R1 — engineering UI strip audit (2026-08-17)

Release builds must not expose Sprint7 sandbox, Dev Admin, or Developer Settings to customers.

## Findings

| Surface | Release behavior | Mechanism |
|---------|------------------|-----------|
| Developer Settings menu | Hidden | `showDeveloperSettingsShortcut: __DEV__` in dashboard/tasks adapters; Profile passes nav only when `__DEV__` |
| Dev Admin entry | Hidden | `onNavigateToDevAdmin` only when `__DEV__` in AdminDashboard |
| Sprint7 deep links | No-op in release | `applySprint7AutomationLink` returns early when `!__DEV__` |
| LogBox / debug logs | Off | `index.ts` gated to `__DEV__` |
| Sprint7 sandbox auto-init | Off | `autoBootstrapSprint7SandboxForMaestroIfNeeded` in `__DEV__` only |

## Residual risk (Low)

- `DeveloperSettings` and `DevAdmin` routes remain registered in navigators (no deep-link prod path found; Sprint7 automation blocked in release).
- Maestro `sprint7-*` flows remain in repo for QA — not shipped to customers.

## Status

**PASS** for R1 release-path audit. No code changes required this cycle.
