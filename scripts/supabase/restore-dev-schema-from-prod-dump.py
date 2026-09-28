#!/usr/bin/env python3
"""
Restore DEV public schema from a PROD pg_dump --schema-only file via Supabase
Management SQL API.

Hard rules:
  - Never targets PROD ref
  - DEV data is disposable (DROP SCHEMA public CASCADE)
  - Dollar-quote aware statement split (pg_dump function bodies)

Usage:
  python3 scripts/supabase/restore-dev-schema-from-prod-dump.py \\
    --dump .cache/schema-parity-20260915/prod-public.schema.sql \\
    --dev-ref zusulknbhaumougqckec
"""
from __future__ import annotations

import argparse
import json
import re
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

# time used for gentle pacing between Management API batches

ROOT = Path(__file__).resolve().parents[2]
PROD_REF_DEFAULT = "jcnzjigxgkzhjsaekoqz"
DEV_REF_DEFAULT = "zusulknbhaumougqckec"


def load_token() -> str:
    env: dict[str, str] = {}
    for line in (ROOT / ".env").read_text().splitlines():
        if "=" in line and not line.strip().startswith("#"):
            k, v = line.split("=", 1)
            env[k.strip()] = v.strip().strip('"').strip("'")
    token = env.get("SUPABASE_ACCESS_TOKEN")
    if not token:
        raise SystemExit("SUPABASE_ACCESS_TOKEN missing in .env")
    return token


def split_sql(sql: str) -> list[str]:
    """Split SQL into statements; respect $tag$ ... $tag$ and quotes."""
    sql = re.sub(r"^\\restrict.*$", "", sql, flags=re.M)
    sql = re.sub(r"^\\unrestrict.*$", "", sql, flags=re.M)
    stmts: list[str] = []
    buf: list[str] = []
    i = 0
    n = len(sql)
    in_single = False
    in_double = False
    dollar_tag: str | None = None

    def flush():
        stmt = "".join(buf).strip()
        buf.clear()
        if not stmt or stmt == ";":
            return
        # drop noise
        if stmt.startswith("--"):
            return
        upper = stmt.lstrip().upper()
        if upper.startswith("SET ") or upper.startswith("SELECT PG_CATALOG.SET_CONFIG"):
            return
        if upper.startswith("CREATE SCHEMA PUBLIC"):
            return
        if upper.startswith("COMMENT ON SCHEMA PUBLIC"):
            return
        stmts.append(stmt)

    while i < n:
        ch = sql[i]
        nxt = sql[i + 1] if i + 1 < n else ""

        if dollar_tag is not None:
            # look for closing tag
            if ch == "$" and sql.startswith(dollar_tag, i):
                buf.append(dollar_tag)
                i += len(dollar_tag)
                dollar_tag = None
                continue
            buf.append(ch)
            i += 1
            continue

        if in_single:
            buf.append(ch)
            if ch == "'" and nxt == "'":
                buf.append(nxt)
                i += 2
                continue
            if ch == "'":
                in_single = False
            i += 1
            continue

        if in_double:
            buf.append(ch)
            if ch == '"':
                in_double = False
            i += 1
            continue

        # line comment
        if ch == "-" and nxt == "-":
            while i < n and sql[i] != "\n":
                i += 1
            continue

        # block comment
        if ch == "/" and nxt == "*":
            i += 2
            while i < n - 1 and not (sql[i] == "*" and sql[i + 1] == "/"):
                i += 1
            i += 2
            continue

        # dollar quote start
        if ch == "$":
            m = re.match(r"\$[A-Za-z0-9_]*\$", sql[i:])
            if m:
                dollar_tag = m.group(0)
                buf.append(dollar_tag)
                i += len(dollar_tag)
                continue

        if ch == "'":
            in_single = True
            buf.append(ch)
            i += 1
            continue
        if ch == '"':
            in_double = True
            buf.append(ch)
            i += 1
            continue

        if ch == ";":
            buf.append(ch)
            flush()
            i += 1
            continue

        buf.append(ch)
        i += 1

    tail = "".join(buf).strip()
    if tail:
        stmts.append(tail)
    return stmts


def run_sql(token: str, ref: str, sql: str, prod_ref: str, timeout: int = 180) -> tuple[int, str]:
    if ref == prod_ref:
        raise RuntimeError("REFUSE_PROD_WRITE")
    req = urllib.request.Request(
        f"https://api.supabase.com/v1/projects/{ref}/database/query",
        data=json.dumps({"query": sql}).encode(),
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0 InsiteParityRestore/1.1",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.status, resp.read().decode()
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()[:1200]
    except Exception as e:
        return 0, f"{type(e).__name__}: {e}"


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dump", required=True)
    ap.add_argument("--dev-ref", default=DEV_REF_DEFAULT)
    ap.add_argument("--prod-ref", default=PROD_REF_DEFAULT)
    ap.add_argument("--skip-nuke", action="store_true")
    ap.add_argument("--only-missing", action="store_true", help="Skip nuke; apply dump (IF NOT EXISTS style best-effort)")
    args = ap.parse_args()

    dump_path = Path(args.dump)
    if not dump_path.is_file():
        raise SystemExit(f"dump not found: {dump_path}")

    token = load_token()
    out = dump_path.parent
    log_path = out / "dev-restore-v2.log"
    fail_path = out / "dev-restore-v2-failures.json"
    logs: list[str] = []

    def log(msg: str) -> None:
        print(msg, flush=True)
        logs.append(msg)

    if args.dev_ref == args.prod_ref:
        raise SystemExit("dev-ref must differ from prod-ref")

    if not args.skip_nuke and not args.only_missing:
        nuke = """
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON SCHEMA public TO public;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres, anon, authenticated, service_role;
"""
        st, body = run_sql(token, args.dev_ref, nuke, args.prod_ref)
        log(f"NUKE status={st} body={body[:200]}")
        if st not in (200, 201):
            log_path.write_text("\n".join(logs))
            return 2

    stmts = split_sql(dump_path.read_text())
    log(f"STATEMENTS {len(stmts)}")

    def is_fn(stmt: str) -> bool:
        u = stmt.lstrip().upper()
        return u.startswith("CREATE FUNCTION") or u.startswith(
            "CREATE OR REPLACE FUNCTION"
        )

    def is_pol_or_trig(stmt: str) -> bool:
        u = stmt.lstrip().upper()
        return (
            u.startswith("CREATE POLICY")
            or u.startswith("CREATE TRIGGER")
            or u.startswith("CREATE CONSTRAINT TRIGGER")
        )

    # Pass A: everything except functions/policies/triggers (tables/types/indexes/…).
    # Pass B: functions with check_function_bodies=false (tables now exist).
    # Pass C: policies + triggers (functions now exist).
    pass_a = [s for s in stmts if not is_fn(s) and not is_pol_or_trig(s)]
    pass_b = [s for s in stmts if is_fn(s)]
    pass_c = [s for s in stmts if is_pol_or_trig(s)]
    ordered: list[tuple[str, str]] = (
        [("A", s) for s in pass_a]
        + [("B", s) for s in pass_b]
        + [("C", s) for s in pass_c]
    )
    log(f"ORDERED passA={len(pass_a)} passB={len(pass_b)} passC={len(pass_c)}")

    ok = fail = 0
    failures: list[dict] = []
    for i, (phase, stmt) in enumerate(ordered, 1):
        sql = stmt
        if phase == "B":
            if stmt.lstrip().upper().startswith("CREATE FUNCTION"):
                stmt = stmt.replace("CREATE FUNCTION", "CREATE OR REPLACE FUNCTION", 1)
            sql = "SET check_function_bodies = false;\n" + stmt
        st, body = run_sql(token, args.dev_ref, sql, args.prod_ref)
        if st in (200, 201):
            ok += 1
        else:
            # tolerate already-exists when only-missing
            if args.only_missing and (
                "already exists" in body.lower() or "duplicate" in body.lower()
            ):
                ok += 1
            else:
                fail += 1
                failures.append(
                    {
                        "i": i,
                        "phase": phase,
                        "status": st,
                        "body": body[:500],
                        "head": stmt[:200],
                    }
                )
        if i % 25 == 0:
            log(f"PROGRESS {i}/{len(ordered)} ok={ok} fail={fail}")
            time.sleep(0.05)

    log(f"DONE ok={ok} fail={fail}")
    fail_path.write_text(json.dumps(failures, indent=2))
    log_path.write_text("\n".join(logs))

    # post checks
    for label, sql in [
        (
            "tables",
            "select count(*)::int as n from information_schema.tables where table_schema='public' and table_type='BASE TABLE';",
        ),
        (
            "funcs",
            "select count(*)::int as n from pg_proc p join pg_namespace n on p.pronamespace=n.oid where n.nspname='public';",
        ),
        (
            "policies",
            "select count(*)::int as n from pg_policies where schemaname='public';",
        ),
    ]:
        st, body = run_sql(token, args.dev_ref, sql, args.prod_ref)
        log(f"CHECK_{label} status={st} body={body[:180]}")

    return 0 if fail == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
