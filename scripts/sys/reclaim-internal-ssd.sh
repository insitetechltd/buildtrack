#!/bin/bash
# scripts/sys/reclaim-internal-ssd.sh — Move large directories OFF the 97%-full internal
# 245GB Apple SSD (device disk3s5, ~7.8GB free) onto the KooDrive 2TB APFS external
# (disk7s1, 732GB free) using safe APFS-preserving copies + UNIX symlinks back.
#
# What we target (discovered via /tmp/find-internal-hogs.sh):
#   86 GB  /Users/tristan                    ← STALE ghost home (old pre-KooDrive SSD home;
#                                             dscl confirms canonical login home is
#                                             /Volumes/KooDrive/Users/tristan).  DANGER —
#                                             requires explicit --i-know-stale-home flag.
#   94 GB  /Library/Developer/CoreSimulator  ← GLOBAL Xcode simulator runtime volumes +
#                                             dyld caches (75 GB Volumes + 20 GB dyld).
#                                             Safe to symlink; Xcode follows.
#   44 GB  /System/Library/AssetsV2/…        ← SIP-protected mount; instead we target the
#                                             USER-LIBRARY copies that du-internal scan
#                                             showed under /Users/*/Library/Developer if
#                                             present.
#   1.8 GB /Library/Updates                  ← macOS downloaded installers, safe to rm.
#   3.0 GB /private/tmp/maestro-tmp-home     ← Maestro E2E artifact dir, safe to rm.
#
# Usage:
#   DRY RUN (SAFE):  bash scripts/sys/reclaim-internal-ssd.sh
#   ACTUAL (safe) :  bash scripts/sys/reclaim-internal-ssd.sh --apply
#   ACTUAL (stale home — VERY DANGEROUS, double-check first):
#                     bash scripts/sys/reclaim-internal-ssd.sh --apply --i-know-stale-home
#   ROLLBACK move  :  bash scripts/sys/reclaim-internal-ssd.sh --rollback [--i-know-stale-home]
#
# Rollback: copies files BACK from KooDrive SSDOffload, deletes the symlink, then lets you
# manually delete the SSDOffload copy once you've confirmed everything works.

set -euo pipefail

# -------- flags --------
APPLY=0
ROLLBACK=0
I_KNOW_STALE_HOME=0
for a in "$@"; do
  case "$a" in
    --apply)               APPLY=1;;
    --rollback)            ROLLBACK=1;;
    --i-know-stale-home)   I_KNOW_STALE_HOME=1;;
    -h|--help)
      sed -n '1,40p' "$0"; exit 0;;
    *) echo "Unknown arg: $a"; exit 2;;
  esac
done

INTERNAL_DEV=$(stat -f '%d' /System/Volumes/Data)
KOODRIVE_DEV=$(stat -f '%d' /Volumes/KooDrive)
KOODRIVE_OFFLOAD="/Volumes/KooDrive/SSDOffload"
STAMP=$(date +%Y%m%d_%H%M%S)
LOG="$KOODRIVE_OFFLOAD/reclaim-ssd-$STAMP.log"
MANIFEST="$KOODRIVE_OFFLOAD/reclaim-ssd-$STAMP.manifest"

log()  { echo "[$(date '+%H:%M:%S')] $*" | tee -a "$LOG"; }
warn() { echo "WARN: $*" >&2 | tee -a "$LOG"; }
die()  { echo "ERR:  $*" >&2 | tee -a "$LOG"; exit 1; }

[ "$INTERNAL_DEV" != "$KOODRIVE_DEV" ] || die "Internal and KooDrive same fs — nothing to do."
mkdir -p "$KOODRIVE_OFFLOAD"
: > "$LOG"; : > "$MANIFEST"
log "INTERNAL_DEV=$INTERNAL_DEV ; KOODRIVE_DEV=$KOODRIVE_DEV"
log "Mode: APPLY=$APPLY  ROLLBACK=$ROLLBACK  I_KNOW_STALE_HOME=$I_KNOW_STALE_HOME"

# Sanity check: canonical home really IS KooDrive, so /Users/tristan on SSD is stale.
CANON_HOME=$(dscl . read /Users/tristan NFSHomeDirectory 2>/dev/null | awk '{print $NF}')
if [ "$CANON_HOME" = "/Volumes/KooDrive/Users/tristan" ]; then
  log "✓ dscl confirms login home is on KooDrive. /Users/tristan on SSD is STALE."
  if [ "$I_KNOW_STALE_HOME" = "1" ]; then
    log "  --i-know-stale-home given: will relocate stale /Users/tristan too."
  else
    warn "Skipping stale /Users/tristan (86GB!). Run with --i-know-stale-home after you have audited it with scripts/sys/stale-home-check.sh."
  fi
elif [ "$CANON_HOME" = "/Users/tristan" ]; then
  die "dscl says login home IS /Users/tristan on SSD. Refusing to touch it. Abort."
else
  die "Unexpected dscl home: $CANON_HOME. Refuse to guess."
fi

# -------- helpers --------
plan_move() {   # src dest-dir-in-offload  (echoes MANIFEST line if actionable)
  local src="$1" dest="$2"
  [ -e "$src" ] || { log "SKIP (missing)               $src"; return 0; }
  [ -L "$src" ] && { log "SKIP (already symlinked)     $src -> $(readlink "$src")"; return 0; }
  local src_dev
  src_dev=$(stat -f '%d' "$src")
  if [ "$src_dev" = "$KOODRIVE_DEV" ]; then
    log "SKIP (already on KooDrive)    $src"; return 0
  elif [ "$src_dev" != "$INTERNAL_DEV" ]; then
    log "SKIP (unknown dev $src_dev)   $src"; return 0
  fi
  local sz
  sz=$(du -sh "$src" 2>/dev/null | awk '{print $1}')
  log "PLAN ($sz) move $src -> $KOODRIVE_OFFLOAD/$dest"
  echo "$src|$KOODRIVE_OFFLOAD/$dest" >> "$MANIFEST"
  if [ "$APPLY" = "1" ]; then
    apply_move "$src" "$KOODRIVE_OFFLOAD/$dest"
  fi
}

apply_move() {  # src dest (src on internal, dest under SSDOffload — ditto preserves APFS xattrs)
  local src="$1" dest="$2"
  if [ -e "$dest" ]; then
    die "Destination collision: $dest exists. Check manifests then delete manually."
  fi
  log "  [APPLY] ditto $src  ->  $dest"
  # Sudo needed for GLOBAL /Library paths; harmless for user-owned.
  if [ -w "$(dirname "$src")" ] && [ -w "$src" ]; then
    ditto "$src" "$dest"
  else
    log "    (needs sudo — global root-owned dir such as /Library/Developer)"
    sudo ditto "$src" "$dest"
  fi
  # 0.5%-tolerance size check.
  local a b diff
  a=$(du -sk "$src"  | awk '{print $1}')
  b=$(du -sk "$dest" | awk '{print $1}')
  diff=$(( a - b )); diff=${diff#-}
  [ "$diff" -le $(( a / 200 + 512 )) ] \
    || die "ditto size mismatch (src=$a KB dest=$b KB tolerance=$((a/200+512)) KB). Abort."

  # Replace src with symlink.
  log "    [APPLY] replace $src with symlink"
  if [ -w "$(dirname "$src")" ]; then
    rm -rf "$src"
    ln -s "$dest" "$src"
  else
    sudo rm -rf "$src"
    sudo ln -s "$dest" "$src"
  fi
  [ -d "$src" ] || die "Symlink broken after move: $src"
  log "    OK: $src -> $(readlink "$src")"
}

rollback_one() {  # src dest
  local src="$1" dest="$2"
  [ -L "$src" ] || { log "ROLLBACK SKIP (not symlink) $src"; return 0; }
  local tgt
  tgt=$(readlink "$src")
  if [ "$tgt" != "$dest" ]; then
    warn "ROLLBACK SKIP: $src points to $tgt (expected $dest). Not touching."; return 0
  fi
  log "ROLLBACK $src <- $dest"
  if [ "$APPLY" = "1" ]; then
    local parent_writable=1
    [ -w "$(dirname "$src")" ] || parent_writable=0
    if [ "$parent_writable" = "1" ]; then rm -f "$src"; else sudo rm -f "$src"; fi
    if [ "$parent_writable" = "1" ]; then ditto "$dest" "$src"; else sudo ditto "$dest" "$src"; fi
    local a b diff
    a=$(du -sk "$dest" | awk '{print $1}')
    b=$(du -sk "$src"  | awk '{print $1}')
    diff=$(( a - b )); diff=${diff#-}
    [ "$diff" -le $(( a / 200 + 512 )) ] \
      || die "rollback ditto mismatch (dest=$a src=$b)."
    log "ROLLBACK OK. SSDOffload copy preserved at $dest — DELETE manually after testing."
  fi
}

# -------- Candidates: correct list from the actual /System/Volumes/Data hog scan --------
# Format per line: <src-path> <offload-subdir-name>
candidates=(
  # --- #1 GLOBAL SIMULATOR STACK (~94GB, root-owned, Xcode follows symlinks fine) ---
  "/Library/Developer/CoreSimulator"                 "Global-Library-Developer-CoreSimulator"

  # --- #2 Simulator dyld cache under /Library/Developer (if separate) ---
  "/Library/Developer/CoreSimulator/Caches"           "Global-Library-Developer-CoreSimulator-Caches"

  # --- #3 STALE HOME (~86GB on SSD). Gated behind --i-know-stale-home. ---
)

# Conditionally append stale home (only if user explicitly opted in, and it's actually stale).
# We APPEND as pair.
if [ "$I_KNOW_STALE_HOME" = "1" ] && [ "$CANON_HOME" = "/Volumes/KooDrive/Users/tristan" ]; then
  candidates+=(
    "/Users/tristan"  "Stale-Users-tristan-INTERNAL-SSD"
  )
fi

# Also add a few low-risk caches we know exist on internal SSD.
candidates+=(
  "/private/tmp/maestro-tmp-home"                    "MaestroTmpHome"
)

# -------- main --------
total=${#candidates[@]}
if [ "$ROLLBACK" = "1" ]; then
  LATEST=$(ls -1t "$KOODRIVE_OFFLOAD"/reclaim-ssd-*.manifest 2>/dev/null | head -n1 || true)
  [ -n "$LATEST" ] || die "No manifest found under $KOODRIVE_OFFLOAD — nothing to roll back."
  log "Rolling back via manifest: $LATEST"
  log "  (dry-run unless you also pass --apply)"
  while IFS='|' read -r src dest; do
    [ -z "$src" ] && continue
    rollback_one "$src" "$dest"
  done < "$LATEST"
else
  log "=== PLAN ==="
  i=0
  while [ "$i" -lt "$total" ]; do
    src="${candidates[$i]}"; dest="${candidates[$((i+1))]}"; i=$((i+2))
    plan_move "$src" "$dest"
  done

  # --- independent deletes (no rollback needed) ---
  log ""
  log "=== SAFE DELETES (no offload needed; rm directly; dry-run unless --apply) ==="
  safe_delete=(
    "/Library/Updates/*"
  )
  for pat in "${safe_delete[@]}"; do
    match_count=$(eval "ls -1d $pat 2>/dev/null | wc -l | tr -d ' '")
    match_sz=$(eval "du -shc $pat 2>/dev/null | tail -1 | awk '{print \$1}'")
    log "  PLAN rm $pat ($match_count files/dirs, $match_sz)"
    if [ "$APPLY" = "1" ]; then
      if [ -w "$(dirname "$pat")" ]; then
        eval "rm -rf $pat"
      else
        eval "sudo rm -rf $pat"
      fi
    fi
  done
fi

echo
log "=== DONE. Manifest = $MANIFEST"
log "    Log      = $LOG"
echo
echo "=== Capacity report ==="
df -Hl | awk 'NR==1 || $0 ~ /\/Volumes\/KooDrive/ || $0 ~ /\/System\/Volumes\/Data/'
