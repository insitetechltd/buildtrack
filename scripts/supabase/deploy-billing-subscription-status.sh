#!/usr/bin/env bash
# Deploy billing-subscription-status. Prefer: --project-ref <ref>
# DEV shortcut: --use-env (reads .env; refuses if .env is PROD)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
# shellcheck disable=SC1091
source "$ROOT/scripts/supabase/_resolve_project_ref.sh"
resolve_project_ref "$@" || exit 1

echo "Deploying billing-subscription-status to project_ref length=${#REF}…"
supabase functions deploy billing-subscription-status --project-ref "$REF"
echo "Deploy finished."
