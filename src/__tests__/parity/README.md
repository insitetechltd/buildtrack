# Database Parity Test Suite

Behavioral parity between **OLD** and **NEW** Supabase projects.  
Parity is defined at the store/operation/outcome layer — not identical SQL schema.

## Quick start

```bash
# Against OLD baseline sandbox
export PARITY_TARGET=old
export SUPABASE_PARITY_OLD_URL="https://xxxx.supabase.co"
export SUPABASE_PARITY_OLD_ANON_KEY="..."
export SUPABASE_PARITY_OLD_SERVICE_ROLE_KEY="..."
export SUPABASE_TEST_CONFIRM_SANDBOX=1
# Must NOT equal EXPO_PUBLIC_SUPABASE_URL
npm run test:parity:old

# Against NEW greenfield
export PARITY_TARGET=new
export SUPABASE_PARITY_NEW_URL="..."
export SUPABASE_PARITY_NEW_ANON_KEY="..."
export SUPABASE_PARITY_NEW_SERVICE_ROLE_KEY="..."
export SUPABASE_TEST_CONFIRM_SANDBOX=1
npm run test:parity:new
```

Fallback: if `SUPABASE_PARITY_*` are unset, the harness also accepts the existing simulation vars `SUPABASE_TEST_URL` / `SUPABASE_TEST_ANON_KEY` / `SUPABASE_TEST_SERVICE_ROLE_KEY` when `PARITY_TARGET=old`.

## Layout

```text
src/__tests__/parity/
  README.md
  matrix/PARITY_MATRIX.md
  matrix/golden-old/          # frozen snapshots from OLD runs
  harness/
  adapters/
  ops/
  scenarios/
```

## Safety

- Requires `SUPABASE_TEST_CONFIRM_SANDBOX=1`
- Refuses when parity URL equals `EXPO_PUBLIC_SUPABASE_URL`
- Suites skip when env is missing (`describeParity`)

## Golden freeze

1. Run `PARITY_WRITE_GOLDEN=1 npm run test:parity:old` against a confirmed sandbox.
2. Artifacts land in `matrix/golden-old/` (`LATEST_REPORT.md|csv`, `T-lifecycle-canonical.json`).
3. Commit those artifacts as the immutable OLD baseline (no secrets).

## NEW cutover gate

```bash
npm run test:parity:new
```

`new-gate.parity.test.ts` diffs NEW cell results against `golden-old/LATEST_REPORT.csv`. Documented `DELTA` / `DELTA-SEC` cells are allowed; unexplained `FAIL`s block cutover.

Unit tests for harness/adapters (no live DB): `npm run test:parity:unit`.
