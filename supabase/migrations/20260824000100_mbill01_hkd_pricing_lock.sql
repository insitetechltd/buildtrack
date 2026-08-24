-- M-BILL-01 HKD pricing lock (2026-08-24)
-- Human Gate: run scripts/stripe/bootstrap-hkd-catalog.sh then sync-hkd-plan-prices-to-db.sh
-- This migration updates tier display names only; plan_prices HKD rows are applied via sync script.

UPDATE plan_tiers SET display_name = 'Starter' WHERE slug = 'growth';
UPDATE plan_tiers SET display_name = 'Pro' WHERE slug = 'unlimited';
UPDATE plan_tiers SET display_name = 'Worker pack (+5)' WHERE slug = 'addon_worker_pack';
UPDATE plan_tiers SET display_name = 'PM seat (+1)' WHERE slug = 'addon_pm_seat';
