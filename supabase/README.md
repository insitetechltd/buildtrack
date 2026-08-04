# Greenfield Supabase (v1)

Canonical schema for the **NEW** database. Do not apply these migrations to the live OLD project.

## Migrations

| File | Purpose |
|------|---------|
| `20260715000100_extensions_and_helpers.sql` | pgcrypto/uuid + `set_updated_at` |
| `20260715000200_companies_users.sql` | companies, users, auth trigger, user RLS helpers |
| `20260715000300_projects_assignments.sql` | projects, UPA (`project_role`), project access helper |
| `20260715000400_tasks_core.sql` | slim `tasks` with single `status` |
| `20260715000500_task_assignments.sql` | relational assignees |
| `20260715000600_task_activities.sql` | append-only ledger |
| `20260715000700_task_read_status_and_stars.sql` | read status + stars |
| `20260715000800_project_locations_and_files.sql` | locations + `task_files` |
| `20260715000900_storage_policies.sql` | private `buildtrack-files` bucket |
| `20260715001000_rls_finalize.sql` | revoke anon; finalize RLS |

## Apply programmatically (recommended)

Reuses the existing parity sandbox (`insite-parity-old` → greenfield NEW):

```bash
# Once: put DB password in the environment (not committed)
export PARITY_DB_PASSWORD='…'   # Dashboard → Database password

# API keys already in .env.parity.local
chmod +x scripts/greenfield/apply_remote.sh
./scripts/greenfield/apply_remote.sh

# After apply + when ready to gate:
GREENFIELD_RUN_PARITY=1 ./scripts/greenfield/apply_remote.sh
# or:
set -a && source .env.parity.local && set +a && npm run test:parity:new
```

What the script does:
1. Wipes `public` + storage objects (refuses if URL equals `EXPO_PUBLIC_SUPABASE_URL`)
2. Applies `supabase/migrations/*.sql` in order via `psql`
3. Purges `auth.users` via Admin API
4. Rewrites `.env.parity.local` for `PARITY_TARGET=new`

## Apply via Supabase CLI (alternative)

```bash
supabase link --project-ref <project-ref>
supabase db push
```

Or run the SQL files in order in the SQL Editor.

## Parity gate

```bash
export PARITY_TARGET=new
export SUPABASE_TEST_CONFIRM_SANDBOX=1
export SUPABASE_PARITY_NEW_URL="https://<new-ref>.supabase.co"
export SUPABASE_PARITY_NEW_ANON_KEY="…"
export SUPABASE_PARITY_NEW_SERVICE_ROLE_KEY="…"
npm run test:parity:new
```

Compare against `src/__tests__/parity/matrix/golden-old/`. Expected intentional delta: **S-06 / anon SELECT** must fail on NEW (`DELTA-SEC`).

## RLS smoke SQL

See `tests/rls_policy_matrix.sql`.

## Notes for app / parity adapters

- `users.role` → `system_permission`
- `user_project_assignments.category` → `project_role`
- `tasks.current_status` / dual status → `tasks.status`
- `assigned_to[]` → `task_assignments`
- `starred_by_users[]` → `task_stars`
- Storage bucket is **private** (signed URLs)
