---
name: insite-dev
description: >-
  InsiteApp project overlay for the solo-dev harness: session kickoff/teardown,
  doctor, Jest/Maestro confidence ladder, Supabase SoT paths, and Maestro preflight.
  Use at session start, before Maestro/QA, or when applying Insite-specific delivery rules.
---

# Insite Dev Overlay

Use with personal skill `solo-dev-harness`.

## Session kickoff

1. Read `AGENTS.md` § Current Delivery Status
2. Skim active rows in `documentation/ROADMAP.md`
3. Run `npm run dev:doctor` — if FAIL, fix machine before Maestro/release claims
4. State pipeline focus in ≤5 lines (milestone + next proof)

## Session teardown

1. What shipped / what blocked
2. Update ROADMAP / AGENTS status only if evidence changed
3. Leave a next-session kickoff prompt (max 10 lines)

## Confidence ladder

| Layer | Command / path | Owns |
|---|---|---|
| L1 fast | `npm test` / targeted `test:*` | logic loop |
| L2 regression | `npm run test:regression` | cross-module |
| L3 native | `scripts/maestro/run-local.sh test …` | taps/runtime |
| L4 human | QA Validator + you | accept |

Canonical policy: `TESTING_STRATEGY.md`, `maestro/README.md`, `documentation/MAESTRO_LOCAL_SETUP.md`.

## SoT paths

- Tasks: `src/state/taskStore.supabase.ts`
- Supabase client: `src/api/supabase.ts`
- Nav: `src/navigation/AppNavigator.tsx`
- Docs governance: `documentation/SOURCE_OF_TRUTH.md`

## Maestro preflight (mandatory before flow claims)

1. Suppress LogBox debugger banners as a family (red + gray) if either is ignored
2. Assert unique landing testIDs (not headers that appear on every screen)
3. Bottom-tab nav via tab testIDs — never rely on root `- back`
4. Use `run-local.sh [opts] test …` flag order only
5. After every run, visually read screenshot PNGs — `rc=0` alone is insufficient

## Trae migration

`.trae/` is legacy. Project law is `.cursor/rules/`. Do not add new Trae-only agents.
