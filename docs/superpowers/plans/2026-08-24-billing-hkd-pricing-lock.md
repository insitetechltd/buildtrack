# Billing — HK pricing lock (2026-08-24)

**Status:** **LOCKED**

## List prices (HKD / month)

| Tier | HK$/mo | Stripe slug (until catalog rename) | Caps (contract target) |
|---|---|---|---|
| **Starter** | **160** | `growth` | 3 projects · 300 entries/mo · 10 GB · 1 PM + 5 workers |
| **Pro** | **400** | `unlimited` | 12 projects · 800 entries/mo · 30 GB · 2 PM + 10 workers |

| Add-on | HK$/mo | Slug |
|---|---|---|
| Worker pack (+5) | **20** | `addon_worker_pack` |
| PM / manager seat (+1) | **100** | `addon_pm_seat` |

## Product law (locked same session)

- **Unlimited** base tier **retired from sale**; Pro replaces it at HK$400.
- **No default Stripe native trial** — free time via **owner web admin promotion codes only** (not mobile, not tenant admin).
- **Seat steppers** below tier cards on Company Plan (universal add-ons).
- **Geo pricing:** HKD only for first market; other locales tabled.
- **Legacy USD subs** grandfather until migrated.

## Implementation follow-ups (Human Gate / build)

1. Stripe HKD Prices + `plan_prices` rows (`currency=hkd`, amounts 16000 / 40000 cents).
2. `plan_price_meters` aligned to caps table above.
3. Remove `trial_period_days` from checkout; enable promotion codes on session.
4. Owner web admin: mint single-use promo codes.
5. Company Plan UI: compact cards + stepper block (build slice).

## Code SoT

- Display constants: `src/billing/orgPlans.ts`
- Company Plan cards: `src/billing/companyPlanOptions.ts`
