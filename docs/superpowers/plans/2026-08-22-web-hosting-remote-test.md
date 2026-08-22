# Web hosting — remote test while away (2026-08-22)

**Urgency:** Owner away ~45 min from kickoff; need URLs that work **without your Mac running Metro**.

---

## Two different sites (do not merge)

| Site | URL (target) | What it is | Status today |
|---|---|---|---|
| **Marketing + legal** | `https://insitetechltd.github.io/buildtrack/` → later `www.insiteworks.co` | Static landing, privacy, support, terms | **Live now** on GitHub Pages |
| **Product web app** | `https://app.insiteworks.co` | Logged-in admin + project workspace (`M-WEB-01/02`) | **Not built yet** — kickoff next |

**Owner Console** = inside **Taskr mobile app**, not a website. Remote test = TestFlight / dev client, not Pages.

---

## Locked hosting decision

### Marketing (static) — **GitHub Pages** (already chosen)

- **Now:** `https://insitetechltd.github.io/buildtrack/`
- **Cost:** $0
- **While away:** Works from any browser; no laptop required
- **Later:** CNAME `www.insiteworks.co` → Pages; keep GitHub URLs as 301 redirects for store review links

### Product web (`M-WEB`) — **Vercel** for dev/preview, then **app.insiteworks.co**

| Phase | Host | Why |
|---|---|---|
| **Dev / away testing** | **Vercel** preview deploys (`*.vercel.app`) | Push-to-URL in ~2 min; no Mac; free tier; easy env vars |
| **Production** | `app.insiteworks.co` CNAME → Vercel (or Cloudflare Pages if DNS already there) | Locked product URL; Supabase Auth redirect allowlist |

**Not for static marketing:** don’t burn EAS Hosting on landing HTML.

**Rejected for dev speed:** laptop Metro + tunnel (Mac must stay awake; bad while traveling).

**EAS Hosting:** viable later if you want one Expo vendor; Vercel is faster to first preview for `expo export -p web`.

---

## Before you leave (checklist)

### Already works remotely
- [ ] Open **https://insitetechltd.github.io/buildtrack/** on phone — marketing landing
- [ ] Privacy / support / terms on same GitHub Pages host

### Mobile app (Owner Console, field loop)
- [ ] **TestFlight** — user ships Owner Console in a new build (replaces “wait until back”)
- [ ] **Dev client + Metro tunnel** — only if Mac stays on; not needed if TestFlight build covers away testing
- [ ] **Cursor mobile app** — continue agent dev sessions away; pair with TestFlight for on-device QA (no local sim/Maestro from phone)

### When web coding starts (kickoff)
1. Add `npm run web:export` → `expo export -p web`
2. Add `vercel.json` (SPA rewrite to `index.html`)
3. Vercel project: root `dist/` (or Expo web output dir after first export)
4. Env on Vercel: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` (same as mobile)
5. **Supabase Dashboard → Auth → URL configuration:** add  
   - `https://app.insiteworks.co/**`  
   - `https://*.vercel.app/**` (preview)
6. First preview URL → test login from phone browser

---

## Supabase Auth (required for web login away from home)

Add redirect URLs before first remote web login test:

- Site URL: `https://app.insiteworks.co` (prod) or Vercel preview URL (dev)
- Redirect allowlist: same origin + `/auth/callback` path (exact path TBD when `WebApp` router lands)

**Human Gate:** no production Auth URL changes during ASC review unless you accept re-test risk — **preview `*.vercel.app` is safe for dev**.

---

## 45-minute plan (realistic)

| Minutes | Action |
|---|---|
| 0–5 | Confirm marketing URL loads on your phone (GitHub Pages) |
| 5–15 | Decide: test mobile via **TestFlight only** while away (no Owner Console) **or** leave Mac on + tunnel (not recommended) |
| 15–30 | Optional: commit + push planning docs only (no app.json/eas churn) |
| 30–45 | **Do not** block travel on Vercel — web UI doesn’t exist yet; first Vercel deploy = day 1 of M-WEB kickoff |

---

## References

- `docs/superpowers/plans/2026-08-21-taskr-public-website-hosting.md`
- `docs/superpowers/plans/2026-08-22-web-normal-users-kickoff.md`
- `docs/superpowers/plans/2026-08-22-dual-track-kickoff-owner-console-and-web.md`
