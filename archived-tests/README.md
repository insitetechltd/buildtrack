# Archived Tests

This folder stores deprecated test suites that are intentionally kept out of Jest discovery.

## Why These Tests Were Archived

The application's production task flow now centers on `src/state/taskStore.supabase.ts`, but older workflow tests were still targeting the legacy `src/state/taskStore` implementation.

To keep the active test surface aligned with production behavior:

- legacy task-store workflow tests were moved here
- the old integration workflow test that imported the legacy store was moved here
- active task regression coverage now points to the Supabase-backed task store

## Important Note

Files in this directory are historical references only. They are not part of the active unit, regression, or full-confidence suites.
