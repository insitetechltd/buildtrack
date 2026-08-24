#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
python3 scripts/stripe/sync-hkd-plan-prices-to-db.py
