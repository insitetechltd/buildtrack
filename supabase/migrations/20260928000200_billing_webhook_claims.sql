-- Applied DEV+PROD 2026-09-28 (operator `supabase db query -f`; history repair pending).
--
-- Problem: claim-before-work wrote into append-only billing_webhook_events, then
-- releaseWebhookEvent tried DELETE on failure. Trigger billing_deny_row_mutation
-- blocked DELETE → claim stuck → Stripe retries returned duplicate:true → event lost.
--
-- Fix: mutable billing_webhook_claims for lease/retry; keep billing_webhook_events
-- append-only as success audit only (insert after handler succeeds).
--
-- Safety for existing PROD rows:
--   - CREATE TABLE IF NOT EXISTS (empty → backfilled)
--   - Backfill done claims from existing billing_webhook_events (idempotent)
--   - Does NOT drop/alter append-only trigger on billing_webhook_events
--   - Does NOT DELETE or UPDATE billing_webhook_events
--
-- Rollback (manual): DROP TABLE IF EXISTS public.billing_webhook_claims;

CREATE TABLE IF NOT EXISTS public.billing_webhook_claims (
  stripe_event_id text PRIMARY KEY,
  event_type text NOT NULL,
  livemode boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'processing'
    CHECK (status IN ('processing', 'done', 'failed')),
  claimed_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_error text
);

CREATE INDEX IF NOT EXISTS idx_billing_webhook_claims_status_claimed
  ON public.billing_webhook_claims (status, claimed_at);

COMMENT ON TABLE public.billing_webhook_claims IS
  'Mutable Stripe webhook lease/claim. processing→done on success; failed/stale processing reclaimable. Success audit remains billing_webhook_events (append-only).';

DROP TRIGGER IF EXISTS billing_webhook_claims_set_updated_at ON public.billing_webhook_claims;
CREATE TRIGGER billing_webhook_claims_set_updated_at
  BEFORE UPDATE ON public.billing_webhook_claims
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.billing_webhook_claims ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS billing_webhook_claims_service_all ON public.billing_webhook_claims;
CREATE POLICY billing_webhook_claims_service_all
  ON public.billing_webhook_claims
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

REVOKE ALL ON public.billing_webhook_claims FROM PUBLIC;
REVOKE ALL ON public.billing_webhook_claims FROM anon, authenticated;
GRANT ALL ON public.billing_webhook_claims TO service_role;

-- Existing append-only audit rows = completed deliveries (including stuck failed
-- claims from the broken DELETE release — those events are already lost).
INSERT INTO public.billing_webhook_claims (
  stripe_event_id,
  event_type,
  livemode,
  status,
  claimed_at,
  updated_at
)
SELECT
  e.stripe_event_id,
  e.event_type,
  e.livemode,
  'done',
  e.processed_at,
  e.processed_at
FROM public.billing_webhook_events e
ON CONFLICT (stripe_event_id) DO NOTHING;
