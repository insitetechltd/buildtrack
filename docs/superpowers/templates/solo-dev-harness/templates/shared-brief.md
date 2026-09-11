# Shared evaluation brief

Draft **one** brief before dispatching Plan Critics, Adversary, or multi-model Judge. Send the **identical** brief to every model.

| Section | Content |
|---|---|
| **Objective** | One decision (plan GO/NO-GO, unproven failures, SHIP vs PATCH, …) |
| **Context** | Stack, scale, audience, milestone, locked constraints, **track S/M/U** |
| **Inputs** | Same file paths / artifacts every model must read |
| **Out of scope** | What evaluators must not assume or recommend |
| **Output format** | Fixed structure (verdict, findings table with severity, top N must-fix) |
| **Rules** | No code unless asked; be adversarial; solo-dev / scale-aware |

Plan Critics (Gate A): lenses (risks vs validation) are **sections inside** this brief, not different prompts.

Adversary (Gate B): only change summary, acceptance, commands run, artifact paths. Prompt line: “Assume the author is wrong. What user-visible failure is still unproven?”
