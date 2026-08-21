#!/usr/bin/env bash
#
# Fully automated dual-user Maestro release gate (zero manual input).
#
# Two distinct simulators: John (assigner) + Alice (assignee). Phased conductor —
# Maestro cannot drive both devices in one flow, so this script orchestrates phases,
# generates unique task titles, ensures Photos, validates screenshot counts, and
# retries sync-sensitive phases automatically.
#
# Usage:
#   npm run test:e2e:maestro:dual-user
#   ONLY=H01 npm run test:e2e:maestro:dual-user
#   ONLY=D01 npm run test:e2e:maestro:dual-user
#
# Optional env:
#   MAESTRO_UDID_ASSIGNER  — John sim UDID (auto-picked from booted iPhones if unset)
#   MAESTRO_UDID_ASSIGNEE  — Alice sim UDID
#   DU_SYNC_RETRIES        — retries for assignee/assigner sync phases (default 3)
#   DRIVER_RETRY_MAX       — XCTest transport retries per phase (default 1)
#
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
FLOW_DIR="${ROOT}/maestro/flows/dual-user"
WRAPPER="${ROOT}/scripts/maestro/run-local.sh"
ENSURE="${ROOT}/scripts/maestro/ensure-create-task-photo-media.sh"
ENSURE_DU_DATA="${ROOT}/scripts/maestro/ensure-dual-user-project-data.cjs"
RESOLVE_TASK="${ROOT}/scripts/maestro/resolve-dual-user-task-id.cjs"
SIM_LOCK="${ROOT}/scripts/maestro/sim-lock.sh"
RESOURCE_LOCK="${ROOT}/scripts/maestro/resource-lock.sh"
DU_TASK_ENV="${ROOT}/.cache/maestro-du-task.env"
MAESTRO_HOME="${MAESTRO_LOCAL_HOME:-$ROOT/.cache/maestro-home-dual-user}"
export MAESTRO_LOCAL_HOME="${MAESTRO_HOME}"
ONLY="${ONLY:-ALL}"
DU_SYNC_RETRIES="${DU_SYNC_RETRIES:-1}"
DRIVER_RETRY_MAX="${DRIVER_RETRY_MAX:-1}"
STOP_ON_FAIL=1
ARTIFACT_DIR="${ARTIFACT_DIR:-$ROOT/.cache/maestro-artifacts/dual-user-$(date +%Y%m%d_%H%M%S)}"

export MAESTRO_DRIVER_STARTUP_TIMEOUT="${MAESTRO_DRIVER_STARTUP_TIMEOUT:-90000}"
export MAESTRO_0CLICK_DISABLE=1
export MAESTRO_LOCAL_HOME="${MAESTRO_HOME}"

NOW_FMT() { date '+%H:%M:%S'; }
log() { printf '[%s dual-user]%s\n' "$(NOW_FMT)" "$*"; }
die() { log "FATAL: $*"; exit 1; }

pick_booted_iphone_udids() {
  xcrun simctl list devices booted 2>/dev/null \
    | grep -E 'iPhone' \
    | sed -E 's/.*\(([A-F0-9-]{36})\).*/\1/' \
    | head -2
}

# Insite default pair when booted (17 Pro Max = assigner, iPhone 16 = assignee).
# Avoid stealing iPhone 17 Pro when another chat is headed there.
PREFERRED_ASSIGNER="${MAESTRO_UDID_ASSIGNER_DEFAULT:-B7B2640C-4738-4F8A-AEEE-5DF3D21D2533}"
PREFERRED_ASSIGNEE="${MAESTRO_UDID_ASSIGNEE_DEFAULT:-F537DDA8-E83B-4A29-AF38-ACC8EC64F0DA}"
AVOID_UDID="${MAESTRO_UDID_AVOID:-702680D5-A92E-4C56-BE55-731D424FE63A}"

is_booted() {
  xcrun simctl list devices booted 2>/dev/null | grep -q "$1"
}

is_locked_by_other() {
  local udid="$1"
  local file="${ROOT}/.cache/sim-locks/${udid}.lock"
  [[ -f "${file}" ]] || return 1
  bash "${SIM_LOCK}" status >/dev/null 2>&1 || true
  # rely on claim to fail; quick grep for ACTIVE lock not ours
  if grep -q "^UDID=${udid}$" "${file}" 2>/dev/null; then
    local owner
    owner="$(grep '^OWNER=' "${file}" | cut -d= -f2-)"
    if [[ -n "${SIM_LOCK_OWNER:-}" && "${owner}" == "${SIM_LOCK_OWNER}" ]]; then
      return 1
    fi
    if grep -q '^PID=' "${file}" 2>/dev/null; then
      local pid
      pid="$(grep '^PID=' "${file}" | cut -d= -f2-)"
      if [[ -n "${pid}" ]] && kill -0 "${pid}" 2>/dev/null; then
        return 0
      fi
    fi
  fi
  return 1
}

resolve_udids() {
  local picked=()
  while IFS= read -r line; do
    [[ -n "$line" ]] && picked+=("$line")
  done < <(pick_booted_iphone_udids)

  if [[ -z "${MAESTRO_UDID_ASSIGNER:-}" ]]; then
    if is_booted "${PREFERRED_ASSIGNER}" && ! is_locked_by_other "${PREFERRED_ASSIGNER}" \
      && [[ "${PREFERRED_ASSIGNER}" != "${AVOID_UDID}" ]]; then
      MAESTRO_UDID_ASSIGNER="${PREFERRED_ASSIGNER}"
      log "Preferred MAESTRO_UDID_ASSIGNER=${MAESTRO_UDID_ASSIGNER} (17 Pro Max)"
    elif [[ ${#picked[@]} -ge 1 ]]; then
      MAESTRO_UDID_ASSIGNER="${picked[0]}"
      log "Auto-picked MAESTRO_UDID_ASSIGNER=${MAESTRO_UDID_ASSIGNER}"
    else
      MAESTRO_UDID_ASSIGNER="${PREFERRED_ASSIGNER}"
      log "Default MAESTRO_UDID_ASSIGNER=${MAESTRO_UDID_ASSIGNER} (boot sim if missing)"
    fi
  fi

  if [[ -z "${MAESTRO_UDID_ASSIGNEE:-}" ]]; then
    if is_booted "${PREFERRED_ASSIGNEE}" && ! is_locked_by_other "${PREFERRED_ASSIGNEE}" \
      && [[ "${PREFERRED_ASSIGNEE}" != "${MAESTRO_UDID_ASSIGNER}" ]]; then
      MAESTRO_UDID_ASSIGNEE="${PREFERRED_ASSIGNEE}"
      log "Preferred MAESTRO_UDID_ASSIGNEE=${MAESTRO_UDID_ASSIGNEE} (iPhone 16)"
    elif [[ ${#picked[@]} -ge 2 && "${picked[1]}" != "${MAESTRO_UDID_ASSIGNER}" ]]; then
      MAESTRO_UDID_ASSIGNEE="${picked[1]}"
      log "Auto-picked MAESTRO_UDID_ASSIGNEE=${MAESTRO_UDID_ASSIGNEE}"
    elif [[ ${#picked[@]} -ge 1 && "${picked[0]}" != "${MAESTRO_UDID_ASSIGNER}" ]]; then
      MAESTRO_UDID_ASSIGNEE="${picked[0]}"
      log "Auto-picked MAESTRO_UDID_ASSIGNEE=${MAESTRO_UDID_ASSIGNEE}"
    else
      MAESTRO_UDID_ASSIGNEE="${PREFERRED_ASSIGNEE}"
      log "Default MAESTRO_UDID_ASSIGNEE=${MAESTRO_UDID_ASSIGNEE} (boot sim if missing)"
    fi
  fi

  if [[ "${MAESTRO_UDID_ASSIGNER}" == "${MAESTRO_UDID_ASSIGNEE}" ]]; then
    die "Assigner and assignee UDIDs must differ (got ${MAESTRO_UDID_ASSIGNER}). Boot two sims or set MAESTRO_UDID_ASSIGNER / MAESTRO_UDID_ASSIGNEE."
  fi
  if [[ "${MAESTRO_UDID_ASSIGNER}" == "${AVOID_UDID}" || "${MAESTRO_UDID_ASSIGNEE}" == "${AVOID_UDID}" ]]; then
    die "UDID ${AVOID_UDID} (iPhone 17 Pro) is reserved for other headed work — use 17 Pro Max + iPhone 16 or set MAESTRO_UDID_* explicitly."
  fi
}

coordination_preflight() {
  log "=== Sim coordination preflight ==="
  bash "${SIM_LOCK}" status || true
  log "Claiming sim pair (fail if another chat/session holds lock or maestro is running)"
  bash "${SIM_LOCK}" claim-pair \
    --assigner "${MAESTRO_UDID_ASSIGNER}" \
    --assignee "${MAESTRO_UDID_ASSIGNEE}" \
    --purpose "dual-user-gate-${ONLY}"
  log "Claiming shared users + project + seed namespace"
  bash "${RESOURCE_LOCK}" claim \
    "user:john.managera" \
    "user:alice.workera1" \
    "project:project-a" \
    "seed:dual-user" \
    --purpose "dual-user-gate-${ONLY}"
}

release_sim_locks() {
  bash "${RESOURCE_LOCK}" release-all 2>/dev/null || true
  bash "${SIM_LOCK}" release-all 2>/dev/null || true
}

# M-DATA-04: close Realtime on both sims before dropping locks / ending the suite.
# Ordinary boots are no-clear resume; teardown logout still required so sockets hang up.
logout_both_sims() {
  mkdir -p "${ARTIFACT_DIR}"
  local logout_flow="${ROOT}/maestro/flows/_logout.yaml"
  [[ -f "${logout_flow}" ]] || return 0
  set +e
  if [[ -n "${MAESTRO_UDID_ASSIGNER:-}" ]]; then
    log "Teardown logout John UDID=${MAESTRO_UDID_ASSIGNER:0:8}…"
    bash "${WRAPPER}" --udid "${MAESTRO_UDID_ASSIGNER}" test "${logout_flow}" \
      >>"${ARTIFACT_DIR}/teardown-logout-john.log" 2>&1 || true
  fi
  if [[ -n "${MAESTRO_UDID_ASSIGNEE:-}" ]]; then
    log "Teardown logout Alice UDID=${MAESTRO_UDID_ASSIGNEE:0:8}…"
    bash "${WRAPPER}" --udid "${MAESTRO_UDID_ASSIGNEE}" test "${logout_flow}" \
      >>"${ARTIFACT_DIR}/teardown-logout-alice.log" 2>&1 || true
  fi
  set -e
}

dual_user_teardown() {
  logout_both_sims
  release_sim_locks
}

metro_health_check() {
  local url="http://127.0.0.1:8081/status"
  local attempt=1
  while [[ "$attempt" -le 3 ]]; do
    if curl -sf "$url" >/dev/null 2>&1; then
      log "Metro OK (attempt ${attempt})"
      return 0
    fi
    log "Metro NOT_OK attempt ${attempt}/3"
    sleep 5
    attempt=$((attempt + 1))
  done
  die "Metro /status not healthy on :8081"
}

ensure_photos() {
  local udid="$1"
  local label="$2"
  log "ENSURE Photos ${label} UDID=${udid}"
  chmod +x "${ENSURE}" 2>/dev/null || true
  set +e
  local out rc
  out="$(FORCE_PURGE=0 MAESTRO_UDID="${udid}" NEED=3 bash "${ENSURE}" 2>&1)"
  rc=$?
  set -e
  printf '%s\n' "${out}"
  [[ "${rc}" -eq 0 ]] || die "Photos ensure failed for ${label} (rc=${rc})"
}

ensure_dual_user_data() {
  [[ -f "${ENSURE_DU_DATA}" ]] || die "Missing ${ENSURE_DU_DATA}"
  log "ENSURE dual-user project data"
  chmod +x "${ENSURE_DU_DATA}" 2>/dev/null || true
  set +e
  local out rc
  out="$(node "${ENSURE_DU_DATA}" 2>&1)"
  rc=$?
  set -e
  printf '%s\n' "${out}"
  [[ "${rc}" -eq 0 ]] || die "Dual-user data ensure failed (rc=${rc})"
}

count_screenshots_for_flow() {
  local flow="$1"
  local flow_stem="${flow%.yaml}"
  local batch flow_dir count
  while IFS= read -r batch; do
    [[ -z "${batch}" ]] && continue
    flow_dir="${MAESTRO_HOME}/.maestro/tests/${batch}/${flow_stem}"
    if [[ -d "${flow_dir}" ]]; then
      count="$(find "${flow_dir}" -type f -name '*.png' 2>/dev/null | wc -l | tr -d ' ')"
      if [[ "${count}" -gt 0 ]]; then
        echo "${count}"
        return
      fi
    fi
  done < <(ls -1t "${MAESTRO_HOME}/.maestro/tests/" 2>/dev/null | head -8)
  echo "0"
}

resolve_task_id() {
  local title="$1"
  [[ -f "${RESOLVE_TASK}" ]] || die "Missing ${RESOLVE_TASK}"
  log "Resolve task id title=${title}"
  set +e
  local out rc
  out="$(node "${RESOLVE_TASK}" --title "${title}" 2>&1)"
  rc=$?
  set -e
  printf '%s\n' "${out}"
  [[ "${rc}" -eq 0 ]] || return "${rc}"
  [[ -f "${DU_TASK_ENV}" ]] || die "Resolve succeeded but ${DU_TASK_ENV} missing"
  # shellcheck disable=SC1090
  source "${DU_TASK_ENV}"
  [[ -n "${DU_TASK_ID:-}" ]] || die "DU_TASK_ID empty after resolve"
  bash "${RESOURCE_LOCK}" claim \
    "task:${DU_TASK_ID}" \
    "title-prefix:${title%-*}" \
    "title-prefix:${title}" \
    --purpose "dual-user-gate-${ONLY}"
  log "Resolved DU_TASK_ID=${DU_TASK_ID}"
  return 0
}

run_phase() {
  local tag="$1"
  local udid="$2"
  local flow="$3"
  local need_shots="$4"
  local title="${5:-}"
  local sync_retries="${6:-1}"
  local task_id="${7:-${DU_TASK_ID:-}}"

  local flow_path="${FLOW_DIR}/${flow}"
  [[ -f "${flow_path}" ]] || die "Missing flow ${flow_path}"

  local attempt=1
  local driver_attempt=1
  local max_attempts=$(( sync_retries * (DRIVER_RETRY_MAX + 1) ))
  local last_rc=1
  local shots=0

  while [[ "${attempt}" -le "${max_attempts}" ]]; do
    metro_health_check

    local driver_flag=""
    if [[ "${driver_attempt}" -gt 1 ]]; then
      driver_flag="--reinstall-driver"
    fi

    local log_file="${ARTIFACT_DIR}/${tag}-attempt${attempt}.log"
    mkdir -p "${ARTIFACT_DIR}"

    log "PHASE ${tag} attempt=${attempt}/${max_attempts} udid=${udid:0:8}… flow=${flow} title=${title:-<none>} taskId=${task_id:-<none>}"
    set +e
    if [[ -n "${title}" && -n "${task_id}" ]]; then
      bash "${WRAPPER}" --udid "${udid}" test ${driver_flag} \
        -e "DU_TASK_TITLE=${title}" \
        -e "DU_TASK_ID=${task_id}" \
        "${flow_path}" 2>&1 | tee "${log_file}"
    elif [[ -n "${title}" ]]; then
      bash "${WRAPPER}" --udid "${udid}" test ${driver_flag} \
        -e "DU_TASK_TITLE=${title}" \
        "${flow_path}" 2>&1 | tee "${log_file}"
    else
      bash "${WRAPPER}" --udid "${udid}" test ${driver_flag} \
        "${flow_path}" 2>&1 | tee "${log_file}"
    fi
    last_rc=${PIPESTATUS[0]}
    set -e

    if [[ "${last_rc}" -ne 0 ]]; then
      if grep -qE "Transport unreachable|connection refused|5999|FlyingFox|DeviceUnreachable" "${log_file}" 2>/dev/null \
        && [[ "${driver_attempt}" -le "${DRIVER_RETRY_MAX}" ]]; then
        log "Transport crash on ${tag} — retry with fresh driver"
        driver_attempt=$((driver_attempt + 1))
        attempt=$((attempt + 1))
        sleep 5
        continue
      fi
      if [[ "${attempt}" -lt "${max_attempts}" ]]; then
        log "Phase ${tag} rc=${last_rc} — retry (sync/realtime backoff)"
        attempt=$((attempt + 1))
        sleep 8
        continue
      fi
      log "Phase ${tag} FAIL rc=${last_rc}"
      return "${last_rc}"
    fi

    shots="$(count_screenshots_for_flow "${flow}")"
    log "Phase ${tag} raw rc=0 shots=${shots} need=${need_shots}"
    if [[ "${shots}" -lt "${need_shots}" ]]; then
      log "SEMANTIC FAIL ${tag}: ${shots}/${need_shots} screenshots"
      last_rc=98
      if [[ "${attempt}" -lt "${max_attempts}" ]]; then
        attempt=$((attempt + 1))
        sleep 5
        continue
      fi
      return 98
    fi

    log "Phase ${tag} PASS shots=${shots}/${need_shots}"
    return 0
  done

  return "${last_rc}"
}

run_parallel_boot() {
  local log_a="${ARTIFACT_DIR}/boot-john.log"
  local log_b="${ARTIFACT_DIR}/boot-alice.log"
  mkdir -p "${ARTIFACT_DIR}"

  # Dual-user boots are serial by default — parallel XCTest with a 3rd headed
  # sim on this host often kills Save Password / driver startup on iPhone 16.
  if [[ "${DU_PARALLEL_BOOT:-0}" != "1" ]]; then
    log "Serial boot John then Alice (set DU_PARALLEL_BOOT=1 to override)"
    set +e
    bash "${WRAPPER}" --udid "${MAESTRO_UDID_ASSIGNER}" test \
      "${FLOW_DIR}/_boot-john.yaml" 2>&1 | tee "${log_a}"
    rc_a=${PIPESTATUS[0]}
    set -e
    [[ "${rc_a}" -eq 0 ]] || die "John boot failed rc=${rc_a}"
    set +e
    bash "${WRAPPER}" --udid "${MAESTRO_UDID_ASSIGNEE}" test \
      "${FLOW_DIR}/_boot-alice.yaml" 2>&1 | tee "${log_b}"
    rc_b=${PIPESTATUS[0]}
    set -e
    [[ "${rc_b}" -eq 0 ]] || die "Alice boot failed rc=${rc_b}"
    log "Serial boot PASS"
    sleep 8
    return 0
  fi

  log "Parallel boot John + Alice (DU_PARALLEL_BOOT=1)"
  set +e
  bash "${WRAPPER}" --udid "${MAESTRO_UDID_ASSIGNER}" test \
    "${FLOW_DIR}/_boot-john.yaml" >"${log_a}" 2>&1 &
  pid_a=$!
  bash "${WRAPPER}" --udid "${MAESTRO_UDID_ASSIGNEE}" test \
    "${FLOW_DIR}/_boot-alice.yaml" >"${log_b}" 2>&1 &
  pid_b=$!
  wait "${pid_a}"; rc_a=$?
  wait "${pid_b}"; rc_b=$?
  set -e

  cat "${log_a}"
  cat "${log_b}"

  [[ "${rc_a}" -eq 0 ]] || die "John boot failed rc=${rc_a}"
  [[ "${rc_b}" -eq 0 ]] || die "Alice boot failed rc=${rc_b}"
  log "Parallel boot PASS"
  sleep 8
}

run_h01() {
  local title="DU-H01-$(date +%s)"
  log "===== DU-H01 happy path title=${title} ====="
  bash "${RESOURCE_LOCK}" claim "title-prefix:DU-H01" "title-prefix:${title}" --purpose "dual-user-gate-${ONLY}"

  run_phase "H01-create" "${MAESTRO_UDID_ASSIGNER}" "DU-H01-assigner-create.yaml" 3 "${title}" 1 || return 1
  resolve_task_id "${title}" || return 1
  sleep 8
  run_phase "H01-assignee" "${MAESTRO_UDID_ASSIGNEE}" "DU-H01-assignee-loop.yaml" 4 "${title}" "${DU_SYNC_RETRIES}" "${DU_TASK_ID}" || return 1
  sleep 8
  run_phase "H01-approve" "${MAESTRO_UDID_ASSIGNER}" "DU-H01-assigner-approve.yaml" 2 "${title}" "${DU_SYNC_RETRIES}" "${DU_TASK_ID}" || return 1
  log "DU-H01 PASS title=${title}"
}

run_d01() {
  local title="DU-D01-$(date +%s)"
  log "===== DU-D01 decline path title=${title} ====="
  bash "${RESOURCE_LOCK}" claim "title-prefix:DU-D01" "title-prefix:${title}" --purpose "dual-user-gate-${ONLY}"

  run_phase "D01-create" "${MAESTRO_UDID_ASSIGNER}" "DU-D01-assigner-create.yaml" 1 "${title}" 1 || return 1
  resolve_task_id "${title}" || return 1
  sleep 8
  run_phase "D01-decline" "${MAESTRO_UDID_ASSIGNEE}" "DU-D01-assignee-decline.yaml" 2 "${title}" "${DU_SYNC_RETRIES}" "${DU_TASK_ID}" || return 1
  sleep 8
  run_phase "D01-john" "${MAESTRO_UDID_ASSIGNER}" "DU-D01-assigner-sees-decline.yaml" 1 "${title}" "${DU_SYNC_RETRIES}" "${DU_TASK_ID}" || return 1
  log "DU-D01 PASS title=${title}"
}

# ---------------------------------------------------------------------------
main() {
  log "===== DUAL-USER GATE START ====="
  resolve_udids
  trap dual_user_teardown EXIT INT TERM
  coordination_preflight
  log "Assigner (John)  UDID=${MAESTRO_UDID_ASSIGNER}"
  log "Assignee (Alice) UDID=${MAESTRO_UDID_ASSIGNEE}"
  log "ONLY=${ONLY}  SYNC_RETRIES=${DU_SYNC_RETRIES}  ARTIFACT_DIR=${ARTIFACT_DIR}"

  metro_health_check
  mkdir -p "${ARTIFACT_DIR}"
  mkdir -p "${MAESTRO_HOME}/.maestro/tests"

  ensure_dual_user_data
  ensure_photos "${MAESTRO_UDID_ASSIGNER}" "assigner"
  ensure_photos "${MAESTRO_UDID_ASSIGNEE}" "assignee"

  run_parallel_boot

  local final_rc=0
  case "${ONLY}" in
    H01|h01)
      run_h01 || final_rc=1
      ;;
    D01|d01)
      run_d01 || final_rc=1
      ;;
    ALL|all|*)
      run_h01 || final_rc=1
      if [[ "${final_rc}" -eq 0 || "${STOP_ON_FAIL}" -eq 0 ]]; then
        run_d01 || final_rc=1
      else
        log "STOP_ON_FAIL — skipping DU-D01 after H01 failure"
      fi
      ;;
  esac

  if [[ "${final_rc}" -eq 0 ]]; then
    log "===== DUAL-USER GATE PASS ====="
  else
    log "===== DUAL-USER GATE FAIL rc=${final_rc} ====="
  fi
  log "Artifacts: ${ARTIFACT_DIR}"
  exit "${final_rc}"
}

main "$@"
