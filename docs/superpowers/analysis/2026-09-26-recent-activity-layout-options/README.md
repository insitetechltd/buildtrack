# Recent Activity layout options (tablet)

**Date:** 2026-09-26  
**Baseline:** current Recipe B 2-col grid (photo only when latest event has photos; no “No photo” spacer).  
**Pain:** short text card beside tall photo card leaves a large empty band under the short card.

**Rejected already:** equal-height cards filled with a large “No photo” placeholder.

## Multi-model lanes (identical brief)

| Option | Model | Verdict |
|--------|--------|---------|
| A — Compact evidence strip | Claude Opus | CAUTIOUS |
| B — Single-column feed | GPT-5.6 | CAUTIOUS |
| C — Masonry packing | Gemini Flash | CAUTIOUS |

## Mockups

- `00-current-baseline.png` — current hole under Waterproof…
- `recent-activity-option-a-compact-strip.png`
- `option-a-two-portrait-4x3-strip.png` — refined A strip (two 3:4 thumbs)
- `recent-activity-option-b-single-column.png`
- `recent-activity-option-c-masonry.png`

## Decision — Option A shipped

**Shipped in App Store / TF build 280** (tip `fff978f`, ASC 1.1.3 WAITING_FOR_REVIEW).  
Compact evidence strip is product SoT for Recent Activity / ActivityStyleRowCard Option A. Options B/C remain design evidence only — do not re-open without a new GO.
