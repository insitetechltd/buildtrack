#!/usr/bin/env bash
# Stage E Report journey: Alice create Report → DB reported → Carol resolve → DB resolved.
# Sims: Carol triage = 17 Pro Max; Alice reporter = iPhone 16 (same pair as dual-user).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
FLOW_DIR="${ROOT}/maestro/flows/report"
WRAPPER="${ROOT}/scripts/maestro/run-local.sh"
ENSURE="${ROOT}/scripts/maestro/ensure-create-task-photo-media.sh"
ENSURE_DU_DATA="${ROOT}/scripts/maestro/ensure-dual-user-project-data.cjs"
RESOLVE_TASK="${ROOT}/scripts/maestro/resolve-dual-user-task-id.cjs"
READBACK="${ROOT}/scripts/maestro/report-db-readback.cjs"
SIM_LOCK="${ROOT}/scripts/maestro/sim-lock.sh"
RESOURCE_LOCK="${ROOT}/scripts/maestro/resource-lock.sh"
DU_TASK_ENV="${ROOT}/.cache/maestro-du-task.env"
DU_USERS_ENV="${ROOT}/.cache/maestro-du-users.env"
MAESTRO_HOME="${MAESTRO_LOCAL_HOME:-$ROOT/.cache/maestro-home-report}"
export MAESTRO_LOCAL_HOME="${MAESTRO_HOME}"
EVIDENCE_DIR="${ROOT}/docs/superpowers/evidence/2026-09-23-stage-e"
ARTIFACT_DIR="${ARTIFACT_DIR:-$ROOT/.cache/maestro-artifacts/report-$(date +%Y%m%d_%H%M%S)}"
RUN_ID="$(date +%Y%m%d_%H%M%S)"
MANIFEST="${EVIDENCE_DIR}/report-manifest-${RUN_ID}.json"

PREFERRED_CAROL="B7B2640C-4738-4F8A-AEEE-5DF3D21D2533"
PREFERRED_ALICE="F537DDA8-E83B-4A29-AF38-ACC8EC64F0DA"

export MAESTRO_DRIVER_STARTUP_TIMEOUT="${MAESTRO_DRIVER_STARTUP_TIMEOUT:-90000}"
export MAESTRO_0CLICK_DISABLE=1

mkdir -p "${EVIDENCE_DIR}" "${ARTIFACT_DIR}" "${ROOT}/.cache" "${MAESTRO_HOME}"

log() { printf '[%s report]%s\n' "$(date +%H:%M:%S)" " $*"; }
die() { log "FAIL: $*"; exit 1; }

UDID_CAROL="${MAESTRO_UDID_CAROL:-${MAESTRO_UDID_ASSIGNER:-$PREFERRED_CAROL}}"
UDID_ALICE="${MAESTRO_UDID_ALICE:-${MAESTRO_UDID_ASSIGNEE:-$PREFERRED_ALICE}}"

# Best-effort sign-out on both sims so Realtime/JWT do not linger after FAIL
# or interrupt (YAML happy-path also calls _logout.yaml; this covers mid-flow abort).
teardown_logout() {
  local udid="$1"
  local label="$2"
  [[ -n "${udid}" ]] || return 0
  log "Teardown logout ${label} udid=${udid:0:8}…"
  set +e
  bash "${WRAPPER}" test \
    --udid "${udid}" \
    "${ROOT}/maestro/flows/_logout.yaml" \
    >/dev/null 2>&1
  set -e
}

cleanup() {
  teardown_logout "${UDID_ALICE:-}" "alice" || true
  teardown_logout "${UDID_CAROL:-}" "carol" || true
  bash "${RESOURCE_LOCK}" release-all 2>/dev/null || true
  bash "${SIM_LOCK}" release-all 2>/dev/null || true
}
trap cleanup EXIT

if ! curl -sf "http://127.0.0.1:8081/status" >/dev/null 2>&1; then
  die "Metro not reachable on :8081"
fi

log "===== REPORT JOURNEY START ====="
log "Carol UDID=${UDID_CAROL} Alice UDID=${UDID_ALICE}"

bash "${SIM_LOCK}" claim-pair \
  --assigner "${UDID_CAROL}" \
  --assignee "${UDID_ALICE}" \
  --purpose "stage-e-report" || die "sim claim-pair failed"

bash "${RESOURCE_LOCK}" claim \
  "user:carol.admina" \
  "user:alice.workera1" \
  "project:project-a" \
  "seed:report-journey" \
  --purpose "stage-e-report" || die "resource claim failed"

SHA="$(git -C "${ROOT}" rev-parse HEAD 2>/dev/null || echo unknown)"
DIRTY=0
if [[ -n "$(git -C "${ROOT}" status --porcelain 2>/dev/null || true)" ]]; then
  DIRTY=1
fi
DIFF_NAMES="$(git -C "${ROOT}" diff --name-only HEAD 2>/dev/null; git -C "${ROOT}" ls-files --others --exclude-standard 2>/dev/null | head -80)"
DIFF_STAT="$(git -C "${ROOT}" diff --stat HEAD 2>/dev/null | tail -1 || true)"

[[ -f "${ENSURE_DU_DATA}" ]] || die "missing ensure-dual-user-project-data"
node "${ENSURE_DU_DATA}" || die "ensure dual-user data failed"
# shellcheck disable=SC1090
source "${DU_USERS_ENV}" 2>/dev/null || true

FORCE_PURGE=0 MAESTRO_UDID="${UDID_ALICE}" NEED=3 bash "${ENSURE}" || die "photos alice"
FORCE_PURGE=0 MAESTRO_UDID="${UDID_CAROL}" NEED=3 bash "${ENSURE}" || die "photos carol"

TITLE="R01-$(date +%s)"
export DU_TASK_TITLE="${TITLE}"
log "TITLE=${TITLE}"

run_flow() {
  local label="$1"
  local udid="$2"
  local flow="$3"
  local logf="${ARTIFACT_DIR}/${label}.log"
  log "PHASE ${label} udid=${udid:0:8}… flow=${flow}"
  set +e
  bash "${WRAPPER}" test \
    --udid "${udid}" \
    -e "DU_TASK_TITLE=${DU_TASK_TITLE}" \
    -e "DU_TASK_ID=${DU_TASK_ID:-}" \
    "${FLOW_DIR}/${flow}" 2>&1 | tee "${logf}"
  local rc=${PIPESTATUS[0]}
  set -e
  [[ "${rc}" -eq 0 ]] || die "phase ${label} rc=${rc} log=${logf}"
  log "PHASE ${label} PASS"
}

# Copy named PNGs into evidence headed/
collect_pngs() {
  mkdir -p "${EVIDENCE_DIR}/headed"
  local names=(
    R01-chooser-report
    R01-alice-form
    R01-alice-reported
    R01-carol-resolve-confirm
    R01-carol-resolved-detail
  )
  local found=0
  for n in "${names[@]}"; do
    local hit
    hit="$(find "${MAESTRO_HOME}" -name "${n}.png" -print0 2>/dev/null | xargs -0 ls -t 2>/dev/null | head -1 || true)"
    if [[ -n "${hit}" ]]; then
      cp -f "${hit}" "${EVIDENCE_DIR}/headed/${n}.png"
      found=$((found + 1))
    fi
  done
  log "PNG collected ${found}/5 → ${EVIDENCE_DIR}/headed"
  [[ "${found}" -ge 5 ]] || die "PNG inventory incomplete (${found}/5)"
}

run_flow "alice-create" "${UDID_ALICE}" "R01-alice-create-report.yaml"

log "Resolve task id title=${TITLE}"
node "${RESOLVE_TASK}" --title "${TITLE}" || die "resolve task id"
# shellcheck disable=SC1090
source "${DU_TASK_ENV}"
[[ -n "${DU_TASK_ID:-}" ]] || die "DU_TASK_ID empty"
export DU_TASK_ID REPORT_TASK_ID="${DU_TASK_ID}"
bash "${RESOURCE_LOCK}" claim "task:${DU_TASK_ID}" "title-prefix:${TITLE}" --purpose "stage-e-report" || true

log "DB readback EXPECT reported"
EXPECT_STATUS=reported EXPECT_ACTIVITY=issue_reported REPORT_TASK_ID="${DU_TASK_ID}" \
  node "${READBACK}" || die "readback reported"

run_flow "carol-resolve" "${UDID_CAROL}" "R01-carol-resolve.yaml"

log "DB readback EXPECT resolved by Carol"
EXPECT_STATUS=resolved EXPECT_ACTIVITY=issue_resolved EXPECT_ACTOR_EMAIL=carol.admina@test.com \
  REPORT_TASK_ID="${DU_TASK_ID}" node "${READBACK}" || die "readback resolved"

collect_pngs

python3 - <<PY
import json, os
from pathlib import Path
manifest = {
  "ok": True,
  "runId": "${RUN_ID}",
  "appSha": "${SHA}",
  "dirty": bool(${DIRTY}),
  "diffStat": """${DIFF_STAT}""",
  "title": "${TITLE}",
  "taskId": "${DU_TASK_ID}",
  "udidCarol": "${UDID_CAROL}",
  "udidAlice": "${UDID_ALICE}",
  "flows": ["R01-alice-create-report", "R01-carol-resolve"],
  "pngRequired": [
    "R01-chooser-report",
    "R01-alice-form",
    "R01-alice-reported",
    "R01-carol-resolve-confirm",
    "R01-carol-resolved-detail",
  ],
  "artifacts": "${ARTIFACT_DIR}",
  "notes": "Alice worker Report → Carol admin Resolve; E3b promote OPEN",
}
Path("${MANIFEST}").write_text(json.dumps(manifest, indent=2) + "\\n")
print("WROTE", "${MANIFEST}")
PY

log "===== REPORT JOURNEY PASS ====="
log "Manifest ${MANIFEST}"
