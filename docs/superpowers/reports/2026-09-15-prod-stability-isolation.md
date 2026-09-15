# PROD stability isolation (2026-09-15)

**Program:** PROD NEW SoT Harden  
**App SHA probed:** `4286566ce087cfb9e51f08380cf09ac3a5c94f20`  
**Refs:** DEV `zusulknbhaumougqckec` (OLD control) · PROD `jcnzjigxgkzhjsaekoqz` (NEW QA)

## Verdict

**Unstable surface is primarily app contract lag vs intentional NEW schema**, not Metro→TF “logic drift.” Edge ACL both-column SELECTs were a secondary class (invite fixed earlier; billing/cancel fixed this cycle). Schema on PROD is coherent NEW greenfield. Plane-mismatch remains a standing footgun (AsyncStorage / wrong bake) and must be asserted every run.

Metro/DEV green does **not** imply PROD green until the same app SHA dual-targets PROD with hard ref assert.

## Evidence inputs

| Phase | Artifact |
|---|---|
| 0 | `docs/superpowers/evidence/2026-09-14-new-schema-dependency-matrix.md` |
| 1 | `.cache/prod-new-sot-20260915/phase1-diffs.{md,json}` (+ dual-env bake / edge under `.cache/dual-env-qa-20260914/`) |
| 2 | `.cache/prod-new-sot-20260915/phase2-p01-p10-matrix.{md,json}` · `docs/superpowers/evidence/2026-09-15-phase2-p01-p10-matrix.md` |

## Isolation by layer

### 1. App contract lag (primary)

Phase 0 matrix: Taskr still authored against evolved OLD (`assigned_to`, `accepted`, `current_status`, `users.role`, attachments arrays, stars). PROD July greenfield expects `task_assignments`, single `tasks.status`, `users.system_permission`, `task_files`.

**This cycle cutover (app, no OLD columns added to PROD):**

- `src/state/schemaDualPath.ts` — ACL write dual-path; junction sync/hydrate; evolved-column strip on update
- Wired into `authStore`, `userStore.supabase`, `taskStore.supabase` (list-by-assignee junction fallback; update strip + junction; fetch hydrate; create already stripped+junction)
- Compat remain: `taskDeferredSchemaCompat.ts` OPTIONAL_EVOLVED strip

**Phase 2 PROD P01–P08 + P10:** PASS on named SHA with ref assert (P09 Human-GO-skip for live Checkout).

### 2. Edge lag (secondary, narrowed)

| Function | Issue | Status |
|---|---|---|
| `invite-user` | both-column SELECT → `unknown_error` | Fixed+deployed prior |
| `billing-subscription-status` / `cancel-subscription` | both-column SELECT first | Fixed this cycle; deployed DEV+PROD |
| Billing Checkout | Live charge | P09 Human GO each time |

### 3. Schema (PROD NEW intentional)

Phase 1 catalog: DEV-only evolved cols vs PROD-only NEW tables/cols. Drift tagged intentional NEW / DEV debt — **not** a reason to re-add OLD columns to PROD.

No wave-1 DDL applied. Additive/reshape only if Phase 0 proves a required NEW gap (Human Gate).

### 4. Plane binding

| Risk | Mitigation |
|---|---|
| EAS `preview`→DEV / `production`→PROD bake | Documented in `documentation/PROD_DEV_PROMOTION.md` |
| AsyncStorage `buildtrack-database-config` override | `databaseConfigResolve.ts` blocks custom endpoints on release |
| Wrong-ref writes look like “bugs” | Every probe logs `{plane, projectRef, appSha}`; refuse mismatch |

## Phase 2 failure classes (this run)

| Case | PROD | DEV control | Notes |
|---|---|---|---|
| P01–P03, P08, P10 | PASS | PASS | ACL sequential selects required on PROD |
| P04–P07 | PASS | PASS (after probe fixture cols: category, due_date) | PROD NEW dialect + junction OK |
| P09 | Human-GO-skip | same | No live charge |

## Promote gate (wave 1)

```text
baseline = last PROD-passing app SHA
  → change on branch / Metro
  → dual-target: DEV control + PROD QA (P01–P08)
  → promote Edge (same git SHA) + Human-Gated SQL only if required NEW gap
  → PROD binary / Metro PROD re-run P01–P08 with ref assert
  → only then “PROD live OK”
```

App-shaped `42703` / `PGRST204` on PROD critical writes = **FAIL**, not WARN.

## Residual risks

- Headed Metro UI + camera/photos not fully re-proven in this scripted matrix (P05 checks `task_files` presence + status writes).
- Stars / attachment array paths may still be OLD-shaped on some screens; strip avoids crash but may omit metadata until `task_files` / `task_stars` full cutover.
- DEV→NEW migration remains a separate milestone.
- P09 live Checkout still needs Human GO per charge on QA company only.
