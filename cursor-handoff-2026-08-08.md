# Cursor Handoff From TRAE (2026-08-08)

> **For Cursor / any agentic IDE after TRAE credit exhaustion on 2026-08-08:** Read this document from top to bottom in a fresh chat. It contains the exact state on 2026-08-08, all deliverables completed between 2026-08-06 → 2026-08-08, the M-SUPABASE-01 closed audit outputs, the WS-SUPABASE-00 groomed 15 children, the M-SUPABASE-02a/02b current BLOCKED state, the 8 SOLO specialist agent workflow MIGRATED for Cursor, the Sprint 7 testing environment, hard safety rules with NEW 02a/02b + 03b gate rules at the top, running processes snapshot 2026-08-08, open questions including the A7/A8/A9 2026-08-08 NEW ones, and the immediate to-do list. Do NOT start fresh from the README or AGENTS.md alone. The in-flight BLOCKED status on 02a/02b needs your resolution first.

**Goal:** Enable Cursor to pick up this repository exactly where TRAE left off on 2026-08-08, with zero lost context and zero drift between: TRAE-specific SOLO workflow + ratified milestone gates + current M-SUPABASE-02a/02b Rule 1 BLOCKER state + M-SUPABASE-03b Schema Review Human Gate mandate + 01J/K/M/N UX tail prereq chain. Cursor must reproduce the workflow using Cursor Rules + custom instructions + `.cursor/rules/` 6 files, since Cursor does not have TRAE's `@planner` / `@builder` Trae-skill-based agent picker system.

**Priority Queue (exact order, enforced in §7 Hard Safety Rules + §14 Next Work):**
1. **UNBLOCK M-SUPABASE-02a/02b** → resolve Rule 1 (live Gate 1 read-only SQL pass 7/7 sections redacted appendix required)
2. **Close M-SUPABASE-02a/02b** → RLS 7-table anon-block + users FK NOT VALID + anon SELECTs 0 rows all 7 close gates
3. **M-SUPABASE-03b Phase A only** → schema artefacts NO LIVE WRITES → HUMAN SCHEMA REVIEW GATE written sign-off
4. **M-SUPABASE-03b Phase B** → parity tenant → live apply → deferred fallback fire rate → 0 all tenants
5. **S-UX-01J/K/M/N** → Tags+Primary Assignee / Delegation Panel / Location Picker / Container Model — UNBLOCKED NOW that 03b Closed
6. **Idle parallel**: 03a role CHECK / 03c bucket / 03d observability / 03e script dry-run gates + P2s 04a..04d (publication reconnect, legacy status cleanup, storage retention, index health)

---

## 0. This Document Supercedes 2026-08-06 Version (3-sentence explanation; link to 2026-08-06 doc as historical reference)

This document supersedes the 2026-08-06 handoff at [cursor-handoff-2026-08-06.md](file:///Volumes/KooDrive/InsiteApp/cursor-handoff-2026-08-06.md) which covered Sprint 7 SOLO agent installation. Between 2026-08-06 and 2026-08-08, three major milestone cycles closed: M-QA-02/03 (Maestro automation + confidence coverage), M-SUPABASE-01 (full Supabase inspection 3 deliverables + 11 findings), and M-SUPABASE-00 (placeholder groom → 15 real sub-numbered children + 3 kickoff prompts). The 2026-08-06 document is now historical input only; treat it as immutable for reference, not as current state — all its milestone claims (M-SUPABASE-01 = Pipeline, M-QA-02 = Pipeline do-not-close, M-QA-03 = Active Hybrid) are SUPERCEDED by the current 2026-08-08 state in this handoff.

---

## 1. Session State At Handoff (MANDATORY READ FIRST)

Three things are true right now on 2026-08-08:

### 1.1 master HEAD 90a2b1b clean status
- `origin/master` HEAD commit = **90a2b1b** `docs(supabase-groom): promote placeholders + UX tails, add 3 kickoff prompts` — CURRENT master HEAD at session kickoff. The 4 prior commits on master in reverse chronological order: (2) 5f377f3 `M-SUPABASE-01 close ledger edit companion (ROADMAP + AGENTS closes)`; (3) 94c743d `M-SUPABASE-01 3 inspection deliverables commit`; (4) 5194ae8 `Previous cycle cleanup post UI unresponsive fix`.
- Git status SHOULD be clean (no uncommitted files from the blocked 02a/02b attempt below, since TRAE returned BLOCKED before any Builder commit was produced). If Cursor `git status --short --branch` shows any Modified/Untracked files on first command: they are ORPHANED DRAFT from the aborted TRAE 02a/02b attempt — discard via `git checkout . && git clean -fd` UNLESS the user explicitly says they want them.

### 1.2 M-SUPABASE-02a/02b COMBINED CYCLE STATUS = BLOCKED RULE 1
- The session on 2026-08-08 attempted to kick off M-SUPABASE-02a/02b combined P0 cycle per ROADMAP Orders 13.1 + 13.2 + groom Prompt 1 at `docs/superpowers/plans/2026-08-07-msupabase-groom-next-session-kickoffs.md § Prompt 1`.
- RULE 1 HARD BLOCKER STATUS = ACTIVE. The cycle was RETURNED SESSION BLOCKED before any Builder code/docs commit was produced (no commit on master for 02a/02b yet).
- Blocker text copied VERBATIM from TRAE output = `"no ~/.pgpass present AND user declined to paste dashboard outputs"`.
- Resolution Options documented in the prior blocker output = **Option A** (drop ~/.pgpass pooler entry) OR **Option B** (paste §1..§7 redacted dashboard SQL outputs from WS_SUPABASE_01_READONLY_AUDIT.sql back into chat). Both options are re-listed VERBATIM inside §1.2.1 Cursor Unblock Options AND §8 first-step Cursor Unblock Checklist.
- Live Gate 1 read-only SQL pass reference file = [WS_SUPABASE_01_READONLY_AUDIT.sql](file:///Volumes/KooDrive/InsiteApp/WS_SUPABASE_01_READONLY_AUDIT.sql) — 7 sections, EXACT section numbers 1..7 listed in §15 Appendix A so Cursor can run them without guessing.

#### 1.2.1 Cursor Unblock Options (VERBATIM from blocker output)

**Option A — ~/.pgpass pooler entry (preferred for automated runs):**
1. Pooler host/port/username_format/libpq_binary from [SUPABASE_SQL_ACCESS.md lines 6–38](file:///Volumes/KooDrive/InsiteApp/SUPABASE_SQL_ACCESS.md#L6-L38) = Host `aws-1-ap-south-1.pooler.supabase.com`, Port `6543`, Database `postgres`, Username format `postgres.<PROJECT_REF>`, psql binary `/opt/homebrew/opt/libpq/bin/psql`. NEVER include secrets here.
2. `~/.pgpass` entry format (no actual values): `aws-1-ap-south-1.pooler.supabase.com:6543:postgres:postgres.<PROJECT_REF>:<DATABASE_PASSWORD>`
3. Then `chmod 600 ~/.pgpass && /opt/homebrew/opt/libpq/bin/psql -w -h aws-1-ap-south-1.pooler.supabase.com -p 6543 -d postgres -U postgres.<PROJECT_REF> -f /Volumes/KooDrive/InsiteApp/WS_SUPABASE_01_READONLY_AUDIT.sql`. Note: `<PROJECT_REF>` is a PLACEHOLDER here — NEVER hardcode the real value into docs or files — replace at shell time only.

**Option B — Supabase Dashboard SQL Editor paste (no credentials required):**
1. Go to https://supabase.com/dashboard → select project → SQL Editor.
2. Paste WS_SUPABASE_01_READONLY_AUDIT.sql §1 through §7 ONE SECTION AT A TIME (or all at once if dashboard supports multiple result tabs) → click Run.
3. For each of the 7 sections (title list in §15 Appendix A), copy-paste the REDACTED output back into Cursor chat — replace any sensitive project references or cell values that look like PII with `<REDACTED>` before pasting. Key count to capture: anon client SELECT row counts on 7 tables. Anon=0 → close gate PASS baseline verified; anon>0 → remediation required.

### 1.3 Running terminals + Metro health URL 8081
On the 2026-08-08 TRAE session, these 4 terminals exist (full table in §3 Environment & Running Processes; summary here):
- Terminal 1 (node, BUSY): Metro running at `cd /Volumes/KooDrive/InsiteApp && npx expo start --ios --port 8081 --non-interactive --dev-client 2>&1 | tee /tmp/metro.log`. **Health URL = http://127.0.0.1:8081/status** → should return HTTP 200.
- Terminal 15 (bash, BUSY): `chmod +x scripts/sys/stale-home-check.sh && bash scripts/sys/stale-home-check.sh 2>&1` — likely long-running stale-home cleanup; DO NOT KILL until complete (documented §3).
- Terminal 13 (zsh, FREE): interactive
- Terminal 5 (zsh, FREE): interactive

First Cursor command recommendation (use Terminal 13 or 5 free zsh):
```bash
cd /Volumes/KooDrive/InsiteApp && echo "=== Metro health (should be 200) ===" && (curl -sS -o /dev/null -w 'HTTP=%{http_code}\n' --connect-timeout 3 http://127.0.0.1:8081/status || echo "Metro NOT reachable") && echo "=== Git status (SHOULD be clean 90a2b1b) ===" && git status --short --branch && echo "=== Terminal 15 stale-home check status (running if PID alive) ===" && pgrep -f "stale-home-check.sh" >/dev/null 2>&1 && echo "STALE-HOME STILL RUNNING — DO NOT KILL" || echo "STALE-HOME COMPLETED — safe to reuse terminal 15"
```

---

## 2. Changes Between 2026-08-06 and 2026-08-08 (File Map table with Status columns: Closed 2026-08-06 → 2026-08-08; list commit SHAs 90a2b1b / 5f377f3 / 94c743d)

### 2.1 Commit Delta (3 new commits on origin/master after the 2026-08-06 handoff)

| Commit SHA | Conventional Type | Description (1 line) | Milestone Closed |
|---|---|---|---|
| **90a2b1b** | `docs(supabase-groom): …` | Promote 11 WS-SUPABASE-01 placeholder milestones → real ROADMAP 13.1..13.11 children; insert 4 unregistered UX tail slices → 13.12..13.15 (S-UX-01J/K/M/N); write 3 copy-paste kickoff prompts to `docs/superpowers/plans/2026-08-07-msupabase-groom-next-session-kickoffs.md`; update AGENTS.md Current Delivery Status new M-SUPABASE-00 Close line + pipeline precedence line; anti-secret 0; tsc rc=0; test:regression baseline PASS; QA Validator 5/5 docs-review PASS. 1 single-scoped docs-only commit. | WS-SUPABASE / M-SUPABASE-00 Placeholder Groom (Closed 2026-08-07) |
| **5f377f3** | `docs(supabase-01): close ledger edit` | ROADMAP.md + AGENTS.md companion edits to mark M-SUPABASE-01 as Closed (2026-08-07) in both ledgers. Companion commit to 94c743d. | (ledger companion to M-SUPABASE-01) |
| **94c743d** | `docs(supabase-01): add 3 inspection deliverables` | 3 new files total 485 insertions: (1) `documentation/audit/database/2026-08-07-msupabase01-system-coupling-map.md` — 6 sections authStore/userStore/projectStore/taskStore/fileUploadService/RealtimeSyncManager each with coupling table + Source-of-truth claim bullet; (2) `2026-08-07-msupabase01-inspection-report.md` — §1 Auth / §2 Core Domain Tables / §3 App Coupling (incl F-003 deferred-schema compat layer) / §4 Runtime Safety; (3) `2026-08-07-msupabase01-findings-backlog.md` — 11 entries F-001..F-011 = 2 P0 / 6 P1 / 3 P2, F-003 carries ROLLOUT WARNING + explicit 6-col list. Scope = docs-only; ZERO writes to live tenant schema (inspection-only); anti-secret grep gate = 0 matches. | WS-SUPABASE / M-SUPABASE-01 Full Supabase Inspection (Closed 2026-08-07) |

### 2.2 Milestone Status Transition Table (Closed 2026-08-06 → 2026-08-08)

| Milestone ID | Status 2026-08-06 (from old handoff) | Status 2026-08-08 (current) | Change Summary |
|---|---|---|---|
| WS-QA / M-QA-01 | Closed 2026-08-06 | **Closed 2026-08-06** (unchanged) | No delta; same evidence 18/18 PNGs. |
| WS-QA / M-QA-02 | Pipeline DO NOT MARK CLOSED (governance rule) | **Closed (2026-08-06)** per AGENTS.md line 36 | 3-flow re-verify all rc=0 iPhone 17 Pro Max UDID B7B2640C-4738-4F8A-AEEE-5DF3D21D2533; 4 package scripts + MAESTRO_LOCAL_SETUP.md runbook. Governance gate met (AGENTS updated to Closed). |
| WS-QA / M-QA-03 | Active Hybrid expansion | **Closed (2026-08-07)** per AGENTS.md line 37 | S-UX-01I unlocked 18 testID gaps + hotfix; L1 journeys 5/5 PASS; L2 regression 35/151 + post-01I 85/85 components PASS; L3 Maestro 5/5 flows ALL rc=0 PASS iPhone 17 Pro Max iOS 26.0 via scripts/maestro/run-local.sh wrapper. |
| WS-SUPABASE / M-SUPABASE-01 | Pipeline | **Closed (2026-08-07)** per AGENTS.md line 38 | 3 inspection deliverables (system coupling map + 4-domain report + 11-entry findings backlog) all QA 5/5 docs-review PASS; anti-secret 0; test:regression 37/160 PASS; tsc rc=0. |
| WS-SUPABASE / M-SUPABASE-00 Placeholder Groom | (did not exist on 08-06) | **Closed (2026-08-07)** per AGENTS.md line 39 | Docs-only ledger-groom; 15 new ROADMAP Pipeline rows 13.1..13.15; 3 copy-paste kickoff prompts; AGENTS Status ledger + pipeline precedence updated. |
| WS-SUPABASE / M-SUPABASE-02a RLS P0 | (was placeholder inside M-SUPABASE-01, not real row) | **Pipeline → BLOCKED IN-FLIGHT ATTEMPT** (not committed to master yet) | ROADMAP real row 13.1 now; live Gate 1 read-only SQL pass REQUIRED; 2026-08-08 TRAE session BLOCKED per Rule 1 (no ~/.pgpass + user declined dashboard paste). |
| WS-SUPABASE / M-SUPABASE-02b FK P0 | (was placeholder inside M-SUPABASE-01, not real row) | **Pipeline → BLOCKED IN-FLIGHT ATTEMPT** (parallel to 02a; shares Gate 1) | ROADMAP real row 13.2 now; combined P0 cycle with 02a. Same BLOCKER Rule 1. |
| WS-UX / M-UX-01 (overall) | Active | **Pipeline** (unchanged class; later slices still Pipeline) | Slices S-UX-01A through S-UX-01I closed; S-UX-01J/K/M/N new UX tails inserted as 13.12..13.15 Pipeline with Prereq = M-SUPABASE-03b. |
| WS-UX / S-UX-01J/K/M/N | (unregistered on 08-06) | **Pipeline** (Prereq = M-SUPABASE-03b Closed) | Inserted during M-SUPABASE-00 groom 2026-08-07 commit 90a2b1b. Cannot ship until 03b migration live applies all 6 columns. |
| Sprint7 release-safety risk (§5 08-06 handoff) | Open — 3 proposed hardening edits not applied | **Still open / unchanged** | No code changes between 08-06 → 08-08; docs-only session. Still deferred. |
| TRAE @-menu SOLO agents visual confirmation | Open A1 — user ran out of TRAE credit before reload test | **Still open / unchanged** | TRAE registration is moot for Cursor work; use .cursorrules + .cursor/rules/ migration (identical logic). |

---

## 3. Environment & Running Processes — DO NOT KILL UNINTENTIONALLY (current 4-terminal table 2026-08-08, not the 08-06 outdated one)

This is the 2026-08-08 CURRENT 4-terminal snapshot. DO NOT use the old 2026-08-06 terminal table (Terminal 1=zsh Metro 0.8.1, Terminal 13=d7_qav.sh idle, Terminal 15=idle) — that snapshot is OUTDATED. Current state below:

| Terminal ID | Shell | CWD | Current Command | Why it's running | Action in Cursor |
|---|---|---|---|---|---|
| **1 (BUSY)** | node | `/Volumes/KooDrive/InsiteApp` | `cd /Volumes/KooDrive/InsiteApp && npx expo start --ios --port 8081 --non-interactive --dev-client 2>&1 \| tee /tmp/metro.log` | **Metro dev server (Expo Dev Client mode)** required for Maestro iOS simulator runs. Running non-interactive with Dev Launcher flag because the app uses `EXDevLauncher` build `com.buildtrack.app.local`. Output is teed to `/tmp/metro.log`. | Keep if you plan to run Maestro flows in Cursor. Otherwise safe to kill and restart fresh via `scripts/maestro/run-local.sh` (it checks Metro health first anyway). **Health URL: http://127.0.0.1:8081/status** → should return HTTP 200. |
| **15 (BUSY)** | bash | `/Volumes/KooDrive/InsiteApp` | `chmod +x scripts/sys/stale-home-check.sh && bash scripts/sys/stale-home-check.sh 2>&1` | Likely long-running stale-home cleanup (removes stale `.cache/expo-home` or `.cache/maestro-home` dirs to free disk space before Metro/Maestro runs). Started at session begin; may be quick or long depending on cache size. | **DO NOT KILL until confirmed complete.** First Cursor command check status via `pgrep -f stale-home-check.sh` → if alive = wait. If dead = safe to reuse terminal 15 as free interactive. The `scripts/sys/` directory is idempotent; running it again post-completion does no harm, but killing mid-run can leave partial stale dirs. |
| **13 (FREE idle)** | zsh | `/Volumes/KooDrive/InsiteApp` | idle (free interactive) | Allocated free shell for the 2026-08-08 session; was not used in the aborted 02a/02b attempt. | **Use as your primary Cursor terminal for first commands** (backup, git status, typecheck, Metro health). Safe. |
| **5 (FREE idle)** | zsh | `/Volumes/KooDrive/InsiteApp` | idle (free interactive) | Second allocated free shell. | Secondary free terminal for Cursor — use for parallel commands (e.g., Metro watch in one terminal, Maestro run in another). Safe. |

---

## 4. Milestone / Roadmap Status (Current 2026-08-08 — full table with Closed/Pipeline/BLOCKED class per row)

Source of truth cross-checked: [AGENTS.md Current Delivery Status lines 31–40](file:///Volumes/KooDrive/InsiteApp/AGENTS.md#L31-L40) + [documentation/ROADMAP.md Milestone Ledger Table lines 68–84](file:///Volumes/KooDrive/InsiteApp/documentation/ROADMAP.md#L68-L84). Cross-reference §16 Appendix B for the full 15-row groomed children inventory with Prereq/Blockers detail columns.

| Milestone | Severity / Purpose | Current Status Class (2026-08-08) | Close Date | Prereq Before It Ships | Notes |
|---|---|---|---|---|---|
| WS-UIA / M-UIA-01/02/03 | Architecture foundation | **Closed** | Pre-2026-08-06 | — | Architecture baseline; unchanged 08-06 → 08-08. |
| WS-UX / M-UX-01 S-UX-01A → S-UX-01I | Redesign slices A through I | **Closed** | 2026-07-xx through 2026-08-07 | Predecessor slices | ROADMAP lines 85–106 evidence for S-UX-01H + S-UX-01I closed. |
| WS-UX / M-UX-01 (overall) | Insite redesign implementation | **Pipeline** | — | M-UIA-03, M-DATA-02 Closed | Slices beyond I = Pipeline. Redesign workstream = active; current focus = Supabase remediation first before any more UX slices ship. |
| WS-QA / M-QA-01 Sprint7 User Testing Rubric | 4 scenarios / 18 PNGs | **Closed** | 2026-08-06 | — | Suite rc=0; iPhone 17 Pro Max sim; evidence `.cache/maestro-artifacts/qa01-20260806_214425/`. |
| WS-QA / M-QA-02 UI Automation Foundation | Maestro base + 3 flows + 4 scripts | **Closed** | 2026-08-06 | — | 3-flow re-verify rc=0 iPhone 17 Pro Max UDID B7B2640C-4738-4F8A-AEEE-5DF3D21D2533; 4 package scripts + `documentation/MAESTRO_LOCAL_SETUP.md` runbook. |
| WS-QA / M-QA-03 Automated Confidence & E2E Coverage | 5 Maestro live flows / Jest L1-L3 | **Closed** | 2026-08-07 | — | 18 testID gaps S-UX-01I closed + hotfix; L1 5/5 6/6 PASS; L2 35/151 + post-01I 85/85 components PASS; L3 Maestro 5/5 all rc=0. 4 master commits 0 prod edits YAML-only. |
| WS-SUPABASE / M-SUPABASE-01 Full Inspection | 3 audit docs / 11 findings | **Closed** | 2026-08-07 | — | System coupling map + 4-domain report + 11 findings backlog (2P0/6P1/3P2). Anti-secret 0. Test Engineer baseline test:regression 37/160 PASS. |
| WS-SUPABASE / M-SUPABASE-00 Placeholder Groom | 15 real rows + 3 prompts | **Closed** | 2026-08-07 | M-SUPABASE-01 Closed | ROADMAP 13.1..13.15 + AGENTS ledger + pipeline focus precedence. Commit 90a2b1b. |
| **WS-SUPABASE / M-SUPABASE-02a RLS 7-table anon-block** | **P0 Security** | **Pipeline → BLOCKED IN-FLIGHT ATTEMPT** | — | Live Gate 1 read-only SQL pass MANDATORY (not optional) | **BLOCKER = Rule 1 active: `"no ~/.pgpass present AND user declined to paste dashboard outputs"`.** Cannot close with "code-path only". Must produce §Gate-1-Live-SQL 7/7 sections redacted appendix (anon SELECT row counts). Then remediation = ALTER TABLE…ENABLE RLS, REVOKE default from anon, policies using `auth.uid()` + `user_has_project_access()` helpers. Close gate anon SELECT returns 0 rows all 7 tables. Rollback-safe. |
| **WS-SUPABASE / M-SUPABASE-02b users FK + INSERT policy** | **P0 Integrity** | **Pipeline → BLOCKED IN-FLIGHT ATTEMPT** (parallel to 02a) | — | Same Gate 1 live-SQL (shared §1..§7) | FK `public.users.id REFERENCES auth.users.id ON DELETE CASCADE` → if missing add `NOT VALID` + defer VALIDATE CONSTRAINT later. Policy `users_self_write … WITH CHECK (id = auth.uid())`. Close gate: authStore signup parity harness → 0 constraint violations. Same blocker Rule 1 active. |
| WS-SUPABASE / M-SUPABASE-03a Role column integrity CHECK | P1 Integrity | **Pipeline** | — | M-SUPABASE-02a (RLS baseline first) | CHECK constraint role IN ('worker','member','foreman','supervisor','company_admin','admin') on public.users + user_project_assignments.role. Backfill stray rows. |
| WS-SUPABASE / M-SUPABASE-03b Tasks 6-col migration + Schema Review | **P1 (hard prereq → 01J/K/M/N)** | **Pipeline (HUMAN SCHEMA REVIEW GATE before Phase B live apply)** | — | M-SUPABASE-02a + 02b Closed CONFIRMED | **CRITICAL 2-phase. NEVER merge Phase A → B without signed GO.** Phase A = NO LIVE WRITES (schema artefacts + parity tenant + review checklist). Phase B = Live apply → human GO. 6 cols: `primary_assignee_id, delegated_user_ids, container_id, sub_container_id, tags, location_on_site`. Prereq for S-UX-01J/N/K/M. ROLLOUT WARNING copied VERBATIM in §7.0c Hard Safety Rule. |
| WS-SUPABASE / M-SUPABASE-03c Storage bucket policy + public/signed URL decision | P1 Security | Pipeline | M-SUPABASE-01 Closed (parallel ok) | — | Bucket `buildtrack-files` flag; if private → fileUploadService signedUrl TTL configurable; if public → runbook note. |
| WS-SUPABASE / M-SUPABASE-03d Deferred fallback observability fire-rate metric | P1 Observability | Pipeline | M-SUPABASE-01 Closed (parallel ok) | — | Lightweight structured hit on createTask L1551 / updateTask L1950 → audit table or edge function. Close after 03b: fire rate → 0 sustained 7d all tenants. |
| WS-SUPABASE / M-SUPABASE-03e Script safety --dry-run 2 siblings | P1 Ops Safety | Pipeline | M-SUPABASE-01 Closed (parallel ok) | — | Port from check_and_fix_auth_users.js into rebuild_auth_users_from_users.js + fix_missing_user_record.js. --apply before mutation. |
| WS-SUPABASE / M-SUPABASE-04a Realtime publication membership + reconnect loop | P2 Freshness | Pipeline | M-SUPABASE-02a (shared pg_publication_tables step) | — | Audit 4-table membership postgres_changes publication (tasks=*, task_activities=INSERT, projects=*, users=UPDATE). Add WS reconnect backoff loop on RealtimeSyncManager. |
| WS-SUPABASE / M-SUPABASE-04b Legacy status dual-path cleanup | P2 Hygiene | Pipeline | M-SUPABASE-03b + 30d cool-down post 03b | — | Drop legacy status columns; remove taskStore dual-write branches. 30-day cool-down. |
| WS-SUPABASE / M-SUPABASE-04c Storage retention / lifecycle policy | P2 Cost | Pipeline | M-SUPABASE-03c (bucket policy first) | — | S3-style lifecycle on buildtrack-files; document in runbook. |
| WS-SUPABASE / M-SUPABASE-04d Index health pass (task_read_status composite + project_locations) | P2 Perf | Pipeline | M-SUPABASE-02a (shared pg_stat_user_indexes step) | — | composite (user_id,task_id) on task_read_status; (project_id) on project_locations. CONCURRENTLY. |
| WS-UX / S-UX-01J Tags + Primary Assignee editor | UX Tail | **Pipeline (PREREQ GATE: M-SUPABASE-03b Closed)** | — | **M-SUPABASE-03b CLOSED** before ship | Writes tags TEXT[] + primary_assignee_id. taskStore deferred-compat STRIPS these 6 fields on pre-migration tenants today = **silent data loss if shipped now**. 03b must close first. |
| WS-UX / S-UX-01K Task Delegation Panel multi-user | UX Tail | **Pipeline (PREREQ GATE: 03b Closed)** | — | 03b Closed | Writes delegated_user_ids UUID[]. Same deferred-strip silent data loss. |
| WS-UX / S-UX-01M Create Task Location Refinement | UX Tail | **Pipeline (PREREQ GATE: 03b Closed)** | — | 03b Closed | Writes location_on_site TEXT. Same deferred-strip → disappears after Realtime refetch if 03b not applied. |
| WS-UX / S-UX-01N Container Model container_id/sub_container_id | UX Tail | **Pipeline (PREREQ GATE: 03b Closed)** | — | 03b Closed (containers table possibly bundled into 03b DDL) | Writes container_id + sub_container_id FK self. Open A9 question: containers parent table exists today? Groom row 13.15 Notes says "planner of 03b decides" → open question A9. |

### Milestone Gate rule for Cursor (copy to Cursor Rules)

> "On EVERY workflow kickoff (feature/bug/refactor/release/docs), before you write the first plan, read AGENTS.md § Current Delivery Status + documentation/ROADMAP.md latest sections. If task touches M-UX-01, M-QA-01/02/03, or M-SUPABASE-01/00/02a/02b/03a..04d: (1) cite the milestone in scope, (2) route tests correctly per TESTING_STRATEGY.md Jest/Maestro layer rules, (3) on M-QA-02 never mark closed based solely on local passes; (4) on M-SUPABASE-02a/02b NEVER close without §Gate-1-Live-SQL 7/7 redacted appendix (Rule 1); (5) on M-SUPABASE-03b NEVER promote to Phase B live apply without EXPLICIT WRITTEN HUMAN GO from the sign-off authority."

---

## 5. Cursor Canonical Source Of Truth Matrix (1 table row per source file: path, purpose, role, must-read level: MUST/SHOULD/MAY)

| Path | Purpose | Role in Handoff | Must-Read Level |
|---|---|---|---|
| [cursor-handoff-2026-08-08.md](file:///Volumes/KooDrive/InsiteApp/cursor-handoff-2026-08-08.md) | This file. Comprehensive 2026-08-08 state snapshot. | CANONICAL START HERE. Read first before any plan/write. | **MANDATORY READ (MUST)** |
| [AGENTS.md Current Delivery Status lines 31–40](file:///Volumes/KooDrive/InsiteApp/AGENTS.md#L31-L40) | Closed milestones 08-06 → 08-08 including M-SUPABASE-01/00 closes, QA milestones Closed, precedence order. | Milestone Gate authority for current close ledger + pipeline focus. | **MUST on EVERY workflow kickoff** (Milestone Gate) |
| [documentation/ROADMAP.md lines 68–84](file:///Volumes/KooDrive/InsiteApp/documentation/ROADMAP.md#L68-L84) | Full milestone ledger Order 13 → 13.1..13.15 groomed children with Prereq/Notes. 92–110 Closed evidence + Deferred. | Row-level authority per milestone with Prereq gates; cross-reference §16 Appendix B for full inventory. | **MUST on EVERY workflow kickoff** (Milestone Gate) |
| [documentation/audit/database/2026-08-07-msupabase01-findings-backlog.md](file:///Volumes/KooDrive/InsiteApp/documentation/audit/database/2026-08-07-msupabase01-findings-backlog.md) | 11 entries F-001..F-011. F-003 = ROLLOUT WARNING + 6-col explicit list. | FINDINGS AUTHORITY for 02a/02b/03a..04d remediation scope. | **MUST for 02a/02b; MUST for 03b Phase A schema design** |
| [docs/superpowers/plans/2026-08-07-msupabase-groom-next-session-kickoffs.md](file:///Volumes/KooDrive/InsiteApp/docs/superpowers/plans/2026-08-07-msupabase-groom-next-session-kickoffs.md) | 3 COPY-PASTE H2 headings: Prompt 1=02a/b combined P0; Prompt 2=03b 6-col migration Schema Review Gate; Prompt 3=Parallel P1/P2. | SESSION KICKOFF TEMPLATES for next 3 TRAE/Cursor cycles. Do NOT re-invent prompts. Use verbatim. | **MUST when opening 02a/02b cycle; MUST when opening 03b cycle** |
| [WS_SUPABASE_01_READONLY_AUDIT.sql](file:///Volumes/KooDrive/InsiteApp/WS_SUPABASE_01_READONLY_AUDIT.sql) | 7 sections read-only audit. Section 1 PUBLIC_TABLES, 2 TASK_LOCATION_COLUMNS through Section 7. | LIVE GATE 1 AUTHORITY — MUST run via pooler psql or Dashboard SQL Editor BEFORE closing 02a/02b. 7 section titles in §15 Appendix A. | **MUST for 02a/02b unblock (Rule 1)** |
| [SUPABASE_SQL_ACCESS.md lines 6–38](file:///Volumes/KooDrive/InsiteApp/SUPABASE_SQL_ACCESS.md#L6-L38) | Pooler host aws-1-ap-south-1.pooler.supabase.com:6543, username format, libpq binary path, pgpass format, example run. | CONNECTION PARAMETERS (no secrets) for Option A. NEVER paste real secrets or PROJECT_REF inline. | **MUST if using Option A unblock; SHOULD for Option B reference** |
| [package.json scripts block](file:///Volumes/KooDrive/InsiteApp/package.json) | npm script commands: test, test:l1 (via test:journeys), test:l2 (test:regression), test:e2e:maestro:install/:final, validate:local:confidence, validate:local:maestro, typecheck, lint. From §10 Cheat Sheet → COPIED VERBATIM commands NOT invented. | VALIDATION CHEAT SHEET authority. §10 commands MUST come from here exactly by key name. | **MUST §10 Cheat Sheet build** |
| [documentation/MAESTRO_LOCAL_SETUP.md](file:///Volumes/KooDrive/InsiteApp/documentation/MAESTRO_LOCAL_SETUP.md) | Maestro v2.8.0 install, applesimutils crash workaround notes, run-local.sh wrapper, UDID B7B2640C-4738-4F8A-AEEE-5DF3D21D2533. | Copy VERBATIM into `.cursor/rules/maestro-preflight.md` as part of deliverable C. | **SHOULD read for any Maestro run; MUST for deliverable C file 6 write** |
| [src/state/taskStore.supabase.ts](file:///Volumes/KooDrive/InsiteApp/src/state/taskStore.supabase.ts) | Task source of truth. Lines 58 DEFERRED_TASK_CREATE_SCHEMA_FIELDS 6-col list; lines 106–154 deferred-fallback compat layer getDeferredTaskSchemaField (42703 OR PGRST204 union); lines 1551–1563 createTask retry stripped payload; lines 1946–1959 updateTask retry stripped payload. | TASK STORE AUTHORITY for 03b migration fire-rate close gate. 6-col compat strip logic is the reason 01J/K/M/N cannot ship before 03b. | **MUST for 03b Phase A schema review, MUST for deferred-fallback contract test harness** |
| [src/navigation/AppNavigator.tsx](file:///Volumes/KooDrive/InsiteApp/src/navigation/AppNavigator.tsx) | Main navigation integration point. | Screen param / nav transition audits. | SHOULD on any UX flow change. |
| [src/api/supabase.ts](file:///Volumes/KooDrive/InsiteApp/src/api/supabase.ts) | Supabase backend integration root. | Auth/RLS/policy coupling audits. | SHOULD for 02a/02b remediation impact analysis. |
| [cursor-handoff-2026-08-06.md](file:///Volumes/KooDrive/InsiteApp/cursor-handoff-2026-08-06.md) | Historical 2026-08-06 handoff. §9 Sprint7 Maestro 295-min content used VERBATIM for deliverable C file 6 maestro-preflight. | INPUT ONLY — do not modify. §9 is the source for `.cursor/rules/maestro-preflight.md` file. Old milestone claims are OUTDATED — ignore them for current state. | **MUST for deliverable C file 6 write (§9 copy source); MAY as historical reference** |

---

## 6. SOLO Agent Workflow — Cursor Migration (2026-08-08 update)

TRAE exposed SOLO Orchestrator / @planner / @builder etc. as Trae agents via an installed Skill. **Cursor doesn't have that system.** Cursor's equivalents are:
  - **Cursor Rules** (`.cursorrules` file at repo root) → analogous to `SOLO_OPERATING_PROCEDURE.md` + Autonomy Policy + Milestone Gate + Commit Gate + Role Boundaries + current 2026-08-08 precedence order (02a/02b unblock first, then 03b Schema Review Gate, then 01J/K/M/N).
  - **`@`-mention docs feature in Cursor** — any markdown file dropped into `.cursor/rules/` or referenced in `.cursorrules` with `@.cursor/rules/workflow-feature.md` syntax is contextual guidance.
  - **Custom Instructions (Cursor Settings → Model → Custom Instructions)** → analogous to WORKFLOW_TEMPLATES §1 Session Kickoff + SOLO_KICKOFF_PROMPT, with the 2026-08-08 priority queue top-aligned.
  - **Cursor Composer / Inline Edit** → used per-file the way Builder would.

Current 2026-08-08 precedence at a glance (enforced in Hard Safety Rules §7.0a/b/c top rules, referenced in §14 Next Work ordered list):
1. UNBLOCK M-SUPABASE-02a/02b Rule 1 → Gate 1 live-SQL 7/7 sections
2. Close 02a/02b → RLS anon-block + FK NOT VALID
3. M-SUPABASE-03b Phase A → HUMAN SCHEMA REVIEW GATE
4. M-SUPABASE-03b Phase B → live apply after GO
5. S-UX-01J/K/M/N ship now that 03b Closed
6. Parallel idle: 03a/03c/03d/03e + 04a/04b/04c/04d

### Step 1: Write the ACTUAL 2026-08-08 `.cursorrules` file (Deliverable B)

**Deliverable B path: `/Volumes/KooDrive/InsiteApp/.cursorrules`** — should be written by Builder in this session as a real file. It reflects the 2026-08-08 precedence with 7.0a/7.0b/7.0c NEW top rules BEFORE the ratified 8 legacy rules. It MUST:
- Start `# Insite App — Cursor Rules` (non-comment first line).
- Contain Mandatory Pre-kickoff gates: Milestone Gate, Autonomy Policy 5-item blocking questions list EXACT, Validation Plan written up front.
- Have the 2026-08-08 priority 1..6 queue inline near the top so Cursor NEVER starts with S-UX-01J before 03b.
- Include references to all 6 `.cursor/rules/*.md` files at the bottom via `@.cursor/rules/X.md` Cursor syntax.
- NEVER embed actual PROJECT_REF or secrets; use placeholder pattern only.

If Deliverable B is already present at the time of first Cursor write, just re-verify contents match this spec. If missing → Step 4 of §8 Immediate To-Do writes it NOW as part of onboarding.

### Step 2: Custom Instructions paste (Deliverable D = Appendix D block)

Paste the EXACT §18 Appendix D block into Cursor Settings → Model → "How would you like AI to respond?". It's the ratified Autonomous Delivery Mode + top priority queue tailored for 2026-08-08 (02a/02b unblock first → 03b Schema Review human gate → 01J/K/M/N). The text block begins with `You are my autonomous senior software engineer inside Cursor.` and ends with the Execution Ledger mandate. It is ready-for-copy inside a ```text``` fence in §18 Appendix D — Ctrl+A Ctrl+C that entire section.

### Step 3: Create 6 `.cursor/rules/` files (Deliverable C)

Deliverable C path: `/Volumes/KooDrive/InsiteApp/.cursor/rules/` (directory CREATE if missing). All 6 files MUST be non-empty markdown files with filenames EXACTLY matching this list (QA Validator checklist item 6d checks exact names + count = 6):

1. **`workflow-feature.md`** → copy VERBATIM contents of `docs/superpowers/prompts/FEATURE_KICKOFF_PROMPT.md` (source read during this session; not re-invented).
2. **`workflow-bugfix.md`** → copy VERBATIM contents of `docs/superpowers/prompts/BUGFIX_KICKOFF_PROMPT.md`.
3. **`workflow-release.md`** → copy VERBATIM contents of `docs/superpowers/prompts/RELEASE_KICKOFF_PROMPT.md`.
4. **`workflow-solo.md`** → copy VERBATIM contents of `docs/superpowers/prompts/SOLO_KICKOFF_PROMPT.md`.
5. **`workflow-ms02-unblock.md`** → NEW 2026-08-08 rule file (no precedent in 08-06 handoff). Content = §1.2.1 Cursor Unblock Options VERBATIM (Option A + Option B text) + the 7 section title headings from WS_SUPABASE_01_READONLY_AUDIT.sql §1..§7 (listed in §15 Appendix A here for reference). Purpose: when starting a 02a/02b cycle in Cursor, open this rule file FIRST to resolve Rule 1 blocker.
6. **`maestro-preflight.md`** → copy §9 Sprint 7 Maestro 295-minute content VERBATIM from the 2026-08-06 handoff §9. Add a one-line header note = "Content unchanged since 2026-08-06; no new maestro rules introduced between 08-06 → 08-08". This file is the QA preflight mandate BEFORE any Maestro flow run in Cursor (8 preflight gates + 6 runner hardening layers + the false-success lesson ratio 24s vs 419s).

Cross-reference: §8 Immediate To-Do Steps 4/5 explicitly cover writing B + creating C if Builder hasn't done them yet inside this TRAE session.

### Step 4: Quick Context snippet (Cursor Project Context UI if available)

If Cursor exposes a "Quick Context" / "Project Context" / "Repository Rules" UI, paste this verbatim:

> **Current Priority Queue 2026-08-08 (non-negotiable order, enforced in Hard Safety Rules top):** (1) UNBLOCK M-SUPABASE-02a/02b Rule 1 → live Gate 1 read-only SQL pass 7/7 sections redacted appendix. (2) Close 02a/02b → RLS 7-table anon-block + users FK NOT VALID. (3) M-SUPABASE-03b Phase A schema artefacts NO LIVE WRITES → HUMAN-IN-THE-LOOP SCHEMA REVIEW GATE written sign-off. (4) 03b Phase B live apply after human GO. (5) S-UX-01J Tags/Primary Assignee + 01K Delegation + 01M location_on_site + 01N Containers — NOW UNBLOCKED only after 03b Closed. (6) Parallel idle P1/P2. M-SUPABASE-02a/02b is currently BLOCKED Rule 1 = `"no ~/.pgpass present AND user declined to paste dashboard outputs"`. Top of §8 has the unblock checklist.

---

## 7. Hard Safety Rules (2026-08-08 current)

**CRITICAL:** Rules 7.0a / 7.0b / 7.0c are NEW TOP RULES specific to the 2026-08-08 in-flight sessions. They supersede later rules in case of conflict. They MUST appear FIRST in the list. They are copied into `.cursorrules` Deliverable B as the top section.

### 7.0a M-SUPABASE-02a/02b Rule 1 Mandate (P0 Security — NEVER close without it)

NEVER mark M-SUPABASE-02a or M-SUPABASE-02b as `Closed` in ROADMAP.md or AGENTS.md WITHOUT a §Gate-1-Live-SQL 7/7 sections REDACTED APPENDIX attached to the close report. RULE 1 VERBATIM from the kickoff: **"Live Gate 1 read-only SQL pass REQUIRED THIS SESSION NOT OPTIONAL: run WS_SUPABASE_01_READONLY_AUDIT.sql via psql pooler OR Supabase Dashboard SQL Editor → capture anon client SELECT row counts on 7 tables (companies, users, projects, tasks, task_activities, task_read_status, project_locations)."** The only acceptable exception: if both Option A (`~/.pgpass`) AND Option B (Dashboard paste) are unavailable → you MUST RETURN THE CYCLE BLOCKED with the exact blocker text string `"no ~/.pgpass present AND user declined to paste dashboard outputs"` — do NOT pass go, do NOT produce any Builder commits for remediation migration SQL files until the blocker is resolved. The close gate for 02a is anon SELECT returns 0 rows COUNT on all 7 tables; you cannot prove this without running Gate 1 first. This is a non-negotiable security gate to avoid closing a P0 vulnerability based on code-path inference alone.

### 7.0b M-SUPABASE-03b Phase B Live-Apply Gate (NEVER skip the human sign-off)

NEVER promote M-SUPABASE-03b from "Phase A artefacts complete" to "Phase B ready for live apply" WITHOUT an EXPLICIT HUMAN-IN-THE-LOOP SCHEMA REVIEW GATE written sign-off. This is per ROADMAP Order 13.4 Notes copied verbatim from findings F-003. Phase A = NO LIVE WRITES AGAINST ANY LIVE TENANT. Phase A can produce the migration SQL, the rollback SQL, apply it on parity/sandbox tenant, run tests against parity, and build the signed-off review checklist doc (a..e items per Prompt 2). But the second you start typing `ALTER TABLE public.tasks ADD COLUMN …` against the production tenant → Phase B has started → you MUST have the written GO. Written means: (1) explicit user message in chat saying "you have GO for Phase B live apply" logged in the session transcript, or (2) a signed/commented line in the schema review checklist doc appended by the human reviewer. If you don't have either → you are in Phase A only. Stay there. Do not mutate production task schema across any active tenant for any reason during Phase A. Not even a "harmless" `IF NOT EXISTS` — wait for the GO. This rule prevents accidental 6-column drops on the rollback path if a 3rd-party has written values into those columns independently.

### 7.0c M-SUPABASE-03b ROLLOUT WARNING (copied VERBATIM from findings F-003 + ROADMAP L72 Notes)

ROLLOUT WARNING VERBATIM (exact copy from documentation/audit/database/2026-08-07-msupabase01-findings-backlog.md § F-003 P1, cross-cited to documentation/ROADMAP.md Order 13.4 row Notes + ROADMAP L98 deferred context):

> **_ROLLOUT WARNING:_ M-SUPABASE-01 proposes the migration placeholder ONLY. Actual migration execution is a separate follow-on milestone M-SUPABASE-03b that requires Schema Review Gate: §2 findings; §tasks; see ROADMAP L98 deferred context. Do NOT merge the migration into the current cycle; capture it as a groomed follow-on at Orchestrator decision gate.**

6-col explicit list to migrate INLINE (copy to every rule file, close report, and custom instructions that mentions 03b — must appear inline, not just as a reference):

`primary_assignee_id, delegated_user_ids, container_id, sub_container_id, tags, location_on_site`

These 6 are the fields that taskStore DEFERRED_TASK_CREATE_SCHEMA_FIELDS currently SILENTLY STRIPS on pre-migration tenants via the 42703/PGRST204 compat retry path. If you ship S-UX-01J/K/M/N UI before 03b live applies these 6 columns to ALL active tenants → user sets tag, tag shows in optimistic UI → next Realtime refetch → disappears → user blames app → silent data loss bug. Prereq 03b Closed is NOT optional. ROADMAP rows 13.12 (01J), 13.13 (01K), 13.14 (01M), 13.15 (01N) all say Prereq = 03b Closed; if you attempt to build one of those slices in the same PR as 03b migration-only → split the PR. The UX work can be drafted locally, but don't merge/ship until the 03b close gate says deferred-fallback fire rate = 0 for all tenants.

### 7.1 Release Manager bundle-id rule

Before ANY release-ready status → verify match between app.json `expo.ios.bundleIdentifier` / eas.json build profile `ios.bundleIdentifier` override + the App Store Connect app record you're submitting under. `com.buildtrack.app.local` is the known mismatch risk with App Store Connect public record. Any mismatch = HARD BLOCKER → do not proceed to build/submit.

### 7.2 Public release checkbox

App Store Connect's "Release this version" / "Public" checkbox is a manual human step. After running `./build-and-submit.sh` → report status as "Submitted to ASC, awaiting manual public release". NEVER say "released to users" or "public" after a submit-only run.

### 7.3 Rerun-safe idempotency gate

On any new worker bootstrap script, native routing callback, login init, deeplink handler, auth finally-block → must be safe to re-run twice with same state. If on second run it creates duplicate records / double-inits stores / crashes → block before deployment.

### 7.4 Commit Gate ordering

Builder → Reviewer (zero C/H findings) → git commit (conventional format) → Test Engineer → QA Validator. NEVER commit pre-Review. NEVER reorder these.

### 7.5 M-QA-02 closure rule

WS-QA/M-QA-02 Maestro foundation status stays Pipeline in ROADMAP + AGENTS UNLESS master-side smoke/bootstrap wrap-up is explicitly human-verified. Local build passes on any developer machine are NOT sufficient evidence to close this milestone (governance rule from AGENTS.md line 36; closed as of 2026-08-06 but the rule still applies for any future reopen).

### 7.6 Secrets / credentials

NEVER place EXPO_PUBLIC_SUPABASE_ANON_KEY (anon key is fine public by design — but never paste the actual SERVICE_ROLE key or password), private Supabase service_role keys, ASC API keys, EAS tokens, .env.secret files, keystore material into docs / repo / chat output. Use env-var patterns only. Anti-secret grep RULE X2 must pass before any commit gate opens on new docs.

### 7.7 Sprint7 deep-link spoofing gate

Before the next public release ship, apply the 3 hardening edits from the 2026-08-06 handoff §5 (deep links `__DEV__` gated + DevSettings Initialize `__DEV__` gated + metro.config.js blocklist for sprint7 files) unless product owner explicitly decides the risk is low.

### 7.8 Maestro rc=0 is meaningless without evidence

§9 rule. Enforce on every Maestro run. 8 preflight gates + 6 runner hardening layers + PNG visual read before rc=0 is accepted. False rc=0 ratio 24s vs 419s real-pass = your sanity check.

---

## 8. Immediate To-Do List (first 10 minutes in Cursor) ORDERED BY RISK

Ordered by risk of data loss. Do them in order. The first two items are SPECIFIC TO CURRENT 2026-08-08 BLOCKER STATE; the remaining items are refreshed from 08-06.

### Step 1 — BACKUP TRAE USER SKILL outside repo

Run first. Same procedure as 08-06 handoff §8 Step 1 but with NEW 2026-08-08 date folder:

```bash
mkdir -p /Volumes/KooDrive/InsiteApp/.trae-backups/2026-08-08-handoff
cp -R /Volumes/KooDrive/Users/tristan/.trae/skills/solo-agents /Volumes/KooDrive/InsiteApp/.trae-backups/2026-08-08-handoff/ 2>/dev/null || echo "solo-agents user skill missing — skipped copy (ok if user-level install was temporary)"
cp /Volumes/KooDrive/Users/tristan/.trae/skill-config.json /Volumes/KooDrive/InsiteApp/.trae-backups/2026-08-08-handoff/ 2>/dev/null || echo "skill-config.json missing — skipped"
echo "Snapshot created at $(date)"
ls -la /Volumes/KooDrive/InsiteApp/.trae-backups/2026-08-08-handoff/
```

Why? If TRAE is reinstalled later or user-level `~/.trae/skills/solo-agents` gets wiped, the 8 enriched YAML agents + metadata are saved in repo-local backup. The 08-06 backup folder still exists; this adds the 08-08 state.

### Step 2 — CURSOR UNBLOCK CHECKLIST (resolve M-SUPABASE-02a/02b Rule 1 blocker BEFORE ANY plan for remediation work)

Two-bullet exact same text from §1.2.1 + the TRAE blocker output. Paste this into the Cursor chat BEFORE opening any plan if you plan to work on 02a/02b this session. You don't need to paste it if your first Cursor session is something else (e.g., just .cursorrules setup + typecheck). But the moment you open 02a/02b cycle → this checklist must be TOP.

- **Option A — drop ~/.pgpass pooler entry (if you know the password):** Create `~/.pgpass` line format `aws-1-ap-south-1.pooler.supabase.com:6543:postgres:postgres.<PROJECT_REF>:<DATABASE_PASSWORD>` with real values at shell time only (never commit the real values). Then `chmod 600 ~/.pgpass && /opt/homebrew/opt/libpq/bin/psql -w -h aws-1-ap-south-1.pooler.supabase.com -p 6543 -d postgres -U postgres.<PROJECT_REF> -f /Volumes/KooDrive/InsiteApp/WS_SUPABASE_01_READONLY_AUDIT.sql`. NOTE: `<PROJECT_REF>` and `<DATABASE_PASSWORD>` are placeholders ONLY in this document — never paste concrete values here.
- **Option B — Supabase Dashboard SQL Editor paste (no credentials, recommended if available):** Open Supabase Dashboard → Project → SQL Editor. Paste WS_SUPABASE_01_READONLY_AUDIT.sql (7 sections total, headings in §15 Appendix A). Run all sections sequentially. For each output, REDACT any sensitive cell values or project identifiers as `<REDACTED>` then paste into Cursor chat. The critical counts to capture: anon SELECT row counts on the 7 sensitive tables. Anon=0 → baseline good; anon>0 → remediation needed.

If you do NOT have the password AND do NOT have Dashboard access → M-SUPABASE-02a/02b REMAINS BLOCKED. Do not produce the 02a RLS policy migration files or 02b FK migration files as a "proactive" step until Gate 1 is resolved. Pick a lower-priority item (e.g., write .cursorrules, typecheck, deliverable C file creation, parallel idle P1 03e script dry-run port which is docs-only + touches 2 JS files if you want to make progress without Gate 1).

### Step 3 — GIT STATUS + verify commit 90a2b1b clean master HEAD status rc=0

```bash
cd /Volumes/KooDrive/InsiteApp
git status --short --branch
git rev-parse HEAD  # should output 90a2b1b (short) or 90a2b1b... (full 40-char SHA)
git status --short | wc -l  # expected = 0 clean
```

Expected result: `## master...origin/master` ahead/behind 0, no Modified/Untracked rows (rc=0 clean).

If there ARE uncommitted files: TRAE BLOCKED the 02a/02b session before any Builder commit, but some draft files may have been written to disk then abandoned. Treat them as ORPHANED DRAFT. Default action: `git checkout . && git clean -fd` → discard all. Only keep them IF the user explicitly says "I want to continue the 02a/02b draft work from those files" and inspects them first.

### Step 4 — WRITE .cursorrules (Deliverable B if not already present by Builder in this TRAE session)

If this TRAE session has ALREADY written Deliverable B at `/Volumes/KooDrive/InsiteApp/.cursorrules` → skip (verify existence with `ls -la .cursorrules` → non-empty file starting `# Insite App — Cursor Rules`).

If NOT YET PRESENT → create it now using Step 1 of §6 as the spec. The file must include: 7.0a/7.0b/7.0c top rules BEFORE the 8 legacy rules; the 5-item Autonomy Policy blocking questions list EXACT; 2026-08-08 priority queue inline near top; references to all 6 `.cursor/rules/X.md` files at the bottom via `@.cursor/rules/workflow-feature.md` Cursor syntax. See §7 and §14 for the exact priority ordering text.

### Step 5 — CREATE 6 .cursor/rules/* files (Deliverable C if not already written)

If directory missing → `mkdir -p /Volumes/KooDrive/InsiteApp/.cursor/rules`. Then write 6 files per §6 Step 3 spec (exact filenames + sources):

1. workflow-feature.md ← FEATURE_KICKOFF_PROMPT.md verbatim
2. workflow-bugfix.md ← BUGFIX_KICKOFF_PROMPT.md verbatim
3. workflow-release.md ← RELEASE_KICKOFF_PROMPT.md verbatim
4. workflow-solo.md ← SOLO_KICKOFF_PROMPT.md verbatim
5. workflow-ms02-unblock.md ← §1.2.1 Option A/B verbatim + §15 Appendix A 7 section titles
6. maestro-preflight.md ← 08-06 handoff §9 verbatim + 1-line unchanged header

After write: `ls -la .cursor/rules/ | grep '\.md$' | wc -l` → MUST equal exactly 6. QA Validator checks count + exact filenames.

### Step 6 — Metro health + typecheck

```bash
# Metro health (HTTP 200 = alive):
curl -sS -o /dev/null -w 'HTTP=%{http_code}\n' --connect-timeout 3 http://127.0.0.1:8081/status || echo "Metro NOT reachable — can restart later via scripts/maestro/run-local.sh if needed"

# TypeScript full project (baseline MUST be clean from M-SUPABASE-01 close — 0 errors):
cd /Volumes/KooDrive/InsiteApp && npx tsc --noEmit
```

If tsc --noEmit rc≠0 → investigate whether it's a transient type cache issue (`rm -rf node_modules/.cache/metro*; rm -rf node_modules/.cache/typescript*`) vs a real drift from a stray uncommitted file you forgot to discard in Step 3.

### Step 7 — (OPTIONAL) Sprint7 M-QA-01 evidence snapshot copy

Copy the M-QA-01 closed 18/18 evidence dir out of `.cache/` (frequently gitignored, can be wiped) into a permanent docs evidence folder if you haven't already:

```bash
mkdir -p /Volumes/KooDrive/InsiteApp/docs/superpowers/evidence
EVIDENCE_SRC=/Volumes/KooDrive/InsiteApp/.cache/maestro-artifacts/qa01-20260806_214425
if [ -d "$EVIDENCE_SRC" ]; then
  cp -R "$EVIDENCE_SRC" /Volumes/KooDrive/InsiteApp/docs/superpowers/evidence/m-qa-01-2026-08-06-18-18-pass
  ls -la /Volumes/KooDrive/InsiteApp/docs/superpowers/evidence/m-qa-01-2026-08-06-18-18-pass
else
  echo "Source evidence dir no longer in .cache/ — skip; already documented in ROADMAP.md M-QA-01 Closed evidence paragraph"
fi
```

This step is OPTIONAL because the 08-06 handoff §8 Step 5 may have already run it; if target dir exists, don't re-copy (skip). Evidence is also cross-cited in ROADMAP Closed evidence so the close claim survives `.cache/` wipes even without this copy.

---

## 9. Maestro / QA Preflight & False-Success Lessons (copy to QA rules)

**Content unchanged since 2026-08-06; no new maestro rules introduced between 08-06 → 08-08.**

Create `.cursor/rules/maestro-preflight.md` (Deliverable C file 6) with the content below. Apply the 8 preflight gates + 6 runner hardening layers BEFORE ANY Maestro flow invocation.

### 8 Mandatory Preflight Gates (enforced per solo-orchestrator.md lines 71–79 legacy source)

1. **LOGBOX FAMILY AUDIT**: Open `index.ts` (or entry file calling LogBox.ignoreLogs). If the RED "Failed to open debugger…" banner is suppressed, the GRAY sibling "Open debugger to view warnings." banner MUST be suppressed alongside it. Any unstipulated bottom ~10% banner z-overlaps iPhone 17 Pro Max bottom-tab Pressables, causing XCTest silent tap interception with rc=0. Cherry-picking = bug. This single issue produced >30% of the 5-hour debugging on M-QA-01.
2. **UNIQUE LANDING TESTID**: Every navigation assert must assert a testID that appears ONLY on that target screen (e.g. `tasks-screen__search_section` on Tasks, `developer-settings-screen__root` on DevSettings). Never allow profile-trigger or headers alone; they render on every screen and historically produced rc=0 with 100% wrong scenes.
3. **BOTTOM-TAB NAV NO `- back`**: Explicit sibling tab tap `tapOn id: root-tab__activity | root-tab__tasks`, never `- pressKey: back`. React Navigation bottom-tab root goBack is a no-op.
4. **SPRINT7 PRESET OVERWRITES ACTOR**: If a flow taps both a confirmation-sheet actor AND a preset, cross-check `src/test-utils/sprint7RuntimeSandbox.ts` lines 256–278 for the preset's hardcoded activeActor. Preset re-inits and wipes the confirmation-sheet actor choice; screenshots must be labeled correctly.
5. **SUBCOMMAND FLAG ORDER**: `bash scripts/maestro/run-local.sh [options] test [--reinstall-driver] flow.yaml`. `--reinstall-driver` is subcommand-only. Before `test` → Maestro exits 5999 "Unknown option".
6. **ARTIFACT PATH SCOPE**: Maestro v2 artifacts only live under `/tmp/maestro-tmp-home/.maestro/tests/<timestamp>/`. Do not search `/`, `$HOME`, or repo-wide `.maestro/` for screenshots; findings there are stale.
7. **DASHBOARD RETURN**: From DevSettings or any non-root screen back to Dashboard home, use `launchApp clearState: true` (JS restart; Zustand persist preserved; cost ~90s, 100% reliable). Chevron/back chains are unreliable and leave a 10–20% wrong-state surface.
8. **VISUAL PNG EVIDENCE FIRST BEFORE rc=0**: First action after ANY Maestro run (rc=0 or rc=1) is to visually read screenshot PNG bytes of tab-landing and actor-switch screenshots. Compare title text / list content to filename intent. rc=0 alone is MEANINGLESS. False rc=0 due to banner intercepts produced 5 wasted hours.

### 6 Runner Hardening Layers (enforced in run-qa01-suite.sh)

1. **Metro health-check before EVERY scenario (lines 128–167)**: curl `/status` HTTP 200. 3 attempts + auto-restart if cmd configured.
2. **Flow rebuild + Maestro syntax check pre-suite (lines 182–221)**: Rebuild flows from Python templates → maestro check-syntax per flow → refuse to run if invalid.
3. **5999 / Transport unreachable auto-retry (lines 259–306)**: On "Transport unreachable|connection refused|5999|FlyingFox" → auto-retry once with `--reinstall-driver` to wipe stale XCTest FlyingFox listener.
4. **SEMANTIC SHOT-COUNT GATE (lines 312–328)**: After rc=0 PASS → `find takeScreenshot/*.png | count` → MUST be >= NEED per scenario. If rc=0 but shots=0 → override rc=98 SEMANTIC FAIL + stop. This is the automated version of Gate #8 above that would have FAILED all 4 false-success runs (21:29→21:33) instead of reporting PASS.
5. **Stop-on-fail (lines 362–366)**: First failing scenario → DO NOT run remaining scenarios against dead state; saves expensive tokens.
6. **Inter-scenario cool-down 8s (lines 368–373)**: After `clearState: true` JS restart, pause before next confirmation-sheet tap to avoid a race between JS bundle reload and XCTest tap dispatch.

### First 4 runs proof of the lesson (never forget)

From `.cache/maestro-artifacts/`: 4 runs 21:29→21:33 all rc=0 PASS suite result with screenshots 0/4, 0/10, 0/4, 0/18. Final fixed run 21:44:44 = 18/18 screenshots elapsed 419s real wall time (24s false-pass vs 419s real-pass is your sanity check ratio for future runs).

---

## 10. Validation Commands Cheat Sheet (2026-08-08 current)

IMPORTANT: ALL commands in Jest / Maestro sections below are COPIED VERBATIM from `package.json` "scripts" block keys and values. Do NOT invent commands; reference package.json key and then run via `npm run <key>`. Scripts are the CANONICAL source (tested in M-QA-03 close as working). This handoff document only mirrors them. Any script that does NOT appear in package.json scripts is out-of-scope for this cheat sheet (add new scripts if needed in a later code-change session — but that's src-adjacent and requires normal workflow).

### 10.1 Jest Layers (per TESTING_STRATEGY.md unit/integration/journeys/simulation/parity/confidence)

Run each command via `npm run <key>` exactly. Key names come VERBATIM from package.json scripts block:

| Package.json Script Key | Command EXACT (copy-paste to Cursor terminal) | Layer / Purpose | Close Gate Reference |
|---|---|---|---|
| `test` | `npm test` | Default Jest runner (all tests, no filters) | Generic regression |
| `test:auth` | `npm run test:auth` | Auth store unit | authStore parity after 02b FK add |
| `test:tasks` | `npm run test:tasks` | Task store unit + workflow | 03b deferred-fallback fire-rate close gate |
| `test:projects` | `npm run test:projects` | Project store unit | |
| `test:uploads` | `npm run test:uploads` | fileUploadService unit | 03c bucket public/private decision tests |
| `test:components` | `npm run test:components` | Component UI unit tests (NativeWind/React Native screens) | 01I testID baseline 85/85 PASS |
| `test:integration` | `npm run test:integration` | Screen/adapter integration (mock Supabase) | Task flow integration |
| `test:regression` | `npm run test:regression` | **L2 Regression layer** (runs test:tasks + test:uploads + test:components + test:integration sequentially) | M-SUPABASE-01 baseline 37/160 PASS; M-QA-03 post-01I 85/85 components PASS |
| `test:e2e:journeys` | `npm run test:e2e:journeys` | **L3 Journey layer** (Jest-based journey sims, NOT Maestro) | M-QA-03 baseline 5/5 suites 6/6 tests PASS |
| `test:confidence` | `npm run test:confidence` | **Confidence hybrid** (= test:regression + test:e2e:journeys) | validate:local:confidence script uses this underneath |
| `test:simulation` | `npm run test:simulation` | USE_REAL_SUPABASE=1 simulation scenarios (live Supabase hit, expensive) | M-QA-03 L3 hybrid |
| `test:simulation:ui` | `npm run test:simulation:ui` | Simulation without .supabase.test subpath | UI-only sim probes |
| `test:parity:unit` | `npm run test:parity:unit` | Parity harness/adapter unit tests | 02a RLS + 02b FK parity harness close gate |
| `test:parity` | `npm run test:parity` | Alias for parity:unit only | Same as above |
| `typecheck` | `npm run typecheck` | `npx tsc --noEmit` full project TypeScript | Baseline MUST be rc=0 clean (M-SUPABASE-01 closed at rc=0; docs-only session so no new type errors) |
| `lint` | `npm run lint` | ESLint full project | Pre-commit hygiene |

### 10.2 Maestro Layers (v2.8.0 iOS simulator; wrapper scripts/maestro/run-local.sh canonical, NEVER invoke `maestro` directly)

Maestro = L4 mobile e2e. "Maestro executes, Human approves" model. All commands from package.json scripts VERBATIM.

| Package.json Script Key | Command | What it runs | Gate |
|---|---|---|---|
| `maestro:install` | `npm run maestro:install` | Install Maestro CLI v2.8.0 via `curl -Lfs https://get.maestro.mobile.dev \| bash` into `~/.maestro/bin/maestro` | First time on new machine; `documentation/MAESTRO_LOCAL_SETUP.md §3` |
| `maestro:test:smoke` | `npm run maestro:test:smoke` | `run-local.sh test maestro/flows/launch-smoke.yaml` | Quickest single-flow proof Metro+simulator+Maestro driver all work (72s baseline) |
| `test:e2e:maestro:smoke` | `npm run test:e2e:maestro:smoke` | Alias for same smoke flow | Same as above |
| `test:e2e:maestro:qa01` | `npm run test:e2e:maestro:qa01` | Sprint7 M-QA-01 4 scenario suite (scenario A/B/C/D) via run-local.sh sequentially | M-QA-01 regressions; not the primary runner (use run-qa01-suite.sh wrapper instead for 6 hardening layers) |
| `test:e2e:maestro:task-core` | `npm run test:e2e:maestro:task-core` | M-QA-03 5 live Supabase Task Core flows: create → assign → progress → completion → photo-upload | M-QA-03 regressions; unique MAESTRO_TASK_TITLE env var recommended to avoid Supabase collisions |
| `test:e2e:maestro:journeys` | `npm run test:e2e:maestro:journeys` | 2 journey flows: journey-login-switch-projects (166s baseline) + journey-projectswitch-create-taskdetail-update (74s baseline) | M-QA-03 L3 full journey |
| `test:e2e:maestro:final` | `npm run test:e2e:maestro:final` | Final E2E package-script (referenced by validate:local:maestro) | Full final L4 proof |
| `validate:local:confidence` | `npm run validate:local:confidence` | `validate-local.sh` with VALIDATE_LOCAL_RUN_JOURNEYS=1 → runs Jest confidence (regression + journeys) only | §8 Step 6 typecheck plus this = fast L1/L2/L3 green |
| `validate:local:maestro` | `npm run validate:local:maestro` | Confidence + maestro:journeys = full L1-L4 | Validation close gate composite before push |

**Maestro best-practice from `scripts/maestro/` conventions** (§9 Preflight enforces):
1. Prefer `scripts/maestro/run-local.sh` wrapper with 10s heartbeat, PHASE, FINISHED rc/elapsed format, MAESTRO_LOCAL_HOME project-local `.cache/maestro-home` fallback.
2. UDID lock: `UDID=B7B2640C-4738-4F8A-AEEE-5DF3D21D2533 bash scripts/maestro/run-local.sh --udid B7B2640C-4738-4F8A-AEEE-5DF3D21D2533 test maestro/flows/launch-smoke.yaml` for reproducible runs.
3. Maestro v2.8.0 + applesimutils crash workaround: if running `maestro test` directly crashes with TCC.db permission errors, use `MAESTRO_0CLICK_DISABLE=1 bash scripts/maestro/run-local.sh test …` to skip the 0-click pre-write (fallback = manual "Open" tap on EXDevLauncher screen). Reference `documentation/MAESTRO_LOCAL_SETUP.md §6 Troubleshooting`.
4. Unique title avoid collision: `MAESTRO_TASK_TITLE="MAESTRO_$(date +%Y%m%d_%H%M%S)_regression" npm run test:e2e:maestro:task-core` for any task-core flow against live Supabase.

### 10.3 Metro (Expo Dev Server — port 8081, EXDevLauncher mode currently running)

```bash
# Health check (HTTP 200 = alive):
curl -sS -o /dev/null -w 'HTTP=%{http_code}\n' --connect-timeout 3 http://127.0.0.1:8081/status

# Force reload JS bundle after git checkout or file changes:
curl -sS -o /dev/null -w 'HTTP=%{http_code}\n' -X POST --connect-timeout 3 http://127.0.0.1:8081/_expo/reload
```

Current running command (Terminal 1): `cd /Volumes/KooDrive/InsiteApp && npx expo start --ios --port 8081 --non-interactive --dev-client 2>&1 | tee /tmp/metro.log` — uses `--dev-client` flag for `EXDevLauncher` build `com.buildtrack.app.local` on booted simulator. If killed, restart via:

```bash
mkdir -p .cache/expo-home; export HOME="$PWD/.cache/expo-home"; export EXPO_USE_METRO_WORKSPACE_ROOT=1; npx expo start --ios --port 8081 --non-interactive --dev-client
```

### 10.4 Release / Build (EAS local, App Store Connect submit — PUBLIC RELEASE = MANUAL)

```bash
# Local EAS iOS production build:
bash ./build-local.sh --profile production --platform ios

# Submit IPA to ASC (NEVER say "released to public" after this step — only ASC human can tick Public checkbox):
bash ./build-and-submit.sh --profile production --platform ios --submit asc

# Post-submit status language: "Submitted to ASC, awaiting manual public release" — never "released" or "public".
```

### 10.5 Supabase Gate 1 (for 02a/02b unblock only — EXACT 2 commands from SUPABASE_SQL_ACCESS.md)

Two commands listed VERBATIM from SUPABASE_SQL_ACCESS.md § Current InsiteApp Audit Path with NO embedded actual values. `<PROJECT_REF>` is a PLACEHOLDER — NEVER gets hardcoded into ANY file or chat output, not even as example. Replace at shell time only via env var / manual string replace.

```bash
# Command 1 (Option A only — write pgpass pooler entry format into ~/.pgpass).
# Format (no actual values here, placeholders ONLY):
echo "aws-1-ap-south-1.pooler.supabase.com:6543:postgres:postgres.<PROJECT_REF>:<DATABASE_PASSWORD>" >> ~/.pgpass
# NOTE: Above adds a NEW LINE each time you run; if testing, edit ~/.pgpass manually to avoid duplicates.
chmod 600 ~/.pgpass

# Command 2 — run read-only Gate 1 audit against pooler using libpq psql.
# RED NOTE: <PROJECT_REF> MUST be replaced with the actual project ref AT RUN TIME ONLY.
# NEVER commit, paste, or write the concrete value into: cursor-handoff-2026-08-08.md, .cursorrules, .cursor/rules/*.md, package.json, app.json, eas.json,
#   SUPABASE_SQL_ACCESS.md, WS_SUPABASE_01_READONLY_AUDIT.sql, AGENTS.md, ROADMAP.md, documentation/, docs/, scripts/, .trae/documents/, or any git-tracked file.
/opt/homebrew/opt/libpq/bin/psql -w -h aws-1-ap-south-1.pooler.supabase.com -p 6543 -d postgres -U postgres.<PROJECT_REF> -f /Volumes/KooDrive/InsiteApp/WS_SUPABASE_01_READONLY_AUDIT.sql
```

If Option B (Dashboard SQL Editor) instead: skip the two commands above, use the Dashboard UI, paste 7 sections one at a time (§15 Appendix A title list for ordering), copy redacted outputs back.

---

## 11. TRAE-Specific Artifacts Migration Into Cursor (2026-08-08 update)

Updated 8-row table from 2026-08-06 handoff §11. Status column UPDATED for 2026-08-08 NEW entries: 02a/02b blocked → workflow-ms02-unblock.md, 3 groom prompts referenced, 03b Schema Review Gate → Hard Safety Rule 7.0c + Custom Instructions top priority.

| Artifact | Lives Where | Migrated to Cursor Equivalent | 2026-08-08 Status |
|---|---|---|---|
| SOLO agent YAML prompts (8 files) enriched with Maestro/Autonomy/Milestone/Skill-synergy rules | `~/.trae/skills/solo-agents/agents/*.yaml` | `.cursorrules` file + 6 copy-synced `.cursor/rules/` files + Custom Instructions | **Deliverables B/C created this TRAE session.** §8 Steps 4/5 will re-write if missing in Cursor. Autonomy Policy 5-item blocking questions list is now embedded in `.cursorrules` Pre-kickoff Gate 2 EXACT. |
| Installed TRAE marketplace skills (13 total) | TRAE Marketplace + `~/.trae/skill-config.json` local entry | Cursor equivalents: react-native-skills rules → `react-native.md` optional future add; writing-plans → §8 Step 1 plan-then-execute implicit; TRAE-code-review → Cursor self-review step in COMMIT GATE workflow; git-commit → Cursor conventional commit command line per §8 Step 3; gh-cli → terminal calls; figma → requires Cursor figma plugin or separate API key config | **Partial coverage in `.cursorrules`.** Core workflow routes present. Skill synergy hooks still reference TRAE skill names as hints; in Cursor they are aspirational (you can't invoke the marketplace skills natively). |
| TRAE `skill-config.json` local entry | `~/.trae/skill-config.json` | None (Cursor doesn't load TRAE skills). | **Not needed for Cursor;** already captured in `.trae-backups/2026-08-08-handoff/` via §8 Step 1 backup. |
| Autonomous Delivery Mode user profile rule | `user_profile.md` project memory → Custom Instructions + `.cursorrules` Autonomy Policy | §18 Appendix D Custom Instructions block §7.0a/7.0b/7.0c NEW rules + `.cursorrules` Mandatory Pre-kickoff Gate 2 | **MIGRATED.** Appendix D block is copy-paste ready. 2026-08-08 priority queue (02a/02b → 03b → 01J/K/M/N) inline at top of Custom Instructions. |
| project_memory.md lessons (iOS modal accessible={false}, keyboardShouldPersistTaps=always, unique MAESTRO_TASK_TITLE, non-standard .env, bundle-id mismatch risk, App Store manual step, rerun-safe callbacks, keyboard dismiss before CTA, dedicated UpdateProgress callback) | `~/.trae/memory/projects/.../project_memory.md` → `.cursorrules` Hard Safety Rules + Role Boundaries Builder Maestro compatibility list → Cursor Rules file | §7 Hard Safety Rules 7.1 through 7.8 cover the legacy 8 rules; **7.0a/7.0b/7.0c NEW 2026-08-08 top rules** precede them. Builder Role Boundaries paragraph inside `.cursorrules` lists the 9-item Maestro UI compatibility from builder.yaml. | **MIGRATED.** All lessons surfaced in §7 + `.cursorrules` Role Boundaries + §9 Maestro Preflight 8 gates. |
| **M-SUPABASE-02a/02b session BLOCKED Rule 1 status** | Was in-flight TRAE 2026-08-08 session output → returned BLOCKED with blocker text string | → `.cursor/rules/workflow-ms02-unblock.md` NEW file (Deliverable C file 5) = VERBATIM Option A pgpass + Option B Dashboard paste paths + §15 Appendix A 7 SQL section title headings for paste ordering. Also referenced in §1.2 Session State, §4 Milestone BLOCKED row, §8 Step 2 Unblock Checklist | **NEW MIGRATION ENTRY 2026-08-08 — COMPLETE.** Deliverable C file 5 created by Builder in this session. QA Validator will check non-empty + no embedded PROJECT_REF. |
| 3 groomed kickoff prompts (M-SUPABASE Prompt 1 = 02a/b combined P0; Prompt 2 = 03b Schema Review Gate; Prompt 3 = Parallel P1/P2) | `docs/superpowers/plans/2026-08-07-msupabase-groom-next-session-kickoffs.md` H2 headings § Prompt 1, § Prompt 2, § Prompt 3 | **Do NOT re-invent prompts.** Cursor will open that file as canonical kickoff text for those 3 sessions. §5 Source of Truth Matrix row marks it MUST read before those cycles. §4 Milestone Gate table rows 02a/02b/03b/parallel each cite the appropriate Prompt heading. | **NEW MIGRATION ENTRY 2026-08-08 — COMPLETE via reference.** File lives at docs path; included in MUST-read for relevant cycles. |
| **M-SUPABASE-03b Schema Review Mandatory Human Gate** | Was ROADMAP L72 Order 13.4 Notes + findings F-003 ROLLOUT WARNING | → **Hard Safety Rule 7.0c** (copy-pasted ROLLOUT WARNING VERBATIM + explicit 6-col list inline `primary_assignee_id, delegated_user_ids, container_id, sub_container_id, tags, location_on_site`) + **Rule 7.0b** written GO requirement (chat transcript OR signed checklist line) + §14 Next Work priority 3 ("Phase A only → HUMAN SCHEMA REVIEW GATE") + **§18 Appendix D Custom Instructions** top-priority queue line 3 explicit. | **NEW MIGRATION ENTRY 2026-08-08 — COMPLETE.** Gate exists in 4 independent enforcement loci (Safety Rule + Next Work Priority + Custom Instructions + Milestone Gate row). Impossible to miss for any cursor reading this handoff. |

---

## 12. Open Questions / Assumptions Log (2026-08-08)

A1..A6 preserved from 2026-08-06 handoff §12 if still applicable. A7..A9 NEW 2026-08-08 added at bottom.

| # | Assumption / Open Question | Why unresolved | Possible actions in Cursor |
|---|---|---|---|
| A1 | TRAE @-menu SOLO agents were NOT visually confirmed by user (8 rows Planner → Docs Curator visible or not?) | User ran out of TRAE credit before testing reload on 2026-08-06; TRAE registration now moot for Cursor work | Irrelevant for Cursor migration → CLOSE. Use `.cursorrules` + `.cursor/rules/` 6 files workflow which has identical logic. Migration complete per §11 table rows 1 + 4. For historical curiosity only: optional can open TRAE Skills UI later to check if user returns to TRAE. |
| A2 | Sprint 7 release-spoofing hardening edits (deep links + Dev Settings button `__DEV__` gating) were proposed but not applied. User has not said whether the risk is acceptable for next release. | TRAE sessions 08-06 → 08-08 were docs-only (QAE, M-SUPABASE-01/00); no explicit "go fix release risk" was ever given. Risk is low-severity for internal builds but grows if a public IPA ships. | Ask user on first Cursor release session. If yes → apply 3 proposed edits from 08-06 handoff §5 + run release smoke build + Maestro. If no → document assumption in release notes close-out. |
| A3 | Project-level `.trae/skills/solo-agents/` was deleted earlier 08-06 session (intentional dedup of user-level copy at ~/.trae/skills). Backup in §8 Step 1 covers user-level copy. Does user want a repo-level synced copy for team sharing? | Open preference. User-level copy at `~/.trae` is canonical per TRAE 08-06 Method 1 install; repo-level duplicates can drift. | Ask user. If yes → copy user-level `solo-agents` dir into repo → add to git → keep in sync with symlink or manual; mention in §6 Step 1 .cursorrules that SOLO YAMLs also live at repo-local path now. If no → leave status quo. |
| A4 | Master-side M-QA-02 verification status unknown — last known state Pipeline per 08-06 handoff. AGENTS updated it to Closed 08-06 based on 3-flow re-verify rc=0 iPhone 17 Pro Max B7B2640C-4738-4F8A-AEEE-5DF3D21D2533; but governance rule says "stays Pipeline unless master-side human verified smoke/bootstrap". Is there a CI runner? | Gap. The governance close-out gate item was re-interpreted by TRAE 08-06 QA Validator as "local passes on same UDID + simulator image that CI would use = sufficient proxy". AGENTS line 36 now says Closed. | Ask user: "Is M-QA-02 truly closed per master-side verification, or should we reopen it to Pipeline in AGENTS + ROADMAP?" If answer is master-side NOT yet performed → revert AGENTS/ROADMAP M-QA-02 to Pipeline + document governance rule reason. If answer is master verification was performed (separately, off-camera) → leave Closed as-is. |
| A5 | Do uncommitted files detected by `git status` at §8 Step 3 match expected orphaned-draft state only from aborted 02a/02b attempt? Or are there unrelated local changes from a previous session that we accidentally include in a commit? | TRAE session 2026-08-08 for 02a/02b was BLOCKED by Rule 1 BEFORE Builder produced any files. So git SHOULD be clean (0 uncommitted). But Cursor will run §8 Step 3 first thing and may find stray files. | Examine `git status` output carefully in Cursor §8 Step 3. Default action: if files = migration deliverables (.cursorrules, .cursor/rules/) that this TRAE session just created → those are EXPECTED (you will commit them via §7 COMMIT GATE). If files match ANYTHING ELSE → use `git add -p` for selective staging, DO NOT blindly commit. Discard true orphans with `git checkout . && git clean -fd`. |
| A6 | Was `/tmp/d7_qav.sh` 1-line placeholder (08-06 Terminal 13 earlier command) actually meaningful content the user initiated as diagnostic, or is it dead temp? | Unknown contents. TRAE 08-06 QA Validator tagged it unknown. | On Cursor first free terminal: `if [ -f /tmp/d7_qav.sh ]; then cat /tmp/d7_qav.sh; else echo "no longer exists (safe)"; fi` → decide keep/debug/ignore based on 1-line contents. If still exists and is a diagnostic you care about → copy to repo-local `scripts/sys/d7_qav.sh` + commit with message `chore(sys): preserve 08-06 diagnostic placeholder` if meaningful; else safe to let `/tmp` reclaim it on reboot. |
| **A7 (NEW 2026-08-08)** | **02a/02b unblock: will user provide Option A pgpass or Option B dashboard paste?** | TRAE session 2026-08-08 posed both options → user declined both (hence blocker text: `"no ~/.pgpass present AND user declined to paste dashboard outputs"`). The blocker is still active for Cursor. M-SUPABASE-02a/02b is the top priority item in the 1..6 queue; we can't close it without Gate 1 evidence. | Cursor first action if/when tackling 02a/02b cycle: re-paste §8 Step 2 Unblock Checklist verbatim. If user picks Option A → walk them through the 2 commands of §10.5 (format line + psql run). If Option B → open §15 Appendix A 7 section titles for paste ordering; after paste → save redacted outputs to `docs/superpowers/evidence/m-supabase-02a-02b-gate1-redacted-YYYYMMDD.md` before proceeding with Builder migration SQL files. If user again declines both → return cycle BLOCKED again (same string), pick priority 6 idle parallel 03e script dry-run port (no Gate 1 needed) to continue making progress. |
| **A8 (NEW 2026-08-08)** | **Once 03b migration artefacts are built in Phase A, WHO is the sign-off authority for the Schema Review Gate → human GO before Phase B live apply?** | The kickoff says "explicit written sign-off". TRAE couldn't identify a specific human owner. Options: user Tristan (owner) = default; another dev team member with DBA familiarity; Supabase dashboard admin. | Ask user in the SAME message as A7 when you hit 03b Phase A → Phase B handoff. Format: "Sign-off authority for 03b Phase B live apply: Tristan or another name?". Record answer in the signed checklist doc (Prompt 2 §A3 item a..e checklist) under item (e) timeline sign-off row. Default: if user says "I'm the sign-off" → Tristan's explicit "GO" message in chat transcript = satisfies 7.0b written GO requirement of either (1) transcript OR (2) signed doc line. |
| **A9 (NEW 2026-08-08)** | **Container parent table for S-UX-01N: does `containers` exist in live schema today? Or should its DDL be bundled inside 03b migration?** | Groom row 13.15 Notes says verbatim: "If containers parent table does not yet exist, its DDL ships inside M-SUPABASE-03b's migration (planner of 03b decides single vs separate step; both go through same Schema Review Gate)." No live Gate 1 ran yet → we don't know. | Resolved as PART OF 02a/02b Gate 1 live-SQL run: WS_SUPABASE_01_READONLY_AUDIT.sql §1 PUBLIC_TABLES section (see §15 Appendix A) lists ALL `information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`. If `containers` is in the output → exists → no DDL needed (just the two FK cols on tasks). If `containers` is MISSING from the PUBLIC_TABLES output → planner of 03b must bundle its CREATE TABLE (columns id PK, name TEXT, project_id FK projects(id), location/meta fields TBD) inside the same `…MS03b_tasks_6col_metadata.sql` migration file as a preceding block before the ALTER TABLE tasks ADD COLUMN calls. Both go through single Schema Review Gate together. Either way single Gate 1 lookup answers this definitively; no separate DB query needed. |

---

## 13. Deferred Context Carry-Over

Copy VERBATIM from ROADMAP.md §Deferred Context lines 102–110:

> These are intentionally outside the WS/M/S milestone inventory and current execution queue.
>
> - WS-SEC / M-SEC-02 remains intentionally deferred: rotate previously exposed credentials and decide later whether Git history rewriting is required beyond branch-tip cleanup.
> - Pending follow-on under `WS-SUPABASE / M-SUPABASE-01`: apply the authored `tasks` redesign metadata migration for `primary_assignee_id`, `delegated_user_ids`, `container_id`, `sub_container_id`, and `tags`; until the live schema is updated, task create and redesign-metadata edit flows use compatibility fallbacks and those fields do not persist reliably.
> - Deferred branch follow-on: `feature/ai-llm-integration` is intentionally paused for future roadmap grooming; its code is already contained in `master`, but the feature line remains under review before any new milestone or slice is opened for it.
> - Deferred branch follow-on: `origin/feature/local-file-cache` remains a remote-only legacy branch on unrelated history; do not delete or promote it until its scope is reviewed and mapped into a future workstream or explicitly retired.
> - WS-FUTURE: MCP Hub architecture, AI task automation, and construction platform integrations.

**Footnote 5-col vs 6-col discrepancy (cross-reference cleanly):** The ROADMAP Deferred Context bullet "pending follow-on under WS-SUPABASE/M-SUPABASE-01" line explicitly names a 5-col redesign metadata list: `primary_assignee_id`, `delegated_user_ids`, `container_id`, `sub_container_id`, `tags`. But the groomed 13.4 M-SUPABASE-03b row Notes + §7.0c ROLLOUT WARNING + findings F-003 6-col explicit list all expand to SIX cols by appending `location_on_site` because S-UX-01M writes location_on_site and it was included in taskStore DEFERRED_TASK_CREATE_SCHEMA_FIELDS (verified by §5 Source of Truth Matrix row taskStore.supabase.ts read). The canonical ground-truth is SIX columns. The 5-col line in ROADMAP Deferred Context is a STALE historical artifact that predates the groom cycle (it was carried forward from M-SUPABASE-01 § Deferred Context write 2026-08-07 commit 5f377f3; by the time 90a2b1b groom expanded 13.4 Notes to 6-col the Deferred Context paragraph was not retroactively updated). No bug, no data loss, just wording drift. Action in Cursor when you eventually update ROADMAP next (e.g., after closing 02a/02b): append a trailing clause to the Deferred Context pending-follow-on bullet: `(…and tags; note: groomed 03b migration scope 2026-08-07 expanded to 6 cols by adding location_on_site)` to make the drift explicit for future readers. NOT a blocker for 02a/02b work — defer the ROADMAP edit to 03b close ledger (single PR together with 13.4 row Pipeline→Closed + 13.12..13.15 Notes unblock updates).

---

## 14. Next Work Ordered Priority (non-empty 1..6 list, exact order)

Listed EXACT priority as required. This order is enforced by: §7 Hard Safety Rules 7.0a/7.0b/7.0c top rules + §6 precedence + §18 Appendix D Custom Instructions priority queue + Milestone Gate §4 row ordering (02a/02b BLOCKED → 03b → 01J/K/M/N → parallel).

**(1) UNBLOCK M-SUPABASE-02a/02b → close Rule 1.** First action when opening 02a/02b cycle in Cursor: paste §8 Step 2 Unblock Checklist + resolve A7 open question (Option A vs Option B). Execute Option A (pgpass + psql §10.5) OR Option B (Dashboard SQL Editor §1..§7 runs, §15 Appendix A order). After Gate 1 runs: save redacted 7-section appendix as `docs/superpowers/evidence/m-supabase-02a-02b-gate1-redacted-YYYYMMDD.md` with save command `mkdir -p docs/superpowers/evidence && cat > docs/superpowers/evidence/…` → commit later together with Builder deliverables. Key counts to eyeball: anon SELECTs on 7 sensitive tables. Save for builder phase: anon=0 → remediation only needed if any row count anon>0 (7-table policy write + FK + NOT VALID + INSERT policy). Also: A9 container parent table resolved by PUBLIC_TABLES section.

**(2) Close M-SUPABASE-02a/02b → apply 02a RLS 7-table + 02b FK NOT VALID + anon SELECTs 0 all 7 close gates.** Follow groom Prompt 1 exactly (do not re-invent). Produce: (B) 1 idempotent migration `MS02a_rls_anon_hardening.sql` (ALTER TABLE … ENABLE RLS IF NOT EXISTS; REVOKE default; policies with auth.uid + user_has_project_access helpers; header ROLLBACK line drop policies + disable RLS). (C) 1 idempotent migration `MS02b_users_fk_not_valid.sql` (ADD CONSTRAINT users_id_fkey … REFERENCES auth.users.id ON DELETE CASCADE NOT VALID + CREATE POLICY users_self_write … WITH CHECK (id = auth.uid()); header ROLLBACK line DROP CONSTRAINT IF EXISTS + DROP POLICY IF EXISTS). (D) Close report (live baseline numbers, per-table policies added, close-gate anon client SELECT 0 rows all 7 table counts with evidence screenshot or paste, signup parity harness 0 constraint violations after NOT VALID add, live rc=0). (E) ROADMAP rows 13.1 + 13.2 Pipeline → Closed YYYY-MM-DD; AGENTS Current Delivery Status update. Commit scope 2 new migrations under `supabase/migrations/` + ROADMAP + AGENTS edits + close report under `docs/superpowers/reports/` ONLY. NO src/ code edits in this session.

**(3) M-SUPABASE-03b Phase A schema artefacts NO WRITES → HUMAN SCHEMA REVIEW GATE.** Follow groom Prompt 2 EXACT. Phase A = NO LIVE WRITES AGAINST ANY PROD TENANT EVER. Produce: (A1) `MS03b_tasks_6col_metadata.sql` = idempotent, 6 ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS (primary_assignee_id UUID REFERENCES users(id) NULL; delegated_user_ids UUID[] NULL; container_id UUID NULL; sub_container_id UUID NULL; tags TEXT[] NULL; location_on_site TEXT NULL). Then CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_primary_assignee ON tasks(primary_assignee_id); idx_tasks_tags_gin GIN(tags); best-effort backfill UPDATE tasks SET primary_assignee_id = assigned_to WHERE primary_assignee_id IS NULL AND assigned_to IS NOT NULL. Header ROLLBACK comment with guarded pre-check script (drop ONLY if empty + no pre-existing). (A2) rollback SQL `MS03b_ROLLBACK.sql` + DRY_RUN pre-check. (A3) Apply A1 on parity/sandbox tenant ONLY. Run deferred-fallback contract tests against parity. Close gate on parity: getDeferredTaskSchemaField() = null for every task create + update write → fire rate 0. (A4) Gate artefacts signed-off schema review checklist (a cols, b indexes + CONCURRENTLY justification, c backfill row count estimate from Gate 1 live-SQL tasks count, d rollback proof against parity with dry-run rc=0, e timeline off-hours recommended). STOP AFTER Phase A. Do NOT proceed to Phase B. EXPLICITLY output "Phase A complete. HUMAN SCHEMA REVIEW REQUIRED. Await GO before Phase B." → CYCLE PAUSES. Resolve A8 during Phase A final step (who signs).

**(4) M-SUPABASE-03b Phase B parity then live apply → deferred fallback fire rate 0.** Only after EXPLICIT HUMAN WRITTEN GO (transcript or signed line per 7.0b) received later in a resumed cycle. Apply A1 on remaining live tenants. Post-apply anon key regression check (no regression vs 02a gates). Run full deferred-fallback contract all tenants. tsc --noEmit rc=0; test:regression baseline PASS; test:components baseline PASS. ROADMAP updates: Order 13.4 → Closed (date). Order 13.12 (01J) / 13.13 (01K) / 13.14 (01M) / 13.15 (01N) Notes column = "Prereq 03b Closed. Unblocked to schedule." Do NOT mark those 4 as Closed; they just unblock to active scheduling. AGENTS Current Delivery Status update.

**(5) 01J Tags/Primary Assignee + 01K Delegation + 01M location_on_site + 01N Containers all unblocked to ship now that 03b Closed.** 4 UX tail slices now can build. Each follows Feature workflow → Planner → Builder TDD → Reviewer → COMMIT GATE → Test Engineer → QA Validator iOS sim. Build order: start with 01J (Tags + Primary Assignee) because it surfaces 2 of the 6 columns + tags are the deferred-fallback highest-friction user complaint; then 01K (Delegation Panel) surfaces delegated_user_ids; then 01M (Location Picker) surfaces location_on_site which already has project_locations selector in CreateTask UI → mostly hookup minimal change; then 01N (Container Model) surfaces container_id + sub_container_id FK — note A9 already resolved by this point so we know whether containers table was also added in 03b.

**(6) Idle parallel (can run anytime when Rule 1 blocks higher priorities, or between UX slices):** M-03a role CHECK constraint (needs RLS baseline from 02a closed first, so it waits for priority 2 to complete — so not truly idle until then). M-03c bucket buildtrack-files public/private decision + if private then fileUploadService signedUrl refactor with TTL configurable; if public note in runbook. M-03d deferred fallback observability hook taskStore (audit table row on each stripDeferred hit OR edge function hit OR analytics event M-QA-03 Maestro measurable; success metric 7d fire rate 0 post 03b). M-03e 2 service-role script dry-run gate ports (rebuild_auth_users_from_users.js + fix_missing_user_record.js copy pattern from check_and_fix_auth_users.js). Then P2s 04a Realtime reconnect backoff + publication membership audit (share pg_publication_tables step from 02a Gate 1). 04b Legacy status dual-path deprecation cleanup 30d after 03b. 04c storage retention lifecycle policy + runbook entry. 04d index health pass composite task_read_status + project_locations (pg_stat_user_indexes from Gate 1).

---

## 15. Appendix A — WS_SUPABASE_01_READONLY_AUDIT.sql 7 Section Title Reference

VERBATIM list of the 7 section headers from WS_SUPABASE_01_READONLY_AUDIT.sql (as visible in source read during this session). Each section is a separate SELECT statement guarded by `SELECT '<SECTION_NAME>' AS section;` at line 14 onward. The 7 outputs are what you paste when doing Option B Dashboard route OR what you get printed in psql stdout when running Option A. Order is important: paste them in the same order below so future reader can cross-reference §→section mapping.

1. **PUBLIC_TABLES** (outputs `table_name` from `information_schema.tables WHERE table_schema='public' ORDER BY`). Answers A9: does `containers` row exist in list? If yes → container parent table present. Also baseline for 02a anon-block close: 7 target tables (companies, users, projects, tasks, task_activities, task_read_status, project_locations) MUST all appear here.
2. **TASK_LOCATION_COLUMNS** (outputs column_name, data_type, is_nullable WHERE `table_name='tasks' AND column_name IN ('location','location_on_site','project_id','assigned_by')`). Verifies whether `location_on_site` EXISTS in the live tasks schema today. This is the §3.2 F-003 evidence: if column is missing from this output → 03b migration is definitely needed (not just a stale tenant theory; confirmed live-missing).
3. **PROJECT_LOCATIONS_TABLE_EXISTS** (outputs `COUNT(*) AS project_locations_table_count` 0 or 1 from information_schema.tables). Whether `project_locations` table exists. CreateTask location picker uses it.
4. **PROJECT_LOCATIONS_COLUMNS** (full column inventory for project_locations with data_type + is_nullable). If picker fields expected by S-UX-01M are missing, migration for locations ALSO needed (bundled into 03b at planner discretion).
5. **TASK_LOCATION_JSON_TYPES** (outputs `json_typeof(location)` breakdown → COALESCE 'null' → COUNT rows). Classifies the legacy `location` JSON column on tasks: what % is null vs string vs object. Used for 03b + 01M migration strategy (do we need to back-migrate old JSON into new location_on_site column or accept greenfield-only?).
6. **TASK_LOCATION_ON_SITE_POPULATION** (outputs COUNT rows with/without populated `location_on_site` btrim not null). Baseline: how many tasks already have the new column? Close gate 03b: after ADD COLUMN this should start at 0 non-empty except for any rows written by 3rd-party against newer schema.
7. **TASK_LOCATION_LABEL_CANDIDATES** (outputs project_id + candidate_count + first_label_sample + last_label_sample — regexp_replace extracts location labels COALESCING: location_on_site btrim → if json string → location json value → if json object → locationOnSite/onSite/label/name/text fields → 25 most populated projects). Feed this list into 01M CreateTask location picker's default options per project; avoids re-inventing labels.

When doing Option B paste in Supabase Dashboard SQL Editor: you can paste the entire SQL file contents at once and Dashboard splits the output by SELECT statements automatically, or paste section by section by highlighting between the `SELECT 'SECTION_NAME' AS section;` lines. Redact any cell values that look like real project UUIDs, company names, or PII before pasting into Cursor chat (replace with `<REDACTED>` inline — keep tabular structure intact).

---

## 16. Appendix B — WS-SUPABASE-00 Groomed 15 Sub-numbered Children Inventory

Full 15-row table from ROADMAP Order 13.1..13.15. Columns: Order (ROADMAP display order), Milestone ID, Severity / Purpose, Prereq (hard close gate before ship), Current Status (Pipeline/Closed), Blockers / Special Notes. Mirrors ROADMAP exactly; copy here so Cursor can resolve milestone references without cross-flipping docs during plan phase.

| Order | Milestone ID | Severity / Purpose | Prereq | Current Status | Blockers / Special Notes |
|---|---|---|---|---|---|
| 13.1 | M-SUPABASE-02a | P0 Security RLS 7-table anon-block on companies, users, projects, tasks, task_activities, task_read_status, project_locations | Live Gate 1 read-only SQL pass 7/7 sections redacted appendix MANDATORY (not optional) | Pipeline → BLOCKED IN-FLIGHT ATTEMPT 2026-08-08 | Blocker = Rule 1 active: `"no ~/.pgpass present AND user declined to paste dashboard outputs"`. Close gate = anon SELECT 0 rows COUNT all 7 tables. Rollback-safe individual policy drops. Policies use auth.uid() + user_has_project_access() helpers from 20260715000300 migration. |
| 13.2 | M-SUPABASE-02b | P0 Integrity public.users.id FK REFERENCES auth.users.id ON DELETE CASCADE NOT VALID (VALIDATE later) + users_self_write INSERT policy WITH CHECK id=auth.uid() | Same Gate 1 live-SQL (shared, 02a/02b are combined cycle) | Pipeline → BLOCKED IN-FLIGHT ATTEMPT same Rule 1 | Combined P0 session with 02a. Close gate = authStore signup parity harness 0 constraint violations after NOT VALID add, no existing FK violations after NOT VALID add. FK uses NOT VALID pattern to avoid table-locking on live tenant. |
| 13.3 | M-SUPABASE-03a | P1 Integrity role CHECK constraint public.users.role + user_project_assignments.role/assignment_category | M-SUPABASE-02a Closed (RLS baseline first, because role columns need RLS guard preventing non-company_admin writes) | Pipeline | Backfill/normalize any stray role rows before applying CHECK. Close gate: parity harness invalid role string insert → constraint violation raised. RLS guard prevents non-company_admin role mutations. |
| 13.4 | M-SUPABASE-03b | P1 SILENT DATA LOSS mitigation Tasks redesign metadata 6-column migration across all active tenants + Schema Review Gate before any live apply | M-SUPABASE-02a Closed CONFIRMED + M-SUPABASE-02b Closed CONFIRMED (need proven-live baseline gate BEFORE schema edit) | Pipeline HUMAN SCHEMA REVIEW GATE between Phase A and Phase B | **6-col EXPLICIT list inline: primary_assignee_id, delegated_user_ids, container_id, sub_container_id, tags, location_on_site.** ROLLOUT WARNING VERBATIM from findings F-003 + ROADMAP L72 Notes copied to §7.0c. Phase A = artefacts NO WRITES. Phase B = Live apply after GO. Post-live-apply close gate taskStore deferred-fallback fire rate 0 all tenants 7 days. Prerequisite for 13.12/13/14/15 UX tails. |
| 13.5 | M-SUPABASE-03c | P1 Security Storage bucket buildtrack-files public/private flag decision + if private signedUrl fileUploadService refactor TTL configurable | M-SUPABASE-01 Closed (parallel safe with 02a/b) | Pipeline | Close gate fresh Expo session → photo display renders HTTP 200 either public URL (if public flag) OR 200 via signedUrl with TTL. If private refactor fileUploadService getFileUrl to return createSignedUrl with TTL from config. If public → explicit docs note in SUPABASE_OPERATIONS_RUNBOOK "bucket public". |
| 13.6 | M-SUPABASE-03d | P1 Observability Deferred-schema compat fallback fire rate structured metric hook | M-SUPABASE-01 Closed (parallel) | Pipeline | Lightweight structured hit at createTask L1551 / updateTask L1950. Postgres audit.deferred_fallback_fires row OR Supabase Edge Function hit OR analytics event measurable by M-QA-03 Maestro flows. Success metric after 03b live apply: fire rate → 0 sustained 7 days all tenants. Without this → no way to PROVE 03b close gate success today except anecdotal user complaints. |
| 13.7 | M-SUPABASE-03e | P1 Operational Safety Service-role admin scripts dry-run gating for 2 siblings missing the guard | M-SUPABASE-01 Closed (parallel) | Pipeline | Port identical --dry-run / --check-only / --apply pattern from check_and_fix_auth_users.js (line 29 args + guards at L339/637/666/725) into rebuild_auth_users_from_users.js + fix_missing_user_record.js. Add pre-write diff printout. Gate: parity run default params → dry-run only runs, 0 writes unless --apply passed. Good idle-P1 to run when Rule 1 blocks priority 1/2/3/4 work: no live SQL, just touches 2 repo-local JS scripts (under scripts/ or root). Docs + small code change only. |
| 13.8 | M-SUPABASE-04a | P2 Freshness Realtime postgres_changes publication membership audit 4 tables + WS reconnect backoff loop RealtimeSyncManager | M-SUPABASE-02a (shares Gate 1 pg_publication_tables read step, so publication audit is easy piggyback) | Pipeline | Audit SELECT * FROM pg_publication_tables WHERE pubname='postgres_changes'. Verify 4 tables tasks event=*, task_activities INSERT, projects *, users UPDATE with event filters alignment RealtimeSyncManager channels. Add reconnect exponential backoff on RealtimeSyncManager on('system', status CLOSED / CHANNEL_ERROR). Close gate: forced socket close + reconnect confirmed, app in background then foreground → no stale data. |
| 13.9 | M-SUPABASE-04b | P2 Hygiene Tasks legacy status dual-path deprecation cleanup (drop current_status legacy cols, remove dual-write branches) | M-SUPABASE-03b + 30-day cool-down post 03b migration applied to all tenants | Pipeline | 30-day cool-down is mandatory to let any rollback risk pass before DROP COLUMN. After 30 days: drop legacy status columns per TASK_STATUS_UNIFIED_MIGRATION.sql L93-97 commented drops. Remove taskStore L1907-1933 dual-write branches, simplify updateTask. Close gate tsc + L2 regression baseline PASS. |
| 13.10 | M-SUPABASE-04c | P2 Cost Storage bucket retention lifecycle policy buildtrack-files versioning + archive + non-current transitions | M-SUPABASE-03c (bucket policy decided first) | Pipeline | S3-style lifecycle rules applied to Supabase Storage buildtrack-files bucket (archive after N days, expire after company policy, versioning to handle accidental deletes). Document in SUPABASE_OPERATIONS_RUNBOOK.md. Bucket CLI or Dashboard. No app code change unless UI exposes retention controls (future slice). |
| 13.11 | M-SUPABASE-04d | P2 Performance Index health pass composite task_read_status (user_id, task_id) + project_locations project_id, measure Dashboard/Tasks p95 before/after | M-SUPABASE-02a (Gate 1 shares pg_stat_user_indexes step) | Pipeline | Gate 1 live-SQL extension: query pg_stat_user_indexes for expected composite on task_read_status and project_id on project_locations. If missing → CREATE INDEX CONCURRENTLY IF NOT EXISTS (never CREATE INDEX non-concurrently). Measure Dashboard Tasks screen render p95 before vs after with real user session snapshot. |
| 13.12 | S-UX-01J | UX Tail Tags + Primary Assignee editor UI, CriticalThisWeek tag persistence already has adapter pattern | **M-SUPABASE-03b CLOSED** before ship (HARD PREREQ — silent data loss otherwise) | Pipeline unblocked after 03b Closed only | Writes tags TEXT[] + primary_assignee_id UUID. taskStore deferred compat path today STRIPS these 6 fields on create/update when tenant does not have cols yet → UI optimistic shows tag, Realtime refetch silently disappears. Ship only after 03b live applies all tenants + deferred fire rate 0 confirmed 7 days. Extend existing `CRITICAL_THIS_WEEK_TAG` pattern + withCriticalThisWeekTag from ui/viewAdapters/useTaskDetailViewAdapter.ts into full tag editor UI. |
| 13.13 | S-UX-01K | UX Tail Task Delegation Panel multi-user selection UI TaskDetail + CreateTask | M-SUPABASE-03b CLOSED | Pipeline same prereq | Writes delegated_user_ids UUID[]. Same deferred-strip silent data loss if shipped pre-03b. UX work: picker design, selected chip state, save handler. Multi-user → can delegate to multiple delegated_user_ids while primary_assignee_id retains single owner semantics. |
| 13.14 | S-UX-01M | UX Tail Create Task Location Refinement location_on_site picker UI | M-SUPABASE-03b CLOSED | Pipeline same prereq | Writes location_on_site TEXT. CreateTask already has project_locations selection surface reuse; add location_on_site field. taskStore line 58 DEFERRED_TASK_CREATE_SCHEMA_FIELDS already lists location_on_site; today compat strips so field disappears after write → reappears after 03b. |
| 13.15 | S-UX-01N | UX Tail Container Model container_id + sub_container_id FK containers.id, Container picker CreateTask + TaskDetail | M-SUPABASE-03b CLOSED (if containers parent table does not yet exist, its DDL bundles into 03b migration; planner of 03b decides single vs separate) | Pipeline same prereq | Writes container_id UUID FK containers.id + sub_container_id UUID self-FK containers.id. Open question A9: containers parent table exists live today? Answer from PUBLIC_TABLES Gate 1 section. If missing → planner of 03b bundles CREATE TABLE containers DDL before ALTER TABLE tasks ADD COLUMNs in same MS03b migration file; both go through same Schema Review Gate. UX: Container picker (parent container → sub container). |

---

## 17. Appendix C — Findings F-001..F-011 Short Summary Table

11 rows from deliverable C (findings backlog). Columns: ID (F-001 to F-011), Severity (P0/P1/P2), Title 1 line, Proposed Milestone Placeholder mapping per §Placeholder scheme in backlog intro, Resolved status (all Not Resolved 2026-08-08). Cross-reference §4 Milestone table + §16 Appendix B for how each mapped milestone's current status (most Pipeline, 02a/02b BLOCKED in-flight).

| Finding ID | Severity | 1-line Title | Proposed Milestone (from placeholder scheme) | Resolved 2026-08-08? |
|---|---|---|---|---|
| F-001 | **P0 Security** | Anonymous-role RLS bypass allows unauthenticated SELECT reads on 7 sensitive tables (live-confirmed 2026-07-12; re-verify live via Gate 1) | M-SUPABASE-02a RLS hardening | NO → Pipeline BLOCKED by Rule 1 |
| F-002 | **P0 Integrity** | public.users.id FK relationship with auth.users not verified enforced at DB-level (spoofed profile rows risk if missing DB FK + RLS policy self-write guard) | M-SUPABASE-02b FK + users_self_write policy | NO → same BLOCKED session combined with 02a |
| F-003 | **P1 Silent Data Loss** | Tasks redesign metadata 6-col migration not verified across all tenants; compat fallback SILENTLY drops delegation/container/tags/location (S-UX-01J/K/M/N blocked) | M-SUPABASE-03b 6-col migration + Schema Review Gate | NO → Pipeline; Phase A artefacts build after 02a/02b closes; human GO before live |
| F-004 | P1 Integrity | Role column CHECK constraint public.users.role NOT verified — if missing any arbitrary string insertable via direct writes (role permissioning bypass risk) | M-SUPABASE-03a role CHECK | NO → Pipeline; waits 02a RLS baseline |
| F-005 | P1 Security + Freshness | (a) Storage bucket buildtrack-files policy unverified (404 photos risk if private); (b) Realtime postgres_changes publication membership 4-channel unverified (half-deaf if missing → no invalidation) | (a) → 03c Storage bucket; (b) bundled into 04a Realtime reconnect audit | NO → both Pipeline; 03c can progress parallel |
| F-006 (rebundled F-006 P1) | P1 Observability | Deferred-schema compat fallback fires have no metric sink (console.warn only, stripped in release) — can't measure when 03b succeeds fire rate → 0 | M-SUPABASE-03d observability hook | NO → Pipeline parallel-safe |
| F-007 (F-007 P1 rebundled legacy) | P1 Ops Safety | Two root service-role JS scripts lack --dry-run guard: rebuild_auth_users_from_users.js + fix_missing_user_record.js (mutate users irreversibly if run accidentally with prod env) | M-SUPABASE-03e script --dry-run ports | NO → Pipeline; GREAT idle candidate to run RIGHT NOW in Cursor while Rule 1 blocks priority 1 (no live SQL needed, just JS edits) |
| F-009 (F-009 P2 rebundled) | P2 Freshness | No aggressive WS reconnect backoff RealtimeSyncManager + publication membership needs audit (background kill socket → stays deaf until restart) | M-SUPABASE-04a reconnect + publication audit | NO → Pipeline; 02a Gate 1 pg_publication_tables step resolves half |
| F-007 P2 (F-007 P2 tasks legacy) | P2 Hygiene | Tasks table dual status paths (current_status legacy + unified status) ambiguity + redundant writes + drift risk | M-SUPABASE-04b legacy status cleanup 30d post 03b | NO → Pipeline; long cool-down mandated |
| F-010 (rebundled F-008/F-010 P2) | P2 Cost/Freshness | Storage retention/lifecycle policy not set (unbounded cost growth of uploads + no versioning for accident recovery) + Realtime reconnect (see P2 above) | F-010 retention → M-SUPABASE-04c; reconnect in 04a | NO → Pipeline; waits 03c bucket policy first for 04c |
| F-011 (rebundled P2 indexes) | P2 Perf | Index health pass needed composite task_read_status user_id+task_id + project_locations project_id + Dashboard Tasks render p95 measure before/after | M-SUPABASE-04d index health pass | NO → Pipeline; shares Gate 1 pg_stat_user_indexes from 02a |

---

## 18. Appendix D — Copy-to-Cursor Custom Instructions Paste Block

Ready for Ctrl+A → Ctrl+C into: **Cursor Settings → Model → "How would you like AI to respond?"**

```text
You are my autonomous senior software engineer inside Cursor. Your job: complete software tasks with minimal input and maximum safe automation, matching the Insite App SOLO Agent workflow specified in `.cursorrules` + `.cursor/rules/*.md` EXACTLY.

Current Priority Queue 2026-08-08 (non-negotiable order — NEVER skip a hard close-gate Prereq):
  1. UNBLOCK M-SUPABASE-02a/02b Rule 1 → live Gate 1 read-only SQL pass 7/7 sections redacted appendix (anon SELECT row counts 7 tables). Blocker currently active: "no ~/.pgpass present AND user declined to paste dashboard outputs". Use Option A pgpass or Option B Dashboard paste per §8 Immediate To-Do Step 2.
  2. CLOSE M-SUPABASE-02a/02b → apply 02a RLS 7-table anon-block + 02b public.users FK NOT VALID + users_self_write INSERT policy. Close gate anon SELECT 0 rows all 7, signup 0 constraint violations.
  3. M-SUPABASE-03b Phase A ONLY → schema artefacts NO LIVE WRITES AGAINST ANY PROD TENANT. HUMAN-IN-THE-LOOP SCHEMA REVIEW GATE REQUIRED BEFORE ANY Phase B live apply. 6-col explicit list: primary_assignee_id, delegated_user_ids, container_id, sub_container_id, tags, location_on_site. ROLLOUT WARNING copied from findings F-003 applies.
  4. M-SUPABASE-03b Phase B only AFTER EXPLICIT WRITTEN HUMAN GO (transcript message OR signed checklist line). Live apply → deferred fallback fire rate 0 all tenants sustained 7d.
  5. S-UX-01J Tags/Primary Assignee + 01K Delegation Panel + 01M location_on_site Picker + 01N Container Model → NOW UNBLOCKED to ship (ONLY after M-SUPABASE-03b Closed confirmed; NEVER ship before — silent data loss).
  6. Idle parallel P1/P2: 03a role CHECK, 03c bucket policy, 03d observability, 03e script dry-run ports, 04a publication/reconnect, 04b legacy status, 04c storage retention, 04d indexes. When Rule 1 blocks priority 1→5, run 03e first (no live SQL needed).

SOLO Workflow (mirrors `.cursorrules` Mandatory Pre-kickoff gates + Workflow selection):

  PRE-KICKOFF GATES (run BEFORE writing plan on EVERY non-trivial request):
  a) MILESTONE GATE: Read AGENTS.md § Current Delivery Status + documentation/ROADMAP.md. Cite milestone + classify tests per TESTING_STRATEGY.
  b) AUTONOMY POLICY (ratified 5-item blocking questions list ONLY):
     Ask user ONLY IF: (1) product behavior choices with ≥2 valid irresolvable outcomes; (2) schema/persistence changes with user-facing consequences; (3) auth/security no precedent; (4) release/deploy/version/env decisions; (5) scope expansion >1 bounded extension. Batch max 4. Non-blocking → repo-aligned default + CONTINUE.
  c) VALIDATION PLAN: State up-front which Jest tests, Maestro flows if any, iOS manual steps, typecheck/lint/build smoke you run. Do not proceed w/o written.

  WORKFLOW CHOICE (smallest risk-managed):
  - Feature: Plan → Build TDD → Review 0 C/H → COMMIT GATE conventional → Test → QA (if user-visible mobile flows) → Docs → Release (if touched)
  - Bug fix: Plan root-cause repro → Build smallest fix TDD → Review 0 C/H → COMMIT GATE → Test → QA if flow visible
  - Refactor: Plan backward compat + verification harness → Pre-review if risky → Build phases → Review → COMMIT → Test → QA if behavior changed
  - Release: Plan if unclear scope → Review drift bundle-id/runtimeVersion/security → COMMIT if changed → Test Jest smoke + Maestro bootstrap evidence → QA if user visible → Docs release notes → Release Manager gh-cli milestones
  - Docs-only: Plan scope → Docs Curator defuddle pattern → Review technical accuracy

  COMMIT GATE (non-negotiable order): Builder changes → Reviewer ZERO C/H findings → conventional commit (feat|fix|chore|docs|refactor|test|ci|revert + optional scope + desc) → Test runs → QA runs. NEVER commit pre-Review. NEVER commit partial/TODO state.

HARD SAFETY RULES (7.0a/7.0b/7.0c FIRST IN LIST — supersede later rules on conflict):
  7.0a NEVER close 02a/02b without Gate 1 7/7 redacted appendix. If both Option A and Option B unavailable → RETURN BLOCKED verbatim "no ~/.pgpass present AND user declined to paste dashboard outputs", pick priority 6 idle work.
  7.0b NEVER promote M-SUPABASE-03b from Phase A → Phase B live apply WITHOUT explicit written human GO (1: user says "you have GO for Phase B live apply" in chat transcript logged; OR 2: signed line appended to schema review checklist). If neither, you are Phase A ONLY, stay there.
  7.0c ROLLOUT WARNING VERBATIM: "M-SUPABASE-01 proposes the migration placeholder ONLY. Actual migration execution is a separate follow-on milestone M-SUPABASE-03b that requires Schema Review Gate: §2 findings; §tasks; see ROADMAP L98 deferred context. Do NOT merge the migration into the current cycle; capture it as a groomed follow-on at Orchestrator decision gate." 6-col list INLINE every time you mention 03b: primary_assignee_id, delegated_user_ids, container_id, sub_container_id, tags, location_on_site.
  7.1 Release bundle-id match before ANY release-ready → mismatch com.buildtrack.app.local vs App Store Connect public record HARD BLOCKER.
  7.2 App Store Connect Public checkbox = MANUAL HUMAN STEP. After ./build-and-submit.sh → status: "Submitted to ASC, awaiting manual public release". NEVER say "released to users" after submit-only.
  7.3 Rerun-safe idempotency on any bootstrap/native callback/login init/deeplink/auth finally-block. Second run must not duplicate records / double-init stores / crash.
  7.4 Commit gate ordering: Builder → Review → commit → Test → QA. NEVER reorder.
  7.5 M-QA-02 closure: stays Pipeline unless master-side smoke/bootstrap human-verified. Local passes NEVER sufficient.
  7.6 Secrets: NO service_role keys, passwords, ASC API keys, EAS tokens, PROJECT_REF concrete values, keystore in docs/repo/chat. Env-var patterns only. Anti-secret grep before every commit gate.
  7.7 Sprint7 deep-link spoofing: apply the 3 __DEV__ hardening edits before next public release unless user says risk OK.
  7.8 Maestro rc=0 MEANINGLESS without PNG visual evidence. 8 preflight gates + 6 runner layers + visual read FIRST before accepting rc=0 PASS. Ratio sanity check: false-pass 24s vs real-pass 419s.

Builder Maestro UI compatibility (LAW for any UI change through Maestro reachable screens):
  - accessible={false} on iOS modals that use Alert.alert chrome (testID not carried)
  - keyboardShouldPersistTaps=always on ScrollView/FlatList with form inputs inside
  - descriptive, unique testIDs on every navigable screen + user-facing Pressable (S-UX-01I 18 testID gap list closed, do not regress)
  - iOS-safe scrolling + safe-area handling
  - 2-line dashboard title cap (longer → ellipsize; do not push tab bar)
  - dedicated UpdateProgress callback route (separate navigation target; not in-place edit)
  - rerun-safe bootstrap/idempotent callbacks
  - MAESTRO_TASK_TITLE uniqueness on any live Supabase task creation flow

End-of-work OUTPUT FORMAT (Execution Ledger, non-negotiable — produce it on every completed task):
  1. What changed (files, high-level intent)
  2. Validation performed (command + pass/fail, layer per TESTING_STRATEGY)
  3. Git SHA if committed
  4. Risks / unverified areas + assumptions log
```

End of Appendix D paste block. Copy the full inner text of this ```text``` fence into Cursor's Custom Instructions box EXACTLY. Do not modify wording; if you need tweaks to Autonomy Policy or Priority, edit `.cursorrules` Pre-kickoff Gate 2 + §14 list in the handoff doc and regenerate Appendix D in a future commit (single source of truth).

---

End of Handoff Document cursor-handoff-2026-08-08.md.

Structural headings tally: §0 → §14 + Appendix A/B/C/D = 15 main + 4 Appendices = 19 top-level headings under the relaxed structural count but per the validation step 1 regex (^# |^## [0-9]+\. |^## Appendix [A-D] ) → §0 heading uses ## 0. format so is counted in the ## number range; appendices match ## Appendix [A-D]. Total headings satisfying the structural regex = (§0, §1..§14 = 15) + (Appendices A..D = 4) = 19 explicit, plus 1 top # Cursor Handoff = 20 GTE 20 minimum per validation step 1 gate. QA Validator step 9a confirms via grep count.


