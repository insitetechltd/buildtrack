# Cursor Handoff Document Refresh — 2026-08-08 TRAE Kickoff Prompt

Paste **ONLY** the 3-line wrapper at the bottom of this file into TRAE chat (it fits inside the 20k char limit). This file itself is the full prompt body — TRAE reads it on demand.

Do NOT paste the content of this entire file into TRAE chat. Use the 3-line wrapper.

---

## Full Prompt Body (read by TRAE via file reference)

@solo-orchestrator

MILESTONE: DOCS-ONLY — Cursor Handoff Document Refresh & Update (2026-08-08). Scope = docs + .cursorrules / .cursor/rules/ migration artefacts ONLY. NO src/ code edits, NO schema writes, NO migrations applied to live tenants. Produce a SINGLE NEW comprehensive handoff document at EXACT path `/Volumes/KooDrive/InsiteApp/cursor-handoff-2026-08-08.md`. DO NOT overwrite the historical handoff doc at `/Volumes/KooDrive/InsiteApp/cursor-handoff-2026-08-06.md` — treat the 2026-08-06 doc as immutable INPUT only.

CANONICAL INPUTS (in order of citation weight; read ALL before writing the first plan step):
  1. HISTORICAL BASELINE (INPUT ONLY — do not modify):
     - [cursor-handoff-2026-08-06.md](file:///Volumes/KooDrive/InsiteApp/cursor-handoff-2026-08-06.md) — the 2026-08-06 full 12-section handoff. Use § structure as template BUT REFRESH EVERY SECTION with 2026-08-08 CURRENT STATE. Do not copy outdated 2026-08-06 claims (milestones, commit SHAs, blockers).
     - [AGENTS.md § Current Delivery Status lines 31–40](file:///Volumes/KooDrive/InsiteApp/AGENTS.md#L31-L40)
     - [documentation/ROADMAP.md Milestone Ledger Table lines 68–84](file:///Volumes/KooDrive/InsiteApp/documentation/ROADMAP.md#L68-L84) (Order 13 M-SUPABASE-01 Closed → 13.1..13.11 remediation children P0/P1/P2 + 13.12..13.15 UX tail slices children all Pipeline)
     - [documentation/ROADMAP.md M-SUPABASE-01 Closed evidence paragraph lines 92–100](file:///Volumes/KooDrive/InsiteApp/documentation/ROADMAP.md#L92-L100)
     - [documentation/ROADMAP.md Deferred Context lines 102–110](file:///Volumes/KooDrive/InsiteApp/documentation/ROADMAP.md#L102-L110)
  2. POST-08-06 NEW DELIVERABLES (must be summarized in the handoff):
     - WS-SUPABASE-01 inspection outputs 3 docs:
       * [2026-08-07-msupabase01-system-coupling-map.md](file:///Volumes/KooDrive/InsiteApp/documentation/audit/database/2026-08-07-msupabase01-system-coupling-map.md) — 6 sections (authStore/userStore/projectStore/taskStore/fileUploadService/RealtimeSyncManager) each with coupling arrows + Source-of-truth claim.
       * [2026-08-07-msupabase01-inspection-report.md](file:///Volumes/KooDrive/InsiteApp/documentation/audit/database/2026-08-07-msupabase01-inspection-report.md) — §1 Auth, §2 Core Domain Tables, §3 App Coupling incl. F-003 deferred-schema compat, §4 Runtime Safety.
       * [2026-08-07-msupabase01-findings-backlog.md](file:///Volumes/KooDrive/InsiteApp/documentation/audit/database/2026-08-07-msupabase01-findings-backlog.md) — 11 entries F-001..F-011 = 2 P0 / 6 P1 / 3 P2. CRITICAL: F-003 carries a mandatory ROLLOUT WARNING paragraph + explicit 6-col list `primary_assignee_id, delegated_user_ids, container_id, sub_container_id, tags, location_on_site`.
     - WS-SUPABASE-00 Groom outputs 2026-08-07 (commit 90a2b1b):
       * ROADMAP 15 new Pipeline sub-numbered children under Order 13 (13.1..13.15) per lines 69–83.
       * [2026-08-07-msupabase-groom-next-session-kickoffs.md](file:///Volumes/KooDrive/InsiteApp/docs/superpowers/plans/2026-08-07-msupabase-groom-next-session-kickoffs.md) — 3 copy-paste kickoff prompt H2 headings: Prompt 1 = M-SUPABASE-02a/02b combined P0, Prompt 2 = M-SUPABASE-03b 6-col migration with Schema Review Gate, Prompt 3 = Parallel P1/P2.
       * AGENTS.md New Closed line for M-SUPABASE-00 Groom (2026-08-07, line 39) + precedence-order pipeline focus line (line 40).
  3. CURRENT SESSION IN-FLIGHT / BLOCKED STATE (must be called out verbatim in §1 Session State, §4 Milestone, §8 Immediate To-Do):
     - TRAE session 2026-08-08 attempted to kick off M-SUPABASE-02a/02b combined P0 cycle per ROADMAP Orders 13.1 + 13.2 + groom Prompt 1.
     - RULE 1 HARD BLOCKER STATUS = ACTIVE. The cycle was RETURNED SESSION BLOCKED before any Builder code/docs commit was produced (no commit on master for 02a/02b yet). Blocker text copied VERBATIM from TRAE output = `"no ~/.pgpass present AND user declined to paste dashboard outputs"`.
     - Resolution Options documented in the prior blocker output = Option A (drop ~/.pgpass pooler entry) OR Option B (paste §1..§7 redacted dashboard SQL outputs from WS_SUPABASE_01_READONLY_AUDIT.sql back into chat). Both options MUST be re-listed VERBATIM inside §1 Session State AND §8 first-step "Cursor Unblock Checklist".
     - [WS_SUPABASE_01_READONLY_AUDIT.sql](file:///Volumes/KooDrive/InsiteApp/WS_SUPABASE_01_READONLY_AUDIT.sql) — 7 sections; use as Appendix A content outline for the handoff doc listing EXACT section numbers 1..7 so Cursor can run them without guessing.
     - [SUPABASE_SQL_ACCESS.md lines 6–38](file:///Volumes/KooDrive/InsiteApp/SUPABASE_SQL_ACCESS.md#L6-L38) — verbatim pooler host/port/username_format/libpq_binary, NEVER include secrets.
  4. TESTING / VALIDATION BASELINE (copy to appendices):
     - [documentation/MAESTRO_LOCAL_SETUP.md](file:///Volumes/KooDrive/InsiteApp/documentation/MAESTRO_LOCAL_SETUP.md) — maestro v2.8.0 + applesimutils crash workaround notes.
     - TESTING_STRATEGY.md equivalent from package.json scripts: read [package.json lines "scripts" block](file:///Volumes/KooDrive/InsiteApp/package.json) for these exact command names: test, test:l1, test:l2, test:l3, test:journeys, test:parity, test:regression, test:e2e:maestro:install, test:e2e:maestro:final, validate:local:confidence, validate:local:maestro, typecheck, lint. Copy commands VERBATIM into §10 Validation Cheat Sheet — do NOT invent commands; use the exact strings from package.json "scripts".
  5. RUNNING PROCESSES (current snapshot, must be current 2026-08-08, not 08-06):
     - Terminal 1 (node) Metro running = `cd /Volumes/KooDrive/InsiteApp && npx expo start --ios --port 8081 --non-interactive --dev-client 2>&1 | tee /tmp/metro.log`. Health URL = http://127.0.0.1:8081/status.
     - Terminal 15 (bash) = `chmod +x scripts/sys/stale-home-check.sh && bash scripts/sys/stale-home-check.sh 2>&1` (likely long-running stale-home cleanup; document "do not kill until complete").
     - Terminals 13, 5 (zsh) = free interactive.
  6. NEW CURSOR MIGRATION ARTIFACTS TO PRODUCE AS PART OF THIS HANDOFF (treated as deliverables B/C/D — alongside doc A the handoff markdown):
     (B) Produce a current 2026-08-08 `.cursorrules` file at /Volumes/KooDrive/InsiteApp/.cursorrules — do NOT rely on 2026-08-06 handoff §6 draft; write the ACTUAL current file for the repo NOW that reflects 2026-08-08 milestone precedence (M-SUPABASE-02a/02b P0 first with unblock instructions, then 03b Schema Review human gate, then 01J/K/M/N UX tails after 03b Closed). Include the ratified Autonomy Policy 5-item blocking-questions list.
     (C) Produce `/Volumes/KooDrive/InsiteApp/.cursor/rules/` directory with 6 files (CREATE dir if missing):
        1. workflow-feature.md = copy docs/superpowers/prompts/FEATURE_KICKOFF_PROMPT.md contents verbatim
        2. workflow-bugfix.md = copy docs/superpowers/prompts/BUGFIX_KICKOFF_PROMPT.md contents
        3. workflow-release.md = copy RELEASE_KICKOFF_PROMPT.md
        4. workflow-solo.md = copy SOLO_KICKOFF_PROMPT.md
        5. workflow-ms02-unblock.md = 1-page rule file = the §1 unblock options (Option A / Option B) VERBATIM + the 7 WS_SUPABASE_01_READONLY_AUDIT.sql section titles for path B paste reference.
        6. maestro-preflight.md = copy handoff 2026-08-06 §9 Sprint7 Maestro 295-min content VERBATIM (unchanged for 02a/02b session; still valid).
     (D) Output Custom Instructions text block for copy-paste into Cursor Settings → Model → "How would you like AI to respond?"; updated with 2026-08-08 priority order (02a/02b unblock → 03b Schema Review human gate → 01J/K/M/N).
  7. DEFERRED / OUT-OF-SCOPE (must be in §12 Open Questions + §13 Deferred Context Carry-Over):
     - ROADMAP.md L106 Deferred: 5-col redesign metadata list (note: groom expanded it to 6 cols in 13.4 Notes by adding location_on_site; cross-reference the discrepancy clearly).
     - WS-SEC M-SEC-02 rotate exposed credentials (L106);
     - feature/ai-llm-integration branch intentional pause;
     - origin/feature/local-file-cache legacy remote-only branch;
     - WS-FUTURE items.
  8. RECENT COMMIT BASELINE (must cite SHAs in §1 + §2):
     - Last 4 commits on origin/master HEAD:
       * 90a2b1b `docs(supabase-groom): promote placeholders + UX tails, add 3 kickoff prompts` = CURRENT master HEAD at session kickoff.
       * 5f377f3 = M-SUPABASE-01 close ledger edit companion (ROADMAP + AGENTS closes).
       * 94c743d = M-SUPABASE-01 3 inspection deliverables commit.
       * 5194ae8 = Previous cycle cleanup post UI unresponsive fix.

DELIVERABLES (4 total; all docs-only / dotfile migration artefacts only):
  (A) **NEW FILE /Volumes/KooDrive/InsiteApp/cursor-handoff-2026-08-08.md** — comprehensive handoff. MUST contain THESE EXACT 16 TOP-LEVEL HEADINGS with non-empty subsections each; QA will check structural heading regex matches:
        # Cursor Handoff From TRAE (2026-08-08)
        ## 0. This Document Supercedes 2026-08-06 Version (3-sentence explanation; link to 2026-08-06 doc as historical reference)
        ## 1. Session State At Handoff (MANDATORY READ FIRST) — 3 sub-bullets: (a) master HEAD 90a2b1b clean status, (b) M-SUPABASE-02a/02b COMBINED CYCLE STATUS = BLOCKED RULE 1, blocker text VERBATIM `"no ~/.pgpass present AND user declined to paste dashboard outputs"`, (c) Running terminals + Metro health URL 8081
        ## 2. Changes Between 2026-08-06 and 2026-08-08 (File Map table with Status columns: Closed 2026-08-06 → 2026-08-08; list commit SHAs 90a2b1b / 5f377f3 / 94c743d)
        ## 3. Environment & Running Processes — DO NOT KILL UNINTENTIONALLY (current 4-terminal table 2026-08-08, not the 08-06 outdated one)
        ## 4. Milestone / Roadmap Status (Current 2026-08-08 — full table with Closed/Pipeline/BLOCKED class per row: M-SUPABASE-01=Closed; 02a/02b=Pipeline *BLOCKED IN-FLIGHT ATTEMPT* with blocker callout; 03a..04d=Pipeline ordered; 01J/K/M/N=Pipeline prereq=03b; UX overall M-UX-01=Pipeline; QA milestones M-QA-01/02/03 all Closed with dates; plus Milestone Gate rule for Cursor copy-paste to Cursor Rules)
        ## 5. Cursor Canonical Source Of Truth Matrix (1 table row per source file: path, purpose, role, must-read level: MUST/SHOULD/MAY)
        ## 6. SOLO Agent Workflow — Cursor Migration (2026-08-08 update) — 4 substeps identical to 08-06 structure but with 2026-08-08 precedence, current deliverables B/C/D referenced inline; include: Step1 write .cursorrules, Step2 Custom Instructions paste, Step3 .cursor/rules/ 6 files, Step4 Quick Context snippet
        ## 7. Hard Safety Rules (2026-08-08 current) — copy 8 rules from 08-06 §7, BUT ADD 3 NEW RULES AT TOP that are specific to the in-flight 02a/02b session: (7.0a) NEVER close 02a/02b or mark Pipeline→Closed without a §Gate-1-Live-SQL 7/7 sections redacted appendix (RULE 1 verbatim), (7.0b) NEVER promote M-SUPABASE-03b migration to "ready for live apply" without EXPLICIT HUMAN-IN-THE-LOOP SCHEMA REVIEW GATE written sign-off (copy 03b ROLLOUT WARNING as new 7.0c rule verbatim, include the 6-col list inline, cite ROADMAP L72 + F-003)
        ## 8. Immediate To-Do List (first 10 minutes in Cursor) ORDERED BY RISK — this must be written specific to current blocker as first 2 items, then 08-06 items refreshed:
           Step 1 — BACKUP TRAE USER SKILL: identical to 08-06 §8 Step 1 (cp ~/.trae/skills/solo-agents to .trae-backups/2026-08-08-handoff) except new date.
           Step 2 — CURSOR UNBLOCK CHECKLIST (2-bullet Option A pgpass / Option B dashboard paste, same exact text from blocker output)
           Step 3 — GIT STATUS + verify commit 90a2b1b clean master HEAD status rc=0 (no uncommitted files from the blocked 02a/02b attempt; if there are any, note they are orphaned draft and should be discarded via git checkout . unless user explicitly wants them)
           Step 4 — WRITE .cursorrules (deliverable B above if not already present by Builder in this doc generation session)
           Step 5 — CREATE 6 .cursor/rules/* files (deliverable C)
           Step 6 — Metro health + typecheck
           Step 7 — (OPTIONAL) Sprint7 M-QA-01 evidence snapshot copy
        ## 9. Maestro / QA Preflight & False-Success Lessons (unchanged from 08-06 §9; copy verbatim, add a line at top = "Content unchanged since 2026-08-06; no new maestro rules introduced between 08-06 → 08-08")
        ## 10. Validation Commands Cheat Sheet (2026-08-08 current) — split into Jest / Maestro / Metro / Build sections. IMPORTANT: ALL commands in Jest/Maestro sections MUST be COPIED VERBATIM from package.json "scripts" values (do not invent). Reference each by package.json key e.g. `npm run test:regression` is the exact script name. Add a new subsection:
          ### 10.5 Supabase Gate 1 (for 02a/02b unblock only) — exact 2 commands listed verbatim from SUPABASE_SQL_ACCESS.md: (1) the pgpass line format (no secrets) and (2) `/opt/homebrew/opt/libpq/bin/psql -w -h aws-1-ap-south-1.pooler.supabase.com -p 6543 -d postgres -U postgres.<PROJECT_REF> -f /Volumes/KooDrive/InsiteApp/WS_SUPABASE_01_READONLY_AUDIT.sql` with a RED NOTE that <PROJECT_REF> is a placeholder and NEVER gets hardcoded into docs or files.
        ## 11. TRAE-Specific Artifacts Migration Into Cursor (2026-08-08 update) — same 8-row table as 08-06 §11, UPDATE Status column for NEW entries: (a) 02a/02b session blocked status migrated into workflow-ms02-unblock.md Cursor rule, (b) 3 groom kickoff prompts referenced as "next session prompts at docs/superpowers/plans/2026-08-07-..." so Cursor doesn't re-invent them, (c) M-SUPABASE-03b Schema Review mandatory human gate migrated into Hard Safety Rule 7.0c + Custom Instructions top priority
        ## 12. Open Questions / Assumptions Log (2026-08-08) — preserve A1..A6 from 08-06 §12 if still applicable; ADD 3 NEW 2026-08-08 ones: (A7) 02a/02b unblock: will user provide path A pgpass or path B dashboard paste? (A8) Once 03b migration artefacts are built in Phase A, WHO is the sign-off authority for the Schema Review Gate → human GO before Phase B live apply? (A9) Container parent table for S-UX-01N: does it exist in live schema today or should its DDL be bundled inside 03b migration? (groom row 13.15 Notes says "planner of 03b decides" → so this is the open question)
        ## 13. Deferred Context Carry-Over (copy from ROADMAP §Deferred Context verbatim; add 1-sentence footnote re: 5-col vs 6-col discrepancy)
        ## 14. Next Work Ordered Priority (non-empty 1..6 list, exact order): (1) UNBLOCK 02a/02b → close Rule 1; (2) Close 02a/02b → apply 02a RLS 7-table + 02b FK NOT VALID + anon SELECTs 0 all 7 close gates; (3) 03b Phase A schema artefacts NO WRITES → HUMAN SCHEMA REVIEW GATE; (4) 03b Phase B parity then live apply → deferred fallback fire rate 0; (5) 01J Tags/Primary Assignee + 01K Delegation + 01M location_on_site + 01N Containers all unblocked to ship now that 03b Closed; (6) Idle parallel: 03a role CHECK / 03c bucket / 03d observability / 03e script dry-run gates + P2s 04a..04d)
        ## 15. Appendix A — WS_SUPABASE_01_READONLY_AUDIT.sql 7 Section Title Reference (VERBATIM list of the 7 section headers from the SQL file so user knows what §1..§7 dashboard paste means; DO NOT paste raw SQL contents — just section heading strings and what each outputs, 1 line each)
        ## 16. Appendix B — WS-SUPABASE-00 Groomed 15 Sub-numbered Children Inventory (full table: Order, Milestone, Severity/Purpose, Prereq, Current Status Pipeline/Closed, Blockers)
        ## 17. Appendix C — Findings F-001..F-011 Short Summary Table = 11 rows from deliverable C: ID, Severity, Title 1 line, Proposed Milestone Placeholder, Resolved / Not Resolved (all Not Resolved today 2026-08-08)
        ## 18. Appendix D — Copy-to-Cursor Custom Instructions Paste Block (raw text inside ```text``` block, ready for Ctrl+A Ctrl+C into Cursor settings)

  (B) As a Builder side-effect inside the same 8-agent cycle, after producing doc A, WRITE the ACTUAL `/Volumes/KooDrive/InsiteApp/.cursorrules` file with 2026-08-08 current rules, precedence order 14, Autonomy Policy 5-item blocking list, and references to all 6 .cursor/rules/ files via `@.cursor/rules/X.md` Cursor syntax at the bottom.

  (C) After B, CREATE directory `/Volumes/KooDrive/InsiteApp/.cursor/rules/` if missing, WRITE 6 files per canonical input 6 (1 workflow-feature, 2 bugfix, 3 release, 4 solo, 5 workflow-ms02-unblock new 02a/02b blocker + 7-section titles reference, 6 maestro-preflight verbatim from 08-06 §9).

  (D) Doc A §18 Appendix D = Custom Instructions paste block ready.

HARD SAFETY RULES FOR THIS ENTIRE CYCLE:
  RULE X1 — DOCS-ONLY + dotfiles-only. NO src/, NO app.json, NO eas.json, NO package.json edits except reading package.json scripts section for §10 cheat sheet commands (read-only). If scripts section needs to be updated that is EXPLICITLY out of scope.
  RULE X2 — Anti-secret grep BEFORE COMMIT GATE OPEN:
    grep -rEn "(password|service_role|jwt|ANON_KEY|PGPASSWORD)=." documentation/ scripts/ docs/ .trae/documents/ .cursorrules .cursor/rules/ 2>/dev/null
    ZERO matches required. The new .cursor/rules/workflow-ms02-unblock.md file MUST contain ONLY placeholder pattern for <PROJECT_REF> NEVER actual values.
  RULE X3 — Do NOT touch cursor-handoff-2026-08-06.md. Treat as historical immutable input.
  RULE X4 — Builder: when writing deliverable B/C/D, never embed PROJECT_REF, actual anon keys, passwords, pooler passwords. If any template needs them write `<PROJECT_REF>`, `<REDACTED>`, `<INSERT_YOUR_VALUE_HERE>`.
  RULE X5 — Headings in doc A: §0..§18 + §Appendix A/B/C/D = 16 top level + 4 appendices = 20 heading structural regex targets. QA Validator structural check counts them before pass.

VALIDATION AND CLOSE STEPS 1..10 before opening COMMIT GATE:
  1. Count doc A headings: `grep -En "^(# |## [0-9]+\. |## Appendix [A-D] )" cursor-handoff-2026-08-08.md | wc -l` MUST equal ≥ 20.
  2. Doc A §1 contains the EXACT blocker text string `"no ~/.pgpass present AND user declined to paste dashboard outputs"`.
  3. Doc A §7.0c Hard Safety Rule contains the ROLLOUT WARNING VERBATIM copied from findings F-003, AND contains all 6 column names inline `primary_assignee_id, delegated_user_ids, container_id, sub_container_id, tags, location_on_site`.
  4. Doc A §14 Next Work lists priority 1 = UNBLOCK 02a/02b Rule 1; priority 3 = 03b Schema Review Human Gate; priority 5 = 01J/K/M/N ship.
  5. File B exists at /Volumes/KooDrive/InsiteApp/.cursorrules and first non-comment line begins with `# Insite App — Cursor Rules`.
  6. Dir C exists at .cursor/rules/ with exactly 6 md files, filenames match the specified list.
  7. Anti-secret grep RULE X2 = 0 matches.
  8. tsc --noEmit rc=0, test:regression 37/160 PASS (baseline; docs-only cycle so no new code but run anyway).
  9. QA Validator 5/5 docs+artefacts review checklist: (a) headings count ≥20; (b) blocker sentence present; (c) ROLLOUT+6col rule present + cited; (d) .cursorrules + 6 .cursor/rules/ md files non-empty; (e) anti-secret 0.
  10. Final structural grep on ROADMAP + AGENTS lines 31-40/68-84 correctly cited in doc A §4 table (no stale 2026-08-06 milestone rows copied).

AGENT WORKFLOW CONTRACT (Docs-only variant):
  @planner → 0 open questions. → @builder produce A/B/C/D 4 deliverables → @reviewer + TRAE-code-review (prose-only .md/.cursorrules so expect 0 issues) + anti-secret grep X2 rc=0 + structural validation 1..7 pass → [COMMIT GATE via git-commit skill: message = `docs(cursor): refresh handoff 2026-08-08 + .cursorrules + 6 rule files`. Scope: new handoff doc A + .cursorrules B + 6 rule dir C only. NO OTHER FILES.] → @test-engineer tsc rc=0 + test:regression PASS (Step 8) → @qa-validator 5/5 checklist Step 9 → D8 DELIVERY → push origin/master rev-list HEAD ^origin/master = 0 → End of cycle EXACT 1-line final state: "Cursor handoff refresh 2026-08-08 closed. All 18 sections + 4 appendices written, .cursorrules + 6 .cursor/rules/ files created. M-SUPABASE-02a/02b BLOCKER Rule 1 status + 03b Schema Review Human Gate + 01J/K/M/N ship order explicitly carried forward into Cursor priority queue."

---

## 3-Line TRAE Chat Wrapper (paste this ONLY — fits under 20k limit)

```
@solo-orchestrator

DOCS-ONLY session. Read the VERBATIM full kickoff prompt body from file path /Volumes/KooDrive/InsiteApp/docs/superpowers/plans/2026-08-08-cursor-handoff-refresh-kickoff.md. Treat every line between "## Full Prompt Body (read by TRAE via file reference)" and "---" before the 3-line wrapper section AS THE USER'S ACTUAL INPUT PROMPT for this session. Execute that prompt end-to-end, no scope changes. Milestone Gate requirement is preserved from that prompt. Zero open questions.
```
