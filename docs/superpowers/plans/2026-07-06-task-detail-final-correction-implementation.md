# Task Detail Final Correction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the last Task Detail simulator regressions by moving category into the hero, removing the info-card details section, making thread cards action-first with status in the metadata rail, forcing lead photos to own the card width, and optically centering the bottom camera button between Activity and Tasks before isolating the slice for commit.

**Architecture:** Reuse the current fixed-hero, merged-info-card, unified-thread, and custom tab-button foundations. Make the smallest possible changes in the adapter contracts and renderers so the UI reflects the approved content hierarchy, then tighten the bottom-tab button geometry for optical centering validated on simulator rather than only by equal-flex wrappers.

**Tech Stack:** Expo 54, React Native, React Navigation, TypeScript, Zustand, Jest, React Native Testing Library

---

## File Structure

### Core files to modify

- `src/ui/contracts/viewAdapters.ts`
  Add compact category support to the hero model and explicit thread-row status badge / promoted-headline fields so the renderer does not need to infer content hierarchy ad hoc.

- `src/ui/viewAdapters/useTaskDetailViewAdapter.ts`
  Move `Category` into the hero model, remove `detailRows` usage from the info card payload, and build action-first thread rows that carry a rail status badge plus a promoted headline.

- `src/components/taskDetail/TaskDetailHero.tsx`
  Render the compact category chip alongside the other hero chips.

- `src/components/taskDetail/TaskDetailInfoCard.tsx`
  Remove the `Details` block entirely so the merged card contains only description and delegation.

- `src/components/taskDetail/TaskActivityTimeline.tsx`
  Render the metadata rail in `Date / user / % / status` order, use the promoted action headline instead of the generic event label, and remove the inner visual inset so the lead photo owns the usable card width.

- `src/navigation/AppNavigator.tsx`
  Adjust the camera-tab wrapper geometry so the elevated circular button is optically centered relative to the left and right tabs on device, not just logically wrapped in equal flex slots.

### Tests to modify or add

- `src/ui/viewAdapters/__tests__/useTaskDetailViewAdapter.test.ts`
- `src/components/taskDetail/__tests__/TaskActivityTimeline.test.tsx`
- `src/navigation/__tests__/AppNavigator.bottom-tabs.test.tsx`
- `src/__tests__/integration/TaskDetailAcceptanceUI.test.tsx`
- `src/__tests__/integration/TaskDetailScreen.header.test.tsx`

### Docs to update after implementation

- `docs/superpowers/specs/2026-07-05-task-detail-correction-design.md`
- `docs/superpowers/plans/2026-07-03-ws-ux-01-insite-redesign-execution.md`
- `docs/superpowers/plans/2026-07-06-task-detail-final-correction-implementation.md`

## Task 1: Move category into the hero and remove the info-card details section

**Files:**
- Modify: `src/ui/contracts/viewAdapters.ts`
- Modify: `src/ui/viewAdapters/useTaskDetailViewAdapter.ts`
- Modify: `src/components/taskDetail/TaskDetailHero.tsx`
- Modify: `src/components/taskDetail/TaskDetailInfoCard.tsx`
- Modify: `src/ui/viewAdapters/__tests__/useTaskDetailViewAdapter.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
it("moves category into the hero and removes details rows from the info card", () => {
  const { result } = renderHook(() =>
    useTaskDetailViewAdapter({ taskId: "task-parent" }),
  );

  expect(result.current.output.taskHero.categoryLabel).toBe("General");
  expect(result.current.output.infoCard?.detailRows).toEqual([]);
});
```

```tsx
it("does not render the Details section in the merged info card", () => {
  const screen = render(<TaskDetailScreen taskId="task-1" onNavigateBack={jest.fn()} />);

  expect(screen.queryByText("Details")).toBeNull();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/ui/viewAdapters/__tests__/useTaskDetailViewAdapter.test.ts src/__tests__/integration/TaskDetailAcceptanceUI.test.tsx --runInBand`

Expected: FAIL because the hero model does not yet expose `categoryLabel` and the info card still renders `Details`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/ui/contracts/viewAdapters.ts
export interface TaskDetailHeroModel extends PrimitiveReadyItemBase {
  title: string;
  statusLabel: string;
  projectLabel: string;
  completionLabel: string;
  dueDateLabel?: string;
  categoryLabel?: string;
  nextStepLabel?: undefined;
  assignedByLabel?: string;
  assignedToLabel?: string;
  primaryOwnerLabel?: string;
  teamSummaryLabel?: string;
  isCritical?: boolean;
  criticalLabel?: string;
}
```

```ts
// src/ui/viewAdapters/useTaskDetailViewAdapter.ts
const infoCard: TaskDetailInfoCardModel = {
  id: "task-info-card",
  density: "standard",
  structuralState: "stale",
  descriptionLabel: task.description || "",
  assignedByLabel: delegationSummary.assignedByLabel,
  assignedToLabel: delegationSummary.assignedToLabel,
  primaryOwnerLabel: delegationSummary.primaryOwnerLabel,
  detailRows: [],
};

const taskHero: TaskDetailHeroModel = {
  id: "task-hero",
  density: "standard",
  structuralState: "stale",
  title: task.title,
  statusLabel: getStatusLabel(task.status),
  projectLabel: task.projectId || "Unknown Project",
  completionLabel: `${task.completionPercentage}% complete`,
  dueDateLabel: task.dueDate ? dateFormatter.formatDateShort(task.dueDate) : undefined,
  categoryLabel: task.category || "General",
  nextStepLabel: undefined,
  isCritical: isCriticalThisWeek,
  criticalLabel: isCriticalThisWeek ? "Critical this week" : undefined,
};
```

```tsx
// src/components/taskDetail/TaskDetailHero.tsx
{model.categoryLabel ? (
  <View className="rounded-full bg-white/10 px-3 py-1.5">
    <Text className="text-base font-medium text-slate-100">{model.categoryLabel}</Text>
  </View>
) : null}
```

```tsx
// src/components/taskDetail/TaskDetailInfoCard.tsx
export default function TaskDetailInfoCard({ model }: TaskDetailInfoCardProps) {
  return (
    <View testID="task-detail__info_card" className="mx-4 mt-4 rounded-3xl border border-slate-200 bg-white p-4">
      <View>
        <Text className="text-base font-semibold uppercase tracking-[1.2px] text-slate-500">Description</Text>
        <Text className="mt-2 text-lg leading-7 text-slate-700">{model.descriptionLabel || "—"}</Text>
      </View>
      <View className="mt-5">
        <Text className="text-base font-semibold uppercase tracking-[1.2px] text-slate-500">Delegation</Text>
        <View className="mt-3 gap-3">
          <InfoRow label="Assigned by" value={model.assignedByLabel} />
          <InfoRow label="Assigned to" value={model.assignedToLabel} />
          {model.primaryOwnerLabel ? <InfoRow label="Primary owner" value={model.primaryOwnerLabel} /> : null}
        </View>
      </View>
    </View>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/ui/viewAdapters/__tests__/useTaskDetailViewAdapter.test.ts src/__tests__/integration/TaskDetailAcceptanceUI.test.tsx --runInBand`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/ui/contracts/viewAdapters.ts src/ui/viewAdapters/useTaskDetailViewAdapter.ts src/components/taskDetail/TaskDetailHero.tsx src/components/taskDetail/TaskDetailInfoCard.tsx src/ui/viewAdapters/__tests__/useTaskDetailViewAdapter.test.ts src/__tests__/integration/TaskDetailAcceptanceUI.test.tsx
git commit -m "fix(ux): move task category into hero"
```

## Task 2: Make work-thread cards action-first with a rail status badge and full-width lead photos

**Files:**
- Modify: `src/ui/contracts/viewAdapters.ts`
- Modify: `src/ui/viewAdapters/useTaskDetailViewAdapter.ts`
- Modify: `src/components/taskDetail/TaskActivityTimeline.tsx`
- Modify: `src/components/taskDetail/__tests__/TaskActivityTimeline.test.tsx`
- Modify: `src/__tests__/integration/TaskDetailScreen.header.test.tsx`

- [ ] **Step 1: Write the failing tests**

```tsx
it("renders metadata in the order date, user, progress, then status", () => {
  const screen = render(
    <TaskActivityTimeline
      thread={[
        {
          id: "activity-1",
          actorLabel: "Tristan",
          eventLabel: "Changed status to In Progress",
          headlineLabel: "Task accepted by Tristan",
          timestampLabel: "Jul 5, 09:30",
          progressLabel: "40%",
          statusLabel: "In Progress",
          photoUrls: [],
          density: "standard",
          structuralState: "ready",
        },
      ]}
    />,
  );

  expect(getRailMetadataValues(screen.getByTestId("task-activity-timeline__rail-metadata-activity-1"))).toEqual([
    "Jul 5, 09:30",
    "Tristan",
    "40%",
    "In Progress",
  ]);
});
```

```tsx
it("uses the promoted headline and removes the inner inset wrapper from the lead photo", () => {
  const screen = render(
    <TaskActivityTimeline
      thread={[
        {
          id: "activity-2",
          actorLabel: "Tristan",
          eventLabel: "Changed status to In Progress",
          headlineLabel: "Task accepted by Tristan",
          timestampLabel: "Jul 5, 09:30",
          progressLabel: "40%",
          statusLabel: "In Progress",
          detailLabel: "Started site setup.",
          photoUrls: ["https://example.com/photo-1.jpg"],
          density: "standard",
          structuralState: "ready",
        },
      ]}
    />,
  );

  expect(screen.getByText("Task accepted by Tristan")).toBeTruthy();
  expect(screen.queryByText("Changed status to In Progress")).toBeNull();
  expect(screen.getByTestId("task-activity-timeline__lead-photo-shell-activity-2").props.className).toContain("mx-[-16px]");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/components/taskDetail/__tests__/TaskActivityTimeline.test.tsx src/__tests__/integration/TaskDetailScreen.header.test.tsx --runInBand`

Expected: FAIL because thread rows do not yet expose `headlineLabel`, rail metadata only has three values, and the photo shell still keeps an inset look.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/ui/contracts/viewAdapters.ts
export interface TaskDetailActivityThreadRow extends PrimitiveReadyItemBase {
  id: string;
  actorLabel: string;
  eventLabel: string;
  headlineLabel?: string;
  timestampLabel: string;
  progressLabel: string;
  detailLabel?: string;
  photoUrls: string[];
  statusLabel?: string;
  subtaskBadgeLabel?: string;
  subtaskTitleLabel?: string;
}
```

```ts
// src/ui/viewAdapters/useTaskDetailViewAdapter.ts
function buildTaskDetailHeadline(activity: TaskActivity): string | undefined {
  const trimmedDescription = activity.description?.trim();
  if (trimmedDescription) {
    return trimmedDescription;
  }

  const reason = (activity.data as { reason?: string } | undefined)?.reason?.trim();
  return reason || undefined;
}

const activityThread: TaskDetailActivityThreadRow[] = combinedActivities.map(({ activity, childTask }) => ({
  id: activity.id,
  density: "standard",
  structuralState: "stale",
  actorLabel: getUserById(activity.userId)?.name || "Unknown User",
  eventLabel: buildTaskDetailEventLabel(activity),
  headlineLabel: buildTaskDetailHeadline(activity) || buildTaskDetailEventLabel(activity),
  timestampLabel: buildTaskDetailTimestampLabel(activity, dateFormatter),
  progressLabel:
    activity.completionPercentage !== undefined
      ? `${activity.completionPercentage}%`
      : `${childTask?.completionPercentage ?? task.completionPercentage}%`,
  detailLabel: buildTaskDetailEventDetail(activity),
  photoUrls: collectActivityPhotoUrls(activity),
  statusLabel: activity.status ? getStatusLabel(activity.status) : undefined,
  subtaskBadgeLabel: childTask ? "Subtask" : undefined,
  subtaskTitleLabel: childTask?.title,
}));
```

```tsx
// src/components/taskDetail/TaskActivityTimeline.tsx
<View testID={`task-activity-timeline__rail-metadata-${activity.id}`} className="mb-2 flex-row flex-wrap items-center gap-x-3 gap-y-1">
  <Text className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-400">{activity.timestampLabel}</Text>
  <Text className="text-base font-medium text-slate-700">{activity.actorLabel}</Text>
  <Text className="text-base font-semibold text-slate-900">{activity.progressLabel}</Text>
  {activity.statusLabel ? (
    <View className="rounded-full bg-slate-200 px-2.5 py-1">
      <Text className="text-sm font-semibold text-slate-700">{activity.statusLabel}</Text>
    </View>
  ) : null}
</View>

<Text className="mb-3 text-lg font-semibold text-slate-900">
  {activity.headlineLabel || activity.eventLabel}
</Text>

<View
  testID={`task-activity-timeline__lead-photo-shell-${activity.id}`}
  className={activity.detailLabel ? "mx-[-16px] mb-3" : "mx-[-16px]"}
>
  <Pressable
    testID={`task-activity-timeline__lead-photo-pressable-${activity.id}`}
    accessibilityRole="button"
    onPress={() => openGallery(activity.photoUrls, 0)}
  >
    <Image
      testID={`task-activity-timeline__lead-photo-${activity.id}`}
      accessibilityLabel={`Lead photo for ${activity.headlineLabel || activity.eventLabel}`}
      source={{ uri: activity.photoUrls[0] }}
      resizeMode="contain"
      className="h-44 w-full bg-slate-200"
    />
  </Pressable>
</View>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/components/taskDetail/__tests__/TaskActivityTimeline.test.tsx src/__tests__/integration/TaskDetailScreen.header.test.tsx --runInBand`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/ui/contracts/viewAdapters.ts src/ui/viewAdapters/useTaskDetailViewAdapter.ts src/components/taskDetail/TaskActivityTimeline.tsx src/components/taskDetail/__tests__/TaskActivityTimeline.test.tsx src/__tests__/integration/TaskDetailScreen.header.test.tsx
git commit -m "fix(ux): promote task thread actions and photos"
```

## Task 3: Optically center the bottom camera button on-device

**Files:**
- Modify: `src/navigation/AppNavigator.tsx`
- Modify: `src/navigation/__tests__/AppNavigator.bottom-tabs.test.tsx`

- [ ] **Step 1: Write the failing tests**

```tsx
it("keeps the camera slot equal to the outer tabs and centers the camera button inside that slot", () => {
  const screen = render(<AppNavigator />);

  expect(screen.getByTestId("root-tab__activity")).toHaveStyle({ flex: 1 });
  expect(screen.getByTestId("root-tab__camera")).toHaveStyle({ flex: 1 });
  expect(screen.getByTestId("root-tab__tasks")).toHaveStyle({ flex: 1 });
  expect(screen.getByTestId("root-tab__camera_slot")).toHaveStyle({ alignItems: "center", justifyContent: "center" });
  expect(screen.getByTestId("root-tab__camera_button")).toHaveStyle({ alignSelf: "center", left: 0 });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/navigation/__tests__/AppNavigator.bottom-tabs.test.tsx --runInBand`

Expected: FAIL because the current camera button geometry can still be optically offset on device.

- [ ] **Step 3: Write minimal implementation**

```tsx
// src/navigation/AppNavigator.tsx
function CenterCameraTabButton({
  accessibilityLabel,
  accessibilityState,
  children,
  onLongPress,
  onPress,
  icon,
  style,
}: BottomTabBarButtonProps & { icon: React.ReactNode }) {
  const isFocused = accessibilityState?.selected === true;
  const tabButtonStyle = style as StyleProp<ViewStyle>;

  return (
    <View pointerEvents="box-none" style={styles.rootTabSlot} testID="root-tab__camera">
      <View pointerEvents="box-none" style={styles.centerCameraTabButtonSlot} testID="root-tab__camera_slot">
        <Pressable
          accessibilityLabel={accessibilityLabel}
          accessibilityRole="button"
          accessibilityState={accessibilityState}
          onLongPress={onLongPress}
          onPress={onPress}
          testID="root-tab__camera_button"
          style={[tabButtonStyle, styles.centerCameraTabButton, isFocused ? styles.centerCameraTabButtonFocused : null]}
        >
          <View pointerEvents="none" style={styles.centerCameraTabIconSurface} testID="root-tab__camera_icon_surface">
            {icon}
          </View>
          {children}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  rootTabSlot: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  centerCameraTabButtonSlot: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    width: "100%",
  },
  centerCameraTabButton: {
    alignItems: "center",
    alignSelf: "center",
    left: 0,
    backgroundColor: "#dc2626",
    borderColor: "#ffffff",
    borderRadius: 32,
    borderWidth: 4,
    elevation: 8,
    height: 64,
    justifyContent: "center",
    minWidth: 64,
    shadowColor: "#7f1d1d",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
    top: -16,
    width: 64,
  },
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/navigation/__tests__/AppNavigator.bottom-tabs.test.tsx --runInBand`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/navigation/AppNavigator.tsx src/navigation/__tests__/AppNavigator.bottom-tabs.test.tsx
git commit -m "fix(ux): center camera tab affordance"
```

## Task 4: Validate on tests and simulators, then isolate and commit only this slice

**Files:**
- Modify: `docs/superpowers/plans/2026-07-03-ws-ux-01-insite-redesign-execution.md`
- Modify: `docs/superpowers/plans/2026-07-06-task-detail-final-correction-implementation.md`

- [ ] **Step 1: Run the focused validation suite**

Run: `npx jest src/ui/viewAdapters/__tests__/useTaskDetailViewAdapter.test.ts src/components/taskDetail/__tests__/TaskActivityTimeline.test.tsx src/__tests__/integration/TaskDetailAcceptanceUI.test.tsx src/__tests__/integration/TaskDetailScreen.header.test.tsx src/navigation/__tests__/AppNavigator.bottom-tabs.test.tsx --runInBand && npx tsc --noEmit`

Expected: PASS

- [ ] **Step 2: Relaunch Metro and both booted simulators**

Run: `pkill -f "expo start --dev-client" || true && env -u CI npx expo start --dev-client --clear`

Expected: Metro restarts on `http://localhost:8081`

Run: `xcrun simctl list devices booted`

Expected: both `iPhone 17 Pro` and `iPhone 17 Pro Max` are listed as booted

Run: `xcrun simctl terminate "1BEE670D-D2EE-4ED8-8B95-E23476A20CAB" com.buildtrack.app.local || true && xcrun simctl launch "1BEE670D-D2EE-4ED8-8B95-E23476A20CAB" com.buildtrack.app.local && xcrun simctl terminate "B5CF60DE-CEC7-4A09-814F-F40ED7E8638E" com.buildtrack.app.local || true && xcrun simctl launch "B5CF60DE-CEC7-4A09-814F-F40ED7E8638E" com.buildtrack.app.local`

Expected: both launches succeed

- [ ] **Step 3: Update the execution ledger**

```md
- moved `Category` into the fixed hero and removed the merged info-card details section
- changed work-thread cards to action-first headlines with status shown in the metadata rail
- removed the inner photo inset so lead images occupy the usable thread-card width
- adjusted the camera tab geometry for true optical centering on simulator
- revalidated the refinement pass on tests and on both booted simulators
```

- [ ] **Step 4: Isolate and commit only this slice**

```bash
git add docs/superpowers/specs/2026-07-05-task-detail-correction-design.md docs/superpowers/plans/2026-07-06-task-detail-final-correction-implementation.md docs/superpowers/plans/2026-07-03-ws-ux-01-insite-redesign-execution.md src/ui/contracts/viewAdapters.ts src/ui/viewAdapters/useTaskDetailViewAdapter.ts src/components/taskDetail/TaskDetailHero.tsx src/components/taskDetail/TaskDetailInfoCard.tsx src/components/taskDetail/TaskActivityTimeline.tsx src/components/taskDetail/__tests__/TaskActivityTimeline.test.tsx src/ui/viewAdapters/__tests__/useTaskDetailViewAdapter.test.ts src/__tests__/integration/TaskDetailAcceptanceUI.test.tsx src/__tests__/integration/TaskDetailScreen.header.test.tsx src/navigation/AppNavigator.tsx src/navigation/__tests__/AppNavigator.bottom-tabs.test.tsx
git commit -m "fix(ux): finalize task detail correction pass"
```

Expected: the commit contains only the final correction files above, without unrelated dashboard/header/navigation work.

## Spec Coverage Check

- move category into the hero and remove the info-card details section: Task 1
- action-first thread hierarchy with status in the rail: Task 2
- full-width lead photo behavior: Task 2
- optical bottom-nav centering verified on simulator: Task 3 and Task 4
- isolated slice commit: Task 4

## Placeholder Scan

- No `TBD` / `TODO`
- No “similar to Task N” shortcuts
- All file paths are explicit
- Each code-changing step includes concrete code
- Each verification step includes exact commands and expected outcomes

## Type Consistency Check

- `categoryLabel` is introduced in `TaskDetailHeroModel` and rendered in `TaskDetailHero.tsx`
- `headlineLabel` is introduced in `TaskDetailActivityThreadRow`, built in the adapter, and consumed in `TaskActivityTimeline.tsx`
- the rail metadata order and `statusLabel` usage stay aligned between adapter output and timeline tests
