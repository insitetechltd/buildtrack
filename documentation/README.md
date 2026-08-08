# Documentation Hub

This folder contains the canonical implementation-aligned documentation for the repository.

Use [SOURCE_OF_TRUTH.md](./SOURCE_OF_TRUTH.md) to understand documentation governance, classification rules, and archive policy.

## Canonical Read Order

For repository-wide orientation, read these in order:

1. [SOURCE_OF_TRUTH.md](./SOURCE_OF_TRUTH.md)
2. [ROADMAP.md](./ROADMAP.md)
3. [AGENTS.md](../AGENTS.md)
4. [SOLO_OPERATING_PROCEDURE.md](../SOLO_OPERATING_PROCEDURE.md)
5. [CURSOR_DEV_HARNESS.md](./CURSOR_DEV_HARNESS.md)
6. [TESTING_STRATEGY.md](../TESTING_STRATEGY.md)
7. [maestro/README.md](../maestro/README.md)
8. [SOFTWARE_ARCHITECTURE.md](./SOFTWARE_ARCHITECTURE.md)
9. [DATABASE_ARCHITECTURE.md](./DATABASE_ARCHITECTURE.md)
10. [INSITE_UI_UX_SOURCE_OF_TRUTH.md](../docs/INSITE_UI_UX_SOURCE_OF_TRUTH.md)
11. [UI_ARCHITECTURE.md](./UI_ARCHITECTURE.md)
12. [INSITE_APP_LATEST.md](./INSITE_APP_LATEST.md)
13. [BUG_INVENTORY.md](./BUG_INVENTORY.md)

## Canonical References

- [SOURCE_OF_TRUTH.md](./SOURCE_OF_TRUTH.md) - Master documentation governance and classification rules
- [ROADMAP.md](./ROADMAP.md) - Single canonical WS/M/S milestone inventory and execution order
- [AGENTS.md](../AGENTS.md) - Repository-local agent inventory and workflow context
- [SOLO_OPERATING_PROCEDURE.md](../SOLO_OPERATING_PROCEDURE.md) - Canonical operator workflow reference
- [CURSOR_DEV_HARNESS.md](./CURSOR_DEV_HARNESS.md) - Cursor-native solo harness, doctor, Trae exit, seed-for-reuse
- [TESTING_STRATEGY.md](../TESTING_STRATEGY.md) - Canonical repository testing strategy, confidence ladder, validation matrix, and command-selection cheat sheet
- [maestro/README.md](../maestro/README.md) - Canonical Maestro-specific testing and runtime-alignment runbook
- [SOFTWARE_ARCHITECTURE.md](./SOFTWARE_ARCHITECTURE.md) - Canonical system-level architecture reference
- [DATABASE_ARCHITECTURE.md](./DATABASE_ARCHITECTURE.md) - Canonical Supabase, schema, and persistence architecture reference
- [INSITE_UI_UX_SOURCE_OF_TRUTH.md](../docs/INSITE_UI_UX_SOURCE_OF_TRUTH.md) - Canonical approved product UI/UX logic and target-state interaction model
- [UI_ARCHITECTURE.md](./UI_ARCHITECTURE.md) - Canonical UI ownership, layering, and navigation contract reference
- [BUG_INVENTORY.md](./BUG_INVENTORY.md) - Single canonical live bug tracker for open, active, fixed-local, verified, and deferred defects
- [INSITE_APP_LATEST.md](./INSITE_APP_LATEST.md) - Consolidated current product description aligned to code and config
- [role-permission-matrix.md](./role-permission-matrix.md) - Canonical role, permission, and transitional model reference
- [m-fnd-04-ui-migration-wave-matrix.md](./m-fnd-04-ui-migration-wave-matrix.md) - `WS-FND / M-FND-04` UI migration wave reference (milestone closed; retained for ongoing migration context)

## Operational Runbooks

- [NON_INTERACTIVE_LOCAL_BUILDS.md](./NON_INTERACTIVE_LOCAL_BUILDS.md) - Preferred local build and non-interactive build workflow
- [BUILD_ERRORS_SOLUTIONS.md](./BUILD_ERRORS_SOLUTIONS.md) - Build and troubleshooting reference
- [ICON_CONFIGURATION.md](./ICON_CONFIGURATION.md) - App icon and related configuration guidance
- [VERSION_NUMBERS_EXPLAINED.md](./VERSION_NUMBERS_EXPLAINED.md) - Version and build-number reference
- [APPLE_CREDENTIALS_CONFIG.md](./APPLE_CREDENTIALS_CONFIG.md) - Secure Apple credential setup guidance without account-specific values

## Validation And Testing References

- [TESTING_STRATEGY.md](../TESTING_STRATEGY.md) - Canonical repository testing strategy, layer definitions, validation matrix, and command-selection cheat sheet
- [maestro/README.md](../maestro/README.md) - Canonical Maestro-specific runtime, operator, and troubleshooting runbook

## Audit Docs

- [audit/database/README.md](./audit/database/README.md) - Index for the Supabase database audit set
- [audit/database/2026-07-12-supabase-technical-audit.md](./audit/database/2026-07-12-supabase-technical-audit.md) - Supabase technical audit with partial live verification
- [audit/database/2026-07-12-supabase-remediation-plan.md](./audit/database/2026-07-12-supabase-remediation-plan.md) - Supabase remediation plan derived from the audit
- [audit/database/SUPABASE_OPERATIONS_RUNBOOK.md](./audit/database/SUPABASE_OPERATIONS_RUNBOOK.md) - Secure Supabase audit and operations workflow with redacted credential placeholders

## Working Docs

These are active delivery artifacts rather than implementation truth:

- `docs/superpowers/specs/`
- `docs/superpowers/plans/`
- `docs/superpowers/prompts/`
- `docs/superpowers/templates/`

## History

Historical, incident-specific, and superseded documentation now lives under `documentation/history/`.

- [history/README.md](./history/README.md) - Archive structure and classification notes
- `history/incidents/` - Resolved incident notes and one-off fix writeups
- `history/analysis/` - Investigations and superseded role/system analyses
- `history/releases/` - Point-in-time migration and release snapshots
- `history/superseded/` - Replaced runbooks and duplicate operational guides

## Usage

- Start in [SOURCE_OF_TRUTH.md](./SOURCE_OF_TRUTH.md) if you need to know where a document belongs.
- Use this folder for durable docs that should stay aligned with current implementation.
- Use `docs/superpowers/` for active planning and prompt material.
- Use `documentation/history/` for archival reference only; historical docs are not authoritative.
