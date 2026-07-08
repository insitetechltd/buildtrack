#!/usr/bin/env bash
set -euo pipefail

if ! command -v git >/dev/null 2>&1; then
  printf '%s\n' "git is required" >&2
  exit 3
fi

TOPLEVEL="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [ -z "$TOPLEVEL" ]; then
  printf '%s\n' "validate must run inside a git worktree" >&2
  exit 4
fi

case "$TOPLEVEL" in
  */.worktrees/*) ;;
  *)
    printf '%s\n' "validate must run from a worktree under .worktrees/" >&2
    exit 10
    ;;
esac

cd "$TOPLEVEL"

VALIDATE_LOCAL_STRICT_DIRTY_TREE=1 bash scripts/validation/validate-local.sh
