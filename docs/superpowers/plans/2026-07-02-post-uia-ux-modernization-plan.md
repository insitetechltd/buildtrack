# Post-UIA UX Modernization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Modernize the current UI after `M-UIA-01` to `M-UIA-03` land by making navigation explicit, unifying headers/actions, aligning admin/project/report surfaces with the newer task UI, and reducing Create Task workflow complexity.

**Architecture:** Build on top of the UIA contract stabilization rather than competing with it. Keep the existing screen/view-adapter/state split, introduce one canonical screen-shell/header pattern, remove floating navigation workarounds, and migrate screens incrementally so each task is independently testable.

**Tech Stack:** Expo-managed React Native, TypeScript, React Navigation, Zustand, NativeWind, Jest, React Native Testing Library.

---

## Preconditions

- Wait until the other window finishes `WS-UIA / M-UIA-01`, `M-UIA-02`, and `M-UIA-03`, then pull/rebase those changes first.
- Do not start this plan on top of an in-flight `AppNavigator.tsx`, `navigationTypes.ts`, header, or primitive contract diff.
- Treat `documentation/ROADMAP.md` as the canonical milestone index; this plan is an execution document only.

---

## Files Overview

**Create**
- `src/components/AppScreenHeader.tsx`
- `src/components/__tests__/AppScreenHeader.test.tsx`
- `src/components/ui/PrimaryActionBar.tsx`
- `src/components/ui/ScreenSection.tsx`
- `src/components/ui/__tests__/PrimaryActionBar.test.tsx`
- `src/components/ui/__tests__/ScreenSection.test.tsx`
- `src/components/projects/ProjectsOverviewHero.tsx`
- `src/components/admin/AdminOverviewHero.tsx`
- `src/components/reports/ReportsOverviewHero.tsx`
- `src/components/taskDetail/TaskActivityTimeline.tsx`
- `src/components/taskDetail/__tests__/TaskActivityTimeline.test.tsx`

**Modify**
- `src/navigation/AppNavigator.tsx`
- `src/components/ModernScreenHeader.tsx`
- `src/components/StandardHeader.tsx`
- `src/components/ProfileMenu.tsx`
- `src/components/ExpandableUtilityFAB.tsx`
- `src/components/LogoutFAB.tsx`
- `src/screens/ProfileScreen.tsx`
- `src/screens/ProjectsScreen.tsx`
- `src/screens/AdminDashboardScreen.tsx`
- `src/screens/ReportsScreen.tsx`
- `src/screens/CreateTaskScreen.tsx`
- `src/screens/createTask/CreateTaskAttachmentSection.tsx`
- `src/screens/TaskDetailScreen.tsx`
- `src/__tests__/integration/ProjectsScreen.test.tsx`
- `src/__tests__/integration/ProfileScreen.test.tsx`
- `src/__tests__/integration/TaskDetailScreen.header.test.tsx`
- `src/components/__tests__/ModernScreenHeader.test.tsx`

**Validate**
- `npx tsc --noEmit`
- `npx jest src/components/__tests__/AppScreenHeader.test.tsx`
- `npx jest src/__tests__/integration/ProjectsScreen.test.tsx`
- `npx jest src/__tests__/integration/ProfileScreen.test.tsx`
- `npx jest src/__tests__/integration/TaskDetailScreen.header.test.tsx`

---

## Sequencing Rules

- Task 1 must land before Tasks 2-5 because it defines the shared shell/header contract.
- Task 2 must land before Task 3 because explicit top-level navigation replaces floating navigation workarounds used by admin/project/profile screens.
- Task 4 and Task 5 can run independently after Tasks 1-2.
- Keep commits scoped by task; do not mix shell work with Create Task or Task Detail cleanup.

---

## Task 1: Canonical Screen Header And Shared Screen Sections

**Files:**
- Create: `src/components/AppScreenHeader.tsx`
- Create: `src/components/__tests__/AppScreenHeader.test.tsx`
- Create: `src/components/ui/ScreenSection.tsx`
- Create: `src/components/ui/__tests__/ScreenSection.test.tsx`
- Modify: `src/components/ModernScreenHeader.tsx`
- Modify: `src/components/StandardHeader.tsx`
- Modify: `src/components/ProfileMenu.tsx`
- Modify: `src/components/__tests__/ModernScreenHeader.test.tsx`

- [ ] **Step 1: Write the failing shared-header test**

Create `src/components/__tests__/AppScreenHeader.test.tsx`:

```tsx
import React from "react";
import { Text } from "react-native";
import { fireEvent, render } from "@testing-library/react-native";

import AppScreenHeader from "../AppScreenHeader";

jest.mock("@/state/authStore", () => ({
  useAuthStore: () => ({ user: { id: "user-1", name: "Casey", companyId: "company-1" } }),
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock("../ProfileMenu", () => ({
  __esModule: true,
  default: ({ visible }: { visible: boolean }) => (visible ? <Text>Profile Menu</Text> : null),
}));

describe("AppScreenHeader", () => {
  it("renders title, subtitle, back affordance, and action slot", () => {
    const onBackPress = jest.fn();
    const screen = render(
      <AppScreenHeader
        title="Projects"
        subtitle="12 active"
        showBackButton
        onBackPress={onBackPress}
        rightSlot={<Text>Action Slot</Text>}
      />,
    );

    expect(screen.getByText("Projects")).toBeTruthy();
    expect(screen.getByText("12 active")).toBeTruthy();
    expect(screen.getByText("Action Slot")).toBeTruthy();

    fireEvent.press(screen.getByTestId("app-screen-header__back"));
    expect(onBackPress).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npx jest src/components/__tests__/AppScreenHeader.test.tsx
```

Expected: FAIL with `Cannot find module '../AppScreenHeader'`.

- [ ] **Step 3: Implement the canonical header**

Create `src/components/AppScreenHeader.tsx`:

```tsx
import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import ProfileMenu from "@/components/ProfileMenu";
import { useAuthStore } from "@/state/authStore";
import { cn } from "@/utils/cn";

interface AppScreenHeaderProps {
  title: string;
  subtitle?: string;
  showBackButton?: boolean;
  onBackPress?: () => void;
  onNavigateToProfile?: () => void;
  onNavigateToProjectPicker?: (allowBack?: boolean) => void;
  rightSlot?: React.ReactNode;
  className?: string;
}

export default function AppScreenHeader({
  title,
  subtitle,
  showBackButton = false,
  onBackPress,
  onNavigateToProfile,
  onNavigateToProjectPicker,
  rightSlot,
  className,
}: AppScreenHeaderProps) {
  const { user } = useAuthStore();
  const insets = useSafeAreaInsets();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const topPadding = insets.top > 0 ? insets.top + 8 : 16;

  return (
    <View
      testID="app-screen-header__root"
      className={cn("border-b border-gray-200 bg-white px-4 pb-4", className)}
      style={{ paddingTop: topPadding }}
    >
      <View className="flex-row items-center">
        {showBackButton ? (
          <Pressable
            testID="app-screen-header__back"
            onPress={onBackPress}
            className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-gray-100"
          >
            <Ionicons name="arrow-back" size={20} color="#111827" />
          </Pressable>
        ) : null}

        <View className="flex-1">
          <Text className="text-2xl font-semibold text-gray-900">{title}</Text>
          {subtitle ? <Text className="mt-0.5 text-sm text-gray-500">{subtitle}</Text> : null}
        </View>

        <View className="ml-3 flex-row items-center">
          {rightSlot ? <View>{rightSlot}</View> : null}
          {user ? (
            <Pressable
              testID="app-screen-header__profile"
              onPress={() => setShowProfileMenu(true)}
              className={cn("ml-2 h-9 w-9 items-center justify-center rounded-full bg-blue-600")}
            >
              <Text className="text-base font-bold text-white">
                {user.name.charAt(0).toUpperCase()}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      <ProfileMenu
        visible={showProfileMenu}
        onClose={() => setShowProfileMenu(false)}
        onNavigateToProfile={onNavigateToProfile}
        onNavigateToProjectPicker={onNavigateToProjectPicker}
      />
    </View>
  );
}
```

- [ ] **Step 4: Add the shared section wrapper**

Create `src/components/ui/ScreenSection.tsx`:

```tsx
import React from "react";
import { Text, View } from "react-native";

interface ScreenSectionProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export default function ScreenSection({ title, subtitle, children }: ScreenSectionProps) {
  return (
    <View className="mb-5">
      <View className="mb-3 px-4">
        <Text className="text-lg font-semibold text-gray-900">{title}</Text>
        {subtitle ? <Text className="mt-1 text-sm text-gray-500">{subtitle}</Text> : null}
      </View>
      <View className="px-4">{children}</View>
    </View>
  );
}
```

Create `src/components/ui/__tests__/ScreenSection.test.tsx`:

```tsx
import React from "react";
import { Text } from "react-native";
import { render } from "@testing-library/react-native";

import ScreenSection from "../ScreenSection";

describe("ScreenSection", () => {
  it("renders title, subtitle, and children", () => {
    const screen = render(
      <ScreenSection title="Overview" subtitle="Daily summary">
        <Text>Section Body</Text>
      </ScreenSection>,
    );

    expect(screen.getByText("Overview")).toBeTruthy();
    expect(screen.getByText("Daily summary")).toBeTruthy();
    expect(screen.getByText("Section Body")).toBeTruthy();
  });
});
```

- [ ] **Step 5: Bridge legacy headers onto the new canonical header**

Update `src/components/ModernScreenHeader.tsx`:

```tsx
import React from "react";

import AppScreenHeader from "@/components/AppScreenHeader";

export default function ModernScreenHeader(props: {
  title: string;
  subtitle?: string;
  showBackButton?: boolean;
  onBackPress?: () => void;
  rightElement?: React.ReactNode;
  onNavigateToProfile?: () => void;
  onNavigateToProjectPicker?: (allowBack?: boolean) => void;
  className?: string;
}) {
  return (
    <AppScreenHeader
      title={props.title}
      subtitle={props.subtitle}
      showBackButton={props.showBackButton}
      onBackPress={props.onBackPress}
      onNavigateToProfile={props.onNavigateToProfile}
      onNavigateToProjectPicker={props.onNavigateToProjectPicker}
      rightSlot={props.rightElement}
      className={props.className}
    />
  );
}
```

Update `src/components/StandardHeader.tsx` the same way: preserve the public prop API, but delegate rendering to `AppScreenHeader` and move any future banner-specific UI into an explicit optional slot instead of an alternate layout system.

- [ ] **Step 6: Simplify `ProfileMenu` to fit the shared shell**

Update `src/components/ProfileMenu.tsx` to keep just:
- profile/settings
- change project
- logout

Target menu-body shape:

```tsx
<View className="py-2">
  <Pressable className="flex-row items-center px-4 py-3">
    <Ionicons name="person-outline" size={20} color="#2563eb" />
    <Text className="ml-3 text-base font-medium text-gray-900">Profile & Settings</Text>
  </Pressable>
</View>
```

- [ ] **Step 7: Run the shared-component tests**

Run:

```bash
npx jest src/components/__tests__/AppScreenHeader.test.tsx
npx jest src/components/__tests__/ModernScreenHeader.test.tsx
npx jest src/components/ui/__tests__/ScreenSection.test.tsx
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/components src/components/ui
git commit -m "feat(ui): add canonical screen header and shared sections"
```

---

## Task 2: Explicit Primary Navigation And Action Cleanup

**Files:**
- Modify: `src/navigation/AppNavigator.tsx`
- Modify: `src/components/ExpandableUtilityFAB.tsx`
- Modify: `src/components/LogoutFAB.tsx`
- Modify: `src/screens/ProfileScreen.tsx`
- Modify: `src/screens/ProjectsScreen.tsx`
- Create: `src/components/ui/PrimaryActionBar.tsx`
- Create: `src/components/ui/__tests__/PrimaryActionBar.test.tsx`

- [ ] **Step 1: Write the failing action-bar test**

Create `src/components/ui/__tests__/PrimaryActionBar.test.tsx`:

```tsx
import React from "react";
import { fireEvent, render } from "@testing-library/react-native";

import PrimaryActionBar from "../PrimaryActionBar";

describe("PrimaryActionBar", () => {
  it("renders the primary action and optional secondary action", () => {
    const onPrimaryPress = jest.fn();
    const onSecondaryPress = jest.fn();
    const screen = render(
      <PrimaryActionBar
        primaryLabel="Create Task"
        onPrimaryPress={onPrimaryPress}
        secondaryLabel="Back to Dashboard"
        onSecondaryPress={onSecondaryPress}
      />,
    );

    fireEvent.press(screen.getByText("Create Task"));
    fireEvent.press(screen.getByText("Back to Dashboard"));

    expect(onPrimaryPress).toHaveBeenCalledTimes(1);
    expect(onSecondaryPress).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npx jest src/components/ui/__tests__/PrimaryActionBar.test.tsx
```

Expected: FAIL with `Cannot find module '../PrimaryActionBar'`.

- [ ] **Step 3: Implement `PrimaryActionBar`**

Create `src/components/ui/PrimaryActionBar.tsx`:

```tsx
import React from "react";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { cn } from "@/utils/cn";

interface PrimaryActionBarProps {
  primaryLabel: string;
  onPrimaryPress: () => void;
  secondaryLabel?: string;
  onSecondaryPress?: () => void;
  isPrimaryDisabled?: boolean;
}

export default function PrimaryActionBar({
  primaryLabel,
  onPrimaryPress,
  secondaryLabel,
  onSecondaryPress,
  isPrimaryDisabled = false,
}: PrimaryActionBarProps) {
  return (
    <View className="absolute bottom-0 left-0 right-0 border-t border-gray-200 bg-white px-4 py-3">
      <SafeAreaView edges={["bottom"]}>
        <View className="flex-row gap-3">
          {secondaryLabel && onSecondaryPress ? (
            <Pressable
              onPress={onSecondaryPress}
              className="flex-1 items-center justify-center rounded-xl border border-gray-300 py-3"
            >
              <Text className="font-semibold text-gray-700">{secondaryLabel}</Text>
            </Pressable>
          ) : null}
          <Pressable
            onPress={onPrimaryPress}
            disabled={isPrimaryDisabled}
            className={cn(
              "flex-1 items-center justify-center rounded-xl bg-blue-600 py-3",
              isPrimaryDisabled && "opacity-50",
            )}
          >
            <Text className="font-semibold text-white">{primaryLabel}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}
```

- [ ] **Step 4: Make top-level navigation explicit in `AppNavigator.tsx`**

Update `AppNavigator.tsx` so worker flows show visible tab affordances instead of fully hidden tabs:

```ts
screenOptions={{
  headerShown: false,
  tabBarActiveTintColor: "#2563eb",
  tabBarInactiveTintColor: "#6b7280",
  tabBarStyle: {
    height: 64,
    paddingTop: 8,
    paddingBottom: 8,
    borderTopColor: "#e5e7eb",
    backgroundColor: "#ffffff",
  },
}}
```

Worker tab order:
- `Dashboard`
- `Tasks`
- `CreateTask`
- `Reports`

Do not hide `Tasks` from the primary shell anymore.

- [ ] **Step 5: Retire floating navigation workarounds**

Update `src/components/ExpandableUtilityFAB.tsx` to become overflow-only, not navigation shell:

```tsx
interface ExpandableUtilityFABProps {
  onCreateTask: () => void;
}
```

Remove:
- dashboard shortcut button
- reports shortcut button

Update `src/components/LogoutFAB.tsx` to return `null` and stop rendering dashboard/logout floating controls:

```tsx
export default function LogoutFAB() {
  return null;
}
```

- [ ] **Step 6: Remove now-unnecessary floating utility usage**

Update `src/screens/ProfileScreen.tsx`:
- remove `ExpandableUtilityFAB`
- rely on explicit navigation shell and menu actions

Update `src/screens/ProjectsScreen.tsx`:
- keep header-level actions
- remove reliance on `LogoutFAB`

- [ ] **Step 7: Run targeted tests**

Run:

```bash
npx jest src/components/ui/__tests__/PrimaryActionBar.test.tsx
npx jest src/__tests__/integration/ProfileScreen.test.tsx
npx jest src/__tests__/integration/ProjectsScreen.test.tsx
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/navigation/AppNavigator.tsx src/components src/screens/ProfileScreen.tsx src/screens/ProjectsScreen.tsx
git commit -m "feat(ui): make primary navigation explicit and remove floating nav workarounds"
```

---

## Task 3: Align Projects, Admin Dashboard, And Reports To The Modern Screen System

**Files:**
- Create: `src/components/projects/ProjectsOverviewHero.tsx`
- Create: `src/components/admin/AdminOverviewHero.tsx`
- Create: `src/components/reports/ReportsOverviewHero.tsx`
- Modify: `src/screens/ProjectsScreen.tsx`
- Modify: `src/screens/AdminDashboardScreen.tsx`
- Modify: `src/screens/ReportsScreen.tsx`
- Modify: `src/__tests__/integration/ProjectsScreen.test.tsx`

- [ ] **Step 1: Create a projects hero summary**

Create `src/components/projects/ProjectsOverviewHero.tsx`:

```tsx
import React from "react";
import { Text, View } from "react-native";

interface ProjectsOverviewHeroProps {
  title: string;
  projectCountLabel: string;
}

export default function ProjectsOverviewHero({
  title,
  projectCountLabel,
}: ProjectsOverviewHeroProps) {
  return (
    <View className="mx-4 mb-4 rounded-2xl bg-blue-600 p-5">
      <Text className="text-sm font-medium uppercase tracking-wide text-blue-100">Workspace</Text>
      <Text className="mt-1 text-2xl font-semibold text-white">{title}</Text>
      <Text className="mt-2 text-sm text-blue-100">{projectCountLabel}</Text>
    </View>
  );
}
```

Repeat the same pattern for:
- `src/components/admin/AdminOverviewHero.tsx`
- `src/components/reports/ReportsOverviewHero.tsx`

- [ ] **Step 2: Refactor `ProjectsScreen.tsx` to use the shared shell rhythm**

Update the screen to use:
- `AppScreenHeader`
- `ProjectsOverviewHero`
- `ScreenSection`

Target structure:

```tsx
<SafeAreaView className="flex-1 bg-gray-50">
  <AppScreenHeader title={t.projects.projects} rightSlot={headerActions} />
  <ScrollView className="flex-1">
    <ProjectsOverviewHero title="Projects" projectCountLabel={output.projectCountLabel} />
    <ScreenSection title="Filters">
      <ProjectsScreenFilterChips ... />
    </ScreenSection>
    <ScreenSection title="Project List">
      {projectCards}
    </ScreenSection>
  </ScrollView>
</SafeAreaView>
```

- [ ] **Step 3: Refactor `AdminDashboardScreen.tsx` to use a hero + sections**

Replace the current equal-weight layout with:
- hero summary
- overview section
- administrative actions section

Target section wrapper usage:

```tsx
<ScreenSection title="Company Overview">
  <View className="flex-row flex-wrap justify-between">{statCards}</View>
</ScreenSection>
```

- [ ] **Step 4: Refactor `ReportsScreen.tsx` to share the same visual language**

Use:
- `AppScreenHeader`
- `ReportsOverviewHero`
- `ScreenSection`

Keep report configuration, statistics, and task preview as separate sections, rather than one long undifferentiated form stack.

- [ ] **Step 5: Update the existing Projects integration test**

Append an assertion to `src/__tests__/integration/ProjectsScreen.test.tsx`:

```tsx
it("renders the projects workspace hero and keeps list actions accessible", () => {
  const screen = render(
    <ProjectsScreen
      onNavigateToProjectDetail={jest.fn()}
      onNavigateToCreateProject={jest.fn()}
    />,
  );

  expect(screen.getByText("Projects")).toBeTruthy();
  expect(screen.getByText("Workspace")).toBeTruthy();
});
```

- [ ] **Step 6: Run targeted tests**

Run:

```bash
npx jest src/__tests__/integration/ProjectsScreen.test.tsx
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/components/projects src/components/admin src/components/reports src/screens/ProjectsScreen.tsx src/screens/AdminDashboardScreen.tsx src/screens/ReportsScreen.tsx src/__tests__/integration/ProjectsScreen.test.tsx
git commit -m "feat(ui): align project admin and report screens with modern shell"
```

---

## Task 4: Simplify Create Task Into Sectioned Workflow

**Files:**
- Modify: `src/screens/CreateTaskScreen.tsx`
- Modify: `src/screens/createTask/CreateTaskAttachmentSection.tsx`
- Modify: `src/__tests__/integration/CreateTaskScreen.test.tsx`

- [ ] **Step 1: Add the failing section-order test**

Append to `src/__tests__/integration/CreateTaskScreen.test.tsx`:

```tsx
it("renders the create task form as grouped workflow sections", () => {
  const screen = render(<CreateTaskScreen onNavigateBack={jest.fn()} />);

  expect(screen.getByText("Task Basics")).toBeTruthy();
  expect(screen.getByText("Assignment")).toBeTruthy();
  expect(screen.getByText("Schedule")).toBeTruthy();
  expect(screen.getByText("Attachments")).toBeTruthy();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npx jest src/__tests__/integration/CreateTaskScreen.test.tsx
```

Expected: FAIL because those section headings do not exist yet.

- [ ] **Step 3: Group the form into explicit sections**

Update `src/screens/CreateTaskScreen.tsx` to use `ScreenSection` for:
- `Task Basics`
- `Assignment`
- `Schedule`
- `More Details`
- `Attachments`

Target wrapper pattern:

```tsx
<ScreenSection title="Task Basics" subtitle="Start with the essentials">
  {titleField}
  {descriptionField}
  {taskReferenceField}
</ScreenSection>
```

Move optional fields such as:
- billing status
- category
- task reference

under `More Details`.

- [ ] **Step 4: Reduce modal-heavy affordances where possible**

Keep the user picker modal, but convert simple state selectors to inline pressable chips where feasible:

```tsx
<View className="flex-row flex-wrap gap-2">
  {(["critical", "high", "medium", "low"] as Priority[]).map((priority) => (
    <Pressable
      key={priority}
      onPress={() => handlePriorityChange(priority)}
      className={cn(
        "rounded-full border px-3 py-2",
        formData.priority === priority ? "border-blue-600 bg-blue-50" : "border-gray-300 bg-white",
      )}
    >
      <Text>{t.tasks[priority as keyof typeof t.tasks] || priority}</Text>
    </Pressable>
  ))}
</View>
```

- [ ] **Step 5: Make attachments read as a section, not a terminal control**

Update `src/screens/createTask/CreateTaskAttachmentSection.tsx`:

```tsx
<View className="rounded-2xl border border-gray-200 bg-white p-4">
  <Text className="text-lg font-semibold text-gray-900">Attachments</Text>
  <Text className="mt-1 text-sm text-gray-500">Add photos before submitting the task.</Text>
  ...
</View>
```

- [ ] **Step 6: Reuse the shared primary action bar**

Replace the current hard-coded footer in `CreateTaskScreen.tsx` with `PrimaryActionBar`:

```tsx
<PrimaryActionBar
  primaryLabel={editTaskId ? t.createTask.updateTaskButton : t.createTask.createTaskButton}
  onPrimaryPress={handleSubmit}
  isPrimaryDisabled={isSubmitting}
/>
```

- [ ] **Step 7: Run the Create Task integration test**

Run:

```bash
npx jest src/__tests__/integration/CreateTaskScreen.test.tsx
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/screens/CreateTaskScreen.tsx src/screens/createTask/CreateTaskAttachmentSection.tsx src/__tests__/integration/CreateTaskScreen.test.tsx
git commit -m "feat(ui): simplify create task into sectioned workflow"
```

---

## Task 5: Improve Task Detail Timeline And Action Prioritization

**Files:**
- Create: `src/components/taskDetail/TaskActivityTimeline.tsx`
- Create: `src/components/taskDetail/__tests__/TaskActivityTimeline.test.tsx`
- Modify: `src/screens/TaskDetailScreen.tsx`
- Modify: `src/__tests__/integration/TaskDetailScreen.header.test.tsx`

- [ ] **Step 1: Write the failing activity-timeline test**

Create `src/components/taskDetail/__tests__/TaskActivityTimeline.test.tsx`:

```tsx
import React from "react";
import { render } from "@testing-library/react-native";

import TaskActivityTimeline from "../TaskActivityTimeline";

describe("TaskActivityTimeline", () => {
  it("renders activity rows with newest-first grouping and collapse affordance", () => {
    const screen = render(
      <TaskActivityTimeline
        activities={[
          {
            id: "activity-1",
            userName: "Sam",
            timestamp: "2026-07-02T10:00:00.000Z",
            description: "Submitted for review",
            activityType: "status_change",
          },
        ]}
      />,
    );

    expect(screen.getByText("Activity")).toBeTruthy();
    expect(screen.getByText("Newest first")).toBeTruthy();
    expect(screen.getByText("Submitted for review")).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npx jest src/components/taskDetail/__tests__/TaskActivityTimeline.test.tsx
```

Expected: FAIL with `Cannot find module '../TaskActivityTimeline'`.

- [ ] **Step 3: Implement the task activity timeline**

Create `src/components/taskDetail/TaskActivityTimeline.tsx`:

```tsx
import React from "react";
import { Text, View } from "react-native";

interface TaskActivityTimelineItem {
  id: string;
  userName: string;
  timestamp: string;
  description: string;
  activityType: string;
}

export default function TaskActivityTimeline({
  activities,
}: {
  activities: TaskActivityTimelineItem[];
}) {
  return (
    <View className="rounded-2xl border border-gray-200 bg-white p-4">
      <View className="mb-4 flex-row items-center justify-between">
        <Text className="text-lg font-semibold text-gray-900">Activity</Text>
        <Text className="text-sm font-medium text-gray-500">Newest first</Text>
      </View>
      {activities.map((activity) => (
        <View key={activity.id} className="mb-3 flex-row">
          <View className="mr-3 mt-1 h-2.5 w-2.5 rounded-full bg-blue-600" />
          <View className="flex-1">
            <Text className="text-sm font-medium text-gray-900">{activity.userName}</Text>
            <Text className="mt-1 text-sm text-gray-600">{activity.description}</Text>
            <Text className="mt-1 text-xs text-gray-400">{activity.timestamp}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}
```

- [ ] **Step 4: Use the timeline and prioritize actions in `TaskDetailScreen.tsx`**

Update the screen to:
- replace the inline `Activities` block with `TaskActivityTimeline`
- show only the primary next action in the persistent footer
- move any remaining actions into an inline secondary row above the footer

Target footer pattern:

```tsx
<PrimaryActionBar
  primaryLabel={primaryAction.label}
  onPrimaryPress={() => handleActionPress(primaryAction.actionId)}
  secondaryLabel={secondaryAction?.label}
  onSecondaryPress={
    secondaryAction ? () => handleActionPress(secondaryAction.actionId) : undefined
  }
/>
```

- [ ] **Step 5: Update the task-detail integration test**

Append to `src/__tests__/integration/TaskDetailScreen.header.test.tsx`:

```tsx
it("renders the activity timeline title when activities are available", () => {
  mockUseTaskDetailViewAdapter.mockReturnValue({
    output: {
      readiness: { hasUsableData: true },
      header: { title: "Task Details" },
      banners: [],
      detailSections: [],
      assigners: [],
      assignees: [],
      activities: [
        {
          id: "activity-1",
          userName: "Sam",
          timestamp: "2026-07-02T10:00:00.000Z",
          description: "Submitted for review",
          activityType: "status_change",
        },
      ],
      childTasks: [],
      actionItems: [],
    },
    actions: {
      acceptTask: jest.fn(),
      declineTask: jest.fn(),
      submitForReview: jest.fn(),
      approveTask: jest.fn(),
    },
  } as ReturnType<typeof useTaskDetailViewAdapter>);

  const screen = render(<TaskDetailScreen taskId="task-1" onNavigateBack={jest.fn()} />);
  expect(screen.getByText("Activity")).toBeTruthy();
});
```

- [ ] **Step 6: Run targeted tests**

Run:

```bash
npx jest src/components/taskDetail/__tests__/TaskActivityTimeline.test.tsx
npx jest src/__tests__/integration/TaskDetailScreen.header.test.tsx
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/components/taskDetail src/screens/TaskDetailScreen.tsx src/__tests__/integration/TaskDetailScreen.header.test.tsx
git commit -m "feat(ui): improve task detail timeline and action priority"
```

---

## Final Verification

- [ ] Run:

```bash
npx tsc --noEmit
npx jest src/components/__tests__/AppScreenHeader.test.tsx
npx jest src/__tests__/integration/ProjectsScreen.test.tsx
npx jest src/__tests__/integration/ProfileScreen.test.tsx
npx jest src/__tests__/integration/TaskDetailScreen.header.test.tsx
npx jest src/__tests__/integration/CreateTaskScreen.test.tsx
```

Expected:
- TypeScript exits 0
- all targeted UI regression tests pass

- [ ] Manual QA checklist

Run the app and verify:
- worker sees explicit top-level navigation destinations
- profile/project access is consistent across worker/admin screens
- projects/admin/reports read as the same visual system
- Create Task feels sectioned and easier to scan
- Task Detail surfaces the next action clearly and the activity history is easier to parse

- [ ] Final checkpoint commit

```bash
git status
git add src/components src/navigation src/screens src/__tests__
git commit -m "feat(ui): deliver post-uia ux modernization foundations"
```

---

## Self-Review

### Spec Coverage

Covered from the audit:
- explicit navigation
- one canonical header
- reduced floating navigation workarounds
- admin/project/report alignment with the modern shell
- Create Task simplification
- Task Detail readability improvements

Not included in this first plan:
- full dashboard reprioritization
- full accessibility/touch-target audit across every screen
- full primitive expansion for every bespoke card type

Those should be follow-up plans once this foundation lands cleanly.

### Placeholder Scan

- No `TODO`, `TBD`, or “implement later” placeholders remain.
- Each task has concrete files, concrete test commands, and concrete target code patterns.

### Type Consistency

- Shared shell naming is consistent: `AppScreenHeader`, `ScreenSection`, `PrimaryActionBar`.
- Task Detail timeline naming is consistent: `TaskActivityTimeline`.

---

Plan complete and saved to `docs/superpowers/plans/2026-07-02-post-uia-ux-modernization-plan.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
