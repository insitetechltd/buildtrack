---
name: insite-dev
description: >-
  InsiteApp project overlay for the solo-dev harness: session kickoff/teardown,
  doctor, Jest/Maestro confidence ladder, Supabase SoT paths, and Maestro preflight.
  Use at session start, before Maestro/QA, or when applying Insite-specific delivery rules.
---

# Insite Dev Overlay

Use with personal skill `solo-dev-harness` (`SOP.md` = whole portable cycle, `capabilities.md`). Insite-only law stays here (Maestro, Supabase gates, Taskr SoT). Process improvements dual-write to SOP.md + harness `templates/` + matching Insite files — never Insite-only.

## Dual-write (process, not overlay)

Portable cycle changes → `~/.cursor/skills/solo-dev-harness/SOP.md` + `templates/` + this repo. Do not encode Maestro UDID caps or Supabase Human Gates into the portable templates.

## Session kickoff

1. Read `documentation/NOW.md` (doing / next / locked / parked)
2. Read `AGENTS.md` § Current Delivery Status
3. Skim active rows in `documentation/ROADMAP.md`
4. **Intake** — extract a 5-line brief; if THIN, ask ≤4 A/B/C (or GO = defaults) before Planner/Builder. See `~/.cursor/skills/solo-dev-harness/intake.md`.
5. Run `npm run dev:doctor` — if FAIL, fix machine before Maestro/release claims
6. State pipeline focus in ≤5 lines (milestone + next proof) — must match NOW
7. Jargon: `documentation/CURSOR_DEV_HARNESS.md` § Terminology (smoke, suite, RC, week-rank R#, Wave 2)
8. **Before Maestro:** SOP §10 — `npm run maestro:locks` (or sim-lock + resource-lock status); check NOW for sim/user/project locks; claim free UDIDs and runtime resources; dual-user RC → `npm run test:e2e:maestro:dual-user` (17 Pro Max + iPhone 16 when free)
9. **If the task is ROADMAP / Wave 2 / AI / DMS / drawings / cost / owner console / Save Draft / multi-company membership:** read `docs/superpowers/analysis/2026-08-19-roadmap-clarification.md` **before** proposing sequence changes. That file is the 2026-08-19 lock (plus dated addenda); append addenda when the user revisits. Multi-company product SoT: `documentation/multi-company-project-membership.md`.
10. **If the task is App Store listing, landing, outreach, or store screenshots copy:** read and update `documentation/MARKETING.md` first so public claims match shipped features.

## Session teardown

1. What shipped / what blocked
2. **Overwrite** `documentation/NOW.md` (same file; next-action + new locks/parks). Do not create dated NOW copies.
3. Update ROADMAP / AGENTS status only if evidence changed
4. If thinking changed and the user asked to commit, include NOW in that commit (default push)

## Confidence ladder

| Layer | Command / path | Owns |
|---|---|---|
| L1 fast | `npm test` / targeted `test:*` | logic loop |
| L2 regression | `npm run test:regression` | cross-module |
| L3 native | `scripts/maestro/run-local.sh test …` | taps/runtime |
| L4 human | QA Validator + you | accept |

Canonical policy: `TESTING_STRATEGY.md`, `maestro/README.md`, `documentation/MAESTRO_LOCAL_SETUP.md`.

## Multi-critique (orchestrator)

For non-trivial / user-visible / shared-primitive work, follow `.cursor/rules/multi-critique-validation.mdc` **after intake READY**:

- **Plan Adversary (Gate A):** ≥2 parallel critiques (prefer different models) before Builder
- **Proof Adversary (Gate B):** ≥1 independent critique before Judge GO; prove focus/keyboard/submit for form primitives
- Jest `changeText` alone ≠ tap/focus proof

## SoT paths

- Tasks: `src/state/taskStore.supabase.ts`
- Supabase client: `src/api/supabase.ts`
- Nav: `src/navigation/AppNavigator.tsx`
- Docs governance: `documentation/SOURCE_OF_TRUTH.md`
- Session continuity: `documentation/NOW.md`
- Multi-company membership (post-RC): `documentation/multi-company-project-membership.md`
- **Roadmap discussion lock (2026-08-19):** `docs/superpowers/analysis/2026-08-19-roadmap-clarification.md` — read before changing Wave 2 / AI / DMS / post-RC order

## Maestro preflight (mandatory before flow claims)

1. **Metro first:** Always boot Metro and wait for HTTP 200 / pre-warmed bundle *before* booting simulators and launching the app (prevents "Could not connect to development server" redbox).
2. Suppress LogBox debugger banners as a family (red + gray) if either is ignored
3. Assert unique landing testIDs (not headers that appear on every screen)
4. Bottom-tab nav via tab testIDs — never rely on root `- back`
5. Use `run-local.sh [opts] test …` flag order only (`--reinstall-driver` after `test`)
6. After every run, visually read screenshot PNGs — `rc=0` alone is insufficient

## Concurrent development (Orchestrator / Maestro)

Prefer concurrent tracks whenever file ownership partitions cleanly.

### Create Task photo cases (P01–P22)

- Each `P##-*.yaml` is **independent** (`_boot` clearState). Develop/fix with one-shot runs — not full sequential loops.
- One-shot: `bash scripts/maestro/run-create-task-photo-one.sh P04` (or `FORCE_PURGE=1 …`).
- npm: `npm run test:e2e:maestro:create-task-photo:one -- P04`
- Full sequential suite (`run-create-task-photo-suite.sh`) = **final gate only** after all cases pass alone.
- Partition P-ranges across concurrent agents (e.g. A: P01–P11, B: P12–P22). Do not co-edit the same `P##` file.

### Update Progress photo cases (U01–U12)

- Same model as P: each `U##-*.yaml` is **independent** (shared `_boot` clearState + API seed task — no Create Task UI).
- One-shot while developing/fixing: `bash scripts/maestro/run-update-progress-photo-one.sh U05` (or `FORCE_PURGE=1 …`).
- npm: `npm run test:e2e:maestro:update-progress-photo:one -- U05`
- Full sequential suite (`run-update-progress-photo-suite.sh`) = **final gate only**.
- Partition U-ranges across concurrent agents (e.g. A: U01–U06, B: U07–U12). Do not co-edit the same `U##` file.
- Shared helpers under `maestro/flows/update-progress-photo/_*.yaml` + seed script = **single-writer**.

### Machine / sim caps (this host profile)

- **Sim/resource coordination:** SOP §10 — `npm run maestro:locks` before Maestro; claim if free; release both on teardown.
- **RC dual-user pair (when free):** assigner = iPhone **17 Pro Max** `B7B2640C-4738-4F8A-AEEE-5DF3D21D2533`; assignee = **iPhone 16** `F537DDA8-E83B-4A29-AF38-ACC8EC64F0DA`. **Avoid** iPhone **17 Pro** `702680D5-A92E-4C56-BE55-731D424FE63A` when another chat is headed there.
- Typical Insite laptop: **≤2** concurrent Maestro jobs on **distinct** UDIDs only.
- **Two-sim SOP:** assign one UDID per track **before** launch (`export MAESTRO_UDID=<that sim>`). Do not rely on script defaults when multiple sims are booted.
- **1** Maestro job per UDID. Never two processes on the same UDID (XCTest/FlyingFox death).
- Shared helpers = **single-writer**; prefer Photos **REUSE**; one `FORCE_PURGE` owner at a time.
- No `src/` land while Maestro is running on shared Metro `:8081`.

### Orchestrator sync checklist

1. **Sim/resource lock preflight** (SOP §10): `npm run maestro:locks` + NOW; claim UDIDs plus `user:*`, `project:*`, and when needed `task:*` / `seed:*`; refuse if another chat holds any required lock.
2. Assign UDID + seat/account + project scope + P-range and/or U-range (or file paths) per track before launch.
3. List single-writer files and shared mutators up front (`photos:force-purge`, seed scripts, shared `_*.yaml`).
4. After both tracks finish: merge helper/product fixes once → one-shot re-verify affected P## / U## → final suite gate.
5. **Teardown:** `sim-lock.sh release-all` + `resource-lock.sh release-all`.

## Trae migration

`.trae/` is legacy. Project law is `.cursor/rules/`. Do not add new Trae-only agents.

## PhotoKit / library picker HUD

When the task is hybrid picker, Recents, `PhotokitThumbs`, HUD `1st`/`meta`/`1st 12`, or Accept spinner after checkmark: read `.cursor/skills/photokit-picker-perf/SKILL.md` and `~/.cursor/skills/native-photos-first-paint/SKILL.md`. Do not sort Recents for first paint. HUD legend: `docs/superpowers/analysis/2026-08-30-photokit-first-paint-journey.md`.
