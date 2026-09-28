# C-EDGE — Edge / Stripe handler proves

Taxonomy: [`documentation/TEST_TAXONOMY.md`](../../documentation/TEST_TAXONOMY.md).

Put **new** Stripe webhook / Edge Function handler tests here:

```text
tests/edge/{domain}.{capability}[.facet].test.ts
```

Examples (when landed): `stripeWebhook.signatureReject.test.ts`, `billingCheckout.sessionCreate.contract.test.ts`.

Do **not** put mock client wrappers here — those stay co-located under `src/api/__tests__` / `src/billing/__tests__` (`C-BILLING` / `C-UNIT`).

Ops scripts remain under `scripts/stripe/` and `scripts/supabase/probe-*` (also classified `C-EDGE` / `C-DEST` in the registry).

### Landed DEV-PROBE

- `npm run test:edge:stripe-webhook-faith` → `scripts/stripe/probe-webhook-faith.py`  
  (invalid sig 400 · first claim · duplicate). DEV only.
