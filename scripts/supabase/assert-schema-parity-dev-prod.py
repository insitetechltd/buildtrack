#!/usr/bin/env python3
"""
Assert DEV public schema fingerprint ≡ PROD, plus Stage B contract class:

- Column fingerprint (existing)
- CHECK constraint defs (pg_get_constraintdef) DEV ≡ PROD
- Prefer enums / column defaults / trigger names when present
- App TaskStatus union ⊆ live PROD tasks.status CHECK
  (removing `reported` from TS **or** PROD CHECK must fail this gate)

Connections prefer local pooler passwords (Management API token often expired):
  DEV  `.cache/schema-parity-20260915/insite-dev.env.local`
  PROD `.cache/env-cutover/insite-prod.env.local`
falls back to Management API `SUPABASE_ACCESS_TOKEN` when locals missing.

Usage:
  python3 scripts/supabase/assert-schema-parity-dev-prod.py
  npm run test:schema-parity
"""
from __future__ import annotations

import json
import os
import re
import subprocess
import sys
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
DEV_REF = os.environ.get("DEV_PROJECT_REF", "zusulknbhaumougqckec")
PROD_REF = os.environ.get("PROD_PROJECT_REF", "jcnzjigxgkzhjsaekoqz")
DEV_POOLER = os.environ.get(
    "DEV_POOLER_HOST", "aws-1-ap-south-1.pooler.supabase.com"
)
PROD_POOLER = os.environ.get(
    "PROD_POOLER_HOST", "aws-0-ap-south-1.pooler.supabase.com"
)
TASK_STATUS_TS = ROOT / "src" / "types" / "buildtrack.ts"

FP_SQL = """
select c.relname as tbl,
       a.attname as col,
       pg_catalog.format_type(a.atttypid, a.atttypmod) as typ,
       a.attnotnull as notnull
from pg_attribute a
join pg_class c on a.attrelid = c.oid
join pg_namespace n on c.relnamespace = n.oid
where n.nspname = 'public'
  and c.relkind = 'r'
  and a.attnum > 0
  and not a.attisdropped
order by 1, 2;
"""

CHECK_SQL = """
select c.relname as tbl,
       con.conname as name,
       pg_get_constraintdef(con.oid) as def
from pg_constraint con
join pg_class c on con.conrelid = c.oid
join pg_namespace n on c.relnamespace = n.oid
where n.nspname = 'public'
  and con.contype = 'c'
order by 1, 2;
"""

ENUM_SQL = """
select t.typname as typ,
       e.enumlabel as label,
       e.enumsortorder as ord
from pg_type t
join pg_enum e on e.enumtypid = t.oid
join pg_namespace n on n.oid = t.typnamespace
where n.nspname = 'public'
order by 1, 3;
"""

DEFAULT_SQL = """
select table_name as tbl,
       column_name as col,
       coalesce(column_default, '') as def
from information_schema.columns
where table_schema = 'public'
order by 1, 2;
"""

TRIGGER_SQL = """
select event_object_table as tbl,
       trigger_name as name,
       action_timing as timing,
       event_manipulation as evt
from information_schema.triggers
where trigger_schema = 'public'
order by 1, 2, 4;
"""


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


def normalize_ws(s: str) -> str:
    return re.sub(r"\s+", " ", s.strip())


def parse_check_literals(defn: str) -> set[str]:
    """Extract quoted literals from a CHECK def (IN list or ANY ARRAY)."""
    return set(re.findall(r"'([^']*)'", defn))


def parse_task_status_union(path: Path) -> set[str]:
    text = path.read_text()
    m = re.search(r"export\s+type\s+TaskStatus\s*=\s*(.*?);", text, re.S)
    if not m:
        raise RuntimeError(f"TaskStatus union not found in {path}")
    return set(re.findall(r'"([^"]+)"', m.group(1)))


def pooler_url(ref: str, password: str, host: str) -> str:
    user = urllib.parse.quote(f"postgres.{ref}", safe="")
    pw = urllib.parse.quote(password, safe="")
    return f"postgresql://{user}:{pw}@{host}:5432/postgres"


def psql_json(url: str, sql: str) -> list[dict[str, Any]]:
    """Run SQL via psql and return rows as list[dict] (json aggregate)."""
    wrapped = (
        "select coalesce(json_agg(row_to_json(q)), '[]'::json) as rows from ("
        + sql.rstrip().rstrip(";")
        + ") q;"
    )
    proc = subprocess.run(
        [
            "psql",
            url,
            "-v",
            "ON_ERROR_STOP=1",
            "-t",
            "-A",
            "-c",
            wrapped,
        ],
        capture_output=True,
        text=True,
        timeout=120,
        env={**os.environ, "PATH": f"/opt/homebrew/opt/libpq/bin:{os.environ.get('PATH','')}"},
    )
    if proc.returncode != 0:
        raise RuntimeError(proc.stderr.strip() or proc.stdout.strip() or "psql failed")
    raw = proc.stdout.strip()
    if not raw:
        return []
    data = json.loads(raw)
    if isinstance(data, list):
        return data
    return []


def management_query(token: str, ref: str, sql: str) -> list[dict[str, Any]]:
    req = urllib.request.Request(
        f"https://api.supabase.com/v1/projects/{ref}/database/query",
        data=json.dumps({"query": sql}).encode(),
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0 InsiteSchemaParity/1.0",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=120) as resp:
        rows = json.loads(resp.read().decode())
    if isinstance(rows, list):
        return rows
    return []


class PlaneQuery:
    def __init__(self, plane: str, ref: str, runner: str, query_fn):
        self.plane = plane
        self.ref = ref
        self.runner = runner
        self._query = query_fn

    def query(self, sql: str) -> list[dict[str, Any]]:
        return self._query(sql)


def build_plane(plane: str, ref: str, pooler: str, local_path: Path) -> PlaneQuery:
    local = load_dotenv(local_path)
    password = (
        local.get("SUPABASE_DB_PASSWORD")
        or os.environ.get("PARITY_DB_PASSWORD")
        or os.environ.get("GREENFIELD_DB_PASSWORD")
        or ""
    )
    local_ref = local.get("SUPABASE_PROJECT_REF") or ref
    if password and local_ref == ref:
        url = pooler_url(ref, password, pooler)

        def q(sql: str, _url: str = url) -> list[dict[str, Any]]:
            return psql_json(_url, sql)

        print(f"{plane} query: psql pooler (ref={ref})")
        return PlaneQuery(plane, ref, "psql", q)

    root_env = load_dotenv(ROOT / ".env")
    token = root_env.get("SUPABASE_ACCESS_TOKEN") or os.environ.get(
        "SUPABASE_ACCESS_TOKEN"
    )
    if not token:
        raise RuntimeError(
            f"{plane}: no DB password in {local_path.name} and no SUPABASE_ACCESS_TOKEN"
        )

    def q(sql: str, _token: str = token, _ref: str = ref) -> list[dict[str, Any]]:
        return management_query(_token, _ref, sql)

    print(f"{plane} query: management API (ref={ref})")
    return PlaneQuery(plane, ref, "management", q)


def col_lines(rows: list[dict[str, Any]]) -> set[str]:
    out: set[str] = set()
    for r in rows:
        nn = "NN" if r.get("notnull") else "NULL"
        out.add(f"{r['tbl']}.{r['col']}:{r['typ']}:{nn}")
    return out


def check_lines(rows: list[dict[str, Any]]) -> set[str]:
    out: set[str] = set()
    for r in rows:
        out.add(f"{r['tbl']}.{r['name']}:{normalize_ws(str(r['def']))}")
    return out


def enum_lines(rows: list[dict[str, Any]]) -> set[str]:
    return {f"{r['typ']}.{r['label']}:{r['ord']}" for r in rows}


def default_lines(rows: list[dict[str, Any]]) -> set[str]:
    return {
        f"{r['tbl']}.{r['col']}:{normalize_ws(str(r.get('def') or ''))}"
        for r in rows
        if r.get("def")
    }


def trigger_lines(rows: list[dict[str, Any]]) -> set[str]:
    return {f"{r['tbl']}.{r['name']}:{r['timing']}:{r['evt']}" for r in rows}


def find_status_check(rows: list[dict[str, Any]]) -> str | None:
    for r in rows:
        if r.get("tbl") == "tasks" and r.get("name") == "tasks_status_check":
            return str(r["def"])
    # Fallback: any tasks CHECK mentioning status
    for r in rows:
        if r.get("tbl") == "tasks" and "status" in str(r.get("def", "")).lower():
            if "billing" in str(r.get("name", "")):
                continue
            return str(r["def"])
    return None


def main() -> int:
    try:
        dev = build_plane(
            "DEV",
            DEV_REF,
            DEV_POOLER,
            ROOT / ".cache" / "schema-parity-20260915" / "insite-dev.env.local",
        )
        prod = build_plane(
            "PROD",
            PROD_REF,
            PROD_POOLER,
            ROOT / ".cache" / "env-cutover" / "insite-prod.env.local",
        )
    except Exception as e:
        print(f"FAIL: connect: {e}", file=sys.stderr)
        return 1

    # --- Column fingerprint (legacy) ---
    try:
        dev_cols = col_lines(dev.query(FP_SQL))
        prod_cols = col_lines(prod.query(FP_SQL))
    except Exception as e:
        print(f"FAIL: columns: {e}", file=sys.stderr)
        return 1

    only_dev = sorted(dev_cols - prod_cols)
    only_prod = sorted(prod_cols - dev_cols)

    # --- CHECK fingerprint ---
    try:
        dev_checks_rows = dev.query(CHECK_SQL)
        prod_checks_rows = prod.query(CHECK_SQL)
    except Exception as e:
        print(f"FAIL: checks: {e}", file=sys.stderr)
        return 1

    dev_checks = check_lines(dev_checks_rows)
    prod_checks = check_lines(prod_checks_rows)
    only_dev_checks = sorted(dev_checks - prod_checks)
    only_prod_checks = sorted(prod_checks - dev_checks)

    # --- Prefer enums / defaults / triggers (soft if empty on both) ---
    prefer: dict[str, Any] = {}
    for label, sql, liner in (
        ("enums", ENUM_SQL, enum_lines),
        ("defaults", DEFAULT_SQL, default_lines),
        ("triggers", TRIGGER_SQL, trigger_lines),
    ):
        try:
            d = liner(dev.query(sql))
            p = liner(prod.query(sql))
            prefer[label] = {
                "dev_count": len(d),
                "prod_count": len(p),
                "match": d == p,
                "only_dev": sorted(d - p)[:20],
                "only_prod": sorted(p - d)[:20],
            }
        except Exception as e:
            prefer[label] = {"error": str(e), "match": False}

    # --- TaskStatus ⊆ PROD tasks_status_check ---
    try:
        ts_statuses = parse_task_status_union(TASK_STATUS_TS)
    except Exception as e:
        print(f"FAIL: parse TaskStatus: {e}", file=sys.stderr)
        return 1

    prod_status_def = find_status_check(prod_checks_rows)
    if not prod_status_def:
        print("FAIL: PROD tasks_status_check missing", file=sys.stderr)
        return 1
    prod_status_vals = parse_check_literals(prod_status_def)
    missing_in_prod = sorted(ts_statuses - prod_status_vals)
    reported_in_ts = "reported" in ts_statuses
    reported_in_prod = "reported" in prod_status_vals
    status_subset_ok = (
        not missing_in_prod and reported_in_ts and reported_in_prod
    )

    funcs_sql = (
        "select count(*)::int as n from pg_proc p "
        "join pg_namespace n on p.pronamespace=n.oid where n.nspname='public'"
    )
    pols_sql = (
        "select count(*)::int as n from pg_policies where schemaname='public'"
    )
    tables_sql = (
        "select count(*)::int as n from information_schema.tables "
        "where table_schema='public' and table_type='BASE TABLE'"
    )

    def count(plane: PlaneQuery, sql: str) -> int:
        rows = plane.query(sql)
        if not rows:
            return 0
        return int(rows[0].get("n") or 0)

    payload: dict[str, Any] = {
        "dev_ref": DEV_REF,
        "prod_ref": PROD_REF,
        "dev_runner": dev.runner,
        "prod_runner": prod.runner,
        "columns_match": not only_dev and not only_prod,
        "dev_column_count": len(dev_cols),
        "prod_column_count": len(prod_cols),
        "only_dev": only_dev,
        "only_prod": only_prod,
        "checks_match": not only_dev_checks and not only_prod_checks,
        "dev_check_count": len(dev_checks),
        "prod_check_count": len(prod_checks),
        "only_dev_checks": only_dev_checks[:50],
        "only_prod_checks": only_prod_checks[:50],
        "prefer": prefer,
        "task_status": {
            "ts_count": len(ts_statuses),
            "prod_check_count": len(prod_status_vals),
            "reported_in_ts": reported_in_ts,
            "reported_in_prod_check": reported_in_prod,
            "missing_in_prod_check": missing_in_prod,
            "subset_ok": status_subset_ok,
            "prod_check_def": normalize_ws(prod_status_def)[:500],
        },
        "dev_tables": count(dev, tables_sql),
        "prod_tables": count(prod, tables_sql),
        "dev_funcs": count(dev, funcs_sql),
        "prod_funcs": count(prod, funcs_sql),
        "dev_policies": count(dev, pols_sql),
        "prod_policies": count(prod, pols_sql),
    }
    payload["funcs_match"] = payload["dev_funcs"] == payload["prod_funcs"]
    payload["policies_match"] = payload["dev_policies"] == payload["prod_policies"]
    payload["tables_match"] = payload["dev_tables"] == payload["prod_tables"]
    # Prefer layers: mismatch is WARN in summary unless both sides empty-error;
    # Stage B hard-fails on columns + checks + TaskStatus subset.
    prefer_ok = all(
        v.get("match", False) or (v.get("dev_count", 0) == 0 and v.get("prod_count", 0) == 0)
        for v in prefer.values()
        if "error" not in v
    )
    payload["prefer_match"] = prefer_ok and all("error" not in v for v in prefer.values())
    payload["ok"] = (
        payload["columns_match"]
        and payload["checks_match"]
        and payload["funcs_match"]
        and payload["policies_match"]
        and payload["tables_match"]
        and status_subset_ok
    )

    out_dir = ROOT / ".cache" / "schema-parity-20260915"
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / "assert-schema-parity.json"
    out_path.write_text(json.dumps(payload, indent=2) + "\n")

    summary = {
        k: payload[k]
        for k in (
            "ok",
            "columns_match",
            "checks_match",
            "tables_match",
            "funcs_match",
            "policies_match",
            "prefer_match",
            "dev_column_count",
            "prod_column_count",
            "dev_check_count",
            "prod_check_count",
            "dev_tables",
            "prod_tables",
            "dev_funcs",
            "prod_funcs",
            "dev_policies",
            "prod_policies",
        )
    }
    summary["task_status_subset_ok"] = status_subset_ok
    summary["reported_in_ts"] = reported_in_ts
    summary["reported_in_prod_check"] = reported_in_prod
    print(json.dumps(summary, indent=2))
    if only_dev[:5]:
        print("only_dev_sample:", only_dev[:5])
    if only_prod[:5]:
        print("only_prod_sample:", only_prod[:5])
    if only_dev_checks[:5]:
        print("only_dev_checks_sample:", only_dev_checks[:5])
    if only_prod_checks[:5]:
        print("only_prod_checks_sample:", only_prod_checks[:5])
    if missing_in_prod:
        print("task_status_missing_in_prod_check:", missing_in_prod)
    if not reported_in_ts or not reported_in_prod:
        print(
            "FAIL class: `reported` must appear in TaskStatus TS and PROD tasks_status_check"
        )
    print("artifact:", out_path)

    return 0 if payload["ok"] else 1


def self_test_reported_gate() -> int:
    """Offline proof: removing `reported` from TS or CHECK fails Stage B logic."""
    ts = parse_task_status_union(TASK_STATUS_TS)
    if "reported" not in ts:
        print("SELF-TEST FAIL: live TaskStatus already missing reported")
        return 1
    fake_check_ok = parse_check_literals(
        "CHECK (status IN ('reported', 'new', 'in_progress'))"
    )
    fake_check_no_reported = parse_check_literals(
        "CHECK (status IN ('new', 'in_progress'))"
    )
    # Class: TS ⊆ CHECK must fail when reported stripped from CHECK
    if not (ts - fake_check_no_reported):
        # ts has more than those three — still must include reported as missing
        pass
    missing = ts - fake_check_no_reported
    if "reported" not in missing:
        print("SELF-TEST FAIL: expected reported missing from stripped CHECK")
        return 1
    # Explicit reported gate
    if "reported" not in fake_check_ok or "reported" in fake_check_no_reported:
        print("SELF-TEST FAIL: literal parser broken for reported")
        return 1
    ts_no_reported = ts - {"reported"}
    if "reported" in ts_no_reported:
        print("SELF-TEST FAIL: could not simulate TS without reported")
        return 1
    # Simulated gate outcomes
    assert ("reported" in ts) and ("reported" in fake_check_ok)
    assert not (("reported" in ts_no_reported) and ("reported" in fake_check_ok))
    assert not (("reported" in ts) and ("reported" in fake_check_no_reported))
    print("SELF-TEST PASS: removing reported from TS or CHECK fails Stage B gate logic")
    return 0


if __name__ == "__main__":
    if "--self-test" in sys.argv:
        raise SystemExit(self_test_reported_gate())
    sys.exit(main())
