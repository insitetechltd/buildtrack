#!/usr/bin/env bash
# Run one Update Progress photo Maestro case (U01–U12) independently.
# Ensures sim Photos + API-seeds a task (no Create Task UI), then runs the flow.
#
# Usage:
#   bash scripts/maestro/run-update-progress-photo-one.sh U05
#   FORCE_PURGE=1 bash scripts/maestro/run-update-progress-photo-one.sh U05
#   npm run test:e2e:maestro:update-progress-photo:one -- U05
#
# Same development model as Create Task photo (P01–P22):
# - Each U## uses ordinary no-clear _boot + fresh API seed. Prefer one-shot
#   while developing/fixing — not the full sequential suite.
# - Full suite (run-update-progress-photo-suite.sh) = final gate only.
# - Concurrent tracks: partition U-ranges; 1 Maestro job per UDID; shared helpers /
#   seed script = single-writer; prefer REUSE Photos (one FORCE_PURGE owner at a time).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
UDID="${MAESTRO_UDID:-B7B2640C-4738-4F8A-AEEE-5DF3D21D2533}"
FLOW_DIR="${ROOT}/maestro/flows/update-progress-photo"
WRAPPER="${ROOT}/scripts/maestro/run-local.sh"
ENSURE="${ROOT}/scripts/maestro/ensure-create-task-photo-media.sh"
SEED_JS="${ROOT}/scripts/maestro/ensure-update-progress-seed-task.cjs"
SEED_ENV="${ROOT}/.cache/maestro-up-seed.env"
SIM_LOCK="${ROOT}/scripts/maestro/sim-lock.sh"
RESOURCE_LOCK="${ROOT}/scripts/maestro/resource-lock.sh"

export MAESTRO_DRIVER_STARTUP_TIMEOUT="${MAESTRO_DRIVER_STARTUP_TIMEOUT:-90000}"
export MAESTRO_0CLICK_DISABLE=1

TARGET="${1:-${ONLY:-}}"
if [[ -z "${TARGET}" ]]; then
  echo "Usage: $0 U05   OR   ONLY=U05 $0"
  echo "Each U## flow uses ordinary no-clear boot + API seed. Prefer this over full suite while developing."
  exit 2
fi

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
  "user:bob.workera2"
  "seed:update-progress"
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

echo "=== Update Progress photo ONE: ${FLOW_NAME} ==="
echo "UDID=${UDID}"
echo "----- CLAIM sim + resources -----"
bash "${SIM_LOCK}" claim "${UDID}" --purpose "update-progress-photo-one:${FLOW_NAME}"

echo "----- API SEED task (skip Create Task UI) -----"
# Account partition (2026-08-19):
#   dual-user gate → john.managera + alice.workera1 on Max+16 (do NOT use here)
#   solo Section E sequential → bob.workera2 login (_boot-bob.yaml) on 17 Pro
#   creator (when assignee != creator) → sarah.managerb@test.com
BOB="bob.workera2@test.com"
SARAH="sarah.managerb@test.com"
case "${FLOW_NAME}" in
  W-D10-archive.yaml)
    export MAESTRO_UP_SEED_STATUS="${MAESTRO_UP_SEED_STATUS:-approved}"
    export MAESTRO_UP_SEED_EMAIL="${MAESTRO_UP_SEED_EMAIL:-${BOB}}"
    export MAESTRO_UP_SEED_ASSIGNED_BY_EMAIL="${MAESTRO_UP_SEED_ASSIGNED_BY_EMAIL:-${BOB}}"
    resource_claims+=("project:project-a")
    ;;
  W-D01-accept.yaml|W-D02-decline.yaml)
    export MAESTRO_UP_SEED_STATUS=new
    export MAESTRO_UP_SEED_EMAIL="${MAESTRO_UP_SEED_EMAIL:-${BOB}}"
    export MAESTRO_UP_SEED_ASSIGNED_BY_EMAIL="${MAESTRO_UP_SEED_ASSIGNED_BY_EMAIL:-${SARAH}}"
    resource_claims+=("user:sarah.managerb" "project:project-a")
    ;;
  W-D07-submit-review.yaml|W-D07-submit-review-from-seed.yaml)
    unset MAESTRO_UP_SEED_STATUS 2>/dev/null || true
    export MAESTRO_UP_SEED_STATUS="${MAESTRO_UP_SEED_STATUS:-accepted}"
    export MAESTRO_UP_SEED_EMAIL="${MAESTRO_UP_SEED_EMAIL:-${BOB}}"
    export MAESTRO_UP_SEED_ASSIGNED_BY_EMAIL="${MAESTRO_UP_SEED_ASSIGNED_BY_EMAIL:-${SARAH}}"
    resource_claims+=("user:sarah.managerb" "project:project-a")
    ;;
  W-D08-edit.yaml)
    export MAESTRO_UP_SEED_STATUS="${MAESTRO_UP_SEED_STATUS:-new}"
    export MAESTRO_UP_SEED_EMAIL="${MAESTRO_UP_SEED_EMAIL:-${BOB}}"
    export MAESTRO_UP_SEED_ASSIGNED_BY_EMAIL="${MAESTRO_UP_SEED_ASSIGNED_BY_EMAIL:-${BOB}}"
    resource_claims+=("project:project-a")
    ;;
  W-D03-update-text.yaml|W-D04-update-photo.yaml|W-D05-add-comment.yaml|W-D06-add-subtask.yaml|W-D09-photo-viewer.yaml|E-D03-update-text-only.yaml)
    unset MAESTRO_UP_SEED_STATUS 2>/dev/null || true
    export MAESTRO_UP_SEED_STATUS="${MAESTRO_UP_SEED_STATUS:-accepted}"
    export MAESTRO_UP_SEED_EMAIL="${MAESTRO_UP_SEED_EMAIL:-${BOB}}"
    export MAESTRO_UP_SEED_ASSIGNED_BY_EMAIL="${MAESTRO_UP_SEED_ASSIGNED_BY_EMAIL:-${SARAH}}"
    resource_claims+=("user:sarah.managerb" "project:project-a")
    ;;
  U*.yaml)
    unset MAESTRO_UP_SEED_STATUS 2>/dev/null || true
    resource_claims+=("project:project-a")
    ;;
esac
bash "${RESOURCE_LOCK}" claim "${resource_claims[@]}" --purpose "update-progress-photo-one:${FLOW_NAME}"
node "${SEED_JS}"
# shellcheck disable=SC1090
source "${SEED_ENV}"
if [[ -z "${UP_SEED_TITLE:-}" || -z "${UP_SEED_TASK_ID:-}" ]]; then
  echo "FAIL: seed env missing UP_SEED_TITLE / UP_SEED_TASK_ID"
  exit 3
fi
bash "${RESOURCE_LOCK}" claim "task:${UP_SEED_TASK_ID}" "title-prefix:${UP_SEED_TITLE}" --purpose "update-progress-photo-one:${FLOW_NAME}"
echo "UP_SEED_TITLE=${UP_SEED_TITLE}"
echo "UP_SEED_TASK_ID=${UP_SEED_TASK_ID}"

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
  bash "${WRAPPER}" --udid "${UDID}" test --reinstall-driver \
    -e "UP_SEED_TITLE=${UP_SEED_TITLE}" \
    -e "UP_SEED_TASK_ID=${UP_SEED_TASK_ID}" \
    "${FLOW_PATH}"
else
  bash "${WRAPPER}" --udid "${UDID}" test \
    -e "UP_SEED_TITLE=${UP_SEED_TITLE}" \
    -e "UP_SEED_TASK_ID=${UP_SEED_TASK_ID}" \
    "${FLOW_PATH}"
fi
rc=$?
set -e
echo "FINISHED ${FLOW_NAME} rc=${rc}"
exit "${rc}"
