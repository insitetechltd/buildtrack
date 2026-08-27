# NOW — session continuity

**SOP:** git-tracked NOW + **full cycle** in `~/.cursor/skills/solo-dev-harness/SOP.md`.

---

## Doing

**`M-AUTHZ-RC` headed smoke:** H01–H05 + **H08 PASS**. Confirm **H06** (Create Task) + **H07** (CA/PA field list vs Project B; Tasks peer visibility fix) after Metro reload — then milestone closeable on smoke.

**Priority #1 — `M-OPS-ENV-01` Prod DB:** LOCKED plan — current = DEV, new empty = PROD. Daily TF → DEV. Stripe live @ App Store submit only. Waiting: **start cutover** to create PROD. SoT: `docs/superpowers/plans/2026-08-26-prod-dev-supabase-split.md`. ROADMAP Order **14.94**.

## Next (definitive)

1. **Confirm H06 + H07** (headed) → close `M-AUTHZ-RC` smoke gate
2. **`M-OPS-ENV-01`** — create empty PROD (say **start cutover**)
3. **DEV smoke `M-BILL-01`** — Create Company (CA=worker) → plan → Extra people +1 → invite caps
4. App Store submit → Stripe **live** on PROD
5. **M-OPS-03** Owner management → **M-AUTHZ-02** → **M-AI-01** → Wave 2

**Parked:** **M-BILL-F**; **M-BILL-01G**; **M-AI-01 build**; custom company banner; **M-SEC-03**; DEV tenant purge → **M-OPS-03** §3e.

## Recently closed / shipped this session

**Headed:** **H08 PASS** — Bob worker still sees assigned/created only.

**Bugfix — Tasks peer visibility (H07):** admin/manager band peer job tasks now appear in Tasks as Team Queue (matched Activity).

**Bugfix — Create Task workspace project:** Location inherits Activity/last-selected (or sole) project; Assign To not auto-defaulted; Organize-by-area UI removed.

**M-AUTHZ-RC catch-up (code):** PA roster gate, Member/PA labels, avatar → Company management, EditProjectModal hooks fix, etc.

**M-BILL-01 DEV hygiene:** seat math, plan gate, worker seat copy; CA→worker seat law live.

## Locked

- **Master plan:** `docs/superpowers/plans/2026-08-22-master-plan-parallel.md`
- **Env:** current = DEV; new = PROD; TF daily = DEV; Stripe live @ submit
- **HK billing:** charge HKD; no grandfathering
- **ACL:** CA authority; default seat Worker; PA on CA|PM only; on-job roster = PA
- No service-role in mobile; no company switch

## Parked

- **M-BILL-01G** / **M-BILL-F** (partial seat gates live)
- **M-AI-01** implementation
- **M-SEC-03** single active login
- DEV purge UI → **M-OPS-03**
- Owner KPI v2 → **M-OPS-03**

---

Updated: 2026-08-27 (H08 PASS)
