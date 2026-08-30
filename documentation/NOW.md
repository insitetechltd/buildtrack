# NOW — session continuity

**SOP:** git-tracked NOW + **full cycle** in `~/.cursor/skills/solo-dev-harness/SOP.md`.

---

## Doing

**Priority #1 — commercial spine:** **`M-OPS-ENV-01` Closed (2026-08-29)** Phases A–C. DEV=`insite-dev` / `zusulknbhaumougqckec`; PROD=`insite-prod` / `jcnzjigxgkzhjsaekoqz`. Daily TF / **`dev`** → EAS `preview` → **DEV**. App Store profile **`production`** → **PROD** (requires confirm). Promotion: `documentation/PROD_DEV_PROMOTION.md`. **Next spine:** App Store submit → Stripe live on PROD (ENV Phase D) → `M-OPS-03` → `M-AUTHZ-02` → …

**This session:** **M-OPS-03 Phase 1b + Economics + Phase 1d** on DEV.
- 1b: `platform_owners` + `is_platform_owner` live; Edge allowlist DB SoT
- Economics: Edge `owner-economics-snapshot` + hq screen (counts only, no invented $)
- 1d: Edge `owner-tenant-write` create/deactivate + `owner_audit_log`; Auth ban on deactivate
- Jest 22/22. Live JWT smoke: create/deactivate/ban/econ/non-owner 403 PASS
- IPA build **7** submitted: `.eas/artifacts/hq-phase1b-econ-1d-20260830-143300.ipa` · [submission](https://expo.dev/accounts/insitetech/projects/insite-owner/submissions/4406b2cf-a836-4f41-887a-05de058fbfff)
- **You:** Install TF build **7** → Economics + Tenant create/deactivate headed

**Idle-parallel photo funnel:** **226 next** — defer library warm to camera press. Monitor `documentation/PICKER_PROGRESS.md`. **Not** the App Store binary.

## Next (definitive)

1. Headed TF: Economics rollup + company users Add → create → deactivate (confirm ban)
2. Optional: Economics costs / margin later; §3e tenant purge still parked
3. **GTM locked (2026-08-30):** store name **A** (Taskr – Site Photo Tasks / 地盤影相派工); promo **60d**; domain **www.insiteworks.co**; ASC paste **after new screenshots**. **Open:** Apple org/D-U-N-S (recommend paperwork now, flip after this listing). Next implement: landing HKD + legal + DNS, then screenshot recapture. Plan: `docs/superpowers/plans/2026-08-30-taskr-soft-launch-gtm.md`
4. Idle later: **M-DATA-05 Phase B** (post-Store)

**Parked:** **M-BILL-F**; **M-BILL-01G**; **M-AI-01 build**; **M-DAILY-01** (Phase 0 locked); custom company banner; **M-SEC-03**; DEV tenant purge → **M-OPS-03** §3e. **`on_hold` status slot = dormant**. **CA→worker already live on DEV**. **`M-CAPTURE-01` / `M-CAPTURE-02` tabled**.

## Recently closed / shipped this session

**M-OPS-03 Phase 1b/Economics/1d (2026-08-30):** Migrations `20260830000100_mops03_platform_owners.sql` + `20260830000200_mops03_owner_audit_log.sql` applied DEV. Edges redeployed: kpi / tenant-read / economics-snapshot / tenant-write. Gate A critiques folded (role dual-path, audit→auth.users, auth ban, fail-closed allowlist).

**M-OPS-03 Phase 1c (2026-08-30):** Tenant read Edge + hq drill-down; fixed DEV schema (`role`, no `companies.updated_at`).

**GTM draft (2026-08-30):** Soft-launch plan + call-list template. Live listing still **Insite Trackr** v1.0. Gate A GO-WITH-FIXES. Canvas: `canvases/taskr-soft-launch-gtm.canvas.tsx`.

## Locked

- **Master plan:** `docs/superpowers/plans/2026-08-22-master-plan-parallel.md` (historical); **visual SoT** = `documentation/ROADMAP.md` § Commercial sequence map
- **Env:** current = DEV; new = PROD; TF daily = DEV; Stripe live @ submit
- **HK billing:** charge HKD; no grandfathering
- **ACL:** CA authority; default seat Worker; PA on CA|PM only
- **AUTHZ-RC construct:** Closed
- **Project status `on_hold`:** dormant reserved DB CHECK slot

## Sims / locks

- Sims: (none claimed)

## Parked notes

Optional AUTHZ L2 matrix gaps = backlog. **M-CAPTURE-01 / M-CAPTURE-02** = tabled.
