# Dashboard Screen Spacing Structure

## Component Hierarchy

```
DashboardScreen
├── SafeAreaView (edges: ['bottom', 'left', 'right'])  ← NO TOP EDGE
│   ├── StatusBar (style: "light" | "dark")
│   │
│   └── StandardHeader
│       └── View (paddingTop: topPadding)  ← THIS IS WHERE SPACING IS SET
│           ├── Company Banner (if visible)
│           │   └── mb-2 (margin-bottom: 8px)
│           │
│           └── Header Content
│               ├── Title: "Dashboard"
│               ├── Subtitle: "Test Project" (if exists)
│               └── Right Element: User info
│
│   └── ScrollView (main content)
│       └── Dashboard cards...
```

## Spacing Variables

### 1. SafeAreaView Configuration
**Location:** `src/screens/DashboardScreen.tsx:653`

```typescript
<SafeAreaView edges={['bottom', 'left', 'right']} className="flex-1">
```

**Key Point:** 
- ❌ **NO 'top' edge** - This means SafeAreaView does NOT add top padding
- Only bottom, left, and right edges have safe area padding
- Top spacing is handled entirely by StandardHeader

### 2. StatusBar
**Location:** `src/screens/DashboardScreen.tsx:654`

```typescript
<StatusBar style={isDarkMode ? "light" : "dark"} />
```

**Spacing Impact:**
- StatusBar itself doesn't add spacing
- It overlays the content area
- The spacing comes from StandardHeader's paddingTop

### 3. StandardHeader - Top Padding Calculation
**Location:** `src/components/StandardHeader.tsx:65-72`

```typescript
const insets = useSafeAreaInsets();  // Gets safe area insets

// Current logic (as of latest fix):
const topPadding = insets.top > 0 ? 50 : 44;

// Applied as:
<View style={{ paddingTop: topPadding }}>
```

**Variables Involved:**
- `insets.top` - Safe area inset from top (varies by device/simulator)
  - iPhone 17 Pro: Typically 59px (Dynamic Island)
  - But simulators may report: 44px, 47px, 50px, 59px, etc.
- `topPadding` - Calculated padding value
  - Current: `insets.top > 0 ? 50 : 44`
  - This should give 50px for all devices with any top inset

### 4. StandardHeader - Internal Spacing
**Location:** `src/components/StandardHeader.tsx:74-79`

```typescript
<View className={cn(
  "border-b px-6 pb-4",  // px-6 = 24px horizontal, pb-4 = 16px bottom
  ...
)} style={{ paddingTop: topPadding }}>
```

**Spacing Breakdown:**
- `paddingTop: topPadding` - Dynamic (50px for iPhone 17 Pro)
- `px-6` - 24px horizontal padding
- `pb-4` - 16px bottom padding
- `border-b` - 1px bottom border

### 5. Company Banner Spacing (if visible)
**Location:** `src/components/StandardHeader.tsx:82-106`

```typescript
{banner && banner.isVisible && (
  <View className="mb-2">  {/* mb-2 = 8px margin-bottom */}
    {/* Banner content */}
  </View>
)}
```

**Spacing:**
- `mb-2` - 8px margin-bottom between banner and title

## Complete Spacing Flow

```
┌─────────────────────────────────────┐
│ Status Bar (overlay, no spacing)   │ ← insets.top space starts here
│                                     │
│ [TOP PADDING: topPadding]          │ ← StandardHeader paddingTop
│                                     │   = 50px (if insets.top > 0)
│                                     │   = 44px (if insets.top === 0)
│ ┌─────────────────────────────────┐ │
│ │ StandardHeader                 │ │
│ │  ┌───────────────────────────┐│ │
│ │  │ Company Banner (if any)    ││ │ ← mb-2 (8px) if visible
│ │  └───────────────────────────┘│ │
│ │  ┌───────────────────────────┐│ │
│ │  │ Dashboard Title            ││ │
│ │  │ Test Project (subtitle)    ││ │
│ │  │ Herman Worker [H]          ││ │
│ │  └───────────────────────────┘│ │
│ └─────────────────────────────────┘ │
│                                     │ ← pb-4 (16px) bottom padding
│ ─────────────────────────────────── │ ← border-b (1px)
│                                     │
│ ScrollView Content                  │
│ ...                                 │
└─────────────────────────────────────┘
```

## Potential Issues

### Issue 1: `insets.top` Variation
**Problem:** Different simulators may report different `insets.top` values:
- Simulator A: `insets.top = 44px` → `topPadding = 50px` ✅
- Simulator B: `insets.top = 59px` → `topPadding = 50px` ✅
- Simulator C: `insets.top = 0px` → `topPadding = 44px` ❌ (different!)

**Current Fix:** `insets.top > 0 ? 50 : 44` should handle most cases, but if one simulator reports 0, it will get 44px instead of 50px.

### Issue 2: SafeAreaView Edge Configuration
**Current:** `edges={['bottom', 'left', 'right']}` - No top edge
**Impact:** All top spacing comes from StandardHeader's paddingTop

### Issue 3: StatusBar Overlay
**StatusBar** overlays content but doesn't add spacing. The spacing must account for StatusBar height manually.

## Debug Information

The current code includes debug logging:

```typescript
if (__DEV__) {
  console.log('[StandardHeader] Top spacing:', {
    insetsTop: insets.top,
    calculatedPadding: topPadding,
    deviceType: Platform.OS,
  });
}
```

**To Debug:**
1. Check console logs for `insetsTop` values on both simulators
2. Verify both report `insetsTop > 0`
3. Check if `calculatedPadding` is the same (should be 50 for both)

## Recommended Fix

If spacing is still inconsistent, consider:

1. **Use completely fixed value for iPhone 17 Pro:**
```typescript
// Detect iPhone 17 Pro by screen dimensions or use fixed value
const { width, height } = Dimensions.get('window');
const isIPhone17Pro = width === 430 && height === 932; // or similar
const topPadding = isIPhone17Pro ? 50 : (insets.top > 0 ? 50 : 44);
```

2. **Or use a more aggressive threshold:**
```typescript
// Use 50px for ANY device with top inset >= 20px (catches all iPhones)
const topPadding = insets.top >= 20 ? 50 : Math.max(insets.top, 44);
```

3. **Or completely ignore insets and use fixed value:**
```typescript
// Just use 50px for all iOS devices
const topPadding = Platform.OS === 'ios' ? 50 : 44;
```

