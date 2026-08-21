# Taskr public website — hosting + legal consolidation (2026-08-21)

**Status:** Landing HTML exported to `docs/index.html` (Hybrid v4 CHOSEN). Domain cutover still Human GO.  
**Related:** Figma landing `https://www.figma.com/design/gTKeArmzmI3DOCz6RlHxhq?node-id=44-2` · brief `2026-08-21-taskr-marketing-landing-figma-brief.md`

---

## Current state (live today)

| Page | Live URL | Source in repo |
|------|----------|----------------|
| Privacy | `https://insitetechltd.github.io/buildtrack/privacy-policy.html` | `docs/privacy-policy.html` (+ `docs/legal/`) |
| Support | `https://insitetechltd.github.io/buildtrack/support.html` | `docs/support.html` |
| Terms | `https://insitetechltd.github.io/buildtrack/terms-of-service.html` | `docs/` / `docs/legal/terms.html` |
| Marketing home | GitHub Pages `docs/index.html` | Hybrid v4 landing + links to privacy / support / terms |

ASC / Play / App Review already point at the GitHub Pages privacy + support URLs. In-app Profile opens those same URLs.

**Problem:** Marketing landing, support, and privacy are split across “GitHub project pages” branding — wrong for commercial RC and for Taskr naming.

---

## Recommended site map (one public site)

Host **one static marketing site** (not the Wave 2 logged-in admin app):

| Path | Purpose |
|------|---------|
| `/` | Landing (how it works, signup, pricing, store + subscribe CTAs) |
| `/pricing` | Optional deep pricing / FAQ |
| `/support` | Support (migrate `docs/support.html`) |
| `/privacy` | Privacy Policy (migrate `docs/privacy-policy.html`) |
| `/terms` | Terms of Service |
| `/download` | Optional thin redirect/deep-link helper to stores |

**Keep separate (Wave 2):** `https://app.insiteworks.co` → authenticated web admin / DMS (`M-WEB-01`). Do **not** put marketing + app shell on the same deploy if it slows RC.

---

## Domain recommendation

| Host | Role |
|------|------|
| **`https://www.insiteworks.co`** (or apex `insiteworks.co`) | Public marketing + legal + support (**this site**) |
| **`https://app.insiteworks.co`** | Future product web app only (locked Wave 2) |

Also fix copy that still says `insiteworks.com` / support mailto if the real brand domain is **`insiteworks.co`**.

Stable paths forever (even if you change hosts later):

- `https://www.insiteworks.co/privacy`
- `https://www.insiteworks.co/support`
- `https://www.insiteworks.co/terms`

Then update ASC, Play, and in-app Profile once; leave GitHub Pages as **301 redirects** for 6–12 months so old review links don’t break.

---

## Hosting options (pick one)

All fine for a static Next/Astro/plain-HTML site.

| Option | Fit | Notes |
|--------|-----|--------|
| **A. GitHub Pages + custom domain (cheapest)** | **Preferred for cost** | **$0.** You already host privacy/support/terms here. Point `www.insiteworks.co` (CNAME) at Pages; expand `docs/` into the full landing. No new vendor. |
| **B. Cloudflare Pages** | Also $0 | Only worth it if DNS is already on Cloudflare and you want easier redirects/previews; otherwise extra setup for same price as A. |
| **C. Vercel / Netlify free tier** | $0 but new vendor | Fine later; not needed to save money today. |
| **D. Stripe Projects → provision host** | Skip for cost | Adds process; not cheaper than A/B. |

**Owner decision (2026-08-21):** cheapest path → **A. GitHub Pages + owned domain.**

**Do not** burn EAS / Expo / a paid VPS for a static marketing site.

---

## Consolidation checklist

1. Design landing in Figma (in progress).  
2. Choose host + confirm DNS ownership for `insiteworks.co`.  
3. Build static site: `/` + migrate privacy / support / terms to clean paths.  
4. Taskr naming everywhere (no Trackr).  
5. 301 old GitHub Pages URLs → new paths.  
6. Update ASC Privacy + Support URLs; Play Data safety / store listing; in-app Profile link constants.  
7. Point Stripe Customer Portal / checkout success “return URL” at marketing or app as product decides.  
8. Human GO before cutting over store URLs (reviewers may hit links during review).

---

## Out of scope for this site

- Logged-in company admin web (`M-WEB-01`)  
- Tenant wipe / data-owner console  
- Hosting the Supabase Edge invite HTML as the marketing home (invite-open stays a function; marketing can *link* to store / deep link)

---

## Decision needed from owner

1. **Domain:** `www.insiteworks.co` as marketing home — yes/no?  
2. **Host:** Cloudflare Pages vs Vercel vs keep GH Pages + custom domain only?  
3. **Cutover timing:** after TF RC smoke, or wait until ASC name is Taskr?
