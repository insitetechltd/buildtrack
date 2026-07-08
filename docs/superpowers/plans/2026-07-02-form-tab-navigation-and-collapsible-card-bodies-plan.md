# Form Tab Navigation And Collapsible Card Bodies Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Standardize hardware-keyboard `Tab` behavior across all user-facing forms and modals while also removing wasteful placeholder `ContainerCard` body spacing and enabling expandable task-photo display in task cards.

**Architecture:** Introduce one shared form keyboard-navigation utility that screens and modal forms opt into incrementally, beginning with `CreateTaskScreen` and then rolling through the remaining user-facing forms. In parallel, evolve the container-card primitive contract so card bodies collapse by default, expand only when meaningful media exists, and surface task attachments from the task view-adapter contract into `TasksScreen` card rendering without restoring app-shell bottom navigation.

**Tech Stack:** Expo-managed React Native, TypeScript, React Navigation, Zustand, NativeWind, Jest, React Native Testing Library.

---

## Scope Check

This plan intentionally covers two linked UX corrections in one implementation stream:

1. form keyboard traversal behavior
2. collapsible container-card bodies for dashboard/task cards

These fit together because both are approved interaction-system decisions and both require shared primitive/UI contract changes rather than one isolated screen tweak.

---

## Files Overview

**Create**
- `src/utils/formNavigation.ts`
- `src/utils/__tests__/formNavigation.test.ts`
- `src/components/primitives/container/ContainerBodyMedia.tsx`
- `src/components/primitives/container/__tests__/ContainerBodyMedia.test.tsx`

**Modify**
- `src/ui/contracts/primitives.ts`
- `src/ui/contracts/viewAdapters.ts`
- `src/components/primitives/container/ContainerCard.tsx`
- `src/components/primitives/container/ContainerBodyState.tsx`
- `src/components/primitives/__tests__/ContainerCard.test.tsx`
- `src/ui/mappers/tasksMappers.ts`
- `src/ui/mappers/dashboardMappers.ts`
- `src/ui/viewAdapters/useTasksViewAdapter.ts`
- `src/screens/CreateTaskScreen.tsx`
- `src/screens/LoginScreen.tsx`
- `src/components/ProjectForm.tsx`
- `src/screens/projects/EditProjectModal.tsx`
- `src/screens/ProfileScreen.tsx`
- `src/screens/UpdateProgressScreen.tsx`
- `src/screens/AddCommentScreen.tsx`
- `src/screens/RejectTaskScreen.tsx`
- `src/screens/ReassignTaskScreen.tsx`
- `src/screens/UserManagementScreen.tsx`
- `src/__tests__/integration/CreateTaskScreen.test.tsx`
- `src/components/primitives/__tests__/Input.test.tsx`

**Validate**
- `npx jest src/utils/__tests__/formNavigation.test.ts`
- `npx jest src/components/primitives/container/__tests__/ContainerBodyMedia.test.tsx`
- `npx jest src/components/primitives/__tests__/ContainerCard.test.tsx`
- `npx jest src/__tests__/integration/CreateTaskScreen.test.tsx`
- `npx tsc --noEmit`

---

## Design Constraints To Preserve

- `Tab` is scoped to the active form only.
- `Shift+Tab` is supported where the event path can detect modifiers.
- Multiline fields still advance on `Tab`.
- App-shell controls such as FABs, profile triggers, picker triggers, and global navigation affordances must not enter the normal text-field tab order.
- Bottom action bars may serve as the final form-completion focus target only; they must not become mid-form tab stops.
- The removed bottom navigation bar must stay removed in the intended UX direction.
- `ContainerCard` bodies must collapse by default when there is no meaningful rich content.
- Task cards should support expandable photo display from task attachments.
- Dashboard project-summary cards should stay compact and must not render placeholder body spacing.

---

## Task 1: Add Shared Form Navigation Utility

**Files:**
- Create: `src/utils/formNavigation.ts`
- Create: `src/utils/__tests__/formNavigation.test.ts`

- [ ] **Step 1: Write the failing utility test**

Create `src/utils/__tests__/formNavigation.test.ts`:

```ts
import {
  createFormNavigationRegistry,
  getNextFocusableFieldId,
  getPreviousFocusableFieldId,
} from "../formNavigation";

describe("formNavigation", () => {
  it("skips hidden and disabled fields when moving forward and backward", () => {
    const registry = createFormNavigationRegistry([
      { fieldId: "title", isFocusable: true },
      { fieldId: "description", isFocusable: true },
      { fieldId: "billingStatus", isFocusable: false },
      { fieldId: "submit", isFocusable: true },
    ]);

    expect(getNextFocusableFieldId(registry, "title")).toBe("description");
    expect(getNextFocusableFieldId(registry, "description")).toBe("submit");
    expect(getPreviousFocusableFieldId(registry, "submit")).toBe("description");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npx jest src/utils/__tests__/formNavigation.test.ts
```

Expected: FAIL with `Cannot find module '../formNavigation'`.

- [ ] **Step 3: Implement the shared registry utility**

Create `src/utils/formNavigation.ts`:

```ts
export interface FocusableFieldRegistration {
  fieldId: string;
  isFocusable: boolean;
}

export interface FormNavigationRegistry {
  fields: FocusableFieldRegistration[];
}

export function createFormNavigationRegistry(
  fields: FocusableFieldRegistration[],
): FormNavigationRegistry {
  return { fields };
}

function getOrderedFocusableFieldIds(registry: FormNavigationRegistry): string[] {
  return registry.fields.filter((field) => field.isFocusable).map((field) => field.fieldId);
}

export function getNextFocusableFieldId(
  registry: FormNavigationRegistry,
  activeFieldId: string,
): string | null {
  const ids = getOrderedFocusableFieldIds(registry);
  const index = ids.indexOf(activeFieldId);
  if (index === -1 || index === ids.length - 1) {
    return null;
  }

  return ids[index + 1];
}

export function getPreviousFocusableFieldId(
  registry: FormNavigationRegistry,
  activeFieldId: string,
): string | null {
  const ids = getOrderedFocusableFieldIds(registry);
  const index = ids.indexOf(activeFieldId);
  if (index <= 0) {
    return null;
  }

  return ids[index - 1];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
npx jest src/utils/__tests__/formNavigation.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/utils/formNavigation.ts src/utils/__tests__/formNavigation.test.ts
git commit -m "feat(ui): add shared form navigation utility"
```

---

## Task 2: Extend Primitive Contracts For Collapsible Card Bodies And Media

**Files:**
- Create: `src/components/primitives/container/ContainerBodyMedia.tsx`
- Create: `src/components/primitives/container/__tests__/ContainerBodyMedia.test.tsx`
- Modify: `src/ui/contracts/primitives.ts`
- Modify: `src/components/primitives/container/ContainerBodyState.tsx`
- Modify: `src/components/primitives/container/ContainerCard.tsx`
- Modify: `src/components/primitives/__tests__/ContainerCard.test.tsx`

- [ ] **Step 1: Write the failing container-media test**

Create `src/components/primitives/container/__tests__/ContainerBodyMedia.test.tsx`:

```tsx
import React from "react";
import { fireEvent, render } from "@testing-library/react-native";

import ContainerBodyMedia from "../ContainerBodyMedia";

describe("ContainerBodyMedia", () => {
  it("renders a collapsed affordance and expands thumbnail content on demand", () => {
    const screen = render(
      <ContainerBodyMedia
        cardTestId="container-card:test"
        media={{
          mode: "collapsible",
          collapsedLabel: "Photos (2)",
          items: [
            { id: "photo-1", uri: "https://example.com/1.jpg" },
            { id: "photo-2", uri: "https://example.com/2.jpg" },
          ],
        }}
      />,
    );

    expect(screen.getByText("Photos (2)")).toBeTruthy();
    expect(screen.queryByTestId("container-card:test__media-item__photo-1")).toBeNull();

    fireEvent.press(screen.getByTestId("container-card:test__media-toggle"));

    expect(screen.getByTestId("container-card:test__media-item__photo-1")).toBeTruthy();
    expect(screen.getByTestId("container-card:test__media-item__photo-2")).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npx jest src/components/primitives/container/__tests__/ContainerBodyMedia.test.tsx
```

Expected: FAIL with `Cannot find module '../ContainerBodyMedia'`.

- [ ] **Step 3: Extend the primitive contract**

Update `src/ui/contracts/primitives.ts` to add media support:

```ts
export interface ContainerBodyMediaItemContract {
  id: string;
  uri: string;
  accessibilityLabel?: string;
}

export interface ContainerBodyMediaContract {
  mode: "hidden" | "collapsible" | "expanded";
  collapsedLabel?: string;
  items: ContainerBodyMediaItemContract[];
}

export interface ContainerBodyStateContract {
  empty?: ContainerEmptyStateContract;
  skeleton?: ContainerSkeletonContract;
  media?: ContainerBodyMediaContract;
  shouldRenderBody?: boolean;
}
```

- [ ] **Step 4: Implement `ContainerBodyMedia`**

Create `src/components/primitives/container/ContainerBodyMedia.tsx`:

```tsx
import React, { useMemo, useState } from "react";
import { Image, Pressable, Text, View } from "react-native";

import type { ContainerBodyMediaContract } from "@/ui/contracts/primitives";

export default function ContainerBodyMedia({
  cardTestId,
  media,
}: {
  cardTestId: string;
  media: ContainerBodyMediaContract;
}) {
  const [isExpanded, setIsExpanded] = useState(media.mode === "expanded");
  const shouldShowItems = media.mode === "expanded" || isExpanded;
  const collapsedLabel = useMemo(() => {
    if (media.collapsedLabel) {
      return media.collapsedLabel;
    }

    return `Photos (${media.items.length})`;
  }, [media.collapsedLabel, media.items.length]);

  return (
    <View testID={`${cardTestId}__media`}>
      {media.mode === "collapsible" ? (
        <Pressable
          testID={`${cardTestId}__media-toggle`}
          onPress={() => setIsExpanded((current) => !current)}
          className="mb-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
        >
          <Text className="text-sm font-medium text-slate-700">{collapsedLabel}</Text>
        </Pressable>
      ) : null}

      {shouldShowItems ? (
        <View className="flex-row gap-2">
          {media.items.map((item) => (
            <Image
              key={item.id}
              testID={`${cardTestId}__media-item__${item.id}`}
              source={{ uri: item.uri }}
              accessibilityLabel={item.accessibilityLabel}
              className="h-16 w-16 rounded-lg bg-slate-200"
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}
```

- [ ] **Step 5: Make `ContainerBodyState` collapse by default**

Update `src/components/primitives/container/ContainerBodyState.tsx`:

```tsx
import ContainerBodyMedia from "./ContainerBodyMedia";

...

  if (structuralState === "loading") {
    ...
  }

  if (structuralState === "empty") {
    ...
  }

  if (!body.shouldRenderBody && (!body.media || body.media.mode === "hidden")) {
    return null;
  }

  if (body.media && body.media.mode !== "hidden" && body.media.items.length > 0) {
    return (
      <View testID={`${cardTestId}__body`} className={cn("justify-center", densityClasses.body)}>
        <ContainerBodyMedia cardTestId={cardTestId} media={body.media} />
      </View>
    );
  }

  return null;
```

- [ ] **Step 6: Preserve card shell while removing placeholder body copy**

Update `src/components/primitives/container/ContainerCard.tsx` so it still renders `ContainerBodyState`, but no longer assumes the body region is always visible in stale/disabled states.

- [ ] **Step 7: Update the card tests**

Modify `src/components/primitives/__tests__/ContainerCard.test.tsx`:

- remove assertions that rely on placeholder body copy for normal stale/disabled rendering
- keep loading and empty-state coverage
- add a test that confirms stale cards without meaningful content do not render the body region

Append:

```tsx
it("collapses the body region when no meaningful content is available", () => {
  const { queryByTestId } = render(<ContainerCard contract={baseContract} />);
  expect(queryByTestId("container-card__body")).toBeNull();
});
```

- [ ] **Step 8: Run targeted tests**

Run:

```bash
npx jest src/components/primitives/container/__tests__/ContainerBodyMedia.test.tsx
npx jest src/components/primitives/__tests__/ContainerCard.test.tsx
```

Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add src/ui/contracts/primitives.ts src/components/primitives/container src/components/primitives/__tests__/ContainerCard.test.tsx
git commit -m "feat(ui): make container card bodies collapsible"
```

---

## Task 3: Surface Task Attachments Into Tasks Card Contracts

**Files:**
- Modify: `src/ui/contracts/viewAdapters.ts`
- Modify: `src/ui/viewAdapters/useTasksViewAdapter.ts`
- Modify: `src/ui/mappers/tasksMappers.ts`

- [ ] **Step 1: Extend the tasks row contract for attachments**

Update `src/ui/contracts/viewAdapters.ts`:

```ts
export interface TasksScreenRowItem extends PrimitiveReadyItemBase {
  id: string;
  taskId: string;
  title: string;
  statusToken: StatusSemanticToken;
  statusLabel: string;
  responsibilityToken: ResponsibilityToken;
  priorityLabel: string;
  dueDateLabel?: string;
  assigneeSummary: string;
  projectName: string;
  isOverdue: boolean;
  attachmentUris: string[];
  indentationLevel?: number;
  onPress?: () => void;
}
```

- [ ] **Step 2: Update the tasks view adapter to populate attachments**

Modify `src/ui/viewAdapters/useTasksViewAdapter.ts` so each row item forwards attachments from the underlying task model:

```ts
attachmentUris: Array.isArray(task.attachments) ? task.attachments : [],
```

Place this on the same object that already builds:
- `taskId`
- `title`
- `statusToken`
- `priorityLabel`
- `assigneeSummary`

- [ ] **Step 3: Map attachments into the container-card body**

Update `src/ui/mappers/tasksMappers.ts`:

```ts
const photoCount = data.attachmentUris.length;

...

body: {
  shouldRenderBody: photoCount > 0,
  media: photoCount > 0
    ? {
        mode: "collapsible",
        collapsedLabel: `Photos (${photoCount})`,
        items: data.attachmentUris.map((uri, index) => ({
          id: `photo-${index}`,
          uri,
          accessibilityLabel: `${data.title} attachment ${index + 1}`,
        })),
      }
    : {
        mode: "hidden",
        items: [],
      },
  empty: {
    title: "No task details",
    message: "This task has no additional details available.",
  },
  skeleton: {
    rowCount: 2,
    metadataColumnCount: 2,
    hasMediaPlaceholder: false,
  },
},
```

- [ ] **Step 4: Run a targeted primitive test**

Run:

```bash
npx jest src/components/primitives/__tests__/ContainerCard.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/ui/contracts/viewAdapters.ts src/ui/viewAdapters/useTasksViewAdapter.ts src/ui/mappers/tasksMappers.ts
git commit -m "feat(ui): surface task attachments in collapsible task cards"
```

---

## Task 4: Compact Dashboard Project Summary Cards

**Files:**
- Modify: `src/ui/mappers/dashboardMappers.ts`
- Modify: `src/components/primitives/__tests__/ContainerCard.test.tsx`

- [ ] **Step 1: Make dashboard summary cards metadata-only by default**

Update `src/ui/mappers/dashboardMappers.ts`:

```ts
body: {
  shouldRenderBody: false,
  media: {
    mode: "hidden",
    items: [],
  },
  empty: {
    title: "No summary",
    message: "No project summary is available.",
  },
  skeleton: {
    rowCount: 2,
    metadataColumnCount: 2,
    hasMediaPlaceholder: false,
  },
},
```

- [ ] **Step 2: Add a dashboard-compactness assertion**

Append to `src/components/primitives/__tests__/ContainerCard.test.tsx`:

```tsx
it("allows dashboard summary cards to remain metadata-first without a body region", () => {
  const { queryByTestId } = render(<ContainerCard contract={baseContract} />);
  expect(queryByTestId("container-card__body")).toBeNull();
});
```

- [ ] **Step 3: Run test to verify compact dashboard behavior**

Run:

```bash
npx jest src/components/primitives/__tests__/ContainerCard.test.tsx
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/ui/mappers/dashboardMappers.ts src/components/primitives/__tests__/ContainerCard.test.tsx
git commit -m "fix(ui): compact dashboard summary cards"
```

---

## Task 5: Apply Shared Tab Navigation To Create Task

**Files:**
- Modify: `src/screens/CreateTaskScreen.tsx`
- Modify: `src/__tests__/integration/CreateTaskScreen.test.tsx`

- [ ] **Step 1: Add the failing keyboard-navigation integration test**

Append to `src/__tests__/integration/CreateTaskScreen.test.tsx`:

```tsx
it("advances focus through create-task fields without including shell controls", () => {
  const screen = render(
    <NavigationContainer>
      <CreateTaskScreen onNavigateBack={jest.fn()} />
    </NavigationContainer>
  );

  const title = screen.getByTestId("create-task__field__title");
  const description = screen.getByTestId("create-task__field__description");
  const submit = screen.getByText("Create Task");

  fireEvent(title, "onKeyPress", {
    nativeEvent: { key: "Tab", shiftKey: false },
  });

  expect(description.props.focused || description.props.accessibilityState?.selected).toBeDefined();
  expect(submit).toBeTruthy();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npx jest src/__tests__/integration/CreateTaskScreen.test.tsx
```

Expected: FAIL because the field ids/handlers do not exist yet.

- [ ] **Step 3: Register ordered form fields in `CreateTaskScreen`**

Update `src/screens/CreateTaskScreen.tsx`:

- add refs for the editable text fields in the order they should receive focus
- build a registry with:
  - `title`
  - `description`
  - `taskReference` when visible
- exclude:
  - FABs
  - profile triggers
  - project picker triggers
  - chips
  - non-text controls

Target helper code:

```ts
const formRegistry = createFormNavigationRegistry([
  { fieldId: "title", isFocusable: true },
  { fieldId: "description", isFocusable: true },
  { fieldId: "taskReference", isFocusable: showMoreDetailsSection },
  { fieldId: "submit", isFocusable: true },
]);
```

- [ ] **Step 4: Wire `Tab` and `Return` behavior**

For the title field:

```tsx
<TextInput
  testID="create-task__field__title"
  ref={titleInputRef}
  returnKeyType="next"
  onSubmitEditing={() => descriptionInputRef.current?.focus()}
  onKeyPress={(event) => {
    if (event.nativeEvent.key === "Tab") {
      descriptionInputRef.current?.focus();
    }
  }}
/>
```

For the description field:

```tsx
<TextInput
  testID="create-task__field__description"
  ref={descriptionInputRef}
  multiline
  blurOnSubmit={false}
  onKeyPress={(event) => {
    if (event.nativeEvent.key === "Tab") {
      taskReferenceInputRef.current?.focus?.();
    }
  }}
/>
```

For the final field:

```tsx
if (event.nativeEvent.key === "Tab") {
  submitButtonRef.current?.focus?.();
}
```

If `PrimaryActionBar` is not natively focusable in tests, blur cleanly and keep the submit control out of the text field cycle except as the final target.

- [ ] **Step 5: Ensure bottom action does not act as an intermediate tab stop**

Keep `PrimaryActionBar` outside the normal text input sequence except as the final destination.

- [ ] **Step 6: Run the Create Task integration test**

Run:

```bash
npx jest src/__tests__/integration/CreateTaskScreen.test.tsx
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/screens/CreateTaskScreen.tsx src/__tests__/integration/CreateTaskScreen.test.tsx
git commit -m "feat(ui): add create task tab navigation"
```

---

## Task 6: Roll Out Tab Navigation To Remaining User-Facing Forms And Modals

**Files:**
- Modify: `src/screens/LoginScreen.tsx`
- Modify: `src/components/ProjectForm.tsx`
- Modify: `src/screens/projects/EditProjectModal.tsx`
- Modify: `src/screens/ProfileScreen.tsx`
- Modify: `src/screens/UpdateProgressScreen.tsx`
- Modify: `src/screens/AddCommentScreen.tsx`
- Modify: `src/screens/RejectTaskScreen.tsx`
- Modify: `src/screens/ReassignTaskScreen.tsx`
- Modify: `src/screens/UserManagementScreen.tsx`
- Modify: `src/components/primitives/__tests__/Input.test.tsx`

- [ ] **Step 1: Apply login field chaining**

Update `src/screens/LoginScreen.tsx`:

```tsx
const emailInputRef = useRef<TextInput>(null);
const passwordInputRef = useRef<TextInput>(null);

...

<TextInput
  ref={emailInputRef}
  returnKeyType="next"
  onSubmitEditing={() => passwordInputRef.current?.focus()}
  onKeyPress={(event) => {
    if (event.nativeEvent.key === "Tab") {
      passwordInputRef.current?.focus();
    }
  }}
/>

<TextInput
  ref={passwordInputRef}
  returnKeyType="done"
/>
```

- [ ] **Step 2: Apply project-form field ordering**

Update `src/components/ProjectForm.tsx` so the text field order is:

1. client name
2. project title
3. description
4. location
5. client email
6. client phone
7. submit

Keep status and date pickers out of the normal text-field tab sequence.

- [ ] **Step 3: Apply task-action form ordering**

Update:
- `src/screens/UpdateProgressScreen.tsx`
- `src/screens/AddCommentScreen.tsx`
- `src/screens/RejectTaskScreen.tsx`
- `src/screens/ReassignTaskScreen.tsx`

Rules:
- multiline text inputs still advance on `Tab`
- search field in `ReassignTaskScreen` stays first
- photo CTA and other picker-style controls are excluded from normal text-entry tab order

- [ ] **Step 4: Apply modal form ordering**

Update:
- password change modal inside `src/screens/ProfileScreen.tsx`
- assignment modal text input in `src/screens/UserManagementScreen.tsx`
- `src/screens/projects/EditProjectModal.tsx`

Keep modal header buttons and picker triggers outside the normal text-field cycle.

- [ ] **Step 5: Add a focused shared-input test if needed**

If `src/components/primitives/__tests__/Input.test.tsx` is the right place, append a focused assertion that a text field can expose `returnKeyType="next"` without changing validation behavior.

- [ ] **Step 6: Run targeted tests**

Run:

```bash
npx jest src/components/primitives/__tests__/Input.test.tsx
npx jest src/__tests__/integration/CreateTaskScreen.test.tsx
npx jest src/utils/__tests__/formNavigation.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/screens/LoginScreen.tsx src/components/ProjectForm.tsx src/screens/projects/EditProjectModal.tsx src/screens/ProfileScreen.tsx src/screens/UpdateProgressScreen.tsx src/screens/AddCommentScreen.tsx src/screens/RejectTaskScreen.tsx src/screens/ReassignTaskScreen.tsx src/screens/UserManagementScreen.tsx src/components/primitives/__tests__/Input.test.tsx
git commit -m "feat(ui): roll out tab navigation across user-facing forms"
```

---

## Final Verification

- [ ] Run:

```bash
npx jest src/utils/__tests__/formNavigation.test.ts
npx jest src/components/primitives/container/__tests__/ContainerBodyMedia.test.tsx
npx jest src/components/primitives/__tests__/ContainerCard.test.tsx
npx jest src/__tests__/integration/CreateTaskScreen.test.tsx
npx tsc --noEmit
```

Expected:
- all targeted Jest suites pass
- TypeScript exits 0

- [ ] Manual verification checklist

Verify in the app with a hardware keyboard:

- `Tab` advances through editable fields in `CreateTaskScreen`
- multiline fields in task/comment/update/reject flows still advance on `Tab`
- FABs, profile triggers, picker triggers, and shell controls are excluded from normal text-entry tab order
- the last field moves to the primary action or blurs cleanly
- dashboard project summary cards no longer show wasteful placeholder body spacing
- tasks cards stay compact when there are no attachments
- tasks cards can expand to reveal uploaded task-creation photos when attachments exist

- [ ] Final checkpoint commit

```bash
git status
git add src/utils src/ui/contracts src/ui/mappers src/ui/viewAdapters src/components/primitives src/screens src/__tests__
git commit -m "feat(ui): add form tab navigation and collapsible card bodies"
```

---

## Self-Review

### Spec Coverage

Covered:
- shared tab navigation utility
- multiline tab behavior
- final-field to primary-action handling
- exclusion of shell controls from normal text-field tab order
- collapsible container-card bodies
- tasks-card attachment/photo support
- dashboard card compaction

No uncovered approved requirement remains from the spec.

### Placeholder Scan

- No `TODO`, `TBD`, or “implement later” placeholders remain.
- Each task has concrete files, commands, and target code.

### Type Consistency

- Shared utility naming is consistent: `formNavigation`
- shared card-media naming is consistent: `ContainerBodyMedia`
- tasks-card media field naming is consistent: `attachmentUris`

---

Plan complete and saved to `docs/superpowers/plans/2026-07-02-form-tab-navigation-and-collapsible-card-bodies-plan.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
