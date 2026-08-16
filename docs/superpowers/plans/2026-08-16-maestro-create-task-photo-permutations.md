# Maestro — Create Task photo upload / draw permutations

> **Role:** Test Engineer deep-dive (2026-08-16)  
> **Milestone:** `WS-UX / M-UX-01 / S-UX-01Q` (upload UX) + Maestro L3  
> **AppId:** `com.buildtrack.app.local`  
> **UDID lock:** `B7B2640C-4738-4F8A-AEEE-5DF3D21D2533` (iPhone 17 Pro Max)

## Goal

Prove Create Task photo path (in-app library → Select Photos → form attachments → submit) across user-noticed failure modes: single upload, draw bake, add-more dedupe, and Create Task `+` re-open preselection.

## Existing coverage (gap)

| Flow | What it proves | Gap vs Create Task library |
|------|----------------|----------------------------|
| `task-core-live-photo-upload.yaml` | Worker **Update Progress** photo via **Apple PHPicker** (`pick-first-image.yaml`) | Does **not** exercise Create Task, in-app library, Draw, or attachment dedupe |
| `task-core-live-create.yaml` | Create Task title submit | No photos |

## Permutation matrix

| ID | Flow YAML | Steps | Primary asserts | Screenshots (min) |
|----|-----------|-------|-----------------|-------------------|
| P1 | `01-single-upload.yaml` | Library → 1 tile → confirm → submit | `photo-selection__tile_0`, `create-task__attachments_section`, submit success | 3 |
| P2 | `02-draw-then-upload.yaml` | 1 photo → Draw → swipe → Done → confirm → submit | `photo-selection__draw_overlay`, draw Done returns to tools | 3 |
| P3 | `03-add-second-from-selection.yaml` | 1 photo → Add more → reopen shows **1 selected** → pick 2nd → 2 tiles | `.*1 selected.*` then `tile_0`+`tile_1` | 3 |
| P4 | `04-reopen-plus-preserves-selection.yaml` | Confirm to form → `createTask-add-photos` → Library shows **1 selected** | `.*1 selected.*` after Create Task `+` | 3 |
| P5 | `05-two-from-first-picker.yaml` | Pick two in first library visit → confirm → submit | `.*2 selected.*`, `tile_1` | 2 |

Shared helpers under `maestro/flows/create-task-photo/`: `_open-library.yaml`, `_pick-first.yaml`, `_pick-second-keep-first.yaml`, `_submit-create-task.yaml`.

## Product finding fixed for P4

Create Task `Choose from Library` previously navigated **without** `existingPhotos`, so form `+` could not pre-highlight prior library assets (Select Photos → Add more already passed `existingPhotos`).  
**Fix (same slice):** pass `formData.attachments` (with `mediaLibraryAssetId`) into `InAppLibraryPicker` params.

## PLATFORM_LIMITATION / selector notes

1. **RN `Alert.alert`** (“Add Photos” / Choose from Library) — text match only (same as M-QA-03).  
2. **`expo-image-multiple-picker` tiles** — no RN `testID`; Maestro uses percent `point:` taps (`17%,26%` / `50%,26%`) on iPhone 17 Pro Max. Flaky on other devices → future P0 testID wrapper if suite flakes.  
3. **Draw gesture** — swipe approximates a stroke; bake success asserted by returning to non-draw toolbar (not pixel ink QA).  
4. **HEIC bake** — covered by Jest `bakePhotoDraw.test.ts` (JPEG normalize); Maestro uses `addMedia` PNG fixtures.

## Concurrent coaching rule — error poppers (mandatory)

When Maestro/sim shows a LogBox banner/popper (red badge count, truncated `Error fetching…`):

1. **Do not** dismiss-and-continue as the primary action.
2. **Open** the popper (tap banner / expand Console Error) and capture the full JSON (`code`, `message`).
3. **Troubleshoot** root cause before the next UI step.
4. Only dismiss after the underlying issue is fixed or explicitly deferred with a written finding.

Example ingested 2026-08-16: `Error fetching tasks: {"code":"42501","message":"permission denied for table tasks"}` (+ users/projects).

### Iron-clad boot (login → landing) — stabilized 2026-08-16

Prior working YAML contract = `bootstrap-live-manager-a` (`clearState` + `john.managera@test.com`). Instability came from:

1. Sprint7 **auto-bootstrap inventing Tristan** when no authenticated user (AuthStore “logged in” without JWT → anon 42501).
2. Domain fetches / DataSync running **before** Supabase session attach.
3. `databaseConfigStore` replacing the global client mid-boot.

Hardening (login→landing unchanged product-wise):

- Sprint7 auto-bootstrap only **resumes** Tristan/Herman; never invents for empty/live sessions.
- `getSessionScopedSupabase()` gates `fetchUsers` / `fetchProjects` / `fetchTasks` / DataSync.
- Production env bind reuses existing EXPO_PUBLIC client (session preserved).
- Concurrent Step 0: `maestro/flows/create-task-photo/_concurrent-step0-stable-boot.yaml` (PASS smoke: no Console Error on landing).

## Preflight (mandatory before suite)

```
[ ] G1 LogBox family (red+gray) ignored in index.ts — OK
[ ] G2 Unique landing: create-task__continuous_form / in-app-library__screen / photo-selection__confirm / dashboard-screen__root
[ ] G3 Bottom-tab / FAB taps — no pressKey back
[ ] G5 Flag order: run-local.sh … test <flow>
[ ] G8 Read PNGs after each rc=0 (ct-photo-*)
[ ] MAESTRO_DRIVER_STARTUP_TIMEOUT=120000
[ ] Metro :8081 /status 200
[ ] Dev client installed; sim UDID locked
```

## Run

```bash
export MAESTRO_DRIVER_STARTUP_TIMEOUT=120000
export MAESTRO_0CLICK_DISABLE=1
bash scripts/maestro/run-create-task-photo-suite.sh
# or single:
bash scripts/maestro/run-local.sh --udid B7B2640C-4738-4F8A-AEEE-5DF3D21D2533 \
  test maestro/flows/create-task-photo/01-single-upload.yaml
```

## Pass criteria

- Suite exit 0 with stop-on-fail  
- Each permutation ≥ listed screenshot count; human reads PNGs before accepting rc=0  
- P3/P4: header text shows preselection count (not blank “Library” with zero highlighted)

## Run evidence (2026-08-16)

- Suite authored + Create Task `existingPhotos` fix landed in working tree.
- P1 dry-run attempt: **blocked** — `openLink exp+buildtrack://…` failed with `NSOSStatusErrorDomain -10814` (simulator could not open Expo dev-client deep link). Re-run after confirming `xcrun simctl openurl` works for the installed `com.buildtrack.app.local` build.
- Do **not** treat suite as green until PNGs are visually reviewed (Gate 8).
