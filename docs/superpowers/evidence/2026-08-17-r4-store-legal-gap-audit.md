# R4 — store / legal gap audit (2026-08-17)

## Engineering (this pass)

| Item | Status |
|------|--------|
| iOS binary | Build **181** VALID + attached TestFlight (`6754898737`) |
| Bundle ID | `com.buildtrack.app.local` matches ASC |
| Corp onboarding | Create company + invite link + set-password |
| Account deletion | Org-managed seats; `delete_own_account` for eligible roles |
| In-app Profile links | Privacy / Terms / Help open GitHub Pages HTTPS URLs (`src/legal/legalLinks.ts`) |
| Hosted privacy | `https://insitetechltd.github.io/buildtrack/privacy-policy.html` (`docs/.nojekyll` pushed 2026-08-17 so Jekyll cannot 404 static HTML) |
| Hosted terms | `https://insitetechltd.github.io/buildtrack/terms-of-service.html` |
| Hosted support | `https://insitetechltd.github.io/buildtrack/support.html` (already live) |

Draft copies also live under `docs/legal/` for later custom-domain hosting.

## Still human (cannot finish without ASC web UI)

Submit API key **reads** listing but **cannot PATCH** (403). Exact paste card: `docs/superpowers/evidence/2026-08-17-r4-asc-human-paste.md`.

| Item | Action |
|------|--------|
| **ASC Privacy Policy URL** | Replace GitHub `policy.pdf` blob with Pages privacy HTML |
| **ASC Support URL** | Already Pages `support.html` |
| **Demo account** | **Already filled** in App Review Information — do not put passwords in git |
| **Review notes** | Paste corp notes (URLs included); notes field was empty |
| **Version 1.1.3** | Optional: create iOS version 1.1.3 and attach TestFlight build **183** (store listing is still **1.0**) |
| **Public / Submit for Review** | Manual only |

## Not blockers for TestFlight internal

Internal TestFlight can stay as-is. Public App Store review needs the ASC URL fields + demo login.
