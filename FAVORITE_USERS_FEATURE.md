# Favorite Users Feature

## Overview
Implemented a favorite users feature that allows users to mark team members as favorites. Favorite users are displayed with a star icon and automatically sorted to the top of all user selection lists.

## Changes Made

### 1. New User Preferences Store
**File**: `src/state/userPreferencesStore.ts`

Created a new Zustand store to manage user-specific preferences:
- Stores favorite users per user (persisted to AsyncStorage)
- Provides methods to:
  - `getFavoriteUsers(userId)` - Get list of favorite user IDs
  - `toggleFavoriteUser(currentUserId, targetUserId)` - Toggle favorite status
  - `isFavoriteUser(currentUserId, targetUserId)` - Check if a user is favorited

### 2. Updated CreateTaskScreen
**File**: `src/screens/CreateTaskScreen.tsx`

- Imported `useUserPreferencesStore`
- Updated `filteredAssignableUsers` to sort favorites to the top
- Replaced the right-side checkmark-circle with a clickable star icon:
  - Filled yellow star (`star`) for favorited users
  - Outline gray star (`star-outline`) for non-favorited users
- Star is clickable independently of the user selection (uses `e.stopPropagation()`)

### 3. Updated TaskDetailScreen
**File**: `src/screens/TaskDetailScreen.tsx`

Updated the reassign task modal:
- Imported `useUserPreferencesStore`
- Sorted filtered users to show favorites at the top
- Added clickable star icon next to each user
- Star toggles favorite status without affecting user selection

### 4. Updated ProjectDetailScreen
**File**: `src/screens/ProjectDetailScreen.tsx`

Updated the Add Member modal:
- Imported `useUserPreferencesStore`
- Updated `availableUsers` to sort favorites to the top
- Added star icon next to the checkbox for each user
- Star is independently clickable to toggle favorite status

## User Experience

### Visual Changes
- **Before**: Users saw a blue checkmark-circle on the right side when selected
- **After**: Users see:
  - Checkbox on the left (unchanged)
  - Star icon on the right:
    - ⭐ Yellow filled star for favorites
    - ☆ Gray outline star for non-favorites

### Behavior
1. **Clicking the star**: Toggles favorite status (persisted across sessions)
2. **Clicking the user row**: Selects/deselects the user for assignment (unchanged)
3. **Sorting**: Favorite users automatically appear at the top of every user list
4. **Persistence**: Favorite preferences are stored per user and persist across app sessions

## Technical Details

### Storage
- Favorites are stored in AsyncStorage using Zustand persist middleware
- Storage key: `buildtrack-user-preferences`
- Data structure: `{ favoriteUsersByUser: { [userId]: [favoriteUserId1, favoriteUserId2, ...] } }`

### Sorting Logic
```typescript
if (user?.id) {
  return [...filtered].sort((a, b) => {
    const aIsFavorite = isFavoriteUser(user.id, a.id);
    const bIsFavorite = isFavoriteUser(user.id, b.id);
    
    if (aIsFavorite && !bIsFavorite) return -1;
    if (!aIsFavorite && bIsFavorite) return 1;
    return 0; // Keep original order for non-favorites
  });
}
```

### Event Handling
The star uses `e.stopPropagation()` to prevent triggering the parent Pressable's selection logic:
```typescript
<Pressable
  onPress={(e) => {
    e.stopPropagation();
    if (user?.id) {
      toggleFavoriteUser(user.id, targetUserId);
    }
  }}
>
  <Ionicons 
    name={isFavorite ? "star" : "star-outline"} 
    size={24} 
    color={isFavorite ? "#fbbf24" : "#9ca3af"} 
  />
</Pressable>
```

## Affected Screens

1. **Create Task Screen** - User assignment modal
2. **Task Detail Screen** - Reassign task modal
3. **Project Detail Screen** - Add team members modal

All three screens now consistently show the star icon and sort favorites to the top.

## Future Enhancements

Potential improvements:
- Add a "Favorites" filter to show only favorite users
- Add visual indicator (badge) showing how many favorites a user has
- Sync favorites to backend (currently only stored locally)
- Add bulk favorite management screen


