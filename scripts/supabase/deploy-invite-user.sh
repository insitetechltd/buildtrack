#!/usr/bin/env bash
# Deploy corp RC invite-user Edge Function.
# Requires: `supabase login` (or SUPABASE_ACCESS_TOKEN) once.
# Reads project ref from EXPO_PUBLIC_SUPABASE_URL in .env — does not print secrets.
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

echo "Deploying invite-user and invite-open to project_ref length=${#REF}…"
supabase functions deploy invite-user --project-ref "$REF"
supabase functions deploy invite-open --project-ref "$REF" --no-verify-jwt
echo "Deploy finished."
echo "  POST /functions/v1/invite-user (user JWT)"
echo "  GET  /functions/v1/invite-open?token_hash=… (public HTML landing)"
