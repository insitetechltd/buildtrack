# C-DEST helpers

Destination proves stay as runnable scripts:

- `npm run test:dual-env:critical`
- `npm run test:dual-env:p-matrix`
- `npm run test:schema-parity`
- `npm run test:headed-prod:jwt`

Put shared fixtures or thin node harnesses here only when they are not co-located under `scripts/supabase/`. Naming: `{domain}.{capability}.test.ts` if you add Jest.
