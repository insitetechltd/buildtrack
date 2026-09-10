# App Review response — camera Continue + web signup (2026-09-09)

Paste into App Store Connect → Resolution Center / App Review Information → Notes (adapt as needed). Do **not** put passwords in git.

## What we changed

1. **Guideline 5.1.1(iv)** — The custom camera pre-permission screen no longer uses an “Allow …” button. The primary action is labeled **Continue**. Body copy explains why the camera is used without coaching the system grant.

2. **Guideline 3.1.1** — **Business / organization account registration was removed from the iOS app.** Login is sign-in only. New company accounts are created on our website:

   `https://www.insiteworks.co/taskr/signup.html`

   The in-app control is **Sign up on the web**, which opens that page in Safari. The app does not present an in-app Create company form.

## How to verify

- Fresh install → Login → confirm there is no in-app company registration form.
- Optional: open the signup URL in Safari, create an account, then sign in with that email in the app.
- Demo account for Review remains the existing TestFlight / Review credentials (see ASC App Review Information — not stored in this repo).

## Build note

Ship a **new production binary** that includes these changes. Do not claim this fix on an older build (e.g. 243/244/249 built before this change).

## Human — PROD Supabase Auth allowlist

In PROD Authentication → URL configuration, ensure the Pages origin is allowed, e.g.:

- Site URL / additional redirect URLs include `https://www.insiteworks.co/taskr/signup.html`
- Prefer also `https://www.insiteworks.co/taskr/**` (and legacy GitHub Pages `/buildtrack/taskr/**` if still used)

If email confirmation is required on PROD, the signup page surfaces a sign-in / confirm-email message (same as mobile `createCompanyAccount`).
