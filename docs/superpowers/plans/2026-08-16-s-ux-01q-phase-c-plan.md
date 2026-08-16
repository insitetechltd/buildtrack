# S-UX-01Q Phase C — Planning Only (2026-08-16)

**Status:** Phase C tracks **C1–C4** delivered; **C5 Closed (2026-08-17)** — no rename needed (Insite=company, Taskr=app). C6 parked as S-UX-01P.  
**Source:** `docs/superpowers/analysis/2026-08-14-ui-ux-consistency-audit.md` § Deferred (Phase C / option 2+)  
**Prerequisite closed:** S-UX-01Q P0 + upload Phase 1+2 Draw; S-UX-01Q2 IMGLY uninstall.

## C1 delivered

Shell contract applied to Projects / ProjectDetail / CreateProject / Profile (+ pending modals soft bg) / PendingUsers / AdminDashboard / DevAdmin / UserManagement / Login / Register:

- `ModernScreenHeader` + `BrandHeaderTitle`
- Page bg `#E7F4F8`, StatusBar `light` on chrome screens (auth keeps `dark`)
- Header chrome `className="border-b-0 bg-[#08576E] pb-2"`
- Header action pills use `#0D6E87` (primary form CTAs stay blue)

## C4 delivered (2026-08-16)

Row model + legacy dual-path removal (user GO: modern-only):

- `DashboardRoute` / `TasksRoute` always modern (`uiModeRoutes.tsx`); removed `LegacyDashboardScreen` / `LegacyTasksScreen`
- Deleted `TaskCard`, orphan `ProjectsTasksScreen` (+ CompactTaskCard), `devToggleStore` + Developer Settings uiMode toggle/contract
- Sole task/activity row SoT: `ActivityStyleRowCard` (Tasks + Dashboard)
- Maestro `tasks-screen__row_*` unchanged on modern TasksScreen

## Visual-driven row recipes (path B, 2026-08-16)

User GO: path **B** now; full photo-centric IA (**C**) **post-release**.

- `ActivityStyleRowCard` variants: `critical` | `activity` | `task` (+ `mediaSize` md/lg, accent bar, teal photo placeholder)
- Activity **Critical Tasks** restyled onto `variant="critical"` (This week marker + due chip + task photo)
- Recent Activity `variant="activity"` — leads with change line; task title secondary; accent bar
- Tasks list `variant="task"` — summary + larger thumb + overdue pill



## C2 delivered (2026-08-16)

TextField adoption on primary text fields (shared `buildFormTextFieldContract` + TextField passthrough props):

- Login email/password (legacy input testIDs preserved)
- ProjectForm + EditProjectModal text fields
- CreateTask title / description / taskReference
- Pickers / chips / tags add-row left as-is

## C3 delivered (2026-08-16)

Retired CreateTask embedded `TaskActionScreen`:

- TaskDetail update/photos/comment/reassign → `UpdateProgress` / `AddComment` / `ReassignTask`
- Tasks swipe update + camera-from-TaskDetail → `UpdateProgress` on active tab
- PhotoSelection no longer returns to CreateTask TaskAction shortcut
- CreateTask remains create/edit only

## Goal

Finish remaining UI consistency / nested-layout hygiene that was explicitly deferred after P0 flatten and upload UX. Phase C is a **bounded visual/architecture cleanup**, not a new feature stream.

## In scope (from audit)

| Track | Work | Notes |
|-------|------|--------|
| C1 Screens visual pass | Projects / ProjectDetail / Profile / auth / admin | **Done** |
| C2 Form controls | TextField adoption on CreateTask / Login / EditProject | **Done** |
| C3 CreateTask actions | Retire CreateTask `TaskActionScreen` → standalone screens | **Done** |
| C4 Task rows | Collapse task-row models onto `ActivityStyleRowCard` | **Done** (+ legacy screens removed) |
| C5 Brand | Taskr→Insite rename (audit M6) | **Closed (2026-08-17)** — not needed; see § C5 Closed |
| C6 Typeahead | `S-UX-01P` catalogue typeahead | **Separate slice**; product behavior choices may need GO |

## C5 Closed (2026-08-17)

**Decision:** Close C5 with **no code**. Product SoT:

- **Insite** = company name  
- **Taskr** = app name (Login, headers, `app.json` name/scheme stay Taskr/`taskr`)

Audit M6 (“Login still brands Taskr”) is **not a defect** under this SoT. The planned Taskr→Insite rename is **rejected**.

### Tabled for later (not Phase C / not release-week)

| ID | Optional item | When to reconsider |
|----|---------------|--------------------|
| C5-opt-A | Company attribution line (e.g. “by Insite” on Login/About) | Post-release marketing / About screen pass |
| C5-opt-B | Tailwind brand color token aliases for existing teal/shell hex | Design-system hygiene only; no user-facing change |

## Explicitly out of scope (still need product GO)

- Option B gallery (vs Option A in-app library — already shipped)
- Phase 3 photo caption
- Any schema / RLS / release version bumps

## Suggested delivery order (remaining)

1. **C6** park as `S-UX-01P` (not Phase C execute)
2. Return to commercial release-week (R1 eng UI strip first)

## Brand SoT (locked 2026-08-17)

- **Insite** = company  
- **Taskr** = app product name  
- C5 **Closed** — no rename; optional C5-opt-A/B tabled only

## Next kickoff prompt

```text
S-UX-01Q Phase C closed (C1–C4 delivered; C5 closed no-op; C6=01P parked).
Resume commercial release-week R1 (strip eng UI). U01-U12 when instructed.
```
