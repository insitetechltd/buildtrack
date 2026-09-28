#!/usr/bin/env bash
# Stage store JPGs into Deliver's screenshots tree (resolution-detected devices).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SRC_IPHONE="$ROOT/docs/taskr/assets/store/iphone-67"
SRC_IPAD="$ROOT/docs/taskr/assets/store/ipad-13"
OUT="${ASC_SCREENSHOTS_PATH:-$ROOT/.cache/asc-deliver/screenshots}"

need() {
  local f="$1"
  [[ -f "$f" ]] || { echo "Missing screenshot: $f" >&2; exit 1; }
}

for f in 01-activity.jpg 02-camera.jpg 03-tasks.jpg 04-task-thread.jpg; do
  need "$SRC_IPHONE/$f"
  need "$SRC_IPAD/$f"
done

rm -rf "$OUT"
# Same store set for en-US + zh-Hant (ASC requires per-locale slots when locale is enabled).
for loc in en-US zh-Hant; do
  mkdir -p "$OUT/$loc"
  # Prefix sorts upload order; Deliver maps device by pixel size (1320×2868 / 2064×2752).
  cp "$SRC_IPHONE/01-activity.jpg"     "$OUT/$loc/01_iphone67_activity.jpg"
  cp "$SRC_IPHONE/02-camera.jpg"       "$OUT/$loc/02_iphone67_camera.jpg"
  cp "$SRC_IPHONE/03-tasks.jpg"        "$OUT/$loc/03_iphone67_tasks.jpg"
  cp "$SRC_IPHONE/04-task-thread.jpg"  "$OUT/$loc/04_iphone67_task_thread.jpg"
  cp "$SRC_IPAD/01-activity.jpg"       "$OUT/$loc/05_ipad13_activity.jpg"
  cp "$SRC_IPAD/02-camera.jpg"         "$OUT/$loc/06_ipad13_camera.jpg"
  cp "$SRC_IPAD/03-tasks.jpg"          "$OUT/$loc/07_ipad13_tasks.jpg"
  cp "$SRC_IPAD/04-task-thread.jpg"    "$OUT/$loc/08_ipad13_task_thread.jpg"
done

echo "Staged screenshots → $OUT"
find "$OUT" -type f | sort
