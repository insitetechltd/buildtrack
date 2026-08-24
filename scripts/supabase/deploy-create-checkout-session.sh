#!/usr/bin/env bash
# Deploy M-BILL-01 BILL-E create-checkout-session Edge Function.
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

echo "Deploying create-checkout-session to project_ref length=${#REF}…"
supabase functions deploy create-checkout-session --project-ref "$REF"
echo "Deploy finished."
echo "  POST /functions/v1/create-checkout-session (JWT required)"
echo "  Secrets: STRIPE_SECRET_KEY"
echo "  Optional: STRIPE_CHECKOUT_SUCCESS_URL, STRIPE_CHECKOUT_CANCEL_URL"
echo "  Optional: BILLING_CURRENCY (default hkd), STRIPE_TRIAL_PERIOD_DAYS (omit = no native trial)"
