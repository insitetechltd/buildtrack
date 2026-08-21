# Taskr marketing landing — Figma brief (2026-08-21)

**Audience:** Construction PMs, supervisors, company admins (not tech-savvy).  
**Brand:** App = **Taskr**; company = **Insite Works Limited**. Never “Trackr” on this site.  
**Canonical URL (target):** `https://www.insiteworks.co` (marketing) · `https://app.insiteworks.co` (Wave 2 product web only).  
**Figma file (draft):** `https://www.figma.com/design/gTKeArmzmI3DOCz6RlHxhq`  
**Visual direction:** Graphical and modern — full-bleed teal hero, **construction communication graphics** (blueprint linework + photo/review motifs), device composition, visual step badges, elevated pricing cards. Not a text-wall. Brand colors only (no purple/AI-gradient clichés). Construction-plain language.

---

## Product truth (do not oversell)

**Ship today (RC field loop):** photo evidence → create/assign task → accept → update with photos → submit → approve/reject. Project-scoped work, company admin invites seats.

**Do not claim as live product yet:** full variation-order (VO) module, jobsite cost/budget OS, DMS/drawings. Those are Wave 2 / `M-COST-01`.  
**OK framing:** Taskr protects **revenue and quality** by making field work **visible, photo-backed, and reviewable** so disputes, rework, and missed handoffs cost less. Use “supports cost control / VO discussions with evidence” — not “VO & cost software.”

**Visual guardrail:** No fake app screens showing VO tabs, budgets, Gantt, drawings viewer, or AI chat. Use-case visuals = **outcome copy** only, not module UI.

---

## Brand tokens (Figma variables)

| Token | Hex | Use |
|-------|-----|-----|
| `shell` | `#08576E` | Hero BG, dark bands |
| `shell-strong` | `#0D6E87` | Gradient stop, footer |
| `shell-accent` | `#12A8E0` | Motif stroke accent |
| `workspace` | `#E7F4F8` | Alternate section BG |
| `panel-tint` | `#F8FCFF` | Light BG, hero text |
| `surface` | `#FFFFFF` | Cards, white sections |
| `text` | `#07111E` | Headlines on light |
| `text-muted` | `#577783` | Body secondary |
| `line` | `#C8E2EA` | Motif stroke on white |
| `cta-primary` | `#12A8E0` | Primary buttons (match app accent) |
| `camera-red` | `#DC2626` | FAB / photo-first accent only (≤2% of page) |

**Typography:** Not Inter / Roboto / Poppins / system UI. Display = industrial condensed grotesque (DIN 2014 / IBM Plex Sans Condensed / Barlow Condensed ExtraBold). Body = IBM Plex Sans or Source Sans 3. Mono labels optional (IBM Plex Mono). Desktop H1 56 / H2 36 / body 18. Mobile H1 40 / H2 28 / body 16. Max text block width **640px**. Wordmark: **TASKR** tracked-out all-caps matching the app.

**Grid:** Desktop 12-col @1440 (80px margins). Mobile 4-col @390 (24px margins).

---

## Figma file structure

| Page | Contents |
|------|----------|
| `00 — Cover & tokens` | Goal, audience, links to this brief, color/type variables |
| `01 — Components` | `MKT/*` library (see deliverables) |
| `02 — Desktop Home` | Full scroll, 1440×auto |
| `03 — Mobile Home` | Full scroll, 390×auto |
| `04 — Pricing (opt)` | FAQ deep page |
| `99 — Annotations` | Copy notes, CTA targets, product-truth guardrails |

**Layer convention per section frame:** `BG / Content / UI-mock / Annotation`

**Component naming:** Prefix `MKT/`. Examples: `MKT/Button/Primary`, `MKT/Card/Pricing/Growth`, `MKT/Step/Row`, `MKT/Device/iPhone16Pro`, `MKT/Graphic/Motif/*`. Variants: `state=default|hover`, `size=desktop|mobile`.

---

## Background & environment graphics

### Purpose

Signal **construction + multi-trade subcontracting + photo-backed communication** without stock jobsite photos or fake product modules (no VO/DMS/cost dashboards).

### Visual language

- **Primary medium:** Teal atmospheric wash + **technical linework** (blueprint / elevation / section hatch).
- **Secondary medium:** **Communication glyphs** — camera viewfinder corners, photo stack, assignee nodes, approve/reject stamp rings, handoff arrows between trade tags.
- **Tertiary (sparse):** Subtle concrete/formwork **texture as 2–4% opacity grain**, never photographic.

### Motif library (build as `MKT/Graphic/Motif/*` components)

| ID | Motif | Reads as | Use |
|----|--------|----------|-----|
| M1 | Floor-plan fragment (walls + dims) | Jobsite / layout | Hero left, How it works |
| M2 | Elevation hatching (vertical lines + level markers) | Structure / trades | Hero, Use cases |
| M3 | Section cut with rebar dots | Concrete / MEP coordination | Trade handoff sections |
| M4 | Camera viewfinder brackets (empty center) | Field photo capture | Hero, steps 3–4 |
| M5 | Stacked photo frames (3 offset rects) | Evidence chain | How it works, Use cases |
| M6 | Trade tag pills: EL / PL / HVAC / FIN (outline only) | Subcontracting | Who it's for, Use cases |
| M7 | Assignee node graph (3 circles + dashed edges) | Assign / chase | Signup path, step 4 |
| M8 | Review stamp ring (✓ / ↻ outline, not literal UI) | Approve / rework | Step 5, Use cases |
| M9 | Dashed handoff arrow between two trade tags | Multi-trade handoff | Use case: handoff |
| M10 | Grid bubble + leader line | QC / punch idiom | Punch/rework use case |
| M11 | Corner registration marks | Blueprint authenticity | Section transitions |
| M12 | Soft beam-of-light cone (vector, not lens flare) | “Visibility” metaphor | Hero only, one instance |

**Stroke:** 1.5px @1x (3px @2x export). **Corners:** 2px radius max on rects. **Palette:** `#F8FCFF` / `#12A8E0` / `#0D6E87` on teal; `#C8E2EA` / `#577783` on white sections. **No fills** except hero wash and occasional 8% teal tint blobs.

### Density & opacity rules

- Max **3 motif clusters** above the fold; **≤12** total motifs on full desktop scroll. Mobile: **≤6**.
- Hero motifs: **8–18% of viewport width** each. Mid-page: **4–10%**. Footer fade: **2–6%**. Never scale a single motif >25% width.
- Hero BG wash: teal gradient **100→85%**. Motifs: **6–14%** on hero; **4–10%** on white sections; **2–6%** on pricing. **Never >18%** on any motif behind body copy.
- Negative space ≥40% in hero center-right (device zone). Motifs occupy **outer 30%** left and **outer 25%** right; **clear 45% center-right corridor** for device mock.

### DO

- Keep motifs **abstract and partial** — always cropped by frame edge (implies larger jobsite).
- Anchor motifs to **section meaning** (scroll map below).
- Use **trade tags as words** (EL, PL, HVAC) not cartoon workers.
- Place motifs **behind** content; strongest density **outside** the device mock bounding box.
- Repeat **one** signature motif (M4 viewfinder OR M1 plan fragment) for brand recall.

### DON'T

- No stock photos of hard hats, yellow vests, thumbs-up workers, or crane silhouettes on orange sunset.
- No full blueprint sheet centered behind text (reads as architecture tool, not field comms).
- No fake app screens showing VO, budgets, Gantt, drawings viewer, or AI chat.
- No purple gradients, glassmorphism stacks, or “sparkle AI” icons.
- No clip-art hammers/wrenches larger than 48px.
- No motif opacity >18% anywhere behind body copy.

### Scroll-section graphic map (desktop)

| Section | BG base | Motifs (max 2 clusters) | Opacity |
|---------|---------|-------------------------|---------|
| Hero | Teal gradient `#08576E`→`#0D6E87`, top-left lighter | M1 plan fragment (L), M4 viewfinder (R), M12 light cone (behind device) | motifs 8–14% |
| Who it's for | `#F8FCFF` | M6 trade tags scattered L/R | 6–10% |
| How it works | `#E7F4F8` | M5 photo stack + M7 assignee graph along step row | 6–10% |
| Use cases | White | M9 handoff + M10 grid bubble per card corner | 4–8% |
| Signup path | `#E7F4F8` | M7 node graph aligned to diagram | 6–10% |
| Pricing | White | M2 elevation hatching **footer band only** | 2–6% |
| Get the app | Teal band (short, 40vh max) | M4 viewfinder corners only | 8–12% |
| Trust + Footer | `#07111E` or deep teal | M11 registration marks, very sparse | 2–4% |

**Mobile:** One motif cluster per section max. Hero: plan fragment **or** viewfinder, not both. Motifs **4–10%** width; device mock **full width** with 24px side margin.

---

## Hero composition wire-spec

### Intent

One sentence: field work visible, photo-backed, reviewable. Primary CTA = Start company trial. Device shows **real Activity / task loop** — not a generic todo list.

### Z-layer stack (bottom → top)

| Z | Layer | Notes |
|---|--------|-------|
| 0 | `BG/Gradient` | Full bleed teal wash |
| 1 | `BG/Motifs` | M1 left, M4 right, M12 behind device zone only |
| 2 | `BG/Grain` | Optional 3% noise overlay |
| 3 | `Content/Nav` | Logo Taskr + Sign in |
| 4 | `Content/Copy` | Headline, sub, CTAs |
| 5 | `Content/Device` | iPhone mock + soft shadow |
| 6 | `Content/Badge` | Optional “30-day trial” pill near CTAs |
| 7 | `FG/Annotation` | Non-exported redlines |

### Desktop layout (1440 × 900 min height)

```
|←—— 80px ——|←—— 560px copy block ——→|←—— 720px visual column ——→|←—— 80px ——→|
```

- **Copy block:** left 80px inset, vertically centered.
- **Visual column:** device + motifs; device center at ~**x=980** (68% from left).

| Element | % of 900px hero | Placement |
|---------|-----------------|-----------|
| Nav | 8% (72px) | Top |
| Headline block | 22% | Copy column, upper-middle |
| Sub + CTAs | 14% | Below headline, 24px gap |
| Device mock | **58%** (~520px tall incl. shadow) | Visual column, vertically centered |

### Frame budget (visual weight)

| Element | Target attention |
|---------|------------------|
| Headline + sub | **30%** |
| Device mock (UI readable) | **45%** |
| CTAs | **10%** |
| Background graphics | **15%** combined (must not compete with device) |

### Copy slots (product truth)

- **H1 (max 2 lines):** Jobsite-plain outcome — visibility / photo proof / review. Example: “Make field work visible before it becomes a dispute.”
- **Sub (max 2 lines):** Photo → task → update → review loop. Mention **company + projects**, not “platform.”
- **Primary CTA:** Start company trial
- **Secondary:** Download app
- **Micro trust (optional):** Admin invites seats · workers join by link

### Device mock rules

- **Screen source:** Activity / Site Activity landscape — repo ref: `.dbg/marketing-shots/2026-08-19-w-a01-activity-land.png`
- **Crop safe area:** Top bar + project name + ≥2 task cards + bottom nav (incl. red camera FAB).
- **Rotation:** 8–12° clockwise max; shadow offset 0,24 blur 48 @ 25% black.
- **Do not show:** Developer Settings, empty states, login, VO/cost/DMS screens.
- **Scale:** Mock width ≈ **380–420px** (26–29% of 1440 frame width).
- **Mask:** 12px radius device chrome; optional 1px `#F8FCFF` inner glow on bezel if motifs bleed under mock.

### Mobile hero (390 × ~760)

- Stack: Nav → H1 → sub → CTAs → device mock (centered, **88%** content width).
- Drop right-side motifs; single M1 fragment top-left at 10% opacity.
- Device mock **≥55%** content width; graphics **≤10%** visual weight.

---

## Pages / sections (desktop 1440 + mobile 390)

1. **Hero** — One jobsite sentence + primary CTA (Start company trial) + secondary (Download app). Device mock of Activity / task photo loop. See hero wire-spec above.  
2. **Who it’s for** — Company admin · PM/supervisor · field worker (one line each).  
3. **How it works (3–5 steps)** — Create company → invite team → pick project → photo/task loop → review. Fat-finger friendly copy.  
4. **Use cases (examples)** — Punch/rework QC; assign & chase work; photo proof for client/owner; handoff between trades. Tie each to revenue/quality in one plain sentence. Outcome copy only — no VO module UI.  
5. **Signup path** — Diagram: Admin creates company → Invite link → Worker sets password → Works on projects. No public “join any company.”  
6. **Pricing (transparent)** — R6 SKUs (placeholders OK until confirmed live):
   - Growth — **US$19.99**/mo (include what seats are in the base pack)
   - Unlimited — **US$199.99**/mo
   - Add-ons: +5 workers **US$4.99**, +1 PM **US$9.99**
   - **30-day trial** (card on file — say so clearly)
   - CTA → Stripe checkout / “Subscribe” (same path as in-app Profile → Company plan)
7. **Get the app** — App Store + Google Play buttons (real URLs when ready; placeholders labeled).  
8. **Trust** — Org owns data; admin invites seats; workers don’t wipe the company. Link Privacy + Terms.  
9. **Footer** — Insite Technologies, contact/sales, legal, Taskr name.

Optional second frame: **Pricing detail** page (FAQ: seats, trial, cancel, who pays).

---

## Language rules

- Short sentences. Job site words: task, photo, review, project, company — not “synergy / platform / AI-powered.”  
- Avoid Procore feature bingo.  
- EN first; leave room for ZH-TW later if needed.

---

## CTAs (must exist)

| CTA | Destination |
|-----|-------------|
| Start company trial / Subscribe | Stripe Checkout (`buy.stripe.com` / in-app same SKU story) |
| Download iOS | App Store listing |
| Download Android | Play Store listing |
| Sign in | App deep link or store if not installed |
| Contact sales | mailto or form (if enterprise) |

---

## Figma deliverables checklist

### File setup

- [ ] Cover page: goal, audience, URL, link to this brief
- [ ] Color + type variables (brand tokens above)
- [ ] Effect styles: `Shadow/Card`, `Shadow/Device`, `Blur/BG-motif` (background blur only)

### Components (`MKT/` library)

- [ ] Buttons: Primary (blue CTA), Secondary (outline), Text link
- [ ] Nav: Desktop header + mobile hamburger sheet
- [ ] Step row: icon badge + title + one-line copy (3–5 instances)
- [ ] Use-case card: trade tag + outcome line
- [ ] Signup path diagram: Admin → Invite → Worker → Project
- [ ] Pricing cards: Growth / Unlimited + add-on chips + trial disclaimer
- [ ] Store badges: iOS / Android (placeholder OK, labeled)
- [ ] Footer: Insite Technologies + legal links
- [ ] Device frame: iPhone 16 Pro with locked screen slot
- [ ] Graphic motifs M1–M12 (8–12 reusable SVG components)

### Frames

- [ ] Desktop Home **1440×auto** (all 9 sections)
- [ ] Mobile Home **390×auto**
- [ ] Optional Pricing **1440 + 390**
- [ ] Hero-only export frames (desktop + mobile)

### Exports

- [ ] PNG @2x: hero desktop, hero mobile
- [ ] SVG: motifs + logo lockups
- [ ] Redlines: spacing on hero + pricing cards

### Annotations

- [ ] Layer `99/Annotations`: copy source, CTA URLs, product-truth guardrails
- [ ] Sticky on hero: “Mock = Activity screen; show photo/task loop”
- [ ] Sticky on use cases: “Outcome copy only — no VO module UI”

### Reference assets

- [ ] `.dbg/marketing-shots/2026-08-19-w-a01-activity-land.png` (hero mock SoT)
- [ ] `.dbg/marketing-shots/2026-08-19-w-a04-task-detail.png` (optional secondary)
- [ ] App icon / TASKR wordmark from existing brand assets

---

## Risk notes (graphics & handoff)

| Risk | Mitigation |
|------|------------|
| Motifs overpower device mock | Enforce 45% clear corridor; motifs ≤15% combined visual weight; 4px blur under device only |
| Hard-hat / stock clichés | Ban people photography; use communication artifacts (viewfinders, stamps, trade tags) |
| Reads as architecture / BIM tool | Always pair plan/elevation motifs (M1/M2) with photo/review motifs (M4/M5/M8) |
| VO / cost / DMS overclaim via visuals | No fake module UI; use-case = outcome sentences only; no “Coming soon” chrome unless owner decides (open decision #3) |
| Agent invents purple AI gradients | Explicit DON'T list above; brand tokens only |
| Poor thumbnail legibility | Hero text `#F8FCFF` on `#08576E`; check ≥4.5:1 contrast; motifs stay ≤14% behind copy |
| Wrong mock screen | Lock to Activity landscape; annotation sticky on device component |

---

## Open decisions (owner)

1. Exact Growth pack seat counts on the marketing page (match invite paper caps).  
2. Marketing domain vs `app.insiteworks.co` — recommended: `www.insiteworks.co` for marketing (see `2026-08-21-taskr-public-website-hosting.md`).  
3. Whether VO/cost appear only as “outcome copy” or a labeled “Coming soon.”  
4. Store URLs and ASC display name **Taskr** (not Trackr).
