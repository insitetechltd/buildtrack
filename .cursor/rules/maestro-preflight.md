# Maestro Preflight & Runner Hardening (Sprint 7, M-QA-01..M-QA-03 Baseline)

Create this file from cursor-handoff-2026-08-06.md §9 verbatim.
MANDATORY: Apply the 8 preflight gates + 6 runner hardening layers BEFORE ANY Maestro flow invocation.

The 295-minute false-success lesson:
- 4 runs 21:29→21:33 ALL rc=0 PASS suite result with screenshots = 0/4, 0/10, 0/4, 0/18
- Final fixed run 21:44:44 = 18/18 screenshots, elapsed 419s real wall-time
- **Sanity ratio for future runs: 24s false-pass vs 419s real-pass. If your run finishes in <60s with rc=0, it's FALSE.**
- rc=0 alone is MEANINGLESS.

---

## 8 Mandatory Preflight Gates (before ANY `maestro test`)

### Gate 0 — SIM + RESOURCE COORDINATION (before device assignment)

Read SOP §10. Run `bash scripts/maestro/sim-lock.sh status` **and** `bash scripts/maestro/resource-lock.sh status`. Check `documentation/NOW.md` for sims, users, projects, and seed namespaces already owned by another chat. If the full bundle is free → claim sim UDIDs via `sim-lock.sh` and runtime resources via `resource-lock.sh` before any flow. If any required sim/resource is locked or `maestro` is already running on that UDID → **stop**; do not share the sim, user, project, task/seed namespace, or force-purge lane with another session. Release both lock families on teardown (`sim-lock.sh release-all`, `resource-lock.sh release-all`).

### Gate 1 — LOGBOX FAMILY AUDIT
Open `index.ts` (or entry file calling `LogBox.ignoreLogs`). If the RED "Failed to open debugger…" banner is suppressed, the GRAY sibling "Open debugger to view warnings." banner MUST be suppressed alongside it. Any unstipulated bottom ~10% banner z-overlaps iPhone 17 Pro Max bottom-tab Pressables, causing XCTest SILENT TAP INTERCEPTION with rc=0. Cherry-picking = bug. This single issue produced >30% of the 5-hour debugging on M-QA-01.

### Gate 2 — UNIQUE LANDING TESTID
Every navigation assert must assert a testID that appears ONLY on that target screen (e.g. `tasks-screen__search_section` on Tasks, `developer-settings-screen__root` on DevSettings). Never allow profile-trigger or headers alone; they render on every screen and historically produced rc=0 with 100% wrong scenes.

### Gate 3 — BOTTOM-TAB NAV, NO `- back`
Explicit sibling tab tap: `tapOn id: root-tab__activity | root-tab__tasks`. NEVER `- pressKey: back`. React Navigation bottom-tab root goBack is a no-op.

### Gate 4 — SPRINT7 PRESET OVERWRITES ACTOR
If a flow taps both a confirmation-sheet actor AND a preset, cross-check `src/test-utils/sprint7RuntimeSandbox.ts` lines 256–278 for the preset's hardcoded activeActor. Preset re-inits and WIPES the confirmation-sheet actor choice. Screenshots must be labeled correctly.

### Gate 5 — SUBCOMMAND FLAG ORDER
Correct:
```bash
bash scripts/maestro/run-local.sh [options] test [--reinstall-driver] flow.yaml
```
`--reinstall-driver` is SUBCOMMAND-ONLY. Before `test` → Maestro exits 5999 "Unknown option".

### Gate 6 — ARTIFACT PATH SCOPE
Maestro v2 artifacts ONLY live under:
```
/tmp/maestro-tmp-home/.maestro/tests/<timestamp>/
```
Do NOT search `/`, `$HOME`, or repo-wide `.maestro/` for screenshots; findings there are STALE.

### Gate 7 — DASHBOARD RETURN (prefer day-to-day, not wipe)
From DevSettings or any non-root screen back to Dashboard home, prefer:
```yaml
- tapOn:
    id: "root-tab__activity"
```
or relaunch without wipe:
```yaml
- launchApp:
    clearState: false
```
**Do not** default to `clearState: true`. Ordinary boots model real phone reuse (session + caches stay). Use clearState only for intentional first-install / TCC / sandbox-reset flows (document in the YAML header). Identity switch: `maestro/flows/_logout.yaml` then login — never kill while subscribed.

### Gate 8 — VISUAL PNG EVIDENCE FIRST BEFORE rc=0 ACCEPTED
First action after ANY Maestro run (rc=0 OR rc=1) is to VISUALLY READ screenshot PNG bytes of tab-landing and actor-switch screenshots. Compare title text / list content to filename intent. rc=0 ALONE IS MEANINGLESS. False rc=0 due to banner intercepts produced 5 wasted hours.

---

## 6 Runner Hardening Layers (enforced in run-qa01-suite.sh — mirror if writing a new runner wrapper)

### Layer 1 — Metro health-check BEFORE EVERY scenario
curl `/status` HTTP 200. 3 attempts + auto-restart if cmd configured.

### Layer 2 — Flow rebuild + Maestro syntax check PRE-SUITE
Rebuild flows from Python templates → `maestro check-syntax` per flow → refuse to run if invalid.

### Layer 3 — 5999 / Transport unreachable AUTO-RETRY
On "Transport unreachable|connection refused|5999|FlyingFox" → auto-retry ONCE with `--reinstall-driver` to wipe stale XCTest FlyingFox listener.

### Layer 4 — SEMANTIC SHOT-COUNT GATE
After rc=0 PASS → count PNGs:
```
find <artifactDir>/takeScreenshot -name '*.png' | wc -l
```
Count MUST be >= NEED per scenario. If rc=0 but shots=0 → override rc=**98 SEMANTIC FAIL** + stop.
This is the AUTOMATED version of Gate #8 above that would have FAILED all 4 false-success runs (21:29→21:33) instead of reporting PASS.

### Layer 5 — STOP-ON-FAIL
First failing scenario → DO NOT run remaining scenarios against dead state; saves expensive tokens.

### Layer 6 — INTER-SCENARIO COOL-DOWN 8s
After an **intentional** `clearState: true` JS restart (QA01 / sandbox hard-reset only), PAUSE 8s before next confirmation-sheet tap to avoid race between JS bundle reload + XCTest tap dispatch. Ordinary no-clear boots do not need this cool-down.

---

## Maestro v2.8.0 applesimutils Crash Workaround
Set env var BEFORE invoking:
```bash
export MAESTRO_0CLICK_DISABLE=1
```
Skip 0-click automation that triggers applesimutils crash on 2024+ iOS simulators.

## UDID LOCK (iPhone 17 Pro Max)
Baseline target UDID from M-QA-02/03: `B7B2640C-4738-4F8A-AEEE-5DF3D21D2533`
Use: `bash scripts/maestro/run-local.sh --udid B7B2640C-4738-4F8A-AEEE-5DF3D21D2533 test …`

## Two-sim SOP (mandatory)
Parallel Maestro is allowed only on **two distinct simulator UDIDs**, **1 job per UDID**. Export `MAESTRO_UDID` (or pass `--udid`) per track before launch. Two jobs on the same UDID kill the XCTest/FlyingFox listener (`Connection refused` / `DeviceUnreachableException`). Fall back to a single sim when UDIDs are not assigned or a human is watching one headed window.

## run-local.sh Wrapper Conventions
- 10s heartbeat messages (PHASE, FINISHED rc/elapsed)
- MAESTRO_LOCAL_HOME = project-local `.cache/maestro-home` (not user-wide `~/.maestro`)
- Exit code propagation rc=MAESTRO_RC; final line = `FINISHED rc=X elapsed=Ys`

## Pre-Run Checklist (print before any maestro invocation)
```
[ ] G0: SIM + RESOURCE lock status + claim free UDIDs/accounts/projects (SOP §10)
[ ] G1: LOGBOX family both banners audited
[ ] G2: UNIQUE LANDING testID present in asserts
[ ] G3: BOTTOM-TAB taps, no pressKey back
[ ] G4: PRESET-vs-ACTOR cross-checked
[ ] G5: FLAG ORDER correct (--reinstall-driver after test)
[ ] G6: ARTIFACTS in /tmp/maestro-tmp-home only
[ ] G7: DASHBOARD RETURN via tab tap or no-clear relaunch (clearState only if intentional hard-reset)
[ ] G8: PNGs VISUALLY read after run
[ ] L1-L6: Runner wrapper layers ON (if using custom runner)
[ ] MAESTRO_0CLICK_DISABLE=1 EXPORTED
```
