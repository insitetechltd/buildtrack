# R4 — ASC paste card (2026-08-17)

GitHub Pages URLs (no extra host). App Store Connect API key used for submit **can read metadata but cannot PATCH** (403 FORBIDDEN). Paste these in the ASC web UI.

**Do not tick Public. Do not Submit for Review unless you intend to.**

## App Information (app-level)

| Field | Paste |
|-------|--------|
| Privacy Policy URL | https://insitetechltd.github.io/buildtrack/privacy-policy.html |
| (current value) | GitHub blob `policy.pdf` — replace with the Pages URL |

App Information → **Insite Trackr** → English (U.S.) → Privacy Policy URL.

## Version / listing (iOS 1.0 is READY_FOR_SALE)

| Field | Status |
|-------|--------|
| Support URL | **Already set** to https://insitetechltd.github.io/buildtrack/support.html |
| Description / keywords / screenshots | Present on 1.0 — review, do not blank |
| Version string on sale | **1.0** (TestFlight builds 181/183 are 1.1.3 — create an iOS version **1.1.3** in ASC if this RC should be the next store version, then attach build **183**) |

## App Review Information

| Field | Status |
|-------|--------|
| Demo account required | **Already true** |
| Demo username / password | **Already filled** (do not paste passwords into git) |
| Notes | Currently empty — paste the block in `docs/superpowers/evidence/2026-08-17-corp-app-review-notes.md` (omit the “Demo access” line if ASC already has credentials) |

## After Pages deploy

Confirm HTTP 200:

- https://insitetechltd.github.io/buildtrack/privacy-policy.html
- https://insitetechltd.github.io/buildtrack/terms-of-service.html
- https://insitetechltd.github.io/buildtrack/support.html
