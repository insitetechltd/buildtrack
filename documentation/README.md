# Documentation Hub

This folder contains the canonical implementation-aligned documentation for the repository.

Use [SOURCE_OF_TRUTH.md](./SOURCE_OF_TRUTH.md) to understand documentation governance, classification rules, and archive policy.

## Canonical References

- [SOURCE_OF_TRUTH.md](./SOURCE_OF_TRUTH.md) - Master documentation governance and classification rules
- [INSITE_APP_LATEST.md](./INSITE_APP_LATEST.md) - Consolidated current product description aligned to code and config
- [role-permission-matrix.md](./role-permission-matrix.md) - Canonical role, permission, and transitional model reference
- [m-fnd-04-ui-migration-wave-matrix.md](./m-fnd-04-ui-migration-wave-matrix.md) - Current `WS-FND / M-FND-04` UI migration wave reference while active

## Operational Runbooks

- [NON_INTERACTIVE_LOCAL_BUILDS.md](./NON_INTERACTIVE_LOCAL_BUILDS.md) - Preferred local build and non-interactive build workflow
- [BUILD_ERRORS_SOLUTIONS.md](./BUILD_ERRORS_SOLUTIONS.md) - Build and troubleshooting reference
- [ICON_CONFIGURATION.md](./ICON_CONFIGURATION.md) - App icon and related configuration guidance
- [VERSION_NUMBERS_EXPLAINED.md](./VERSION_NUMBERS_EXPLAINED.md) - Version and build-number reference
- [APPLE_CREDENTIALS_CONFIG.md](./APPLE_CREDENTIALS_CONFIG.md) - Secure Apple credential setup guidance without account-specific values

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
