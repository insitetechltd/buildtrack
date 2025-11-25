# Dashboard Screen Visual Structure Analysis

## Current Visual Hierarchy

```
┌─────────────────────────────────────┐
│ Status Bar (System)                 │ ← Time, Dynamic Island, Battery
│ (Height: ~44-59px on iPhone)       │
├─────────────────────────────────────┤
│ [GAP HERE?]                         │ ← This is the problem area
├─────────────────────────────────────┤
│ StandardHeader                      │
│ ┌─────────────────────────────────┐ │
│ │ paddingTop: insets.top          │ │ ← Safe area padding
│ │                                 │ │
│ │ Company Banner (if visible)      │ │ ← "Big Donut" might be here?
│ │ View className="mb-2"           │ │
│ │                                 │ │
│ │ "Dashboard" Title               │ │
│ │ + User info (Sarah/Worker)     │ │
│ └─────────────────────────────────┘ │
│ border-b (bottom border)            │
├─────────────────────────────────────┤
│ ScrollView Content                  │
│ ┌─────────────────────────────────┐ │
│ │ View className="px-4 pb-4 pt-1.5"│ │
│ │                                 │ │
│ │ Project Name                    │ │ ← "Big Donut" displayed here
│ │ View className="mb-4 mt-1.5"   │ │
│ │ Text "Big Donut"                │ │
│ │                                 │ │
│ │ Task Sections...                │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

## Components Involved

1. **SafeAreaView** (Screen level)
   - `edges={['bottom', 'left', 'right']}`
   - Excludes top edge

2. **StatusBar** (expo-status-bar)
   - System status bar

3. **StandardHeader**
   - Root: `View` with `style={{ paddingTop: insets.top }}`
   - Company Banner: `View className="mb-2"` (no top margin now)
   - Title Section: "Dashboard" + user info

4. **ScrollView Content**
   - Project Name: `View className="mb-4 mt-1.5"`
   - Task sections

## Potential Gap Sources

1. **insets.top value** - Might be too large
2. **StatusBar component** - Might add extra space
3. **StandardHeader paddingTop** - Applied to entire container
4. **Company Banner spacing** - Removed mt-1.5, but might need adjustment

## Questions to Answer

1. Is "Big Donut" the company banner or the project name?
   - Based on code: It's the **project name** displayed in ScrollView (line 630)
   - Company banner would be in StandardHeader (line 71-94)

2. Where exactly is the gap?
   - Between Dynamic Island and StandardHeader?
   - Between StandardHeader and "Big Donut" project name?

3. What is insets.top value?
   - Need to check actual value on device

