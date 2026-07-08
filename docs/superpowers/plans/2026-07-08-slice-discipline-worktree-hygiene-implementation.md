# Slice Discipline & Worktree Hygiene Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add hard-block workflow scripts and documentation to prevent dirty worktree drift and enforce checkpoint commits per slice.

**Architecture:** Small bash wrappers under `scripts/slice/` that hard-fail when rules are violated and delegate validation/push to existing scripts in `scripts/validation/`.

**Tech Stack:** bash, git, existing `scripts/validation/*` tooling.

---

## File Map

**Create**
- `docs/superpowers/specs/2026-07-08-slice-discipline-worktree-hygiene-design.md`
- `docs/superpowers/plans/2026-07-08-slice-discipline-worktree-hygiene-implementation.md`
- `scripts/slice/start-worktree.sh`
- `scripts/slice/checkpoint.sh`
- `scripts/slice/validate.sh`
- `scripts/slice/push.sh`

**Modify**
- `.gitignore`

---

### Task 1: Add `.gitignore` hygiene entries

**Files:**
- Modify: `.gitignore`

- [ ] **Step 1: Write the change**

Add:

```gitignore
.worktrees/
.trae/skills/
current-task-detail-runtime.png
```

- [ ] **Step 2: Verify git ignore behavior**

Run:

```bash
git status --short
```

Expected: those paths do not appear as untracked after creation (if present locally).

---

### Task 2: Add `scripts/slice/start-worktree.sh`

**Files:**
- Create: `scripts/slice/start-worktree.sh`

- [ ] **Step 1: Create script**

```bash
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

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  printf '%s\n' "not in a git repository" >&2
  exit 3
fi

if ! git rev-parse --verify "$BASE_REF" >/dev/null 2>&1; then
  printf '%s\n' "base ref not found: $BASE_REF" >&2
  exit 4
fi

SAFE_SLICE_ID="$(printf '%s' "$SLICE_ID" | tr '/ ' '--')"
WORKTREE_DIR="$ROOT_DIR/.worktrees/$SAFE_SLICE_ID"
BRANCH_NAME="slice/$SAFE_SLICE_ID"

if [ -e "$WORKTREE_DIR" ]; then
  printf '%s\n' "worktree already exists: $WORKTREE_DIR" >&2
  exit 5
fi

mkdir -p "$ROOT_DIR/.worktrees"
git worktree add "$WORKTREE_DIR" -b "$BRANCH_NAME" "$BASE_REF"
printf '%s\n' "$WORKTREE_DIR"
```

- [ ] **Step 2: Verify script syntax**

Run:

```bash
bash -n scripts/slice/start-worktree.sh
```

Expected: exit 0.

---

### Task 3: Add `scripts/slice/checkpoint.sh`

**Files:**
- Create: `scripts/slice/checkpoint.sh`

- [ ] **Step 1: Create script**

```bash
#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd -P)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." >/dev/null 2>&1 && pwd -P)"
cd "$ROOT_DIR"

SLICE_ID="${1:-}"
SHIFTED_MESSAGE="${2:-}"

if [ -z "$SLICE_ID" ]; then
  printf '%s\n' "usage: bash scripts/slice/checkpoint.sh <slice-id> [message]" >&2
  exit 2
fi

TOPLEVEL="$(git rev-parse --show-toplevel)"
PWD_REAL="$(pwd -P)"
if [ "$PWD_REAL" = "$TOPLEVEL" ]; then
  :
fi

CURRENT_DIR="$(pwd -P)"
case "$CURRENT_DIR" in
  "$TOPLEVEL/.worktrees/"*) ;;
  *)
    printf '%s\n' "checkpoint must run from a slice worktree under .worktrees/" >&2
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

MSG_SUFFIX=""
if [ -n "$SHIFTED_MESSAGE" ]; then
  MSG_SUFFIX=": $SHIFTED_MESSAGE"
fi

git commit -m "chore(checkpoint): $SLICE_ID$MSG_SUFFIX"
```

- [ ] **Step 2: Verify script syntax**

Run:

```bash
bash -n scripts/slice/checkpoint.sh
```

Expected: exit 0.

---

### Task 4: Add strict validate/push wrappers

**Files:**
- Create: `scripts/slice/validate.sh`
- Create: `scripts/slice/push.sh`

- [ ] **Step 1: Create validate wrapper**

```bash
#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd -P)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." >/dev/null 2>&1 && pwd -P)"
cd "$ROOT_DIR"

VALIDATE_LOCAL_STRICT_DIRTY_TREE=1 bash "$ROOT_DIR/scripts/validation/validate-local.sh"
```

- [ ] **Step 2: Create push wrapper**

```bash
#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd -P)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." >/dev/null 2>&1 && pwd -P)"
cd "$ROOT_DIR"

export ALLOW_VALIDATED_PUSH=1
bash "$ROOT_DIR/scripts/validation/push-validated.sh"
```

- [ ] **Step 3: Verify syntax**

Run:

```bash
bash -n scripts/slice/validate.sh
bash -n scripts/slice/push.sh
```

Expected: exit 0.

---

### Task 5: Make scripts executable + sanity run

**Files:**
- Modify: file modes for `scripts/slice/*.sh`

- [ ] **Step 1: Mark executable**

Run:

```bash
chmod +x scripts/slice/*.sh
```

- [ ] **Step 2: Sanity run local validation (strict)**

Run:

```bash
bash scripts/slice/validate.sh
```

Expected: exit 0 in a clean worktree, or a clear failure message on dirty trees.

---

### Task 6: Commit

**Files:**
- Commit: docs + scripts + `.gitignore`

- [ ] **Step 1: Stage**

```bash
git add .gitignore scripts/slice docs/superpowers/specs/2026-07-08-slice-discipline-worktree-hygiene-design.md docs/superpowers/plans/2026-07-08-slice-discipline-worktree-hygiene-implementation.md
```

- [ ] **Step 2: Commit**

```bash
git commit -m "chore(workflow): enforce slice worktree checkpoints"
```

---
