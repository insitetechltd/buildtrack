# Create Task Spacing And Due Date Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Normalize the flattened Create Task form to one consistent vertical spacing rule and restore the due-date field so tapping it reliably opens and updates the date picker.

**Architecture:** Keep the fix local to the existing Create Task screen and test file. Move inter-field spacing responsibility to the flattened form container, leave label/error spacing inside each field wrapper, and remove the broken pre-toggle save call because the view adapter already persists draft state through its debounced `formData` effect.

**Tech Stack:** Expo React Native, TypeScript, NativeWind class names, React Native Testing Library, Jest

---

### Task 1: Lock The Desired Behavior In Tests

**Files:**
- Modify: `src/__tests__/integration/CreateTaskScreen.test.tsx`
- Verify against: `src/screens/CreateTaskScreen.tsx`

- [ ] **Step 1: Write the failing due-date interaction test**

```tsx
it('opens the due-date picker and allows the date field flow to change', async () => {
  const screen = render(
    <NavigationContainer>
      <CreateTaskScreen onNavigateBack={jest.fn()} />
    </NavigationContainer>
  );

  expect(screen.queryByTestId('DateTimePicker')).toBeNull();

  fireEvent.press(screen.getByTestId('create-task__due-date-trigger'));

  await waitFor(() => {
    expect(screen.getByTestId('DateTimePicker')).toBeTruthy();
  });

  fireEvent(screen.getByTestId('DateTimePicker'), 'onChange', {
    type: 'set',
  }, new Date('2099-02-01T00:00:00.000Z'));

  fireEvent.press(screen.getByText('Done'));

  await waitFor(() => {
    expect(screen.queryByTestId('DateTimePicker')).toBeNull();
  });
});
```

- [ ] **Step 2: Write the failing flattened-spacing regression test**

```tsx
it('uses the shared flattened field stack spacing instead of per-field bottom margins', () => {
  const screen = render(
    <NavigationContainer>
      <CreateTaskScreen onNavigateBack={jest.fn()} />
    </NavigationContainer>
  );

  expect(screen.getByTestId('create-task__field-stack').props.className).toContain('gap-4');
  expect(screen.getAllByTestId('create-task__input-field').every((field) =>
    !(field.props.className || '').includes('mb-4')
  )).toBe(true);
});
```

- [ ] **Step 3: Run the focused Create Task test file to verify the new assertions fail for the right reason**

Run:

```bash
npm test -- --runInBand --runTestsByPath src/__tests__/integration/CreateTaskScreen.test.tsx
```

Expected:

```text
FAIL ... create-task__due-date-trigger not found and/or spacing assertion fails because fields still use mb-4 or no shared gap container exists
```

- [ ] **Step 4: Commit the red test state only if working in a dedicated throwaway branch**

```bash
git add src/__tests__/integration/CreateTaskScreen.test.tsx
git commit -m "test(create-task): lock due date and spacing regressions"
```

### Task 2: Normalize Flattened Form Spacing

**Files:**
- Modify: `src/screens/CreateTaskScreen.tsx`
- Test: `src/__tests__/integration/CreateTaskScreen.test.tsx`

- [ ] **Step 1: Move inter-field spacing to the parent field stack**

```tsx
<View
  testID="create-task__field-stack"
  className="border-t border-gray-100 pt-4 gap-4"
>
```

- [ ] **Step 2: Remove the per-field bottom margin from the shared field wrapper and expose a stable test id**

```tsx
const InputField = ({
  label,
  required = true,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) => (
  <View testID="create-task__input-field">
    <Text className="mb-2 text-base font-semibold text-gray-700">
      {label} {required && <Text className="text-red-500">*</Text>}
    </Text>
    {children}
    {error && <Text className="mt-1 text-sm text-red-500">{error}</Text>}
  </View>
);
```

- [ ] **Step 3: Keep dependent UI visually attached to its field instead of adding unrelated vertical drift**

```tsx
{selectedUsers.length > 0 && (
  <View className="rounded-xl border border-gray-200 bg-gray-50 p-3">
```

```tsx
{showDatePicker && (
  <View className="overflow-hidden rounded-lg border-2 border-blue-600 bg-white">
```

- [ ] **Step 4: Keep the submit action separated intentionally from the field stack**

```tsx
<View testID="create-task__submit-inline" className="pt-4">
```

- [ ] **Step 5: Run the focused test file to verify spacing assertions pass**

Run:

```bash
npm test -- --runInBand --runTestsByPath src/__tests__/integration/CreateTaskScreen.test.tsx
```

Expected:

```text
PASS spacing regression tests, while due-date interaction may still fail until Task 3 is complete
```

- [ ] **Step 6: Commit the spacing-only green state if splitting into incremental commits**

```bash
git add src/screens/CreateTaskScreen.tsx src/__tests__/integration/CreateTaskScreen.test.tsx
git commit -m "fix(create-task): normalize flattened form spacing"
```

### Task 3: Restore Due Date Interaction

**Files:**
- Modify: `src/screens/CreateTaskScreen.tsx`
- Verify against: `src/ui/viewAdapters/useCreateTaskViewAdapter.ts`
- Test: `src/__tests__/integration/CreateTaskScreen.test.tsx`

- [ ] **Step 1: Remove the broken pre-toggle helper call from the due-date and category triggers**

```tsx
<Pressable
  testID="create-task__due-date-trigger"
  onPress={() => {
    setShowDatePicker(!showDatePicker);
  }}
```

```tsx
<Pressable
  onPress={() => {
    setShowCategoryPicker(true);
  }}
```

- [ ] **Step 2: Rely on the existing adapter draft persistence instead of screen-local manual saves**

```ts
useEffect(() => {
  if (persistDraftTimeoutRef.current) {
    clearTimeout(persistDraftTimeoutRef.current);
  }
  persistDraftTimeoutRef.current = setTimeout(() => {
    persistDraft(formData);
  }, 1000);
}, [formData, persistDraft]);
```

- [ ] **Step 3: Keep the date picker update path minimal and explicit**

```tsx
<DateTimePicker
  value={formData.dueDate}
  mode="date"
  display="spinner"
  minimumDate={new Date()}
  locale={dateFormatter.locale}
  onChange={(_event, selectedDate) => {
    if (selectedDate) {
      handleDateChange(selectedDate);
    }
  }}
/>
```

- [ ] **Step 4: Run the focused Create Task test file to verify the due-date flow passes**

Run:

```bash
npm test -- --runInBand --runTestsByPath src/__tests__/integration/CreateTaskScreen.test.tsx
```

Expected:

```text
PASS due-date interaction tests and existing Create Task regressions
```

- [ ] **Step 5: Commit the due-date repair**

```bash
git add src/screens/CreateTaskScreen.tsx src/__tests__/integration/CreateTaskScreen.test.tsx
git commit -m "fix(create-task): restore due date picker interaction"
```

### Task 4: Final Validation And Handoff

**Files:**
- Verify: `src/screens/CreateTaskScreen.tsx`
- Verify: `src/__tests__/integration/CreateTaskScreen.test.tsx`

- [ ] **Step 1: Run the focused Create Task integration suite**

Run:

```bash
npm test -- --runInBand --runTestsByPath src/__tests__/integration/CreateTaskScreen.test.tsx
```

Expected:

```text
PASS CreateTaskScreen Integration
```

- [ ] **Step 2: Run a secondary nearby regression for adapter-backed Create Task behavior if needed**

Run:

```bash
npm test -- --runInBand --runTestsByPath src/ui/viewAdapters/__tests__/useCreateTaskViewAdapter.test.ts
```

Expected:

```text
PASS useCreateTaskViewAdapter tests relevant to draft persistence and form data updates
```

- [ ] **Step 3: Check patch hygiene**

Run:

```bash
git diff --check
```

Expected:

```text
No output
```

- [ ] **Step 4: Create the final commit if previous steps were kept local**

```bash
git add src/screens/CreateTaskScreen.tsx src/__tests__/integration/CreateTaskScreen.test.tsx
git commit -m "fix(create-task): flatten spacing and repair due date"
```
