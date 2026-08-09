# M-SUPABASE-03a Phase A — Schema Review Checklist

**Date:** 2026-08-09  
**Milestone:** WS-SUPABASE / M-SUPABASE-03a  
**Status:** Phase A artefacts complete — **LIVE APPLIED / Closed 2026-08-10**  
**GO phrase:** satisfied (`you have GO for M-SUPABASE-03a and 03c live apply`)  
**Close report:** `docs/superpowers/reports/2026-08-10-m-supabase-03a-close.md`

**Do not** apply on production without that exact written GO. Parity/sandbox apply is allowed for proof.

---

## (a) Scope

| Surface | Constraint |
|---|---|
| `public.users.role` (when present) | `CHECK IN ('worker','member','foreman','supervisor','company_admin','admin')` |
| `public.users.system_permission` (when present) | `CHECK IN ('admin','manager','member')` |
| `user_project_assignments.category` / `assignment_category` (when present) | ProjectRole enum CHECK |
| Role-column writes | Trigger `users_guard_role_column_writes` — non–company_admin/admin → `42501` |

**Artefact:** `supabase/migrations/20260809000100_msupabase03a_role_column_integrity.sql`

---

## (b) Decisions for Schema Review

| ID | Decision | Recommendation |
|---|---|---|
| D1 | Live `role` vs greenfield `system_permission` | Dual-path migration: constrain whichever columns exist |
| D2 | Map app `manager` → DB `supervisor` on normalize | Yes (CHECK vocabulary has supervisor, not manager) |
| D3 | Unknown stray roles | Normalize to `worker` / `member` (lowest band) before ADD CONSTRAINT |
| D4 | Validate existing CHECK before drop/recreate | Idempotent ADD only when constraint name absent |

---

## (c) Pre-apply read-only probes (parity + prod RO)

```sql
-- Column inventory
select column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name in ('users', 'user_project_assignments')
  and column_name in (
    'role', 'system_permission', 'project_role',
    'category', 'assignment_category'
  )
order by table_name, column_name;

-- Stray role values (only if role exists)
select role, count(*)
from public.users
group by 1
order by 2 desc;

-- Existing constraints
select conname, pg_get_constraintdef(oid)
from pg_constraint
where conrelid in ('public.users'::regclass, 'public.user_project_assignments'::regclass)
  and contype = 'c';
```

---

## (d) Close gate (parity after apply)

1. `INSERT`/`UPDATE` with `role = 'totally_invalid'` → `check_violation`.
2. Authenticated non-admin JWT `UPDATE users SET role = 'admin'` → `42501`.
3. company_admin / admin can still set allowed role strings.
4. Anon SELECT still permission_denied on users (02a intact).

---

## (e) Rollback sketch (not auto-applied)

```sql
DROP TRIGGER IF EXISTS users_guard_role_column_writes ON public.users;
DROP FUNCTION IF EXISTS public.guard_users_role_column_writes();
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_allowed_values;
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_system_permission_allowed_values;
-- Drop upa_*_allowed_values similarly if added.
```

---

## Sign-off

| Role | Sign | Date |
|---|---|---|
| Human Schema Review | GO via chat | 2026-08-10 |
| Live apply GO | GO via chat (03a+03c) | 2026-08-10 |
