#!/usr/bin/env bash
# Apply a single SQL migration file to the Supabase project in .env (pooler session).
# Requires PARITY_DB_PASSWORD or GREENFIELD_DB_PASSWORD in env / .env.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

export PATH="/opt/homebrew/opt/libpq/bin:${PATH}"

SQL_FILE="${1:-}"
if [[ -z "$SQL_FILE" || ! -f "$SQL_FILE" ]]; then
  echo "Usage: PARITY_DB_PASSWORD=… bash scripts/supabase/apply-sql-file.sh <path.sql>" >&2
  exit 1
fi

if [[ -f "$ROOT/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT/.env"
  set +a
fi

DB_PASSWORD="${PARITY_DB_PASSWORD:-${GREENFIELD_DB_PASSWORD:-}}"
if [[ -z "$DB_PASSWORD" ]]; then
  echo "Missing PARITY_DB_PASSWORD (Dashboard → Project Settings → Database)." >&2
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

urlencode() {
  python3 -c 'import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1], safe=""))' "$1"
}

USER_ENC="$(urlencode "postgres.${REF}")"
PASS_ENC="$(urlencode "$DB_PASSWORD")"
POOLER_HOST="${GREENFIELD_POOLER_HOST:-aws-1-ap-south-1.pooler.supabase.com}"
DB_URL="postgresql://${USER_ENC}:${PASS_ENC}@${POOLER_HOST}:5432/postgres"

echo "Applying $(basename "$SQL_FILE") to project_ref length=${#REF}…"
psql "$DB_URL" -v ON_ERROR_STOP=1 -f "$SQL_FILE"
echo "Apply finished."
