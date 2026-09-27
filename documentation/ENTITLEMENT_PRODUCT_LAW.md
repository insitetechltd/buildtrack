# Entitlement product law (fail-open / fail-closed)

**SoT for billing access gates in Taskr.** Blind-spot S7 (2026-09-27).  
Code anchors: `src/billing/companyPlanGate.ts`, `src/navigation/CompanyPlanSelectionGate.tsx`, `src/state/authStore.ts` (`requiresCompanyPlanSelection`).

Literal “block every unpaid request” is **not** the product. Gates are **actor-scoped**.

---

## Law table

| Situation | Actor | Intended behavior | Mode | Enforcement today |
|---|---|---|---|---|
| New company founder after signup / Create Company | Founding CA | Must complete Stripe Checkout (active or trialing) before MainTabs | **FAIL-CLOSED** | `requiresCompanyPlanSelection` → `CompanyPlanSelectionGate` until `companyHasPaidStripePlan` |
| Founder with `hasStripeSubscription` + status `active` \| `trialing` | Founding CA | Unlock app | PASS | `companyHasPaidStripePlan` |
| Founder with Stripe sub `past_due` \| `canceled` \| other | Founding CA | Stay on Company Plan (do not unlock) | **FAIL-CLOSED** | Same gate |
| Entitlement / `billing-subscription-status` fetch fails during founder check | Founding CA | Stay gated (do not unlock) | **FAIL-CLOSED** | Gate clears only on positive `companyHasPaidStripePlan` |
| Existing PM / Worker / CA already in app (not in founder gate) | Field / CA | Task list, create, update, photos continue even if billing Edge is down or sub lapses | **FAIL-OPEN** (task access) | No MainTabs hard-block on `billing-subscription-status` |
| Invite / seat over-cap | CA inviting | Cap enforced at invite / seat math | **FAIL-CLOSED** (invite) | Seat limits + Edge invite (see seatUsage / inviteUser) |
| Last company admin demote | CA | Block demote of sole admin | **FAIL-CLOSED** | DB trigger `users_guard_last_admin` (O4) |
| Cross-company / cross-project data | Any JWT | Deny | **FAIL-CLOSED** | RLS F6/F7 (p-matrix) |

---

## Explicit non-goals (accepted risk)

1. **No global “subscription lapsed → lock all tasks”** for non-founder sessions in this ship. Soft commercial follow-up may add warnings; hard lockout needs a product decision + migration plan.
2. **A-PR03 live Checkout** remains Human/Exempt for real cards; DEV prove uses Stripe test mode (`test:edge:signup-happy-path`).
3. **Owner/hq** entitlements are out of Taskr root Jest.

---

## Jest contract

- Pure gate: `src/billing/__tests__/companyPlanGate.test.ts`
- Founder sticky-gate clearing on logout / non-founder session: `src/state/__tests__/authStore.test.ts`
- Navigator surfaces gate: `src/navigation/__tests__/AppNavigator.companyPlanGate.test.tsx`

When changing unlock criteria, update **this file first**, then tests, then UI.
