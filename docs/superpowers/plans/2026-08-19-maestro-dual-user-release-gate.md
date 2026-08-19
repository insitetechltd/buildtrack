# Dual-user Maestro — RC release gate (plan)

**Date:** 2026-08-19  
**Status:** Plan — wait for GO before YAML/runner  
**Milestone:** Commercial RC field loop (not Wave 2; not a new ROADMAP ID)  
**Why:** Every existing Maestro case is **one logged-in actor**. The product loop is **two people**: assigner creates → assignee accept/decline/update/submit → assigner review. Single-sim actor-switch (QA01 Sprint7) and API-seeded W-D* do **not** prove that.

**Model:** fully automated conductor — zero manual input. Maestro executes phased flows on two sims; the runner generates titles, boots both actors, retries sync, and enforces screenshot counts. Human PNG review is optional post-hoc, not required to run the gate.

---

## What this is / is not

| In scope | Out of scope |
|---|---|
| Live Supabase, **John + Alice**, shared **Project A** | Sprint7 Herman/Tristan actor switch |
| Two **distinct** UDIDs, 1 Maestro job per UDID | Two jobs on one sim |
| Happy path + decline path as the **release demo** | Re-running P01–P22 / U01–U12 / W-* as dual-user |
| Conductor script that **phases** the two phones | One YAML that drives both devices (Maestro cannot) |
| Small **testIDs** on Create Task assignee picker (missing today) | New product surfaces, Save Draft, admin Dashboard, Wave 2 |

Existing single-user suites stay the function-discovery gate (`MAINTABS_UX_CHECKLIST.md` B–E). This suite is the **interaction** gate.

---

## Actors and devices

| Seat | Account (existing Maestro) | Role in loop | Default sim (override via env) |
|---|---|---|---|
| **Assigner** | `john.managera@test.com` | Create + assign + approve (or see decline) | `MAESTRO_UDID_ASSIGNER` |
| **Assignee** | `alice.workera1@test.com` | Accept / decline / update+photo / submit review | `MAESTRO_UDID_ASSIGNEE` |

Password and Project A match `_boot.yaml` / `_boot-alice.yaml`. Do **not** share one account across both sims (persist/realtime fights — already noted on `_boot-alice.yaml`).

**Hard rules (this host):** ≤2 UDIDs; must differ; Metro `:8081` shared — no `src/` land mid-run. **SOP §10:** check other chats (`sim-lock.sh status`, `resource-lock.sh status`, NOW), claim pair plus runtime resources before run, release both lock families on exit.

**Required resource bundle:** `user:john.managera`, `user:alice.workera1`, `project:project-a`, `seed:dual-user`, plus `task:<resolved-id>` and `title-prefix:DU-H01` / `title-prefix:DU-D01` during active phases. If any of those are already claimed by another chat, stop and wait or pick a different lane.

---

## Gap vs today’s Maestro

| Today | Dual-user proves |
|---|---|
| P01 / W-C03 — John creates (often unassigned or self) | John creates **with photo**, assigns **Alice**, unique title |
| W-C05 — assignee picker opened, **not persisted** | Alice is actually selected + submit |
| W-D01 — Alice Accept on **API-seeded** task | Alice Accepts a task **just created on John’s phone** |
| U01 / W-D03 / W-D07 — Alice update/submit on seed | Same live task, then **John** sees review |
| QA01-A — one sim, Sprint7 actor switch | Two live sessions, live RLS + realtime/PTR |
| **Approve** — no headed W-* | John **Approve** on Alice’s submitted task |

---

## Journeys (phased, not parallel taps)

Maestro cannot coordinate two devices in one flow. A conductor generates a **unique title first**, then runs **serial phases**. Both apps stay logged in (`clearState` only on first boot).

Title example: `DU-H01 1724040000000` — known to both flows via env (no cross-process file after create).

### DU-H01 — Happy path (required release demo)

Field loop: **photo → task → accept → update+photo → submit review → approve**.

| Phase | Sim | Actor | Actions | Unique landing assert | PNG |
|---|---|---|---|---|---|
| 0 | both | — | Generate title; ensure Photos on **both** UDIDs; Metro health | — | — |
| 1a ∥ 1b | A / B | John / Alice | `clearState` login in **parallel** (distinct UDIDs) | `dashboard-screen__root` | `du-h01-01-john-home`, `du-h01-02-alice-home` |
| 2 | A | John | Camera → 1 photo → title/desc → Assign **Alice Worker A1** → submit | `tasks-screen__task_list` + selected assignees | `du-h01-03-john-assign-alice`, `du-h01-04-john-created` |
| 3 | B | Alice | Tasks PTR (W-T05 swipe) → search title → open row → **Accept** | `task-detail__quick-action-accept_task` gone | `du-h01-05-alice-inbox`, `du-h01-06-alice-accepted` |
| 4 | B | Alice | Update + 1 photo + 100% + submit → **Submit for Review** | submitted-for-review copy / no submit action | `du-h01-07-alice-updated`, `du-h01-08-alice-submitted` |
| 5 | A | John | Activity **Team Queue / review** or Tasks PTR → search title → **Approve** | `task-detail__quick-action-approve_task` → approved | `du-h01-09-john-review`, `du-h01-10-john-approved` |

**Need ≥10 PNGs** after rc=0 or override rc=98 (preflight Layer 4).

### DU-D01 — Decline path (required second demo)

Same create as H01 with a different title prefix. Alice **Decline** (Alert.prompt = PLATFORM_LIMITATION; same pattern as W-D02). John PTR/search → task shows declined; John does **not** have Accept.

| PNG min | `du-d01-01` create, `du-d01-02` Alice decline prompt, `du-d01-03` Alice after, `du-d01-04` John sees declined |

Need ≥4 PNGs.

### DU-R01 — Reject / rework (stretch, not this gate)

After H01 phase 4, John **Reject** instead of Approve; Alice sees rejected and can update again. Schedule only if H01+D01 are green and time remains. Isolation wall (wrong project) stays QA01-C — do not duplicate here.

---

## Orchestration

New:

- `scripts/maestro/run-dual-user-gate.sh` — preflight, sim + resource claims, env title, phase runner, PNG count, stop-on-fail, 8s cool-down between phases
- `maestro/flows/dual-user/_boot-john.yaml` — reuse create-task `_boot.yaml` (or runFlow)
- `maestro/flows/dual-user/_boot-alice.yaml` — reuse update-progress `_boot-alice.yaml`
- `maestro/flows/dual-user/DU-H01-assigner-create.yaml`
- `maestro/flows/dual-user/DU-H01-assignee-loop.yaml`
- `maestro/flows/dual-user/DU-H01-assigner-approve.yaml`
- `maestro/flows/dual-user/DU-D01-assigner-create.yaml`
- `maestro/flows/dual-user/DU-D01-assignee-decline.yaml`
- `maestro/flows/dual-user/DU-D01-assigner-sees-decline.yaml`

npm: `test:e2e:maestro:dual-user` → `scripts/maestro/run-dual-user-gate.sh`

```bash
npm run test:e2e:maestro:dual-user
ONLY=H01 npm run test:e2e:maestro:dual-user
```

Optional overrides (otherwise auto-picks two booted iPhone sims):

```bash
export MAESTRO_UDID_ASSIGNER="<john-udid>"
export MAESTRO_UDID_ASSIGNEE="<alice-udid>"
npm run test:e2e:maestro:dual-user
```

No manual steps: titles, Photos ensure, parallel boot, phased runs, sync retries, semantic PNG gate — all in the conductor.

---

## Testability (small product edits)

Create Task **Assign To** Pressable and picker rows/Done have **no testID** today (W-C05 uses truncated text + point tap). Dual-user must not rely on that.

Add only:

- `create-task__assignee-picker-trigger`
- `create-task__assignee-option-<stable>` (email slug or user id)
- `create-task__assignee-picker-done`

No behavior change. Gate C headed smoke: open picker, select Alice, Done, chips visible (`create-task__selected_assignees`).

---

## Realtime / sync assumption

Alice may not see John’s insert instantly. **Do not** treat missing row as product fail on first paint. Assignee phase: pull-to-refresh (proven W-T05) → search unique title → retry wait. Same for John’s review phase. If still missing after bounded retries → fail (sync/RLS bug).

---

## Preflight (print before run)

8 Maestro gates + two-sim SOP + Metro `:8081` + both sims booted + Photos on both + no other Maestro on those UDIDs + no conflicting `user:*` / `project:*` / `seed:*` claims.

Visual: read every listed PNG; titles, Alice name on John’s create, Accept gone, Approve result. `rc=0` alone is meaningless.

---

## Acceptance

1. `npm run test:e2e:maestro:dual-user` exits 0 unattended (H01 + D01) with automated PNG count gate  
2. Dual-user does not flake existing P01/U01 on the same packager after the run  
3. `npx tsc --noEmit` rc=0 if testIDs added  
4. Docs: `maestro/README.md` + `TESTING_STRATEGY.md` Layer 3 + `MAINTABS_UX_CHECKLIST.md` note: dual-user is the **interaction** RC gate; B–E remain function discovery  

---

## Risks

| Risk | Mitigation |
|---|---|
| Shared Metro Fast Refresh kills both | Freeze `src/` during run |
| XCTest death if UDIDs collide | Conductor exits 2 |
| Assignee picker text flake | testIDs above |
| Decline Alert.prompt | PLATFORM_LIMITATION; PNG + best-effort OK (W-D02) |
| Queue filters hide the row | Search + header reset filters (existing `_open-seeded-task-detail` pattern) |
| Long wall time (~8–15 min H01) | One-shot `ONLY=H01` while iterating |

---

## Assumptions (continue unless you override)

1. John/Alice + Project A is the pair (already used in W-D* / task-core).  
2. H01 + D01 = this gate; R01 is stretch.  
3. Live tenant, not Sprint7.  
4. Approve is creator `assignedBy` (John), not company admin.

---

## Build order after GO

1. Gate A plan critiques (risks + validation) — fold C/H  
2. testIDs on assignee picker + Jest/component assert  
3. DU-H01 YAML + conductor; headed run; read PNGs  
4. DU-D01  
5. Docs + npm script  
6. Gate B validation critique + human PNG sign-off
