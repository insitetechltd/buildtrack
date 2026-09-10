# GitHub Pages + www.insiteworks.co

**GitHub Repository**: `https://github.com/insitetechltd/buildtrack.git`  
**Custom domain**: `insiteworks.co` / `www.insiteworks.co` (`docs/CNAME`)  
**Source**: branch `master`, folder `/docs`

## Site map

| URL | Content |
|-----|---------|
| https://www.insiteworks.co/ | Insite Works construction portfolio (Keynote HTML export) |
| https://www.insiteworks.co/taskr/ | Taskr product landing |
| https://www.insiteworks.co/taskr/signup.html | Checkout-first company signup |
| https://www.insiteworks.co/taskr/signup.html?env=sandbox | DEV + Stripe test signup |
| https://www.insiteworks.co/taskr/support.html | Support |
| https://www.insiteworks.co/taskr/privacy-policy.html | Privacy |
| https://www.insiteworks.co/taskr/terms-of-service.html | Terms |

Legacy paths at the domain root (`/signup.html`, `/support.html`, …) **redirect** into `/taskr/…`.

## Enable / verify Pages

1. Repo **Settings → Pages**
2. Deploy from branch `master`, folder `/docs`
3. Custom domain: `insiteworks.co` (HTTPS enforced)

## Signup (checkout-first)

Same flow on sandbox and production (config swap only):

```
https://www.insiteworks.co/taskr/signup.html
https://www.insiteworks.co/taskr/signup.html?env=sandbox
```

Deploy Edges: `bash scripts/supabase/deploy-signup-checkout.sh --project-ref <ref>`.

After deploy, allow Auth redirect URLs for `https://www.insiteworks.co/taskr/**` on DEV and PROD.

## In-app / ASC constants

Canonical SoT: `src/legal/legalLinks.ts` → `https://www.insiteworks.co/taskr/…`
