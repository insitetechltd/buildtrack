# Navigation Back Consistency Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Standardize stack push/back direction and shared back-button behavior across all stack-pushed screens so back always behaves as a true rightward return and all back-capable headers use one consistent symbol and interaction model.

**Architecture:** Fix this in three layers. First, establish one shared native-stack screen option policy so all stack navigators use the same animation and gesture defaults. Second, remove wrapper-level back handlers that incorrectly replace stack pops with sibling/root `navigate(...)` calls. Third, lock all back-capable headers to the shared `AppScreenHeader` path and add focused regression tests around wrapper back semantics and shared back-icon usage.

**Tech Stack:** Expo-managed React Native, TypeScript, React Navigation native-stack, Jest, React Native Testing Library.

---

## Files Overview

**Create**
- `src/navigation/nativeStackOptions.ts`
- `src/navigation/__tests__/nativeStackOptions.test.ts`
- `src/navigation/__tests__/AppNavigator.back-behavior.test.tsx`

**Modify**
- `src/navigation/AppNavigator.tsx`
- `src/components/AppScreenHeader.tsx`
- `src/components/__tests__/ModernScreenHeader.test.tsx`
- `src/components/__tests__/AppScreenHeader.test.tsx`

**Validate**
- `npx jest src/navigation/__tests__/nativeStackOptions.test.ts`
- `npx jest src/navigation/__tests__/AppNavigator.back-behavior.test.tsx`
- `npx jest src/components/__tests__/AppScreenHeader.test.tsx`
- `npx jest src/components/__tests__/ModernScreenHeader.test.tsx`
- `npx tsc --noEmit`

---

## Implementation Rules

- If a screen was pushed onto a stack, back should pop that stack.
- Gesture back must match header back behavior.
- Shared headers must use one canonical back icon through `AppScreenHeader`.
- Cross-tab or cross-root redirects are allowed only when they are explicitly intentional, not as a general substitute for stack back.
- Do not redesign screen layout or tab structure as part of this work.

---

## Task 1: Shared Native Stack Transition Policy

**Files:**
- Create: `src/navigation/nativeStackOptions.ts`
- Create: `src/navigation/__tests__/nativeStackOptions.test.ts`
- Modify: `src/navigation/AppNavigator.tsx`

- [ ] **Step 1: Write the failing stack-options test**

Create `src/navigation/__tests__/nativeStackOptions.test.ts`:

```ts
import { buildDefaultStackScreenOptions } from "../nativeStackOptions";

describe("buildDefaultStackScreenOptions", () => {
  it("returns a consistent card-style push/back configuration", () => {
    const options = buildDefaultStackScreenOptions();

    expect(options.headerShown).toBe(false);
    expect(options.presentation).toBe("card");
    expect(options.animation).toBe("slide_from_right");
    expect(options.gestureDirection).toBe("horizontal");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npx jest src/navigation/__tests__/nativeStackOptions.test.ts
```

Expected: FAIL with `Cannot find module '../nativeStackOptions'`.

- [ ] **Step 3: Implement the shared stack-options helper**

Create `src/navigation/nativeStackOptions.ts`:

```ts
import type { NativeStackNavigationOptions } from "@react-navigation/native-stack";

export function buildDefaultStackScreenOptions(): NativeStackNavigationOptions {
  return {
    headerShown: false,
    presentation: "card",
    animation: "slide_from_right",
    fullScreenGestureEnabled: true,
    gestureEnabled: true,
    gestureDirection: "horizontal",
  };
}
```

- [ ] **Step 4: Apply the shared options to every stack navigator**

Update `src/navigation/AppNavigator.tsx` imports:

```ts
import { buildDefaultStackScreenOptions } from "./nativeStackOptions";
```

Replace inline stack defaults such as:

```ts
screenOptions={{
  headerShown: false,
  presentation: "card",
}}
```

with:

```ts
screenOptions={buildDefaultStackScreenOptions()}
```

Apply this to:

- `DashboardStackNavigator.Navigator`
- `TasksStackNavigator.Navigator`
- `ProfileStackNavigator.Navigator`
- `ReportsStackNavigator.Navigator`
- `CreateTaskStackNavigator.Navigator`
- `AdminDashboardStackNavigator.Navigator`

Also remove redundant per-screen `presentation: "card"` options where the default now covers them.

- [ ] **Step 5: Run the stack-options test**

Run:

```bash
npx jest src/navigation/__tests__/nativeStackOptions.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/navigation/nativeStackOptions.ts src/navigation/__tests__/nativeStackOptions.test.ts src/navigation/AppNavigator.tsx
git commit -m "feat(nav): standardize native stack transition defaults"
```

---

## Task 2: Fix Wrapper Back Behavior To Respect Stack History

**Files:**
- Create: `src/navigation/__tests__/AppNavigator.back-behavior.test.tsx`
- Modify: `src/navigation/AppNavigator.tsx`

- [ ] **Step 1: Write the failing wrapper-back regression test**

Create `src/navigation/__tests__/AppNavigator.back-behavior.test.tsx`:

```tsx
import React from "react";
import { render } from "@testing-library/react-native";

describe("AppNavigator wrapper back behavior", () => {
  it("keeps TaskDetail back behavior stack-based instead of redirecting to Tasks root", () => {
    const onNavigateBack = jest.fn();

    const taskDetailProps = {
      taskId: "task-1",
      onNavigateBack,
    };

    expect(taskDetailProps.onNavigateBack).toBeDefined();
  });
});
```

Then replace this placeholder with an actual wrapper extraction assertion after Step 3 below.

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npx jest src/navigation/__tests__/AppNavigator.back-behavior.test.tsx
```

Expected: FAIL because the wrapper behavior is not directly testable yet.

- [ ] **Step 3: Extract wrapper back helpers for testability**

In `src/navigation/AppNavigator.tsx`, add exported helper functions near the wrapper section:

```ts
export function handleDashboardTaskDetailBack(
  navigation: NativeStackNavigationProp<DashboardStackParamList>,
) {
  if (navigation.canGoBack()) {
    navigation.goBack();
    return;
  }

  const parentNav = navigation.getParent?.() as BottomTabNavigationProp<RootTabParamList> | undefined;
  parentNav?.navigate("Dashboard");
}

export function handleTasksTaskDetailBack(
  navigation: NativeStackNavigationProp<TasksStackParamList>,
) {
  if (navigation.canGoBack()) {
    navigation.goBack();
    return;
  }

  navigation.navigate("TasksList");
}
```

Use them in:

- `TaskDetailFromDashboardWrapper`
- `TaskDetailScreenWrapper`

Change current logic such as:

```ts
parentNav.navigate("Tasks");
```

to:

```ts
handleTasksTaskDetailBack(navigation);
```

and the current dashboard redirect logic to:

```ts
handleDashboardTaskDetailBack(navigation);
```

- [ ] **Step 4: Replace the placeholder test with helper-based assertions**

Update `src/navigation/__tests__/AppNavigator.back-behavior.test.tsx`:

```tsx
import {
  handleDashboardTaskDetailBack,
  handleTasksTaskDetailBack,
} from "../AppNavigator";

describe("AppNavigator back helpers", () => {
  it("pops the dashboard task-detail stack when back history exists", () => {
    const goBack = jest.fn();
    const navigate = jest.fn();

    handleDashboardTaskDetailBack({
      canGoBack: () => true,
      goBack,
      getParent: () => ({ navigate }),
    } as any);

    expect(goBack).toHaveBeenCalledTimes(1);
    expect(navigate).not.toHaveBeenCalled();
  });

  it("pops the tasks task-detail stack when back history exists", () => {
    const goBack = jest.fn();
    const navigate = jest.fn();

    handleTasksTaskDetailBack({
      canGoBack: () => true,
      goBack,
      navigate,
    } as any);

    expect(goBack).toHaveBeenCalledTimes(1);
    expect(navigate).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 5: Run the wrapper-back test**

Run:

```bash
npx jest src/navigation/__tests__/AppNavigator.back-behavior.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/navigation/AppNavigator.tsx src/navigation/__tests__/AppNavigator.back-behavior.test.tsx
git commit -m "fix(nav): make wrapper back handlers respect stack history"
```

---

## Task 3: Lock Shared Back Icon Behavior Through AppScreenHeader

**Files:**
- Modify: `src/components/AppScreenHeader.tsx`
- Modify: `src/components/__tests__/AppScreenHeader.test.tsx`
- Modify: `src/components/__tests__/ModernScreenHeader.test.tsx`

- [ ] **Step 1: Add the failing header-back consistency test**

Append to `src/components/__tests__/AppScreenHeader.test.tsx`:

```tsx
it("renders the canonical shared back icon when back is enabled", () => {
  const screen = render(
    <AppScreenHeader title="Projects" showBackButton onBackPress={jest.fn()} />,
  );

  expect(screen.getByTestId("app-screen-header__back")).toBeTruthy();
  expect(screen.getByTestId("app-screen-header__back-icon")).toBeTruthy();
});
```

- [ ] **Step 2: Run the header test to verify current behavior**

Run:

```bash
npx jest src/components/__tests__/AppScreenHeader.test.tsx
```

Expected: PASS if already consistent, or FAIL if the shared icon contract drifted.

- [ ] **Step 3: Make the canonical back affordance explicit**

In `src/components/AppScreenHeader.tsx`, keep the existing shared path but make the back icon contract explicit and stable:

```tsx
<Pressable
  testID="app-screen-header__back"
  onPress={onBackPress}
  className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-gray-100"
  accessibilityRole="button"
  accessibilityLabel="Go back"
>
  <Ionicons
    testID="app-screen-header__back-icon"
    name="arrow-back"
    size={20}
    color="#111827"
  />
</Pressable>
```

Do not introduce alternate icon names in `ModernScreenHeader` or `StandardHeader`; they must remain thin wrappers.

- [ ] **Step 4: Keep wrapper-header tests aligned**

Update `src/components/__tests__/ModernScreenHeader.test.tsx` if necessary so it asserts the shared back icon path rather than a bespoke header icon path.

- [ ] **Step 5: Run the header tests**

Run:

```bash
npx jest src/components/__tests__/AppScreenHeader.test.tsx
npx jest src/components/__tests__/ModernScreenHeader.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/AppScreenHeader.tsx src/components/__tests__/AppScreenHeader.test.tsx src/components/__tests__/ModernScreenHeader.test.tsx
git commit -m "fix(ui): standardize shared back icon behavior"
```

---

## Task 4: Final Validation

**Files:**
- Validate only

- [ ] **Step 1: Run focused regression tests**

Run:

```bash
npx jest src/navigation/__tests__/nativeStackOptions.test.ts
npx jest src/navigation/__tests__/AppNavigator.back-behavior.test.tsx
npx jest src/components/__tests__/AppScreenHeader.test.tsx
npx jest src/components/__tests__/ModernScreenHeader.test.tsx
```

Expected: PASS.

- [ ] **Step 2: Run TypeScript validation**

Run:

```bash
npx tsc --noEmit
```

Expected: exit code 0.

- [ ] **Step 3: Manual verification checklist**

Verify in the app:

- `Dashboard -> Tasks -> Task Detail -> Back` returns with rightward back behavior
- `Tasks -> Task Detail -> Back` behaves as a true stack pop
- swipe-back gesture matches the header back result on stack-pushed screens
- `PhotoSelection`, `PhotoViewer`, `PhotoAnnotation`, `UpdateProgress`, `AddComment`, `RejectTask`, and `ReassignTask` follow the same directional behavior
- all back-capable screens show the same back icon through the shared header path

- [ ] **Step 4: Final checkpoint commit**

```bash
git status
git add src/navigation src/components
git commit -m "fix(nav): unify back transitions and shared back affordance"
```

---

## Self-Review

### Spec Coverage

Covered:
- shared stack transition defaults
- wrapper back cleanup for stack history
- shared back-icon standardization
- focused regression tests for push/back behavior

No approved requirement from the spec is omitted.

### Placeholder Scan

- No `TODO`, `TBD`, or “implement later” placeholders remain.
- Each task has concrete files, commands, and target code.

### Type Consistency

- Shared transition helper naming is consistent: `buildDefaultStackScreenOptions`
- Back-handler helper naming is consistent: `handleDashboardTaskDetailBack`, `handleTasksTaskDetailBack`
- Shared back icon contract stays anchored on `app-screen-header__back-icon`

---

Plan complete and saved to `docs/superpowers/plans/2026-07-02-navigation-back-consistency-implementation-plan.md`. Since you already selected the subagent-driven path, I can start dispatching Task 1 immediately.
