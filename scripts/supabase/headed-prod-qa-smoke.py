#!/usr/bin/env python3
"""
Headed-adjacent PROD QA smoke (SOP §13 debug stage).

Real QA JWT against PROD — not service_role:
  login → create (app-shaped + strip/junction) → progress → task_files → star
  → junction hydrate (Detail assignees read-back)

Camera / PhotoKit remain human dogfood (checklist in evidence file).

Usage (repo root):
  python3 scripts/supabase/headed-prod-qa-smoke.py
"""
from __future__ import annotations

import runpy
import json
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PROD_REF = "jcnzjigxgkzhjsaekoqz"
OUT = ROOT / ".cache" / "prod-new-sot-20260915" / "headed-prod-qa-smoke.json"
EVIDENCE = (
    ROOT
    / "docs"
    / "superpowers"
    / "evidence"
    / "2026-09-15-prod-headed-smoke-checklist.md"
)


def main() -> int:
    mod = runpy.run_path(str(ROOT / "scripts" / "supabase" / "probe-p01-p10-dual-target.py"))
    env_file = mod["load_dotenv"](ROOT / ".env")
    token = env_file.get("SUPABASE_ACCESS_TOKEN")
    if not token:
        print("FAIL: SUPABASE_ACCESS_TOKEN missing", file=sys.stderr)
        return 1

    sha = mod["git_sha"]()
    EnvCtx = mod["EnvCtx"]
    management_key = mod["management_key"]
    pick_qa_user = mod["pick_qa_user"]
    mint_qa_jwt = mod["mint_qa_jwt"]
    simulate_app_shaped_task_create = mod["simulate_app_shaped_task_create"]
    is_missing_col = mod["is_missing_col"]

    prod = EnvCtx(
        "PROD",
        PROD_REF,
        f"https://{PROD_REF}.supabase.co",
        management_key(token, PROD_REF, "service_role"),
        management_key(token, PROD_REF, "anon"),
        "NEW",
        sha,
    )
    prod.assert_ref()
    print(f"plane=PROD projectRef={PROD_REF} appSha={sha}")

    user = pick_qa_user(prod)
    if not user:
        print("FAIL: no QA user")
        return 1

    jwt = mint_qa_jwt(prod, user)
    if not jwt:
        print("FAIL: mint JWT")
        return 1

    results: list[dict] = []
    marker = (
        f"headed-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}-"
        f"{uuid.uuid4().hex[:6]}"
    )

    code, projects = prod.rest(
        f"projects?select=id,name&company_id=eq.{user['company_id']}&status=eq.active&limit=1",
        key=jwt,
    )
    if code != 200 or not isinstance(projects, list) or not projects:
        print(f"FAIL: no project under JWT http={code} {projects}")
        return 1
    project_id = projects[0]["id"]
    results.append({"step": "project", "ok": True, "detail": project_id})

    ok, detail, task_id = simulate_app_shaped_task_create(
        prod,
        project_id=project_id,
        user_id=user["id"],
        marker=marker,
        jwt=jwt,
    )
    results.append({"step": "create_task", "ok": ok, "detail": detail})
    if not ok or not task_id:
        print("FAIL create", detail)
        return 1

    code, res = prod.rest(
        f"tasks?id=eq.{task_id}",
        method="PATCH",
        body={
            "status": "in_progress",
            "current_status": "in_progress",
            "completion_percentage": 40,
        },
        prefer="return=representation",
        key=jwt,
    )
    if code not in (200, 201) and is_missing_col(res):
        code, res = prod.rest(
            f"tasks?id=eq.{task_id}",
            method="PATCH",
            body={"status": "in_progress", "completion_percentage": 40},
            prefer="return=representation",
            key=jwt,
        )
    results.append(
        {"step": "update_progress", "ok": code in (200, 201), "detail": f"http={code}"}
    )

    fcode, _fbody = prod.rest(
        "task_files",
        method="POST",
        body={
            "task_id": task_id,
            "storage_path": f"headed/{marker}/smoke.jpg",
            "mime_type": "image/jpeg",
            "size_bytes": 42,
            "created_by": user["id"],
        },
        prefer="return=representation",
        key=jwt,
    )
    results.append(
        {"step": "task_files", "ok": fcode in (200, 201), "detail": f"http={fcode}"}
    )

    scode, sbody = prod.rest(
        "task_stars",
        method="POST",
        body={"task_id": task_id, "user_id": user["id"]},
        prefer="return=representation",
        key=jwt,
    )
    stars_ok = scode in (200, 201) or (
        isinstance(sbody, dict) and sbody.get("code") == "23505"
    )
    results.append({"step": "star", "ok": stars_ok, "detail": f"http={scode}"})

    # Detail read-back: NEW has no assigned_to — coalesce from junction (fetchTaskById path)
    tcode, trows = prod.rest(
        f"tasks?select=id,status,assigned_to&id=eq.{task_id}",
        key=jwt,
    )
    jcode, jrows = prod.rest(
        f"task_assignments?select=user_id&task_id=eq.{task_id}&is_active=eq.true",
        key=jwt,
    )
    from_col = []
    if tcode == 200 and isinstance(trows, list) and trows:
        raw = trows[0].get("assigned_to")
        if isinstance(raw, list):
            from_col = [str(x) for x in raw]
    from_junction = (
        [str(r["user_id"]) for r in jrows]
        if jcode == 200 and isinstance(jrows, list)
        else []
    )
    coalesced = from_col if from_col else from_junction
    hydrate_ok = user["id"] in coalesced
    results.append(
        {
            "step": "detail_assignees",
            "ok": hydrate_ok,
            "detail": f"col={from_col} junction={from_junction} coalesced={coalesced}",
        }
    )

    # Star + file read-back (hydrateStars / hydrateAttachments paths)
    scode2, srows = prod.rest(
        f"task_stars?select=user_id&task_id=eq.{task_id}",
        key=jwt,
    )
    fcode2, frows = prod.rest(
        f"task_files?select=storage_path&task_id=eq.{task_id}",
        key=jwt,
    )
    star_read = (
        any(str(r.get("user_id")) == user["id"] for r in srows)
        if scode2 == 200 and isinstance(srows, list)
        else False
    )
    file_read = (
        isinstance(frows, list) and len(frows) >= 1
        if fcode2 == 200
        else False
    )
    results.append(
        {"step": "star_readback", "ok": star_read, "detail": f"http={scode2}"}
    )
    results.append(
        {"step": "files_readback", "ok": file_read, "detail": f"http={fcode2}"}
    )

    prod.rest(
        f"tasks?id=eq.{task_id}",
        method="PATCH",
        body={"deleted_at": datetime.now(timezone.utc).isoformat()},
        key=prod.service_key,
    )

    OUT.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "plane": "PROD",
        "projectRef": PROD_REF,
        "appSha": sha,
        "qa_user": user.get("email"),
        "task_id": task_id,
        "results": results,
    }
    OUT.write_text(json.dumps(payload, indent=2))

    fails = [r for r in results if not r["ok"]]
    lines = [
        "# PROD headed smoke checklist — 2026-09-15",
        "",
        f"- appSha: `{sha}`",
        f"- plane: **PROD** `{PROD_REF}`",
        f"- QA user: `{user.get('email')}`",
        f"- automated artifact: `.cache/prod-new-sot-20260915/headed-prod-qa-smoke.json`",
        "",
        "## Automated (JWT, app-shaped + read-back) — this run",
        "",
        "| Step | Result | Detail |",
        "|---|---|---|",
    ]
    for r in results:
        lines.append(
            f"| {r['step']} | {'PASS' if r['ok'] else 'FAIL'} | {r['detail']} |"
        )
    lines.extend(
        [
            "",
            "## Human dogfood still required (camera / UI)",
            "",
            "1. Metro `__DEV__` → Dev Admin custom endpoint = PROD URL+anon (or temporary `.env` PROD bake).",
            "2. Confirm PROD banner / ref `jcnzjigxgkzhjsaekoqz` before any tap.",
            "3. Login as QA CA → Create Task + **one real camera/library photo** → save.",
            "4. Open Task Detail → assignees still present → Update Progress → star.",
            "5. Kill app / reopen → photo + star + assignees still visible.",
            "",
            "Gate B note: this automated smoke proves destination **data contract**",
            "(JWT write + junction/file/star read-back). It does **not** replace Metro UI.",
            "",
            f"**Automated verdict:** {'PASS' if not fails else 'FAIL'}",
            "",
        ]
    )
    EVIDENCE.write_text("\n".join(lines))
    print(EVIDENCE.read_text())
    if fails:
        print("FAIL:", fails)
        return 1
    print("HEADED-ADJACENT PROD SMOKE PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
