# StandardHeader Top Spacing Analysis

## Current Situation

All 15 screens use `StandardHeader`, but they have **inconsistent top spacing** due to different `SafeAreaView` configurations.

## The Problem

`StandardHeader` calculates top padding as: `insets.top + 8`

However, screens handle SafeAreaView differently:

### Group 1: Excludes Top Edge (Correct - No Double Padding)
These screens exclude the top edge from SafeAreaView, so StandardHeader handles all top spacing:
- **DashboardScreen**: `edges={['bottom', 'left', 'right']}`
- **TasksScreen**: `edges={['bottom', 'left', 'right']}`

**Result**: Top spacing = `insets.top + 8` (from StandardHeader only)

### Group 2: Includes Top Edge (Incorrect - Double Padding)
These screens use default SafeAreaView (includes all edges), causing DOUBLE padding:
- **CreateTaskScreen**: `SafeAreaView` (no edges = all edges)
- **TaskDetailScreen**: `SafeAreaView` (no edges = all edges)
- **ProjectsTasksScreen**: `SafeAreaView` (no edges = all edges)
- **DeveloperSettingsScreen**: `SafeAreaView` (no edges = all edges)
- **UserManagementScreen**: `SafeAreaView` (no edges = all edges)
- **ProjectDetailScreen**: `SafeAreaView` (no edges = all edges)
- **AdminDashboardScreen**: `SafeAreaView` (no edges = all edges)
- **CreateProjectScreen**: `SafeAreaView` (no edges = all edges)
- **ProfileScreen**: `SafeAreaView` (no edges = all edges)
- **ProjectsScreen**: `SafeAreaView` (no edges = all edges)
- **DevAdminScreen**: `SafeAreaView` (no edges = all edges)
- **ReportsScreen**: `SafeAreaView` (no edges = all edges)
- **ProjectPickerScreen**: `SafeAreaView` (no edges = all edges)
- **PendingUsersScreen**: `SafeAreaView` (no edges = all edges)

**Result**: Top spacing = `SafeAreaView top padding` + `insets.top + 8` = **DOUBLE PADDING**

## Spacing Difference

- **Group 1 screens**: `insets.top + 8` (e.g., 59px + 8px = 67px on iPhone with notch)
- **Group 2 screens**: `SafeAreaView padding` + `insets.top + 8` (e.g., 59px + 59px + 8px = 126px)

**Difference**: ~59px extra spacing on Group 2 screens!

## Solution

Standardize all screens to exclude top edge from SafeAreaView, letting StandardHeader handle all top spacing consistently.



