#!/usr/bin/env bash
# Deploy owner-kpi-snapshot Edge (JWT verified — default).
# DEV:  bash scripts/supabase/deploy-owner-kpi-snapshot.sh --project-ref zusulknbhaumougqckec
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
# shellcheck disable=SC1091
source "$ROOT/scripts/supabase/_resolve_project_ref.sh"
resolve_project_ref "$@" || exit 1

if [[ "$REF" == "jcnzjigxgkzhjsaekoqz" ]]; then
  echo "Refusing PROD deploy for Phase 1b. Pass DEV ref only." >&2
  exit 1
fi

echo "Deploying owner-kpi-snapshot to project_ref length=${#REF} (JWT verify ON)…"
supabase functions deploy owner-kpi-snapshot --project-ref "$REF"
echo "Deploy finished."
