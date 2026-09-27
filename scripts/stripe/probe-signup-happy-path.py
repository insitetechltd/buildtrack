#!/usr/bin/env python3
"""
S6 — signup happy path (C-EDGE / DEV-PROBE).

Exit criterion (blind-spot audit WEB-01):
  start-signup-checkout → Stripe test Checkout confirm (tok_visa) →
  webhook provisions company + founding CA → signup-checkout-status ready
  (invite link + companyId).

Plane: DEV only (Stripe test mode + livemode=false catalog).
Does not charge a live card. Does not touch PROD.

Usage:
  python3 scripts/stripe/probe-signup-happy-path.py
  npm run test:edge:signup-happy-path
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
OUT_DIR = ROOT / "docs" / "superpowers" / "evidence" / "2026-09-27-s6-s10-prove"
SANDBOX_CONFIG = (
    ROOT / "docs" / "taskr" / "assets" / "signup" / "supabase-config.sandbox.js"
)


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


def http_json(
    method: str,
    url: str,
    headers: dict[str, str],
    body: dict | list | None = None,
    timeout: int = 90,
) -> tuple[int, Any]:
    data = None
    hdrs = dict(headers)
    if body is not None:
        data = json.dumps(body).encode("utf-8")
        hdrs = {**hdrs, "Content-Type": "application/json"}
    req = urllib.request.Request(url, data=data, headers=hdrs, method=method)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            raw = r.read().decode()
            return r.status, json.loads(raw) if raw else None
    except urllib.error.HTTPError as e:
        raw = e.read().decode()
        try:
            return e.code, json.loads(raw) if raw else {"message": raw}
        except json.JSONDecodeError:
            return e.code, {"message": raw}


def stripe(
    secret: str, method: str, path: str, form: dict[str, str] | None = None
) -> tuple[int, Any]:
    data = urllib.parse.urlencode(form).encode() if form is not None else None
    headers = {"Authorization": f"Bearer {secret}"}
    if form is not None:
        headers["Content-Type"] = "application/x-www-form-urlencoded"
    req = urllib.request.Request(
        f"https://api.stripe.com{path}", data=data, headers=headers, method=method
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return r.status, json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        raw = e.read().decode()
        try:
            return e.code, json.loads(raw)
        except json.JSONDecodeError:
            return e.code, {"message": raw}


def stripe_sign(payload: str, secret: str) -> str:
    ts = int(time.time())
    dig = hmac.new(
        secret.encode("utf-8"), f"{ts}.{payload}".encode("utf-8"), hashlib.sha256
    ).hexdigest()
    return f"t={ts},v1={dig}"


def rest_get(
    base: str, service: str, table: str, params: dict[str, str]
) -> list[dict[str, Any]]:
    q = urllib.parse.urlencode(params)
    code, body = http_json(
        "GET",
        f"{base}/rest/v1/{table}?{q}",
        {"apikey": service, "Authorization": f"Bearer {service}", "Accept": "application/json"},
    )
    if code != 200 or not isinstance(body, list):
        raise RuntimeError(f"REST {table} http={code} body={body!r}")
    return body


def ensure_sellable_growth_price(base: str, service: str) -> tuple[str, str]:
    rows = rest_get(
        base,
        service,
        "plan_prices",
        {
            "select": "id,stripe_price_id,plan_tiers:plan_tier_id(slug)",
            "livemode": "eq.false",
            "is_sellable": "eq.true",
            "currency": "eq.hkd",
        },
    )
    growth = next(
        (r for r in rows if (r.get("plan_tiers") or {}).get("slug") == "growth"),
        None,
    )
    if not growth:
        raise RuntimeError(
            "No sellable livemode=false HKD growth plan_price on DEV. "
            "Seed plan_tiers + run scripts/stripe/sync-hkd-plan-prices-to-db.py"
        )
    return growth["id"], growth["stripe_price_id"]


def update_sandbox_config(plan_price_id: str, unlimited_id: str | None) -> None:
    """Keep sandbox signup config aligned with live DEV catalog ids."""
    if not SANDBOX_CONFIG.is_file():
        return
    text = SANDBOX_CONFIG.read_text()
    # Replace growth planPriceId string only (UUID pattern after growth block).
    import re

    text2, n = re.subn(
        r'(growth:\s*\{[^}]*planPriceId:\s*")([0-9a-f-]{36})(")',
        rf"\g<1>{plan_price_id}\3",
        text,
        count=1,
        flags=re.S,
    )
    if unlimited_id:
        text2, n2 = re.subn(
            r'(unlimited:\s*\{[^}]*planPriceId:\s*")([0-9a-f-]{36})(")',
            rf"\g<1>{unlimited_id}\3",
            text2,
            count=1,
            flags=re.S,
        )
    else:
        n2 = 0
    if n or n2:
        SANDBOX_CONFIG.write_text(text2)
        print(f"updated sandbox config growth={n} unlimited={n2}")


def main() -> int:
    env = load_dotenv(ROOT / ".env")
    base = (env.get("EXPO_PUBLIC_SUPABASE_URL") or "").rstrip("/")
    anon = env.get("EXPO_PUBLIC_SUPABASE_ANON_KEY") or ""
    service = env.get("SUPABASE_SERVICE_ROLE_KEY") or ""
    stripe_secret = env.get("STRIPE_SECRET_KEY") or ""
    whsec = env.get("STRIPE_WEBHOOK_SECRET") or ""

    if DEV_REF not in base:
        print(f"FAIL: must run against DEV ({DEV_REF})", file=sys.stderr)
        return 1
    if not stripe_secret.startswith("sk_test_"):
        print("FAIL: STRIPE_SECRET_KEY must be sk_test_ (DEV probe)", file=sys.stderr)
        return 1
    if not anon or not service or not whsec:
        print("FAIL: need anon + service_role + STRIPE_WEBHOOK_SECRET", file=sys.stderr)
        return 1

    sha = git_sha()
    marker = uuid.uuid4().hex[:10]
    email = f"s6.signup.{marker}@example.com"
    company = f"S6 Signup {marker}"
    admin_name = "S6 Signup Admin"

    plan_price_id, _stripe_price = ensure_sellable_growth_price(base, service)
    unlimited_rows = [
        r
        for r in rest_get(
            base,
            service,
            "plan_prices",
            {
                "select": "id,plan_tiers:plan_tier_id(slug)",
                "livemode": "eq.false",
                "is_sellable": "eq.true",
                "currency": "eq.hkd",
            },
        )
        if (r.get("plan_tiers") or {}).get("slug") == "unlimited"
    ]
    update_sandbox_config(
        plan_price_id, unlimited_rows[0]["id"] if unlimited_rows else None
    )

    artifact: dict[str, Any] = {
        "ok": False,
        "plane": "DEV",
        "projectRef": DEV_REF,
        "appSha": sha,
        "email": email,
        "planPriceId": plan_price_id,
        "steps": [],
    }

    # 1) start-signup-checkout
    code, out = http_json(
        "POST",
        f"{base}/functions/v1/start-signup-checkout",
        {"apikey": anon, "Authorization": f"Bearer {anon}"},
        {
            "companyName": company,
            "name": admin_name,
            "email": email,
            "planTierSlug": "growth",
            "planPriceId": plan_price_id,
            "successUrl": "https://www.insiteworks.co/taskr/signup.html?env=sandbox&success=1",
            "cancelUrl": "https://www.insiteworks.co/taskr/signup.html?env=sandbox&cancel=1",
        },
    )
    session_id = out.get("sessionId") if isinstance(out, dict) else None
    ok_start = code == 200 and isinstance(session_id, str) and session_id.startswith(
        "cs_"
    )
    artifact["steps"].append(
        {
            "step": "start_signup_checkout",
            "ok": ok_start,
            "http": code,
            "sessionId": session_id,
            "error": None if ok_start else out,
        }
    )
    print(f"[{'PASS' if ok_start else 'FAIL'}] start-signup-checkout http={code}")
    if not ok_start:
        OUT_DIR.mkdir(parents=True, exist_ok=True)
        (OUT_DIR / "s6-signup-happy-path.json").write_text(
            json.dumps(artifact, indent=2) + "\n"
        )
        return 1

    # 2) Confirm Checkout via payment_pages + tok_visa (test mode, amount 0 with trial)
    code_pm, pm = stripe(
        stripe_secret,
        "POST",
        "/v1/payment_methods",
        {
            "type": "card",
            "card[token]": "tok_visa",
            "billing_details[name]": admin_name,
            "billing_details[email]": email,
        },
    )
    if code_pm != 200 or not isinstance(pm, dict) or not pm.get("id"):
        artifact["steps"].append(
            {"step": "create_payment_method", "ok": False, "http": code_pm, "body": pm}
        )
        print(f"[FAIL] payment_method http={code_pm}")
        OUT_DIR.mkdir(parents=True, exist_ok=True)
        (OUT_DIR / "s6-signup-happy-path.json").write_text(
            json.dumps(artifact, indent=2) + "\n"
        )
        return 1

    code_c, conf = stripe(
        stripe_secret,
        "POST",
        f"/v1/payment_pages/{session_id}/confirm",
        {"payment_method": pm["id"], "expected_amount": "0"},
    )
    ok_confirm = code_c == 200 and isinstance(conf, dict) and conf.get("status") in (
        "complete",
        "succeeded",
    )
    # payment_pages returns status=complete; also accept checkout session retrieve
    code_s, sess = stripe(stripe_secret, "GET", f"/v1/checkout/sessions/{session_id}")
    sess_ok = (
        code_s == 200
        and isinstance(sess, dict)
        and sess.get("status") == "complete"
        and sess.get("payment_status") in ("paid", "no_payment_required")
        and bool(sess.get("subscription"))
    )
    ok_confirm = ok_confirm or sess_ok
    artifact["steps"].append(
        {
            "step": "stripe_checkout_confirm",
            "ok": ok_confirm,
            "http": code_c,
            "sessionStatus": sess.get("status") if isinstance(sess, dict) else None,
            "paymentStatus": sess.get("payment_status")
            if isinstance(sess, dict)
            else None,
            "subscription": sess.get("subscription") if isinstance(sess, dict) else None,
        }
    )
    print(
        f"[{'PASS' if ok_confirm else 'FAIL'}] checkout confirm "
        f"page={code_c} session={sess.get('status') if isinstance(sess, dict) else None}"
    )
    if not ok_confirm or not isinstance(sess, dict):
        OUT_DIR.mkdir(parents=True, exist_ok=True)
        (OUT_DIR / "s6-signup-happy-path.json").write_text(
            json.dumps(artifact, indent=2) + "\n"
        )
        return 1

    # 3) Ensure webhook ran — Stripe usually delivers; if status still pending, forward once
    ready: dict[str, Any] | None = None
    forwarded = False
    for i in range(24):
        code_st, st = http_json(
            "POST",
            f"{base}/functions/v1/signup-checkout-status",
            {"apikey": anon, "Authorization": f"Bearer {anon}"},
            {"sessionId": session_id},
        )
        if isinstance(st, dict) and st.get("status") == "ready":
            ready = st
            break
        if i == 4 and not forwarded and isinstance(st, dict) and st.get("status") in (
            "pending",
            "open",
        ):
            # Forward signed checkout.session.completed (DEV webhook secret)
            code_s2, sess2 = stripe(
                stripe_secret, "GET", f"/v1/checkout/sessions/{session_id}"
            )
            if code_s2 == 200 and isinstance(sess2, dict):
                evt_id = f"evt_s6_probe_{marker}"
                event = {
                    "id": evt_id,
                    "object": "event",
                    "api_version": "2024-11-20.acacia",
                    "created": int(time.time()),
                    "type": "checkout.session.completed",
                    "livemode": False,
                    "data": {"object": sess2},
                }
                payload = json.dumps(event, separators=(",", ":"))
                sig = stripe_sign(payload, whsec)
                req = urllib.request.Request(
                    f"{base}/functions/v1/stripe-webhook",
                    data=payload.encode("utf-8"),
                    headers={
                        "apikey": anon,
                        "Authorization": f"Bearer {anon}",
                        "Stripe-Signature": sig,
                        "Content-Type": "application/json",
                    },
                    method="POST",
                )
                try:
                    with urllib.request.urlopen(req, timeout=120) as r:
                        code_wh = r.status
                        body_wh = json.loads(r.read().decode() or "{}")
                except urllib.error.HTTPError as e:
                    code_wh = e.code
                    try:
                        body_wh = json.loads(e.read().decode())
                    except Exception:
                        body_wh = {}
                forwarded = True
                artifact["steps"].append(
                    {
                        "step": "forward_checkout_completed",
                        "ok": code_wh == 200
                        and isinstance(body_wh, dict)
                        and body_wh.get("received") is True,
                        "http": code_wh,
                        "body": body_wh,
                        "eventId": evt_id,
                    }
                )
                print(f"[info] forwarded webhook http={code_wh} body={body_wh!r}")
        time.sleep(1.5)

    ok_ready = (
        isinstance(ready, dict)
        and ready.get("status") == "ready"
        and bool(ready.get("companyId"))
        and bool(ready.get("inviteLink"))
    )
    artifact["steps"].append(
        {
            "step": "signup_checkout_status_ready",
            "ok": ok_ready,
            "status": ready,
        }
    )
    print(f"[{'PASS' if ok_ready else 'FAIL'}] signup-checkout-status ready={ok_ready}")

    # 4) DB oracle
    users = rest_get(
        base,
        service,
        "users",
        {
            "select": "id,email,company_id,invite_sign_in_link,system_permission",
            "email": f"eq.{email}",
        },
    )
    ok_user = (
        len(users) == 1
        and users[0].get("company_id")
        and users[0].get("invite_sign_in_link")
        and users[0].get("system_permission") == "admin"
    )
    artifact["steps"].append({"step": "db_user_oracle", "ok": ok_user, "user": users})
    print(f"[{'PASS' if ok_user else 'FAIL'}] public.users founding CA")

    company_id = (ready or {}).get("companyId") or (
        users[0].get("company_id") if users else None
    )
    cos: list[dict[str, Any]] = []
    if company_id:
        cos = rest_get(
            base,
            service,
            "companies",
            {"select": "id,name", "id": f"eq.{company_id}"},
        )
    ok_co = len(cos) == 1 and cos[0].get("name") == company
    artifact["steps"].append(
        {"step": "db_company_oracle", "ok": ok_co, "company": cos}
    )
    print(f"[{'PASS' if ok_co else 'FAIL'}] companies row")

    ok_all = ok_start and ok_confirm and ok_ready and ok_user and ok_co
    artifact["ok"] = ok_all
    artifact["companyId"] = company_id
    artifact["inviteLinkPresent"] = bool((ready or {}).get("inviteLink"))

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    out_path = OUT_DIR / "s6-signup-happy-path.json"
    out_path.write_text(json.dumps(artifact, indent=2) + "\n")
    print(f"artifact: {out_path}")
    if ok_all:
        print("GO: signup happy path (test-mode checkout → company + invite)")
        return 0
    print("NO-GO: signup happy path", file=sys.stderr)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
