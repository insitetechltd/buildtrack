#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd -P)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." >/dev/null 2>&1 && pwd -P)"
cd "$ROOT_DIR"

SLICE_ID="${1:-}"
MESSAGE="${2:-}"

if [ -z "$SLICE_ID" ]; then
  printf '%s\n' "usage: bash scripts/slice/checkpoint.sh <slice-id> [message]" >&2
  exit 2
fi

if ! command -v git >/dev/null 2>&1; then
  printf '%s\n' "git is required" >&2
  exit 3
fi

TOPLEVEL="$(git rev-parse --show-toplevel)"
CURRENT_DIR="$(pwd -P)"
case "$CURRENT_DIR" in
  "$TOPLEVEL/.worktrees/"*) ;;
  *)
    printf '%s\n' "checkpoint must run from a worktree under .worktrees/" >&2
    exit 10
    ;;
esac

BRANCH="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || printf 'HEAD')"
if [ "$BRANCH" = "HEAD" ]; then
  printf '%s\n' "detached HEAD blocks checkpoint" >&2
  exit 11
fi

DIRTY="$(git status --porcelain 2>/dev/null || true)"
if printf '%s\n' "$DIRTY" | grep -E '(^|\s)(\.worktrees/|\.trae/skills/|current-task-detail-runtime\.png)(\s|$)' >/dev/null 2>&1; then
  printf '%s\n' "forbidden artifacts detected in git status" >&2
  printf '%s\n' "$DIRTY" >&2
  exit 12
fi

if printf '%s\n' "$DIRTY" | grep -E '^\?\?' >/dev/null 2>&1; then
  printf '%s\n' "untracked files present; stage explicitly before checkpoint" >&2
  printf '%s\n' "$DIRTY" >&2
  exit 13
fi

git add -u

if git diff --cached --quiet; then
  printf '%s\n' "nothing staged; checkpoint skipped" >&2
  exit 14
fi

SUFFIX=""
if [ -n "$MESSAGE" ]; then
  SUFFIX=": $MESSAGE"
fi

git commit -m "chore(checkpoint): $SLICE_ID$SUFFIX"
