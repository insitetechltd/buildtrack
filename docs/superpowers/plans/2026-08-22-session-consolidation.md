# Session consolidation — 2026-08-22

**Purpose:** Slice catalog + estimates.  
**Locked sequence & actions:** `2026-08-22-master-plan-parallel.md` (**authoritative**).  
**Pick-up:** `documentation/NOW.md`

---

## LOCKED — read this first

| Item | Decision |
|---|---|
| **Sequence** | OPS-01 v1 ✓ → **OPS-02 MVP** → **M-BILL-01 MVP** → AUTHZ-02 → AI-01 → Wave 2 |
| **OPS-02 today** | A+B ✅ done (parallel chat); **C+D remain** to close milestone |
| **Parallel now** | BILL-A draft, marketing GHPages, idle P1s only |
| **Frozen** | KPI v2 apply, BILL live apply, Wave 2 web |
| **Definitive next** | OPS02-C → OPS02-D → M-BILL-01 BILL-A |

Do not reprioritize without updating the master plan + user GO.

---

## Executive decisions (2026-08-22)

| # | Decision |
|---|---|
| 1 | Owner Console IA = **Monitoring / Economics / Tenant ops** (three sections) |
| 2 | Mobile = **watch + inspect**; tenant writes + deep P&L = **Edge + web later**; never service-role in app |
| 3 | **M-OPS-01 v1 closed** — smoke OK (Profile → Owner Console → Monitoring → Gaps) |
| 4 | Platform KPI = **v2** (`owner_kpi_snapshot` RPC), not v1 |
| 5 | Commercial E2E **not hooked today** — R7 checkout CTA only |
| 6 | **Technical default (2026-08-22 final):** **M-OPS-02 before M-BILL-01** — enforce status machine at source; billing infra after OPS-02 MVP |
| 7 | Multi-model eval: **shared brief first** — `.cursor/rules/multi-model-evaluation-prompt.mdc` |
| 8 | Henry web (M-WEB-01) stays **Wave 2** — not parallel with billing |

---

## Q&A — Item 8 resolutions

### 1. Recommendation per proposed flow (before user override)

**Locked boring-loop default:**

```
M-OPS-01 v1 close → M-OPS-02 → M-AUTHZ-02 → M-AI-01 → Wave 2
```

With **idle-parallel** options: KPI v2 spec, marketing GitHub Pages.

**3-model consensus for Owner Console:** v1 thin harness only; do **not** build full Economics/Tenant ops on phone; KPI v2 is a separate Human Gate slice.

So **default recommendation was:** close v1 → **M-OPS-02** (core-loop / fewer garbage states), KPI v2 in parallel if desired, **billing not scheduled**.

### 2. Business override (2026-08-22) — superseded

**Earlier session:** M-BILL-01 before M-OPS-02 (revenue priority).

**Final (2026-08-22):** **Technical default wins** — core-loop validation and hot-file shrink first; billing E2E after OPS-02 MVP.

**Effective order:**

```
M-OPS-01 v1 ✓ → M-OPS-02 → M-BILL-01 (infra BILL-A–E) → M-BILL-F (gates) → M-AUTHZ-02 → M-AI-01 → Wave 2
```

**Rationale:** OPS-02 blocks illegal task states at create (unassigned open/WIP, UI stars that lie) with no Human Gate. Billing needs schema + Stripe webhook sign-off; safer after create-path guards land. BILL ERD may **idle-parallel** during OPS02-C file shrink only.

### 3. Commit + push

Requested 2026-08-22 — Owner Console v1 + plans + this doc (scoped commit).

---

## Product surfaces

| Surface | Audience | Location | Status |
|---|---|---|---|
| Field mobile | Workers / PMs | Taskr app | RC / TestFlight |
| Company admin | Henry | Mobile Admin Dashboard; web `/a/*` Wave 2 | Partial |
| Platform owner | Tristan | Profile → Owner Console | **v1 live** |
| Marketing | Public | GitHub Pages | Almost ready |
| Product web | Henry / PM | `app.insiteworks.co` / Vercel | Wave 2 |

---

## Slice catalog

Estimates = **solo-dev focused days**.

### ✅ S-OPS01-V1 — Owner Console shell (DONE)

| Field | Detail |
|---|---|
| **Milestone** | `WS-OPS / M-OPS-01` v1 |
| **Scope** | Three-section nav; Monitoring: Gaps live, F-003 session, KPI/reliability stubs; Economics/Tenant preview stubs |
| **Out** | Live KPIs, SQL twin, tenant writes, $ amounts in-app |
| **Surfaces** | Mobile: `OwnerConsoleScreen`, `OwnerMonitoringScreen`, `OwnerEconomicsScreen`, `OwnerTenantOpsScreen`, `owner/ownerConsoleUi.tsx`, `WorkflowGapsScreen`; Nav: `AppNavigator`, `navigationTypes`; Gate: `platformSuperusers.ts`, `useProfileViewAdapter`, `ProfileScreen` |
| **DB/Edge/Web** | None |
| **Estimate** | 1–2d (spent) |
| **Plans** | `2026-08-22-owner-monitoring-architecture.md`, `2026-08-22-owner-console-modules-complete.md` |

---

### 🔥 S-OPS02 — Core-loop tightness (NEXT — technical default)

| Field | Detail |
|---|---|
| **Milestone** | `WS-OPS / M-OPS-02` |
| **When** | **Now** — after M-OPS-01 v1 |
| **Scope** | Shrink hot files; enforce status machine at create/update |
| **Phase A (active)** | `taskCreateValidation.ts`; store + CreateTask assignee required |
| **Estimate** | 1–2wk total |
| **Kickoff** | `2026-08-22-m-ops-02-kickoff.md` |
| **Surfaces** | `taskStore.supabase.ts`, `useCreateTaskViewAdapter`, CreateTask |

---

### S-M-BILL-01 — Commercial E2E MVP (after M-OPS-02 MVP)

| Field | Detail |
|---|---|
| **Milestone** | **New:** `WS-BILL / M-BILL-01` (add ROADMAP 15.048) |
| **Goal** | Sign-up → Stripe pay → **entitlements in Postgres** → invite/seat enforcement |
| **MVP scope IN** | |
| | • Schema: `plan_tiers`, `company_subscriptions`, `company_entitlements` (names TBD at Human Gate) |
| | • Stripe webhook Edge fn: checkout/subscription events → upsert company entitlements |
| | • Wire `invite-user` Edge: read caps from DB (replace hardcoded 1 PM + 5 workers) |
| | • Company row or entitlements: `plan_tier`, trial_end, subscription_status |
| | • Return URL / customer id mapping (Stripe customer ↔ company) |
| | • R7 checkout uses Stripe Price IDs tied to schema tiers |
| | • Owner audit log table (append-only) for manual overrides |
| **MVP scope OUT** | |
| | • Full Owner Console tenant UI on phone |
| | • Hard block on project create / upload / entries (Phase C — soft limits + upgrade CTA OK per R13) |
| | • Self-serve billing portal |
| | • MRR dashboard in-app (Stripe Dashboard SoT until v3) |
| **Surfaces** | **DB:** migrations; **Edge:** `stripe-webhook`, update `invite-user`; **Mobile:** optional plan badge on Profile; error messages on seat limit; **Owner Console:** read-only plan status later |
| **Human Gate** | **Yes** — schema + Stripe live webhook secrets |
| **Estimate** | **MVP 5–8d**; full enforcement **+1–2wk** |
| **Prereq** | Stripe Products/Prices for R6 SKUs; webhook signing secret |

**Phased delivery:**

| Phase | Deliverable | Est. |
|---|---|---|
| **BILL-A** | ERD + migration draft + Human Gate doc | 1d |
| **BILL-B** | Live schema + seed `plan_tiers` from `orgPlans.ts` | 1d (after GO) |
| **BILL-C** | Stripe webhook Edge + idempotency table | 2–3d |
| **BILL-D** | `invite-user` reads entitlements | 1d |
| **BILL-E** | Checkout → company linkage (metadata / customer portal) | 1–2d |
| **BILL-F** | Soft enforcement + upgrade CTA (optional hard block) | 2–3d |

---

### S-OPS01-V2A — Platform KPI

| Field | Detail |
|---|---|
| **When** | After M-OPS-02 MVP (BILL-A ERD may idle-parallel during OPS02-C) |
| **Scope** | `platform_owners`, `owner_kpi_snapshot` RPC, mobile KPI panel |
| **Estimate** | 2–4d |
| **Human Gate** | Yes |

---

### S-OPS01-V2B — Monitoring integrity

| Field | Detail |
|---|---|
| **Scope** | `owner_workflow_gaps` RPC, exception events, Gaps Loaded/Database toggle |
| **Estimate** | 3–5d |
| **When** | After V2A or M-BILL-C |

---

### ~~S-OPS02~~ — see NEXT above

---

### S-COMM-HOOK — R7 payment hook (LIVE)

| Field | Detail |
|---|---|
| **Scope** | Profile → Company plan → Stripe link or mailto |
| **Surfaces** | `orgPlans.ts`, `useProfileViewAdapter` |
| **Gap** | No webhook / no entitlements |

---

### S-WEB-01 / S-WEB-HOST — Wave 2

| Field | Detail |
|---|---|
| **When** | After OPS-02 per locked sequence |
| **Hosting** | Marketing = GitHub Pages; product = Vercel → `app.insiteworks.co` |
| **Estimate** | 2–3wk kickoff |

---

### Parked

- Dual-track Owner + Web parallel kickoff
- Owner Console tenant **writes** on mobile (Edge + web)
- M-OPS-01 v3 alerting
- Feedback inbox, BYO storage, M-AUTHZ-02, M-AI-01 (sequence unchanged after OPS-02)

---

## Revised execution order

| Priority | Slice | Est. | Status |
|---|---|---|---|
| 0 | ~~S-OPS01-V1~~ | Done | ✅ Closed |
| **1** | **S-OPS02 OPS02-C+D** | 3–7d | 🔥 **A+B done; C+D active** |
| 2 | S-M-BILL-01 MVP (BILL-A→E) | 5–8d | After OPS-02 close |
| 3 | S-OPS01-V2A KPI | 2–4d | Optional; frozen until OPS-02 close |
| 4 | S-M-BILL-01 BILL-F | 2–3d | Optional |
| 5 | Wave 2 web | 2–3wk+ | Parked |

---

## Commercial pipeline (target after M-BILL-01)

```
CreateCompany → Stripe Checkout → webhook → company_entitlements
                    ↓
              invite-user (caps from DB)
                    ↓
              optional gates (project/upload) Phase F
```

---

## Document index

| Topic | Path |
|---|---|
| **Master plan (parallel)** | `2026-08-22-master-plan-parallel.md` |
| This consolidation | `2026-08-22-session-consolidation.md` |
| Owner modules | `2026-08-22-owner-console-modules-complete.md` |
| Monitoring architecture | `2026-08-22-owner-monitoring-architecture.md` |
| Users & companies | `2026-08-22-owner-console-user-management.md` |
| Web kickoff | `2026-08-22-web-normal-users-kickoff.md` |
| Hosting | `2026-08-22-web-hosting-remote-test.md` |
| M-OPS-02 kickoff | `2026-08-22-m-ops-02-kickoff.md` |
| Post-RC sequence | `2026-08-19-post-rc-boring-loop.md` |
| Multi-model rule | `.cursor/rules/multi-model-evaluation-prompt.mdc` |

---

Updated: 2026-08-22
