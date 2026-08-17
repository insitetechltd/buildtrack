# Corp RC — Henry / Grandly “No company on this account” (2026-08-17)

## Symptom

User Management Invite showed **No company on this account**; company user count **0**. Admin Henry (`henry@grandly.com`) was signed in after Create company for **Grandly Ltd**.

## Live DB (service role, redacted)

| Check | Result |
|-------|--------|
| `users` Henry | Exists, `role=admin`, `is_pending=false`, **`company_id=null`** |
| `companies` name ilike Grandly | **0 rows** (company never persisted) |

Conclusion: Auth + profile signup succeeded; `create_company_for_self` did **not** commit a company + link (chicken-egg: `companies_insert_admin` RLS and/or `guard_users_role_column_writes` aborting the SECURITY DEFINER transaction). Client could still land authenticated via session after a failed RPC.

## Repair applied (ops, service role)

1. INSERT `companies` **Grandly Ltd** (`created_by` = Henry).
2. UPDATE Henry `company_id` → that company.

Henry should **log out and log back in** (or kill app + relaunch) so Zustand refreshes `user.companyId`, then Invite again.

## Code / schema follow-up

- Migration: `supabase/migrations/20260817000400_corp_create_company_bootstrap_fix.sql`  
  - `row_security = off` on `create_company_for_self`  
  - role-guard founder bootstrap when attaching first company  
  - avoid unnecessary role rewrites when already admin  
- Client: `createCompanyAccount` signs out + refuses auth if RPC fails or `company_id` still null.

**Human Gate:** paste/apply `20260817000400_corp_create_company_bootstrap_fix.sql` in Dashboard SQL Editor before the next Create-company smoke.

No secrets or project refs in this file.
