#!/usr/bin/env bash
# Point plan_prices.stripe_price_id at live Stripe lookup keys (after bootstrap-org-catalog).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
python3 scripts/stripe/sync-plan-prices-to-db.py
