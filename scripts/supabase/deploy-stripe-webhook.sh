#!/usr/bin/env bash
# Deploy stripe-webhook. Prefer: --project-ref <ref>
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
# shellcheck disable=SC1091
source "$ROOT/scripts/supabase/_resolve_project_ref.sh"
resolve_project_ref "$@" || exit 1

echo "Deploying stripe-webhook to project_ref length=${#REF}…"
supabase functions deploy stripe-webhook --project-ref "$REF" --no-verify-jwt
echo "Deploy finished."
