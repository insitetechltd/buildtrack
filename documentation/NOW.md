# NOW — session continuity

**SOP:** git-tracked NOW + **full cycle** in `~/.cursor/skills/solo-dev-harness/SOP.md`. Process changes: dual-write SOP.md + harness `templates/` + this repo. Portable NOW template: `~/.cursor/skills/solo-dev-harness/templates/documentation/NOW.md`.

**Who updates:** any agent on session teardown, or when a lock/park/next-action changes. Commit with the work that changed thinking (user-requested commit + default push).

**Keep short:** Doing / Next / Locked / Parked. Details belong in ROADMAP, AGENTS status, or a plan — not here.

---

## Doing

Commercial **RC week**. **R5 Closed:** build **181** in TestFlight. **R7/R8 landed** (company-plan checkout hook + Profile dead-row cut). R4 Pages URLs wired.

**Cursor chat pick-up:** transcripts on KooDrive. Mount KooDrive **before** Cursor; open `/Volumes/KooDrive/InsiteApp` only.

## Next

1. **Human (ASC):** paste Privacy / Support URLs from `src/legal/legalLinks.ts`; fill App Review demo credentials
2. Set `EXPO_PUBLIC_STRIPE_CHECKOUT_URL` when a Stripe Payment Link exists (mailto fallback until then)
3. Optional: Android local `production-local` build

Do **not** tick Public in ASC without explicit intent.

## Locked this week

- **R1–R3** — R2/R3 evidence on file; R1 eng UI `__DEV__`-only
- **Corp model (2026-08-17):** org-owned seats; invite sign-in link; blocking Set password; no worker Delete Account
- **`must_set_password` LIVE** + invite smoke PASS. Evidence: `docs/superpowers/evidence/2026-08-17-corp-must-set-password-live.md`
- **Store bundle ID = `com.buildtrack.app.local`** (matches ASC app `6754898737`) — not `com.buildtrack.app`
- **R6** — org subscription paper SoT unchanged

## Parked (do not schedule this week)

- **Wave 2** (Order 15.x): web admin + DMS + tenant wipe
- Email + temp-password invite UI
- Bundle ID rename to `com.buildtrack.app` (new App Store app)

## Kickoff prompt (paste)

```text
Read documentation/NOW.md first.
Corp+R5 on origin/master (576cc28). Build 181 in TestFlight.
R4 in-app + GitHub Pages privacy/terms/support URLs. Paste those into ASC; fill demo credentials.
Wave 2 parked. Do not tick Public in ASC.
```

---

Updated: 2026-08-17
