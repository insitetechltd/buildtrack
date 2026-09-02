# M-OPS-03 — Owner Admin Internal TestFlight kickoff

**Date:** 2026-08-30  
**Milestone:** `WS-OPS / M-OPS-03` Phase 0  
**IA SoT:** [`2026-08-22-owner-console-modules-complete.md`](./2026-08-22-owner-console-modules-complete.md)

## Distribution lock

| Rule | Value |
|---|---|
| App display name | **hq** |
| Bundle ID | `com.insite.hq` |
| Path | [`apps/owner/`](../../apps/owner/) |
| TestFlight | **Internal only** (ASC team ≤100) — EAS profile `internal` uses `distribution: store` **only** so Apple accepts TF upload; **never** App Store release / External TF |
| Forbidden | App Store listing, External TF, Public link, clicking “Submit for Review” |
| First backend | **DEV** Supabase (`zusulknbhaumougqckec`) via EAS env `preview` |
| Later | `production-internal` → PROD (still Internal TF only) |

Field Taskr (`com.buildtrack.app.local`) stays on its own App Store / daily TF path. Do not merge binaries.

## Human ASC checklist (once)

Do these in Apple Developer / App Store Connect (~15–30 min):

1. [x] App ID **`com.insite.hq`** registered (ASC resource `832V68UPKV`) — ignore stuck `com.buildtrack.owner`
2. [ ] App Store Connect → **My Apps** → **+** → New App
   - Platforms: iOS
   - Name: **hq**
   - Bundle ID: `com.insite.hq`
   - SKU: `insite-hq`
   - **Do not** prepare for App Store submission / sale
3. [ ] Users and Access: ensure your Apple ID has Admin / App Manager / Developer
4. [ ] TestFlight → Internal Testing → add yourself; **do not** create External groups or Public Link
5. [ ] Note the ASC App ID (numeric) into `apps/owner/eas.json` submit.internal.ios.ascAppId when known
6. [ ] From `apps/owner`, run **once interactively** (Apple login / credential sync for new bundle ID):  
   `eas build --profile internal --platform ios`  
   After that, non-interactive builds work. Then:  
   `eas submit --profile internal --platform ios --latest`

## Build / submit (after ASC app exists)

Expo project: https://expo.dev/accounts/insitetech/projects/insite-owner  
EAS project ID: `d82603e8-9bcf-4f6f-942a-404ac825a4de`

```bash
cd apps/owner
./build-and-submit.sh ios
# Same law as Taskr: profile `dev` → EAS `preview` → DEV. Never App Store.
```

No Beta App Review for Internal TF. Builds expire ~90 days — re-upload.

## Phase 0 app contents

- Login (email/password) → Supabase session
- Allowlist gate (`platformSuperusers` Tristan UUID) — non-owner signed-out / denied
- Shell: Monitoring / Economics / Tenant ops stubs (ported from M-OPS-01 v1)
- No service-role in client

## Phase 1a (2026-08-30) — KPI Monitoring

- Edge `owner-kpi-snapshot` on **DEV** (JWT verify ON)
- Deploy: `bash scripts/supabase/deploy-owner-kpi-snapshot.sh --project-ref zusulknbhaumougqckec`
- Metric contract: UTC `created_at` windows `today|7d|30d` on `companies` / `projects` / `tasks` / `public.users`

## Phase 1b / Economics / 1d (2026-08-30)

- **1b:** migration `20260830000100_mops03_platform_owners.sql` — table + `is_platform_owner(uuid)`; Edge `_shared/ownerAllowlist.ts`
- **Economics:** Edge `owner-economics-snapshot` + hq `EconomicsScreen` (counts only; $ in Stripe Dashboard)
- **1d:** migration `20260830000200_mops03_owner_audit_log.sql`; Edge `owner-tenant-write` (`createUser` / `deactivateUser` + Auth ban); hq Create / Deactivate UI
- Deploy scripts under `scripts/supabase/deploy-owner-*.sh` (DEV only)
- Smokes: `smoke-owner-*-dev.mjs`

## Phase 1+ (later)

§3e tenant purge; desk web `/owner/*`; retire Taskr Profile → Owner Console; optional SQL KPI twin.
