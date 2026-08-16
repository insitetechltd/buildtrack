# UI/UX Consistency Audit (2026-08-14)

**Status:** Findings + P0 cleanup slice `S-UX-01Q`  
**Scope decision:** Option 1 — P0 field flows (Dashboard, Tasks, Task Detail, Create Task, Photo selection, Project picker) + shared header/sticky-footer infrastructure.  
**CTA rule:** Teal = shell/header only (`#08576E` / `#E7F4F8`). Primary actions stay `bg-blue-600` (destructive = red). Accidental indigo → blue.

## Verdict

Hybrid stack: teal redesign shell on Activity/Tasks/Create vs Tailwind gray + blue CTAs on most forms. Primitives under `src/components/primitives/` and `src/components/ui/` are thinly adopted. Almost no `StyleSheet.create` — drift is inline NativeWind one-offs.

Canonical docs:

- [`documentation/UI_ARCHITECTURE.md`](../../../documentation/UI_ARCHITECTURE.md) — ownership
- [`docs/INSITE_UI_UX_SOURCE_OF_TRUTH.md`](../../INSITE_UI_UX_SOURCE_OF_TRUTH.md) — IA / interaction SoT (not a token system)

## High

| ID | Finding | Evidence |
| --- | --- | --- |
| H1 | Dual brand: teal shell vs blue CTAs | `AppScreenHeader` vs widespread `bg-blue-600` |
| H2 | Three headers, two ProjectPicker routes | `ModernScreenHeader` Activity-nested vs `StandardHeader` parent navigate |
| H3 | Three task-row models → **resolved C4** | Was `ActivityStyleRowCard` / `TaskCard` / CompactTaskCard; now ActivityStyleRowCard only (legacy + TaskCard deleted) |
| H4 | Page background split | `#E7F4F8` / slate-50 vs gray-50 vs white auth |
| H5 | Sticky footers + nested bottom SafeArea | Update/Reassign/Reject/AddComment; `PrimaryActionBar` unused |

## Medium

| ID | Finding |
| --- | --- |
| M1 | Form label dialects (CreateTask InputField vs uppercase micro-labels vs Login font-medium vs Update text-xl) |
| M2 | Padding tokens mix `px-4` (redesign) vs `px-6` (legacy forms) |
| M3 | PhotoSelection custom white header + KAV×2 + double top inset |
| M4 | CreateTask dual label systems + embedded TaskActionScreen parallel layout |
| M5 | Status/chip color sets diverge (primitive tokens vs Tasks hex vs photo viewer) |
| M6 | Login still brands “Taskr” |

## Low

| ID | Finding |
| --- | --- |
| L1 | Finder orphans (`* 2` / `* 3` / EditModalOnly / ModalHandle 2) |
| L2 | `LogoutFAB` stub returns null |
| L3 | No brand colors in `tailwind.config.js` |
| L4 | Dark mode mostly legacy-only |

## Nested layout hotspots (P0)

- **Dashboard / Tasks:** redundant `View.flex-1`; bg clash; tab clearance tokens differ
- **TaskDetail:** double scroll shell (`flex-1` + `scroll_region`)
- **CreateTask:** redundant header chrome `View`; many modal SafeAreas
- **PhotoSelection:** KAV-in-KAV; double top inset
- **Action screens:** parent bottom SafeArea + nested bar SafeArea
- **ProjectPicker:** lean (good); header path via Standard

## P0 cleanup this cycle (S-UX-01Q Phase B)

1. Delete Finder orphans
2. Unify Modern/Standard → one wrapper; single ProjectPicker path (Activity nested)
3. Wire `PrimaryActionBar` with inset-once SafeArea contract on Update/Reassign/Reject/AddComment
4. Flatten P0 shells (Dashboard/Tasks/TaskDetail/CreateTask/PhotoSelection/ProjectPicker)

## Deferred (Phase C / option 2+)

- Projects / ProjectDetail / Profile / auth / admin visual pass
- TextField adoption across CreateTask / Login / EditProject
- Retire CreateTask `TaskActionScreen` → standalone screens
- Collapse task-row models onto `ActivityStyleRowCard`
- Brand tokens in Tailwind; Login rename Taskr → Insite
- `S-UX-01P` catalogue typeahead
