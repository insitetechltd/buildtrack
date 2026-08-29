#!/usr/bin/env bash
# Push EXPO_PUBLIC_SUPABASE_* into EAS environments (no values printed).
# preview + development → DEV; production → PROD.
# Prereq: .env (DEV) + .cache/env-cutover/insite-prod.env.local (PROD).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

DEV_ENV="$ROOT/.env"
PROD_ENV="$ROOT/.cache/env-cutover/insite-prod.env.local"

if [[ ! -f "$DEV_ENV" || ! -f "$PROD_ENV" ]]; then
  echo "Need .env (DEV) and .cache/env-cutover/insite-prod.env.local (PROD)" >&2
  exit 1
fi

load_kv() {
  local file="$1" key="$2"
  python3 - <<PY
from pathlib import Path
env = {}
for line in Path("$file").read_text().splitlines():
    s = line.strip()
    if not s or s.startswith("#") or "=" not in s:
        continue
    k, v = s.split("=", 1)
    env[k.strip()] = v.strip().strip('"').strip("'")
print(env.get("$key", ""), end="")
PY
}

DEV_URL="$(load_kv "$DEV_ENV" EXPO_PUBLIC_SUPABASE_URL)"
DEV_ANON="$(load_kv "$DEV_ENV" EXPO_PUBLIC_SUPABASE_ANON_KEY)"
PROD_URL="$(load_kv "$PROD_ENV" EXPO_PUBLIC_SUPABASE_URL)"
PROD_ANON="$(load_kv "$PROD_ENV" EXPO_PUBLIC_SUPABASE_ANON_KEY)"

python3 - <<PY
from urllib.parse import urlparse
dev = urlparse("$DEV_URL").hostname or ""
prod = urlparse("$PROD_URL").hostname or ""
assert "zusulknbhaumougqckec" in dev, "DEV URL must be insite-dev"
assert "jcnzjigxgkzhjsaekoqz" in prod, "PROD URL must be insite-prod"
assert len("$DEV_ANON") > 20 and len("$PROD_ANON") > 20
print("refs_ok")
PY

upsert() {
  local env_name="$1" name="$2" value="$3" visibility="$4"
  echo "Upsert $name → EAS env=$env_name (visibility=$visibility, value not printed)"
  eas env:create \
    --name "$name" \
    --value "$value" \
    --environment "$env_name" \
    --visibility "$visibility" \
    --type string \
    --force \
    --non-interactive \
    >/dev/null
}

# Daily TF / preview / simulator → DEV
for e in preview development; do
  upsert "$e" EXPO_PUBLIC_SUPABASE_URL "$DEV_URL" plaintext
  upsert "$e" EXPO_PUBLIC_SUPABASE_ANON_KEY "$DEV_ANON" sensitive
done

# App Store profile only → PROD
upsert production EXPO_PUBLIC_SUPABASE_URL "$PROD_URL" plaintext
upsert production EXPO_PUBLIC_SUPABASE_ANON_KEY "$PROD_ANON" sensitive

echo "Done. Verify with: eas env:list --environment preview && eas env:list --environment production"
echo "Profiles: production-local/preview/simulator → preview(DEV); production → production(PROD)."
