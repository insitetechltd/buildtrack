# Maestro Local Flows

This folder contains the local-first Maestro scaffold for the iOS simulator dev-client workflow.

## Files

- `flows/launch-smoke.yaml`: verifies the installed dev client launches into the authenticated app shell.
- `flows/sprint7-open-developer-settings.yaml`: opens the workspace menu and navigates to `Developer Settings`.
- `flows/sprint7-initialize-sandbox.yaml`: opens `Developer Settings` and triggers the Sprint 7 staging sandbox initializer.

## Preconditions

- Maestro CLI is installed locally.
- The iOS simulator is booted.
- The local dev client is installed for the current app identifier: `com.buildtrack.app.local`.
- Metro is running with the dev-client entry point.

## Install Maestro

```bash
curl -Ls "https://get.maestro.mobile.dev" | bash
maestro doctor
```

## Start The App

Build or reinstall the local iOS dev client when needed:

```bash
npm run ios
```

Start Metro for the dev client in a separate terminal:

```bash
npx expo start --dev-client
```

The launch smoke flow bootstraps the local Sprint 7 runtime sandbox through a dev-only deep link, so a pre-authenticated simulator session is no longer required.

## Run Flows

Run the highest-confidence Jest-only gate first when you do not need simulator proof:

```bash
npm run test:confidence
```

Run the local validation wrapper that adds journeys on top of type-check + regression coverage:

```bash
npm run validate:local:confidence
```

Run the smallest smoke check:

```bash
npm run test:e2e:maestro:smoke
```

Run the full starter set:

```bash
npm run test:e2e:maestro:critical
```

Run the full local confidence loop, including Maestro smoke:

```bash
./scripts/dev-loop.sh --confidence-full
```

Run a specific flow directly:

```bash
maestro test maestro/flows/sprint7-open-developer-settings.yaml
```

## Flow Notes

- The flows prefer stable `testID` targets where they already exist, including:
  - `app-screen-header__profile-trigger`
  - `dashboard-screen__root`
  - `developer-settings__root`
  - `developer-settings__action_initialize-sprint7-sandbox`
- The Sprint 7 sandbox flow taps the `Reset as Tristan` alert action and expects the success alert title `Sprint 7 Sandbox Ready`.
- The launch smoke flow opens `taskr://automation/sprint7/tristan` and conditionally accepts the one-time iOS "Open in Taskr?" confirmation dialog when it appears.
- `test:confidence` and `validate:local:confidence` do not invoke Maestro; they stop at Jest journey confidence.
- `./scripts/dev-loop.sh --confidence-full` is the shipped wrapper that promotes the confidence loop into native simulator smoke by enabling `npm run test:e2e:maestro:smoke`.
- If the app is logged out, blocked on Metro, or running a different build, the smoke flow should fail fast instead of masking setup drift.

## Troubleshooting

- `App com.buildtrack.app.local not found`: rebuild with `npm run ios`, then relaunch the simulator app.
- App opens but the flow cannot find dashboard elements: confirm Metro is reachable and that the dev build still honors the Sprint 7 automation deep link.
- `Developer Settings` is not found: verify the workspace menu opens from the dashboard header and that the current user can access the authenticated shell.
- Sandbox initialization fails: inspect the in-app alert for the exact runtime error and verify the development build still exposes the Sprint 7 sandbox helpers.
