# Open slices vs R7/R8 — overlap analysis (2026-08-17)

**Question:** Does knocking out commercial-week **R7** (payment hook) and **R8** (bounded UI touchpoint cut) collide with remaining ROADMAP UX/pipeline work?

**Verdict:** No hard conflict if R7 stays a **checkout CTA + R6 copy** (no Stripe engine, no metering schema) and R8 stays **hide dead/duplicate chrome** (not Phase C visual or typeahead).

---

## Remaining open slices (relevant)

| Slice | Status | What it still wants | Overlap with R7/R8 |
|-------|--------|---------------------|--------------------|
| **S-UX-01Q** | Pipeline; C1–C5 landed | C6 parked as **S-UX-01P**; Option B gallery; photo caption | **R8 ≠ 01Q.** 01Q remaining is consistency/typeahead/gallery. R8 is cut dead Profile rows + duplicate admin entry, not TextField/shell/row SoT. |
| **S-UX-01P** | Pipeline, deferred | Unified catalogue typeahead (location, containers) | **Do not implement in R8.** Progressive Create Task disclosure already exists; typeahead is a product GO. |
| **M-UX-01** parent | Pipeline | Parent still open because 01P/01Q tails remain | No extra work; do not reopen A–N. |
| **M-SUPABASE-04b** | Blocked ~2026-09-07 | Drop legacy status columns | None. |
| **M-SUPABASE-04e** | Deferred | Cold archive | None. |
| **Wave 2 15.x** | Parked | Web admin, DMS, tenant wipe, **M-DMS-DATA** metering | **R7 must not** build web billing portal or DMS GB meters. R13/M-DMS-DATA stay later. |
| **M-CURSOR-01** | Active (tooling) | Trae → Cursor | None. |

Closed UX that R8 must **not** unwind: 01J tags/assignee, 01K/K2 delegation, 01M location, 01N containers (progressive disclosure already shipped).

---

## R7 scope (this pass)

**In:** Company-admin Profile row → R6 SKU copy (Growth $19.99, Unlimited $199.99, +5 workers $4.99, +1 PM $9.99, 30-day trial + card) → open `EXPO_PUBLIC_STRIPE_CHECKOUT_URL` or mailto checkout request if unset.

**Out:** Stripe SDK, webhooks, Customer Portal session API, hard seat/entry meters (**R13**), schema, auto-charge jobs.

**Soft overlap:** `invite-user` already uses paper seat caps (1 PM / 5 workers) until Stripe/R13 — leave that; R7 does not change invite limits.

---

## R8 scope (this pass)

**Cut:** Profile Coming Soon rows (`edit-profile`, `notifications`, `privacy-security`); Profile **Pending Approvals** (duplicate of Admin → User Management); About string **BuildTrack → Taskr**.

**Keep:** Language, theme, reload, change password, help, privacy/terms URLs, admin User Management, Create Task optional “More details” / container disclosure.

**Not R8:** Nested SafeArea flatten, ActivityStyleRowCard, Option B gallery, caption, typeahead.

---

## Residual risk

- Checkout URL env empty → mailto fallback (not “sales-only” CTA; still SKU-specific).
- Hosting privacy/terms still a **human R4** gap; unrelated to R7/R8.
