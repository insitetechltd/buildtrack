# R2 — RC native rebuild evidence (2026-08-17)

## Objective

Post–S-UX-01Q2 IMGLY uninstall: refresh CocoaPods and produce a simulator binary that matches the JS tree (Skia draw path, no IMGLY).

## What we found

- `package.json` / lock had no `@imgly/*`, but **orphan** `node_modules/@imgly` + **stale** `ios/Podfile.lock` / `ios/Pods` still carried IMGLY 1.66.0.
- That means prior Maestro runs may have been on a **stale native** binary relative to JS.

## Actions

1. Removed orphan `node_modules/@imgly`
2. Deleted `ios/Pods` + `ios/Podfile.lock`; `npx pod-install` → **IMGLY_COUNT=0** in new lock; Skia 2.2.12 still linked
3. `npx expo run:ios --device B7B2640C-4738-4F8A-AEEE-5DF3D21D2533 --no-bundler`
   - **Build Succeeded** (0 errors)
   - Installed + opened `com.buildtrack.app.local` on iPhone 17 Pro Max
   - Log: `.cache/r2-expo-run-ios.log`

## Not in this R2 slice (need GO)

- `app.json` version / buildNumber bump
- EAS `production` / TestFlight / Play submit
- Android rebuild (schedule after iOS RC smoke)

## Status

**CONDITIONALLY READY for R3** on this sim + Metro: local RC binary rebuilt without IMGLY.

Commit `ios/Podfile.lock` (and any pod-related diffs) when ready so CI/other machines match.
