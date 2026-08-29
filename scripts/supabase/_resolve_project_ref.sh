#!/usr/bin/env bash
# Resolve Supabase project ref. Prefer explicit --project-ref; never guess PROD from silence.
# Usage (source):  source scripts/supabase/_resolve_project_ref.sh
#   resolve_project_ref "$@"   → sets REF; consumes --project-ref / --use-env
#
# --project-ref <ref>   required for PROD deploys
# --use-env             allow reading EXPO_PUBLIC_SUPABASE_URL from .env (DEV only path)
resolve_project_ref() {
  REF=""
  USE_ENV=0
  local _args=()
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --project-ref)
        REF="${2:-}"; shift 2 ;;
      --use-env)
        USE_ENV=1; shift ;;
      *)
        _args+=("$1"); shift ;;
    esac
  done
  # shellcheck disable=SC2086
  set -- "${_args[@]+"${_args[@]}"}"

  if [[ -n "$REF" ]]; then
    return 0
  fi

  if [[ "$USE_ENV" != "1" ]]; then
    echo "Required: --project-ref <ref>   (or --use-env for DEV .env only)" >&2
    echo "  DEV:  zusulknbhaumougqckec (insite-dev)" >&2
    echo "  PROD: jcnzjigxgkzhjsaekoqz (insite-prod)" >&2
    return 1
  fi

  if [[ ! -f .env ]]; then
    echo "Missing .env (needed for --use-env)" >&2
    return 1
  fi

  REF="$(python3 - <<'PY'
from pathlib import Path
from urllib.parse import urlparse
env = {}
for line in Path('.env').read_text().splitlines():
    s = line.strip()
    if not s or s.startswith('#') or '=' not in s:
        continue
    k, v = s.split('=', 1)
    env[k.strip()] = v.strip().strip('"').strip("'")
url = env.get('EXPO_PUBLIC_SUPABASE_URL', '')
host = urlparse(url).hostname or ''
if not host.endswith('supabase.co'):
    raise SystemExit('EXPO_PUBLIC_SUPABASE_URL is not a *.supabase.co host')
print(host.split('.')[0])
PY
)" || return 1

  if [[ "$REF" == "jcnzjigxgkzhjsaekoqz" ]]; then
    echo "Refusing --use-env while .env points at PROD. Pass --project-ref explicitly." >&2
    return 1
  fi

  echo "Using DEV ref from .env (length=${#REF})"
  return 0
}
