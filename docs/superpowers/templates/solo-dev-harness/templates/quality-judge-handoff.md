# Quality Judge handoff

Inputs the Judge may see (do not send the Builder’s self-assessment as fact):

- Proof contract (Planner claims + Test Designer proofs)
- Claim ledger with commands/artifacts
- Reviewer findings (severity-ordered)
- Test Engineer commands + results
- QA Validator outcome + visual artifact paths
- Adversary named gaps + whether Orchestrator proved them
- Track proposed by Orchestrator
- Loop index / budget

Judge uses a **different model** from Builder on Track M/U. Judge never implements.

Output: fill `templates/scorecard.md`. Only Judge emits `SHIP`.
