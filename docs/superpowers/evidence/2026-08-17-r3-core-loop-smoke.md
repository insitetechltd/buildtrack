# R3 — Core-loop smoke on local RC (2026-08-17)

## Policy

Compile **locally**. EAS **only** for App Store / Play submit (no cloud build for R2/R3 validation).

RC binary: post-IMGLY `npx expo run:ios` on iPhone 17 Pro Max `B7B2640C-4738-4F8A-AEEE-5DF3D21D2533` (R2 evidence).

## Results

| Check | Result | Log |
|-------|--------|-----|
| `npx tsc --noEmit` | **rc=0** | `.cache/r3-tsc.log` |
| `npm run test:regression` | **36/37 suites** — known fail `TaskDetailScreen.header.test.tsx` (expects no back button; screen has `showBackButton`) | `.cache/r3-regression.log` |
| Maestro `launch-smoke` | **rc=0** (~21s) | `.cache/r3-maestro-smoke.log` |
| Maestro **P01** (create task + photo) | **rc=0** (~123s) | same |
| Maestro **U01** (update progress + photo, API seed) | **rc=0** (~158s) | same |

Smoke = launch + one create-photo + one update-photo on the **rebuilt** native app. Not full P01–P22 / U01–U12 suites.

## Status

**CONDITIONALLY READY** for R4/R5 (store/legal + env). Optional later: full photo suites as final gate, not required to close this smoke.

Known Jest fail is pre-existing header test vs product `showBackButton`; not an R3 product-loop blocker.
