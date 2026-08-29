#!/usr/bin/env bash
# Deploy billing Edge Functions to an explicit --project-ref (no silent .env ref).
# Usage:
#   bash scripts/supabase/deploy-edge-to-project.sh --project-ref <ref> [--set-billing-currency]
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

REF=""
SET_CURRENCY=0
while [[ $# -gt 0 ]]; do
  case "$1" in
    --project-ref) REF="${2:-}"; shift 2 ;;
    --set-billing-currency) SET_CURRENCY=1; shift ;;
    *) echo "Unknown arg: $1" >&2; exit 1 ;;
  esac
done

if [[ -z "$REF" ]]; then
  echo "Required: --project-ref <ref>" >&2
  exit 1
fi
if [[ "$REF" == "zusulknbhaumougqckec" ]]; then
  echo "Refusing DEV ref without explicit override. Use PROD ref for ENV-01 Phase B." >&2
  exit 1
fi

if ! supabase projects list >/dev/null 2>&1; then
  echo "Not authenticated. Run: supabase login" >&2
  exit 1
fi

echo "Deploying Edge functions to project_ref=$REF"
supabase functions deploy create-checkout-session --project-ref "$REF"
supabase functions deploy stripe-webhook --project-ref "$REF" --no-verify-jwt
supabase functions deploy invite-user --project-ref "$REF"
supabase functions deploy invite-open --project-ref "$REF" --no-verify-jwt
supabase functions deploy update-company-addons --project-ref "$REF"

if [[ "$SET_CURRENCY" == "1" ]]; then
  echo "Setting BILLING_CURRENCY=hkd on $REF (no Stripe live keys)"
  supabase secrets set --project-ref "$REF" "BILLING_CURRENCY=hkd" \
    "STRIPE_CHECKOUT_SUCCESS_URL=taskr://profile?checkout=success" \
    "STRIPE_CHECKOUT_CANCEL_URL=taskr://profile?checkout=cancel"
fi

echo "Edge deploy finished for $REF"
echo "Stripe sk_live / webhook secret: deferred to App Store submit (Phase D)."
