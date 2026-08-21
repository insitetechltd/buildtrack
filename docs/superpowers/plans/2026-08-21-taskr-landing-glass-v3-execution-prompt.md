# Taskr landing — Glass v3 EXECUTION PROMPT (paste-ready)

**Use for:** Figma Make / generate-design / Cursor Figma agent  
**File:** https://www.figma.com/design/gTKeArmzmI3DOCz6RlHxhq  
**Baseline (do not overwrite):** page `98 — Archive` → `Home / Desktop — Filled v2 · archived 2026-08-21`  
**Working target:** `Home / Desktop — Glass v3` (scaffold may already exist at node `24:2` — evolve it, or replace)  
**Company legal:** **Insite Works Limited** · App: **Taskr** · Never “Trackr”

**Screenshot assets (after recapture):** `.dbg/marketing-landing/mkt-01-activity.png` … `mkt-04-*.png`  
**Prep command (already runnable):** `node scripts/maestro/prepare-marketing-landing-tasks.cjs` then Maestro `maestro/flows/marketing-landing-shots.yaml` on iPhone 16.

---

```text
EXECUTE: Build / finish “Home / Desktop — Glass v3” for Taskr marketing landing.

CONTEXT
- Solid v2 is archived and locked. Do not edit the archive.
- Evolve frame “Home / Desktop — Glass v3” (or create beside Solid at x≥1700). Frame width 1440, full-page scroll.
- Company = Insite Works Limited. Eyebrow: “CONSTRUCTION FIELD APP BY INSITE WORKS”. Footer: “© 2026 Insite Works Limited · Taskr” + Privacy · Support · Terms.
- Product truth only: photo → task → assign → update with photos → review/approve. Project-scoped. Admin invites seats into one company.
- Do NOT claim or draw: VO module, cost/budget OS, DMS/drawings, BIM, Gantt, AI, multi-company partner invites, public people directory.
- OK in copy only: “supports cost control / VO discussions with evidence.”

PROBLEM WITH CURRENT SCREENSHOTS (MUST FIX IN THIS PASS)
- Prior phone fills still show non-marketing language: Maestro IDs, “Alice Worker”, “Electrical Wiring Phase 1”, sandbox emails, empty forms, logo-cube as photo.
- Those reads as a test build. Reject any device fill that shows Maestro/Alice/Bob/henry@/Phase 1 sandbox titles.
- Required visible task titles on Activity / Tasks / Detail (use these exact strings or the seeded set):
  1) L3 corridor — fire-stop penetrations incomplete
  2) HVAC make-good after duct clash — Grid D/5
  3) Handoff: EL complete, HVAC can start — L5 east
  4) Punch: door hardware missing — core toilets L3
  5) Seal ceiling joints — L2 south corridor
- Project chip/name may remain “Project A - Commercial Building” until renamed; prefer commercial fit-out language in captions if project rename is unavailable.
- Device aspect ~9:19.5 (iPhone 16 logical ~402×874). Outer hero ~295×639 to 396×861. Use-case ~230–360 wide. Scale mode FIT or top-CROP — never stretch FILL that distorts UI.
- Inject screenshots from `.dbg/marketing-landing/mkt-01-activity.png`, `mkt-02-tasks.png`, `mkt-03-task-detail.png`, `mkt-04-create.png` when present. If missing, leave screen-slot empty with annotation “AWAIT MKT SHOT” — do not reuse Maestro-noise PNGs.

ART SYSTEM — “SITE GLAZING OVER A BAY”
Metaphor: polycarb / bay glazing looking onto structure — NOT Apple Settings glass, NOT purple AI mesh.
Tokens: shell #08576E · strong #0D6E87 · accent/CTA #12A8E0 · workspace #E7F4F8 · panel #F8FCFF · text #07111E · muted #577783 · line #C8E2EA · camera-red #DC2626 (≤2% of page).
Glass: light fill #F8FCFF @ 68–78% OR teal #08576E @ 58–70%; background blur 16–24px; 1px #12A8E0 edge @ 35–55% + optional white top edge @ 30%; radius 12–16px.
Glass ALLOWED: nav strip, workflow stations, trade labels, invite-path nodes, screenshot captions.
Glass FORBIDDEN on: phone screens, phone bezels, primary/secondary CTAs, pricing cards, price numerals, trust/legal body.
Under glass (required motifs): isometric bay/slab (~25–30°), survey grid 8–12% opacity, trade lanes EL/PL/HVAC with a photo-ticket moving between them, optional viewfinder corners. Density ≤3 motif clusters above fold; motif opacity ≤18% behind copy.

STRUCTURE (replace Solid v2 layout failures)
1) HERO — Brand-first TASKR lockup + one headline + one support line + CTAs “Start company trial” / “Download the app”. One real Activity screenshot in a 9:19.5 iPhone sitting INSIDE an isometric structural bay. Photo-ticket path EL → PL → HVAC → Assigned / Photo update / Approved. No cards, stickers, or glass pills on the device screen. Headline direction OK: “See the work. Assign it. Prove it’s done.” (prefer assign in the line).
2) WHO IT’S FOR — Three stations/lanes on one project spine: company admin · PM/supervisor · crew/trade. Not persona cards. Not stock people.
3) HOW IT WORKS — Five stations along ONE project bay (create company → invite seats → project → photo/task loop → review). NOT five numbered equal SaaS cards.
4) USE CASES — Three staggered editorial scene bands (not three identical full-height phones): Activity + weekly critical work; Create-from-photo; Task detail / work thread. Captions tie to revenue/quality. Prefer a fourth band or caption for trade handoff.
5) SIGNUP PATH — Invite-gate diagram: Admin creates company → invite link → set password → projects. Phone secondary = Create company / Sign-in with clean UI (no sandbox email if avoidable). No public join-any-company.
6) PRICING — Opaque white cards only: Growth $19.99 (≤3 projects / ≤10 workers) · Site Ops $99.99 (≤10 projects / ≤20 workers) · add-ons +5 workers $4.99 / +1 PM $9.99 / +3 projects $9.99 · 30-day trial (card on file). **NO Unlimited / all-you-can-eat tier.**
7) DOWNLOAD — Short teal band; real store-badge style (placeholder labeled OK); RC honesty line.
8) TRUST + FOOTER — Org owns data; admin invites; workers don’t wipe company. Legal: Insite Works Limited.

TYPE
Display: industrial condensed grotesque (DIN 2014 / IBM Plex Sans Condensed / Barlow Condensed ExtraBold). Body: IBM Plex Sans or Source Sans 3. Forbidden: Inter, Roboto, Poppins, Outfit, faux stencil. Wordmark: TASKR tracked-out all-caps.

CRAFT
Auto Layout for sections. Components prefix MKT/: Device/iPhone16Pro (screen-slot), Button/Primary|Secondary, Glass/Panel, Nav, Footer, Motif/*, Pricing cards, Step/Station. Annotation layer: “do not claim/draw VO/cost/DMS/multi-company” + “screenshots must show marketing titles only”.

ANTI-PATTERNS (hard ban)
Purple/AI glass; glass-on-glass; frosting app screenshots; 5 equal numbered cards; 3 identical empty phones; Maestro/Alice/Bob/sandbox titles in device fills; hardhat sunset stock; full blueprint behind headlines; invented VO/BIM/Gantt UI; cream+terracotta; newspaper look.

SUCCESS CHECK
A construction PM feels commercial multi-trade work that lives on communication; phones show readable fire-stop / HVAC / handoff titles; glass feels like site glazing over a bay — not a generic frosted SaaS template.
```

---

## Operator notes (not for Figma paste)

| Step | Command / action |
|------|------------------|
| 1 Prep DB | `node scripts/maestro/prepare-marketing-landing-tasks.cjs` — cancels Maestro-noise titles, seeds 8 marketing titles + `critical_this_week` (**done 2026-08-21: cancelled 152, seeded 8**) |
| 2 Settle | After prep, wait for sync / relaunch Taskr once UI is responsive (mass cancel can stall main thread; Maestro will time out on “Save Password?” snapshot if UI is busy) |
| 3 Capture | `MAESTRO_UDID=<iPhone-16> bash scripts/maestro/run-local.sh test maestro/flows/marketing-landing-shots.yaml` |
| 4 Collect | Copy Maestro `mkt-*.png` → `.dbg/marketing-landing/` |
| 5 Inject | FIT/CROP into Glass v3 device slots; **reject** any fill with ban-list language |
| 6 Execute art | Paste the EXECUTE block above into Figma agent |

**Ban list for device fills:** `Maestro`, `Alice Worker`, `Bob Worker`, `henry@`, `Wiring Phase`, `UP Photo`, `CT Photo`, empty Create title, logo-cube as site photo.

**Status:** DB marketing titles ready. Fresh PNG capture still pending (sim UI hung after mass cancel). Do not ship Glass v3 with old Maestro-noise screenshots.
