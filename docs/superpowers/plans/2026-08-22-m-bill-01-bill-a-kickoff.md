# M-BILL-01 / BILL-A kickoff — Entitlements ERD (versioned, flexible tiers)

**Milestone:** `WS-BILL / M-BILL-01` (ROADMAP 15.048)  
**Phase:** **BILL-A only** — ERD + migration **draft** + Human Gate doc + price-change runbook  
**Status:** Active (2026-08-22)  
**Pick-up:** `documentation/NOW.md`  
**Prereq:** M-OPS-02 Closed  
**Sequence SoT:** `2026-08-22-master-plan-parallel.md`, `2026-08-22-session-consolidation.md`

---

## Goal

Design a **Postgres + Stripe entitlements layer** that:

1. Replaces hardcoded seat limits in `invite-user` with DB-backed caps  
2. Supports **easy pricing changes** (new prices without breaking existing customers)  
3. **Honors contractual obligations** via locked snapshots + audit overrides  
4. Handles **flexible tier catalog** (add/remove/rename tiers without schema migrations)  
5. Maps **metered resources** (seats, projects, entries, storage) to enforcement points  

**BILL-A delivers design artifacts only — NO live DDL, NO webhook deploy, NO Stripe secret changes.**

---

## Non-goals (BILL-A)

- Live schema apply (BILL-B — Human Gate)  
- Stripe webhook implementation (BILL-C)  
- `invite-user` code change (BILL-D)  
- Checkout linkage (BILL-E)  
- Hard enforcement gates in mobile (BILL-F)  
- Self-serve billing portal, MRR dashboard, Owner Console billing UI  

---

## Current state (gap)

| Surface | Today | Target |
|---|---|---|
| `src/billing/orgPlans.ts` | R6 SKU copy + checkout URL/mailto | Marketing/display SoT only after BILL-B |
| `supabase/functions/invite-user/index.ts` | `PM_SEAT_LIMIT=1`, `WORKER_SEAT_LIMIT=5` hardcoded | Read `company_entitlements` |
| Postgres | No billing tables | Versioned catalog + per-company locks |
| Stripe | Payment Link env var; no webhook | Subscription events → entitlements upsert |
| Metering | R6 defines entries/projects/storage/seats on paper | Counters + limits in entitlements |

**Commercial SKU SoT (R6 locked):** `docs/superpowers/plans/2026-08-16-commercial-release-week.md` § R6.

---

## Design principles (infancy + flexibility)

### P1 — Catalog vs contract separation

```text
CATALOG (mutable marketing)     CONTRACT (immutable per subscription)
─────────────────────────────   ─────────────────────────────────────
plan_tiers (slug, display)      company_subscriptions (stripe ids)
plan_prices (versioned SKUs)    company_entitlements (effective caps)
plan_price_meters (limits)      entitlements_snapshot (JSON at lock)
```

**Rule:** Enforcement reads **`company_entitlements`**, never live catalog rows.

### P2 — Stripe Prices are immutable

New list price = new Stripe Price object + new `plan_prices` row. Never edit amount on an existing Price. Existing subscriptions keep old Price until explicit migration.

### P3 — Default grandfathering

> New prices apply to **new subscriptions only**. Existing customers keep locked `plan_price_id` + snapshot until they change plan or ops runs a migration cohort.

### P4 — Flexible tier count (N tiers, not fixed enum)

- Tiers are **rows**, not CHECK enums or hardcoded columns  
- Adding tier = INSERT catalog rows + Stripe Products/Prices  
- Retiring tier = `is_sellable=false`, `effective_to` — **never DELETE** rows referenced by subscriptions  
- Tier **kind** enum (small, stable): `base` | `addon` only — not tier names; **no lockable trial tier**

### P5 — Add-ons stack on base

Base subscription (Growth/Unlimited) + optional addon subscription items (worker pack, PM seat). Effective entitlements = **merge(base snapshot, sum(addon grants))**.

### P6 — Meter definitions are data-driven

Meters defined in `meter_definitions`; limits per price in `plan_price_meters`. New meter type = INSERT definition + wire enforcement hook — not ALTER TABLE per resource.

---

## Entity model (ERD)

### Core catalog (flexible N tiers)

#### `plan_tiers`

Stable identity for marketing/product. Count can grow or shrink (retire, not delete).

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| slug | text UNIQUE | e.g. `growth`, `unlimited`, `addon_worker_pack`, `addon_pm_seat` |
| kind | text CHECK | `base` \| `addon` |
| display_name | text | UI copy |
| description | text | optional |
| sort_order | int | checkout display |
| is_active | boolean | false = hidden from new sales; existing subs unaffected |
| stripe_product_id | text NULL | Stripe Product id |
| created_at / updated_at | timestamptz | |

**Add tier:** INSERT row + Stripe Product + `plan_prices`.  
**Remove tier from sale:** `is_active=false`; historical `plan_prices` and subscriptions remain.

#### `plan_prices` (versioned sellable SKUs)

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| plan_tier_id | uuid FK → plan_tiers | |
| stripe_price_id | text UNIQUE | immutable Stripe Price |
| amount_cents | int | denormalized for audit |
| currency | text | default `usd` |
| billing_interval | text | `month` (R6) |
| effective_from | timestamptz | |
| effective_to | timestamptz NULL | NULL = current generation until superseded |
| is_sellable | boolean | checkout eligibility |
| caps_snapshot | jsonb | denormalized cap bundle at price creation (audit) |
| created_at | timestamptz | |

**Price increase:** new row + new Stripe Price; old row gets `effective_to`, `is_sellable=false`.

#### `meter_definitions`

Data-driven resource types (extensible without schema churn for new meters).

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| slug | text UNIQUE | `pm_seats`, `worker_seats`, `projects`, `entries_monthly`, `entries_trial_total`, `storage_bytes` |
| display_name | text | |
| aggregation | text | `gauge` \| `counter_monthly` \| `counter_lifetime` |
| enforcement | text | `hard` \| `soft` \| `none` (BILL-F policy per meter) |
| unit | text | `count`, `bytes` |

**R6 initial meters (seed):**

| slug | aggregation | R6 meaning |
|---|---|---|
| `pm_seats` | gauge | PM/admin-class seats |
| `worker_seats` | gauge | worker/member seats |
| `projects` | gauge | active project count |
| `entries_monthly` | counter_monthly | task create + update / month (Growth) |
| `entries_trial_total` | counter_lifetime | task create + update total (trial) |
| `storage_bytes` | gauge | hot storage (Unlimited 5 GB) |

#### `plan_price_meters`

Limits for each priced SKU (many-to-many: one price, many meters).

| Column | Type | Notes |
|---|---|---|
| plan_price_id | uuid FK | |
| meter_slug | text FK → meter_definitions.slug | |
| limit_value | bigint NULL | NULL = unlimited |
| PRIMARY KEY (plan_price_id, meter_slug) | | |

**Example Growth row set:** pm=1, worker=5, projects=5, entries_monthly=200.

**Add new meter to existing tier:** INSERT `plan_price_meters` on **new** `plan_prices` version only.

---

### Per-company contract (honor + enforce)

#### `company_subscriptions`

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| company_id | uuid FK UNIQUE (MVP: one sub row) | org billing entity |
| stripe_customer_id | text | |
| stripe_subscription_id | text NULL | |
| status | text | `trialing`, `active`, `past_due`, `canceled`, `paused` |
| trial_end | timestamptz NULL | |
| current_period_start / end | timestamptz | |
| locked_plan_price_id | uuid FK → plan_prices | **contract anchor** |
| created_at / updated_at | timestamptz | |

#### `company_subscription_items` (add-ons)

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| company_subscription_id | uuid FK | |
| plan_price_id | uuid FK | addon price version |
| stripe_subscription_item_id | text | |
| quantity | int default 1 | worker pack qty stacks |
| locked_at | timestamptz | |

#### `company_entitlements` (enforcement SoT)

| Column | Type | Notes |
|---|---|---|
| company_id | uuid PK | |
| pm_seat_limit | int | effective after merge |
| worker_seat_limit | int | |
| project_limit | int NULL | NULL = unlimited |
| entries_limit | int NULL | monthly or trial total per policy flag |
| entries_limit_kind | text | `monthly` \| `trial_total` \| `unlimited` |
| storage_limit_bytes | bigint NULL | |
| subscription_status | text | denormalized for fast checks |
| source_plan_price_id | uuid | base lock reference |
| entitlements_snapshot | jsonb | full copy at last lock/migration |
| snapshot_locked_at | timestamptz | |
| updated_at | timestamptz | |

**Merge rule (BILL-D spec):**  
`effective_limit(meter) = base.plan_price_meters[meter] + Σ(addon.plan_price_meters[meter] × quantity)`

#### `company_usage_counters` (metering runtime)

| Column | Type | Notes |
|---|---|---|
| company_id | uuid | |
| meter_slug | text | |
| period_key | text | `lifetime` or `YYYY-MM` |
| current_value | bigint | |
| updated_at | timestamptz | |
| PRIMARY KEY (company_id, meter_slug, period_key) | | |

**Increment hooks (BILL-F+):** task create/update → entries counter; project create → projects gauge; invite → seat gauge; upload → storage (async reconcile).

#### `billing_webhook_events` (BILL-C idempotency)

| Column | Type | Notes |
|---|---|---|
| stripe_event_id | text PK | |
| type | text | |
| processed_at | timestamptz | |
| payload_hash | text | optional |

#### `billing_audit_log` (manual overrides + price migrations)

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| company_id | uuid NULL | |
| actor_user_id | uuid NULL | owner ops |
| action | text | `override_entitlements`, `price_migration`, `manual_trial_extend` |
| before_snapshot | jsonb | |
| after_snapshot | jsonb | |
| reason | text | contractual note |
| expires_at | timestamptz NULL | |
| created_at | timestamptz | append-only |

#### `subscription_price_changes` (optional ops queue)

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| company_id | uuid | |
| from_plan_price_id | uuid | |
| to_plan_price_id | uuid | |
| effective_at | timestamptz | |
| status | text | `pending`, `applied`, `canceled` |
| notice_sent_at | timestamptz NULL | |

---

## Tier ↔ price ↔ meter mapping (R6 seed)

```text
plan_tiers                plan_prices (v1)           plan_price_meters
──────────                ────────────────           ─────────────────
growth (kind=base)   →    growth_v1 $19.99/mo →    pm=1, worker=5, projects=5,
                                                      entries_monthly=200

unlimited (base)     →    unlimited_v1 $199.99 →   pm=1, worker=5, projects=∞,
                                                      entries=∞, storage=5GB

addon_worker_pack    →    worker_pack_v1 $4.99 →   worker=+5 (per qty)

addon_pm_seat        →    pm_seat_v1 $9.99    →    pm=+1 (per qty)

Trial (not a tier): customer selects Growth or Unlimited at list price;
  Stripe coupon/promotion applies 100% discount for trial period.
  locked_plan_price_id = paid SKU from signup; trial caps via entitlement revision (billing_phase=trial).
```

Checkout (BILL-E): base tier required; add-ons as subscription items.

---

## Price change runbook (operational)

| Step | Owner | Action |
|---|---|---|
| 1 | Ops | Decide policy: grandfather vs cohort migration vs voluntary upgrade |
| 2 | Ops | Create **new** Stripe Price(s) via `scripts/stripe/bootstrap-org-catalog.py` pattern |
| 3 | Builder | INSERT new `plan_prices` + `plan_price_meters`; retire old price (`is_sellable=false`, `effective_to=now()`) |
| 4 | Ops | Update checkout Payment Link / env to new Price id |
| 5 | Ops | Customer comms template + effective date |
| 6 | Webhook | New checkouts → new `locked_plan_price_id` + fresh snapshot |
| 7 | Verify | Existing companies: `company_entitlements` **unchanged** unless in migration queue |
| 8 | Migration | If cohort: INSERT `subscription_price_changes`; batch or Stripe API update on `effective_at` |

**Grandfather default:** step 7 is the acceptance check for every price change.

---

## Human Gate checklist (before BILL-B live apply)

- [ ] Tier slugs + kind enum approved  
- [ ] Meter slugs + aggregation rules approved (entry = task create OR update)  
- [ ] R6 caps match `plan_price_meters` seed  
- [ ] Grandfathering policy signed (default: yes)  
- [ ] Add-on stacking formula signed  
- [ ] Stripe Product/Price ids mapped (dry-run catalog script)  
- [ ] RLS: company reads own entitlements; service role writes via webhook  
- [ ] No DELETE on catalog/history tables — archive only  
- [ ] Trial auto-charge + card-on-file flow documented  
- [ ] Role → seat mapping matches `invite-user` `isPmRole()`  
- [ ] Price change runbook reviewed  
- [ ] Explicit written **GO** for live DDL  

---

## Phased delivery (full M-BILL-01)

| Phase | Deliverable | Human Gate? |
|---|---|---|
| **BILL-A** | This ERD + migration draft + runbook + Human Gate doc | Review only |
| **BILL-B** | Live schema + seed catalog from R6 | **Yes** |
| **BILL-C** | Stripe webhook Edge + idempotency | **Yes** |
| **BILL-D** | `invite-user` reads entitlements | After B |
| **BILL-E** | Checkout ↔ company linkage | After B |
| **BILL-F** | Soft/hard gates + usage counters wired | Optional |

---

## BILL-A deliverables (this slice)

| # | Artifact | Path (target) |
|---|---|---|
| A1 | Kickoff + ERD (this doc) | `docs/superpowers/plans/2026-08-22-m-bill-01-bill-a-kickoff.md` |
| A2 | Migration draft SQL | `supabase/migrations/DRAFT_mbill01_entitlements.sql` (DRAFT — not applied) |
| A3 | Human Gate checklist | `docs/superpowers/checklists/m-bill-01-human-gate.md` |
| A4 | Price change runbook | Section above + ops appendix |
| A5 | R6 ↔ schema mapping table | In kickoff + seed data in draft SQL |
| A6 | Gate A multi-model critique | `docs/superpowers/plans/2026-08-22-m-bill-01-bill-a-critique-synthesis.md` |

---

## Enforcement touchpoints (future phases)

| Meter | Check location | Phase |
|---|---|---|
| pm/worker seats | `invite-user` Edge | BILL-D |
| projects | `create_project` / project store | BILL-F |
| entries | `createTask` / `updateTask` store guards | BILL-F |
| storage | upload service / bucket aggregate | BILL-F |
| subscription status | invite + optional read-only mode | BILL-F |

---

## Cross-milestone considerations (document now)

| Topic | BILL-A note |
|---|---|
| **M-AUTHZ-02** multi-company | Project invite seats may bill to guest or host company — entitlements remain **company-scoped**; AUTHZ adds `project_membership` billing attribution later |
| **Trial → paid** | Webhook on `trialing → active`: new entitlement revision with paid-period caps from same `locked_plan_price_id` |
| **Past due / cancel** | Status on `company_subscriptions`; BILL-F defines soft read-only vs hard block |
| **Tax / invoices** | Stripe Billing handles; out of MVP |
| **Currency** | USD only MVP; schema allows `currency` column for future |
| **Proration** | Stripe default; document in runbook |
| **Enterprise custom deals** | `billing_audit_log` overrides with expiry |
| **Storage metering** | Align with M-SUPABASE-04c hot retention policy |
| **Entry definition** | Task create + update only (R6 locked) — not photos alone |

---

## Additional gaps to flag (likely missing from v1 plan)

1. **Usage counter write path** — who increments `company_usage_counters` (sync on write vs nightly rollup)  
2. **Seat counting** — active users vs invited pending; deactivate frees seat?  
3. **Downgrade / cancel** — cap reduction mid-period behavior  
4. **Failed payment grace period** — days before enforce  
5. **Dunning / email** — Stripe Customer Portal vs custom  
6. **Test mode vs live** — separate Stripe Price ids per environment  
7. **Webhook replay / disaster recovery** — rebuild entitlements from Stripe API  
8. **Migration from pilot/manual customers** — backfill `locked_plan_price_id` + audit log  
9. **Add-on removal** — recalculate merged entitlements on `subscription.updated`  
10. **Legal** — ToS price-change clause (ops, not code)

---

## Validation plan (BILL-A)

| Layer | Command / action |
|---|---|
| Docs review | Human Gate checklist complete |
| Draft SQL | syntax check; no live apply |
| Anti-secret | grep draft for keys |
| Gate A | ≥3 model critiques → synthesis doc |
| Builder | **Not until Gate A findings folded** |

---

## Acceptance (BILL-A exit)

- [ ] ERD supports N tiers (add/retire without DDL enum change)  
- [ ] Versioned prices + grandfathering documented  
- [ ] Meters data-driven + mapped to R6  
- [ ] Price change runbook present  
- [x] Migration draft SQL committed (DRAFT_)
- [x] Human Gate checklist committed
- [ ] Gate A critique synthesis committed  
- [ ] NO live DDL / webhook / Stripe deploy  

---

Updated: 2026-08-22  
**Gate A synthesis:** `2026-08-22-m-bill-01-bill-a-critique-synthesis.md` (3 models — GO-with-changes, fold Critical before draft SQL)

---

## Gate A locked revisions (must appear in draft SQL)

These supersede conflicting sections above until draft SQL is regenerated:

1. **Trial:** **Regular paid `plan_price` + Stripe discount** (coupon or promotion on the chosen Growth/Unlimited Price). Customer is contractually on list price from day one; trial = discounted period only. `locked_plan_price_id` = paid SKU always. Trial caps in snapshot; post-trial caps refresh from same locked price via webhook revision — **not** a separate $0 SKU.  
2. **Contract immutability:** Append-only `company_entitlement_revisions`; runtime reads latest snapshot — never re-merge live `plan_price_meters`.  
3. **Meters:** Catalog = `plan_price_meters`; contract = `entitlements_snapshot` jsonb; typed columns = derived cache at lock only.  
4. **Stripe env:** `plan_prices.livemode` + UNIQUE `(stripe_price_id, livemode)`.  
5. **Pilot backfill:** All existing companies get R6 paper caps + audit log; missing row = fail-closed invite.  
6. **Usage period:** Counter `period_key` tied to Stripe billing period, not calendar month alone.  
7. **Storage:** Explicit meter on Growth + trial (Human Gate picks cap).  
8. **Price migrations:** `subscription_price_changes` required; Stripe Schedule + notice timestamps.  
9. **Seat law:** Human Gate role→meter table (company_admin exempt from PM seat by default).  
10. **Checkout (BILL-E):** Metadata contract `company_id`, `plan_price_id`, `livemode` documented now.
