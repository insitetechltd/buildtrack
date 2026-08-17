# Corp RC — `create_company_for_self` live apply (2026-08-17)

## Apply

- Human GO: operator pasted `supabase/migrations/20260817000300_corp_create_company_for_self.sql` in Dashboard SQL Editor.
- Result reported: **ran, no error.**

## Post-apply probe (anon JWT only, no user session)

| Check | Result |
|-------|--------|
| HTTP | **403** (not 404) |
| SQLSTATE / code | **28000** |
| Message | `not_authenticated` |

Meaning: function is in the PostgREST schema cache; `auth.uid()` guard holds. A signed-in founder can call Create Company after `signUp`.

No secrets, project refs, or connection strings in this file.
