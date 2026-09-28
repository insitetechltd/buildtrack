#!/usr/bin/env python3
"""
EG-03 — customer.subscription.deleted → seat meters 0 (C-EDGE / DEV-PROBE).

Product law (documentation/ENTITLEMENT_PRODUCT_LAW.md):
  deleted/canceled → subscription_status=canceled; pm_seats/worker_seats → 0
  (invite fail-closed); other meters kept for audit.

Plane: DEV only. Does not hit PROD webhook / live Stripe billing mutations
beyond the signed webhook delivery to DEV Edge (Stripe retrieve of the
synthetic sub id is expected to fail; handler falls back to event payload).

Usage:
  python3 scripts/stripe/probe-webhook-deleted-seats.py
  npm run test:edge:stripe-webhook-deleted-seats
"""
from __future__ import annotations

import hashlib
import hmac
import json
import os
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
DEV_REF = os.environ.get("DEV_PROJECT_REF", "zusulknbhaumougqckec")
OUT_DIR = ROOT / "docs" / "superpowers" / "evidence" / "2026-09-28-eg03-deleted-seats"


def load_dotenv(path: Path) -> dict[str, str]:
    env: dict[str, str] = {}
    if not path.exists():
        return env
    for line in path.read_text().splitlines():
        s = line.strip()
        if not s or s.startswith("#") or "=" not in s:
            continue
        k, v = s.split("=", 1)
        env[k.strip()] = v.strip().strip('"').strip("'")
    return env


def git_sha() -> str:
    try:
        return (
            subprocess.check_output(["git", "rev-parse", "--short", "HEAD"], cwd=ROOT)
            .decode()
            .strip()
        )
    except Exception:
        return "unknown"


def stripe_sign(payload: str, secret: str, timestamp: int | None = None) -> str:
    ts = int(time.time()) if timestamp is None else timestamp
    signed = f"{ts}.{payload}".encode("utf-8")
    dig = hmac.new(secret.encode("utf-8"), signed, hashlib.sha256).hexdigest()
    return f"t={ts},v1={dig}"


def http_json(
    method: str,
    url: str,
    *,
    headers: dict[str, str],
    body: dict | list | None = None,
) -> tuple[int, Any]:
    data = None
    hdrs = dict(headers)
    if body is not None:
        data = json.dumps(body).encode()
        hdrs["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=data, headers=hdrs, method=method)
    try:
        with urllib.request.urlopen(req, timeout=45) as r:
            text = r.read().decode()
            return r.status, (json.loads(text) if text else None)
    except urllib.error.HTTPError as e:
        text = e.read().decode()
        try:
            return e.code, (json.loads(text) if text else {"message": text})
        except json.JSONDecodeError:
            return e.code, {"message": text}


def rest(
    base: str,
    service: str,
    path: str,
    *,
    method: str = "GET",
    body: dict | list | None = None,
    prefer: str | None = None,
) -> tuple[int, Any]:
    headers = {
        "apikey": service,
        "Authorization": f"Bearer {service}",
        "Accept": "application/json",
    }
    if prefer:
        headers["Prefer"] = prefer
    return http_json(method, f"{base}/rest/v1/{path}", headers=headers, body=body)


def post_webhook_raw(
    url: str, *, body: bytes, signature: str, anon_key: str
) -> tuple[int, Any]:
    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "apikey": anon_key,
        "Authorization": f"Bearer {anon_key}",
        "Stripe-Signature": signature,
    }
    req = urllib.request.Request(url, data=body, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            text = r.read().decode()
            return r.status, (json.loads(text) if text else None)
    except urllib.error.HTTPError as e:
        text = e.read().decode()
        try:
            return e.code, (json.loads(text) if text else {"message": text})
        except json.JSONDecodeError:
            return e.code, {"message": text}


def cleanup(
    base: str,
    service: str,
    *,
    company_id: str,
    event_id: str,
    sub_id: str,
) -> None:
    for path in (
        f"billing_audit_log?company_id=eq.{company_id}",
        f"company_entitlement_revisions?company_id=eq.{company_id}",
        f"company_entitlements?company_id=eq.{company_id}",
        f"company_subscriptions?company_id=eq.{company_id}",
        f"billing_webhook_claims?stripe_event_id=eq.{urllib.parse.quote(event_id)}",
        f"billing_webhook_events?stripe_event_id=eq.{urllib.parse.quote(event_id)}",
        f"companies?id=eq.{company_id}",
    ):
        try:
            rest(base, service, path, method="DELETE", prefer="return=minimal")
        except Exception:
            pass
    # Best-effort: orphaned sub id filter if company delete failed ordering
    try:
        rest(
            base,
            service,
            f"company_subscriptions?stripe_subscription_id=eq.{urllib.parse.quote(sub_id)}",
            method="DELETE",
            prefer="return=minimal",
        )
    except Exception:
        pass


def main() -> int:
    env = load_dotenv(ROOT / ".env")
    base = (env.get("EXPO_PUBLIC_SUPABASE_URL") or "").rstrip("/")
    anon = env.get("EXPO_PUBLIC_SUPABASE_ANON_KEY") or env.get("SUPABASE_ANON_KEY") or ""
    service = env.get("SUPABASE_SERVICE_ROLE_KEY") or ""
    secret = env.get("STRIPE_WEBHOOK_SECRET") or ""

    if DEV_REF not in base:
        print(
            f"FAIL: EXPO_PUBLIC_SUPABASE_URL must be DEV ({DEV_REF})",
            file=sys.stderr,
        )
        return 1
    if not anon or not service or not secret:
        print(
            "FAIL: need ANON + SUPABASE_SERVICE_ROLE_KEY + STRIPE_WEBHOOK_SECRET",
            file=sys.stderr,
        )
        return 1

    sha = git_sha()
    marker = uuid.uuid4().hex[:12]
    event_id = f"evt_eg03_deleted_{marker}"
    sub_id = f"sub_eg03_probe_{marker}"
    cust_id = f"cus_eg03_probe_{marker}"
    company_name = f"EG03 Deleted Seats {marker}"

    # Creator for companies.created_by — prefer disposable Maestro CA on DEV.
    code, users = rest(
        base,
        service,
        "users?select=id,email&email=eq.carol.admina@test.com&limit=1",
    )
    if code != 200 or not isinstance(users, list) or not users:
        code, users = rest(
            base,
            service,
            "users?select=id,email&system_permission=eq.admin&limit=1",
        )
    if code != 200 or not isinstance(users, list) or not users:
        print("FAIL: no DEV admin user for companies.created_by", file=sys.stderr)
        return 1
    creator_id = users[0]["id"]

    code, prices = rest(
        base,
        service,
        "plan_prices?select=id&livemode=eq.false&limit=1",
    )
    if code != 200 or not isinstance(prices, list) or not prices:
        print("FAIL: no DEV plan_prices row", file=sys.stderr)
        return 1
    plan_price_id = prices[0]["id"]

    code, cos = rest(
        base,
        service,
        "companies",
        method="POST",
        body={
            "name": company_name,
            "type": "general_contractor",
            "is_active": True,
            "created_by": creator_id,
        },
        prefer="return=representation",
    )
    if code not in (200, 201) or not isinstance(cos, list) or not cos:
        print(f"FAIL: create company http={code} {cos}", file=sys.stderr)
        return 1
    company_id = cos[0]["id"]

    prior_meters = {
        "pm_seats": 1,
        "worker_seats": 5,
        "projects": 3,
        "entries_monthly": 300,
        "storage_bytes": 10 * 1024 * 1024 * 1024,
    }
    snapshot = {
        "locked_plan_price_id": plan_price_id,
        "billing_phase": "active",
        "meters": prior_meters,
    }

    code, _ = rest(
        base,
        service,
        "company_subscriptions",
        method="POST",
        body={
            "company_id": company_id,
            "stripe_customer_id": cust_id,
            "stripe_subscription_id": sub_id,
            "status": "active",
            "locked_plan_price_id": plan_price_id,
            "livemode": False,
        },
        prefer="return=minimal",
    )
    if code not in (200, 201):
        print(f"FAIL: insert company_subscriptions http={code}", file=sys.stderr)
        cleanup(
            base, service, company_id=company_id, event_id=event_id, sub_id=sub_id
        )
        return 1

    code, ent_body = rest(
        base,
        service,
        "company_entitlements?on_conflict=company_id",
        method="POST",
        body={
            "company_id": company_id,
            "pm_seat_limit": 1,
            "worker_seat_limit": 5,
            "project_limit": 3,
            "entries_limit": 300,
            "entries_limit_kind": "monthly",
            "storage_limit_bytes": prior_meters["storage_bytes"],
            "subscription_status": "active",
            "billing_phase": "active",
            "source_plan_price_id": plan_price_id,
            "entitlements_snapshot": snapshot,
            "snapshot_locked_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        },
        prefer="resolution=merge-duplicates,return=minimal",
    )
    if code not in (200, 201):
        print(
            f"FAIL: upsert company_entitlements http={code} {ent_body}",
            file=sys.stderr,
        )
        cleanup(
            base, service, company_id=company_id, event_id=event_id, sub_id=sub_id
        )
        return 1

    event = {
        "id": event_id,
        "object": "event",
        "api_version": "2024-11-20.acacia",
        "created": int(time.time()),
        "type": "customer.subscription.deleted",
        "livemode": False,
        "pending_webhooks": 1,
        "request": {"id": None, "idempotency_key": None},
        "data": {
            "object": {
                "id": sub_id,
                "object": "subscription",
                "customer": cust_id,
                "status": "canceled",
                "livemode": False,
                "metadata": {"company_id": company_id},
                "items": {"object": "list", "data": []},
            }
        },
    }
    payload = json.dumps(event, separators=(",", ":"))
    body = payload.encode("utf-8")
    sig = stripe_sign(payload, secret)
    webhook_url = f"{base}/functions/v1/stripe-webhook"
    http_code, resp_body = post_webhook_raw(
        webhook_url, body=body, signature=sig, anon_key=anon
    )

    code_ent, ents = rest(
        base,
        service,
        f"company_entitlements?company_id=eq.{company_id}"
        "&select=pm_seat_limit,worker_seat_limit,project_limit,subscription_status,entitlements_snapshot",
    )
    ent = ents[0] if code_ent == 200 and isinstance(ents, list) and ents else None
    meters = (
        (ent.get("entitlements_snapshot") or {}).get("meters")
        if isinstance(ent, dict)
        else None
    ) or {}

    seats_zero = (
        isinstance(ent, dict)
        and ent.get("pm_seat_limit") == 0
        and ent.get("worker_seat_limit") == 0
        and ent.get("subscription_status") == "canceled"
        and meters.get("pm_seats") == 0
        and meters.get("worker_seats") == 0
        # other meters retained for audit
        and meters.get("projects") == 3
        and meters.get("entries_monthly") == 300
    )
    webhook_ok = http_code == 200 and isinstance(resp_body, dict) and resp_body.get(
        "received"
    ) is True
    ok = webhook_ok and seats_zero

    artifact = {
        "ok": ok,
        "plane": "DEV",
        "projectRef": DEV_REF,
        "appSha": sha,
        "eventId": event_id,
        "subscriptionId": sub_id,
        "companyId": company_id,
        "webhook": {"http": http_code, "body": resp_body},
        "entitlements_after": ent,
        "assert": {
            "webhook_received": webhook_ok,
            "seats_zeroed_and_status_canceled": seats_zero,
        },
    }
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    out_path = OUT_DIR / "eg03-deleted-seats.json"
    out_path.write_text(json.dumps(artifact, indent=2) + "\n")

    cleanup(base, service, company_id=company_id, event_id=event_id, sub_id=sub_id)

    print(f"[{'PASS' if webhook_ok else 'FAIL'}] webhook http={http_code} body={resp_body!r}")
    print(
        f"[{'PASS' if seats_zero else 'FAIL'}] seats_zero status={ent.get('subscription_status') if ent else None} "
        f"pm={ent.get('pm_seat_limit') if ent else None} workers={ent.get('worker_seat_limit') if ent else None} "
        f"meters={meters}"
    )
    print(f"artifact: {out_path}")
    if ok:
        print("GO: EG-03 deleted → seat meters 0 (DEV)")
        return 0
    print("NO-GO: EG-03 deleted seats", file=sys.stderr)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
