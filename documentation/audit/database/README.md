# Supabase Audit Document Map

## Purpose

This README maps the three Supabase documents created for the 2026-07-12 audit cycle and explains how they should be used together.

These documents now live together in this folder:

- the technical audit
- the remediation plan
- the operations runbook

## Document Map

### 1. Technical Audit

File:

- `2026-07-12-supabase-technical-audit.md`

Use this document when you need:

- the architecture review
- the original findings list
- repo-based risks
- live consistency-check results from the 2026-07-12 verification pass
- table-by-table and query-pattern assessment

Primary audience:

- architects
- maintainers
- reviewers

### 2. Remediation Plan

File:

- `2026-07-12-supabase-remediation-plan.md`

Use this document when you need:

- prioritized remediation phases
- rollout order
- SQL examples for indexing and policy hardening
- validation criteria
- execution sequencing for security, performance, and schema cleanup

Primary audience:

- engineers executing fixes
- reviewers planning rollout waves
- release and operations owners

### 3. Operations Runbook

File:

- `SUPABASE_OPERATIONS_RUNBOOK.md`

Use this document when you need:

- secure access rules
- credential placeholder conventions
- read-only audit workflow
- live policy and index verification steps
- operational safety rules for future Supabase work

Primary audience:

- operators
- maintainers
- engineers performing live verification

## Recommended Reading Order

1. Read `2026-07-12-supabase-technical-audit.md` for findings and current-state risk.
2. Read `2026-07-12-supabase-remediation-plan.md` for implementation priority and rollout sequence.
3. Use `SUPABASE_OPERATIONS_RUNBOOK.md` during any live follow-up work.

## Classification

- `2026-07-12-supabase-technical-audit.md` is historical analysis
- `2026-07-12-supabase-remediation-plan.md` is historical planning analysis
- `SUPABASE_OPERATIONS_RUNBOOK.md` is the operational runbook paired with this audit set

## Important Note

The two dated documents in this folder are point-in-time analysis artifacts. If current code, runtime behavior, or canonical docs in `documentation/` later diverge from them, trust the newer implementation-aligned sources.
