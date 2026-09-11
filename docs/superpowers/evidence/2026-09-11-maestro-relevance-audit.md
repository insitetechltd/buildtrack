# Maestro relevance audit — post ASC web-signup / membership changes

**Date:** 2026-09-11  
**Scope:** What still proves product after email-first Login, web signup, web plan CTAs, Create Project roster, UPA dual-path (`assigned_at`/`created_at`, `project_role`/`category`).  
**Not a run log** — relevance + gaps only. Run commands listed at bottom when ready to prove.

---

## Product changes that affect Maestro

| Change | User-visible path | Maestro today |
|--------|-------------------|---------------|
| Email-first Login (`login_identifier_is_registered`) | Password disabled until registered; button **Sign In** vs **Sign Up** | Boots type password immediately — **no wait for lookup** |
| Web company signup (no in-app Create company) | Sign Up → Safari `/taskr/signup.html` | **None** |
| Post-pay invite → Set Password | Safari `open=1` → `taskr://` → Set Password | **None** |
| Plan / seats on web (ASC 3.1.1) | Alert → Open website → `/taskr/billing.html` | **None** (A-PR02 Gap) |
| CA places person on project | Company mgmt → User Management / Project Detail add member | **None** (A-P06 / A-U Gap) — **this is the Sara→Joe class** |
| Worker sees placed project | Login → project picker / gate | Partial only if already assigned in seed; **no CA→worker place proof** |
| Camera permission **Continue** | First camera TCC | Maestro uses `permissions: camera: allow` — **never sees Continue** |
| Create Project intentional roster | Create Project pick members | **None** |
| Task Detail Approach B dock | Update / archive / no Add Comment chip | Field B–E mostly still valid; **W-D05 yaml is stale** |

---

## Still relevant (keep / re-run before TF)

These prove the **field loop** and are largely unchanged by ASC signup work. They do **not** prove Sara→Joe membership or web signup.

| Bundle | Why still relevant | Stale risk |
|--------|--------------------|------------|
| **RC min** `npm run test:e2e:maestro:rc-worker-be` (P01 + U01) | Camera → create + update+photo | Login boot may flake on password-disabled until RPC returns |
| **Dual-user** `npm run test:e2e:maestro:dual-user` | Assign → accept → update → approve | Same login boot risk; still the only cross-user task proof |
| **Journeys** login-switch-projects + projectswitch-create-taskdetail-update | Project switch + create path | Sprint7 slug/UUID notes may still apply on DEV sandbox |
| **M-QA-02 foundation** launch-smoke / open-dev-settings / initialize-sandbox | Harness health | Sandbox is DEV-only; not PROD TF proof |
| **Task-core live** create/assign/progress/completion/photo | Live Supabase field write path | Overlaps dual-user; still useful on DEV |
| **W-D01…D04, D07–D10** (except D05/D06) | Accept/decline/update/review/archive | D06 deferred by product lock — skip |

---

## Stale / misleading (do not treat as green for current product)

| Flow / claim | Problem | Action |
|--------------|---------|--------|
| `marketing-joe-company.yaml` | Comment says Joe `company_admin`; DEV Joe is **worker**. Asserts `profile-menu-company_admin` | Fix account to a real CA (e.g. Sara) or drop as marketing-only |
| `update-progress-photo/W-D05-add-comment.yaml` | Add Comment path **retired**; checklist marks Exempt | Delete or quarantine; do not run in RC |
| W-D06 Add Subtask flows | UI off by product lock | Skip / quarantine |
| Any flow that assumes **in-app Create company** | Product removed for ASC | None found in YAML text search; keep watching boots |
| Checklist claim “Out of MainTabs: Create company” as in-app | Now **web-only** | Doc update when rewriting checklist |
| Store / marketing shot flows | Still useful for screenshots; not regression SoT | Keep separate from RC |

---

## Missing tests (highest priority first)

These are the holes that forced DEV-then-PROD dogfood on Sara→Joe and ASC signup.

### P0 — must add before claiming membership / ASC login posture

1. **`CA places worker on project → worker sees project`**  
   - CA: open Company management → User Management (or Project Detail members) → place Joe/member on the only project.  
   - Assert success UI + roster shows member.  
   - Logout → login as worker → assert project picker / dashboard for that project (not endless “Loading projects…”).  
   - **Maps to:** A-P06 / A-U* Gap + RequireWorkspaceProjectGate.  
   - **Catches:** UPA `assigned_at` order 42703, `project_role`/`category` dual-path, empty assignment meta.

2. **Email-first Login (registered)**  
   - clearState → enter known email → **wait until password enabled / button Sign In** → password → enter shell.  
   - Fix all `_boot*.yaml` to wait on lookup (or assert `login-password` enabled) so suites don’t race the 400ms+RPC.

3. **Email-first Login (unregistered) → Sign Up opens Safari**  
   - Unknown email → primary button **Sign Up** → `openLink` / Safari to `/taskr/signup.html` (or assert URL via Maestro openLink if available).  
   - Proves ASC “no in-app create company”.

### P1 — ASC / commercial (manual or thin Maestro)

4. **Camera permission Continue** — one headed flow with **denied/unset** camera then grant UI showing **Continue** (not Allow). Maestro `permissions: allow` cannot prove this; need clearState + unset camera or human headed.  
5. **Company plan CTA → web alert** — tap plan/seat → Alert “Manage plan on the web” → Open website (Safari billing). Exempt full Stripe; prove alert + open.  
6. **Create Project roster** — CA creates project with 0 / 1 members; no silent auto-assign; member appears only if selected.

### P2 — nice / hard in Maestro

7. Full web Checkout + invite-open Set Password (Safari + deep link) — prefer **dual-env API probe** + one human TF smoke.  
8. Admin shell A-D01 (field tabs absent) — still Gap; useful for Sara CA dogfood.

---

## What dual-env API probe already covers (not Maestro)

`npm run test:dual-env:critical` (`scripts/supabase/probe-critical-paths-dual-env.py`) already fails loud on DEV↔PROD drift for:

- users `role` vs `system_permission`
- UPA `category` vs `project_role`
- UPA `assigned_at` vs `created_at` (+ app-shaped order fallback)
- login RPC, signup edges, anon RLS, Joe assignment readable

**Use that as the gate before TF** so you do not rediscover schema drift on the phone. Maestro still needed for **UI place-on-project + worker join**.

---

## Recommended prove set (ordered)

1. `npm run test:dual-env:critical` — schema/API both envs  
2. Write + run **P0#1** CA→worker project place (new flow) on **DEV**  
3. Harden login boots (**P0#2**) then `test:e2e:maestro:rc-worker-be`  
4. `test:e2e:maestro:dual-user` when two sims free  
5. Headed one-shot: Sign Up Safari + camera Continue (human or thin Maestro)  
6. Cut PROD TF with membership fix; **one** PROD smoke of P0#1 only (not full suite redo)

---

## Bottom line

- **Most existing Maestro is still relevant for the field task loop** (create / update / dual-user).  
- **It does not cover the paths we just broke/fixed:** CA project placement, email-first Sign Up, web billing CTAs, camera Continue.  
- **Biggest hole:** company-admin place-on-project ↔ worker join — checklist already marked Gap; that is why Sara→Joe was dogfood-only.  
- **Stale:** Joe-as-CA marketing flow, Add Comment (W-D05), Add Subtask (W-D06).  
- **Do not** re-run the entire P/U suite to validate ASC/membership — add the P0 flows, then a thin re-prove.
