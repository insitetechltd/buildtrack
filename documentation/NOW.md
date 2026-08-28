# NOW — session continuity

**SOP:** git-tracked NOW + **full cycle** in `~/.cursor/skills/solo-dev-harness/SOP.md`.

---

## Doing

**Priority #1 — `M-OPS-ENV-01` Prod DB:** LOCKED plan — current = DEV, new empty = PROD. Daily TF → DEV. Stripe live @ App Store submit only. Waiting: **start cutover** to create PROD. SoT: `docs/superpowers/plans/2026-08-26-prod-dev-supabase-split.md`. ROADMAP Order **14.94**.

**Idle-parallel — photo funnel:** **M-PERF-04 C1+C2 shipping to TestFlight (2026-08-28).** Camera persist overlay; shutter no longer awaits pin. Headed iPhone 17 Pro Max: library overlay ×3 + 5 shutter → Done → Accept (5 on Select Photos). Login-badge still local.

## Next (definitive)

1. **`M-OPS-ENV-01`** — create empty PROD (say **start cutover**)
2. App Store submit → Stripe **live** on PROD
3. **M-OPS-03** Owner management → **M-AUTHZ-02** → **M-AI-01** → Wave 2

**Parked:** **M-BILL-F**; **M-BILL-01G**; **M-AI-01 build**; **M-DAILY-01** (Phase 0 locked); custom company banner; **M-SEC-03**; DEV tenant purge → **M-OPS-03** §3e. **`on_hold` status slot = dormant** — UI removed; DB CHECK keeps the slug reserved (do **not** apply `20260825000600`; revive later if we need a fifth status). **CA→worker (`20260825000500`) already live on DEV**. **M-DATA-05** cache hygiene (plan locked; idle-parallel — Phase A when bandwidth work is free; must not jump ENV-01). **`M-CAPTURE-01` camera zoom** and **`M-CAPTURE-02` picker tile resize** tabled 2026-08-28 — do not plan/build now.

## Recently closed / shipped this session

**Capture picker lag JS cut (2026-08-28, idle-parallel):** 2× inner RN `Image` + scale-up; `PAGE_SIZE=18`; `initialNumToRender=9`; defer `getAlbumsAsync` until album sheet. Default stays All photos. Native FastFormat = later TF.

**Capture picker lag (2026-08-28, idle-parallel):** Defer library pin to Accept; RN `Image` sized tiles (not expo-image `ph://`); headed 17 Pro smoke PASS (tap badge + Accept → Select Photos). TF199.

**M-PERF-03 Gate A follow-up (2026-08-28):** System `ph://` grid thumbs (no per-cell ImageManipulator); permission singleton; first page 12; deferred albums; wake warm. Merged + pushed `35d90e2`. **TF 1.1.3 (204)** submitted to ASC (processing). Cloud: `cbd1939` + `49e176f`.

**M-PERF-03 Phase C (2026-08-28):** Select Photos port + shared `LibraryPhotoGrid`. FlashList v2 reverted to FlatList. Merged + pushed `1a7ec1b`. **TF 1.1.3 (203)**. Plan: `docs/superpowers/plans/2026-08-28-m-perf-03-phase-c-select-photos-flashlist-plan.md`.

**M-PERF-03 Phase B (2026-08-28):** LRU resized `file://` thumb cache + camera warm prefetch. TF202. Plan: `docs/superpowers/plans/2026-08-28-m-perf-03-library-picker-spike-plan.md`.

**M-PERF-03 scroll continuity (2026-08-28):** Viewport prefetch + priority decode queue. Tunables: `libraryPickerPerf.ts`.

**`M-BILL-01` Closed (2026-08-27) — DEV MVP:** Catalog HK$160/400; human Checkout Starter; Extra people +1; invite caps; stripe-webhook empty-meters fix deployed. Close: `docs/superpowers/reports/2026-08-27-m-bill-01-close.md`.

**CA→worker + `on_hold` policy Closed (2026-08-27):** Live DEV audit — CA already worker (rules + `deployable_seat` + enforce). Drop-`on_hold` migration **dormant** (keep CHECK slot). Close: `docs/superpowers/reports/2026-08-27-ca-worker-on-hold-dormant-close.md`.

**`captureSession` Closed (2026-08-27):** Hybrid module production SoT — Camera tab + Create/Update Add Photos; headed Create + Update smoke PASS; Update Progress task title; SET_PARAMS fix. Close: `docs/superpowers/reports/2026-08-27-capture-session-close.md`.

**`M-DATA-04` Closed (2026-08-27):** Realtime churn gate PASS — close: `docs/superpowers/reports/2026-08-27-m-data-04-close.md`.

**`M-DATA-05` Pipeline (2026-08-27):** Folded multi-LLM cache recs → action plan + ROADMAP Order **15.0551**. Plan: `docs/superpowers/plans/2026-08-27-m-data-05-cache-hygiene-action-plan.md`. Not started.

**Docs:** **M-DAILY-01 Phase 0** — `docs/superpowers/analysis/2026-08-27-daily-capture-memo-vision.md`.

**`M-AUTHZ-RC` Closed (2026-08-27):** H01–H08 headed PASS. Close report: `docs/superpowers/reports/2026-08-27-m-authz-rc-close.md`.

## Locked

- **Master plan:** `docs/superpowers/plans/2026-08-22-master-plan-parallel.md`
- **Env:** current = DEV; new = PROD; TF daily = DEV; Stripe live @ submit
- **HK billing:** charge HKD; no grandfathering
- **ACL:** CA authority; default seat Worker; PA on CA|PM only; on-job roster = PA
- **AUTHZ-RC construct:** Closed — see close report
- **Project status `on_hold`:** dormant reserved DB CHECK slot; UI/normalize → On-going (`active`). Drop migration parked — revive only with product GO

## Sims / locks

(none claimed)

## Parked notes

Optional AUTHZ L2 matrix gaps (F05/F06 etc.) = backlog, not reopen.
**M-CAPTURE-01 / M-CAPTURE-02** = tabled; no plan until product GO after picker-lag TF feedback.
