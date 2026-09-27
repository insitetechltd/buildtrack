# Dormant migrations (do not apply)

SQL here is **parked product policy**, not part of the live apply path.

| File | Why parked | Reactivate |
|---|---|---|
| `20260825000600_projects_drop_on_hold.sql` | Keep reserved `on_hold` CHECK slot for a possible fifth project status. UI already maps `on_hold` → On-going. | Tristan **GO** only — move back under `supabase/migrations/` (or apply by hand), then update app types / `normalizeProjectStatus` if the slug gets a new meaning. |

**Guarantees**

- `supabase db push` and `scripts/greenfield/apply_remote.sh` only glob `supabase/migrations/*.sql` — this folder is invisible to them.
- `scripts/supabase/apply-migrations-to-project.sh` also only reads `supabase/migrations/`.

Do **not** copy these files into `supabase/migrations/` without Human GO.
