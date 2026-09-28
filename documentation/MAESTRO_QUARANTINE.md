# Maestro quarantine & hygiene

**SoT for flake quarantine, N-run bars, and row teardown.** Blind-spot S8 (2026-09-27).  
Runtime: `maestro/README.md` · Preflight Gate **0–8**: `.cursor/rules/maestro-preflight.md` · Taxonomy: `documentation/TEST_TAXONOMY.md`.

---

## Quarantine ledger

Flows that are **not** allowed to gate release / Judge GO until cleared.

| Flow / suite | Container | Reason | Owner | Since | Clear criterion |
|---|---|---|---|---|---|
| _(empty)_ | — | — | — | — | — |

**How to quarantine:** add a row here **and** move the YAML under `maestro/flows/_quarantine/` (or keep path and mark `skip` in the suite script with a comment linking this row). Do not delete history.

**How to clear:** N≥3 consecutive PASS on a claimed UDID (see bar below), PNG Gate 8 read, remove row + restore suite membership in the same PR.

---

## Flake bar (N-run)

| Suite | Minimum consecutive PASS before “stable” claim | Notes |
|---|---|---|
| `test:e2e:maestro:rc-worker-be` (P01/U01 one-shots) | **N≥3** | Same UDID; Photos seed stable |
| `test:e2e:maestro:dual-user` (H01) | **N≥3** | Prefer 17 Pro Max + iPhone 16 pair |
| Other field suites | N≥2 for tip re-prove; N≥3 before un-quarantine | |

`rc=0` alone is **not** a green claim — Gate 0–8 + visual PNG read still required (`maestro-preflight.md`).

---

## Row teardown policy

| Suite | Seed | Teardown owed |
|---|---|---|
| Report (`C-MAESTRO-REPORT`) | Live | **Logout teardown** in flow (existing) |
| Org CA (`C-MAESTRO-ORG`) | `seed:dev-qa` | Prefer reuse seeded rows; delete only probe-created projects when flow owns them |
| RC worker / dual-user / task-core | API or UI seed | **Title-prefixed probe rows** (`S8-` / `DU-` / `P01-`) should be deleted or marked complete at end of flow when practical; if not, document residue in run manifest |
| QA01 | Sprint 7 sandbox | Sandbox reset — not live RLS |

New live Maestro flows that insert tasks/projects **must** either:

1. Tear down by id/title in a final step, or  
2. Register an explicit “accepted residue” note in the suite README / evidence manifest.

---

## Hygiene checklist (before claiming suite green)

1. `npm run maestro:locks` — claim free UDID  
2. Gate 0–8 preflight  
3. Suite script via `scripts/maestro/run-local.sh` only  
4. Quarantine ledger empty for that suite (or listed skips documented)  
5. N-run bar met when claiming “stable”  
6. Release claim → `npm run maestro:locks` release / NOW teardown  
