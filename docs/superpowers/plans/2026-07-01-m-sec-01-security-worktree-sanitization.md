# M-SEC-01 Security & Worktree Sanitization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Quarantine machine-local and secret-bearing artifacts, remove them from git tracking, and migrate build credentials usage to environment injection (no hardcoded account values in tracked docs/config).

**Architecture:** Tighten `.gitignore` to cover known sensitive directories, remove currently tracked sensitive files from the git index without deleting local copies, sanitize documentation to placeholders only, and strip hardcoded Apple identity from `eas.json` so builds depend on injected environment variables or EAS secrets.

**Tech Stack:** Expo, EAS (`eas.json`), Git, Markdown docs.

---

## File Structure

**Config**
- Modify: `.gitignore`
- Modify: `eas.json`

**Docs**
- Modify: `documentation/APPLE_CREDENTIALS_CONFIG.md`

**Artifacts**
- Untrack (keep local): `eas-keystores/*` (credentials + logs)
- Untrack (keep local): `google certificates/*` (if present)
- Untrack (keep local): `.superpowers/**` (tool logs/state)

## Task 1: Inventory And Freeze The Sensitive Surface

**Files:**
- Verify: `.gitignore`
- Verify: `eas-keystores/`
- Verify: `google certificates/`
- Verify: `.superpowers/`

- [ ] **Step 1: List tracked files under sensitive directories**

Run:

```bash
git ls-files eas-keystores "google certificates" .superpowers
```

Expected:

```text
Any listed files are currently tracked and must be removed from the index.
```

- [ ] **Step 2: Snapshot current Apple identifier leaks in tracked docs/config**

Run (example patterns; use the exact values present in the repo):

```bash
rg -n "EXPO_APPLE_ID|EXPO_APPLE_TEAM_ID|Your current Team ID|Your current setup:|Apple ID\\s*:" documentation/APPLE_CREDENTIALS_CONFIG.md eas.json
```

Expected:

```text
Matches point to concrete values that must be converted to placeholders.
```

## Task 2: Quarantine Policy (Ignore Rules)

**Files:**
- Modify: `.gitignore`

- [ ] **Step 1: Add ignore coverage for the missing directories**

Add patterns:

```gitignore
# EAS local keystore exports and logs (never commit)
eas-keystores/

# Local tooling state/logs
.superpowers/

# Local certificate export folder (never commit)
google certificates/
google certificates/**
```

- [ ] **Step 2: Verify ignores apply**

Run:

```bash
git check-ignore -v eas-keystores/credentials-production.json || true
git check-ignore -v "google certificates/keystore-upload.properties" || true
git check-ignore -v .superpowers/brainstorm || true
```

Expected:

```text
Each prints the matching .gitignore rule.
```

- [ ] **Step 3: Commit ignore policy**

```bash
git add .gitignore
git commit -m "chore(sec): quarantine local keystores and tool logs"
```

## Task 3: Env Injection For Apple Identity (No Hardcoded Values)

**Files:**
- Modify: `eas.json`

- [ ] **Step 1: Remove hardcoded Apple values from `production-local`**

Replace:

```json
"env": {
  "EXPO_APPLE_ID": "...",
  "EXPO_APPLE_TEAM_ID": "..."
}
```

With a non-sensitive env block (or remove the block entirely if it only contained those values). Keep non-sensitive build flags intact.

- [ ] **Step 2: Add guidance comment via structure (not comments)**

Do not add comments. Keep the file self-evident by removing the sensitive keys and letting docs explain injection.

- [ ] **Step 3: Commit `eas.json` change**

```bash
git add eas.json
git commit -m "chore(sec): remove hardcoded apple identity from eas profiles"
```

## Task 4: Sanitize Apple Credentials Documentation

**Files:**
- Modify: `documentation/APPLE_CREDENTIALS_CONFIG.md`

- [ ] **Step 1: Remove any real Apple IDs, team IDs, and “current configuration” blocks**

Replace with placeholders:

```text
EXPO_APPLE_ID=your-apple-id@example.com
EXPO_APPLE_TEAM_ID=YOURTEAMID
```

Remove:
- “Your current Team ID: …”
- “Current Configuration” section with real values
- any commands that export real IDs

- [ ] **Step 2: Update instructions that tell users to edit `eas.json`**

Replace “Also update eas.json” steps with:
- set env vars locally (gitignored `.env`)
- or configure EAS project secrets / CI secrets

- [ ] **Step 3: Commit doc sanitization**

```bash
git add documentation/APPLE_CREDENTIALS_CONFIG.md
git commit -m "docs(sec): sanitize apple credentials runbook"
```

## Task 5: Remove Sensitive Artifacts From Git Index (Keep Local Copies)

**Files:**
- Untrack: `eas-keystores/**`
- Untrack: `google certificates/**`
- Untrack: `.superpowers/**`

- [ ] **Step 1: Remove from the index only**

Run:

```bash
git rm -r --cached eas-keystores .superpowers "google certificates" || true
```

- [ ] **Step 2: Verify files remain on disk but are no longer tracked**

Run:

```bash
ls -la eas-keystores || true
ls -la "google certificates" || true
ls -la .superpowers || true
git ls-files eas-keystores "google certificates" .superpowers
```

Expected:

```text
`ls` shows local files remain; `git ls-files` shows no tracked entries.
```

- [ ] **Step 3: Commit index cleanup**

```bash
git add -A
git commit -m "chore(sec): remove local secret artifacts from repository"
```

## Task 6: Verification Gate And Closure

**Files:**
- Verify: `.gitignore`
- Verify: `eas.json`
- Verify: `documentation/APPLE_CREDENTIALS_CONFIG.md`

- [ ] **Step 1: Repo-wide secret leak scan for Apple identity fields**

Run:

```bash
rg -n "EXPO_APPLE_ID\\s*=|EXPO_APPLE_TEAM_ID\\s*=|Apple ID\\s*:\\s*[^\\s]+|Team ID\\s*:\\s*[^\\s]+" . || true
```

Expected:

```text
Only placeholder examples remain; no real values remain in tracked content.
```

- [ ] **Step 2: Ensure the sensitive directories are ignored**

Run:

```bash
git check-ignore -v eas-keystores/credentials-production.json || true
git check-ignore -v "google certificates/keystore-upload.properties" || true
git check-ignore -v .superpowers/brainstorm || true
```

- [ ] **Step 3: Worktree sanity**

Run:

```bash
git status --short
```

Expected:

```text
Clean worktree.
```

- [ ] **Step 4: Close milestone**

```text
M-SEC-01 closed:
- no tracked local keystore exports/logs
- no tracked tool logs/state
- Apple identity comes only from env injection or EAS/CI secrets
```
