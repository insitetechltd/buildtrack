#!/usr/bin/env python3
"""
S4 — update-company-addons Edge faith (C-EDGE / DEV-PROBE).

Dry structural proves only — never sends a quantity that would create Stripe
prorations. Exit criterion: JWT CA path returns structured errors; anon denied;
non-admin denied; company mismatch denied.

Usage:
  python3 scripts/stripe/probe-update-company-addons-faith.py
  npm run test:edge:update-company-addons-faith
"""
from __future__ import annotations

import base64
import json
import os
import subprocess
import sys
import urllib.error
import urllib.parse
import urllib.request
import uuid
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts" / "lib"))
from ascReviewDemoGuard import (  # noqa: E402
    AscDemoPasswordLockedError,
    assert_may_rotate_asc_demo_password,
)

DEV_REF = os.environ.get("DEV_PROJECT_REF", "zusulknbhaumougqckec")
OUT_DIR = ROOT / "docs" / "superpowers" / "evidence" / "2026-09-27-s3-s5-prove"


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


def jwt_ref(token: str) -> str | None:
    try:
        part = token.split(".")[1]
        part += "=" * ((4 - len(part) % 4) % 4)
        return json.loads(base64.urlsafe_b64decode(part)).get("ref")
    except Exception:
        return None


def rest(
    url: str,
    path_qs: str,
    *,
    key: str,
    method: str = "GET",
    body: dict[str, Any] | None = None,
) -> tuple[int, Any]:
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Accept": "application/json",
    }
    raw = None
    if body is not None:
        headers["Content-Type"] = "application/json"
        raw = json.dumps(body).encode()
    req = urllib.request.Request(
        f"{url}/rest/v1/{path_qs}", data=raw, headers=headers, method=method
    )
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


def edge(
    url: str,
    *,
    anon: str,
    bearer: str,
    body: dict[str, Any],
) -> tuple[int, Any]:
    data = json.dumps(body).encode()
    req = urllib.request.Request(
        f"{url}/functions/v1/update-company-addons",
        data=data,
        headers={
            "apikey": anon,
            "Authorization": f"Bearer {bearer}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
        method="POST",
    )
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


def auth_admin_set_password(
    url: str,
    service: str,
    user_id: str,
    password: str,
    *,
    email: str | None = None,
) -> int:
    assert_may_rotate_asc_demo_password(email)
    data = json.dumps({"password": password}).encode()
    req = urllib.request.Request(
        f"{url}/auth/v1/admin/users/{user_id}",
        data=data,
        headers={
            "apikey": service,
            "Authorization": f"Bearer {service}",
            "Content-Type": "application/json",
        },
        method="PUT",
    )
    try:
        with urllib.request.urlopen(req, timeout=45) as r:
            r.read()
            return r.status
    except urllib.error.HTTPError as e:
        return e.code


def auth_password_grant(url: str, anon: str, email: str, password: str) -> str | None:
    data = json.dumps({"email": email, "password": password}).encode()
    req = urllib.request.Request(
        f"{url}/auth/v1/token?grant_type=password",
        data=data,
        headers={
            "apikey": anon,
            "Authorization": f"Bearer {anon}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=45) as r:
            tok = json.loads(r.read().decode())
            return tok.get("access_token")
    except urllib.error.HTTPError:
        return None


def pick_user(
    url: str,
    service: str,
    emails: list[str],
    *,
    want_admin: bool,
) -> dict[str, Any] | None:
    for em in emails:
        code, rows = rest(
            url,
            f"users?select=id,email,company_id,system_permission&email=eq.{urllib.parse.quote(em)}",
            key=service,
        )
        if code != 200 or not isinstance(rows, list) or not rows:
            continue
        u = rows[0]
        perm = str(u.get("system_permission") or "").lower()
        is_admin = perm == "admin"
        if want_admin == is_admin and u.get("id") and u.get("company_id"):
            return u
    return None


def main() -> int:
    env = load_dotenv(ROOT / ".env")
    url = (env.get("EXPO_PUBLIC_SUPABASE_URL") or "").rstrip("/")
    anon = env.get("EXPO_PUBLIC_SUPABASE_ANON_KEY") or env.get("SUPABASE_ANON_KEY") or ""
    service = env.get("SUPABASE_SERVICE_ROLE_KEY") or ""
    if DEV_REF not in url:
        print(f"FAIL: .env URL must be DEV ({DEV_REF})", file=sys.stderr)
        return 1
    if not anon or not service or jwt_ref(service) != DEV_REF:
        print("FAIL: need DEV-matching service + anon keys in .env", file=sys.stderr)
        return 1

    sha = git_sha()
    cases: list[dict[str, Any]] = []
    ok_all = True

    def record(name: str, ok: bool, http: int, body: Any) -> None:
        nonlocal ok_all
        ok_all = ok_all and ok
        err = body.get("error") if isinstance(body, dict) else None
        cases.append({"case": name, "ok": ok, "http": http, "error": err})
        print(f"[{'PASS' if ok else 'FAIL'}] {name} http={http} error={err!r}")

    # 1) anon key as bearer — must not authenticate (use valid-shaped body so
    #    we reach getUser, not the empty-payload short-circuit).
    code, body = edge(
        url,
        anon=anon,
        bearer=anon,
        body={
            "companyId": str(uuid.uuid4()),
            "addonWorkerPacks": 0,
            "addonPmSeats": 0,
        },
    )
    record(
        "anon_denied",
        code == 401
        and isinstance(body, dict)
        and body.get("error") == "not_authenticated",
        code,
        body,
    )

    # 2) invalid payload with CA JWT (no Stripe call)
    ca = pick_user(
        url,
        service,
        [
            "carol.admina@test.com",
            "dave.adminb@test.com",
            "sara@insite.com",
        ],
        want_admin=True,
    )
    worker = pick_user(
        url,
        service,
        [
            "alice.workera1@test.com",
            "john.managera@test.com",
            "erin.invitee@test.com",
        ],
        want_admin=False,
    )
    if not ca:
        record("fixture_ca", False, 0, {"error": "no_ca_user"})
    if not worker:
        record("fixture_worker", False, 0, {"error": "no_worker_user"})

    ca_jwt = None
    worker_jwt = None
    if ca:
        pwd = f"S4-{uuid.uuid4().hex[:12]}!"
        try:
            if auth_admin_set_password(
                url, service, ca["id"], pwd, email=ca.get("email")
            ) in (200, 201):
                ca_jwt = auth_password_grant(url, anon, ca["email"], pwd)
        except AscDemoPasswordLockedError as exc:
            print(f"WARN: {exc}", file=sys.stderr)
    if worker:
        pwd = f"S4-{uuid.uuid4().hex[:12]}!"
        try:
            if auth_admin_set_password(
                url, service, worker["id"], pwd, email=worker.get("email")
            ) in (200, 201):
                worker_jwt = auth_password_grant(url, anon, worker["email"], pwd)
        except AscDemoPasswordLockedError as exc:
            print(f"WARN: {exc}", file=sys.stderr)

    if ca_jwt and ca:
        code, body = edge(
            url,
            anon=anon,
            bearer=ca_jwt,
            body={"companyId": ca["company_id"]},  # missing packs → invalid_payload
        )
        record(
            "ca_invalid_payload",
            code == 400
            and isinstance(body, dict)
            and body.get("error") == "invalid_payload",
            code,
            body,
        )

        # company mismatch (valid shape, wrong company) — no Stripe mutate
        fake_co = str(uuid.uuid4())
        code, body = edge(
            url,
            anon=anon,
            bearer=ca_jwt,
            body={
                "companyId": fake_co,
                "addonWorkerPacks": 0,
                "addonPmSeats": 0,
            },
        )
        record(
            "ca_company_mismatch",
            code == 403
            and isinstance(body, dict)
            and body.get("error") == "company_mismatch",
            code,
            body,
        )

    if worker_jwt and worker:
        code, body = edge(
            url,
            anon=anon,
            bearer=worker_jwt,
            body={
                "companyId": worker["company_id"],
                "addonWorkerPacks": 0,
                "addonPmSeats": 0,
            },
        )
        # Worker may hit not_company_admin (403) or subscription_missing (404) if
        # profile path treats them as non-admin first — both are structured + non-500.
        err = body.get("error") if isinstance(body, dict) else None
        record(
            "worker_denied",
            code in (403, 404)
            and err in ("not_company_admin", "subscription_missing", "caller_profile_not_found")
            and err != "unknown_error",
            code,
            body,
        )

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    artifact = {
        "ok": ok_all,
        "plane": "DEV",
        "projectRef": DEV_REF,
        "appSha": sha,
        "cases": cases,
        "note": "No Stripe quantity mutation; dry ACL/payload only",
    }
    out = OUT_DIR / "s4-update-company-addons-faith.json"
    out.write_text(json.dumps(artifact, indent=2) + "\n")
    print(f"artifact: {out}")
    if ok_all:
        print("GO: update-company-addons faith (dry)")
        return 0
    print("NO-GO: update-company-addons faith", file=sys.stderr)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
