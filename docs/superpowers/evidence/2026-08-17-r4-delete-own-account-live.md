# R4 live SQL — `delete_own_account` (2026-08-17)

## Apply

- Human GO: chat “go live sql” then Option B Dashboard.
- Operator: Dashboard SQL Editor → `CREATE OR REPLACE FUNCTION public.delete_own_account()` + REVOKE/GRANT.
- Result reported: **Success. No rows returned.**

## Post-apply probe (service role, no user JWT)

| Check | Result |
|-------|--------|
| HTTP | **403** (not 404) |
| SQLSTATE | **28000** |
| Message | `not_authenticated` |

Meaning: function is in the PostgREST schema cache; `auth.uid()` guard holds (service role has no end-user uid). A signed-in app user can execute via Profile → Delete Account.

No secrets, project refs, or connection strings in this file.
