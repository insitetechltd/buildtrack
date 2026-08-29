#!/usr/bin/env bash
# Apply numbered supabase/migrations/*.sql to an explicit project (pooler session).
# M-OPS-ENV-01: require --project-ref + --env-file so DEV .env cannot silently target PROD.
#
# Skips: DRAFT_*, *ROLLBACK*, and dormant 20260825000600_projects_drop_on_hold.sql
#   (reserved on_hold CHECK slot — do not apply without separate product GO).
#
# Usage:
#   bash scripts/supabase/apply-migrations-to-project.sh \
#     --project-ref jcnzjigxgkzhjsaekoqz \
#     --env-file .cache/env-cutover/insite-prod.env.local
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
export PATH="/opt/homebrew/opt/libpq/bin:${PATH}"

REF=""
ENV_FILE=""
POOLER_HOST="${GREENFIELD_POOLER_HOST:-aws-0-ap-south-1.pooler.supabase.com}"
DRY_RUN=0
FROM_BASENAME=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --project-ref)
      REF="${2:-}"; shift 2 ;;
    --env-file)
      ENV_FILE="${2:-}"; shift 2 ;;
    --pooler-host)
      POOLER_HOST="${2:-}"; shift 2 ;;
    --from)
      FROM_BASENAME="${2:-}"; shift 2 ;;
    --dry-run)
      DRY_RUN=1; shift ;;
    -h|--help)
      sed -n '1,25p' "$0"; exit 0 ;;
    *)
      echo "Unknown arg: $1" >&2; exit 1 ;;
  esac
done

if [[ -z "$REF" || -z "$ENV_FILE" ]]; then
  echo "Required: --project-ref <ref> --env-file <path>" >&2
  exit 1
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Env file not found: $ENV_FILE" >&2
  exit 1
fi

# Refuse known DEV ref when operator thought they were on PROD naming only
if [[ "$REF" == "zusulknbhaumougqckec" ]]; then
  echo "Refusing DEV project ref zusulknbhaumougqckec. Pass PROD ref explicitly." >&2
  exit 1
fi

# Load env file (KEY=VALUE lines)
set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

DB_PASSWORD="${SUPABASE_DB_PASSWORD:-${PARITY_DB_PASSWORD:-${GREENFIELD_DB_PASSWORD:-}}}"
FILE_REF="${SUPABASE_PROJECT_REF:-}"
FILE_URL="${EXPO_PUBLIC_SUPABASE_URL:-}"

if [[ -z "$DB_PASSWORD" ]]; then
  echo "Missing SUPABASE_DB_PASSWORD in $ENV_FILE" >&2
  exit 1
fi

if [[ -n "$FILE_REF" && "$FILE_REF" != "$REF" ]]; then
  echo "Env file SUPABASE_PROJECT_REF=$FILE_REF != --project-ref $REF" >&2
  exit 1
fi

if [[ -n "$FILE_URL" && "$FILE_URL" != *"$REF"* ]]; then
  echo "Env file EXPO_PUBLIC_SUPABASE_URL does not contain --project-ref $REF" >&2
  exit 1
fi

urlencode() {
  python3 -c 'import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1], safe=""))' "$1"
}

USER_ENC="$(urlencode "postgres.${REF}")"
PASS_ENC="$(urlencode "$DB_PASSWORD")"
DB_URL="postgresql://${USER_ENC}:${PASS_ENC}@${POOLER_HOST}:5432/postgres"

SKIP_BASENAMES=(
  "DRAFT_mbill01_entitlements.sql"
  "20260808000301_msupabase03b_ROLLBACK.sql"
  "20260808110001_sux01n_project_containers_ROLLBACK.sql"
  "20260825000600_projects_drop_on_hold.sql"
)

should_skip() {
  local base="$1"
  local s
  for s in "${SKIP_BASENAMES[@]}"; do
    if [[ "$base" == "$s" ]]; then
      return 0
    fi
  done
  if [[ "$base" == DRAFT_* ]]; then
    return 0
  fi
  if [[ "$base" == *ROLLBACK* ]]; then
    return 0
  fi
  return 1
}

shopt -s nullglob
migrations=( "$ROOT"/supabase/migrations/*.sql )
if [[ ${#migrations[@]} -eq 0 ]]; then
  echo "No migrations under supabase/migrations/" >&2
  exit 1
fi

echo "==> Target project_ref=$REF"
echo "==> Pooler=$POOLER_HOST"
echo "==> Env file=$ENV_FILE"
if [[ -n "$FROM_BASENAME" ]]; then
  echo "==> Resume from=$FROM_BASENAME"
fi

if [[ "$DRY_RUN" == "1" ]]; then
  for file in "${migrations[@]}"; do
    base="$(basename "$file")"
    if should_skip "$base"; then
      echo "  SKIP $base"
    else
      echo "  APPLY $base"
    fi
  done
  exit 0
fi

echo "==> Smoke-test DB auth"
psql "$DB_URL" -v ON_ERROR_STOP=1 -c "select current_database(), current_user, inet_server_addr();" >/dev/null

LOG_DIR="$ROOT/.cache/env-cutover"
mkdir -p "$LOG_DIR"
APPLY_LOG="$LOG_DIR/phase-b-migrations-$(date +%Y%m%d_%H%M%S).log"

applied=0
skipped=0
started=0
if [[ -z "$FROM_BASENAME" ]]; then
  started=1
fi
for file in "${migrations[@]}"; do
  base="$(basename "$file")"
  if [[ "$started" -eq 0 ]]; then
    if [[ "$base" == "$FROM_BASENAME" ]]; then
      started=1
    else
      echo "  BEFORE $base (resume skip)" | tee -a "$APPLY_LOG"
      continue
    fi
  fi
  if should_skip "$base"; then
    echo "  SKIP $base" | tee -a "$APPLY_LOG"
    skipped=$((skipped + 1))
    continue
  fi
  echo "  APPLY $base" | tee -a "$APPLY_LOG"
  if ! psql "$DB_URL" -v ON_ERROR_STOP=1 -f "$file" >>"$APPLY_LOG" 2>&1; then
    echo "FAILED on $base — see $APPLY_LOG" >&2
    exit 1
  fi
  applied=$((applied + 1))
done

echo "==> Verify core tables"
psql "$DB_URL" -v ON_ERROR_STOP=1 -c "\dt public.*" | tee -a "$APPLY_LOG"

echo "Done. applied=$applied skipped=$skipped log=$APPLY_LOG"
