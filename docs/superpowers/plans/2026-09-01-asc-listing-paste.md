# ASC listing paste pack — Taskr 1.1.3 (build 243)

**Date:** 2026-09-01  
**App:** `6754898737` · https://appstoreconnect.apple.com/apps/6754898737  
**Binary:** App Store **243** already uploaded (`production` → PROD). Do **not** start another production EAS build.  
**Copy SoT:** [`documentation/MARKETING.md`](../../documentation/MARKETING.md) — living App Store / site claims. This file is the **one-time ASC paste checklist** (URLs, screenshots, do-not-submit). Do not fork listing text here.  
**Screenshots:** `docs/assets/store/iphone-67/` (README there)

ASC API key used for `eas submit` can **read** metadata but historically **cannot PATCH** (403). Paste in the web UI.

**Do not tick Public. Do not Submit for Review until screenshots + copy are in and you intend to.**

Seller name is still **Tri Stan Ching KOO**. Do **not** convert to Insite Works Limited during this review (GTM Gate 2 OPEN).

---

## App Information (app-level, all localizations)

| Field | Paste |
|-------|--------|
| Privacy Policy URL | https://insitetechltd.github.io/buildtrack/privacy-policy.html |
| Support URL | https://insitetechltd.github.io/buildtrack/support.html |
| Marketing URL (optional) | https://insitetechltd.github.io/buildtrack/ |

Keep GitHub Pages until `https://www.insiteworks.co` returns HTTP **200**. That host was **500** on 2026-09-01. Do not add `docs/CNAME` yet.

---

## Version 1.1.3 — English (US / UK / HK English)

Paste **Name, Subtitle, Promotional text, Keywords, Description, What’s New** from [`documentation/MARKETING.md`](../../documentation/MARKETING.md) § App Store — English.

## Version 1.1.3 — Traditional Chinese (Hong Kong)

Paste **Name, Subtitle, Promotional text, Keywords, Description** from [`documentation/MARKETING.md`](../../documentation/MARKETING.md) § App Store — Traditional Chinese (Hong Kong).

---

## iPhone 6.7" screenshots

Upload in order from `docs/assets/store/iphone-67/`:

1. `01-activity.jpg`
2. `02-camera.jpg` — **composite** (sim chrome + pasted site photo)
3. `03-tasks.jpg`
4. `04-task-thread.jpg`

**Do not upload** Joe’s Company-management frame. Joe is a worker.

Optional captions: see the folder README.

**Still Human:** 6.1" physical set; iPad (`supportsTablet: true`); live camera if you reject the composite.

---

## App Review notes (outline — do not paste passwords into git)

- Demo: founding CA already in ASC. Show: create/open company → invite is admin-only → create task with photo → update → approve.
- No public self-serve join.
- Camera / library used only for task evidence.
- IAP: Stripe company subscription (external purchase), not Apple IAP for seats.
- Name change: display name Taskr; previous listing title Insite Trackr.

---

## After GitHub Pages deploy

Confirm HTTP 200 and **honest copy** (HKD, 60-day invite, no Play, Insite Works Limited):

- https://insitetechltd.github.io/buildtrack/
- https://insitetechltd.github.io/buildtrack/privacy-policy.html
- https://insitetechltd.github.io/buildtrack/terms-of-service.html
- https://insitetechltd.github.io/buildtrack/support.html
