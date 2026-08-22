# M-OPS-02 kickoff — core-loop tightness

**Milestone:** `WS-OPS / M-OPS-02` (ROADMAP 15.06)  
**Status:** Active (2026-08-22 — technical default over business override)  
**Pick-up:** `documentation/NOW.md`  
**Sequence SoT:** `2026-08-22-session-consolidation.md`, `2026-08-19-post-rc-boring-loop.md`, `2026-08-19-roadmap-clarification.md`

---

## Goal

Shrink hot files and **enforce the intended status machine at create/update** so illegal states (unassigned open/WIP, UI stars that lie) are prevented at source — not only surfaced in Owner Console Workflow Gaps.

## Non-goals (this milestone)

- Billing / entitlements (`M-BILL-01`) — **after OPS-02 MVP**
- Owner KPI v2, SQL gap twin
- Save Draft as unassigned WIP
- Workflow Gaps on Activity/Admin surfaces
- Broad file splits without behavioral tests

---

## Intended create rules (locked)

| Rule | Behavior |
|---|---|
| Required fields | `projectId`, `assignedBy`, non-empty `title` |
| Assignees | **≥1 assignee** for all creates |
| Self-assigned | Creator in `assignedTo` → initial status **`in_progress`** |
| Delegated | Creator not in assignees → initial status **`new`** |
| UI honesty | Assign To star matches validation (no submit without assignee) |
| WIP guard | No unassigned `in_progress` (blocked by assignee rule at create) |

Gap classifier SoT: `src/utils/taskWorkflowGaps.ts` — OPS-02 should reduce `GAP_UNASSIGNED_OPEN`, `GAP_UNASSIGNED_WIP`, `GAP_SELF_NEW` at source.

---

## Phased delivery

| Phase | Scope | Surfaces | Est. |
|---|---|---|---|
| **OPS02-A** | Create-path validation (store + CreateTask UI) | `taskCreateValidation.ts`, `taskStore.supabase.ts` `createTask` / `createSubTask`, `useCreateTaskViewAdapter` | 0.5–1d |
| **OPS02-B** | Update-path guards (status transitions, assignee clears) | `updateTask`, edit form | 1–2d |
| **OPS02-B+** | Legacy unassigned WIP reconcile on dashboard | `reconcileUnrecoverableWipTasks.ts`, dashboard adapter | ✅ Done |
| **OPS02-B+** | Local create drafts (7d TTL, AsyncStorage) | `localTaskDraftStore.ts`, CreateTask adapter | ✅ Done |
| **OPS02-C** | Hot-file shrink (extract helpers from taskStore / CreateTask / AppNavigator) | Same domains, no behavior change | 3–5d |
| **OPS02-D** | Regression + optional Maestro create case | Jest + `P##` if needed | 0.5d |

**Active:** OPS02-C → OPS02-D (close milestone).

---

## OPS02-A acceptance

- [x] `assertValidTaskCreateInput` rejects missing title/project/originator/assignees
- [x] `createTask` and `createSubTask` call validation before insert (local + Supabase paths)
- [x] CreateTask `validateForm` requires ≥1 assignee on create (not edit-only deferral)
- [x] Jest: `taskCreateValidation.test.ts` PASS
- [x] Existing `taskWorkflowGaps.test.ts` unchanged / PASS

---

## OPS02-B acceptance

- [x] `assertValidTaskUpdate` rejects empty assignees on non-terminal statuses
- [x] `assertValidTaskUpdate` rejects self-assigned `new` (GAP_SELF_NEW at source)
- [x] Non-structural updates skip validation (legacy garbage can still get narrative edits)
- [x] `updateTask` + `updateSubTask` call validation before write
- [x] Edit CreateTask form requires assignees on non-terminal tasks
- [x] Jest: `taskUpdateValidation.test.ts` + store unit test PASS
- [x] `npm run test:tasks` **38/38 PASS** (2026-08-22)
- [x] Legacy WIP reconcile + local drafts (parallel chat)

---

## OPS02-C acceptance (exit gate for MVP)

- [ ] Focused extracts from taskStore / CreateTask / AppNavigator (line count ↓, behavior unchanged)
- [ ] All OPS02-A/B tests still PASS

---

## OPS02-D acceptance (close M-OPS-02)

- [ ] `npm run test:tasks` green (baseline)
- [ ] Targeted regression per TESTING_STRATEGY or agreed subset
- [ ] ROADMAP M-OPS-02 marked Closed; NOW → M-BILL-01 BILL-A

---

## Validation plan

| Layer | Command |
|---|---|
| L1 unit | `npm test -- --testPathPattern=taskCreateValidation` |
| L1 gaps | `npm test -- --testPathPattern=taskWorkflowGaps` |
| L1 workflow | `npm run test:tasks` (if green baseline) |
| Typecheck | `npx tsc --noEmit` |

Maestro create flow: defer to OPS02-D unless user-visible regression found.

---

## Files (expected touch)

- `src/utils/taskCreateValidation.ts` (new)
- `src/utils/__tests__/taskCreateValidation.test.ts` (new)
- `src/state/taskStore.supabase.ts` — `createTask`, `createSubTask`
- `src/ui/viewAdapters/useCreateTaskViewAdapter.ts` — `validateForm`
- Docs: session consolidation, NOW, ROADMAP

---

## After OPS-02 MVP

```
M-OPS-02 → M-BILL-01 (infra BILL-A–E) → M-BILL-F (gates) → M-AUTHZ-02 → M-AI-01 → Wave 2
```

Billing ERD/webhook may **idle-parallel** during OPS02-C file shrink only (disjoint paths); **no live billing schema** until OPS02-A/B land.

---

Updated: 2026-08-22
