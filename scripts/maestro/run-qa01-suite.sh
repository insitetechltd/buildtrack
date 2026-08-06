#!/usr/bin/env bash
#
# Self-reliant M-QA-01 suite runner (Scenarios A → B → C → D, sequentially).
#
# DESIGN GOALS:
#   1. SELF-RELIANT: no operator intervention between scenarios.
#        - Metro health-check before EVERY scenario; auto-restart if dead.
#        - Auto-retry ONCE with --reinstall-driver on XCTest transport-crash
#          (exit code 5999 / "Transport unreachable" class of failures that
#          happen after 20+ clearState restarts corrupt the FlyingFox listener).
#        - Stop-on-first-failure rule enforced (A fail → stop; do not silently
#          run B/C/D against dead state — token burn).
#   2. MAX VERBOSITY: heartbeat line every 10s, named PHASE lines with
#      timestamp, pid, elapsed seconds, PASS/FAIL tag. Never silent || true.
#      Every curl, every xcrun, every rsync prints its intent BEFORE running.
#   3. Reproducible artifacts: auto copies LATEST scenario screenshots into
#      a labeled deliverable directory after each PASS scenario. Produces a
#      single run-summary.txt with all rcs + paths for git-commit deliverables.
#
# Usage:
#   bash scripts/maestro/run-qa01-suite.sh [--udid <UDID>] [--app-id <APP_ID>] \
#       [--metro-port 8081] [--metro-host 127.0.0.1] [--metro-restart-cmd '...'] \
#       [--driver-retry 1] [--stop-on-fail 1] [--copy-artifacts 1] \
#       [--artifact-dir <DIR>] [--skip-rebuild-flows 0] [--dry-run 0]
#
# Defaults match Sprint 7 sandbox: UDID=iPhone 17 Pro Max B7B2640C-...
# APP_ID=com.buildtrack.app.local, METRO_PORT=8081, DRIVER_RETRY=1, STOP_ON_FAIL=1,
# COPY_ARTIFACTS=1, REBUILD_FLOWS=1 (call build_qa01_flows.py first), DRY_RUN=0.
#
set -euo pipefail

SCRIPT_PATH="${BASH_SOURCE[0]}"
SCRIPT_DIR="$(cd "$(dirname "$SCRIPT_PATH")" >/dev/null 2>&1 && pwd -P)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." >/dev/null 2>&1 && pwd -P)"
RUN_LOCAL="$SCRIPT_DIR/run-local.sh"
BUILD_FLOWS_PY="$SCRIPT_DIR/build_qa01_flows.py"
FLOWS_DIR="$ROOT_DIR/maestro/flows"

# Defaults (override with CLI flags):
UDID="${MAESTRO_UDID:-B7B2640C-4738-4F8A-AEEE-5DF3D21D2533}"
APP_ID="com.buildtrack.app.local"
METRO_HOST="127.0.0.1"
METRO_PORT="8081"
METRO_RESTART_CMD="${METRO_RESTART_CMD:-}"
DRIVER_RETRY_MAX=1
STOP_ON_FAIL=1
COPY_ARTIFACTS=1
REBUILD_FLOWS=1
ARTIFACT_DIR="${ARTIFACT_DIR:-$ROOT_DIR/.cache/maestro-artifacts/qa01-$(date +%Y%m%d_%H%M%S)}"
DRY_RUN=0

NOW_FMT() { date '+%H:%M:%S'; }
SUITE_PID=$$
print_phase() {
  local level="$1"; shift
  local indent=""
  [ "$level" = "sub" ] && indent="  "
  [ "$level" = "subsub" ] && indent="    "
  printf '[%s QA01-SUITE]%s%s\n' "$(NOW_FMT)" "$indent" "$*"
}
die() {
  print_phase top "FATAL: $* (pid=$SUITE_PID)" >&2
  exit 1
}

# CLI flags (parse before anything):
while [[ $# -gt 0 ]]; do
  case "$1" in
    --udid)                 UDID="$2"; shift 2;;
    --app-id)               APP_ID="$2"; shift 2;;
    --metro-port)           METRO_PORT="$2"; shift 2;;
    --metro-host)           METRO_HOST="$2"; shift 2;;
    --metro-restart-cmd)    METRO_RESTART_CMD="$2"; shift 2;;
    --driver-retry)         DRIVER_RETRY_MAX="$2"; shift 2;;
    --stop-on-fail)         STOP_ON_FAIL="$2"; shift 2;;
    --copy-artifacts)       COPY_ARTIFACTS="$2"; shift 2;;
    --artifact-dir)         ARTIFACT_DIR="$2"; shift 2;;
    --skip-rebuild-flows)
      REBUILD_FLOWS=0;
      if [ "$#" -ge 2 ] && [[ "$2" =~ ^(0|1)$ ]]; then shift 2; else shift; fi
      ;;
    --dry-run)
      DRY_RUN=1;
      if [ "$#" -ge 2 ] && [[ "$2" =~ ^(0|1)$ ]]; then shift 2; else shift; fi
      ;;
    -h|--help)
      sed -n '2,28p' "$0" | sed 's/^# \{0,2\}//'
      exit 0;;
    *) echo "Unknown flag: $1" >&2; exit 2;;
  esac
done

# ---------------------------------------------------------------------------
# Scenario order — 4 rubric rows of M-QA-01.
# Each entry = TAG | FLOW_BASENAME | REQUIRED_SCREENSHOT_COUNT
# (required count is used as a post-PASS self-check: if scenario said rc=0 but
#  only e.g. 2/3 screenshots captured → semantic FAIL — the "rc=0 meaningless
#  without visual PNG match" rule now enforced IN CODE.)
# ---------------------------------------------------------------------------
declare -a SCENARIO_TAGS SCENARIO_FLOW SCENARIO_NEED_SHOTS
SCENARIO_TAGS[0]="A";  SCENARIO_FLOW[0]="qa01-scenario-a-rejection-loop.yaml";        SCENARIO_NEED_SHOTS[0]=4
SCENARIO_TAGS[1]="B";  SCENARIO_FLOW[1]="qa01-scenario-b-overdue-crunch.yaml";         SCENARIO_NEED_SHOTS[1]=3
SCENARIO_TAGS[2]="C";  SCENARIO_FLOW[2]="qa01-scenario-c-isolation-wall.yaml";         SCENARIO_NEED_SHOTS[2]=3
SCENARIO_TAGS[3]="D";  SCENARIO_FLOW[3]="qa01-scenario-d-iphone17-viewport.yaml";      SCENARIO_NEED_SHOTS[3]=8
N_SCENARIOS=${#SCENARIO_TAGS[@]}

MAESTRO_HOME_OVERRIDE="/tmp/maestro-tmp-home"
export MAESTRO_LOCAL_HOME="$MAESTRO_HOME_OVERRIDE"
mkdir -p "$MAESTRO_LOCAL_HOME/.maestro/tests"

# Report all config at startup so state is never a mystery:
print_phase top "===== M-QA-01 SUITE START  pid=$SUITE_PID  dry_run=$DRY_RUN ====="
print_phase sub "UDID         = ${UDID:0:8}-..."
print_phase sub "APP_ID       = $APP_ID"
print_phase sub "METRO        = http://$METRO_HOST:$METRO_PORT  (auto-restart cmd: ${METRO_RESTART_CMD:-<none set>})"
print_phase sub "DRIVER_RETRY = $DRIVER_RETRY_MAX (1 on 5999 transport crash)"
print_phase sub "STOP_ON_FAIL = $STOP_ON_FAIL  (A fails → abort immediately, no silent token burn)"
print_phase sub "COPY_ARTS    = $COPY_ARTIFACTS  dir=$ARTIFACT_DIR"
print_phase sub "REBUILD_FLOW = $REBUILD_FLOWS  generator=$BUILD_FLOWS_PY"
print_phase sub "N_SCENARIOS  = $N_SCENARIOS  order: ${SCENARIO_TAGS[*]}"

# ---------------------------------------------------------------------------
# Step 0: Metro health-check + auto-restart + flow rebuild (self-reliance).
# ---------------------------------------------------------------------------
METRO_STATUS_URL="http://$METRO_HOST:$METRO_PORT/status"
METRO_RELOAD_URL="http://$METRO_HOST:$METRO_PORT/_expo/reload"

metro_health_check() {
  print_phase top "Phase: metro-health-check  $METRO_STATUS_URL"
  local attempt=1 max=3 rc=http_unknown
  while [ $attempt -le $max ]; do
    set +e
    HTTP_CODE=$(curl -sS -o /dev/null -w '%{http_code}' --connect-timeout 3 --max-time 5 "$METRO_STATUS_URL" 2>/dev/null)
    rc=$?
    set -e
    if [ "$rc" -eq 0 ] && [ "$HTTP_CODE" = "200" ]; then
      print_phase sub "OK (attempt $attempt/$max) HTTP 200 — Metro listener alive."
      return 0
    fi
    print_phase sub "NOT_OK attempt $attempt/$max — curl_exit=$rc http=$HTTP_CODE."
    # Try auto-restart if command provided:
    if [ -n "$METRO_RESTART_CMD" ]; then
      print_phase sub "Running METRO_RESTART_CMD=$METRO_RESTART_CMD"
      if [ "$DRY_RUN" -eq 1 ]; then
        print_phase sub "  DRY_RUN=1 — skipping actual restart execution."
      else
        set +e
        bash -lc "$METRO_RESTART_CMD"
        restart_rc=$?
        set -e
        if [ "$restart_rc" -eq 0 ]; then
          print_phase sub "  METRO_RESTART_CMD finished rc=0."
        else
          print_phase sub "  WARNING: METRO_RESTART_CMD FAILED rc=$restart_rc — restart did not succeed; health check will likely remain NOT_OK."
        fi
      fi
      sleep 8
      attempt=$((attempt+1))
      continue
    fi
    # No restart cmd configured — warn, wait 5s, retry once more to give time for external operator.
    sleep 5
    attempt=$((attempt+1))
  done
  print_phase sub "Metro NOT healthy after $max attempts. Cannot proceed. HINT: set --metro-restart-cmd 'cd $ROOT_DIR && (nohup npx expo start --port $METRO_PORT >/tmp/metro.log 2>&1 &)'"
  return 1
}

metro_force_reload_bundle() {
  print_phase top "Phase: metro-reload-bundle  POST $METRO_RELOAD_URL"
  set +e
  HTTP_CODE=$(curl -sS -o /dev/null -w '%{http_code}' -X POST --connect-timeout 3 --max-time 5 "$METRO_RELOAD_URL" 2>/dev/null)
  rc=$?
  set -e
  if [ "$rc" -eq 0 ] && [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "202" ]; then
    print_phase sub "OK http=$HTTP_CODE — bundle invalidated, next load = fresh."
  else
    print_phase sub "WARN http=$HTTP_CODE (non-fatal: first launchApp will still load from cache if reload failed)."
  fi
}

rebuild_qa01_flows() {
  print_phase top "Phase: rebuild-qa01-flows  $BUILD_FLOWS_PY → $FLOWS_DIR"
  if [ "$DRY_RUN" -eq 1 ]; then
    print_phase sub "DRY_RUN=1 — skipping python execution."
    return 0
  fi
  [ -x "$BUILD_FLOWS_PY" ] || die "Generator not executable: $BUILD_FLOWS_PY"
  set +e
  "$BUILD_FLOWS_PY"
  rc=$?
  set -e
  if [ "$rc" -ne 0 ]; then
    die "Generator failed (rc=$rc). Fix Python first; no point running Maestro."
  fi
  # Verify output YAMLs exist and pass maestro check-syntax:
  local missing=()
  for tag_i in "${!SCENARIO_TAGS[@]}"; do
    f="$FLOWS_DIR/${SCENARIO_FLOW[$tag_i]}"
    if [ ! -s "$f" ]; then
      missing+=("$f")
    else
      lines=$(wc -l < "$f")
      print_phase sub "generated OK ${SCENARIO_TAGS[$tag_i]}: $f ($lines lines)"
    fi
  done
  [ ${#missing[@]} -eq 0 ] || die "Missing flows after rebuild: ${missing[*]}"
  # Syntax check via run-local.sh check-syntax subcommand (fast, token-cheap):
  for tag_i in "${!SCENARIO_TAGS[@]}"; do
    f="$FLOWS_DIR/${SCENARIO_FLOW[$tag_i]}"
    print_phase subsub "check-syntax ${SCENARIO_TAGS[$tag_i]}: $f"
    set +e
    "$RUN_LOCAL" --udid "$UDID" check-syntax "$f" >/dev/null 2>/tmp/qa01-checksyntax-${SCENARIO_TAGS[$tag_i]}.log
    r=$?
    set -e
    if [ "$r" -ne 0 ]; then
      die "Syntax check FAILED scenario ${SCENARIO_TAGS[$tag_i]} rc=$r. See /tmp/qa01-checksyntax-${SCENARIO_TAGS[$tag_i]}.log. Flows invalid — refuse to run."
    fi
  done
  print_phase sub "All $N_SCENARIOS flows pass maestro check-syntax."
}

# ---------------------------------------------------------------------------
# Step 0 execution (actual):
# ---------------------------------------------------------------------------
[ "$REBUILD_FLOWS" -eq 1 ] && rebuild_qa01_flows
metro_health_check || die "Metro health check failed. Abort before any scenario runs."
metro_force_reload_bundle

# ---------------------------------------------------------------------------
# Step 1: Run each scenario sequentially with stop-on-fail + driver retry.
# ---------------------------------------------------------------------------
mkdir -p "$ARTIFACT_DIR"
SUMMARY_FILE="$ARTIFACT_DIR/run-summary.txt"
{
  echo "M-QA-01 suite run — started $(date '+%Y-%m-%d %H:%M:%S')  pid=$SUITE_PID"
  echo "UDID=$UDID   APP_ID=$APP_ID   Metro=http://$METRO_HOST:$METRO_PORT"
  echo "Order: ${SCENARIO_TAGS[*]}"
  echo "===================================================================="
} > "$SUMMARY_FILE"

FINAL_RC=0
SHOTS_TOTAL=0
SHOTS_NEEDED_TOTAL=0

for tag_i in "${!SCENARIO_TAGS[@]}"; do
  TAG="${SCENARIO_TAGS[$tag_i]}"
  FLOW_BASENAME="${SCENARIO_FLOW[$tag_i]}"
  NEED="${SCENARIO_NEED_SHOTS[$tag_i]}"
  SHOTS_NEEDED_TOTAL=$((SHOTS_NEEDED_TOTAL + NEED))
  FLOW_PATH="$FLOWS_DIR/$FLOW_BASENAME"
  [ -f "$FLOW_PATH" ] || die "Missing flow: $FLOW_PATH (run rebuild first)."

  START_STEP=$(date +%s)
  ATTEMPT=1
  PASSED_SEMANTIC=0
  LAST_RC=""

  print_phase top "------------------------------------------------------------"
  print_phase top "SCENARIO [$((tag_i+1))/$N_SCENARIOS] $TAG  needs=$NEED screenshots  flow=$FLOW_BASENAME"

  while [ "$ATTEMPT" -le $((DRIVER_RETRY_MAX+1)) ] && [ "$PASSED_SEMANTIC" -ne 1 ]; do
    # Pre-check Metro EVERY TIME before invoking scenario: no scenario runs against dead metro.
    metro_health_check >&2 || { print_phase sub "Pre-$TAG metro check failed on attempt $ATTEMPT. Abort."; break; }

    DRIVER_FLAG=""
    # On 2nd+ attempt, force --reinstall-driver to wipe stale XCTest FlyingFox listener:
    if [ "$ATTEMPT" -gt 1 ]; then
      DRIVER_FLAG="--reinstall-driver"
      print_phase sub "Attempt $ATTEMPT/$((DRIVER_RETRY_MAX+1)) for scenario $TAG — adding '$DRIVER_FLAG' to wipe stale driver."
    fi

    LOG_STDOUT="$ARTIFACT_DIR/$TAG-attempt$ATTEMPT.log"
    print_phase sub "Invoking: $RUN_LOCAL --udid $UDID test $DRIVER_FLAG $FLOW_PATH  (stdout+stderr -> $LOG_STDOUT)"

    if [ "$DRY_RUN" -eq 1 ]; then
      print_phase sub "DRY_RUN=1 — skipping actual Maestro invocation; simulating PASS."
      LAST_RC=0
      print_phase sub "rc=0 OK (simulated). Bypassing semantic shot-count gate for dry-run."
      PASSED_SEMANTIC=1
      SHOTS_FOUND=0
      NEWEST_RUN=""
    else
      set +e
      ( "$RUN_LOCAL" --udid "$UDID" test $DRIVER_FLAG "$FLOW_PATH" 2>&1 ) | tee "$LOG_STDOUT"
      LAST_RC=${PIPESTATUS[0]}
      set -e
    fi

    print_phase sub "Scenario $TAG attempt $ATTEMPT raw rc=$LAST_RC."

    # Classify failure type + auto-retry decision:
    if [ "$LAST_RC" -ne 0 ]; then
      TRANSPORT_HINT=""
      if [ "$DRY_RUN" -ne 1 ] && [ -f "$LOG_STDOUT" ] && grep -qE "Transport unreachable|connection refused|5999|FlyingFox" "$LOG_STDOUT"; then
        TRANSPORT_HINT="(stale XCTest driver — will auto retry with fresh driver next attempt)"
      fi
      print_phase sub "rc=$LAST_RC FAIL $TRANSPORT_HINT"
      if [ -n "$TRANSPORT_HINT" ] && [ "$ATTEMPT" -le "$DRIVER_RETRY_MAX" ]; then
        ATTEMPT=$((ATTEMPT+1))
        sleep 5   # let sim settle
        continue  # retry loop
      else
        break     # non-retryable fail or retries exhausted
      fi
    fi

    if [ "$DRY_RUN" -eq 1 ]; then
      continue
    fi

    # rc=0 semantic PASS check (ENFORCES "rc=0 meaningless without PNG match"):
    NEWEST_RUN=$(ls -1t "$MAESTRO_LOCAL_HOME/.maestro/tests/" 2>/dev/null | head -n 1)
    if [ -z "$NEWEST_RUN" ]; then
      print_phase sub "PASS rc=$LAST_RC but NO maestro run dir found under $MAESTRO_LOCAL_HOME/.maestro/tests/ → semantic FAIL (artifacts missing)."
      LAST_RC=99
      break
    fi
    SHOTS_FOUND=$(find "$MAESTRO_LOCAL_HOME/.maestro/tests/$NEWEST_RUN" -type f -path "*/takeScreenshot/*.png" 2>/dev/null | wc -l | tr -d ' ')
    SHOTS_TOTAL=$((SHOTS_TOTAL + SHOTS_FOUND))
    print_phase sub "rc=0 OK raw Maestro. Post-pass shot check: found=$SHOTS_FOUND needed=$NEED."
    if [ "$SHOTS_FOUND" -lt "$NEED" ]; then
      print_phase sub "SEMANTIC FAIL: $SHOTS_FOUND/$NEED screenshots captured — rc=0 lied (LogBox banner intercept / missing DOM element pattern). Treat as FAIL."
      LAST_RC=98
      # Screenshot-under-capture class is not stale-driver: do NOT retry blindly. Break and stop.
      break
    fi
    PASSED_SEMANTIC=1
  done

  END_STEP=$(date +%s)
  ELAPSED=$((END_STEP - START_STEP))
  if [ "$LAST_RC" -eq 0 ] && [ "$PASSED_SEMANTIC" -eq 1 ]; then
    RESULT_TAG="PASS"
  else
    RESULT_TAG="FAIL"
    FINAL_RC=1
  fi

  print_phase top "SCENARIO $TAG DONE: $RESULT_TAG  rc=${LAST_RC:-<unset>}  attempts=$ATTEMPT  elapsed=${ELAPSED}s  shots=$SHOTS_FOUND/$NEED"

  # Copy artifacts on PASS (or always on FAIL for diagnosis):
  if [ "$COPY_ARTIFACTS" -eq 1 ] && [ -n "${NEWEST_RUN:-}" ] && [ -d "$MAESTRO_LOCAL_HOME/.maestro/tests/$NEWEST_RUN" ]; then
    DST_DIR="$ARTIFACT_DIR/$TAG-run-$NEWEST_RUN"
    print_phase sub "Copy screenshots -> $DST_DIR  ($RESULT_TAG scenario)"
    mkdir -p "$DST_DIR"
    find "$MAESTRO_LOCAL_HOME/.maestro/tests/$NEWEST_RUN" -type f \( -path "*/takeScreenshot/*.png" -o -name '*.log' -o -path '*/screenshots/*' \) -print0 2>/dev/null | \
      while IFS= read -r -d '' f; do
        base="${f#$MAESTRO_LOCAL_HOME/.maestro/tests/$NEWEST_RUN/}"
        base="qa01-${TAG}-${base//\//-}"
        cp -p "$f" "$DST_DIR/$base"
      done 2>/dev/null || true
    # Attempt count + log alongside:
    cp -p "$LOG_STDOUT" "$DST_DIR/maestro-console.log" 2>/dev/null || true
    ls -1 "$DST_DIR" > "$DST_DIR/_contents.txt" 2>/dev/null || true
  fi

  # Write scenario line to summary:
  printf '  %-2s | rc=%-4s attempts=%-1s shots=%2d/%-2d elapsed=%-5ss | %s\n' \
    "$TAG" "$LAST_RC" "$ATTEMPT" "${SHOTS_FOUND:-0}" "$NEED" "$ELAPSED" "$RESULT_TAG" >> "$SUMMARY_FILE"

  if [ "$RESULT_TAG" = "FAIL" ] && [ "$STOP_ON_FAIL" -eq 1 ]; then
    print_phase top "STOP_ON_FAIL=1 — scenario $TAG failed. Do NOT run remaining scenarios ($((N_SCENARIOS - tag_i - 1))) against broken state."
    print_phase top "Fail-fast: saved tokens on $((N_SCENARIOS - tag_i - 1)) additional scenarios."
    break
  fi

  # Light cool-down between scenarios: give JS bridge time to settle after
  # last clearState restart (otherwise next init confirmation sheet tap races).
  if [ "$tag_i" -lt $((N_SCENARIOS-1)) ]; then
    print_phase sub "Inter-scenario cool-down 8s before scenario ${SCENARIO_TAGS[$((tag_i+1))]}."
    sleep 8
  fi
done

# ---------------------------------------------------------------------------
# Suite rollup:
# ---------------------------------------------------------------------------
TOTAL_ELAPSED=$(( $(date +%s) - START_STEP ))   # approximate from first scenario (no START_TIME was set)
{
  echo "===================================================================="
  echo "Total elapsed approx: ${TOTAL_ELAPSED}s   Screenshots captured: $SHOTS_TOTAL / needed $SHOTS_NEEDED_TOTAL"
  echo "Suite result: $([ $FINAL_RC -eq 0 ] && echo PASS || echo FAIL)"
  echo "Finished: $(date '+%Y-%m-%d %H:%M:%S')"
} >> "$SUMMARY_FILE"

print_phase top "============================================================"
print_phase top "SUITE ROLLUP: $( [ $FINAL_RC -eq 0 ] && echo PASS || echo FAIL )  rc=$FINAL_RC"
print_phase top "SUMMARY: $SUMMARY_FILE"
cat "$SUMMARY_FILE"

# Stdout exit = FINAL_RC (never silently swallow). CI can rely on it.
exit $FINAL_RC
