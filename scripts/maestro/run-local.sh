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

# Maestro v2 requires the explicit `test` subcommand before positional flow files
# (e.g. `maestro --udid X test flow.yaml`). If the first non-flag, non-value arg
# is a flow file (or folder) instead of a known subcommand, inject `test` so
# legacy invocations keep working.
declare -a FINAL_ARGS=()
i=0
inserted_test=0
known_subs=(test check-syntax hierarchy cloud record login logout bugreport start-device list-devices list-cloud-devices download-samples mcp)
is_known_sub() {
  local w="$1"; local s
  for s in "${known_subs[@]}"; do
    [ "$s" = "$w" ] && return 0
  done
  return 1
}
is_next_value() {
  case "$1" in
    --udid|--device|-p|--platform|--api-key|--api-url|--config|--debug-output|--format|--output|--screen-size|--test-output-dir|--test-suite-name|--shard-all|--shard-split|-s|--shards|-e|--env|--include-tags|--exclude-tags)
      return 0 ;;
    *) return 1 ;;
  esac
}
args_final_src=( "$@" )
while [ $i -lt ${#args_final_src[@]} ]; do
  a="${args_final_src[$i]}"
  if [ "$inserted_test" -eq 0 ]; then
    # If this arg starts with '-' it's a flag
    if [[ "$a" == -* ]]; then
      FINAL_ARGS+=( "$a" )
      # If flag takes a value, skip the next arg as well
      if is_next_value "$a" && [ $((i+1)) -lt ${#args_final_src[@]} ] && [[ "${args_final_src[$((i+1))]}" != -* ]]; then
        FINAL_ARGS+=( "${args_final_src[$((i+1))]}" )
        i=$((i+1))
      fi
    elif is_known_sub "$a"; then
      # Already a subcommand, do not insert test
      inserted_test=1
      FINAL_ARGS+=( "$a" )
    else
      # First positional: this is a flow file or dir; inject test before it
      FINAL_ARGS+=( "test" )
      inserted_test=1
      FINAL_ARGS+=( "$a" )
    fi
  else
    FINAL_ARGS+=( "$a" )
  fi
  i=$((i+1))
done
# Fallback: if no positional flow arg was found and no subcommand at all, still run without modification

# ---------------------------------------------------------------------------
# Verbose heartbeat runner (wraps the final maestro invocation so we can tell
# if the process is ALIVE / DEAD during long flow runs — replaces silent
# black-box `exec` that produced 0 output for 8+ minutes between start/end,
# making it impossible to distinguish "still running" vs "transport frozen".
#
# Output format examples:
#   [21:12:03 run-local.sh] Phase: 0-click-prep UDID=B7B2...
#   [21:12:04 run-local.sh] Phase: maestro-launch MAESTRO_BIN=/Users/.../maestro
#   [21:12:04 run-local.sh]   args: --udid B7B2640C-... test --reinstall-driver flows/qa01-a.yaml
#   [21:12:14 run-local.sh]   ALIVE pid=28371  elapsed=10s  (heartbeat every 10s)
#   [21:12:24 run-local.sh]   ALIVE pid=28371  elapsed=20s
#   [21:12:55 run-local.sh]   FINISHED pid=28371  elapsed=51s  rc=0  (PASS)
# ---------------------------------------------------------------------------
NOW_FMT() { date '+%H:%M:%S'; }
PHASE_ECHO() { printf '[%s run-local.sh] %s\n' "$(NOW_FMT)" "$*"; }

PHASE_ECHO "Phase: maestro-launch  MAESTRO_BIN=$MAESTRO_BIN  MAESTRO_LOCAL_HOME=$MAESTRO_LOCAL_HOME"
PHASE_ECHO "  args: ${FINAL_ARGS[*]@Q}"

# Start maestro in background, capture pid, then heartbeat every 10s until done.
START_TS=$(date +%s)
"$MAESTRO_BIN" "${FINAL_ARGS[@]}" &
MAESTRO_PID=$!

# Silent trap so we can forward signals to the child maestro process (so Ctrl-C
# doesn't leave maestro-driver-iosUITests-Runner alive indefinitely).
trap 'kill -TERM $MAESTRO_PID 2>/dev/null || true; wait $MAESTRO_PID 2>/dev/null || true; exit 130' INT TERM

HB_INTERVAL=10
HB_LAST_PRINT=0
while kill -0 "$MAESTRO_PID" 2>/dev/null; do
  sleep 1
  ELAPSED=$(( $(date +%s) - START_TS ))
  # Print heartbeat at t=10, 20, 30, ... seconds
  NEXT_PRINT=$(( (ELAPSED / HB_INTERVAL) * HB_INTERVAL ))
  if [ "$NEXT_PRINT" -gt "$HB_LAST_PRINT" ] && [ "$NEXT_PRINT" -ge "$HB_INTERVAL" ]; then
    HB_LAST_PRINT=$NEXT_PRINT
    PHASE_ECHO "  ALIVE pid=$MAESTRO_PID  elapsed=${ELAPSED}s  (heartbeat every ${HB_INTERVAL}s)"
  fi
done
wait $MAESTRO_PID 2>/dev/null
RC=$?
END_TS=$(date +%s)
ELAPSED=$(( END_TS - START_TS ))
if [ "$RC" -eq 0 ]; then
  TAG="PASS"
else
  TAG="FAIL"
fi
PHASE_ECHO "  FINISHED pid=$MAESTRO_PID  elapsed=${ELAPSED}s  rc=$RC  ($TAG)"

# Exit with maestro's actual return code (never silently swallow).
exit $RC
