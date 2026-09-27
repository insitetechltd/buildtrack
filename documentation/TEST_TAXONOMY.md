# Test Taxonomy — logical containers & naming

**SoT for where tests live and how new ones must be named.**  
Blind-spot audit: `docs/superpowers/evidence/2026-09-27-test-blind-spot-audit.md`  
Ladder policy: `TESTING_STRATEGY.md`  
Machine registry: `tests/registry.yaml`  
Assert: `npm run test:taxonomy`

Literal “100% coverage” is not the goal. **Every test belongs to exactly one container** and declares a **prove plane**.

---

## Containers

| ID | Name | Prove plane(s) | What belongs here |
|---|---|---|---|
| `C-UNIT` | Unit / domain logic | `J-MOCK` | Zustand stores, pure contracts, mappers, utils (no screen chrome) |
| `C-UI` | UI / adapters / nav | `J-MOCK` | Components, screens, viewAdapters, navigation |
| `C-PHOTO` | Capture & library | `J-MOCK`, `DEV-MAESTRO` | captureSession, mediaLibrary, photo-flow Jest; Maestro `P##` / `U##` |
| `C-BILLING` | Billing & entitlement | `J-MOCK`, `HUMAN` | `src/billing/**`, checkout client wrappers, plan gates |
| `C-AUTHZ` | Authz & seats | `J-MOCK` | delegation, membership, invite client, seat caps |
| `C-JOURNEY` | Jest journeys / integration | `J-MOCK` | `src/__tests__/journeys`, `src/__tests__/integration` |
| `C-SIM` | Simulation / parity | `J-LIVE`, `J-MOCK` | `src/__tests__/simulation`, `src/__tests__/parity` |
| `C-MAESTRO-SMOKE` | Maestro foundation | `DEV-MAESTRO` | launch-smoke, Sprint 7 bootstrap, Gate C login/create chrome |
| `C-MAESTRO-FIELD` | Maestro field loop | `DEV-MAESTRO` | task-core, dual-user, create-task-photo, update-progress-photo, rc-worker-be |
| `C-MAESTRO-ORG` | Maestro company admin | `DEV-MAESTRO` | `maestro/flows/org/**` |
| `C-MAESTRO-REPORT` | Maestro report | `DEV-MAESTRO` | `maestro/flows/report/**` |
| `C-MAESTRO-QA01` | Maestro QA rubric | `DEV-MAESTRO` | `maestro/flows/qa01/**` (sandbox — not live RLS) |
| `C-MAESTRO-MARKETING` | Store / marketing shots | `DEV-MAESTRO` | store-demo, marketing, ASC screenshot flows (**not** release gate) |
| `C-DEST` | Dual-plane / destination | `DEV-PROBE`, `PROD-DEST` | `test:dual-env:*`, `test:schema-parity`, `test:headed-prod:*` |
| `C-EDGE` | Edge / Stripe probes | `DEV-PROBE`, `PROD-DEST`, `NONE` | Edge invoke probes; future signed-webhook tests |
| `C-HUMAN` | Human checklist | `HUMAN` | MainTabs G–J, ASC, real Checkout — no automation claimed |
| `C-ARCHIVED` | Archived / retired | — | `archived-tests/**`, intentional `.skip` of retired surfaces |

Owner/hq (`apps/owner/**`) is **out of Taskr root Jest** (`testPathIgnorePatterns`). Keep owner tests under `apps/owner`; do not file them as `C-MAESTRO-*`.

---

## Directory layout (physical)

### Jest (co-located — preferred for unit/UI)

Keep tests next to code:

```text
src/<area>/__tests__/<name>.test.ts(x)
src/__tests__/integration/…
src/__tests__/journeys/…
src/__tests__/simulation/…
src/__tests__/parity/…
```

### Jest (non-colocated — new cross-cutting only)

```text
tests/edge/           # Edge/Stripe handler tests (Deno or node harness)
tests/dual-plane/     # thin wrappers / fixtures docs for prove scripts
tests/README.md
tests/registry.yaml   # generated/updated when containers change
```

Do **not** dump random new files under `src/utils/__tests__` for billing or Edge — use `C-BILLING` / `C-EDGE` homes.

### Maestro

```text
maestro/flows/
  _shared/              # _logout, _dismiss-*, bootstrap-*, pick-first-image
  smoke/                # launch-smoke, sprint7-*, gate-c-*
  journeys/             # journey-*
  qa01/                 # qa01-scenario-*
  task-core/            # task-core-live-*
  destination/          # metro-prod-headed-*
  marketing/            # store-demo-*, marketing-*, app-store-*, ipad-store-*
  create-task-photo/    # P##
  update-progress-photo/# U##
  dual-user/
  org/
  report/
  perf/
  _quarantine/          # flaky flows parked per documentation/MAESTRO_QUARANTINE.md
```

### Destination / Edge scripts

```text
scripts/supabase/probe-*.py
scripts/supabase/assert-*.py
scripts/supabase/headed-*.py
scripts/stripe/*          # ops + future webhook fixtures (not silent money)
```

---

## Naming conventions (mandatory for new tests)

### Jest

```text
{domain}.{capability}[.facet].test.ts(x)
```

| Part | Rules | Examples |
|---|---|---|
| `domain` | camelCase product/domain noun | `taskStore`, `seatUsage`, `inviteUser`, `companyPlanGate` |
| `capability` | what failure it guards | `deferredFallback`, `workerCapDeny`, `crossProjectDeny` |
| `facet` | optional plane/aspect | `contract`, `unit`, `integration` |

**Good:** `taskDelegationPermissions.upRankDeny.test.ts`  
**Bad:** `stuff.test.ts`, `temp2.test.ts`, `final-final.test.tsx`

Retired surfaces: prefer delete or move to `archived-tests/` with README note — do not leave forever-`.skip` in active trees without a registry `C-ARCHIVED` entry.

### Maestro

```text
maestro/flows/{container}/{ID}-{slug}.yaml
```

| Container folder | ID pattern | Example |
|---|---|---|
| `create-task-photo` | `P##` | `P23-limited-library-access.yaml` |
| `update-progress-photo` | `U##` | `U13-kill-mid-upload.yaml` |
| `dual-user` | `H##` / existing | keep series |
| `org` | `O##` / `S##` | existing |
| `report` | `R##` | existing |
| `task-core` | `task-core-live-{verb}` | existing |
| `smoke` | descriptive | `launch-smoke.yaml` |
| `destination` | `metro-prod-*` | existing |
| `marketing` | `store-demo-*` / `marketing-*` | **not** RC gate |

Shared helpers: only under `_shared/`; name `_*.yaml`.

### Dual-plane / Edge scripts

```text
scripts/supabase/probe-{area}-{slug}.py
scripts/supabase/assert-{area}-{slug}.py
scripts/stripe/probe-{slug}.py          # when adding automated Stripe proves
```

---

## npm entrypoints (by container)

| Container | Command |
|---|---|
| `C-UNIT` | `npm run test:container:unit` |
| `C-UI` | `npm run test:container:ui` |
| `C-PHOTO` | `npm run test:container:photo` |
| `C-BILLING` | `npm run test:container:billing` |
| `C-AUTHZ` | `npm run test:container:authz` |
| `C-JOURNEY` | `npm run test:container:journey` |
| `C-SIM` | `npm run test:container:sim` |
| `C-DEST` | `npm run test:dual-env:critical` + `test:dual-env:p-matrix` + `test:schema-parity` |
| `C-EDGE` | `npm run test:edge:stripe-webhook-faith` · `test:edge:update-company-addons-faith` |
| Field Maestro | `npm run test:e2e:maestro:rc-worker-be` etc. (unchanged names) |
| Taxonomy check | `npm run test:taxonomy` |

Legacy aliases (`test:tasks`, `test:regression`, …) remain valid; they are **composites** of containers. Prefer container scripts when adding docs or CI slices.

---

## Rules for adding a test

1. Pick **one** container ID from the table above.  
2. Choose the **smallest prove plane** that executes the real mechanism (see blind-spot audit).  
3. Name the file per conventions.  
4. Place it in the physical home for that container.  
5. Run `npm run test:taxonomy` (updates/validates registry membership).  
6. If the capability is new, add a row to the blind-spot capability map (or daily Grok bot will flag map drift).  
7. Never cite `C-MAESTRO-MARKETING` or `C-MAESTRO-QA01` sandbox as PROD RLS / billing proof.

---

## Prove-plane reminder

| Plane | Meaning |
|---|---|
| `J-MOCK` | Jest with mocked Supabase/Stripe |
| `J-LIVE` | Jest against real Supabase |
| `DEV-MAESTRO` | Real taps, DEV backend |
| `DEV-PROBE` / `PROD-DEST` | Scripted probes (dual-env) |
| `HUMAN` | Checklist / PNG / real Checkout |
| `NONE` | Gap — do not pretend |

---

## Maintenance

- Registry SoT: `tests/registry.yaml` (regenerate via `npm run test:taxonomy -- --write`).  
- Moving a file: update imports/scripts, re-run taxonomy write, keep one container.  
- Quarantine: add to `C-ARCHIVED` with reason + expiry in registry `notes`, or `archived-tests/README.md`.
