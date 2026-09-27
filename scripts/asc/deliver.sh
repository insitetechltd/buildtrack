#!/usr/bin/env bash
# ASC listing automation via Fastlane Deliver.
#
# Usage:
#   bash scripts/asc/deliver.sh paste              # metadata + screenshots (default build 279)
#   bash scripts/asc/deliver.sh paste --dry-run    # validate only
#   ASC_SUBMIT=1 bash scripts/asc/deliver.sh submit
#   ASC_SUBMIT=1 bash scripts/asc/deliver.sh all   # paste then submitForReview
#
# Env:
#   ASC_BUILD_NUMBER   default 279
#   ASC_APP_VERSION    default 1.1.3
#   ASC_SKIP_SCREENSHOTS=1
#   ASC_SUBMIT=1       required for submit / all→submit
#   EXPO_ASC_*         optional overrides (else eas.json / default key path)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

MODE="${1:-paste}"
shift || true
DRY_RUN=0
for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=1 ;;
    --skip-screenshots) export ASC_SKIP_SCREENSHOTS=1 ;;
  esac
done

# Load Apple env (no echo of secrets)
if [[ -f "$ROOT/.env" ]]; then
  # shellcheck disable=SC1091
  set -a
  # Only EXPO_APPLE / EXPO_ASC lines
  eval "$(grep -E '^EXPO_(APPLE|ASC)_' "$ROOT/.env" | sed 's/^/export /' || true)"
  set +a
fi

# Mirror eas.json submit.production.ios when unset
if [[ -z "${EXPO_ASC_API_KEY_PATH:-}" && -f "$ROOT/eas.json" ]]; then
  eval "$(python3 - <<'PY'
import json
from pathlib import Path
ios = json.loads(Path("eas.json").read_text()).get("submit", {}).get("production", {}).get("ios", {})
key_path = ios.get("ascApiKeyPath")
if key_path:
    p = Path(key_path).expanduser().resolve()
    print(f'export EXPO_ASC_API_KEY_PATH={json.dumps(str(p))}')
    print(f'export EXPO_ASC_KEY_ID={json.dumps(ios.get("ascApiKeyId") or "")}')
    print(f'export EXPO_ASC_ISSUER_ID={json.dumps(ios.get("ascApiKeyIssuerId") or "")}')
PY
)"
fi

export EXPO_APPLE_TEAM_TYPE="${EXPO_APPLE_TEAM_TYPE:-COMPANY_OR_ORGANIZATION}"
export ASC_BUILD_NUMBER="${ASC_BUILD_NUMBER:-279}"
export ASC_APP_VERSION="${ASC_APP_VERSION:-1.1.3}"
export ASC_SCREENSHOTS_PATH="${ASC_SCREENSHOTS_PATH:-$ROOT/.cache/asc-deliver/screenshots}"

if ! command -v fastlane >/dev/null 2>&1; then
  echo "fastlane not found — brew install fastlane (or bundle install)" >&2
  exit 127
fi

if [[ ! -f "${EXPO_ASC_API_KEY_PATH:-}" ]]; then
  echo "ASC API key .p8 missing (EXPO_ASC_API_KEY_PATH)" >&2
  exit 1
fi

case "$MODE" in
  paste|all)
    if [[ "${ASC_SKIP_SCREENSHOTS:-0}" != "1" ]]; then
      bash "$ROOT/scripts/asc/prepare-screenshots.sh"
    fi
    ;;
esac

run_lane() {
  local lane="$1"
  if [[ "$DRY_RUN" == "1" ]]; then
    echo "[dry-run] would run: fastlane ios $lane (build=$ASC_BUILD_NUMBER version=$ASC_APP_VERSION)"
    echo "[dry-run] key id: ${EXPO_ASC_KEY_ID:-?}  skip_screenshots=${ASC_SKIP_SCREENSHOTS:-0}"
    echo "[dry-run] key path exists: $([[ -f "$EXPO_ASC_API_KEY_PATH" ]] && echo yes || echo NO)"
    echo "[dry-run] metadata tree:"
    find fastlane/metadata fastlane/review_information -type f 2>/dev/null | sort
    if [[ "${ASC_SKIP_SCREENSHOTS:-0}" != "1" ]]; then
      echo "[dry-run] staged screenshots:"
      find "$ASC_SCREENSHOTS_PATH" -type f 2>/dev/null | sort || echo "(none — run prepare)"
    fi
    FASTLANE_SKIP_UPDATE_CHECK=1 fastlane ios asc_auth_probe
    exit 0
  fi
  FASTLANE_SKIP_UPDATE_CHECK=1 fastlane ios "$lane"
}

case "$MODE" in
  paste)
    run_lane asc_paste
    ;;
  submit)
    export ASC_SUBMIT="${ASC_SUBMIT:-1}"
    run_lane asc_submit
    ;;
  all)
    run_lane asc_deliver
    ;;
  *)
    echo "Usage: $0 {paste|submit|all} [--dry-run] [--skip-screenshots]" >&2
    exit 2
    ;;
esac
