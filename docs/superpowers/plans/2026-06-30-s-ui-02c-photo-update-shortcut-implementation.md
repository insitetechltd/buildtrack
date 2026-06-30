# S-UI-02C Photo Update Shortcut Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn `Add Photos` into a draft-carried update shortcut that returns into update action-mode, supports photo-only updates when photos exist, preserves task/subtask semantics, and removes the false-success photos-only end-state.

**Architecture:** Freeze the desired routing and submit behavior first, then rewire `TaskDetailScreen`, `AppNavigator`, and `CreateTaskScreen` so the shortcut always lands in update action-mode with the correct update target context. Keep persistence centralized in the action-mode update submit path, but make submit photo-aware: upload local draft photos before persistence, abort atomically on upload failure, and reuse durable URLs on retry.

**Tech Stack:** Expo-managed React Native, TypeScript, React Navigation, Zustand, Jest, `@testing-library/react-native`.

---

## File Structure

**New**
- `src/navigation/__tests__/photoShortcutRoutes.test.tsx`

**Modify**
- `src/screens/TaskDetailScreen.tsx`
- `src/navigation/AppNavigator.tsx`
- `src/screens/CreateTaskScreen.tsx`
- `src/__tests__/integration/TaskDetailScreen.header.test.tsx`
- `src/__tests__/integration/CreateTaskScreen.test.tsx`

## Draft Ownership Decision

- `TaskActionScreen` is the single owner of the update draft for this slice.
- Navigator wrappers (`CreateTaskScreenWrapper`, `CreateTaskMainScreen`, `PhotoSelectionScreenWrapper`) only transport one-shot params into the screen and must clear them immediately after hydration.
- `actionType="photos"` is normalized at the `CreateTaskScreen` boundary into update action-mode; the dedicated photos-only terminal branch is removed rather than left as a compatibility path.
- `CreateTaskMainScreen` remains the owner of wrapper-level cached params and must expose an explicit `onClearDraftPayloads()` callback to `CreateTaskScreen` / `TaskActionScreen` so stale cached photos are cleared after hydration, successful submit, or confirmed discard.

## Task 1: Freeze Task-Detail Shortcut Routing

**Files:**
- Modify: `src/screens/TaskDetailScreen.tsx`
- Modify: `src/__tests__/integration/TaskDetailScreen.header.test.tsx`

- [ ] **Step 1: Write the failing task-detail routing test**

```tsx
it("routes upload_photos into the update shortcut with the active subtask context", () => {
  const onNavigateToCreateTask = jest.fn();

  mockUseTaskDetailViewAdapter.mockReturnValue({
    output: {
      readiness: { hasUsableData: true },
      header: { title: "Task Details" },
      banners: [],
      detailSections: [],
      assigners: [],
      assignees: [],
      activities: [],
      childTasks: [],
      actionItems: [
        {
          id: "photos-action",
          actionId: "upload_photos",
          label: "Add Photos",
          icon: "camera-outline",
          isDisabled: false,
          density: "comfortable",
          structuralState: "ready",
        },
      ],
    },
    actions: {
      acceptTask: jest.fn(),
      declineTask: jest.fn(),
      submitForReview: jest.fn(),
      approveTask: jest.fn(),
    },
  } as ReturnType<typeof useTaskDetailViewAdapter>);

  const screen = render(
    <TaskDetailScreen
      {...({
        taskId: "task-1",
        subTaskId: "subtask-1",
        onNavigateBack: jest.fn(),
        onNavigateToCreateTask,
      } as any)}
    />,
  );

  fireEvent.press(screen.getByText("Add Photos"));

  expect(onNavigateToCreateTask).toHaveBeenCalledWith(
    undefined,
    undefined,
    "task-1",
    "update",
    "subtask-1",
  );
});
```

- [ ] **Step 2: Run the focused test to verify RED**

Run:

```bash
PATH=/opt/homebrew/bin:$PATH ./node_modules/.bin/jest src/__tests__/integration/TaskDetailScreen.header.test.tsx --runInBand
```

Expected:

```text
FAIL ... Expected onNavigateToCreateTask to have been called with ... "update", "subtask-1"
Received ... "photos"
```

- [ ] **Step 3: Update the task-detail callback contract and implementation minimally**

```tsx
interface TaskDetailScreenProps {
  taskId: string;
  subTaskId?: string;
  onNavigateBack: () => void;
  onNavigateToCreateTask?: (
    parentTaskId?: string,
    parentSubTaskId?: string,
    editTaskId?: string,
    actionType?: "edit" | "update" | "photos" | "comment" | "reassign",
    updateTargetSubTaskId?: string,
  ) => void;
}

case "upload_photos":
  if (props.onNavigateToCreateTask) {
    props.onNavigateToCreateTask(
      undefined,
      undefined,
      props.taskId,
      "update",
      props.subTaskId,
    );
  }
  break;
```

- [ ] **Step 4: Run the focused test to verify GREEN**

Run:

```bash
PATH=/opt/homebrew/bin:$PATH ./node_modules/.bin/jest src/__tests__/integration/TaskDetailScreen.header.test.tsx --runInBand
```

Expected:

```text
PASS src/__tests__/integration/TaskDetailScreen.header.test.tsx
```

- [ ] **Step 5: Commit the routing freeze**

```bash
git add src/screens/TaskDetailScreen.tsx src/__tests__/integration/TaskDetailScreen.header.test.tsx
git commit -m "test(task-ui): freeze photo shortcut routing"
```

## Task 2: Freeze Navigator Return Routing

**Files:**
- Create: `src/navigation/__tests__/photoShortcutRoutes.test.tsx`
- Modify: `src/navigation/AppNavigator.tsx`

- [ ] **Step 1: Write the failing navigator route tests**

```tsx
import {
  buildPhotoShortcutCreateTaskParams,
  shouldReturnToCreateTaskShortcut,
} from "../AppNavigator";

describe("photoShortcutRoutes", () => {
  it("returns CreateTask photo shortcuts into update action-mode instead of standalone UpdateProgress", () => {
    expect(
      shouldReturnToCreateTaskShortcut({
        returnScreen: "UpdateProgress",
        actionType: "update",
      }),
    ).toBe(true);

    expect(
      buildPhotoShortcutCreateTaskParams({
        taskId: "task-1",
        subTaskId: "subtask-1",
        actionType: "update",
        selectedPhotos: [{ uri: "file:///photo-1.jpg" }],
      }),
    ).toEqual(
      expect.objectContaining({
        editTaskId: "task-1",
        actionType: "update",
        updateTargetSubTaskId: "subtask-1",
        selectedPhotos: [{ uri: "file:///photo-1.jpg" }],
      }),
    );
  });

  it("keeps AddComment returns on their existing branch", () => {
    expect(
      shouldReturnToCreateTaskShortcut({
        returnScreen: "AddComment",
        actionType: undefined,
      }),
    ).toBe(false);
  });

  it("keeps standalone UpdateProgress returns on their existing branch", () => {
    expect(
      shouldReturnToCreateTaskShortcut({
        returnScreen: "UpdateProgress",
        actionType: undefined,
      }),
    ).toBe(false);
  });
});
```

- [ ] **Step 2: Run the navigator suite to verify RED**

Run:

```bash
PATH=/opt/homebrew/bin:$PATH ./node_modules/.bin/jest src/navigation/__tests__/photoShortcutRoutes.test.tsx --runInBand
```

Expected:

```text
FAIL ... expected update shortcut route normalization / missing updateTargetSubTaskId propagation
```

- [ ] **Step 3: Normalize the photo-selection wrapper and route helpers minimally**

```tsx
function navigateToCreateTaskRoute(navigation: any, params: Record<string, unknown>) {
  const currentRouteNames = navigation.getState?.()?.routeNames || [];
  if (currentRouteNames.includes("CreateTask")) {
    navigation.navigate("CreateTask", params);
    return;
  }

  if (currentRouteNames.includes("CreateTaskMain")) {
    navigation.navigate("CreateTaskMain", params);
    return;
  }

  navigation.getParent?.()?.navigate("CreateTask", {
    screen: "CreateTaskMain",
    params,
  });
}

export function shouldReturnToCreateTaskShortcut({
  returnScreen,
  actionType,
}: {
  returnScreen?: string;
  actionType?: string;
}) {
  return returnScreen === "UpdateProgress" && actionType === "update";
}

export function buildPhotoShortcutCreateTaskParams({
  taskId,
  subTaskId,
  actionType,
  selectedPhotos,
  uploadedPhotoUrls,
}: {
  taskId: string;
  subTaskId?: string;
  actionType: "update";
  selectedPhotos?: any[];
  uploadedPhotoUrls?: string[];
}) {
  return {
    editTaskId: taskId,
    actionType,
    updateTargetSubTaskId: subTaskId,
    selectedPhotos,
    uploadedPhotoUrls,
  };
}

// Inside task-detail wrappers:
onNavigateToCreateTask={(parentTaskId, parentSubTaskId, editTaskId, actionType, updateTargetSubTaskId) => {
  navigation.navigate("CreateTask", {
    parentTaskId,
    parentSubTaskId,
    editTaskId,
    actionType,
    updateTargetSubTaskId,
  });
}}

// Inside CreateTaskScreenWrapper and CreateTaskMainScreen:
const { updateTargetSubTaskId } = route.params || {};

<CreateTaskScreen
  editTaskId={editTaskId}
  actionType={actionType}
  updateTargetSubTaskId={updateTargetSubTaskId}
  selectedPhotos={selectedPhotos}
  uploadedPhotoUrls={uploadedPhotoUrls}
  onClearDraftPayloads={() => {
    setSelectedPhotosState(undefined);
    setUploadedPhotoUrlsState(undefined);
    navigation.setParams({
      selectedPhotos: undefined,
      uploadedPhotoUrls: undefined,
    });
  }}
/>

// Inside PhotoSelectionScreenWrapper:
navigateToCreateTaskRoute(navigation, {
  editTaskId: taskId,
  actionType: "update",
  updateTargetSubTaskId: subTaskId,
  selectedPhotos: photos,
});

// Inside TaskActionScreen.handleAddPhotos():
navigation.navigate("PhotoSelection", {
  taskId: task.id,
  subTaskId: updateTargetSubTaskId,
  companyId: user.companyId,
  userId: user.id,
  initialCompletionPercentage: task.completionPercentage || 0,
  initialPhotos: serializablePhotos,
  returnScreen: "UpdateProgress",
  actionType: "update",
});
```

- [ ] **Step 4: Run the navigator suite to verify GREEN**

Run:

```bash
PATH=/opt/homebrew/bin:$PATH ./node_modules/.bin/jest src/navigation/__tests__/photoShortcutRoutes.test.tsx --runInBand
```

Expected:

```text
PASS src/navigation/__tests__/photoShortcutRoutes.test.tsx
```

- [ ] **Step 5: Commit the navigator freeze**

```bash
git add src/navigation/AppNavigator.tsx src/navigation/__tests__/photoShortcutRoutes.test.tsx
git commit -m "test(navigation): freeze photo shortcut routes"
```

## Task 3: Freeze Update Submit Rules

**Files:**
- Modify: `src/__tests__/integration/CreateTaskScreen.test.tsx`
- Modify: `src/screens/CreateTaskScreen.tsx`

- [ ] **Step 1: Add failing update action-mode tests**

```tsx
it("allows submitting an update with photos and no description", async () => {
  mockUseTaskStore.mockReturnValue({
    tasks: [
      {
        id: "task-1",
        projectId: "project-1",
        title: "Existing task",
        description: "Existing description",
        taskReference: "",
        billingStatus: "non_billable",
        priority: "medium",
        category: "general",
        dueDate: "2099-01-01T00:00:00.000Z",
        assignedTo: ["worker-1"],
        assignedBy: "manager-1",
        attachments: [],
        status: "in_progress",
        completionPercentage: 25,
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    ],
    createTask: mockCreateTask,
    createSubTask: mockCreateSubTask,
    updateTask: mockUpdateTask,
    fetchTaskById: jest.fn(),
    addTaskUpdate: mockAddTaskUpdate,
    addAssignerComment: mockAddAssignerComment,
  });

  const { getByText } = render(
    <NavigationContainer>
      <CreateTaskScreen
        onNavigateBack={jest.fn()}
        editTaskId="task-1"
        actionType="update"
        uploadedPhotoUrls={["https://cdn.example.com/photo-update.jpg"]}
      />
    </NavigationContainer>,
  );

  fireEvent.press(getByText("Submit Update"));

  await waitFor(() => {
    expect(mockAddTaskUpdate).toHaveBeenCalledWith(
      "task-1",
      expect.objectContaining({
        description: "",
        photos: ["https://cdn.example.com/photo-update.jpg"],
      }),
    );
  });
});

it("still blocks empty updates when there is no description and no photo", async () => {
  const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(jest.fn());

  const { getByText } = render(
    <NavigationContainer>
      <CreateTaskScreen onNavigateBack={jest.fn()} editTaskId="task-1" actionType="update" />
    </NavigationContainer>,
  );

  fireEvent.press(getByText("Submit Update"));

  await waitFor(() => {
    expect(mockAddTaskUpdate).not.toHaveBeenCalled();
  });

  expect(alertSpy).toHaveBeenCalledWith("Error", "Please provide a description for this update");
});

it("uses addSubTaskUpdate for photo shortcut submits targeting a subtask", async () => {
  const mockAddSubTaskUpdate = jest.fn().mockResolvedValue(undefined);

  mockUseTaskStore.mockReturnValue({
    tasks: [
      {
        id: "task-1",
        projectId: "project-1",
        title: "Existing task",
        description: "Existing description",
        taskReference: "",
        billingStatus: "non_billable",
        priority: "medium",
        category: "general",
        dueDate: "2099-01-01T00:00:00.000Z",
        assignedTo: ["worker-1"],
        assignedBy: "manager-1",
        attachments: [],
        status: "in_progress",
        completionPercentage: 25,
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    ],
    createTask: mockCreateTask,
    createSubTask: mockCreateSubTask,
    updateTask: mockUpdateTask,
    fetchTaskById: jest.fn(),
    addTaskUpdate: mockAddTaskUpdate,
    addSubTaskUpdate: mockAddSubTaskUpdate,
    addAssignerComment: mockAddAssignerComment,
  });

  const { getByText } = render(
    <NavigationContainer>
      <CreateTaskScreen
        onNavigateBack={jest.fn()}
        editTaskId="task-1"
        actionType="update"
        updateTargetSubTaskId="subtask-1"
        uploadedPhotoUrls={["https://cdn.example.com/photo-update.jpg"]}
      />
    </NavigationContainer>,
  );

  fireEvent.press(getByText("Submit Update"));

  await waitFor(() => {
    expect(mockAddSubTaskUpdate).toHaveBeenCalledWith(
      "task-1",
      "subtask-1",
      expect.objectContaining({
        photos: ["https://cdn.example.com/photo-update.jpg"],
      }),
    );
  });
});

it("clears wrapper-carried draft params after local hydration", async () => {
  const setParams = jest.fn();
  mockUseNavigation.mockReturnValue({ navigate: mockNavigate, setParams });

  render(
    <NavigationContainer>
      <CreateTaskScreen
        onNavigateBack={jest.fn()}
        editTaskId="task-1"
        actionType="update"
        uploadedPhotoUrls={["https://cdn.example.com/photo-update.jpg"]}
      />
    </NavigationContainer>,
  );

  await waitFor(() => {
    expect(setParams).toHaveBeenCalledWith({
      selectedPhotos: undefined,
      uploadedPhotoUrls: undefined,
    });
  });
});
```

- [ ] **Step 2: Run the create-task suite to verify RED**

Run:

```bash
PATH=/opt/homebrew/bin:$PATH ./node_modules/.bin/jest src/__tests__/integration/CreateTaskScreen.test.tsx --runInBand
```

Expected:

```text
FAIL ... update submit still rejects photo-only draft
```

- [ ] **Step 3: Implement minimal update validation and subtask-aware submit plumbing**

```tsx
interface CreateTaskScreenProps {
  onNavigateBack: () => void;
  editTaskId?: string;
  actionType?: "edit" | "update" | "photos" | "comment" | "reassign";
  updateTargetSubTaskId?: string;
  uploadedPhotoUrls?: string[];
  selectedPhotos?: SelectedPhoto[];
  onClearDraftPayloads?: () => void;
}

function TaskActionScreen({
  actionType,
  taskId,
  updateTargetSubTaskId,
  onNavigateBack,
  selectedPhotos,
  uploadedPhotoUrls,
}: {
  actionType: "update" | "photos" | "comment" | "reassign";
  taskId: string;
  updateTargetSubTaskId?: string;
  onNavigateBack: () => void;
  selectedPhotos?: SelectedPhoto[];
  uploadedPhotoUrls?: string[];
}) {
  const addSubTaskUpdate = useTaskStore((state) => state.addSubTaskUpdate);

  const hasDraftPhotos = updateForm.photos.length > 0 || selectedPhotoUris.length > 0;

  const handleSubmitUpdate = async () => {
    if (!updateForm.description.trim() && !hasDraftPhotos) {
      Alert.alert("Error", "Please provide a description for this update");
      return;
    }

    // upload + choose addTaskUpdate vs addSubTaskUpdate in Task 4
  };
}
```

- [ ] **Step 3a: Normalize legacy `photos` immediately at the `CreateTaskScreen` boundary**

```tsx
export default function CreateTaskScreen({
  onNavigateBack,
  editTaskId,
  actionType,
  updateTargetSubTaskId,
  uploadedPhotoUrls,
  selectedPhotos: selectedPhotosProp,
}: CreateTaskScreenProps) {
  const normalizedActionType =
    actionType === "photos" ? "update" : actionType;
  const effectiveActionType = normalizedActionType || (editTaskId ? "edit" : undefined);

  if (effectiveActionType && effectiveActionType !== "edit" && editTaskId) {
    return (
      <TaskActionScreen
        actionType={effectiveActionType}
        taskId={editTaskId}
        updateTargetSubTaskId={updateTargetSubTaskId}
        onNavigateBack={onNavigateBack}
        selectedPhotos={selectedPhotosProp}
        uploadedPhotoUrls={uploadedPhotoUrls}
      />
    );
  }
}
```

- [ ] **Step 4: Run the create-task suite to verify GREEN for validation**

Run:

```bash
PATH=/opt/homebrew/bin:$PATH ./node_modules/.bin/jest src/__tests__/integration/CreateTaskScreen.test.tsx --runInBand
```

Expected:

```text
PASS src/__tests__/integration/CreateTaskScreen.test.tsx
```

- [ ] **Step 5: Commit the validation freeze**

```bash
git add src/screens/CreateTaskScreen.tsx src/__tests__/integration/CreateTaskScreen.test.tsx
git commit -m "test(task-ui): freeze photo-only update validation"
```

## Task 4: Implement Upload-On-Submit and Draft Safety

**Files:**
- Modify: `src/screens/CreateTaskScreen.tsx`
- Modify: `src/__tests__/integration/CreateTaskScreen.test.tsx`

- [ ] **Step 1: Add failing submit-sequencing and discard tests**

```tsx
it("uploads local photos before persisting the update and reuses durable urls after addTaskUpdate failure", async () => {
  const mockUploadFileWithVerification = jest
    .fn()
    .mockResolvedValueOnce({
      success: true,
      file: { public_url: "https://cdn.example.com/uploaded-1.jpg" },
    });
  mockAddTaskUpdate.mockRejectedValueOnce(new Error("write failed"));

  const { getByText } = render(
    <NavigationContainer>
      <CreateTaskScreen
        onNavigateBack={jest.fn()}
        editTaskId="task-1"
        actionType="update"
        selectedPhotos={[
          { uri: "file:///photo-1.jpg", fileName: "photo-1.jpg", isAnnotated: false },
        ]}
      />
    </NavigationContainer>,
  );

  fireEvent.press(getByText("Submit Update"));

  await waitFor(() => {
    expect(mockUploadFileWithVerification).toHaveBeenCalledTimes(1);
    expect(mockAddTaskUpdate).toHaveBeenCalledWith(
      "task-1",
      expect.objectContaining({
        photos: ["https://cdn.example.com/uploaded-1.jpg"],
      }),
    );
  });

  mockAddTaskUpdate.mockResolvedValueOnce(undefined);

  fireEvent.press(getByText("Submit Update"));

  await waitFor(() => {
    expect(mockUploadFileWithVerification).toHaveBeenCalledTimes(1);
    expect(mockAddTaskUpdate).toHaveBeenCalledTimes(2);
  });
});

it("prompts before leaving a dirty photo-driven draft", async () => {
  const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(jest.fn());
  const onNavigateBack = jest.fn();

  const { getByTestId } = render(
    <NavigationContainer>
      <CreateTaskScreen
        onNavigateBack={onNavigateBack}
        editTaskId="task-1"
        actionType="update"
        uploadedPhotoUrls={["https://cdn.example.com/photo-update.jpg"]}
      />
    </NavigationContainer>,
  );

  fireEvent.press(getByTestId("modernHeader-back"));

  expect(alertSpy).toHaveBeenCalled();
  expect(onNavigateBack).not.toHaveBeenCalled();
});

it("intercepts beforeRemove and hardware back when the update draft is dirty", async () => {
  const preventDefault = jest.fn();
  const addListener = jest.fn((_event, callback) => {
    callback({ data: { action: { type: "GO_BACK" } }, preventDefault });
    return jest.fn();
  });
  mockUseNavigation.mockReturnValue({ navigate: mockNavigate, setParams: jest.fn(), addListener });

  render(
    <NavigationContainer>
      <CreateTaskScreen
        onNavigateBack={jest.fn()}
        editTaskId="task-1"
        actionType="update"
        uploadedPhotoUrls={["https://cdn.example.com/photo-update.jpg"]}
      />
    </NavigationContainer>,
  );

  await waitFor(() => {
    expect(preventDefault).toHaveBeenCalled();
  });
});

it("appends and dedupes draft photos after re-entering photo selection", async () => {
  const screen = render(
    <NavigationContainer>
      <CreateTaskScreen
        onNavigateBack={jest.fn()}
        editTaskId="task-1"
        actionType="update"
        selectedPhotos={[
          { uri: "file:///photo-1.jpg", fileName: "photo-1.jpg", isAnnotated: false },
        ]}
      />
    </NavigationContainer>,
  );

  screen.rerender(
    <NavigationContainer>
      <CreateTaskScreen
        onNavigateBack={jest.fn()}
        editTaskId="task-1"
        actionType="update"
        selectedPhotos={[
          { uri: "file:///photo-1.jpg", fileName: "photo-1.jpg", isAnnotated: false },
          { uri: "file:///photo-2.jpg", fileName: "photo-2.jpg", isAnnotated: false },
        ]}
      />
    </NavigationContainer>,
  );

  expect(screen.getAllByTestId("Ionicons").length).toBeGreaterThan(0);
});

it("normalizes legacy photos actionType into update mode", () => {
  const { getByText, queryByText } = render(
    <NavigationContainer>
      <CreateTaskScreen onNavigateBack={jest.fn()} editTaskId="task-1" actionType="photos" />
    </NavigationContainer>,
  );

  expect(getByText("Update Progress")).toBeTruthy();
  expect(queryByText("Done")).toBeNull();
});

it("does not create a draft when photo selection returns zero photos", async () => {
  const screen = render(
    <NavigationContainer>
      <CreateTaskScreen onNavigateBack={jest.fn()} editTaskId="task-1" actionType="update" />
    </NavigationContainer>,
  );

  screen.rerender(
    <NavigationContainer>
      <CreateTaskScreen
        onNavigateBack={jest.fn()}
        editTaskId="task-1"
        actionType="update"
        selectedPhotos={[]}
      />
    </NavigationContainer>,
  );

  expect(screen.queryByText("Discard update?")).toBeNull();
});

it("preserves an existing dirty draft when photo selection fails or is canceled", async () => {
  mockShowPhotoSelectionDialog.mockResolvedValue(undefined);

  const { getByText } = render(
    <NavigationContainer>
      <CreateTaskScreen
        onNavigateBack={jest.fn()}
        editTaskId="task-1"
        actionType="update"
        uploadedPhotoUrls={["https://cdn.example.com/photo-update.jpg"]}
      />
    </NavigationContainer>,
  );

  fireEvent.press(getByText("Tap to add files"));

  await waitFor(() => {
    expect(getByText("Submit Update")).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run the create-task suite to verify RED**

Run:

```bash
PATH=/opt/homebrew/bin:$PATH ./node_modules/.bin/jest src/__tests__/integration/CreateTaskScreen.test.tsx --runInBand
```

Expected:

```text
FAIL ... local photos are not uploaded before addTaskUpdate / dirty draft exits without confirmation
```

- [ ] **Step 3: Implement minimal upload sequencing, draft cleanup, and discard handling**

```tsx
const initialCompletionRef = useRef(task?.completionPercentage || 0);
const [draftPhotoObjects, setDraftPhotoObjects] = useState<SelectedPhoto[]>(selectedPhotos || []);

useEffect(() => {
  if (!selectedPhotos || selectedPhotos.length === 0) {
    return;
  }

  setDraftPhotoObjects((prev) => {
    const merged = [...prev];
    for (const photo of selectedPhotos) {
      const photoKey = photo.annotatedUri || photo.uri;
      if (!merged.some((existing) => (existing.annotatedUri || existing.uri) === photoKey)) {
        merged.push(photo);
      }
    }
    return merged;
  });

  onClearDraftPayloads?.();
}, [selectedPhotos]);

useEffect(() => {
  if (!uploadedPhotoUrls || uploadedPhotoUrls.length === 0) {
    return;
  }

  setUpdateForm((prev) => ({
    ...prev,
    photos: Array.from(new Set([...prev.photos, ...uploadedPhotoUrls])),
  }));

  onClearDraftPayloads?.();
}, [onClearDraftPayloads, uploadedPhotoUrls]);

const hasDirtyDraft =
  updateForm.description.trim().length > 0 ||
  updateForm.completionPercentage !== initialCompletionRef.current ||
  draftPhotoObjects.length > 0 ||
  updateForm.photos.length > 0;

const pendingExitActionRef = useRef<any>(null);
const isDiscardReplayRef = useRef(false);

const confirmDiscardDraft = () => {
  if (!hasDirtyDraft) {
    onNavigateBack();
    return;
  }

  Alert.alert("Discard update?", "Your draft photos and changes will be lost.", [
    { text: "Cancel", style: "cancel" },
    {
      text: "Discard",
      style: "destructive",
      onPress: () => {
        setDraftPhotoObjects([]);
        setUpdateForm((prev) => ({
          ...prev,
          description: "",
          photos: [],
          completionPercentage: initialCompletionRef.current,
        }));
        onClearDraftPayloads?.();
        if (pendingExitActionRef.current) {
          isDiscardReplayRef.current = true;
          navigation.dispatch(pendingExitActionRef.current);
          pendingExitActionRef.current = null;
          return;
        }
        onNavigateBack();
      },
    },
  ]);
};

useEffect(() => {
  const unsubscribe = navigation.addListener?.("beforeRemove", (event: any) => {
    if (isDiscardReplayRef.current) {
      isDiscardReplayRef.current = false;
      return;
    }

    if (!hasDirtyDraft) {
      return;
    }

    event.preventDefault();
    pendingExitActionRef.current = event.data.action;
    confirmDiscardDraft();
  });

  return unsubscribe;
}, [confirmDiscardDraft, hasDirtyDraft, navigation]);

const handleSubmitUpdate = async () => {
  if (!updateForm.description.trim() && draftPhotoObjects.length === 0 && updateForm.photos.length === 0) {
    Alert.alert("Error", "Please provide a description for this update");
    return;
  }

  let durablePhotoUrls = [...updateForm.photos];

  if (draftPhotoObjects.length > 0) {
    const uploadedDraftUrls: string[] = [];

    for (const photo of draftPhotoObjects) {
      const result = await uploadFileWithVerification({
        file: {
          uri: photo.annotatedUri || photo.uri,
          name: photo.fileName,
          type: "image/jpeg",
        },
        entityType: "task-update",
        entityId: updateTargetSubTaskId || taskId,
        companyId: user.companyId,
        userId: user.id,
      });

      if (!result.success || !result.file) {
        setUpdateForm((prev) => ({
          ...prev,
          photos: Array.from(new Set([...prev.photos, ...uploadedDraftUrls])),
        }));
        Alert.alert("Error", "Photo upload failed. Your update was not submitted.");
        return;
      }

      uploadedDraftUrls.push(result.file.public_url);
    }

    durablePhotoUrls = [
      ...durablePhotoUrls,
      ...uploadedDraftUrls,
    ];

    setDraftPhotoObjects([]);
    setUpdateForm((prev) => ({ ...prev, photos: durablePhotoUrls }));
  }

  if (updateTargetSubTaskId) {
    await addSubTaskUpdate(taskId, updateTargetSubTaskId, {
      description: updateForm.description,
      photos: durablePhotoUrls,
      completionPercentage: updateForm.completionPercentage,
      status: calculatedStatus,
      userId: user.id,
    });
  } else {
    await addTaskUpdate(taskId, {
      description: updateForm.description,
      photos: durablePhotoUrls,
      completionPercentage: updateForm.completionPercentage,
      status: calculatedStatus,
      userId: user.id,
    });
  }

  onClearDraftPayloads?.();
};
```

- [ ] **Step 4: Run the create-task suite to verify GREEN**

Run:

```bash
PATH=/opt/homebrew/bin:$PATH ./node_modules/.bin/jest src/__tests__/integration/CreateTaskScreen.test.tsx --runInBand
```

Expected:

```text
PASS src/__tests__/integration/CreateTaskScreen.test.tsx
```

- [ ] **Step 5: Commit the implementation**

```bash
git add src/screens/CreateTaskScreen.tsx src/__tests__/integration/CreateTaskScreen.test.tsx
git commit -m "feat(task-ui): add photo update shortcut"
```

## Task 5: Final Verification and Slice Closure

**Files:**
- Modify: any files touched above

- [ ] **Step 1: Run the focused verification gate**

Run:

```bash
PATH=/opt/homebrew/bin:$PATH ./node_modules/.bin/jest src/__tests__/integration/TaskDetailScreen.header.test.tsx --runInBand
PATH=/opt/homebrew/bin:$PATH ./node_modules/.bin/jest src/navigation/__tests__/photoShortcutRoutes.test.tsx --runInBand
PATH=/opt/homebrew/bin:$PATH ./node_modules/.bin/jest src/__tests__/integration/CreateTaskScreen.test.tsx --runInBand
PATH=/opt/homebrew/bin:$PATH ./node_modules/.bin/tsc --noEmit
```

Expected:

```text
PASS TaskDetailScreen header suite
PASS photoShortcutRoutes suite
PASS CreateTaskScreen suite
PASS tsc --noEmit
```

- [ ] **Step 2: Review the changed slice for residual regressions**

Check:

```text
- actionType="photos" now normalizes immediately into update behavior and no longer reaches the old false-success Done screen
- stale actionType="photos" callers now normalize to update behavior
- task and subtask shortcut submits both choose the correct persistence path
- comment and standalone UpdateProgress return branches still work
- zero-selection / cancel / permission-error branches do not create or erase a dirty draft
- discard confirmation only appears for dirty update drafts
- successful submit clears carried photo state
- wrapper-level selectedPhotos/uploadedPhotoUrls params are cleared after submit or confirmed discard
```

- [ ] **Step 3: Create the closure commit**

```bash
git add src/screens/TaskDetailScreen.tsx \
  src/navigation/AppNavigator.tsx \
  src/screens/CreateTaskScreen.tsx \
  src/__tests__/integration/TaskDetailScreen.header.test.tsx \
  src/__tests__/integration/CreateTaskScreen.test.tsx \
  src/navigation/__tests__/photoShortcutRoutes.test.tsx
git commit -m "feat(task-ui): complete s-ui-02c photo shortcut"
```
