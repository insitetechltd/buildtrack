#!/usr/bin/env bash
set -u -o pipefail

MODE="push-validated"
RUN_ID="$(date +"%Y%m%d%H%M%S")-$$"
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

if ! SCRIPT_DIR="$(cd "$(dirname "$SCRIPT_PATH")" >/dev/null 2>&1 && pwd -P)"; then
  ROOT_DIR="$(pwd -P)"
  fail_now "stage_0_root_resolution" "0" "[PATH_RESOLUTION_FAIL]" "10" "resolve-script-dir" "Unable to resolve push script directory" "inspect_paths"
fi

if ! ROOT_DIR="$(cd "$SCRIPT_DIR/../.." >/dev/null 2>&1 && pwd -P)"; then
  ROOT_DIR="$(pwd -P)"
  fail_now "stage_0_root_resolution" "0" "[PATH_RESOLUTION_FAIL]" "10" "resolve-repo-root" "Unable to resolve repository root from push script path" "inspect_paths"
fi

cd "$ROOT_DIR" || fail_now "stage_0_root_resolution" "0" "[PATH_RESOLUTION_FAIL]" "10" "cd-repo-root" "Unable to change directory into repository root" "inspect_paths"

emit_event "stdout" "stage_0_root_resolution" "0" "INFO" "[STAGE_PASS]" 0 "resolve-repo-root" "PASS" "Repository root resolved for push validation" "continue"

VALIDATE_LOCAL_STRICT_DIRTY_TREE=1 bash "$ROOT_DIR/scripts/validation/validate-local.sh"
VALIDATION_EXIT=$?
if [ "$VALIDATION_EXIT" -ne 0 ]; then
  exit "$VALIDATION_EXIT"
fi

emit_event "stdout" "stage_5_push_remote" "5" "INFO" "[STAGE_BEGIN]" 0 "git-push" "BEGIN" "Preparing validated push" "continue"

if [ "${ALLOW_VALIDATED_PUSH:-0}" != "1" ]; then
  emit_event "stdout" "stage_5_push_remote" "5" "WARN" "[PUSH_SKIPPED]" 0 "git-push" "PASS" "Validated push skipped (set ALLOW_VALIDATED_PUSH=1 to enable)" "complete"
  exit 0
fi

if ! command -v git >/dev/null 2>&1; then
  fail_now "stage_5_push_remote" "5" "[SCRIPT_CONTRACT_FAIL]" "40" "git" "git command is unavailable" "install_git"
fi

BRANCH="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || printf 'HEAD')"
if [ "$BRANCH" = "HEAD" ]; then
  fail_now "stage_5_push_remote" "5" "[GIT_STATE_FAIL]" "11" "git rev-parse --abbrev-ref HEAD" "Detached HEAD blocks validated push" "review_workspace"
fi

if git rev-parse --abbrev-ref --symbolic-full-name "@{u}" >/dev/null 2>&1; then
  emit_event "stdout" "stage_5_push_remote" "5" "INFO" "[STAGE_PASS]" 0 "git push" "PASS" "Pushing to existing upstream branch" "complete"
  git push
else
  emit_event "stdout" "stage_5_push_remote" "5" "INFO" "[STAGE_PASS]" 0 "git push -u origin" "PASS" "Pushing and creating upstream branch" "complete"
  git push -u origin "$BRANCH"
fi
