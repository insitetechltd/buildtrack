# Test Blind-Spot Audit — InsiteApp / Taskr

**Date:** 2026-09-27  
**Audit SHA:** `7d65e97` (`chore(asc): submit Taskr 1.1.3 build 280 for App Review`)  
**Prompt:** `docs/superpowers/plans/2026-09-27-test-blind-spot-audit-prompt.md`  
**Stance:** Adversarial. Green scripts cited only when their plane and oracle were inspected.  
**Explorers:** Edge/Stripe inventory + Maestro/RLS/authz inventory (parallel).

---

## A. Verdict

**STABILIZING** (S0–S10 + Grok P1/P2 closed @ `d2e3200+`; residual P0s remain)

S0–S10 closed 2026-09-27. Grok follow-up closed: Maestro path hygiene, P04d JWT soft-delete, signup insert-if-missing. Still open: entitlement-mutating webhook matrix, EG-13 product intent, invite-open lifecycle, PROD live-card signup HUMAN, Maestro N≥5 flake bar. CI mock-only Jest.

---

## B. Capability-to-proof matrix

Prove planes: `J-MOCK` | `J-LIVE` | `DEV-MAESTRO` | `DEV-PROBE` | `PROD-DEST` | `HUMAN` | `NONE`  
Oracle: `STRONG` | `WEAK` | `NONE`  
Verdict: `PROVEN` | `PARTIAL` | `UNPROVEN` | `HUMAN-ONLY` | `NO-PLANE`

### B1. Postgres / RLS / Storage / Realtime

| ID | Capability | Axis | Actors | Failure mode | Faith | Script/layer | Plane | Oracle | Evidence | Last proven | Verdict |
|---|---|---|---|---|---|---|---|---|---|---|---|
| DB-01 | Anon block on `users` | Postgres/RLS | anon | Tenant PII leak | SAFETY-ISOLATION | `test:dual-env:critical` (`rls.anon_users_blocked`) | PROD-DEST (+DEV) | WEAK‡ | probe-critical-paths-dual-env.py | 2026-09-23 / Stage E (not tip) | PARTIAL |
| DB-02 | Anon block on remaining 6+ tables + billing | Postgres/RLS | anon | Broad anon read | SAFETY-ISOLATION | `test:dual-env:critical` `rls.anon_*` | PROD-DEST (+DEV) | STRONG | s3-critical.log core7+billing | 2026-09-27 @ 7d65e97 | PROVEN |
| DB-03 | Same-company wrong-project deny (F6) | Postgres/RLS | JWT member | Cross-project leak | SAFETY-ISOLATION | `test:dual-env:p-matrix` F6 | PROD-DEST (+DEV) | STRONG | e4-pmatrix-result.md F6 PASS | 2026-09-23 @ 89a9aa3 | PARTIAL† |
| DB-04 | Cross-**company** deny | Postgres/RLS | JWT other company | Tenant isolation break | SAFETY-ISOLATION | `test:dual-env:p-matrix` **F7** (promote gate) | PROD-DEST (+DEV) | STRONG | 2026-09-27-s0-s2-prove F7 PASS | 2026-09-27 @ 7d65e97 | PROVEN |
| DB-05 | Role CHECK + role-write trigger | Postgres | writes | Illegal role persist | AUTH | Historical 03a close; schema-parity CHECK counts | PROD-DEST (shape only) | WEAK | schema-parity ≠ policy body | UNKNOWN tip | PARTIAL |
| DB-06 | Seat/membership UPA wall | Postgres/RLS | JWT | Access without UPA | AUTH | p-matrix P03/P08 + F6 | PROD-DEST | STRONG | e4-pmatrix | 2026-09-23 | PARTIAL† |
| DB-07 | Containers / locations RLS | Postgres/RLS | JWT/anon | Area leak | SAFETY-ISOLATION | Migration live apply notes | HUMAN | WEAK | 01N close reports | 2026-08 | HUMAN-ONLY |
| DB-08 | `buildtrack-files` private + signed URL TTL | Storage | JWT | Public object / eternal URL | DATA-LOSS | `test:uploads` (client); 03c close | J-MOCK + HUMAN | WEAK | No live signed-URL expiry probe | UNKNOWN | PARTIAL |
| DB-09 | Realtime publication membership | Realtime | JWT | Missed updates / storm | UX | 04a close; M-DATA-04 close | HUMAN | WEAK | Historical Dashboard SQL | 2026-08 | HUMAN-ONLY |
| DB-10 | Schema column parity DEV↔PROD | Postgres | app writes | `42703`/`PGRST204` | DATA-LOSS | `test:schema-parity` | PROD-DEST | STRONG (shape) | assert-schema-parity.json | 2026-09-27 @ 7d65e97 | PROVEN |
| DB-11 | F-003 6-col strip + observability fire | Compat | app | Silent metadata drop | DATA-LOSS | deferredSchemaObservability.test + taskStore deferred tests | J-MOCK | WEAK§ | Counter unit tested; store hook not asserted | tip tree | PARTIAL |
| DB-12 | Migration idempotency / rollback | Postgres | ops | Half-applied DDL | DATA-LOSS | — | NONE | NONE | Human Gate only | — | NO-PLANE |

‡ Anon probe treats HTTP 200 + `[]` as blocked.  
† Proven on older SHA — re-run required before claiming tip.  
§ Strip tests pass without asserting `recordDeferredFallbackFire`.

### B2. Edge / Stripe

| ID | Capability | Axis | Actors | Failure mode | Faith | Script/layer | Plane | Oracle | Evidence | Last proven | Verdict |
|---|---|---|---|---|---|---|---|---|---|---|---|
| EG-01 | `stripe-webhook` signature reject | Edge/Stripe | Stripe/attacker | Forged events | MONEY | `test:edge:stripe-webhook-faith` | DEV-PROBE | STRONG | s1-stripe-webhook-faith.json bad sig 400 | 2026-09-27 @ 7d65e97 | PROVEN (DEV) |
| EG-02 | `stripe-webhook` replay / idempotency | Edge/Stripe | Stripe retry | Double seat grant | MONEY | `test:edge:stripe-webhook-faith` | DEV-PROBE | STRONG | first claim + `duplicate:true` | 2026-09-27 @ 7d65e97 | PROVEN (DEV; ignored event type — claim path only) |
| EG-03 | `stripe-webhook` deleted → seat meters 0 (+ unit out-of-order guards) | Edge/Stripe | Stripe | Wrong entitlement / invite still open after cancel | MONEY | `test:edge:stripe-webhook-deleted-seats` + `webhookMetersGuard` Jest | DEV-PROBE (+ J-MOCK stale/order) | STRONG | eg03-deleted-seats.json seats→0; Jest metersAfterSubscriptionCanceled | 2026-09-28 @ tip | PROVEN (DEV deleted seats); PROD webhook fire HUMAN GATE |
| EG-04 | `create-checkout-session` | Edge/Stripe | CA JWT | Wrong company charged | MONEY | `createCheckoutSession.test.ts` | J-MOCK | WEAK | invoke args only | tip | PARTIAL |
| EG-05 | `cancel-subscription` | Edge/Stripe | CA JWT | Cancel fail / wrong co | MONEY | p-matrix anon/malformed | DEV-PROBE/PROD-DEST | WEAK | Structural only; no happy cancel | 2026-09-23 | PARTIAL |
| EG-06 | `billing-subscription-status` | Edge/Stripe | CA JWT | Stale UI / leak | MONEY | p-matrix P10a anon 401 | PROD-DEST | WEAK | Anon deny; JWT “no sub” accepted | 2026-09-23 | PARTIAL |
| EG-07 | `start-signup-checkout` | Edge/Stripe | public | Catalog abuse | MONEY | dual-env:critical invalid payload | PROD-DEST | WEAK | Invalid path only | 2026-09-23 | PARTIAL |
| EG-08 | `signup-checkout-status` | Edge/Stripe | public | Session oracle abuse | MONEY | dual-env:critical invalid session | PROD-DEST | WEAK | Invalid path only | 2026-09-23 | PARTIAL |
| EG-09 | `update-company-addons` | Edge/Stripe | CA JWT | Unbilled seats | MONEY | `test:edge:update-company-addons-faith` | DEV-PROBE | WEAK→STRONG (ACL) | dry ACL/payload only; no qty mutate | 2026-09-27 | PARTIAL (happy qty still NONE) |
| EG-10 | `invite-user` | Edge | CA JWT | Seat over-invite | AUTH | inviteUser.test.ts + p-matrix | J-MOCK + PROD-DEST (struct) | WEAK | Mock + Edge ACL smoke | tip / 09-23 | PARTIAL |
| EG-11 | `invite-open` token lifecycle | Edge | invitee | Replay / expiry | AUTH | inviteSignInLink.test.ts | J-MOCK | WEAK | Parser only; Edge does not validate token | tip | UNPROVEN |
| EG-12 | Owner read/write / KPI / economics | Edge (hq) | platform_owners | Privilege escape | AUTH | owner smokes + mocked fetch tests | DEV-PROBE / J-MOCK | WEAK | apps/owner ignored by root Jest | UNKNOWN | PARTIAL |
| EG-13 | Entitlement fail-open vs fail-closed | Business | all users | Free access or lockout | MONEY | companyPlanGate (+ founder gate) | J-MOCK | WEAK | Founder gate fail-closed; **ongoing task access not gated on billing-status** | tip | PARTIAL |

### B3. Mobile UI / Maestro

| ID | Capability | Axis | Actors | Failure mode | Faith | Script/layer | Plane | Oracle | Evidence | Last proven | Verdict |
|---|---|---|---|---|---|---|---|---|---|---|---|
| UI-01 | Launch → dashboard | Mobile | any | Boot redbox | UX | `test:e2e:maestro:smoke` | DEV-MAESTRO | WEAK‖ | launch-smoke.yaml | UNKNOWN tip | PARTIAL |
| UI-02 | Worker create+photo (P01) | Mobile | field | Lost evidence | DATA-LOSS | `test:e2e:maestro:rc-worker-be` | DEV-MAESTRO | WEAK‖ | P01 one-shot; no row teardown | UNKNOWN tip | PARTIAL |
| UI-03 | Worker update+photo (U01) | Mobile | field | Update without photo | DATA-LOSS | rc-worker-be U01 | DEV-MAESTRO | WEAK‖ | API seed + Photos | UNKNOWN tip | PARTIAL |
| UI-04 | Dual-user assign→accept→update→review | Mobile | PM+Worker | Handoff break | AUTH | `test:e2e:maestro:dual-user` | DEV-MAESTRO | WEAK‖ | seed:dual-user; no row delete | UNKNOWN tip | PARTIAL |
| UI-05 | Task-core live CRUD+photo | Mobile | manager | Live workflow break | DATA-LOSS | `test:e2e:maestro:task-core` | DEV-MAESTRO | WEAK‖ | No seed script; clearState false | UNKNOWN tip | PARTIAL |
| UI-06 | QA01 rejection / overdue / isolation / viewport | Mobile | sandbox | Rubric miss | UX | `test:e2e:maestro:qa01` | DEV-MAESTRO | WEAK | Isolation = Sprint 7 **sandbox**, not live RLS | UNKNOWN tip | PARTIAL |
| UI-07 | Org CA shell / create project / invite validation | Mobile | Carol CA | Org admin break | AUTH | `test:e2e:maestro:org-ca` | DEV-MAESTRO | WEAK‖ | Needs seed:dev-qa; A-D01 still OPEN debt | Stage D 2026-09-22 | PARTIAL |
| UI-08 | Report resolve (+/− reply) | Mobile | field+CA | Missing audit | DATA-LOSS | `test:e2e:maestro:report` + DB readback | DEV-MAESTRO | STRONG¶ | logout teardown; M-REPORT-01 with-reply still OPEN | 2026-09-23 | PARTIAL |
| UI-09 | Photo-flow unit (picker/Accept) | Mobile | — | Blank tiles / hang | UX | `test:photo-flow` | J-MOCK | WEAK | Large Jest surface; not device taps | tip | PARTIAL |
| UI-10 | Focus / keyboard / submit Gate C | Mobile | field | Dead fields | UX | `maestro/flows/smoke/gate-c-login-create-task.yaml` | DEV-MAESTRO | STRONG | s6-s10-prove/gate-c PNGs | 2026-09-27 | PROVEN |
| UI-11 | Offline / kill mid-upload | Mobile | field | Lost draft | DATA-LOSS | drafts in OPS-02 Jest (partial) | J-MOCK | WEAK | No Maestro poor-network | — | UNPROVEN |
| UI-12 | Activity feed row / evidence strip | Mobile | field | Broken thumbs / layout | UX | `ActivityStyleRowCard.test.tsx` | J-MOCK | WEAK | Jest-only; no Maestro/device frame | tip | PARTIAL |
| HY-01 | Maestro path hygiene (scripts/package.json/runFlow) + registry completeness | Hygiene | ops | Suite calls missing YAML / unregistered suites | UX | `test:taxonomy` path-resolve + `--write` registry | J-MOCK | STRONG | registry picks recompute/subscriptionMetersMerge/ascReviewDemoGuard (2026-09-28) | 2026-09-28 @ tip | PROVEN |

‖ Maestro faith still requires Gate 0–8 + PNG read; `rc=0` alone is WEAK.  
¶ Report without-reply has DB oracle; resolve-**with**-reply (E3c) OPEN.

### B4. Zustand / business rules

| ID | Capability | Axis | Actors | Failure mode | Faith | Script/layer | Plane | Oracle | Evidence | Last proven | Verdict |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Z-01 | Task create/update/approve/reject rules | Zustand | field | Illegal status | DATA-LOSS | `test:tasks`, `test:integration` | J-MOCK | WEAK | Mocked Supabase | tip | PARTIAL |
| Z-02 | Optimistic + rollback (Create Task soft-delete under JWT) | Zustand/RLS | worker JWT | Ghost rows after upload fail | DATA-LOSS | p-matrix **P04d** (+ Jest evidencePhotoSubmit) | PROD-DEST (+DEV) | STRONG | jwt soft_delete http=200 list_absent | 2026-09-27 @ d2e3200 | PROVEN (JWT soft-delete path); full adapter rollback still PARTIAL |
| Z-03 | primary ∪ delegates / `canSelectAssignee` | Authz rules | CA/PM/Worker | Wrong assignee pool | AUTH | taskDelegationPermissions.test.ts | J-MOCK | STRONG (pure) | allow+deny ranks | tip | PROVEN (unit only) |
| Z-04 | Draft queue / discard | Zustand | field | Stuck drafts | UX | OPS-02 era tests | J-MOCK | WEAK | — | UNKNOWN | PARTIAL |
| Z-05 | Stale list/detail after nav + realtime | Zustand | multi-device | Divergent UI | UX | `test:e2e:journeys` (shell) | J-MOCK | WEAK | No realtime converge assert | — | UNPROVEN |
| Z-06 | Overdue / timezone math | Rules | PM | Wrong overdue | UX | qa01-b Partial | DEV-MAESTRO | WEAK | Sandbox | — | PARTIAL |

### B5. Web signup / billing

| ID | Capability | Axis | Actors | Failure mode | Faith | Script/layer | Plane | Oracle | Evidence | Last proven | Verdict |
|---|---|---|---|---|---|---|---|---|---|---|---|
| WEB-01 | signup.html → start-checkout → poll status → company | Web | new CA | Broken day-1 revenue | MONEY | `test:edge:signup-happy-path` (fresh + **insert_if_missing**) | DEV-PROBE | STRONG | s6-signup-happy-path.json both cases GO; webhook redeployed DEV+PROD | 2026-09-27 @ d2e3200 | PROVEN (DEV); PROD live card remains HUMAN |
| WEB-02 | billing.html cancel / portal | Web | CA | Stuck paid / false cancel | MONEY | billing.js + cancel Edge | HUMAN | WEAK | NOW cancel smoke 2026-09-12 | dated | HUMAN-ONLY |
| WEB-03 | Non-IAP / web-only signup (ASC) | Compliance | Reviewer | App Review reject | MONEY | ASC notes + paste pack | HUMAN | WEAK | ASC submit 280 | 2026-09-27 | HUMAN-ONLY |
| WEB-04 | Seat add-ons sync (web↔Stripe↔app) | Web/Edge | CA | Cap drift | MONEY | seatUsage.test.ts (client math) | J-MOCK | WEAK | No live Stripe quantity assert | tip | UNPROVEN |

### B6. Authz / seats

| ID | Capability | Axis | Actors | Failure mode | Faith | Script/layer | Plane | Oracle | Evidence | Last proven | Verdict |
|---|---|---|---|---|---|---|---|---|---|---|---|
| AZ-01 | CA/PM/Worker allow+deny (picker) | Authz | seats | Wrong who→whom | AUTH | taskDelegationPermissions + createProjectTeam tests | J-MOCK | STRONG | Pure functions | tip | PROVEN (unit) |
| AZ-02 | Invite seat caps | Authz | CA | Over-seat | MONEY | seatUsage.test + inviteUser mock | J-MOCK | WEAK | No live Edge seat enforce | tip | PARTIAL |
| AZ-03 | Last-admin demote guard | Authz | CA | Lockout company | AUTH | p-matrix O4 + migration 20260927000100 | PROD-DEST | STRONG | s5-pmatrix-go-confirm.log | 2026-09-27 @ 7d65e97 | PROVEN |
| AZ-04 | Revoked seat access removal | Authz | ex-member | Ghost access | AUTH | — | NONE | NONE | — | — | NO-PLANE |
| AZ-05 | PA crown constraints | Authz | CA/PM | Illegal PA | AUTH | projectMembership + createProjectTeam | J-MOCK | STRONG | — | tip | PROVEN (unit) |

### B7. Dual-plane (persistence / auth / billing / Edge — separate rows)

| ID | Capability | Plane | Script | Verdict vs tip `7d65e97` |
|---|---|---|---|---|
| DP-01 | Critical paths DEV | DEV-PROBE | `test:dual-env:critical` | **PROVEN** 2026-09-27 @ 7d65e97 (0 FAIL / 2 WARN) |
| DP-02 | Critical paths PROD | PROD-DEST | same | **PROVEN** 2026-09-27 @ 7d65e97 |
| DP-03 | P-matrix DEV | DEV-PROBE | `test:dual-env:p-matrix` (+prep) | **PROVEN** 2026-09-27 @ 7d65e97 (incl. F7) |
| DP-04 | P-matrix PROD | PROD-DEST | same (F6+**F7** in promote gate) | **PROVEN** 2026-09-27 @ 7d65e97 |
| DP-05 | Schema parity (+ `billing_webhook_claims`, `company_subscriptions.last_webhook_event_created_at`) | PROD-DEST | `test:schema-parity` | **PROVEN** 2026-09-28 @ tip — cols 260/260 tables 27/27; both planes have migs `20260928000100`/`20260928000200` (read-only; no repair DDL needed). Evidence `assert-schema-parity.json` + `dp05_webhook_migs` |
| DP-06 | Headed JWT PROD | PROD-DEST | `test:headed-prod:jwt` | PARTIAL — Stage E era |
| DP-07 | Headed Maestro PROD | PROD-DEST | `test:headed-prod:maestro` | PARTIAL — Stage C/E era |
| DP-08 | IPA bake PROD ref | Hygiene | `assert:ipa-prod-bake` | PARTIAL — used in CBP 280 |
| DP-09 | Billing Edge happy path PROD | PROD-DEST | — | NO-PLANE |
| DP-10 | Webhook signed event PROD/DEV | DEV-PROBE | `test:edge:stripe-webhook-faith` | **PROVEN DEV** 2026-09-27 (PROD webhook not hit — intentional) |

---

## C. Backlog (capped)

### P0 faith (≤10)

| # | Capability | Failure mode | Why evidence insufficient | Plane | Smallest proof | Extend |
|---|---|---|---|---|---|---|
| 1 | EG-01/02 `stripe-webhook` | Forged/replay grants seats | **CLOSED (claim path)** 2026-09-27 — still owed: entitlement-mutating event matrix + PROD webhook secret plane | DEV-PROBE | `test:edge:stripe-webhook-faith` | Extend to checkout.session.completed fixture |
| 2 | EG-13 / WEB entitlement | Paying features without live sub | Task access not gated on subscription; founder gate only | J-MOCK + HUMAN | Document product intent; if fail-closed desired, add gate + Jest; if fail-open, assert meters still block invites | `companyPlanGate` / seat invite path |
| 3 | DB-04 Cross-company deny | Tenant A reads tenant B | **CLOSED** 2026-09-27 — p-matrix **F7** promote gate | PROD-DEST | F7 | Keep in gate |
| 4 | WEB-01 Signup happy path | Day-1 revenue broken | **CLOSED (DEV)** 2026-09-27 — fresh + insert-if-missing @ d2e3200; PROD live card still HUMAN | DEV-PROBE | Keep `test:edge:signup-happy-path` | PROD live card Human |
| 5 | EG-09 `update-company-addons` | Unbilled seat growth | **ACL dry CLOSED**; happy qty mutate still NONE | DEV-PROBE | Qty mutate under test-mode | Extend faith probe |
| 6 | AZ-03 Last-admin guard | Demote sole CA → lockout | **CLOSED** 2026-09-27 — SQL applied DEV+PROD; O4 in promote gate | PROD-DEST | Keep `O4_PROMOTE_GATE=1` | — |
| 7 | DP-03/04 tip re-prove | Ship on stale destination | **CLOSED** 2026-09-27 @ `7d65e97` | PROD-DEST | S0 | Re-run on next tip |
| 8 | DB-02 Anon 7-table re-probe | Policy drift since 2026-08-08 | **CLOSED** 2026-09-27 in critical | PROD-DEST | Keep in critical | — |
| 9 | EG-11 Invite token lifecycle | Replay invite-open | Parser-only Jest | DEV-PROBE | Token used once then rejected | invite-open + Auth admin API test |
| 10 | UI-10 Gate C interactions | Dead TextField / keyboard cover | No standing headed suite | DEV-MAESTRO / HUMAN | One headed Login + Create Task chrome tap per Gate C | Maestro or checklist with PNG+SHA |

### P1

| Capability | Gap | Plane | Smallest |
|---|---|---|---|
| UI-07 / A-D01 | CA Dashboard-only OPEN debt; org-ca ≠ product intent | HUMAN / product | Decide ship intent; then Maestro or accept Human |
| UI-08 E3c | Report resolve-**with**-reply audit | DEV-MAESTRO | Extend report journey + DB oracle |
| UI-04 X02/X05 | Accept + creator-approve gaps on checklist | DEV-MAESTRO | Extend dual-user |
| DB-11 | Observability not wired in store tests | J-MOCK | Assert `recordDeferredFallbackFire` in deferred strip tests |
| Live suite pollution | Most Maestro suites lack row teardown | DEV-MAESTRO | Document accepted pollution OR add cleanup |
| Flake / quarantine | N≥3 ledger landed; N≥5 weekly job still owed | Process | Keep `MAESTRO_QUARANTINE.md`; measure tip flake |
| UI-12 | Activity evidence strip Jest-only | J-MOCK | Headed/Maestro frame when Activity UI next touched |
| HY-01 | Path resolve in taxonomy | J-MOCK | Keep assert; extend if new runners invent path vars |

### Nice-to-have

- Owner economics live smoke  
- Duplicate Maestro of hops already in P01/U01  
- Coverage % chase / archived-tests cleanup  
- Store-demo Maestro optional flows  

---

## D. Chain status + oracle audit

### Chains

| Chain | Status | Broken / weak hop |
|---|---|---|
| Photo → upload → task → update+photo → approve/reject | **partial** | Jest+Maestro DEV strong-ish; approve/reject dual-user incomplete (X02/X05 Gap); PROD headed JWT create/photo only |
| Web signup → checkout → webhook → status → seats | **unproven** (automated) | Happy path HUMAN only; webhook NO-PLANE; status anon-only automated |
| Billing change → checkout/addons/cancel → webhook → client | **unproven** | addons NONE; cancel structural; webhook NONE |
| Invite → open → role → project + isolation | **partial** | invite-user mock+struct; invite-open UNPROVEN; isolation F6 same-company |
| Worker vs dual-user vs CA org | **partial** | Three different claims; must not substitute; CA G–J Human ☐ |
| DEV Maestro vs PROD destination | **partial** | Destination exists but SHA-stale vs tip |

### Oracle audit (sample — WEAK flagged)

> `test:tasks` would still exit 0 if **every RLS policy were dropped**.  
> `test:regression` would still exit 0 if **PROD schema lacked 6 metadata columns** (mocks + F-003 strip).  
> `test:e2e:maestro:qa01` Scenario C would still exit 0 if **live cross-company RLS were open** (Sprint 7 sandbox).  
> `createCheckoutSession.test.ts` would still exit 0 if **Edge charged the wrong company** (invoke mock).  
> `test:dual-env:p-matrix` P10a would still exit 0 if **webhook never wrote entitlements** (only anon status 401).  
> `test:e2e:maestro:rc-worker-be` would still exit 0 if **PNG showed wrong project** (without Gate 8 visual read).  
> `test:schema-parity` would still exit 0 if **policy bodies diverged** (counts/columns, not definitions).  
> `inviteSignInLink.test.ts` would still exit 0 if **invite-open accepted replayed tokens**.  
> `deferredSchemaObservability.test.ts` would still exit 0 if **taskStore never called `recordDeferredFallbackFire`**.  
> CI `test:regression` / `test:all` would still exit 0 if **DEV and PROD were unreachable** (placeholders).

---

## E. Human-plane list

| Item | Checklist | Staleness |
|---|---|---|
| MainTabs G–J CA org (A-D*, A-P*, A-U*, A-PR*) | `documentation/MAINTABS_UX_CHECKLIST.md` — Manual ☐ | **Stale / never ticked** in file |
| A-PR03 Checkout | Exempt (Stripe web) | Human dogfood NOW 2026-09-25 signup+Checkout PASS — not SHA-bound artifact |
| Cancel path | NOW 2026-09-12 | Dated; recheck after billing code churn |
| Section L format | Human only | Continuous |
| ASC review notes / Public | ASC console | Build **280** submitted 2026-09-27 — review in flight |
| Historical RLS Gate1 7/7 anon | 2026-08-08 evidence | **>30d** — re-probe owed (P0 #8) |

---

## F. Stabilization plan (one plane per slice)

| Slice | Closes | Plane | Exit criterion |
|---|---|---|---|
| S0 | Tip destination truth | PROD-DEST | **CLOSED 2026-09-27** @ `7d65e97` — see `2026-09-27-s0-s2-prove/RESULT.md` |
| S1 | Webhook faith | DEV-PROBE | **CLOSED 2026-09-27** — `npm run test:edge:stripe-webhook-faith` GO |
| S2 | Cross-company deny | PROD-DEST | **CLOSED 2026-09-27** — p-matrix **F7** in promote + DEV gates |
| S3 | Anon 7-table re-probe | PROD-DEST | **CLOSED 2026-09-27** — critical anon core7 + billing sample GO |
| S4 | Add-ons Edge | DEV-PROBE | **CLOSED 2026-09-27** — `test:edge:update-company-addons-faith` GO |
| S5 | Last-admin | PROD-DEST | **CLOSED 2026-09-27** — Human GO; O4 PASS DEV+PROD (`O4_PROMOTE_GATE=1`) |
| S6 | Signup happy path | HUMAN→script | **CLOSED 2026-09-27** — `test:edge:signup-happy-path` · `2026-09-27-s6-s10-prove/` |
| S7 | Entitlement product law | Docs+J-MOCK | **CLOSED 2026-09-27** — `documentation/ENTITLEMENT_PRODUCT_LAW.md` + companyPlanGate Jest |
| S8 | Maestro hygiene | Process | **CLOSED 2026-09-27** — `documentation/MAESTRO_QUARANTINE.md` |
| S9 | Gate C | DEV-MAESTRO/HUMAN | **CLOSED 2026-09-27** — `maestro/flows/smoke/gate-c-login-create-task.yaml` rc=0 + PNGs |
| S10 | Commit capability map | Docs | **CLOSED 2026-09-27** — map + S0–S10 evidence committed |

Do **not** start S1–S9 until S0 is green on the SHA you intend to trust.

---

## G. Assumptions / UNKNOWN

| ID | Item |
|---|---|
| U1 | Tip `7d65e97` destination matrix not re-run in this audit — cited Stage E / 09-23 evidence only |
| U2 | Cross-company RLS may exist in policy SQL but has **no named automated case** |
| U3 | Product intent for non-founder users when subscription lapses: fail-open task access assumed from code skim — confirm with Tristan |
| U4 | N≥5 flake rates for Maestro suites: **not measured** this audit |
| U5 | Whether CI nightly `test:all` actually enforces coverageThreshold on this host/config: not executed here |
| U6 | Owner Edge PROD smokes: DEV scripts exist; PROD owner allowlist prove UNKNOWN |
| U7 | `invite-open` relies on Supabase Auth verify for `token_hash` — lifecycle coverage UNKNOWN beyond parser |
| U8 | Report E3c (resolve-with-reply) still OPEN per ROADMAP/NOW — not re-proven |

---

## Stabilized checklist (current)

| # | Criterion | Status |
|---|---|---|
| 1 | Capability map committed | **Met** (this file) |
| 2 | Zero open P0 NONE/WEAK | **Not met** |
| 3 | Money/authz/isolation on real Postgres/Stripe | **Not met** (webhook/addons) |
| 4 | Persistence/auth/billing/Edge have PROD-DEST or Human | **Partial** (stale / structural) |
| 5 | Worker RC ≠ CA/billing proof | **Met** (documented) |
| 6 | Payments cite Edge/web | **Met** as mapping; **Not met** as proof |
| 7 | Maestro Gate 0–8 required | **Met** as law; execution UNKNOWN tip |
| 8 | N≥5 + quarantine | **Not met** |
| 9 | Live seed+teardown | **Not met** (most suites) |
| 10 | Tip destination green | **Met** 2026-09-27 @ `7d65e97` (S0) |
| 11 | Accepted-risk short list | **Met** (below) |
| 12 | CI wiring explicit | **Partial** — PR/nightly = mock Jest only; destination **not** in GHA |

### Accepted risk (explicit, dated 2026-09-27)

1. Maestro stays DEV-only (destruction rule) — destination is probes/headed, not Maestro→PROD wholesale.  
2. A-PR03 Checkout remains Human/Exempt (real card).  
3. Owner/hq surface out of Taskr Maestro.  
4. Section L format remains Human.  
5. Literal 100% functionality coverage declined — capability map is SoT.

---

## Adversarial answers (Step 4)

1. **Customer-first break:** Web signup/checkout or webhook not updating seats — suites stay green.  
2. **Anon + cross-company on PROD this SHA:** Anon `users` via dual-env:critical (stale SHA). Cross-company: **nothing automated**.  
3. **Webhook duplicate/forged:** Code rejects bad sig and de-dupes by event id — **untested**.  
4. **State matrix gaps:** `past_due`, `canceled→reactivated`, out-of-order cancel vs checkout — **zero coverage**.  
5. **billing-subscription-status fail:** Mobile mostly **doesn't call it**; founder plan gate fail-closed; general task access **fail-open** w.r.t. that endpoint.  
6. **Seat downgrade/revoke:** Invite caps in Jest math; live revoke access removal **NO-PLANE**; last-admin O4 owed.  
7. **Unproven interactions:** Gate C focus/keyboard; slow library Accept; kill mid-upload; scroll/overlay — mostly HUMAN/NONE.  
8. **Mock-schema survival:** `test:tasks` / deferred strip / CreateTaskScreen mocks.  
9. **Order-dependent live suites:** task-core, qa01, dual-user, P/U one-shots — seed varies; **almost no row teardown**.  
10. **Deferred observability:** Counter unit-tested; **store wiring not asserted** → can stay silent.

---

## CI wiring (criterion 12 detail)

| Workflow | Runs | Blocks |
|---|---|---|
| `ci-pull-requests.yml` | Fast unit + regression (mock env placeholders) | PR jobs |
| `ci-nightly.yml` | `test:all` (Jest) | Slack notify |
| `ci-weekly.yml` | (exists) | — |
| Destination / Maestro | **Not in GHA** | Local/operator only |

---

## Next three proofs (ordered)

1. ~~**S0**~~ **CLOSED** — tip destination green @ `7d65e97`.  
2. ~~**S1**~~ **CLOSED** — `test:edge:stripe-webhook-faith`.  
3. ~~**S2**~~ **CLOSED** — F7 cross-company in p-matrix promote gate.

**S0–S10 CLOSED 2026-09-27.** Grok daily follow-up **CLOSED 2026-09-27 @ d2e3200+**: P1 path hygiene (`e55c685` + taxonomy path-resolve + report-journey missing-flow hard-fail + `maestro:critical`→`flows/smoke`); P2 P04d JWT soft-delete DEV+PROD; P2 signup insert-if-missing DEV. Daily Grok bot should load this map as memory. Residual: PROD live-card signup HUMAN; Maestro N≥5 flake bar not measured on tip; UI-12 still Jest-only.

---

*S0–S10 + Grok P1/P2 residuals proved 2026-09-27. Daily Grok bot should load this map as memory.*
