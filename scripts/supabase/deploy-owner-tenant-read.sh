#!/usr/bin/env bash
# Deploy owner-tenant-read Edge (JWT verified — default).
# DEV:  bash scripts/supabase/deploy-owner-tenant-read.sh --project-ref zusulknbhaumougqckec
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
# shellcheck disable=SC1091
source "$ROOT/scripts/supabase/_resolve_project_ref.sh"
resolve_project_ref "$@" || exit 1

if [[ "$REF" == "jcnzjigxgkzhjsaekoqz" ]]; then
  echo "Refusing PROD deploy for Phase 1c. Pass DEV ref only." >&2
  exit 1
fi

echo "Deploying owner-tenant-read to project_ref length=${#REF} (JWT verify ON)…"
supabase functions deploy owner-tenant-read --project-ref "$REF"
echo "Deploy finished."
echo "Running DEV smoke…"
node "$ROOT/scripts/supabase/smoke-owner-tenant-read-dev.mjs"
