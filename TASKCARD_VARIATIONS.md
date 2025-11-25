# Task Card Variations

The application uses a single `TaskCard` component that adapts its appearance based on task properties. Here are all the different visual variations:

## Base Structure

All task cards share the same base structure:
- **White card** (dark mode: slate-800) with rounded corners
- **Title** with optional star icon
- **Due date** (left), **Completion status** (center), **Priority badge** (right)
- **Assigner → Assignees** information at the bottom
- Optional **image attachment** on the right side

---

## 1. **Regular Top-Level Task Card**

**Visual Features:**
- Standard white card with border
- Title with star icon (outline if not starred)
- Due date, completion percentage, priority badge
- Assigner → Assignees display
- No special header banners

**When it appears:**
- Top-level tasks (no `parentTaskId`)
- Not delegated
- Standard task state

---

## 2. **Sub-task Card** 🟣

**Visual Features:**
- **Purple header banner** at the top with:
  - Git-branch icon
  - "Sub-task" label
  - Purple background (purple-50 in light mode, purple-900/40 in dark mode)
- All standard task card features below the header

**When it appears:**
- Task has `parentTaskId` (is a nested task)
- Shown indented under parent tasks in lists
- Can also appear as standalone if parent isn't in the current list

**Code Reference:**
```tsx
{isSubTask && (
  <View className="bg-purple-50">
    <Ionicons name="git-branch-outline" />
    <Text>Sub-task</Text>
  </View>
)}
```

---

## 3. **Delegated Task Card** 🟠

**Visual Features:**
- **Amber/Orange header banner** at the top with:
  - Arrow-forward-circle icon
  - "Delegated from [User Name]" text
  - Optional delegation reason (if provided)
  - Amber background (amber-50 in light mode, amber-900/40 in dark mode)
- All standard task card features below the header

**When it appears:**
- Task has `delegationHistory` array with entries
- Only shown on top-level tasks (not sub-tasks)
- Indicates the task was passed from one user to another

**Code Reference:**
```tsx
{isDelegated && !isSubTask && (
  <View className="bg-amber-50">
    <Ionicons name="arrow-forward-circle" />
    <Text>Delegated from {delegatedFromUser?.name}</Text>
  </View>
)}
```

---

## 4. **Completed Task Card** (Closed) ✅

**Visual Features:**
- **Green status bubble** in the center (replaces completion percentage):
  - Green background (green-500)
  - Checkmark-circle icon
  - "Closed" text in white
- All other standard features

**When it appears:**
- `completionPercentage === 100`
- `reviewAccepted === true` (task was accepted by creator)

**Code Reference:**
```tsx
{isCompleted && task.reviewAccepted ? (
  <View className="bg-green-500">
    <Ionicons name="checkmark-circle" />
    <Text>Closed</Text>
  </View>
) : ...}
```

---

## 5. **Reviewing Task Card** (Pending Review) 👁️

**Visual Features:**
- **Blue status bubble** in the center (replaces completion percentage):
  - Blue background (blue-500)
  - Eye icon
  - "Reviewing" text in white
- All other standard features

**When it appears:**
- `completionPercentage === 100`
- `readyForReview === true` (task submitted for review)
- `reviewAccepted !== true` (not yet accepted)

**Code Reference:**
```tsx
{isCompleted && task.readyForReview ? (
  <View className="bg-blue-500">
    <Ionicons name="eye" />
    <Text>Reviewing</Text>
  </View>
) : ...}
```

---

## 6. **In-Progress Task Card** (Standard)

**Visual Features:**
- **Plain text completion percentage** in the center:
  - "Comp. X%" text
  - Gray color (slate-400 in dark mode, gray-500 in light mode)
- All other standard features

**When it appears:**
- `completionPercentage < 100` OR
- `completionPercentage === 100` but `readyForReview !== true` and `reviewAccepted !== true`

**Code Reference:**
```tsx
<Text>Comp. {task.completionPercentage}%</Text>
```

---

## 7. **Starred Task Card** ⭐

**Visual Features:**
- **Filled star icon** (golden/yellow) instead of outline
- All other standard features

**When it appears:**
- Current user's ID is in `task.starredByUsers` array
- User can toggle star by clicking the star icon

**Code Reference:**
```tsx
<Ionicons
  name={isStarred ? "star" : "star-outline"}
  color={isStarred ? "#f59e0b" : "#9ca3af"}
/>
```

---

## 8. **Task Card with Image Attachment** 📷

**Visual Features:**
- **Image thumbnail** on the right side (80x80px, rounded)
- **Badge overlay** showing "+X" if multiple attachments
- All other standard features

**When it appears:**
- Task has `attachments` array with at least one URL
- Shows first attachment as thumbnail
- If image fails to load, shows placeholder icon

**Code Reference:**
```tsx
{task.attachments && task.attachments.length > 0 && (
  <Image source={{ uri: task.attachments[0] }} />
  {task.attachments.length > 1 && (
    <View className="bg-black/70">
      <Text>+{task.attachments.length - 1}</Text>
    </View>
  )}
)}
```

---

## 9. **Priority Badge Variations**

The priority badge appears in the top-right corner with different colors:

- **Critical**: Red (red-600 text, red-50 background, red-200 border)
- **High**: Orange (orange-600 text, orange-50 background, orange-200 border)
- **Medium**: Yellow (yellow-600 text, yellow-50 background, yellow-200 border)
- **Low**: Green (green-600 text, green-50 background, green-200 border)

---

## Combination Examples

Task cards can combine multiple features:

1. **Sub-task + Reviewing**: Purple header + Blue "Reviewing" bubble
2. **Delegated + Completed**: Amber header + Green "Closed" bubble
3. **Starred + Image**: Filled star + Image thumbnail
4. **Sub-task + Starred + Reviewing**: All three features together

---

## Visual Hierarchy

1. **Header Banners** (if present):
   - Sub-task banner (purple) - highest priority
   - Delegation banner (amber) - only if not sub-task

2. **Main Content**:
   - Star + Title
   - Due date | Status | Priority
   - Assigner → Assignees

3. **Side Content**:
   - Image attachment (if present)

---

## Summary Table

| Feature | Visual Indicator | Condition |
|---------|-----------------|----------|
| Sub-task | Purple header with branch icon | `parentTaskId` exists |
| Delegated | Amber header with arrow icon | `delegationHistory.length > 0` |
| Completed | Green "Closed" bubble | `100%` + `reviewAccepted === true` |
| Reviewing | Blue "Reviewing" bubble | `100%` + `readyForReview === true` |
| In-Progress | Plain "Comp. X%" text | `completionPercentage < 100` or not reviewed |
| Starred | Filled gold star | User ID in `starredByUsers` |
| Has Image | Image thumbnail on right | `attachments.length > 0` |
| Multiple Images | "+X" badge on image | `attachments.length > 1` |

---

## Code Location

All variations are handled in a single component:
- **File**: `src/components/TaskCard.tsx`
- **Component**: `TaskCard`
- **Props**: `task: Task`, `onNavigateToTaskDetail`, `className?`

The component automatically adapts based on task properties - no separate components needed!

