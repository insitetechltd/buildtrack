# App Review notes — Taskr 1.1.3 resubmit (build 258)

**Date:** 2026-09-12  
**Paste into:** App Store Connect → version 1.1.3 → App Review Information → Notes  

Do **not** put passwords in git. Demo account fields stay only in ASC.

---

## Paste (ASC-safe, short)

```text
Please review build 258.

Taskr is a construction field app for one company: capture a site photo, assign work, update with photo proof, then approve or send back.

Sign-in is in the app. New company accounts are created on our website (Safari), not inside the app:
https://www.insiteworks.co/taskr/signup.html

Company plans, extra seats, and cancellation are managed on the website (Stripe), not with Apple IAP:
https://www.insiteworks.co/taskr/billing.html
Company admins sign in there with password or email link. Canceling during trial schedules the end on Stripe so access continues until the trial ends and no charge is taken.

Camera and photo library are only for task evidence. The camera permission screen button is labeled Continue.

How to review:
1. Sign in with the demo account in App Review Information.
2. Open or create a project.
3. Create a task with a photo, update it with a photo, then approve.
4. Confirm Login has no in-app “create company” form. Sign Up opens the website above.
5. Optional: from Company Plan / Help, open the billing page above to confirm self-serve cancel is on the web.
```
