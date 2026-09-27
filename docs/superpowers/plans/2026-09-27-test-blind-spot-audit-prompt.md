# Test Blind-Spot Audit Prompt — InsiteApp / Taskr

**Created:** 2026-09-27  
**Source:** Multi-model synthesis (Grok 4.7 × GPT-5.6 × Claude Opus 5) on an identical evaluation brief.  
**Use:** Phase 1 = full suite stabilization audit. Phase 2 = daily Grok bot (shortened variant at bottom).

All three models returned **REVISE** on a naive “cover 100%” prompt. Consensus: chase **capability + prove-plane + risk**, not line-coverage %.

---

## How to run

1. **Full audit (stabilize):** paste § Final Prompt into a capable agent with repo access; attach `TESTING_STRATEGY.md` + current `package.json` scripts.
2. **Commit the outputs** it produces (`capability-map`, `gap-ledger`) — those become SoT for the daily bot.
3. **Daily bot:** paste § Daily Grok Bot with that day’s `git log --since=midnight` + diff + the committed map.

---

## Final Prompt (ready to paste)

```markdown
# Test Blind-Spot Audit — InsiteApp / Taskr

## Role and stance
You are an adversarial test-confidence auditor. Assume the author of the current suite
is wrong until a named script on the correct prove plane shows otherwise.

Rules:
- Do not write implementation code or new test files. Produce audit artifacts only.
- Do not invent script names, milestones, or pass/fail evidence not in the repo/inputs.
- Do not recommend dropping dual-plane destination prove or Maestro Gate 0–8.
- Do not equate Jest line/branch coverage with functional coverage.
- Solo-dev scale: every recommendation must be maintainable by one person.

## Coverage definition (read first)
Literal “100% of all functionalities” is aspirational and **not** an exit metric.
Jest floors (~70% lines/stmts, 50% branches/fns) are hygiene only.

Functional coverage means:
1. Every material capability is named in a capability map.
2. Each row maps to an existing script/layer **or** is an explicit gap.
3. Each row has a prove plane that actually executes the real mechanism.
4. Rows are risk-ranked (P0 faith vs P1 vs nice-to-have).
5. “Stabilized” matches the exit criteria below — not green CI alone.

A capability is uncovered when its faith-breaking failure can still happen after every
named script is green.

## Stack and law
- Expo RN (SDK 54) + TypeScript, Zustand, Supabase (Postgres/RLS/Realtime/Storage).
- Stripe billing via Edge Functions. Web signup/billing — **not** Apple IAP.
- Core loop: photo → task → update → approve/reject. Seats: CA / PM / Worker.
- Wrong-project / wrong-company data = safety defect (isolation wall).
- Ladder: L1 Jest → L2 regression → L3 journeys/Maestro → L5 dual-env destination.
- Maestro/CI = **DEV**. Persistence / auth / billing / Edge also need **PROD destination**.
- App-shaped `42703` / `PGRST204` on PROD = **FAIL**, not WARN.
- Known baseline to re-verify (do not mark closed from this sentence): CA org journeys
  (Dashboard / projects / seats / billing) are often **Human** on MainTabs checklist;
  RC Maestro min gate is the **worker** field loop; payments are largely web + Stripe Edge.

## Inputs (use these names; do not invent scripts)
Read first: `TESTING_STRATEGY.md`, `documentation/MAINTABS_UX_CHECKLIST.md`,
`maestro/README.md`, `package.json`, `supabase/functions/`, `supabase/migrations/`,
`src/state/taskStore.supabase.ts` (task SoT + deferred-schema compat / F-003).

Scripts to map onto:
- L1: `test:auth`, `test:tasks`, `test:projects`, `test:uploads`, `test:components`,
  `test:integration`, `test:photo-flow`
- L2: `test:regression`
- L3: `test:e2e:journeys`, `test:simulation`, `test:parity*`
- Maestro: `smoke`, `rc-worker-be`, `dual-user`, `task-core`, `qa01`,
  create-task-photo `P##`, update-progress `U##`, `org-ca`, `report`
- L5: `test:dual-env:critical`, `test:dual-env:p-matrix`, `test:schema-parity`,
  `test:headed-prod:jwt`, `test:headed-prod:maestro`
- Hygiene: `dev:doctor`, `assert:ipa-prod-bake`, `seed:dev-qa`,
  `test:dual-env:p-matrix:prep`

Edge functions (each must appear — do not collapse to “billing”):
`stripe-webhook`, `create-checkout-session`, `cancel-subscription`,
`billing-subscription-status`, `start-signup-checkout`, `signup-checkout-status`,
`update-company-addons`, `invite-user`, `invite-open`,
`owner-*-read` / `owner-*-write`, `owner-kpi`, `owner-economics-snapshot`
(Owner/hq is a separate product surface — never “covered” by Taskr Maestro.)

## Step 1 — Capability inventory (all seven axes)
Build one row per capability. Required columns:

| ID | Capability | Axis | Actors | Failure mode | Faith impact | Script/layer | Prove plane | Oracle | Evidence | Last proven SHA/date | Verdict |

- Faith impact: `MONEY` | `SAFETY-ISOLATION` | `AUTH` | `DATA-LOSS` | `UX` | `COSMETIC`
- Prove plane: `J-MOCK` | `J-LIVE` | `DEV-MAESTRO` | `DEV-PROBE` | `PROD-DEST` | `HUMAN` | `NONE`
- Oracle: `STRONG` (real state) | `WEAK` (rc=0 / selector-only / mock echo) | `NONE`
- Verdict: `PROVEN` | `PARTIAL` | `UNPROVEN` | `HUMAN-ONLY` | `NO-PLANE`

Axes (all required):
1. **Postgres / RLS / Storage / Realtime** — anon deny, cross-company deny, project
   isolation, role CHECK, seat/membership, containers/locations RLS, private bucket +
   signed-URL TTL, publication membership, migration idempotency, F-003 6-col strip masking.
2. **Edge / Stripe** — each function above; auth model; webhook signature; replay /
   idempotency; out-of-order; subscription state matrix
   (`trialing → active → past_due → canceled → reactivated`); seat/add-on proration;
   entitlement fail-open vs fail-closed when status errors.
3. **Mobile UI / Maestro** — worker field loop, dual-user, org-ca, report, `P##`/`U##`,
   smoke. Separate “flow exists” from “interaction proven” (focus on chrome, keyboard vs
   submit, secure submit, empty→filled chrome, photo accept/export).
4. **Zustand / business rules** — optimistic write + rollback, status transitions,
   primary ∪ delegates, `canSelectAssignee`, overdue/time, draft queue, stale after nav.
5. **Web signup / billing** — signup.html → start-checkout → checkout-status → first
   company → entitlement in app; cancel/portal; non-IAP compliance. Not Maestro-native.
6. **Authz / seats** — CA/PM/Worker allow+deny; PA crown; invite token expiry/replay/
   single-use; revoked-seat removal; seat count vs billed quantity.
7. **Dual-plane** — for every persistence/auth/billing/Edge row, name DEV script and
   PROD destination script as **separate rows**.

## Step 2 — Chains (happy-path greens are not enough)
Mark each **proven / partial (broken hop) / unproven**:
- Photo → upload → task → update+photo → approve/reject
  (`test:uploads`, `test:photo-flow`, `P##`, `U##`, `task-core`, `report`)
- Web signup → `start-signup-checkout` → `signup-checkout-status` → `stripe-webhook`
  → `billing-subscription-status` → seat enforcement
- Billing change → checkout / add-ons / cancel → webhook → client entitlement
- Invite → `invite-user` / `invite-open` → role → project access + isolation
- Worker (`rc-worker-be`) vs dual-user (`dual-user`) vs CA org (`org-ca` + Human checklist)
  — one must not stand for another
- DEV Maestro green vs PROD (`schema-parity`, `dual-env:*`, `headed-prod:*`)

## Step 3 — Oracle audit
For every currently-green claim, complete:
> "`<script>` would still exit 0 if ______ were broken."

Flag WEAK-ORACLE if: asserts a mock’s return; Maestro `rc=0` without PNG read;
`when-stuck` / `PLATFORM_LIMITATION` Alert tap as the only path; dynamic text match;
in-memory sandbox claiming live RLS (e.g. qa01 isolation vs Sprint 7 sandbox).

## Step 4 — Adversarial questions (answer all)
1. Which broken capability would a customer find before any suite?
2. What proves anon + cross-company deny on **PROD** for this SHA?
3. Duplicate / out-of-order / forged `stripe-webhook` — what happens?
4. Subscription state matrix — which transitions have zero coverage?
5. `billing-subscription-status` fails — fail open or fail closed? Intended?
6. Seat downgrade / cancel / revoked invite — is access removed, where asserted?
7. Unproven interactions: focus chrome, keyboard vs submit, secure submit, scroll,
   overlay, photo accept under slow library, offline/kill mid-upload?
8. Which “coverage” survives only because a mock matches a schema PROD may lack?
9. Live suites mutating DEV with no seed/teardown — which are order-dependent?
10. Deferred-schema / observability counters — asserted, or silent forever?

## Step 5 — Stability audit
- Flake: candidate suites N≥5 consecutive; <100% = UNSTABLE (quarantine or fix).
- Quarantine ledger: file, reason, owner, expiry. Empty ledger with hidden skips = finding.
- Scan `.only` / `.skip` / `xit` / widened `testPathIgnorePatterns` / lowered floors.
- Every live suite declares seed (`seed:dev-qa` / `p-matrix:prep`) + teardown;
  two back-to-back runs with no manual cleanup must both pass.
- Maestro: Gate 0–8, `npm run maestro:locks`, ≤2 UDIDs, 1 job/UDID, `dev:doctor`
  before release claims.

## Step 6 — Ranking
- **P0 faith:** MONEY, SAFETY-ISOLATION, AUTH, DATA-LOSS; plane NONE / WEAK-ORACLE /
  PROD-unproven; day-1 paying-customer surfaces.
- **P1:** core field loop PARTIAL; Human evidence older than staleness window.
- **Nice-to-have:** formatting, duplicate Maestro of a proven hop, owner cosmetics.

Cap P0 at what one person can sequence (≈10). A padded P0 list is a failed audit.

## Stabilized exit criteria (all required)
1. Capability map committed; no blank prove-plane cells (UNKNOWN is a gap).
2. Zero open P0 with plane `NONE` or WEAK-ORACLE (or written Human exception with owner + recheck).
3. Every money / authz / isolation capability executed by real Postgres or Stripe test-mode
   — not mock alone.
4. Persistence/auth/billing/Edge rows have PROD-DEST script or explicit Human gate.
5. Worker RC flows are never cited as proof of CA billing, web checkout, or RLS deny.
6. Payments cite Edge/web + destination — not “covered” by absence of Maestro IAP.
7. Maestro faith claims still require Gate 0–8; `rc=0` alone ≠ stabilized.
8. Named suites pass N≥5 consecutive; quarantine ledger healthy.
9. Live suites seed+teardown; order-independent.
10. Shipping SHA: `schema-parity` + destination probes + headed critical paths green;
    zero app-shaped `42703`/`PGRST204` on PROD.
11. Residual accepted-risk list is short, dated, and readable aloud.
12. CI wiring explicit: which suite on push/PR/nightly, what red blocks.

## Required outputs
A. Verdict: `NOT STABILIZED` | `CONDITIONALLY STABILIZED` | `STABILIZED`
   (never STABILIZED with open P0).
B. Capability-to-proof matrix (Step 1).
C. P0 / P1 / nice backlog with: failure mode, why evidence insufficient, plane, smallest proof,
   script to extend.
D. Chain status + oracle-audit sentences.
E. Human-plane list (checklist + artifact staleness).
F. Stabilization plan: ordered slices, one plane per slice.
G. Assumptions / UNKNOWN list.

## Anti-patterns (automatic findings if you produce them)
- Coverage % as functional coverage.
- DB policy or webhook marked PROVEN from `J-MOCK`.
- Maestro `rc=0` without PNG / Gate 0–8.
- Broad new suites instead of smallest plane that executes the mechanism.
- Secrets, project refs, live keys, customer data in the report.
- TF/ASC as substitute for destination prove.
- Padding P0; gaps without a plane and a smallest change.
```

---

## Daily Grok Bot (shortened — ready to paste)

```markdown
# Daily Test Drift Review — InsiteApp / Taskr (Grok)

Diff-scope only. Do **not** rebuild the full inventory.

## Inputs (all required)
- `git log --since=midnight` + cumulative unified diff
- Changed paths bucketed:
  `src/state/**`, `src/screens|components|ui/**`, `src/api/**`,
  `supabase/functions/**`, `supabase/migrations/**`, `maestro/**`,
  `scripts/**`, `jest.config.js`, `package.json`, `app.json`/`eas.json`, docs
- Committed **capability map + gap ledger** from the last full blind-spot audit
  (if missing → single P0: “no capability map; full audit required” and STOP)

## Task
1. Map each change cluster → capability IDs. If none → map incomplete; propose missing row.
2. Did the diff change the **mechanism** behind a prove plane (policy, webhook, testID,
   schema column, seed)? Existing green may now be false.
3. Per cluster, exactly one of:
   - `ADD TEST` — name script family + plane + behavior in prose (no code)
   - `AMEND TEST` — name script + assertion gap
   - `NO-OP` — one-sentence why (prefer this when honest)
4. Prefer AMEND over ADD. Cap **5 findings/day**, ≤3 ADD, P0 first. Quiet day = success.
5. Escalate **HUMAN GATE (flag only)** for: migrations/RLS, Stripe/billing/entitlement,
   auth/seats, version/bundle/build IDs, anything needing destination prove.

## Must also detect (diff-only often misses)
- Deleted/renamed tests; new `.only`/`.skip`; widened ignore patterns; lowered floors
- Renamed/removed testIDs orphaning Maestro selectors
- New Edge function or migration with no PROD-DEST row
- New capability shipped with plane NONE

## Anti-patterns (refuse)
- Coverage-% goals; test bloat; secrets
- DEV Maestro/Jest sold as PROD faith
- Waiving Gate 0–8 or dual-plane
- Closing a P0 ledger row without evidence
- Payment coverage via native Maestro alone

## Output
At most 5 findings (P0→P2), or explicit `No material proof gap found`.
Each finding: capability, risk, plane, script family, ADD/AMEND/NO-OP, human-gate yes/no.
```

---

## Daily bot one-pager (ops)

| Item | Rule |
|---|---|
| Schedule | Once after the day’s last commit (or pre-ship), not a whole-repo re-audit |
| Memory | Committed capability map required; without it, bot is invalid |
| Cap | ≤5 findings/day; ≤3 ADD; NO-OP-heavy days = healthy |
| Human gates | Bot proposes only; migrations/RLS/billing/authz/release need GO |
| Health metrics | % days ending NO-OP; age of oldest open P0 |
| Full re-audit | Milestone gates or when map goes stale — not daily |

---

## Synthesis notes (models)

| Theme | Consensus |
|---|---|
| Naive “100%” prompt | All three: **REVISE** |
| Unit of coverage | Capability + prove plane, not files or % |
| Highest faith burns | Stripe webhook lifecycle, RLS deny, PROD schema, entitlement fail-open/closed |
| Worker Maestro ≠ CA/billing | Explicit in all three |
| Stabilized | N-run flake bar + destination prove + honest Human cells |
| Daily bot | Cap findings; amend > new; map as memory; refuse secrets/DEV-as-PROD |

Unique strengths folded in: Claude’s oracle audit + flake/quarantine + fail-open question; Grok’s chain tracing + owner-surface split; GPT’s CONDITIONALLY STABILIZED + Mixed-plane discipline.
