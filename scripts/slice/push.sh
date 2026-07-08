#!/usr/bin/env bash
set -euo pipefail

if ! command -v git >/dev/null 2>&1; then
  printf '%s\n' "git is required" >&2
  exit 3
fi

TOPLEVEL="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [ -z "$TOPLEVEL" ]; then
  printf '%s\n' "push must run inside a git worktree" >&2
  exit 4
fi

case "$TOPLEVEL" in
  */.worktrees/*) ;;
  *)
    printf '%s\n' "push must run from a worktree under .worktrees/" >&2
    exit 10
    ;;
esac

cd "$TOPLEVEL"

export ALLOW_VALIDATED_PUSH=1
bash scripts/validation/push-validated.sh
