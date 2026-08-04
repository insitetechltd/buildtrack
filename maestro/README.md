# Maestro Runtime Runbook

This file is the canonical repository-level runbook for Maestro-specific testing and simulator automation guidance.

Use this document together with:

- [`../TESTING_STRATEGY.md`](../TESTING_STRATEGY.md) for the overall testing ladder, command intent, and policy
- [`../documentation/SOURCE_OF_TRUTH.md`](../documentation/SOURCE_OF_TRUTH.md) for documentation-governance rules

## Current Root Status

The root repository does not yet ship the full Maestro flow and helper-script scaffold that exists in active QA workstreams.

That means:

- `TESTING_STRATEGY.md` remains the current implementation-aligned testing strategy reference at the repository root
- this file is the canonical home for Maestro-specific operator guidance as that scaffold is promoted into the root repository
- when root-level Maestro flows, scripts, or runtime-alignment steps are added, update this file in the same change

## Canonical Role

Use `maestro/README.md` for:

- local Maestro setup notes
- simulator launch and runtime-alignment guidance
- selector and interaction troubleshooting
- flow-specific operator instructions
- references to the current shipped Maestro command surface

Use `TESTING_STRATEGY.md` for:

- the repository-wide testing ladder
- which validation layers exist
- when to run each layer
- CI and confidence-loop policy

## Promotion Rule

If Maestro assets are added or promoted at the root level, this file must become the first-stop operational runbook for those assets.

Do not scatter Maestro setup or runtime-alignment instructions across one-off root notes when they belong here.
