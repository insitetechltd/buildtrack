# NOW — session continuity

**SOP:** git-tracked NOW + **full cycle** in `~/.cursor/skills/solo-dev-harness/SOP.md`.

---

## Doing

**Priority #1 — commercial spine:** **`M-OPS-ENV-01` Closed (2026-08-29)** Phases A–C. DEV=`insite-dev` / `zusulknbhaumougqckec`; PROD=`insite-prod` / `jcnzjigxgkzhjsaekoqz`. Daily TF / **`dev`** → EAS `preview` → **DEV**. App Store profile **`production`** → **PROD**. Promotion: `documentation/PROD_DEV_PROMOTION.md`.

**This session — PROD TF RC with self-assign Accept fix (new binary past 243):**

- **244 env confusion (2026-09-01):** IPA **is** PROD (`jcnzjigxgkzhjsaekoqz` baked). `bob@insite.com` exists on DEV only (0 rows on PROD). Same bundle id as daily TF; AsyncStorage `buildtrack-database-config` rehydrated the DEV URL over the binary. Workaround: delete Taskr → reinstall **244** → log in as `sara@insitetest.com` (not bob). Code fix in `databaseConfigResolve.ts` needs the **next** production IPA to stick without a delete.
- **Accept fix** is in **244** (`f0930d7`). **243** does not include it. Daily Internal TF **242** is DEV-backend.
- ASC screenshots on iOS 1.1.3 `PREPARE_FOR_SUBMISSION` en-US: 4× iPhone `APP_IPHONE_67` (1320×2868) + 4× **native iPad Pro 13"** `APP_IPAD_PRO_3GEN_129` (2064×2752, recaptured on iPad sim 2026-09-01; camera still a chrome+site composite). Not Submit for Review. zh-HK locale still missing.
- ASC paste checklist: `docs/superpowers/plans/2026-09-01-asc-listing-paste.md` + `docs/assets/store/iphone-67/`. **Listing text:** `documentation/MARKETING.md`.
- Live Stripe account `acct_1U5aiTDH5K85GHQi`: **0 coupons / 0 promotion codes**. 60-day pilots need a Human GO to create them.
- `www.insiteworks.co` was HTTP **500** — keep Pages URLs; do not add `docs/CNAME` yet.
- **Play target API 36 (2026-09-02):** `app.json` now compile/target **36**. Local AAB **1.1.3 / versionCode 41** (`.eas/artifacts/build-1788322683779.aab`) submitted to Play **internal draft** (EAS `dbd82e9c-6bb7-4084-a9aa-fc9a176494ca`). Production still empty. Policy warning likely stays until a production publish. Not a public listing GO.

**You (Human-only — agent cannot click ASC / DNS / live charge):**

1. Paste EN + zh-HK + upload 6.7" JPEGs in ASC (`6754898737`). Do not Submit for Review until you intend to.
2. Point `www.insiteworks.co` at GitHub Pages; confirm 200; then 301 old Pages URLs.
3. Extra GO: create live 60-day 100% promo codes; founding-CA Starter Checkout smoke on PROD.
4. Optional: 6.1" physical shots; honest Company frame as Sara (not Joe). iPad 13" set recaptured on sim.
5. Apple org / D-U-N-S (Gate 2) stays OPEN — paperwork-now, flip **after** this listing ships.

**Idle-parallel:** picker HUD is Metro/`__DEV__` only. HQ thumbs parked. **Not** the App Store binary.

## Next (definitive)

1. Human: ASC paste + screenshot upload (pack is ready)
2. Human: DNS for `www.insiteworks.co`
3. Extra GO: Stripe 60d promo + founding-CA Checkout
4. Install HQ Internal TF **14** (`dev` / preview / DEV) when Apple finishes processing
5. After listing ships: finish `M-OPS-03` parked writes → **M-AUTHZ-02** — do not jump

**Parked:** soft suspend / resend invite / entitlement override / company freeze / §3e purge / cost ledger writes → **M-OPS-03** future. **M-BILL-F**; **M-BILL-01G**; **M-AI-01 build**; **M-DAILY-01**; **M-SEC-03**; **`M-CAPTURE-01` / `M-CAPTURE-02` tabled**.

## Recently closed / shipped this session

**Tasks screen dynamic swipe, button height & header declutter (2026-09-02):** Dynamic swipe left on task rows reveals contextual single action (Archive for approved/completed work, Update/Camera for active work; swipe disabled for review/cancelled). Swipe action button height updated to `h-full` to match task card height. Tasks list center FAB opens Create Task. Circle reload/reset button removed from Tasks header (pull-to-refresh remains standard).

**Public site honesty (2026-09-01):** landing + privacy/terms/support rewritten to HKD / 60-day invite / iOS-only / Insite Works Limited. Store 6.7" JPEGs + ASC paste card.

**Taskr TF 242 + App Store 243 (2026-09-01):** Create Task footer above keyboard + picker HUD muted on production. Commit `7fe78cc`.

**M-OPS-03 HQ task-query A3–A5 (2026-09-01):** effective status + title-only HQ search + parity Jest. `a6c7922`. Edge already on DEV.

**M-OPS-03 HQ Home landing (2026-09-01):** Platform pulse hero + 3 category cards + P0/P1 alerts. Internal TF **14** (`dev` / DEV) submitted; **13** was preview but used the old profile name.

## Locked

- **Master plan:** visual SoT = `documentation/ROADMAP.md` § Commercial sequence map
- **Env:** current = DEV; new = PROD; TF daily = DEV; Stripe live @ Store
- **Sim / Dev Boot Sequence:** Always start Metro & pre-warm bundle (`curl /status == 200`) **before** booting simulators and launching the app container (prevents "Could not connect to development server" redbox).
- **GTM:** public claims = `documentation/MARKETING.md` (update every marketing pass). Strategy draft = `docs/superpowers/plans/2026-08-30-taskr-soft-launch-gtm.md`. Domain `www.insiteworks.co`.
- **HK billing:** charge HKD; no grandfathering
- **ACL:** CA authority; default seat Worker; PA on CA|PM only
- **AUTHZ-RC construct:** Closed
- **Project status `on_hold`:** dormant reserved DB CHECK slot

## Sims / locks

- Sims: (none claimed). iPad Pro 13-inch (M5) `5548162C-9D1A-4B56-8989-320C6A15877C` still booted after store-shot capture; 17 Pro Max also booted.

## Parked notes

Joe (`joe@insite.com`) is **DEV only**, role **worker**. Do not recapture Company as Joe. Password reset for Joe does not exist on PROD.
