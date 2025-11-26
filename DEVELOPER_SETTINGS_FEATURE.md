# Developer Settings Feature

## Summary

Added a comprehensive **Developer Settings** screen to make testing and data management easier.

## What Was Added

### 1. New Screen: `DeveloperSettingsScreen.tsx`
Located at: `src/screens/DeveloperSettingsScreen.tsx`

Features:
- 📊 **Data Statistics** - View counts of all cached data
- 🔄 **Force Sync** - Re-fetch all data from Supabase
- 🗑️ **Selective Cache Clear** - Clear tasks, projects, or users individually
- 🔍 **Debug Tools** - View all AsyncStorage keys
- ⚠️ **Nuclear Option** - Clear all data and logout

### 2. Navigation Integration
- Added to Profile Stack in `AppNavigator.tsx`
- Accessible from Profile screen
- New navigation prop: `onNavigateToDeveloperSettings`

### 3. Profile Screen Update
- Added "Developer" section with link to Developer Settings
- Uses code-slash icon for developer tools

## How to Use

### Quick Access
```
Dashboard → Profile (tap avatar) → Developer Settings
```

### Main Features

#### Clear All Data (Recommended for Testing)
1. Open Developer Settings
2. Scroll to "Danger Zone"
3. Tap "Clear All Local Data & Logout"
4. Confirm
5. Login again with fresh data

#### Force Sync (Quick Refresh)
1. Open Developer Settings
2. Tap "Force Sync All Data"
3. Data refreshes without logout

#### Selective Clear
1. Open Developer Settings
2. Choose what to clear:
   - Clear Task Cache
   - Clear Project Cache
   - Clear User Cache
3. Data re-syncs automatically

## Technical Implementation

### AsyncStorage Keys Managed
```typescript
- buildtrack-auth
- buildtrack-tasks
- buildtrack-users
- buildtrack-projects
- buildtrack-companies
- buildtrack-project-filter
- buildtrack-theme
- buildtrack-language
```

### Store Integration
Uses all main Zustand stores:
- `useAuthStore` - Authentication
- `useTaskStore` - Tasks
- `useProjectStore` - Projects
- `useUserStore` - Users
- `useCompanyStore` - Companies
- `useProjectFilterStore` - Filters
- `useThemeStore` - Theme
- `useLanguageStore` - Language

### Safety Features
- Confirmation dialogs for destructive actions
- Clear warnings about data loss
- Disabled state during operations
- Error handling with user feedback

## UI/UX Design

### Color-Coded Actions
- 🔵 **Blue** - Sync/refresh actions (safe)
- 🟠 **Orange** - Cache clearing (moderate)
- 🟣 **Purple** - Debug tools (informational)
- 🔴 **Red** - Destructive actions (dangerous)

### Visual Hierarchy
1. Warning banner at top
2. Data statistics (informational)
3. Safe actions (sync)
4. Moderate actions (cache clear)
5. Debug tools
6. Danger zone (destructive)

### Dark Mode Support
- Full dark mode compatibility
- Color adjustments for visibility
- Consistent with app theme

## Files Modified

### New Files
- `src/screens/DeveloperSettingsScreen.tsx` - Main screen
- `DATA_RESET_GUIDE.md` - User documentation

### Modified Files
- `src/navigation/AppNavigator.tsx` - Added navigation
- `src/screens/ProfileScreen.tsx` - Added menu link

## Testing Checklist

- [x] Screen renders correctly
- [x] Navigation works from Profile
- [x] Data statistics display correctly
- [x] Force sync works without logout
- [x] Selective cache clear works
- [x] Clear all data logs out properly
- [x] View storage keys shows all keys
- [x] Dark mode styling correct
- [x] Confirmation dialogs work
- [x] Error handling works
- [x] No linter errors

## Benefits

### For Developers
- ✅ Easy data reset during testing
- ✅ No need to reinstall app
- ✅ Quick debugging tools
- ✅ Selective cache management
- ✅ View storage state

### For Testers
- ✅ Simple UI for data management
- ✅ Clear instructions and warnings
- ✅ Safe operations with confirmations
- ✅ No technical knowledge required

### For Development Workflow
- ✅ Faster test cycles
- ✅ Easy fresh starts
- ✅ Better debugging capabilities
- ✅ Reduced app reinstalls

## Future Enhancements (Optional)

Potential additions:
- Export data to JSON
- Import test data
- Database environment switcher
- Performance metrics
- Network request logs
- Cache size display
- Auto-clear on schedule

## Documentation

See `DATA_RESET_GUIDE.md` for:
- Detailed usage instructions
- Testing workflows
- Troubleshooting guide
- Quick reference table

---

**Created:** November 15, 2024
**Status:** ✅ Complete and Ready to Use




