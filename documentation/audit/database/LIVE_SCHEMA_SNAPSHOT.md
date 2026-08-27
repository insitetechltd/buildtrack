# Live schema snapshot (redacted)

- Captured: `2026-08-25T01:51Z` UTC
- Source: Supabase Management API database query (pg_catalog)
- Project ref: **redacted** (length=20)
- Scope: billing + company/user tables — **columns / PKs / FKs only, no row data**
- Prefer this file over migration SQL when writing live Dashboard queries

## Column presence probes (high-churn mistakes)

| table | column | present |
|---|---|---|
| `users` | `role` | YES |
| `users` | `system_permission` | NO |
| `users` | `is_pending` | YES |
| `users` | `company_id` | YES |
| `billing_webhook_events` | `created_at` | NO |
| `billing_webhook_events` | `processed_at` | YES |
| `companies` | `created_at` | YES |
| `company_subscriptions` | `company_id` | YES |
| `company_entitlements` | `company_id` | YES |

## Primary keys

| table | column | constraint |
|---|---|---|
| `billing_audit_log` | `id` | `billing_audit_log_pkey` |
| `billing_webhook_events` | `stripe_event_id` | `billing_webhook_events_pkey` |
| `companies` | `id` | `companies_pkey` |
| `company_entitlement_revisions` | `id` | `company_entitlement_revisions_pkey` |
| `company_entitlements` | `company_id` | `company_entitlements_pkey` |
| `company_subscriptions` | `id` | `company_subscriptions_pkey` |
| `meter_definitions` | `slug` | `meter_definitions_pkey` |
| `plan_price_meters` | `plan_price_id` | `plan_price_meters_pkey` |
| `plan_price_meters` | `meter_slug` | `plan_price_meters_pkey` |
| `plan_prices` | `id` | `plan_prices_pkey` |
| `plan_tiers` | `id` | `plan_tiers_pkey` |
| `users` | `id` | `users_pkey` |

## Foreign keys

| table.column | → | foreign | constraint |
|---|---|---|---|
| `billing_audit_log.actor_user_id` | → | `users.id` | `billing_audit_log_actor_user_id_fkey` |
| `billing_audit_log.company_id` | → | `companies.id` | `billing_audit_log_company_id_fkey` |
| `company_entitlement_revisions.company_id` | → | `companies.id` | `company_entitlement_revisions_company_id_fkey` |
| `company_entitlement_revisions.locked_plan_price_id` | → | `plan_prices.id` | `company_entitlement_revisions_locked_plan_price_id_fkey` |
| `company_entitlements.company_id` | → | `companies.id` | `company_entitlements_company_id_fkey` |
| `company_entitlements.source_plan_price_id` | → | `plan_prices.id` | `company_entitlements_source_plan_price_id_fkey` |
| `company_subscriptions.company_id` | → | `companies.id` | `company_subscriptions_company_id_fkey` |
| `company_subscriptions.locked_plan_price_id` | → | `plan_prices.id` | `company_subscriptions_locked_plan_price_id_fkey` |
| `plan_price_meters.meter_slug` | → | `meter_definitions.slug` | `plan_price_meters_meter_slug_fkey` |
| `plan_price_meters.plan_price_id` | → | `plan_prices.id` | `plan_price_meters_plan_price_id_fkey` |
| `plan_prices.plan_tier_id` | → | `plan_tiers.id` | `plan_prices_plan_tier_id_fkey` |
| `users.approved_by` | → | `users.id` | `users_approved_by_fkey` |
| `users.company_id` | → | `companies.id` | `users_company_id_fkey` |
| `users.id` | → | `users.id` | `users_id_fkey_auth_users` |
| `users.last_selected_project_id` | → | `projects.id` | `users_last_selected_project_id_fkey` |

## Columns by table

### `companies` (16 columns)

| column | type | nullable | default |
|---|---|---|---|
| `id` | `uuid` | `NO` | `uuid_generate_v4()` |
| `name` | `text` | `NO` |  |
| `type` | `text` | `NO` |  |
| `description` | `text` | `YES` |  |
| `address` | `text` | `YES` |  |
| `phone` | `text` | `YES` |  |
| `email` | `text` | `YES` |  |
| `website` | `text` | `YES` |  |
| `logo` | `text` | `YES` |  |
| `tax_id` | `text` | `YES` |  |
| `license_number` | `text` | `YES` |  |
| `insurance_expiry` | `timestamp with time zone` | `YES` |  |
| `banner` | `jsonb` | `YES` | `'{"text": "", "isVisible": true, "textColor": "#ffffff", "backgroundColor": "#3b82f6"}'::jsonb` |
| `created_at` | `timestamp with time zone` | `YES` | `now()` |
| `created_by` | `uuid` | `YES` |  |
| `is_active` | `boolean` | `YES` | `true` |

### `users` (16 columns)

| column | type | nullable | default |
|---|---|---|---|
| `id` | `uuid` | `NO` | `uuid_generate_v4()` |
| `email` | `text` | `YES` |  |
| `name` | `text` | `NO` |  |
| `role` | `text` | `NO` |  |
| `company_id` | `uuid` | `YES` |  |
| `position` | `text` | `NO` |  |
| `phone` | `text` | `NO` |  |
| `created_at` | `timestamp with time zone` | `YES` | `now()` |
| `last_selected_project_id` | `uuid` | `YES` |  |
| `is_pending` | `boolean` | `YES` | `false` |
| `is_active` | `boolean` | `NO` | `true` |
| `approved_by` | `uuid` | `YES` |  |
| `approved_at` | `timestamp with time zone` | `YES` |  |
| `invite_sign_in_link` | `text` | `YES` |  |
| `must_set_password` | `boolean` | `NO` | `false` |
| `updated_at` | `timestamp with time zone` | `NO` | `now()` |

### `company_subscriptions` (13 columns)

| column | type | nullable | default |
|---|---|---|---|
| `id` | `uuid` | `NO` | `gen_random_uuid()` |
| `company_id` | `uuid` | `NO` |  |
| `stripe_customer_id` | `text` | `YES` |  |
| `stripe_subscription_id` | `text` | `YES` |  |
| `status` | `text` | `NO` | `'trialing'::text` |
| `trial_ends_at` | `timestamp with time zone` | `YES` |  |
| `trial_stripe_coupon_id` | `text` | `YES` |  |
| `current_period_start` | `timestamp with time zone` | `YES` |  |
| `current_period_end` | `timestamp with time zone` | `YES` |  |
| `locked_plan_price_id` | `uuid` | `NO` |  |
| `livemode` | `boolean` | `NO` | `true` |
| `created_at` | `timestamp with time zone` | `NO` | `now()` |
| `updated_at` | `timestamp with time zone` | `NO` | `now()` |

### `company_entitlements` (14 columns)

| column | type | nullable | default |
|---|---|---|---|
| `company_id` | `uuid` | `NO` |  |
| `pm_seat_limit` | `integer` | `NO` | `1` |
| `worker_seat_limit` | `integer` | `NO` | `5` |
| `project_limit` | `integer` | `YES` |  |
| `entries_limit` | `bigint` | `YES` |  |
| `entries_limit_kind` | `text` | `NO` | `'monthly'::text` |
| `storage_limit_bytes` | `bigint` | `YES` |  |
| `subscription_status` | `text` | `NO` | `'trialing'::text` |
| `billing_phase` | `text` | `NO` | `'trial'::text` |
| `source_plan_price_id` | `uuid` | `YES` |  |
| `entitlements_snapshot` | `jsonb` | `NO` | `'{}'::jsonb` |
| `snapshot_locked_at` | `timestamp with time zone` | `NO` | `now()` |
| `override_expires_at` | `timestamp with time zone` | `YES` |  |
| `updated_at` | `timestamp with time zone` | `NO` | `now()` |

### `company_entitlement_revisions` (10 columns)

| column | type | nullable | default |
|---|---|---|---|
| `id` | `uuid` | `NO` | `gen_random_uuid()` |
| `company_id` | `uuid` | `NO` |  |
| `effective_at` | `timestamp with time zone` | `NO` | `now()` |
| `superseded_at` | `timestamp with time zone` | `YES` |  |
| `billing_phase` | `text` | `NO` |  |
| `source` | `text` | `NO` |  |
| `locked_plan_price_id` | `uuid` | `YES` |  |
| `entitlements_snapshot` | `jsonb` | `NO` |  |
| `stripe_event_id` | `text` | `YES` |  |
| `created_at` | `timestamp with time zone` | `NO` | `now()` |

### `billing_webhook_events` (5 columns)

| column | type | nullable | default |
|---|---|---|---|
| `stripe_event_id` | `text` | `NO` |  |
| `event_type` | `text` | `NO` |  |
| `livemode` | `boolean` | `NO` | `true` |
| `processed_at` | `timestamp with time zone` | `NO` | `now()` |
| `payload_hash` | `text` | `YES` |  |

### `billing_audit_log` (9 columns)

| column | type | nullable | default |
|---|---|---|---|
| `id` | `uuid` | `NO` | `gen_random_uuid()` |
| `company_id` | `uuid` | `YES` |  |
| `actor_user_id` | `uuid` | `YES` |  |
| `action` | `text` | `NO` |  |
| `before_snapshot` | `jsonb` | `YES` |  |
| `after_snapshot` | `jsonb` | `YES` |  |
| `reason` | `text` | `YES` |  |
| `expires_at` | `timestamp with time zone` | `YES` |  |
| `created_at` | `timestamp with time zone` | `NO` | `now()` |

### `plan_tiers` (10 columns)

| column | type | nullable | default |
|---|---|---|---|
| `id` | `uuid` | `NO` | `gen_random_uuid()` |
| `slug` | `text` | `NO` |  |
| `kind` | `text` | `NO` |  |
| `display_name` | `text` | `NO` |  |
| `description` | `text` | `YES` |  |
| `sort_order` | `integer` | `NO` | `0` |
| `is_active` | `boolean` | `NO` | `true` |
| `stripe_product_id` | `text` | `YES` |  |
| `created_at` | `timestamp with time zone` | `NO` | `now()` |
| `updated_at` | `timestamp with time zone` | `NO` | `now()` |

### `plan_prices` (12 columns)

| column | type | nullable | default |
|---|---|---|---|
| `id` | `uuid` | `NO` | `gen_random_uuid()` |
| `plan_tier_id` | `uuid` | `NO` |  |
| `stripe_price_id` | `text` | `NO` |  |
| `livemode` | `boolean` | `NO` | `true` |
| `amount_cents` | `integer` | `NO` |  |
| `currency` | `text` | `NO` | `'usd'::text` |
| `billing_interval` | `text` | `NO` | `'month'::text` |
| `effective_from` | `timestamp with time zone` | `NO` | `now()` |
| `effective_to` | `timestamp with time zone` | `YES` |  |
| `is_sellable` | `boolean` | `NO` | `true` |
| `caps_snapshot` | `jsonb` | `NO` | `'{}'::jsonb` |
| `created_at` | `timestamp with time zone` | `NO` | `now()` |

### `plan_price_meters` (3 columns)

| column | type | nullable | default |
|---|---|---|---|
| `plan_price_id` | `uuid` | `NO` |  |
| `meter_slug` | `text` | `NO` |  |
| `limit_value` | `bigint` | `YES` |  |

### `meter_definitions` (5 columns)

| column | type | nullable | default |
|---|---|---|---|
| `slug` | `text` | `NO` |  |
| `display_name` | `text` | `NO` |  |
| `aggregation` | `text` | `NO` |  |
| `enforcement` | `text` | `NO` | `'soft'::text` |
| `unit` | `text` | `NO` | `'count'::text` |

## Agent rule

1. Before writing live SQL against production, read this snapshot.
2. Do **not** assume greenfield migration columns exist.
3. Live `users` uses `role` (not `system_permission`).
4. `billing_webhook_events` timestamp is `processed_at` (not `created_at`).
5. Refresh this file after schema migrations: see `scripts/supabase/dump-live-schema.sh`.

