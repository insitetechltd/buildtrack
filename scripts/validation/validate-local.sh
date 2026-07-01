#!/usr/bin/env bash
set -u -o pipefail

MODE="validate-local"
RUN_ID="$(date +"%Y%m%d%H%M%S")-$$"
STRICT_DIRTY_TREE="${VALIDATE_LOCAL_STRICT_DIRTY_TREE:-0}"
RUN_SIMULATION="${VALIDATE_LOCAL_RUN_SIMULATION:-0}"
SCRIPT_PATH="${BASH_SOURCE[0]}"
SCRIPT_DIR=""
ROOT_DIR=""

emit_event() {
  local channel="$1"
  local stage="$2"
  local sequence="$3"
  local severity="$4"
  local class_name="$5"
  local exit_code="$6"
  local command_label="$7"
  local status="$8"
  local detail="$9"
  local next_action="${10}"
  local message="VALIDATION_EVENT|${RUN_ID}|${MODE}|${stage}|${sequence}|${severity}|${class_name}|${exit_code}|${ROOT_DIR}|${command_label}|${status}|${detail}|${next_action}"

  if [ "$channel" = "stderr" ]; then
    printf '%s\n' "$message" >&2
  else
    printf '%s\n' "$message"
  fi
}

fail_now() {
  local stage="$1"
  local sequence="$2"
  local class_name="$3"
  local exit_code="$4"
  local command_label="$5"
  local detail="$6"
  local next_action="$7"
  emit_event "stderr" "$stage" "$sequence" "ERROR" "$class_name" "$exit_code" "$command_label" "FAIL" "$detail" "$next_action"
  exit "$exit_code"
}

run_stage_command() {
  local stage="$1"
  local sequence="$2"
  local command_label="$3"
  local failure_class="$4"
  local failure_exit="$5"
  local next_action="$6"
  shift 6

  local output_file
  local command_exit
  output_file="$(mktemp)"

  emit_event "stdout" "$stage" "$sequence" "INFO" "[STAGE_BEGIN]" 0 "$command_label" "BEGIN" "Running ${command_label}" "continue"

  if "$@" >"$output_file" 2>&1; then
    if [ -s "$output_file" ]; then
      cat "$output_file"
    fi
    emit_event "stdout" "$stage" "$sequence" "INFO" "[STAGE_PASS]" 0 "$command_label" "PASS" "Completed ${command_label}" "continue"
    rm -f "$output_file"
    return 0
  fi

  command_exit=$?
  emit_event "stderr" "$stage" "$sequence" "ERROR" "$failure_class" "$failure_exit" "$command_label" "FAIL" "Command failed with upstream exit ${command_exit}" "$next_action"
  if [ -s "$output_file" ]; then
    cat "$output_file" >&2
  fi
  rm -f "$output_file"
  exit "$failure_exit"
}

if ! SCRIPT_DIR="$(cd "$(dirname "$SCRIPT_PATH")" >/dev/null 2>&1 && pwd -P)"; then
  ROOT_DIR="$(pwd -P)"
  fail_now "stage_0_root_resolution" "0" "[PATH_RESOLUTION_FAIL]" "10" "resolve-script-dir" "Unable to resolve script directory" "inspect_paths"
fi

if ! ROOT_DIR="$(cd "$SCRIPT_DIR/../.." >/dev/null 2>&1 && pwd -P)"; then
  ROOT_DIR="$(pwd -P)"
  fail_now "stage_0_root_resolution" "0" "[PATH_RESOLUTION_FAIL]" "10" "resolve-repo-root" "Unable to resolve repository root from script path" "inspect_paths"
fi

emit_event "stdout" "stage_0_root_resolution" "0" "INFO" "[STAGE_BEGIN]" 0 "resolve-repo-root" "BEGIN" "Resolving repository root" "continue"

if [ ! -d "$ROOT_DIR" ] || [ ! -f "$ROOT_DIR/package.json" ]; then
  fail_now "stage_0_root_resolution" "0" "[PATH_RESOLUTION_FAIL]" "10" "resolve-repo-root" "Resolved root is invalid or missing package.json" "inspect_paths"
fi

cd "$ROOT_DIR" || fail_now "stage_0_root_resolution" "0" "[PATH_RESOLUTION_FAIL]" "10" "cd-repo-root" "Unable to change directory into repository root" "inspect_paths"
emit_event "stdout" "stage_0_root_resolution" "0" "INFO" "[STAGE_PASS]" 0 "resolve-repo-root" "PASS" "Repository root resolved successfully" "continue"

emit_event "stdout" "stage_1_workspace_audit" "1" "INFO" "[STAGE_BEGIN]" 0 "workspace-audit" "BEGIN" "Running workspace safety audit" "continue"

if ! command -v git >/dev/null 2>&1; then
  fail_now "stage_1_workspace_audit" "1" "[SCRIPT_CONTRACT_FAIL]" "40" "git" "git command is unavailable" "install_git"
fi

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  fail_now "stage_1_workspace_audit" "1" "[GIT_STATE_FAIL]" "11" "git rev-parse --is-inside-work-tree" "Current directory is not a git work tree" "review_workspace"
fi

CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || printf 'HEAD')"
if [ "$CURRENT_BRANCH" = "HEAD" ]; then
  fail_now "stage_1_workspace_audit" "1" "[GIT_STATE_FAIL]" "11" "git rev-parse --abbrev-ref HEAD" "Detached HEAD blocks canonical validation flow" "review_workspace"
fi

DIRTY_OUTPUT="$(git status --porcelain 2>/dev/null || true)"
if [ -n "$DIRTY_OUTPUT" ]; then
  if [ "$STRICT_DIRTY_TREE" = "1" ]; then
    emit_event "stderr" "stage_1_workspace_audit" "1" "ERROR" "[DIRTY_TREE_FAIL]" "12" "git status --porcelain" "FAIL" "Dirty working tree blocks strict validation mode" "clean_workspace"
    printf '%s\n' "$DIRTY_OUTPUT" >&2
    exit 12
  fi

  emit_event "stdout" "stage_1_workspace_audit" "1" "WARN" "[DIRTY_TREE_WARN]" "0" "git status --porcelain" "WARN" "Dirty working tree detected; local validation continues" "review_workspace"
  printf '%s\n' "$DIRTY_OUTPUT"
fi

emit_event "stdout" "stage_1_workspace_audit" "1" "INFO" "[STAGE_PASS]" 0 "workspace-audit" "PASS" "Workspace safety audit completed" "continue"

if ! command -v npx >/dev/null 2>&1; then
  fail_now "stage_2_typescript" "2" "[SCRIPT_CONTRACT_FAIL]" "40" "npx" "npx command is unavailable" "install_node_tooling"
fi

run_stage_command \
  "stage_2_typescript" \
  "2" \
  "npx tsc --noEmit" \
  "[TYPE_ERROR]" \
  "20" \
  "fix_types" \
  npx tsc --noEmit

if ! command -v npm >/dev/null 2>&1; then
  fail_now "stage_3_regression" "3" "[SCRIPT_CONTRACT_FAIL]" "40" "npm" "npm command is unavailable" "install_node_tooling"
fi

run_stage_command \
  "stage_3_regression" \
  "3" \
  "npm run test:regression" \
  "[TEST_FAILURE]" \
  "30" \
  "fix_tests" \
  npm run test:regression

if [ "$RUN_SIMULATION" = "1" ]; then
  run_stage_command \
    "stage_4_simulation" \
    "4" \
    "npm run test:simulation:ui" \
    "[SIMULATION_FAILURE]" \
    "31" \
    "fix_simulation" \
    npm run test:simulation:ui
fi

emit_event "stdout" "stage_4_success_exit" "4" "INFO" "[VALIDATION_SUCCESS]" 0 "validate-local" "PASS" "All local validation stages passed" "ready_for_staging"
exit 0
