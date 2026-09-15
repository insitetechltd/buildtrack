# DEV↔PROD comprehensive QA — 2026-09-14

**Verdict: NO-GO** — PROD is not parity-safe for dogfood. Dual-path covers some renames; task write shape and promotion gates do not.

**Agents:** Gate A risks ([630f8f69](630f8f69-5999-49a8-a599-77d114288072)) · Gate A validation ([c7052f9d](c7052f9d-fe2e-4987-a908-02391a08c9ea)) · dual-path explore ([04cef9a4](04cef9a4-72e5-4e8f-a9a6-f26f79ed344c))  
**Shared brief:** `.cache/dual-env-qa-20260914/SHARED_EVALUATION_BRIEF.md`  
**Artifacts:** `.cache/dual-env-qa-20260914/{schema-edge-diff.md,probe-critical-paths.txt}`

---

## Why so many problems (consensus)

1. **Four layers promote independently** (app IPA · SQL · Edge · secrets) with **no PROD migration ledger** (`schema_migrations` missing on PROD).
2. **DEV = evolved live schema; PROD = greenfield** — not a clone. Dual-path is the product strategy and is **uneven** (UPA/invite partial; task writes still DEV-shaped).
3. **Proof is wrong-shaped** — Maestro/CI on DEV only; dual-env probe exits 0 while documenting PROD 42703 as WARN; Edge checks are empty-body 400s; no authenticated invite smoke.
4. **PostgREST fail-closed** — selecting both sides of a rename aborts; non-Error throws became `unknown_error` (today’s invite).
5. **“Documented WARN = GO”** trains the team to ship known PROD breaks.

---

## Live write-path proof (this session)

Against PROD `jcnzjigxgkzhjsaekoqz` (service role):

| Probe | Result |
|---|---|
| `tasks.current_status` | **42703 missing** |
| `tasks.assigned_to` | **42703 missing** |
| `task_assignments` | **exists** |
| insert with `current_status`+`assigned_to` | **PGRST204** |
| insert `status=pending` | **23514** check fail |
| insert `status=in_progress` (no DEV cols) | **OK** |
| update `users.role` | **PGRST204** |
| update `users.system_permission` | **OK** |

Invite Edge fix (dual-path seat load + `throwAsError`) deployed DEV+PROD today; authenticated fresh invite smoke PASS after deploy. **Does not** fix Create Task / assignee / role-write.

---

## Findings (merged, severity-ordered)

| Sev | Area | Finding |
|---|---|---|
| C | app+schema | Task create/update still writes DEV-only `current_status` / `assigned_to`; PROD uses `status` + `task_assignments` |
| C | process | Dual-env probe prints GO with PROD `assigned_at` 42703 as WARN; never calls `invite-user` |
| C | process | PROD has no `schema_migrations` — promotion unverifiable |
| H | edge | Billing/signup version lag (`create-checkout-session` 19↔8, `stripe-webhook` 27↔10, …) |
| H | edge | `billing-subscription-status` / `cancel-subscription` still SELECT `role,system_permission` together |
| H | app | User role mutations write `role` only → PGRST204 on PROD |
| H | app | AsyncStorage URL override residual on old IPAs / Debug |
| M | schema | 65/27 column split + 23 nullability mismatches; Create may hit NOT NULL |

**Allowed intentional drift:** owner_* tables + owner-* Edge on DEV only; Stripe test↔live pairing.

---

## Top 5 must-fix

1. **Stop shipping DEV-shaped task writes to PROD** — dual-path or strip `current_status`/`assigned_to`; write `task_assignments` on PROD.
2. **Strict dual-env gate** — FAIL on app-shaped 42703/PGRST204; authenticated invite smoke both refs; never GO with open WARNs.
3. **PROD applied-migration ledger** — refuse promote without version proof.
4. **Reconcile billing/signup Edge** to same git SHA on PROD; grep-ban dual-column ACL selects.
5. **User ACL writes** — dual-path `system_permission` on PROD (not `role` only).

---

## Promotion hardening (minimum before next PROD TF)

1. `npm run test:dual-env:critical` in **strict** mode (WARN→FAIL for UPA/task write probes).
2. Schema-edge diff for touched tables; record allowed-drift manifest.
3. Static: no `.select(..., role, system_permission)`; no bare `.order('assigned_at')` outside helper.
4. Deploy touched Edge to **both** refs; authenticated `invite-user` smoke on PROD.
5. Production-profile IPA headed smoke: login + projects + invite; assert runtime ref = `jcnzjig…`.

---

## Judge score (this QA cycle)

| Dimension | Score | Note |
|---|---|---|
| Spec clarity | PASS | Brief locked; equal footing |
| Evidence | PASS | Schema/Edge/probe + live write probes |
| Multi-critique | PASS | 3 agents, consensus NO-GO |
| Fix completeness | N/A | Analysis only — implement next |
| Ship readiness | **FAIL** | NO-GO for PROD dogfood parity |

**Quality Judge: FAIL to close as ship-ready. ITERATE on Top 5.**
