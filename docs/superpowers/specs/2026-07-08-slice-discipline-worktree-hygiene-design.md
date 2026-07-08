# Slice Discipline & Worktree Hygiene (Hard-Block) Design

**Goal:** Eliminate recurring “dirty worktree drift” by codifying a strict, repeatable workflow that (1) isolates slice work in `.worktrees/`, (2) forces checkpoint commits, and (3) blocks merges/pushes when validation or hygiene rules fail.

## Scope

This design defines:
- Worktree and branch hygiene rules.
- A hard-block checkpoint/validate/push workflow.
- Minimal scripts that enforce the rules without changing app runtime behavior.

This design does not:
- Replace existing validation tooling in `scripts/validation/`.
- Change Expo/React Native build configuration.
- Change application logic.

## Definitions

- **Root worktree:** `/Volumes/KooDrive/Insite App` (the repository root).
- **Slice worktree:** a worktree created under `.worktrees/<slice-id>`.
- **Slice id:** a taxonomy identifier like `WS-UX/S-UX-01I` (or a file-system-safe equivalent).

## Rules (Hard Requirements)

### Rule 0: Root stays clean and integration-only

- The root worktree is used for:
  - merging slice branches,
  - running validation,
  - pushing to remote.
- The root worktree is not used for feature implementation work.

### Rule 1: One slice == one worktree

- Every slice work happens in its own worktree under `.worktrees/`.
- Worktrees are named after the slice id using a file-system-safe form.

### Rule 2: Mandatory checkpoints after each slice phase

Phases:
- Plan → Code → Review → Test

Checkpoint requirement:
- At the end of each phase, the slice worktree must produce a commit.
- The checkpoint script must hard-block when:
  - invoked outside `.worktrees/…`,
  - HEAD is detached,
  - forbidden artifacts are staged or modified,
  - there is nothing staged to commit.

### Rule 3: Validated pushes only

- Pushing to remote must happen through the existing validated path:
  - `scripts/validation/push-validated.sh`
- Validation must be strict:
  - dirty worktree blocks validation (`VALIDATE_LOCAL_STRICT_DIRTY_TREE=1`).

### Rule 4: Forbidden artifacts must never be committed

These must be ignored and must hard-fail the checkpoint script if staged/modified:
- `.worktrees/`
- `.trae/skills/`
- `current-task-detail-runtime.png`

## Tooling Design

### scripts/slice/start-worktree.sh

Purpose:
- Create a new slice branch and worktree under `.worktrees/`.

Contract:
- Input: `<slice-id>` and optional `<base-ref>`
- Output: prints created worktree path and branch
- Hard-fails if:
  - target worktree path already exists,
  - base ref is missing.

### scripts/slice/checkpoint.sh

Purpose:
- Enforce and create checkpoint commits in slice worktrees.

Contract:
- Input: `<slice-id>` and optional message text
- Staging policy:
  - `git add -u` (tracked changes only)
  - if untracked files exist, fail and require explicit staging by the user
- Hard-fails if:
  - not running inside `.worktrees/…`,
  - forbidden artifacts are present in `git status`,
  - nothing staged.

### scripts/slice/validate.sh

Purpose:
- Run strict local validation using the existing `scripts/validation/validate-local.sh`.

Contract:
- Hard-fails on dirty tree, type errors, or test failures.

### scripts/slice/push.sh

Purpose:
- Run the existing validated push and require pushing (not skipping).

Contract:
- Sets `ALLOW_VALIDATED_PUSH=1` and executes `scripts/validation/push-validated.sh`.

## Developer UX (Recommended Commands)

Create a slice worktree:

```bash
bash scripts/slice/start-worktree.sh WS-UX-S-UX-01I origin/master
```

Checkpoint after a phase:

```bash
bash scripts/slice/checkpoint.sh WS-UX-S-UX-01I "code phase checkpoint"
```

Strict validation:

```bash
bash scripts/slice/validate.sh
```

Validated push:

```bash
bash scripts/slice/push.sh
```

## Acceptance Criteria

- Root worktree can remain clean during slice development.
- Checkpoint script blocks commits if forbidden artifacts appear.
- Validation blocks pushes for dirty trees and failing tests/types.
- `.gitignore` prevents recurring accidental staging of `.worktrees`, `.trae/skills`, and the runtime screenshot.
