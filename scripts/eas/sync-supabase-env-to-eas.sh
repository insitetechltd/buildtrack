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
DEV_PK="$(load_kv "$DEV_ENV" EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY)"
PROD_URL="$(load_kv "$PROD_ENV" EXPO_PUBLIC_SUPABASE_URL)"
PROD_ANON="$(load_kv "$PROD_ENV" EXPO_PUBLIC_SUPABASE_ANON_KEY)"
PROD_STRIPE_ENV="$ROOT/.cache/env-cutover/insite-prod-stripe.env.local"
PROD_PK=""
if [[ -f "$PROD_STRIPE_ENV" ]]; then
  PROD_PK="$(load_kv "$PROD_STRIPE_ENV" EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY)"
fi

python3 - <<PY
from urllib.parse import urlparse
dev = urlparse("$DEV_URL").hostname or ""
prod = urlparse("$PROD_URL").hostname or ""
assert "zusulknbhaumougqckec" in dev, "DEV URL must be insite-dev"
assert "jcnzjigxgkzhjsaekoqz" in prod, "PROD URL must be insite-prod"
assert len("$DEV_ANON") > 20 and len("$PROD_ANON") > 20
dev_pk = "$DEV_PK"
prod_pk = "$PROD_PK"
if dev_pk:
    assert dev_pk.startswith("pk_test_"), "DEV publishable key must be pk_test_ (testing builds)"
if prod_pk:
    assert prod_pk.startswith("pk_live_"), "PROD publishable key must be pk_live_ (App Store)"
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

# Daily TF / preview / simulator → DEV DB + Stripe test
for e in preview development; do
  upsert "$e" EXPO_PUBLIC_SUPABASE_URL "$DEV_URL" plaintext
  upsert "$e" EXPO_PUBLIC_SUPABASE_ANON_KEY "$DEV_ANON" sensitive
  if [[ -n "$DEV_PK" ]]; then
    upsert "$e" EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY "$DEV_PK" sensitive
  else
    echo "WARN: no EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY in .env — catalog livemode preference unset for $e" >&2
  fi
done

# App Store profile only → PROD DB + Stripe live publishable (when present)
upsert production EXPO_PUBLIC_SUPABASE_URL "$PROD_URL" plaintext
upsert production EXPO_PUBLIC_SUPABASE_ANON_KEY "$PROD_ANON" sensitive
if [[ -n "$PROD_PK" ]]; then
  upsert production EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY "$PROD_PK" sensitive
else
  echo "NOTE: no pk_live in .cache/env-cutover/insite-prod-stripe.env.local yet — add before App Store billing UI prefers live catalog" >&2
fi

echo "Done. Verify with: eas env:list --environment preview && eas env:list --environment production"
echo "Pairing: dev/preview/simulator → DEV+pk_test; production → PROD+pk_live."
