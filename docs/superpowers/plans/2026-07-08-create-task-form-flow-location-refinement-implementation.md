# Create Task Form Flow + Location Refinement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move create-task submission into the normal scroll flow, add a project-scoped `Location on Site` field backed by its own task database column, and fold assignment into `Task Basics` without reusing project location.

**Architecture:** Keep persistence changes local to the existing task store by adding a dedicated `location_on_site` column, mapping it to a new `locationOnSite` runtime field, and preserving the current deferred-schema compatibility pattern. Keep UI changes local to `useCreateTaskViewAdapter()` and `CreateTaskScreen.tsx`, deriving location suggestions from existing tasks in the active project instead of introducing a new global locations subsystem.

**Tech Stack:** TypeScript, React Native, Expo, Zustand, Supabase, AsyncStorage, Jest, React Testing Library.

---

## File Map

**Create**
- `ADD_TASK_ON_SITE_LOCATION_MIGRATION.sql`

**Modify**
- `src/types/buildtrack.ts`
- `src/state/taskStore.supabase.ts`
- `src/state/__tests__/taskStore.supabase.unit.test.ts`
- `src/ui/contracts/viewAdapters.ts`
- `src/ui/viewAdapters/useCreateTaskViewAdapter.ts`
- `src/ui/viewAdapters/__tests__/useCreateTaskViewAdapter.test.ts`
- `src/screens/CreateTaskScreen.tsx`
- `src/__tests__/integration/CreateTaskScreen.test.tsx`
- `src/locales/en.ts`
- `src/locales/zh-TW.ts`
- `documentation/DATABASE_ARCHITECTURE.md`

---

### Task 1: Add Dedicated Task `location_on_site` Persistence

**Files:**
- Create: `ADD_TASK_ON_SITE_LOCATION_MIGRATION.sql`
- Modify: `src/types/buildtrack.ts`
- Modify: `src/state/taskStore.supabase.ts`
- Modify: `src/state/__tests__/taskStore.supabase.unit.test.ts`

- [ ] **Step 1: Write the failing store tests**

Add coverage to `src/state/__tests__/taskStore.supabase.unit.test.ts` for create payloads, update payloads, and normalization. Use the existing redesign-metadata tests as the template and add cases like:

```ts
it("persists task-level on-site location through create payloads and deferred-schema fallback", async () => {
  const consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
  const taskInsert = jest
    .fn()
    .mockReturnValueOnce({
      select: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          error: {
            code: "PGRST204",
            message: "Could not find the 'location_on_site' column of 'tasks' in the schema cache",
            details: null,
            hint: null,
          },
        }),
      }),
    })
    .mockReturnValueOnce({
      select: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: {
            id: "task-123",
            project_id: "project-123",
            title: "Install HVAC System",
            description: "Install HVAC on level 3",
            priority: "high",
            category: "general",
            due_date: "2026-06-30T00:00:00.000Z",
            current_status: "new",
            completion_percentage: 0,
            assigned_to: ["worker-456"],
            assigned_by: "manager-123",
            location_on_site: "Level 3 - South Core",
            attachments: [],
            created_at: "2026-07-08T00:00:00.000Z",
            updated_at: "2026-07-08T00:00:00.000Z",
          },
          error: null,
        }),
      }),
    });

  mockFrom.mockImplementation((table: string) => {
    if (table === "tasks") {
      return { insert: taskInsert };
    }

    if (table === "task_activities") {
      return {
        insert: jest.fn().mockResolvedValue({ error: null }),
      };
    }

    throw new Error(`Unexpected table: ${table}`);
  });

  const { result } = renderHook(() => useTaskStore());

  await act(async () => {
    await result.current.createTask({
      title: "Install HVAC System",
      description: "Install HVAC on level 3",
      priority: "high",
      category: "general",
      projectId: "project-123",
      assignedTo: ["worker-456"],
      assignedBy: "manager-123",
      dueDate: "2026-06-30T00:00:00.000Z",
      locationOnSite: "Level 3 - South Core",
      attachments: [],
    });
  });

  expect(taskInsert.mock.calls[0]?.[0]).toEqual(
    expect.objectContaining({
      location_on_site: "Level 3 - South Core",
    }),
  );
  expect(Object.prototype.hasOwnProperty.call(taskInsert.mock.calls[1]?.[0], "location_on_site")).toBe(false);
  consoleWarnSpy.mockRestore();
});

it("maps task-level on-site location through update payloads and fetch normalization", async () => {
  const updateEqMock = jest.fn().mockResolvedValue({ error: null });
  const updateMock = jest.fn().mockReturnValue({ eq: updateEqMock });

  mockFrom.mockImplementation((table: string) => {
    if (table === "tasks") {
      return {
        update: updateMock,
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: "task-123",
            project_id: "project-123",
            title: "Existing task",
            description: "Existing description",
            priority: "medium",
            category: "general",
            due_date: "2026-07-20T00:00:00.000Z",
            current_status: "new",
            completion_percentage: 0,
            assigned_to: ["worker-456"],
            assigned_by: "manager-123",
            location_on_site: "Roof plant room",
            attachments: [],
            created_at: "2026-07-08T00:00:00.000Z",
            updated_at: "2026-07-08T00:00:00.000Z",
          },
          error: null,
        }),
      };
    }

    throw new Error(`Unexpected table: ${table}`);
  });

  resetTaskStore();
  useTaskStore.setState({
    tasks: [
      createTaskState({
        id: "task-123",
        projectId: "project-123",
      }),
    ],
  });

  const { result } = renderHook(() => useTaskStore());

  await act(async () => {
    await result.current.updateTask("task-123", {
      locationOnSite: "Roof plant room",
    });
  });

  expect(updateMock).toHaveBeenCalledWith(
    expect.objectContaining({
      location_on_site: "Roof plant room",
    }),
  );
});
```

- [ ] **Step 2: Run the store tests to verify they fail**

Run:

```bash
npx jest src/state/__tests__/taskStore.supabase.unit.test.ts --runInBand
```

Expected: FAIL because `Task` does not yet expose `locationOnSite`, the insert/update helpers do not write `location_on_site`, and normalization does not read it back.

- [ ] **Step 3: Implement the schema, type, and store mapping**

Create `ADD_TASK_ON_SITE_LOCATION_MIGRATION.sql` with:

```sql
-- Migration: Add dedicated task-level on-site location field
-- Description: Persists task "Location on Site" separately from projects.location
-- Date: 2026-07-08

ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS location_on_site TEXT;

CREATE INDEX IF NOT EXISTS idx_tasks_project_location_on_site
ON tasks(project_id, location_on_site);

COMMENT ON COLUMN tasks.location_on_site IS
'Task-level on-site location label used by Create Task project-scoped history. Separate from projects.location.';

SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'tasks'
  AND column_name = 'location_on_site';
```

In `src/types/buildtrack.ts`, extend `Task` like this:

```ts
export interface Task {
  id: string;
  projectId: string;
  // ...
  attachments: string[];
  locationOnSite?: string;
  location?: {
    address?: string;
    latitude?: number;
    longitude?: number;
  };
  assignedTo: string[];
  // ...
}
```

In `src/state/taskStore.supabase.ts`, extend the deferred-field compatibility arrays and payload mappings:

```ts
const DEFERRED_TASK_CREATE_SCHEMA_FIELDS = [
  "primary_assignee_id",
  "delegated_user_ids",
  "container_id",
  "sub_container_id",
  "tags",
  "location_on_site",
] as const;

const DEFERRED_TASK_RUNTIME_FIELDS = [
  "primaryAssigneeId",
  "delegatedUserIds",
  "containerId",
  "subContainerId",
  "tags",
  "locationOnSite",
] as const;
```

Update `buildSupabaseTaskInsertPayload()`:

```ts
function buildSupabaseTaskInsertPayload(
  taskData: Omit<Task, "id" | "createdAt" | "updates" | "status" | "completionPercentage">,
  initialStatus: TaskStatus,
  isCreatorAssigned: boolean
) {
  return {
    project_id: taskData.projectId,
    title: taskData.title,
    description: taskData.description,
    task_reference: taskData.taskReference || null,
    billing_status: taskData.billingStatus || "non_billable",
    priority: taskData.priority,
    category: taskData.category,
    due_date: taskData.dueDate,
    current_status: initialStatus,
    completion_percentage: 0,
    assigned_to: taskData.assignedTo,
    primary_assignee_id: taskData.primaryAssigneeId || null,
    delegated_user_ids: taskData.delegatedUserIds || null,
    assigned_by: taskData.assignedBy,
    container_id: taskData.containerId || null,
    sub_container_id: taskData.subContainerId || null,
    tags: taskData.tags || [],
    location_on_site: taskData.locationOnSite || null,
    attachments: taskData.attachments || [],
    accepted: isCreatorAssigned ? true : false,
    accepted_by: isCreatorAssigned ? taskData.assignedBy : null,
    accepted_at: isCreatorAssigned ? new Date().toISOString() : null,
  };
}
```

Update normalization in every `normalizeTaskActivityCompatibility()` call site that reads Supabase task rows:

```ts
const transformedTask = normalizeTaskActivityCompatibility({
  id: taskData.id,
  projectId: taskData.project_id,
  title: taskData.title,
  description: taskData.description,
  taskReference: taskData.task_reference || undefined,
  billingStatus: (taskData.billing_status || "non_billable") as BillingStatus,
  priority: taskData.priority,
  category: taskData.category,
  dueDate: taskData.due_date,
  status: (taskData.current_status || "new") as TaskStatus,
  completionPercentage: taskData.completion_percentage,
  assignedTo: normalizedAssignedTo,
  assignedBy: normalizedAssignedBy,
  locationOnSite: taskData.location_on_site || undefined,
  location: taskData.location,
  attachments: taskData.attachments || [],
  createdAt: taskData.created_at,
  updatedAt: taskData.updated_at,
  activities: transformedActivities,
  updates: transformedUpdates,
  children: [],
});
```

Update `updateTask()` mapping:

```ts
if ("locationOnSite" in cleanUpdates) {
  updateData.location_on_site = cleanUpdates.locationOnSite || null;
}
```

- [ ] **Step 4: Run the store tests to verify they pass**

Run:

```bash
npx jest src/state/__tests__/taskStore.supabase.unit.test.ts --runInBand
```

Expected: PASS, with `location_on_site` persisted, deferred-schema fallback preserved, and runtime normalization exposing `locationOnSite`.

- [ ] **Step 5: Commit**

```bash
git add ADD_TASK_ON_SITE_LOCATION_MIGRATION.sql src/types/buildtrack.ts src/state/taskStore.supabase.ts src/state/__tests__/taskStore.supabase.unit.test.ts
git commit -m "feat(tasks): persist on-site location field"
```

---

### Task 2: Extend Create-Task Adapter State for Project-Scoped Location Options

**Files:**
- Modify: `src/ui/contracts/viewAdapters.ts`
- Modify: `src/ui/viewAdapters/useCreateTaskViewAdapter.ts`
- Modify: `src/ui/viewAdapters/__tests__/useCreateTaskViewAdapter.test.ts`

- [ ] **Step 1: Write the failing adapter tests**

Add tests to `src/ui/viewAdapters/__tests__/useCreateTaskViewAdapter.test.ts` that cover project-scoped option derivation, draft hydration, and create payload submission:

```ts
it("derives project-scoped location-on-site options and submits the dedicated field", async () => {
  mockUseProjectFilterStore.mockReturnValue({
    selectedProjectId: "project-1",
  });
  mockUseTaskStore.mockReturnValue({
    tasks: [
      {
        id: "task-1",
        title: "Existing task",
        description: "Existing description",
        projectId: "project-1",
        assignedTo: ["user-2"],
        assignedBy: "user-1",
        attachments: [],
        dueDate: "2099-01-01T00:00:00.000Z",
        priority: "medium",
        category: "general",
        status: "new",
        locationOnSite: "Level 2 East",
      },
      {
        id: "task-2",
        title: "Another existing task",
        description: "Existing description",
        projectId: "project-1",
        assignedTo: ["user-2"],
        assignedBy: "user-1",
        attachments: [],
        dueDate: "2099-01-02T00:00:00.000Z",
        priority: "medium",
        category: "general",
        status: "new",
        locationOnSite: "Level 3 West",
      },
      {
        id: "task-3",
        title: "Different project task",
        description: "Existing description",
        projectId: "project-2",
        assignedTo: ["user-2"],
        assignedBy: "user-1",
        attachments: [],
        dueDate: "2099-01-03T00:00:00.000Z",
        priority: "medium",
        category: "general",
        status: "new",
        locationOnSite: "Plant Room",
      },
    ],
    fetchTaskById: mockFetchTaskById,
    createTask: mockCreateTask,
    createSubTask: mockCreateSubTask,
    updateTask: mockUpdateTask,
  });

  const { result } = renderHook(() => useCreateTaskViewAdapter({}));

  await waitFor(() => {
    expect(result.current.output.formData.projectId).toBe("project-1");
  });

  expect(result.current.output.locationPicker.options.map((option) => option.value)).toEqual([
    "Level 2 East",
    "Level 3 West",
  ]);

  act(() => {
    result.current.actions.updateField("title", "Install anchors");
    result.current.actions.updateField("description", "Anchor the glazing brackets");
    result.current.actions.updateField("locationOnSite", "Level 2 East");
  });

  await act(async () => {
    await result.current.actions.submit();
  });

  expect(mockCreateTask).toHaveBeenCalledWith(
    expect.objectContaining({
      title: "Install anchors",
      locationOnSite: "Level 2 East",
      projectId: "project-1",
    }),
  );
  expect(mockCreateTask).not.toHaveBeenCalledWith(
    expect.objectContaining({
      projectLocation: expect.anything(),
    }),
  );
});

it("hydrates and clears location-on-site draft data without the legacy critical flag", async () => {
  const AsyncStorage = require("@react-native-async-storage/async-storage");
  AsyncStorage.getItem.mockResolvedValueOnce(
    JSON.stringify({
      title: "Draft title",
      description: "Draft description",
      dueDate: "2099-02-02T00:00:00.000Z",
      locationOnSite: "Roof plant room",
      assignedTo: ["user-2"],
      attachments: [],
      projectId: "project-1",
    }),
  );

  const { result } = renderHook(() => useCreateTaskViewAdapter({}));

  await waitFor(() => {
    expect(result.current.output.formData.locationOnSite).toBe("Roof plant room");
  });

  expect("criticalThisWeek" in result.current.output.formData).toBe(false);
});
```

- [ ] **Step 2: Run the adapter tests to verify they fail**

Run:

```bash
npx jest src/ui/viewAdapters/__tests__/useCreateTaskViewAdapter.test.ts --runInBand
```

Expected: FAIL because the form contract still exposes `criticalThisWeek`, there is no `locationOnSite` state, there is no location picker output, and submit payloads do not include the dedicated field.

- [ ] **Step 3: Implement adapter state, project-scoped history, and payload cleanup**

In `src/ui/contracts/viewAdapters.ts`, replace the create-task form model and add lightweight location picker models:

```ts
export interface CreateTaskLocationOption {
  id: string;
  value: string;
  label: string;
}

export interface CreateTaskFormModel {
  title: string;
  description: string;
  taskReference: string;
  billingStatus: string;
  priority: string;
  category: string;
  dueDate: Date;
  locationOnSite: string;
  assignedTo: string[];
  projectId: string;
  attachments: any[];
}

export interface CreateTaskScreenViewAdapterOutput {
  screenId: "CreateTaskScreen";
  readiness: NavigationScreenReadiness;
  continuity: ScreenContinuityContract;
  context: CreateTaskContextModel;
  activity: CreateTaskScreenActivityModel;
  formData: CreateTaskFormModel;
  errors: Record<string, string>;
  pickers: {
    showDatePicker: boolean;
    showUserPicker: boolean;
    showPriorityPicker: boolean;
    showCategoryPicker: boolean;
    showBillingStatusPicker: boolean;
    showProjectPicker: boolean;
    showLocationPicker: boolean;
  };
  locationPicker: {
    options: CreateTaskLocationOption[];
    draftValue: string;
  };
  // ...
}
```

In `src/ui/viewAdapters/useCreateTaskViewAdapter.ts`, initialize state without `criticalThisWeek` and add project-scoped location option derivation:

```ts
const [formData, setFormData] = useState<CreateTaskFormModel>({
  title: "",
  description: "",
  taskReference: "",
  billingStatus: "non_billable",
  priority: "medium",
  category: "general",
  dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  locationOnSite: "",
  assignedTo: [],
  attachments: [],
  projectId: "",
});

const [pickers, setPickers] = useState({
  showDatePicker: false,
  showUserPicker: false,
  showPriorityPicker: false,
  showCategoryPicker: false,
  showBillingStatusPicker: false,
  showProjectPicker: false,
  showLocationPicker: false,
});

const locationOptions = useMemo(() => {
  if (!activeProjectId) {
    return [];
  }

  return Array.from(
    new Set(
      tasks
        .filter((task) => task.projectId === activeProjectId)
        .map((task) => task.locationOnSite?.trim())
        .filter((value): value is string => Boolean(value)),
    ),
  )
    .sort((left, right) => left.localeCompare(right))
    .map((value) => ({
      id: `location:${activeProjectId}:${value}`,
      value,
      label: value,
    }));
}, [activeProjectId, tasks]);
```

Update edit-mode hydration and submit payloads:

```ts
useEffect(() => {
  if (editTask) {
    setFormData({
      title: editTask.title,
      description: editTask.description || "",
      taskReference: editTask.taskReference || "",
      billingStatus: editTask.billingStatus || "non_billable",
      priority: editTask.priority || "medium",
      category: editTask.category || "general",
      dueDate: new Date(editTask.dueDate),
      locationOnSite: editTask.locationOnSite || "",
      assignedTo: editTask.assignedTo || [],
      attachments: editTask.attachments || [],
      projectId: editTask.projectId || "",
    });
  }
}, [editTask]);
```

```ts
await createTask({
  title: formData.title,
  description: formData.description,
  taskReference: formData.taskReference || undefined,
  billingStatus: formData.billingStatus as BillingStatus,
  projectId: formData.projectId,
  priority: formData.priority as Priority,
  category: formData.category as TaskCategory,
  dueDate: formData.dueDate.toISOString(),
  locationOnSite: formData.locationOnSite.trim() || undefined,
  assignedTo: formData.assignedTo,
  assignedBy: user?.id || "",
  attachments: formData.attachments,
});
```

Update validation to keep the field optional but trimmed:

```ts
const updateField = useCallback((field: keyof CreateTaskFormModel, value: any) => {
  setFormData((prev) => ({
    ...prev,
    [field]: field === "locationOnSite" && typeof value === "string" ? value.trimStart() : value,
  }));
}, []);
```

- [ ] **Step 4: Run the adapter tests to verify they pass**

Run:

```bash
npx jest src/ui/viewAdapters/__tests__/useCreateTaskViewAdapter.test.ts --runInBand
```

Expected: PASS, with `locationOnSite` surviving draft hydration, project-scoped option derivation working, and create payloads carrying the dedicated field without reviving `criticalThisWeek`.

- [ ] **Step 5: Commit**

```bash
git add src/ui/contracts/viewAdapters.ts src/ui/viewAdapters/useCreateTaskViewAdapter.ts src/ui/viewAdapters/__tests__/useCreateTaskViewAdapter.test.ts
git commit -m "feat(create-task): add project-scoped location state"
```

---

### Task 3: Restructure the Screen Flow and Inline the Submit Button

**Files:**
- Modify: `src/screens/CreateTaskScreen.tsx`
- Modify: `src/__tests__/integration/CreateTaskScreen.test.tsx`
- Modify: `src/locales/en.ts`
- Modify: `src/locales/zh-TW.ts`

- [ ] **Step 1: Write the failing integration tests**

Replace the create-mode structure assertions in `src/__tests__/integration/CreateTaskScreen.test.tsx` with focused tests for the new section order and inline submit flow:

```ts
it("removes the standalone Assignment section and renders location plus assignees inside Task Basics", () => {
  const screen = render(
    <NavigationContainer>
      <CreateTaskScreen onNavigateBack={jest.fn()} />
    </NavigationContainer>,
  );

  expect(screen.getByText("Task Basics")).toBeTruthy();
  expect(screen.queryByText("Assignment")).toBeNull();
  expect(screen.getByText("Location on Site")).toBeTruthy();
  expect(screen.getByText("Assign To")).toBeTruthy();
  expect(screen.getByText("Selected Users:")).toBeTruthy();
});

it("renders the create action inline below attachments instead of using the old bottom action layer", () => {
  const screen = render(
    <NavigationContainer>
      <CreateTaskScreen onNavigateBack={jest.fn()} />
    </NavigationContainer>,
  );

  expect(screen.getByTestId("create-task__attachments_section")).toBeTruthy();
  expect(screen.getByTestId("create-task__submit_inline")).toBeTruthy();
  expect(screen.queryByTestId("createTask-submit-focus-target")).toBeNull();
  expect(screen.queryByTestId("create-task__bottom_action_bar")).toBeNull();
});

it("opens project-scoped location options with an add-new path", () => {
  const screen = render(
    <NavigationContainer>
      <CreateTaskScreen onNavigateBack={jest.fn()} />
    </NavigationContainer>,
  );

  fireEvent.press(screen.getByTestId("create-task__location_on_site_trigger"));

  expect(screen.getByText("Add new location")).toBeTruthy();
});
```

- [ ] **Step 2: Run the integration tests to verify they fail**

Run:

```bash
npx jest src/__tests__/integration/CreateTaskScreen.test.tsx --runInBand
```

Expected: FAIL because the screen still renders the `Assignment` section, still uses the fixed `PrimaryActionBar`, and has no `Location on Site` trigger/modal.

- [ ] **Step 3: Implement the screen restructure, inline CTA, and location UI**

In `src/locales/en.ts`, add:

```ts
createTask: {
  // existing keys...
  locationOnSite: "Location on Site",
  selectLocationOnSite: "Select a location on site",
  addNewLocation: "Add new location",
  newLocationOnSitePlaceholder: "Enter a new on-site location",
  noSavedLocationsForProject: "No saved on-site locations for this project yet",
}
```

In `src/locales/zh-TW.ts`, add the matching keys:

```ts
createTask: {
  // existing keys...
  locationOnSite: "現場位置",
  selectLocationOnSite: "選擇現場位置",
  addNewLocation: "新增位置",
  newLocationOnSitePlaceholder: "輸入新的現場位置",
  noSavedLocationsForProject: "此專案尚未有已儲存的現場位置",
}
```

In `src/screens/CreateTaskScreen.tsx`, remove the separate `Assignment` section, move project/location/assignees into `Task Basics`, and place the submit button directly below `CreateTaskAttachmentSection`:

```tsx
<ScreenSection title="Task Basics" subtitle="Start with the essentials">
  {/* title */}
  {/* description */}
  {/* priority */}

  <InputField label={t.createTask.project} error={errors.projectId}>
    {/* existing locked project row */}
  </InputField>

  <InputField label={t.createTask.locationOnSite} required={false}>
    <Pressable
      testID="create-task__location_on_site_trigger"
      onPress={() => setShowLocationPicker(true)}
      className="border rounded-lg px-3 py-3 bg-white flex-row items-center justify-between border-gray-300"
    >
      <Text className={cn("text-lg flex-1", formData.locationOnSite ? "text-gray-900" : "text-gray-500")}>
        {formData.locationOnSite || t.createTask.selectLocationOnSite}
      </Text>
      <Ionicons name="chevron-forward" size={20} color="#6b7280" />
    </Pressable>
  </InputField>

  <InputField label={t.tasks.assignTo} error={errors.assignedTo}>
    {/* existing assignee trigger */}
  </InputField>

  {selectedUsers.length > 0 && (
    <View className="mb-4 rounded-xl border border-gray-200 bg-gray-50 p-3">
      <Text className="mb-2 text-sm font-medium text-gray-700">{t.createTask.selectedUsers}</Text>
      {/* existing selected-user pills */}
    </View>
  )}
</ScreenSection>
```

Replace the bottom action layer with an inline button after attachments:

```tsx
<CreateTaskAttachmentSection
  testID="create-task__attachments_section"
  attachments={formData.attachments as any}
  asyncStoragePhotoCount={asyncStoragePhotoCount}
  onRemoveAttachment={removeAttachment}
  onAddPhotos={handleAddPhotos}
/>

<View testID="create-task__submit_inline" className="px-4 pb-10 pt-4">
  <Pressable
    onPress={handleSubmit}
    disabled={isSubmitting || (shouldShowPostCaptureRoutingSheet && captureRoutingChoice === "existing_task")}
    className={cn(
      "h-14 items-center justify-center rounded-2xl bg-blue-600",
      (isSubmitting || (shouldShowPostCaptureRoutingSheet && captureRoutingChoice === "existing_task")) && "opacity-50",
    )}
  >
    <Text className="text-lg font-semibold text-white">
      {editTaskId ? t.createTask.updateTaskButton : t.createTask.createTaskButton}
    </Text>
  </Pressable>
</View>
```

Add a simple location picker modal that uses adapter-provided options and an add-new path in the same flow:

```tsx
<Modal
  visible={showLocationPicker}
  animationType="slide"
  presentationStyle="pageSheet"
  onRequestClose={() => setShowLocationPicker(false)}
>
  <SafeAreaView edges={["bottom", "left", "right"]} className="flex-1 bg-gray-50">
    <View className="flex-row items-center bg-white border-b border-gray-200 px-6 py-4">
      <Pressable onPress={() => setShowLocationPicker(false)} className="mr-4 w-10 h-10 items-center justify-center">
        <Ionicons name="close" size={24} color="#374151" />
      </Pressable>
      <Text className="flex-1 text-xl font-semibold text-gray-900">
        {t.createTask.locationOnSite}
      </Text>
    </View>

    <ScrollView className="flex-1 px-6 py-4">
      {output.locationPicker.options.map((option) => (
        <Pressable
          key={option.id}
          onPress={() => {
            updateField("locationOnSite", option.value);
            setShowLocationPicker(false);
          }}
          className="mb-3 rounded-lg border border-gray-300 bg-white px-4 py-4"
        >
          <Text className="text-lg text-gray-900">{option.label}</Text>
        </Pressable>
      ))}

      <Pressable
        onPress={() => updateField("locationOnSite", "")}
        className="rounded-lg border border-dashed border-blue-400 bg-blue-50 px-4 py-4"
      >
        <Text className="text-lg font-medium text-blue-700">{t.createTask.addNewLocation}</Text>
      </Pressable>

      <TextInput
        className="mt-4 rounded-lg border border-gray-300 bg-white px-3 py-3 text-lg text-gray-900"
        placeholder={t.createTask.newLocationOnSitePlaceholder}
        value={formData.locationOnSite}
        onChangeText={(value) => updateField("locationOnSite", value)}
      />
    </ScrollView>
  </SafeAreaView>
</Modal>
```

- [ ] **Step 4: Run the integration tests to verify they pass**

Run:

```bash
npx jest src/__tests__/integration/CreateTaskScreen.test.tsx --runInBand
```

Expected: PASS, with the old fixed action bar removed, `Location on Site` rendered in-flow, and `Assign To`/selected users living inside `Task Basics`.

- [ ] **Step 5: Commit**

```bash
git add src/screens/CreateTaskScreen.tsx src/__tests__/integration/CreateTaskScreen.test.tsx src/locales/en.ts src/locales/zh-TW.ts
git commit -m "feat(create-task): inline submit flow and location picker"
```

---

### Task 4: Document the New Task Field and Run Final Focused Verification

**Files:**
- Modify: `documentation/DATABASE_ARCHITECTURE.md`

- [ ] **Step 1: Update the task schema documentation**

In `documentation/DATABASE_ARCHITECTURE.md`, extend the `### tasks` field list so the runtime schema includes the new dedicated field:

```md
- `container_id`
- `sub_container_id`
- `tags`
- `location_on_site`
- `attachments`
```

Add one sentence directly below the task-field list:

```md
`location_on_site` stores a task-level on-site label selected during task creation and must remain separate from `projects.location`.
```

- [ ] **Step 2: Run the focused regression suite**

Run:

```bash
npx jest src/state/__tests__/taskStore.supabase.unit.test.ts --runInBand
npx jest src/ui/viewAdapters/__tests__/useCreateTaskViewAdapter.test.ts --runInBand
npx jest src/__tests__/integration/CreateTaskScreen.test.tsx --runInBand
```

Expected: PASS for all three suites, with no regression in create-mode payloads, screen structure, or task-store mapping.

- [ ] **Step 3: Perform manual simulator verification**

Use the active dev build and verify this exact flow:

```text
1. Open Create New Task from a project that already has existing tasks.
2. Confirm the screen scrolls naturally and there is no separate action layer above the bottom nav.
3. Confirm the primary button appears directly below Attachments.
4. Open Location on Site and verify only same-project history appears.
5. Choose an existing option, then reopen and enter a new location.
6. Submit the task and confirm the new task persists without altering the project's own location value.
```

Expected: The CTA sits in normal form flow, the gap above bottom nav is gone, existing options are project-scoped, and the new location behaves like task metadata rather than project metadata.

- [ ] **Step 4: Commit**

```bash
git add documentation/DATABASE_ARCHITECTURE.md
git commit -m "docs(tasks): document on-site location field"
```

---

## Scope Check

- Covered: dedicated DB field, project-scoped location history, add-new flow, assignment-section removal, inline submit flow, and focused docs/test coverage.
- Explicitly not added: global location management, project-location reuse, task-detail redesign, or unrelated dashboard/task-flow changes.
