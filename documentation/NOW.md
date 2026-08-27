# NOW — session continuity

**SOP:** git-tracked NOW + **full cycle** in `~/.cursor/skills/solo-dev-harness/SOP.md`.

---

## Doing

**Priority #1 — `M-OPS-ENV-01` Prod DB:** LOCKED plan — current = DEV, new empty = PROD. Daily TF → DEV. Stripe live @ App Store submit only. Waiting: **start cutover** to create PROD. SoT: `docs/superpowers/plans/2026-08-26-prod-dev-supabase-split.md`. ROADMAP Order **14.94**.

## Next (definitive)

1. **`M-OPS-ENV-01`** — create empty PROD (say **start cutover**)
2. **DEV smoke `M-BILL-01`** — Create Company (CA=worker) → plan → Extra people +1 → invite caps
3. App Store submit → Stripe **live** on PROD
4. **M-OPS-03** Owner management → **M-AUTHZ-02** → **M-AI-01** → Wave 2

**Parked:** **M-BILL-F**; **M-BILL-01G**; **M-AI-01 build**; **M-DAILY-01** (Phase 0 locked); custom company banner; **M-SEC-03**; DEV tenant purge → **M-OPS-03** §3e; unapplied migrations CA→worker + drop `on_hold` (need GO).

## Recently closed / shipped this session

**`captureSession` Closed (2026-08-27):** Hybrid module production SoT — Camera tab + Create/Update Add Photos; headed Create + Update smoke PASS; Update Progress task title; SET_PARAMS fix. Close: `docs/superpowers/reports/2026-08-27-capture-session-close.md`.

**`M-DATA-04` Closed (2026-08-27):** Realtime churn gate PASS — close: `docs/superpowers/reports/2026-08-27-m-data-04-close.md`.

**Docs:** **M-DAILY-01 Phase 0** — `docs/superpowers/analysis/2026-08-27-daily-capture-memo-vision.md`.

**`M-AUTHZ-RC` Closed (2026-08-27):** H01–H08 headed PASS. Close report: `docs/superpowers/reports/2026-08-27-m-authz-rc-close.md`.

**Headed:** H06 / H07 / H08 PASS (user confirmed) — Create Task, CA field list vs Project B, Bob worker regression.

## Locked

- **Master plan:** `docs/superpowers/plans/2026-08-22-master-plan-parallel.md`
- **Env:** current = DEV; new = PROD; TF daily = DEV; Stripe live @ submit
- **HK billing:** charge HKD; no grandfathering
- **ACL:** CA authority; default seat Worker; PA on CA|PM only; on-job roster = PA
- **AUTHZ-RC construct:** Closed — see close report

## Sims / locks

(none claimed this teardown)

## Parked notes

Optional AUTHZ L2 matrix gaps (F05/F06 etc.) = backlog, not reopen.
