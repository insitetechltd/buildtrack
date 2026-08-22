-- DRAFT — M-BILL-01 BILL-A entitlements schema (DO NOT APPLY WITHOUT HUMAN GATE)
-- Milestone: WS-BILL / M-BILL-01 Phase BILL-B
-- Checklist: docs/superpowers/checklists/m-bill-01-human-gate.md
--
-- Trial model: REGULAR LIST PRICE + STRIPE NATIVE TRIAL (trial_end / trial_period_days).
--   locked_plan_price_id always references paid Growth/Unlimited plan_prices row.
--   No lockable $0 trial SKU. Subscription status trialing; caps in billing_phase=trial revision.
--   trial_stripe_coupon_id is optional — marketing promos only, not the standard free trial.
--
-- ROLLOUT: parity/sandbox first (v_apply_livemode = false in §14). Production requires
--   explicit written Human GO and v_apply_livemode = true.
-- Replace all stripe_* placeholder values before any apply that runs §14 pilot backfill.

-- ---------------------------------------------------------------------------
-- 1. Catalog: flexible N tiers
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.plan_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  kind text NOT NULL CHECK (kind IN ('base', 'addon')),
  display_name text NOT NULL,
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  stripe_product_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS plan_tiers_set_updated_at ON public.plan_tiers;
CREATE TRIGGER plan_tiers_set_updated_at
  BEFORE UPDATE ON public.plan_tiers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.plan_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_tier_id uuid NOT NULL REFERENCES public.plan_tiers (id) ON DELETE RESTRICT,
  stripe_price_id text NOT NULL,
  livemode boolean NOT NULL DEFAULT true,
  amount_cents integer NOT NULL CHECK (amount_cents >= 0),
  currency text NOT NULL DEFAULT 'usd',
  billing_interval text NOT NULL DEFAULT 'month' CHECK (billing_interval IN ('month', 'year')),
  effective_from timestamptz NOT NULL DEFAULT now(),
  effective_to timestamptz,
  is_sellable boolean NOT NULL DEFAULT true,
  caps_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT plan_prices_stripe_env_unique UNIQUE (stripe_price_id, livemode)
);

CREATE INDEX IF NOT EXISTS idx_plan_prices_tier_livemode
  ON public.plan_prices (plan_tier_id, livemode)
  WHERE is_sellable AND effective_to IS NULL;

COMMENT ON TABLE public.plan_prices IS
  'Versioned sellable SKUs. New list price = new row + new Stripe Price. Never UPDATE amount on referenced rows.';

-- ---------------------------------------------------------------------------
-- 2. Data-driven meters
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.meter_definitions (
  slug text PRIMARY KEY,
  display_name text NOT NULL,
  aggregation text NOT NULL CHECK (aggregation IN ('gauge', 'counter_monthly', 'counter_lifetime')),
  enforcement text NOT NULL DEFAULT 'soft' CHECK (enforcement IN ('hard', 'soft', 'none')),
  unit text NOT NULL DEFAULT 'count'
);

CREATE TABLE IF NOT EXISTS public.plan_price_meters (
  plan_price_id uuid NOT NULL REFERENCES public.plan_prices (id) ON DELETE RESTRICT,
  meter_slug text NOT NULL REFERENCES public.meter_definitions (slug) ON DELETE RESTRICT,
  limit_value bigint,
  PRIMARY KEY (plan_price_id, meter_slug)
);

COMMENT ON COLUMN public.plan_price_meters.limit_value IS
  'NULL = unlimited for this meter on this price version.';

-- ---------------------------------------------------------------------------
-- 3. Seat class rules (invite enforcement — BILL-D)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.seat_class_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_key text NOT NULL UNIQUE,
  consumes_pm_seats boolean NOT NULL DEFAULT false,
  consumes_worker_seats boolean NOT NULL DEFAULT false,
  is_seat_exempt boolean NOT NULL DEFAULT false,
  notes text
);

-- ---------------------------------------------------------------------------
-- 4. Per-company subscription & contract
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.company_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL UNIQUE REFERENCES public.companies (id) ON DELETE CASCADE,
  stripe_customer_id text,
  stripe_subscription_id text,
  status text NOT NULL DEFAULT 'trialing'
    CHECK (status IN (
      'trialing',
      'active',
      'past_due',
      'canceled',
      'paused',
      'incomplete',
      'incomplete_expired',
      'unpaid'
    )),
  trial_ends_at timestamptz,
  trial_stripe_coupon_id text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  locked_plan_price_id uuid NOT NULL REFERENCES public.plan_prices (id) ON DELETE RESTRICT,
  livemode boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_company_subscriptions_stripe_customer
  ON public.company_subscriptions (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_company_subscriptions_stripe_subscription
  ON public.company_subscriptions (stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;

DROP TRIGGER IF EXISTS company_subscriptions_set_updated_at ON public.company_subscriptions;
CREATE TRIGGER company_subscriptions_set_updated_at
  BEFORE UPDATE ON public.company_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMENT ON COLUMN public.company_subscriptions.locked_plan_price_id IS
  'Paid list-price SKU chosen at signup. Standard trial = Stripe native trial on this Price (trialing status).';

COMMENT ON COLUMN public.company_subscriptions.trial_ends_at IS
  'Synced from Stripe subscription.trial_end when BILL-C webhook is live.';

COMMENT ON COLUMN public.company_subscriptions.trial_stripe_coupon_id IS
  'Optional. Marketing/partner coupon on top of native trial — not used for the standard free trial.';

CREATE TABLE IF NOT EXISTS public.company_subscription_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_subscription_id uuid NOT NULL REFERENCES public.company_subscriptions (id) ON DELETE CASCADE,
  plan_price_id uuid NOT NULL REFERENCES public.plan_prices (id) ON DELETE RESTRICT,
  stripe_subscription_item_id text,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity >= 1),
  locked_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_company_subscription_items_sub
  ON public.company_subscription_items (company_subscription_id);

-- ---------------------------------------------------------------------------
-- 5. Entitlements (enforcement cache) + immutable revisions
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.company_entitlements (
  company_id uuid PRIMARY KEY REFERENCES public.companies (id) ON DELETE CASCADE,
  pm_seat_limit integer NOT NULL DEFAULT 1,
  worker_seat_limit integer NOT NULL DEFAULT 5,
  project_limit integer,
  entries_limit bigint,
  entries_limit_kind text NOT NULL DEFAULT 'monthly'
    CHECK (entries_limit_kind IN ('monthly', 'trial_total', 'unlimited')),
  storage_limit_bytes bigint,
  subscription_status text NOT NULL DEFAULT 'trialing',
  billing_phase text NOT NULL DEFAULT 'trial'
    CHECK (billing_phase IN ('trial', 'active', 'override')),
  source_plan_price_id uuid REFERENCES public.plan_prices (id) ON DELETE RESTRICT,
  entitlements_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  snapshot_locked_at timestamptz NOT NULL DEFAULT now(),
  override_expires_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS company_entitlements_set_updated_at ON public.company_entitlements;
CREATE TRIGGER company_entitlements_set_updated_at
  BEFORE UPDATE ON public.company_entitlements
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.company_entitlements IS
  'Derived enforcement cache. Canonical contract history = company_entitlement_revisions.';

CREATE TABLE IF NOT EXISTS public.company_entitlement_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  effective_at timestamptz NOT NULL DEFAULT now(),
  superseded_at timestamptz,
  billing_phase text NOT NULL CHECK (billing_phase IN ('trial', 'active', 'override', 'migration')),
  source text NOT NULL CHECK (source IN (
    'signup',
    'trial_end',
    'webhook',
    'addon_change',
    'price_migration',
    'pilot_backfill',
    'manual_override'
  )),
  locked_plan_price_id uuid REFERENCES public.plan_prices (id) ON DELETE RESTRICT,
  entitlements_snapshot jsonb NOT NULL,
  stripe_event_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_company_entitlement_revisions_company_effective
  ON public.company_entitlement_revisions (company_id, effective_at DESC);

COMMENT ON TABLE public.company_entitlement_revisions IS
  'Append-only contract history. Never UPDATE snapshot JSON on prior revisions.';

-- ---------------------------------------------------------------------------
-- 6. Usage metering runtime (BILL-F wiring deferred)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.company_usage_counters (
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  meter_slug text NOT NULL REFERENCES public.meter_definitions (slug) ON DELETE RESTRICT,
  period_key text NOT NULL,
  current_value bigint NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (company_id, meter_slug, period_key)
);

CREATE TABLE IF NOT EXISTS public.company_usage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  meter_slug text NOT NULL REFERENCES public.meter_definitions (slug) ON DELETE RESTRICT,
  idempotency_key text NOT NULL,
  delta bigint NOT NULL DEFAULT 1,
  period_key text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT company_usage_events_idempotency UNIQUE (company_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_company_usage_events_company_meter_period
  ON public.company_usage_events (company_id, meter_slug, period_key);

-- ---------------------------------------------------------------------------
-- 7. Webhook idempotency, audit, price migrations
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.billing_webhook_events (
  stripe_event_id text PRIMARY KEY,
  event_type text NOT NULL,
  livemode boolean NOT NULL DEFAULT true,
  processed_at timestamptz NOT NULL DEFAULT now(),
  payload_hash text
);

CREATE TABLE IF NOT EXISTS public.billing_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies (id) ON DELETE SET NULL,
  actor_user_id uuid REFERENCES public.users (id) ON DELETE SET NULL,
  action text NOT NULL,
  before_snapshot jsonb,
  after_snapshot jsonb,
  reason text,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_billing_audit_log_company_created
  ON public.billing_audit_log (company_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.subscription_price_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  from_plan_price_id uuid NOT NULL REFERENCES public.plan_prices (id) ON DELETE RESTRICT,
  to_plan_price_id uuid NOT NULL REFERENCES public.plan_prices (id) ON DELETE RESTRICT,
  stripe_subscription_item_id text,
  effective_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'notice_sent', 'stripe_applied', 'confirmed', 'failed', 'canceled')),
  notice_sent_at timestamptz,
  stripe_schedule_id text,
  failure_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscription_price_changes_company_status
  ON public.subscription_price_changes (company_id, status);

-- ---------------------------------------------------------------------------
-- 8. Helpers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.billing_deny_row_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'append_only_table: % on %', TG_OP, TG_TABLE_NAME;
END;
$$;

REVOKE ALL ON FUNCTION public.billing_deny_row_mutation() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.billing_deny_row_mutation() TO service_role;

DROP TRIGGER IF EXISTS company_entitlement_revisions_deny_mutation
  ON public.company_entitlement_revisions;
CREATE TRIGGER company_entitlement_revisions_deny_mutation
  BEFORE UPDATE OR DELETE ON public.company_entitlement_revisions
  FOR EACH ROW EXECUTE FUNCTION public.billing_deny_row_mutation();

DROP TRIGGER IF EXISTS billing_webhook_events_deny_mutation
  ON public.billing_webhook_events;
CREATE TRIGGER billing_webhook_events_deny_mutation
  BEFORE UPDATE OR DELETE ON public.billing_webhook_events
  FOR EACH ROW EXECUTE FUNCTION public.billing_deny_row_mutation();

CREATE OR REPLACE FUNCTION public.mbill01_assert_no_stripe_placeholders()
RETURNS void
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.plan_prices
    WHERE stripe_price_id LIKE 'REPLACE_AT_HUMAN_GATE%'
  ) OR EXISTS (
    SELECT 1
    FROM public.plan_tiers
    WHERE stripe_product_id LIKE 'REPLACE_AT_HUMAN_GATE%'
  ) THEN
    RAISE EXCEPTION
      'stripe_placeholders_remain: replace REPLACE_AT_HUMAN_GATE_* with real Stripe ids before pilot backfill';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.mbill01_assert_no_stripe_placeholders() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mbill01_assert_no_stripe_placeholders() TO service_role;

CREATE OR REPLACE FUNCTION public.build_entitlements_snapshot_from_price(
  p_plan_price_id uuid,
  p_billing_phase text DEFAULT 'active'
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_snapshot jsonb := '{}'::jsonb;
  v_row record;
  v_tier_kind text;
BEGIN
  IF p_billing_phase NOT IN ('trial', 'active', 'override', 'migration') THEN
    RAISE EXCEPTION 'invalid_billing_phase: %', p_billing_phase;
  END IF;

  SELECT pt.kind INTO v_tier_kind
  FROM public.plan_prices pp
  JOIN public.plan_tiers pt ON pt.id = pp.plan_tier_id
  WHERE pp.id = p_plan_price_id;

  IF v_tier_kind IS NULL THEN
    RAISE EXCEPTION 'plan_price_not_found: %', p_plan_price_id;
  END IF;

  IF v_tier_kind <> 'base' AND p_billing_phase IN ('trial', 'active') THEN
    RAISE EXCEPTION 'addon_price_cannot_lock_as_base: %', p_plan_price_id;
  END IF;

  FOR v_row IN
    SELECT ppm.meter_slug, ppm.limit_value
    FROM public.plan_price_meters ppm
    WHERE ppm.plan_price_id = p_plan_price_id
  LOOP
    v_snapshot := v_snapshot || jsonb_build_object(v_row.meter_slug, v_row.limit_value);
  END LOOP;

  RETURN jsonb_build_object(
    'locked_plan_price_id', p_plan_price_id,
    'billing_phase', p_billing_phase,
    'meters', v_snapshot
  );
END;
$$;

REVOKE ALL ON FUNCTION public.build_entitlements_snapshot_from_price(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.build_entitlements_snapshot_from_price(uuid, text) TO service_role;

COMMENT ON FUNCTION public.build_entitlements_snapshot_from_price IS
  'Single base-price catalog → snapshot at lock time only. Trial overlays and add-on merge are separate (BILL-C).';

-- ---------------------------------------------------------------------------
-- 9. RLS — default deny; company-scoped read; service_role writes
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  t text;
  billing_tables text[] := ARRAY[
    'plan_tiers',
    'plan_prices',
    'meter_definitions',
    'plan_price_meters',
    'seat_class_rules',
    'company_subscriptions',
    'company_subscription_items',
    'company_entitlements',
    'company_entitlement_revisions',
    'company_usage_counters',
    'company_usage_events',
    'billing_webhook_events',
    'billing_audit_log',
    'subscription_price_changes'
  ];
BEGIN
  FOREACH t IN ARRAY billing_tables
  LOOP
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS anon_block_all ON public.%I', t);
    EXECUTE format(
      'CREATE POLICY anon_block_all ON public.%I AS RESTRICTIVE FOR ALL TO anon USING (false) WITH CHECK (false)',
      t
    );
  END LOOP;
END
$$;

DROP POLICY IF EXISTS plan_tiers_authenticated_read ON public.plan_tiers;
CREATE POLICY plan_tiers_authenticated_read
  ON public.plan_tiers FOR SELECT TO authenticated
  USING (is_active = true);

DROP POLICY IF EXISTS plan_prices_authenticated_read ON public.plan_prices;
CREATE POLICY plan_prices_authenticated_read
  ON public.plan_prices FOR SELECT TO authenticated
  USING (
    is_sellable = true
    AND effective_from <= now()
    AND (effective_to IS NULL OR effective_to > now())
  );

DROP POLICY IF EXISTS meter_definitions_authenticated_read ON public.meter_definitions;
CREATE POLICY meter_definitions_authenticated_read
  ON public.meter_definitions FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS plan_price_meters_authenticated_read ON public.plan_price_meters;
CREATE POLICY plan_price_meters_authenticated_read
  ON public.plan_price_meters FOR SELECT TO authenticated
  USING (
    plan_price_id IN (
      SELECT pp.id
      FROM public.plan_prices pp
      WHERE pp.is_sellable = true
        AND pp.effective_from <= now()
        AND (pp.effective_to IS NULL OR pp.effective_to > now())
    )
  );

DROP POLICY IF EXISTS seat_class_rules_authenticated_read ON public.seat_class_rules;
CREATE POLICY seat_class_rules_authenticated_read
  ON public.seat_class_rules FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS company_entitlements_member_read ON public.company_entitlements;
CREATE POLICY company_entitlements_member_read
  ON public.company_entitlements FOR SELECT TO authenticated
  USING (
    NOT public.user_is_pending(auth.uid())
    AND company_id = public.get_user_company_id(auth.uid())
  );

DROP POLICY IF EXISTS company_subscriptions_member_read ON public.company_subscriptions;
CREATE POLICY company_subscriptions_member_read
  ON public.company_subscriptions FOR SELECT TO authenticated
  USING (
    NOT public.user_is_pending(auth.uid())
    AND company_id = public.get_user_company_id(auth.uid())
  );

DROP POLICY IF EXISTS company_subscription_items_member_read ON public.company_subscription_items;
CREATE POLICY company_subscription_items_member_read
  ON public.company_subscription_items FOR SELECT TO authenticated
  USING (
    NOT public.user_is_pending(auth.uid())
    AND company_subscription_id IN (
      SELECT cs.id FROM public.company_subscriptions cs
      WHERE cs.company_id = public.get_user_company_id(auth.uid())
    )
  );

DROP POLICY IF EXISTS company_entitlement_revisions_member_read ON public.company_entitlement_revisions;
CREATE POLICY company_entitlement_revisions_member_read
  ON public.company_entitlement_revisions FOR SELECT TO authenticated
  USING (
    NOT public.user_is_pending(auth.uid())
    AND company_id = public.get_user_company_id(auth.uid())
  );

DROP POLICY IF EXISTS company_usage_counters_member_read ON public.company_usage_counters;
CREATE POLICY company_usage_counters_member_read
  ON public.company_usage_counters FOR SELECT TO authenticated
  USING (
    NOT public.user_is_pending(auth.uid())
    AND company_id = public.get_user_company_id(auth.uid())
  );

-- Privileges: authenticated SELECT on catalog + own-company rows; service_role writes state.
DO $$
DECLARE
  t text;
  catalog_tables text[] := ARRAY[
    'plan_tiers',
    'plan_prices',
    'meter_definitions',
    'plan_price_meters',
    'seat_class_rules'
  ];
  member_read_tables text[] := ARRAY[
    'company_subscriptions',
    'company_subscription_items',
    'company_entitlements',
    'company_entitlement_revisions',
    'company_usage_counters'
  ];
  service_only_tables text[] := ARRAY[
    'company_usage_events',
    'billing_webhook_events',
    'billing_audit_log',
    'subscription_price_changes'
  ];
BEGIN
  FOREACH t IN ARRAY catalog_tables
  LOOP
    EXECUTE format('GRANT SELECT ON TABLE public.%I TO authenticated, service_role', t);
    EXECUTE format('GRANT INSERT, UPDATE, DELETE ON TABLE public.%I TO service_role', t);
    EXECUTE format('REVOKE INSERT, UPDATE, DELETE ON TABLE public.%I FROM authenticated', t);
  END LOOP;

  FOREACH t IN ARRAY member_read_tables
  LOOP
    EXECUTE format('GRANT SELECT ON TABLE public.%I TO authenticated, service_role', t);
    EXECUTE format('GRANT INSERT, UPDATE, DELETE ON TABLE public.%I TO service_role', t);
    EXECUTE format('REVOKE INSERT, UPDATE, DELETE ON TABLE public.%I FROM authenticated', t);
  END LOOP;

  FOREACH t IN ARRAY service_only_tables
  LOOP
    EXECUTE format('GRANT ALL ON TABLE public.%I TO service_role', t);
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM authenticated', t);
  END LOOP;
END
$$;

-- ---------------------------------------------------------------------------
-- 10. Seed — meter definitions (R6)
-- ---------------------------------------------------------------------------

INSERT INTO public.meter_definitions (slug, display_name, aggregation, enforcement, unit)
VALUES
  ('pm_seats', 'PM seats', 'gauge', 'hard', 'count'),
  ('worker_seats', 'Worker seats', 'gauge', 'hard', 'count'),
  ('projects', 'Active projects', 'gauge', 'soft', 'count'),
  ('entries_trial_total', 'Trial entries (lifetime)', 'counter_lifetime', 'soft', 'count'),
  ('entries_monthly', 'Entries per billing period', 'counter_monthly', 'soft', 'count'),
  ('storage_bytes', 'Hot storage', 'gauge', 'soft', 'bytes')
ON CONFLICT (slug) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 11. Seed — plan tiers (no lockable trial tier; trial = native Stripe trial on base Price)
-- ---------------------------------------------------------------------------

INSERT INTO public.plan_tiers (slug, kind, display_name, description, sort_order, stripe_product_id)
VALUES
  (
    'growth',
    'base',
    'Growth',
    '5 projects, under 200 entries/month, 1 PM + 5 workers.',
    10,
    'REPLACE_AT_HUMAN_GATE_product_growth'
  ),
  (
    'unlimited',
    'base',
    'Unlimited',
    'Unlimited projects/entries, max 5 GB storage, 1 PM + 5 workers.',
    20,
    'REPLACE_AT_HUMAN_GATE_product_unlimited'
  ),
  (
    'addon_worker_pack',
    'addon',
    'Worker pack (+5)',
    'Add-on: +5 worker seats per month.',
    30,
    'REPLACE_AT_HUMAN_GATE_product_worker_pack'
  ),
  (
    'addon_pm_seat',
    'addon',
    'PM seat (+1)',
    'Add-on: +1 PM seat per month.',
    40,
    'REPLACE_AT_HUMAN_GATE_product_pm_seat'
  )
ON CONFLICT (slug) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 12. Seed — plan prices (live + test placeholders — replace at Human Gate)
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  v_growth_tier uuid;
  v_unlimited_tier uuid;
  v_worker_tier uuid;
  v_pm_tier uuid;
  v_growth_live uuid;
  v_growth_test uuid;
  v_unlimited_live uuid;
  v_unlimited_test uuid;
  v_worker_live uuid;
  v_worker_test uuid;
  v_pm_live uuid;
  v_pm_test uuid;
  v_price_id uuid;
BEGIN
  SELECT id INTO v_growth_tier FROM public.plan_tiers WHERE slug = 'growth';
  SELECT id INTO v_unlimited_tier FROM public.plan_tiers WHERE slug = 'unlimited';
  SELECT id INTO v_worker_tier FROM public.plan_tiers WHERE slug = 'addon_worker_pack';
  SELECT id INTO v_pm_tier FROM public.plan_tiers WHERE slug = 'addon_pm_seat';

  IF v_growth_tier IS NULL
    OR v_unlimited_tier IS NULL
    OR v_worker_tier IS NULL
    OR v_pm_tier IS NULL
  THEN
    RAISE EXCEPTION 'plan_tiers seed incomplete: growth/unlimited/addon tiers missing';
  END IF;

  INSERT INTO public.plan_prices (
    plan_tier_id, stripe_price_id, livemode, amount_cents, is_sellable, caps_snapshot
  )
  VALUES
    (v_growth_tier, 'REPLACE_AT_HUMAN_GATE_price_growth_v1_live', true, 1999, true, '{}'::jsonb),
    (v_growth_tier, 'REPLACE_AT_HUMAN_GATE_price_growth_v1_test', false, 1999, true, '{}'::jsonb),
    (v_unlimited_tier, 'REPLACE_AT_HUMAN_GATE_price_unlimited_v1_live', true, 19999, true, '{}'::jsonb),
    (v_unlimited_tier, 'REPLACE_AT_HUMAN_GATE_price_unlimited_v1_test', false, 19999, true, '{}'::jsonb),
    (v_worker_tier, 'REPLACE_AT_HUMAN_GATE_price_worker_pack_v1_live', true, 499, true, '{}'::jsonb),
    (v_worker_tier, 'REPLACE_AT_HUMAN_GATE_price_worker_pack_v1_test', false, 499, true, '{}'::jsonb),
    (v_pm_tier, 'REPLACE_AT_HUMAN_GATE_price_pm_seat_v1_live', true, 999, true, '{}'::jsonb),
    (v_pm_tier, 'REPLACE_AT_HUMAN_GATE_price_pm_seat_v1_test', false, 999, true, '{}'::jsonb)
  ON CONFLICT (stripe_price_id, livemode) DO NOTHING;

  SELECT id INTO v_growth_live
  FROM public.plan_prices
  WHERE stripe_price_id = 'REPLACE_AT_HUMAN_GATE_price_growth_v1_live' AND livemode = true;

  SELECT id INTO v_growth_test
  FROM public.plan_prices
  WHERE stripe_price_id = 'REPLACE_AT_HUMAN_GATE_price_growth_v1_test' AND livemode = false;

  SELECT id INTO v_unlimited_live
  FROM public.plan_prices
  WHERE stripe_price_id = 'REPLACE_AT_HUMAN_GATE_price_unlimited_v1_live' AND livemode = true;

  SELECT id INTO v_unlimited_test
  FROM public.plan_prices
  WHERE stripe_price_id = 'REPLACE_AT_HUMAN_GATE_price_unlimited_v1_test' AND livemode = false;

  SELECT id INTO v_worker_live
  FROM public.plan_prices
  WHERE stripe_price_id = 'REPLACE_AT_HUMAN_GATE_price_worker_pack_v1_live' AND livemode = true;

  SELECT id INTO v_worker_test
  FROM public.plan_prices
  WHERE stripe_price_id = 'REPLACE_AT_HUMAN_GATE_price_worker_pack_v1_test' AND livemode = false;

  SELECT id INTO v_pm_live
  FROM public.plan_prices
  WHERE stripe_price_id = 'REPLACE_AT_HUMAN_GATE_price_pm_seat_v1_live' AND livemode = true;

  SELECT id INTO v_pm_test
  FROM public.plan_prices
  WHERE stripe_price_id = 'REPLACE_AT_HUMAN_GATE_price_pm_seat_v1_test' AND livemode = false;

  IF v_growth_live IS NULL OR v_growth_test IS NULL
    OR v_unlimited_live IS NULL OR v_unlimited_test IS NULL
    OR v_worker_live IS NULL OR v_worker_test IS NULL
    OR v_pm_live IS NULL OR v_pm_test IS NULL
  THEN
    RAISE EXCEPTION 'plan_prices seed incomplete: expected live+test rows for all tiers';
  END IF;

  -- Growth v1 meters (paid period)
  INSERT INTO public.plan_price_meters (plan_price_id, meter_slug, limit_value)
  VALUES
    (v_growth_live, 'pm_seats', 1),
    (v_growth_live, 'worker_seats', 5),
    (v_growth_live, 'projects', 5),
    (v_growth_live, 'entries_monthly', 200),
    (v_growth_live, 'storage_bytes', 5368709120),
    (v_growth_test, 'pm_seats', 1),
    (v_growth_test, 'worker_seats', 5),
    (v_growth_test, 'projects', 5),
    (v_growth_test, 'entries_monthly', 200),
    (v_growth_test, 'storage_bytes', 5368709120)
  ON CONFLICT DO NOTHING;

  -- Unlimited v1 meters (live + test)
  INSERT INTO public.plan_price_meters (plan_price_id, meter_slug, limit_value)
  VALUES
    (v_unlimited_live, 'pm_seats', 1),
    (v_unlimited_live, 'worker_seats', 5),
    (v_unlimited_live, 'projects', NULL),
    (v_unlimited_live, 'entries_monthly', NULL),
    (v_unlimited_live, 'storage_bytes', 5368709120),
    (v_unlimited_test, 'pm_seats', 1),
    (v_unlimited_test, 'worker_seats', 5),
    (v_unlimited_test, 'projects', NULL),
    (v_unlimited_test, 'entries_monthly', NULL),
    (v_unlimited_test, 'storage_bytes', 5368709120)
  ON CONFLICT DO NOTHING;

  -- Add-on meters (per quantity unit, live + test)
  INSERT INTO public.plan_price_meters (plan_price_id, meter_slug, limit_value)
  VALUES
    (v_worker_live, 'worker_seats', 5),
    (v_worker_test, 'worker_seats', 5),
    (v_pm_live, 'pm_seats', 1),
    (v_pm_test, 'pm_seats', 1)
  ON CONFLICT DO NOTHING;

  -- Denormalized caps_snapshot at seed time (base tiers only; addons lock per-item at checkout)
  FOREACH v_price_id IN ARRAY ARRAY[
    v_growth_live,
    v_growth_test,
    v_unlimited_live,
    v_unlimited_test
  ]
  LOOP
    UPDATE public.plan_prices pp
    SET caps_snapshot = public.build_entitlements_snapshot_from_price(pp.id, 'active')
    WHERE pp.id = v_price_id;
  END LOOP;
END
$$;

-- ---------------------------------------------------------------------------
-- 13. Seed — seat class rules (Human Gate may adjust; BILL-D aligns invite-user)
-- ---------------------------------------------------------------------------

INSERT INTO public.seat_class_rules (role_key, consumes_pm_seats, consumes_worker_seats, is_seat_exempt, notes)
VALUES
  ('admin', false, false, true, 'Org admin — exempt from seat caps (BILL-D must align isPmRole)'),
  ('company_admin', false, false, true, 'Company admin — exempt (BILL-D must align isPmRole)'),
  ('manager', true, false, false, 'Legacy role key; live DB uses supervisor after 03a'),
  ('supervisor', true, false, false, 'PM seat consumer'),
  ('foreman', false, true, false, 'Worker seat consumer'),
  ('member', false, true, false, 'Default worker seat (system_permission path)'),
  ('worker', false, true, false, 'Worker seat')
ON CONFLICT (role_key) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 14. Pilot backfill — existing companies (Human Gate: confirm caps before apply)
--
--   v_run_pilot_backfill: set true only after Stripe ids replaced + Human Gate GO.
--   v_apply_livemode: false = parity/test (default), true = production apply.
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  v_run_pilot_backfill boolean := false;
  v_apply_livemode boolean := false;
  v_default_price uuid;
  v_company record;
  v_trial_snapshot jsonb;
  v_subscription_id uuid;
BEGIN
  IF NOT v_run_pilot_backfill THEN
    RAISE NOTICE 'pilot backfill skipped (v_run_pilot_backfill=false). Set true after Human Gate + real Stripe ids.';
    RETURN;
  END IF;

  PERFORM public.mbill01_assert_no_stripe_placeholders();

  SELECT id INTO v_default_price
  FROM public.plan_prices pp
  JOIN public.plan_tiers pt ON pt.id = pp.plan_tier_id
  WHERE pt.slug = 'growth'
    AND pp.livemode = v_apply_livemode
    AND pp.is_sellable = true
    AND (pp.effective_to IS NULL OR pp.effective_to > now())
  ORDER BY pp.effective_from DESC
  LIMIT 1;

  IF v_default_price IS NULL THEN
    RAISE EXCEPTION
      'pilot_backfill_default_price_missing: growth plan_price livemode=% not found',
      v_apply_livemode;
  END IF;

  v_trial_snapshot := jsonb_build_object(
    'locked_plan_price_id', v_default_price,
    'billing_phase', 'trial',
    'trial_discount_model', 'stripe_native_trial',
    'meters', jsonb_build_object(
      'pm_seats', 1,
      'worker_seats', 5,
      'projects', 1,
      'entries_trial_total', 100,
      'storage_bytes', 5368709120
    )
  );

  FOR v_company IN SELECT id FROM public.companies
  LOOP
    INSERT INTO public.company_subscriptions (
      company_id,
      status,
      locked_plan_price_id,
      livemode
    )
    VALUES (
      v_company.id,
      'trialing',
      v_default_price,
      v_apply_livemode
    )
    ON CONFLICT (company_id) DO NOTHING
    RETURNING id INTO v_subscription_id;

    IF v_subscription_id IS NULL THEN
      SELECT id INTO v_subscription_id
      FROM public.company_subscriptions
      WHERE company_id = v_company.id;
    END IF;

    INSERT INTO public.company_entitlements (
      company_id,
      pm_seat_limit,
      worker_seat_limit,
      project_limit,
      entries_limit,
      entries_limit_kind,
      storage_limit_bytes,
      subscription_status,
      billing_phase,
      source_plan_price_id,
      entitlements_snapshot,
      snapshot_locked_at
    )
    VALUES (
      v_company.id,
      1,
      5,
      1,
      100,
      'trial_total',
      5368709120,
      'trialing',
      'trial',
      v_default_price,
      v_trial_snapshot,
      now()
    )
    ON CONFLICT (company_id) DO NOTHING;

    INSERT INTO public.company_entitlement_revisions (
      company_id,
      billing_phase,
      source,
      locked_plan_price_id,
      entitlements_snapshot
    )
    SELECT
      v_company.id,
      'trial',
      'pilot_backfill',
      v_default_price,
      v_trial_snapshot
    WHERE NOT EXISTS (
      SELECT 1 FROM public.company_entitlement_revisions r
      WHERE r.company_id = v_company.id AND r.source = 'pilot_backfill'
    );

    INSERT INTO public.billing_audit_log (company_id, action, after_snapshot, reason)
    SELECT
      v_company.id,
      'pilot_backfill',
      v_trial_snapshot,
      format(
        'Pre-Stripe pilot: Growth list price locked (livemode=%s); trial caps; checkout in BILL-E.',
        v_apply_livemode
      )
    WHERE NOT EXISTS (
      SELECT 1 FROM public.billing_audit_log b
      WHERE b.company_id = v_company.id AND b.action = 'pilot_backfill'
    );
  END LOOP;
END
$$;

-- ---------------------------------------------------------------------------
-- END DRAFT — verify with Human Gate checklist before renomination to live migration
-- ---------------------------------------------------------------------------
