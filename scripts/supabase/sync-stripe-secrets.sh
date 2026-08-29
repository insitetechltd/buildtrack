#!/usr/bin/env bash
# Push Stripe secrets to an explicit Supabase project.
# Prefer: --project-ref <ref>  (keys still read from .env)
# DEV shortcut: --use-env
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
# shellcheck disable=SC1091
source "$ROOT/scripts/supabase/_resolve_project_ref.sh"
resolve_project_ref "$@" || exit 1

if [[ -n "${STRIPE_ENV_FILE:-}" ]]; then
  if [[ ! -f "$STRIPE_ENV_FILE" ]]; then
    echo "STRIPE_ENV_FILE not found: $STRIPE_ENV_FILE" >&2
    exit 1
  fi
  set -a
  # shellcheck disable=SC1090
  source "$STRIPE_ENV_FILE"
  set +a
elif [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
else
  echo "Missing .env (Stripe keys source) — or set STRIPE_ENV_FILE=…" >&2
  exit 1
fi

if [[ -z "${STRIPE_SECRET_KEY:-}" ]]; then
  echo "Missing STRIPE_SECRET_KEY in env source" >&2
  exit 1
fi

if [[ "$REF" == "jcnzjigxgkzhjsaekoqz" && "${STRIPE_SECRET_KEY}" == sk_live* && "${APP_STORE_STRIPE_GO:-}" != "1" ]]; then
  echo "Refusing to push sk_live to PROD without APP_STORE_STRIPE_GO=1" >&2
  exit 1
fi

ARGS=(secrets set --project-ref "$REF" "STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY}")
[[ -n "${STRIPE_WEBHOOK_SECRET:-}" ]] && ARGS+=("STRIPE_WEBHOOK_SECRET=${STRIPE_WEBHOOK_SECRET}")
[[ -n "${STRIPE_TRIAL_PERIOD_DAYS:-}" ]] && ARGS+=("STRIPE_TRIAL_PERIOD_DAYS=${STRIPE_TRIAL_PERIOD_DAYS}")
[[ -n "${BILLING_CURRENCY:-}" ]] && ARGS+=("BILLING_CURRENCY=${BILLING_CURRENCY}")

echo "Syncing Stripe secrets to project_ref length=${#REF}…"
supabase "${ARGS[@]}"
echo "Secrets synced."
