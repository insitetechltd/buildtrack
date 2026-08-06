#!/usr/bin/env bash
set -euo pipefail

#
# Prep iOS simulator Expo Dev Launcher NSUserDefaults so that on next cold
# `launchApp(appId)` the EXDevLauncher auto-loads the given Metro packager URL
# with ZERO user clicks, ZERO scheme prompts, ZERO openurl calls.
#
# How it works (discovered in node_modules/expo-dev-launcher/ios/EXDevLauncherController.m):
#   - On cold launch, EXDevLauncherController reads UserDefaults key
#     "expo.devlauncher.recentlyopenedapps" via
#     EXDevLauncherRecentlyOpenedAppsRegistry.mostRecentApp()
#   - If a recent app entry exists AND DEV_CLIENT_TRY_TO_LAUNCH_LAST_BUNDLE is
#     YES (Info.plist default = YES), it immediately calls -loadApp: on that
#     URL with a 10 s timeout. It only falls through to the picker UI if the
#     load fails.
#   - So writing a valid { url, timestamp(ms), name, isEASUpdate:false } entry
#     BEFORE the next launchApp() skips Dev Launcher UI, scheme openurl calls,
#     and iOS 26+ "Open in Taskr?" prompts entirely.
#
# Usage:
#   bash scripts/maestro/prep-ios-0click-packager.sh \
#       --udid <UDID> \
#       --app-id <APP_ID> \
#       [--bundle-url <FULL_METRO_BUNDLE_URL>] \
#       [--app-name <NAME_IN_REGISTRY>] \
#       [--host <HOST>] [--port <PORT>] [--only-if-not-launched-before]
#
# If --bundle-url is omitted, it is built from --host and --port:
#   http://$HOST:$PORT/index.bundle?platform=ios&dev=true&minify=false&...
# Defaults: host=127.0.0.1, port=8081, app-id=com.buildtrack.app.local, app-name=Taskr
#

UDID=""
APP_ID="com.buildtrack.app.local"
APP_NAME="Taskr"
HOST="127.0.0.1"
PORT="8081"
BUNDLE_URL_OVERRIDE=""
ONLY_IF_NOT_LAUNCHED_BEFORE=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --udid)         UDID="$2"; shift 2;;
    --app-id)       APP_ID="$2"; shift 2;;
    --bundle-url)   BUNDLE_URL_OVERRIDE="$2"; shift 2;;
    --app-name)     APP_NAME="$2"; shift 2;;
    --host)         HOST="$2"; shift 2;;
    --port)         PORT="$2"; shift 2;;
    --only-if-not-launched-before) ONLY_IF_NOT_LAUNCHED_BEFORE=1; shift;;
    -h|--help)
      sed -n '2,20p' "$0" | sed 's/^# \{0,1\}//'
      exit 0;;
    *) echo "Unknown argument: $1" >&2; exit 2;;
  esac
done

if [ -z "$UDID" ]; then
  echo "prep-ios-0click-packager: --udid is required." >&2
  exit 2
fi

if [ -z "$BUNDLE_URL_OVERRIDE" ]; then
  BUNDLE_URL="http://${HOST}:${PORT}/index.bundle?platform=ios&dev=true&minify=false&modulesOnly=false&runModule=true&app=${APP_ID}"
else
  BUNDLE_URL="$BUNDLE_URL_OVERRIDE"
fi

if [ "$ONLY_IF_NOT_LAUNCHED_BEFORE" -eq 1 ]; then
  EXISTING=$(xcrun simctl spawn "$UDID" defaults read "$APP_ID" expo.devlauncher.recentlyopenedapps 2>/dev/null || true)
  if [ -n "$EXISTING" ]; then
    echo "prep-ios-0click-packager: already has registry; skipping."
    exit 0
  fi
fi

TS_MS=$(($(date +%s)*1000))

TMP_PLIST="$(mktemp /tmp/expo-devlauncher-registry.XXXXXX.plist)"
cleanup() { rm -f "$TMP_PLIST"; }
trap cleanup EXIT

# Escape the BUNDLE_URL for XML (should not contain &/<>/queries are fine; escape
# the rare ones). We escape &, <, > for XML safety inside <string> and <key>.
XML_ESCAPE() {
  local s="$1"
  s="${s//&/&amp;}"
  s="${s//</&lt;}"
  s="${s//>/&gt;}"
  printf '%s' "$s"
}
BUNDLE_URL_XML=$(XML_ESCAPE "$BUNDLE_URL")

cat > "$TMP_PLIST" <<PLIST_EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>expo.devlauncher.recentlyopenedapps</key>
  <dict>
    <key>${BUNDLE_URL_XML}</key>
    <dict>
      <key>url</key>
      <string>${BUNDLE_URL_XML}</string>
      <key>name</key>
      <string>${APP_NAME}</string>
      <key>timestamp</key>
      <integer>${TS_MS}</integer>
      <key>isEASUpdate</key>
      <false/>
    </dict>
  </dict>
</dict>
</plist>
PLIST_EOF

# Merge on top of any existing defaults (write the single key, not whole domain):
# First try import whole plist; if domain already exists, merge the key via python/PlistBuddy.
CURRENT=$(xcrun simctl spawn "$UDID" defaults read "$APP_ID" 2>/dev/null || true)
if [ -z "$CURRENT" ]; then
  xcrun simctl spawn "$UDID" defaults import "$APP_ID" "$TMP_PLIST"
else
  # Domain exists: don't overwrite other keys. Use PlistBuddy merge trick by
  # reading current, adding the one key, re-writing. Use defaults write for
  # the inner dict via a json stdin to python (simpler).
  python3 - "$UDID" "$APP_ID" "$BUNDLE_URL" "$APP_NAME" "$TS_MS" <<'PY'
import json, plistlib, subprocess, sys, xml.etree.ElementTree as ET
udid, appid, bundle_url, app_name, ts_ms = sys.argv[1:6]
# Read existing plist via defaults export
res = subprocess.run(
    ["xcrun", "simctl", "spawn", udid, "defaults", "export", appid, "-"],
    capture_output=True, check=False,
)
data = {}
if res.returncode == 0 and res.stdout:
    try:
        data = plistlib.loads(res.stdout)
    except Exception:
        data = {}
# Ensure the registry dict key exists
reg = data.get("expo.devlauncher.recentlyopenedapps", {})
if not isinstance(reg, dict):
    reg = {}
reg[bundle_url] = {
    "url": bundle_url,
    "name": app_name,
    "timestamp": int(ts_ms),
    "isEASUpdate": False,
}
data["expo.devlauncher.recentlyopenedapps"] = reg
# Export back to file and import via defaults
tmp = f"/tmp/expo-devlauncher-merge-{udid[:8]}.plist"
with open(tmp, "wb") as fh:
    plistlib.dump(data, fh)
subprocess.run(["xcrun", "simctl", "spawn", udid, "defaults", "import", appid, tmp], check=True)
PY
fi

# Verify the value is now present:
CHECK=$(xcrun simctl spawn "$UDID" defaults read "$APP_ID" expo.devlauncher.recentlyopenedapps 2>&1 || true)
if [ -z "$CHECK" ] || [[ "$CHECK" == *"does not exist"* ]] || [[ "$CHECK" != *"$BUNDLE_URL"* ]]; then
  echo "prep-ios-0click-packager: FAILED verification. Read back:" >&2
  echo "$CHECK" >&2
  exit 1
fi

echo "prep-ios-0click-packager: ok — registry set for $APP_ID @ $BUNDLE_URL"
