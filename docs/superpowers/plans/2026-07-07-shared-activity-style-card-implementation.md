# Shared Activity-Style Card Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `Recent Activity` and `Tasks` render through one shared card shell with identical proportions, balanced left photo rails, and a placeholder rail with a `no photo` icon.

**Architecture:** Extract the current `Recent Activity` card into a shared renderer that owns shell size, spacing, thumbnail rail, placeholder icon, and image-fallback behavior. Keep data preparation in `useDashboardViewAdapter()` and `useTasksViewAdapter()`, then map both surfaces into the shared renderer so `Tasks` stops maintaining a separate card proportion system.

**Tech Stack:** React Native, TypeScript, Expo, NativeWind className styling, Jest, Testing Library

---

## File Map

- Create: `src/components/cards/ActivityStyleRowCard.tsx`
  Owns the shared shell, balanced photo rail, placeholder-with-icon behavior, and shared text rhythm.
- Modify: `src/screens/DashboardScreen.tsx`
  Replace the inline `ActivityFeedCard` implementation with the shared card renderer.
- Modify: `src/screens/TasksScreen.tsx`
  Replace the `ContainerCard` task row rendering path with the shared card renderer.
- Modify: `src/ui/viewAdapters/useDashboardViewAdapter.ts`
  Keep exposing normalized preview-photo URLs for activity items.
- Modify: `src/ui/viewAdapters/useTasksViewAdapter.ts`
  Ensure task rows expose the exact text-line content needed by the shared activity-style shell.
- Modify: `src/components/primitives/container/ContainerCard.tsx`
  Remove task-thumbnail-specific styling only if no remaining screen uses it after the migration.
- Create: `src/components/cards/__tests__/ActivityStyleRowCard.test.tsx`
  Guards the shared shell, real thumbnail rendering, and placeholder-with-icon behavior.
- Modify: `src/screens/__tests__/DashboardScreen.test.tsx`
  Verifies `DashboardScreen` now renders through the shared card shell.
- Modify: `src/screens/__tests__/TasksScreen.test.tsx`
  Verifies `TasksScreen` rows now use the shared card shell instead of `ContainerCard`.
- Modify: `src/__tests__/integration/activity-home.integration.test.tsx`
  Keeps activity-home integration aligned with the shared shell.
- Modify: `src/__tests__/integration/TasksScreenInteraction.test.tsx`
  Keeps Tasks integration aligned with the shared shell and filter interactions.

## Task 1: Lock The Shared Card Contract In Tests

**Files:**
- Create: `src/components/cards/__tests__/ActivityStyleRowCard.test.tsx`
- Modify: `src/screens/__tests__/DashboardScreen.test.tsx`
- Modify: `src/screens/__tests__/TasksScreen.test.tsx`

- [ ] **Step 1: Write a failing shared-card test for real thumbnails and placeholder-with-icon rendering**

```tsx
it("renders the shared activity-style card with a balanced left rail and a no-photo placeholder icon", () => {
  const { getByTestId, getByText, queryByTestId } = render(
    <ActivityStyleRowCard
      testID="shared-card:task-1"
      title="Test critical date"
      subtitle="Task accepted by Herman"
      metaLabel="Jul 7 at 6:48 PM"
      badgeLabel="In Progress"
      imageUri={undefined}
      onPress={jest.fn()}
    />,
  );

  expect(getByTestId("shared-card:task-1")).toBeTruthy();
  expect(getByTestId("shared-card:task-1:thumbnail")).toBeTruthy();
  expect(getByTestId("shared-card:task-1:thumbnail-placeholder")).toBeTruthy();
  expect(getByTestId("shared-card:task-1:no-photo-icon")).toBeTruthy();
  expect(queryByTestId("shared-card:task-1:thumbnail-image")).toBeNull();
  expect(getByText("Test critical date")).toBeTruthy();
  expect(getByText("Task accepted by Herman")).toBeTruthy();
  expect(getByText("Jul 7 at 6:48 PM")).toBeTruthy();
});
```

- [ ] **Step 2: Add a failing DashboardScreen assertion for the shared shell**

```tsx
expect(screen.getByTestId("dashboard-screen__activity_activity-1:thumbnail")).toBeTruthy();
expect(screen.getByTestId("dashboard-screen__activity_activity-2:no-photo-icon")).toBeTruthy();
```

- [ ] **Step 3: Add a failing TasksScreen assertion for the shared shell instead of ContainerCard**

```tsx
expect(screen.getByTestId("tasks-screen__row_task-1:thumbnail")).toBeTruthy();
expect(screen.getByTestId("tasks-screen__row_task-2:no-photo-icon")).toBeTruthy();
expect(screen.queryByTestId("container-card:task-1")).toBeNull();
```

- [ ] **Step 4: Run the focused tests to verify the shared-card expectations fail for the expected reason**

Run: `npx jest src/components/cards/__tests__/ActivityStyleRowCard.test.tsx src/screens/__tests__/DashboardScreen.test.tsx src/screens/__tests__/TasksScreen.test.tsx --runInBand`

Expected: fail because the shared card component does not exist yet and the screens still render their current separate row implementations.

## Task 2: Build The Shared Activity-Style Card Shell

**Files:**
- Create: `src/components/cards/ActivityStyleRowCard.tsx`
- Create: `src/components/cards/__tests__/ActivityStyleRowCard.test.tsx`

- [ ] **Step 1: Implement the shared shell with a fixed balanced rail and placeholder-with-icon treatment**

```tsx
export default function ActivityStyleRowCard({
  testID,
  title,
  subtitle,
  metaLabel,
  badgeLabel,
  imageUri,
  onPress,
}: ActivityStyleRowCardProps) {
  const [hasUsableImage, setHasUsableImage] = useState(Boolean(imageUri));

  useEffect(() => {
    setHasUsableImage(Boolean(imageUri));
  }, [imageUri]);

  return (
    <Pressable testID={testID} onPress={onPress} className="overflow-hidden rounded-2xl bg-white">
      <View className="h-24 flex-row">
        <View testID={`${testID}:thumbnail`} className="h-24 w-24 items-center justify-center overflow-hidden bg-slate-100">
          {hasUsableImage && imageUri ? (
            <Image
              testID={`${testID}:thumbnail-image`}
              source={{ uri: imageUri }}
              className="h-24 w-24"
              resizeMode="cover"
              onError={() => setHasUsableImage(false)}
            />
          ) : (
            <View testID={`${testID}:thumbnail-placeholder`} className="h-24 w-24 items-center justify-center bg-slate-100">
              <Ionicons testID={`${testID}:no-photo-icon`} name="image-outline" size={22} color="#94a3b8" />
            </View>
          )}
        </View>
        <View className="min-w-0 flex-1 justify-center p-4">
          <View className="flex-row items-start justify-between">
            <View className="mr-4 flex-1">
              <Text className="text-base font-semibold text-slate-900">{title}</Text>
              <Text className="mt-1 text-sm text-slate-500">{subtitle}</Text>
            </View>
            <Text className="text-xs font-medium uppercase tracking-wide text-slate-400">{badgeLabel}</Text>
          </View>
          <Text className="mt-3 text-xs font-medium text-slate-400">{metaLabel}</Text>
        </View>
      </View>
    </Pressable>
  );
}
```

- [ ] **Step 2: Run the shared-card unit test**

Run: `npx jest src/components/cards/__tests__/ActivityStyleRowCard.test.tsx --runInBand`

Expected: PASS

## Task 3: Move DashboardScreen To The Shared Card

**Files:**
- Modify: `src/screens/DashboardScreen.tsx`
- Modify: `src/screens/__tests__/DashboardScreen.test.tsx`

- [ ] **Step 1: Replace the inline `ActivityFeedCard` with the shared card**

```tsx
<ActivityStyleRowCard
  testID={`dashboard-screen__activity_${item.id}`}
  title={item.title}
  subtitle={item.subtitle}
  metaLabel={item.timestampLabel}
  badgeLabel={item.statusLabel}
  imageUri={item.previewPhotoUri}
  onPress={() => props.onNavigateToTaskDetail?.(item.taskId)}
/>
```

- [ ] **Step 2: Remove the duplicated inline row component from DashboardScreen**

```tsx
// Delete local ActivityFeedCard and its duplicate image-fallback markup once the shared card is wired in.
```

- [ ] **Step 3: Re-run DashboardScreen tests**

Run: `npx jest src/screens/__tests__/DashboardScreen.test.tsx src/__tests__/integration/activity-home.integration.test.tsx --runInBand`

Expected: PASS

## Task 4: Move TasksScreen To The Shared Card

**Files:**
- Modify: `src/screens/TasksScreen.tsx`
- Modify: `src/ui/viewAdapters/useTasksViewAdapter.ts`
- Modify: `src/screens/__tests__/TasksScreen.test.tsx`
- Modify: `src/__tests__/integration/TasksScreenInteraction.test.tsx`

- [ ] **Step 1: Shape task rows into the same three text lines used by Recent Activity**

```ts
const subtitle = normalizedSearchQuery.length > 0
  ? searchProvenanceLine
  : buildContextLine(task) ?? projectName;

const metaLabel = latestUpdateLabel ?? "Task activity";
const badgeLabel = formatTaskStatusLabel(task.status);
```

- [ ] **Step 2: Render the shared shell in TasksScreen instead of ContainerCard**

```tsx
<ActivityStyleRowCard
  testID={`tasks-screen__row_${row.taskId}`}
  title={row.title}
  subtitle={row.contextLine ?? row.projectName}
  metaLabel={row.latestUpdateLabel ?? "Task activity"}
  badgeLabel={row.statusLabel}
  imageUri={row.primaryPhotoUri}
  onPress={() => props.onNavigateToTaskDetail(row.taskId)}
/>
```

- [ ] **Step 3: Keep filter/search logic untouched while removing the old task-card shell from this screen**

```tsx
// Delete the ContainerCard import from TasksScreen once all task rows render through ActivityStyleRowCard.
```

- [ ] **Step 4: Re-run Tasks screen and integration tests**

Run: `npx jest src/screens/__tests__/TasksScreen.test.tsx src/__tests__/integration/TasksScreenInteraction.test.tsx src/ui/viewAdapters/__tests__/useTasksViewAdapter.test.ts --runInBand`

Expected: PASS

## Task 5: Clean Up Remaining Old Task-Thumbnail Rendering

**Files:**
- Modify: `src/components/primitives/container/ContainerCard.tsx`

- [ ] **Step 1: Check whether the Tasks screen is the last consumer of the special task-thumbnail branch**

Run: `npx jest src/components/primitives/container/__tests__/ContainerCard.test.tsx --runInBand`

Expected: confirm whether the special branch is still required elsewhere.

- [ ] **Step 2: If no remaining screen depends on the task-thumbnail branch, remove it**

```tsx
// Delete the isTaskThumbnailCard early-return block and keep ContainerCard focused on the generic container path.
```

- [ ] **Step 3: If another surface still depends on it, leave ContainerCard untouched for this slice**

```tsx
// No code change here; document that ContainerCard cleanup is deferred.
```

## Task 6: Full Validation And Checkpoint

**Files:**
- Modify: none

- [ ] **Step 1: Run the full focused validation set**

Run: `npx jest src/components/cards/__tests__/ActivityStyleRowCard.test.tsx src/screens/__tests__/DashboardScreen.test.tsx src/screens/__tests__/TasksScreen.test.tsx src/ui/viewAdapters/__tests__/useDashboardViewAdapter.test.ts src/ui/viewAdapters/__tests__/useTasksViewAdapter.test.ts src/__tests__/integration/activity-home.integration.test.tsx src/__tests__/integration/TasksScreenInteraction.test.tsx --runInBand`

Expected: PASS

- [ ] **Step 2: Run typecheck**

Run: `npx tsc --noEmit`

Expected: PASS with no output

- [ ] **Step 3: Create the checkpoint commit**

```bash
git add src/components/cards/ActivityStyleRowCard.tsx src/components/cards/__tests__/ActivityStyleRowCard.test.tsx src/screens/DashboardScreen.tsx src/screens/TasksScreen.tsx src/ui/viewAdapters/useTasksViewAdapter.ts src/screens/__tests__/DashboardScreen.test.tsx src/screens/__tests__/TasksScreen.test.tsx src/__tests__/integration/activity-home.integration.test.tsx src/__tests__/integration/TasksScreenInteraction.test.tsx docs/superpowers/specs/2026-07-07-shared-activity-style-card-design.md docs/superpowers/plans/2026-07-07-shared-activity-style-card-implementation.md
git commit -m "feat(ui): share activity-style cards across lists"
```

- [ ] **Step 4: Validate in the running app**

Check:
- `Activity` and `Tasks` use the same card shell proportions
- both surfaces show the left photo rail
- rows with missing photos show a placeholder rail with a no-photo icon
- real photos still render when available
- row taps still open the expected task

- [ ] **Step 5: Push after verification**

Run: `git push`

Expected: branch updates successfully
