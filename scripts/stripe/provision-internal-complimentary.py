#!/usr/bin/env python3
"""Provision hidden Stripe $0 complimentary plan + attach a company (option B).

- Stripe Product/Price: lookup taskr_internal_complimentary_hkd_monthly (HK$0/mo)
- DB: plan_tiers.slug=internal_complimentary + plan_prices is_sellable=false
- Never appears on signup (is_sellable=false; not in supabase-config.js catalog)
- Creates a real Stripe Customer+Subscription so billing.html can load status

Default: dry-run. Apply with --apply.
Default company: Insite Test Ltd. on PROD (override via env).

Usage:
  python3 scripts/stripe/provision-internal-complimentary.py \\
    --env-file .cache/env-cutover/insite-prod.env.local \\
    --stripe-env-file .cache/env-cutover/insite-prod-stripe.env.local
  python3 scripts/stripe/provision-internal-complimentary.py ... --apply
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
import uuid
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

LOOKUP = "taskr_internal_complimentary_hkd_monthly"
TIER_SLUG = "internal_complimentary"
TIER_DISPLAY = "Internal complimentary"
PRODUCT_NAME = "Taskr Internal Complimentary"
PRODUCT_DESC = (
    "Hidden internal / App Review entitlements. HK$0. Not sellable on signup."
)

# Match Pro caps so Insite Test keeps current seat/project limits.
METERS = {
    "pm_seats": 3,
    "worker_seats": 15,
    "projects": 12,
    "entries_monthly": 800,
    "storage_bytes": 30 * 1024 * 1024 * 1024,
}

DEFAULT_COMPANY_ID = "27c0612d-fb8e-4444-bcf4-545228a763a8"
DEFAULT_ADMIN_EMAIL = "sara@insitetest.com"


def load_env(path: Path) -> dict[str, str]:
    env: dict[str, str] = {}
    if not path.is_file():
        return env
    for line in path.read_text().splitlines():
        s = line.strip()
        if not s or s.startswith("#") or "=" not in s:
            continue
        k, v = s.split("=", 1)
        env[k.strip()] = v.strip().strip('"').strip("'")
    return env


def http_json(
    method: str,
    url: str,
    headers: dict[str, str],
    body: dict | list | None = None,
    prefer: str | None = None,
) -> tuple[int, object]:
    data = None
    hdrs = dict(headers)
    if prefer:
        hdrs["Prefer"] = prefer
    if body is not None:
        data = json.dumps(body).encode()
        hdrs["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=data, headers=hdrs, method=method)
    try:
        with urllib.request.urlopen(req, timeout=45) as resp:
            text = resp.read().decode()
            return resp.status, (json.loads(text) if text else None)
    except urllib.error.HTTPError as e:
        text = e.read().decode()
        try:
            payload = json.loads(text) if text else {"message": text}
        except json.JSONDecodeError:
            payload = {"message": text}
        return e.code, payload


def stripe(secret: str, method: str, path: str, form: dict | None = None) -> dict:
    data = None
    headers = {"Authorization": f"Bearer {secret}"}
    url = f"https://api.stripe.com{path}"
    if form is not None:
        data = urllib.parse.urlencode(form).encode()
        headers["Content-Type"] = "application/x-www-form-urlencoded"
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=45) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as exc:
        body = exc.read().decode()[:1200]
        raise SystemExit(f"Stripe HTTP {exc.code} {method} {path}\n{body}") from exc


def find_price(secret: str, lookup: str) -> dict | None:
    q = urllib.parse.urlencode({"lookup_keys[]": lookup, "limit": 1, "expand[]": "data.product"})
    payload = stripe(secret, "GET", f"/v1/prices?{q}")
    data = payload.get("data") or []
    return data[0] if data else None


def ensure_stripe_price(secret: str, *, apply: bool) -> dict:
    existing = find_price(secret, LOOKUP)
    if existing:
        print(f"  stripe price reuse id={existing['id']} amount={existing.get('unit_amount')}")
        return existing
    print(f"  stripe price missing lookup={LOOKUP}")
    if not apply:
        return {"id": "price_DRYRUN", "unit_amount": 0, "livemode": True}
    product = stripe(
        secret,
        "POST",
        "/v1/products",
        {
            "name": PRODUCT_NAME,
            "description": PRODUCT_DESC,
            "metadata[taskr_sku]": LOOKUP,
            "metadata[taskr_tier_slug]": TIER_SLUG,
            "metadata[taskr_internal]": "complimentary",
        },
    )
    price = stripe(
        secret,
        "POST",
        "/v1/prices",
        {
            "product": product["id"],
            "currency": "hkd",
            "unit_amount": "0",
            "recurring[interval]": "month",
            "lookup_key": LOOKUP,
            "metadata[taskr_sku]": LOOKUP,
            "metadata[taskr_tier_slug]": TIER_SLUG,
            "metadata[taskr_internal]": "complimentary",
        },
    )
    print(f"  stripe price created id={price['id']} product={product['id']}")
    return price


def rest_headers(anon_or_sr: str) -> dict[str, str]:
    return {
        "apikey": anon_or_sr,
        "Authorization": f"Bearer {anon_or_sr}",
        "Accept": "application/json",
    }


def ensure_tier(supabase_url: str, sr: str, *, apply: bool) -> str:
    code, rows = http_json(
        "GET",
        f"{supabase_url}/rest/v1/plan_tiers?slug=eq.{TIER_SLUG}&select=id,slug,kind,is_active",
        rest_headers(sr),
    )
    if code != 200:
        raise SystemExit(f"plan_tiers lookup failed http={code} {rows}")
    assert isinstance(rows, list)
    if rows:
        print(f"  plan_tier reuse id={rows[0]['id']}")
        return str(rows[0]["id"])
    print(f"  plan_tier missing slug={TIER_SLUG}")
    if not apply:
        return str(uuid.uuid4())
    # sort_order high so it stays after commercial tiers in any admin listing
    body = {
        "slug": TIER_SLUG,
        "kind": "base",
        "display_name": TIER_DISPLAY,
        "is_active": True,
        "sort_order": 90,
    }
    code, rows = http_json(
        "POST",
        f"{supabase_url}/rest/v1/plan_tiers",
        rest_headers(sr),
        body,
        prefer="return=representation",
    )
    if code not in (200, 201) or not isinstance(rows, list) or not rows:
        raise SystemExit(f"plan_tiers insert failed http={code} {rows}")
    print(f"  plan_tier created id={rows[0]['id']}")
    return str(rows[0]["id"])


def ensure_plan_price(
    supabase_url: str,
    sr: str,
    *,
    tier_id: str,
    stripe_price_id: str,
    livemode: bool,
    apply: bool,
) -> str:
    code, rows = http_json(
        "GET",
        (
            f"{supabase_url}/rest/v1/plan_prices"
            f"?stripe_price_id=eq.{urllib.parse.quote(stripe_price_id)}"
            f"&livemode=eq.{str(livemode).lower()}"
            f"&select=id,is_sellable,amount_cents"
        ),
        rest_headers(sr),
    )
    if code != 200:
        raise SystemExit(f"plan_prices lookup failed http={code} {rows}")
    assert isinstance(rows, list)
    if rows:
        row = rows[0]
        print(
            f"  plan_price reuse id={row['id']} sellable={row.get('is_sellable')} "
            f"cents={row.get('amount_cents')}"
        )
        plan_price_id = str(row["id"])
        if apply and row.get("is_sellable") is True:
            http_json(
                "PATCH",
                f"{supabase_url}/rest/v1/plan_prices?id=eq.{plan_price_id}",
                rest_headers(sr),
                {"is_sellable": False},
            )
            print("  plan_price forced is_sellable=false")
    else:
        print("  plan_price missing")
        if not apply:
            return str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        body = {
            "plan_tier_id": tier_id,
            "stripe_price_id": stripe_price_id,
            "livemode": livemode,
            "amount_cents": 0,
            "currency": "hkd",
            "billing_interval": "month",
            "effective_from": now,
            "is_sellable": False,
            "caps_snapshot": {},
        }
        code, rows = http_json(
            "POST",
            f"{supabase_url}/rest/v1/plan_prices",
            rest_headers(sr),
            body,
            prefer="return=representation",
        )
        if code not in (200, 201) or not isinstance(rows, list) or not rows:
            raise SystemExit(f"plan_prices insert failed http={code} {rows}")
        plan_price_id = str(rows[0]["id"])
        print(f"  plan_price created id={plan_price_id}")

    # meters (upsert one by one)
    for slug, limit in METERS.items():
        code, existing = http_json(
            "GET",
            (
                f"{supabase_url}/rest/v1/plan_price_meters"
                f"?plan_price_id=eq.{plan_price_id}&meter_slug=eq.{slug}&select=plan_price_id"
            ),
            rest_headers(sr),
        )
        if code == 200 and isinstance(existing, list) and existing:
            continue
        print(f"  meter upsert {slug}={limit}")
        if not apply:
            continue
        code, _ = http_json(
            "POST",
            f"{supabase_url}/rest/v1/plan_price_meters",
            rest_headers(sr),
            {
                "plan_price_id": plan_price_id,
                "meter_slug": slug,
                "limit_value": limit,
            },
            prefer="resolution=merge-duplicates,return=minimal",
        )
        if code not in (200, 201, 204):
            # try plain insert without merge prefer
            code2, payload = http_json(
                "POST",
                f"{supabase_url}/rest/v1/plan_price_meters",
                rest_headers(sr),
                {
                    "plan_price_id": plan_price_id,
                    "meter_slug": slug,
                    "limit_value": limit,
                },
                prefer="return=minimal",
            )
            if code2 not in (200, 201, 204):
                raise SystemExit(f"meter insert failed {slug} http={code}/{code2} {payload}")
    return plan_price_id


def find_or_create_customer(
    secret: str, *, email: str, company_id: str, company_name: str, apply: bool
) -> str:
    q = urllib.parse.urlencode({"email": email, "limit": 1})
    payload = stripe(secret, "GET", f"/v1/customers?{q}")
    data = payload.get("data") or []
    if data:
        print(f"  stripe customer reuse id={data[0]['id']} email={email}")
        return str(data[0]["id"])
    print(f"  stripe customer missing email={email}")
    if not apply:
        return "cus_DRYRUN"
    cust = stripe(
        secret,
        "POST",
        "/v1/customers",
        {
            "email": email,
            "name": company_name,
            "metadata[company_id]": company_id,
            "metadata[taskr_internal]": "complimentary",
        },
    )
    print(f"  stripe customer created id={cust['id']}")
    return str(cust["id"])


def create_subscription(
    secret: str,
    *,
    customer_id: str,
    price_id: str,
    company_id: str,
    plan_price_id: str,
    apply: bool,
) -> dict:
    print("  stripe subscription create…")
    if not apply:
        return {
            "id": "sub_DRYRUN",
            "status": "active",
            "current_period_start": 0,
            "current_period_end": 0,
            "livemode": True,
        }
    # Free ($0) Price: Stripe activates without a payment method.
    sub = stripe(
        secret,
        "POST",
        "/v1/subscriptions",
        {
            "customer": customer_id,
            "items[0][price]": price_id,
            "metadata[company_id]": company_id,
            "metadata[plan_price_id]": plan_price_id,
            "metadata[livemode]": "true",
            "metadata[taskr_internal]": "complimentary",
        },
    )
    print(f"  stripe subscription id={sub['id']} status={sub.get('status')}")
    return sub


def unix_to_iso(unix: object) -> str | None:
    if not isinstance(unix, int) or unix <= 0:
        return None
    return datetime.fromtimestamp(unix, tz=timezone.utc).isoformat()


def attach_company(
    supabase_url: str,
    sr: str,
    *,
    company_id: str,
    customer_id: str,
    subscription: dict,
    plan_price_id: str,
    apply: bool,
) -> None:
    status = str(subscription.get("status") or "active")
    body = {
        "stripe_customer_id": customer_id,
        "stripe_subscription_id": subscription["id"],
        "status": status if status in ("active", "trialing", "past_due") else "active",
        "locked_plan_price_id": plan_price_id,
        "livemode": True,
        "trial_ends_at": unix_to_iso(subscription.get("trial_end")),
        "current_period_start": unix_to_iso(subscription.get("current_period_start")),
        "current_period_end": unix_to_iso(subscription.get("current_period_end")),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    print(f"  company_subscriptions patch company={company_id}")
    print(f"    -> {body['stripe_subscription_id']} status={body['status']}")
    if not apply:
        return
    code, payload = http_json(
        "PATCH",
        f"{supabase_url}/rest/v1/company_subscriptions?company_id=eq.{company_id}",
        rest_headers(sr),
        body,
        prefer="return=representation",
    )
    if code not in (200, 204) or (isinstance(payload, list) and not payload and code == 200):
        # upsert if no row
        upsert = {"company_id": company_id, **body}
        code2, payload2 = http_json(
            "POST",
            f"{supabase_url}/rest/v1/company_subscriptions",
            rest_headers(sr),
            upsert,
            prefer="resolution=merge-duplicates,return=representation",
        )
        if code2 not in (200, 201):
            raise SystemExit(f"company_subscriptions write failed {code}/{code2} {payload}/{payload2}")
    # Keep entitlements pointing at complimentary price; leave limits as Pro-equivalent meters.
    http_json(
        "PATCH",
        f"{supabase_url}/rest/v1/company_entitlements?company_id=eq.{company_id}",
        rest_headers(sr),
        {
            "source_plan_price_id": plan_price_id,
            "subscription_status": body["status"],
            "billing_phase": "trial" if body["status"] == "trialing" else "active",
            "pm_seat_limit": METERS["pm_seats"],
            "worker_seat_limit": METERS["worker_seats"],
            "project_limit": METERS["projects"],
            "entries_limit": METERS["entries_monthly"],
            "entries_limit_kind": "monthly",
            "storage_limit_bytes": METERS["storage_bytes"],
            "updated_at": datetime.now(timezone.utc).isoformat(),
        },
    )


def verify_status_edge(
    supabase_url: str,
    anon: str,
    *,
    email: str,
    password: str,
) -> None:
    code, tok = http_json(
        "POST",
        f"{supabase_url}/auth/v1/token?grant_type=password",
        {
            "apikey": anon,
            "Content-Type": "application/json",
        },
        {"email": email, "password": password},
    )
    if code != 200 or not isinstance(tok, dict) or not tok.get("access_token"):
        print(f"  verify login FAIL http={code}")
        return
    access = tok["access_token"]
    code, payload = http_json(
        "POST",
        f"{supabase_url}/functions/v1/billing-subscription-status",
        {
            "apikey": anon,
            "Authorization": f"Bearer {access}",
            "Content-Type": "application/json",
        },
        {},
    )
    print(f"  billing-subscription-status http={code}")
    if isinstance(payload, dict):
        print(
            "  ",
            {
                "ok": payload.get("ok"),
                "companyName": payload.get("companyName"),
                "planDisplayName": payload.get("planDisplayName"),
                "stripeStatus": payload.get("stripeStatus"),
                "canCancel": payload.get("canCancel"),
                "message": payload.get("message"),
                "error": payload.get("error"),
            },
        )


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument(
        "--env-file",
        default=str(ROOT / ".cache/env-cutover/insite-prod.env.local"),
    )
    ap.add_argument(
        "--stripe-env-file",
        default=str(ROOT / ".cache/env-cutover/insite-prod-stripe.env.local"),
    )
    ap.add_argument("--company-id", default=os.environ.get("COMPANY_ID", DEFAULT_COMPANY_ID))
    ap.add_argument(
        "--admin-email",
        default=os.environ.get("ADMIN_EMAIL", DEFAULT_ADMIN_EMAIL),
    )
    ap.add_argument(
        "--password",
        default=os.environ.get("VERIFY_PASSWORD", "password123"),
        help="Only used for post-apply status verify login",
    )
    ap.add_argument("--apply", action="store_true")
    args = ap.parse_args()

    file_env = load_env(Path(args.env_file))
    stripe_env = load_env(Path(args.stripe_env_file))
    supabase_url = file_env.get("EXPO_PUBLIC_SUPABASE_URL") or file_env.get("SUPABASE_URL")
    sr = file_env.get("SUPABASE_SERVICE_ROLE_KEY")
    anon = file_env.get("EXPO_PUBLIC_SUPABASE_ANON_KEY")
    secret = (
        os.environ.get("STRIPE_SECRET_KEY")
        or stripe_env.get("STRIPE_SECRET_KEY")
        or file_env.get("STRIPE_SECRET_KEY")
        or ""
    )
    if not supabase_url or not sr or not anon:
        print("Missing Supabase URL / service role / anon in env-file", file=sys.stderr)
        return 1
    if not secret.startswith("sk_"):
        print("Missing STRIPE_SECRET_KEY", file=sys.stderr)
        return 1
    if not secret.startswith("sk_live_"):
        print("Refusing non-live Stripe key for this PROD complimentary provision", file=sys.stderr)
        return 1

    mode = "APPLY" if args.apply else "DRY-RUN"
    print(f"=== internal complimentary provision ({mode}) ===")
    print(f"  supabase={supabase_url.split('//')[1].split('.')[0]}")
    print(f"  company_id={args.company_id}")
    print(f"  admin_email={args.admin_email}")

    # company name
    code, cos = http_json(
        "GET",
        f"{supabase_url}/rest/v1/companies?id=eq.{args.company_id}&select=id,name",
        rest_headers(sr),
    )
    if code != 200 or not isinstance(cos, list) or not cos:
        raise SystemExit(f"company not found http={code} {cos}")
    company_name = str(cos[0].get("name") or "Internal company")
    print(f"  company_name={company_name}")

    code, sub_rows = http_json(
        "GET",
        (
            f"{supabase_url}/rest/v1/company_subscriptions"
            f"?company_id=eq.{args.company_id}&select=stripe_subscription_id,stripe_customer_id,status"
        ),
        rest_headers(sr),
    )
    current_sub = (sub_rows[0] if isinstance(sub_rows, list) and sub_rows else {}) or {}
    print(
        f"  current_sub={current_sub.get('stripe_subscription_id')} "
        f"status={current_sub.get('status')}"
    )

    price = ensure_stripe_price(secret, apply=args.apply)
    tier_id = ensure_tier(supabase_url, sr, apply=args.apply)
    plan_price_id = ensure_plan_price(
        supabase_url,
        sr,
        tier_id=tier_id,
        stripe_price_id=str(price["id"]),
        livemode=True,
        apply=args.apply,
    )

    # If already on a real Stripe sub (not manual), leave subscription alone unless forced later.
    existing_sub_id = str(current_sub.get("stripe_subscription_id") or "")
    if existing_sub_id.startswith("sub_") and not existing_sub_id.startswith("sub_manual_"):
        print(f"  company already on real Stripe sub {existing_sub_id} — skipping create")
        print("  (locked_plan_price / meters still ensured above)")
    else:
        customer_id = find_or_create_customer(
            secret,
            email=args.admin_email,
            company_id=args.company_id,
            company_name=company_name,
            apply=args.apply,
        )
        subscription = create_subscription(
            secret,
            customer_id=customer_id,
            price_id=str(price["id"]),
            company_id=args.company_id,
            plan_price_id=plan_price_id,
            apply=args.apply,
        )
        attach_company(
            supabase_url,
            sr,
            company_id=args.company_id,
            customer_id=customer_id,
            subscription=subscription,
            plan_price_id=plan_price_id,
            apply=args.apply,
        )

    if args.apply:
        print("=== verify billing-subscription-status ===")
        verify_status_edge(
            supabase_url,
            anon,
            email=args.admin_email,
            password=args.password,
        )
    else:
        print("Dry-run only. Re-run with --apply to write Stripe + DB.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
