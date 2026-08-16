# S-UX-01Q Phase C — Planning Only (2026-08-16)

**Status:** Docs-only plan. **No product implementation in this artefact.**  
**Source:** `docs/superpowers/analysis/2026-08-14-ui-ux-consistency-audit.md` § Deferred (Phase C / option 2+)  
**Prerequisite closed:** S-UX-01Q P0 + upload Phase 1+2 Draw; S-UX-01Q2 IMGLY uninstall.

## Goal

Finish remaining UI consistency / nested-layout hygiene that was explicitly deferred after P0 flatten and upload UX. Phase C is a **bounded visual/architecture cleanup**, not a new feature stream.

## In scope (from audit)

| Track | Work | Notes |
|-------|------|--------|
| C1 Screens visual pass | Projects / ProjectDetail / Profile / auth / admin | Match ModernScreenHeader + SafeArea contracts from P0 |
| C2 Form controls | TextField adoption on CreateTask / Login / EditProject | Prefer existing shared inputs; no new design system |
| C3 CreateTask actions | Retire CreateTask `TaskActionScreen` → standalone screens | Navigation + params only; preserve taskStore SoT |
| C4 Task rows | Collapse task-row models onto `ActivityStyleRowCard` | Keep testIDs stable (`tasks-screen__row_*`) |
| C5 Brand | Brand tokens in Tailwind; Login rename Taskr → Insite | Copy/branding — confirm product name before ship |
| C6 Typeahead | `S-UX-01P` catalogue typeahead | **Separate slice**; product behavior choices may need GO |

## Explicitly out of scope (still need product GO)

- Option B gallery (vs Option A in-app library — already shipped)
- Phase 3 photo caption
- Any schema / RLS / release version bumps

## Suggested delivery order

1. **C1** Profile + Projects shells (highest leftover inconsistency vs P0)
2. **C4** row model collapse (reduces dual render paths before more UX)
3. **C2** TextField adoption (mechanical)
4. **C3** TaskActionScreen retirement (nav refactor — Reviewer required)
5. **C5** brand rename (ask if “Insite” vs “Taskr” is final)
6. **C6** park as `S-UX-01P` with its own plan when scheduled

## Validation (when implementing)

- L1: targeted component/journey Jest for touched screens
- L2: `npm run test:regression`
- L4: existing Maestro journeys (project switch / create-taskdetail) if nav or list rows change
- QA Validator for user-visible shell changes

## Open questions (do not block this plan doc)

1. Confirm product display name: **Insite** vs **Taskr** for Login/brand (C5).
2. Whether C3 TaskActionScreen retirement ships alone or with CreateTask form cleanup.

## Next kickoff prompt

```text
Implement S-UX-01Q Phase C track C1 only (Projects/ProjectDetail/Profile/auth/admin visual pass)
per docs/superpowers/plans/2026-08-16-s-ux-01q-phase-c-plan.md. No Option B / caption / schema.
```
