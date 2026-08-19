#!/usr/bin/env bash
#
# Generic Maestro resource lock — coordinates shared users, projects, task/title
# namespaces, and single-writer helpers across chats on one machine.
#
# Usage:
#   bash scripts/maestro/resource-lock.sh status
#   bash scripts/maestro/resource-lock.sh claim <resource>... [--purpose NAME] [--owner LABEL]
#   bash scripts/maestro/resource-lock.sh release <resource>...
#   bash scripts/maestro/resource-lock.sh release-all [--owner LABEL]
#
# Resource examples:
#   user:john.managera
#   project:project-a
#   task:123e4567
#   title-prefix:DU-H01
#   seed:update-progress
#   photos:force-purge
#
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
LOCK_DIR="${MAESTRO_RESOURCE_LOCK_DIR:-$ROOT/.cache/maestro-resource-locks}"
OWNER="${MAESTRO_RESOURCE_LOCK_OWNER:-${SIM_LOCK_OWNER:-${CURSOR_AGENT_ID:-${CURSOR_CHAT_ID:-}}}}"
if [[ -z "${OWNER}" ]]; then
  OWNER="$(whoami)@$(hostname -s 2>/dev/null || hostname)"
fi

mkdir -p "${LOCK_DIR}"

now_iso() { date -u '+%Y-%m-%dT%H:%M:%SZ'; }

sanitize_segment() {
  printf '%s' "$1" | tr '/ ' '__' | tr -cd 'A-Za-z0-9:._@=-'
}

resource_kind() {
  local resource="$1"
  printf '%s' "${resource%%:*}"
}

resource_name() {
  local resource="$1"
  if [[ "$resource" == *:* ]]; then
    printf '%s' "${resource#*:}"
  else
    printf '%s' "$resource"
  fi
}

lock_path() {
  local resource="$1"
  local kind name
  kind="$(sanitize_segment "$(resource_kind "$resource")")"
  name="$(sanitize_segment "$(resource_name "$resource")")"
  mkdir -p "${LOCK_DIR}/${kind}"
  printf '%s/%s/%s.lock' "${LOCK_DIR}" "${kind}" "${name}"
}

pid_alive() {
  local pid="$1"
  [[ -n "${pid}" ]] && kill -0 "${pid}" 2>/dev/null
}

read_lock_field() {
  local file="$1" key="$2"
  rg "^${key}=" "$file" -N --no-heading 2>/dev/null | awk -F= 'NR==1 { sub(/^[^=]*=/, ""); print }' || true
}

lock_is_stale() {
  local file="$1"
  [[ ! -f "${file}" ]] && return 0
  local lock_pid owner_pid
  lock_pid="$(read_lock_field "${file}" PID)"
  owner_pid="$(read_lock_field "${file}" OWNER_PID)"
  if [[ -n "${lock_pid}" ]] && pid_alive "${lock_pid}"; then
    return 1
  fi
  if [[ -n "${owner_pid}" ]] && pid_alive "${owner_pid}"; then
    return 1
  fi
  return 0
}

print_status() {
  echo "=== Maestro resource lock status ==="
  echo "LOCK_DIR=${LOCK_DIR}"
  echo "OWNER (this shell)=${OWNER}"
  echo ""
  echo "Active resource locks:"
  local any=0
  while IFS= read -r file; do
    [[ -f "${file}" ]] || continue
    any=1
    local stale resource owner purpose claimed
    resource="$(read_lock_field "${file}" RESOURCE)"
    owner="$(read_lock_field "${file}" OWNER)"
    purpose="$(read_lock_field "${file}" PURPOSE)"
    claimed="$(read_lock_field "${file}" CLAIMED_AT)"
    if lock_is_stale "${file}"; then stale="STALE"; else stale="ACTIVE"; fi
    echo "  ${resource:-?}  ${stale}  owner=${owner}  purpose=${purpose}  at=${claimed}"
  done < <(rg --files "${LOCK_DIR}" -g '*.lock' | sort)
  if [[ "${any}" -eq 0 ]]; then
    echo "  (none)"
  fi
}

claim_one() {
  local resource="$1"
  shift
  local purpose_arg="maestro"
  local owner_arg="${OWNER}"

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --purpose) purpose_arg="$2"; shift 2 ;;
      --owner) owner_arg="$2"; shift 2 ;;
      *) echo "Unknown claim arg: $1" >&2; return 2 ;;
    esac
  done

  local file
  file="$(lock_path "${resource}")"

  if [[ -f "${file}" ]] && ! lock_is_stale "${file}"; then
    local existing_owner existing_purpose
    existing_owner="$(read_lock_field "${file}" OWNER)"
    existing_purpose="$(read_lock_field "${file}" PURPOSE)"
    if [[ "${existing_owner}" == "${owner_arg}" ]]; then
      echo "OK: already locked by this owner (${owner_arg}) resource=${resource} purpose=${existing_purpose}"
      return 0
    fi
    echo "FAIL: resource ${resource} locked by ${existing_owner} purpose=${existing_purpose}" >&2
    echo "      Run: bash scripts/maestro/resource-lock.sh status" >&2
    return 2
  fi

  cat >"${file}" <<EOF
RESOURCE=${resource}
OWNER=${owner_arg}
PURPOSE=${purpose_arg}
CLAIMED_AT=$(now_iso)
PID=$$
OWNER_PID=$$
HOST=$(hostname 2>/dev/null || echo unknown)
EOF
  echo "LOCKED ${resource} purpose=${purpose_arg} owner=${owner_arg}"
}

release_one() {
  local resource="$1"
  local file
  file="$(lock_path "${resource}")"
  if [[ ! -f "${file}" ]]; then
    echo "OK: no lock for ${resource}"
    return 0
  fi
  if ! lock_is_stale "${file}"; then
    local existing_owner
    existing_owner="$(read_lock_field "${file}" OWNER)"
    if [[ "${existing_owner}" != "${OWNER}" ]]; then
      echo "FAIL: lock owned by ${existing_owner}, not ${OWNER}" >&2
      return 2
    fi
  fi
  rm -f "${file}"
  echo "RELEASED ${resource}"
}

cmd="${1:-status}"
shift || true

case "${cmd}" in
  status)
    print_status
    ;;
  claim)
    resources=()
    purpose="maestro"
    owner_arg="${OWNER}"
    while [[ $# -gt 0 ]]; do
      case "$1" in
        --purpose) purpose="$2"; shift 2 ;;
        --owner) owner_arg="$2"; shift 2 ;;
        *) resources+=("$1"); shift ;;
      esac
    done
    [[ "${#resources[@]}" -gt 0 ]] || { echo "Usage: resource-lock.sh claim <resource>... [--purpose NAME]" >&2; exit 2; }
    claimed=()
    for resource in "${resources[@]}"; do
      if ! claim_one "${resource}" --purpose "${purpose}" --owner "${owner_arg}"; then
        for rollback in "${claimed[@]}"; do
          release_one "${rollback}" >/dev/null 2>&1 || true
        done
        exit 2
      fi
      claimed+=("${resource}")
    done
    ;;
  release)
    [[ "$#" -gt 0 ]] || { echo "Usage: resource-lock.sh release <resource>..." >&2; exit 2; }
    for resource in "$@"; do
      release_one "${resource}"
    done
    ;;
  release-all)
    owner_arg="${OWNER}"
    while [[ $# -gt 0 ]]; do
      case "$1" in
        --owner) owner_arg="$2"; shift 2 ;;
        *) echo "Unknown arg: $1" >&2; exit 2 ;;
      esac
    done
    released=0
    while IFS= read -r file; do
      [[ -f "${file}" ]] || continue
      existing_owner="$(read_lock_field "${file}" OWNER)"
      resource="$(read_lock_field "${file}" RESOURCE)"
      if [[ "${existing_owner}" == "${owner_arg}" ]]; then
        rm -f "${file}"
        echo "RELEASED ${resource}"
        released=$((released + 1))
      fi
    done < <(rg --files "${LOCK_DIR}" -g '*.lock' | sort)
    echo "Released ${released} resource lock(s) for owner=${owner_arg}"
    ;;
  -h|--help)
    sed -n '2,17p' "$0" | sed 's/^# \{0,1\}//'
    ;;
  *)
    echo "Unknown command: ${cmd}" >&2
    exit 2
    ;;
esac
