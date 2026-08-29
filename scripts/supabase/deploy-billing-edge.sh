#!/usr/bin/env bash
# Deploy all billing Edge Functions.
# Prefer: --project-ref <ref>
# DEV shortcut: --use-env
# PROD one-shot: bash scripts/supabase/deploy-edge-to-project.sh --project-ref jcnzjigxgkzhjsaekoqz
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
# shellcheck disable=SC1091
source "$ROOT/scripts/supabase/_resolve_project_ref.sh"
resolve_project_ref "$@" || exit 1

echo "=== Deploy billing edge → project_ref length=${#REF} ==="
bash "$ROOT/scripts/supabase/deploy-create-checkout-session.sh" --project-ref "$REF"
bash "$ROOT/scripts/supabase/deploy-stripe-webhook.sh" --project-ref "$REF"
bash "$ROOT/scripts/supabase/deploy-invite-user.sh" --project-ref "$REF"
supabase functions deploy update-company-addons --project-ref "$REF"
echo "All billing edge deploys finished for ref length=${#REF}."
echo "Stripe secrets: use sync-stripe-secrets.sh --project-ref $REF (DEV) or omit on PROD until App Store."
