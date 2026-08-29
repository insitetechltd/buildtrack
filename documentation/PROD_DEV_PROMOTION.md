# Prod ↔ Dev promotion (M-OPS-ENV-01)

**Locked topology:** current daily work = **DEV** (`insite-dev` / `zusulknbhaumougqckec`). Empty commercial plane = **PROD** (`insite-prod` / `jcnzjigxgkzhjsaekoqz`).  
**Never** copy tenant rows DEV → PROD. Stripe **live** only at App Store submit.

Cutover plan: [`docs/superpowers/plans/2026-08-26-prod-dev-supabase-split.md`](../docs/superpowers/plans/2026-08-26-prod-dev-supabase-split.md)

---

## How a DEV change reaches PROD

There is **no automatic sync**. Each layer is promoted deliberately:

| What you changed on DEV | How it gets to PROD |
|---|---|
| **App code** (screens, stores, RN) | Ship a build whose EAS env is `production` → profile **`production`** (App Store). Daily TF uses **`production-local`** / **`preview`** → EAS env `preview` → **DEV**. |
| **SQL schema / RLS** | Add file under `supabase/migrations/`. Apply to DEV while iterating. When ready: apply the **same file(s)** to PROD with `scripts/supabase/apply-migrations-to-project.sh --project-ref jcnzjigxgkzhjsaekoqz --env-file .cache/env-cutover/insite-prod.env.local` (or `--from` resume). Human Gate for risky DDL. |
| **Edge Functions** | Deploy to DEV with `--project-ref zusulknbhaumougqckec` or `--use-env`. When ready: `bash scripts/supabase/deploy-edge-to-project.sh --project-ref jcnzjigxgkzhjsaekoqz`. |
| **Edge secrets** (Stripe, etc.) | DEV: `sk_test` via `sync-stripe-secrets.sh --use-env`. PROD live: only at App Store submit (`sk_live` + webhook) — separate GO. |
| **Billing catalog rows** | Re-run catalog bootstrap/sync **against PROD** (or insert livemode prices at submit). Do not dump DEV `plan_prices` blindly if they are test-mode Stripe IDs. |
| **Storage objects / tenants** | **Do not copy.** PROD starts empty; real customers create data on PROD. |

```text
  edit on DEV ──► verify (sim / Maestro / TF) ──► promote artifacts ──► PROD
                       │                              │
                       │                              ├─ migrations apply (SQL)
                       │                              ├─ edge deploy (functions)
                       │                              └─ app binary (EAS production)
                       └─ stay on DEV for daily TF
```

---

## EAS environment map (Phase C)

| Build profile | EAS `environment` | Supabase |
|---|---|---|
| `preview`, `simulator`, **`production-local`** | `preview` | **DEV** |
| `expo-go` | `development` | **DEV** |
| **`production`** (App Store) | `production` | **PROD** |

Sync keys (values not printed):

```bash
bash scripts/eas/sync-supabase-env-to-eas.sh
eas env:list --environment preview
eas env:list --environment production
```

Local `.env` stays **DEV** for Metro / sim. In-flight TestFlight builds keep whatever URL was baked at build time; **next** `production-local` build picks up EAS `preview` → DEV.

---

## Deploy script contract

- Prefer explicit `--project-ref <ref>`.
- `--use-env` allowed only when `.env` is DEV (refuses PROD).
- Full PROD edge: `scripts/supabase/deploy-edge-to-project.sh --project-ref jcnzjigxgkzhjsaekoqz`
- Full PROD migrations: `scripts/supabase/apply-migrations-to-project.sh --project-ref jcnzjigxgkzhjsaekoqz --env-file .cache/env-cutover/insite-prod.env.local`

Maestro / CI: **DEV only** — never clearState against PROD.
