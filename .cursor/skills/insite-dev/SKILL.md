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
4. Run `npm run dev:doctor` — if FAIL, fix machine before Maestro/release claims
5. State pipeline focus in ≤5 lines (milestone + next proof) — must match NOW
6. Jargon: `documentation/CURSOR_DEV_HARNESS.md` § Terminology (smoke, suite, RC, week-rank R#, Wave 2)

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

For non-trivial / user-visible / shared-primitive work, follow `.cursor/rules/multi-critique-validation.mdc`:

- **Plan:** ≥2 parallel critiques (prefer different models) before Builder
- **Validation:** ≥1 independent critique before “done”; prove focus/keyboard/submit for form primitives
- Jest `changeText` alone ≠ tap/focus proof

## SoT paths

- Tasks: `src/state/taskStore.supabase.ts`
- Supabase client: `src/api/supabase.ts`
- Nav: `src/navigation/AppNavigator.tsx`
- Docs governance: `documentation/SOURCE_OF_TRUTH.md`
- Session continuity: `documentation/NOW.md`

## Maestro preflight (mandatory before flow claims)

1. Suppress LogBox debugger banners as a family (red + gray) if either is ignored
2. Assert unique landing testIDs (not headers that appear on every screen)
3. Bottom-tab nav via tab testIDs — never rely on root `- back`
4. Use `run-local.sh [opts] test …` flag order only (`--reinstall-driver` after `test`)
5. After every run, visually read screenshot PNGs — `rc=0` alone is insufficient

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

- Typical Insite laptop: **≤2** concurrent Maestro jobs (distinct iPhone 17 Pro Max UDIDs).
- Primary UDID: `B7B2640C-4738-4F8A-AEEE-5DF3D21D2533`. Spare Pro Max: `3B152AF5-DA35-4E1A-B30D-11201518E0E0`.
- **1** Maestro job per UDID. Never two suite/one-shot processes on the same UDID.
- Shared helpers (`_boot`, `_open-library`, `_accept-library`, `_submit-*`, `ensure-*.sh`, `run-local.sh`) = **single-writer**; other track re-runs after.
- Prefer Photos **REUSE**; only one track may `FORCE_PURGE` at a time.
- Serialize when editing Create Task / library / Select Photos product code; both tracks re-verify after.

### Orchestrator sync checklist

1. Assign UDID + P-range and/or U-range (or file paths) per track before launch.
2. List single-writer files up front.
3. After both tracks finish: merge helper/product fixes once → one-shot re-verify affected P## / U## → final suite gate.

## Trae migration

`.trae/` is legacy. Project law is `.cursor/rules/`. Do not add new Trae-only agents.
