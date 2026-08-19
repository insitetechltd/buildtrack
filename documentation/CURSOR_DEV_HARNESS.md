# Cursor Dev Harness

Canonical runbook for InsiteApp’s Cursor-native solo delivery system, and for
seeding the same harness into future projects. Supersedes Trae as the active
AI cockpit; `.trae/` remains legacy read-only until migration is confirmed.

## What you have

| Layer | Location | Role |
|---|---|---|
| Methodology (portable) | `~/.cursor/skills/solo-dev-harness/SOP.md` | Whole cycle SoT + workflows, autonomy, handoffs, seed |
| Project law | `.cursor/rules/*.mdc` | Always-on / glob rules for Insite |
| Project overlay | `.cursor/skills/insite-dev/` | Kickoff, doctor, Maestro preflight, SoT paths |
| Inventory | `AGENTS.md` | Milestones, stack, role inventory |
| Session continuity | `documentation/NOW.md` | Doing / next / locked / parked — overwrite at teardown |
| Procedure | `SOLO_OPERATING_PROCEDURE.md` | Detailed operator workflow |
| Machine proof | `npm run dev:doctor` → `scripts/dev/doctor.sh` | Env ready before Maestro/release |
| Terminology | this doc § Terminology | Smoke / suite / RC / week-rank R# / Wave 2 / Maestro |

## Daily loop (Insite)

1. Open Cursor on this repo.
2. Kickoff: read `documentation/NOW.md`, then `AGENTS.md` status + `documentation/ROADMAP.md`; run `npm run dev:doctor`.
3. For non-trivial work, follow `solo-dev-harness` **SOP.md** (Planner → Builder → Reviewer → Test → QA/Release as needed). Process changes: dual-write SOP.md + `templates/` + this repo.
4. Confidence ladder: Jest (`TESTING_STRATEGY.md`) → Maestro via `scripts/maestro/run-local.sh` → human accept.
5. Concurrent by default when ownership partitions (see `solo-dev-harness` workflows.md + `insite-dev` § Concurrent); Maestro ≤2 **distinct** UDIDs, 1 job per UDID (never two Maestro jobs on the same sim); one-shot case runs while developing; full suite = final gate.
6. Commit only when you ask; never before Reviewer clears Critical/High.
7. Teardown: overwrite `documentation/NOW.md` (doing/next/locked/parked); update ROADMAP/AGENTS only if evidence changed. Include NOW in the next user-requested commit.

## Terminology (plain language)

Shop shorthand used in this harness and commercial release week. Prefer these labels in chat; ask if anything is unclear.

| Term | Plain meaning |
|------|----------------|
| **Smoke** | Quick “is it on fire?” check — main path works, not every edge case |
| **Suite** | Full set of automated UI tests (e.g. all U01–U12) |
| **One-shot** | Run **one** of those tests alone while fixing |
| **RC** | Release candidate — the build you might ship, not a random local experiment |
| **Week-rank R1, R2…** | This week’s ordered ship checklist (**R2** = rebuild the native app) |
| **Wave 2** | Next *product* release (DMS/web, Order 15.x) — **not** week-rank R2 |
| **Native rebuild** | Recompile the real iOS/Android app (pods, Skia, etc.), not just refresh JS |
| **Metro / Expo bundle** | The JavaScript the app loads while developing — can update without rebuilding native |
| **Maestro** | Tool that taps the simulator like a person (our UI automation) |
| **Gate / GO** | Stop and get your OK before risky steps (schema, store submit, version bump) |

Also: **Cloudflare R2** = object storage (infra). Do not confuse with week-rank R2 or Wave 2.

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

1. `documentation/NOW.md` — Doing / Next (session SOP)
2. `AGENTS.md` — stack, SoT paths, milestone status
3. `.cursor/rules/` — domain + stack rules (keep short; one concern each)
4. `scripts/dev/doctor.sh` — stack-specific checks (env **names** only)
5. `package.json` — `"dev:doctor": "bash ./scripts/dev/doctor.sh"`
6. Rename/customize `.cursor/skills/project-dev/` overlay

Portable cycle: `~/.cursor/skills/solo-dev-harness/SOP.md`. Seed copies the full cycle (NOW, workflows, multi-critique, hooks, doctor).

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
