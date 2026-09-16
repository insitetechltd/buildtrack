# DEV≡PROD schema parity (promote-up standard model)

**Date:** 2026-09-15  
**Status:** Executed 2026-09-15 — `test:schema-parity` PASS; DEV QA seeded  
**Refs:** PROD SoT `jcnzjigxgkzhjsaekoqz` · DEV `zusulknbhaumougqckec` (rebuild target)  
**Non-goal:** Copy PROD customer/tenant rows onto DEV · change PROD schema · live Stripe on DEV

---

## 1. Why (replace last month’s mistake)

Last month: empty PROD + evolved DEV → dialect drift → dual-path + Metro→PROD rituals.  
**Standard model:** destination-shaped DEV → prove on DEV → promote same artifacts to PROD. Keys/secrets are the plane diff.

**Locks**

- All DEV data is **non-essential** and may be wiped.
- PROD **schema** is SoT for the rebuild (not git history alone if live PROD drifted).
- No PROD tenant/PII clone — DEV gets **QA seed** after schema restore.
- Stripe stays `sk_test` on DEV / `sk_live` on PROD.
- After cut: Maestro/CI default stays on DEV; DEV green is destination-shaped **iff** drift gate PASS.

---

## 2. Cutover steps

| Step | Action | Prove |
|---|---|---|
| 0 | Write this plan + update NOW | — |
| 1 | Fingerprint live PROD vs DEV (tables/columns) → baseline gap artifact | JSON/MD redacted |
| 2 | `pg_dump --schema-only` from PROD (public + auth hooks as needed; no data) | dump file gitignored |
| 3 | Snapshot DEV connection; **nuke** DEV `public` (and dependent app schemas as required) | confirm empty |
| 4 | Restore PROD schema dump onto DEV | psql rc=0 |
| 5 | Ensure `schema_migrations` (or Supabase equivalent) ledger present on DEV; record PROD fingerprint id | query |
| 6 | Seed DEV Maestro QA (John/Alice + Project A or Sara-class) | ensure script |
| 7 | Drift script: `npm run test:schema-parity` DEV≡PROD fingerprint | PASS |
| 8 | Smoke: P-matrix DEV + `ONLY=H01` Maestro on DEV | PASS or known residuals |
| 9 | Rewrite `documentation/PROD_DEV_PROMOTION.md`: promote-up law; demote dual-path lifestyle | docs |
| 10 | Park dual-path removal as follow-up once app assumes NEW-only | backlog |

---

## 3. Ongoing law (after cut)

```text
edit → migrate/Edge on DEV → Maestro/JWT on DEV → fingerprint DEV≡PROD
  → apply same migration/Edge SHA to PROD → done
```

- **No dashboard SQL** on either plane.
- **No PROD-only hotfix** without same-day reverse-port to DEV.
- Drift gate FAIL ⇒ cannot claim “DEV proves PROD.”

---

## 4. Risks

| Risk | Mitigation |
|---|---|
| Dump misses extensions / storage policies | Include extensions; re-apply storage migration if needed |
| Auth/`auth.users` empty after nuke | Seed via ensure scripts + Auth admin API |
| Repo `supabase/migrations` ≠ live PROD | Live dump wins for rebuild; then realign migration ledger |
| Accidental PROD write | All wipe/restore scripts hard-refuse PROD ref |
| Edge secrets | Leave DEV Stripe test; do not copy live secrets |

---

## 5. Acceptance

- [ ] DEV public schema fingerprint matches PROD (critical tables/columns)
- [ ] DEV has no dependency on pre-nuke tenant data
- [ ] Maestro dual-user seed works on rebuilt DEV
- [ ] Promotion doc states standard promote-up model
- [ ] PROD untouched (schema + data)
