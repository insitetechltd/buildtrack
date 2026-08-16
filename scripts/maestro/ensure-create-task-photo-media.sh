#!/usr/bin/env bash
# Ensure iOS Simulator Photos has exactly the Create Task photo fixtures (photo-1..N).
# - If all fixture digests are present AND library size == NEED → reuse (no addMedia).
# - Otherwise purge DCIM + PhotoData, reboot sim (required for Photos to accept imports), seed once.
#
# Usage:
#   bash scripts/maestro/ensure-create-task-photo-media.sh
#   MAESTRO_UDID=... NEED=3 bash scripts/maestro/ensure-create-task-photo-media.sh
#   FORCE_PURGE=1 bash scripts/maestro/ensure-create-task-photo-media.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
UDID="${MAESTRO_UDID:-B7B2640C-4738-4F8A-AEEE-5DF3D21D2533}"
NEED="${NEED:-3}"
ASSETS="${ROOT}/maestro/flows/assets"
FORCE_PURGE="${FORCE_PURGE:-0}"
MAX_EXTRAS="${MAX_EXTRAS:-0}"

resolve_media_root() {
  local candidates=(
    "${HOME}/Library/Developer/CoreSimulator/Devices/${UDID}/data/Media"
    "/Volumes/KooDrive/Users/tristan/Library/Developer/CoreSimulator/Devices/${UDID}/data/Media"
    "/Volumes/KooDrive/tristan-xocde-library/CoreSimulator/Devices/${UDID}/data/Media"
  )
  local c
  for c in "${candidates[@]}"; do
    if [[ -d "${c}" ]]; then
      echo "${c}"
      return 0
    fi
  done
  # Default path even if missing (mkdir later after purge)
  echo "${HOME}/Library/Developer/CoreSimulator/Devices/${UDID}/data/Media"
}

MEDIA_ROOT="$(resolve_media_root)"

FIXTURES=()
for i in $(seq 1 "${NEED}"); do
  f="${ASSETS}/photo-${i}.png"
  if [[ ! -f "${f}" ]]; then
    echo "FAIL: missing fixture ${f}"
    exit 2
  fi
  FIXTURES+=("${f}")
done

digest() {
  if command -v shasum >/dev/null 2>&1; then
    shasum -a 256 "$1" | awk '{print $1}'
  else
    md5 -q "$1"
  fi
}

declare -a WANT_DIGESTS=()
for f in "${FIXTURES[@]}"; do
  WANT_DIGESTS+=("$(digest "${f}")")
done

count_dcim_images() {
  if [[ ! -d "${MEDIA_ROOT}/DCIM" ]]; then
    echo 0
    return
  fi
  find "${MEDIA_ROOT}/DCIM" -type f \( -iname '*.png' -o -iname '*.jpg' -o -iname '*.jpeg' -o -iname '*.heic' \) 2>/dev/null | wc -l | tr -d ' '
}

# Count how many of the NEED fixture digests appear at least once (unique).
count_unique_fixture_hits() {
  local hits=0
  local want f d found
  if [[ ! -d "${MEDIA_ROOT}/DCIM" ]]; then
    echo 0
    return
  fi
  for want in "${WANT_DIGESTS[@]}"; do
    found=0
    while IFS= read -r f; do
      [[ -z "${f}" ]] && continue
      d="$(digest "${f}")"
      if [[ "${d}" == "${want}" ]]; then
        found=1
        break
      fi
    done < <(find "${MEDIA_ROOT}/DCIM" -type f \( -iname '*.png' -o -iname '*.jpg' -o -iname '*.jpeg' -o -iname '*.heic' \) 2>/dev/null)
    if [[ "${found}" -eq 1 ]]; then
      hits=$((hits + 1))
    fi
  done
  echo "${hits}"
}

wait_booted() {
  local i
  for i in $(seq 1 60); do
    if xcrun simctl list devices | grep "${UDID}" | grep -q "(Booted)"; then
      # give Photos stack a moment after boot
      sleep 2
      return 0
    fi
    sleep 1
  done
  echo "FAIL: simulator ${UDID} did not boot"
  exit 4
}

TOTAL="$(count_dcim_images)"
UNIQUE="$(count_unique_fixture_hits)"

echo "ensure-create-task-photo-media: udid=${UDID}"
echo "  media=${MEDIA_ROOT}"
echo "  need=${NEED} unique_fixtures=${UNIQUE} dcim_total=${TOTAL} force_purge=${FORCE_PURGE}"

# REUSE only when library is exact: every fixture once, no extras, no duplicates.
if [[ "${FORCE_PURGE}" != "1" && "${UNIQUE}" -eq "${NEED}" && "${TOTAL}" -eq "${NEED}" ]]; then
  echo "  REUSE: library already has exactly ${NEED} distinct fixtures (total=${TOTAL})"
  exit 0
fi

echo "  PURGE+SEED: shutdown → clear DCIM/PhotoData → boot → addmedia ${NEED}"

xcrun simctl terminate "${UDID}" com.buildtrack.app.local >/dev/null 2>&1 || true
xcrun simctl shutdown "${UDID}" >/dev/null 2>&1 || true

# Wait until not booted
for _ in $(seq 1 40); do
  if ! xcrun simctl list devices | grep "${UDID}" | grep -q "(Booted)"; then
    break
  fi
  sleep 1
done
# If still Booted (another job holding it), fail loudly rather than half-purge
if xcrun simctl list devices | grep "${UDID}" | grep -q "(Booted)"; then
  echo "FAIL: could not shutdown ${UDID} (still Booted) — stop Maestro on this UDID and retry"
  exit 5
fi

rm -rf "${MEDIA_ROOT}/DCIM" "${MEDIA_ROOT}/PhotoData"
mkdir -p "${MEDIA_ROOT}/DCIM/100APPLE"

xcrun simctl boot "${UDID}"
wait_booted

set +e
xcrun simctl addmedia "${UDID}" "${FIXTURES[@]}"
ADD_RC=$?
set -e
if [[ "${ADD_RC}" -ne 0 ]]; then
  echo "WARN: addmedia rc=${ADD_RC}; retry once after short wait"
  sleep 3
  xcrun simctl addmedia "${UDID}" "${FIXTURES[@]}"
fi

TOTAL2="$(count_dcim_images)"
UNIQUE2="$(count_unique_fixture_hits)"
echo "  after seed: unique_fixtures=${UNIQUE2} dcim_total=${TOTAL2}"
if [[ "${UNIQUE2}" -ne "${NEED}" || "${TOTAL2}" -ne "${NEED}" ]]; then
  echo "FAIL: expected exact ${NEED} unique fixtures and ${NEED} files after addmedia (unique=${UNIQUE2} total=${TOTAL2})"
  exit 3
fi
echo "  OK"
exit 0
