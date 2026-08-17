# NOW — session continuity

**SOP:** git-tracked, **one path**, overwritten each teardown (do not create dated copies). Yesterday lives in `git log`. Clone + this file = pick up thinking. Chat is scratch until promoted here. Portable template: `~/.cursor/skills/solo-dev-harness/sop-session.md`.

**Who updates:** any agent on session teardown, or when a lock/park/next-action changes. Commit with the work that changed thinking (user-requested commit + default push).

**Keep short:** Doing / Next / Locked / Parked. Details belong in ROADMAP, AGENTS status, or a plan — not here.

---

## Doing

Commercial **RC week** (week-rank R1–R5). Wave 2 (DMS/web) is parked.

## Next

**R3:** smoke core loop on the rebuilt sim RC binary — login → photo → task → update.

Then R4/R5 (store/env). Then P1 R7 payment hook / R8 touchpoint cut / R9 first-tenant onboard if P0 holds.

Optional: EAS preview/production when user GOs version/submit. Commit `ios/Podfile.lock` + R2 evidence when asked.

## Locked this week

- **R1** — eng UI hidden unless `__DEV__` (Profile / Admin / Dashboard shortcut).
- **R2** — local iOS RC native rebuild 2026-08-17 (IMGLY purged). Evidence: `docs/superpowers/evidence/2026-08-17-r2-rc-native-rebuild.md`.
- **U01–U12** Maestro GREEN (API seed). Detail: `docs/superpowers/plans/2026-08-17-overnight-handoff.md`.
- **R6** — org subscription **paper** SoT in `docs/superpowers/plans/2026-08-16-commercial-release-week.md` (trial 1 month; Growth/Unlimited + worker/PM add-ons). Base list prices still prior lock until user overrides. Entry = task create + update.

## Parked (do not schedule this week)

- **Wave 2** (Order 15.x, after first commercial ship): web admin + DMS on Supabase. Kickoff Closed: M-DMS-00. Investigation: `docs/superpowers/analysis/2026-08-17-dms-infrastructure-investigation.md`.
- **Product framing (not spec-locked):** register ≠ task; all task photos kept; docs may exist with zero tasks; AI propose-only; worker/foreman **proof of performance** (last entry must have photos) → auto **RFInspection** → PM/manager **approve** marks last photos **proposed** for register (not published). **RFInformation** stays a separate manual RFI. Spec still 6 Aug information-RFI only.
- LLM feature line; 04b until ~2026-09-07; 04e cold archive.

## Kickoff prompt (paste)

```text
Read documentation/NOW.md first.
This week = commercial RC. Next = R3 smoke on rebuilt sim RC.
Do not start Wave 2 / DMS / RFInspection.
```

---

Updated: 2026-08-17
