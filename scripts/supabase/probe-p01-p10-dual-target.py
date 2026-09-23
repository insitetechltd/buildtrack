#!/usr/bin/env python3
"""
P01–P11 + F6 critical-path dual-target matrix (PROD NEW SoT Harden + JWT track).

Same case IDs on DEV and PROD (NEW). Every result includes
{plane, projectRef, appSha}. App-shaped 42703/PGRST204 on PROD critical writes = FAIL
unless the strip/junction recovery path succeeds.

Service-role cases remain control. JWT-* cases prove RLS + app-shaped payloads
under a real QA session (Auth Admin sets a temporary password for the run).
P11 proves Report create (`status=reported` + `issue_reported` activity without
top-level status column) → resolve (`status=resolved`) → cleanup.
F6 proves JWT user cannot read/write tasks on a project they are not assigned to.

Usage (repo root):
  python3 scripts/supabase/probe-p01-p10-dual-target.py
"""
from __future__ import annotations

import json
import os
import subprocess
import sys
import urllib.error
import urllib.parse
import urllib.request
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
DEV_REF = "zusulknbhaumougqckec"
PROD_REF = "jcnzjigxgkzhjsaekoqz"
OUT_DIR = ROOT / ".cache" / "prod-new-sot-20260915"
OUT_JSON = OUT_DIR / "phase2-p01-p10-matrix.json"
OUT_MD = OUT_DIR / "phase2-p01-p10-matrix.md"
EVIDENCE_MD = (
    ROOT / "docs" / "superpowers" / "evidence" / "2026-09-15-phase2-p01-p10-matrix.md"
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
            subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=ROOT)
            .decode()
            .strip()
        )
    except Exception:
        return "unknown"


def management_key(access_token: str, ref: str, name: str) -> str:
    req = urllib.request.Request(
        f"https://api.supabase.com/v1/projects/{ref}/api-keys",
        headers={"Authorization": f"Bearer {access_token}"},
    )
    with urllib.request.urlopen(req, timeout=45) as r:
        keys = json.loads(r.read().decode())
    for k in keys:
        if k.get("name") == name and k.get("api_key"):
            return k["api_key"]
    raise RuntimeError(f"No {name} key for {ref}")


@dataclass
class CaseResult:
    case_id: str
    plane: str
    project_ref: str
    app_sha: str
    ok: bool
    classification: str
    detail: str


@dataclass
class EnvCtx:
    plane: str
    ref: str
    url: str
    service_key: str
    anon_key: str
    dialect: str  # OLD | NEW
    app_sha: str
    results: list[CaseResult] = field(default_factory=list)

    def assert_ref(self) -> None:
        if self.ref not in self.url:
            raise RuntimeError(f"plane-mismatch: url {self.url} vs ref {self.ref}")

    def rest(
        self,
        path_qs: str,
        *,
        method: str = "GET",
        body: dict[str, Any] | list[Any] | None = None,
        prefer: str | None = None,
        key: str | None = None,
    ) -> tuple[int, Any]:
        # PostgREST: apikey must be anon|service_role; user JWT goes only in Authorization.
        bearer = key or self.service_key
        apikey = (
            self.anon_key
            if key and key not in (self.service_key, self.anon_key)
            else (key or self.service_key)
        )
        if key == self.service_key or key is None:
            apikey = self.service_key
            bearer = self.service_key
        elif key == self.anon_key:
            apikey = self.anon_key
            bearer = self.anon_key
        else:
            # user JWT
            apikey = self.anon_key
            bearer = key
        headers = {
            "apikey": apikey,
            "Authorization": f"Bearer {bearer}",
            "Accept": "application/json",
        }
        raw_body = None
        if body is not None:
            headers["Content-Type"] = "application/json"
            raw_body = json.dumps(body).encode()
        if prefer:
            headers["Prefer"] = prefer
        req = urllib.request.Request(
            f"{self.url}/rest/v1/{path_qs}",
            data=raw_body,
            headers=headers,
            method=method,
        )
        try:
            with urllib.request.urlopen(req, timeout=45) as r:
                text = r.read().decode()
                return r.status, json.loads(text) if text else None
        except urllib.error.HTTPError as e:
            text = e.read().decode()
            try:
                payload = json.loads(text) if text else {"message": text}
            except json.JSONDecodeError:
                payload = {"message": text}
            return e.code, payload

    def edge(
        self, name: str, body: dict[str, Any], *, bearer: str | None = None
    ) -> tuple[int, Any]:
        token = bearer or self.anon_key
        data = json.dumps(body).encode()
        headers = {
            "apikey": self.anon_key,
            "Authorization": f"Bearer {token}",
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
            with urllib.request.urlopen(req, timeout=45) as r:
                text = r.read().decode()
                return r.status, json.loads(text) if text else None
        except urllib.error.HTTPError as e:
            text = e.read().decode()
            try:
                payload = json.loads(text) if text else {"message": text}
            except json.JSONDecodeError:
                payload = {"message": text}
            return e.code, payload

    def add(
        self,
        case_id: str,
        ok: bool,
        detail: str,
        classification: str = "",
    ) -> None:
        if not classification:
            classification = "PASS" if ok else "FAIL"
        self.results.append(
            CaseResult(
                case_id=case_id,
                plane=self.plane,
                project_ref=self.ref,
                app_sha=self.app_sha,
                ok=ok,
                classification=classification,
                detail=detail,
            )
        )


def is_missing_col(payload: Any) -> bool:
    text = json.dumps(payload) if not isinstance(payload, str) else payload
    return any(
        x in text
        for x in ("42703", "PGRST204", "Could not find", "does not exist", "schema cache")
    )


def classify_write_fail(env: EnvCtx, payload: Any) -> str:
    if is_missing_col(payload):
        return "App-NEW-gap" if env.dialect == "NEW" else "Schema-gap"
    return "Fixture/data"


def auth_admin_set_password(env: EnvCtx, user_id: str, password: str) -> tuple[int, Any]:
    data = json.dumps({"password": password}).encode()
    headers = {
        "apikey": env.service_key,
        "Authorization": f"Bearer {env.service_key}",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }
    req = urllib.request.Request(
        f"{env.url}/auth/v1/admin/users/{user_id}",
        data=data,
        headers=headers,
        method="PUT",
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


def auth_admin_create_user(
    env: EnvCtx, email: str, password: str
) -> tuple[int, Any]:
    data = json.dumps(
        {
            "email": email,
            "password": password,
            "email_confirm": True,
            "user_metadata": {"probe": "stage-d-o4"},
        }
    ).encode()
    headers = {
        "apikey": env.service_key,
        "Authorization": f"Bearer {env.service_key}",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }
    req = urllib.request.Request(
        f"{env.url}/auth/v1/admin/users",
        data=data,
        headers=headers,
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


def auth_admin_delete_user(env: EnvCtx, user_id: str) -> tuple[int, Any]:
    headers = {
        "apikey": env.service_key,
        "Authorization": f"Bearer {env.service_key}",
        "Accept": "application/json",
    }
    req = urllib.request.Request(
        f"{env.url}/auth/v1/admin/users/{user_id}",
        headers=headers,
        method="DELETE",
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


def auth_password_grant(
    env: EnvCtx, email: str, password: str
) -> tuple[int, Any]:
    data = json.dumps({"email": email, "password": password}).encode()
    headers = {
        "apikey": env.anon_key,
        "Authorization": f"Bearer {env.anon_key}",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }
    req = urllib.request.Request(
        f"{env.url}/auth/v1/token?grant_type=password",
        data=data,
        headers=headers,
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


def mint_qa_jwt(env: EnvCtx, user: dict[str, Any]) -> str | None:
    email = user.get("email")
    uid = user.get("id")
    if not email or not uid:
        return None
    pwd = f"Probe-{uuid.uuid4().hex[:14]}!"
    code, _ = auth_admin_set_password(env, uid, pwd)
    if code not in (200, 201):
        return None
    code, tok = auth_password_grant(env, email, pwd)
    if code != 200 or not isinstance(tok, dict):
        return None
    return tok.get("access_token")


def simulate_app_shaped_task_create(
    env: EnvCtx,
    *,
    project_id: str,
    user_id: str,
    marker: str,
    jwt: str | None = None,
) -> tuple[bool, str, str | None]:
    """App authors OLD cols first; NEW recovers via strip + junction."""
    key = jwt
    app_shaped = {
        "project_id": project_id,
        "title": f"AppShape {marker}",
        "description": "app-shaped first payload",
        "status": "new",
        "current_status": "new",
        "priority": "medium",
        "category": "general",
        "due_date": "2026-12-31T00:00:00Z",
        "assigned_by": user_id,
        "assigned_to": [user_id],
        "accepted": False,
        "completion_percentage": 0,
        "attachments": [],
    }
    code, rows = env.rest(
        "tasks",
        method="POST",
        body=app_shaped,
        prefer="return=representation",
        key=key,
    )
    if code in (200, 201) and isinstance(rows, list) and rows:
        task_id = rows[0]["id"]
        if env.dialect == "NEW":
            # App would also write junction when assigned_to stripped; ensure junction exists
            code_j, _ = env.rest(
                "task_assignments",
                method="POST",
                body={
                    "task_id": task_id,
                    "user_id": user_id,
                    "assignment_kind": "primary",
                    "is_active": True,
                    "created_by": user_id,
                },
                prefer="return=representation",
                key=key,
            )
            # 23505 ok
            return True, f"OLD-cols accepted http={code} junction={code_j}", task_id
        return True, f"OLD dialect insert http={code}", task_id

    if env.dialect == "NEW" and is_missing_col(rows):
        # Strip recovery (mirrors schemaDualPath / createTask)
        clean = {
            "project_id": project_id,
            "title": f"AppShape {marker}",
            "description": "app-shaped recovery",
            "status": "new",
            "priority": "medium",
            "assigned_by": user_id,
            "completion_percentage": 0,
        }
        code2, rows2 = env.rest(
            "tasks",
            method="POST",
            body=clean,
            prefer="return=representation",
            key=key,
        )
        if code2 not in (200, 201) or not isinstance(rows2, list) or not rows2:
            return False, f"strip recovery failed http={code2} {rows2}", None
        task_id = rows2[0]["id"]
        code_j, jun = env.rest(
            "task_assignments",
            method="POST",
            body={
                "task_id": task_id,
                "user_id": user_id,
                "assignment_kind": "primary",
                "is_active": True,
                "created_by": user_id,
            },
            prefer="return=representation",
            key=key,
        )
        if code_j not in (200, 201) and not (
            isinstance(jun, dict) and jun.get("code") == "23505"
        ):
            return False, f"junction after strip failed http={code_j} {jun}", task_id
        return (
            True,
            f"app-shaped rejected ({code}) then strip+junction OK task={task_id}",
            task_id,
        )

    return False, f"insert http={code} {rows}", None


def pick_qa_user(env: EnvCtx) -> dict[str, Any] | None:
    # PROD dogfood vs DEV seed:dev-qa actors (john/alice) — prefer known emails first.
    emails = (
        ["sara@insitetest.com", "joe@insitetest.com", "john@insitetest.com"]
        if env.ref == PROD_REF
        else [
            "sara@insite.com",
            "joe@insite.com",
            "sam@insite.com",
            "john.managera@test.com",
            "alice.workera1@test.com",
        ]
    )
    for email in emails:
        code, rows = env.rest(
            f"users?select=id,email,company_id,role,system_permission&email=eq.{urllib.parse.quote(email)}"
        )
        if code == 200 and isinstance(rows, list) and rows:
            return rows[0]
        # sequential ACL select (never both-required)
        code, rows = env.rest(
            f"users?select=id,email,company_id,system_permission&email=eq.{urllib.parse.quote(email)}"
        )
        if code == 200 and isinstance(rows, list) and rows:
            return rows[0]
        code, rows = env.rest(
            f"users?select=id,email,company_id,role&email=eq.{urllib.parse.quote(email)}"
        )
        if code == 200 and isinstance(rows, list) and rows:
            return rows[0]
    return None


def run_matrix(env: EnvCtx) -> None:
    env.assert_ref()
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
    marker = f"p-matrix-{stamp}-{uuid.uuid4().hex[:8]}"

    # P01 Login / session — profile ACL column present for QA user
    user = pick_qa_user(env)
    if not user:
        env.add("P01", False, "no QA user found", "Fixture/data")
        for cid in ("P02", "P03", "P04", "P05", "P06", "P07", "P08", "P11"):
            env.add(cid, False, "blocked: no QA user", "Fixture/data")
        env.add("P09", True, "SKIPPED Human GO per charge", "Human-GO-skip")
        env.add("P10", False, "blocked: no QA user", "Fixture/data")
        return

    acl = user.get("system_permission") or user.get("role")
    env.add(
        "P01",
        bool(user.get("id") and user.get("company_id") and acl),
        f"user={user.get('email')} acl={acl} company={user.get('company_id')}",
    )

    company_id = user["company_id"]
    user_id = user["id"]

    # P02 Invite Edge — unauthenticated must be structured (not unknown_error)
    code, payload = env.edge("invite-user", {})
    invite_ok = code in (400, 401) and isinstance(payload, dict)
    err = payload.get("error") if isinstance(payload, dict) else None
    if err == "unknown_error":
        invite_ok = False
        classification = "Edge-gap"
    else:
        classification = "PASS" if invite_ok else "Edge-gap"
    env.add(
        "P02",
        invite_ok,
        f"http={code} error={err!r}",
        classification,
    )

    # P03 Create project + UPA with dialect-aware role column
    proj_body = {
        "name": f"QA {marker}",
        "description": "phase2 dual-target probe",
        "company_id": company_id,
        "created_by": user_id,
        "status": "active",
        # DEV evolved schema: start_date + client_info are NOT NULL without defaults.
        "start_date": "2026-01-01T00:00:00Z",
        "client_info": {"probe": marker},
        "location": "probe",
    }
    code, proj = env.rest(
        "projects",
        method="POST",
        body=proj_body,
        prefer="return=representation",
    )
    if code not in (200, 201) or not isinstance(proj, list) or not proj:
        # Continue later cases with an existing project, but DO NOT count as GO.
        code_ex, existing = env.rest(
            f"projects?select=id&company_id=eq.{company_id}&status=eq.active&limit=1"
        )
        if code_ex == 200 and isinstance(existing, list) and existing:
            project_id = existing[0]["id"]
            env.add(
                "P03",
                False,
                f"project INSERT must 201; got {code}; reused={project_id} err={proj}",
                "FAIL-reuse",
            )
        else:
            env.add(
                "P03",
                False,
                f"project insert http={code} {proj}",
                classify_write_fail(env, proj),
            )
            project_id = None
    else:
        project_id = proj[0]["id"]
        # NEW CHECK: lead_project_manager|contractor|…|worker|foreman
        # OLD DEV often uses category with similar vocabulary.
        upa_role_col = "project_role" if env.dialect == "NEW" else "category"
        upa_ts_col = "created_at" if env.dialect == "NEW" else "assigned_at"
        role_value = "lead_project_manager"
        upa_payload = {
            "user_id": user_id,
            "project_id": project_id,
            "is_active": True,
            "assigned_by": user_id,
            upa_role_col: role_value,
        }
        code_u, upa = env.rest(
            "user_project_assignments",
            method="POST",
            body=upa_payload,
            prefer="return=representation",
        )
        if code_u not in (200, 201) and is_missing_col(upa):
            alt_col = "category" if upa_role_col == "project_role" else "project_role"
            upa_payload = {
                "user_id": user_id,
                "project_id": project_id,
                "is_active": True,
                "assigned_by": user_id,
                alt_col: role_value,
            }
            code_u, upa = env.rest(
                "user_project_assignments",
                method="POST",
                body=upa_payload,
                prefer="return=representation",
            )
        # 23505 duplicate active assignment is OK for reused projects
        upa_ok = code_u in (200, 201) or (
            isinstance(upa, dict) and upa.get("code") == "23505"
        )
        env.add(
            "P03",
            upa_ok,
            f"project={project_id} upa_http={code_u} body={upa!r} ts_pref={upa_ts_col}",
            "PASS" if upa_ok else classify_write_fail(env, upa),
        )

    if not project_id:
        for cid in ("P04", "P05", "P06", "P07", "P11"):
            env.add(cid, False, "blocked: no project", "Fixture/data")
    else:
        # P04 Create task — app-shaped first, then strip/junction recovery on NEW
        ok4, detail4, task_id = simulate_app_shaped_task_create(
            env,
            project_id=project_id,
            user_id=user_id,
            marker=marker,
        )
        env.add(
            "P04",
            ok4,
            detail4,
            "PASS" if ok4 else classify_write_fail(env, detail4),
        )

        if not task_id:
            for cid in ("P05", "P06", "P07"):
                env.add(cid, False, "blocked: no task", "Fixture/data")
        else:
            # P05 Accept/start/update + task_files insert (or dual-path miss OK on OLD)
            next_status = "in_progress"
            # App-shaped progress patch (includes current_status)
            upd = {
                "status": next_status,
                "current_status": next_status,
                "completion_percentage": 10,
            }
            code, upd_res = env.rest(
                f"tasks?id=eq.{task_id}",
                method="PATCH",
                body=upd,
                prefer="return=representation",
            )
            if code not in (200, 201) and is_missing_col(upd_res):
                code, upd_res = env.rest(
                    f"tasks?id=eq.{task_id}",
                    method="PATCH",
                    body={"status": next_status, "completion_percentage": 10},
                    prefer="return=representation",
                )
            files_code, files_body = env.rest(
                "task_files",
                method="POST",
                body={
                    "task_id": task_id,
                    "storage_path": f"probe/{marker}/p05.jpg",
                    "mime_type": "image/jpeg",
                    "size_bytes": 12,
                    "created_by": user_id,
                },
                prefer="return=representation",
            )
            if env.dialect == "OLD" and (
                files_code in (404, 400) or is_missing_col(files_body)
            ):
                files_ok = True  # dual-path fallback
                files_note = f"task_files missing (dual-path OK) http={files_code}"
            else:
                files_ok = files_code in (200, 201)
                files_note = f"task_files_http={files_code}"
            env.add(
                "P05",
                code in (200, 201) and files_ok,
                f"status_http={code} {files_note}",
                "PASS"
                if code in (200, 201) and files_ok
                else classify_write_fail(env, upd_res if code not in (200, 201) else files_body),
            )

            # P06 Submit review → approve
            for status in ("submitted_for_review", "approved"):
                body = {"status": status, "current_status": status}
                code, res = env.rest(
                    f"tasks?id=eq.{task_id}",
                    method="PATCH",
                    body=body,
                    prefer="return=representation",
                )
                if code not in (200, 201) and is_missing_col(res):
                    code, res = env.rest(
                        f"tasks?id=eq.{task_id}",
                        method="PATCH",
                        body={"status": status},
                        prefer="return=representation",
                    )
                if code not in (200, 201):
                    env.add(
                        "P06",
                        False,
                        f"transition {status} http={code} {res}",
                        classify_write_fail(env, res),
                    )
                    break
            else:
                env.add("P06", True, f"task={task_id} submitted→approved")

            # P07 Reassign — NEW must WRITE a second junction row (not SELECT-only)
            if env.dialect == "NEW":
                # soft-deactivate existing + insert delegated
                env.rest(
                    f"task_assignments?task_id=eq.{task_id}",
                    method="PATCH",
                    body={"is_active": False},
                )
                code_j, jun = env.rest(
                    "task_assignments",
                    method="POST",
                    body={
                        "task_id": task_id,
                        "user_id": user_id,
                        "assignment_kind": "primary",
                        "is_active": True,
                        "created_by": user_id,
                    },
                    prefer="return=representation",
                )
                # second row as delegated (same user ok for smoke uniqueness? use same user with delegated)
                # Prefer a second QA user if present
                second_emails = (
                    ["joe@insitetest.com", "john@insitetest.com"]
                    if env.ref == PROD_REF
                    else ["joe@insite.com", "sam@insite.com"]
                )
                second_id = user_id
                for em in second_emails:
                    c2, rows2 = env.rest(
                        f"users?select=id&email=eq.{urllib.parse.quote(em)}"
                    )
                    if c2 == 200 and isinstance(rows2, list) and rows2:
                        second_id = rows2[0]["id"]
                        break
                code_j2, jun2 = env.rest(
                    "task_assignments",
                    method="POST",
                    body={
                        "task_id": task_id,
                        "user_id": second_id,
                        "assignment_kind": "delegated",
                        "is_active": True,
                        "created_by": user_id,
                    },
                    prefer="return=representation",
                )
                ok7 = code_j in (200, 201) and (
                    code_j2 in (200, 201)
                    or (isinstance(jun2, dict) and jun2.get("code") == "23505")
                )
                env.add(
                    "P07",
                    ok7,
                    f"primary_http={code_j} delegated_http={code_j2}",
                    "PASS" if ok7 else classify_write_fail(env, jun2),
                )
            else:
                code, res = env.rest(
                    f"tasks?id=eq.{task_id}",
                    method="PATCH",
                    body={"assigned_to": [user_id]},
                    prefer="return=representation",
                )
                env.add(
                    "P07",
                    code in (200, 201),
                    f"assigned_to patch http={code}",
                    "PASS" if code in (200, 201) else classify_write_fail(env, res),
                )

            # Cleanup task (soft)
            env.rest(
                f"tasks?id=eq.{task_id}",
                method="PATCH",
                body={"deleted_at": datetime.now(timezone.utc).isoformat()},
            )

        # P11 Report lifecycle — reported + issue_reported (no top-level activity status)
        # → resolve → cleanup. Dedicated task so P04–P07 stay independent.
        report_payload = {
            "project_id": project_id,
            "title": f"Report {marker}",
            "description": "P11 report probe",
            "status": "reported",
            "priority": "medium",
            "category": "general",
            "due_date": "2026-12-31T00:00:00Z",
            "assigned_by": user_id,
            "completion_percentage": 0,
        }
        code_r, rows_r = env.rest(
            "tasks",
            method="POST",
            body=report_payload,
            prefer="return=representation",
        )
        if code_r not in (200, 201) and is_missing_col(rows_r):
            # Some tenants still reject when current_status is expected; do not send it
            # on purpose for NEW — retry without optional legacy cols only if needed.
            code_r, rows_r = env.rest(
                "tasks",
                method="POST",
                body={
                    k: v
                    for k, v in report_payload.items()
                    if k not in ("priority", "category")
                },
                prefer="return=representation",
            )
        report_id = None
        if code_r in (200, 201) and isinstance(rows_r, list) and rows_r:
            report_id = rows_r[0].get("id")
        if not report_id:
            env.add(
                "P11",
                False,
                f"report_insert_http={code_r} body={rows_r!r}",
                classify_write_fail(env, rows_r),
            )
        else:
            # App insertTaskActivityDualPath: status lives in data, never top-level.
            act_payload = {
                "task_id": report_id,
                "user_id": user_id,
                "activity_type": "issue_reported",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "description": "Issue reported by P11 probe",
                "completion_percentage": 0,
                "data": {
                    "title": report_payload["title"],
                    "status": "reported",
                },
            }
            code_a, act_res = env.rest(
                "task_activities",
                method="POST",
                body=act_payload,
                prefer="return=representation",
            )
            code_z, res_z = env.rest(
                f"tasks?id=eq.{report_id}",
                method="PATCH",
                body={"status": "resolved"},
                prefer="return=representation",
            )
            if code_z not in (200, 201) and is_missing_col(res_z):
                code_z, res_z = env.rest(
                    f"tasks?id=eq.{report_id}",
                    method="PATCH",
                    body={"status": "resolved", "current_status": "resolved"},
                    prefer="return=representation",
                )
            ok11 = code_a in (200, 201) and code_z in (200, 201)
            env.add(
                "P11",
                ok11,
                f"report={report_id} activity_http={code_a} resolve_http={code_z}",
                "PASS"
                if ok11
                else classify_write_fail(
                    env, act_res if code_a not in (200, 201) else res_z
                ),
            )
            env.rest(
                f"tasks?id=eq.{report_id}",
                method="PATCH",
                body={"deleted_at": datetime.now(timezone.utc).isoformat()},
            )

    # P08 ACL write dual-path (role → system_permission) — real UPDATE, not SELECT-only
    acl_body_role = {"updated_at": datetime.now(timezone.utc).isoformat()}
    # Touch a no-op-ish field via role write attempt: read current acl then rewrite same value
    code_s, sys_rows = env.rest(
        f"users?select=id,system_permission,role&id=eq.{user_id}"
    )
    # sequential if both fails
    if code_s != 200 or not isinstance(sys_rows, list) or not sys_rows:
        code_s, sys_rows = env.rest(
            f"users?select=id,system_permission&id=eq.{user_id}"
        )
    if code_s != 200 or not isinstance(sys_rows, list) or not sys_rows:
        code_s, sys_rows = env.rest(f"users?select=id,role&id=eq.{user_id}")
    current = sys_rows[0] if isinstance(sys_rows, list) and sys_rows else {}
    role_val = current.get("role") or (
        "admin"
        if current.get("system_permission") == "admin"
        else "worker"
    )
    code_w, wres = env.rest(
        f"users?id=eq.{user_id}",
        method="PATCH",
        body={"role": role_val},
        prefer="return=representation",
    )
    if code_w not in (200, 201) and is_missing_col(wres):
        sys_val = current.get("system_permission") or (
            "admin" if role_val in ("admin", "company_admin") else "member"
        )
        code_w, wres = env.rest(
            f"users?id=eq.{user_id}",
            method="PATCH",
            body={"system_permission": sys_val},
            prefer="return=representation",
        )
    env.add(
        "P08",
        code_w in (200, 201),
        f"acl_write_http={code_w}",
        "PASS" if code_w in (200, 201) else classify_write_fail(env, wres),
    )

    # P09 Billing Checkout — Human GO required; do not charge
    env.add(
        "P09",
        True,
        "SKIPPED — live Checkout requires Human GO per charge; QA company only",
        "Human-GO-skip",
    )

    # P10 Cancel / subscription status — anon smoke + JWT functional
    for fn in ("billing-subscription-status", "cancel-subscription"):
        code, payload = env.edge(fn, {})
        structured = isinstance(payload, dict) and payload.get("error") not in (
            None,
            "unknown_error",
        )
        ok = code in (400, 401) and structured
        env.add(
            "P10" if fn.startswith("cancel") else "P10a",
            ok,
            f"{fn} anon http={code} error={payload.get('error') if isinstance(payload, dict) else payload!r}",
            "PASS" if ok else "Edge-gap",
        )

    # --- JWT app-shaped track (Gate A must-fix) ---
    jwt = mint_qa_jwt(env, user)
    if not jwt:
        for cid in ("P02j", "P04j", "P05j", "P08j", "P10j", "F6"):
            env.add(cid, False, "blocked: could not mint QA JWT", "Fixture/data")
    else:
        # P02j authenticated invite-user (must not unknown_error)
        code, payload = env.edge(
            "invite-user",
            {"email": f"probe-invite-{marker}@example.invalid"},
            bearer=jwt,
        )
        err = payload.get("error") if isinstance(payload, dict) else None
        # 400 validation / 403 / 404 company — OK if structured; unknown_error = FAIL
        invite_ok = err != "unknown_error" and code != 500
        env.add(
            "P02j",
            invite_ok,
            f"jwt invite-user http={code} error={err!r}",
            "PASS" if invite_ok else "Edge-gap",
        )

        # Need a project for JWT writes — prefer the one we just made, else existing
        jwt_project = project_id
        if not jwt_project:
            code_ex, existing = env.rest(
                f"projects?select=id&company_id=eq.{company_id}&status=eq.active&limit=1",
                key=jwt,
            )
            if code_ex == 200 and isinstance(existing, list) and existing:
                jwt_project = existing[0]["id"]

        if not jwt_project:
            for cid in ("P04j", "P05j"):
                env.add(cid, False, "blocked: no project for JWT", "Fixture/data")
        else:
            ok4j, detail4j, task_j = simulate_app_shaped_task_create(
                env,
                project_id=jwt_project,
                user_id=user_id,
                marker=f"{marker}-jwt",
                jwt=jwt,
            )
            env.add(
                "P04j",
                ok4j,
                detail4j,
                "PASS" if ok4j else classify_write_fail(env, detail4j),
            )
            if task_j:
                # P05j app-shaped progress under JWT + task_files / dual-path
                code, res = env.rest(
                    f"tasks?id=eq.{task_j}",
                    method="PATCH",
                    body={
                        "status": "in_progress",
                        "current_status": "in_progress",
                        "completion_percentage": 25,
                    },
                    prefer="return=representation",
                    key=jwt,
                )
                if code not in (200, 201) and is_missing_col(res):
                    code, res = env.rest(
                        f"tasks?id=eq.{task_j}",
                        method="PATCH",
                        body={
                            "status": "in_progress",
                            "completion_percentage": 25,
                        },
                        prefer="return=representation",
                        key=jwt,
                    )
                fcode, fbody = env.rest(
                    "task_files",
                    method="POST",
                    body={
                        "task_id": task_j,
                        "storage_path": f"probe/{marker}/jwt.jpg",
                        "mime_type": "image/jpeg",
                        "size_bytes": 8,
                        "created_by": user_id,
                    },
                    prefer="return=representation",
                    key=jwt,
                )
                if env.dialect == "OLD" and (
                    fcode in (404, 400) or is_missing_col(fbody)
                ):
                    files_ok = True
                else:
                    files_ok = fcode in (200, 201)
                # Stars dual-path under JWT
                scode, sbody = env.rest(
                    "task_stars",
                    method="POST",
                    body={"task_id": task_j, "user_id": user_id},
                    prefer="return=representation",
                    key=jwt,
                )
                if env.dialect == "OLD" and (
                    scode in (404, 400) or is_missing_col(sbody)
                ):
                    stars_ok = True
                else:
                    stars_ok = scode in (200, 201) or (
                        isinstance(sbody, dict) and sbody.get("code") == "23505"
                    )
                ok5j = code in (200, 201) and files_ok and stars_ok
                env.add(
                    "P05j",
                    ok5j,
                    f"status={code} files={fcode} stars={scode}",
                    "PASS" if ok5j else "App-NEW-gap",
                )
                env.rest(
                    f"tasks?id=eq.{task_j}",
                    method="PATCH",
                    body={"deleted_at": datetime.now(timezone.utc).isoformat()},
                    key=env.service_key,
                )
            else:
                env.add("P05j", False, "blocked: no JWT task", "Fixture/data")

        # P08j ACL write under JWT (applyUsersAclWrite shape)
        desired_role = "admin" if str(acl) == "admin" else "worker"
        code_w, wres = env.rest(
            f"users?id=eq.{user_id}",
            method="PATCH",
            body={"role": desired_role},
            prefer="return=representation",
            key=jwt,
        )
        if code_w not in (200, 201) and is_missing_col(wres):
            code_w, wres = env.rest(
                f"users?id=eq.{user_id}",
                method="PATCH",
                body={
                    "system_permission": "admin"
                    if str(acl) == "admin"
                    else "member"
                },
                prefer="return=representation",
                key=jwt,
            )
        env.add(
            "P08j",
            code_w in (200, 201),
            f"jwt acl_write http={code_w}",
            "PASS" if code_w in (200, 201) else classify_write_fail(env, wres),
        )

        # P10j authenticated billing-subscription-status (not unknown_error)
        # QA companies may lack a live Stripe sub (500 from Stripe) — still not the
        # both-column ACL unknown_error class this gate targets.
        code, payload = env.edge("billing-subscription-status", {}, bearer=jwt)
        err = payload.get("error") if isinstance(payload, dict) else None
        detail = json.dumps(payload) if isinstance(payload, (dict, list)) else str(payload)
        stripe_missing = isinstance(err, str) and "No such subscription" in err
        ok10j = (err != "unknown_error") and (
            "unknown_error" not in detail or stripe_missing
        )
        if stripe_missing:
            ok10j = True
        env.add(
            "P10j",
            ok10j,
            f"jwt billing-subscription-status http={code} error={err!r}",
            "PASS" if ok10j else "Edge-gap",
        )

        # F6 — wrong-project isolation under JWT (SoT ship path).
        # Prefer a *non-admin* subject: company admin previously bypassed SELECT/UPDATE
        # via OR admin (tightened in 20260922000200). Still mint a dedicated JWT so F6
        # does not depend on whichever user pick_qa_user chose for P01.
        f6_emails = (
            ["john@insitetest.com", "joe@insitetest.com", "sara@insitetest.com"]
            if env.ref == PROD_REF
            else [
                "alice.workera1@test.com",
                # Prefer non-admin F6 subject (Stage D: John is field member; Carol/Dave are CA).
                "erin.invitee@test.com",
                "john.managera@test.com",
                "joe@insite.com",
                "sara@insite.com",
            ]
        )
        f6_user: dict[str, Any] | None = None
        for em in f6_emails:
            c_u, rows_u = env.rest(
                f"users?select=id,email,company_id,system_permission&email=eq.{urllib.parse.quote(em)}"
            )
            if c_u != 200 or not isinstance(rows_u, list) or not rows_u:
                continue
            cand = rows_u[0]
            perm = str(cand.get("system_permission") or "").lower()
            if perm == "admin":
                continue
            if cand.get("id") and cand.get("company_id"):
                f6_user = cand
                break
        if not f6_user:
            # Fallback: any distinct user in company (post-00200 membership wall applies to admin too)
            for em in f6_emails:
                c_u, rows_u = env.rest(
                    f"users?select=id,email,company_id,system_permission&email=eq.{urllib.parse.quote(em)}"
                )
                if c_u == 200 and isinstance(rows_u, list) and rows_u:
                    f6_user = rows_u[0]
                    break
        if not f6_user:
            env.add("F6", False, "blocked: no F6 subject user", "Fixture/data")
        else:
            f6_jwt = mint_qa_jwt(env, f6_user)
            f6_uid = f6_user["id"]
            f6_company = f6_user.get("company_id") or company_id
            if not f6_jwt:
                env.add(
                    "F6",
                    False,
                    f"blocked: could not mint F6 JWT for {f6_user.get('email')}",
                    "Fixture/data",
                )
            else:
                other_id = f6_uid
                other_emails = f6_emails
                for em in other_emails:
                    if str(em).lower() == str(f6_user.get("email") or "").lower():
                        continue
                    c_o, rows_o = env.rest(
                        f"users?select=id,email&email=eq.{urllib.parse.quote(em)}"
                    )
                    if c_o == 200 and isinstance(rows_o, list) and rows_o:
                        cand = rows_o[0].get("id")
                        if cand and str(cand) != str(f6_uid):
                            other_id = cand
                            break
                if str(other_id) == str(f6_uid):
                    env.add(
                        "F6",
                        False,
                        "blocked: need a second distinct user for foreign owner",
                        "Fixture/data",
                    )
                else:
                    foreign_proj_body = {
                        "name": f"F6 foreign {marker}",
                        "description": "isolation probe — no UPA for F6 JWT subject",
                        "company_id": f6_company,
                        "created_by": other_id,
                        "status": "active",
                        "start_date": "2026-01-01T00:00:00Z",
                        "client_info": {"probe": f"f6-{marker}"},
                        "location": "probe-f6",
                    }
                    code_fp, fp_rows = env.rest(
                        "projects",
                        method="POST",
                        body=foreign_proj_body,
                        prefer="return=representation",
                    )
                    foreign_project_id = None
                    if (
                        code_fp in (200, 201)
                        and isinstance(fp_rows, list)
                        and fp_rows
                    ):
                        foreign_project_id = fp_rows[0].get("id")
                    if not foreign_project_id:
                        env.add(
                            "F6",
                            False,
                            f"foreign_project_insert_http={code_fp} body={fp_rows!r}",
                            classify_write_fail(env, fp_rows),
                        )
                    else:
                        env.rest(
                            "user_project_assignments",
                            method="POST",
                            body={
                                "user_id": other_id,
                                "project_id": foreign_project_id,
                                "is_active": True,
                                "assigned_by": other_id,
                                "project_role": "lead_project_manager",
                            },
                            prefer="return=representation",
                        )
                        foreign_task_body = {
                            "project_id": foreign_project_id,
                            "title": f"F6 secret {marker}",
                            "description": "must be invisible to non-member JWT",
                            "status": "new",
                            "priority": "medium",
                            "category": "general",
                            "due_date": "2026-12-31T00:00:00Z",
                            "assigned_by": other_id,
                            "completion_percentage": 0,
                        }
                        code_ft, ft_rows = env.rest(
                            "tasks",
                            method="POST",
                            body=foreign_task_body,
                            prefer="return=representation",
                        )
                        foreign_task_id = None
                        if (
                            code_ft in (200, 201)
                            and isinstance(ft_rows, list)
                            and ft_rows
                        ):
                            foreign_task_id = ft_rows[0].get("id")
                        if not foreign_task_id:
                            env.add(
                                "F6",
                                False,
                                f"foreign_task_insert_http={code_ft} body={ft_rows!r}",
                                classify_write_fail(env, ft_rows),
                            )
                        else:
                            if env.dialect == "NEW":
                                env.rest(
                                    "task_assignments",
                                    method="POST",
                                    body={
                                        "task_id": foreign_task_id,
                                        "user_id": other_id,
                                        "assignment_kind": "primary",
                                        "is_active": True,
                                        "created_by": other_id,
                                    },
                                    prefer="return=representation",
                                )
                            code_r, read_rows = env.rest(
                                f"tasks?id=eq.{foreign_task_id}&select=id,title",
                                key=f6_jwt,
                            )
                            read_denied = code_r in (401, 403) or (
                                code_r == 200
                                and isinstance(read_rows, list)
                                and len(read_rows) == 0
                            )
                            leaked = (
                                code_r == 200
                                and isinstance(read_rows, list)
                                and any(
                                    str(r.get("id")) == str(foreign_task_id)
                                    for r in read_rows
                                )
                            )
                            code_w, write_res = env.rest(
                                f"tasks?id=eq.{foreign_task_id}",
                                method="PATCH",
                                body={"description": "f6-should-fail"},
                                prefer="return=representation",
                                key=f6_jwt,
                            )
                            write_denied = code_w in (401, 403) or (
                                code_w in (200, 204)
                                and (
                                    write_res == []
                                    or write_res is None
                                    or (
                                        isinstance(write_res, list)
                                        and len(write_res) == 0
                                    )
                                )
                            )
                            code_i, ins_res = env.rest(
                                "tasks",
                                method="POST",
                                body={
                                    "project_id": foreign_project_id,
                                    "title": f"F6 jwt insert {marker}",
                                    "description": "must deny",
                                    "status": "new",
                                    "assigned_by": f6_uid,
                                    "completion_percentage": 0,
                                },
                                prefer="return=representation",
                                key=f6_jwt,
                            )
                            insert_denied = code_i in (401, 403, 400, 409) or (
                                code_i not in (200, 201)
                            )
                            ok_f6 = (
                                read_denied
                                and write_denied
                                and insert_denied
                                and not leaked
                            )
                            env.add(
                                "F6",
                                ok_f6,
                                (
                                    f"subject={f6_user.get('email')} "
                                    f"foreign_task={foreign_task_id} other={other_id} "
                                    f"read_http={code_r} patch_http={code_w} "
                                    f"insert_http={code_i} leaked={leaked}"
                                ),
                                "PASS" if ok_f6 else "RLS-open",
                            )
                            env.rest(
                                f"tasks?id=eq.{foreign_task_id}",
                                method="PATCH",
                                body={
                                    "deleted_at": datetime.now(
                                        timezone.utc
                                    ).isoformat()
                                },
                            )
                        env.rest(
                            f"projects?id=eq.{foreign_project_id}",
                            method="PATCH",
                            body={"status": "archived"},
                        )

    # Soft-archive probe project if we inserted one this run (name contains marker)
    if project_id:
        env.rest(
            f"projects?id=eq.{project_id}&name=ilike.*{urllib.parse.quote(marker)}*",
            method="PATCH",
            body={"status": "archived"},
        )

    # O4 — last-admin demotion REPORTING case (Stage D).
    # NOT added to promote gate_ids until Human GO lands a DB last-admin guard.
    # Disposable sole-admin company; JWT demote attempt; restore-guaranteed.
    o4_email = f"o4-sole-{marker}@example.invalid"
    o4_pwd = f"O4-{uuid.uuid4().hex[:12]}!"
    o4_uid: str | None = None
    o4_company_id: str | None = None
    try:
        code_cu, created = auth_admin_create_user(env, o4_email, o4_pwd)
        if code_cu not in (200, 201) or not isinstance(created, dict):
            env.add(
                "O4",
                False,
                f"reporting: createUser http={code_cu} body={created!r}",
                "Fixture/data",
            )
        else:
            o4_uid = str(created.get("id") or (created.get("user") or {}).get("id") or "")
            if not o4_uid:
                env.add("O4", False, f"reporting: no user id in {created!r}", "Fixture/data")
            else:
                code_co, co_rows = env.rest(
                    "companies",
                    method="POST",
                    body={
                        "name": f"StageD-O4-{marker}",
                        "type": "general_contractor",
                        "is_active": True,
                        "created_by": o4_uid,
                    },
                    prefer="return=representation",
                )
                if code_co not in (200, 201) or not isinstance(co_rows, list) or not co_rows:
                    env.add(
                        "O4",
                        False,
                        f"reporting: company insert http={code_co} {co_rows!r}",
                        classify_write_fail(env, co_rows),
                    )
                else:
                    o4_company_id = co_rows[0]["id"]
                    env.rest(
                        "users",
                        method="POST",
                        body={
                            "id": o4_uid,
                            "email": o4_email,
                            "name": "O4 Sole Admin",
                            "company_id": o4_company_id,
                            "system_permission": "admin",
                            "user_type": "company_user",
                            "is_active": True,
                            "is_pending": False,
                            "must_set_password": False,
                            "deployable_seat": "worker",
                        },
                        prefer="return=representation",
                    )
                    # Precondition: sole admin
                    code_ac, admins = env.rest(
                        f"users?select=id&company_id=eq.{o4_company_id}"
                        f"&system_permission=eq.admin&is_active=eq.true"
                    )
                    admin_n = len(admins) if isinstance(admins, list) else -1
                    if admin_n != 1:
                        env.add(
                            "O4",
                            False,
                            f"reporting: sole-admin precondition failed count={admin_n}",
                            "Fixture/data",
                        )
                    else:
                        code_tok, tok = auth_password_grant(env, o4_email, o4_pwd)
                        jwt_o4 = (
                            tok.get("access_token")
                            if code_tok == 200 and isinstance(tok, dict)
                            else None
                        )
                        if not jwt_o4:
                            env.add(
                                "O4",
                                False,
                                f"reporting: mint jwt http={code_tok}",
                                "Fixture/data",
                            )
                        else:
                            before = "admin"
                            code_d, dres = env.rest(
                                f"users?id=eq.{o4_uid}",
                                method="PATCH",
                                body={"system_permission": "member"},
                                prefer="return=representation",
                                key=jwt_o4,
                            )
                            code_after, after_rows = env.rest(
                                f"users?select=system_permission&id=eq.{o4_uid}"
                            )
                            after_perm = None
                            if (
                                code_after == 200
                                and isinstance(after_rows, list)
                                and after_rows
                            ):
                                after_perm = after_rows[0].get("system_permission")
                            unchanged = after_perm == before
                            denied = code_d not in (200, 201) and unchanged
                            # Always restore if mutated
                            if not unchanged:
                                env.rest(
                                    f"users?id=eq.{o4_uid}",
                                    method="PATCH",
                                    body={"system_permission": "admin"},
                                )
                            # Reporting semantics: PASS only if denied+unchanged.
                            # Open write → restore done → report FAIL / owed RLS (not promote gate).
                            env.add(
                                "O4",
                                denied,
                                (
                                    f"reporting: demote_http={code_d} before={before} "
                                    f"after={after_perm} unchanged={unchanged} "
                                    f"body={dres!r} "
                                    f"{'OWED: DB last-admin guard' if not denied else 'denied+unchanged'}"
                                ),
                                "PASS"
                                if denied
                                else ("RLS-open" if not unchanged else "App-only-gap"),
                            )
    finally:
        if o4_uid:
            # Soft-clean public row then auth user (best-effort).
            env.rest(f"users?id=eq.{o4_uid}", method="DELETE")
            auth_admin_delete_user(env, o4_uid)
        if o4_company_id:
            env.rest(
                f"companies?id=eq.{o4_company_id}",
                method="PATCH",
                body={"is_active": False},
            )


def write_reports(dev: EnvCtx, prod: EnvCtx) -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    payload = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "app_sha": dev.app_sha,
        "dev": [r.__dict__ for r in dev.results],
        "prod": [r.__dict__ for r in prod.results],
    }
    OUT_JSON.write_text(json.dumps(payload, indent=2))

    lines = [
        "# Phase 2 — P01–P10 dual-target matrix",
        "",
        f"- appSha: `{dev.app_sha}`",
        f"- DEV ref: `{DEV_REF}` (OLD control)",
        f"- PROD ref: `{PROD_REF}` (NEW QA)",
        f"- generated: {payload['generated_at']}",
        "",
        "| Case | DEV | PROD | PROD classification |",
        "|---|---|---|---|",
    ]
    by_dev = {r.case_id: r for r in dev.results}
    by_prod = {r.case_id: r for r in prod.results}
    for cid in sorted(set(by_dev) | set(by_prod), key=lambda x: (x[0], x)):
        d = by_dev.get(cid)
        p = by_prod.get(cid)
        lines.append(
            f"| {cid} | {'PASS' if d and d.ok else 'FAIL'} | "
            f"{'PASS' if p and p.ok else 'FAIL'} | "
            f"{p.classification if p else '—'} |"
        )
    lines.append("")
    lines.append("## Details")
    for env in (dev, prod):
        lines.append(f"### {env.plane} (`{env.ref}`)")
        for r in env.results:
            lines.append(
                f"- **{r.case_id}** [{r.classification}] "
                f"plane={r.plane} ref={r.project_ref} sha={r.app_sha[:8]} — {r.detail}"
            )
        lines.append("")
    OUT_MD.write_text("\n".join(lines))
    try:
        EVIDENCE_MD.write_text("\n".join(lines))
    except OSError:
        pass


def main() -> int:
    env_file = load_dotenv(ROOT / ".env")
    prod_file = load_dotenv(
        ROOT / ".cache" / "env-cutover" / "insite-prod.env.local"
    )
    token = env_file.get("SUPABASE_ACCESS_TOKEN")
    sha = git_sha()
    print(f"appSha={sha}")

    import base64

    def jwt_ref(k: str) -> str | None:
        try:
            part = k.split(".")[1]
            part += "=" * ((4 - len(part) % 4) % 4)
            return json.loads(base64.urlsafe_b64decode(part)).get("ref")
        except Exception:
            return None

    def resolve_keys(
        *,
        plane: str,
        ref: str,
        local: dict[str, str],
    ) -> tuple[str, str]:
        """Prefer local service/anon keys when they match the plane ref."""
        sr = local.get("SUPABASE_SERVICE_ROLE_KEY") or ""
        anon = local.get("EXPO_PUBLIC_SUPABASE_ANON_KEY") or local.get("SUPABASE_ANON_KEY") or ""
        if sr and jwt_ref(sr) == ref and anon and jwt_ref(anon) == ref:
            print(f"{plane} keys: local .env (ref={ref})")
            return sr, anon
        if not token:
            raise RuntimeError(
                f"{plane}: no matching local keys and SUPABASE_ACCESS_TOKEN missing"
            )
        print(f"{plane} keys: management API (ref={ref})")
        return management_key(token, ref, "service_role"), management_key(
            token, ref, "anon"
        )

    try:
        # DEV≡PROD NEW dialect after 2026-09-15 promote-up.
        dev_sr, dev_anon = resolve_keys(plane="DEV", ref=DEV_REF, local=env_file)
        prod_sr, prod_anon = resolve_keys(plane="PROD", ref=PROD_REF, local=prod_file)
        # Both planes NEW after schema parity restore.
        dialect = "NEW"
        dev = EnvCtx(
            "DEV",
            DEV_REF,
            f"https://{DEV_REF}.supabase.co",
            dev_sr,
            dev_anon,
            dialect,
            sha,
        )
        prod = EnvCtx(
            "PROD",
            PROD_REF,
            f"https://{PROD_REF}.supabase.co",
            prod_sr,
            prod_anon,
            dialect,
            sha,
        )
    except Exception as e:
        print(f"FAIL: keys: {e}", file=sys.stderr)
        return 1

    # Hard ref assert before any writes
    for ctx in (dev, prod):
        ctx.assert_ref()
        print(f"{ctx.plane} plane={ctx.plane} projectRef={ctx.ref} appSha={sha}")

    run_matrix(dev)
    run_matrix(prod)
    write_reports(dev, prod)

    print()
    print(f"Wrote {OUT_MD}")
    print(f"Wrote {OUT_JSON}")

    # Promote gate: P01–P08 + P10 + P11 + F6 + JWT track on PROD
    prod_by = {r.case_id: r for r in prod.results}
    gate_ids = [f"P0{i}" for i in range(1, 9)] + [
        "P10",
        "P11",
        "F6",
        "P02j",
        "P04j",
        "P05j",
        "P08j",
        "P10j",
    ]
    fails = [
        cid
        for cid in gate_ids
        if cid not in prod_by or not prod_by[cid].ok
    ]
    if fails:
        print(f"PROD GATE FAIL: {fails}")
        for cid in fails:
            r = prod_by.get(cid)
            if r:
                print(f"  {cid}: {r.detail}")
        return 1
    print("PROD GATE: P01–P08 + P10 + P11 + F6 + JWT track PASS (P09 Human-GO-skip)")
    # O4 is reporting-only (Stage D) — surface result but do not wedge promote gate.
    o4 = prod_by.get("O4")
    if o4:
        print(
            f"O4 REPORTING ({'PASS' if o4.ok else 'FAIL/OWED'}): {o4.detail}"
        )
    else:
        print("O4 REPORTING: missing from PROD results")

    # Honesty: required DEV cases should not stay Fixture/data forever once seeded.
    dev_by = {r.case_id: r for r in dev.results}
    dev_required = ["P01", "P04", "P11", "F6"]
    dev_fails = [
        cid
        for cid in dev_required
        if cid not in dev_by or not dev_by[cid].ok
    ]
    if dev_fails:
        print(f"DEV GATE FAIL (post-seed required): {dev_fails}")
        for cid in dev_fails:
            r = dev_by.get(cid)
            if r:
                print(f"  {cid}: {r.detail}")
        return 1
    print("DEV GATE: P01 + P04 + P11 + F6 PASS (seeded)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
