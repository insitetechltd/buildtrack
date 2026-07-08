# Screen Verification Route Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a deterministic verification route for Task Detail so future screen-specific screenshot checks can open the exact target screen before capture, plus a launcher in `Developer Settings` for repeatable internal QA.

**Architecture:** Introduce a small verification-route layer that plugs into the existing `taskr` scheme and `NavigationContainer`, and keep the target mapping explicit to one canonical Task Detail path. Extend the existing adapter-driven `Developer Settings` surface with a minimal internal launcher so the same verification destination can be triggered without relying on external tooling.

**Tech Stack:** Expo 54, React Navigation, TypeScript, React Native, Jest, React Native Testing Library

---

## File Structure

### Core files to modify

- `src/navigation/AppNavigator.tsx`
  Add linking configuration and a deterministic verification destination that resolves to the real Task Detail screen.

- `src/navigation/navigationTypes.ts`
  Add any verification-launch param types needed for the internal launcher path.

- `src/ui/contracts/viewAdapters.ts`
  Extend the developer-settings contract for a visible verification section and actions.

- `src/ui/viewAdapters/useDeveloperSettingsViewAdapter.ts`
  Build the verification launcher output and action handler.

- `src/screens/DeveloperSettingsScreen.tsx`
  Render the new verification launcher UI inside the existing internal settings screen.

### Tests to modify or add

- `src/navigation/__tests__/AppNavigator.bottom-tabs.test.tsx` if needed for route-safe coverage
- `src/__tests__/integration/DeveloperSettingsScreen.test.tsx`
- add a new navigator-focused test file if needed, e.g. `src/navigation/__tests__/AppNavigator.verification-route.test.tsx`

### Docs to update after implementation

- `docs/superpowers/plans/2026-07-03-ws-ux-01-insite-redesign-execution.md`
- `docs/superpowers/plans/2026-07-06-screen-verification-route-implementation.md`

## Task 1: Add deterministic Task Detail verification routing

**Files:**
- Modify: `src/navigation/AppNavigator.tsx`
- Modify: `src/navigation/navigationTypes.ts`
- Test: `src/navigation/__tests__/AppNavigator.verification-route.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
it("opens Task Detail from the verification url", async () => {
  const screen = render(<AppNavigator />);

  await act(async () => {
    await Linking.openURL("taskr://verify/task-detail?taskId=task-parent");
  });

  expect(screen.getByTestId("task-detail-screen")).toBeTruthy();
});
```

```tsx
it("routes verification task detail through the canonical Tasks stack path", () => {
  const linking = buildVerificationLinking();

  expect(linking.config.screens.MainTabs.screens.Tasks.screens.TaskDetail).toBe("verify/task-detail");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/navigation/__tests__/AppNavigator.verification-route.test.tsx --runInBand`

Expected: FAIL because `NavigationContainer` does not yet have linking config for the verification route.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/navigation/navigationTypes.ts
export type VerificationTaskDetailParams = { taskId: string; subTaskId?: string };
```

```tsx
// src/navigation/AppNavigator.tsx
const linking = {
  prefixes: ["taskr://"],
  config: {
    screens: {
      MainTabs: {
        screens: {
          Tasks: {
            screens: {
              TaskDetail: "verify/task-detail",
            },
          },
        },
      },
    },
  },
};

<NavigationContainer linking={linking}>
  <DataRefreshManager />
  <NetworkSyncManager />
  <RealtimeSyncManager />
  <AppRootStack />
</NavigationContainer>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/navigation/__tests__/AppNavigator.verification-route.test.tsx --runInBand`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/navigation/AppNavigator.tsx src/navigation/navigationTypes.ts src/navigation/__tests__/AppNavigator.verification-route.test.tsx
git commit -m "feat(verification): add task detail verification route"
```

## Task 2: Add a Developer Settings launcher for Task Detail verification

**Files:**
- Modify: `src/ui/contracts/viewAdapters.ts`
- Modify: `src/ui/viewAdapters/useDeveloperSettingsViewAdapter.ts`
- Modify: `src/screens/DeveloperSettingsScreen.tsx`
- Test: `src/__tests__/integration/DeveloperSettingsScreen.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
it("renders a screen verification launcher and delegates task detail launch", () => {
  const screen = render(<DeveloperSettingsScreen onNavigateBack={jest.fn()} />);

  expect(screen.getByText("Screen Verification")).toBeTruthy();
  fireEvent.press(screen.getByTestId("developer-settings__open_task_detail_verification"));
  expect(mockHandleOpenTaskDetailVerification).toHaveBeenCalledWith("task-parent");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/__tests__/integration/DeveloperSettingsScreen.test.tsx --runInBand`

Expected: FAIL because no verification section or action exists yet.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/ui/contracts/viewAdapters.ts
export interface DeveloperSettingsVerificationLauncher {
  id: string;
  title: string;
  description: string;
  taskIdValue: string;
  launchButtonLabel: string;
  launchTestID: string;
}

export interface DeveloperSettingsScreenViewAdapterOutput {
  // existing fields...
  verificationLauncher: DeveloperSettingsVerificationLauncher | null;
}
```

```ts
// src/ui/viewAdapters/useDeveloperSettingsViewAdapter.ts
const verificationLauncher = {
  id: "developer-settings-verification-task-detail",
  title: "Screen Verification",
  description: "Open a real Task Detail screen deterministically before screenshot capture.",
  taskIdValue: "task-parent",
  launchButtonLabel: "Open Task Detail",
  launchTestID: "developer-settings__open_task_detail_verification",
};
```

```tsx
// src/screens/DeveloperSettingsScreen.tsx
{output.verificationLauncher ? (
  <SectionCard title={output.verificationLauncher.title} isDarkMode={isDarkMode}>
    <Text className={cn("text-sm mb-4", isDarkMode ? "text-slate-300" : "text-gray-600")}>
      {output.verificationLauncher.description}
    </Text>
    <Pressable
      testID={output.verificationLauncher.launchTestID}
      onPress={actions.handleOpenTaskDetailVerification}
      className={cn(
        "rounded-lg p-4 border",
        isDarkMode ? "bg-slate-900 border-slate-700" : "bg-gray-50 border-gray-200",
      )}
    >
      <Text className={cn("text-base font-semibold", isDarkMode ? "text-white" : "text-gray-900")}>
        {output.verificationLauncher.launchButtonLabel}
      </Text>
      <Text className={cn("text-sm mt-1", isDarkMode ? "text-slate-400" : "text-gray-500")}>
        Task ID: {output.verificationLauncher.taskIdValue}
      </Text>
    </Pressable>
  </SectionCard>
) : null}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/__tests__/integration/DeveloperSettingsScreen.test.tsx --runInBand`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/ui/contracts/viewAdapters.ts src/ui/viewAdapters/useDeveloperSettingsViewAdapter.ts src/screens/DeveloperSettingsScreen.tsx src/__tests__/integration/DeveloperSettingsScreen.test.tsx
git commit -m "feat(verification): add developer task detail launcher"
```

## Task 3: Validate and record the verification standard

**Files:**
- Modify: `docs/superpowers/plans/2026-07-03-ws-ux-01-insite-redesign-execution.md`
- Modify: `docs/superpowers/plans/2026-07-06-screen-verification-route-implementation.md`

- [ ] **Step 1: Run the focused validation suite**

Run: `npx jest src/navigation/__tests__/AppNavigator.verification-route.test.tsx src/__tests__/integration/DeveloperSettingsScreen.test.tsx --runInBand && npx tsc --noEmit`

Expected: PASS

- [ ] **Step 2: Update the execution ledger**

```md
- added a deterministic `taskr://verify/task-detail` route that opens the real Task Detail screen
- added a `Developer Settings` launcher for repeatable Task Detail verification
- future screenshot-based screen verification must open the exact target screen first, then capture
```

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/plans/2026-07-03-ws-ux-01-insite-redesign-execution.md docs/superpowers/plans/2026-07-06-screen-verification-route-implementation.md
git commit -m "docs(verification): record deterministic screen routing"
```

## Spec Coverage Check

- deterministic Task Detail verification route: Task 1
- use of existing `taskr` scheme: Task 1
- visible launcher in `Developer Settings`: Task 2
- future verification rule recorded: Task 3

## Placeholder Scan

- No `TBD` / `TODO`
- No “similar to Task N” shortcuts
- All file paths are explicit
- Each code-changing step includes concrete code
- Each verification step includes exact commands and expected outcomes

## Type Consistency Check

- the verification route uses the existing real `TaskDetail` screen rather than a parallel preview destination
- the developer-settings launcher triggers the same verification destination rather than a separate hidden path
- the `taskr` scheme remains the single external entry point
