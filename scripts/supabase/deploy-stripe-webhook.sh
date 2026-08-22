#!/usr/bin/env bash
# Deploy M-BILL-01 BILL-C stripe-webhook Edge Function.
# Requires: `supabase login` (or SUPABASE_ACCESS_TOKEN) once.
# Dashboard secrets: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET (whsec_…)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

if [[ ! -f .env ]]; then
  echo "Missing .env" >&2
  exit 1
fi

REF="$(python3 - <<'PY'
from pathlib import Path
from urllib.parse import urlparse
env = {}
for line in Path('.env').read_text().splitlines():
    s = line.strip()
    if not s or s.startswith('#') or '=' not in s:
        continue
    k, v = s.split('=', 1)
    env[k.strip()] = v.strip().strip('"').strip("'")
url = env.get('EXPO_PUBLIC_SUPABASE_URL', '')
host = urlparse(url).hostname or ''
if not host.endswith('supabase.co'):
    raise SystemExit('EXPO_PUBLIC_SUPABASE_URL is not a *.supabase.co host')
print(host.split('.')[0])
PY
)"

echo "Deploying stripe-webhook to project_ref length=${#REF}…"
supabase functions deploy stripe-webhook --project-ref "$REF" --no-verify-jwt
echo "Deploy finished."
echo "  POST /functions/v1/stripe-webhook (Stripe signature only — no JWT)"
echo "  Set secrets: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET"
echo "  Stripe Dashboard → Webhooks → endpoint URL above"
echo "  Events: checkout.session.completed, customer.subscription.created|updated|deleted"
