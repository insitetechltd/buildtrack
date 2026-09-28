# Store-shot demo catalog — photogenic tasks + photos

**Date:** 2026-09-25  
**Purpose:** Seed DEV (or a clean demo project) for ASC 4-frame store screenshots.  
**Project name (seed target):** `Store Demo — Amoy Fit-Out`  
**Actors (DEV seed):** Carol CA · John PM · Alice Worker  
**Plane:** DEV first (`zusulknbhaumougqckec`). Do not write this set to live customer companies on PROD until Human GO.

## Frame mapping

| ASC slot | Needs from this set |
|---|---|
| `01-activity` | ≥2 `critical_this_week` + recent photo activity |
| `02-camera` | One strong site photo for composite (use `photo-01`) |
| `03-tasks` | 3 cards with distinct thumbs + New / In Progress / Review |
| `04-task-thread` | One task with create photo + progress update photo |

## Task set (8)

| ID | Title | Status | % | Priority | Tags | Location | Primary | Photo file |
|---|---|---|---|---|---|---|---|---|
| T01 | Remove façade scaffold — Amoy Street elevation | `in_progress` | 45 | high | `critical_this_week` | Amoy Street elevation | Alice | `photo-01-scaffold.jpg` |
| T02 | Waterproof plant-room threshold — L2 | `submitted_for_review` | 100 | high | `critical_this_week` | L2 plant room | Alice | `photo-02-waterproof.jpg` |
| T03 | Punch: door hardware missing — core toilets L3 | `new` | 0 | high | `critical_this_week` | L3 core toilets | John | `photo-03-door-hardware.jpg` |
| T04 | HVAC make-good after duct clash — Grid D/5 | `in_progress` | 60 | medium | — | Grid D/5 | Alice | `photo-04-hvac-duct.jpg` |
| T05 | Seal ceiling joints — L2 south corridor | `in_progress` | 30 | medium | — | L2 south corridor | Alice | `photo-05-ceiling-corridor.jpg` |
| T06 | Fire-stop penetrations incomplete — L3 riser | `new` | 0 | high | `critical_this_week` | L3 riser cupboard | John | `photo-06-firestop-riser.jpg` |
| T07 | Rework: lobby tile alignment | `submitted_for_review` | 100 | medium | — | Ground lobby | Alice | `photo-07-lobby-tiles.jpg` |
| T08 | Window water test — L5 east | `approved` | 100 | low | — | L5 east elevation | John | `photo-08-facade-windows.jpg` |

### Descriptions (shared tone)

Short field notes — no SaaS fluff:

- T01: Scaffold stacks ready for truck. Confirm loading bay clear before lift.
- T02: Membrane continuous under door sill. Waiting PM sign-off with photo proof.
- T03: Leaves missing on three WC doors. Order before handover walk.
- T04: Clash resolved; lagging and supports still open.
- T05: Shadow gap inconsistent — seal and photo before paint.
- T06: Unsealed sleeves around EL/HVAC risers. Fire-stop before close-up.
- T07: Tile joint drift at reception mat. Rework complete — ready for review.
- T08: Hose test passed east elevations. Keep record photo on file.

### Timeline for hero thread (T01)

1. **Created** by John PM — attach `photo-01-scaffold.jpg`
2. **Accepted / in progress** by Alice — optional note
3. **Progress update 45%** by Alice — attach `photo-01b-scaffold-progress.jpg` (second angle)

## Photo briefs (generation)

All: photoreal Hong Kong fit-out / renovation site, natural daylight or site LED, no logos, no readable faces, no UI chrome, no text overlays. Aspect **1:1** for task thumbs; export JPEG quality ~85 for upload.

| File | Subject |
|---|---|
| `photo-01-scaffold.jpg` | Yellow metal scaffolding components stacked on wooden pallets outdoors |
| `photo-01b-scaffold-progress.jpg` | Same site, scaffold partially struck / truck bay angle |
| `photo-02-waterproof.jpg` | Plant-room doorway threshold with wet applied waterproof membrane |
| `photo-03-door-hardware.jpg` | Toilet cubicle door without handle/hardware, construction site |
| `photo-04-hvac-duct.jpg` | Exposed HVAC ductwork at ceiling grid collision zone |
| `photo-05-ceiling-corridor.jpg` | Long corridor with open ceiling grid / unfinished joints |
| `photo-06-firestop-riser.jpg` | Riser cupboard with pipe/cable penetrations awaiting fire-stop |
| `photo-07-lobby-tiles.jpg` | Lobby floor tiles with visible joint alignment issue near mat |
| `photo-08-facade-windows.jpg` | Building façade windows / green shutters, exterior elevation |

## Asset path

```
docs/taskr/assets/store/demo-photos/
  README.md          ← this catalog pointer
  photo-01-….jpg
  …
```

## Next (after photos land)

1. ~~Seed script~~ — `node scripts/maestro/seed-store-demo-photos.cjs` (DEV only; refuses non-DEV URL)
2. Point store-shot Maestro / headed capture at Carol / John / Alice + `Store Demo — Amoy Fit-Out`
3. Capture iPhone 6.7" + iPad 13" JPEGs

### Seed prove (2026-09-25)

- Script: `scripts/maestro/seed-store-demo-photos.cjs`
- Summary: `.cache/store-demo-seed.json`
- Login: `carol.admina@test.com` (CA) · `john.managera@test.com` (PM) · `alice.workera1@test.com` (Worker)
- Project: **Store Demo — Amoy Fit-Out** · 8 tasks · photos in `buildtrack-files` + `task_files`
- Re-run is idempotent (cancels prior catalog titles, re-inserts)

## Explicit non-goals

- No MetroPROD / AppShape / p-matrix titles in this project  
- No Company Plan / billing frames in the 4-shot set  
- No real customer company data
