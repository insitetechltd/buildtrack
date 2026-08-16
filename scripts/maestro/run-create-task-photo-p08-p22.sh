#!/usr/bin/env bash
# Owned resume: P08→P22 on primary UDID. Stop-on-fail; retry once with driver reinstall.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
export MAESTRO_DRIVER_STARTUP_TIMEOUT="${MAESTRO_DRIVER_STARTUP_TIMEOUT:-180000}"
export MAESTRO_0CLICK_DISABLE=1
LOG="${ROOT}/.cache/maestro-ct-photo-p08-p22.log"
exec > >(tee -a "$LOG") 2>&1
echo "=== resume P08-P22 $(date -Iseconds) ==="
for p in P08 P09 P10 P11 P12 P13 P14 P15 P16 P17 P18 P19 P20 P21 P22; do
  echo "===== ONE $p ====="
  set +e
  bash scripts/maestro/run-create-task-photo-one.sh "$p"
  rc=$?
  set -e
  if [[ $rc -ne 0 ]]; then
    echo "===== RETRY $p REINSTALL_DRIVER ====="
    sleep 5
    set +e
    REINSTALL_DRIVER=1 bash scripts/maestro/run-create-task-photo-one.sh "$p"
    rc=$?
    set -e
  fi
  echo "===== DONE $p rc=$rc ====="
  if [[ $rc -ne 0 ]]; then
    echo "STOP-ON-FAIL at $p"
    exit 1
  fi
  sleep 5
done
echo "SUITE PASS P08-P22"
exit 0
