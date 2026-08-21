# Taskr landing — Figma agent prompt v2 (post multi-critique)

Paste into Figma Make / generate-design. Synthesized from 3 critiques (product/brand, visual direction, Figma craft). Canonical tokens + motif library also live in `2026-08-21-taskr-marketing-landing-figma-brief.md`.

---

## Prompt (paste-ready)

Design a **bold, highly graphical** marketing landing for **Taskr** (app) by **Insite Works Limited**. Never write “Trackr.”

### Thesis (one sentence)

> Taskr is the **photo-backed coordination layer** running through a commercial jobsite where **multiple trades** must communicate for the business to succeed.

Construction must **shape** the layout (grid, dividers, motifs, transitions) — not sit as clip-art behind teal SaaS copy.

### Product truth (do not invent UI)

- Live loop: photo → create/assign task → accept → update with photos → submit → approve/reject  
- Project-scoped; **company admin invites seats** into **one company**  
- Value: revenue & quality via visible, photo-backed, reviewable work  
- **Do not claim or draw:** VO module, cost/budget OS, DMS/drawings, BIM, Gantt, AI chat, multi-company partner invites, public people directory  
- **OK in copy only:** “supports cost control / VO discussions with evidence”

### Audience

Company admin · PM/supervisor · crew/trade on **commercial / fit-out / MEP-and-punch** work. Jobsite English. Words: task, photo, review, project, company, trade, crew, handoff. No SaaS/AI fluff.

### Brand tokens (Figma variables — do not freelance)

| Token | Hex |
|-------|-----|
| shell | `#08576E` |
| shell-strong | `#0D6E87` |
| accent | `#12A8E0` |
| workspace | `#E7F4F8` |
| panel | `#F8FCFF` |
| text | `#07111E` |
| muted | `#577783` |
| line | `#C8E2EA` |
| CTA | `#12A8E0` |
| camera-red | `#DC2626` (FAB echo only, ≤2% of page) |

**Type:** Display = industrial condensed grotesque (DIN 2014 / IBM Plex Sans Condensed / Barlow Condensed ExtraBold). Body = IBM Plex Sans or Source Sans 3. Optional mono for drawing labels. **Forbidden:** Inter, Roboto, Poppins, Outfit, fashion serif, faux stencil. Wordmark: **TASKR** tracked-out all-caps.

### Art system: “Bay + evidence”

**Primary motifs (build as components `MKT/Graphic/Motif/*`):**

1. **Bay & slab** — Extend the Taskr icon DNA: stacked translucent isometric floor plates (~25–30°). Device sits *inside* a structural bay.  
2. **Layout / survey grid** — Hairline grid 8–12% opacity. **Not** a full blueprint sheet (no title block, north arrow, sheet number, CAD stamp).  
3. **Trade lanes** — 3 parallel corridors on **one slab**; a **photo-ticket** (cropped site photo in thin teal frame) moves between lanes → multi-trade communication.  
4. **Linework library** — M1 plan fragment · M2 elevation hatch · M4 camera viewfinder · M5 stacked photo frames · M6 trade tags (EL / PL / HVAC / FIN, outline) · M7 assignee nodes · M8 review stamp ring · M9 handoff arrow · M10 punch bubble · M11 registration marks.  
5. **Camera red** — One small FAB/shutter echo near the device. Photo-first signal.

**Materials:** Teal flood for hero/footer; workspace `#E7F4F8` for mid bands; optional 2–4% concrete grain; scaffold as **geometric lattice** only. No wood wallpaper, hazard-tape overload, sparks.

**Layering (every section):**  
Background (grid/motifs 3–14% opacity) → Mid (oversized type / trade silhouettes / workflow line) → Foreground (readable product UI + CTAs). Graphics **never** overlap the device screen. Continuous **coordination line** optional across scroll.

**Density:** ≤3 motif clusters above fold; ≤12 desktop / ≤6 mobile total. Motifs behind copy ≤18% opacity. Hero: clear **45% corridor** for the device.

### Hero (Desktop 1440 × ≥900)

Z-stack: Gradient → Motifs (M1 left, M4 right, bay behind device) → optional grain → Nav → Copy → **one iPhone** → annotations.

- ~42% type column / ~58% visual: **TASKR** lockup + isometric mark, one headline, one support line, CTAs  
- Primary: **Start company trial** · Secondary: **Download app**  
- Device: real Activity / photo-task chrome (teal header, red camera FAB). Optional 40% ghost phone of review thread (assigner ↔ trade). 8–12° tilt max. Screen readable.  
- Headline direction: “See the work. Assign it. Prove it’s done.”  
- **No cards, stickers, floating dashboards, or glass pills in the hero.**

**Mobile 390:** Stack copy then device. One motif cluster only (plan **or** viewfinder). Bay as top-third underlay.

### Sections (graphic beats — not icon-card grids)

1. **Who it’s for** — Three **stations/lanes** (admin · PM/supervisor · crew/trade) converging on one project spine. Trade tags M6. Not persona cards. Not stock people; faceless teal silhouettes OK or no people.  
2. **How it works** — Stations along **one project bay**: create company → invite seats → project → photo/task loop → review. Artifacts per step (invite, project mark, photo, assignee, approve). Not numbered SaaS circles.  
3. **Use cases** — Four **full-width scene bands** (not 2×2 cards): punch/QC; assign & chase; photo proof; trade handoffs. Each: evidence photo + cropped UI + one revenue/quality line.  
4. **Signup path** — **Invite gate** diagram (admin → link → password → projects). No public join-any-company.  
5. **Pricing** — **Only** conventional cards. Growth $19.99 · Unlimited $199.99 · +5 workers $4.99 · +1 PM $9.99 · 30-day trial (card on file). Slab/grid stays in background. Seat counts placeholder if unconfirmed.  
6. **Get the app** — Teal band; store badges (placeholder labeled); M4 only.  
7. **Trust** — Typographic + project-boundary: org owns data; admin invites; workers don’t wipe company. Privacy + Terms. No fake SOC2 orbs.  
8. **Footer** — Deep teal/ink; Insite Technologies; legal; Taskr.

### File deliverables

Pages: `00 Tokens` · `01 Components (MKT/*)` · `02 Desktop Home` · `03 Mobile Home` · `04 Pricing (opt)` · `99 Annotations`.  
Auto Layout + variables. Components: buttons, price cards, step-station, trade-lane, evidence-frame, bay/slab, store badges, nav, footer, motif set.  
Annotation layer: “do not claim or draw VO/cost/DMS/multi-company.”

### Motion (prototype, optional)

Structural only: draw coordination/crane line 700–900ms; Assigned → Photo update → Approved sequence; device 12–20px parallax vs grid; approval stamp 140–180ms settle. Reduced-motion static finals. No bounce/blob/scroll-jack.

### Anti-patterns (hard ban)

1. Purple / AI mesh / glassmorphism / floating feature pills  
2. Generic headline-left + phone-right with no jobsite environment  
3. Hardhat / yellow-vest stock heroes, excavator sunsets, clipart tools  
4. Icon-card grids for every section  
5. Inter / rounded startup type / faux stencil  
6. Full blueprint sheet behind headlines (reads as architecture CAD tool)  
7. Invented Gantt / BIM / VO / budget / drawings UI in mocks  
8. Two companies shaking hands / vendor marketplace / public directory  
9. Cream+terracotta or newspaper editorial look  
10. Desktop collage crushed unreadably onto mobile  

### Success check

A construction PM should feel **commercial multi-trade work that lives or dies on communication** — and immediately see that Taskr is the **photo → task → review** loop on a phone, not a generic teal ops SaaS or a contractor brochure.

---

## Critique fold-in (for humans)

| Source | Critical/High addressed |
|--------|-------------------------|
| Critic A (product) | Motif system; ban multi-company drawing; real product chrome + camera red; scene bands not cards; subcontracting = audience not feature |
| Critic B (visual) | Thesis “coordination structure”; section graphic beats; motion; anti-patterns; use-cases as editorial sequence |
| Critic C (craft) | Motif IDs M1–M12; opacity/density; hero z-layers & %; file structure; device crop rules |

**Rejected from critiques:** freelanced teal/orange palettes; Inter; `#2563EB` CTA (app accent is `#12A8E0`); chalk `#F7F4ED` cream field.
