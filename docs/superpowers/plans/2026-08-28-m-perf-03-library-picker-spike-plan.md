# M-PERF-03 spike — progressive library grid paint

**Milestone:** `WS-PERF / M-PERF-03`  
**Status:** Phase A spike implemented (2026-08-28) — device proof pending  
**Related:** `M-PERF-01` remote evidence thumbs (tabled Phase B — see overlap § below)

---

## Phase A delivered (this PR)

| Change | File |
|--------|------|
| Progressive paint hook (3 indices / 48ms + viewport bypass) | `src/utils/useProgressiveGridPaint.ts` |
| Jest unit tests | `src/utils/__tests__/useProgressiveGridPaint.test.ts` |
| Hybrid library grid: skeleton → staggered `Image` bind | `src/modules/captureSession/HybridLibraryPickerScreen.tsx` |
| FlatList tuning: `initialNumToRender=9`, batch=3, `windowSize=3` | same |

**Not in Phase A:** PhotoKit `targetSize` native thumbs, FlashList, Select Photos path (`InAppLibraryPickerScreen`), Maestro flow.

---

## Build & test — Cursor on phone workflow

This spike is **JavaScript/TypeScript only**. No native rebuild, no pod refresh, no new EAS build required.

### How Cursor Cloud Agent + phone fits together

1. **Agent** implements on a cloud VM and opens a PR (or you merge to your branch).
2. **Your Mac** (or CI machine with Xcode) pulls the branch — the phone does not run git itself.
3. **Metro** serves the updated JS bundle to your **dev client** or **TestFlight build** already on the iPhone.

Cursor on phone = chat / review / merge. **Runtime proof still happens on your device** via Metro or an installed dev build.

### Option A — Fastest loop (dev client already installed)

On your Mac, in the repo after pulling this branch:

```bash
npm install --legacy-peer-deps   # if deps changed
npm run dev:doctor               # machine readiness
npm start                        # or: npm run start:tunnel if phone is off-LAN
```

On iPhone:

1. Open the **Insite dev client** (same bundle id you already use for TF/dev — not App Store production if that differs).
2. Ensure phone and Mac share Wi‑Fi **or** scan the **tunnel URL** from the Metro terminal (`npm run start:tunnel`).
3. Reload JS: shake device → **Reload**, or press `r` in the Metro terminal.

### Manual test script (hybrid library — ~3 min)

1. Log in → open **Camera** tab (capture session).
2. Tap **library peek** (bottom-left thumbnail) → hybrid library grid opens.
3. **First paint:** you should see a **3×3 skeleton grid** fill with photos **row-by-row** (not all 18 at once).
4. **Scroll** quickly down 50+ photos — tiles near viewport should fill; no long frozen blank grid.
5. **Select** 2 library photos (order badges 1, 2) + tap **Accept** (checkmark).
6. Confirm **Select Photos** / next step shows pinned photos (TF200 regression — defer pin still works).
7. Optional: switch **album** from picker — grid resets and progressive fill restarts.

**Pass bar (subjective until instrumented):** first row of real thumbs visible &lt; ~500ms; grid feels “alive” vs frozen white flash.

### Device A/B protocol (Gate A validation critique)

Record screen video + note timings on the **same iPhone / album / permission mode**:

| Metric | How to measure |
|--------|----------------|
| T0 skeleton | Library tap → gray tiles visible |
| T1 first 3 thumbs | Library tap → 3 real photos |
| T2 first 9 thumbs | Library tap → 9 real photos |

Run ≥5 cold (force-quit between) and ≥5 warm trials; report **median and worst**. Alternate against TF200/baseline if still available. iCloud-only + limited-library = explicit pass or deferred note.

**Note:** progressive paint throttles URI binding (3/48ms); it does not guarantee PhotoKit decode concurrency without a completion-aware queue (Phase B candidate).

### Option B — TestFlight build

Only needed if you **don't** have a dev client pointing at Metro. For this spike alone, **Option A is enough**.

If you do need a new binary (unrelated native changes):

```bash
# On Mac — follow your existing RC script / EAS profile
npx eas build --platform ios --profile preview   # example; use repo SoT profile
```

Install from TestFlight, then still use Metro attach if the build is a **development client**; a pure preview build without dev menu requires a **new EAS build** per JS change (slow — avoid for this spike).

### Automated checks (Mac / agent)

```bash
npm run test -- src/utils/__tests__/useProgressiveGridPaint.test.ts
npx tsc --noEmit
```

Maestro: no dedicated hybrid-library flow yet — headed manual script above is the acceptance path for Phase A.

---

## M-PERF-01 overlap (remote evidence — tabled, build together later)

**Separate problem:** Supabase `buildtrack-files` signed URLs → task/dashboard/detail thumbnails.

| Idea | M-PERF-03 (device library) | M-PERF-01 (remote evidence) | Shared implementation? |
|------|---------------------------|----------------------------|-------------------------|
| Viewport-scoped work | `onViewableItemsChanged` unlock | `onViewableItemsChanged` → `prefetchSignedUrls` | **Yes** — extract `useViewportIndexGate` pattern later |
| Progressive / skeleton UX | Skeleton → staggered decode | Skeleton/blurhash until `expo-image` onLoad | **Yes** — shared tile chrome component |
| FlatList virtualization | Hybrid grid (done Phase A) | TasksScreen / Dashboard `ScrollView` → FlatList | **Parallel tracks** — same list tuning constants |
| Lower-res bytes | PhotoKit `targetSize` (Phase B) | Storage transform / `_thumb` variant | **No** — different backends |
| Batch network | N/A (local PhotoKit) | `createSignedUrls` batch + cache warm | **No** |

**Scheduling:** Phase A ships library progressive paint alone. Phase B can pair **Tasks FlatList + viewport prefetch** (M-PERF-01) with **shared viewport hook** refactor — do not block library spike on remote thumb transforms.

### M-PERF-01 Phase B backlog (tabled on ROADMAP)

1. Thumb bytes — transform URL or `_thumb` at upload  
2. Tasks + Dashboard → FlatList + viewport-scoped `prefetchSignedUrls`  
3. Lazy carousel mounts in `ActivityStyleRowCard`  
4. Batch `createSignedUrls` + login cache warm  
5. Blurhash / placeholder on evidence `expo-image`

---

## Phase B candidates (library — not started)

- PhotoKit explicit `targetSize` or LRU `file://` thumb cache  
- Warm `getAssetsAsync` first page on camera screen  
- FlashList migration  
- Port pattern to `InAppLibraryPickerScreen` or replace `expo-image-multiple-picker`  
- Maestro: `capture-session-library-smoke.yaml`

---

## Validation checklist

- [ ] Jest: `useProgressiveGridPaint` PASS  
- [ ] `tsc --noEmit` rc=0  
- [ ] Headed iPhone: progressive fill + Accept regression (human)  
- [ ] Gate B validation critique after device proof  

Updated: 2026-08-28
