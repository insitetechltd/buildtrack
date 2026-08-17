# R4 — store / legal gap audit (2026-08-17)

Read-only audit against commercial-week R4 and App Store requirements.

## ✅ Done / in flight

| Item | Status |
|------|--------|
| iOS binary submitted | Build **181** VALID in ASC (`6754898737`) |
| Bundle ID matches ASC | `com.buildtrack.app.local` |
| Corp onboarding model | Create company + admin invite + set-password (live) |
| Account deletion (individual) | `delete_own_account` RPC live; admin-only delete in corp model |
| App Review notes draft | `docs/superpowers/evidence/2026-08-17-corp-app-review-notes.md` |

## ❌ Gaps — need human / follow-up

| Item | Current state | Action |
|------|---------------|--------|
| **Privacy policy URL** | Profile → Privacy Policy shows **"Coming Soon"** alert | Host policy (see `HOST_PRIVACY_POLICY_GOOGLE.md`); wire URL in `useProfileViewAdapter` |
| **Terms of service** | **"Coming Soon"** alert | Host + link or remove menu row until ready |
| **Support URL / contact** | Generic alert: "contact your system administrator" | Add support email/URL for App Store Review + Profile |
| **ASC metadata** | Not verified this pass | Confirm description, keywords, screenshots, age rating |
| **Demo credentials for Review** | Placeholder in review notes | Fill `[provide admin credentials]` before submit for review |
| **Android Play** | Not in tonight scope | Privacy URL + signing if Play track needed |

## Not blockers for TestFlight internal

TestFlight closed testing can proceed while privacy/terms URLs are finalized before **public** App Store review.

## Priority on return

1. Attach build **181** in ASC / TestFlight
2. Host privacy policy + wire in app
3. Fill App Review demo account + notes
