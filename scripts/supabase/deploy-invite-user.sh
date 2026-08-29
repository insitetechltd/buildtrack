#!/usr/bin/env bash
# Deploy invite-user + invite-open. Prefer: --project-ref <ref>
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
# shellcheck disable=SC1091
source "$ROOT/scripts/supabase/_resolve_project_ref.sh"
resolve_project_ref "$@" || exit 1

echo "Deploying invite-user / invite-open to project_ref length=${#REF}…"
supabase functions deploy invite-user --project-ref "$REF"
supabase functions deploy invite-open --project-ref "$REF" --no-verify-jwt
echo "Deploy finished."
