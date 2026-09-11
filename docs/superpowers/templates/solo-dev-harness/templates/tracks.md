# Tracks S / M / U

Orchestrator proposes. Builder and Test Engineer do **not** choose. Judge confirms (may overturn).

If the diff touched screens, navigation, or a store screens read → Track S is illegal.

| Track | When | Must run | May skip |
|---|---|---|---|
| **S — small** | Typo, docs, tiny isolated logic with no screen/store | Planner+Scout merged, Builder, Reviewer, Test Engineer, Judge | Gate A (1 critic ok), QA, Adversary, BoN |
| **M — default** | Feature, user-impact bug, store/nav/upload, shared UI | Full loop minus BoN/Security | None of Judge, Test contract, QA, Adversary |
| **U — ultra** | Shared primitives, auth, payments, camera/photos, multi-user, prior interaction-class failures | Track M + Gate A two models + Bugbot + Security if sensitive + headed smoke; BoN after first Judge fail | Waiver of QA/Adversary **forbidden** |

Track M/U skip of Gate A, Adversary, QA, or Judge = **FAIL**, not a spoken waiver.

Loop budget: M = 3, U = 4. Exhausted → ESCALATE with scorecard. Two PATCHes still below bar → Best-of-N / Shadow Builder.
