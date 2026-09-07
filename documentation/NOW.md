# NOW — session continuity

**SOP:** git-tracked NOW + **full cycle** in `~/.cursor/skills/solo-dev-harness/SOP.md`.

---

## Doing

**This session — Approach B Task Detail dual dock (2026-09-06/07):**
- Dock on Task Detail: `[+]`/`[%]` · text · camera · send; tap-toggle vertical % scrubber.
- Send @ 100% (assignee) → update + `submitForReview`; green check send affordance; description required.
- After submit: dock → **Cancel review** (text slot); % / camera / check locked grey. Cancel → `in_progress` + dock back to progress@100%.
- After approval **or resolve**: dock **Archive**.
- Worker reporter on `reported`: same report dock (`+` · text · camera · send, no %); `+` opens **Resolve** (comment required from dock field). PM still gets Create/Resolve dial.
- **Other actions** card removed. Homes: Archive→post-approval dock; **red due** = same rule as Dashboard “This Week's Critical Tasks” (due in local Mon–Sun week, or critical tag); Reassign→**reassign dock** after decline (creator or PM) + Team expand; Edit→hero upper-right (creator or PM). Subtask / voice-mic / PROD DDL shelved.
- Status amber/green banners removed (status already on Progress in hero + timeline).
- Root tab bar hidden on Task Detail update shortcut + report triage.

**This session — Phase 1 PM inline report reply (2026-09-06):**
- **Unified Triage Dock** (designer: [Gemini](556880de-81a3-4873-848c-2949124fbf99)): peer `+` / camera / field / send on reported Task Detail; root red FAB + tab bar hidden; Create/Resolve dial left-anchored above `+`.
- Bottom `ReportReplyComposer` → CaptureSession photo path; Send → `replyToReport`.
- Jest: composer + sticky layout + tab-bar hide helpers PASS. Headed as Sam/PM on a reported task next.

**This session — Report → PM triage (Reply / Create task / Resolve):**

- DEV DDL applied: `supabase/migrations/20260904000100_issue_triage_reported_resolved_status.sql` via Management API — `tasks_*_status_check` includes `reported`+`resolved`; activity types include `issue_reported` / `triaged_to_task` / `issue_resolved`.
- App: `resolveReport` (row kept), Reply sheet → `addAssignerComment`, slim Create-task sheet → `triageTask` (default assignee = reporter), Dismiss removed from PM chrome.
- Prove: Jest lifecycle + QuickActions PASS; Maestro PM chrome on 17 Pro Max PASS (`reply` / `triage` / `resolve` sheets) — artifacts `.dbg/report-triage-qa/pm-*.png`. Worker Report create headed blocked while session is PM (Report = Coming soon); SQL insert of `reported` on Project A succeeded.
- **Still Human:** apply same migration on **PROD** before Store/PROD TF claims; worker-session headed Report submit smoke when logged in as worker.

**Priority #1 — commercial spine:** **`M-OPS-ENV-01` Closed (2026-08-29)** Phases A–C. DEV=`insite-dev` / `zusulknbhaumougqckec`; PROD=`insite-prod` / `jcnzjigxgkzhjsaekoqz`. Daily TF / **`dev`** → EAS `preview` → **DEV**. App Store profile **`production`** → **PROD**. Promotion: `documentation/PROD_DEV_PROMOTION.md`.

**This session — PROD TF RC with self-assign Accept fix (new binary past 243):**

- **244 env confusion (2026-09-01):** IPA **is** PROD (`jcnzjigxgkzhjsaekoqz` baked). `bob@insite.com` exists on DEV only (0 rows on PROD). Same bundle id as daily TF; AsyncStorage `buildtrack-database-config` rehydrated the DEV URL over the binary. Workaround: delete Taskr → reinstall **244** → log in as `sara@insitetest.com` (not bob). Code fix in `databaseConfigResolve.ts` needs the **next** production IPA to stick without a delete.
- **Accept fix** is in **244** (`f0930d7`). **243** does not include it. Daily Internal TF **242** is DEV-backend.
- ASC screenshots on iOS 1.1.3 `PREPARE_FOR_SUBMISSION` en-US: 4× iPhone `APP_IPHONE_67` (1320×2868) + 4× **native iPad Pro 13"** `APP_IPAD_PRO_3GEN_129` (2064×2752, recaptured on iPad sim 2026-09-01; camera still a chrome+site composite). Not Submit for Review. zh-HK locale still missing.
- ASC paste checklist: `docs/superpowers/plans/2026-09-01-asc-listing-paste.md` + `docs/assets/store/iphone-67/`. **Listing text:** `documentation/MARKETING.md`.
- Live Stripe account `acct_1U5aiTDH5K85GHQi`: **0 coupons / 0 promotion codes**. 60-day pilots need a Human GO to create them.
- `www.insiteworks.co` was HTTP **500** — keep Pages URLs; do not add `docs/CNAME` yet.
- **Play target API 36 (2026-09-02):** `app.json` compile/target **36**. Local AAB **1.1.3 / versionCode 41** (`.eas/artifacts/build-1788322683779.aab`) was on Play **internal draft** (EAS `dbd82e9c-6bb7-4084-a9aa-fc9a176494ca`).
- **Play Console (2026-09-02, Human):** logged into the developer account; **latest APK/AAB submitted**. Internal **1.1.3 / versionCode 41** is **draft**. Production track empty. Alpha/closed testing still on **1.1.2 (9)**.
- **Play listing API (2026-09-02):** committed EN + zh-HK copy + contact from `documentation/MARKETING.md` (replaced stale “across companies” EN). Icon, feature graphic, and screenshots were already on the listing. Production draft still **FAILED_PRECONDITION** via API (no error detail) — App content questionnaires are Console-only. Not a public listing GO. Do not claim Android on `documentation/MARKETING.md` until live.
- **Sideload APK (2026-09-02):** universal APK from Play AAB vc **41** → Desktop `Taskr-1.1.3-vc41.apk` (145 MB, signed, target 36). Not the debug APK. If the phone already has Taskr from Play, uninstall first (upload-key vs Play signing).

**You (Human-only — agent cannot click ASC / DNS / live charge):**

1. Paste EN + zh-HK + upload 6.7" JPEGs in ASC (`6754898737`). Do not Submit for Review until you intend to.
2. Point `www.insiteworks.co` at GitHub Pages; confirm 200; then 301 old Pages URLs.
3. Extra GO: create live 60-day 100% promo codes; founding-CA Starter Checkout smoke on PROD.
4. Optional: 6.1" physical shots; honest Company frame as Sara (not Joe). iPad 13" set recaptured on sim.
5. Apple org / D-U-N-S (Gate 2) stays OPEN — paperwork-now, flip **after** this listing ships.

**Idle-parallel:** picker HUD is Metro/`__DEV__` only. HQ thumbs parked. **`M-PERF-04`** opened (2026-09-05) — field write-path perf review (Create Task / Update Progress / photo upload latency). **Not** the App Store binary.

## Next (definitive)

1. Human: ASC paste + screenshot upload (pack is ready)
2. Human: DNS for `www.insiteworks.co`
3. Extra GO: Stripe 60d promo + founding-CA Checkout
4. Install HQ Internal TF **14** (`dev` / preview / DEV) when Apple finishes processing
5. After listing ships: finish `M-OPS-03` parked writes → **M-AUTHZ-02** — do not jump

**Parked:** soft suspend / resend invite / entitlement override / company freeze / §3e purge / cost ledger writes → **M-OPS-03** future. **M-BILL-F**; **M-BILL-01G**; **M-AI-01 build**; **M-DAILY-01**; **M-SEC-03**; **`M-CAPTURE-01` / `M-CAPTURE-02` tabled**. **Subtask create UI** — future enhancement. **Voice/mic on dock** — future enhancement. **PROD DDL** for reported/resolved — shelved until this Task Detail dock slice is resolved + committed.

## Recently closed / shipped this session

**Stage 1 Path A Worker Issue Reporting & PM Triage (2026-09-02):** Delivered Path A Dual-Intent model in Create Task (`Report Issue` vs `My Task` self-assign bypass). Added `'reported'` and `'dismissed'` status lifecycle taxonomy, `taskStore.supabase.ts` `triageTask` / `dismissIssue` methods, PM triage banner and action items on Task Detail, and relaxed assignee validation for reported issues. All unit, integration, and journey regression suites pass.

**Worker "Report Issue" vs PM "Task Triage" Investigation (2026-09-02):** Completed multi-model evaluations ([Grok](873f2c5e-9cf0-4e66-82ca-9ccb41cd3e89), [Gemini](ef19666b-4fdf-43be-b63a-c9c24dc5f9a8), [GPT](485f8ca9-2122-43d3-8b25-6f6ab07567e5)). Consensus verdict: AGREE WITH CAVEATS, and STAGED IMPLEMENTATION for multi-company synergy. Full report in `docs/superpowers/analysis/2026-09-02-worker-issue-reporting-investigation.md`.

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
- **Subtasks:** create / drill-in UI **off** until a dedicated future enhancement; do not restore Add Subtask on Task Detail Other-actions or dock. Store + `parentTaskId` may remain for existing data.
- **Voice/mic on Task Detail dock:** shelved (future enhancement).
- **PROD DDL** (`reported`/`resolved`): shelved until this dock slice is closed + committed.

## Sims / locks

- Sims: (none claimed). iPad Pro 13-inch (M5) `5548162C-9D1A-4B56-8989-320C6A15877C` still booted after store-shot capture; 17 Pro Max also booted.

## Parked notes

Joe (`joe@insite.com`) is **DEV only**, role **worker**. Do not recapture Company as Joe. Password reset for Joe does not exist on PROD.
