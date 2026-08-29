# NOW — session continuity

**SOP:** git-tracked NOW + **full cycle** in `~/.cursor/skills/solo-dev-harness/SOP.md`.

---

## Doing

**Priority #1 — commercial spine:** **`M-OPS-ENV-01` Closed (2026-08-29)** Phases A–C. DEV=`insite-dev` / `zusulknbhaumougqckec`; PROD=`insite-prod` / `jcnzjigxgkzhjsaekoqz`. Daily TF / `production-local` → EAS `preview` → **DEV**. App Store profile `production` → **PROD**. Promotion: `documentation/PROD_DEV_PROMOTION.md`. **Next spine:** App Store submit → Stripe live on PROD (ENV Phase D) → `M-OPS-03` → `M-AUTHZ-02` → …

**This session:** TF in flight stays on whatever URL was baked at build time; **next** `production-local` build uses EAS preview→DEV.

**Idle-parallel photo funnel:** **TF 1.1.3 (211) submitted to ASC** with L3 `PhotokitThumbs` in the binary. Skip **210** (native sources were gitignored). Apple processing. **Not** public App Store. Do not run Maestro/CI against PROD.

## Next (definitive)

1. App Store submit → Stripe **live** on PROD (ENV-01 Phase D)
2. **M-OPS-03** Owner management → **M-AUTHZ-02** → **M-AI-01** → Wave 2
3. Idle-parallel: `M-PERF-03` / `M-DATA-05` as capacity allows

**Parked:** **M-BILL-F**; **M-BILL-01G**; **M-AI-01 build**; **M-DAILY-01** (Phase 0 locked); custom company banner; **M-SEC-03**; DEV tenant purge → **M-OPS-03** §3e. **`on_hold` status slot = dormant** — UI removed; DB CHECK keeps the slug reserved (do **not** apply `20260825000600`; revive later if we need a fifth status). **CA→worker (`20260825000500`) already live on DEV**. **M-DATA-05** cache hygiene (plan locked; idle-parallel — Phase A when bandwidth work is free; must not jump ENV-01 cutover). **`M-CAPTURE-01` camera zoom** and **`M-CAPTURE-02` picker tile resize** tabled 2026-08-28 — do not plan/build now.

## Recently closed / shipped this session

**TF 1.1.3 (211) (2026-08-29):** Local EAS production-local IPA submitted to ASC (processing). L3 PhotoKit native thumbs (`PhotokitThumbs` in binary). Script footer still prints `app.json` **194**; EAS remote **211**. IPA: `.eas/artifacts/build-1787984830968.ipa`. Submit: `28bbd033-0134-4a61-8d38-9868b7180ae1`. **Not** public App Store. **Skip TF 210** — native module was missing from that IPA.

**L1+L2 (2026-08-29, idle-parallel):** Timing HUD on hybrid library + skeleton first screen + stagger URI bind.

**TF 1.1.3 (207) (2026-08-28):** Local EAS production-local IPA submitted to ASC (processing). Row-sized library pages (3 then 6), smaller decode window. Script footer still prints `app.json` **194**; EAS remote **207**. IPA: `.eas/artifacts/build-1787926602506.ipa`. Submit: `a5a3f824-a4aa-4bfa-931b-1786c728afc9` FINISHED. **Not** public App Store.

**TF 1.1.3 (206) (2026-08-28):** Local EAS production-local IPA submitted to ASC (processing). Includes camera app-level permission cache, no-camera library fallback, library first-row stream. Script footer still prints `app.json` **194**; EAS remote **206**. IPA: `.eas/artifacts/build-1787924071965.ipa`. Submit: `713442f8-fbac-43e2-9213-199db5674508`. **Not** public App Store.

**M-PERF-04 C1+C2 (2026-08-28, idle-parallel):** Camera persist overlay + async shutter pin. Headed 17 Pro Max PASS. Commit `47e2e05`. **TF 1.1.3 (205)** submitted to ASC.

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

- **Master plan:** `docs/superpowers/plans/2026-08-22-master-plan-parallel.md` (historical lock; **current visual path** = `documentation/ROADMAP.md` § Commercial sequence map + canvas `master-pipeline-consolidated`)
- **Env:** current = DEV; new = PROD; TF daily = DEV; Stripe live @ submit
- **HK billing:** charge HKD; no grandfathering
- **ACL:** CA authority; default seat Worker; PA on CA|PM only; on-job roster = PA
- **AUTHZ-RC construct:** Closed — see close report
- **Project status `on_hold`:** dormant reserved DB CHECK slot; UI/normalize → On-going (`active`). Drop migration parked — revive only with product GO

## Sims / locks

- **`M-OPS-ENV-01`:** **Closed A–C** this chat. Secrets in `.cache/env-cutover/` + password manager. Other chats: promote with `documentation/PROD_DEV_PROMOTION.md` — never silent `.env` → PROD.
- Sims: (none claimed)

## Parked notes

Optional AUTHZ L2 matrix gaps (F05/F06 etc.) = backlog, not reopen.
**M-CAPTURE-01 / M-CAPTURE-02** = tabled; no plan until product GO after picker-lag TF feedback.
