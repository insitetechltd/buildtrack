#!/usr/bin/env bash
# Update Progress photo Maestro suite U01–U12 — FINAL GATE only.
# While developing/fixing, use one-shots instead:
#   bash scripts/maestro/run-update-progress-photo-one.sh U05
# Each case: API-seed task (no Create Task UI) + media ensure + flow.
#
# Env:
#   START_FROM=U04 + MAESTRO_SUITE_RESUME=1  resume suite
#   ONLY=U04                                 delegates to one-shot
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
UDID="${MAESTRO_UDID:-B7B2640C-4738-4F8A-AEEE-5DF3D21D2533}"
FLOW_DIR="${ROOT}/maestro/flows/update-progress-photo"
WRAPPER="${ROOT}/scripts/maestro/run-local.sh"
ENSURE="${ROOT}/scripts/maestro/ensure-create-task-photo-media.sh"
SEED_JS="${ROOT}/scripts/maestro/ensure-update-progress-seed-task.cjs"
SEED_ENV="${ROOT}/.cache/maestro-up-seed.env"
ONE="${ROOT}/scripts/maestro/run-update-progress-photo-one.sh"

export MAESTRO_DRIVER_STARTUP_TIMEOUT="${MAESTRO_DRIVER_STARTUP_TIMEOUT:-120000}"
export MAESTRO_0CLICK_DISABLE=1

if [[ -n "${ONLY:-}" ]]; then
  exec bash "${ONE}" "${ONLY}"
fi

FLOWS=(
  "U01-single-photo.yaml"
  "U02-two-first-visit.yaml"
  "U03-add-more-second.yaml"
  "U04-add-more-twice.yaml"
  "U05-form-plus-preserves.yaml"
  "U06-form-plus-add-second.yaml"
  "U07-form-plus-accept-preselected.yaml"
  "U08-draw-bake.yaml"
  "U09-rotate.yaml"
  "U10-prior-unavailable.yaml"
  "U11-remove-then-plus.yaml"
  "U12-force-dedupe.yaml"
)

START_FROM="${START_FROM:-}"
if [[ -n "${START_FROM}" && "${MAESTRO_SUITE_RESUME:-}" != "1" ]]; then
  echo "WARN: ignoring START_FROM=${START_FROM} (set MAESTRO_SUITE_RESUME=1 to resume)"
  START_FROM=""
fi
if [[ -n "${START_FROM}" ]]; then
  filtered=()
  skip=1
  for flow in "${FLOWS[@]}"; do
    if [[ "${flow}" == "${START_FROM}"* ]] || [[ "${flow}" == "${START_FROM}" ]]; then
      skip=0
    fi
    if [[ "${skip}" -eq 0 ]]; then
      filtered+=("${flow}")
    fi
  done
  FLOWS=("${filtered[@]}")
fi

echo "=== Update Progress photo Maestro FINAL GATE (API seed) ==="
echo "UDID=${UDID}"
echo "Flows=${#FLOWS[@]}"
echo

if ! curl -sf "http://127.0.0.1:8081/status" >/dev/null 2>&1; then
  echo "FAIL: Metro /status not healthy on :8081"
  exit 97
fi

chmod +x "${ENSURE}" "${ONE}" 2>/dev/null || true

FAILED=0
PASSED=0
for flow in "${FLOWS[@]}"; do
  path="${FLOW_DIR}/${flow}"

  echo "----- API SEED before ${flow} -----"
  node "${SEED_JS}"
  # shellcheck disable=SC1090
  source "${SEED_ENV}"
  if [[ -z "${UP_SEED_TITLE:-}" || -z "${UP_SEED_TASK_ID:-}" ]]; then
    echo "STOP-ON-FAIL: seed env incomplete"
    exit 3
  fi
  echo "UP_SEED_TITLE=${UP_SEED_TITLE} UP_SEED_TASK_ID=${UP_SEED_TASK_ID}"

  echo "----- ENSURE sim Photos before ${flow} -----"
  set +e
  ENSURE_OUT="$(MAESTRO_UDID="${UDID}" NEED=3 bash "${ENSURE}" 2>&1)"
  ENSURE_RC=$?
  set -e
  printf '%s\n' "${ENSURE_OUT}"
  if [[ "${ENSURE_RC}" -ne 0 ]]; then
    echo "STOP-ON-FAIL: media ensure failed (rc=${ENSURE_RC})"
    exit "${ENSURE_RC}"
  fi

  USE_REINSTALL=0
  if printf '%s\n' "${ENSURE_OUT}" | grep -q 'PURGE+SEED'; then
    USE_REINSTALL=1
    sleep 3
  fi

  echo "----- RUN ${flow} -----"
  set +e
  if [[ "${USE_REINSTALL}" -eq 1 ]]; then
    bash "${WRAPPER}" --udid "${UDID}" test --reinstall-driver \
      -e "UP_SEED_TITLE=${UP_SEED_TITLE}" \
      -e "UP_SEED_TASK_ID=${UP_SEED_TASK_ID}" \
      "${path}"
  else
    bash "${WRAPPER}" --udid "${UDID}" test \
      -e "UP_SEED_TITLE=${UP_SEED_TITLE}" \
      -e "UP_SEED_TASK_ID=${UP_SEED_TASK_ID}" \
      "${path}"
  fi
  rc=$?
  set -e
  echo "FINISHED ${flow} rc=${rc}"
  if [[ "${rc}" -ne 0 ]]; then
    FAILED=1
    echo "STOP-ON-FAIL: ${flow} failed (rc=${rc})"
    break
  fi
  PASSED=$((PASSED + 1))
  sleep 2
done

if [[ "${FAILED}" -ne 0 ]]; then
  echo "SUITE FAIL: passed ${PASSED}/${#FLOWS[@]} before stop"
  exit 1
fi
echo "SUITE PASS: ${#FLOWS[@]} update-progress-photo U01–U12"
exit 0
