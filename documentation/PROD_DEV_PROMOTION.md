# Prod ↔ Dev promotion (M-OPS-ENV-01)

**Locked topology:** current daily work = **DEV** (`insite-dev` / `zusulknbhaumougqckec`). Empty commercial plane = **PROD** (`insite-prod` / `jcnzjigxgkzhjsaekoqz`).  
**Never** copy tenant rows DEV → PROD. Stripe **live** only on PROD / App Store — never on daily TF.

### Stripe ↔ DB pairing (hard law)

| Plane | Supabase | Stripe | Typical builds |
|---|---|---|---|
| **Testing** | **DEV** `zusulknbhaumougqckec` | **`sk_test` / `pk_test`** | Metro, sim, Maestro, `production-local`, `preview` |
| **Commercial** | **PROD** `jcnzjigxgkzhjsaekoqz` | **`sk_live` / `pk_live`** | `eas build --profile production` (App Store only) |

Do **not** mix (DEV+live or PROD+test). Edge `create-checkout-session` / `stripe-webhook` derive livemode from `STRIPE_SECRET_KEY` and only match `plan_prices.livemode` for that mode. Client catalog prefers rows via `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` (`pk_test` → test rows, `pk_live` → live rows).

`scripts/supabase/sync-stripe-secrets.sh` enforces: DEV↔`sk_test`, PROD↔`sk_live` (+ `APP_STORE_STRIPE_GO=1`).

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

| Build profile | EAS `environment` | Supabase | Stripe |
|---|---|---|---|
| `preview`, `simulator`, **`production-local`** | `preview` | **DEV** | **test** (`pk_test` in EAS + DEV Edge `sk_test`) |
| `expo-go` | `development` | **DEV** | **test** |
| **`production`** (App Store) | `production` | **PROD** | **live** (`pk_live` in EAS + PROD Edge `sk_live`) |

Sync keys (values not printed):

```bash
bash scripts/eas/sync-supabase-env-to-eas.sh   # also syncs publishable keys when present
eas env:list --environment preview
eas env:list --environment production
```

Local `.env` stays **DEV + sk_test/pk_test** for Metro / sim. In-flight TestFlight builds keep whatever was baked at build time; **next** `production-local` build picks up EAS `preview` → DEV + test Stripe.

---

## Deploy script contract

- Prefer explicit `--project-ref <ref>`.
- `--use-env` allowed only when `.env` is DEV (refuses PROD).
- Full PROD edge: `scripts/supabase/deploy-edge-to-project.sh --project-ref jcnzjigxgkzhjsaekoqz`
- Full PROD migrations: `scripts/supabase/apply-migrations-to-project.sh --project-ref jcnzjigxgkzhjsaekoqz --env-file .cache/env-cutover/insite-prod.env.local`

Maestro / CI: **DEV only** — never clearState against PROD.
