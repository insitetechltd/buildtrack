# Commercial release week — priority ledger (2026-08-16)

**North star (orchestrator standing constraint):** every request must be judged by whether it helps ship a **stabilized, releaseable** Insite build **within ~7 days**. Prefer harden/ship over expand/polish.

**User commercial goals incorporated:**
1. Remove all engineering-related interface
2. Simplify UI / touchpoints to simplest form
3. Add payment hook
4. Finalize payment plans and business model
5. (+ must-dos below for store-ready commercial push)

---

## Honest timeline gate

| Can fit in ~1 week (if ruthless) | Does **not** fit without cutting elsewhere |
|----------------------------------|--------------------------------------------|
| Strip eng surfaces; freeze UX scope; release build + QA smoke; legal/store checklist | Full Phase C C2–C6 polish; Option B gallery; caption; S-UX-01P typeahead |
| Payment **hook** (checkout stub / Stripe Customer Portal link / “upgrade” CTA) | Full billing engine + entitlement enforcement + invoice UX |
| Business model **decision doc** + plan SKUs on paper | Live multi-tenant metering, seats, overages |
| Privacy policy URL + App Store / Play metadata | M-SUPABASE-04b column drops (blocked ~2026-09-07) |
| Native rebuild post-IMGLY + TestFlight / internal track | Cold archive 04e; LLM feature line |

**Assumption (default until you override):** “First commercial release” = **paid pilot / early access** on TestFlight + Play internal/closed testing — not full App Store feature-complete + automated billing for every tenant. Payment can ship as **hook + manual activation** week-1.

---

## Ranked backlog toward release (P0 → P3)

### P0 — Blockers (do these first; week-critical)

| Rank | Item | Why release-critical | Roadmap / source | Est. |
|------|------|----------------------|------------------|------|
| **R1** | **Strip engineering UI** from production builds | User #1; cannot ship with Sprint7 sandbox / Dev Admin / Developer Settings visible to customers | Profile menu → Developer Settings; `DevAdminScreen`; Maestro `sprint7-*` flows stay for QA only | 0.5–1 d |
| **R2** | **Release candidate build** (native rebuild after S-UX-01Q2 IMGLY uninstall) | App will not match repo without rebuild; Skia draw path needs fresh native | ROADMAP S-UX-01Q2 Notes | 0.5–1 d + CI |
| **R3** | **Core loop freeze + smoke** | Commercial trust = photo→task→review→complete works on RC | Create-task-photo P01–P22 already green; re-run on RC + login/create/detail smoke | 0.5–1 d |
| **R4** | **Store / legal prerequisites** | Privacy policy URL, account deletion path, data collection disclosures, support URL | `ANDROID_PLAY_STORE_CHECKLIST.md`, `HOST_PRIVACY_POLICY_GOOGLE.md`, ASC | 0.5–1 d (mostly you) |
| **R5** | **Production env hardening** | No debug LogBox in release; correct `EXPO_PUBLIC_*`; no sandbox auto-init; bundle id / signing match release | Release Manager gate; danger-gates for version bumps | 0.5 d |

### P1 — Commercial must-haves (same week if P0 on track)

| Rank | Item | Why | Notes |
|------|------|-----|-------|
| **R6** | **Business model decision (written)** | User #4; unlocks payment SKUs | **LOCKED 2026-08-16** — see § R6 below (trial + 3 tiers + worker seats) |
| **R7** | **Payment hook** | User #3 | Must match R6: card-at-trial + post-trial charge; Stripe Checkout/Subscriptions preferred over sales-only CTA |
| **R8** | **UI simplify pass (touchpoint cut)** | User #2 | **Not** full Phase C. Cut/hide: nested admin chrome, duplicate entry points, fat Create Task optional blocks behind progressive disclosure already started. Cap scope to **field core loop** |
| **R9** | **Onboarding for first commercial tenant** | Without invite/approve path clarity, sales cannot land | Pending users already exist; verify admin→approve→worker login once on RC |

### P2 — Strongly recommended before public store (can slip to week+1)

| Rank | Item | Why |
|------|------|-----|
| **R10** | Crash / error telemetry (Sentry or equivalent) | Blind shipping |
| **R11** | Support / feedback channel in Profile | Store review + pilot ops |
| **R12** | Brand / C5 | **Closed** — Insite=company, Taskr=app; rename N/A. Opt-A attribution + Opt-B Tailwind tokens **tabled** |
| **R13** | Entitlement enforcement (read-only / block create when unpaid) | Without this, payment hook is cosmetic |

### P3 — Explicitly **defer** for this release week (do not schedule)

| Item | Why defer |
|------|-----------|
| M-SUPABASE-04b column drops | Blocked until ~**2026-09-07** |
| M-SUPABASE-04e cold archive | Ops, not launch |
| S-UX-01Q Phase C C2–C6 (TextField, TaskActionScreen, row collapse, typeahead) | Polish ≠ ship |
| Option B gallery / Phase 3 caption | Product forks; expand scope |
| S-UX-01P typeahead | Deferred UX hygiene |
| LLM / AI feature line | Explicitly paused |
| M-CURSOR Trae delete | Tooling, not customer |

---

## Map: your 4 asks → ranks

| Your ask | Maps to | Week verdict |
|----------|---------|--------------|
| 1. Remove eng interface | **R1** | Must do |
| 2. Simplify UI/touchpoints | **R8** (narrow) | Must do **bounded**; reject Phase C sprawl |
| 3. Add payment hook | **R7** | Must do minimal; full billing = week+ |
| 4. Finalize payment plans / business model | **R6** | **LOCKED** (monthly; trial; Growth/Unlimited + worker $9.99; entry = create+update) |

---

## What else you need (beyond the 4)

1. **Legal:** privacy policy hosted URL; terms if charging; App Store “sign in with …” / delete account if required  
2. **Identity:** production Apple/Google signing; release bundle id ≠ `.local` if that is only for sim  
3. **Ops:** how a paying company gets provisioned (manual admin vs self-serve)  
4. **Support:** who answers pilot tickets  
5. **Data:** backup/restore story for paying tenants (04c policy already: hot retain)  
6. **QA evidence:** RC smoke + one field journey on device, not only Maestro on sim  

---

## Orchestrator rule (from now)

On every user request, answer in ≤3 lines:

1. **Helps release?** (yes / partial / no)  
2. **Timeline hit?** (hours / days / slips week)  
3. **Recommend:** do now / park / need GO  

Reject or reframe work that is P3 polish unless you explicitly override the north star.

---

## R6 — Business model (LOCKED 2026-08-16)

**Decision owner:** user (this session). Orchestrator treats this as SoT for R7 SKU copy and entitlement design.  
**Cadence:** all paid prices are **per month** (confirmed).

### Trial
- Duration: **1 week max**
- Scope: **1 project only**
- Billing: **credit card collected at trial start**
- After trial: **auto-charge** to the paid plan chosen at signup (no ongoing free tier)

### Three company / PM tiers (+ worker add-on)

| Tier | Price | Who | Limits |
|------|-------|-----|--------|
| **Free (trial)** | $0 for ≤1 week | New accounts | **1 project**; then auto-charge |
| **Growth** | **US$19.99 / month** | **PM + company admin** tier (not worker rate) | **5 projects**; **≤200 entries / week** |
| **Unlimited** | **US$199.99 / month** | **PM + company admin** tier | **Unlimited projects** + **unlimited entries** for PMs/admins |
| **Worker seat** | **US$9.99 / month** each | **Workers only** | **50 entries / week** per worker |

### Billing roles
- **Project managers** and **company admins** → Growth or Unlimited rates (never the worker SKU).
- **Workers** → **$9.99/mo** seat add-on only.
- Assumption (week-1): Growth/Unlimited are **company subscriptions** that cover PM/admin users; worker seats stack on top. Correct if you meant per-PM seat billing instead.

### Entry (metering unit) — LOCKED
An **entry** counts as either:
1. **Task create**, or
2. **Task update**

(Photo-only / non-task actions do **not** count unless they also create/update a task.)

### Implications for release week
- R7: Stripe monthly subscriptions + trial with card-on-file + auto-convert after 7 days; SKUs = Growth, Unlimited, Worker seat.
- R13: meter **projects** + **entries/week** (create+update); soft limits + upgrade CTA OK if hard block slips.
- Map app roles → billable class: `company_admin` / manager-class PM → Growth|Unlimited; `worker` / member → Worker seat.

### Clarifications closed
1. Cadence → **month** (all prices)  
2. Worker → **$9.99/mo** (not $10)  
3. Entry → **task create + task update**  
4. After trial → **auto-charge**  
5. PM + company admin → **higher tiers**; workers only on **$9.99**

---

## Remaining GO (B–D still open)

**B. Payment week-1:**  
1. Stripe Checkout / Subscriptions hook + card-at-trial + auto-charge after 7d (matches R6)  
2. “Request access / sales” CTA only (**conflicts** with card-at-trial — avoid)  
3. Full Stripe + webhooks + hard metering (may slip week)

**C. Eng UI strip:** hide behind `__DEV__` only, or remove nav entries entirely from release profiles?

**D. Release channel this week:** TestFlight + Play internal, or public store listing?

