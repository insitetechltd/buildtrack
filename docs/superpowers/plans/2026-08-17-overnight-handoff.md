# Overnight handoff — 2026-08-17 (updated morning)

**Superseded as pick-up file.** Session continuity SOP is now `documentation/NOW.md` (overwrite in place). Keep this file for U-suite / R1 engineering detail only.

## Status: U01–U12 GREEN + R1 entry-point strip

### One-shot vs suite (same as P01–P22)

U01–U12 are **independent** (`_boot` clearState + API seed). Iterate with:

```bash
bash scripts/maestro/run-update-progress-photo-one.sh U05
# or: npm run test:e2e:maestro:update-progress-photo:one -- U05
```

Full `run-update-progress-photo-suite.sh` = final gate only (not day-to-day).

### API seed (answers “inject task without Create Task UI?”)

**Yes — already wired.** Do not re-simulate Create Task for Update Progress cases.

| Piece | Path |
|-------|------|
| Seed script | `scripts/maestro/ensure-update-progress-seed-task.cjs` (service-role insert for `john.managera@test.com` + project `Project A - Commercial Building`) |
| Env out | `.cache/maestro-up-seed.env` → `UP_SEED_TITLE`, `UP_SEED_TASK_ID` |
| Open path | `maestro/flows/update-progress-photo/_seed-task-open-update.yaml` (Tasks search → detail → Update Progress) |
| Runners | `scripts/maestro/run-update-progress-photo-{one,suite}.sh` |

### U suite results (API seed)

| Cases | Result | Log |
|-------|--------|-----|
| U01–U04 | PASS (prior resume) | `.cache/overnight-resume-u-suite-apiseed.log` |
| U05 | PASS after cancel-retry helper | `.cache/overnight-u05-cancel-retry.log` |
| U06–U12 | PASS | `.cache/overnight-resume-u-suite-from-u06b.log` (`SUITE PASS: 7`) |

YAML fixes this session:

- `_cancel-library-to-update.yaml` — double cancel + system back (XCTest miss), then Select Photos back if needed (U05/U10/U11)
- U06 — use `_pick-slot-1` + `_accept-library` (not `_pick-second-keep-first`, which already accepts)

### R1 (done after U green)

Hide eng entry points when `!__DEV__`:

- Profile stack: `onNavigateToDeveloperSettings` only in `__DEV__`
- Admin dashboard: `onNavigateToDevAdmin` only in `__DEV__`
- Dashboard/Tasks already gated via `showDeveloperSettingsShortcut: __DEV__`

Maestro `sprint7-*` flows remain for QA on dev builds.

### Still open (not overnight U/R1)

- **R2 local iOS RC rebuild: DONE 2026-08-17** — evidence `docs/superpowers/evidence/2026-08-17-r2-rc-native-rebuild.md`
- **R3 core-loop smoke on that RC: DONE 2026-08-17** — launch-smoke + P01 + U01 all rc=0; tsc rc=0; regression 36/37 (known TaskDetail header Jest). Evidence `docs/superpowers/evidence/2026-08-17-r3-core-loop-smoke.md`
- Build channel: **local compile**; EAS **submit-only**
- Next: R4 store/legal, R5 env harden; then P1 R7/R8/R9
- `TaskDetailScreen.header.test.tsx` expects no back button (pre-existing vs `showBackButton={true}`)

## Next kickoff

```text
R4 store/legal + R5 production env (no sandbox in release).
Optional: full P/U Maestro suites as extra confidence, not blocking smoke close.
```
