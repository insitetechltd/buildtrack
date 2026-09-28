# Maestro Destination Gate (MDG) — PROD frontend + backend

**Date:** 2026-09-15  
**Status:** Strategy — GO needed before Builder  
**Milestone:** dual-plane prove (SOP §13) / closes “DEV Maestro ≠ PROD” lie  
**Surfaces:** Metro (debug) + Maestro sims · PROD ref `jcnzjigxgkzhjsaekoqz` · QA company only  
**Non-goal:** replace DEV Maestro; wipe PROD; live Stripe; customer tenants

---

## 1. The failure mode (why current proof is bullshit)

| What we ran | What it actually proved |
|---|---|
| `ONLY=H01` dual-user Maestro | **DEV** FE + **DEV** BE (default `.env` / Metro bake) |
| `headed-prod-qa-smoke.py` / P-matrix | **PROD** BE contract — **no UI** |
| Manual Metro→PROD headed | **PROD** FE+BE — **human**, not Maestro, not repeatable gate |
| TF 261 | **PROD** bake — after the fact; not a SHA prove loop |

**Law correction:** “No *destructive* Maestro on PROD” ≠ “No Maestro on PROD.”  
Destructive = `clearState` + Photos FORCE_PURGE + customer tenants + live charge.  
Destination Maestro = non-destructive UI against a **locked PROD QA tenant**, with hard ref assert + DB read-back.

---

## 2. Required prove stack (ordered)

```text
L1  Jest / dual-path unit
L2  DEV Maestro (H01 etc.)                    — working plane, iterate fast
L3  PROD JWT / P-matrix                       — destination API contract
L4  MDG-Metro  ★ NEW                          — destination FE+BE on named SHA
L5  TF binary dogfood / optional MDG-TF       — bake confirm (store path)
L6  HQ Destination Contract (M-OPS-03)        — continuous health, not ship gate
```

**Ship rule:** Judge cannot GO “PROD field-loop ready” on L2 alone.  
**Freeze rule:** SHA freeze for CBP/TF requires **L3 + L4 PASS** on that SHA.  
**Store rule:** ASC/TF promote prefers L5 after L4 green (L5 can be short human dogfood until MDG-TF exists).

---

## 3. Architecture

```
┌─────────────────────────────┐
│ scripts/maestro/run-mdg.sh  │  MAESTRO_PLANE=prod  (refuse otherwise)
│  Gate 0: ref assert         │
│  Gate 1: seed QA tenants    │
│  Gate 2: boot Metro PROD    │
│  Gate 3: Maestro flows      │
│  Gate 4: REST read-back     │──► PROD jcnzjigxgkzhjsaekoqz
└──────────────┬──────────────┘
               │
     ┌─────────┴──────────┐
     ▼                    ▼
 Metro :8081           Sims (1 or 2 UDIDs)
 EXPO_PUBLIC_* = PROD   login QA users only
 PROD banner visible    library peek only
```

### 3.1 Plane binding (the actual fix)

**Do not rely on “remembered” Dev Admin taps.** Binding must be mechanical:

1. **Packager env file** `.env.maestro-prod` (gitignored secrets; tracked `.env.maestro-prod.example`) with:
   - `EXPO_PUBLIC_SUPABASE_URL=https://jcnzjigxgkzhjsaekoqz.supabase.co`
   - matching anon key
2. **Runner starts Metro** with that env (or `env $(cat …) npx expo start`), never the default DEV `.env`.
3. **Preflight assert** before any Maestro YAML:
   ```bash
   # fail closed
   curl Metro status OK
   node scripts/maestro/assert-plane.cjs --expect prod --ref jcnzjigxgkzhjsaekoqz
   ```
   Assert reads the **runtime** config the app will use (baked env + optional `__DEV__` override file written by runner into sim container / launch deep-link). Prefer: write AsyncStorage `buildtrack-database-config` **only in __DEV__** via a one-shot `idb`/`xcrun simctl spawn` helper **or** a Maestro first-flow that sets Dev Admin env from env vars — but **Gate 0 still verifies** after login by reading an on-screen **plane chip** / debug testID `plane-banner__prod` that shows project ref prefix.
4. Every MDG log line: `{plane:prod, projectRef, appSha, runId}`. Mismatch → abort (rc≠0).

### 3.2 PROD QA tenant (locked)

| Seat | PROD identity (illustrative — lock real emails in runner env) | Role |
|---|---|---|
| Assigner | existing PROD QA CA/PM on **App Review Site** (e.g. sara family or dedicated `mdg.pm@…`) | create / assign / approve / archive |
| Assignee | PROD QA worker on same project | accept / update / submit |
| Project | **one** locked PROD QA project — never founding CA personal, never customer | |

Seed script: `scripts/maestro/ensure-mdg-prod-data.cjs`  
- Uses Management API / service_role **against PROD ref only** after ref assert.  
- Idempotent membership repair (same pattern as DEV `ensure-dual-user-project-data.cjs`).  
- **Never** copies DEV John/Alice rows.

### 3.3 Non-destructive rules (PROD)

| Allowed | Forbidden |
|---|---|
| Login / logout | `clearState` that orphans PROD session into DEV bake |
| Create tasks titled `MDG-{sha8}-{ts}` | Photos `FORCE_PURGE` |
| Library peek only (no shutter) | Live Checkout / Stripe |
| Accept → update → review → archive **own MDG tasks** | Delete arbitrary PROD data |
| JWT/REST read-back of those tasks | Customer company IDs |
| Optional cleanup: archive/soft-delete tasks with `MDG-` prefix older than 7d | Schema DDL from Maestro |

`clearState`: allowed **once per sim boot** only if followed immediately by plane re-bind + PROD login. Prefer persist login across phases (same as DEV dual-user).

---

## 4. Flow set (v1)

### MDG-S01 — Single-sim critical path (build first)

1. Plane banner = PROD  
2. Login assigner  
3. Create task + library photo  
4. Open detail → assignees visible  
5. Composer update progress (the TF-260 class)  
6. Gate 4: REST on PROD — task row + activity + `task_files` exist  

**Command:** `MAESTRO_PLANE=prod npm run test:e2e:maestro:mdg:s01`

### MDG-H01 — Dual-sim field loop (parity with DEV H01)

Same phases as DEV DU-H01, PROD users/project, library-only:  
assign → accept → 100%+photo → submit → approve → **archive**  
+ Gate 4 read-back after each write phase (or final composite).

**Command:** `MAESTRO_PLANE=prod ONLY=H01 npm run test:e2e:maestro:mdg:dual-user`

### Out of v1

- Full P01–P22 photo matrix on PROD  
- Billing / signup / invite burn  
- HQ owner flows  

---

## 5. Backend assert (closes “UI green / BE red”)

After UI phases, runner calls PROD with QA JWT or service_role (read-only where possible):

| Assert | FAIL if |
|---|---|
| `projects.id` matches locked QA project | wrong tenant |
| task `title` = conductor title | create never landed |
| activity row for update | update dual-path silent fail |
| `task_files` ≥1 for create/update photo steps | storage/UI lie |
| `projectRef` in probe URL host | plane drift |

UI `rc=0` without Gate 4 = **not PASS**.

---

## 6. Implementation phases

| Phase | Deliverable | Owner |
|---|---|---|
| **P0** | Lock PROD QA users + project IDs in `.cache/maestro-mdg/prod-qa.json` (gitignored); example committed | Human + Builder |
| **P1** | `assert-plane.cjs` + Metro boot helper + PROD banner testID if missing | Builder |
| **P2** | `run-mdg.sh` + MDG-S01 YAML + Gate 4 | Builder + Test |
| **P3** | MDG-H01 dual-user port of DU-H01 against PROD seats | Builder |
| **P4** | Encode law: `PROD_DEV_PROMOTION.md` + NOW + SOP §13 — “DEV Maestro ≠ destination”; MDG required for SHA freeze | Docs |
| **P5** (optional) | MDG-TF: Maestro against installed production IPA (no Metro) — store smoke | later |

**Do not** start P2 until P0 identities exist on PROD and P1 plane assert fails closed on DEV Metro.

---

## 7. Acceptance (Judge)

- [ ] `MAESTRO_PLANE=prod` + wrong Metro env → **abort before YAML**  
- [ ] MDG-S01 rc=0 + Gate 4 PASS on named SHA against `jcnzjigxgkzhjsaekoqz`  
- [ ] Screenshots show PROD plane chip  
- [ ] DEV `test:e2e:maestro:dual-user` still green (unchanged working-plane gate)  
- [ ] Docs state: destination FE+BE prove = MDG, not DEV H01  
- [ ] No customer tenant touched; no live Stripe  

---

## 8. Risks

| Risk | Mitigation |
|---|---|
| AsyncStorage rehydrates DEV over PROD Metro | Plane assert + banner; wipe config key on MDG boot helper |
| John/Alice only exist on DEV | Separate PROD QA seats (P0) |
| Accidental PROD junk | `MDG-` title prefix + archive cleanup job |
| Two Metros / wrong port | Single Metro owned by `run-mdg.sh`; kill/refuse foreign :8081 if ref≠PROD |
| “We ran Maestro” ambiguity | Artifact JSON must include `plane` + `projectRef` or report is invalid |

---

## 9. Decision locks (defaults — challenge if wrong)

1. **L4 MDG-Metro is mandatory** for PROD field-loop SHA freeze (not optional headed).  
2. **L5 TF dogfood** remains human until MDG-TF exists; does not replace L4.  
3. **DEV H01 stays** the fast working-plane gate.  
4. **Destructive suites stay DEV-only.** MDG is the destination exception that is explicitly non-destructive.

---

## 10. Next action after GO

Builder P0+P1 in one cut: lock QA identities → plane assert + Metro PROD boot → prove assert fails on default DEV Metro → then MDG-S01.
