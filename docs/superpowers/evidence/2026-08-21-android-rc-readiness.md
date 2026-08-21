# Android RC readiness — 2026-08-21

**Goal:** Ship Android RC for **1.1.3** (parity with iOS TF190 / App Store review), package `com.buildtrack.app`.

**Do not** promote to Play production / “available to users” without Human GO.

---

## Current facts

| Item | Status |
|------|--------|
| App version (`app.json`) | **1.1.3** |
| Android package | `com.buildtrack.app` (≠ iOS `com.buildtrack.app.local` — intentional) |
| EAS profile | `production` → AAB (`:app:bundleRelease`), `credentialsSource: remote`, `autoIncrement: true` |
| Submit profile | `google-service-account.json` → track **production**, `releaseStatus: **draft**` (safe) |
| Service account | Present, gitignored; email `insite-works-ltd@taskr-481802.iam.gserviceaccount.com` |
| Legal URLs (HTTP 200) | Privacy / Terms / Support on GitHub Pages (same as iOS) |
| Recent EAS Android store builds | Last attempts **errored** (2026-01-12 etc.): version **1.1.2**, versionCode **30–33**. No fresh successful 1.1.3 AAB in EAS list. |

Local `android/app/build.gradle` shows `versionCode 1` / `versionName "1.1.3"` — **cloud EAS remote autoIncrement is SoT** for store builds; ignore local gradle code for Play.

---

## Prep checklist (ordered)

### A. Build (blockers first)

1. [x] Confirm Play Console app exists for **`com.buildtrack.app`**
2. [x] Local upload keystore matches Play (`google certificates/upload-keystore.jks` SHA1 `0C:FE:9A…`). `production-local` Android → `credentialsSource: local`. **EAS remote still wrong** (`AD:75…`) — do not use cloud Android store builds until fixed.
3. [x] Service account can submit (internal track succeeded)
4. [x] Local EAS AAB: `./build-local.sh android production-local true` → versionCode **40**, `.eas/artifacts/build-1787269034779.aab`
5. [x] Native pins for old arch (`newArchEnabled: false`): `react-native-reanimated@~3.19.5`, `react-native-screens@~4.16.0`, `react-native-worklets@0.5.1` Babel-only (autolink off)

### B. Internal / draft release (RC)

6. [x] Submitted to **internal** draft (production track hit Play “Precondition check failed” — finish listing/setup in Console before production draft)
7. [x] Submit: `npx eas submit --platform android --profile internal --path .eas/artifacts/build-1787269034779.aab --non-interactive`
8. [ ] Install from internal track / draft tester link; smoke same as iOS RC: login → Activity → Tasks → create/update photo → background ≥1 min → foreground

### C. Play Console listing (human)

9. [ ] Store listing: short/full description, icon, feature graphic
10. [ ] Screenshots (phone required; tablet if claimed)
11. [ ] Privacy policy URL → Pages privacy HTML (not old PDF)
12. [ ] Content rating / Data safety / target audience questionnaires current
13. [ ] Release notes (reuse iOS What’s New bullets)
14. [ ] **Do not** roll out to production % until Human GO

---

## Recommended first command (after GO)

```bash
npx eas build --platform android --profile production
```

If build fails, open the Expo build log and fix credentials/Gradle before submit — do not reset Play upload keys without an explicit GO.

---

## Out of scope for Android RC

- `M-AUTHZ-02` multi-company membership
- Wave 2 / M-OPS
- Changing package name or iOS/Android ID unification
