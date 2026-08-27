#!/usr/bin/env bash
# Create Task photo Maestro suite P01–P22 (S-UX-01Q) — FINAL GATE only.
#
# Development workflow: each P## is an independent flow (_boot clearState).
#   Fix one case → reseed if needed → run ONLY that case:
#     bash scripts/maestro/run-create-task-photo-one.sh P04
# Do NOT loop P01→P22 while iterating. Use this suite script once all 22
# pass individually, as the slice close / regression gate.
#
# Env:
#   START_FROM=P04 + MAESTRO_SUITE_RESUME=1
#     resume full suite from a case (both required — leftover START_FROM
#     in the shell must not silently skip P01–P0n on the final gate)
#   ONLY=P04         run a single case then exit (same as run-*-one.sh)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
UDID="${MAESTRO_UDID:-B7B2640C-4738-4F8A-AEEE-5DF3D21D2533}"
FLOW_DIR="${ROOT}/maestro/flows/create-task-photo"
WRAPPER="${ROOT}/scripts/maestro/run-local.sh"
ENSURE="${ROOT}/scripts/maestro/ensure-create-task-photo-media.sh"
ONE="${ROOT}/scripts/maestro/run-create-task-photo-one.sh"

export MAESTRO_DRIVER_STARTUP_TIMEOUT="${MAESTRO_DRIVER_STARTUP_TIMEOUT:-120000}"
export MAESTRO_0CLICK_DISABLE=1

# Single-case shortcut (preferred while developing)
if [[ -n "${ONLY:-}" ]]; then
  exec bash "${ONE}" "${ONLY}"
fi

FLOWS=(
  "P01-single-photo.yaml"
  "P02-two-first-visit.yaml"
  "P03-three-first-visit.yaml"
  "P04-add-more-second.yaml"
  "P05-add-more-twice.yaml"
  "P06-add-more-cancel.yaml"
  "P07-form-plus-preserves.yaml"
  "P08-form-plus-add-second.yaml"
  "P09-form-plus-accept-preselected.yaml"
  "P10-rotate.yaml"
  "P11-crop.yaml"
  "P12-draw-bake.yaml"
  "P13-draw-undo.yaml"
  "P14-edit-reset.yaml"
  "P15-edit-first-of-two.yaml"
  "P16-form-plus-edit-second.yaml"
  "P17-prior-unavailable-duplicate.yaml"
  "P18-remove-on-selection.yaml"
  "P19-form-remove-then-plus.yaml"
  "P20-empty-cancel.yaml"
  "P21-draw-done-no-strokes.yaml"
  "P22-force-same-asset-dedupe.yaml"
)

# Guard: inherited START_FROM must not shrink the final gate by accident.
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

echo "=== Create Task photo Maestro FINAL GATE (sequential) ==="
echo "UDID=${UDID}"
echo "Flows=${#FLOWS[@]}"
echo "Note: while developing, use: bash scripts/maestro/run-create-task-photo-one.sh P##"
echo

if ! curl -sf "http://127.0.0.1:8081/status" >/dev/null 2>&1; then
  echo "FAIL: Metro /status not healthy on :8081 — start with: npx expo start --dev-client"
  exit 97
fi

chmod +x "${ENSURE}" "${ONE}" 2>/dev/null || true

FAILED=0
PASSED=0
for flow in "${FLOWS[@]}"; do
  path="${FLOW_DIR}/${flow}"
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
    bash "${WRAPPER}" --udid "${UDID}" test --reinstall-driver "${path}"
  else
    bash "${WRAPPER}" --udid "${UDID}" test "${path}"
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
  sleep 3
done

if [[ "${FAILED}" -ne 0 ]]; then
  echo "SUITE FAIL: passed ${PASSED}/${#FLOWS[@]} before stop"
  exit 1
fi
echo "SUITE PASS: ${#FLOWS[@]} create-task-photo P01–P22"
exit 0
