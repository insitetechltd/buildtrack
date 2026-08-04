# Automated Confidence And Low-Touch Dev Loop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the repository validation loop so it requires less user steering while adding app-shell journey tests and iOS-first Maestro smoke coverage for critical UX paths.

**Architecture:** Extend the existing `validate-local.sh` and `dev-loop.sh` contract instead of replacing it. Add a new Jest journey layer for real navigation-driven flows, add a first `maestro/` workspace for simulator smoke coverage, then align package scripts and testing docs around one confidence ladder with explicit fast versus high-confidence tiers.

**Tech Stack:** Expo-managed React Native, TypeScript, Jest, `@testing-library/react-native`, React Navigation, bash, Maestro YAML flows, existing `testID` selectors, existing verification-route helpers.

---

## File Map

**Validation loop and command surface**
- Modify: `/Volumes/KooDrive/InsiteApp/package.json`
- Modify: `/Volumes/KooDrive/InsiteApp/scripts/validation/validate-local.sh`
- Modify: `/Volumes/KooDrive/InsiteApp/scripts/dev-loop.sh`

**Journey test infrastructure**
- Create: `/Volumes/KooDrive/InsiteApp/src/test-utils/journeys/renderAppShellJourney.tsx`
- Create: `/Volumes/KooDrive/InsiteApp/src/test-utils/journeys/seedJourneyState.ts`
- Create: `/Volumes/KooDrive/InsiteApp/src/__tests__/journeys/authenticated-shell.journey.test.tsx`
- Create: `/Volumes/KooDrive/InsiteApp/src/__tests__/journeys/project-switching.journey.test.tsx`
- Create: `/Volumes/KooDrive/InsiteApp/src/__tests__/journeys/task-detail-verification.journey.test.tsx`

**Selector hardening and navigation hooks**
- Modify: `/Volumes/KooDrive/InsiteApp/src/screens/DeveloperSettingsScreen.tsx`
- Modify: `/Volumes/KooDrive/InsiteApp/src/screens/ProfileScreen.tsx`
- Modify: `/Volumes/KooDrive/InsiteApp/src/navigation/AppNavigator.tsx`

**Maestro runtime layer**
- Create: `/Volumes/KooDrive/InsiteApp/maestro/README.md`
- Create: `/Volumes/KooDrive/InsiteApp/maestro/flows/launch-smoke.yaml`
- Create: `/Volumes/KooDrive/InsiteApp/maestro/flows/open-task-detail.yaml`
- Create: `/Volumes/KooDrive/InsiteApp/maestro/flows/project-switching-smoke.yaml`

**Documentation alignment**
- Modify: `/Volumes/KooDrive/InsiteApp/TESTING_STRATEGY.md`
- Modify: `/Volumes/KooDrive/InsiteApp/docs/superpowers/plans/2026-08-01-ws-qa-03-automated-confidence-and-e2e-coverage.md`

## Task 1: Expand Package Scripts For Confidence Tiers

**Files:**
- Modify: `/Volumes/KooDrive/InsiteApp/package.json`
- Test: script inspection in `/Volumes/KooDrive/InsiteApp/package.json`

- [ ] **Step 1: Write the failing command contract into the plan before editing**

```json
{
  "scripts": {
    "test:e2e:journeys": "jest src/__tests__/journeys --runInBand",
    "test:e2e:maestro:smoke": "maestro test maestro/flows/launch-smoke.yaml",
    "test:e2e:maestro:critical": "maestro test maestro/flows",
    "test:confidence": "npm run test:regression && npm run test:e2e:journeys",
    "validate:local:confidence": "VALIDATE_LOCAL_RUN_JOURNEYS=1 bash \"./scripts/validation/validate-local.sh\""
  }
}
```

- [ ] **Step 2: Run a read-only check so the new scripts are confirmed absent before implementation**

Run: `rg -n '"test:e2e:journeys"|"test:confidence"|"validate:local:confidence"' package.json`
Expected: no matches

- [ ] **Step 3: Add the minimal script surface**

```json
{
  "scripts": {
    "test:e2e:journeys": "jest src/__tests__/journeys --runInBand",
    "test:e2e:maestro:smoke": "maestro test maestro/flows/launch-smoke.yaml",
    "test:e2e:maestro:critical": "maestro test maestro/flows",
    "test:confidence": "npm run test:regression && npm run test:e2e:journeys",
    "validate:local:confidence": "VALIDATE_LOCAL_RUN_JOURNEYS=1 bash \"./scripts/validation/validate-local.sh\""
  }
}
```

- [ ] **Step 4: Verify the JSON shape is valid**

Run: `node -e "const p=require('./package.json'); console.log(Object.keys(p.scripts).filter((key)=>key.includes('confidence')||key.includes('e2e')).sort().join('\n'))"`
Expected:

```text
test:confidence
test:e2e:journeys
test:e2e:maestro:critical
test:e2e:maestro:smoke
validate:local:confidence
```

- [ ] **Step 5: Commit the command-surface slice**

```bash
git add package.json
git commit -m "test(devloop): add confidence tier package scripts"
```

## Task 2: Refine The Local Validation Loop

**Files:**
- Modify: `/Volumes/KooDrive/InsiteApp/scripts/validation/validate-local.sh`
- Modify: `/Volumes/KooDrive/InsiteApp/scripts/dev-loop.sh`
- Test: `/Volumes/KooDrive/InsiteApp/scripts/validation/validate-local.sh`

- [ ] **Step 1: Write the failing contract for journey-tier env handling**

```bash
RUN_JOURNEYS="${VALIDATE_LOCAL_RUN_JOURNEYS:-0}"
RUN_MAESTRO_SMOKE="${VALIDATE_LOCAL_RUN_MAESTRO_SMOKE:-0}"
```

```bash
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

if [ "$RUN_MAESTRO_SMOKE" = "1" ]; then
  run_stage_command \
    "stage_5_maestro_smoke" \
    "5" \
    "npm run test:e2e:maestro:smoke" \
    "[MAESTRO_FAILURE]" \
    "33" \
    "repair_maestro_setup" \
    npm run test:e2e:maestro:smoke
fi
```

- [ ] **Step 2: Verify the env toggles do not already exist**

Run: `rg -n 'VALIDATE_LOCAL_RUN_JOURNEYS|VALIDATE_LOCAL_RUN_MAESTRO_SMOKE|JOURNEY_FAILURE|MAESTRO_FAILURE' scripts/validation/validate-local.sh`
Expected: no matches

- [ ] **Step 3: Add the journey and Maestro stages to `validate-local.sh`**

```bash
RUN_SIMULATION="${VALIDATE_LOCAL_RUN_SIMULATION:-0}"
RUN_JOURNEYS="${VALIDATE_LOCAL_RUN_JOURNEYS:-0}"
RUN_MAESTRO_SMOKE="${VALIDATE_LOCAL_RUN_MAESTRO_SMOKE:-0}"
```

```bash
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

if [ "$RUN_SIMULATION" = "1" ]; then
  run_stage_command \
    "stage_5_simulation" \
    "5" \
    "npm run test:simulation:ui" \
    "[SIMULATION_FAILURE]" \
    "31" \
    "fix_simulation" \
    npm run test:simulation:ui
fi

if [ "$RUN_MAESTRO_SMOKE" = "1" ]; then
  run_stage_command \
    "stage_6_maestro_smoke" \
    "6" \
    "npm run test:e2e:maestro:smoke" \
    "[MAESTRO_FAILURE]" \
    "33" \
    "repair_maestro_setup" \
    npm run test:e2e:maestro:smoke
fi
```

- [ ] **Step 4: Extend `dev-loop.sh` to expose low-touch confidence modes without breaking the current default**

```bash
if [ "${1:-}" = "--confidence" ]; then
  shift
  exec env VALIDATE_LOCAL_RUN_JOURNEYS=1 bash "$ROOT_DIR/scripts/validation/validate-local.sh" "$@"
fi

if [ "${1:-}" = "--confidence-full" ]; then
  shift
  exec env VALIDATE_LOCAL_RUN_JOURNEYS=1 VALIDATE_LOCAL_RUN_MAESTRO_SMOKE=1 bash "$ROOT_DIR/scripts/validation/validate-local.sh" "$@"
fi
```

- [ ] **Step 5: Run syntax checks before behavior checks**

Run: `bash -n scripts/dev-loop.sh && bash -n scripts/validation/validate-local.sh`
Expected: no output

- [ ] **Step 6: Run the fast path and the confidence path command contract**

Run: `bash ./scripts/dev-loop.sh --no-push`
Expected: validation starts with workspace audit, TypeScript, and regression stages only

Run: `bash ./scripts/dev-loop.sh --confidence --no-push`
Expected: validation includes the journey stage after regression

- [ ] **Step 7: Commit the loop-refinement slice**

```bash
git add scripts/dev-loop.sh scripts/validation/validate-local.sh
git commit -m "test(devloop): add low-touch confidence loop stages"
```

## Task 3: Add Journey Test Utilities

**Files:**
- Create: `/Volumes/KooDrive/InsiteApp/src/test-utils/journeys/renderAppShellJourney.tsx`
- Create: `/Volumes/KooDrive/InsiteApp/src/test-utils/journeys/seedJourneyState.ts`
- Test: `/Volumes/KooDrive/InsiteApp/src/__tests__/journeys/authenticated-shell.journey.test.tsx`

- [ ] **Step 1: Write the failing test utility contract**

```tsx
export type JourneySeedOptions = {
  authUser?: { id: string; role?: string } | null;
  selectedProjectId?: string | null;
  taskIds?: string[];
};

export function seedJourneyState(options: JourneySeedOptions): void {
  // implementation fills zustand stores with deterministic state
}

export function renderAppShellJourney(initialUrl?: string) {
  return render(<AppNavigator />);
}
```

- [ ] **Step 2: Verify the journey utility folder does not already exist**

Run: `test ! -d src/test-utils/journeys && echo "journey utils missing as expected"`
Expected:

```text
journey utils missing as expected
```

- [ ] **Step 3: Create the minimal seed helper**

```ts
import { useAuthStore } from "@/state/authStore";
import { useProjectFilterStore } from "@/state/projectFilterStore";

export type JourneySeedOptions = {
  authUser?: { id: string; role?: string } | null;
  selectedProjectId?: string | null;
};

export function seedJourneyState(options: JourneySeedOptions): void {
  useAuthStore.setState({
    user: options.authUser ?? null,
    initialized: true,
    loading: false,
  } as never);

  useProjectFilterStore.setState({
    selectedProjectId: options.selectedProjectId ?? null,
  } as never);
}
```

- [ ] **Step 4: Create the minimal app-shell renderer**

```tsx
import React from "react";
import { render } from "@testing-library/react-native";
import { NavigationContainer } from "@react-navigation/native";
import AppNavigator, { appLinking } from "@/navigation/AppNavigator";

export function renderAppShellJourney() {
  return render(
    <NavigationContainer linking={appLinking}>
      <AppNavigator />
    </NavigationContainer>,
  );
}
```

- [ ] **Step 5: Run the new utility consumer test once the first journey test exists**

Run: `npx jest src/__tests__/journeys/authenticated-shell.journey.test.tsx --runInBand`
Expected: PASS

- [ ] **Step 6: Commit the journey infrastructure slice**

```bash
git add src/test-utils/journeys
git commit -m "test(journeys): add app shell journey helpers"
```

## Task 4: Add The First App-Shell Journey Tests

**Files:**
- Create: `/Volumes/KooDrive/InsiteApp/src/__tests__/journeys/authenticated-shell.journey.test.tsx`
- Create: `/Volumes/KooDrive/InsiteApp/src/__tests__/journeys/project-switching.journey.test.tsx`
- Create: `/Volumes/KooDrive/InsiteApp/src/__tests__/journeys/task-detail-verification.journey.test.tsx`
- Test: the same three files

- [ ] **Step 1: Write the first failing authenticated-shell journey**

```tsx
import { screen } from "@testing-library/react-native";
import { renderAppShellJourney } from "@/test-utils/journeys/renderAppShellJourney";
import { seedJourneyState } from "@/test-utils/journeys/seedJourneyState";

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

- [ ] **Step 2: Write the failing project-switching journey**

```tsx
import { act, fireEvent, screen } from "@testing-library/react-native";
import ProjectPickerScreen from "@/screens/ProjectPickerScreen";

describe("project switching journey", () => {
  it("switches to a new project row through stable row test ids", async () => {
    const onNavigateBack = jest.fn();
    const view = render(<ProjectPickerScreen onNavigateBack={onNavigateBack} allowBack />);

    await act(async () => {
      fireEvent.press(view.getByTestId("projectPicker-project-project-2"));
    });

    expect(onNavigateBack).toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: Write the failing task-detail verification journey**

```tsx
import { buildTaskDetailVerificationUrl } from "@/navigation/screenVerification";

describe("task detail verification journey", () => {
  it("builds a deterministic verification url for task detail", () => {
    expect(buildTaskDetailVerificationUrl("task-123")).toBe("taskr://verify/task/task-123");
  });
});
```

- [ ] **Step 4: Implement the minimal assertions and mocks to make the journeys stable**

```tsx
jest.mock("@/utils/DataRefreshManager", () => ({ DataRefreshManager: () => null }));
jest.mock("@/utils/NetworkSyncManager", () => ({ NetworkSyncManager: () => null }));
jest.mock("@/utils/RealtimeSyncManager", () => ({ RealtimeSyncManager: () => null }));
```

```tsx
expect(await screen.findByTestId("root-tab__activity")).toBeTruthy();
expect(screen.getByTestId("root-tab__tasks")).toBeTruthy();
```

- [ ] **Step 5: Run the journey bundle**

Run: `npx jest src/__tests__/journeys --runInBand`
Expected:

```text
PASS src/__tests__/journeys/authenticated-shell.journey.test.tsx
PASS src/__tests__/journeys/project-switching.journey.test.tsx
PASS src/__tests__/journeys/task-detail-verification.journey.test.tsx
```

- [ ] **Step 6: Commit the first journey slice**

```bash
git add src/__tests__/journeys
git commit -m "test(journeys): cover authenticated shell and verification flows"
```

## Task 5: Harden The Minimal Selector Surface For Automation

**Files:**
- Modify: `/Volumes/KooDrive/InsiteApp/src/screens/ProfileScreen.tsx`
- Modify: `/Volumes/KooDrive/InsiteApp/src/screens/DeveloperSettingsScreen.tsx`
- Modify: `/Volumes/KooDrive/InsiteApp/src/navigation/AppNavigator.tsx`
- Test: `/Volumes/KooDrive/InsiteApp/src/__tests__/integration/DeveloperSettingsScreen.test.tsx`

- [ ] **Step 1: Write the failing selector contract in tests**

```tsx
expect(screen.getByTestId("profile-menu-developer_settings")).toBeTruthy();
expect(screen.getByTestId("developer-settings__screen-verification_open-task-detail")).toBeTruthy();
```

- [ ] **Step 2: Verify the explicit developer-settings test ids do not exist yet**

Run: `rg -n 'developer-settings__screen-verification_open-task-detail|profile-menu-developer_settings' src`
Expected: no matches or only one partial profile-menu match

- [ ] **Step 3: Add stable ids without redesigning the screens**

```tsx
<Pressable testID={`profile-menu-${item.actionId}`} ... />
```

```tsx
<Pressable
  testID="developer-settings__screen-verification_open-task-detail"
  onPress={handleOpenTaskDetail}
>
```

```tsx
void Linking.openURL(buildTaskDetailVerificationUrl(taskId));
```

- [ ] **Step 4: Run the focused integration test**

Run: `npx jest src/__tests__/integration/DeveloperSettingsScreen.test.tsx --runInBand`
Expected: PASS

- [ ] **Step 5: Commit the selector-hardening slice**

```bash
git add src/screens/ProfileScreen.tsx src/screens/DeveloperSettingsScreen.tsx src/navigation/AppNavigator.tsx src/__tests__/integration/DeveloperSettingsScreen.test.tsx
git commit -m "test(selectors): harden verification entry points"
```

## Task 6: Create The Initial Maestro Workspace And Smoke Flows

**Files:**
- Create: `/Volumes/KooDrive/InsiteApp/maestro/README.md`
- Create: `/Volumes/KooDrive/InsiteApp/maestro/flows/launch-smoke.yaml`
- Create: `/Volumes/KooDrive/InsiteApp/maestro/flows/open-task-detail.yaml`
- Create: `/Volumes/KooDrive/InsiteApp/maestro/flows/project-switching-smoke.yaml`

- [ ] **Step 1: Write the failing file presence contract**

Run: `test ! -f maestro/flows/launch-smoke.yaml && echo "maestro flow missing as expected"`
Expected:

```text
maestro flow missing as expected
```

- [ ] **Step 2: Add the Maestro README with exact local usage**

```md
# Maestro Local Flows

## Prerequisites

- iOS simulator booted
- app installed in the simulator
- Maestro CLI installed

## Commands

- `npm run test:e2e:maestro:smoke`
- `npm run test:e2e:maestro:critical`
```

- [ ] **Step 3: Add the launch smoke flow**

```yaml
appId: host.exp.Exponent
---
- launchApp
- assertVisible:
    id: "login-submit"
```

- [ ] **Step 4: Add the task-detail verification flow**

```yaml
appId: host.exp.Exponent
---
- launchApp
- openLink: "taskr://verify/task/task-123"
- assertVisible:
    id: "task-detail__header_title_text"
```

- [ ] **Step 5: Add the project-switching smoke flow**

```yaml
appId: host.exp.Exponent
---
- launchApp
- tapOn:
    id: "profile-menu-project_picker"
- tapOn:
    id: "projectPicker-project-project-2"
```

- [ ] **Step 6: Verify the YAML files are present and readable**

Run: `find maestro -maxdepth 3 -type f | sort`
Expected:

```text
maestro/README.md
maestro/flows/launch-smoke.yaml
maestro/flows/open-task-detail.yaml
maestro/flows/project-switching-smoke.yaml
```

- [ ] **Step 7: Commit the Maestro scaffold slice**

```bash
git add maestro
git commit -m "test(maestro): add initial iOS smoke flows"
```

## Task 7: Wire Confidence Commands To Real Tests

**Files:**
- Modify: `/Volumes/KooDrive/InsiteApp/package.json`
- Test: `test:confidence` and `test:e2e:journeys`

- [ ] **Step 1: Write the failing command behavior expectation**

```bash
npm run test:e2e:journeys
npm run test:confidence
```

Expected:

```text
`test:e2e:journeys` runs only the journey suite.
`test:confidence` runs regression first, then journeys.
```

- [ ] **Step 2: Run the new commands before the final doc pass**

Run: `npm run test:e2e:journeys`
Expected: PASS for the journey suite

Run: `npm run test:confidence`
Expected: PASS for regression plus journeys

- [ ] **Step 3: Add optional full-confidence local contract to the loop docs if Maestro is installed**

```bash
bash ./scripts/dev-loop.sh --confidence-full --no-push
```

Expected:

```text
validation includes journey and Maestro smoke stages after fast validation
```

- [ ] **Step 4: Commit the command-verification slice**

```bash
git add package.json scripts/dev-loop.sh scripts/validation/validate-local.sh src/__tests__/journeys maestro
git commit -m "test(confidence): wire local confidence commands"
```

## Task 8: Update Testing Documentation

**Files:**
- Modify: `/Volumes/KooDrive/InsiteApp/TESTING_STRATEGY.md`
- Modify: `/Volumes/KooDrive/InsiteApp/docs/superpowers/plans/2026-08-01-ws-qa-03-automated-confidence-and-e2e-coverage.md`

- [ ] **Step 1: Write the failing docs contract in the plan**

```md
## Layer 3: App-Shell Journeys
- `npm run test:e2e:journeys`

## Layer 4: Simulator UX Confidence
- `npm run test:e2e:maestro:smoke`
```

- [ ] **Step 2: Update `TESTING_STRATEGY.md` to reflect the new ladder**

```md
### Primary Scripts

- `npm run test:regression`
- `npm run test:e2e:journeys`
- `npm run test:confidence`
- `npm run test:e2e:maestro:smoke`
```

```md
### Recommended Local Workflow

- fast iteration: `bash ./scripts/dev-loop.sh --no-push`
- stronger local confidence: `bash ./scripts/dev-loop.sh --confidence --no-push`
- simulator-facing smoke: `bash ./scripts/dev-loop.sh --confidence-full --no-push`
```

- [ ] **Step 3: Update the QA milestone plan summary so it matches what shipped**

```md
- low-touch development loop refinement
- Jest app-shell journey tests
- iOS-first Maestro smoke coverage
```

- [ ] **Step 4: Review the final references**

Run: `rg -n 'test:e2e:journeys|test:confidence|--confidence-full|Maestro' TESTING_STRATEGY.md docs/superpowers/plans/2026-08-01-ws-qa-03-automated-confidence-and-e2e-coverage.md`
Expected: matches found in the updated docs only

- [ ] **Step 5: Commit the documentation slice**

```bash
git add TESTING_STRATEGY.md docs/superpowers/plans/2026-08-01-ws-qa-03-automated-confidence-and-e2e-coverage.md
git commit -m "docs(testing): document confidence ladder and low-touch loop"
```

## Task 9: Final Validation And Review Handoff

**Files:**
- Verify: `/Volumes/KooDrive/InsiteApp/package.json`
- Verify: `/Volumes/KooDrive/InsiteApp/scripts/validation/validate-local.sh`
- Verify: `/Volumes/KooDrive/InsiteApp/scripts/dev-loop.sh`
- Verify: `/Volumes/KooDrive/InsiteApp/src/__tests__/journeys/*.tsx`
- Verify: `/Volumes/KooDrive/InsiteApp/maestro/**/*`
- Verify: `/Volumes/KooDrive/InsiteApp/TESTING_STRATEGY.md`

- [ ] **Step 1: Run the focused validation stack**

Run:

```bash
npx tsc --noEmit
npx jest src/__tests__/journeys --runInBand
npx jest src/__tests__/integration/DeveloperSettingsScreen.test.tsx --runInBand
npm run test:regression
```

Expected:

```text
All commands pass.
```

- [ ] **Step 2: Run diagnostics on changed source files**

Run: diagnostics for:

```text
package.json
scripts/validation/validate-local.sh
scripts/dev-loop.sh
src/screens/DeveloperSettingsScreen.tsx
src/screens/ProfileScreen.tsx
src/navigation/AppNavigator.tsx
src/__tests__/journeys/authenticated-shell.journey.test.tsx
src/__tests__/journeys/project-switching.journey.test.tsx
src/__tests__/journeys/task-detail-verification.journey.test.tsx
```

Expected: no newly introduced lint or type issues

- [ ] **Step 3: If local Maestro is available, run the smoke flow**

Run: `npm run test:e2e:maestro:smoke`
Expected: the smoke flow completes or fails with a clear environment/setup issue rather than a malformed-flow error

- [ ] **Step 4: Inspect the final diff**

Run: `git status --short && git diff -- package.json scripts TESTING_STRATEGY.md src/__tests__/journeys src/screens/ProfileScreen.tsx src/screens/DeveloperSettingsScreen.tsx src/navigation/AppNavigator.tsx maestro`
Expected: only the planned files changed

- [ ] **Step 5: Create the final checkpoint commit**

```bash
git add package.json scripts TESTING_STRATEGY.md src/__tests__/journeys src/screens/ProfileScreen.tsx src/screens/DeveloperSettingsScreen.tsx src/navigation/AppNavigator.tsx maestro
git commit -m "feat(testing): add low-touch confidence loop and e2e smoke coverage"
```

## Self-Review

**Spec coverage**
- Low-touch validation loop coverage is implemented in Tasks 1, 2, 7, and 8.
- App-shell journey coverage is implemented in Tasks 3 and 4.
- iOS-first Maestro scaffold and smoke coverage are implemented in Task 6.
- Command-surface and documentation alignment are implemented in Tasks 1, 7, 8, and 9.

**Placeholder scan**
- No `TODO`, `TBD`, or “implement later” placeholders remain in the tasks.
- Every task includes exact files, commands, and concrete code snippets.

**Type consistency**
- The command names are consistent across package scripts, shell flow, and docs: `test:e2e:journeys`, `test:e2e:maestro:smoke`, `test:confidence`, and `validate:local:confidence`.
- Journey helper names are consistent across the helper files and tests: `seedJourneyState` and `renderAppShellJourney`.
