#!/bin/bash
# Simplified stale-home check — avoid find across 86GB (slow). Use only fast stats.
set -u
S="/Users/tristan"
A="/Volumes/KooDrive/Users/tristan"

CANON=$(dscl . read /Users/tristan NFSHomeDirectory 2>/dev/null | awk '{print $NF}')
echo "0. Canonical home via dscl  = $CANON"
echo "   Stale SSD home: $S  dev=$(stat -f '%d' "$S") size=$(du -sh "$S" | awk '{print $1}')"
echo "   Active KooDrive: $A dev=$(stat -f '%d' "$A") size=$(du -sh "$A" | awk '{print $1}')"
echo
echo "1. mtime on key identity files (stale vs active):"
for f in .zsh_history .bash_history .zshrc .ssh/id_ed25519 .ssh/id_rsa .gitconfig .trae .cursor "Library/Preferences/com.trae.plist"; do
  [ -e "$S/$f" ] && printf '  stale  %-35s %s\n' "$f" "$(stat -f '%Sm' -t '%Y-%m-%d %H:%M' "$S/$f")"
  [ -e "$A/$f" ] && printf '  active %-35s %s\n' "$f" "$(stat -f '%Sm' -t '%Y-%m-%d %H:%M' "$A/$f")"
  [ -e "$S/$f" ] && [ -e "$A/$f" ] && echo
done
echo
echo "2. lsof files open in stale home (sudo prompt once):"
c=$(sudo lsof +D "$S" 2>/dev/null | wc -l | tr -d ' ')
echo "   count=$c"
[ "$c" != "0" ] && sudo lsof +D "$S" 2>/dev/null | head -30
echo
echo "3. Latest mtime in 3 subdirs of stale home (fast mtime approximation, no full scan):"
for sub in Library .android .gradle .npm .cursor .trae Dev Projects; do
  [ -e "$S/$sub" ] || continue
  latest=$(find "$S/$sub" -xdev -depth 2 -type f -print0 2>/dev/null | xargs -0 stat -f '%m' 2>/dev/null | sort -rn | head -n1)
  if [ -n "$latest" ]; then
    days=$(( ($(date +%s) - latest) / 86400 ))
    printf '  %-20s latest_write=%s days ago\n' "$S/$sub" "$days"
  else
    printf '  %-20s (no files found at depth 2)\n' "$S/$sub"
  fi
done
echo
echo "4. SHA256 of identity files (stale vs active):"
for f in .gitconfig .zshrc .zsh_history .bash_history .ssh/known_hosts .ssh/config "Library/Preferences/com.trae.plist"; do
  sf="$S/$f"; af="$A/$f"
  if [ -f "$sf" ] && [ -f "$af" ]; then
    s=$(shasum -a 256 "$sf" | awk '{print $1}'); a=$(shasum -a 256 "$af" | awk '{print $1}')
    [ "$s" = "$a" ] && tag=MATCH || tag="DIFF (s=${s:0:10} a=${a:0:10})"
    printf '  %-35s %s\n' "$f" "$tag"
  elif [ -f "$sf" ]; then printf '  %-35s EXISTS ONLY IN STALE\n' "$f"
  elif [ -f "$af" ]; then printf '  %-35s EXISTS ONLY IN ACTIVE\n' "$f"
  fi
done
echo
echo "5. TRAE/Cursor profile sizes:"
for sub in .trae "Library/Application Support/Trae" .cursor "Library/Application Support/Cursor"; do
  ssz=$([ -e "$S/$sub" ] && du -sh "$S/$sub" | awk '{print $1}' || echo "-")
  asz=$([ -e "$A/$sub" ] && du -sh "$A/$sub" | awk '{print $1}' || echo "-")
  printf '  %-40s stale=%-6s active=%-6s\n' "$sub" "$ssz" "$asz"
done
echo
echo "6. Verdict:"
if [ "$CANON" = "$A" ]; then echo "   ✓ dscl = ACTIVE (KooDrive)"; else echo "   ❌ dscl = stale. DO NOT DELETE."; fi
if [ "$c" = "0" ]; then echo "   ✓ No processes have stale files open"; else echo "   ❌ Processes have stale home files open ($c lines). Do not move."; fi
echo "   If verdict OK: run bash scripts/sys/reclaim-internal-ssd.sh --apply --i-know-stale-home"
