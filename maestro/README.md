# Maestro Runtime Runbook

This file is the canonical repository-level runbook for Maestro-specific testing and simulator automation guidance.

Use this document together with:

- [`../TESTING_STRATEGY.md`](../TESTING_STRATEGY.md) for the overall testing ladder, command intent, and policy
- [`../documentation/MAINTABS_UX_CHECKLIST.md`](../documentation/MAINTABS_UX_CHECKLIST.md) for MainTabs function discovery and the **RC worker B–E** Maestro min gate
- [`../documentation/SOURCE_OF_TRUTH.md`](../documentation/SOURCE_OF_TRUTH.md) for documentation-governance rules

## Foundation Surface

The root repository now ships the `WS-QA / M-QA-02` local Maestro foundation for iOS dev-client smoke and Sprint 7 bootstrap coverage.

This foundation is intentionally narrow:

- it proves the local Maestro path is installed, documented, and runnable from the root repo
- it covers launch smoke plus the deterministic Sprint 7 bootstrap entry points
- it does not claim live Supabase-backed workflow correctness

## Layout (logical containers)

**Law:** [`documentation/TEST_TAXONOMY.md`](../documentation/TEST_TAXONOMY.md) — every flow lives under exactly one container folder. Do **not** add YAML at `flows/` root. Registry: `tests/registry.yaml` · `npm run test:taxonomy`.

| Folder | Container | Role |
|---|---|---|
| `flows/_shared/` | helpers | `_logout`, `_hard-reset-launch`, bootstrap-live-*, `pick-first-image` |
| `flows/smoke/` | `C-MAESTRO-SMOKE` | `launch-smoke`, `sprint7-*` |
| `flows/journeys/` | `C-MAESTRO-FIELD` | `journey-*` |
| `flows/qa01/` | `C-MAESTRO-QA01` | `qa01-scenario-*` (sandbox rubric — not live RLS) |
| `flows/task-core/` | `C-MAESTRO-FIELD` | `task-core-live-*` |
| `flows/create-task-photo/` | `C-MAESTRO-FIELD` | `P##` / photo create permutations |
| `flows/update-progress-photo/` | `C-MAESTRO-FIELD` | `U##` |
| `flows/dual-user/` | `C-MAESTRO-FIELD` | dual-sim gate |
| `flows/org/` | `C-MAESTRO-ORG` | company-admin |
| `flows/report/` | `C-MAESTRO-REPORT` | report journey |
| `flows/destination/` | `C-DEST` | `metro-prod-headed-*` |
| `flows/marketing/` | `C-MAESTRO-MARKETING` | store-demo / ASC shots (**not** RC gate) |
| `flows/perf/` | `C-MAESTRO-FIELD` | perf budgets |
| `flows/assets/` | fixtures | media used by upload flows |

### Key entry flows

- `flows/smoke/launch-smoke.yaml` — authenticated shell attach
- `flows/smoke/sprint7-open-developer-settings.yaml` / `sprint7-initialize-sandbox.yaml`
- `flows/_shared/bootstrap-live-manager-a.yaml` / `bootstrap-live-worker-a1.yaml`
- `flows/qa01/qa01-scenario-{a,b,c,d}-*.yaml` — M-QA-01 rubric (Maestro executes, Human approves PNGs)
- `flows/task-core/task-core-live-{create,assign,progress,completion,photo-upload}.yaml`
- `flows/destination/metro-prod-headed-smoke.yaml` — Metro→PROD headed
- `../scripts/maestro/run-local.sh` — wrapper (`MAESTRO_BIN`, project-local home)
- `../scripts/maestro/run-create-task-photo-suite.sh` — Create Task photo suite

## Preconditions

- Maestro CLI is installed locally and available on `PATH`, or `MAESTRO_BIN` points to the CLI binary
- the iOS simulator is booted
- the local dev client is installed for `com.buildtrack.app.local`
- Metro is running with `npx expo start --dev-client`

## Run Flows

Check the wrapper and CLI resolution:

```bash
bash ./scripts/maestro/run-local.sh --version
```

Run the shipped root smoke entry point:

```bash
npm run test:e2e:maestro:smoke
```

Run the other `M-QA-02` foundation flows directly through the wrapper:

```bash
bash ./scripts/maestro/run-local.sh test maestro/flows/smoke/sprint7-open-developer-settings.yaml
bash ./scripts/maestro/run-local.sh test maestro/flows/smoke/sprint7-initialize-sandbox.yaml
```

Run the `M-QA-03` live Task Core bundle:

```bash
npm run test:e2e:maestro:task-core
```

**Two-sim SOP:** two Maestro jobs only on **two distinct** simulator UDIDs (`export MAESTRO_UDID` per track). Never two jobs on the same sim — that kills the XCTest driver. One sim is the default when UDIDs are not claimed.

**RC before release** — field operator Activity / Camera / Tasks / Task Detail (checklist B–E). Company admin is **not** in this gate (org-only; no project day-to-day). Set `MAESTRO_UDID` to the booted sim:

```bash
export MAESTRO_UDID="<booted UDID>"
npm run test:e2e:maestro:rc-worker-be
```

That is P01 then U01. Read PNGs before treating rc=0 as pass.

**RC dual-user interaction gate** (final release demo — two sims, zero manual input):

```bash
npm run test:e2e:maestro:dual-user
```

Conductor: `scripts/maestro/run-dual-user-gate.sh`. Auto-picks **17 Pro Max + iPhone 16** when booted; claims pair via `sim-lock.sh`. Plan: `docs/superpowers/plans/2026-08-19-maestro-dual-user-release-gate.md`.

**Sim coordination (SOP §10):** before any Maestro run — `npm run maestro:sim-status`; do not use UDIDs locked by another chat. See `.cursor/rules/maestro-preflight.md` Gate 0.

```bash
bash ./scripts/maestro/run-create-task-photo-suite.sh
```

Run the `M-QA-01` Sprint 7 rubric automation (Maestro = operator captures evidence; Human = approver signs off on PNGs):

```bash
npm run test:e2e:maestro:qa01
```

Or directly via the wrapper for a single scenario (output screenshots land next to the flow YAML, or in the directory specified by your Maestro output flag):

```bash
bash ./scripts/maestro/run-local.sh test maestro/flows/qa01/qa01-scenario-a-rejection-loop.yaml
bash ./scripts/maestro/run-local.sh test maestro/flows/qa01/qa01-scenario-b-overdue-crunch.yaml
bash ./scripts/maestro/run-local.sh test maestro/flows/qa01/qa01-scenario-c-isolation-wall.yaml
bash ./scripts/maestro/run-local.sh test maestro/flows/qa01/qa01-scenario-d-iphone17-viewport.yaml
```

Evidence convention:

- Scenario A screenshots: `qa01-a-01-dashboard-herman-post-init`, `qa01-a-02-dashboard-tristan-actions-required`, `qa01-a-03-tristan-tasks-action-required`, `qa01-a-04-herman-no-active-task`
- Scenario B screenshots: `qa01-b-01-dashboard-overdue-queue`, `qa01-b-02-tasks-firestop-overdue-badge`, `qa01-b-03-project-cards-below-grid`
- Scenario C screenshots: `qa01-c-01-herman-dashboard-only-shared-project`, `qa01-c-02-herman-tasks-no-penthouse`, `qa01-c-03-herman-devsettings-statistics-1-project`
- Scenario D screenshots: `qa01-d-01` (dashboard header) through `qa01-d-08` (dev settings bottom safearea)
- Fill pass/fail results into `docs/superpowers/plans/2026-07-01-m-qa-01-user-testing-rubric-execution.md` after reviewing captured evidence.

## Sprint 7 Bootstrap Role

- Sprint 7 is the canonical local bootstrap path for `M-QA-02`
- these flows are for local smoke, selector attachment, and deterministic simulator entry
- Sprint 7 sandbox state is not the workflow-truth source for task behavior, uploads, or other live Supabase-backed confidence claims
- Sprint 7 sandbox IS the workflow-truth source for `M-QA-01` rubric validation, because M-QA-01 was authored explicitly against the Sprint 7 Tristan/Herman dataset

## M-QA-01 Model

- Model: **Maestro executes, Human approves**
- Maestro runs the 4 qa01-scenario-* flows and captures screenshots for every rubric checkpoint
- A passing Maestro run alone does NOT close M-QA-01
- Closure requires a human reviewer to inspect the emitted PNG evidence and fill Pass/Fail/Needs-follow-up into the execution log at `docs/superpowers/plans/2026-07-01-m-qa-01-user-testing-rubric-execution.md`
- Only after all 4 scenarios are marked Pass by a human reviewer should M-QA-01 status move from `Pipeline` to `Closed`

## Data Authority

- `M-QA-02` foundation flows use Sprint 7 only for bootstrap and smoke
- `M-QA-03` Task Core flows use live Supabase-backed login and task mutations
- do not treat Sprint 7 runtime injection as workflow truth for Task Core debugging

## Canonical Role

Use `maestro/README.md` for:

- local Maestro setup notes
- simulator launch and runtime-alignment guidance
- selector and interaction troubleshooting
- flow-specific operator instructions
- references to the current shipped Maestro command surface

Use `TESTING_STRATEGY.md` for:

- the repository-wide testing ladder
- which validation layers exist
- when to run each layer
- CI and confidence-loop policy

## Promotion Rule

When root-level Maestro flows, scripts, or runtime-alignment steps change, update this file in the same change so it remains the first-stop operational runbook.

Do not scatter Maestro setup or runtime-alignment instructions across one-off root notes when they belong here.

## Failure Triage Cheat Sheet

Use this ordered list for the most common live Maestro failures observed locally.

1. **Metro returns 5xx / Expo dev client never renders the app shell**
   - First verify: `curl -o /dev/null -s -w "%{http_code}\n" http://127.0.0.1:8081` returns `200`
   - If Metro is unreachable or returns 5xx → restart Metro in a clean terminal: `npx expo start --dev-client`
   - If the dev client dialogs for URL, run `launch-smoke.yaml` again (it contains the deep-link reattach stanza)

2. **Maestro 5999 / "Transport unreachable" / ios driver fails to handshake**
   - Symptom: `AssertionError: Transport is unreachable` or `id: <anything>` never resolves even though the simulator is booted
   - Fix: re-run the wrapper with the Maestro driver reinstall flag, or invoke `maestro --reinstall-driver test <flow.yaml>` directly
   - After reinstall, close and re-open the simulator window once before the next run

3. **`assertVisible` fails for an element that is *obviously* on screen**
   - Take Maestro's screenshot first: the PNG captures what Maestro actually saw, not what you expect
   - Check LogBox overlay visibility: Maestro cannot see under red-box / yellow-box LogBox surfaces; resolve the RN warning first
   - Add an `extendedWaitUntil` for the same selector with a generous timeout (3–8s) before the failing assertion
   - If the element is inside a scroll view, precede the check with `scrollUntilVisible` (use `centerElement: true`)

4. **Wrapper heartbeat stops printing for > 60s**
   - Expected: the `run-local.sh` wrapper prints `ALIVE pid=<pid> elapsed=<N>s` every 10s for any flow longer than 10s
   - If the heartbeat goes silent for > 60s, Maestro is stuck in a driver call or the simulator is unresponsive
   - Recovery: `TERM` the wrapper pid, confirm the maestro child process is gone, then restart the simulator app: `xcrun simctl terminate <UDID> com.buildtrack.app.local` before the next run

