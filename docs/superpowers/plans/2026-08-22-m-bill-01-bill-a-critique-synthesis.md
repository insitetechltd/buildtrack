# BILL-A Gate A — multi-model critique synthesis

**Plan under review:** `2026-08-22-m-bill-01-bill-a-kickoff.md`  
**Date:** 2026-08-22  
**Models:** Composer 2.5 Fast, Grok 4.6 High Fast, GPT 5.6 Sol Medium  
**Brief:** Identical shared evaluation brief per `.cursor/rules/multi-model-evaluation-prompt.mdc`

---

## Verdict consensus

| Model | Verdict |
|---|---|
| Composer 2.5 Fast | **GO-with-changes** |
| Grok 4.6 High Fast | **GO-with-changes** |
| GPT 5.6 Sol Medium | **NO-GO** |

**Orchestrator recommendation:** **GO-with-changes — do not apply BILL-B until Critical/High items are folded into ERD + draft SQL + Human Gate.**

GPT NO-GO aligns with the two GO-with-changes reviews on substance: the **direction** is right; the **freeze** is premature. All three flagged the same structural defects.

---

## Unanimous Critical / High themes

### C1 — Trial is not a $0 lockable SKU (3/3)

R6 = card-on-file + auto-convert to **chosen paid plan** after ~30 days. Modeling `trial_v1 $0/mo` as `locked_plan_price_id` would grandfather customers at $0 forever under P3.

**Locked fix:** Trial = **regular list price** (`locked_plan_price_id` = Growth/Unlimited paid SKU) + **Stripe native trial** on that Price (`trialing` status, `trial_end`). No $0 plan tier. `billing_phase=trial` revision holds trial caps; on `trialing → active`, new revision applies paid-period caps from the same locked price.

### C2 — Catalog vs contract: enforcement must not re-merge live catalog (3/3)

Merge rule `base.plan_price_meters + addons` is correct **at lock time only**. Runtime must read **frozen** `company_entitlements` / snapshot. Never UPDATE `plan_price_meters` on prices referenced by `locked_plan_price_id`.

**Locked fix:** Webhook/lock path writes effective caps once; BILL-D reads entitlements row only. Runbook: archive prices, never edit meter rows in place.

### C3 — P6 “data-driven meters” vs typed columns (3/3)

`company_entitlements` wide columns contradict extensible meters.

**Locked fix (infancy pragmatism):**  
- **Catalog:** `meter_definitions` + `plan_price_meters` (flexible N meters on new prices)  
- **Contract:** `entitlements_snapshot jsonb` = canonical locked meter map  
- **Enforcement cache:** typed columns for R6 hot path (seats, projects, entries, storage) **derived at lock** from snapshot  
- **New meter later:** new price version + snapshot shape; optional `company_entitlement_meters` table in BILL-B if Human Gate prefers full JSONB enforcement now  

GPT additionally requires **append-only `company_entitlement_revisions`** — adopt as BILL-B table: `(company_id, effective_at, snapshot, source, superseded_at)`.

### H1 — `livemode` / environment on Stripe IDs (2/3 explicit, 1 implied)

**Locked fix:** `plan_prices.stripe_price_id` unique per `(stripe_price_id, livemode)`. Seed test + live catalogs separately.

### H2 — Pilot backfill + fail-closed (2/3)

Existing companies have no Stripe row today. **Locked fix:** BILL-B migration backfills all `companies` to R6 paper caps + `billing_audit_log` reason `pilot_backfill`. Missing entitlements row = deny invite (fail-closed).

### H3 — Role → seat law (3/3)

`invite-user` `isPmRole()` ≠ R6 ≠ AUTHZ-02 (company admin may not be billable seat). **Locked fix:** Human Gate signs role→meter table before BILL-D. Default infancy: `company_admin`/`admin` org roles **exempt** from `pm_seats`; PM = supervisor/manager-class; foreman = worker unless changed.

### H4 — Billing period vs calendar month for entries (2/3)

**Locked fix:** `company_usage_counters.period_key` = Stripe `current_period_start` ISO date (or subscription period id), not bare `YYYY-MM`.

### H5 — Storage cap on all base tiers (2/3)

R6 unlimited-only wording left Growth ambiguous. **Locked fix:** Growth + trial get explicit storage meter (propose same 5 GB as Unlimited for infancy, or lower — **Human Gate**).

### H6 — Price increase mechanics incomplete (3/3)

**Locked fix:** `subscription_price_changes` **required** for cohort migrations; Stripe Subscription Schedule or period-end update; `proration_behavior=none` default; `notice_sent_at` + legal minimum notice in Human Gate.

---

## Tier flexibility scores

| Model | Score | Range |
|---|---|---|
| Composer | 3/5 | Catalog strong; enforcement columns limit meter flexibility |
| Grok | 4/5 | Tier rows good; trial-as-tier and triple sell flags weaken |
| GPT | 3/5 | DB tiers OK; app hardcoding + env + columns limit |

**Consensus:** **3–4/5** for **tier count** flexibility (add/retire tiers = INSERT + Stripe). **Lower** for **resource/meter** flexibility until snapshot/revision model is locked.

---

## Grandfathering / price increase scores

| Model | Score |
|---|---|
| Composer | 3/5 |
| Grok | 3/5 |
| GPT | 2/5 |

**Consensus:** Principles (immutable Stripe Prices, locked `plan_price_id`, default grandfather) are correct. **Implementation gaps** (trial $0, live catalog merge, no revision history, weak migration queue) drop confidence until fixed.

---

## Additional gaps (union — promote to Human Gate where noted)

| Gap | Severity | Gate? |
|---|---|---|
| Immutable entitlement **revision history** | High | Yes |
| Usage **event ledger** + idempotency (not counters alone) | High | BILL-F design |
| Seat counting: pending / deactivated / invite holds seat? | High | Yes |
| Entry increment path: which writes count (drafts, photo-only) | Medium | Yes |
| Downgrade over-cap behavior | Medium | BILL-F |
| Past_due grace days + soft read-only | Medium | BILL-F |
| Checkout metadata: `company_id`, `plan_price_id`, `livemode` | High | BILL-E spec |
| Payment Link vs Checkout Session (single env URL today) | High | BILL-E |
| AUTHZ-02 seat billing attribution (`billing_company_id`) | Medium | Document reserve |
| App Store IAP vs Stripe (3.1.1) | Medium | Product/legal |
| Webhook ordering + rebuild from Stripe API | Medium | BILL-C runbook |
| Override `expires_at` auto-revert | Medium | Yes |
| Off-by-one: R6 “under 100/200” vs limit 100/200 | Low | Yes |
| Coupons / comp months | Low | Ops defer |
| ToS price-change notice period | Medium | Legal |

---

## Top 5 must-fix before BILL-B (merged)

1. **Trial model** — regular list price + Stripe native trial; no $0 SKU; trial/paid entitlement revisions  
2. **Contract immutability** — entitlement revisions + snapshot SoT; no live catalog merge at enforce time  
3. **Meter storage decision** — snapshot JSONB + typed cache (or full `company_entitlement_meters`); document ALTER policy  
4. **`livemode` + pilot backfill + fail-closed** — env-separated prices; backfill existing companies  
5. **Seat law + period + storage + price migration queue** — Human Gate signed; Stripe Schedule runbook  

---

## Next BILL-A steps (post-synthesis)

| Step | Action |
|---|---|
| 1 | Update kickoff ERD per locked fixes above |
| 2 | Write `supabase/migrations/DRAFT_mbill01_entitlements.sql` |
| 3 | Write `docs/superpowers/checklists/m-bill-01-human-gate.md` |
| 4 | Re-run Gate A on **draft SQL** (optional second pass) |
| 5 | User Human Gate review → GO for BILL-B |

---

## Gate A declaration

- **Plan critique:** 3 models, shared brief, 2× GO-with-changes + 1× NO-GO (aligned on defects)  
- **Critical/High folded into kickoff:** pending draft SQL commit  
- **Builder (BILL-B):** blocked until draft SQL + checklist complete  

Updated: 2026-08-22
