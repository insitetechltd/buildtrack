# Tests — logical containers

**Law:** [`documentation/TEST_TAXONOMY.md`](../documentation/TEST_TAXONOMY.md)  
**Registry:** [`registry.yaml`](./registry.yaml) (auto-generated)  
**Assert:** `npm run test:taxonomy` · regenerate with `npm run test:taxonomy -- --write`

## Homes for new cross-cutting tests

| Path | Container | Use for |
|---|---|---|
| `tests/edge/` | `C-EDGE` | Stripe/Edge handler proves (not mock client wrappers in `src/api`) |
| `tests/dual-plane/` | `C-DEST` | Fixtures/docs helpers for destination probes |

Most Jest stays **co-located** under `src/**/__tests__/` — still must pick a container and follow naming: `{domain}.{capability}[.facet].test.ts`.

Maestro lives under `maestro/flows/{container}/` — see taxonomy.
