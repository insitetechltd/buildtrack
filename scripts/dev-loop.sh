#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"

NO_PUSH=0
if [ "${1:-}" = "--no-push" ]; then
  NO_PUSH=1
  shift
fi

cd "$ROOT_DIR"

npx tsc --noEmit
npm run test:regression
npm run test:simulation

if [ "$NO_PUSH" -eq 1 ]; then
  exit 0
fi

BRANCH="$(git rev-parse --abbrev-ref HEAD)"
if [ "$BRANCH" = "HEAD" ]; then
  echo "Refusing to push: detached HEAD"
  exit 1
fi

if git rev-parse --abbrev-ref --symbolic-full-name "@{u}" >/dev/null 2>&1; then
  git push
else
  git push -u origin "$BRANCH"
fi
