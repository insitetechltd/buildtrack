#!/usr/bin/env bash
set -euo pipefail

SCRIPT_PATH="${BASH_SOURCE[0]}"
SCRIPT_DIR="$(cd "$(dirname "$SCRIPT_PATH")" >/dev/null 2>&1 && pwd -P)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." >/dev/null 2>&1 && pwd -P)"
MAESTRO_LOCAL_HOME="${MAESTRO_LOCAL_HOME:-$ROOT_DIR/.cache/maestro-home}"

mkdir -p "$MAESTRO_LOCAL_HOME/.maestro/deps"

MAESTRO_BIN="${MAESTRO_BIN:-}"
if [ -z "$MAESTRO_BIN" ]; then
  if command -v maestro >/dev/null 2>&1; then
    MAESTRO_BIN="$(command -v maestro)"
  elif [ -x "$HOME/.maestro/bin/maestro" ]; then
    MAESTRO_BIN="$HOME/.maestro/bin/maestro"
  else
    printf '%s\n' "Unable to locate the Maestro CLI. Install it or set MAESTRO_BIN." >&2
    exit 127
  fi
fi

TMP_VMOPTS=""
if [ -n "${MAESTRO_VM_OPTS:-}" ]; then
  TMP_VMOPTS=" ${MAESTRO_VM_OPTS}"
fi

if [ -n "${MAESTRO_OPTS:-}" ]; then
  export MAESTRO_OPTS="${MAESTRO_OPTS}${TMP_VMOPTS} -Duser.home=$MAESTRO_LOCAL_HOME"
else
  export MAESTRO_OPTS="-Duser.home=$MAESTRO_LOCAL_HOME${TMP_VMOPTS}"
fi

# ---------------------------------------------------------------------------
# Zero-click Expo Dev Launcher pre-write (iOS simulator only).
#
# Eliminates the iOS 26+ "Open in \"Taskr\"?" deep-link prompt entirely by
# pre-writing the EXDevLauncher "recently opened apps" registry inside the
# simulator user defaults BEFORE Maestro launches the app. On cold launch
# EXDevLauncherController auto-loads the most recent entry with 0 user clicks
# (DEV_CLIENT_TRY_TO_LAUNCH_LAST_BUNDLE defaults to YES in Info.plist).
#
# Enabled when ALL of the following are true:
#   1. MAESTRO_0CLICK_DISABLE is NOT set to 1
#   2. `--udid <UDID>` is present in the argument list being forwarded
#   3. MAESTRO_0CLICK_APPID is set (or defaults to
#      com.buildtrack.app.local for this repo)
#   4. This is an iOS simulator UDID (not an Android serial). Detected by
#      the UDID containing uppercase hex and hyphens AND the absence of any
#      android-emulator serial prefix pattern.
#
# Optional tuning env vars (else sensible defaults):
#   MAESTRO_0CLICK_HOST  (default 127.0.0.1)
#   MAESTRO_0CLICK_PORT  (default 8081)
#   MAESTRO_0CLICK_NAME  (default Taskr)
#   MAESTRO_0CLICK_BUNDLE_URL  (full URL override, skips host/port/app-id build)
# ---------------------------------------------------------------------------
MAESTRO_UDID_ARG=""
i=0
args_to_check=( "$@" )
while [ $i -lt ${#args_to_check[@]} ]; do
  arg="${args_to_check[$i]}"
  if [ "$arg" = "--udid" ] && [ $((i+1)) -lt ${#args_to_check[@]} ]; then
    MAESTRO_UDID_ARG="${args_to_check[$((i+1))]}"
    break
  fi
  i=$((i+1))
done

if [ "${MAESTRO_0CLICK_DISABLE:-}" != "1" ] \
   && [ -n "$MAESTRO_UDID_ARG" ] \
   && [[ "$MAESTRO_UDID_ARG" =~ ^[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$ ]] \
   && command -v xcrun >/dev/null 2>&1
then
  APP_ID="${MAESTRO_0CLICK_APPID:-com.buildtrack.app.local}"
  PREP_ARGS=( --udid "$MAESTRO_UDID_ARG" --app-id "$APP_ID" )
  if [ -n "${MAESTRO_0CLICK_BUNDLE_URL:-}" ]; then
    PREP_ARGS+=( --bundle-url "$MAESTRO_0CLICK_BUNDLE_URL" )
  else
    if [ -n "${MAESTRO_0CLICK_HOST:-}" ]; then PREP_ARGS+=( --host "$MAESTRO_0CLICK_HOST" ); fi
    if [ -n "${MAESTRO_0CLICK_PORT:-}" ]; then PREP_ARGS+=( --port "$MAESTRO_0CLICK_PORT" ); fi
    if [ -n "${MAESTRO_0CLICK_NAME:-}" ]; then PREP_ARGS+=( --app-name "$MAESTRO_0CLICK_NAME" ); fi
  fi
  PREP_SCRIPT="$SCRIPT_DIR/prep-ios-0click-packager.sh"
  if [ -x "$PREP_SCRIPT" ]; then
    echo "run-local.sh: iOS 0-click pre-write ($APP_ID @ UDID ${MAESTRO_UDID_ARG:0:8}-...)..." 1>&2
    "$PREP_SCRIPT" "${PREP_ARGS[@]}" || {
      echo "run-local.sh: warning: 0-click pre-write failed; continuing anyway (non-fatal)." 1>&2
    }
  else
    echo "run-local.sh: warning: 0-click script not executable at $PREP_SCRIPT; skipping." 1>&2
  fi
fi

exec "$MAESTRO_BIN" "$@"
