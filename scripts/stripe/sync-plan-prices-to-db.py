#!/usr/bin/env python3
"""Sync plan_prices.stripe_price_id from Stripe lookup keys (test catalog).

Reads STRIPE_SECRET_KEY + EXPO_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from .env.
Never prints secrets.
"""
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

LOOKUP_BY_TIER_SLUG = {
    "growth": "taskr_growth_monthly",
    "unlimited": "taskr_unlimited_monthly",
    "addon_worker_pack": "taskr_worker_pack_monthly",
    "addon_pm_seat": "taskr_pm_seat_monthly",
}


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
    body: dict | None = None,
) -> dict:
    data = None
    if body is not None:
        data = json.dumps(body).encode()
        headers = {**headers, "Content-Type": "application/json"}
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as exc:
        payload = exc.read().decode()[:800]
        raise SystemExit(f"HTTP {exc.code} {method} {url}\n{payload}") from exc


def stripe_get(secret: str, path: str) -> dict:
    req = urllib.request.Request(
        f"https://api.stripe.com{path}",
        headers={"Authorization": f"Bearer {secret}"},
        method="GET",
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as exc:
        payload = exc.read().decode()[:800]
        raise SystemExit(f"Stripe HTTP {exc.code} GET {path}\n{payload}") from exc


def find_price_by_lookup(secret: str, lookup: str) -> str | None:
    q = urllib.parse.urlencode({"lookup_keys[]": lookup, "limit": 1})
    payload = stripe_get(secret, f"/v1/prices?{q}")
    rows = payload.get("data") or []
    if not rows:
        return None
    return rows[0]["id"]


def main() -> int:
    file_env = load_env(ENV_PATH)
    stripe_secret = os.environ.get("STRIPE_SECRET_KEY") or file_env.get("STRIPE_SECRET_KEY", "")
    supabase_url = file_env.get("EXPO_PUBLIC_SUPABASE_URL", "").rstrip("/")
    service_key = file_env.get("SUPABASE_SERVICE_ROLE_KEY", "")

    if not stripe_secret:
        print("Missing STRIPE_SECRET_KEY", file=sys.stderr)
        return 1
    if not supabase_url or not service_key:
        print("Missing EXPO_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY", file=sys.stderr)
        return 1

    livemode = stripe_secret.startswith("sk_live_")
    print(f"Sync plan_prices from Stripe lookup keys (livemode={livemode})…")

    headers = {
        "apikey": service_key,
        "Authorization": f"Bearer {service_key}",
        "Prefer": "return=representation",
    }

    tiers_payload = http_json(
        "GET",
        f"{supabase_url}/rest/v1/plan_tiers?select=id,slug",
        headers,
    )
    tier_by_slug = {row["slug"]: row["id"] for row in tiers_payload}

    updated = 0
    for slug, lookup in LOOKUP_BY_TIER_SLUG.items():
        tier_id = tier_by_slug.get(slug)
        if not tier_id:
            print(f"  skip {slug}: plan_tier missing")
            continue

        stripe_price_id = find_price_by_lookup(stripe_secret, lookup)
        if not stripe_price_id:
            print(f"  skip {slug}: Stripe lookup {lookup} not found — run bootstrap-org-catalog.sh first")
            continue

        prices_payload = http_json(
            "GET",
            (
                f"{supabase_url}/rest/v1/plan_prices"
                f"?select=id,stripe_price_id"
                f"&plan_tier_id=eq.{tier_id}"
                f"&livemode=eq.{str(livemode).lower()}"
                f"&is_sellable=eq.true"
                f"&order=effective_from.desc"
                f"&limit=1"
            ),
            headers,
        )
        if not prices_payload:
            print(f"  skip {slug}: no sellable plan_prices row for livemode={livemode}")
            continue

        row = prices_payload[0]
        if row["stripe_price_id"] == stripe_price_id:
            print(f"  ok {slug}: already {stripe_price_id}")
            continue

        http_json(
            "PATCH",
            f"{supabase_url}/rest/v1/plan_prices?id=eq.{row['id']}",
            headers,
            {"stripe_price_id": stripe_price_id},
        )
        print(
            f"  update {slug}: {row['stripe_price_id']} -> {stripe_price_id}",
        )
        updated += 1

    print(f"Done. {updated} row(s) updated.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
