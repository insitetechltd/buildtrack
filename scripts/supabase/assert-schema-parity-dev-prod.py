#!/usr/bin/env python3
"""
Assert DEV public schema fingerprint ≡ PROD (column-level).

Also compares public function + RLS policy counts.
Fails closed on mismatch — required before claiming "DEV proves PROD".

Usage:
  python3 scripts/supabase/assert-schema-parity-dev-prod.py
  npm run test:schema-parity
"""
from __future__ import annotations

import json
import os
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DEV_REF = os.environ.get("DEV_PROJECT_REF", "zusulknbhaumougqckec")
PROD_REF = os.environ.get("PROD_PROJECT_REF", "jcnzjigxgkzhjsaekoqz")

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


def load_token() -> str:
    env: dict[str, str] = {}
    for line in (ROOT / ".env").read_text().splitlines():
        if "=" in line and not line.strip().startswith("#"):
            k, v = line.split("=", 1)
            env[k.strip()] = v.strip().strip('"').strip("'")
    token = env.get("SUPABASE_ACCESS_TOKEN") or os.environ.get("SUPABASE_ACCESS_TOKEN")
    if not token:
        raise SystemExit("SUPABASE_ACCESS_TOKEN required")
    return token


def query(token: str, ref: str, sql: str):
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
        return json.loads(resp.read().decode())


def lines(rows) -> set[str]:
    out = set()
    for r in rows:
        nn = "NN" if r["notnull"] else "NULL"
        out.add(f"{r['tbl']}.{r['col']}:{r['typ']}:{nn}")
    return out


def count(token: str, ref: str, sql: str) -> int:
    rows = query(token, ref, sql)
    return int(rows[0]["n"])


def main() -> int:
    token = load_token()
    dev_cols = lines(query(token, DEV_REF, FP_SQL))
    prod_cols = lines(query(token, PROD_REF, FP_SQL))

    only_dev = sorted(dev_cols - prod_cols)
    only_prod = sorted(prod_cols - dev_cols)

    funcs_sql = (
        "select count(*)::int as n from pg_proc p "
        "join pg_namespace n on p.pronamespace=n.oid where n.nspname='public';"
    )
    pols_sql = "select count(*)::int as n from pg_policies where schemaname='public';"
    tables_sql = (
        "select count(*)::int as n from information_schema.tables "
        "where table_schema='public' and table_type='BASE TABLE';"
    )

    payload = {
        "dev_ref": DEV_REF,
        "prod_ref": PROD_REF,
        "columns_match": not only_dev and not only_prod,
        "dev_column_count": len(dev_cols),
        "prod_column_count": len(prod_cols),
        "only_dev": only_dev,
        "only_prod": only_prod,
        "dev_tables": count(token, DEV_REF, tables_sql),
        "prod_tables": count(token, PROD_REF, tables_sql),
        "dev_funcs": count(token, DEV_REF, funcs_sql),
        "prod_funcs": count(token, PROD_REF, funcs_sql),
        "dev_policies": count(token, DEV_REF, pols_sql),
        "prod_policies": count(token, PROD_REF, pols_sql),
    }
    payload["funcs_match"] = payload["dev_funcs"] == payload["prod_funcs"]
    payload["policies_match"] = payload["dev_policies"] == payload["prod_policies"]
    payload["tables_match"] = payload["dev_tables"] == payload["prod_tables"]
    payload["ok"] = (
        payload["columns_match"]
        and payload["funcs_match"]
        and payload["policies_match"]
        and payload["tables_match"]
    )

    out_dir = ROOT / ".cache" / "schema-parity-20260915"
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / "assert-schema-parity.json"
    out_path.write_text(json.dumps(payload, indent=2) + "\n")

    print(json.dumps({k: payload[k] for k in (
        "ok", "columns_match", "tables_match", "funcs_match", "policies_match",
        "dev_column_count", "prod_column_count",
        "dev_tables", "prod_tables", "dev_funcs", "prod_funcs",
        "dev_policies", "prod_policies",
    )}, indent=2))
    if only_dev[:10]:
        print("only_dev_sample:", only_dev[:10])
    if only_prod[:10]:
        print("only_prod_sample:", only_prod[:10])
    print("artifact:", out_path)

    return 0 if payload["ok"] else 1


if __name__ == "__main__":
    sys.exit(main())
