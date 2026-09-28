#!/usr/bin/env bash
# S4 — Release IPA bake identity (PROD ref present; DEV ref absent).
# Scans Hermes bytecode via `strings` (Expo SDK 54 default).
#
# Usage:
#   bash scripts/eas/assert-ipa-prod-bake.sh <path-to.ipa>
#   bash scripts/eas/assert-ipa-prod-bake.sh --latest
#   bash scripts/eas/assert-ipa-prod-bake.sh --self-test
#
# Exit 0 only when identity checks pass. Prints JSON summary on stdout.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PROD_REF="${PROD_PROJECT_REF:-jcnzjigxgkzhjsaekoqz}"
DEV_REF="${DEV_PROJECT_REF:-zusulknbhaumougqckec}"
EXPECTED_BUNDLE_ID="${ASSERT_IPA_BUNDLE_ID:-com.buildtrack.app.local}"

die() {
  echo "FAIL: $*" >&2
  exit 1
}

fail() {
  echo "FAIL: $*" >&2
  return 1
}

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "missing command: $1"
}

extract_and_assert() {
  local ipa="$1"
  local label="${2:-ipa}"
  [[ -f "$ipa" ]] || fail "$label not found: $ipa" || return 1

  need_cmd unzip
  need_cmd plutil
  need_cmd strings
  need_cmd shasum

  local tmp
  tmp="$(mktemp -d "${TMPDIR:-/tmp}/assert-ipa-bake.XXXXXX")"

  if ! unzip -q -d "$tmp" "$ipa" "Payload/*.app/Info.plist" "Payload/*.app/main.jsbundle"; then
    rm -rf "$tmp"
    fail "$label: failed to extract Info.plist / main.jsbundle" || return 1
  fi

  local app_dir
  app_dir="$(find "$tmp/Payload" -maxdepth 1 -type d -name '*.app' | head -1)"
  if [[ -z "$app_dir" || ! -f "$app_dir/Info.plist" || ! -f "$app_dir/main.jsbundle" ]]; then
    rm -rf "$tmp"
    fail "$label: missing Payload/*.app Info.plist or main.jsbundle" || return 1
  fi

  local bundle_id version build
  bundle_id="$(plutil -extract CFBundleIdentifier raw -o - "$app_dir/Info.plist" 2>/dev/null || true)"
  version="$(plutil -extract CFBundleShortVersionString raw -o - "$app_dir/Info.plist" 2>/dev/null || true)"
  build="$(plutil -extract CFBundleVersion raw -o - "$app_dir/Info.plist" 2>/dev/null || true)"

  if [[ "$bundle_id" != "$EXPECTED_BUNDLE_ID" ]]; then
    rm -rf "$tmp"
    fail "$label: CFBundleIdentifier='$bundle_id' expected '$EXPECTED_BUNDLE_ID'" || return 1
  fi
  if [[ -z "$build" ]]; then
    rm -rf "$tmp"
    fail "$label: missing CFBundleVersion" || return 1
  fi

  local hosts prod_hits dev_hits
  hosts="$(strings -a "$app_dir/main.jsbundle" | grep -E -o "https://[a-z0-9]+\\.supabase\\.co|${PROD_REF}|${DEV_REF}" | sort -u || true)"
  prod_hits="$(printf '%s\n' "$hosts" | grep -c "$PROD_REF" || true)"
  dev_hits="$(printf '%s\n' "$hosts" | grep -c "$DEV_REF" || true)"
  rm -rf "$tmp"

  if [[ "$prod_hits" -lt 1 ]]; then
    fail "$label: PROD ref '$PROD_REF' not found in main.jsbundle (Hermes strings)" || return 1
  fi
  if [[ "$dev_hits" -ne 0 ]]; then
    fail "$label: DEV ref '$DEV_REF' present in main.jsbundle (wrong bake)" || return 1
  fi

  local sha
  sha="$(shasum -a 256 "$ipa" | awk '{print $1}')"

  printf '{"ok":true,"label":"%s","ipa":"%s","sha256":"%s","bundleId":"%s","version":"%s","buildNumber":"%s","prodRef":"%s","devRefAbsent":true}\n' \
    "$label" "$ipa" "$sha" "$bundle_id" "$version" "$build" "$PROD_REF"
}

make_fake_ipa() {
  # Minimal zip shaped like an IPA for negative matrix (plain-text jsbundle — not Hermes).
  local out="$1"
  local host_line="$2"
  local work
  work="$(mktemp -d)"
  mkdir -p "$work/Payload/Fake.app"
  cat >"$work/Payload/Fake.app/Info.plist" <<'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleIdentifier</key><string>com.buildtrack.app.local</string>
  <key>CFBundleShortVersionString</key><string>0.0.0</string>
  <key>CFBundleVersion</key><string>0</string>
</dict>
</plist>
PLIST
  printf '%s\n' "$host_line" >"$work/Payload/Fake.app/main.jsbundle"
  (cd "$work" && zip -q -r "$out" Payload)
  rm -rf "$work"
}

run_self_test() {
  need_cmd unzip
  need_cmd plutil
  need_cmd strings
  need_cmd shasum
  need_cmd zip

  local staging
  staging="$(mktemp -d "${TMPDIR:-/tmp}/assert-ipa-selftest.XXXXXX")"
  # shellcheck disable=SC2064
  trap "rm -rf '$staging'" EXIT

  # Positive against a real Hermes production IPA when present.
  local latest
  latest="$(ls -t "$ROOT"/.eas/artifacts/*.ipa 2>/dev/null | head -1 || true)"
  if [[ -z "$latest" ]]; then
    die "--self-test requires a real IPA under .eas/artifacts/ for Hermes positive proof"
  fi
  echo "self-test: positive Hermes IPA → $latest" >&2
  extract_and_assert "$latest" "hermes-positive" >/dev/null \
    || die "self-test: Hermes positive failed"

  local fake
  # DEV-only → must fail
  fake="$staging/dev-only.ipa"
  make_fake_ipa "$fake" "https://${DEV_REF}.supabase.co"
  if extract_and_assert "$fake" "dev-only" >/dev/null 2>&1; then
    die "self-test: DEV-only fixture should fail"
  fi
  echo "self-test: DEV-only → FAIL (expected)" >&2

  # missing PROD → must fail
  fake="$staging/no-prod.ipa"
  make_fake_ipa "$fake" "https://example.invalid"
  if extract_and_assert "$fake" "no-prod" >/dev/null 2>&1; then
    die "self-test: missing-PROD fixture should fail"
  fi
  echo "self-test: missing-PROD → FAIL (expected)" >&2

  # both refs → must fail
  fake="$staging/both.ipa"
  make_fake_ipa "$fake" "https://${PROD_REF}.supabase.co https://${DEV_REF}.supabase.co"
  if extract_and_assert "$fake" "both-refs" >/dev/null 2>&1; then
    die "self-test: both-refs fixture should fail"
  fi
  echo "self-test: both-refs → FAIL (expected)" >&2

  # malformed → must fail
  echo "not-a-zip" >"$staging/malformed.ipa"
  if extract_and_assert "$staging/malformed.ipa" "malformed" >/dev/null 2>&1; then
    die "self-test: malformed fixture should fail"
  fi
  echo "self-test: malformed → FAIL (expected)" >&2

  printf '{"ok":true,"selfTest":true,"hermesPositiveIpa":"%s","negatives":["dev-only","missing-prod","both-refs","malformed"]}\n' \
    "$latest"
}

main() {
  local arg="${1:-}"
  case "$arg" in
    --self-test)
      run_self_test
      ;;
    --latest|"")
      local latest
      latest="$(ls -t "$ROOT"/.eas/artifacts/*.ipa 2>/dev/null | head -1 || true)"
      [[ -n "$latest" ]] || die "no IPA under .eas/artifacts/; pass an explicit path"
      extract_and_assert "$latest" "latest" || exit 1
      ;;
    -h|--help)
      sed -n '1,20p' "$0"
      ;;
    *)
      extract_and_assert "$arg" "ipa" || exit 1
      ;;
  esac
}

main "$@"
