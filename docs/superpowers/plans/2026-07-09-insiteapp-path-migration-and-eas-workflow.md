# InsiteApp Path Migration & EAS Workflow Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the repo to a no-space path (`/Volumes/KooDrive/InsiteApp`), eliminate runtime reliance on space-containing paths, and standardize EAS local build + artifacts under a single, deterministic directory.

**Architecture:** Make all scripts path-agnostic by deriving paths from project root; use EAS local build environment variables to force a unique working directory per run and a stable artifacts directory; replace any remaining hard-coded `/Volumes/KooDrive/Insite App` references in runnable scripts/config with no-space equivalents or relative paths.

**Tech Stack:** Bash scripts, Node.js post-install hook, Expo EAS Build (local), EAS Submit, patch-package.

---

## File/Area Map

**High-impact runtime paths (must be fixed)**
- Modify: `/Volumes/KooDrive/Insite App/build-local.sh`
- Modify: `/Volumes/KooDrive/Insite App/build-and-submit.sh`
- Modify: `/Volumes/KooDrive/Insite App/scripts/eas/eas-build-post-install.js` (keep robust; no absolute paths)

**Documentation / operational references (should be updated)**
- Modify: `*.md` docs that instruct `cd "/Volumes/KooDrive/Insite App"`

**Non-runtime artifacts (low risk, optional)**
- `patches/*.patch` contains embedded absolute paths as diff metadata. This is not executed at runtime; optional to clean.

---

## Task 1: Rename repo folder to no-space path

**Files:**
- No code changes; manual filesystem operation.

- [ ] **Step 1: Verify no Metro/dev servers are using the folder**

Expected: no watchers locked on the directory.

- [ ] **Step 2: Rename the directory**

Run (manual, on your Mac Terminal):

```bash
mv "/Volumes/KooDrive/Insite App" "/Volumes/KooDrive/InsiteApp"
```

- [ ] **Step 3: Re-open workspace**

Open the IDE at:
`/Volumes/KooDrive/InsiteApp`

Expected: the repo loads normally, node_modules paths resolve, and scripts run.

---

## Task 2: Standardize EAS dirs under the repo

**Files:**
- Create: `/Volumes/KooDrive/InsiteApp/.eas/local-build/`
- Create: `/Volumes/KooDrive/InsiteApp/.eas/artifacts/`

- [ ] **Step 1: Create the directories**

```bash
mkdir -p "/Volumes/KooDrive/InsiteApp/.eas/local-build"
mkdir -p "/Volumes/KooDrive/InsiteApp/.eas/artifacts"
```

- [ ] **Step 2: Move legacy external EAS folders (if they exist)**

```bash
# Only if these exist; ignore missing
mv "/Volumes/KooDrive/eas-local-build" "/Volumes/KooDrive/InsiteApp/.eas/local-build" 2>/dev/null || true
mv "/Volumes/KooDrive/eas-artifacts" "/Volumes/KooDrive/InsiteApp/.eas/artifacts" 2>/dev/null || true
```

- [ ] **Step 3: Confirm final layout**

Expected:
- `/Volumes/KooDrive/InsiteApp/.eas/local-build/...`
- `/Volumes/KooDrive/InsiteApp/.eas/artifacts/...`

---

## Task 3: Make build-local deterministic and space-safe

**Files:**
- Modify: `/Volumes/KooDrive/InsiteApp/build-local.sh`

- [ ] **Step 1: Set the default EAS local build working dir to a unique run folder under `.eas/local-build/`**

Target behavior (Bash snippet):

```bash
PROJECT_ROOT="$(pwd)"
LOCAL_BUILD_WORKDIR_BASE="${EAS_LOCAL_BUILD_WORKINGDIR:-"$PROJECT_ROOT/.eas/local-build"}"
LOCAL_BUILD_WORKDIR="$LOCAL_BUILD_WORKDIR_BASE/run-$(date +%s)"
mkdir -p "$LOCAL_BUILD_WORKDIR"
export EAS_LOCAL_BUILD_WORKINGDIR="$LOCAL_BUILD_WORKDIR"
export EAS_LOCAL_BUILD_SKIP_CLEANUP="${EAS_LOCAL_BUILD_SKIP_CLEANUP:-1}"
```

- [ ] **Step 2: Set the default artifacts dir under `.eas/artifacts/`**

Target behavior (Bash snippet):

```bash
LOCAL_BUILD_ARTIFACTS_DIR="${EAS_LOCAL_BUILD_ARTIFACTS_DIR:-"$PROJECT_ROOT/.eas/artifacts"}"
mkdir -p "$LOCAL_BUILD_ARTIFACTS_DIR"
export EAS_LOCAL_BUILD_ARTIFACTS_DIR="$LOCAL_BUILD_ARTIFACTS_DIR"
```

- [ ] **Step 3: Remove misleading local buildNumber increment (optional but recommended)**

Rationale: `eas.json` uses `appVersionSource: remote`, so EAS increments the remote build number regardless; changing app.json adds churn and confusion.

If removed, ensure the script prints:
- JS version (`expo.version`)
- “EAS remote iOS build number auto-increments” note

- [ ] **Step 4: Validate**

Run:

```bash
cd "/Volumes/KooDrive/InsiteApp"
./build-local.sh ios production-local true
```

Expected:
- Uses workingdir under `/Volumes/KooDrive/InsiteApp/.eas/local-build/run-...`
- Writes IPA under `/Volumes/KooDrive/InsiteApp/.eas/artifacts/`

---

## Task 4: Make build-and-submit use the new artifact location and be non-interactive

**Files:**
- Modify: `/Volumes/KooDrive/InsiteApp/build-and-submit.sh`

- [ ] **Step 1: Locate IPA from `.eas/artifacts/`**

Target behavior:

```bash
ARTIFACT_DIR="${EAS_LOCAL_BUILD_ARTIFACTS_DIR:-"$(pwd)/.eas/artifacts"}"
LATEST_IPA=$(ls -t "$ARTIFACT_DIR"/*.ipa 2>/dev/null | head -1 || true)
```

- [ ] **Step 2: Remove interactive prompt (or gate behind a flag)**

Recommended:
- Default: non-interactive (CI-friendly)
- Optional: `--confirm` enables prompt

- [ ] **Step 3: Validate**

Run:

```bash
cd "/Volumes/KooDrive/InsiteApp"
./build-and-submit.sh ios production
```

Expected:
- Builds successfully
- Submits the IPA located in `.eas/artifacts/`

---

## Task 5: Scan and fix hard-coded old paths across runnable files

**Files:**
- Modify: any scripts/docs that contain `/Volumes/KooDrive/Insite App`

- [ ] **Step 1: Search for old absolute path**

Run:

```bash
cd "/Volumes/KooDrive/InsiteApp"
rg -n "/Volumes/KooDrive/Insite App" .
```

- [ ] **Step 2: Categorize matches**

Rules:
- If it’s a **script/config executed at runtime** → must change to new path or (preferably) remove absolute path entirely.
- If it’s **documentation** → update to `/Volumes/KooDrive/InsiteApp`.
- If it’s **patch metadata** in `patches/*.patch` → optional; do not change unless necessary.

- [ ] **Step 3: Apply replacements**

Preferred replacement strategy:
- Replace `cd "/Volumes/KooDrive/Insite App"` with `cd "$(git rev-parse --show-toplevel)"` when inside a git repo.
- Otherwise replace with `cd "/Volumes/KooDrive/InsiteApp"`.

---

## Task 6: Final verification checklist (prevents next roadblocks)

- [ ] **Step 1: Ensure no-space path is used**

Run:

```bash
pwd
```

Expected: `/Volumes/KooDrive/InsiteApp`

- [ ] **Step 2: Ensure EAS local build no longer uses /tmp**

Run a build and confirm workingdir lines show `.eas/local-build`.

- [ ] **Step 3: Ensure `eas-build-post-install` still runs**

Expected in logs:
- `[eas-build-post-install] fmt patch: applied|skipped`
- `[eas-build-post-install] imgly patch: applied|skipped`

- [ ] **Step 4: Ensure submission works**

Run:

```bash
npx eas submit --platform ios --profile production --path "<latest ipa path>" --non-interactive
```

Expected: scheduled + uploaded to App Store Connect.

