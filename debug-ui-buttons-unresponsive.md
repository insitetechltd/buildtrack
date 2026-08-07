# Debug Session: ui-buttons-unresponsive
- **Status**: [OPEN]
- **Issue**: User reports *all buttons are not responsive* in the running Taskr iOS sim on iPhone 17 Pro Max (UDID B7B2640C-4738-4F8A-AEEE-5DF3D21D2533). Post S-UX-01H (UI modernization), S-UX-01I (18 testID placements), M-QA-03 close on Maestro. "Not responsive" = tap button → visual feedback missing or action runs > 500ms, or no action at all. Affects *all* buttons across screens (not one isolated screen).
- **Debug Server**: TBD (`python3 tools/debug-server.py --remote`)
- **Log File**: `.dbg/trae-debug-log-ui-buttons-unresponsive.ndjson`
- **Environment**:
  - iOS 26.0 sim iPhone 17 Pro Max, Metro=http://127.0.0.1:8081, `__DEV__=true`, dev-client build `com.buildtrack.app.local`.
  - RN 0.81.4, RNGH 2.24.0, Reanimated 3.17.4, NativeWind 4.1.23, Expo SDK 54.0.13, Zustand 5.0.4, RNN 7.1.6.
  - Reproduces in **BOTH** modes? (Sprint 7 runtime preset **AND** live Supabase) — user just reloaded sim and ran live Supabase login → first sees buttons on Login + Dashboard.

## Reproduction Steps (user-observed)
1. Boot sim, launch Taskr (dev-client), Metro running.
2. On ANY screen (Login, Dashboard, Tasks tab, Drawer menu, Profile Project Picker, Create Task), tap ANY button (sign-in, tab, project row, action FAB, header back/profile).
3. Expected: instant feedback (ripple/opacity/active-state) + action < 100 ms visible.
4. Actual: **no response within 1 s** → or tap 2-3 times for action → or visual ripple missing → or delay > 1 s before navigation.

## Hypotheses & Verification
| ID | Hypothesis | Likelihood | Effort | Evidence |
|----|------------|------------|--------|----------|
| A | Reanimated UI-thread work starvation. `react-native-reanimated` sharedValues running `withTiming`/`withRepeat` on every mount of a heavy wrapper (e.g. AppScreen, CardStyleInterpolators, NativeWind v4 Tailwind `animate-*` utilities → RN worklet scheduler busy, tap events queued behind 60fps animations) | High | Low | Instrument: (1) record `(tap event time, onPress JS start, onPress action end)` for 3 button classes (header, list-row, FAB). (2) Check JS FPS / mqt_native_modules queue depth via performance.now() deltas; look for onPress invocations > 200 ms delayed after `onPressIn` timestamp. |
| B | NativeWind v4 `className` → RN style conversion per-render with an uncached tw() merge. Every re-render of screen/layout calls `useColorScheme()` + `tw()` sync work (clsx + twMerge > 50 classes per screen) on JS thread, so during peak render, JS event loop is 1–4 s behind → tap events (which go through JS bridge) queued, so Pressable `onPress` fires late. | Med | Low | Instrument: (1) wrap `createTasksScreen()` render with performance.mark/measure around the root return. (2) Count className tokens per top-level render for DashboardScreen. If render > 200 ms and className tokens > 200, this holds. |
| C | Zustand 5.0.4 `useStore(selector)` over-selecting → every tiny state change (task progress, realtime channel messages, userProjectAssignments cache invalidation) triggers ALL subscribed components (Dashboard, Tasks tab list rows 30+) to re-render on the JS thread, causing input coalescing that drops Pressable taps. | Med | Med | Instrument: wrap `useProjectStore(state => state.projects)` calls at TasksScreen + DashboardScreen — log re-render count per 10s window when idle (no user action). If > 10 renders/s idle, the store is "spamming" subscriptions. |
| D | `react-native-gesture-handler` 2.24.0 `GestureDetector` / `Gesture.RootView` wrapping not applied on some screen stacks → RNGH responder chain broken on RNN 7.x `ScreenStack` / `react-native-screens` 4.10.x. Pressable.onPress (which uses RNGH TapGestureHandler on iOS if wrapped) never fires, requiring 2+ taps to break out of a swallowed-responder state. | Med | Med | Reproduce: Wrap Pressable in `<Pressable onPressIn={...logNativeEvent} onPress={...}>` on LoginScreen "Sign In" and record onPressIn firing vs onPress firing. If onPressIn fires but onPress does NOT on some taps, RNGH responder cancellation is the bug. |
| E | Supabase realtime `RealtimeSyncManager` channel handlers synchronously calling `setState({...get(), ...newData})` inside channel broadcast callbacks → 4 channels each fire tasks-changes / task-activities / projects-changes / users-changes on mount → multiple deep merges of task arrays (200+ tasks each) on JS thread in a tight 500 ms window → JS main queue busy 3–5 s on initial mount → first 10–20 taps get delayed 1–3 s before "becoming responsive again". | High | Low | Instrument: RealtimeSyncManager channel events — log timestamps for each `postgres_changes` delivery + setState call duration. If 3+ setState calls of > 200 ms each in a 1 s window right after login, this is the root cause. |
| F | Maestro / dev-mode overlays. `expo-insights` v0.9.3 enabled with `performance.measure` in multiple places → Perf Monitor / DevMenu RSC overlay is polling the bridge, slowing event dispatch. (Or: `babel-plugin-module-resolver` + patched `babel-preset-expo` patch-package produces extra HMR websocket ping on every module export that starves the queue) | Low | Low | Reproduce: Disable `expo-insights` / turn off Perf Monitor (⌘D → hide perf monitor). If button responsiveness immediately normalizes without further code changes → yes. |

## Log Evidence
[Pending: instrument & reproduce first run]

## Verification Conclusion
[Pending: pre/post fix comparison]
