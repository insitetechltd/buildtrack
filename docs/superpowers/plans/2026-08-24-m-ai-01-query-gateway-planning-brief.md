# M-AI-01 — Project Q&A & query gateway planning brief

**Date:** 2026-08-24  
**Status:** **Planning only — no build GO**  
**Milestone:** `WS-AI / M-AI-01` (ROADMAP Order 15.07)  
**Trigger:** Re-read this document and complete the planning gate **before any M-AI-01 implementation** starts.

---

## Purpose

Capture the 2026-08-24 architecture and pricing discussion so implementation does not start from chat memory. M-AI-01 is important enough to deserve a dedicated planning cycle: compare options, stress-test unit economics at Insite’s scale, and lock product + technical choices before code.

This brief is **not** an approved design. It records context, options, a provisional recommendation, and open questions.

---

## What the roadmap already says (baseline)

**Product (locked policy):** Field Q&A over **this project’s** dataset — tasks, photos, activity (documents later). High certainty only: **cite a record or abstain**. Wrong-project answers are a safety defect. Create Task LLM remains a thin human-confirmed on-ramp, not the product.

**Sequence (locked spine):** After M-BILL-01 MVP and M-AUTHZ-02 (AUTHZ may idle-parallel with early prep). Not RC week. Not before billing entitlements exist.

**Out of scope (locked):** Generic RAG over spec PDFs; drawing geometry inference; unlabeled hardware auto-pass; tenant-facing raw SQL; service-role in mobile.

**Billing today:** HK$160 Starter / HK$400 Pro — **seats**, **projects**, **entries/month** (task create + update), **storage**. No `ai_queries` meter yet. M-BILL-F hard gates parked. Owner Console economics notes “AI tokens / inference” as a future cost line.

**Related but different artifacts:**

- `MCP_HUB_ARCHITECTURE.md` — multi-platform hub (Procore, Autodesk, etc.). **Not** “query our task DB.” Deferred integration lane.
- `src/api/task-llm-service.ts` + `chat-service.ts` — **Create Task** field extraction from the **mobile client** with a public Anthropic key. Wrong security and UX model for production Q&A; must not be extended as-is for M-AI-01.

---

## What today’s discussion added (delta)

We did **not** change roadmap intent. We specified **how** M-AI-01 might be built and whether it fits the **HK seat + usage cap** pricing model.

**Proposed shape (discussion default, not approved):**

1. **Postgres read RPCs** (project-scoped) — co-located with RLS on Supabase.
2. **AI Query Gateway** — Supabase Edge Function: JWT auth, required `project_id`, intent → RPC, citation envelope, server-side signed photo URLs, server-side LLM call, audit log.
3. **Taskr mobile** — thin UI + fetch; no DB logic, no LLM keys.
4. **Optional MCP server** — separate process (dev machine or small host) calling the **same** Edge API; not shipped inside the Taskr IPA.

**Pricing conclusion from discussion:** Bundle Q&A into tiers with **fair-use query caps** (internal meter). Do **not** sell per-call API access at HK$160–400 price points. Default to a **cheaper model** for Q&A; cap context size; read-only v1.

---

## Options to evaluate in the deep planning session

Each option should be scored for: safety (project isolation), solo-dev operability, margin at ~10–50 companies, time-to-ship, and alignment with M-AUTHZ-02.

### A. Where the gateway lives

**A1 — Supabase Edge Function (discussion lean)**  
Same deploy path as `invite-user`, `stripe-webhook`. Secrets and LLM keys stay server-side. Enforces entitlements next to existing billing tables. Cold starts and Deno limits are acceptable at current scale.

**A2 — Dedicated small service (Fly/Railway/Cloudflare Worker)**  
More flexibility for long-running or heavy orchestration. Extra ops surface for a solo dev: deploy, monitoring, second auth path. Justified only if Edge limits block the design.

**A3 — Logic in the mobile app**  
Direct Supabase reads + client LLM (today’s Create Task pattern). **Reject for M-AI-01:** exposes keys, weak enforcement, no centralized audit/metering.

**A4 — Logic only in MCP (Cursor-facing)**  
Model client holds keys and calls Supabase. **Reject for customer product;** acceptable only as internal dev tooling on top of a real gateway.

### B. How the model accesses data

**B1 — Named read RPCs + DTOs (discussion lean)**  
Fixed intents: `search_tasks`, `get_task`, `get_timeline`, `get_evidence`, `project_snapshot`. No arbitrary SQL. Citations are first-class in the response envelope.

**B2 — User JWT + existing RLS, no new RPCs**  
Gateway uses caller JWT and PostgREST selects. Fewer migrations; harder to guarantee stable citation shape and photo URL policy; harder to optimize queries.

**B3 — Service-role gateway with manual ACL checks**  
Powerful but easy to get wrong on project boundaries. Reserve for **Owner Admin / M-OPS-03** platform tools, not field Q&A.

**B4 — Embeddings / vector RAG over tasks**  
Conflicts with locked “high certainty, cite row” policy for v1. Revisit only with explicit lock change and eval harness.

### C. MCP vs in-app only

**C1 — In-app Q&A only (simplest product)**  
One client, one enforcement path. Matches construction buyer (PM on phone on site).

**C2 — In-app + thin MCP on same API (discussion lean for v1)**  
MCP is an adapter for Cursor/operator dev; customers never see it. No second business model.

**C3 — Tenant API keys + MCP for integrators**  
Revenue upside later; security, support, and pricing complexity. **Defer** until post-AUTHZ-02 and proven demand.

### D. LLM strategy

**D1 — Single cheap model, one retrieval + one completion (discussion lean)**  
Haiku-class default; bounded task JSON in prompt; abstain when retrieval empty.

**D2 — Tool-calling loop (model calls search repeatedly)**  
Better for hard questions; 1.5–2× token cost and latency. Maybe Pro-only later.

**D3 — Sonnet/default for all tiers**  
Better answers; **margin risk** on Starter if usage is not capped.

**D4 — No LLM — structured search UI only**  
Zero inference cost; not “Q&A.” Useful as Phase 0 fallback if planning rejects LLM economics.

### E. Commercial packaging

**E1 — Included fair-use by tier (discussion lean)**  
Starter: low monthly query cap; Pro: higher cap. Meter `ai_queries_monthly` in gateway; soft warn then hard block when M-BILL-F ships.

**E2 — Pro-only feature**  
Simple positioning; Starter users may feel cheated if marketed as “AI product.”

**E3 — Per-query or token pass-through**  
Misaligned with seat-based HK pricing and buyer expectations. **Reject for v1.**

**E4 — Add-on pack (+N queries/month)**  
Mirror worker-pack pattern later if power users exceed caps.

---

## Provisional recommendation at Insite scale (1–2 person team, early commercial)

**Not a GO — a starting point for the planning session.**

At your scale, optimize for **one server-side gateway**, **read-only v1**, **in-app product**, **Haiku-class default**, **tier fair-use caps**, and **no tenant MCP product**. Supabase Edge + RPCs reuse patterns you already ship (Edge functions, RLS, entitlements). MCP stays optional for your own tooling, calling the same API.

Defer: vector RAG, external API keys, multi-step agent loops, vision-over-photos in v1, and the multi-platform MCP hub (separate roadmap lane).

Financially, gateway/DB cost is negligible versus **LLM tokens**. Bundled Q&A on Pro (and limited on Starter) is sensible if caps and model tier are enforced server-side. Unlimited premium-model Q&A on Starter is not.

---

## Layer placement (reference)

**Supabase:** read RPCs, `ai_query_log` (or equivalent), Edge `ai-query` gateway, LLM API secrets, signed URL minting (service role server-side only).

**Taskr app:** Q&A screen, active `project_id`, session JWT, display citations — no secrets.

**Outside repo deploy:** optional `insite-task-mcp` for Cursor — HTTP client to Edge only.

**Not in Taskr:** service-role keys, raw SQL tools, production MCP for customers v1.

---

## Cost intuition (order of magnitude, not a quote)

Per **read intent** through Edge + Postgres: fractions of a cent at your volume.

Per **full Q&A turn** (retrieve + one completion): dominated by LLM. Haiku-class roughly **sub-US$0.01** per question with bounded context; Sonnet-class roughly **US$0.01–0.03** per question. Hundreds of uncapped Sonnet questions per Starter company per month can consume a **large share** of HK$160 revenue.

Read-only Q&A does **not** consume **entries/month** (writes). It does consume **inference budget** you should meter internally.

---

## Open questions for the deep planning session

1. **Product surface:** Dedicated “Ask project” tab vs contextual entry from Task Detail / Dashboard?
2. **Who can ask:** All project members vs PM/supervisor only on Starter?
3. **Photo evidence in answers:** Metadata only v1, or signed URL list, or vision (cost + policy)?
4. **Exact caps:** Starter vs Pro `ai_queries_monthly` and per-user daily abuse limits?
5. **Model allowlist:** Single vendor vs fallback; data processing / retention agreements?
6. **AUTHZ-02 interaction:** How liaison/guest membership affects “this project’s dataset”?
7. **Create Task LLM migration:** Move existing client-side parser to Edge as part of M-AI-01 or separate slice?
8. **Eval harness:** Golden questions per project + wrong-project negative tests before ship?
9. **Owner Admin:** Platform aggregate AI cost dashboard vs per-tenant usage in M-OPS-03?
10. **Kill criteria:** What usage or cost threshold triggers tighter caps or Pro-only?

---

## Planning gate — required before M-AI-01 build

Do **not** start implementation until this checklist is written and reviewed (Human GO for anything that touches live RPC apply or new meters on production):

- [ ] Options A–E scored with explicit pick + rejected alternatives recorded
- [ ] Unit economics model: assumed queries/company/month × model cost × tier mix
- [ ] `ai_queries_monthly` (or equivalent) spec aligned with `plan_price_meters` / M-BILL-F
- [ ] Security review: project isolation, JWT forwarding, no service-role leakage, audit log
- [ ] Citation/abstain UX spec + eval dataset
- [ ] Explicit “not in v1” list signed off
- [ ] Implementation slices sequenced (RPC → Edge → mobile → optional MCP → metering)
- [ ] ROADMAP M-AI-01 row updated with GO date and plan link

---

## Relationship to other milestones

**M-AUTHZ-02:** Project membership rules must be reflected in RPC ACLs before multi-company scenarios go live.

**M-BILL-01 / M-BILL-F:** Entitlements table exists; AI meter can soft-enforce in gateway before hard Stripe-linked enforcement.

**M-OPS-03 Owner Admin app:** Platform-level AI spend visibility; distinct from field Q&A.

**M-PERF-02 (upload downscaling):** Reduces storage cost; orthogonal to Q&A read path.

**MCP hub (external platforms):** Do not conflate with M-AI-01; separate decision if ever revived.

---

## Session log (2026-08-24)

Topics covered in chat: layered architecture (RPC → Edge gateway → MCP/REST clients); where each layer lives (Supabase vs app vs external MCP); per-call cost estimates; fit with HK seat/storage/entries pricing; difference from roadmap intent vs MCP hub doc vs Create Task LLM; recommendation to bundle with fair-use caps rather than API metering; defer full implementation pending deeper planning.

Also documented same session (separate threads): M-PERF-02 photo downscaling on ROADMAP; M-OPS-03 Owner Admin as dedicated app; Maestro logout-before-kill policy.

---

## References

- `documentation/ROADMAP.md` — M-AI-01 row
- `docs/superpowers/plans/2026-08-19-post-rc-boring-loop.md` — AI policy
- `docs/superpowers/analysis/2026-08-19-roadmap-clarification.md` — sequence lock
- `docs/superpowers/plans/2026-08-24-billing-hkd-pricing-lock.md` — tier caps
- `MCP_HUB_ARCHITECTURE.md` — external platform hub (different scope)
- `documentation/audit/database/2026-08-07-msupabase01-system-coupling-map.md` — task/activity coupling
- `supabase/functions/invite-user/` — Edge function pattern
- `src/api/task-llm-service.ts` — current Create Task LLM (client-side; do not extend for Q&A)
