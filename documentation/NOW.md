# NOW — session continuity

**SOP:** git-tracked NOW + **full cycle** in `~/.cursor/skills/solo-dev-harness/SOP.md`.

---

## Doing

**Priority #1 — commercial spine:** **`M-OPS-ENV-01` Closed (2026-08-29)** Phases A–C. DEV=`insite-dev` / `zusulknbhaumougqckec`; PROD=`insite-prod` / `jcnzjigxgkzhjsaekoqz`. Daily TF / **`dev`** → EAS `preview` → **DEV**. App Store profile **`production`** → **PROD** (requires confirm). Promotion: `documentation/PROD_DEV_PROMOTION.md`. **Next spine:** App Store submit → Stripe live on PROD (ENV Phase D) → finish `M-OPS-03` parked writes → `M-AUTHZ-02` → …

**This session:** Taskr **Create Task keyboard** + **prod picker HUD mute** landing on git; Internal TF submitting (`dev` / DEV). HQ **Home landing** mockups done, **not implemented**. HQ A3–A5 still uncommitted.
- Keyboard: action bar rides above the IME; headed smoke PASS on 17 Pro Max
- HUD: Metro/`__DEV__` only; `eas.json` production sets `EXPO_PUBLIC_LIBRARY_PICKER_TIMING_HUD=0`
- Mocks: `.dbg/hq-home-healthy-mock.png` · `.dbg/hq-home-emergency-mock.png`
- Awaiting **implement** GO for `OwnerHomeScreen`
- A3–A5 (effective status / title search / parity Jest) still in working tree; Edge already on DEV

**Prior this session:** **M-OPS-03** HQ task-query contract A3–A5 implemented (repo + DEV Edge). A1/A2 already shipped. **Not committed** (user did not ask).
- Contract SoT: `documentation/owner-task-query-contract.md`
- A3 `TASK_EFFECTIVE_STATUS`: Taskr 8 read-maps + HQ list/detail/project buckets; Edge `listTasks` status filter uses PostgREST `status ?? current_status`
- A4 HQ `TaskListPane`: placeholder “Search by title”; submit-only Edge search; no client-side assignee/project/status filter
- A5: `src/__tests__/parity/task-query-contract.parity.test.ts` T1–T7 dual-impl
- Edge `owner-tenant-read` redeployed DEV `zusulknbhaumougqckec` (includes `taskQueryPredicates.ts`)
- Schema smoke PASS; JWT/`listTasks.statusFilter` smoke SKIPPED (no `SMOKE_OWNER_EMAIL` in env)
- HQ Internal TF **12** does **not** include A3–A5 client UI — next TF when asked

**You:** say **commit** when you want this slice on git; optional headed HQ after next Internal TF (search-by-title + User→Tasks relation roles). Parked writes still Human Gate.

**Idle-parallel photo funnel:** Camera **zoom** (pinch + 1×/2×) in capture session — EV parked. TF240 Accept defer + 1920 export; warm/ID batch **30 → 90** (JS). **Picker L1 HUD is Metro/`__DEV__` only** (muted on App Store `production` compiles). HQ thumbs + tile grip parked. **Not** the App Store binary.

## Next (definitive)

1. Optional: JWT smoke (`SMOKE_OWNER_EMAIL` + password) for `listTasks.statusFilter`; HQ headed on next Internal TF
2. User-requested **commit** of HQ A3–A5 (then default push)
3. Headed HQ: Monitoring ops panel + Economics Stripe empty/configured + Audit + Find user + support/session
4. **GTM locked (2026-08-30):** store name **A**; promo **60d**; domain **www.insiteworks.co**; ASC paste **after new screenshots**. Plan: `docs/superpowers/plans/2026-08-30-taskr-soft-launch-gtm.md`

**Parked:** soft suspend / resend invite / entitlement override / company freeze / §3e purge / cost ledger writes → **M-OPS-03** future. **M-BILL-F**; **M-BILL-01G**; **M-AI-01 build**; **M-DAILY-01**; **M-SEC-03**; **`M-CAPTURE-01` / `M-CAPTURE-02` tabled**.

## Recently closed / shipped this session

**M-OPS-03 task-query A3–A5 (2026-09-01, uncommitted):** effective status + title-only HQ search + parity Jest. Edge deployed DEV.

**Quality Loop SOP + intake gate (2026-08-30):** dual-write to `solo-dev-harness` SOP §11–12 + `intake.md` + always-on `intake-gate.mdc`. Commit after Judge GO. User is not required to fill a kickoff template.

**M-OPS-03 read-only ops enrich (2026-08-30):** no migrations; Edge `owner-ops-read` + hq surfaces.

## Locked

- **Master plan:** visual SoT = `documentation/ROADMAP.md` § Commercial sequence map
- **Env:** current = DEV; new = PROD; TF daily = DEV; Stripe live @ submit
- **Owner task query contract:** `documentation/owner-task-query-contract.md` — assigner owns (`assigned_by`); assignee executes; `primary_assignee_id` is assignee
- **HK billing:** charge HKD; no grandfathering
- **ACL:** CA authority; default seat Worker; PA on CA|PM only
- **AUTHZ-RC construct:** Closed
- **Project status `on_hold`:** dormant reserved DB CHECK slot

## Sims / locks

- Sims: (none claimed)

## Parked notes

Optional AUTHZ L2 matrix gaps = backlog. **Later camera/picker phase:** zoom, tile grip, HQ/opportunistic thumbs.
