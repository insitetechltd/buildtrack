#!/usr/bin/env python3
"""Create R6 org SKUs + a Growth Payment Link. Never prints API keys."""
from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
ENV_PATH = ROOT / ".env"

SKUS = [
    {
        "lookup": "taskr_growth_monthly",
        "product_name": "Taskr Growth",
        "description": "Company subscription: 5 projects, under 200 entries/month, 1 PM + 5 workers.",
        "unit_amount": 1999,
        "cta": True,
    },
    {
        "lookup": "taskr_unlimited_monthly",
        "product_name": "Taskr Unlimited",
        "description": "Company subscription: unlimited projects/entries, max 5 GB, 1 PM + 5 workers.",
        "unit_amount": 19999,
        "cta": False,
    },
    {
        "lookup": "taskr_worker_pack_monthly",
        "product_name": "Taskr Worker pack (+5)",
        "description": "Add-on: +5 worker seats per month.",
        "unit_amount": 499,
        "cta": False,
    },
    {
        "lookup": "taskr_pm_seat_monthly",
        "product_name": "Taskr PM seat (+1)",
        "description": "Add-on: +1 PM seat per month.",
        "unit_amount": 999,
        "cta": False,
    },
]


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


def upsert_env(path: Path, key: str, value: str) -> None:
    lines = path.read_text().splitlines() if path.is_file() else []
    found = False
    out: list[str] = []
    for line in lines:
        stripped = line.strip()
        if stripped.startswith("#") or "=" not in line:
            out.append(line)
            continue
        name = line.split("=", 1)[0].strip()
        if name == key:
            out.append(f"{key}={value}")
            found = True
        else:
            out.append(line)
    if not found:
        if out and out[-1] != "":
            out.append("")
        out.append(f"{key}={value}")
    path.write_text("\n".join(out) + "\n")


def stripe(secret: str, method: str, path: str, form: dict | None = None) -> dict:
    data = None
    headers = {"Authorization": f"Bearer {secret}"}
    url = f"https://api.stripe.com{path}"
    if form is not None:
        data = urllib.parse.urlencode(form).encode()
        headers["Content-Type"] = "application/x-www-form-urlencoded"
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as exc:
        body = exc.read().decode()[:800]
        raise SystemExit(f"Stripe HTTP {exc.code} {method} {path}\n{body}") from exc


def find_price(secret: str, lookup: str) -> dict | None:
    q = urllib.parse.urlencode({"lookup_keys[]": lookup, "limit": 1})
    payload = stripe(secret, "GET", f"/v1/prices?{q}")
    data = payload.get("data") or []
    return data[0] if data else None


def main() -> int:
    file_env = load_env(ENV_PATH)
    secret = os.environ.get("STRIPE_SECRET_KEY") or file_env.get("STRIPE_SECRET_KEY", "")
    if not secret:
        print(
            "Missing STRIPE_SECRET_KEY.\n"
            "Add it to .env locally (do not paste in chat). Prefer a restricted key (rk_live_ / rk_test_)\n"
            "with Products, Prices, and Payment Links write permission.",
            file=sys.stderr,
        )
        return 1
    if secret.startswith("sk_"):
        print(
            "WARN: using a secret key (sk_). Prefer a restricted key (rk_) with least privilege.",
            file=sys.stderr,
        )
    mode = "live" if "_live_" in secret else "test" if "_test_" in secret else "unknown"
    print(f"Stripe catalog bootstrap ({mode} mode). Key prefix={secret[:7]}…")

    growth_price_id = None
    for sku in SKUS:
        existing = find_price(secret, sku["lookup"])
        if existing:
            price_id = existing["id"]
            product_id = existing.get("product")
            print(f"  reuse {sku['lookup']} price={price_id} product={product_id}")
        else:
            product = stripe(
                secret,
                "POST",
                "/v1/products",
                {
                    "name": sku["product_name"],
                    "description": sku["description"],
                    "metadata[taskr_sku]": sku["lookup"],
                },
            )
            price = stripe(
                secret,
                "POST",
                "/v1/prices",
                {
                    "product": product["id"],
                    "currency": "usd",
                    "unit_amount": str(sku["unit_amount"]),
                    "recurring[interval]": "month",
                    "lookup_key": sku["lookup"],
                    "metadata[taskr_sku]": sku["lookup"],
                },
            )
            price_id = price["id"]
            print(f"  create {sku['lookup']} price={price_id} product={product['id']}")
        if sku["cta"]:
            growth_price_id = price_id

    assert growth_price_id
    existing_url = file_env.get("EXPO_PUBLIC_STRIPE_CHECKOUT_URL", "")
    if existing_url.startswith("https://buy.stripe.com/"):
        print(f"Keep existing Payment Link URL (already in .env).")
        checkout_url = existing_url
    else:
        link = stripe(
            secret,
            "POST",
            "/v1/payment_links",
            {
                "line_items[0][price]": growth_price_id,
                "line_items[0][quantity]": "1",
                "subscription_data[trial_period_days]": "30",
                "after_completion[type]": "hosted_confirmation",
                "metadata[taskr_sku]": "taskr_growth_monthly",
            },
        )
        checkout_url = link["url"]
        upsert_env(ENV_PATH, "EXPO_PUBLIC_STRIPE_CHECKOUT_URL", checkout_url)
        print("Wrote EXPO_PUBLIC_STRIPE_CHECKOUT_URL to .env")

    print("Growth checkout:", checkout_url)
    print("Restart Metro (`expo start --clear`) so the app picks up the URL.")
    print(
        "Tax: if you will charge US/EU customers, enable Stripe Tax + a registration "
        "before turning on automatic_tax. See https://docs.stripe.com/billing/taxes/collect-taxes"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
