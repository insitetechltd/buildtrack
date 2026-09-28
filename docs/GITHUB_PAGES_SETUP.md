# GitHub Pages + www.insiteworks.co

**GitHub Repository**: `https://github.com/insitetechltd/buildtrack.git`  
**Custom domain**: `insiteworks.co` / `www.insiteworks.co` (`docs/CNAME`)

## Publish path (selective — required)

Pages must **not** publish the whole `docs/` tree. Internal trees such as
`docs/superpowers/` (plans, evidence, analysis) must stay off the public site.

| Piece | Path |
|---|---|
| Workflow | `.github/workflows/pages-marketing.yml` |
| Staging script | `scripts/pages/stage-marketing-site.sh` |
| Artifact contents | Allowlisted marketing files only (see script header) |

### Included in the Pages artifact

- `docs/CNAME`, `docs/.nojekyll`
- Company landing: `docs/index.html`, `company.css`, `company.js`
- Legacy redirects: `signup.html`, `privacy-policy.html`, `support.html`, `terms-of-service.html`, `billing.html`
- Taskr product site: `docs/taskr/**`
- Portfolio media: `docs/assets/**`, `docs/company-assets/**`, `docs/company-media/**`
- Extra legal HTML: `docs/legal/**`

### Excluded (never published)

- `docs/superpowers/**`
- `docs/archive/**`, `docs/simulation-mockups/**`, `docs/i18n/**`
- All `docs/*.md` (this file, troubleshooting, SoT markdown)
- Entire `documentation/` tree (not under `docs/` and not copied)

Local dry-run (no GitHub API):

```bash
bash scripts/pages/stage-marketing-site.sh
# inspect .cache/pages-site — must not contain superpowers/ or *.md
```

## Manual switch (Human GO — changes the live site)

As of 2026-09-28 the repo still used **legacy** Pages:

- Settings → Pages → **Deploy from a branch**
- Branch: `main`, folder: `/docs` (publishes **everything** under `docs/`)

To cut over to the selective Actions path (do this only when ready for the live site to use the new artifact):

1. Open **https://github.com/insitetechltd/buildtrack/settings/pages**
2. Under **Build and deployment → Source**, change from **Deploy from a branch** to **GitHub Actions**
3. Open **Actions → Pages Marketing → Run workflow**
   - Select branch `cursor/cbp-scrubber-tahoe-264-ddef` (or `main` once the workflow is there)
   - Run workflow
4. Wait for the green deploy; confirm:
   - `https://www.insiteworks.co/` (company)
   - `https://www.insiteworks.co/taskr/` (product)
   - `https://www.insiteworks.co/superpowers/` → **404** (must not serve internal docs)

Until step 2, pushing this workflow does **not** change what the custom domain serves.

## Site map

| URL | Content |
|-----|---------|
| https://www.insiteworks.co/ | Insite Works construction portfolio |
| https://www.insiteworks.co/taskr/ | Taskr product landing |
| https://www.insiteworks.co/taskr/signup.html | Checkout-first company signup |
| https://www.insiteworks.co/taskr/signup.html?env=sandbox | DEV + Stripe test signup |
| https://www.insiteworks.co/taskr/support.html | Support |
| https://www.insiteworks.co/taskr/privacy-policy.html | Privacy |
| https://www.insiteworks.co/taskr/terms-of-service.html | Terms |
| https://www.insiteworks.co/taskr/billing.html | Plan manage / cancel |

Legacy paths at the domain root (`/signup.html`, `/support.html`, …) **redirect** into `/taskr/…`.

## Signup (checkout-first)

```
https://www.insiteworks.co/taskr/signup.html
https://www.insiteworks.co/taskr/signup.html?env=sandbox
```

Deploy Edges: `bash scripts/supabase/deploy-signup-checkout.sh --project-ref <ref>`.

After deploy, allow Auth redirect URLs for `https://www.insiteworks.co/taskr/**` on DEV and PROD.

## In-app / ASC constants

Canonical SoT: `src/legal/legalLinks.ts` → `https://www.insiteworks.co/taskr/…`
