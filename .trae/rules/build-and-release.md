---
alwaysApply: false
description: Use this rule when editing Expo, EAS, native build, release, dependency, or environment configuration files and scripts.
---
# Build And Release Rule

## Key Files

- `package.json`
- `app.json`
- `eas.json`
- `babel.config.js`
- `metro.config.js`
- `tailwind.config.js`
- `patches/`
- `documentation/`
- build and submit scripts in the project root and `scripts/`

## Constraints

- Preserve the Expo-managed workflow unless the task explicitly asks for bare React Native changes.
- Respect the current dependency install expectation: `npm install --legacy-peer-deps`.
- Assume `patch-package` patches are intentional and required.
- Do not casually upgrade Expo, React Native, React, Reanimated, or EAS-related config.
- Be careful with bundle identifiers, package names, runtime version, and build numbers.

## Environment

- Keep environment configuration aligned with the current Supabase-based setup.
- Do not hardcode secrets, service account contents, or credential paths into source files unless the project already requires a local path and the task is specifically about that setup.

## Verification

- For script or config changes, verify the exact command names and file paths against the repository before documenting them.
- Prefer targeted validation steps over full platform builds unless the task specifically asks for build execution.
