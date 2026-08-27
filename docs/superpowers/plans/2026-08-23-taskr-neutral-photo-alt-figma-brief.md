# Taskr — Neutral Photo-First Alternative (Figma brief)

**Status:** Design exploration  
**Last updated:** 2026-08-23  
**North star:** A solo construction manager can run ~$100M workload with **fast reporting**, **fast decisions**, and an **accurate audit trail**.

## Product parity (InsiteApp / Taskr)

- Core loop: photo → create/assign → accept → update with evidence → submit → approve/reject
- Model: `Project → Container → Task + Tags` (project-scoped)
- Shell: Activity · Camera (center) · Tasks · Profile (header)
- Activity = triage; Tasks = worklist; Task Detail = visual audit thread

## Visual direction

- Neutral warm palette (stone/charcoal/amber) — no teal brand shell
- Photos = 40–60% of primary screens
- Humanist sans typography
- Evidence-led composition over blueprint linework

## Color tokens

| Token | Hex |
|-------|-----|
| bg-primary | #F7F5F2 |
| bg-elevated | #FFFFFF |
| bg-inverse | #1C1B19 |
| text-primary | #1A1918 |
| text-secondary | #6B6560 |
| text-muted | #9C9690 |
| line | #E8E4DF |
| accent | #C17A3A |
| accent-muted | #E8D5C4 |
| status-success | #4A7C59 |
| status-warning | #B8860B |
| status-danger | #A94442 |

## Required screens

1. Activity — command + decision strip + photo grid + queue dashboard
2. Tasks — photo-thumb rows + bucket chips
3. Task Detail — audit ledger thread
4. Camera → Create Task
5. Update Progress (no bottom tab bar)
6. Project picker
7. Profile sheet

## Figma file

**URL:** https://www.figma.com/design/DFXJ08G2acdhvqY1yPwCqY  
**File key:** `DFXJ08G2acdhvqY1yPwCqY`  
Created via orchestrator session 2026-08-23.

### Screens on page `02 — Flows (Mobile)` (all complete)

| # | Screen | Notes |
|---|--------|-------|
| 01 | Activity | Decision strip, photo grid, queue dashboard |
| 02 | Tasks | Photo-thumb rows, My/Team queue |
| 03 | Task Detail | Audit ledger thread |
| 04 | Create Task | Post-capture photo scroll + form |
| 05 | Update Progress | No bottom tab bar |
| 06 | Project Picker | Bottom sheet |
| 07 | Profile | Bottom sheet from header |

### Remaining polish

- Swap gray photo placeholders for Maestro marketing captures
- iPad Activity split-view variant
