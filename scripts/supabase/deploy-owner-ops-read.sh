#!/usr/bin/env bash
# Deploy owner-ops-read Edge (JWT verified — default). READ-ONLY — no DDL.
# DEV:  bash scripts/supabase/deploy-owner-ops-read.sh --project-ref zusulknbhaumougqckec
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
# shellcheck disable=SC1091
source "$ROOT/scripts/supabase/_resolve_project_ref.sh"
resolve_project_ref "$@" || exit 1

if [[ "$REF" == "jcnzjigxgkzhjsaekoqz" ]]; then
  echo "Refusing PROD deploy. Pass DEV ref only." >&2
  exit 1
fi

echo "Deploying owner-ops-read to project_ref length=${#REF} (JWT verify ON)…"
supabase functions deploy owner-ops-read --project-ref "$REF"
echo "Deploy finished."
node "$ROOT/scripts/supabase/smoke-owner-ops-read-dev.mjs"
