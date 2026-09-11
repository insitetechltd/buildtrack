# ASC listing paste pack — Taskr 1.1.3 resubmit

**Updated:** 2026-09-11 (UPA membership fix + build **257** cut)  
**App:** `6754898737` · https://appstoreconnect.apple.com/apps/6754898737  
**Bundle:** `com.buildtrack.app.local`  
**Copy SoT:** [`documentation/MARKETING.md`](../../../documentation/MARKETING.md)  
**Screenshots on disk:** `docs/taskr/assets/store/iphone-67/` · `docs/taskr/assets/store/ipad-13/`

ASC API can **read**; paste / attach binary / Submit in the **web UI** (historical PATCH 403).

**Do not tick Public. Do not Submit for Review until this checklist is green and you intend to.**

Seller name is still **Tri Stan Ching KOO**. Do **not** convert to Insite Works Limited during this review (GTM Gate 2 OPEN).

---

## Live ASC state (2026-09-11)

| Item | State |
|---|---|
| **1.0** | `READY_FOR_SALE` — build **127** — listing name still **Insite Trackr**; Privacy URL still old GitHub `policy.pdf` (app-info locked while 1.0 is live) |
| **1.1.3** | `REJECTED` — do **not** leave attached build **244** (or stale **254**) |
| Builds ready | Prefer **257** (submitted 2026-09-11; `/taskr/` signup + UPA `created_at` dual-path). **256** lacked membership fetch fix. **254** lacked baked `/taskr/` URLs. |
| Screenshots already in ASC | en-US: **4×** `APP_IPHONE_67` + **4×** `APP_IPAD_PRO_3GEN_129` |
| Rejected app-info Privacy | Already `https://www.insiteworks.co/taskr/privacy-policy.html` |
| Rejected app-info Support / Marketing | **Empty** — paste required |
| Review notes in ASC | **Stale** — still describe in-app “Create company” + temp-password invites |

---

## Human checklist (order)

### 1) Fix App Information on the **1.1.3 / REJECTED** editable app info

| Field | Paste |
|-------|--------|
| Privacy Policy URL | https://www.insiteworks.co/taskr/privacy-policy.html |
| Support URL | https://www.insiteworks.co/taskr/support.html |
| Marketing URL | https://www.insiteworks.co/taskr/ |

(Company portfolio, not Taskr product: https://www.insiteworks.co/)

### 2) Select binary **257** for version 1.1.3

Do **not** resubmit on **244**, **254**, or **256**. Build **257** includes checkout-first web signup URLs (`/taskr/signup.html`), ASC-safe plan CTAs, email-first Login, Create Project roster, and PROD-safe project membership fetch.

### 3) Paste version metadata (EN + zh-HK)

From [`documentation/MARKETING.md`](../../../documentation/MARKETING.md):

- English: Name, Subtitle, Promotional text, **Keywords** (replace stale `Change Variations Order` junk), Description, What’s New  
- Traditional Chinese (Hong Kong): same fields + What’s New  

### 4) Screenshots

Already present in ASC (4 iPhone 6.7" + 4 iPad 13"). Re-upload from disk only if a frame looks wrong:

- iPhone: `docs/taskr/assets/store/iphone-67/` (`01`…`04`)  
- iPad: `docs/taskr/assets/store/ipad-13/` (`01`…`04`)  
- `02-camera.jpg` is a **composite** (chrome + site photo)  
- Do **not** upload Joe Company-management frames  

Optional later: physical 6.1" set; Sara CA company frame.

### 5) Replace App Review notes

Paste the block in [`2026-09-11-asc-resubmit-review-notes.md`](../evidence/2026-09-11-asc-resubmit-review-notes.md) (no passwords in git — keep demo credentials only in ASC).

### 6) Resolution Center

Answer the prior rejection using the same notes (camera **Continue**; company signup on **web** only).

### 7) Submit for Review

Only when steps 1–6 are done and you intend to. Keep **Public** unticked until you want store visibility.

---

## Preflight URLs (agent-verified 2026-09-11 — all HTTP 200)

- https://www.insiteworks.co/
- https://www.insiteworks.co/taskr/
- https://www.insiteworks.co/taskr/privacy-policy.html
- https://www.insiteworks.co/taskr/terms-of-service.html
- https://www.insiteworks.co/taskr/support.html
- https://www.insiteworks.co/taskr/signup.html
- https://www.insiteworks.co/taskr/billing.html

In-app constants: `src/legal/legalLinks.ts` (same `/taskr/…` paths).

---

## Explicit non-goals this pass

- Apple Individual → Organization rename  
- Editing live **1.0** Privacy URL (stays locked until 1.1.3 ships / app-info becomes editable for Ready for Sale)  
- Stripe founding-CA live Checkout smoke (extra Human GO — parallel, not blocking paste; sandbox DEV path already proven)
