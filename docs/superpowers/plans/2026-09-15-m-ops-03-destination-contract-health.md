# M-OPS-03 — Destination Contract Health (Slice A + B)

**Date:** 2026-09-15  
**Milestone:** `WS-OPS / M-OPS-03`  
**Parent IA:** [`2026-08-22-owner-console-modules-complete.md`](./2026-08-22-owner-console-modules-complete.md) §1b Reliability  
**Kickoff context:** [`2026-08-30-m-ops-03-owner-internal-tf-kickoff.md`](./2026-08-30-m-ops-03-owner-internal-tf-kickoff.md)  
**Status:** Plan — GO for Slice A+B (DDL parked behind Human Gate)  
**Surfaces:** HQ app (`apps/owner/`) Monitoring + Home · Edge `owner-ops-read`  
**Plane:** **PROD destination** (`jcnzjigxgkzhjsaekoqz`) is the monitored subject. DEV is control only.

---

## 1. Why this exists

Sep 14–15 PROD NEW outages were **schema/write-contract** failures (`PGRST204` / `42703` on critical columns such as `task_activities.status`, assignees, ACL), not statuspage outages.

HQ Monitoring today would have stayed **OK**: provider status pages green + create-count KPIs still move while Update Progress is dead.

**Rule:** destination field-loop health ≠ infra status pages. HQ must show **Destination contract** explicitly, always bound to PROD.

Process companion (already encoded): prove Metro→PROD before TF/ASC (SOP §13 rule 7 / CBP Gate 0). This plan is the **continuous** HQ signal so we do not wait for the next dogfood surprise.

---

## 2. Goal (Slice A + B)

Ship a **Destination contract** panel in HQ Monitoring and wire it into Home pulse so Tristan sees **ACT** when PROD field-critical writes would fail — without waiting for a TF binary or human camera run.

| Slice | Delivers | Catches |
|---|---|---|
| **A** | PROD-bound Edge action + schema column checklist + `schema_migrations` presence → HQ rows | Sep 14 column / dialect outages |
| **B** | Synthetic JWT create + update-activity probe on locked health-bot project + Home **P0** | Sep 15 update / TF 260 class |

**DDL:** any new table / cron schedule SQL stays **Human Gate**. A+B ship with **live Edge probe + optional in-response cache**; persistence table is optional follow-on.

---

## 3. Non-goals (this cut)

- More statuspage widgets  
- “Tasks created today” as a health proxy  
- Full Maestro inside HQ  
- Star UI headed proof  
- Slice C (Edge version stamps / DEV↔PROD dialect diff UI)  
- Slice D (server dual-path fire counters from Taskr clients)  
- Soft suspend / purge / entitlement override (still parked)  
- Growing owner admin inside field Taskr  

---

## 4. Architecture

```
┌─────────────────┐     JWT + platform_owners      ┌──────────────────────────┐
│ HQ Monitoring   │ ── monitoringSnapshot ───────► │ owner-ops-read (Edge)    │
│ HQ Home pulse   │ ── destinationContract (new) ─► │  hard-bind PROD service  │
└─────────────────┘                                │  role client for probes  │
                                                   └────────────┬─────────────┘
                                                                │
                    ┌───────────────────────────────────────────┼────────────────┐
                    ▼                                           ▼                ▼
           information_schema                          JWT health-bot session   (optional later)
           + schema_migrations                         create + activity insert  owner_health_snapshots
           + anon deny sample                          on locked PROD QA project  【Human Gate DDL】
```

### 4.1 Hard rules

1. **`destinationContract` always targets PROD** (`jcnzjigxgkzhjsaekoqz`), even if HQ’s working-plane / EAS env is still DEV for other panels.  
2. Never treat dual-path *recovery* as green. Probe payloads are **app-shaped**; `42703`/`PGRST204` = **FAIL** even if the mobile app would strip/retry.  
3. Synthetic writes (**Slice B**) only against a **locked health-bot project** on PROD QA company (never customer tenants).  
4. No secret values in responses (same envelope discipline as existing `owner-ops-read`).  
5. **No DDL in this ship** without written Human GO.

### 4.2 New Edge action

Add to `supabase/functions/owner-ops-read/index.ts`:

```ts
type OpsAction = … | "destinationContract";
```

**Response shape (stable):**

```ts
type DestinationContractSnapshot = {
  generatedAt: string;
  plane: "prod";
  projectRef: string; // assert === PROD ref
  verdict: "pass" | "fail" | "degraded" | "unknown";
  ageMs: number; // 0 when live
  schema: {
    migrationsTablePresent: boolean;
    lastMigrationId: string | null;
    columns: { table: string; column: string; present: boolean }[];
    anonDeniedSample: { table: string; denied: boolean }[]; // subset of 7 locked tables
  };
  fieldLoop?: { // Slice B
    caseIds: string[];
    results: { caseId: string; ok: boolean; code?: string; detail?: string }[];
    healthProjectId: string; // redacted-safe UUID of bot project only
  };
  notes: string[];
};
```

**Verdict rules:**

| Condition | Verdict |
|---|---|
| Any critical column `present: false` | `fail` |
| `schema_migrations` missing | `fail` (or `degraded` only if Human documents waiver) |
| Slice B any critical case `ok: false` | `fail` |
| All required green | `pass` |
| Probe transport error | `unknown` |

**Critical columns (Slice A minimum — extend only with evidence):**

| Table | Column | Why |
|---|---|---|
| `tasks` | `current_status` | Create/update status path |
| `tasks` | `assigned_to` | Assignee hydrate |
| `task_activities` | `status` | Update Progress insert (TF 260 miss) |
| `users` | `role` **or** documented ACL dual-path pair (`system_permission`) | Authz writes |
| `user_project_assignments` | order col used by app (`assigned_at` **or** `created_at`) | Roster refresh |

Exact “present” check: `information_schema.columns` via service_role (read-only). Document which of `role` / `system_permission` is required on PROD NEW after dual-path cutover — probe should accept **either** if app dual-path covers both, but must FAIL if **neither** exists.

### 4.3 Slice B synthetic cases (reuse P-matrix IDs)

Port the slim subset of `scripts/supabase/probe-p01-p10-dual-target.py` into Deno (same case IDs):

| Case ID | Action | Fail signal |
|---|---|---|
| `H-CREATE` | JWT create minimal task on health-bot project | `42703` / `PGRST204` / non-2xx |
| `H-UPDATE-ACTIVITY` | Insert activity with **update-shaped** body (includes top-level `status` as the app did before dual-path) | Same — **must fail closed** if column missing (do not strip in the probe) |
| `H-ASSIGN-READ` | Read/hydrate assignee shape for created task | Missing col / empty unexpectedly |

Cleanup: mark title `healthprobe-*` + soft-delete or leave for GC job (no customer visibility). Prefer create → probe → archive/delete when safe under existing RLS.

**Secrets:** health-bot email/password or Auth Admin mint via Edge secrets (`OWNER_HEALTH_BOT_*`) — never ship in client. Document secret names in deploy script comments; values only in Supabase secrets.

### 4.4 HQ UI

**MonitoringScreen** — new section **above** provider status fluff:

| Row | Source |
|---|---|
| Plane | `PROD · <ref> · age` |
| Verdict | PASS / FAIL / DEGRADED / UNKNOWN |
| Schema | N/N critical cols · migrations present · last id |
| Field loop | PASS/FAIL · last fail `caseId` (Slice B) |
| Notes | truncated Edge notes |

Banner copy must say **PROD**, never “counts on DEV”.

**Home (`homeLanding.ts` + `OwnerHomeScreen`)** — pulse rule change:

| Priority | Today | Add |
|---|---|---|
| P0 | Supabase statuspage unavailable | **`destinationContract.verdict === "fail"`** |
| P1 | Stripe reconcile drift | `degraded` / `unknown` older than threshold (e.g. >15m if cached) |

`deriveHomeAlert` / `derivePulseLevel` gain a `destination` input; Monitoring remains the drill-in destination for contract fails.

### 4.5 Client API

Extend `apps/owner/src/lib/fetchOwnerOpsRead.ts`:

- `fetchDestinationContract(supabase)` → `{ action: "destinationContract" }`
- Types for `DestinationContractSnapshot`
- Monitoring load: parallel with existing `fetchMonitoringOpsSnapshot` (or fold into one invoke if we embed contract inside `monitoringSnapshot` — **prefer separate action** so we can refresh contract without re-hitting statuspages)

### 4.6 Deploy / plane

| Item | Requirement |
|---|---|
| `owner-ops-read` on **PROD** | **Required for A+B** — residual “HQ Edge not on PROD” becomes a close blocker for this slice |
| DEV deploy | Optional mirror for smoke; DEV `destinationContract` must still **hard-bind PROD** (or refuse with `wrong_plane` if misconfigured) |
| Deploy script | Extend `scripts/supabase/deploy-owner-ops-read.sh` to accept PROD ref; add `smoke-owner-destination-contract.mjs` |
| HQ EAS env | May stay DEV for KPI counts initially; contract panel ignores that for its own fetch target **inside Edge** |

---

## 5. DDL Human Gate (parked)

**Not in Slice A+B ship** unless Human GO:

```sql
-- PLACEHOLDER ONLY — do not apply without Human GO
-- owner_health_snapshots (
--   id, plane, generated_at, verdict, cases jsonb, schema jsonb
-- )
-- + optional pg_cron / Edge schedule to refresh every 15m
```

**Ship without table:** each HQ open (or pull-to-refresh) invokes live `destinationContract`. Rate-limit in Edge (e.g. coalesce to 60s) to avoid stampeding Auth Admin.

When Human GO lands later: cron writer + HQ reads latest row (fast Home paint).

---

## 6. File list (expected)

| Path | Change |
|---|---|
| `supabase/functions/owner-ops-read/index.ts` | `destinationContract` action + PROD-bound probes |
| `scripts/supabase/deploy-owner-ops-read.sh` | PROD deploy path + notes |
| `scripts/supabase/smoke-owner-destination-contract.mjs` | **new** — JWT owner smoke against PROD |
| `apps/owner/src/lib/fetchOwnerOpsRead.ts` | fetch + types |
| `apps/owner/src/screens/MonitoringScreen.tsx` | Destination contract section |
| `apps/owner/src/screens/homeLanding.ts` | P0/P1 pulse rules |
| `apps/owner/src/screens/OwnerHomeScreen.tsx` | Pass destination into pulse |
| `apps/owner/src/screens/__tests__/homeLanding.test.ts` | Pulse unit cases |
| `documentation/NOW.md` | Session line after prove |
| `documentation/ROADMAP.md` | M-OPS-03 Notes bullet when Closed evidence exists |

Reuse (read, do not fork blindly):  
`scripts/supabase/probe-p01-p10-dual-target.py`, `probe-critical-paths-dual-env.py`, existing `isMissingColumnError` helper in Edge.

---

## 7. Implementation sequence

### Phase A1 — Edge schema contract (no synthetic writes)

1. Add `destinationContract` action; hard-bind PROD service URL/key from Edge secrets.  
2. Implement column + migrations + anon-deny sample.  
3. Deploy to **PROD** (+ DEV mirror if desired).  
4. Smoke script: owner JWT → `verdict` + column matrix JSON (redacted).  
5. HQ Monitoring section + types + Jest for parsing helpers if any.

**Exit:** Monitoring shows PROD contract; missing `task_activities.status` would paint FAIL.

### Phase A2 — Home pulse

1. Wire `deriveHomeAlert` / `derivePulseLevel` for destination fail → P0 / `act`.  
2. Unit tests for pulse matrix (statuspage OK + contract fail → ACT).

**Exit:** Home cannot read OK when contract fail.

### Phase B — Synthetic field loop

1. Provision / document PROD health-bot user + project (operator step; may already exist as App Review Site sibling — prefer **dedicated** `healthprobe` project).  
2. Edge secrets for bot auth.  
3. Implement `H-CREATE` / `H-UPDATE-ACTIVITY` / `H-ASSIGN-READ` without strip-on-missing.  
4. Soft rate-limit + cleanup titles.  
5. Smoke + HQ field-loop row.  
6. Optional: headed HQ screenshot evidence under `docs/superpowers/evidence/`.

**Exit:** Dropping `task_activities.status` (or equivalent) flips field loop FAIL and Home ACT without a Maestro run.

---

## 8. Acceptance criteria

1. `destinationContract` response includes `projectRef` equal to PROD ref; wrong-plane config → non-pass.  
2. Slice A: known-critical column absence → `verdict: "fail"` with that column listed.  
3. Slice A: `schema_migrations` absence → fail (or documented Human waiver in Notes).  
4. Slice B: update-shaped activity insert fails closed on missing `status` (does not silent-strip).  
5. Home: contract fail ⇒ pulse `act` and P0 alert to Monitoring — **even if** Supabase statuspage is operational.  
6. No DDL applied in git history for this slice without Human GO evidence file.  
7. Anti-secret: smoke/evidence/docs contain no service-role keys, passwords, or raw JWTs.  
8. `owner-ops-read` deployed on PROD (close residual for this feature).

---

## 9. Validation plan

| Layer | Command / proof |
|---|---|
| L1 | Owner Jest: `homeLanding` pulse cases; any new pure helpers |
| L2 | `node scripts/supabase/smoke-owner-destination-contract.mjs` against PROD (owner JWT) |
| L3 | HQ Internal TF or Expo run: Monitoring section + Home pulse screenshot |
| Negative proof | (Staging or temporary) document that failing column flips verdict — prefer smoke assert on response shape rather than breaking prod |
| Typecheck | `npx tsc --noEmit` in owner app / repo script as used today |

Maestro dual-user remains DEV field proof; it does **not** replace HQ destination contract.

---

## 10. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Synthetic writes pollute PROD | Locked health-bot project; title prefix; cleanup; never customer tenants |
| Probe storms Auth / DB | Edge coalesce ≤60s; no per-keystroke invoke from HQ |
| HQ still on DEV EAS while monitoring PROD | Contract hard-bound in Edge; UI labels PROD explicitly |
| Dual-path false green | Probe does **not** use app strip helpers |
| `schema_migrations` never existed on PROD | Fail loud until Human adds table **or** signed waiver in ROADMAP Notes |
| Bot credentials leak | Edge secrets only; rotate on GO |

---

## 11. Human gates

| Gate | When |
|---|---|
| **DDL** `owner_health_snapshots` / cron | Before persistence/cron — **not** required for A+B live probe |
| Health-bot identity on PROD | Before Slice B (create user/project if missing) |
| PROD Edge deploy of `owner-ops-read` | Before claiming A/B closed (operator deploy) |
| Asc / TF for HQ | Only if Monitoring UI needs a new Internal TF binary to dogfood |

---

## 12. Open assumptions (GO defaults)

1. Health-bot project is dedicated (not App Review Site customer dogfood).  
2. Slice A ships before B if bot identity blocked; Home P0 still fires on schema fail alone.  
3. KPI / economics panels may remain DEV-fed until a later cutover; Destination contract does not wait on that.  
4. Case IDs stay aligned with P-matrix naming (`H-*`) for evidence grepability.

---

## 13. Close bar

Slice A+B **Closed** when:

- PROD `destinationContract` smoke PASS on a named SHA  
- HQ Monitoring + Home pulse evidence attached  
- ROADMAP M-OPS-03 Notes updated  
- NOW overwritten with next action (Slice C or park)

**Judge:** GO only with destination-plane proof (SOP §13) — DEV-only Edge smoke is insufficient.

---

## 14. Next after A+B (out of scope here)

- **C:** Edge deploy SHA stamps + DEV↔PROD dialect diff  
- **D:** Server-side dual-path / deferred-schema fire aggregation  
- DDL snapshot table + 15m cron after Human GO  
