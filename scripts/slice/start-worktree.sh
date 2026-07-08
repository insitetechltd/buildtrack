#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd -P)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." >/dev/null 2>&1 && pwd -P)"
cd "$ROOT_DIR"

SLICE_ID="${1:-}"
BASE_REF="${2:-origin/master}"

if [ -z "$SLICE_ID" ]; then
  printf '%s\n' "usage: bash scripts/slice/start-worktree.sh <slice-id> [base-ref]" >&2
  exit 2
fi

if ! command -v git >/dev/null 2>&1; then
  printf '%s\n' "git is required" >&2
  exit 3
fi

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  printf '%s\n' "not in a git repository" >&2
  exit 4
fi

if ! git rev-parse --verify "$BASE_REF" >/dev/null 2>&1; then
  printf '%s\n' "base ref not found: $BASE_REF" >&2
  exit 5
fi

SAFE_SLICE_ID="$(printf '%s' "$SLICE_ID" | tr '/ ' '--')"
WORKTREE_DIR="$ROOT_DIR/.worktrees/$SAFE_SLICE_ID"
BRANCH_NAME="slice/$SAFE_SLICE_ID"

if [ -e "$WORKTREE_DIR" ]; then
  printf '%s\n' "worktree already exists: $WORKTREE_DIR" >&2
  exit 6
fi

mkdir -p "$ROOT_DIR/.worktrees"
git worktree add "$WORKTREE_DIR" -b "$BRANCH_NAME" "$BASE_REF"
printf '%s\n' "$WORKTREE_DIR"
