# R4 — store / legal gap audit (2026-08-17)

## Engineering (this pass)

| Item | Status |
|------|--------|
| iOS binary | Build **181** VALID + attached TestFlight (`6754898737`) |
| Bundle ID | `com.buildtrack.app.local` matches ASC |
| Corp onboarding | Create company + invite link + set-password |
| Account deletion | Org-managed seats; `delete_own_account` for eligible roles |
| In-app Profile links | Privacy / Terms / Help open GitHub Pages HTTPS URLs (`src/legal/legalLinks.ts`) |
| Hosted privacy | `https://insitetechltd.github.io/buildtrack/privacy-policy.html` (goes live after this commit deploys Pages) |
| Hosted terms | `https://insitetechltd.github.io/buildtrack/terms-of-service.html` |
| Hosted support | `https://insitetechltd.github.io/buildtrack/support.html` (already live) |

Draft copies also live under `docs/legal/` for later custom-domain hosting.

## Still human (cannot finish without ASC / credentials)

| Item | Action |
|------|--------|
| **ASC Privacy Policy URL** | Paste the GitHub Pages privacy URL into App Privacy / App Information |
| **ASC Support URL** | `https://insitetechltd.github.io/buildtrack/support.html` |
| **Listing metadata** | Screenshots, description, keywords, age rating |
| **App Review demo account** | Fill real admin email/password in `docs/superpowers/evidence/2026-08-17-corp-app-review-notes.md` then paste into ASC |
| **Custom domain** | Optional later: CNAME `insiteworks.co` → same HTML |
| **Android Play** | Same URLs when that track is submitted |

## Not blockers for TestFlight internal

Internal TestFlight can stay as-is. Public App Store review needs the ASC URL fields + demo login.
