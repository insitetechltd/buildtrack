#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd -P)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." >/dev/null 2>&1 && pwd -P)"
cd "$ROOT_DIR"

VALIDATE_LOCAL_STRICT_DIRTY_TREE=1 bash "$ROOT_DIR/scripts/validation/validate-local.sh"
