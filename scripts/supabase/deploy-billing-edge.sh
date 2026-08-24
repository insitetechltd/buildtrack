#!/usr/bin/env bash
# Deploy billing-related Edge Functions + sync Stripe secrets from .env.
# Prereq: `supabase login` OR SUPABASE_ACCESS_TOKEN in .env / environment.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

if [[ ! -f .env ]]; then
  echo "Missing .env" >&2
  exit 1
fi

if ! supabase projects list >/dev/null 2>&1; then
  echo "Not authenticated. Run: supabase login" >&2
  echo "  Or add SUPABASE_ACCESS_TOKEN to .env (Dashboard → Account → Access tokens)" >&2
  exit 1
fi

echo "=== 1/4 Sync Stripe secrets (STRIPE_SECRET_KEY, optional STRIPE_WEBHOOK_SECRET) ==="
bash scripts/supabase/sync-stripe-secrets.sh

echo ""
echo "=== 2/4 Deploy create-checkout-session (planPriceId pin, dynamic tiers) ==="
bash scripts/supabase/deploy-create-checkout-session.sh

echo ""
echo "=== 3/4 Deploy stripe-webhook (catalog trial meters) ==="
bash scripts/supabase/deploy-stripe-webhook.sh

echo ""
echo "=== 4/4 Deploy invite-user + invite-open (snapshot seat limits) ==="
bash scripts/supabase/deploy-invite-user.sh

echo ""
echo "All billing edge deploys finished."
echo "Optional Dashboard secrets (if not in .env):"
echo "  BILLING_CURRENCY=hkd"
echo "  STRIPE_CHECKOUT_SUCCESS_URL=taskr://profile?checkout=success"
echo "  STRIPE_CHECKOUT_CANCEL_URL=taskr://profile?checkout=cancel"
echo "  STRIPE_TRIAL_PERIOD_DAYS= (leave unset = no native trial)"
echo "Verify: one test Subscribe from Company Plan → Stripe shows catalog amount."
