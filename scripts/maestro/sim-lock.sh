#!/usr/bin/env bash
#
# Simulator UDID lock — avoid Maestro / multi-chat collisions on one machine.
#
# Usage:
#   bash scripts/maestro/sim-lock.sh status
#   bash scripts/maestro/sim-lock.sh claim <UDID> [--purpose NAME] [--owner LABEL]
#   bash scripts/maestro/sim-lock.sh claim-pair --assigner UDID --assignee UDID [--purpose NAME]
#   bash scripts/maestro/sim-lock.sh release <UDID>
#   bash scripts/maestro/sim-lock.sh release-all [--owner LABEL]
#
# Lock dir: .cache/sim-locks/<UDID>.lock (gitignored). Stale locks (dead owner pid)
# are reclaimed automatically.
#
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
LOCK_DIR="${SIM_LOCK_DIR:-$ROOT/.cache/sim-locks}"
OWNER="${SIM_LOCK_OWNER:-${CURSOR_AGENT_ID:-${CURSOR_CHAT_ID:-}}}"
if [[ -z "${OWNER}" ]]; then
  OWNER="$(whoami)@$(hostname -s 2>/dev/null || hostname)"
fi

mkdir -p "${LOCK_DIR}"

now_iso() { date -u '+%Y-%m-%dT%H:%M:%SZ'; }

sim_name() {
  local udid="$1"
  xcrun simctl list devices 2>/dev/null | grep "${udid}" | sed -E 's/^[[:space:]]*([^(]+)\(.*/\1/' | sed 's/[[:space:]]*$//' | head -1
}

booted_iphone_udids() {
  xcrun simctl list devices booted 2>/dev/null \
    | grep -E 'iPhone' \
    | sed -E 's/.*\(([A-F0-9-]{36})\).*/\1/'
}

maestro_pids_for_udid() {
  local udid="$1"
  pgrep -fl "maestro.*${udid}" 2>/dev/null || true
}

lock_path() {
  echo "${LOCK_DIR}/$1.lock"
}

pid_alive() {
  local pid="$1"
  [[ -n "${pid}" ]] && kill -0 "${pid}" 2>/dev/null
}

read_lock_field() {
  local file="$1" key="$2"
  grep -E "^${key}=" "${file}" 2>/dev/null | head -1 | cut -d= -f2- || true
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
  echo "=== Simulator lock status ==="
  echo "LOCK_DIR=${LOCK_DIR}"
  echo "OWNER (this shell)=${OWNER}"
  echo ""
  echo "Booted iPhones:"
  local any=0
  while IFS= read -r udid; do
    [[ -z "${udid}" ]] && continue
    any=1
    local name locked maestro
    name="$(sim_name "${udid}")"
    locked="FREE"
    if [[ -f "$(lock_path "${udid}")" ]] && ! lock_is_stale "$(lock_path "${udid}")"; then
      locked="LOCKED owner=$(read_lock_field "$(lock_path "${udid}")" OWNER) purpose=$(read_lock_field "$(lock_path "${udid}")" PURPOSE)"
    elif [[ -f "$(lock_path "${udid}")" ]]; then
      locked="STALE (reclaimable)"
    fi
    maestro="$(maestro_pids_for_udid "${udid}")"
    echo "  ${udid}  ${name:-?}  ${locked}"
    if [[ -n "${maestro}" ]]; then
      echo "    maestro: ${maestro}"
    fi
  done < <(booted_iphone_udids)
  if [[ "${any}" -eq 0 ]]; then
    echo "  (none booted)"
  fi
  echo ""
  echo "On-disk locks:"
  local locks=0
  for f in "${LOCK_DIR}"/*.lock; do
    [[ -f "${f}" ]] || continue
    locks=1
    local udid base stale tag
    base="$(basename "${f}" .lock)"
    udid="${base}"
    if lock_is_stale "${f}"; then stale="STALE"; else stale="ACTIVE"; fi
    echo "  ${udid}  ${stale}  owner=$(read_lock_field "${f}" OWNER)  purpose=$(read_lock_field "${f}" PURPOSE)  at=$(read_lock_field "${f}" CLAIMED_AT)"
  done
  if [[ "${locks}" -eq 0 ]]; then
    echo "  (none)"
  fi
}

claim_one() {
  local udid="$1"
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
  file="$(lock_path "${udid}")"

  if [[ -n "$(maestro_pids_for_udid "${udid}")" ]]; then
    echo "FAIL: maestro already running on UDID ${udid}" >&2
    maestro_pids_for_udid "${udid}" >&2
    return 3
  fi

  if [[ -f "${file}" ]] && ! lock_is_stale "${file}"; then
    local existing_owner existing_purpose
    existing_owner="$(read_lock_field "${file}" OWNER)"
    existing_purpose="$(read_lock_field "${file}" PURPOSE)"
    if [[ "${existing_owner}" == "${owner_arg}" ]]; then
      echo "OK: already locked by this owner (${owner_arg}) purpose=${existing_purpose}"
      return 0
    fi
    echo "FAIL: UDID ${udid} locked by ${existing_owner} purpose=${existing_purpose}" >&2
    echo "      Run: bash scripts/maestro/sim-lock.sh status" >&2
    return 2
  fi

  cat >"${file}" <<EOF
UDID=${udid}
OWNER=${owner_arg}
PURPOSE=${purpose_arg}
CLAIMED_AT=$(now_iso)
PID=$$
OWNER_PID=$$
HOST=$(hostname 2>/dev/null || echo unknown)
SIM_NAME=$(sim_name "${udid}")
EOF
  echo "LOCKED ${udid} ($(sim_name "${udid}")) purpose=${purpose_arg} owner=${owner_arg}"
}

release_one() {
  local udid="$1"
  local file
  file="$(lock_path "${udid}")"
  if [[ ! -f "${file}" ]]; then
    echo "OK: no lock for ${udid}"
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
  echo "RELEASED ${udid}"
}

cmd="${1:-status}"
shift || true

case "${cmd}" in
  status)
    print_status
    ;;
  claim)
    udid="${1:-}"
    [[ -n "${udid}" ]] || { echo "Usage: sim-lock.sh claim <UDID> [--purpose NAME]" >&2; exit 2; }
    shift || true
    # Default PURPOSE=maestro is set inside claim_one; only pass flags through.
    claim_one "${udid}" "$@"
    ;;
  claim-pair)
    assigner="" assignee="" purpose="dual-user-gate"
    while [[ $# -gt 0 ]]; do
      case "$1" in
        --assigner) assigner="$2"; shift 2 ;;
        --assignee) assignee="$2"; shift 2 ;;
        --purpose) purpose="$2"; shift 2 ;;
        *) echo "Unknown arg: $1" >&2; exit 2 ;;
      esac
    done
    [[ -n "${assigner}" && -n "${assignee}" ]] || {
      echo "Usage: sim-lock.sh claim-pair --assigner UDID --assignee UDID [--purpose NAME]" >&2
      exit 2
    }
    if [[ "${assigner}" == "${assignee}" ]]; then
      echo "FAIL: assigner and assignee UDIDs must differ" >&2
      exit 2
    fi
    claim_one "${assigner}" --purpose "${purpose}" --owner "${OWNER}" || exit $?
    claim_one "${assignee}" --purpose "${purpose}" --owner "${OWNER}" || {
      release_one "${assigner}" || true
      exit $?
    }
    echo "PAIR LOCKED assigner=${assigner} assignee=${assignee}"
    ;;
  release)
    udid="${1:-}"
    [[ -n "${udid}" ]] || { echo "Usage: sim-lock.sh release <UDID>" >&2; exit 2; }
    release_one "${udid}"
    ;;
  release-all)
    released=0
    for f in "${LOCK_DIR}"/*.lock; do
      [[ -f "${f}" ]] || continue
      udid="$(basename "${f}" .lock)"
      if release_one "${udid}" 2>/dev/null; then
        released=$((released + 1))
      fi
    done
    echo "Released ${released} lock(s) for owner=${OWNER}"
    ;;
  -h|--help)
    sed -n '2,14p' "$0" | sed 's/^# \{0,1\}//'
    ;;
  *)
    echo "Unknown command: ${cmd}" >&2
    exit 2
    ;;
esac
