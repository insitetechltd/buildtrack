#!/usr/bin/env python3
"""Upsert HKD plan_prices + meters from Stripe HKD lookup keys.

Marks USD sellable rows unsellable for this livemode. All tenants are test
right now — no grandfathering of USD subscriptions required.
"""
from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
ENV_PATH = ROOT / ".env"

LOOKUP_BY_TIER_SLUG = {
    "growth": "taskr_starter_hkd_monthly",
    "unlimited": "taskr_pro_hkd_monthly",
    "addon_worker_pack": "taskr_worker_pack_hkd_monthly",
    "addon_pm_seat": "taskr_pm_seat_hkd_monthly",
}

AMOUNT_CENTS_BY_SLUG = {
    "growth": 16000,
    "unlimited": 40000,
    "addon_worker_pack": 2000,
    "addon_pm_seat": 10000,
}

DISPLAY_NAME_BY_SLUG = {
    "growth": "Starter",
    "unlimited": "Pro",
    "addon_worker_pack": "Worker seat",
    "addon_pm_seat": "PM seat",
}

BASE_METERS_BY_SLUG: dict[str, dict[str, int | None]] = {
    "growth": {
        "pm_seats": 1,
        "worker_seats": 5,
        "projects": 3,
        "entries_monthly": 300,
        "storage_bytes": 10 * 1024 * 1024 * 1024,
    },
    "unlimited": {
        "pm_seats": 3,
        "worker_seats": 15,
        "projects": 12,
        "entries_monthly": 800,
        "storage_bytes": 30 * 1024 * 1024 * 1024,
    },
    "addon_worker_pack": {"worker_seats": 1},
    "addon_pm_seat": {"pm_seats": 1},
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
) -> dict | list:
    data = None
    if body is not None:
        data = json.dumps(body).encode()
        headers = {**headers, "Content-Type": "application/json"}
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            raw = resp.read().decode()
            return json.loads(raw) if raw else {}
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


def find_price_by_lookup(secret: str, lookup: str) -> dict | None:
    q = urllib.parse.urlencode({"lookup_keys[]": lookup, "limit": 1})
    payload = stripe_get(secret, f"/v1/prices?{q}")
    rows = payload.get("data") or []
    return rows[0] if rows else None


def main() -> int:
    file_env = load_env(ENV_PATH)
    stripe_secret = os.environ.get("STRIPE_SECRET_KEY") or file_env.get("STRIPE_SECRET_KEY", "")
    # Prefer process env so PROD cutover can source insite-prod.env.local without rewriting .env (DEV).
    supabase_url = (
        os.environ.get("EXPO_PUBLIC_SUPABASE_URL") or file_env.get("EXPO_PUBLIC_SUPABASE_URL", "")
    ).rstrip("/")
    service_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or file_env.get(
        "SUPABASE_SERVICE_ROLE_KEY", ""
    )

    if not stripe_secret:
        print("Missing STRIPE_SECRET_KEY", file=sys.stderr)
        return 1
    if not supabase_url or not service_key:
        print("Missing EXPO_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY", file=sys.stderr)
        return 1

    livemode = stripe_secret.startswith("sk_live_")
    now_iso = datetime.now(timezone.utc).isoformat()
    print(f"Sync HKD plan_prices (livemode={livemode})…")

    headers = {
        "apikey": service_key,
        "Authorization": f"Bearer {service_key}",
        "Prefer": "return=representation",
    }

    tiers_payload = http_json(
        "GET",
        f"{supabase_url}/rest/v1/plan_tiers?select=id,slug,display_name",
        headers,
    )
    tier_by_slug = {row["slug"]: row for row in tiers_payload}

    for slug, display_name in DISPLAY_NAME_BY_SLUG.items():
        tier = tier_by_slug.get(slug)
        if not tier:
            print(f"  skip {slug}: plan_tier missing")
            continue
        if tier.get("display_name") != display_name:
            http_json(
                "PATCH",
                f"{supabase_url}/rest/v1/plan_tiers?id=eq.{tier['id']}",
                headers,
                {"display_name": display_name},
            )
            print(f"  tier {slug}: display_name -> {display_name}")

    # Deprecate USD sellable rows for this livemode
    deprecated = http_json(
        "PATCH",
        (
            f"{supabase_url}/rest/v1/plan_prices"
            f"?currency=eq.usd&livemode=eq.{str(livemode).lower()}&is_sellable=eq.true"
        ),
        {**headers, "Prefer": "return=representation"},
        {"is_sellable": False, "effective_to": now_iso},
    )
    dep_count = len(deprecated) if isinstance(deprecated, list) else 0
    print(f"  deprecated {dep_count} USD sellable row(s)")

    upserted = 0
    for slug, lookup in LOOKUP_BY_TIER_SLUG.items():
        tier = tier_by_slug.get(slug)
        if not tier:
            continue

        stripe_price = find_price_by_lookup(stripe_secret, lookup)
        if not stripe_price:
            print(f"  skip {slug}: Stripe lookup {lookup} missing — run bootstrap-hkd-catalog.sh")
            continue

        stripe_price_id = stripe_price["id"]
        amount_cents = int(stripe_price.get("unit_amount") or AMOUNT_CENTS_BY_SLUG[slug])

        existing_hkd = http_json(
            "GET",
            (
                f"{supabase_url}/rest/v1/plan_prices"
                f"?select=id,stripe_price_id"
                f"&plan_tier_id=eq.{tier['id']}"
                f"&livemode=eq.{str(livemode).lower()}"
                f"&currency=eq.hkd"
                f"&is_sellable=eq.true"
                f"&order=effective_from.desc"
                f"&limit=1"
            ),
            headers,
        )

        if existing_hkd:
            row = existing_hkd[0]
            if row["stripe_price_id"] != stripe_price_id:
                http_json(
                    "PATCH",
                    f"{supabase_url}/rest/v1/plan_prices?id=eq.{row['id']}",
                    headers,
                    {
                        "stripe_price_id": stripe_price_id,
                        "amount_cents": amount_cents,
                    },
                )
                print(f"  update {slug}: stripe_price_id -> {stripe_price_id}")
            else:
                print(f"  ok {slug}: {stripe_price_id}")
            price_row_id = row["id"]
        else:
            inserted = http_json(
                "POST",
                f"{supabase_url}/rest/v1/plan_prices",
                headers,
                {
                    "plan_tier_id": tier["id"],
                    "stripe_price_id": stripe_price_id,
                    "livemode": livemode,
                    "amount_cents": amount_cents,
                    "currency": "hkd",
                    "is_sellable": True,
                    "caps_snapshot": {},
                },
            )
            price_row_id = inserted[0]["id"]
            print(f"  insert {slug}: {stripe_price_id} ({price_row_id})")
            upserted += 1

        meters = BASE_METERS_BY_SLUG.get(slug, {})
        http_json(
            "DELETE",
            f"{supabase_url}/rest/v1/plan_price_meters?plan_price_id=eq.{price_row_id}",
            headers,
        )
        for meter_slug, limit_value in meters.items():
            http_json(
                "POST",
                f"{supabase_url}/rest/v1/plan_price_meters",
                headers,
                {
                    "plan_price_id": price_row_id,
                    "meter_slug": meter_slug,
                    "limit_value": limit_value,
                },
            )
        print(f"  meters {slug}: {len(meters)} row(s)")

    print(f"Done. {upserted} new HKD price row(s).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
