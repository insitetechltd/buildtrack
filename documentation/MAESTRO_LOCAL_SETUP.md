# Maestro Local Setup

Setup-only document for getting Maestro CLI running locally on this repository.
Runtime operation, flow authoring, and failure triage live in
[`../maestro/README.md`](../maestro/README.md). Overall testing policy and the
confidence ladder live in [`../TESTING_STRATEGY.md`](../TESTING_STRATEGY.md).

## 1. Purpose

Bootstraps a local iOS-simulator Maestro installation so contributors can:

- run the repository smoke flow (`launch-smoke.yaml`)
- validate Sprint 7 bootstrap entry (`sprint7-open-developer-settings.yaml`,
  `sprint7-initialize-sandbox.yaml`)
- run the Task Core live-workflow flows and M-QA-01 scenario automation
- use `scripts/maestro/run-local.sh` as the canonical Maestro wrapper (never
  invoke `maestro` directly without a strong reason — the wrapper sets
  `MAESTRO_LOCAL_HOME` isolation, the 0-click pre-write, the 10s heartbeat,
  and the `test` subcommand injection)

## 2. Prerequisites

Before setting up Maestro:

- **macOS host** with Xcode and Simulator installed (this repository targets
  iOS simulator for Maestro; Android is not wired at this layer)
- **Node.js 20+** with the repository dependencies installed (`npm install`)
- **iOS simulator booted** with a UDID you can reference
  (this document defaults to the iPhone 17 Pro Max UDID used in CI seeds)
- **dev client installed** for `com.buildtrack.app.local` on the booted
  simulator
- **Metro running** on port 8081 with the Expo Dev Client bundle
  (`npx expo start --port 8081`; the project already sets
  `EXPO_USE_METRO_WORKSPACE_ROOT=1`)

## 3. Install Maestro CLI

Use the repository npm script (do not install globally via brew unless you
have a specific reason — this repository pins the upstream installer script
for reproducibility):

```bash
npm run maestro:install
```

This downloads and executes `https://get.maestro.mobile.dev` which installs
the Maestro CLI into `~/.maestro/bin/maestro`. After install, confirm the
wrapper can resolve it:

```bash
npm run maestro:doctor
```

The doctor script prints the resolved binary path and version. The runtime
`maestro doctor` self-check is intentionally skipped in the npm script
because it can fail on sandboxed volumes; real runtime health is proved by
running a flow.

## 4. Minimal Quickstart

Three commands get from zero to a passing smoke proof. Run them from the
repository root in separate terminals or tabs in order:

1.  **Start Metro** (keep this running):
    ```bash
    mkdir -p .cache/expo-home
    export HOME="$PWD/.cache/expo-home"
    export EXPO_USE_METRO_WORKSPACE_ROOT=1
    npx expo start --port 8081
    ```

2.  **Boot the simulator + install dev client** (once per machine or after
    app rebuilds). Use the iPhone 17 Pro Max seed UDID referenced in the
    project:
    ```bash
    xcrun simctl boot "B7B2640C-4738-4F8A-AEEE-5DF3D21D2533" 2>/dev/null || true
    ```
    Then install the `com.buildtrack.app.local` dev client build if it is
    not already present.

3.  **Run the smoke flow**:
    ```bash
    npm run maestro:test:smoke
    ```
    Passing (rc=0) proves Metro, the simulator, the dev client, Maestro
    driver attachment, and the profile-trigger anchor all work.

## 5. Environment Variables

The wrapper `scripts/maestro/run-local.sh` reads these variables. All are
optional; defaults are tuned for this repository.

| Variable | Default | Purpose |
|---|---|---|
| `MAESTRO_BIN` | resolved via `command -v maestro` then `~/.maestro/bin/maestro` | Absolute path to the Maestro CLI binary. Override if you keep Maestro in a non-standard location. |
| `MAESTRO_LOCAL_HOME` | `/tmp/maestro-tmp-home` (see note) | Directory used as `user.home` for the Maestro JVM. Keeps Maestro-generated caches, dep unpacks, and screenshot side-effects **out** of your real `$HOME`. Defaults intentionally to `/tmp` so reboots prune it. The wrapper falls back to `<repo>/.cache/maestro-home` only when the variable is unset in a context that cannot write to `/tmp`. |
| `UDID` / `--udid <udid>` positional arg to wrapper | (none; Maestro auto-picks) | The booted iOS simulator UDID. Required for the 0-click pre-write. The project iPhone 17 Pro Max seed is `B7B2640C-4738-4F8A-AEEE-5DF3D21D2533`. Always pass `--udid` for reproducible runs. |
| `MAESTRO_0CLICK_DISABLE` | unset (feature is **enabled** by default) | Set to `1` to skip the 0-click EXDevLauncher pre-write entirely. Use this when the pre-write causes TCC.db permission conflicts on sandboxed volumes, or when you want to validate the user-clicks-Open path explicitly. All other `MAESTRO_0CLICK_*` tunables are documented inline in `scripts/maestro/run-local.sh`. |

## 6. Troubleshooting First Steps

If `npm run maestro:test:smoke` does not pass:

1.  **Check Metro is reachable**: `curl -sSI http://127.0.0.1:8081 | head -n 1`
    should print `HTTP/1.1 200 OK`. Restart Metro if not.
2.  **Check the simulator is booted**: `xcrun simctl list | grep Booted`.
    If empty, boot the target UDID before re-running.
3.  **Verify `com.buildtrack.app.local` is installed on the booted simulator**:
    `xcrun simctl listapps B7B2640C-4738-4F8A-AEEE-5DF3D21D2533 | grep buildtrack`.
4.  **Re-run with 0-click disabled** if you see TCC.db sandbox errors:
    ```bash
    MAESTRO_0CLICK_DISABLE=1 bash ./scripts/maestro/run-local.sh \
      --udid B7B2640C-4738-4F8A-AEEE-5DF3D21D2533 \
      test maestro/flows/launch-smoke.yaml
    ```
5.  **Check `MAESTRO_LOCAL_HOME` is writable**: the wrapper prints the resolved
    path in its launch line (`Phase: maestro-launch MAESTRO_LOCAL_HOME=...`).
6.  For runtime assertion or screenshot failures after the driver attaches,
    see **Failure Triage Cheat Sheet** in [`../maestro/README.md`](../maestro/README.md).

## 7. Next Steps

Once smoke passes, read the following for the broader testing ladder and
flow authoring conventions:

- **Runtime runbook and flow inventory**:
  [`../maestro/README.md`](../maestro/README.md) — documents every shipped
  flow, the Sprint 7 bootstrap role, the M-QA-01 Maestro-executes /
  Human-approves model, the failure triage cheat sheet, and when to reach
  for `run-local.sh` versus a direct `maestro` invocation.
- **Repository-wide testing strategy, 4-layer ladder, and validation matrix**:
  [`../TESTING_STRATEGY.md`](../TESTING_STRATEGY.md) — defines when to run
  `test:regression`, `test:e2e:journeys`, `validate:local:confidence`, and
  the Maestro-backed confidence bundle, plus what each layer proves and
  what it deliberately does not claim.
