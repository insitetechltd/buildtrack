#!/bin/bash
# scripts/sys/move-trae-to-new-external.sh — Migrate the ENTIRE TRAE + Cursor + HOME +
# InsiteApp working stack from the current external (KooDrive / disk7s1, 2TB APFS) to a
# LARGER / DIFFERENT external drive that you will plug in. This is Track A: explicit move
# to another external (not the SSD reclaim in reclaim-internal-ssd.sh = Track B).
#
# You MUST edit TARGET_DRIVE below BEFORE running.
#
# Flow:
#   1. Quit TRAE and Cursor FIRST (we refuse to move running apps).
#   2. Plug in the destination drive, format it APFS case-insensitive (GUID).
#   3. Edit TARGET_DRIVE.
#   4. DRY RUN:    bash scripts/sys/move-trae-to-new-external.sh
#   5. EXECUTE:    bash scripts/sys/move-trae-to-new-external.sh --apply
#   6. POST:       Manually re-import repo from new location; login to apps;
#                  when stable, delete old /Volumes/KooDrive copies AFTER backup.
#
# Rollback: nothing is deleted on the SOURCE drive until you manually delete it.
# This script is COPY-THEN-SYMLINK; source remains untouched until step 6.

set -euo pipefail

# ==========================================================
# EDIT ME  (everything else auto-computes)
# ==========================================================
TARGET_DRIVE="/Volumes/REPLACE_ME_WITH_NEW_DRIVE_NAME"   # e.g. /Volumes/BigDrive2026
# ==========================================================

APPLY=0
for a in "$@"; do case "$a" in --apply) APPLY=1;; -h|--help) sed -n '1,30p' "$0"; exit 0;; esac; done

log()  { echo "[$(date '+%H:%M:%S')] $*"; }
die()  { echo "ERR:  $*" >&2; exit 1; }
warn() { echo "WARN: $*" >&2; }

[ "$TARGET_DRIVE" != "/Volumes/REPLACE_ME_WITH_NEW_DRIVE_NAME" ] \
  || die "Edit TARGET_DRIVE in this script first. Then re-run."
[ -d "$TARGET_DRIVE" ] || die "Target drive not mounted: $TARGET_DRIVE — plug it in first."

SRC_ROOT="/Volumes/KooDrive"
DST_ROOT="$TARGET_DRIVE"
SRC_HOME="/Volumes/KooDrive/Users/tristan"
DST_HOME="$DST_ROOT/Users/tristan"

# Refuse to run if TRAE or Cursor alive (they keep files open)
for proc in "Trae" "Cursor" "Electron"; do
  if pgrep -x "$proc" >/dev/null 2>&1; then
    die "KILL running $proc first (pkill -x $proc). Refusing to move a live app."
  fi
done

# Sanity checks on target
if [ "$SRC_ROOT" = "$(stat -f '%d' "$SRC_ROOT")" = "$(stat -f '%d' "$DST_ROOT")" ] 2>/dev/null ||
   [ "$SRC_ROOT" -ef "$DST_ROOT" ]; then
  die "Source and target are the same filesystem. Nothing to do."
fi

# Compute expected freespace needed
log "Estimating size to copy (this can take 10-60s)…"
NEED_KB=$(du -sk "$SRC_HOME" "$SRC_ROOT/Applications/Trae.app" "$SRC_ROOT/Applications/Cursor.app" "$SRC_ROOT/InsiteApp" 2>/dev/null \
          | awk '{s+=$1} END {printf "%.0f", s}')
NEED_GB=$(awk "BEGIN {printf \"%.1f\", $NEED_KB / 1024 / 1024}")
FREE_KB=$(df -k "$DST_ROOT" | awk 'NR==2 {print $4}')
FREE_GB=$(awk "BEGIN {printf \"%.1f\", $FREE_KB / 1024 / 1024}")
log "Need ~$NEED_GB GB on target. Target has ~$FREE_GB GB free."
if [ "$FREE_KB" -lt "$(( NEED_KB * 110 / 100 ))" ]; then
  die "Target too small. (Needs 10% headroom above $NEED_GB GB.)"
fi

# Copy plan (rsync for restartability; we never delete source)
PAIRS=(
  "$SRC_ROOT/Applications/Trae.app"             "$DST_ROOT/Applications/Trae.app"
  "$SRC_ROOT/Applications/Cursor.app"           "$DST_ROOT/Applications/Cursor.app"
  "$SRC_HOME/.trae"                             "$DST_HOME/.trae"
  "$SRC_HOME/.cursor"                           "$DST_HOME/.cursor"
  "$SRC_HOME/Library/Application Support/Trae"   "$DST_HOME/Library/Application Support/Trae"
  "$SRC_HOME/Library/Application Support/Cursor" "$DST_HOME/Library/Application Support/Cursor"
  "$SRC_ROOT/InsiteApp"                         "$DST_ROOT/InsiteApp"
)

copy_one() {
  local s="$1" d="$2"
  [ -e "$s" ] || { log "SKIP (missing) $s"; return 0; }
  mkdir -p "$(dirname "$d")"
  log "rsync  $s  ->  $d"
  local RSYNC_FLAGS="-aNHAXxv"     # APFS-friendly: preserve xattrs, ACLs, hardlinks, no cross-fs, verbose
  [ "$APPLY" = "1" ] || RSYNC_FLAGS="-anNHAXxv"
  # shellcheck disable=SC2086
  rsync $RSYNC_FLAGS \
    --exclude='node_modules/.cache' \
    --exclude='*/.git/objects/pack/*.old' \
    --exclude='.cache/maestro-home' \
    --exclude='.expo' \
    "$s/" "$d/" \
    2>&1 | tail -20
}

# Step 1: copy
total=${#PAIRS[@]}
i=0
while [ "$i" -lt "$total" ]; do
  s="${PAIRS[$i]}"; d="${PAIRS[$((i+1))]}"; i=$((i+2))
  copy_one "$s" "$d"
done

# Step 2: post-copy verification (size check)
if [ "$APPLY" = "1" ]; then
  log "=== Verifying sizes ==="
  i=0
  while [ "$i" -lt "$total" ]; do
    s="${PAIRS[$i]}"; d="${PAIRS[$((i+1))]}"; i=$((i+2))
    [ -e "$s" ] || continue
    SZ_S=$(du -sk "$s" | awk '{print $1}')
    SZ_D=$(du -sk "$d" | awk '{print $1}')
    PCT=$(awk "BEGIN {d=($SZ_S - $SZ_D)/$SZ_S; print (d<0?-d:d)*100}")
    STATUS="OK"
    awk "BEGIN {exit !(($PCT+0) > 0.5)}" && STATUS="DIFF ${PCT}%"
    printf '  %-7s %s  src=%sKB dst=%sKB\n' "$STATUS" "$d" "$SZ_S" "$SZ_D"
  done
fi

echo
echo "=== FINAL INSTRUCTIONS ==="
echo "1. Launch TRAE / Cursor from: $DST_ROOT/Applications/"
echo "2. Open the repo at:  $DST_ROOT/InsiteApp"
echo "3. Re-run 'npm install' inside the NEW repo so binaries re-resolve."
echo "4. If everything works and you've made a backup, you may safely DELETE the old:"
echo "     $SRC_ROOT/Applications/Trae.app"
echo "     $SRC_ROOT/Applications/Cursor.app"
echo "     $SRC_HOME/.trae  $SRC_HOME/.cursor"
echo "     $SRC_HOME/Library/Application Support/Trae"
echo "     $SRC_HOME/Library/Application Support/Cursor"
echo "     $SRC_ROOT/InsiteApp"
echo "   DO NOT delete these until the new drive has run a full build + tests."
[ "$APPLY" = "0" ] && echo "(This was a DRY RUN — nothing actually copied. Re-run with --apply to copy.)"
