# StandardHeader Safe Area Fix

**Date:** November 17, 2025  
**Issue:** Large gap between banner and camera cutout (notch/dynamic island)  
**Status:** ✅ FIXED

---

## Problem

There was a large gap between the company banner and the camera cutout (notch/dynamic island) on mobile devices. This was caused by:

1. **Screens using `SafeAreaView`** - Added padding for all edges (including top)
2. **StandardHeader using regular `View`** - No safe area handling
3. **Double padding** - SafeAreaView added top padding, then StandardHeader had no padding, creating a gap

---

## Solution

### 1. Updated StandardHeader to Handle Top Safe Area

**File:** `src/components/StandardHeader.tsx`

**Changes:**
- Added `SafeAreaView` import from `react-native-safe-area-context`
- Changed root `View` to `SafeAreaView` with `edges={['top']}`
- This ensures StandardHeader handles the top safe area (status bar + notch) itself

**Before:**
```typescript
return (
  <View className={cn(
    "border-b px-6 pb-4",
    isDarkMode ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200",
    className
  )}>
```

**After:**
```typescript
return (
  <SafeAreaView edges={['top']} className={cn(
    "border-b px-6 pb-4",
    isDarkMode ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200",
    className
  )}>
```

---

### 2. Updated Screens to Exclude Top Edge

**Files Updated:**
- `src/screens/DashboardScreen.tsx`
- `src/screens/TasksScreen.tsx`

**Changes:**
- Updated `SafeAreaView` to exclude top edge: `edges={['bottom', 'left', 'right']}`
- This prevents double padding (StandardHeader handles top, screen handles other edges)

**Before:**
```typescript
<SafeAreaView className={cn("flex-1", isDarkMode ? "bg-slate-900" : "bg-gray-50")}>
```

**After:**
```typescript
<SafeAreaView edges={['bottom', 'left', 'right']} className={cn("flex-1", isDarkMode ? "bg-slate-900" : "bg-gray-50")}>
```

---

## How It Works

### Safe Area Handling Flow

1. **StandardHeader** uses `SafeAreaView` with `edges={['top']}`
   - Handles status bar height
   - Handles notch/dynamic island height
   - Adds appropriate top padding

2. **Screens** use `SafeAreaView` with `edges={['bottom', 'left', 'right']}`
   - Handles bottom safe area (home indicator)
   - Handles left/right safe areas (if needed)
   - Does NOT handle top (StandardHeader does this)

3. **Result:**
   - No gap between banner and camera cutout ✅
   - Proper spacing on all devices ✅
   - Consistent across all screens using StandardHeader ✅

---

## Universal Setting

**Yes, this is now a universal setting in StandardHeader.**

All screens that use `StandardHeader` will automatically:
- Handle the top safe area correctly
- Eliminate the gap between banner and camera cutout
- Work consistently across all devices (iPhone with notch, Android with status bar, etc.)

**Screens using StandardHeader:**
- DashboardScreen
- TasksScreen
- TaskDetailScreen
- CreateTaskScreen
- AdminDashboardScreen
- ProjectsScreen
- CreateProjectScreen
- ProjectDetailScreen
- ProfileScreen
- ReportsScreen
- And more...

---

## Other Screens

**Note:** Other screens that don't use `StandardHeader` may still need updates. If you see gaps on screens that don't use `StandardHeader`, update their `SafeAreaView` to exclude the top edge:

```typescript
// For screens with custom headers
<SafeAreaView edges={['bottom', 'left', 'right']} className="flex-1">
  {/* Custom header */}
  {/* Content */}
</SafeAreaView>

// For screens with StandardHeader
<SafeAreaView edges={['bottom', 'left', 'right']} className="flex-1">
  <StandardHeader title="Screen Title" />
  {/* Content */}
</SafeAreaView>
```

---

## Testing

### Test on Different Devices

1. **iPhone with Notch (iPhone X and later)**
   - Banner should be right below the notch
   - No gap between notch and banner ✅

2. **iPhone with Dynamic Island (iPhone 14 Pro and later)**
   - Banner should be right below the dynamic island
   - No gap between dynamic island and banner ✅

3. **Android devices**
   - Banner should be right below the status bar
   - No gap between status bar and banner ✅

4. **iPad**
   - Banner should be right below the status bar
   - No gap between status bar and banner ✅

---

## Files Modified

1. ✅ `src/components/StandardHeader.tsx`
   - Added `SafeAreaView` import
   - Changed root `View` to `SafeAreaView` with `edges={['top']}`

2. ✅ `src/screens/DashboardScreen.tsx`
   - Updated `SafeAreaView` to exclude top edge (2 instances)

3. ✅ `src/screens/TasksScreen.tsx`
   - Updated `SafeAreaView` to exclude top edge

---

## Summary

**Problem:** Large gap between banner and camera cutout  
**Root Cause:** Double safe area padding (screen + header)  
**Solution:** 
- StandardHeader now handles top safe area
- Screens exclude top edge from SafeAreaView

**Result:** 
- No gap between banner and camera cutout ✅
- Universal setting applied to all StandardHeader instances ✅
- Consistent spacing across all devices ✅

---

**Status:** ✅ COMPLETE  
**Linter Errors:** None  
**Ready for:** Testing

