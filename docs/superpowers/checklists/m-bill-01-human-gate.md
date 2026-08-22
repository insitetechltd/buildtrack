# M-BILL-01 — Human Gate checklist (before BILL-B live apply)

**Milestone:** `WS-BILL / M-BILL-01`  
**Phase:** BILL-B (live DDL + seed) — **blocked until this checklist is signed**  
**Draft SQL:** `supabase/migrations/DRAFT_mbill01_entitlements.sql`  
**Kickoff:** `docs/superpowers/plans/2026-08-22-m-bill-01-bill-a-kickoff.md`  
**Gate A synthesis:** `docs/superpowers/plans/2026-08-22-m-bill-01-bill-a-critique-synthesis.md`

---

## Sign-off


| Field       | Value                                            |
| ----------- | ------------------------------------------------ |
| Reviewer    |                                                  |
| Date        |                                                  |
| Decision    | ☐ GO for BILL-B live apply ☐ NO-GO (notes below) |
| Environment | ☐ parity/sandbox first ☐ production (explicit)   |


**Acceptable GO forms:** explicit chat “GO for BILL-B live apply” or signed line below.

Signed: _________________________

---



## 1. Trial model (regular pricing + native Stripe trial)

- [x] **Confirmed:** Trial = customer selects **Growth or Unlimited at list price** (`locked_plan_price_id` = paid SKU from signup).
- [x] **Confirmed:** Trial benefit = **Stripe native trial** on that Price (`trial_period_days` or `trial_end`; subscription status `trialing`) — **not** a separate $0 plan tier and **not** a 100% coupon for the standard trial.
- [x] **Confirmed:** Card collected at trial start; after trial end, billing continues at **same list price** without plan SKU change.
- [ ] **Confirmed:** During trial, enforcement uses **trial caps** in entitlement snapshot; on `trialing → active`, webhook writes **new revision** with paid-period caps from same locked price.
- [ ] Trial duration: ☐ 30 days  ☐ 1 calendar month  ☐ other: _______
- [ ] BILL-E checkout creates subscription with native trial on selected Price (Human Gate defers wiring; confirm intent now).

---



## 2. Catalog & tier flexibility

- [ ] Tier slugs approved: `growth`, `unlimited`, `addon_worker_pack`, `addon_pm_seat` (no lockable `trial` price row).
- [ ] Tier `kind` CHECK: `base` | `addon` only for sellable SKUs.
- [ ] Retiring a tier = `is_active=false` + retire prices; **never DELETE** rows referenced by subscriptions.
- [ ] Adding a tier = INSERT `plan_tiers` + Stripe Product + `plan_prices` + meters (no enum migration).

---



## 3. Meters & R6 caps


| meter_slug            | Trial / Growth / Unlimited seed | Limit value        | Inclusive?             |
| --------------------- | ------------------------------- | ------------------ | ---------------------- |
| `pm_seats`            | all base                        | 1                  | ☐                      |
| `worker_seats`        | all base                        | 5                  | ☐                      |
| `projects`            | trial                           | 1                  | ☐                      |
| `projects`            | growth                          | 5                  | ☐                      |
| `projects`            | unlimited                       | NULL (∞)           | ☐                      |
| `entries_trial_total` | trial phase only                | 100                | ☐ under vs ☐ inclusive |
| `entries_monthly`     | growth / unlimited active       | 200 / NULL         | ☐                      |
| `storage_bytes`       | all base                        | 5368709120 (5 GiB) | ☐                      |


- [ ] Entry definition locked: **task create OR task update** only (not photo-only, not draft-only local).
- [ ] Usage `period_key` = Stripe billing period start (ISO date), not calendar month alone.

---



## 4. Contract immutability & grandfathering

- [ ] **Default policy signed:** New list prices apply to **new subscriptions only**; existing `locked_plan_price_id` unchanged unless customer upgrades or ops runs queued migration.
- [ ] Runtime enforcement reads `company_entitlements` **+ latest revision snapshot** — never live `plan_price_meters`.
- [ ] `plan_price_meters` **rows are immutable** after any price is referenced by `locked_plan_price_id` (fix = new price version).
- [ ] Append-only `company_entitlement_revisions` approved.
- [ ] Price increase default: ☐ grandfather  ☐ cohort migration  ☐ voluntary upgrade only.

---



## 5. Seat class rules (invite enforcement)

- [ ] Role → seat table approved (`seat_class_rules` seed):


| role / system_permission | pm_seats      | worker_seats      | exempt               |
| ------------------------ | ------------- | ----------------- | -------------------- |
| admin                    | ☐             | ☐                 | ☐ default **exempt** |
| company_admin            | ☐             | ☐                 | ☐ default **exempt** |
| manager / supervisor     | ☐ consumes PM | ☐                 | ☐                    |
| foreman                  | ☐             | ☐ consumes worker | ☐                    |
| member / worker          | ☐             | ☐ consumes worker | ☐                    |


- [ ] Pending invite **holds** seat: ☐ yes  ☐ no
- [ ] Deactivated user **frees** seat: ☐ yes  ☐ no
- [ ] Fail-closed: missing entitlements row → deny invite: ☐ yes  ☐ no

---



## 6. Stripe & environment

- [ ] Separate **test** and **live** `plan_prices` rows (`livemode` column).
- [ ] Stripe Product/Price ids mapped for **livemode=true** (production): documented in secure ops vault, **not** in git.
- [ ] Stripe Product/Price ids mapped for **livemode=false** (test): _______________
- [ ] Optional marketing coupon ids (not required for standard trial): live _______________ test _______________
- [ ] Webhook signing secret rotation plan acknowledged.
- [ ] Checkout metadata required: `company_id`, `plan_price_id`, `livemode`, `trial_period_days` (or `trial_end` from Checkout config).

---



## 7. Pilot backfill (existing companies)

- [ ] All existing `companies` rows receive entitlements backfill on apply (see draft SQL §14)
- [ ] **§14 flags set before apply:** `v_run_pilot_backfill := true` + `v_apply_livemode` matches target (false=parity/test, true=prod)
- [ ] Real Stripe ids in place (`mbill01_assert_no_stripe_placeholders()` passes).
- [ ] Backfill caps: ☐ R6 Growth-equivalent  ☐ custom: _______
- [ ] Backfill reason logged in `billing_audit_log` as `pilot_backfill`.
- [ ] Companies already over seat cap: ☐ grandfather  ☐ trim manually  ☐ other: _______

---



## 8. Price change runbook

- [ ] New list price = **new Stripe Price** + new `plan_prices` row; old price retired (`is_sellable=false`, `effective_to` set).
- [ ] Cohort migrations use `subscription_price_changes` queue (not ad-hoc SQL).
- [ ] Stripe mechanism: ☐ Subscription Schedule  ☐ period-end update  ☐ other: _______
- [ ] Default `proration_behavior`: ☐ none  ☐ create_prorations
- [ ] Minimum customer notice period: _______ days
- [ ] Legal/ToS price-change clause reviewed: ☐ yes  ☐ N/A

---



## 9. RLS & security

- [ ] All billing tables: RLS enabled + `anon_block_all`.
- [ ] Authenticated role: **SELECT own company only** on entitlements/subscriptions/usage; **no client writes**.
- [ ] Webhook / ops writes: **service_role only** (Edge function).
- [ ] No service-role keys in mobile app (unchanged policy).

---



## 10. Out of scope for BILL-B (confirm still deferred)

- [ ] Stripe webhook Edge (BILL-C)
- [ ] `invite-user` entitlement reads (BILL-D)
- [ ] Checkout Session linkage (BILL-E)
- [ ] Hard metering gates on task create / upload (BILL-F)
- [ ] AUTHZ-02 guest seat billing attribution (document only)
- [ ] Self-serve billing portal / MRR dashboard

---



## 11. Validation before apply

- [ ] Draft SQL reviewed against this checklist
- [ ] Anti-secret grep on migration + docs (no live keys)
- [ ] Apply target: ☐ parity tenant  ☐ production
- [ ] Rollback plan: drop billing tables / restore from backup (document path): _______
- [ ] Post-apply read-only audit queries prepared

---



## 12. Post-apply smoke (BILL-B)

- [ ] `plan_tiers` / `plan_prices` / meters seeded
- [ ] Pilot company has `company_entitlements` row
- [ ] Authenticated user can SELECT own entitlements; cannot UPDATE
- [ ] `invite-user` still uses hardcoded limits until BILL-D (expected)

---

Updated: 2026-08-22 (Gate B SQL hardening)