# R5 — production env + store binary (2026-08-17) — CLOSED

No secrets.

## Env hardening

| Check | Result |
|-------|--------|
| Doctor | **DOCTOR_OK** (see overnight `.cache/` re-run) |
| `EXPO_PUBLIC_SUPABASE_URL` / `ANON_KEY` | Present in `.env` (values not logged) |
| LogBox / debug project-id log | Gated to `__DEV__` in `index.ts` |
| Sprint7 sandbox auto-init | `__DEV__` only |
| Dev Admin / Developer Settings nav | `__DEV__` only |
| Daily sim bundle | `app.json` iOS `com.buildtrack.app.local` (Maestro) |
| **Store iOS bundle** | **`com.buildtrack.app.local`** — matches ASC app `6754898737` / Insite Trackr |
| IMGLY leftover patch | Removed (blocked `npm ci`) |
| Android package | `com.buildtrack.app` |
| Version | `1.1.3` (no bump this cycle) |

**Note:** There is no `com.buildtrack.app` App ID on the team. Attempting to register it failed with Apple 403 (not a PLA issue — API auth OK). Store updates use `.local` until a deliberate new-app migration.

## Local compile

| Field | Value |
|-------|-------|
| Command | `./build-local.sh ios production-local` |
| IPA | `.eas/artifacts/build-1786960197637.ipa` (24.2 MB) |
| Remote iOS buildNumber | **181** (`appVersionSource: remote`) |
| Credentials | ASC API key from `eas.json` submit profile (non-interactive) |

## EAS submit

| Field | Value |
|-------|-------|
| Command | `npx eas submit --platform ios --path …/build-1786960197637.ipa --profile production --non-interactive` |
| ASC App ID | `6754898737` |
| Submission | [expo.dev submission](https://expo.dev/accounts/insitetech/projects/buildtrack/submissions/5d736f76-0749-4b27-bad5-329231d3ae4b) |
| TestFlight | https://appstoreconnect.apple.com/apps/6754898737/testflight/ios |
| Status | **Submitted** — awaiting Apple processing; **not** public release |

## Release tooling changes (uncommitted)

- `build-local.sh`: ASC API key + `EXPO_APPLE_TEAM_TYPE` for non-interactive creds; optional interactive via `EAS_ALLOW_INTERACTIVE=1`
- `app.config.js`: passthrough (no bundle ID swap)

## Close gate

R5 engineering **Closed**. Human: attach build in ASC, TestFlight pilot, manual Public when ready.
