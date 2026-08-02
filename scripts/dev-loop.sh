#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"
VALIDATE_LOCAL_RUN_JOURNEYS="${VALIDATE_LOCAL_RUN_JOURNEYS:-0}"
VALIDATE_LOCAL_RUN_MAESTRO_SMOKE="${VALIDATE_LOCAL_RUN_MAESTRO_SMOKE:-0}"

if [ "${1:-}" = "--confidence" ]; then
  VALIDATE_LOCAL_RUN_JOURNEYS=1
  shift
fi

if [ "${1:-}" = "--confidence-full" ]; then
  VALIDATE_LOCAL_RUN_JOURNEYS=1
  VALIDATE_LOCAL_RUN_MAESTRO_SMOKE=1
  shift
fi

if [ "${1:-}" = "--push" ]; then
  shift
  exec env \
    VALIDATE_LOCAL_RUN_JOURNEYS="$VALIDATE_LOCAL_RUN_JOURNEYS" \
    VALIDATE_LOCAL_RUN_MAESTRO_SMOKE="$VALIDATE_LOCAL_RUN_MAESTRO_SMOKE" \
    bash "$ROOT_DIR/scripts/validation/push-validated.sh" "$@"
fi

if [ "${1:-}" = "--no-push" ]; then
  shift
fi

exec env \
  VALIDATE_LOCAL_RUN_JOURNEYS="$VALIDATE_LOCAL_RUN_JOURNEYS" \
  VALIDATE_LOCAL_RUN_MAESTRO_SMOKE="$VALIDATE_LOCAL_RUN_MAESTRO_SMOKE" \
  bash "$ROOT_DIR/scripts/validation/validate-local.sh" "$@"
