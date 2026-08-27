#!/usr/bin/env python3
"""Create HK launch Stripe Prices (HKD) with lookup keys. Never prints API keys."""
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

# Locked 2026-08-24 — docs/superpowers/plans/2026-08-24-billing-hkd-pricing-lock.md
HKD_SKUS = [
    {
        "lookup": "taskr_starter_hkd_monthly",
        "tier_slug": "growth",
        "product_name": "Taskr Starter",
        "description": "3 projects, 300 entries/month, 10 GB, 1 PM + 5 workers.",
        "unit_amount": 16000,
    },
    {
        "lookup": "taskr_pro_hkd_monthly",
        "tier_slug": "unlimited",
        "product_name": "Taskr Pro",
        "description": "12 projects, 800 entries/month, 30 GB, 3 PM + 15 workers.",
        "unit_amount": 40000,
    },
    {
        "lookup": "taskr_worker_pack_hkd_monthly",
        "tier_slug": "addon_worker_pack",
        "product_name": "Taskr Worker seat",
        "description": "Add-on: +1 worker seat per month (HK$20).",
        "unit_amount": 2000,
    },
    {
        "lookup": "taskr_pm_seat_hkd_monthly",
        "tier_slug": "addon_pm_seat",
        "product_name": "Taskr PM seat (+1)",
        "description": "Add-on: +1 PM seat per month.",
        "unit_amount": 10000,
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
        print("Missing STRIPE_SECRET_KEY in .env", file=sys.stderr)
        return 1

    mode = "live" if secret.startswith("sk_live_") else "test"
    print(f"Stripe HKD catalog bootstrap ({mode} mode). Key prefix={secret[:7]}…")

    for sku in HKD_SKUS:
        existing = find_price(secret, sku["lookup"])
        if existing:
            print(
                f"  reuse {sku['lookup']} price={existing['id']} "
                f"amount={existing.get('unit_amount')} {existing.get('currency')}"
            )
            continue

        product = stripe(
            secret,
            "POST",
            "/v1/products",
            {
                "name": sku["product_name"],
                "description": sku["description"],
                "metadata[taskr_sku]": sku["lookup"],
                "metadata[taskr_tier_slug]": sku["tier_slug"],
            },
        )
        price = stripe(
            secret,
            "POST",
            "/v1/prices",
            {
                "product": product["id"],
                "currency": "hkd",
                "unit_amount": str(sku["unit_amount"]),
                "recurring[interval]": "month",
                "lookup_key": sku["lookup"],
                "metadata[taskr_sku]": sku["lookup"],
                "metadata[taskr_tier_slug]": sku["tier_slug"],
            },
        )
        print(
            f"  create {sku['lookup']} price={price['id']} "
            f"HK${sku['unit_amount'] / 100:.0f}/mo"
        )

    print("Done. Run: bash scripts/stripe/sync-hkd-plan-prices-to-db.sh")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
