# Glass v3 multi-critique — polish gate (2026-08-21)

**Verdict:** Prior EXECUTE pass was **incomplete**. Structure + COPY LOCK + capped pricing landed; art, contrast, type, store badges, and device proof did **not**. Page reads unfinished. Do not claim Glass v3 finished until DoD below.

**Critique engines:** A gpt-5.6-sol-medium · B composer-2.5-fast · C cursor-grok-4.6-high-fast

## Critical consensus

| ID | Finding | Fix |
|----|---------|-----|
| C1 | Rotated rects ≠ bay | Rebuild plenum/fit-out motif; phone inside void |
| C2 | AWAIT / empty phones | Figma marketing mocks with seeded titles (real PNGs banned until clean) |
| C3 | Low contrast | Dark hero `#08576E`; body `#07111E` on light; CTA label `#07111E` on `#12A8E0` |
| C4 | Type too small | H1 64–72 · H2 40–48 · body ≥17–19 · CTA ≥16–18 |
| C5 | Fake store pills | Official-proportion App Store + Play badges |
| C6 | Glass everywhere | Glass: nav/captions only; phones/CTAs/pricing opaque |

## Ban-list on existing shots

`.dbg/marketing-shots/*` and fallbacks still show Maestro / Alice / Wiring Phase — **do not inject**. Interim = drawn Taskr chrome mocks.

## Pricing (unchanged)

Growth $19.99 ≤3 proj / ≤10 workers · Site Ops $99.99 ≤10 / ≤20 · add-ons · **no Unlimited**

## DoD (polish pass)

- [x] Dark hero + readable H1/support (H1 split lines @64)
- [x] Device mocks with fire-stop / HVAC / handoff / punch / seal titles (Figma chrome — not live PNGs)
- [x] Primary CTA ink-on-cyan (`#07111E` on `#12A8E0`)
- [x] Store badges as black official-proportion frames (swap real Apple/Google SVG before public)
- [x] Type floors bumped (H1 ~64, H2 ~44, body ~18)
- [~] Bay motif denser (duct/tray/pipes) — still illustration, not photo-real; Critique C plenum not fully photoreal
- [x] Solid archive untouched
- [ ] Real `mkt-01..04.png` swap still blocked (existing shots = Maestro/Alice ban-list)
