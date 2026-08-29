# Master plan — LOCKED (2026-08-22)

**Status:** **LOCKED** — definitive sequence, outcomes, and parallel rules.  
**Authority:** Technical necessity + feasibility. Business reprioritization requires explicit user GO + doc update.  
**Pick-up:** `documentation/NOW.md`  
**Slice detail:** `2026-08-22-session-consolidation.md`  
**Visual sequence SoT (2026-08-29):** `documentation/ROADMAP.md` § **Commercial sequence map** (mermaid spine + idle gates + dependency graph). Local canvas companion: `master-pipeline-consolidated.canvas.tsx`. Prefer that section over the Aug-22 text spine below when they drift (ENV-01 + Store now precede OPS-03 / AUTHZ-02).

---

## Definitive outcomes (what “done” means)

| # | Milestone | Done when | Not done until |
|---|---|---|---|
| 1 | **M-OPS-01 v1** | Tristan: Profile → Owner Console → Monitoring → Gaps → Task Detail; KPI stubs honest; Henry no entry | ✅ **CLOSED** (smoke OK) |
| 2 | **M-OPS-02 MVP** | Create/update reject illegal states at source; assignee required on create; `test:tasks` + validation Jest green; optional Maestro create spot | OPS02-C/D remain |
| 3 | **M-BILL-01 MVP** | Stripe webhook → Postgres entitlements; `invite-user` reads caps from DB; checkout links company to tier | After OPS-02 MVP |
| 3a | **M-AUTHZ-RC** | Host-company assignment: same roster + ProjectRole both admin directions; Lead PM demote | **This commercial RC** (not AUTHZ-02) |
| 4 | **M-BILL-01 enforcement** | Soft/hard gates on invite (and optionally project/upload) | After MVP + Human Gate |
| 5 | **M-AUTHZ-02** | Multi-company project membership product + RLS | After billing MVP **and after RC** |
| 6 | **M-AI-01** | High-certainty project Q&A | After AUTHZ-02 |
| 7 | **Wave 2** | M-WEB-01/02 + M-DMS-01 kickoff | After spine above |

**Parked until explicit unlock:** Owner KPI v2, Wave 2 web kickoff, owner tenant writes on mobile, feedback inbox, BYO storage.

---

## Locked spine (sequential — no skipping)

```text
M-OPS-01 v1 ✅  →  M-OPS-02 MVP ✅  →  M-BILL-01 MVP + M-AUTHZ-RC (this RC)  →  M-AUTHZ-02  →  M-AI-01  →  Wave 2
```

**M-AUTHZ-RC vs M-AUTHZ-02:** RC ships one host-company people-on-project contract (existing admin screens). Multi-company join paths stay post-RC. User GO 2026-08-24.

**Why OPS-02 before billing:** Illegal create paths are fixed without Human Gate; billing needs schema + Stripe sign-off; enforcement on broken create paths would be misleading.

**Why billing before AUTHZ-02:** Seat/plan truth must exist before multi-company membership expands who counts against caps.

---

## M-OPS-02 status (incorporated from parallel chat — 2026-08-22)

| Phase | Scope | Status | Evidence |
|---|---|---|---|
| **OPS02-A** | Create validation (store + CreateTask UI) | ✅ **Done** | `taskCreateValidation.ts`, store + adapter wired |
| **OPS02-B** | Update-path guards | ✅ **Done** | `taskUpdateValidation.ts`, store wired |
| **OPS02-B+** | Legacy WIP reconcile on dashboard load | ✅ **Done** | `reconcileUnrecoverableWipTasks.ts` |
| **OPS02-B+** | Local create drafts (AsyncStorage, 7d TTL) | ✅ **Done** | `localTaskDraftStore.ts` — **not** unassigned WIP |
| **OPS02-C** | Hot-file shrink (extracts, no behavior change) | ⏳ **Next** | taskStore / CreateTask / AppNavigator |
| **OPS02-D** | Regression gate | ⏳ **Exit** | `npm run test:regression` or agreed subset + optional Maestro |

**Tests (2026-08-22):** validation + workflow Jest **46/46 PASS**; `npm run test:tasks` **38/38 PASS**.

**Remaining to close M-OPS-02:** OPS02-C + OPS02-D only.

---

## Parallel rules (only these lanes)

### Lane A — Spine (one primary owner)

Only **one** spine milestone active. Current primary: **finish M-OPS-02** (C+D).

### Lane B — Idle-parallel (allowed now)

| Item | Purpose | May run with OPS02-C? |
|---|---|---|
| **BILL-A** | Entitlements ERD + migration **draft** (no live apply) | ✅ Yes |
| **Marketing GHPages** | Public URL | ✅ Yes (disjoint) |
| M-DATA-03 / M-PERF-01 / S-UX-01R | Idle P1s | ✅ Yes (disjoint files) |

### Lane C — Frozen until spine gate

| Item | Unfreeze after |
|---|---|
| **BILL-B–E** live apply | M-OPS-02 MVP closed |
| **Owner KPI v2A** live RPC | M-OPS-02 MVP closed (+ Human Gate) |
| **Wave 2 web** | M-AUTHZ-02 per boring-loop |
| Dual-track Owner+Web kickoff | Never (superseded by this plan) |

### Single-writer (never parallel)

Live DDL apply, Stripe webhook deploy, entitlements schema apply, AUTHZ RLS apply.

---

## Definitive action plan (next 30 days)

### Now → close M-OPS-02 (est. 3–7 days)

| Step | Action | Owner | Exit |
|---|---|---|---|
| **1** | **OPS02-C** — extract helpers from taskStore / CreateTask / AppNavigator; no behavior change | Builder | Diff scoped; tests still green |
| **2** | **OPS02-D** — `npm run test:tasks` + targeted regression; document baseline | Test | Green or documented waivers |
| **3** | Update ROADMAP row M-OPS-02 → **Closed**; NOW → next spine | Docs | One commit scope |

**Idle in parallel (optional):** BILL-A draft, marketing push.

### Then → M-BILL-01 MVP (est. 5–8 days)

| Step | Action | Human Gate? |
|---|---|---|
| **BILL-A** | ERD + migration draft + review checklist | Review only |
| **BILL-B** | Live schema + seed tiers from `orgPlans.ts` | **Yes** |
| **BILL-C** | Stripe webhook Edge + idempotency | **Yes** |
| **BILL-D** | `invite-user` reads entitlements | No (after B) |
| **BILL-E** | Checkout ↔ company linkage | No |

**Outcome:** Pay → Postgres entitlements → invite seat caps from DB.

### Then → spine continues

```
M-BILL-F (optional gates) → M-AUTHZ-02 → M-AI-01 → Wave 2
```

### Optional after OPS-02 closed (not spine)

**S-OPS01-V2A** Platform KPI — 2–4d, Human Gate — only if you need away KPIs before billing completes.

---

## What we are NOT doing (locked out)

- Full Owner Console economics/tenant **writes** on phone
- Fake platform KPIs from client store
- Service-role key in mobile
- Web admin build before Wave 2 slot
- Commercial E2E **before** OPS-02 MVP closes
- Reprioritizing billing before OPS-02 without written GO

---

## One-page parallel view

```text
TIME →
─────────────────────────────────────────────────────────────────

SPINE (primary):
  [OPS-01 v1 ✅][── OPS-02 C+D ──][── BILL MVP ──][AUTHZ][AI][Wave2]
                      🔥

IDLE (parallel OK now):
  [BILL-A draft········][Marketing GHPages?][DATA/PERF/UX-R····]

FROZEN:
  [KPI v2 apply][BILL live][Web kickoff][Owner tenant writes]
```

---

## Document index

| Doc | Role |
|---|---|
| **This file** | Locked master plan |
| `2026-08-22-session-consolidation.md` | Slice catalog + estimates |
| `2026-08-22-m-ops-02-kickoff.md` | OPS-02 phase detail |
| `2026-08-19-post-rc-boring-loop.md` | Spine law |
| `documentation/NOW.md` | Session pick-up |

---

**Locked:** 2026-08-22 — user request to consolidate; OPS-02 A/B incorporated from parallel session.
