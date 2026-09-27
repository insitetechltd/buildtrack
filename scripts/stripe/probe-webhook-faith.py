#!/usr/bin/env python3
"""
S1 — stripe-webhook faith (C-EDGE / DEV-PROBE).

Exit criterion (blind-spot audit):
  - invalid signature → HTTP 400
  - first signed delivery → { received: true } (claim insert)
  - second signed delivery (same event id) → { received: true, duplicate: true }

Plane: DEV only (destruction / money-safety — do not fire synthetic events at PROD).
Uses STRIPE_WEBHOOK_SECRET from repo `.env` (must match the secret synced to DEV Edge).

Usage:
  python3 scripts/stripe/probe-webhook-faith.py
  npm run test:edge:stripe-webhook-faith
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
OUT_DIR = ROOT / "docs" / "superpowers" / "evidence" / "2026-09-27-s0-s2-prove"


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
    """Stripe-compatible `Stripe-Signature` header (t=…,v1=…).

    Deno Stripe SDK + stripe-python both HMAC the full `whsec_…` string as UTF-8
    (not base64-decoded bytes).
    """
    ts = int(time.time()) if timestamp is None else timestamp
    signed = f"{ts}.{payload}".encode("utf-8")
    dig = hmac.new(secret.encode("utf-8"), signed, hashlib.sha256).hexdigest()
    return f"t={ts},v1={dig}"


def post_webhook(
    url: str,
    *,
    body: bytes,
    signature: str | None,
    anon_key: str,
) -> tuple[int, Any]:
    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "apikey": anon_key,
        "Authorization": f"Bearer {anon_key}",
    }
    if signature is not None:
        headers["Stripe-Signature"] = signature
    req = urllib.request.Request(url, data=body, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=45) as r:
            text = r.read().decode()
            return r.status, json.loads(text) if text else None
    except urllib.error.HTTPError as e:
        text = e.read().decode()
        try:
            return e.code, json.loads(text) if text else {"message": text}
        except json.JSONDecodeError:
            return e.code, {"message": text}


def rest_delete_event(url: str, service_key: str, event_id: str) -> None:
    """Best-effort cleanup of probe row in billing_webhook_events."""
    path = (
        f"{url}/rest/v1/billing_webhook_events"
        f"?stripe_event_id=eq.{urllib.parse.quote(event_id)}"
    )
    req = urllib.request.Request(
        path,
        method="DELETE",
        headers={
            "apikey": service_key,
            "Authorization": f"Bearer {service_key}",
            "Prefer": "return=minimal",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            r.read()
    except Exception:
        pass


def main() -> int:
    env = load_dotenv(ROOT / ".env")
    supabase_url = (env.get("EXPO_PUBLIC_SUPABASE_URL") or "").rstrip("/")
    anon = env.get("EXPO_PUBLIC_SUPABASE_ANON_KEY") or env.get("SUPABASE_ANON_KEY") or ""
    service = env.get("SUPABASE_SERVICE_ROLE_KEY") or ""
    secret = env.get("STRIPE_WEBHOOK_SECRET") or ""

    if DEV_REF not in supabase_url:
        print(
            f"FAIL: EXPO_PUBLIC_SUPABASE_URL must be DEV ({DEV_REF}); got host without that ref",
            file=sys.stderr,
        )
        return 1
    if not anon or not secret:
        print("FAIL: need EXPO_PUBLIC_SUPABASE_ANON_KEY + STRIPE_WEBHOOK_SECRET in .env", file=sys.stderr)
        return 1

    webhook_url = f"{supabase_url}/functions/v1/stripe-webhook"
    sha = git_sha()
    marker = uuid.uuid4().hex[:12]
    event_id = f"evt_s1_faith_{marker}"

    # Harmless ignored type — exercises claim + default branch only (no entitlement mutate).
    event = {
        "id": event_id,
        "object": "event",
        "api_version": "2024-11-20.acacia",
        "created": int(time.time()),
        "type": "customer.updated",
        "livemode": False,
        "pending_webhooks": 1,
        "request": {"id": None, "idempotency_key": None},
        "data": {
            "object": {
                "id": f"cus_s1_faith_{marker}",
                "object": "customer",
                "email": f"s1-faith-{marker}@example.invalid",
            }
        },
    }
    payload = json.dumps(event, separators=(",", ":"))
    body = payload.encode("utf-8")

    results: list[dict[str, Any]] = []
    ok_all = True

    # 1) invalid signature
    code_bad, body_bad = post_webhook(
        webhook_url, body=body, signature="t=1,v1=deadbeef", anon_key=anon
    )
    ok_bad = code_bad == 400
    results.append(
        {
            "case": "invalid_signature",
            "ok": ok_bad,
            "http": code_bad,
            "body": body_bad,
        }
    )
    ok_all = ok_all and ok_bad
    print(f"[{'PASS' if ok_bad else 'FAIL'}] invalid_signature http={code_bad}")

    # 2) first delivery
    sig = stripe_sign(payload, secret)
    code1, body1 = post_webhook(webhook_url, body=body, signature=sig, anon_key=anon)
    ok1 = (
        code1 == 200
        and isinstance(body1, dict)
        and body1.get("received") is True
        and body1.get("duplicate") is not True
    )
    results.append({"case": "first_delivery", "ok": ok1, "http": code1, "body": body1})
    ok_all = ok_all and ok1
    print(f"[{'PASS' if ok1 else 'FAIL'}] first_delivery http={code1} body={body1!r}")

    # 3) duplicate
    sig2 = stripe_sign(payload, secret)
    code2, body2 = post_webhook(webhook_url, body=body, signature=sig2, anon_key=anon)
    ok2 = (
        code2 == 200
        and isinstance(body2, dict)
        and body2.get("received") is True
        and body2.get("duplicate") is True
    )
    results.append({"case": "duplicate", "ok": ok2, "http": code2, "body": body2})
    ok_all = ok_all and ok2
    print(f"[{'PASS' if ok2 else 'FAIL'}] duplicate http={code2} body={body2!r}")

    if service:
        rest_delete_event(supabase_url, service, event_id)

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    artifact = {
        "ok": ok_all,
        "plane": "DEV",
        "projectRef": DEV_REF,
        "appSha": sha,
        "eventId": event_id,
        "cases": results,
    }
    out_path = OUT_DIR / "s1-stripe-webhook-faith.json"
    out_path.write_text(json.dumps(artifact, indent=2) + "\n")
    print(f"artifact: {out_path}")
    if ok_all:
        print("GO: stripe-webhook faith (bad sig + claim + duplicate)")
        return 0
    print("NO-GO: stripe-webhook faith", file=sys.stderr)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
