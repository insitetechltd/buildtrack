# Web billing manage — tier + seats (2026-09-24)

**Milestone:** ASC / commercial billing surface (idle-parallel vs App Store spine).  
**Surface SoT:** `docs/taskr/billing.html` (ASC 3.1.1 — not in-app Checkout).  
**App:** keep Company Plan → “Manage or cancel plan” → this page.

## Gate A (folded)

| Critique | Verdict | Link |
|---|---|---|
| Validation | **NO-GO** (proof thin; hide downgrade; harden upgrade) | [Gate A validation](bc-af42e269-2e97-5d5e-889f-d979e33cf0c2) |
| Risks | **REVISE Phase 1 · NO-GO Phase 2 as drafted** | [Gate A risks](bc-fd9473a7-06e2-50f9-a43f-21de5284b1c1) |

**Builder must not start money-mutating UI until Phase 0 Criticals are green.**

### Criticals (must-fix)

1. **Upgrade base item** — `create-checkout-session` must resolve the subscription item whose price maps to `plan_tiers.kind = 'base'` (refuse if ≠1). Never `items.data[0]`.
2. **Deferred decrease billing** — Current webhook applies pending qty **after** renewal invoice (`current_period_start >= pending_at` on `customer.subscription.*` only) → customer pays **old** qty for the new period. **Shipping “− seat” on billing.html would advertise a lie.** Fix via `invoice.upcoming` (or Subscription Schedule phase) **before** exposing remove steppers. Same defect blocks Phase 2 “mirror seats” tier downgrade.
3. **Seats-per-unit SoT** — Catalog/`plan_price_meters` for `addon_worker_pack` may be **5**; Edge `update-company-addons` hard-codes **1** (HK lock copy). Pin one SoT (prefer product law **HK$20 = +1 worker**), align meters + Edge + webhook, verify live DEV+PROD rows before UI shows “included + extras”.
4. **Payment before lock** — Upgrade must not `syncUpgradedPlanLock` on `pending_if_incomplete` / unpaid. Mirror add-ons 402 pattern; no-PM → Checkout, not in-place upgrade.
5. **Idempotent charge UX** — Batch seat deltas behind one **Confirm — charge HK$X now**; Stripe `Idempotency-Key`; re-read live Stripe before writing entitlements.

### High (fold into phases)

- Self-serve upgrade must append entitlement revision (or rely solely on webhook with `priceChanged` detectable).
- `internal_complimentary.sort_order` → **0** is a **Human Gate** catalog mutation; update `provision-internal-complimentary.py` in the same change set (script currently rewrites 90).
- Status API: period-end fallback like add-ons Edge; `sellablePlans` filter `currency` + latest `effective_from`; display labels **Starter/Pro** (signup config), not raw Growth/Unlimited.
- Phase 1 without Phase 2: show “Downgrade: email support” on lower tiers (no fake button).
- Canceled / `cancel_at_*` / `past_due` / `incomplete`: no accidental second Checkout subscription.

---

## Product law (locked)

| Action | When it applies | Ship when |
|---|---|---|
| **Upgrade tier** | Immediate + prorate (after paid) | Phase 1 (post Phase 0) |
| **Downgrade tier** | Next period, correct renewal invoice | Phase 2 (Subscription Schedule / pre-invoice) |
| **Add PM / worker extras** | Immediate + prorate (after paid) | Phase 1 |
| **Remove PM / worker extras** | Next period, **correct** renewal invoice | Phase 1b (after Critical #2) |
| **Floor** | Extra qty ≥ 0 vs **current live** base included | All |
| **Cancel** | Unchanged | Already shipped |

Internal complimentary stays `is_sellable=false`. Billing may offer switch to Starter/Pro as upgrade after Human Gate sort_order fix.

---

## Phases (revised)

### Phase 0 — Edge harden (no new billing UI money yet)

1. Base-item picker for upgrade + refuse ambiguous items.  
2. Upgrade: payment verify / 402 / Checkout fallback; no premature plan lock; revision trail.  
3. Resolve worker-pack seats-per-unit (DB + Edge + webhook) on DEV+PROD; document SoT in runbook.  
4. Design + implement **pre-invoice** pending decrease apply (`invoice.upcoming` preferred); Test Clock proof that **next** invoice amount matches new qty.  
5. Unit tests for base-item resolution + pending apply gate.

### Phase 1 — Web manage: status + upgrade + **add** seats

1. Extend `billing-subscription-status` manage payload (addons, included, sellablePlans with Starter/Pro labels, `tierAction`: `current` | `upgrade` | `unavailable` only).  
2. `billing.html`: tier Upgrade / Current; **+** steppers only (or +/− with − disabled until Phase 1b); Confirm charge; Cancel unchanged; copy for downgrade → support.  
3. Deploy Edges DEV+PROD; bump `billing.js?v=` (+ css if touched).  
4. Human Gate: `internal_complimentary.sort_order=0` + script default 0.

### Phase 1b — Expose remove steppers

Only after Phase 0 Critical #2 Test Clock PASS. Then − seats + pending copy.

### Phase 2 — Tier downgrade

**Do not** copy broken post-boundary metadata apply. Use **Stripe Subscription Schedules** (or equivalent pre-invoice phase) so renewal invoices at new price.  
Guard at schedule time: `assigned ≤ target_included + retained_extras`.  
Apply-time reconcile if assignees grew.  
One atomic schedule update (don’t chain two `subscriptions.update` that re-enter webhook).

### Out of scope

- HQ entitlement override (C)  
- In-app paid Checkout restore  
- Same-email re-signup after cancel  
- Portal-vs-bespoke rewrite (note: Stripe Customer Portal remains an alternative; this plan keeps bespoke for ASC copy control)

---

## Validation (must be able to FAIL)

### Fixtures
- DEV **active paid**, trial re-arm **off** for money proofs, Stripe **Test Clock**, success + fail PMs.  
- PROD Sara: **read-only** unless Human GO for a live charge.

### Phase 0 / 1 proofs

| Proof | Pass |
|---|---|
| Base-item unit | With addon items present, upgrade mutates only base item |
| Upgrade fail-pay | No Pro lock / entitlements until paid |
| Add seat now | Qty↑, invoice amount, entitlements↑, Idempotency-Key safe on double confirm |
| Seats-per-unit | UI included+extras matches enforcement meters |
| Authz | anon / non-admin / cross-company → no Stripe write |
| Dual-env p-matrix | After Edge deploy |
| Headed | Confirm dialog shows amount; busy disable; refresh |
| PROD RO | Sara sees Upgrade CTAs; cancel OK |

### Phase 1b / 2 proofs

| Proof | Pass |
|---|---|
| Remove → advance clock | **Next invoice** at reduced qty (not old qty) |
| Downgrade schedule | Entitlements stay high until boundary; next invoice at Starter |
| Over-cap assign | Reject schedule; no Stripe schedule write |
| Webhook replay | Apply once |

---

## Open Human Gates (ask before apply)

1. PROD `internal_complimentary.sort_order` 90 → 0 (+ script).  
2. Any live paid upgrade/charge on PROD (Sara or otherwise).  
3. Confirm seats-per-unit product SoT if live meters still say 5 vs Edge 1 (recommend **1** per HK$20 Worker seat).

## Builder entry criteria

- [ ] Phase 0 Criticals 1–4 implemented + Test Clock evidence for deferred invoice amount  
- [ ] Seats-per-unit SoT decided + live rows match  
- [ ] This plan’s Phase 1 scope = upgrade + add only until 1b  
- [ ] Human Gate (1) done or explicitly waived for DEV-only UI work  
