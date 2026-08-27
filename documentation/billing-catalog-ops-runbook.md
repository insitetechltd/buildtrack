# Billing catalog ops runbook

**Scope:** Change pricing, tiers, meters, or display currency **without** shipping a new mobile app build.

**Source of truth:** Postgres catalog (`plan_tiers`, `plan_prices`, `plan_price_meters`, `meter_definitions`) + Stripe Prices. Mobile and edge functions read the catalog at runtime.

---

## Quick reference

| Change | Where to edit | App update? |
|---|---|---|
| List price (HK$160 → HK$180) | Stripe Price + `plan_prices` sync | No |
| Rename tier ("Starter" → "Essentials") | `plan_tiers.display_name` | No |
| Hide tier | `plan_tiers.is_active = false` or `plan_prices.is_sellable = false` | No |
| Add tier | `plan_tiers` + Stripe Product/Price + sellable `plan_prices` row | No |
| Change caps / quotas | `plan_price_meters` (+ `meter_definitions` for new meter types) | No |
| Display currency | `EXPO_PUBLIC_BILLING_DISPLAY_CURRENCY` + HKD/USD rows in `plan_prices` | Env in next build once; catalog rows immediately |
| Charge currency | Edge secret `BILLING_CURRENCY` + matching `plan_prices.currency` | No (server config) |

---

## Architecture (runtime paths)

```
Stripe Prices
    ↓ sync script
plan_prices (+ plan_price_meters, plan_tiers, meter_definitions)
    ↓                           ↓
fetchSellablePlanCatalog     create-checkout-session (planPriceId pin)
    ↓                           ↓
Company Plan UI (N cards)    Stripe Checkout amount
    ↓
stripe-webhook → company_entitlements.entitlements_snapshot.meters
```

**Checkout pinning:** The app sends `planTierSlug` + `planPriceId` (the exact sellable row shown on the card). The edge function validates the price row matches the tier before creating the session.

**Add-on seats (HK lock):**
- **Add** mid-cycle → Stripe qty increases immediately with `create_prorations` (charge remainder). Entitlements rise with webhook.
- **Remove** mid-cycle → **no refund**. Stripe qty stays until `current_period_end`; desired qty stored in subscription metadata (`insite_pending_*`). Seat limit stays high until period rolls; `stripe-webhook` applies decrease with `proration_behavior=none`.
- **Re-add** before period end → clears pending decrease; no second charge if qty never dropped.

---

## 1. Change list price (same tier)

1. Create a new Stripe Price (or update lookup key target) for the Product.
2. Run sync:
   ```bash
   bash scripts/stripe/sync-hkd-plan-prices-to-db.sh
   ```
   Script reads `unit_amount` from Stripe into `plan_prices.amount_cents`.
3. Verify in Supabase: latest sellable row for the tier has correct `amount_cents` and `stripe_price_id`.
4. Smoke: open Company Plan → confirm label → Subscribe → Stripe shows same amount.

**Rollback:** Mark new row `is_sellable = false`; re-enable prior row.

---

## 2. Rename / hide / add tiers

### Rename
```sql
UPDATE plan_tiers SET display_name = 'Essentials' WHERE slug = 'growth';
```

### Hide (keep existing subscribers on locked price)
```sql
UPDATE plan_tiers SET is_active = false WHERE slug = 'legacy_tier';
-- or
UPDATE plan_prices SET is_sellable = false WHERE id = '<uuid>';
```

### Add tier
1. `INSERT INTO plan_tiers (slug, kind, display_name, sort_order, is_active, ...)`.
2. Create Stripe Product + recurring Price (set lookup key for sync script if using HKD bootstrap).
3. `INSERT INTO plan_prices (...)` with `is_sellable = true`, correct `currency`, `livemode`.
4. `INSERT INTO plan_price_meters` for each cap.
5. No app release — card count follows active sellable base tiers.

**Upgrade/downgrade order:** `plan_tiers.sort_order` (lower = entry tier). Edge checkout uses this for self-serve upgrade vs downgrade block.

---

## 3. Change quotas / add new meter types

### New meter type (e.g. AI tokens)
1. Register definition:
   ```sql
   INSERT INTO meter_definitions (slug, display_name, aggregation, enforcement, unit)
   VALUES ('ai_tokens_monthly', 'AI tokens / month', 'counter_monthly', 'soft', 'tokens');
   ```
2. Attach to price:
   ```sql
   INSERT INTO plan_price_meters (plan_price_id, meter_slug, limit_value)
   VALUES ('<plan_price_uuid>', 'ai_tokens_monthly', 100000);
   ```
3. App displays caps and limit rows from catalog automatically.
4. **Enforcement:** Seat invite checks read `entitlements_snapshot.meters` first (pm/worker). New meters are stored in snapshot on webhook sync; add app/server enforcement hooks when product requires hard blocks.

### Change caps on existing price
Update `plan_price_meters` for the sellable `plan_prices` row. New subscriptions pick up caps via webhook `build_entitlements_snapshot_from_price`. Existing subscribers keep locked snapshot until upgrade/price migration.

---

## 4. Display currency

- **Catalog fetch:** `EXPO_PUBLIC_BILLING_DISPLAY_CURRENCY` (default `hkd`). App loads sellable rows for that currency.
- **Charge:** Edge `BILLING_CURRENCY` env (default `hkd`) must match sellable `plan_prices.currency`.
- **Multi-currency:** Maintain parallel sellable rows per currency; switch display via env or future locale config.

---

## 5. Deploy edge functions after catalog logic changes

```bash
bash scripts/supabase/deploy-create-checkout-session.sh
bash scripts/supabase/deploy-stripe-webhook.sh
```

Requires `supabase login` locally. Mobile-only catalog reads do not need edge redeploy.

---

## 6. Verification checklist

- [ ] Company Plan shows expected tier count, names, prices, cap lines
- [ ] Subscribe opens Stripe with matching amount
- [ ] Webhook writes `company_entitlements.entitlements_snapshot.meters` including new slugs
- [ ] Invite seat caps respect snapshot meters (pm/worker)
- [ ] Upgrade path respects `sort_order`; downgrade blocked self-serve

---

## Related files

| Layer | Path |
|---|---|
| Catalog fetch (app) | `src/api/fetchSellablePlanCatalog.ts` |
| Plan cards | `src/billing/companyPlanOptions.ts` |
| Checkout client | `src/api/createCheckoutSession.ts` |
| Checkout edge | `supabase/functions/create-checkout-session/index.ts` |
| Webhook sync | `supabase/functions/stripe-webhook/index.ts` |
| HKD sync script | `scripts/stripe/sync-hkd-plan-prices-to-db.sh` |
| Schema | `supabase/migrations/20260823000100_mbill01_entitlements.sql` |
