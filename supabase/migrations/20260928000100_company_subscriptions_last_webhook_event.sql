-- HUMAN GATE — DO NOT APPLY without Tristan GO (2026-09-27 stripe-webhook harden).
--
-- Adds last_webhook_event_created_at so customer.subscription.* handlers can
-- skip Stripe events older than the last successfully applied event (out-of-order
-- delivery after cancel was flipping companies back to trialing).
--
-- Apply order: this migration on DEV then PROD → then redeploy stripe-webhook.
-- Operator apply scripts: use apply-migrations-to-project.sh with explicit GO;
-- do not `supabase db push` blindly in commercial planes.
--
-- Rollback (manual): ALTER TABLE public.company_subscriptions DROP COLUMN IF EXISTS last_webhook_event_created_at;

ALTER TABLE public.company_subscriptions
  ADD COLUMN IF NOT EXISTS last_webhook_event_created_at timestamptz;

COMMENT ON COLUMN public.company_subscriptions.last_webhook_event_created_at IS
  'UTC time of Stripe event.created for the last successfully applied subscription webhook. Used to ignore stale out-of-order events. HUMAN GATE migration 20260928000100.';
