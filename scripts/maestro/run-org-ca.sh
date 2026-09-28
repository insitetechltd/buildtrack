#!/usr/bin/env bash
# Stage D org Maestro one-shot (Carol CA): O1 → O2 → O3 → S2 → S3.
# Hardened: Metro check, stop-on-fail, artifact manifest.
# Prove order (SoT): seed → this script → rc-worker-be → dual-user → p-matrix → re-seed.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
FLOW_DIR="${ROOT}/maestro/flows/org"
WRAPPER="${ROOT}/scripts/maestro/run-local.sh"
SIM_LOCK="${ROOT}/scripts/maestro/sim-lock.sh"
RESOURCE_LOCK="${ROOT}/scripts/maestro/resource-lock.sh"
UDID="${MAESTRO_UDID:-B7B2640C-4738-4F8A-AEEE-5DF3D21D2533}"
EVIDENCE_DIR="${ROOT}/docs/superpowers/evidence/2026-09-22-stage-d"
RUN_ID="$(date +%Y%m%d_%H%M%S)"
STAGE_D_O2_NAME="${STAGE_D_O2_NAME:-StageD-O2-${RUN_ID}}"
STAGE_D_RUN_ID="${STAGE_D_RUN_ID:-${RUN_ID}}"
LINK_FILE="${ROOT}/.cache/stage-d-s3-link.txt"
MANIFEST="${EVIDENCE_DIR}/org-ca-manifest-${RUN_ID}.json"

export MAESTRO_DRIVER_STARTUP_TIMEOUT="${MAESTRO_DRIVER_STARTUP_TIMEOUT:-90000}"
export MAESTRO_0CLICK_DISABLE=1
export STAGE_D_O2_NAME STAGE_D_RUN_ID
# Maestro ${VAR} expansion is reliable for MAESTRO_* names used elsewhere in this repo.
export MAESTRO_STAGE_D_O2_NAME="${STAGE_D_O2_NAME}"
export MAESTRO_STAGE_D_RUN_ID="${STAGE_D_RUN_ID}"

mkdir -p "${EVIDENCE_DIR}" "${ROOT}/.cache"

echo "=== Stage D org-ca preflight ==="
echo "UDID=${UDID}"
echo "STAGE_D_O2_NAME=${STAGE_D_O2_NAME}"

if ! curl -sf "http://127.0.0.1:8081/status" >/dev/null 2>&1; then
  echo "FAIL: Metro not reachable on :8081 — start Metro (DEV) before org Maestro" >&2
  exit 20
fi

bash "${SIM_LOCK}" claim "${UDID}" --purpose "stage-d-org-ca" || {
  echo "FAIL: could not claim sim ${UDID}" >&2
  exit 21
}
bash "${RESOURCE_LOCK}" claim "user:carol.admina" --purpose "stage-d-org-ca" || {
  bash "${SIM_LOCK}" release "${UDID}" || true
  echo "FAIL: could not claim user:carol.admina" >&2
  exit 22
}

cleanup() {
  bash "${RESOURCE_LOCK}" release "user:carol.admina" || true
  bash "${SIM_LOCK}" release "${UDID}" || true
}
trap cleanup EXIT

SHA="$(git -C "${ROOT}" rev-parse HEAD 2>/dev/null || echo unknown)"
DIRTY=0
if [[ -n "$(git -C "${ROOT}" status --porcelain 2>/dev/null || true)" ]]; then
  DIRTY=1
fi
DIFF_STAT="$(git -C "${ROOT}" diff --stat HEAD 2>/dev/null | tail -1 || true)"
DIFF_HASH="$(git -C "${ROOT}" diff HEAD 2>/dev/null | shasum -a 256 | awk '{print $1}' || echo none)"

FLOW_LOG="${EVIDENCE_DIR}/flows-${RUN_ID}.jsonl"
: > "${FLOW_LOG}"

run_flow() {
  local label="$1"
  local rel="$2"
  echo ""
  echo "=== FLOW ${label}: ${rel} ==="
  if ! bash "${WRAPPER}" test \
    --udid "${UDID}" \
    -e "MAESTRO_STAGE_D_O2_NAME=${STAGE_D_O2_NAME}" \
    -e "MAESTRO_STAGE_D_RUN_ID=${STAGE_D_RUN_ID}" \
    -e "STAGE_D_O2_NAME=${STAGE_D_O2_NAME}" \
    -e "STAGE_D_RUN_ID=${STAGE_D_RUN_ID}" \
    "${FLOW_DIR}/${rel}"; then
    echo "{\"id\":\"${label}\",\"flow\":\"${rel}\",\"ok\":false}" >> "${FLOW_LOG}"
    echo "FAIL: ${label}" >&2
    write_manifest "fail" "${label}"
    exit 30
  fi
  echo "{\"id\":\"${label}\",\"flow\":\"${rel}\",\"ok\":true}" >> "${FLOW_LOG}"
}

write_manifest() {
  local status="$1"
  local failed="${2:-}"
  STAGE_D_STATUS="${status}" STAGE_D_FAILED="${failed}" \
  STAGE_D_MANIFEST="${MANIFEST}" STAGE_D_FLOW_LOG="${FLOW_LOG}" \
  STAGE_D_SHA="${SHA}" STAGE_D_DIRTY="${DIRTY}" \
  STAGE_D_DIFF_STAT="${DIFF_STAT}" STAGE_D_DIFF_HASH="${DIFF_HASH}" \
  STAGE_D_UDID="${UDID}" STAGE_D_RUN_ID="${RUN_ID}" \
  STAGE_D_O2_NAME="${STAGE_D_O2_NAME}" STAGE_D_EVIDENCE="${EVIDENCE_DIR}" \
  python3 - <<'PY'
import json, os, pathlib
status = os.environ["STAGE_D_STATUS"]
failed = os.environ.get("STAGE_D_FAILED") or None
flows = []
log = pathlib.Path(os.environ["STAGE_D_FLOW_LOG"])
if log.exists():
    for line in log.read_text().splitlines():
        line = line.strip()
        if line:
            flows.append(json.loads(line))
pngs = sorted(str(p) for p in pathlib.Path(os.environ["STAGE_D_EVIDENCE"]).rglob("*.png"))
doc = {
    "ok": status == "pass",
    "failedAt": failed,
    "runId": os.environ["STAGE_D_RUN_ID"],
    "udid": os.environ["STAGE_D_UDID"],
    "appSha": os.environ["STAGE_D_SHA"],
    "dirty": os.environ["STAGE_D_DIRTY"] == "1",
    "diffStat": os.environ.get("STAGE_D_DIFF_STAT") or "",
    "diffHash": os.environ.get("STAGE_D_DIFF_HASH") or "",
    "stageDO2Name": os.environ.get("STAGE_D_O2_NAME"),
    "flows": flows,
    "pngFound": pngs,
    "notes": "O1=reachability only; A-D01 Dashboard-only OPEN; S3=real invite handoff",
}
path = pathlib.Path(os.environ["STAGE_D_MANIFEST"])
path.write_text(json.dumps(doc, indent=2) + "\n")
print("MANIFEST", path)
PY
}

run_flow "O1" "O1-ca-shell.yaml"

# Materialize O2 with concrete project name — Maestro ${} expansion is unreliable here.
O2_FLOW_DIR="${ROOT}/.cache/maestro-org-generated"
mkdir -p "${O2_FLOW_DIR}"
# Resolve relative runFlow paths from generated copy.
O2_GEN="${O2_FLOW_DIR}/O2-create-project-member.yaml"
python3 - "$ROOT" "$STAGE_D_O2_NAME" "$O2_GEN" <<'PY'
import sys
from pathlib import Path
root, name, out = Path(sys.argv[1]), sys.argv[2], Path(sys.argv[3])
src = (root / "maestro/flows/org/O2-create-project-member.yaml").read_text()
src = src.replace("runFlow: O1-ca-shell.yaml", f"runFlow: {root}/maestro/flows/org/O1-ca-shell.yaml")
src = src.replace("${MAESTRO_STAGE_D_O2_NAME}", name)
src = src.replace("${STAGE_D_O2_NAME}", name)
out.write_text(src)
print("generated", out, "name", name)
PY
echo "=== FLOW O2: generated ${O2_GEN} ==="
if ! bash "${WRAPPER}" test \
  --udid "${UDID}" \
  -e "MAESTRO_STAGE_D_O2_NAME=${STAGE_D_O2_NAME}" \
  "${O2_GEN}"; then
  echo "{\"id\":\"O2\",\"flow\":\"O2-create-project-member.yaml\",\"ok\":false}" >> "${FLOW_LOG}"
  echo "FAIL: O2" >&2
  write_manifest "fail" "O2"
  exit 30
fi
echo "{\"id\":\"O2\",\"flow\":\"O2-create-project-member.yaml\",\"ok\":true}" >> "${FLOW_LOG}"

echo "=== O2 DB readback ==="
if ! STAGE_D_O2_NAME="${STAGE_D_O2_NAME}" node "${ROOT}/scripts/maestro/org-o2-db-readback.cjs"; then
  write_manifest "fail" "O2-readback"
  exit 31
fi

run_flow "O3" "O3-invite-validation.yaml"
run_flow "S2" "S2-logout-relogin.yaml"

echo "=== S3 mint invite link ==="
node "${ROOT}/scripts/maestro/org-s3-mint-invite-link.cjs" --out "${LINK_FILE}"
LINK="$(tr -d '\n' < "${LINK_FILE}")"
if [[ -z "${LINK}" ]]; then
  echo "FAIL: empty S3 link" >&2
  write_manifest "fail" "S3-mint"
  exit 32
fi
if [[ "${LINK}" != taskr://auth/invite/* ]]; then
  echo "FAIL: S3 link must be taskr://auth/invite/… (got prefix ${LINK:0:40})" >&2
  write_manifest "fail" "S3-link-scheme"
  exit 34
fi
# Bring app forward before deep link (Safari may still be up from prior HTTPS opens).
xcrun simctl terminate "${UDID}" com.buildtrack.app.local >/dev/null 2>&1 || true
sleep 1
xcrun simctl launch "${UDID}" com.buildtrack.app.local >/dev/null 2>&1 || true
sleep 2
echo "Opening invite link on sim ${UDID}…"
xcrun simctl openurl "${UDID}" "${LINK}" || {
  echo "FAIL: simctl openurl" >&2
  write_manifest "fail" "S3-openurl"
  exit 33
}
sleep 6
run_flow "S3" "S3-set-password.yaml"

write_manifest "pass" ""
echo "=== Stage D org-ca PASS ==="
echo "Read PNGs before claiming rc=0 (Gate 0–8). Manifest: ${MANIFEST}"
