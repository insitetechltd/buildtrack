# Corp RC — bootstrap SQL Human GO (2026-08-17)

## Human Gate

- Operator: **GO** + confirmed Dashboard apply of
  `supabase/migrations/20260817000400_corp_create_company_bootstrap_fix.sql`
  with **no error**.

## Post-apply status (service-role probes, redacted)

| Check | Result |
|-------|--------|
| Henry `company_id` | Linked to Grandly Ltd (repair from earlier same day) |
| Grandly Ltd row | Present |
| Anon `create_company_for_self` | Still **403 / not_authenticated** (expected) |

## Follow-up found during GO verify

Live `users` has **`role` only** (no `system_permission`). Deployed `invite-user` was SELECTing both columns → PostgREST **42703** → Invite would fail after company link. Fixed in repo: dual-path SELECT (role first). **Requires Edge Function redeploy** (Dashboard paste or CLI).

No secrets or project refs in this file.
