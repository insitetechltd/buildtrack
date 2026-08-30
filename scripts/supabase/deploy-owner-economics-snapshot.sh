#!/usr/bin/env bash
# Deploy owner-economics-snapshot Edge (JWT verified — default).
# DEV:  bash scripts/supabase/deploy-owner-economics-snapshot.sh --project-ref zusulknbhaumougqckec
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

echo "Deploying owner-economics-snapshot to project_ref length=${#REF} (JWT verify ON)…"
supabase functions deploy owner-economics-snapshot --project-ref "$REF"
echo "Deploy finished."
node "$ROOT/scripts/supabase/smoke-owner-economics-dev.mjs"
