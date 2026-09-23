# Whole-app testing strategy (rectification)

**Date:** 2026-09-22  
**Status:** Stage C **CLOSED** (2026-09-22) — Stage D **CLOSED** (2026-09-23) — Stage E pipeline  
**Supersedes:** first draft of `2026-09-22-critical-surface-test-stages.md` domain-first Stages 0–5  
**Gate A (strategy):** Opus (`bc-3b0ff084`), GPT (`bc-332939a3`), Sonnet (`bc-c49bd7d8`) — identical brief; all **REVISE**.  
**Human GO Stage A:** 2026-09-22. **Stage B:** 2026-09-22. **Human GO F6 RLS:** 2026-09-22 (`20260922000100` + `20260922000200`). **Stage C close:** 2026-09-22 (headed Metro→PROD + S4). **Stage D close:** 2026-09-23 after Gate B ITERATE re-prove (`docs/superpowers/reports/2026-09-23-stage-d-close.md`).

---

## Verdict from multi-model review

| Model | Verdict | Organizing principle |
|---|---|---|
| Opus | REVISE | Hybrid: risk-ranked paths as spine; domains/personas as indexes; layers as proof obligations |
| GPT | REVISE | Hybrid: risk-ranked persona journeys; domains as inventory only |
| Sonnet | REVISE | Hybrid: risk-ranked critical paths first; domains + journeys as completeness catalog |

**Consensus:** Do not throw out the C/D/P proof idea. Do not organize the *ship gate* as five product-domain tables. Theme suites (photos, task detail) stay as specialists. The prior draft deferred the Report class too far, minted a 5th overlapping script name, and allowed deleting red “critical” tests to get green.

---

## Organizing principle (SoT)

**Primary:** risk-ranked critical paths, each with required proofs.

**Indexes (not the gate):** product domains (auth / company / users / tasks) and personas (anonymous, CA, field creator, assignee, report triager).

**Proof ladder (per path):**

| Code | Name | Catches | Cannot satisfy alone |
|---|---|---|---|
| **L** | Logic / shape | Validation, status mapping, adapter contracts | DB CHECK, RLS, Edge |
| **D** | DEV runtime | Taps, shells, keyboard, two-user loops | PROD schema |
| **P** | PROD destination | CHECK, RLS, JWT write, Edge | UI polish |
| **H** | Headed destination | Metro→PROD user JWT path (no clearState) | Full Maestro journey matrix |

**Class fixes beat one-off cases.** The Report failure was “code enum ⊆ live PROD CHECK.” Fixing only `reported` leaves the next status/role value exposed. Prefer: schema fingerprint includes constraints + assert TypeScript unions ⊆ PROD `pg_get_constraintdef`.

**Feature-change law (top of this file forever):** If a change touches a ship path, name the path ID in the PR/NOW and update that path’s L/D/P in the **same** change. No path update = not done. A green photo suite does not cover a different path.

---

## Ship paths (the bar)

Only these paths are the whole-app gate. Everything else is specialist.

### Identity & shell

| ID | Path | L | D | P / H | Notes |
|---|---|---|---|---|---|
| S1 | Known email → password → correct shell (CA vs field) | authStore, login adapter | Maestro login + shell assert | P01 | |
| S2 | Logout clears workspace; next login clean | clearWorkspaceSession | Maestro logout | — | |
| S3 | Invite → Set password | inviteSignInLink, mustSetPassword | DEV headed account lifecycle | P02 shape | No live email in CI |
| S4 | Release IPA bake = PROD ref; ignores stored DEV URL | databaseConfigResolve | — | IPA identity assert at CBP | Automate; do not leave manual |

### Org (Company Admin)

| ID | Path | L | D | P / H | Notes |
|---|---|---|---|---|---|
| O1 | CA shell = Dashboard only (no Activity/Camera/Tasks) | navigator | Maestro CA one-shot | — | Seed a CA Maestro account first |
| O2 | Create project + place one member | createProjectTeam, projectStore | Maestro CA one-shot | P03 JWT | |
| O3 | Invite teammate (validation; worker default) | inviteUser | Invite sheet Maestro (no send) | P02j success shape | |
| O4 | Last admin cannot be removed/demoted | userStore guards | — | **P case under JWT** | App-only today = same class as Report |
| O5 | Plan = web manage; no in-app Checkout | CompanyPlan alerts | — | P10 status; P09 skip forever | |

### Field lifecycle

| ID | Path | L | D | P / H | Notes |
|---|---|---|---|---|---|
| F1 | Create task (+ one photo) | test:tasks | **P01** | P04 / P04j | RC min |
| F2 | Assignee accept / decline | workflow Jest | W-D01/D02, DU-D01 | P05 | |
| F3 | Update progress (+ one photo) | update adapter | **U01** | P05j | RC min |
| F4 | Submit review → creator approve → archive | acceptance UI | **DU-H01**, W-D07/D10 | P06 | Two sims |
| F5 | Report issue → `reported` + `issue_reported` → resolve or promote | reportTriageLifecycle | **new** Report→PM Maestro | **P11** (+ triage if promote is JWT-safe) | Pull forward immediately |
| F6 | Wrong-project / wrong-company data invisible | — | optional headed | **JWT negative read/write** | Safety; not QA01 sandbox |

### Destination proof (always with the bar)

| ID | Path | Notes |
|---|---|---|
| Z1 | Schema parity includes CHECKs / enums / defaults | Extend `assert-schema-parity-dev-prod.py` |
| Z2 | Code unions ⊆ PROD constraints | Status (and later role/category) |
| Z3 | Metro→PROD headed smoke (no clearState) + `headed-prod-qa-smoke.py` | Keep; do not ban PROD headed |

---

## Specialist suites (not the bar)

Run when their modules change; never substitute for S/O/F/Z:

- Photo depth: P02–P22, U02–U12, `test:photo-flow`, `test:picker-timing`
- Task Detail header/layout Jest (repair, but not journey coverage)
- QA01 A–D (sandbox rubric; human PNG sign-off)
- Marketing / store / iPad screenshot YAML (asset generators — move out of “gate” mental model)
- HQ `apps/owner` (separate product)

---

## Canonical ship gate (one name)

Do **not** mint `test:ship-core`. Extend existing `test:critical` so there is one SoT name.

**Required green before App Store / PROD TF claims for field+org critical paths:**

```bash
npm run dev:doctor
npm run seed:dev-qa                    # fixture precondition; fail loud if still broken
npx tsc --noEmit
npm run test:critical                  # single named L gate (+ dual-env:critical); no test:ship-core
npm run test:schema-parity             # Stage B: columns+CHECKs + TaskStatus ⊆ PROD (incl. reported)
npm run test:schema-parity:self        # offline: stripping reported fails gate logic
npm run test:dual-env:p-matrix         # includes P11 + F6 (membership wall; interim dropped 2026-09-22)
npm run test:e2e:maestro:rc-worker-be  # P01 + U01
npm run test:e2e:maestro:dual-user     # DU-H01
# when landed:
#   npm run test:e2e:maestro:org-ca   # Stage D: O1 reachability + O2 + O3 + S2 + S3 (DEV)
#   report Maestro (F5)
# Canonical ship walk (SoT) — add after dual-env / before Maestro RC:
#   npm run assert:ipa-prod-bake:self   # Hermes positive + negative matrix (needs .eas IPA)
#   npm run test:headed-prod:jwt        # JWT destination (not headed UI)
#   npm run test:headed-prod:maestro    # Metro→PROD headed (no clearState; sims required)
bash ./scripts/maestro/run-local.sh test maestro/flows/metro-prod-headed-smoke.yaml
python3 scripts/supabase/headed-prod-qa-smoke.py
# at CBP (hard gate — also wired in build-and-submit.sh production):
#   npm run assert:ipa-prod-bake -- <path-to-local.ipa>
```

Rules:

- Dual-env critical + p-matrix: **DEV-green is not PROD-green**. Gate must fail if required PROD cases fail. Prefer also failing on required DEV cases once fixtures are healthy (or split fixture health explicitly).
- P-matrix must not leave QA dogfood passwords mangled (restore or dedicated probe users).
- Service-role-only probes cannot satisfy S1/O2/F4 — JWT role-specific allow/deny required for those IDs.
- Deleting a red critical test is forbidden unless the product behavior is removed and a replacement proof is named in the same change.

---

## Implementation stages (revised)

### Stage A — Honesty (same day)

1. Repair the five red Jest files. For `TaskDetailScreen.header` / `output.continuity`: **first** decide if `TaskDetailScreen.tsx` can crash when `continuity` is undefined — if yes, that is a bug-fix, not a test soften.
2. Fix `taskWorkflows` mock for `task_assignments` (mock drift, not product).
3. Make `seed:dev-qa` part of gate setup; stop treating “no QA user” as eight product FAILs.
4. Designate **`test:critical`** as the single named gate; do not add `test:ship-core`.
5. **Land P11 Report** in `probe-p01-p10-dual-target.py` now (insert `reported`, activity `issue_reported` without top-level status column, resolve, cleanup). Ad-hoc proof already passed 2026-09-22.

**Done when:** `tsc` + `test:critical` exit 0; P11 PASS on PROD; p-matrix starts on DEV after seed.

**Stage A close evidence (2026-09-22):**
- Continuity: live adapter always returns `continuity`; screen still crashed on undefined → optional-chain bug-fix in `TaskDetailScreen.tsx` + complete loading fixture (not soften).
- Five red Jest repaired: header, UpdateProgress header (`form.screenTitle`), `taskWorkflows` NEW-table mock fallback, authBootstrap `setState` mocks, shell journey `userAssignments` seed.
- `seed:dev-qa` run green; p-matrix `pick_qa_user` includes Maestro seed emails; `test:dual-env:p-matrix:prep` added (not a 5th ship-core name).
- P11 landed: PROD+DEV PASS (`activity_http=201` / `resolve_http=200`); PROD gate includes P11; DEV required P01/P04/P11.
- Local key resolve for expired Management token (DEV `.env` + PROD `.cache/env-cutover/insite-prod.env.local`); DEV dialect = NEW (parity).
- `npx tsc --noEmit` rc=0; `npm run test:critical` exit 0 (Jest + dual-env:critical GO, 0 FAIL).

### Stage B — Contract class (schema)

1. Extend `assert-schema-parity-dev-prod.py` to CHECK constraints (and preferably enums/defaults/triggers).
2. Assert `TaskStatus` (and later role/category) unions ⊆ live PROD constraint definitions.
3. Add F6 isolation: JWT user A cannot read/write project B tasks.

**Done when:** Removing `reported` from TS **or** from PROD CHECK fails the gate. Isolation JWT case fails if RLS is open.

**Stage B close evidence (2026-09-22):**
- `assert-schema-parity-dev-prod.py` extended: CHECK fingerprint DEV≡PROD (30/30), enums/defaults/triggers prefer-match; pooler psql when Management token 401.
- `TaskStatus` ⊆ PROD `tasks_status_check` + hard require `reported` in both; `npm run test:schema-parity` **ok=true**; `test:schema-parity:self` proves stripping `reported` fails gate logic.
- **F6** landed in p-matrix (JWT subject ≠ foreign owner/assigner; no UPA). Initially DEV+PROD **FAIL `RLS-open`** (`tasks_authenticated_interim` ALL + admin OR on SELECT/UPDATE). **Human GO 2026-09-22:** applied `20260922000100_drop_authenticated_interim_rls.sql` then `20260922000200_tasks_membership_wall_no_admin_bypass.sql` DEV→PROD. Re-prove: **F6 PASS** both planes; p-matrix promote gate green.
- PROD/DEV promote gates include F6.

### Stage C — Destination headed + identity

**Status:** **CLOSED (2026-09-22)** — C1 headed Metro→PROD PASS (PNG read); C2 S4 hard gate; C3 seat pin. Evidence: `docs/superpowers/evidence/2026-09-22-stage-c/stage-c-close-result.json`.

**Done when:** Headed PROD PASS recorded on the same SHA; IPA wrong-ref would fail CBP.

**Stage C close evidence (2026-09-22):**
- Gate A (validation + risks) both REVISE → folded before Builder.
- **C1:** Metro PROD bake via temp `.env.local`; `metro-prod-headed-smoke.yaml` rc=0 · 91s on iPhone 17 Pro Max `B7B2640C…`; runtime PROD-ref assert (`login-active-db-host` / `dashboard-active-db-host`); F3 via progress dock (`report-reply-composer__*`) with unique `MetroPROD-progress-*` timeline marker; PNGs under `docs/superpowers/evidence/2026-09-22-stage-c/headed/`. JWT smoke separately PASS.
- **C2:** `scripts/eas/assert-ipa-prod-bake.sh` Hermes `strings` on real TF 278 IPA; negatives self-test; wired in `build-and-submit.sh` + CBP rule before every submit.
- **C3:** actor=`systemPermission` vs candidate=`seatClass` asymmetry locked in Jest + docs.
- Tip during prove: `ed87a32` (dirty Stage C tree). ASC Public/Submit untouched.

#### Stage C execution plan (lock before Builder)

| Track | Deliverable | Files (expected) | Proof |
|---|---|---|---|
| **C1 Z3** | Wire headed Metro→PROD into named ship walk + record evidence on tip SHA | `package.json` (`test:headed-prod` — no `test:ship-core`); keep `maestro/flows/metro-prod-headed-smoke.yaml` (no `clearState`); `scripts/supabase/headed-prod-qa-smoke.py`; evidence JSON+PNGs under `docs/superpowers/evidence/` | **Separate** JWT vs headed verdicts. Headed: Maestro rc=0 + PNG read **and** runtime assert active endpoint = PROD ref (banner/testID or eval — not `__DEV__` forgeable by stale AsyncStorage). Update path: unique marker + visible or JWT read-back (not optional-only). Evidence: `appSha`, dirty-tree flag, Metro start notes, UDID, PNG inventory |
| **C2 S4** | Automate IPA / bake identity assert; **mandatory on every CBP submit path** | New `scripts/eas/assert-ipa-prod-bake.sh` + `npm run assert:ipa-prod-bake`; hook **both** `build-and-submit.sh` **and** document/invoke from CBP rule after `build-local.sh` before any `eas submit` | PROD ref present via `strings` on Hermes `main.jsbundle`; DEV ref absent; bundle id + CFBundleVersion. Negative matrix: DEV-only, missing PROD, both refs, malformed IPA → non-zero. Record IPA sha256 + build# in evidence; lineage note to headed SHA (buildNumber-only dirty after headed is allowed and must be stated) |
| **C3 Seat pin** | Single SoT for deployable-seat → privilege/assignee rank | Pin exports: `seatClassForUser`, `resolveAssigneeCandidateRoleFromUser`; document actor rank = company permission vs candidate rank = seat (intentional asymmetry); Jest locks both sides | Existing + any gap Jest green; no product change unless drift bug |

**Gate A fold (2026-09-22) — [validation](bc-e60b6c46-e735-5a54-9553-c944022a1c75) + [risks](bc-38da141a-c1c7-5d68-bb53-60fa993ddfd3) both REVISE:**

| Sev | Finding | Plan delta |
|---|---|---|
| C | Headed can run on stale DEV AsyncStorage while claiming PROD | C1: runtime PROD-ref assert before writes |
| C | Update Progress taps `optional: true` → F3 false PASS | C1: hard-require submit + unique marker + fail if submit chrome missing |
| C | S4 string-scan unproven vs Hermes | C2: positive proof **must** use a real production IPA (`strings` on Hermes `main.jsbundle` — already verified on TF 278 IPA); plain-text mock only for negative fixtures, not as sole self-test |
| H | `git rev-parse` ≠ Metro bundle / IPA identity | C1+C2: dirty flag + IPA sha256 + build#; buildNumber-only dirty after headed is allowed and must be stated |
| H | Sim-locked → JWT substitutes for headed forever | **No substitute:** if sim unavailable, Stage C stays OPEN in NOW with owed headed date; JWT alone ≠ Done |
| H | S4 only soft-hooked / one submit path | C2: hard call in `build-and-submit.sh` before `eas submit` **and** CBP rule requires assert after `build-local.sh` before any submit |
| H | S4 refs ≠ source SHA | C2: checksum + lineage in evidence |
| M | Seat actor vs candidate asymmetry underspecified | C3: lock policy text + Jest (actor=`systemPermission`, candidate=`seatClass`) |
| M | JWT smoke ≠ headed UI | Evidence labels must split planes |
| M | PROD smoke orphans task_files/stars | Defer cleanup cadence (residual) |
| L | Hardcoded App Review Site / sara | Defer until seed breaks |

**Assumptions (non-blocking):**
- Headed Maestro uses existing PROD creds (`MAESTRO_PROD_EMAIL` / password) and App Review Site project id already in the YAML — no new PROD users.
- S4 assert uses `strings` on Hermes `Payload/*.app/main.jsbundle` + Info.plist; no EAS cloud.
- Seat “pin” = contract lock + docs for Stage D, not new admin Maestro cases.
- Physical-device camera / Stage D–E / ASC Submit / PROD orphan cleanup deferred (Gate A residual).

**Out of scope:** Stage D org Maestro, Stage E journeys, ASC Public/Submit, schema/RLS, new `test:ship-core`.

**Done when (operationally falsifiable):**
1. Headed Metro→PROD PASS with PNG read + runtime PROD-ref assert + **hard** update submit/marker (no optional F3), evidence `appSha` matches pre-build tip (dirty flag explicit).
2. `assert:ipa-prod-bake` exit 0 on a **real** production IPA; fails negative matrix (DEV-only / missing PROD / both refs / malformed); `build-and-submit.sh` + CBP path cannot submit without assert exit 0.
3. Seat SoT + actor/candidate policy locked in Jest.
4. Sim unavailable ⇒ Stage C remains OPEN (not closed on JWT alone).

**Validation plan:**
1. Gate A ≥2 plan critiques → fold C/H before Builder (**done**).
2. Builder implements C1–C3 with Gate A deltas above.
3. Reviewer 0 C/H.
4. Prove: `tsc`; seat Jest; S4 on TF 278 IPA + negatives; JWT smoke **and** headed Maestro (sims currently free); evidence rules.
5. Gate B validation critique → Judge vs Done criteria.

### Stage D — Org + account lifecycle (DEV Maestro)

**Status:** **CLOSED (2026-09-23)** — Gate B [Proof Adversary](bc-bc70dcb4-de85-5d50-96b0-7804c21ffe59) ITERATE → Criticals cleared via canonical `rc-worker-be` + full dual-user + ordered p-matrix→re-seed. Evidence: `stage-d-close-result.json` + `docs/superpowers/reports/2026-09-23-stage-d-close.md`.

Prerequisite: name + seed a **Company Admin** Maestro account in the MAINTABS account-partition table.

Exactly three org Maestro cases: CA management reachability, O2 create+member, O3 invite validation. Plus S2 logout / S3 invite→password. Canonical O1 Dashboard-only stays OPEN debt.

**Done when:** Those Maestro cases PASS headed on DEV; P03/P02j/P08j re-proved on PROD (honest labels); O4 last-admin is a **safe reporting** P case (non-destructive); post-John-demotion `rc-worker-be` + `dual-user` PASS; passwords restored after p-matrix.

#### Stage D execution plan (lock before Builder)

| Track | Deliverable | Files (expected) | Proof |
|---|---|---|---|
| **D0 Seed + partition** | Carol CA + spare CA + invitee; John field; password reset | `seed-dev-qa-after-parity.cjs`: ordered upsert — create/ensure **Carol** + **spare admin** (`dave.adminb@test.com`) **before** demoting John; idempotent `auth.admin.createUser` + **always reset password** `password123` for Carol/John/Alice/spare/invitee; refuse exit if `admin_count < 1` after seed; Carol landing contract: company membership + optional Project A UPA (boot asserts reachable shell); name F6 DEV subject explicitly (not John if that flips F6); `MAINTABS` partition: Org CA = Carol on 17 Pro Max | Seed exit 0 DEV-only; Carol+spare `admin`; John `member`+`pm`; password grant works for Maestro actors |
| **D1 Reachability** | CA → Company management | `maestro/flows/org/O1-ca-shell.yaml` + `_boot-carol.yaml` | Pin `admin-stat-section-team` **or** one `admin-quick-action-*` (not flaky wildcard). Honesty: if CA taps a field tab, no crash / honest empty (optional one-shot). **Canonical O1/A-D01 Dashboard-only = OPEN debt** — same-change MAINTABS note what O1 actually proves. PNG `O1-*.png` |
| **D2 O2 create+member** | Create project + place member + DB readback | `O2-*.yaml`; `ProjectForm` add `create-project__submit` + name/desc/location/client testIDs as needed | Fill **all** `validateForm` requireds: name, description, location, client name, endDate>startDate; place Alice via `project-form-team-role-member-*`; UI + JWT/DB readback; cleanup `StageD-O2-*` |
| **D3 O3 invite validation** | Required-field + structured-fail legs | `O3-*.yaml`; include `invite-name` | (a) empty → assert **message text** “Name and email are required” (not mere visibility); (b) `*.invalid` structured-fail → non-`unknown_error`; assert worker selected-state; D0 ensures seat headroom (no seat-upsell Alert hijack) |
| **D4 S2 logout** | Cross-identity workspace clear | `S2-logout-relogin.yaml` | **Logout Carol → login John** (A→B): John field shell + Company management **absent**; no Carol-only project bleed. Pin UDID in evidence; point-tap fallback last-resort only |
| **D5 S3 invite→password** | Real DEV invite lifecycle | `S3-*.yaml` + disposable invitee | Invite link → session → `set-password-screen` → set password → relogin. Fixture-only = **partial / owed**, never S3 PASS. Seed resets invitee flag between runs |
| **D6 P + O4 reporting** | Re-prove + **safe** O4 | `probe-p01-p10-dual-target.py` | Re-prove P03 (service-role noted), P02j (structured-error only), **P08j**. **O4 (default):** disposable single-admin probe company (or DEV spare-admin company); sole-admin precondition; JWT demote attempt only (no soft-delete of live dogfood admin); read-before / restore-after / verify unchanged; **O4 is REPORTING — not in PROD promote `gate_ids`** until Human GO lands a DB last-admin guard (owed milestone). Open write → restore + report FAIL/owed — do **not** permanently red CBP Gate 0. O4 subject ≠ P08j subject; O4 runs last. After any p-matrix: **re-seed** Maestro passwords |
| **D7 Wire + order** | Hardened org runner + prove order | `scripts/maestro/run-org-ca.sh` + `test:e2e:maestro:org-ca` | Order: **seed → Maestro org → (optional rc/dual-user) → p-matrix → re-seed**. Per-flow PNG names/counts, hard positive post-conditions (no silent `when:` skip), Metro preflight, stop-on-fail, manifest; SHA + dirty + diff inventory. Post-John-demotion: `test:e2e:maestro:rc-worker-be` + `test:e2e:maestro:dual-user` required in Done |

**Gate A fold — [validation](bc-614a65d4-64ce-5938-b019-35f17a959dbb) + [risks](bc-12de1e04-ef80-575d-8638-c402a9f66172) both REVISE (2026-09-22):**

| Sev | Source | Finding | Plan delta |
|---|---|---|---|
| C | both | O1 ≠ Dashboard-only | Reachability only; A-D01 stays OPEN |
| C | risks | O4 destructive PROD / kills Carol on DEV | Disposable subject; restore-guaranteed; two DEV admins |
| C | risks | O4 in promote gate = permanently red | **Reporting only** until Human GO DB guard |
| C | risks | `mint_qa_jwt` mangles passwords | Seed always resets; p-matrix → re-seed |
| C | risks | John demote invalidates RC evidence | Done requires post-demotion `rc-worker-be` + `dual-user` |
| C | val | O4 false denial | Denied + row unchanged; restore on mutation |
| H | risks | D3 empty-form false PASS | Assert error **text**; structured-fail leg |
| H | risks | Seat-limit hijacks invite-error | Seat headroom in D0; assert string |
| H | risks | Missing submit testID + required fields | Add testIDs; enumerate 5 fields |
| H | risks | S2 same-identity | Carol→John cross-identity |
| H | risks | S3 fixture launder | Real invite path required |
| H | risks | Carol landing undefined | D0 landing contract + boot assert |
| H | risks | Conditional-skip / dirty tip | Hard post-conditions; SHA+dirty+diff |
| H | val | P02j/P03/P08 honesty | Labels + P08j + O2 readback |
| M–L | both | (selected seat, F6 subject, cleanup, MAINTABS note, …) | Folded into D0–D7 rows above |

**Assumptions (non-blocking):**
- Passwords = `password123` for all Maestro DEV actors after every seed.
- O4 DB last-admin guard = **owed Human GO** (danger gate); Stage D ships the reporting probe only.
- Dashboard-only tab restore = product Human GO (out of Builder).
- Clipboard deep-link flaky → document owed; do not label fixture S3 PASS.
- One UDID (17 Pro Max) for org; resource-lock `user:carol.admina`.

**Out of scope:** Stage E product journeys (beyond post-demotion RC re-prove), ASC Public/Submit, CBP/TF, Dashboard-only restore, Stripe/Checkout, `M-AUTHZ-02`, PROD clearState, deleting red tests, `test:ship-core`, applying O4 RLS without Human GO.

**Done when (operationally falsifiable):**
1. MAINTABS names Carol Org CA; seed: Carol+spare admin, John field, passwords reset, `admin_count≥1`.
2. DEV Maestro: reachability + O2 + O3 (text asserts) + S2 Carol→John + real S3 PASS; named PNGs + manifest.
3. Canonical O1 Dashboard-only recorded **OPEN**; A-D01 note updated.
4. Post-demotion `rc-worker-be` + `dual-user` PASS.
5. p-matrix: P02j/P08j/P03 re-run; O4 reporting case present (safe); promote gate **not** wedged red by O4; re-seed after.
6. Evidence: appSha + dirty + diff inventory; ASC untouched.

**Prove order:** `dev:doctor` → `seed:dev-qa` → `tsc` → `test:critical` → `maestro:locks` → `test:e2e:maestro:org-ca` (PNG read) → `test:e2e:maestro:rc-worker-be` → `test:e2e:maestro:dual-user` → `test:dual-env:p-matrix` → `seed:dev-qa` (password restore).

**Dishonest waivers (forbidden):** reachability as O1 Dashboard-only PASS; fixture as S3 PASS; P02j 4xx as invite success; O4 open write as Judge GO; O4 in promote gate while known-open; HTTP deny without row-unchanged; service-role as JWT authority; Maestro rc=0 without semantic PNGs; same-identity as S2; reuse prior SHA evidence; skip post-demotion RC re-prove.

### Stage E — Field journeys rollup

1. J3 = DU-H01 (already).
2. J5 decline = DU-D01 in the ship walk (not only file tree).
3. J4 = new Report → PM resolve/promote Maestro.
4. Re-run O2 as narrative, not a second product.

**Done when:** DU-H01 + Report Maestro PASS with PNGs; P04–P06 + P11 PASS on same SHA.

---

## What this rectifies vs theme-centered tests

| Before | After |
|---|---|
| Photo/task-detail themes implied “covered” | Specialist only; ship paths named |
| Layers green while rows had no owner | Every ship path owns L/D/P |
| Report known in Jest, absent from P/D | P11 immediate; class fix in Stage B |
| Many gate script names, some red unnoticed | One `test:critical` SoT |
| Delete red tests to get green | Forbidden without replacement proof |
| “PROD never gets Maestro” | No clearState Maestro; headed Metro→PROD stays |

---

## Open risks (tracked, not all Stage A)

- Money path (Checkout) stays Human; record one manual receipt walk per release.
- Entitlement after cancel/expiry under-tested.
- Offline / poor network / store rehydrate across TF upgrades.
- Edge response-shape drift (count parity ≠ behavior).
- Storage ACL / signed-URL re-sign.
- Notifications / deep links.
- Stripe fixtures for canceled-plan without charging.

---

## Gate A confidence

- Plan critique: **3 models**, identical brief (Opus, GPT, Sonnet).
- Critical/High consensus folded into this rewrite before Builder.
- No Builder work started from this file until Human **GO** on Stage A.
