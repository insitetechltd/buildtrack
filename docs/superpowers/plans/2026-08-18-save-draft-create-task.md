# Save Draft on Create Task

**Date:** 2026-08-18  
**Milestone:** WS-UX / headed MainTabs B (W-A05–A07). RC week.  
**Status:** Gate A complete. Critical/High folded. Builder waits for Metro idle + user GO.  
**Metro lock:** **No `src/` land while any Maestro client is attached to this packager** (not merely “don’t steal 17 Pro”). Fast Refresh hits every connected sim.

## Gate A

- Critique A (risks): [Plan critique A risks](d96176a6-ba83-4950-828d-96cd1eab2dac) — 2 Critical, 7 High. Builder: **NO** until folded (now folded below).
- Critique B (validation): [Plan critique B validation](64c7ac3f-7a80-4ae2-8677-c7c0348620a5) — 4 High proof gaps. False-green if we only re-run stock W-A05–A07.

## Product (locked)

- **Back / Cancel / leave Create Task = cancel.** No task row. No Activity draft. Wipe form scratch so there is no trace.
- **Save Draft = explicit persist.** Real task that Activity Drafts can list.
- Autosave-on-leave is **not** the product.

## Current runtime (inspected — critiques confirmed)

- `mappedDraftItems`: `assignedBy === me && status === in_progress && !deleted`.
- `createTask()` → `in_progress` only if creator ∈ `assignedTo`; default `assignedTo: []` → `new`.
- `updateTask` **throws** if `assignedTo` changes while status is `accepted` | `in_progress`.
- Team Queue / outbox WIP: `assignedBy === me && !assignedTo.includes(me)` — empty `assignedTo` **counts as team WIP**.
- Camera/Create success today navigates to **Tasks**, not Activity. Camera-root `goBack()` is often a no-op.
- Header Discard calls `clearDraftPayloads` but does **not** reliably clear `@createTask_formData`; tab leave does not run `handleCancel`. 1s persist debounce can rewrite after `removeItem`.

## Folded model (C1/C2/H6/M3) — default unless user overrides

Drafts are **creator-private unassigned WIP**, not sent work.

1. `asDraft` forces `assignedTo: []`, clear `primaryAssigneeId` / `delegatedUserIds`. **Reject assignees-as-is.**
2. Skip auto-accepted `status_change` for **all** `asDraft` rows (M2 closed).
3. **Assignee-lock exemption:** `updateTask` may change `assignedTo` when the row is a draft: `status === in_progress` AND `assignedTo.length === 0` AND `assignedBy === actor` (resume Create can finally assign). Real accepted/in_progress assigned work stays locked.
4. **Tighten** `mappedDraftItems` to those same rows (`assignedTo.length === 0`). Real assigned in_progress the user originated **leaves** Drafts (stops mixing untitled drafts with live WIP; W-A07 cannot swipe-delete assigned work).
5. **Exclude** those draft rows from Team Queue / outbox WIP / `IN_PROGRESS_SENT`.
6. Hide Save Draft on **Edit** and when `parentTaskId` is set (M4). Nested create must not mint a top-level draft.

## Scope

1. **Save Draft** (`create-task__save-draft`), create + `resumeAsCreate` only.
2. `saveDraft()` → `createTask(..., { asDraft: true })` or `updateTask` when resuming (same id).
3. `{ asDraft: true }` → `current_status: in_progress`, `assignedBy = current user`, assignees emptied. No new DB status.
4. Validation: `projectId` required; empty title → `"Untitled draft"`; description optional. Show on-screen error if project missing (M5).
5. Success: cancel persist timer + disable persist; clear `@createTask_formData` + camera scratch; pin created id; **`await fetchTasks(true)`**; then `parentNav.navigate("Activity", { screen: "DashboardMain" })`. **Not** `goBack()`, **not** create-success→Tasks, **no** success modal.
6. Leave/cancel: wipe on header Discard, `beforeRemove`, tab blur, hardware back. Cancel debounce so it cannot rewrite. Same keys as success wipe.
7. Photos: insert success **is** the draft. Upload failure keeps that id, surfaces photo error, retry upload/`updateTask` only — never a second `createTask`.
8. Double-submit: shared `isSubmitting` **plus ref guard**; after first insert, further Save Draft is update of that id even if `resumeAsCreate` was not in route params yet.
9. UI: **stacked full-width** Save Draft **above** Create, inside the ScrollView (≥44pt). Not side-by-side. Gate C: iPhone 16, title focused, keyboard up, Save Draft visible and tappable (scroll-to if needed).
10. i18n `en.ts` + `zh-TW.ts`.
11. Offline `createTask` fallback honors `asDraft` → `in_progress` (L2; not the headed path).

**Out of scope:** new `draft` column; Edit Task Save Draft; Wave 2; changing lock for already-assigned in_progress.

## Acceptance

- Leave without Save Draft: zero new tasks; `@createTask_formData` gone; next Create is empty.
- Save Draft with project: one unassigned `in_progress` task, `assignedBy` = me, title from field or `"Untitled draft"`.
- Activity: `dashboard-screen__drafts_toggle` appears (section stays **collapsed** by default — toggle visible is enough).
- Resume: opens same id; Save Draft / Create updates, no duplicate; Create may assign (exemption).
- Edit / subtask create: no Save Draft.
- Keyboard-open Save Draft works on iPhone 16.
- Team Queue counts do not increment for the unassigned draft.
- Double-tap / photo-fail retry: still one row.

## Files

- `useCreateTaskViewAdapter.ts` + tests
- `CreateTaskScreen.tsx` + integration tests
- `taskStore.supabase.ts` `createTask` options + `updateTask` draft exemption
- `useDashboardViewAdapter.ts` draft filter + queue exclusion (+ tests)
- `AppNavigator.tsx` / Create wrapper: Save Draft success → Activity
- `en.ts`, `zh-TW.ts`
- Maestro: **create-first** preamble (unique title) before W-A05; extend A06 (edit + Save Draft, one updated row); A07 delete + relaunch absent. iPhone 16 only.

## Validation plan (Critique B folded)

| Layer | What |
|---|---|
| L1 Jest | `asDraft` empties assignees, forces `in_progress` (remote + local fallback). Project required; untitled fallback. Resume → `updateTask` not create. Hidden on edit/`parentTaskId`. Cancel/leave clears storage and does not `createTask`. Failed save preserves form, does not navigate. Double-press → one create. Success → Activity, no modal. Queue adapter: unassigned draft excluded from team_queue. Drafts list includes unassigned only. Assignee lock: draft exemption allows assign; real in_progress still throws. |
| Gate C | Headed iPhone 16: focus title, keyboard open, Save Draft visible ≥44pt, tap saves. |
| L4 | **Must create a uniquely named draft first** (stock W-A05 `_boot-no-clear` is false-green on stale drafts). Then A05 show/hide, A06 resume+re-save title, A07 swipe-delete + relaunch. Only when **no** Maestro is on this Metro. |

## Critique A findings (folded)

| ID | Fold |
|---|---|
| C1 assignee lock vs resume | Draft exemption (empty `assignedTo` originator `in_progress`) until first real assign |
| C2 assignees-as-is | Rejected; force `assignedTo: []` |
| H1 nav | Always Activity `DashboardMain`, not `goBack` / Tasks |
| H2 fetch clobber | `await fetchTasks(true)` then navigate |
| H3/H4 leave + debounce | Wipe all leave paths; cancel persist timer |
| H5 photo fail | Keep id; retry upload only |
| H6 Team Queue leak | Exclude unassigned originator drafts from team/outbox |
| H7 keyboard | Stacked in-ScrollView + headed keyboard proof |
| M2 auto-accept | Skip for all asDraft |
| M4 nested create | Hide Save Draft |
| M6 Metro | No src land if any Maestro on this packager |
| M7 collapsed | Toggle visible is enough; do not auto-expand |

## Open (ask user — one product choice)

Tighten Drafts to **unassigned** originator `in_progress` (recommended; stops real assigned WIP living in Drafts / W-A07 deleting it). Alternative: keep today’s “all `in_progress` I created” list and only add Save Draft rows into that mix.
