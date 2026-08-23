#!/usr/bin/env bash
# Push Stripe secrets from .env to Supabase Edge Functions (project-wide).
# Requires SUPABASE_ACCESS_TOKEN (supabase login) and STRIPE_SECRET_KEY in .env.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

if [[ ! -f .env ]]; then
  echo "Missing .env" >&2
  exit 1
fi

set -a
# shellcheck disable=SC1091
source .env
set +a

if [[ -z "${SUPABASE_ACCESS_TOKEN:-}" ]]; then
  echo "Missing SUPABASE_ACCESS_TOKEN. Run: supabase login" >&2
  exit 1
fi

if [[ -z "${STRIPE_SECRET_KEY:-}" ]]; then
  echo "Missing STRIPE_SECRET_KEY in .env" >&2
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

ARGS=(secrets set --project-ref "$REF" "STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY}")

if [[ -n "${STRIPE_WEBHOOK_SECRET:-}" ]]; then
  ARGS+=("STRIPE_WEBHOOK_SECRET=${STRIPE_WEBHOOK_SECRET}")
fi

echo "Syncing Stripe secrets to project_ref length=${#REF}…"
supabase "${ARGS[@]}"
echo "Secrets synced. Redeploy create-checkout-session if you changed the function code."
