#!/usr/bin/env bash
# Run one Create Task photo Maestro case (P01–P22) independently.
# Ensures sim Photos (reuse or purge+seed), then runs only that flow.
#
# Usage:
#   bash scripts/maestro/run-create-task-photo-one.sh P04
#   FORCE_PURGE=1 bash scripts/maestro/run-create-task-photo-one.sh P04
#
# Concurrent development (2 agents / tracks):
# - Partition P-ranges (e.g. A owns P01–P11, B owns P12–P22). Do not edit the same P##.yaml.
# - Shared helpers (_boot, _open-library, _accept-library, _submit-*, ensure-*.sh) = single-writer:
#   announce helper edits; other track rebases / re-runs after.
# - One Maestro owner per sim UDID. Never two run-*-one / suite jobs on the same UDID.
# - Prefer REUSE (default ensure). Only one track may FORCE_PURGE at a time.
# - Product code (CreateTask / library / selection) changes: serialize; both re-run their P## after.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
UDID="${MAESTRO_UDID:-B7B2640C-4738-4F8A-AEEE-5DF3D21D2533}"
FLOW_DIR="${ROOT}/maestro/flows/create-task-photo"
WRAPPER="${ROOT}/scripts/maestro/run-local.sh"
ENSURE="${ROOT}/scripts/maestro/ensure-create-task-photo-media.sh"
SIM_LOCK="${ROOT}/scripts/maestro/sim-lock.sh"
RESOURCE_LOCK="${ROOT}/scripts/maestro/resource-lock.sh"

export MAESTRO_DRIVER_STARTUP_TIMEOUT="${MAESTRO_DRIVER_STARTUP_TIMEOUT:-90000}"
export MAESTRO_0CLICK_DISABLE=1

TARGET="${1:-${ONLY:-}}"
if [[ -z "${TARGET}" ]]; then
  echo "Usage: $0 P04   OR   ONLY=P04 $0"
  echo "Each P## flow is independent (clearState boot). Prefer this over full suite while developing."
  exit 2
fi

# Resolve P04 / P04-*.yaml / full path → flow filename
if [[ -f "${TARGET}" ]]; then
  FLOW_PATH="$(cd "$(dirname "${TARGET}")" && pwd)/$(basename "${TARGET}")"
elif [[ -f "${FLOW_DIR}/${TARGET}" ]]; then
  FLOW_PATH="${FLOW_DIR}/${TARGET}"
elif [[ -f "${FLOW_DIR}/${TARGET}.yaml" ]]; then
  FLOW_PATH="${FLOW_DIR}/${TARGET}.yaml"
else
  match="$(ls -1 "${FLOW_DIR}"/${TARGET}*.yaml 2>/dev/null | head -1 || true)"
  if [[ -z "${match}" ]]; then
    echo "FAIL: no flow matching '${TARGET}' under ${FLOW_DIR}"
    exit 2
  fi
  FLOW_PATH="${match}"
fi

FLOW_NAME="$(basename "${FLOW_PATH}")"

resource_claims=(
  "user:john.managera"
  "project:project-a"
)
if [[ "${FORCE_PURGE:-0}" == "1" ]]; then
  resource_claims+=("photos:force-purge")
fi

cleanup() {
  bash "${RESOURCE_LOCK}" release-all >/dev/null 2>&1 || true
  bash "${SIM_LOCK}" release-all >/dev/null 2>&1 || true
}
trap cleanup EXIT INT TERM

if ! curl -sf "http://127.0.0.1:8081/status" >/dev/null 2>&1; then
  echo "FAIL: Metro /status not healthy on :8081"
  exit 97
fi

chmod +x "${ENSURE}" 2>/dev/null || true

echo "=== Create Task photo ONE: ${FLOW_NAME} ==="
echo "UDID=${UDID}"
echo "----- CLAIM sim + resources -----"
bash "${SIM_LOCK}" claim "${UDID}" --purpose "create-task-photo-one:${FLOW_NAME}"
bash "${RESOURCE_LOCK}" claim "${resource_claims[@]}" --purpose "create-task-photo-one:${FLOW_NAME}"
echo "----- ENSURE sim Photos -----"
set +e
ENSURE_OUT="$(FORCE_PURGE="${FORCE_PURGE:-0}" MAESTRO_UDID="${UDID}" NEED=3 bash "${ENSURE}" 2>&1)"
ENSURE_RC=$?
set -e
printf '%s\n' "${ENSURE_OUT}"
if [[ "${ENSURE_RC}" -ne 0 ]]; then
  exit "${ENSURE_RC}"
fi

USE_REINSTALL=0
if [[ "${FORCE_PURGE:-0}" == "1" ]] || [[ "${REINSTALL_DRIVER:-0}" == "1" ]]; then
  USE_REINSTALL=1
fi
if printf '%s\n' "${ENSURE_OUT}" | grep -q 'PURGE+SEED'; then
  USE_REINSTALL=1
  sleep 3
fi

echo "----- RUN ${FLOW_NAME} -----"
set +e
if [[ "${USE_REINSTALL}" -eq 1 ]]; then
  bash "${WRAPPER}" --udid "${UDID}" test --reinstall-driver "${FLOW_PATH}"
else
  bash "${WRAPPER}" --udid "${UDID}" test "${FLOW_PATH}"
fi
rc=$?
set -e
echo "FINISHED ${FLOW_NAME} rc=${rc}"
exit "${rc}"
