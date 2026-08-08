# Workflow: Release / Deploy / Build-Readiness (SOLO-style for Cursor)

Use this rule file when the task touches: build, deployment, environment, versioning, store submission, release readiness.

## 1. Milestone Gate (MANDATORY first action)
Read AGENTS.md Current Delivery Status + documentation/ROADMAP.md milestone ledger. Cross-check milestone gate status BEFORE marking anything release-ready.

DO NOT close WS-QA/M-QA-02 or M-QA-03 as released just because local builds pass. Re-verify master-side bootstrap wrap-up status per AGENTS.md ledger first.

## 2. Autonomy Policy Assessment
RELEASE / DEPLOY / VERSION / BUILD# / SUBMIT decisions → ALWAYS a user question required. Never auto-decide.

## 3. Workflow Order

**Phase A — Plan (if scope unclear)**
Output: release scope, affected config files, blockers vs advisory items, prerequisites checklist, validation plan.
- Read: package.json, app.json, eas.json, patches/, root build scripts, documentation/release-related docs
- Read: build-and-release.md project-context rule (.trae/rules/)

**Phase B — Review (pre-build config audit)**
Checklist:
1. app.json → eas.json → App Store Connect bundle identifiers MATCH (mismatch = HARD BLOCKER)
2. Expo SDK / RN version consistent across package.json + app.json expo install config + patches/
3. Permissions: iOS Info.plist entries + Android manifest match features used
4. Build numbers / runtime versions: monotonic, no collisions with prior released versions
5. Env vars: EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY present in intended release env
6. Supabase service-account setup: documented, NO secrets committed anywhere
7. Privacy-policy URL + credentials references: present and valid for store review
8. Rerun-safe bootstrap callbacks: idempotent, no data-loss on repeat apply

Block if any Hard Blocker. Mark advisory items separately.

**Phase C — [COMMIT GATE only if any files changed]**
Only after 0 C/H findings. `chore(release):` or `build(eas):` scope.

**Phase D — Test (release-readiness evidence)**
1. Jest smoke: test:regression baseline (37/160 is Sprint7 M-QA-03 baseline)
2. Maestro bootstrap evidence: run-local.sh for launch-smoke + open-dev-settings + initialize-sandbox (3/3 rc=0 with visual PNG read = 24s false vs 419s real ratio sanity check)
3. TypeScript: npx tsc --noEmit rc=0

**Phase E — QA Validate (if release includes user-visible flow changes)**
Native simulator run for rubric scenarios. Figma cross-check if WS-UX/M-UX-01 release.

**Phase F — Release Manager Close**
Final status: READY / BLOCKED / CONDITIONALLY READY with explicit blockers list.

Hard safety:
- NEVER mark "released to public" after ASC submit-only step. Only ASC human ticks Public checkbox. Correct phrase: "Submitted to ASC, awaiting manual public release".
- Version bumps / build#s: only if release task explicitly scoped, and user approved.
- gh-cli for milestone/tag/PR sync if scoped.

## 4. Release-Specific Anti-Patterns (hard block if present)
1. Build identifiers changed outside release scope
2. Expo SDK version bumped outside release scope
3. Dependency strategy changed (new package, major bump) without documented upgrade plan
4. Credentials / keystore material referenced in code or docs (must be env-only)

## 5. Final Output Format
```
=== RELEASE EXECUTION LEDGER ===
Objective:
Config files inspected:
Hard blockers: (count + list)
Advisory items:
Validation run: (Jest/Maestro/tsc results)
Release status: READY / BLOCKED / CONDITIONALLY READY
Next step:
```
