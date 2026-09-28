#!/usr/bin/env python3
"""
S6 — signup happy path (C-EDGE / DEV-PROBE).

Exit criterion (blind-spot audit WEB-01):
  start-signup-checkout → Stripe test Checkout confirm (tok_visa) →
  webhook provisions company + founding CA → signup-checkout-status ready
  (invite link + companyId).

Also proves founder insert-if-missing (Grok residual #3):
  precreate auth.users → delete public.users → same checkout path must still
  provision via promoteFoundingAdminProfile INSERT branch + auth-id recovery.

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


def auth_admin_create_user(
    base: str, service: str, email: str, password: str
) -> tuple[int, Any]:
    return http_json(
        "POST",
        f"{base}/auth/v1/admin/users",
        {
            "apikey": service,
            "Authorization": f"Bearer {service}",
            "Accept": "application/json",
        },
        {
            "email": email,
            "password": password,
            "email_confirm": True,
            "user_metadata": {"probe": "s6-insert-branch"},
        },
    )


def rest_delete_users_by_id(base: str, service: str, user_id: str) -> tuple[int, Any]:
    return http_json(
        "DELETE",
        f"{base}/rest/v1/users?id=eq.{urllib.parse.quote(user_id)}",
        {
            "apikey": service,
            "Authorization": f"Bearer {service}",
            "Accept": "application/json",
            "Prefer": "return=minimal",
        },
    )


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


def run_signup_case(
    *,
    label: str,
    base: str,
    anon: str,
    service: str,
    stripe_secret: str,
    whsec: str,
    plan_price_id: str,
    sha: str,
    email: str,
    company: str,
    admin_name: str,
    marker: str,
    event_prefix: str,
) -> dict[str, Any]:
    artifact: dict[str, Any] = {
        "ok": False,
        "case": label,
        "plane": "DEV",
        "projectRef": DEV_REF,
        "appSha": sha,
        "email": email,
        "planPriceId": plan_price_id,
        "steps": [],
    }
    print(f"\n=== {label} email={email} ===")

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
        return artifact

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
        return artifact

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
        return artifact

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
            code_s2, sess2 = stripe(
                stripe_secret, "GET", f"/v1/checkout/sessions/{session_id}"
            )
            if code_s2 == 200 and isinstance(sess2, dict):
                evt_id = f"evt_{event_prefix}_{marker}"
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
    if users:
        artifact["userId"] = users[0].get("id")
    return artifact


def prepare_insert_branch_orphan(
    base: str, service: str, email: str
) -> dict[str, Any]:
    """Auth exists, public.users missing — forces webhook insert-if-missing."""
    pwd = f"S6Insert-{uuid.uuid4().hex[:12]}!"
    code, created = auth_admin_create_user(base, service, email, pwd)
    user_id = None
    if isinstance(created, dict):
        user_id = (created.get("id") or (created.get("user") or {}).get("id"))
    step: dict[str, Any] = {
        "step": "precreate_auth_orphan_profile",
        "ok": False,
        "http": code,
        "authUserId": user_id,
    }
    if code not in (200, 201) or not user_id:
        step["body"] = created
        print(f"[FAIL] auth precreate http={code}")
        return step

    # Trigger may have inserted public.users — strip it so promote hits INSERT.
    dcode, _ = rest_delete_users_by_id(base, service, str(user_id))
    left = rest_get(
        base,
        service,
        "users",
        {"select": "id", "id": f"eq.{user_id}"},
    )
    step["deleteHttp"] = dcode
    step["profileAbsent"] = len(left) == 0
    step["ok"] = len(left) == 0
    print(
        f"[{'PASS' if step['ok'] else 'FAIL'}] orphan fixture "
        f"auth={user_id} profile_absent={step['profileAbsent']}"
    )
    return step


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

    common = dict(
        base=base,
        anon=anon,
        service=service,
        stripe_secret=stripe_secret,
        whsec=whsec,
        plan_price_id=plan_price_id,
        sha=sha,
    )

    # Case A — fresh signup (createUser → update/insert after trigger)
    m_a = uuid.uuid4().hex[:10]
    fresh = run_signup_case(
        label="fresh_signup",
        email=f"s6.signup.{m_a}@example.com",
        company=f"S6 Signup {m_a}",
        admin_name="S6 Signup Admin",
        marker=m_a,
        event_prefix="s6_probe",
        **common,
    )

    # Case B — insert-if-missing: auth present, public.users absent
    m_b = uuid.uuid4().hex[:10]
    email_b = f"s6.insert.{m_b}@example.com"
    orphan = prepare_insert_branch_orphan(base, service, email_b)
    insert_case = run_signup_case(
        label="insert_if_missing",
        email=email_b,
        company=f"S6 Insert {m_b}",
        admin_name="S6 Insert Admin",
        marker=m_b,
        event_prefix="s6_insert",
        **common,
    )
    insert_case["steps"].insert(0, orphan)
    if not orphan.get("ok"):
        insert_case["ok"] = False

    # Prove the founding profile id matches the precreated auth user (INSERT, not new auth)
    if orphan.get("ok") and orphan.get("authUserId") and insert_case.get("userId"):
        id_match = str(orphan["authUserId"]) == str(insert_case["userId"])
        insert_case["steps"].append(
            {
                "step": "auth_id_reused_on_insert",
                "ok": id_match,
                "authUserId": orphan["authUserId"],
                "profileUserId": insert_case["userId"],
            }
        )
        print(f"[{'PASS' if id_match else 'FAIL'}] auth id reused on profile insert")
        if not id_match:
            insert_case["ok"] = False

    report = {
        "ok": bool(fresh.get("ok") and insert_case.get("ok")),
        "plane": "DEV",
        "projectRef": DEV_REF,
        "appSha": sha,
        "planPriceId": plan_price_id,
        "cases": {
            "fresh_signup": fresh,
            "insert_if_missing": insert_case,
        },
    }

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    out_path = OUT_DIR / "s6-signup-happy-path.json"
    out_path.write_text(json.dumps(report, indent=2) + "\n")
    print(f"\nartifact: {out_path}")
    if report["ok"]:
        print("GO: signup happy path + insert-if-missing branch")
        return 0
    print("NO-GO: signup happy path / insert-if-missing", file=sys.stderr)
    if not fresh.get("ok"):
        print("  fresh_signup FAIL", file=sys.stderr)
    if not insert_case.get("ok"):
        print("  insert_if_missing FAIL", file=sys.stderr)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
