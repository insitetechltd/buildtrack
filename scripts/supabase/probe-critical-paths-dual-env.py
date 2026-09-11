#!/usr/bin/env python3
"""
DEV ↔ PROD critical-path probe.

Catches schema / API drift that app dual-path code must survive — so we do not
discover PROD-only 42703/PGRST204 after TestFlight dogfood.

Usage (from repo root):
  python3 scripts/supabase/probe-critical-paths-dual-env.py
  npm run test:dual-env:critical

Exit 0 = all checks PASS (or documented ALLOWED_DRIFT).
Exit 1 = FAIL (app would break on one env without dual-path / missing deploy).
"""
from __future__ import annotations

import json
import sys
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
DEV_REF = "zusulknbhaumougqckec"
PROD_REF = "jcnzjigxgkzhjsaekoqz"


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


def management_service_role(access_token: str, ref: str) -> str:
    req = urllib.request.Request(
        f"https://api.supabase.com/v1/projects/{ref}/api-keys",
        headers={"Authorization": f"Bearer {access_token}"},
    )
    with urllib.request.urlopen(req, timeout=45) as r:
        keys = json.loads(r.read().decode())
    for k in keys:
        if k.get("name") == "service_role" and k.get("api_key"):
            return k["api_key"]
    raise RuntimeError(f"No service_role key for {ref}")


def management_anon(access_token: str, ref: str) -> str:
    req = urllib.request.Request(
        f"https://api.supabase.com/v1/projects/{ref}/api-keys",
        headers={"Authorization": f"Bearer {access_token}"},
    )
    with urllib.request.urlopen(req, timeout=45) as r:
        keys = json.loads(r.read().decode())
    for k in keys:
        if k.get("name") == "anon" and k.get("api_key"):
            return k["api_key"]
    raise RuntimeError(f"No anon key for {ref}")


@dataclass
class CheckResult:
    name: str
    ok: bool
    detail: str = ""
    severity: str = "FAIL"  # FAIL | WARN | PASS


@dataclass
class EnvProbe:
    label: str
    ref: str
    url: str
    service_key: str
    anon_key: str
    results: list[CheckResult] = field(default_factory=list)
    columns: dict[str, set[str]] = field(default_factory=dict)

    def rest(
        self,
        path_qs: str,
        *,
        key: str | None = None,
        method: str = "GET",
        body: bytes | None = None,
        extra_headers: dict[str, str] | None = None,
    ) -> tuple[int, Any]:
        token = key or self.service_key
        headers = {
            "apikey": token,
            "Authorization": f"Bearer {token}",
            "Accept": "application/json",
        }
        if body is not None:
            headers["Content-Type"] = "application/json"
        if extra_headers:
            headers.update(extra_headers)
        req = urllib.request.Request(
            f"{self.url}/rest/v1/{path_qs}",
            data=body,
            headers=headers,
            method=method,
        )
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                raw = r.read().decode()
                return r.status, json.loads(raw) if raw else None
        except urllib.error.HTTPError as e:
            raw = e.read().decode()
            try:
                payload = json.loads(raw) if raw else {"message": raw}
            except json.JSONDecodeError:
                payload = {"message": raw}
            return e.code, payload

    def rpc(
        self, name: str, body: dict[str, Any], *, key: str | None = None
    ) -> tuple[int, Any]:
        token = key or self.service_key
        data = json.dumps(body).encode()
        headers = {
            "apikey": token,
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        }
        req = urllib.request.Request(
            f"{self.url}/rest/v1/rpc/{name}",
            data=data,
            headers=headers,
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                raw = r.read().decode()
                return r.status, json.loads(raw) if raw else None
        except urllib.error.HTTPError as e:
            raw = e.read().decode()
            try:
                payload = json.loads(raw) if raw else {"message": raw}
            except json.JSONDecodeError:
                payload = {"message": raw}
            return e.code, payload

    def edge(self, name: str, body: dict[str, Any]) -> tuple[int, Any]:
        data = json.dumps(body).encode()
        headers = {
            "apikey": self.anon_key,
            "Authorization": f"Bearer {self.anon_key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        }
        req = urllib.request.Request(
            f"{self.url}/functions/v1/{name}",
            data=data,
            headers=headers,
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                raw = r.read().decode()
                return r.status, json.loads(raw) if raw else None
        except urllib.error.HTTPError as e:
            raw = e.read().decode()
            try:
                payload = json.loads(raw) if raw else {"message": raw}
            except json.JSONDecodeError:
                payload = {"message": raw}
            return e.code, payload

    def add(self, name: str, ok: bool, detail: str = "", severity: str | None = None):
        sev = severity or ("PASS" if ok else "FAIL")
        self.results.append(CheckResult(name=name, ok=ok, detail=detail, severity=sev))


def probe_table_columns(env: EnvProbe, table: str) -> set[str]:
    """Infer columns from one row, or from OpenAPI-ish select errors."""
    code, payload = env.rest(f"{table}?select=*&limit=1")
    if code == 200 and isinstance(payload, list) and payload:
        cols = set(payload[0].keys())
        env.columns[table] = cols
        return cols
    # Empty table: probe known candidates
    candidates = {
        "users": [
            "id",
            "email",
            "company_id",
            "role",
            "system_permission",
            "is_pending",
            "must_set_password",
            "invite_sign_in_link",
        ],
        "user_project_assignments": [
            "id",
            "user_id",
            "project_id",
            "category",
            "project_role",
            "assigned_at",
            "created_at",
            "assigned_by",
            "is_active",
        ],
        "projects": ["id", "name", "company_id", "created_by", "status"],
        "tasks": [
            "id",
            "title",
            "status",
            "current_status",
            "primary_assignee_id",
            "assigned_to",
            "tags",
            "location_on_site",
        ],
    }.get(table, ["id"])
    present: set[str] = set()
    for col in candidates:
        c, _ = env.rest(f"{table}?select={col}&limit=1")
        if c == 200:
            present.add(col)
    env.columns[table] = present
    return present


def run_env_probes(env: EnvProbe) -> None:
    # --- Schema presence ---
    users_cols = probe_table_columns(env, "users")
    upa_cols = probe_table_columns(env, "user_project_assignments")
    projects_cols = probe_table_columns(env, "projects")
    tasks_cols = probe_table_columns(env, "tasks")

    has_role = "role" in users_cols
    has_sys = "system_permission" in users_cols
    env.add(
        "users.admin_column",
        has_role or has_sys,
        f"role={has_role} system_permission={has_sys}",
    )

    has_category = "category" in upa_cols
    has_project_role = "project_role" in upa_cols
    env.add(
        "upa.role_column",
        has_category or has_project_role,
        f"category={has_category} project_role={has_project_role}",
    )

    has_assigned_at = "assigned_at" in upa_cols
    has_created_at = "created_at" in upa_cols
    env.add(
        "upa.timestamp_column",
        has_assigned_at or has_created_at,
        f"assigned_at={has_assigned_at} created_at={has_created_at}",
    )

    env.add("projects.core", "id" in projects_cols and "company_id" in projects_cols, str(sorted(projects_cols)))
    env.add(
        "tasks.status_surface",
        ("status" in tasks_cols) or ("current_status" in tasks_cols),
        f"status={'status' in tasks_cols} current_status={'current_status' in tasks_cols}",
    )

    # --- App-shaped queries (the Joe/Sara failure class) ---
    code, payload = env.rest(
        "user_project_assignments?select=*&is_active=eq.true&order=assigned_at.desc&limit=1"
    )
    assigned_at_order_ok = code == 200
    env.add(
        "app_query.upa_order_assigned_at",
        True,  # informational — dual-path must handle failure
        f"http={code} ok={assigned_at_order_ok}"
        + ("" if assigned_at_order_ok else f" err={payload}"),
        severity="PASS" if assigned_at_order_ok else "WARN",
    )
    if not assigned_at_order_ok:
        code2, payload2 = env.rest(
            "user_project_assignments?select=*&is_active=eq.true&order=created_at.desc&limit=1"
        )
        env.add(
            "app_query.upa_order_created_at_fallback",
            code2 == 200,
            f"http={code2} payload_type={type(payload2).__name__}",
        )
    else:
        env.add("app_query.upa_order_created_at_fallback", True, "not needed (assigned_at works)")

    # Dual-path role insert probe: which column accepts a dry select filter
    role_col = "project_role" if has_project_role else ("category" if has_category else None)
    env.add(
        "upa.insert_role_target",
        role_col is not None,
        f"app must write {role_col}",
    )

    # --- Login RPC (email-first Sign Up / Sign In) ---
    code, payload = env.rpc(
        "login_identifier_is_registered",
        {"p_identifier": "nobody-dual-env-probe@example.com"},
        key=env.anon_key,
    )
    env.add(
        "rpc.login_identifier_is_registered",
        code == 200 and payload is False,
        f"http={code} body={payload!r}",
    )

    # Wrong param name must fail — documents PostgREST contract
    code_bad, _ = env.rpc(
        "login_identifier_is_registered",
        {"identifier": "nobody@example.com"},
        key=env.anon_key,
    )
    env.add(
        "rpc.login_identifier_requires_p_identifier",
        code_bad != 200,
        f"http={code_bad} (must reject bare 'identifier')",
    )

    # --- Anon blocked on users ---
    code, payload = env.rest("users?select=id&limit=1", key=env.anon_key)
    anon_blocked = code in (401, 403) or (
        isinstance(payload, dict)
        and (
            "permission" in str(payload).lower()
            or "jwt" in str(payload).lower()
            or payload.get("code") in ("42501", "PGRST301")
        )
    )
    # Empty list with 200 can also mean RLS filtered all — treat as ok if no rows leaked
    if code == 200 and payload == []:
        anon_blocked = True
    env.add("rls.anon_users_blocked", anon_blocked, f"http={code}")

    # --- Signup edges (public) ---
    code, payload = env.edge("start-signup-checkout", {})
    env.add(
        "edge.start-signup-checkout",
        code == 400 and isinstance(payload, dict) and payload.get("error") == "invalid_payload",
        f"http={code} body={payload}",
    )
    code, payload = env.edge("signup-checkout-status", {"sessionId": "bad"})
    env.add(
        "edge.signup-checkout-status",
        code == 400
        and isinstance(payload, dict)
        and payload.get("error") == "invalid_session_id",
        f"http={code} body={payload}",
    )

    # --- Membership access helper for a known worker if present ---
    # Prefer PROD joe@insitetest.com / DEV joe@insite.com
    email_candidates = (
        ["joe@insitetest.com", "sara@insitetest.com"]
        if env.ref == PROD_REF
        else ["joe@insite.com", "sara@insite.com"]
    )
    found_user = None
    for email in email_candidates:
        select = "id,email,company_id"
        if has_sys:
            select += ",system_permission"
        if has_role:
            select += ",role"
        code, rows = env.rest(
            f"users?select={select}&email=eq.{urllib.parse.quote(email)}"
        )
        if code == 200 and isinstance(rows, list) and rows:
            found_user = rows[0]
            break
    if found_user:
        uid = found_user["id"]
        code, rows = env.rest(
            f"user_project_assignments?select=project_id,is_active&user_id=eq.{uid}&is_active=eq.true"
        )
        env.add(
            "path.member_assignments_readable",
            code == 200 and isinstance(rows, list),
            f"user={found_user.get('email')} assignments={len(rows) if isinstance(rows, list) else 'err'} http={code}",
        )
        if code == 200 and isinstance(rows, list) and rows:
            pid = rows[0]["project_id"]
            # Mirror app order dual-path for this user
            code_a, _ = env.rest(
                f"user_project_assignments?select=*&user_id=eq.{uid}&is_active=eq.true&order=assigned_at.desc"
            )
            if code_a != 200:
                code_c, rows_c = env.rest(
                    f"user_project_assignments?select=*&user_id=eq.{uid}&is_active=eq.true&order=created_at.desc"
                )
                env.add(
                    "path.member_assignment_order_dual",
                    code_c == 200 and isinstance(rows_c, list) and len(rows_c) > 0,
                    f"assigned_at_http={code_a} created_at_http={code_c}",
                )
            else:
                env.add(
                    "path.member_assignment_order_dual",
                    True,
                    "assigned_at order works",
                )
            code_p, prows = env.rest(f"projects?select=id,name&id=eq.{pid}")
            env.add(
                "path.member_project_readable",
                code_p == 200 and isinstance(prows, list) and len(prows) == 1,
                f"project={pid} http={code_p}",
            )
    else:
        env.add(
            "path.member_assignments_readable",
            False,
            f"no seed user among {email_candidates}",
            severity="WARN",
        )


def compare_envs(dev: EnvProbe, prod: EnvProbe) -> list[CheckResult]:
    """Diff schema surfaces; FAIL only when drift is unhandled by known dual-path."""
    out: list[CheckResult] = []

    def col(env: EnvProbe, table: str, name: str) -> bool:
        return name in env.columns.get(table, set())

    # Documented allowed drift (app has dual-path)
    allowed = [
        ("users", "role", "system_permission", "users admin ACL column"),
        ("user_project_assignments", "category", "project_role", "UPA role column"),
        ("user_project_assignments", "assigned_at", "created_at", "UPA timestamp"),
    ]
    for table, a, b, label in allowed:
        da, db = col(dev, table, a), col(dev, table, b)
        pa, pb = col(prod, table, a), col(prod, table, b)
        # Each env must have at least one of the pair
        ok = (da or db) and (pa or pb)
        detail = f"DEV {a}={da}/{b}={db} | PROD {a}={pa}/{b}={pb}"
        if da != pa or db != pb:
            detail += " | DRIFT (allowed if dual-path)"
        out.append(
            CheckResult(
                name=f"drift.{label}",
                ok=ok,
                detail=detail,
                severity="PASS" if ok else "FAIL",
            )
        )
        if (da != pa or db != pb) and ok:
            # Surface drift explicitly so we stop "discovering" it on TF
            out.append(
                CheckResult(
                    name=f"drift_notice.{label}",
                    ok=True,
                    detail=detail,
                    severity="WARN",
                )
            )

    # Same critical RPCs / edges must exist on both
    for prefix in (
        "rpc.login_identifier_is_registered",
        "edge.start-signup-checkout",
        "edge.signup-checkout-status",
        "app_query.upa_order_created_at_fallback",
    ):
        d = next((r for r in dev.results if r.name == prefix), None)
        p = next((r for r in prod.results if r.name == prefix), None)
        if not d or not p:
            out.append(
                CheckResult(
                    name=f"parity.{prefix}",
                    ok=False,
                    detail="missing check on one env",
                )
            )
            continue
        ok = d.ok and p.ok
        out.append(
            CheckResult(
                name=f"parity.{prefix}",
                ok=ok,
                detail=f"DEV ok={d.ok} ({d.detail}) | PROD ok={p.ok} ({p.detail})",
                severity="PASS" if ok else "FAIL",
            )
        )

    return out


def main() -> int:
    env = load_dotenv(ROOT / ".env")
    token = env.get("SUPABASE_ACCESS_TOKEN")
    if not token:
        print("FAIL: SUPABASE_ACCESS_TOKEN missing in .env", file=sys.stderr)
        return 1

    # DEV credentials: prefer .env URL if it is DEV, else Management API
    dev_url = env.get("EXPO_PUBLIC_SUPABASE_URL", f"https://{DEV_REF}.supabase.co").rstrip("/")
    if DEV_REF not in dev_url:
        dev_url = f"https://{DEV_REF}.supabase.co"
    try:
        dev_sr = env.get("SUPABASE_SERVICE_ROLE_KEY") or management_service_role(token, DEV_REF)
        # If .env service role is for a different project, prefer Management API
        import base64

        def jwt_ref(k: str) -> str | None:
            try:
                part = k.split(".")[1]
                part += "=" * ((4 - len(part) % 4) % 4)
                return json.loads(base64.urlsafe_b64decode(part)).get("ref")
            except Exception:
                return None

        if jwt_ref(dev_sr) != DEV_REF:
            dev_sr = management_service_role(token, DEV_REF)
        dev_anon = management_anon(token, DEV_REF)
    except Exception as e:
        print(f"FAIL: DEV keys: {e}", file=sys.stderr)
        return 1

    try:
        prod_sr = management_service_role(token, PROD_REF)
        prod_anon = management_anon(token, PROD_REF)
    except Exception as e:
        print(f"FAIL: PROD keys: {e}", file=sys.stderr)
        return 1

    prod_url = f"https://{PROD_REF}.supabase.co"

    dev = EnvProbe("DEV", DEV_REF, dev_url, dev_sr, dev_anon)
    prod = EnvProbe("PROD", PROD_REF, prod_url, prod_sr, prod_anon)

    print("=== Critical-path dual-env probe ===")
    print(f"DEV  {dev.ref}")
    print(f"PROD {prod.ref}")
    print()

    run_env_probes(dev)
    run_env_probes(prod)
    cross = compare_envs(dev, prod)

    fails = 0
    warns = 0

    def print_block(title: str, results: list[CheckResult]):
        nonlocal fails, warns
        print(f"--- {title} ---")
        for r in results:
            if r.severity == "WARN":
                mark = "WARN"
                warns += 1
            elif r.ok:
                mark = "PASS"
            else:
                mark = "FAIL"
                fails += 1
            print(f"  [{mark}] {r.name}: {r.detail}")
        print()

    print_block("DEV", dev.results)
    print_block("PROD", prod.results)
    print_block("DEV↔PROD", cross)

    print(f"summary: fails={fails} warns={warns}")
    if fails:
        print(
            "NO-GO: fix dual-path / deploy missing pieces before TF dogfood.",
            file=sys.stderr,
        )
        return 1
    print("GO: critical API surfaces OK on DEV and PROD (drift documented).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
