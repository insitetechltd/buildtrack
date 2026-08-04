# QA Maestro Foundation And Confidence Promotion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Promote the root Maestro foundation for `M-QA-02`, then add the hybrid journey plus live-Supabase confidence surface required for `M-QA-03`.

**Architecture:** Keep the milestone boundary explicit. `M-QA-02` adds the root Maestro scaffold, repo-local wrapper, and Sprint 7 bootstrap flows. `M-QA-03` then layers in the Jest journey harness, confidence-script escalation, and live Supabase-backed Task Core Maestro flows without treating Sprint 7 as workflow truth.

**Tech Stack:** Expo dev client, React Native, Jest, Maestro, Bash, TypeScript, Zustand, Supabase

---

## File Structure

### Root Maestro Foundation Files

- Create: `maestro/flows/launch-smoke.yaml`
- Create: `maestro/flows/sprint7-open-developer-settings.yaml`
- Create: `maestro/flows/sprint7-initialize-sandbox.yaml`
- Create: `scripts/maestro/run-local.sh`
- Modify: `package.json`
- Modify: `maestro/README.md`

### Root Journey Confidence Files

- Create: `src/test-utils/journeys/renderAppShellJourney.tsx`
- Create: `src/test-utils/journeys/seedJourneyState.ts`
- Create: `src/__tests__/journeys/authenticated-shell.journey.test.tsx`
- Create: `src/__tests__/journeys/project-switching.journey.test.tsx`
- Create: `src/__tests__/journeys/task-detail-verification.journey.test.tsx`
- Modify: `package.json`

### Validation Escalation Files

- Modify: `scripts/validation/validate-local.sh`
- Modify: `scripts/dev-loop.sh`
- Modify: `TESTING_STRATEGY.md`

### Live Supabase Maestro Confidence Files

- Create: `maestro/flows/bootstrap-live-manager-a.yaml`
- Create: `maestro/flows/bootstrap-live-worker-a1.yaml`
- Create: `maestro/flows/pick-first-image.yaml`
- Create: `maestro/flows/task-core-live-create.yaml`
- Create: `maestro/flows/task-core-live-assign.yaml`
- Create: `maestro/flows/task-core-live-progress.yaml`
- Create: `maestro/flows/task-core-live-completion.yaml`
- Create: `maestro/flows/task-core-live-photo-upload.yaml`
- Modify: `package.json`
- Modify: `maestro/README.md`
- Modify: `TESTING_STRATEGY.md`
- Modify: `documentation/ROADMAP.md`
- Modify: `AGENTS.md`

## Task 1: Promote The `M-QA-02` Root Maestro Foundation

**Files:**
- Create: `scripts/maestro/run-local.sh`
- Create: `maestro/flows/launch-smoke.yaml`
- Create: `maestro/flows/sprint7-open-developer-settings.yaml`
- Create: `maestro/flows/sprint7-initialize-sandbox.yaml`
- Modify: `package.json`

- [ ] **Step 1: Prove the root repo is missing the Maestro command surface**

Run:

```bash
npm run test:e2e:maestro:smoke
```

Expected: npm exits with a missing-script error because `package.json` does not yet define the root Maestro smoke command.

- [ ] **Step 2: Add the repo-local Maestro wrapper**

Create `scripts/maestro/run-local.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

SCRIPT_PATH="${BASH_SOURCE[0]}"
SCRIPT_DIR="$(cd "$(dirname "$SCRIPT_PATH")" >/dev/null 2>&1 && pwd -P)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." >/dev/null 2>&1 && pwd -P)"
MAESTRO_LOCAL_HOME="${MAESTRO_LOCAL_HOME:-$ROOT_DIR/.cache/maestro-home}"

mkdir -p "$MAESTRO_LOCAL_HOME/.maestro"

MAESTRO_BIN="${MAESTRO_BIN:-}"
if [ -z "$MAESTRO_BIN" ]; then
  if command -v maestro >/dev/null 2>&1; then
    MAESTRO_BIN="$(command -v maestro)"
  elif [ -x "$HOME/.maestro/bin/maestro" ]; then
    MAESTRO_BIN="$HOME/.maestro/bin/maestro"
  else
    printf '%s\n' "Unable to locate the Maestro CLI. Install it or set MAESTRO_BIN." >&2
    exit 127
  fi
fi

if [ -n "${MAESTRO_OPTS:-}" ]; then
  export MAESTRO_OPTS="${MAESTRO_OPTS} -Duser.home=$MAESTRO_LOCAL_HOME"
else
  export MAESTRO_OPTS="-Duser.home=$MAESTRO_LOCAL_HOME"
fi

exec "$MAESTRO_BIN" "$@"
```

- [ ] **Step 3: Add the three `M-QA-02` foundation flows**

Create `maestro/flows/launch-smoke.yaml`:

```yaml
appId: com.buildtrack.app.local
---
- openLink:
    link: "exp+buildtrack://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8081"
- runFlow:
    when:
      visible: 'Open in “Taskr”?'
    commands:
      - tapOn: Open
- runFlow:
    when:
      visible: "http://localhost:8081"
    commands:
      - tapOn: "http://localhost:8081"
- openLink:
    link: "taskr://automation/sprint7/tristan"
- runFlow:
    when:
      visible: 'Open in “Taskr”?'
    commands:
      - tapOn: Open
- assertVisible:
    id: "dashboard-screen__root"
- assertVisible:
    id: "app-screen-header__profile-trigger"
```

Create `maestro/flows/sprint7-open-developer-settings.yaml`:

```yaml
appId: com.buildtrack.app.local
---
- launchApp:
    clearState: false
- assertVisible:
    id: "dashboard-screen__root"
- tapOn:
    id: "app-screen-header__profile-trigger"
- tapOn:
    id: "profile-menu-developer_settings"
- assertVisible:
    id: "developer-settings__root"
- assertVisible:
    id: "developer-settings__action_initialize-sprint7-sandbox"
```

Create `maestro/flows/sprint7-initialize-sandbox.yaml`:

```yaml
appId: com.buildtrack.app.local
---
- launchApp:
    clearState: false
- assertVisible:
    id: "dashboard-screen__root"
- tapOn:
    id: "app-screen-header__profile-trigger"
- tapOn:
    id: "profile-menu-developer_settings"
- assertVisible:
    id: "developer-settings__action_initialize-sprint7-sandbox"
- tapOn:
    id: "developer-settings__action_initialize-sprint7-sandbox"
- tapOn: "Reset as Tristan"
- assertVisible: "Sprint 7 Sandbox Ready"
- tapOn: "OK"
- assertVisible:
    id: "developer-settings__preset_a"
```

- [ ] **Step 4: Wire the root scripts in `package.json`**

Modify the `scripts` block in `package.json`:

```json
"test:e2e:maestro:smoke": "bash ./scripts/maestro/run-local.sh test maestro/flows/launch-smoke.yaml"
```

Add it after `test:regression` so the root script surface matches the foundation milestone.

- [ ] **Step 5: Run the smallest root foundation checks**

Run:

```bash
bash ./scripts/maestro/run-local.sh --version
npm run test:e2e:maestro:smoke
```

Expected:

- the wrapper prints a Maestro version instead of touching host `~/.maestro/deps`
- the smoke flow either passes or fails on a real simulator/runtime precondition rather than on missing files or missing scripts

- [ ] **Step 6: Commit the `M-QA-02` foundation scaffold**

Run:

```bash
git add package.json scripts/maestro/run-local.sh maestro/flows/launch-smoke.yaml maestro/flows/sprint7-open-developer-settings.yaml maestro/flows/sprint7-initialize-sandbox.yaml
git commit -m "test(maestro): add root foundation flows"
```

## Task 2: Make The Root Docs Truthful For `M-QA-02`

**Files:**
- Modify: `maestro/README.md`
- Modify: `TESTING_STRATEGY.md`

- [ ] **Step 1: Add the foundation flow inventory and install instructions to `maestro/README.md`**

Replace the placeholder status section with an operational foundation section:

```md
## Files

- `flows/launch-smoke.yaml`: verifies the installed dev client launches into the authenticated app shell.
- `flows/sprint7-open-developer-settings.yaml`: opens the `Profile -> Developer Settings` route.
- `flows/sprint7-initialize-sandbox.yaml`: initializes the canonical Sprint 7 sandbox through the in-app action.

## Preconditions

- Maestro CLI is installed locally.
- The iOS simulator is booted.
- The local dev client is installed for `com.buildtrack.app.local`.
- Metro is running with `npx expo start --dev-client`.
```

- [ ] **Step 2: Add the root runtime-alignment notes and direct run commands**

Append the run commands to `maestro/README.md`:

```md
## Run Flows

```bash
npm run test:e2e:maestro:smoke
bash ./scripts/maestro/run-local.sh test maestro/flows/sprint7-open-developer-settings.yaml
bash ./scripts/maestro/run-local.sh test maestro/flows/sprint7-initialize-sandbox.yaml
```

## Flow Notes

- `M-QA-02` uses Sprint 7 only as a foundation/bootstrap path.
- These flows do not claim live workflow correctness.
```
```

- [ ] **Step 3: Teach `TESTING_STRATEGY.md` about the root Maestro foundation**

Insert a new root Maestro layer section after the regression layer:

```md
## Layer 3: Native Simulator Smoke

Use this layer when the change is user-visible and you need proof that the installed iOS dev client still behaves correctly under real taps on the simulator.

### Primary Scripts

- `npm run test:e2e:maestro:smoke`

### Scope

- launch smoke for the installed iOS dev client
- Sprint 7 Developer Settings entry
- Sprint 7 sandbox bootstrap
- local Maestro environment validation
```

- [ ] **Step 4: Verify the docs point to real root files and commands**

Run:

```bash
grep -n "test:e2e:maestro:smoke" package.json TESTING_STRATEGY.md maestro/README.md
grep -n "sprint7-initialize-sandbox" maestro/README.md
```

Expected: each command and flow name resolves to a real root file or script path.

- [ ] **Step 5: Commit the `M-QA-02` documentation pass**

Run:

```bash
git add maestro/README.md TESTING_STRATEGY.md
git commit -m "docs(maestro): document root foundation runbook"
```

## Task 3: Add The `M-QA-03` Journey Harness And Confidence Scripts

**Files:**
- Create: `src/test-utils/journeys/renderAppShellJourney.tsx`
- Create: `src/test-utils/journeys/seedJourneyState.ts`
- Create: `src/__tests__/journeys/authenticated-shell.journey.test.tsx`
- Create: `src/__tests__/journeys/project-switching.journey.test.tsx`
- Create: `src/__tests__/journeys/task-detail-verification.journey.test.tsx`
- Modify: `package.json`
- Modify: `scripts/validation/validate-local.sh`
- Modify: `scripts/dev-loop.sh`

- [ ] **Step 1: Prove the root repo has no journey layer yet**

Run:

```bash
test -d src/__tests__/journeys || echo "journeys-missing"
npm run test:e2e:journeys
```

Expected:

- the directory probe prints `journeys-missing`
- npm exits with a missing-script error

- [ ] **Step 2: Add the tiny journey harness helpers**

Create `src/test-utils/journeys/renderAppShellJourney.tsx`:

```tsx
import React from "react";
import { render } from "@testing-library/react-native";

import AppNavigator from "@/navigation/AppNavigator";

export function renderAppShellJourney(_initialUrl?: string) {
  return render(<AppNavigator />);
}
```

Create `src/test-utils/journeys/seedJourneyState.ts`:

```ts
import { useAuthStore } from "@/state/authStore";
import { useProjectFilterStore } from "@/state/projectFilterStore";

export type JourneySeedOptions = {
  authUser?: { id: string; role?: string } | null;
  selectedProjectId?: string | null;
};

export function seedJourneyState(options: JourneySeedOptions): void {
  const authUser = options.authUser
    ? { ...options.authUser, role: options.authUser.role ?? "worker" }
    : null;

  useAuthStore.setState({
    user: authUser as never,
    isAuthenticated: Boolean(authUser),
    isInitialized: true,
    isLoading: false,
    session: null,
    error: null,
  });

  useProjectFilterStore.setState({
    selectedProjectId: options.selectedProjectId ?? null,
    workspaceReady: true,
    workspaceReadyUserId: authUser?.id ?? null,
  });
}
```

- [ ] **Step 3: Add the three journey tests**

Create `src/__tests__/journeys/authenticated-shell.journey.test.tsx`:

```tsx
import React from "react";
import { screen } from "@testing-library/react-native";
import { renderAppShellJourney } from "@/test-utils/journeys/renderAppShellJourney";
import { seedJourneyState } from "@/test-utils/journeys/seedJourneyState";

jest.mock("@react-navigation/native", () => ({
  getFocusedRouteNameFromRoute: () => undefined,
  NavigationContainer: ({ children }: { children: React.ReactNode }) => children,
}));

describe("authenticated shell journey", () => {
  it("renders the authenticated root tabs when a seeded user exists", async () => {
    seedJourneyState({
      authUser: { id: "user-1", role: "worker" },
      selectedProjectId: "project-1",
    });

    renderAppShellJourney();

    expect(await screen.findByTestId("root-tab__activity")).toBeTruthy();
    expect(screen.getByTestId("root-tab__tasks")).toBeTruthy();
  });
});
```

Create `src/__tests__/journeys/project-switching.journey.test.tsx`:

```tsx
import React from "react";
import { act, fireEvent, render } from "@testing-library/react-native";
import ProjectPickerScreen from "@/screens/ProjectPickerScreen";

const mockSetSelectedProject = jest.fn(async () => {});
const mockFetchTasks = jest.fn(async () => {});
const mockFetchProjects = jest.fn(async () => {});
const mockFetchUserProjectAssignments = jest.fn(async () => {});
const mockFetchUsers = jest.fn(async () => {});

jest.mock("@/state/projectFilterStore", () => ({
  useProjectFilterStore: () => ({
    selectedProjectId: "project-1",
    setSelectedProject: mockSetSelectedProject,
  }),
}));

describe("project switching journey", () => {
  it("switches to a new project row through stable row test ids", async () => {
    const onNavigateBack = jest.fn();
    const view = render(<ProjectPickerScreen onNavigateBack={onNavigateBack} allowBack />);

    await act(async () => {
      fireEvent.press(view.getByTestId("projectPicker-project-project-2"));
      await Promise.resolve();
    });

    expect(mockSetSelectedProject).toHaveBeenCalledWith("project-2", "user-1");
    expect(mockFetchTasks).toHaveBeenCalled();
    expect(onNavigateBack).toHaveBeenCalled();
  });
});
```

Create `src/__tests__/journeys/task-detail-verification.journey.test.tsx`:

```tsx
import { buildTaskDetailVerificationUrl } from "@/navigation/screenVerification";

describe("task detail verification journey", () => {
  it("builds a deterministic verification url for task detail", () => {
    expect(buildTaskDetailVerificationUrl("task-123")).toBe("taskr://verify/task/task-123");
  });
});
```

- [ ] **Step 4: Add the journey and confidence scripts**

Modify `package.json`:

```json
"test:e2e:journeys": "jest src/__tests__/journeys --runInBand",
"test:confidence": "npm run test:regression && npm run test:e2e:journeys",
"validate:local:confidence": "VALIDATE_LOCAL_RUN_JOURNEYS=1 bash \"./scripts/validation/validate-local.sh\""
```

Modify `scripts/validation/validate-local.sh` to add the journey gate:

```bash
RUN_JOURNEYS="${VALIDATE_LOCAL_RUN_JOURNEYS:-0}"

if [ "$RUN_JOURNEYS" = "1" ]; then
  run_stage_command \
    "stage_4_journeys" \
    "4" \
    "npm run test:e2e:journeys" \
    "[JOURNEY_FAILURE]" \
    "32" \
    "fix_journeys" \
    npm run test:e2e:journeys
fi
```

Modify `scripts/dev-loop.sh` to forward the new flag:

```bash
VALIDATE_LOCAL_RUN_JOURNEYS="${VALIDATE_LOCAL_RUN_JOURNEYS:-0}"

if [ "${1:-}" = "--confidence" ]; then
  VALIDATE_LOCAL_RUN_JOURNEYS=1
  shift
fi
```

- [ ] **Step 5: Run the new `M-QA-03` Jest confidence layer**

Run:

```bash
npm run test:e2e:journeys
npm run test:confidence
npm run validate:local:confidence
```

Expected:

- journey tests pass under Jest
- `test:confidence` extends regression with journeys
- `validate:local:confidence` runs type-check, regression, and journeys in one root command

- [ ] **Step 6: Commit the journey/confidence layer**

Run:

```bash
git add package.json scripts/validation/validate-local.sh scripts/dev-loop.sh src/test-utils/journeys src/__tests__/journeys
git commit -m "test(qa): add journey confidence layer"
```

## Task 4: Promote The Live Supabase Task Core Maestro Flows For `M-QA-03`

**Files:**
- Create: `maestro/flows/bootstrap-live-manager-a.yaml`
- Create: `maestro/flows/bootstrap-live-worker-a1.yaml`
- Create: `maestro/flows/pick-first-image.yaml`
- Create: `maestro/flows/task-core-live-create.yaml`
- Create: `maestro/flows/task-core-live-assign.yaml`
- Create: `maestro/flows/task-core-live-progress.yaml`
- Create: `maestro/flows/task-core-live-completion.yaml`
- Create: `maestro/flows/task-core-live-photo-upload.yaml`
- Modify: `package.json`
- Modify: `maestro/README.md`
- Modify: `TESTING_STRATEGY.md`

- [ ] **Step 1: Add the live bootstrap flows first**

Create `maestro/flows/bootstrap-live-manager-a.yaml`:

```yaml
appId: com.buildtrack.app.local
---
- launchApp:
    clearState: true
- openLink:
    link: "exp+buildtrack://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8081"
- runFlow:
    when:
      visible: "http://localhost:8081"
    commands:
      - tapOn: "http://localhost:8081"
- runFlow:
    when:
      visible: 'Open in “Taskr”?'
    commands:
      - tapOn: "Open"
- assertVisible:
    id: "login-submit"
- tapOn:
    id: "login-emailOrPhone"
- inputText: "john.managera@test.com"
- tapOn:
    id: "login-password"
- inputText: "password123"
- tapOn:
    id: "login-submit"
- assertVisible:
    id: "dashboard-screen__root"
```

Create `maestro/flows/bootstrap-live-worker-a1.yaml` using the same shape with the worker credentials:

```yaml
appId: com.buildtrack.app.local
---
- launchApp:
    clearState: true
- openLink:
    link: "exp+buildtrack://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8081"
- assertVisible:
    id: "login-submit"
- tapOn:
    id: "login-emailOrPhone"
- inputText: "alice.workera1@test.com"
- tapOn:
    id: "login-password"
- inputText: "password123"
- tapOn:
    id: "login-submit"
- assertVisible:
    id: "dashboard-screen__root"
```

- [ ] **Step 2: Add the Task Core live flow suite and the image helper**

Create `maestro/flows/task-core-live-create.yaml`:

```yaml
appId: com.buildtrack.app.local
---
- runFlow: bootstrap-live-manager-a.yaml
- openLink:
    link: "taskr://camera/create"
- runFlow:
    when:
      visible: 'Open in “Taskr”?'
    commands:
      - tapOn: Open
- assertVisible:
    id: "create-task__continuous_form"
- tapOn:
    id: "createTask-title"
- inputText: "Live E2E Task Core Create"
- tapOn:
    id: "createTask-description"
- inputText: "Created from the real Supabase-backed task-core create slice."
- hideKeyboard
- scrollUntilVisible:
    centerElement: true
    element:
      id: "create-task__submit-button"
    direction: DOWN
- tapOn:
    id: "create-task__submit-button"
- tapOn:
    id: "create-task__submit-button"
    delay: 3000
- assertVisible: ".*Task created successfully.*"
```

Create `maestro/flows/task-core-live-assign.yaml`:

```yaml
appId: com.buildtrack.app.local
---
- runFlow: bootstrap-live-manager-a.yaml
- tapOn:
    id: "root-tab__tasks_pressable"
- tapOn:
    id: "text-field:tasks-search__input"
- inputText: "Inspection and maintenance of all safety equipment on site"
- hideKeyboard
- tapOn: ".*Safety Equipment Check My Queue.*NEW"
- tapOn: ".*Edit Task Details.*"
- scrollUntilVisible:
    centerElement: true
    element:
      id: "create-task__assignee-picker-trigger"
    direction: DOWN
- tapOn:
    id: "create-task__assignee-picker-trigger"
- tapOn: ".*Alice Worker A1.*"
- tapOn:
    id: "create-task__assignee-picker-done"
- tapOn:
    id: "create-task__submit-button"
- assertVisible:
    id: "create-task__submit-success-message"
```

Create the remaining files by promoting the worktree versions verbatim:

```text
maestro/flows/task-core-live-progress.yaml
maestro/flows/task-core-live-completion.yaml
maestro/flows/task-core-live-photo-upload.yaml
maestro/flows/pick-first-image.yaml
```

Use the existing worktree flow contents as the source of truth for:

- unique task titles
- deterministic project selection
- keyboard retreat handling
- photo picker interaction
- success alert assertions

- [ ] **Step 3: Extend the root command surface**

Modify `package.json`:

```json
"test:e2e:maestro:task-core": "bash ./scripts/maestro/run-local.sh test maestro/flows/task-core-live-*.yaml",
"test:e2e:maestro:critical": "bash ./scripts/maestro/run-local.sh test maestro/flows"
```

Keep `test:e2e:maestro:smoke` unchanged so `M-QA-02` remains separately runnable.

- [ ] **Step 4: Update the root docs to reflect the split data authority**

Add this distinction to `maestro/README.md`:

```md
## Data Authority

- `M-QA-02` foundation flows use Sprint 7 only for bootstrap and smoke.
- `M-QA-03` Task Core flows use live Supabase-backed login and task mutations.
- Do not treat Sprint 7 runtime injection as workflow truth for Task Core debugging.
```

Add this distinction to `TESTING_STRATEGY.md`:

```md
- Sprint 7 is the local bootstrap authority for foundation smoke.
- Live Supabase-backed Maestro flows are the authority for critical Task Core workflow confidence.
```

- [ ] **Step 5: Run the smallest live-flow verification set**

Run:

```bash
npm run test:e2e:maestro:smoke
bash ./scripts/maestro/run-local.sh test maestro/flows/task-core-live-create.yaml
npm run test:e2e:maestro:task-core
```

Expected:

- the smoke flow still passes from the root scaffold
- the live create slice passes against real Supabase
- the task-core bundle runs from the root repo without missing-file errors

- [ ] **Step 6: Commit the live Maestro confidence layer**

Run:

```bash
git add package.json maestro/README.md TESTING_STRATEGY.md maestro/flows
git commit -m "test(maestro): add live task core flows"
```

## Task 5: Normalize Validation Entry Points And Canonical Status

**Files:**
- Modify: `scripts/dev-loop.sh`
- Modify: `documentation/ROADMAP.md`
- Modify: `AGENTS.md`

- [ ] **Step 1: Add the full confidence mode to `scripts/dev-loop.sh`**

Extend the script with the Maestro-smoke flag:

```bash
VALIDATE_LOCAL_RUN_MAESTRO_SMOKE="${VALIDATE_LOCAL_RUN_MAESTRO_SMOKE:-0}"

if [ "${1:-}" = "--confidence-full" ]; then
  VALIDATE_LOCAL_RUN_JOURNEYS=1
  VALIDATE_LOCAL_RUN_MAESTRO_SMOKE=1
  shift
fi

exec env \
  VALIDATE_LOCAL_RUN_JOURNEYS="$VALIDATE_LOCAL_RUN_JOURNEYS" \
  VALIDATE_LOCAL_RUN_MAESTRO_SMOKE="$VALIDATE_LOCAL_RUN_MAESTRO_SMOKE" \
  bash "$ROOT_DIR/scripts/validation/validate-local.sh" "$@"
```

- [ ] **Step 2: Teach `validate-local.sh` to run Maestro smoke only when explicitly requested**

Append the gated stage:

```bash
RUN_MAESTRO_SMOKE="${VALIDATE_LOCAL_RUN_MAESTRO_SMOKE:-0}"

if [ "$RUN_MAESTRO_SMOKE" = "1" ]; then
  run_stage_command_streaming \
    "stage_6_maestro_smoke" \
    "6" \
    "npm run test:e2e:maestro:smoke" \
    "[MAESTRO_FAILURE]" \
    "33" \
    "repair_maestro_setup" \
    npm run test:e2e:maestro:smoke
fi
```

- [ ] **Step 3: Update roadmap and agent inventory only after the root command surface is real**

Modify `documentation/ROADMAP.md` and `AGENTS.md` with a conservative wording update:

```md
- `WS-QA / M-QA-02` now has a shipped root Maestro foundation surface for local smoke and Sprint 7 bootstrap.
- `WS-QA / M-QA-03` is the active hybrid confidence expansion layer, including journey tests and live Supabase-backed Task Core flows.
```

Keep the status honest:

- do not mark `M-QA-03` closed in the same change unless the full root validation set has actually been run
- only mark `M-QA-02` closed if the root smoke/bootstrap flows and docs are verified from `master`

- [ ] **Step 4: Run the highest root confidence command**

Run:

```bash
./scripts/dev-loop.sh --confidence-full
```

Expected:

- type-check passes
- regression passes
- journey layer passes
- Maestro smoke runs through the root wrapper

- [ ] **Step 5: Commit the validation normalization**

Run:

```bash
git add scripts/dev-loop.sh scripts/validation/validate-local.sh documentation/ROADMAP.md AGENTS.md
git commit -m "docs(qa): normalize maestro milestone status"
```

## Self-Review

- `M-QA-02` spec coverage: Task 1 and Task 2 cover the root wrapper, flow directory, scripts, and truthful docs while keeping Sprint 7 limited to bootstrap.
- `M-QA-03` spec coverage: Task 3 and Task 4 cover the hybrid confidence ladder, journey tests, low-touch validation loop, and live Supabase-backed Task Core Maestro flows.
- Status and discoverability coverage: Task 5 updates the validation entry points, roadmap wording, and agent inventory only after the implementation is real.
- Placeholder scan: no `TODO`, `TBD`, or “similar to above” shortcuts remain.
- Type consistency: the plan uses one stable command surface throughout: `test:e2e:journeys`, `test:e2e:maestro:smoke`, `test:e2e:maestro:task-core`, `test:e2e:maestro:critical`, `test:confidence`, and `validate:local:confidence`.
