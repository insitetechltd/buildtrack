# Multi-critique — Figma Home Desktop Filled v2 (2026-08-21)

**Draft:** [Home / Desktop — Filled v2](https://www.figma.com/design/gTKeArmzmI3DOCz6RlHxhq?node-id=18-2)  
**Archive:** page `98 — Archive` → `Home / Desktop — Filled v2 · archived 2026-08-21` (locked)  
**Company legal:** **Insite Works Limited** (footer + eyebrow updated on working frame)

**Engines:** Critic A (product) · Critic B (visual) · Critic C (Figma craft)

---

## Consensus verdict

Solid v2 is a **competent teal SaaS page with honest product copy** — keep as **copy/IA baseline**. It is **not** the bay-and-evidence construction landing. Empty/wrong-proportion phones and five numbered step cards are the main visual failures. Next pass = **Glass v3** (site glazing over structure) + **real iPhone 16 Pro screenshots** with marketing task titles.

### Critical / High (all three)

| ID | Finding |
|----|---------|
| C1 | Construction does not shape layout — circle + teal wash only |
| C2 | How-it-works = banned 5 numbered SaaS cards (need stations on one bay) |
| C3 | Use cases = 3 identical empty/tall phones (need scene bands + trade handoff) |
| C4 | Missing Who-it’s-for stations |
| H1 | Device content / titles must be marketing-grade (no Maestro IDs) |
| H2 | Signup mock should show Create company / invite gate, not consumer login only |
| H3 | Motif library unused |
| H4 | Device aspect must be ~**9:19.5** (402×874 logical), not 1:2 teal slabs |

### Keep into Glass v3

- Product honesty (not VO/cost yet)
- Invite-gate copy
- CTA set + pricing SKUs as opaque cards
- Teal brand tokens
- RC store-link honesty

---

## Glass system (consensus)

**Metaphor:** site polycarb / bay glazing — not Apple Settings glass.

| Token | Value |
|-------|--------|
| Light glass fill | `#F8FCFF` @ 68–78% |
| Teal glass fill | `#08576E` @ 58–70% |
| Blur | 16–24px **background** blur only |
| Stroke | 1px `#12A8E0` @ 35–55% + optional white top edge @ 30% |
| Radius | 12–16px |

**Glass allowed:** nav, workflow stations, trade labels, invite-path nodes, screenshot captions.  
**Stay opaque:** phone screens, CTAs, pricing cards, legal, trust body.

---

## Marketing task titles (seed these)

1. L3 corridor — fire-stop penetrations incomplete  
2. Seal ceiling joints — L2 south corridor  
3. EL first-fix incomplete — L4 riser cupboard  
4. PL pressure-test witness — wet stack L2  
5. HVAC make-good after duct clash — Grid D/5  
6. Rework: ceiling grid off line — Grid B/8  
7. Punch: door hardware missing — core toilets L3  
8. Waterproofing photo proof — plant-room threshold  
9. Handoff: EL complete, HVAC can start — L5 east  
10. FIN joinery defects — L8 penthouse handover  
11. Level 3 electrical containment  
12. Ceiling grid snag — Zone B  

Project label: **Tower B — Commercial Fit-out** (not Project A).

---

## Device sizes (iPhone 16 Pro logical)

| Slot | Outer W×H | Notes |
|------|-----------|-------|
| Hero | ~295×639 to 396×861 | ratio 9:19.5; tilt ≤8–10° |
| Use case | ~230×500 to 360×783 | upright; stagger crops |
| Signup | ~230×500 to 320×696 | secondary to invite diagram |

---

## Paste-ready — Glass v3 execution

**Canonical execution prompt (full):** [`2026-08-21-taskr-landing-glass-v3-execution-prompt.md`](./2026-08-21-taskr-landing-glass-v3-execution-prompt.md)

Includes: archived Solid v2, Insite Works Limited, glass system, screenshot ban list (no Maestro/Alice titles), required marketing titles, device proportions, section rewrites.

**Screenshot prep:**
```bash
node scripts/maestro/prepare-marketing-landing-tasks.cjs
MAESTRO_UDID=<iPhone-16-UDID> bash scripts/maestro/run-local.sh test maestro/flows/marketing-landing-shots.yaml
```

Short paste block (see execution prompt file for the full EXECUTE block).