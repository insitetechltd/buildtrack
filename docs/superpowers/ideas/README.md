# Nightly idea bank (living)

Append-only ledger for **Research** product ideas and **Marketing** go-to-market (GTM) moves. Automation (or a human) appends one dated markdown file per night; do not rewrite or delete prior nights except to fix obvious typos with a one-line audit note at the bottom of that file.

## Rules

| Rule | Detail |
| --- | --- |
| **Append-only** | Add new dated files (`YYYY-MM-DD.md`). Do not reorder or compress history. |
| **No exact repeats** | Before appending, skim recent files; skip or reframe ideas that duplicate an earlier one-liner verbatim. |
| **GTM tagging** | Every marketing/GTM row must include the tag **`gtm`** (inline or in a `tags` column). Product/research rows omit `gtm`. |
| **Ranking** | Ordering within a night is **advisory** until **Tristan GO** promotes items into roadmap, PRDs, or experiments. |
| **Not technical EOD** | This bank is separate from the **9:11pm technical end-of-day** log (build status, merges, prove artifacts). Keep product/GTM ideation here; keep ship/prove narrative in session continuity (`documentation/NOW.md`) and technical EOD elsewhere. |

## Nightly slots (default)

Each night should capture **five product one-liners** and **five GTM moves**:

| # | Product slot | Typical lens |
| --- | --- | --- |
| 1 | UI / UX | Field screens, density, navigation, accessibility |
| 2 | Backend / DB | Schema, RLS, sync, Edge, data contracts |
| 3 | Stability / scale | Crashes, perf, offline, multi-tenant isolation |
| 4 | Features | New user-visible capability or workflow |
| 5 | Testing / QA | Automation, prove gaps, release confidence |

GTM rows use the same numbered slots but are tagged **`gtm`** (channel, message, segment, launch, partnership, etc.).

## File layout

```
docs/superpowers/ideas/
  README.md           # this file
  YYYY-MM-DD.md       # one file per night (midnight append target)
```

The `2026-10-08.md` file is a **dry-run seed** with placeholder lines where final copy was not yet checked into the repo.
