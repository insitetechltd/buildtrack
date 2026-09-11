# Solo Dev Harness — Ultra-quality cycle

Portable methodology SoT. Dual-write process changes to **this file** + `templates/` + each project’s matching workflow/AGENTS files. Project-only law (device IDs, schema human gates, product SoT) stays in the project overlay skill — never here.

**Git-tracked copy (when `~/.cursor/skills/solo-dev-harness/` is missing):** `docs/superpowers/templates/solo-dev-harness/` in the consuming repo.

---

## 1. Why this is a loop

A pipeline that runs Planner → Builder → Reviewer → Test → (optional QA) → Done **stops too soon**. “Last role ran” is not quality. Residual risks in a ledger are not Done.

This cycle is a **closed quality loop**. A Quality Judge scores output against a proof contract. Below bar → iterate. At bar → SHIP. Unproven in-scope claims → not done.

## 2. Principles

1. **Loops, not pipelines.** Every cycle has a Judge. Below bar → return. At bar → ship.
2. **Proof contract before code.** Acceptance is falsifiable claims, each with a named proof (unit, integration, headed, E2E, SQL). Prose goals without proofs are invalid plans.
3. **Author ≠ judge.** Builder cannot score their own work. Judge uses a different model when the session allows. Orchestrator and Judge never implement on Track M/U.
4. **QA is default-on** for screens, navigation, uploads, or stores that screens read. “Logic-only” is a **Judge** classification with evidence — not a Builder exemption.
5. **Iterate on quality.** Bad first output triggers PATCH / REWORK / REDESIGN (or Best-of-N), not a polite residual-risk paragraph.
6. **Track-sized.** A one-line fix must not spawn 14 agents. The default feature track still has Judge + loop + QA.

## 3. Agent roster

Keep these identifiers. Do not add a second Orchestrator, a style-only linter, or a summarizer.

### Band 0 — Cycle control (never implements)

| Agent | Identifier | Job | Veto |
|---|---|---|---|
| Orchestrator | `@solo-orchestrator` | Intake, pick track, dispatch, claim ledger, loop budget. Not the Builder on non-trivial work. | Refuse Done if required agents were skipped |
| Quality Judge | `@quality-judge` | Score output vs proof contract. **Only role that may emit SHIP.** Different model from Builder. | `PATCH` / `REWORK` / `REDESIGN` / `SHIP` / `ESCALATE` |
| Claim Ledger | (Orchestrator function) | Claim → proof command/artifact → pass/fail. Lives in the task handoff. | Any `FAIL` or `UNPROVEN` blocks SHIP |

### Band 1 — Specify (no product code)

| Agent | Identifier | Job |
|---|---|---|
| Scout | `@scout` | Context pack: session continuity, SoT, similar code, constraints, last-known-good. Not a plan. Merge into Planner on Track S. |
| Planner / Spec | `@planner` | Falsifiable acceptance + proof plan + files + assumptions. Invalid without proofs. |
| Plan Critics | Gate A (Task subagents) | ≥2 parallel critiques, **identical shared brief**, prefer different models. Fold C/H into spec before Builder. |
| Test Designer | `@test-designer` | Failing proofs **before** Builder: unit cases, E2E IDs, headed smoke steps, visual assertions. May be Test Engineer in TDD mode. This is the contract the Judge scores. |

### Band 2 — Implement

| Agent | Identifier | Job |
|---|---|---|
| Builder | `@builder` | Smallest change that greens the proof contract. No self-SHIP. Hidden complexity → return to Planner. |
| Shadow Builder | Best-of-N (optional) | Second implementation on a disjoint worktree. Judge picks winner. Track U or after a weak first impl — not every typo. |

### Band 3 — Prove and attack (cannot be the Builder)

| Agent | Identifier | Job |
|---|---|---|
| Reviewer | `@reviewer` | Independent model. Findings-first. 0 Critical / 0 High required. Does not rewrite. |
| Adversary | `@adversary` | Gate B as a first-class agent. Sees only: diff summary, acceptance, commands run, artifact paths. “Assume the author is wrong. What user-visible failure is still unproven?” Named gaps **must be proven or scoped out** — not noted. |
| Test Engineer | `@test-engineer` | Executes the Test Designer contract — not “smallest check that might pass.” Does not claim QA signoff. |
| QA Validator | `@qa-validator` | Headed or E2E with visual artifact read. Fail → Builder, not Done with caveats. Track M/U default-on. |
| Security Reviewer / Bugbot | project subagents | Auth/secrets/payments → security review. User-visible/risky diffs → Bugbot. Skip when required = Judge FAIL. |

### Band 4 — Close (after SHIP only)

| Agent | Identifier | Job |
|---|---|---|
| Docs Curator | `@docs-curator` | Canonical docs matching what actually shipped. |
| Release Manager | `@release-manager` | Build/store/env only. Conservative. |

## 4. Tracks

Orchestrator **proposes** the track. Builder and Test Engineer must not choose it. **Judge confirms** at the end.

| Track | When | Must run | May skip |
|---|---|---|---|
| **S — small** | Typo, docs, tiny isolated logic with **no** screen/store | Planner+Scout merged, Builder, Reviewer, Test Engineer, Judge | Gate A (1 critic ok), QA, Adversary, BoN |
| **M — default** | Feature, user-impact bug, store/nav/upload, shared UI | Full loop minus BoN/Security | **None** of Judge, Test contract, QA, Adversary |
| **U — ultra** | Shared primitives, auth, payments, camera/photos, multi-user, prior interaction failures | Track M + Gate A two models + Bugbot + Security if sensitive + headed smoke; BoN after first Judge fail | Waiver of QA/Adversary **forbidden** |

**Anti-skip:** If the diff touched screens, navigation, or a store screens read, Track S is illegal. Track M/U skip of Gate A, Adversary, QA, or Judge = **Judge FAIL** (not “say so and Done”).

Logic-only is a Judge classification with evidence (no screen/nav/store-read). It is not a Builder self-exemption.

Loop budget: **3** (Track M) or **4** (Track U). Exhausted → `ESCALATE` with the scorecard. Do not silently SHIP.

## 5. Cycle

```
Scout → Spec → Gate A → Test contract → Build → Prove → Judge
                                                      │
                         PATCH (same spec) ───────────┤→ Builder
                         REWORK (delta spec) ─────────┤→ Planner
                         REDESIGN ────────────────────┤→ Scout
                         SHIP → Docs / Release
                         ESCALATE → user + scorecard
```

### 5.1 Scout

Milestone / session continuity. Context pack. Propose track S/M/U.

### 5.2 Spec

Planner writes acceptance as **claims**, each with a proof:

- Claim: “Tap field chrome opens keyboard and typing updates value.”
- Proof: headed smoke on the touched screen; screenshot of focused field.
- Not a claim: “improve UX.”

### 5.3 Gate A — Plan Critics

Two critics, identical brief (see `templates/shared-brief.md`). Fold C/H into spec. No Builder on Track M/U until this lands. Self-review is not Gate A.

### 5.4 Test contract

Failing unit tests and/or named E2E/headed steps exist (or are specified with exact commands) **before** implementation.

### 5.5 Build

Implement to green. Hidden complexity → Planner. No self-SHIP.

### 5.6 Prove (parallel, not leftovers)

After first green:

- Reviewer (independent model)
- Test Engineer runs the **named** commands
- QA Validator on the real flow (Track M/U default-on)
- Adversary lists unproven interactions; Orchestrator **runs those proofs now**

### 5.7 Judge

Scorecard (below). A **verdict**, not a summary.

### 5.8 Iterate

Mandatory when below bar. Two PATCHes still below bar → Shadow Builder / Best-of-N rather than a third cosmetic patch.

### 5.9 SHIP

Docs/Release only after Judge `SHIP`. Commit during loops is allowed for recovery. **Done is not.**

## 6. Scorecard

Judge scores each **required** dimension **0–3**. SHIP requires every required dimension **≥ 2**, **0 C/H** from Reviewer, and **zero in-scope UNPROVEN claims**.

Copy-paste table: `templates/scorecard.md`.

| Dimension | 0 | 2 (minimum SHIP) | 3 |
|---|---|---|---|
| Spec | Goals only | Each acceptance item has a named proof | Proofs include edge/fail paths |
| Implementation | Partial vs spec | All in-scope claims implemented | No extra scope |
| Review | C/H open or self-review only | Independent Reviewer, 0 C/H | Second model or Bugbot on risky diffs |
| Automated proof | Wrong/skipped scripts | Typecheck + named unit/integration green | Broader regression when stores/UI/uploads touched |
| Runtime proof | Unit-only on UI | Headed or E2E + visual-artifact read | Adjacent routes / keyboard / overlay probed |
| Adversary | Not run | Gaps proven or explicitly out of scope | No residual in-scope gaps |
| Visual (UI only) | Text “looks good” | 1–3 real artifacts + delta notes | Before/after same viewport |
| Iteration | First pass shipped with known holes | At least one loop if Judge/QA/Review found defects | BoN or redesign when first impl was weak |

**Verdicts (Judge only):**

- **PATCH** — Local defect; spec still right → Builder, same contract.
- **REWORK** — Spec gap or wrong proof → Planner delta, then rebuild.
- **REDESIGN** — Approach is wrong → Scout + new spec. Do not keep patching.
- **SHIP** — Bar met.
- **ESCALATE** — Loop budget exhausted or autonomy/danger gate.

## 7. Claim ledger

Orchestrator maintains (handoff, not a wiki):

```
| Claim | Proof (command / artifact) | Result |
|---|---|---|
| … | … | PASS / FAIL / UNPROVEN |
```

Any `FAIL` or in-scope `UNPROVEN` blocks SHIP. Template: `templates/claim-ledger.md`.

## 8. Commit vs Done

- **Commit** may happen during loops (recovery, user-requested). Reviewer 0 C/H still required before commit.
- **Done / SHIP** only after Judge `SHIP`.
- Do not treat “committed” as “validated.”

When the user asks to commit after SHIP: conventional commit → push by default unless they said not to, force would be required, or auth fails.

## 9. Autonomy

Default autonomous after intake READY. Ask the user only for:

1. Product behavior with ≥2 irresolvable outcomes
2. User-facing schema / persistence
3. Auth / permissions with no codebase precedent
4. Release / deploy / store
5. Scope > one bounded extension
6. Intake THIN slots (≤4 A/B/C, or GO = defaults)

Non-blocking uncertainty → smallest repo-aligned default, log as assumption, continue. Surface in the final ledger, not mid-loop pauses.

## 10. Shared brief

When dispatching Plan Critics, Adversary, or Judge to multiple models: draft **one** brief first; send the identical brief. Template: `templates/shared-brief.md`.

## 11. Dual-write

Portable cycle changes update:

1. This `SOP.md`
2. `templates/` in this skill (and the git-tracked copy under `docs/superpowers/templates/solo-dev-harness/`)
3. The consuming repo’s matching files (`SOLO_OPERATING_PROCEDURE.md`, `AGENTS.md`, workflow rules, multi-critique)

Do not encode project-only device caps or live-schema human gates into these portable files.
