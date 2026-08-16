# Custom Library Picker — Evaluation & Integration Plan

> **Status (2026-08-15):** **Parked — Option A shipped in working tree (not yet committed as of session close).**  
> In-app library via `expo-image-multiple-picker` + Create stack routes; Photo Edit kept; **Option B (MediaLibrary+FlashList grid parity) deferred.**  
> Resume only after commit/QA gate or next upload-UX session.

> **Decision (user 2026-08-15):** Evaluate **`expo-image-multiple-picker`** (or **MediaLibrary + FlashList**) and **keep our Photo Edit** for rotate / crop / draw.

**Milestone:** `WS-UX / M-UX-01 / S-UX-01Q` (upload UX)  
**Does not change:** Supabase upload, `fileUploadService`, Photo Edit (Phase 1 rotate/crop), Phase 2 draw spike later.

---

## Goal

Replace **System library picker (Apple PHPicker)** with an **in-app gallery we own**, so we can control:

| Control | Desired behavior |
|---------|------------------|
| Accept (header ✓ / OK) | Finish selection → hand assets to **Select Photos** (or open **Photo Edit** for first item — product choice in spike) |
| Selected strip / “N photos” affordance | Open **Photo Edit** (rotate / crop / reset; draw later) |

Keep **Photo Edit** as the editor (already implemented). Do **not** use IMGLY on this path.

---

## Evaluation: two options

### Option A — `expo-image-multiple-picker` (spike first)

| | |
|--|--|
| **Pros** | Built on `expo-media-library` (already in `package.json` ~17.1.6); `react-native-svg` already present; WhatsApp-style **theme** slots (header / album / check); multi-select + limit; no PHPicker |
| **Cons** | Low weekly downloads (~200); uses **FlatList** not FlashList; header must be fixed height; less control than a fully owned screen; must verify Expo SDK 54 / media-library 17 |
| **Fits Insite if** | Theme can implement Accept ✓ + selected count → navigate into our Photo Edit / Select Photos |

### Option B — MediaLibrary + FlashList (fallback / long-term)

| | |
|--|--|
| **Pros** | Full control of pill / ✓ / albums; FlashList performance for large libraries; matches Insite design system |
| **Cons** | More build time (albums, pagination, permissions UX, limited-library handling) |
| **Fits Insite if** | Option A fails SDK fit, theming, or performance |

### Recommendation

1. **Spike Option A** (0.5–1 day): install, wire one entry (Create Task → Choose from Library), theme header to Insite blue ✓ + selected count, map `onSave` → existing `PhotoSelection` + pin drafts.  
2. If spike fails (API gaps, jank, permission bugs) → **Option B**.  
3. Keep **Photo Edit** unchanged aside from entry wiring.

---

## Target flow (after ship)

```text
Form → Add Photos sheet → Choose from Library
  → [NEW] In-app Library Gallery (MediaLibrary-based)
       ✓ Accept selection → Select Photos (grid) with drafts
       (optional) tap selected / Edit → Photo Edit
  → Select Photos header ✓ → Form (unchanged accept)
  → Edit · N Photos / tile → Photo Edit (rotate/crop/reset)
```

**System PHPicker** is removed from the library path only. Camera can stay on `expo-image-picker` / camera API.

---

## Spike checklist (Option A) — gate before full build

- [x] `npx expo install expo-image-multiple-picker` (peer: media-library, svg already OK) — v4.10.0
- [x] Requests MediaLibrary permission via package `usePermissions` (denied → `onCancel`); limited-library behavior **needs device smoke**
- [x] **2026-08-16 release blocker fixed:** gate `ImagePicker` mount until `MediaLibrary` granted — `expo-image-multiple-picker` + `noAlbums` otherwise blank-grids after first Allow Full Access (see `docs/superpowers/findings/2026-08-16-in-app-library-permission-blank-grid.md`)
- [x] Multi-select resolves `localUri` then `pinDraftMedia` → `file://` drafts
- [x] Theme header: Cancel, count, Accept ✓ (no Apple Photos\|Collections) — `InAppLibraryPickerScreen`
- [x] `onSave` → `replace` `PhotoSelection` with `initialPhotos` (`uploadImmediately: false`)
- [x] Create Task **Choose from Library** → `InAppLibraryPicker` (Camera tab + Dashboard/Tasks stacks registered)
- [ ] Scroll performance OK on device with ~500+ photos (subjective) — **device**
- [ ] Android + iOS smoke — **device**
- [x] No IMGLY / no `allowsEditing` on this path

**Code ready for device gate.** Pass → full wiring Update/Comment/Reject. Fail → Option B.

---

## Full implementation tasks (after spike pass)

### Task 1: Library gallery screen/route

- New screen e.g. `InAppLibraryPickerScreen` wrapping themed `ImagePicker` **or** owned MediaLibrary UI  
- Register in `AppNavigator` (Create / Tasks / Dashboard stacks as needed)  
- `headerShown: false` while picker is full-screen  

### Task 2: Replace PHPicker entry

- `usePhotoSelection` / CreateTask / UpdateProgress / FileUploadHarness path: **Choose from Library** → navigate to in-app gallery (not `launchImageLibraryAsync`)  
- Camera + clipboard unchanged  

### Task 3: Wire to Select Photos + Photo Edit

- Gallery Accept → pin assets → `PhotoSelection` with `initialPhotos`  
- Keep Select Photos Accept + Photo Edit as today  
- Optional later: gallery selected strip opens Photo Edit directly (product polish)  

### Task 4: Permissions & docs

- Ensure `NSPhotoLibraryUsageDescription` copy is accurate (full/limited library)  
- Note in runbook: library path no longer uses PHPicker  

### Task 5: Tests + QA

- Unit: navigation params / pin mapping  
- Integration: Choose from Library mocks gallery save → Select Photos  
- Device QA: permission, multi-select, edit, accept to form  
- Maestro: update if library entry selectors change  

---

## Out of scope

- Draw (Phase 2 spike still separate)  
- Per-photo caption (Phase 3 optional)  
- Replacing Photo Edit with a third-party editor  
- [x] Uninstalling `@imgly` (separate cleanup) — **S-UX-01Q2 Closed 2026-08-15**  
- Custom camera UI  

---

## Risks

| Risk | Mitigation |
|------|------------|
| `expo-image-multiple-picker` stale / SDK mismatch | Spike first; fallback Option B |
| Limited Photos Library empty grid | Explicit limited-library UX / “Manage” |
| Permission friction vs PHPicker | Clear copy why library access needed |
| Dual paths (camera still ImagePicker) | Document; keep camera simple |

---

## Assumptions

1. Users accept a **one-time photo library permission** for custom gallery.  
2. **Select Photos** remains the batch review / accept-to-form screen after gallery.  
3. Photo Edit remains SoT for rotate/crop/(later) draw.  

---

## Decision log (2026-08-15)

- **Ship Option A for now** (`expo-image-multiple-picker`): finish Create Task library → Select Photos → Photo Edit → accept without opening a second deep custom gallery.
- **Deferred UX debt (real):** library grid vs Select Photos grid misalignment (gaps/padding/radius). Address later — prefer shared layout / Option B then; **do not** start Option B in this cycle.
- Select Photos **Add → Choose from Library** must stay on the in-app picker (append/merge), not fall back to PHPicker mid-flow.

---

## Next step

Device smoke Create Task library path end-to-end. Later backlog: grid visual parity (Option B or shared tile layout).
