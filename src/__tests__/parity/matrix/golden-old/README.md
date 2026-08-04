# Golden OLD baseline

This folder holds artifacts from `PARITY_TARGET=old` runs with `PARITY_WRITE_GOLDEN=1`.

## How to freeze

```bash
export PARITY_TARGET=old
export SUPABASE_TEST_CONFIRM_SANDBOX=1
export SUPABASE_PARITY_OLD_URL="..."
export SUPABASE_PARITY_OLD_ANON_KEY="..."
export SUPABASE_PARITY_OLD_SERVICE_ROLE_KEY="..."
# or SUPABASE_TEST_* fallback
export PARITY_WRITE_GOLDEN=1
npm run test:parity:old
```

Artifacts written:

- `LATEST_REPORT.md` / `LATEST_REPORT.csv` — matrix cell outcomes
- `T-lifecycle-canonical.json` — canonical task snapshot (when lifecycle suite runs)
- timestamped `report-*.md|csv` copies

## Bootstrap status

`LATEST_REPORT.md` below was scaffolded as a **template** until the first live OLD golden run. Replace by re-running with `PARITY_WRITE_GOLDEN=1`.

## NEW gate

```bash
export PARITY_TARGET=new
export SUPABASE_PARITY_NEW_*=...
export SUPABASE_TEST_CONFIRM_SANDBOX=1
npm run test:parity:new
```

Compare NEW report against this folder. Document intentional differences as `DELTA` cells (see `../PARITY_MATRIX.md`).
