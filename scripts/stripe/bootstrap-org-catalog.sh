#!/usr/bin/env bash
# Create Taskr org SKUs + Growth Payment Link (30-day trial).
# Reads STRIPE_SECRET_KEY from .env. Does not print secrets.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
python3 scripts/stripe/bootstrap-org-catalog.py
