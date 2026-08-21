# Customer-managed storage slotting (locked 2026-08-21)

**Status:** Parked until after RC and after Wave 2 / `M-DMS-01` begins.  
**Discussion lock:** `docs/superpowers/analysis/2026-08-19-roadmap-clarification.md` (addendum 2026-08-21).  
**Inventory:** `documentation/ROADMAP.md` — `WS-STORAGE / M-STORAGE-01`…`05` (Deferred).

## Recommendation

Do **not** open customer-managed (BYO) storage in RC, Tier 1 pre-RC, or the first post-RC hardening tranche. Treat it as a **premium enterprise/privacy architecture** track that starts **after `M-OPS-01`, `M-OPS-02`, and `M-AI-01`, and most sensibly after `M-DMS-01` begins Wave 2**.

## Must not jump

- Commercial RC
- `M-OPS-01` / `M-OPS-02`
- `M-AI-01`
- Wave 2 bootstrap / `M-DMS-01`

## Why later

Blob I/O is hard-coupled to Supabase Storage in `src/api/fileUploadService.ts`. UI paths expect signed-URL refresh and storage-path parsing. Real work is provider-neutral `blobRef` + abstraction + compatibility — architecture, not PMF.

Waiting for DMS lets evidence + `buildtrack-documents` share one portability model.

## Commercial framing

- **Standard:** Insite-managed storage (default SaaS / RC path).
- **Enterprise Privacy:** customer-managed evidence storage; export/portability; residency/retention; premium onboarding.

Sales-safe: workflow stays in Insite; files can stay under customer control. Do not promise arbitrary providers, full self-host, or GA before the track exists.

## Milestone family (Deferred)

| ID | Name | Prereq |
|---|---|---|
| `M-STORAGE-01` | Discovery + contract | `M-DMS-01` start; lock reopen |
| `M-STORAGE-02` | Storage abstraction (Supabase default) | `M-STORAGE-01` |
| `M-STORAGE-03` | Enterprise privacy pilot | `M-STORAGE-02` |
| `M-STORAGE-04` | Portability + export tooling | `M-STORAGE-03` |
| `M-STORAGE-05` | DMS convergence | `M-DMS-01`, `M-STORAGE-02` |

## Near-term path (unchanged)

1. Ship RC (no BYO storage implementation)
2. `M-OPS-01` → `M-OPS-02` → `M-AUTHZ-02` / `M-AI-01`
3. Wave 2 / `M-DMS-01`
4. Reopen `WS-STORAGE` only when enterprise demand justifies the architecture cost
