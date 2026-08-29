#!/usr/bin/env bash
# Deploy create-checkout-session. Prefer: --project-ref <ref>
# DEV shortcut: --use-env (reads .env; refuses if .env is PROD)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
# shellcheck disable=SC1091
source "$ROOT/scripts/supabase/_resolve_project_ref.sh"
resolve_project_ref "$@" || exit 1

echo "Deploying create-checkout-session to project_ref length=${#REF}…"
supabase functions deploy create-checkout-session --project-ref "$REF"
echo "Deploy finished."
