# Quality Judge scorecard

Score each **required** dimension **0–3**. SHIP = every required dimension **≥ 2**, Reviewer **0 C/H**, zero in-scope **UNPROVEN** claims.

UI-only dimension (Visual) is required when screens, chrome, navigation shells, forms, or photo flows changed; omit it only when Judge classified the work as non-UI.

```
=== QUALITY JUDGE ===
Track proposed: S | M | U
Track confirmed: S | M | U   (Judge may overturn)
Loop: n / budget (M=3, U=4)
Author model: …
Judge model: …   (must differ from Builder on M/U)

Scorecard:
- Spec:            0-3
- Implementation:  0-3
- Review:          0-3
- Automated proof: 0-3
- Runtime proof:   0-3   (N/A only if Judge-classified logic-only)
- Adversary:       0-3   (N/A only on Track S)
- Visual:          0-3 | N/A
- Iteration:       0-3

In-scope UNPROVEN claims: (none | list)
Reviewer C/H open: (0 | list)

Verdict: PATCH | REWORK | REDESIGN | SHIP | ESCALATE
Return to: Builder | Planner | Scout | —
Reason (≤5 lines):
```

| Dimension | 0 | 2 (minimum SHIP) | 3 |
|---|---|---|---|
| Spec | Goals only | Each acceptance item has a named proof | Proofs include edge/fail paths |
| Implementation | Partial vs spec | All in-scope claims implemented | No extra scope |
| Review | C/H open or self-review only | Independent Reviewer, 0 C/H | Second model or Bugbot on risky diffs |
| Automated proof | Wrong/skipped scripts | Typecheck + named unit/integration green | Broader regression when stores/UI/uploads touched |
| Runtime proof | Unit-only on UI | Headed or E2E + visual-artifact read | Adjacent routes / keyboard / overlay probed |
| Adversary | Not run | Gaps proven or explicitly out of scope | No residual in-scope gaps |
| Visual (UI only) | Text “looks good” | 1–3 real artifacts + delta notes | Before/after same viewport |
| Iteration | First pass shipped with known holes | At least one loop if defects were found | BoN or redesign when first impl was weak |
