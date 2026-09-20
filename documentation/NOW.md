# NOW — session continuity

**SOP:** git-tracked NOW + **full cycle** in `~/.cursor/skills/solo-dev-harness/SOP.md`.

---

**This session — iPad Task Detail mix GO (2026-09-20):** Portrait keeps the stacked info card; landscape splits project/task meta left (~1/3) and the thread right. Timeline chrome unchanged. iPad photos are a **fixed tile token** (portrait 3-up, landscape 4-up; 1/2/3 or 1–4 fill left-aligned; `contain`; >N horizontal peek-to-slide; no +N). Phone square hero unchanged. Prove: layout **6/6**, timeline **13/13**, sticky-layout **23/23**, TaskDetailAcceptanceUI **19/19**; `npx tsc --noEmit` rc=0. Gate B: composer-2.5 ITERATE on headed smoke (no sim booted). **Next:** headed iPad 11" portrait + landscape. CBP only if asked.

**This session — CBP TF 276 submitted (2026-09-19):** Gate 0 waived (user-ordered CBP of iPad timeline Variant C; Metro→PROD GO on `fa5cff1`; this SHA is JS layout only — no persistence/auth writes). App `57771db` (iPad Task Detail photos = height-capped filmstrip / 2-up / +N; phone square hero unchanged). Prove: `TaskActivityTimeline` + layout **17/17 PASS**; TaskDetailAcceptanceUI + sticky-layout **41/41 PASS**; `npx tsc --noEmit` rc=0. Local `./build-local.sh ios production` → IPA **v1.1.3 (276)** `.eas/artifacts/build-1789827471304.ipa` (CFBundleVersion 276; bundle `com.buildtrack.app.local`; PROD host `jcnzjigxgkzhjsaekoqz`; DEV host absent; bake includes `IpadTimelineEvidenceStrip`). EAS submit https://expo.dev/accounts/insitetech/projects/buildtrack/submissions/a4a3baf7-0ab2-42e2-90c6-3b4fc8daae12 (✔ Uploaded ASC; Apple processing). ASC Public / Submit for Review untouched. **Next:** superseded for iPad layout by the 2026-09-20 mix (TF **276** still the last binary).

**This session — iPad timeline Variant C (2026-09-19):** User picked **C · Filmstrip / evidence grid** from `docs/superpowers/analysis/2026-09-19-ipad-task-timeline-layout.md`. iPad photo events use a height-capped strip (single ~200pt, 2-up 180pt, 3–4 tile filmstrip + `+N`); phone keeps square `aspectRatio: 1` hero. Prove: `TaskActivityTimeline` + `ipadTimelineEvidenceLayout` **17/17 PASS**; TaskDetailAcceptanceUI + sticky-layout **41/41 PASS**; `npx tsc --noEmit` rc=0. **Next:** superseded for iPad dogfood by TF **276**.

**This session — CBP TF 275 submitted (2026-09-18):** Gate 0 waived (user-ordered CBP of Tasks swipe-left camera; Metro→PROD GO on `fa5cff1`). App `0a8dd4e` (swipe camera → CaptureSession immediately; Accept pops capture flow onto Task Detail dock). Prove: photoFlowNavigation + captureFirstCameraFlow + TasksScreen + sticky-layout **55/55 PASS**; `npx tsc --noEmit` rc=0. Local `./build-local.sh ios production` → IPA **v1.1.3 (275)** `.eas/artifacts/build-1789744171854.ipa` (CFBundleVersion 275; bundle `com.buildtrack.app.local`; PROD host `jcnzjigxgkzhjsaekoqz`; DEV host absent; bake includes `launchTaskListPhotoUpdate`). EAS submit https://expo.dev/accounts/insitetech/projects/buildtrack/submissions/c76f24a8-dfe9-4377-99c7-73eb73019f96 (Expo IN_QUEUE ~49m then ✔ Uploaded ASC; Apple processing). ASC Public / Submit for Review untouched. **Next:** dogfood TF **275** as Sara — Tasks swipe-left camera → shutter/library → Accept → Task Detail dock chips → note/% → submit.

**This session — Tasks swipe-left photo update (2026-09-18):** Wrong hook was `UpdateProgress`. Swipe camera now opens CaptureSession immediately (`launchTaskListPhotoUpdate`, `returnScreen: TaskDetail`). After Accept, capture/select screens pop and Task Detail hydrates the dock. Prove: photoFlowNavigation + captureFirstCameraFlow + TasksScreen + sticky-layout **55/55 PASS**; `npx tsc --noEmit` rc=0. **Next:** superseded for phone dogfood by TF **275** (Sara / PROD).

**This session — CBP TF 274 submitted (2026-09-18):** Gate 0 waived (user-ordered after Metro DEV dogfood of variant-6 armed % chip; Metro→PROD GO on `fa5cff1`). App `6a745b3` (green-ring dirty % posts mid-progress updates; leave-guard Stay/Discard/Submit; login tagline/asterisks gone; orphan JWT sign-out without PGRST116 redbox). Prove: `CI=1 npx jest` composer+detail+auth+login **75/75 PASS**; `npx tsc --noEmit` rc=0. Local `./build-local.sh ios production` → IPA **v1.1.3 (274)** `.eas/artifacts/build-1789733613767.ipa` (CFBundleVersion 274; bundle `com.buildtrack.app.local`; PROD host `jcnzjigxgkzhjsaekoqz` in `main.jsbundle`; DEV host absent). EAS submit https://expo.dev/accounts/insitetech/projects/buildtrack/submissions/d987ce85-258a-45e2-bbed-c8ad54458414 (✔ Uploaded ASC; Apple processing). ASC Public / Submit for Review untouched. **Next:** dogfood TF **274** as Sara on PROD — dirty % below 100% should Submit update, not wait for 100%.

**This session — progress dock variant 6 (2026-09-18):** Worker can post a mid-% update (note + photos + %) without waiting for 100%. Locked UX: clean grey % press-drag; dirt arms the trailing chip with a green ring; tap submits if description present; long-press remounts slider; 100%+note → green check. Leave-guard on leave only. **Phone:** Debug Taskr on BearPhone 12 + Metro `:8081`. Stale **John** JWT had no `users` row (`PGRST116` LogBox). Fix: `maybeSingle` + sign-out on empty profile (no `console.error` redbox). Prove: `CI=1 npx jest src/state/__tests__/authStore.test.ts --watchman=false` **29/29 PASS**. **Next:** superseded for phone dogfood by TF **274** (Sara / PROD). Debug Metro remains DEV (John/Alice).

**This session — CBP TF 273 submitted (2026-09-18):** Gate 0 waived (user-ordered full 0↔100 dock loop after TF 272 shipped the narrower leave-once bake; Metro→PROD GO on `fa5cff1`). App fix `7895f56` (keep % chip until a gesture settles at 100%, then Submit; long-press remounts slider; leave/re-enter 100% any number of times; compact TF-271 44×44 pan after retract). Prove: `CI=1 npx jest src/components/taskDetail/__tests__/ReportReplyComposer.test.tsx --watchman=false` **18/18 PASS** (full loop 0→mid→100→Submit→long-press→below→100→Submit→long-press→below→100→tap Submit); `npx tsc --noEmit` rc=0. Local `./build-local.sh ios production` → IPA **v1.1.3 (273)** `.eas/artifacts/build-1789698306256.ipa` (CFBundleVersion 273; PROD host `jcnzjigxgkzhjsaekoqz` in `main.jsbundle`; DEV host absent; `127.0.0.1` / debug ingest absent; bake includes `7895f56` `progressDockTrailingSlot`). EAS submit https://expo.dev/accounts/insitetech/projects/buildtrack/submissions/17d991db-c8ff-49fd-8f6e-c3578c73bf4c (✔ Uploaded ASC; Apple processing). ASC Public / Submit for Review untouched. **Next:** dogfood TF **273** — 0% chip → vary → 100% Submit → long-press → below 100% → back to 100% Submit again → tap to submit (272 is leave-once only).

**This session — CBP TF 272 submitted (2026-09-18):** Gate 0 waived (user-ordered phone dogfood of leave-100% after TF 271; Metro→PROD GO on `fa5cff1`). App fix `f2ff1ae` (long-press Submit remounts born-expanded % scrub; ignore leftover lift; do not clear `forceProgressScrub` mid-drag). Local `./build-local.sh ios production` → IPA **v1.1.3 (272)** `.eas/artifacts/build-1789697863215.ipa` (CFBundleVersion 272; PROD host `jcnzjigxgkzhjsaekoqz` in `main.jsbundle`; DEV host absent; bake SHA `f2ff1ae`). Tip `7895f56` (free leave/re-enter 100%) landed during the build and is **not** in this IPA. EAS submit https://expo.dev/accounts/insitetech/projects/buildtrack/submissions/e597ef28-3422-479f-aa29-fd9a9ad227fc (✔ Uploaded ASC; Apple processing). ASC Public / Submit for Review untouched. **Superseded for %/Submit loop dogfood by TF 273.**

**This session — CBP TF 271 submitted (2026-09-18):** Gate 0 waived (same dogfood class as TF 264–270; Metro→PROD GO on `fa5cff1`). App fix `c61f2e7` (stable Gesture Handler % scrub — iOS dropped PanResponder after one 5% step). Landing `d5e48d2` (Up/Down stack) not in IPA. Local `./build-local.sh ios production` → IPA **v1.1.3 (271)** `.eas/artifacts/build-1789695551502.ipa` (CFBundleVersion 271; PROD host `jcnzjigxgkzhjsaekoqz` in `main.jsbundle`; DEV host absent; bake tip `d5e48d2` includes `c61f2e7`). EAS submit https://expo.dev/accounts/insitetech/projects/buildtrack/submissions/a48989a9-dde6-4a09-b336-fee05cb1d652 (✔ Uploaded ASC ~107s; Apple processing). ASC Public / Submit for Review untouched. **Superseded for leave-100% dogfood by TF 272.**

**This session — CBP TF 270 submitted (2026-09-17):** Gate 0 waived (same dogfood class as TF 264–269; Metro→PROD GO on `fa5cff1`). Local `./build-local.sh ios production` → IPA **v1.1.3 (270)** `.eas/artifacts/build-1789660718355.ipa` (CFBundleVersion 270; PROD host `jcnzjigxgkzhjsaekoqz`; bake tip `d9467c4` includes `6184ddd` / `2abf01a` / `fb2d603` / `62b90be`). First EAS submit https://expo.dev/accounts/insitetech/projects/buildtrack/submissions/b4dff77c-09c2-4985-a6ef-6b7849b8c2d7 uploaded to ASC (local wait looked stalled). Retry https://expo.dev/accounts/insitetech/projects/buildtrack/submissions/eabc004b-0da3-49d5-9b44-13ec8c89ed6e failed after ~81m: “already submitted this build” (CFBundleVersion 270). **ASC uploaded: YES** — **270 VALID** `2026-09-17T10:27:32-07:00`. ASC Public / Submit for Review untouched. **Superseded for % scrub dogfood by TF 271.**

**This session — Cloud Agent sessions dying + company→project wash (2026-09-17):** Cursor Cloud Agent tabs for the company/project landing keep dying (`[internal] internal error` Request ID `95e6b005-783c-4ad8-844d-b51fc02cc9ca`; same class as earlier `3186a36b`). Do not send more into those tabs. Leftover ask continued here: company section uses `--stage-grad-flip` + `--project-bridge` fade; `d5e48d2` stacked Up above Down on section nav (`company.css?v=25`). **Next:** human glance at company→Amoy scroll. Pages publish needs that push (done with CBP 271).

**This session — % scrubber UX closed (2026-09-17):** Human Metro dogfood **PASS** on tip `2abf01a` (peer idle-circle chrome + overlay scrub, no tall dock band). Interaction: press-drag %; at 100% submit; long-press submit to leave 100%. Pushed on `cursor/cbp-scrubber-tahoe-264-ddef`. Optional later CBP if TF must include this tip (267 lacked chrome/overlay polish).

**This session — Select Photos blank after Accept (2026-09-17):** TF **269** screenshot: Select Photos (1) shows Add Photo + expand badge on an empty white tile. Causes: (1) Photokit native thumb inside Reanimated sortable grid never paints; (2) adapter output dropped `previewUri` so tiles never received a file JPEG; (3) Recents still live on Accept. Fix committed: Accept pins a 512 `file://` preview (`uri` stays `ph://`); tiles use ExpoImage on that file; Recents pause on Accept; Swift preview export waits for a bitmap instead of aborting on the first nil/cancel. Prove: `npx tsc --noEmit` rc=0; `CI=1 npm run test:photo-flow -- --watchman=false` **34/34 PASS (171 tests)**. **Next:** wait other chats to commit, then **CBP** (native rebuild). TF **269** will still blank. ASC Public / Submit for Review untouched.

**This session — Joe Create Task assignees (2026-09-17):** Joe (`joe@insitetest.com`) on App Review Site only saw himself. Causes: (1) who→whom ranked CA `systemPermission=admin` at 40 so Sara was hidden; candidate rank now uses **deployable seat** (CA default = worker). (2) Create assignee `useMemo` depended on getter identities, so roster fetch never refreshed. (3) Worker **Assign** hid the picker behind a self-only badge. Committed with this session. **Next:** CBP with Select Photos preview — open Assign as Joe, picker should list other project members (Sara + crew). ASC Public / Submit for Review untouched.

**This session — CBP TF 269 submitted (2026-09-17):** Recents HQ thumb pass + Select Photos native `ph://` thumbs (`f983338`). Local IPA **v1.1.3 (269)** `.eas/artifacts/build-1789646710388.ipa` (CFBundleVersion 269; PROD `jcnzjigxgkzhjsaekoqz`; native2b). EAS submit https://expo.dev/accounts/insitetech/projects/buildtrack/submissions/33fce88e-05da-4083-8301-34cb023a580a (✔ Uploaded ASC; Apple processing). **Next:** Human dogfood TF **269** — Recents tiles should sharpen after first paint; Accept → Select Photos should show tiles in seconds, not minutes. ASC Public / Submit for Review untouched.

**This session — Recents sharpness + Select Photos stall (2026-09-17):** TF **268** dogfood: first paint OK, tiles soft; Accept → Select Photos **>2 min**. Cause: Select Photos `expo-image` + `ph://` (PHImageManagerMaximumSize) while Recents stayed live under the stack. Shipped in **TF 269**. First-paint pump/preheat skipped per user.

**This session — CBP TF 268 submitted (2026-09-17):** Recents picker default **native2b** (`76b68ec`) + PhotoKit thumb `var asset` compile fix (`4623ab0`). Local IPA **v1.1.3 (268)** `.eas/artifacts/build-1789642118043.ipa` (CFBundleVersion 268; PROD `jcnzjigxgkzhjsaekoqz`; bake includes `native2b`). EAS submit https://expo.dev/accounts/insitetech/projects/buildtrack/submissions/817c7263-192a-4ff2-a433-ae3bb7bdb491 (✔ Uploaded ASC; Apple processing). Production HUD is **off**. Recents first-paint dogfood **PASS**. **Superseded for picker dogfood by TF 269.**

**This session — CBP law lock (2026-09-17):** User: **local build always**. Encoded in `.cursor/rules/cbp-commit-build-push-tf.mdc` — never cloud `eas build` as CBP fallback; submit only local IPA.

**This session — CBP TF 267 submitted (2026-09-17):** Press-drag % scrub + full-height hit box (`d2c49e2`). Local IPA **v1.1.3 (267)** `.eas/artifacts/build-1789638433001.ipa` (PROD `jcnzjigxgkzhjsaekoqz`). EAS submit https://expo.dev/accounts/insitetech/projects/buildtrack/submissions/724afc42-5d18-455b-ae4c-e4abcb372191 (✔ Uploaded ASC; Apple processing). **Superseded for Recents dogfood by TF 268.** Still valid for press-drag % until 268 installs.

**This session — CBP TF 266 submitted (2026-09-17):** Progress dock camera → text → % (&lt;100%) / submit@100% + long-press submit re-opens scrub. Bake tip `fa693f2`. Local IPA **v1.1.3 (266)** `.eas/artifacts/build-1789636848473.ipa` (PROD `jcnzjigxgkzhjsaekoqz`). EAS submit https://expo.dev/accounts/insitetech/projects/buildtrack/submissions/43241357-379f-460e-8faa-3080e31a9a33 (✔ Uploaded ASC). **Superseded for dogfood by TF 267** (scrub hit-box fix).

**This session — CBP TF 265 submitted (2026-09-17):** User: TF **264** already out → this ship is **265**. Same tip as scrubber+Tahoe (`ec1dfb2`). Local `./build-local.sh ios production` → IPA **v1.1.3 (265)** `.eas/artifacts/build-1789630606378.ipa` (CFBundleVersion 265; PROD `jcnzjigxgkzhjsaekoqz`). EAS submit https://expo.dev/accounts/insitetech/projects/buildtrack/submissions/626019b3-37a9-4449-80fc-69b9d6106ca5 (✔ Uploaded ASC; Apple processing). **Superseded for dogfood by TF 266** (dock reorder). ASC Public / Submit for Review untouched.

**This session — CBP TF 264 submitted (2026-09-17):** Gate 0 freeze Metro→PROD **GO** (`fa5cff1` ⊂ bake SHA `ec1dfb2` on `cursor/cbp-scrubber-tahoe-264-ddef`). Tip differed from dogfood TF **263** (scrubber release-retract + Tahoe plugin) → local `./build-local.sh ios production` → IPA **v1.1.3 (264)** `.eas/artifacts/build-1789628856091.ipa` (CFBundleVersion 264; PROD host `jcnzjigxgkzhjsaekoqz`). EAS submit https://expo.dev/accounts/insitetech/projects/buildtrack/submissions/75b82398-2235-47b5-8a96-0f13ed9d4359 (✔ Uploaded ASC; Apple processing). **Superseded for dogfood by TF 265.** Context: `docs/cbp-tf-freeze-2026-09-17.md`.

**This session — TF 263 dogfood PASS (2026-09-17):** Human on phone — `sara@insitetest.com` (password reset to `password123` for dogfood) · **App Review Site** · login → create+photo → assignees → composer update **PASS**. Local-only CBP unblocked (Tahoe `find-identity -v` patch). IPA `.eas/artifacts/build-1789627029095.ipa`; submit https://expo.dev/accounts/insitetech/projects/buildtrack/submissions/9d919bc3-df68-4f5f-a21d-3bf6d3ea8adc. ASC demo account remains `joe@insitetest.com`. Tahoe patch: `scripts/eas/ensure-tahoe-local-build-plugin.sh` + `build-local.sh` auto `EAS_LOCAL_BUILD_PLUGIN_PATH`.

**This session — Phase C Metro→PROD Gate 0 (2026-09-16):** Freeze SHA **`fa5cff1`** (`fa5cff1f52603ef8436f01023ddc44139dd4825b`) pushed on `cursor/freeze-dual-path-phase-c-5b19`. Metro→PROD Gate 0 **GO**: login/dashboard App Review Site (Sara) · create+photo (shutter) · detail assignees · composer update Backend confirmed (no Failed to submit). Evidence: `docs/superpowers/evidence/2026-09-16-metro-prod-headed-result.json` + PNGs under `docs/superpowers/evidence/2026-09-16-metro-prod-headed/`. Report: worker/Mac `docs/phase-c-metro-prod-2026-09-16.md`. CBP attempted 2026-09-17 — **blocked on local keychain cert import** (see above).

**This session — Phase A tsc+tasks fix delta (2026-09-16):** SHA `36387655` still **DIRTY**. Fixed tooling baseline: static `schemaDualPath` imports + 50 `tsc` type fixes + NEW-table Jest mocks (`task_assignments`/`task_files`/`task_stars`). Prove: `npx tsc --noEmit` **rc=0**; `CI=1 npm run test:tasks -- --watchman=false` **48/48 PASS**; dual-path Jest **22/22 PASS**. Phase A delta **GO** for Phase C tooling gate — H01/Phase C/CBP not re-run. Report: `docs/phase-a-tsc-tasks-fix-2026-09-16.md` (+ worker artifacts mirror).

**This session — Phase A+B close-out prove (2026-09-16):** SHA `36387655` (**DIRTY**). A: doctor/schema-parity/dual-path Jest 22/22 + **DU-H01 PASS** (17 Pro Max+iPhone 16; artifacts `.cache/maestro-artifacts/dual-user-20260916_084726` + maestro-home `2026-09-16_084954`…`_085618`). A hard fails (since cleared by tsc+tasks fix delta above): `tsc` rc=2 (~50), `test:tasks` dynamic-import Jest. B: dual-env critical PASS; p-matrix **PROD** P01–P08+P10 PASS / P09 Human-GO-skip; DEV p-matrix fixture no QA user; headed-prod-qa-smoke PASS (no PROD 42703/PGRST204). Results: worker `artifacts/docs/phase-ab-results-2026-09-16.md`. Sims free after H01 release.

**This session — Queue 1–3 CLOSED (2026-09-15 night):**  
(1) **DU-H01 PASS** on rebuilt DEV — `ONLY=H01 npm run test:e2e:maestro:dual-user` green (create → assignee → approve → archive). Resolver + approve assert fixed for NEW dialect.  
(2) **Dual-path strip → NEW-only** — insert payload drops `assigned_to`/`current_status`/attachments/`accepted`; assignees always `task_assignments`; UPA `created_at` + `project_role` only; ACL `system_permission` only; Maestro seeds NEW; Edge invite/billing/stripe prefer `system_permission`. Jest: schemaDualPath + userProjectAssignmentQuery + greenfield compat **22/22 PASS**.  
(3) **Edge parity DEV↔PROD** — Management API matrix: **9/9 shared OK**; **5 DEV-only** owner-* (`owner-economics-snapshot`, `owner-kpi-snapshot`, `owner-ops-read`, `owner-tenant-read`, `owner-tenant-write`) = HQ Internal TF residual (not field-app blockers). Evidence: `docs/superpowers/evidence/2026-09-15-edge-function-parity-dev-prod.json`.

**This session — DEV≡PROD schema parity promote-up (2026-09-15):** Nuked DEV public schema only (`auth` kept — 74 users incl. John/Alice Aug-2026); restored from PROD dump; functions+RLS pass-2. `npm run test:schema-parity` **PASS** (26 tables / 19 funcs / 74 policies / 252 cols). Seeded Maestro QA John+Alice + Project A (`seed:dev-qa`) on surviving auth IDs. Law rewritten in `documentation/PROD_DEV_PROMOTION.md`. Plan: `docs/superpowers/plans/2026-09-15-dev-prod-schema-parity-promote-up.md`.

**Queue (was locked; now done):** H01 → dual-path strip → Edge parity. Next idle: HQ Edge deploy to PROD (Human Gate), Destination Contract Builder, TF dogfood.

**This session — M-OPS-03 Destination Contract plan GO (2026-09-15):** Slice A+B plan written — `docs/superpowers/plans/2026-09-15-m-ops-03-destination-contract-health.md`. Edge `owner-ops-read` action `destinationContract` (PROD hard-bound) + Monitoring/Home P0. **DDL parked (Human Gate).** Next: Builder Phase A1.

**This session — DU-H01 full loop PASS on sims (2026-09-15):** PM assign → Worker accept → library photo @100% → submit review → PM Accept → PM Archive. Create/assignee use **library peek only** (no shutter). Gate: `ONLY=H01 npm run test:e2e:maestro:dual-user` rc=0.

**This session — DU-H01 create is library-only on sims (2026-09-15):** No shutter — `capture-session__library_peek` → hybrid library pick → Accept. Camera path is device-only.

**This session — Maestro DU-H01 full field loop (2026-09-15):** Required pass is now PM assign → Worker accept → 100% + submit review → PM Accept → **PM Archive**. Flows: `DU-H01-assigner-approve.yaml` (dock Accept) + new `DU-H01-assigner-archive.yaml`; wired in `scripts/maestro/run-dual-user-gate.sh`. Plan updated. Prove: `ONLY=H01 npm run test:e2e:maestro:dual-user`.

**This session — CBP TF 261 after Metro update PASS (2026-09-15):** Gate 0 green (composer update reprove4 PASS). Dual-path + rules on `916e9ec`; bump `fc60455`. Cloud EAS build `77a2b12a-49b2-460d-b279-f7e37d89d20f` → submit https://expo.dev/accounts/insitetech/projects/buildtrack/submissions/06d188c0-03c2-4a83-9327-37a998bf74ad (✔ Uploaded ASC; Apple processing). Local IPA failed keychain (same as 260). **TF 261** = first binary with update path proven on PROD NEW. Premature 260 lacked update fix. Wait ASC VALID → install Internal TF.

**This session — Metro→PROD + CBP TF 260 (2026-09-15):** Wrong order — TF submitted before update PASS. Create+photo + Detail assignees had been green; update was red. Submission: https://expo.dev/accounts/insitetech/projects/buildtrack/submissions/be897e6f-8469-4f0b-9f2a-6192c58f02f5.

**This session — PROD stabilize pass / full NEW cutover (2026-09-15):** Freeze SHA **`9d26c2b`**. Slice 1–2 `schemaDualPath` HIGH writers + `task_files`/`task_stars`; Slice 3 user-JWT P-matrix + headed-adjacent smoke **PASS** on that SHA; Slice 4 Edge redeployed DEV+PROD (invite/billing/cancel/checkout/webhook/addons/signup*). **No PROD TF yet** — needs human Metro camera dogfood + Judge GO. Residuals: HQ Edge, `schema_migrations`, reported/resolved DDL, P09, DEV→NEW tenant migrate.

**This session — Dual-plane SOP law (2026-09-15):** Encoded `develop → debug → stable → destination → working` as portable SOP **§13**. Root cause: 2026-08-26 split treated “don’t junk PROD” as “don’t prove PROD.” Destination `42703`/`PGRST204` = FAIL not WARN.

**This session — PROD NEW SoT Harden (2026-09-15):** Superseded by stabilize pass above. Prior Phase 2 service_role matrix alone was false GO; JWT + store cutover required.

**This session — DEV↔PROD comprehensive QA (2026-09-14):** Multi-agent NO-GO. Artifacts `.cache/dual-env-qa-20260914/` + report `docs/superpowers/reports/2026-09-14-dev-prod-comprehensive-qa.md`. Root themes: greenfield PROD ≠ evolved DEV; dual-path uneven; probe WARNs as GO; no PROD `schema_migrations`; Edge billing lag. Live PROD write proof: `tasks.current_status`/`assigned_to` PGRST204; `users.role` PGRST204; status-only insert needs allowed CHECK value. Invite `unknown_error` fixed+deployed both envs earlier today — does **not** fix Create Task. **Superseded by PROD NEW SoT Harden above.**

**This session — Taskr landing 14-day trial CTAs (2026-09-13):** Removed public 60-day promo copy. Hero rewrite + pricing/end **14 days Trial** / **Start a trial** → `signup.html`. Support + Terms + `MARKETING.md` aligned. `STRIPE_TRIAL_PERIOD_DAYS=14` synced DEV+PROD Edge secrets. **Needs git push** for Pages. HQ 60-day invite promo stays Owner-app only (unpublished).

**This session — company landing Pages (2026-09-13):** About + founder between hero and projects; contact `tristan.koo@insiteworks.co` (`support@` stays Taskr-only). Phone off the public page. Files: `docs/index.html`, `docs/company.css?v=11`, `docs/company.js?v=4`, `documentation/MARKETING.md`. Publishing with this commit + push.

**This session — cancel path + ASC 258 (2026-09-12):** Multi-model GO deepen-web. ASC notes + listing paste → prefer **TF 258** + billing cancel URL. Pages: Terms cancel section; billing canceled-state → email support. PROD cancel smoke PASS for Tristan (`cancel_at_period_end` → access until 2026-10-11). App: Company Plan **Manage or cancel plan** + alert/seat label fixes committed `f31966a` (push blocked — re-auth GitHub). EAS cloud build **259** started https://expo.dev/accounts/insitetech/projects/buildtrack/builds/f7b54308-3588-4639-876e-f97e37bfc434 (local IPA failed keychain cert import). **Human ASC:** attach **258**, paste notes from `docs/superpowers/evidence/2026-09-11-asc-resubmit-review-notes.md`, Submit for Review; Public unticked.

**This session — PROD TF 258 (2026-09-11):** Invite clipboard handoff (`taskr://auth/handoff` + Safari verifyOtp). Local `./build-local.sh ios production true` → IPA **v1.1.3 (258i-rc)** `.eas/artifacts/build-1789124501779.ipa`; EAS submit https://expo.dev/accounts/insitetech/projects/buildtrack/submissions/effb601a-41d4-438c-aaca-298330e2de14. Dogfood invite → Set Password on phone **after** TF **258** installs. Do not open invite on desktop Safari (burns token). ASC: prefer **258** once VALID.

**This session — PROD TF 257 (2026-09-11):** UPA `assigned_at`→`created_at` dual-path fix (`03e412d`). Local `./build-local.sh ios production` → IPA **v1.1.3 (257i-rc)** `.eas/artifacts/build-1789113357905.ipa`; EAS submit https://expo.dev/accounts/insitetech/projects/buildtrack/submissions/401c4698-8e72-4851-bdde-7ac5d01c11c2. Superseded by **258** for invite Set Password.

**This session — Joe project join (2026-09-11):** PROD backend OK — `joe@insitetest.com` already has active UPA on **App Review Site** (`project_role=contractor`); `user_has_project_access` true. Bug was app: `fetchUserProjectAssignments` / `fetchProjectUserAssignments` `.order('assigned_at')` → Postgres **42703** (PROD has `created_at` only). Sara add looked broken (roster refresh fail / silent 23505). Fix: dual-path order in `userProjectAssignmentQuery.ts`. Needs PROD TF **>256**.

**This session — ASC resubmit cut 256 (2026-09-11):** Web signup post-pay invite link force-opens Taskr (`open=1`) via Pages `signup.js` + `signup-checkout-status` (DEV+PROD redeployed). PROD `login_identifier_is_registered` confirmed live. App bakes `/taskr/signup.html` + PROD Supabase. Local `./build-local.sh ios production` → IPA **v1.1.3 (256i-rc)** `.eas/artifacts/build-1789109945447.ipa`; EAS submit https://expo.dev/accounts/insitetech/projects/buildtrack/submissions/cdb2231f-598e-4f1a-9328-680ad3048e6d. Do **not** resubmit **254** (stale github.io signup URLs). Human: wait ASC VALID → attach **256** + paste notes.

**This session — self-serve cancel (2026-09-10):** Web `/taskr/billing.html` (password + magic link) → Edges `cancel-subscription` + `billing-subscription-status` (JWT, company admin). Trial → Stripe `cancel_at=trial_end` + void/delete open|draft invoices; active → `cancel_at_period_end`; incomplete → immediate. Local status stays until `customer.subscription.deleted`. App CTA → billing page. Edges **DEV + PROD** deployed. Gate A ([risks](ba75d734-75bb-4db3-89c2-498164dc21cd)) Criticals folded; Gate B ([validation](66030489-5d6b-4660-9f65-b66fb91c0f98)) **NO-GO** until: git push Pages HTML, DEV signup→cancel smoke, Test Clock $0. Residual: same-email re-signup stays 409 / support.

**This session — site map cutover (2026-09-10):** `www.insiteworks.co/` = Insite Works construction portfolio; Taskr = `/taskr/`. Pushed `cb25371`. **ASC 1.1.3 (REJECTED editable):** Privacy + Support + Marketing → `/taskr/…` via API. Live **1.0 READY_FOR_SALE** Privacy still locked (old GitHub PDF) until next editable app-info state. **Auth** DEV+PROD: `site_url` = `https://www.insiteworks.co/taskr/`; `uri_allow_list` includes `/taskr/**` + legacy domain/github.io + app scheme.

**This session — site map cutover (2026-09-10):** `www.insiteworks.co/` = Insite Works construction portfolio (Keynote HTML from iCloud INSITE Portfolio v5). Taskr = `www.insiteworks.co/taskr/` (landing, signup, support, legal). `legalLinks.ts` + ASC paste updated. Root legacy paths redirect into `/taskr/`.

**This session — checkout-first web signup (2026-09-10):** Same flow DEV/PROD. Form → Stripe → webhook provisions CA+company → success page invite-open link. **Sandbox happy-path PASS** (`4242…`): auto-provision after DEV `role` vs PROD `system_permission` fix (`a4cf3fe`). Edges on **DEV + PROD**. Docs pushed (`2f7b663` + fixes; `docs/` root restored `6edc5e9`). **Phone residual:** open invite-open link on iPhone Internal TF (DEV) → Set Password. Live PROD signup = real card. Signup URL SoT: `https://www.insiteworks.co/taskr/signup.html`.

**This session — PROD TF 254 (2026-09-10):** commit `91b9606` (ASC web plan alert + email-first Login + Create Project intentional roster). Local `./build-and-submit.sh ios production true` → IPA **v1.1.3 (254i-rc)**; EAS submit https://expo.dev/accounts/insitetech/projects/buildtrack/submissions/6c191abe-efbd-419e-b798-11cfb760a15e. Dogfood on iPhone TF **254**. Login RPC migration still needs Human GO on PROD.

**This session — Create Project intentional roster (2026-09-10):** On Create Project, CA picks people from the **company roster** and sets **Member** or **Project Admin** (PA = CA/PM only; ≤1 PA). Empty roster allowed (= company inventory only). Removed silent creator auto-assign from `createProject`. Post-create still returns to Company Projects list. Placements use `upsertProjectMembership` with `candidateUser` guard.

**This session — ASC-safe Company Plan web alert (2026-09-10):** Upgrade / seat-pack actions no longer open Stripe from the app. Tapping plan or seat CTAs shows Alert "Manage plan on the web" → **Open website** opens `COMPANY_PLAN_MANAGEMENT_URL` (`https://www.insiteworks.co/taskr/#pricing`). CTA labels are **View … on website**. After billing on the web, return to the app and refresh. ASC 3.1.1 posture matches web signup.

**This session — discrete email-first Login (2026-09-10):** Single Login screen: password stays disabled until realtime `login_identifier_is_registered` RPC says the email/phone exists → button **Sign In**. Unknown email → button **Sign Up** opens existing GitHub Pages `signup.html` (email prefill). Removed separate “Sign up on the web” link. Migration `supabase/migrations/20260910000100_login_identifier_is_registered.sql` **applied:** Human on **PROD**; agent Management API on **DEV** `zusulknbhaumougqckec` (2026-09-10) — anon EXECUTE + true/false smoke PASS (`sam@insite.com` true).

**This session — PROD TF 253 (2026-09-10):** Ship Company-management gate fix + sticky plan-gate clear + createProject assign fail-closed. Local `./build-and-submit.sh ios production true` → IPA **v1.1.3 (253i-rc)** (`build-1789014314463.ipa`). Interactive submit prompt aborted script (`set -e` + `read`); manual `eas submit` → https://expo.dev/accounts/insitetech/projects/buildtrack/submissions/02c990d5-34d5-4f85-998f-1693cbf2ddce. Dogfood on iPhone TF **253** (not 251): Sara CA management; PM + Worker field shell; founder→PM logout handoff must not show Company Plan.

**This session — PM/Worker path audit (2026-09-10):** Field shell + avatar menus OK for PM/Worker once MainTabs-scoped gate ships (TF>251). Company management correctly hidden (`isAdmin`). Worker Report Issue (`status=reported`) + PM triage still blocked until PROD status migration. Fixed sticky `requiresCompanyPlanSelection` on logout/signOut/login so founder→PM/Worker device handoff does not trap non-CA in Company Plan gate. RLS still defense-in-depth only (app filters membership). Headed dogfood checklist: PM + Worker 0/1/many projects, assign→accept→progress→review, no Company mgmt row.

**This session — Company management screen missing (2026-09-10):** Avatar menu returned on TF 251, but management did not open. Root cause: `RequireWorkspaceProjectGate` wrapped entire `AppRootStack`, so with 0/unset project the gate showed ProjectPicker *instead of* the navigator — Profile/CompanyManagement never mounted. Fix: gate MainTabs only; picker empty CTA + profile wiring; AdminDashboard loading instead of null; createProject fails closed if creator auto-assign fails. **Needs TF >251.** Review-path audit: menu→mgmt→projects/users + 0-project escape + web signup + camera Continue OK in source; Stripe return polling / broad RLS residual.

**This session — PROD TF 251 (2026-09-10):** commit `1f5c7b8` (Sara CA menu + create/assign fixes). Local `./build-and-submit.sh ios production true` → **v1.1.3 (251i-rc)** IPA. EAS submit hung after schedule; ASC already has build **251 VALID**. Dogfood as `sara@insitetest.com` on iPhone TF 251 (not 249/250).

**This session — Sara avatar menu missing Company Admin (2026-09-10):** PROD row is `system_permission=admin` (no `role` col). Avatar **Company management** is gated by `isAdmin(user)`. Hardened: read snake_case `system_permission`, align `role` from permission, re-normalize on auth rehydrate, always offer Company management nav (root ref fallback). Needs new TF binary. Ask user: seat subtitle under name — Company Admin vs Worker/Manager?

**This session — Sara create-project (2026-09-10):** PROD RLS/entitlements OK for `sara@insitetest.com` (admin, project_limit 12). Root cause: app wrote `user_project_assignments.category` but PROD column is `project_role`, and `createProject` did not auto-assign the creator — new projects could disappear from membership-scoped UI. Fix in working tree: dual-read/write `project_role`↔`category` + auto-assign creator as `lead_project_manager`. Needs new TF binary (also includes Loading-projects settle fix). Not committed yet.

**This session — App Review reject fix (2026-09-09):** 5.1.1(iv) camera CTA → **Continue**; 3.1.1 remove in-app Create company → Login **Sign up on the web** → GitHub Pages `docs/signup.html` (PROD anon). Notes: `docs/superpowers/evidence/2026-09-09-asc-review-web-signup-camera-notes.md`. **Human:** PROD Auth URL allowlist for Pages; push `/docs` for Pages deploy; **new PROD binary** after merge (do not use 249 for “fixed review”).

**This session — PROD TF (2026-09-09):** local `./build-and-submit.sh ios production true` → **v1.1.3 (249i-rc)** IPA uploaded (pre-review-fix). Submission: https://expo.dev/accounts/insitetech/projects/buildtrack/submissions/359bd9a4-fc96-4a74-8907-079ee0319479.

**This session — DEV Internal TF (2026-09-08):** local `./build-and-submit.sh ios dev` → IPA **1.1.3 (248)** submitted to TestFlight Internal. Profile `dev` / EAS `preview` → **DEV**.

**Build identity (2026-09-09):** Shared integer `N` for iOS+Android; login badge `vX.Y.Z (Ni-tf|Na-rc|…)`. SoT: `documentation/BUILD_IDENTITY.md` + `scripts/sync-shared-build-number.sh`. `eas.json` `appVersionSource=local`, autoIncrement off.

## Doing

**This session — RA stack Phase 1 + Phase 2 lab (2026-09-08):**
- Phase 1 on live `ActivityStyleRowCard`: fixed meta column (avatars align); `+N` / Show less collapse.
- Phase 2 Option A is **lab-only** (`ActivityPhotoSyncLabCard` + `ActivityPhotoSyncLabScreen`) — does not replace production RA. Open from Developer Settings → “Open RA photo↔event lab (Option A)”.

**This session — RA Recipe B grouped stack (2026-09-08) BUILT:** One card per `taskId`; title → latest (• + action … avatar · date + colored kind dot) → photos only if latest has them → up to 2 priors (same 16px) → `+N earlier` expands in place then hides. Cap = 20 groups. Dot tones from `activityType`+status (not regex). Dashboard `fillHeight` off for variable stacks. Files: `activityFeed.ts` (`buildActivityFeedGroups`), `ActivityStyleRowCard`, `useDashboardViewAdapter`, `DashboardScreen`.

**This session — RA post layout synthesis lock (2026-09-07):** Prefer = synthesis default (superseded by Recipe B stack above for RA cards).

**This session — archive exit + declined archive + triage assigner (2026-09-07):**
- Archive (task or report) leaves Detail immediately → Activity/Tasks origin (`onNavigateBack`; `archiveTask` no longer awaits list refresh).
- Declined is archivable (dock Archive; Reassign stays on Team).
- Report→task triage: `assigned_by` = PM triager; reporter kept as `original_assigned_by` / Owner row. Writes retry without that col if missing (no new DDL this cycle).

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

1. **ASC 1.1.3 resubmit (Human):** after TF **257** is VALID, attach **257** (not 244/254/256); paste Support/Marketing URLs + EN/zh-HK from `documentation/MARKETING.md`; replace Review notes (`docs/superpowers/evidence/2026-09-11-asc-resubmit-review-notes.md`); checklist `docs/superpowers/plans/2026-09-01-asc-listing-paste.md`. Screenshots already in ASC.
2. Extra GO: Stripe 60d promo + founding-CA Checkout on PROD (sandbox DEV start-checkout smoke PASS 2026-09-11)
3. After listing ships: finish `M-OPS-03` parked writes → **M-AUTHZ-02** — do not jump
4. Idle: PROD `reported`/`resolved` DDL Human GO before claiming that path on PROD TF (`login_identifier_is_registered` already live on PROD)

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
