# iPad Task Detail timeline — layout alternatives

**Status:** **GO mix implemented (2026-09-20).** Portrait **meta TOP** + landscape **meta LEFT**. Fixed 3-up / 4-up tiles (`contain`, peek-to-slide, no +N). Phone square hero unchanged.  
**Date:** 2026-09-19  
**Surface:** Task Detail → activity timeline (`TaskActivityTimeline` + `IpadTimelineEvidenceStrip`)  
**Scope:** iPad portrait **and** landscape. Phone stacked layout stays as-is.  
**Pick:** **C · Filmstrip / evidence grid**

Mocks are proposed UI, not simulator captures. Ignore extra chrome some frames invented (sidebars, inspector panels, landscape nav rails). Only the **timeline photo treatment** is in play.

---

## Problem

On iPad, a photo event is too tall to see as a whole without scrolling, in both orientations.

**Cause (current code):** the lead photo shell is a **full-width square** (`aspectRatio: 1`) with `contentFit="cover"` in `src/components/taskDetail/TaskActivityTimeline.tsx`. Content width on an 11" iPad is ~746pt, so one photo is ~746×746pt — taller than most of the remaining viewport after header + caption. Multi-photo events swipe horizontally inside that same square; they do not get shorter.

`useTabletCardGridLayout` (Tasks/Dashboard 2/3 columns) is a **different** surface. Do not reuse it for this timeline.

---

## Compare

| | **A · Viewport-capped contain** | **B · Split meta \| photo** | **C · Filmstrip / evidence grid** |
|---|---|---|---|
| Layout | Caption stacked above a height-capped photo stage | Caption left, photo right (two columns) | Compact header + tile strip / 2–4-up grid |
| Photo height (11") | ~43vh portrait / ~38vh landscape (`clamp` 360–520 / 248–336) | Fixed **200pt** portrait / **260pt** landscape | Media block **≤200–220pt** |
| Fit | **`contain`** — no crop, letterbox OK | **`cover`** — crop to the tile | **`cover`** — crop to tiles |
| Multi-photo | One capped pager; swipe; `n / total` + dots | 2-up, or primary + thumbs, **same row height** | Horizontal filmstrip; **+N** overflow |
| Feed density | Lowest (largest evidence in-feed) | Medium | Highest |
| Best if | You want to **read the photo in the feed** | You want **caption + photo in one glance** | You want to **scan many events**, tap to inspect |
| Main tradeoff | Letterboxing on portrait shots | Crop + new split-row code path | Tap required for uncropped review |

All three keep the existing full-screen gallery (`task-activity-timeline__photo_viewer`) for tap-to-expand. Fat-finger floor: ≥44pt tap targets.

---

## A · Viewport-capped contain

Keep today’s stacked event (meta → photo → pager). Cap the photo **stage** to a fraction of the window. Use **contain** so jobsite edges stay visible.

A mockups were regenerated 2026-09-19 (first pass scrambled the nested photos).

### Portrait

![A portrait — capped contain photo stage](./2026-09-19-ipad-task-timeline-layout/ipad-timeline-A-portrait.png)

### Landscape

![A landscape — same cap, shorter because the window is shorter](./2026-09-19-ipad-task-timeline-layout/ipad-timeline-A-landscape.png)

### Rules

| Rule | iPad portrait | iPad landscape |
|---|---:|---:|
| Media-stage height | `clamp(360, 43vh, 520)` | `clamp(248, 38vh, 336)` |
| 11" expected media height | ~513pt at 834×1194 | ~317pt at 1194×834 |
| Image fit | `contain`, pale slate letterbox | same |
| Event chrome budget | ≤238pt (actor, two-line caption, pager) | same |
| Max photo-event height | ~751pt | ~555pt |

- Recalculate from `useWindowDimensions()` on rotation and Split View. Do **not** use `useTabletCardGridLayout`.
- 1–4 photos: **one** equally capped horizontal pager. Do not stack photos vertically or use a 2×2 grid (that shrinks landscape evidence).
- Feed is the only vertical scroll. Photo stage has no vertical scroll.
- Phone path unchanged.

**Pros:** uncropped evidence; familiar swipe gallery; four photos do not multiply card height.  
**Cons:** letterboxing; tap still needed for fine inspection; captions must be line-clamped or the height guarantee breaks.

---

## B · Split meta | photo

Each photo event is a **two-column row**. Photo height is a **fixed token**, independent of row width — that is the direct fix for square-from-width blow-up.

### Portrait

![B portrait — caption left, photo right](./2026-09-19-ipad-task-timeline-layout/ipad-timeline-B-portrait.png)

### Landscape

![B landscape — more width to the photo](./2026-09-19-ipad-task-timeline-layout/ipad-timeline-B-landscape.png)

The left icon rail in the landscape mock is **not** part of this proposal.

### Rules

| Aspect | Portrait (11" / 13") | Landscape (11" / 13") |
|---|---|---|
| Meta : photo | **55 / 45** | **38 / 62** |
| Photo-tile height | **200pt** | **260pt** |
| Gutter | 16pt | 16pt |
| Fit | `cover`, centered | same |
| 1 photo | One tile, min ~220×180pt | same floor |
| 2 photos | 2-up, 4pt gap, full tile height | same |
| 3–4+ photos | Primary + thumb strip + **+N** inside the **same** height band | same |

Portrait stays side-by-side (not stacked). Below ~600pt content width, fall back to phone layout (out of iPad scope).

Row height = `max(meta natural height, fixed photo height) + padding`. Captions can grow the row; **photos never do**.

**Pros:** caption and photo visible together; predictable height vs photo count; landscape width goes to evidence.  
**Cons:** `cover` crops; meta column wraps captions more; 3–4 photo primary+thumbs is a new sub-layout (not a restyle of the current pager); sticky `onEntryLayout` math needs a Planner pass.

---

## C · Filmstrip / evidence grid

Compact header, then a **short evidence pack**. Single photo is a wide framed still (~full card width × 200pt), not a viewport-tall hero. Multiple photos are tiles **that fill the card width** (not 160pt stamps left-aligned with empty space).

**C mockups regenerated 2026-09-20 (v2)** after TF **276** dogfood did not match the first C frames (landscape had invented a left sidebar; tiles looked smaller / not full-width vs expectation). These v2 frames use real Task Details chrome (info card + activity thread) and full-width media.

### Portrait

![C portrait v2 — full-width still + 4-up filmstrip](./2026-09-19-ipad-task-timeline-layout/ipad-timeline-C-portrait.png)

### Landscape

![C landscape v2 — same stacked timeline, no sidebar](./2026-09-19-ipad-task-timeline-layout/ipad-timeline-C-landscape.png)

The v1 landscape left task-overview pane is **not** part of this proposal. Landscape stays a full-width stacked thread.

### Rules

| Token | Value |
|---|---|
| Header block | 72–88pt (avatar, actor/time, 1–2 line caption) |
| Media max height | **200pt** (220pt landscape single-photo if header is one line) |
| Tile aspect | 4:3 or square crop (`cover`) |
| Tile gap | 8pt · radius 12pt · min tap 44pt |
| Rows | **1 row only**; overflow = horizontal scroll + **+N** |
| 1 photo | Full width × ~200pt framed still |
| 2 photos | 2-up, ~180pt tall |
| 3+ | Filmstrip; portrait ~2–3 visible; landscape ~3–4; 4-up can fit 11" landscape without scroll |

Typical event card ~300–340pt → 2–3 mixed events per viewport.

**Pros:** densest feed; evidence-pack mental model; single photo still large vs postage-stamp MEDIA tokens (112/128).  
**Cons:** tap for full image; crop; nested horizontal vs vertical scroll (keep `directionalLockEnabled`).

---

## Shared implementation notes (after a pick)

- Gate with `Platform.isPad` (or content-width ≥ ~700pt for Stage Manager) **inside** `TaskActivityTimeline`. Phone keeps `aspectRatio: 1` + `cover`.
- Preserve `task-activity-timeline__photo_stack-*`, lead-photo, swipe-surface, and viewer testIDs; add tile IDs if C/B grids land.
- Jest that asserts square/`cover` must get an iPad branch.
- Mixes that are cheap if you want them:
  - **B + A fit:** split row, but `contain` instead of `cover`.
  - **A + C multi:** capped contain for 1 photo; filmstrip only when count ≥ 2.

---

## Acceptance (headed iPad, once built)

Run 11" (834×1194 / 1194×834) and spot-check 13".

1. One photo event: actor + caption + media visible without scrolling **inside** that entry.
2. Media height matches the chosen variant’s token (±1pt) in both orientations.
3. 3- and 4-photo events do not grow taller than the 1-photo case (A pager / B band / C strip).
4. Tap opens the existing gallery at the correct index; swipe vs timeline scroll do not fight.
5. iPhone layout unchanged.

---

## Revision 2026-09-20b — project meta left; timeline photos only

Corrected after the prior frames put **event** actor/caption on the left. Intended rules:

1. **Project/task metadata** (title, Progress, Location, Team) sits in a **left column**.
2. **Timeline chrome is unchanged** (rail, avatar, name, time, caption stacked). Only the photo presentation changes.
3. Photos are **fixed-size tiles**:
   - Portrait: **3 across**. 1 / 2 / 3 photos fill that many tiles (do not stretch a single photo). **>3** → horizontal slide.
   - Landscape: **4 across**. Same fill + slide rule.

1–3 (portrait) or 1–4 (landscape) photos fill that many tiles, left-aligned — no empty ghost slots. Extra photos peek off the trailing edge and slide horizontally.

### Portrait option A — meta on TOP (stacked, today’s chrome)

Full-width pinned info card, then the activity thread. 3-up tiles use the **full** content width. Same photo rules as option B.

![iPad portrait mock — task meta on top, 3-up photo tiles](./2026-09-19-ipad-task-timeline-layout/ipad-task-detail-portrait-meta-top.png)

The 4th tile in this frame still shows a `+2` badge. Spec is **peek-to-slide**, not a +N pack — implementation should peek the next tile, no overlay count.

### Portrait option B — meta on LEFT

Info card in a left column (~1/3). Thread on the right (~2/3). Same 3-up tiles, but they share a narrower column.

![iPad portrait mock — task meta left, 3-up photo tiles](./2026-09-19-ipad-task-timeline-layout/ipad-task-detail-portrait-mock.png)

### Landscape — meta left, 4-up tiles (assumed either way)

![iPad landscape mock — task meta left, 4-up photo tiles](./2026-09-19-ipad-task-timeline-layout/ipad-task-detail-landscape-mock.png)

### Portrait compare — meta TOP vs LEFT

Same photo rules in both (fixed tile token, 3 across, 1/2/3 fill left-aligned, >3 horizontal slide). The only fork is **where the project/task card sits**. Landscape stays meta-left in both mixes.

| | **Portrait · meta TOP** | **Portrait · meta LEFT** |
|---|---|---|
| Page chrome | Header → full-width info card (already pinned) → thread | Header → split: info ~1/3 left, thread ~2/3 right |
| Thread width (11") | ~730pt | ~500–520pt |
| 3-up tile size | ~220–238pt | ~160–170pt (~30% smaller) |
| vs landscape 4-up (~193pt) | Portrait tiles **larger** | Portrait tiles **smaller** |
| First viewport | Info card eats ~140–180pt of height; remaining ~850pt still fits 1-photo + 3-up events | Thread starts under the header; more events visible, but left column is empty below Team |
| Info while scrolling | Already pinned today — Progress / Location / Team stay on screen | Also always visible (side column) |
| Rotate to landscape | Chrome **reflows** stacked → split | Same skeleton both ways |
| Implementation | Keep `TaskDetailScreen` pin; only change photo strip | New iPad portrait split + rotation; dock / keyboard / sticky math |
| Empty space | None — card spans the width | Tall unused gutter under Team |

**Why TOP wins for portrait:** the original defect is photo **height**, not missing a sidebar. Fixed 3-up tiles already keep the first event on-screen under a stacked card. Portrait width is scarce; giving ~1/3 of it to a short info card shrinks the photos you are trying to read, and leaves a dead column.

**Why LEFT can still win:** rotate does not rearrange the page; first events sit higher; one layout for both orientations.

**Recommended mix:** portrait **meta TOP** + landscape **meta LEFT**. Photo strip is the same component in both (3 vs 4 slots). **GO 2026-09-20 — implemented.**

---

## Revision 2026-09-20 — consistent tiles + landscape meta

After TF 276 dogfood, two product rules:

1. Show the **whole or majority** of each photo (prefer `contain`). **Tile size is constant** no matter how many photos are on the event.
2. **Landscape:** event metadata (actor, time, caption) in the **left 1/3–1/4**; photos on the right.

Three review frames (proposed UI, not the live app). Implementation waits for a pick.

### 1 · Portrait · consistent photo size (stacked)

Caption stays above photos. One photo is a single tile, not a full-width banner. Four photos are a 2×2 of the **same** tile.

![1 portrait consistent](./2026-09-19-ipad-task-timeline-layout/ipad-timeline-1-portrait-consistent.png)

### 2 · Portrait · meta on the left

Same tile rule; each event is a split row (meta ~1/3, photos ~2/3).

![2 portrait meta left](./2026-09-19-ipad-task-timeline-layout/ipad-timeline-2-portrait-meta-left.png)

### 3 · Landscape · meta on the left

Required landscape treatment: metadata left, photos right.

![3 landscape meta left](./2026-09-19-ipad-task-timeline-layout/ipad-timeline-3-landscape-meta-left.png)

**Natural mixes:** **1+3** (stacked in portrait, split only in landscape) or **2+3** (split in both orientations). A locked tile token (width×height, `contain`) is the implementation SoT for rule 1; mocks are approximate.

**2026-09-20c lean:** portrait **meta TOP** + landscape **meta LEFT** (same as mix 1+3, with the corrected project-meta card — not event actor/caption). **GO 2026-09-20.**

---

## Pick

**2026-09-20 GO:** portrait stacked info card + landscape split; photos are fixed tiles (3 portrait / 4 landscape), `contain`, left-aligned, peek-to-slide. Supersedes TF 276 Variant C stretch / +N.

Implementation:

- `src/components/taskDetail/ipadTimelineEvidenceLayout.ts` — slot / tile / landscape-split math
- `src/components/taskDetail/IpadTimelineEvidenceStrip.tsx` — iPad media
- `src/components/taskDetail/TaskActivityTimeline.tsx` — `Platform.OS === "ios" && isPad` branch
- `src/screens/TaskDetailScreen.tsx` — iPad landscape info column

Phone path still uses `aspectRatio: 1` + `cover` swipe shell. Full-screen viewer is unchanged (`contain`). Headed iPad sim smoke remains (11" portrait + landscape).
