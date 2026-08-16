# Cursor Dev Harness

Canonical runbook for InsiteApp’s Cursor-native solo delivery system, and for
seeding the same harness into future projects. Supersedes Trae as the active
AI cockpit; `.trae/` remains legacy read-only until migration is confirmed.

## What you have

| Layer | Location | Role |
|---|---|---|
| Methodology (portable) | `~/.cursor/skills/solo-dev-harness/` | Workflows, autonomy, handoffs, seed script |
| Project law | `.cursor/rules/*.mdc` | Always-on / glob rules for Insite |
| Project overlay | `.cursor/skills/insite-dev/` | Kickoff, doctor, Maestro preflight, SoT paths |
| Inventory | `AGENTS.md` | Milestones, stack, role inventory |
| Procedure | `SOLO_OPERATING_PROCEDURE.md` | Detailed operator workflow |
| Machine proof | `npm run dev:doctor` → `scripts/dev/doctor.sh` | Env ready before Maestro/release |

## Daily loop (Insite)

1. Open Cursor on this repo.
2. Kickoff: read `AGENTS.md` status + `documentation/ROADMAP.md`; run `npm run dev:doctor`.
3. For non-trivial work, follow `solo-dev-harness` workflows (Planner → Builder → Reviewer → Test → QA/Release as needed).
4. Confidence ladder: Jest (`TESTING_STRATEGY.md`) → Maestro via `scripts/maestro/run-local.sh` → human accept.
5. Concurrent by default when ownership partitions (see `solo-dev-harness` workflows.md + `insite-dev` § Concurrent); Maestro ≤2 UDIDs; one-shot case runs while developing; full suite = final gate.
6. Commit only when you ask; never before Reviewer clears Critical/High.
7. Teardown: note shipped/blocked; leave a next-session kickoff prompt.

## Insite `.cursor/rules`

| File | Apply |
|---|---|
| `solo-dev-cycle.mdc` | Always — milestone gate + harness pointer |
| `danger-gates.mdc` | Always — schema/auth/release human gates |
| `construction-domain.mdc` | Always — jobsite product constraints |
| `project-context.mdc` | Always — Expo/Zustand/Supabase architecture |
| `task-domain.mdc` | Task files — workflow + optimistic/realtime safety |
| `build-and-release.mdc` | Build/EAS/docs — release safety |
| `workflow-solo.md` | Default orchestrator route for open-ended work |
| `workflow-feature.md` / `workflow-bugfix.md` / `workflow-release.md` | Workflow-specific checklists |
| `workflow-ms02-unblock.md` | M-SUPABASE-02a/02b + 03b gated path |
| `maestro-preflight.md` | Maestro 8-gate preflight before flow claims |

Also: root `.cursorrules` (compact always-on summary) and handoff packet `cursor-handoff-2026-08-08.md` for Trae-exit context.

## Trae → Cursor exit checklist

- [x] Port `.trae/rules` → `.cursor/rules`
- [x] Personal skill `solo-dev-harness` installed
- [x] Project skill `insite-dev` + `dev:doctor`
- [x] `AGENTS.md` / `SOLO_OPERATING_PROCEDURE.md` cite Cursor as SoT
- [ ] Run 1–2 real milestones end-to-end in Cursor only
- [ ] Disable Trae `solo-agents` skill when no longer needed
- [ ] Delete or archive `.trae/` after confirmation (do not delete yet)

Do **not** add new Trae-only agents or rules.

## Seed a future project

```bash
bash ~/.cursor/skills/solo-dev-harness/scripts/seed-project.sh /path/to/new-repo
```

Then customize:

1. `AGENTS.md` — stack, SoT paths, milestone status
2. `.cursor/rules/` — domain + stack rules (keep short; one concern each)
3. `scripts/dev/doctor.sh` — stack-specific checks (env **names** only)
4. `package.json` — `"dev:doctor": "bash ./scripts/dev/doctor.sh"`
5. Rename/customize `.cursor/skills/project-dev/` overlay

Details: `~/.cursor/skills/solo-dev-harness/bootstrap.md`.

## Commands

```bash
npm run dev:doctor                 # machine readiness
npm run test:regression            # L2 gate
npm run validate:local:confidence  # local confidence wrapper
# Maestro: always via scripts/maestro/run-local.sh (see maestro/README.md)
```

`dev:doctor` may report `WARN .trae/ still present` — **expected** until the exit checklist “Delete or archive `.trae/`” item is explicitly completed. Cursor rules remain SoT; do not treat that WARN as a fail.

## Related

- Handoff packet (Trae exit context): `cursor-handoff-2026-08-08.md`
- Testing: `TESTING_STRATEGY.md`, `documentation/MAESTRO_LOCAL_SETUP.md`
- Docs governance: `documentation/SOURCE_OF_TRUTH.md`
- Portable seed: `bash ~/.cursor/skills/solo-dev-harness/scripts/seed-project.sh <repo>`
