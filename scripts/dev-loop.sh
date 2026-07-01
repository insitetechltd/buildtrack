#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"

if [ "${1:-}" = "--push" ]; then
  shift
  exec bash "$ROOT_DIR/scripts/validation/push-validated.sh" "$@"
fi

if [ "${1:-}" = "--no-push" ]; then
  shift
fi

exec bash "$ROOT_DIR/scripts/validation/validate-local.sh" "$@"
