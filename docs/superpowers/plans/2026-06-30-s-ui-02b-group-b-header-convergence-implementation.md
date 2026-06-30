# S-UI-02B Group B Header Convergence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `StandardHeader` with a shared `ModernScreenHeader` across `TaskDetailScreen`, `UpdateProgressScreen`, and `CreateTaskScreen` (including CreateTask action-mode blocks) while preserving behavior and header footprint.

**Architecture:** Add `ModernScreenHeader` with a prop surface intentionally aligned to `StandardHeader`. Freeze header behavior with focused screen tests, then migrate Group B screens. Keep `ModernUiMarker` as a `rightElement` slot, not embedded.

**Tech Stack:** Expo-managed React Native, TypeScript, React Navigation, Zustand, NativeWind, Jest, `@testing-library/react-native`.

---

## File Structure

**New**
- `src/components/ModernScreenHeader.tsx`
- `src/components/__tests__/ModernScreenHeader.test.tsx`
- `src/__tests__/integration/TaskDetailScreen.header.test.tsx`
- `src/__tests__/integration/UpdateProgressScreen.header.test.tsx`

**Modify**
- `src/screens/TaskDetailScreen.tsx`
- `src/screens/UpdateProgressScreen.tsx`
- `src/screens/CreateTaskScreen.tsx`
- `src/__tests__/integration/CreateTaskScreen.test.tsx`

## Task 1: Add `ModernScreenHeader` With Tests (Red → Green)

**Files:**
- Create: `src/components/ModernScreenHeader.tsx`
- Create: `src/components/__tests__/ModernScreenHeader.test.tsx`

- [ ] **Step 1: Write failing component tests**

```tsx
import React from "react";
import { Text } from "react-native";
import { fireEvent, render } from "@testing-library/react-native";

import ModernScreenHeader from "../ModernScreenHeader";

jest.mock("@/state/authStore", () => ({
  useAuthStore: () => ({ user: { id: "user-1", name: "Casey", companyId: "company-1" } }),
}));

jest.mock("@/state/companyStore", () => ({
  useCompanyStore: () => ({ getCompanyBanner: () => null }),
}));

jest.mock("@/state/themeStore", () => ({
  useThemeStore: () => ({ isDarkMode: false }),
}));

jest.mock("@/utils/useTranslation", () => ({
  useTranslation: () => ({ common: { back: "Back" } }),
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock("expo-status-bar", () => ({
  StatusBar: () => null,
}));

describe("ModernScreenHeader", () => {
  it("renders title and right element", () => {
    const screen = render(
      <ModernScreenHeader title="Task Details" rightElement={<Text>Modern UI</Text>} />,
    );

    expect(screen.getByText("Task Details")).toBeTruthy();
    expect(screen.getByText("Modern UI")).toBeTruthy();
  });

  it("renders a back button only when showBackButton is true", () => {
    const onBackPress = jest.fn();
    const screen = render(
      <ModernScreenHeader title="Task Details" showBackButton onBackPress={onBackPress} />,
    );

    fireEvent.press(screen.getByTestId("modernHeader-back"));

    expect(onBackPress).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run to confirm RED**

Run:

```bash
PATH=/opt/homebrew/bin:$PATH ./node_modules/.bin/jest src/components/__tests__/ModernScreenHeader.test.tsx --runInBand
```

Expected:

```text
FAIL ... Cannot find module '../ModernScreenHeader'
```

- [ ] **Step 3: Implement `ModernScreenHeader` minimally to satisfy the tests**

```tsx
import React, { useEffect, useState } from "react";
import { Image, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";

import { useAuthStore } from "@/state/authStore";
import { useCompanyStore } from "@/state/companyStore";
import { useThemeStore } from "@/state/themeStore";
import { cn } from "@/utils/cn";
import ProfileMenu from "@/components/ProfileMenu";

interface ModernScreenHeaderProps {
  title: string;
  subtitle?: string;
  showBackButton?: boolean;
  onBackPress?: () => void;
  onBack?: () => void;
  rightElement?: React.ReactNode;
  onProfilePress?: () => void;
  onNavigateToProfile?: () => void;
  onNavigateToProjectPicker?: (allowBack?: boolean) => void;
  className?: string;
}

export default function ModernScreenHeader({
  title,
  subtitle,
  showBackButton = false,
  onBackPress,
  onBack,
  rightElement,
  onProfilePress,
  onNavigateToProfile,
  onNavigateToProjectPicker,
  className = "",
}: ModernScreenHeaderProps) {
  const { user } = useAuthStore();
  const { getCompanyBanner } = useCompanyStore();
  const { isDarkMode } = useThemeStore();
  const navigation = useNavigation<any>();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const insets = useSafeAreaInsets();

  const handleNavigateToProfile =
    onNavigateToProfile ?? (() => navigation.getParent()?.navigate("Profile"));

  const handleNavigateToProjectPicker =
    onNavigateToProjectPicker ??
    ((allowBack?: boolean) => navigation.getParent()?.navigate("ProjectPicker", { allowBack }));

  const topPadding = insets.top > 0 ? insets.top + 8 : 16;

  useEffect(() => {
    setShowProfileMenu(false);
  }, [title]);

  const banner = user ? getCompanyBanner(user.companyId) : null;

  return (
    <View
      className={cn(
        "border-b px-6 pb-4",
        isDarkMode ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200",
        className,
      )}
      style={{ paddingTop: topPadding }}
    >
      {banner && banner.isVisible ? (
        <View className="mb-2">
          {banner.imageUri ? (
            <Image
              source={{ uri: banner.imageUri }}
              style={{ width: "100%", height: 60 }}
              resizeMode="cover"
              className="rounded-lg"
            />
          ) : (
            <Text
              style={{ color: banner.textColor, fontSize: 18, fontWeight: "700" }}
              numberOfLines={1}
            >
              {banner.text}
            </Text>
          )}
        </View>
      ) : null}

      <View className="flex-row items-center">
        {showBackButton ? (
          <Pressable
            testID="modernHeader-back"
            onPress={onBackPress || onBack}
            className="mr-3 h-10 w-10 items-center justify-center"
          >
            <Ionicons
              name="arrow-back"
              size={24}
              color={isDarkMode ? "#cbd5e1" : "#374151"}
            />
          </Pressable>
        ) : null}

        <View className="flex-1">
          <Text className={cn("text-2xl font-bold", isDarkMode ? "text-white" : "text-gray-900")}>
            {title}
          </Text>
          {subtitle ? (
            <Text className={cn("text-base mt-0.5", isDarkMode ? "text-slate-400" : "text-gray-600")} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>

        <View className="ml-3 flex-row items-center">
          {rightElement ? <View>{rightElement}</View> : null}
          {user ? (
            <Pressable
              onPress={() => {
                if (onProfilePress) {
                  onProfilePress();
                } else {
                  setShowProfileMenu(true);
                }
              }}
              className={cn("flex-row items-center", rightElement ? "ml-2" : "")}
            >
              <View className="h-8 w-8 items-center justify-center rounded-full bg-blue-600">
                <Text className="text-base font-bold text-white">
                  {user.name.charAt(0).toUpperCase()}
                </Text>
              </View>
            </Pressable>
          ) : null}
        </View>
      </View>

      {user ? (
        <ProfileMenu
          visible={showProfileMenu}
          onClose={() => setShowProfileMenu(false)}
          onNavigateToProfile={handleNavigateToProfile}
          onNavigateToProjectPicker={handleNavigateToProjectPicker}
        />
      ) : null}
    </View>
  );
}
```

- [ ] **Step 4: Run to confirm GREEN**

Run:

```bash
PATH=/opt/homebrew/bin:$PATH ./node_modules/.bin/jest src/components/__tests__/ModernScreenHeader.test.tsx --runInBand
```

Expected:

```text
PASS src/components/__tests__/ModernScreenHeader.test.tsx
```

- [ ] **Step 5: Commit**

```bash
git add src/components/ModernScreenHeader.tsx src/components/__tests__/ModernScreenHeader.test.tsx
git commit -m "feat(header): add modern screen header"
```

## Task 2: Freeze Group B Header Behavior With Screen Tests (Red → Green)

**Files:**
- Create: `src/__tests__/integration/TaskDetailScreen.header.test.tsx`
- Create: `src/__tests__/integration/UpdateProgressScreen.header.test.tsx`
- Modify: `src/__tests__/integration/CreateTaskScreen.test.tsx`

- [ ] **Step 1: Write failing header-focused tests for TaskDetail and UpdateProgress**

`TaskDetail` header test should assert:
- title renders in both loading and loaded paths
- `ModernUiMarker` is rendered in the header region
- back button press calls the provided callback

`UpdateProgress` header test should assert:
- title renders
- marker renders
- back press calls `navigation.goBack()`

- [ ] **Step 2: Run tests to confirm RED, then make the smallest test harness adjustments needed**

Run:

```bash
PATH=/opt/homebrew/bin:$PATH ./node_modules/.bin/jest src/__tests__/integration/TaskDetailScreen.header.test.tsx src/__tests__/integration/UpdateProgressScreen.header.test.tsx --runInBand
```

- [ ] **Step 3: Commit the regression freeze checkpoint**

```bash
git add src/__tests__/integration/TaskDetailScreen.header.test.tsx src/__tests__/integration/UpdateProgressScreen.header.test.tsx src/__tests__/integration/CreateTaskScreen.test.tsx
git commit -m "test(header): freeze group b header behavior"
```

## Task 3: Migrate Group B Screens To `ModernScreenHeader` (Red → Green)

**Files:**
- Modify: `src/screens/TaskDetailScreen.tsx`
- Modify: `src/screens/UpdateProgressScreen.tsx`
- Modify: `src/screens/CreateTaskScreen.tsx`
- Test: `src/__tests__/integration/TaskDetailScreen.header.test.tsx`
- Test: `src/__tests__/integration/UpdateProgressScreen.header.test.tsx`
- Test: `src/__tests__/integration/CreateTaskScreen.test.tsx`

- [ ] **Step 1: Make the tests expect the new header component via real render output**

For example, the tests should assert the new back testID exists:

```tsx
expect(getByTestId("modernHeader-back")).toBeTruthy();
```

- [ ] **Step 2: Run tests to confirm RED**

- [ ] **Step 3: Replace `StandardHeader` usage with `ModernScreenHeader` in each target screen**

Example migration snippet:

```tsx
import ModernScreenHeader from "@/components/ModernScreenHeader";

<ModernScreenHeader
  title={...}
  showBackButton={true}
  onBackPress={...}
  onNavigateToProfile={...}
  onNavigateToProjectPicker={...}
  rightElement={<ModernUiMarker />}
/>
```

Ensure `CreateTaskScreen` replaces all `StandardHeader` occurrences in create/edit and action-mode render blocks.

- [ ] **Step 4: Run tests to confirm GREEN**

Run:

```bash
PATH=/opt/homebrew/bin:$PATH ./node_modules/.bin/jest src/__tests__/integration/TaskDetailScreen.header.test.tsx src/__tests__/integration/UpdateProgressScreen.header.test.tsx src/__tests__/integration/CreateTaskScreen.test.tsx --runInBand
```

- [ ] **Step 5: Commit**

```bash
git add src/screens/TaskDetailScreen.tsx src/screens/UpdateProgressScreen.tsx src/screens/CreateTaskScreen.tsx
git commit -m "refactor(header): migrate group b screens to modern header"
```

## Task 4: Final Verification Gate + `S-UI-02B` Checkpoint

**Files:**
- Verify: `src/screens/TaskDetailScreen.tsx`
- Verify: `src/screens/UpdateProgressScreen.tsx`
- Verify: `src/screens/CreateTaskScreen.tsx`
- Verify tests created/modified in this plan

- [ ] **Step 1: Run the focused verification gate**

```bash
PATH=/opt/homebrew/bin:$PATH ./node_modules/.bin/jest src/components/__tests__/ModernScreenHeader.test.tsx --runInBand
PATH=/opt/homebrew/bin:$PATH ./node_modules/.bin/jest src/__tests__/integration/TaskDetailScreen.header.test.tsx --runInBand
PATH=/opt/homebrew/bin:$PATH ./node_modules/.bin/jest src/__tests__/integration/UpdateProgressScreen.header.test.tsx --runInBand
PATH=/opt/homebrew/bin:$PATH ./node_modules/.bin/jest src/__tests__/integration/CreateTaskScreen.test.tsx --runInBand
PATH=/opt/homebrew/bin:$PATH ./node_modules/.bin/tsc --noEmit
```

- [ ] **Step 2: Stage only `S-UI-02B` files and checkpoint commit**

```bash
git status --short
git add src/components/ModernScreenHeader.tsx src/components/__tests__/ModernScreenHeader.test.tsx src/screens/TaskDetailScreen.tsx src/screens/UpdateProgressScreen.tsx src/screens/CreateTaskScreen.tsx src/__tests__/integration/TaskDetailScreen.header.test.tsx src/__tests__/integration/UpdateProgressScreen.header.test.tsx src/__tests__/integration/CreateTaskScreen.test.tsx
git commit -m "refactor(header): complete s-ui-02b group b header convergence"
```

---

## Self-Review

- Spec coverage: new shared header component + migration of the three named Group B screens.
- Placeholder scan: each task has explicit files, tests, commands, and commit boundaries.
- Type consistency: `ModernScreenHeader` prop surface is intentionally aligned with `StandardHeader`.
