#!/usr/bin/env bash
# Fully programmatic greenfield apply against the parity sandbox.
#
# Converts the existing parity project into greenfield NEW:
#   1) wipe public + storage objects
#   2) apply supabase/migrations/*.sql in order
#   3) purge auth.users via Admin API
#   4) rewrite .env.parity.local for PARITY_TARGET=new
#   5) optionally run test:parity:new
#
# Required env (from .env.parity.local or shell):
#   SUPABASE_PARITY_OLD_URL              (or GREENFIELD_URL)
#   SUPABASE_PARITY_OLD_ANON_KEY         (or GREENFIELD_ANON_KEY)
#   SUPABASE_PARITY_OLD_SERVICE_ROLE_KEY (or GREENFIELD_SERVICE_ROLE_KEY)
#   PARITY_DB_PASSWORD                   (database password for the project)
#
# Optional:
#   GREENFIELD_POOLER_HOST  default aws-0-ap-southeast-1.pooler.supabase.com
#   GREENFIELD_RUN_PARITY=1 run test:parity:new after apply
#   GREENFIELD_SKIP_AUTH_PURGE=1 leave auth.users in place
#
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

export PATH="/opt/homebrew/opt/libpq/bin:${PATH}"

if [[ -f "$ROOT/.env.parity.local" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT/.env.parity.local"
  set +a
fi

URL="${GREENFIELD_URL:-${SUPABASE_PARITY_OLD_URL:-}}"
ANON="${GREENFIELD_ANON_KEY:-${SUPABASE_PARITY_OLD_ANON_KEY:-}}"
SERVICE="${GREENFIELD_SERVICE_ROLE_KEY:-${SUPABASE_PARITY_OLD_SERVICE_ROLE_KEY:-}}"
DB_PASSWORD="${PARITY_DB_PASSWORD:-${GREENFIELD_DB_PASSWORD:-}}"
POOLER_HOST="${GREENFIELD_POOLER_HOST:-aws-0-ap-southeast-1.pooler.supabase.com}"

if [[ -z "$URL" || -z "$ANON" || -z "$SERVICE" ]]; then
  echo "Missing API URL/keys. Set SUPABASE_PARITY_OLD_* or GREENFIELD_*." >&2
  exit 1
fi

if [[ -z "$DB_PASSWORD" ]]; then
  echo "Missing PARITY_DB_PASSWORD (or GREENFIELD_DB_PASSWORD)." >&2
  echo "Dashboard → Project Settings → Database → Database password." >&2
  exit 1
fi

# Confirm this is not the live Expo production URL
PROD_URL="${EXPO_PUBLIC_SUPABASE_URL:-}"
if [[ -n "$PROD_URL" && "$PROD_URL" == "$URL" ]]; then
  echo "Refusing to wipe URL equal to EXPO_PUBLIC_SUPABASE_URL." >&2
  exit 1
fi

PROJECT_REF="$(python3 - <<PY
from urllib.parse import urlparse
print(urlparse("$URL").hostname.split(".")[0])
PY
)"

urlencode() {
  python3 -c 'import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1], safe=""))' "$1"
}

USER_ENC="$(urlencode "postgres.${PROJECT_REF}")"
PASS_ENC="$(urlencode "$DB_PASSWORD")"
DB_URL="postgresql://${USER_ENC}:${PASS_ENC}@${POOLER_HOST}:5432/postgres"

echo "==> Target project: ${PROJECT_REF}"
echo "==> Pooler: ${POOLER_HOST}"

echo "==> Smoke-test DB auth"
psql "$DB_URL" -v ON_ERROR_STOP=1 -c "select current_database(), current_user;" >/dev/null

echo "==> Wipe public schema + storage objects"
psql "$DB_URL" -v ON_ERROR_STOP=1 -f "$ROOT/scripts/greenfield/wipe_remote.sql"

echo "==> Clear storage buckets via Storage API"
export URL SERVICE
python3 - <<'PY'
import json, os, urllib.request, urllib.error

url = os.environ["URL"].rstrip("/")
key = os.environ["SERVICE"]

def call(method, path, body=None):
    data = None if body is None else json.dumps(body).encode()
    req = urllib.request.Request(
        f"{url}{path}",
        data=data,
        method=method,
        headers={
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req) as resp:
            raw = resp.read()
            return json.loads(raw.decode()) if raw else None
    except urllib.error.HTTPError as err:
        detail = err.read().decode(errors="ignore")
        raise RuntimeError(f"{method} {path} -> {err.code}: {detail}") from err

buckets = call("GET", "/storage/v1/bucket") or []
for bucket in buckets:
    name = bucket.get("id") or bucket.get("name")
    if not name:
        continue
    # Empty then delete
    try:
        call("POST", f"/storage/v1/object/list/{name}", {"prefix": "", "limit": 1000})
    except Exception:
        pass
    try:
        call("DELETE", f"/storage/v1/bucket/{name}", {"force": True})
        print(f"  deleted bucket {name}")
    except Exception as err:
        # force endpoint variants across API versions
        try:
            call("POST", f"/storage/v1/bucket/{name}/empty", {})
            call("DELETE", f"/storage/v1/bucket/{name}")
            print(f"  deleted bucket {name} (empty+delete)")
        except Exception as err2:
            print(f"  warn: bucket {name}: {err2}")
PY

echo "==> Apply greenfield migrations"
shopt -s nullglob
migrations=( "$ROOT"/supabase/migrations/*.sql )
if [[ ${#migrations[@]} -eq 0 ]]; then
  echo "No migrations found under supabase/migrations/" >&2
  exit 1
fi

for file in "${migrations[@]}"; do
  echo "  -> $(basename "$file")"
  psql "$DB_URL" -v ON_ERROR_STOP=1 -f "$file"
done

if [[ "${GREENFIELD_SKIP_AUTH_PURGE:-0}" != "1" ]]; then
  echo "==> Purge auth.users via Admin API"
  export URL SERVICE
  python3 - <<'PY'
import json, os, urllib.request, urllib.error

url = os.environ["URL"].rstrip("/")
key = os.environ["SERVICE"]

def req(method, path, body=None):
    data = None if body is None else json.dumps(body).encode()
    request = urllib.request.Request(
        f"{url}{path}",
        data=data,
        method=method,
        headers={
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
        },
    )
    with urllib.request.urlopen(request) as resp:
        raw = resp.read()
        return json.loads(raw.decode()) if raw else None

deleted = 0
page = 1
while True:
    payload = req("GET", f"/auth/v1/admin/users?page={page}&per_page=200")
    users = payload.get("users") if isinstance(payload, dict) else payload
    if not users:
        break
    for user in users:
        uid = user.get("id")
        if not uid:
            continue
        try:
            req("DELETE", f"/auth/v1/admin/users/{uid}")
            deleted += 1
        except urllib.error.HTTPError as err:
            print(f"  warn: delete {uid}: {err.code}")
    if len(users) < 200:
        break
    page += 1

print(f"  deleted {deleted} auth users")
PY
fi

echo "==> Rewrite .env.parity.local for PARITY_TARGET=new"
cat > "$ROOT/.env.parity.local" <<EOF
PARITY_TARGET=new
SUPABASE_TEST_CONFIRM_SANDBOX=1
PARITY_WRITE_GOLDEN=0
SUPABASE_PARITY_NEW_URL=${URL}
SUPABASE_PARITY_NEW_ANON_KEY=${ANON}
SUPABASE_PARITY_NEW_SERVICE_ROLE_KEY=${SERVICE}
# Same project formerly used as parity-old; kept for convenience.
SUPABASE_PARITY_OLD_URL=${URL}
SUPABASE_PARITY_OLD_ANON_KEY=${ANON}
SUPABASE_PARITY_OLD_SERVICE_ROLE_KEY=${SERVICE}
PARITY_DB_PASSWORD=${DB_PASSWORD}
GREENFIELD_POOLER_HOST=${POOLER_HOST}
EOF

echo "==> Verify core tables"
psql "$DB_URL" -v ON_ERROR_STOP=1 -c "\dt public.*"

if [[ "${GREENFIELD_RUN_PARITY:-0}" == "1" ]]; then
  echo "==> Running test:parity:new"
  set -a
  # shellcheck disable=SC1091
  source "$ROOT/.env.parity.local"
  set +a
  npm run test:parity:new
fi

echo "Done. Project ${PROJECT_REF} is now greenfield NEW."
echo "Next: GREENFIELD_RUN_PARITY=1 $0   # or: source .env.parity.local && npm run test:parity:new"
