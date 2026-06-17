# Workspace Loop + Simulation Tests Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (recommended) or superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Consolidate repo automation into a single local dev loop and add a Jest-driven UI simulation suite with Supabase sandbox verification.

**Architecture:** Add a small shell utility (`scripts/dev-loop.sh`) plus `package.json` hooks, archive stale scripts into `scripts/archive/`, and implement a simulation driver + sandbox harness for UI and DB verification.

**Tech Stack:** Expo / React Native, TypeScript, Jest, @testing-library/react-native (existing), supabase-js, patch-package, bash.

---

## File Map

**Part 1 (Workspace cleanup + local loop)**
- Create: `/Volumes/KooDrive/Insite App/scripts/archive/`
- Create: `/Volumes/KooDrive/Insite App/scripts/dev-loop.sh`
- Modify: `/Volumes/KooDrive/Insite App/package.json`
- Modify: Move stale scripts into `/Volumes/KooDrive/Insite App/scripts/archive/` (using `git mv` where possible)

**Part 2 (Simulation suite)**
- Create: `/Volumes/KooDrive/Insite App/src/test-utils/simulation/simDriver.ts`
- Create: `/Volumes/KooDrive/Insite App/src/test-utils/supabaseTestHarness.ts`
- Create: `/Volumes/KooDrive/Insite App/src/__tests__/simulation/scenarioA.auth-session.test.tsx`
- Create: `/Volumes/KooDrive/Insite App/src/__tests__/simulation/scenarioB.create-task.test.tsx`
- Create: `/Volumes/KooDrive/Insite App/src/__tests__/simulation/scenarioC.project-switching.test.tsx`
- Create: `/Volumes/KooDrive/Insite App/src/__tests__/simulation/scenarioD.auth-db.test.ts`
- Create: `/Volumes/KooDrive/Insite App/src/__tests__/simulation/scenarioE.task-ledger-db.test.ts`
- Create: `/Volumes/KooDrive/Insite App/src/__tests__/simulation/scenarioF.storage-upload-db.test.ts`
- Modify (minimal): add stable `testID` props in screens/components needed for simulation
  - `/Volumes/KooDrive/Insite App/src/screens/LoginScreen.tsx`
  - `/Volumes/KooDrive/Insite App/src/screens/RegisterScreen.tsx`
  - `/Volumes/KooDrive/Insite App/src/screens/CreateTaskScreen.tsx`
  - `/Volumes/KooDrive/Insite App/src/screens/ProjectPickerScreen.tsx`
  - (and any subcomponents used for photo attach triggers)

**Visual mockups**
- Create: `/Volumes/KooDrive/Insite App/docs/simulation-mockups/index.html`

---

## Task 1: Workspace Cleanup + Archive

**Files:**
- Create: `/Volumes/KooDrive/Insite App/scripts/archive/`
- Modify: move stale scripts into `/Volumes/KooDrive/Insite App/scripts/archive/`

- [ ] **Step 1: Read current script list**
  - Inputs:
    - repo root scripts
    - `/scripts/*`

- [ ] **Step 2: Create archive folder**
  - Run: `mkdir -p scripts/archive`

- [ ] **Step 3: Identify stale/duplicate scripts**
  - Default rule:
    - keep “safe” variants, archive “unsafe” duplicates (e.g. `*_safe.js` keep; non-safe archive)
    - archive obviously device/emulator hard-coded one-offs unless referenced in docs

- [ ] **Step 4: Move stale scripts**
  - Use `git mv <path> scripts/archive/<basename>` for each selected file.

- [ ] **Step 5: Validate remaining scripts are space-safe**
  - Run bounded checks:
    - `bash -n` for `.sh`
    - `node -c` where applicable
    - never execute destructive scripts

---

## Task 2: Local Dev Loop Utility

**Files:**
- Create: `/Volumes/KooDrive/Insite App/scripts/dev-loop.sh`
- Modify: `/Volumes/KooDrive/Insite App/package.json`

- [ ] **Step 1: Add dev loop shell utility**
  - Must:
    - fail fast (`set -euo pipefail`)
    - be space-safe (quote repo root and args)
    - run typecheck + regression + simulation
    - push current branch only on success

- [ ] **Step 2: Wire package.json scripts**
  - Add:
    - `test:simulation`
    - `validate:local` = `npx tsc --noEmit && npm run test:regression && npm run test:simulation`
    - `push:validated` = `npm run validate:local && ./scripts/dev-loop.sh`

- [ ] **Step 3: Verify scripts run**
  - Run:
    - `npm run validate:local`
  - Expected:
    - TypeScript and regression pass (simulation may skip if sandbox env vars missing)

---

## Task 3: Supabase Sandbox Harness

**Files:**
- Create: `/Volumes/KooDrive/Insite App/src/test-utils/supabaseTestHarness.ts`

- [ ] **Step 1: Implement env gating**
  - Use:
    - `SUPABASE_TEST_URL`
    - `SUPABASE_TEST_ANON_KEY`
    - `SUPABASE_TEST_SERVICE_ROLE_KEY`
  - If missing:
    - tests should `describe.skip(...)` or early-return with a clear message

- [ ] **Step 2: Implement clients**
  - `createSandboxAnonClient()` with a controllable fetch wrapper for “offline”
  - `createSandboxServiceClient()` for DB verification and cleanup
  - Provide helpers:
    - `requireSandboxEnv()`
    - `withSandboxClients(fn)`
    - `cleanupIfAllowed(cleanupFn)` guarded by `KEEP_TEST_DATA`

---

## Task 4: Simulation Driver

**Files:**
- Create: `/Volumes/KooDrive/Insite App/src/test-utils/simulation/simDriver.ts`

- [ ] **Step 1: Implement driver helpers**
  - Wrap testing-library primitives:
    - `typeText(testId, text)`
    - `tap(testId)`
    - `scrollTo(listTestId, y)`
    - `attachImage(triggerTestId, mock)`

---

## Task 5: UI TestIDs (Minimal Production Code Changes)

**Files:**
- Modify: `/Volumes/KooDrive/Insite App/src/screens/LoginScreen.tsx`
- Modify: `/Volumes/KooDrive/Insite App/src/screens/RegisterScreen.tsx`
- Modify: `/Volumes/KooDrive/Insite App/src/screens/CreateTaskScreen.tsx`
- Modify: `/Volumes/KooDrive/Insite App/src/screens/ProjectPickerScreen.tsx`

- [ ] **Step 1: Add stable testID props**
  - Login:
    - inputs + submit
  - Register:
    - required inputs + submit
  - Create Task:
    - title + description + priority + attach button + submit
  - Project picker:
    - list + project row items

- [ ] **Step 2: Run targeted simulation test to ensure selectors resolve**

---

## Task 6: Scenario Tests (A–F)

**Files:**
- Create: `/Volumes/KooDrive/Insite App/src/__tests__/simulation/scenarioA.auth-session.test.tsx`
- Create: `/Volumes/KooDrive/Insite App/src/__tests__/simulation/scenarioB.create-task.test.tsx`
- Create: `/Volumes/KooDrive/Insite App/src/__tests__/simulation/scenarioC.project-switching.test.tsx`
- Create: `/Volumes/KooDrive/Insite App/src/__tests__/simulation/scenarioD.auth-db.test.ts`
- Create: `/Volumes/KooDrive/Insite App/src/__tests__/simulation/scenarioE.task-ledger-db.test.ts`
- Create: `/Volumes/KooDrive/Insite App/src/__tests__/simulation/scenarioF.storage-upload-db.test.ts`

- [ ] **Step 1: A – Auth & Session resiliency (UI)**
- [ ] **Step 2: B – Create task & form persistence (UI)**
- [ ] **Step 3: C – Project switching (UI)**
- [ ] **Step 4: D – Auth/user profile convergence (DB)**
- [ ] **Step 5: E – Task ledger write verification (DB)**
- [ ] **Step 6: F – Storage upload integrity (DB)**

---

## Task 7: Visual Mockups (Local HTML)

**Files:**
- Create: `/Volumes/KooDrive/Insite App/docs/simulation-mockups/index.html`

- [ ] **Step 1: Add a single HTML file with flow diagrams**
- [ ] **Step 2: Serve it locally and provide URL**

