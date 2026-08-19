# S-UX-01R — Retire Add Comment dead path (post-RC)

**Status:** Pipeline — post-RC idle-parallel (does not block RC)  
**Prereq:** First commercial RC shipped  
**Ledger:** W-D05 **Exempt** — field narrative → Update Progress → **Update Description** (`W-D03`, `W-C07`)

## Problem

July 2026 redesign converged `Add Photos` + `Add Comment` into one update composer, then photo-centric IA **removed both chips** from Task Detail. Field workers add narrative via **Update Description** on Update Progress (center camera tab).

Dead code remains:

| Layer | Still in repo | Reachable from UI? |
|-------|---------------|-------------------|
| `AddCommentScreen` + `useAddCommentViewAdapter` | Yes | No — no nav entry |
| `add_comment` action in `useTaskDetailViewAdapter` | Yes | Filtered out in `TaskDetailScreen.tsx` |
| `taskActionRouting` `actionType: "comment"` → AddComment | Yes | No button triggers it |
| `addAssignerComment` + `assigner_comment` activity type | Yes | Only via dead AddComment screen |
| CreateTask `actionType="comment"` (shared composer) | Tests skipped | Legacy |

**Replacement UX:** `update-progress__description` → `progress_update` in work thread.

Evidence: `docs/superpowers/evidence/2026-08-19-w-d05-gap-no-comment-chip.png`  
Design arc: `docs/superpowers/specs/2026-07-03-insite-app-redesign-design.md` (shared composer); photo-centric retirement per `TaskDetailAcceptanceUI.test.tsx` (“does not render Add Photos or Add Comment”).

## Scope (Phase A — safe delete)

1. **Route `comment` → UpdateProgress** in `taskActionRouting.ts` (same as `photos` / `update`).
2. **Remove** `AddComment` stack routes + wrappers from `AppNavigator.tsx`.
3. **Remove** `AddCommentScreen.tsx`, `useAddCommentViewAdapter.ts`, AddComment contracts in `viewAdapters.ts`.
4. **Remove** `add_comment` from `useTaskDetailViewAdapter` action emission + `TaskDetailScreen` handler/filter/priority map.
5. **Delete** `AddCommentScreen.test.tsx`; remove skipped CreateTask comment-mode tests or repoint to UpdateProgress.
6. **Maestro:** keep `W-D05-add-comment.yaml` as **Exempt evidence only** (or delete flow + keep PNG in evidence).
7. **Docs:** MAINTABS W-D05 stays **Exempt**; remove Add Comment from stale audit rows when touched.

## Out of scope (Phase B — product decision)

- **`assigner_comment` DB rows** — keep read/display in work thread until migration decision.
- **`addAssignerComment` store method** — delete only if product confirms no assigner-only narrative path.
- **Schema drop** of `assigner_comment` activity type — not in this slice.

## Acceptance

- [ ] No `AddComment` route or screen in app bundle
- [ ] No `task-detail__quick-action-add_comment` in product (already true; test stays green)
- [ ] `actionType: "comment"` resolves to UpdateProgress if any deep link remains
- [ ] `npx tsc --noEmit` rc=0
- [ ] `npm run test:regression` PASS (or targeted task-detail + nav + integration suites)
- [ ] MAINTABS W-D05 remains **Exempt**; sequential ledger unchanged

## Suggested pairing

Idle-parallel with **M-OPS-02** (touches `AppNavigator`) or after **M-OPS-01** if owner console needs stable nav first.

## Kickoff prompt

```text
Read ROADMAP S-UX-01R + docs/superpowers/plans/2026-08-19-s-ux-01r-retire-add-comment-dead-path.md.
Post-RC only. Phase A: route comment→UpdateProgress, delete AddComment screen/nav, strip add_comment adapter wiring. Keep assigner_comment read path. tsc + regression before close.
```
