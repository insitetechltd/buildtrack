# ASC App Review demo credentials — do not drift

**Why this exists:** Taskr 1.1.3 (build 280) was rejected under **Guideline 2.1** because demo login `sara@insitetest.com` returned `invalid_credentials` on PROD. The same pattern happened twice. Root cause in-repo: Auth Admin password PUTs from dual-env p-matrix (`mint_qa_jwt` set a random `Probe-…` password and never restored it). Local Mac `.cache/` Metro QA scripts have also rotated Sara outside git.

## Locked emails (SoT)

`scripts/lib/asc-review-demo-accounts.json`

| Email | Role in review / dogfood |
|---|---|
| `sara@insitetest.com` | Insite Test Ltd CA — ASC Review Information (current) |
| `john@insitetest.com` | Field / dual-user subject on same tenant |
| `joe@insitetest.com` | Historical ASC demo / store-shot actor — keep locked |

Passwords are **not** stored in git. They live only in **App Store Connect → App Review Information**.

## Guard

| Surface | Path |
|---|---|
| Manifest | `scripts/lib/asc-review-demo-accounts.json` |
| Node | `scripts/lib/ascReviewDemoGuard.cjs` |
| Python | `scripts/lib/ascReviewDemoGuard.py` |

Normal CI / Maestro seed / Gate / p-matrix / reset scripts **refuse** Auth Admin password changes for those emails unless:

```bash
ASC_DEMO_PASSWORD_BREAK_GLASS=1
```

If you intentionally rotate a locked password: set the break-glass env **and** update ASC Review Information (and any Resolution Center reply) in the **same** change window. Do not leave ASC pointing at a stale password.

## Wired call sites (must stay gated)

- `scripts/supabase/probe-p01-p10-dual-target.py` — `mint_qa_jwt` uses password-grant only for locked emails (no Admin PUT)
- `scripts/stripe/probe-update-company-addons-faith.py`
- `scripts/supabase/seed-dev-qa-after-parity.cjs` (DEV `@test.com` actors; still refuses if env overrides point at locked emails)
- `reset_single_user_password.js`, `reset_all_passwords.js`
- `check_and_fix_auth_users.js`, `rebuild_auth_users_from_users.js` (password-set paths)

## Operator note — Mac `.cache` (not in git)

Paths such as `.cache/metro-prod-gate0-*/metro-prod-qa-creds.json` and any one-off Metro→PROD helpers that call Auth Admin `updateUser` **password** on `*@insitetest.com` are outside this repo. Operators must:

1. Prefer password-grant / existing ASC password — never Admin reset for review demos.
2. If a local script still resets Sara/John/Joe, stop using it or add the same guard locally.
3. After any accidental rotate: reset back to the ASC password **and** confirm ASC Review Information matches before replying to App Review.

## Preferred test actors

| Plane | Prefer |
|---|---|
| DEV Maestro / seed | `carol.admina@test.com`, `john.managera@test.com`, `alice.workera1@test.com`, … |
| PROD JWT probes | Password-grant against locked demos **without** Admin PUT, or disposable probe users — never `Probe-…` overwrite |
