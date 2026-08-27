#!/usr/bin/env bash
# Read-only live schema snapshot (columns / PKs / FKs) for billing + company/user tables.
# Writes:
#   documentation/audit/database/LIVE_SCHEMA_SNAPSHOT.md  (stable pointer)
#   docs/superpowers/evidence/live-schema-snapshot-redacted-YYYYMMDD.md
#
# Requires: EXPO_PUBLIC_SUPABASE_URL + SUPABASE_ACCESS_TOKEN in .env
# No passwords logged; project ref redacted in output.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

if [[ -f "$ROOT/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT/.env"
  set +a
fi

if [[ -z "${EXPO_PUBLIC_SUPABASE_URL:-}" || -z "${SUPABASE_ACCESS_TOKEN:-}" ]]; then
  echo "Need EXPO_PUBLIC_SUPABASE_URL and SUPABASE_ACCESS_TOKEN in .env" >&2
  exit 1
fi

python3 - <<'PY'
import json, subprocess, tempfile
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

env = {}
for line in Path(".env").read_text().splitlines():
    s = line.strip()
    if not s or s.startswith("#") or "=" not in s:
        continue
    k, v = s.split("=", 1)
    env[k.strip()] = v.strip().strip('"').strip("'")

ref = urlparse(env["EXPO_PUBLIC_SUPABASE_URL"]).hostname.split(".")[0]
token = env["SUPABASE_ACCESS_TOKEN"]
api = f"https://api.supabase.com/v1/projects/{ref}/database/query"

def q(sql: str):
    with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as f:
        json.dump({"query": sql}, f)
        path = f.name
    proc = subprocess.run(
        [
            "curl", "-sS",
            "-H", f"Authorization: Bearer {token}",
            "-H", "Content-Type: application/json",
            "-H", "User-Agent: Mozilla/5.0 (compatible; InsiteSchemaDump/1.0)",
            "--data", f"@{path}",
            api,
        ],
        capture_output=True,
        text=True,
        timeout=90,
    )
    Path(path).unlink(missing_ok=True)
    if proc.returncode != 0:
        raise RuntimeError(proc.stderr)
    body = proc.stdout.strip()
    if body.startswith("error") or "error code" in body:
        raise RuntimeError(body[:500])
    data = json.loads(body)
    if isinstance(data, dict) and data.get("message"):
        raise RuntimeError(json.dumps(data)[:500])
    return data

tables = [
    "companies",
    "users",
    "company_subscriptions",
    "company_entitlements",
    "company_entitlement_revisions",
    "billing_webhook_events",
    "billing_audit_log",
    "plan_tiers",
    "plan_prices",
    "plan_price_meters",
    "meter_definitions",
]
table_array = ",".join("'" + t + "'" for t in tables)

cols = q(
    f"""
SELECT c.relname AS table_name,
       a.attname AS column_name,
       pg_catalog.format_type(a.atttypid, a.atttypmod) AS data_type,
       NOT a.attnotnull AS is_nullable,
       pg_get_expr(ad.adbin, ad.adrelid) AS column_default,
       a.attnum AS ordinal_position
FROM pg_catalog.pg_attribute a
JOIN pg_catalog.pg_class c ON a.attrelid = c.oid
JOIN pg_catalog.pg_namespace n ON c.relnamespace = n.oid
LEFT JOIN pg_catalog.pg_attrdef ad ON a.attrelid = ad.adrelid AND a.attnum = ad.adnum
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND c.relname = ANY(ARRAY[{table_array}]::text[])
  AND a.attnum > 0
  AND NOT a.attisdropped
ORDER BY c.relname, a.attnum
"""
)

pks = q(
    f"""
SELECT c.relname AS table_name,
       a.attname AS column_name,
       con.conname AS constraint_name
FROM pg_catalog.pg_constraint con
JOIN pg_catalog.pg_class c ON con.conrelid = c.oid
JOIN pg_catalog.pg_namespace n ON c.relnamespace = n.oid
JOIN LATERAL unnest(con.conkey) WITH ORDINALITY AS u(attnum, ord) ON true
JOIN pg_catalog.pg_attribute a ON a.attrelid = c.oid AND a.attnum = u.attnum
WHERE con.contype = 'p'
  AND n.nspname = 'public'
  AND c.relname = ANY(ARRAY[{table_array}]::text[])
ORDER BY c.relname, u.ord
"""
)

fks = q(
    f"""
SELECT
  c.relname AS table_name,
  a.attname AS column_name,
  cf.relname AS foreign_table_name,
  af.attname AS foreign_column_name,
  con.conname AS constraint_name
FROM pg_catalog.pg_constraint con
JOIN pg_catalog.pg_class c ON con.conrelid = c.oid
JOIN pg_catalog.pg_namespace n ON c.relnamespace = n.oid
JOIN pg_catalog.pg_class cf ON con.confrelid = cf.oid
JOIN LATERAL unnest(con.conkey, con.confkey) WITH ORDINALITY AS u(attnum, fattnum, ord) ON true
JOIN pg_catalog.pg_attribute a ON a.attrelid = c.oid AND a.attnum = u.attnum
JOIN pg_catalog.pg_attribute af ON af.attrelid = cf.oid AND af.attnum = u.fattnum
WHERE con.contype = 'f'
  AND n.nspname = 'public'
  AND c.relname = ANY(ARRAY[{table_array}]::text[])
ORDER BY c.relname, u.ord
"""
)

by_table = {}
for r in cols:
    by_table.setdefault(r["table_name"], []).append(r)
present = {(r["table_name"], r["column_name"]) for r in cols}

wanted = [
    ("users", "role"),
    ("users", "system_permission"),
    ("users", "is_pending"),
    ("users", "company_id"),
    ("billing_webhook_events", "created_at"),
    ("billing_webhook_events", "processed_at"),
    ("companies", "created_at"),
    ("company_subscriptions", "company_id"),
    ("company_entitlements", "company_id"),
]

stamp = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%MZ")
day = datetime.now().strftime("%Y%m%d")
out = Path("docs/superpowers/evidence") / f"live-schema-snapshot-redacted-{day}.md"
stable = Path("documentation/audit/database/LIVE_SCHEMA_SNAPSHOT.md")

lines = [
    "# Live schema snapshot (redacted)",
    "",
    f"- Captured: `{stamp}` UTC",
    "- Source: Supabase Management API database query (pg_catalog)",
    f"- Project ref: **redacted** (length={len(ref)})",
    "- Scope: billing + company/user tables — **columns / PKs / FKs only, no row data**",
    "- Prefer this file over migration SQL when writing live Dashboard queries",
    "",
    "## Column presence probes (high-churn mistakes)",
    "",
    "| table | column | present |",
    "|---|---|---|",
]
for t, c in wanted:
    lines.append(f"| `{t}` | `{c}` | {'YES' if (t, c) in present else 'NO'} |")

lines += [
    "",
    "## Primary keys",
    "",
    "| table | column | constraint |",
    "|---|---|---|",
]
for r in pks:
    lines.append(f"| `{r['table_name']}` | `{r['column_name']}` | `{r['constraint_name']}` |")

lines += [
    "",
    "## Foreign keys",
    "",
    "| table.column | → | foreign | constraint |",
    "|---|---|---|---|",
]
for r in fks:
    lines.append(
        f"| `{r['table_name']}.{r['column_name']}` | → | `{r['foreign_table_name']}.{r['foreign_column_name']}` | `{r['constraint_name']}` |"
    )

lines += ["", "## Columns by table", ""]
for table in tables:
    rows = by_table.get(table, [])
    lines.append(f"### `{table}` ({len(rows)} columns)")
    lines.append("")
    if not rows:
        lines.append("_Table missing on live tenant._")
        lines.append("")
        continue
    lines.append("| column | type | nullable | default |")
    lines.append("|---|---|---|---|")
    for r in rows:
        default = r.get("column_default")
        default_s = (
            "`" + str(default)[:100].replace("|", "\\|") + "`"
            if default is not None
            else ""
        )
        null_s = "YES" if r.get("is_nullable") else "NO"
        lines.append(
            f"| `{r['column_name']}` | `{r['data_type']}` | `{null_s}` | {default_s} |"
        )
    lines.append("")

lines += [
    "## Agent rule",
    "",
    "1. Before writing live SQL against production, read this snapshot.",
    "2. Do **not** assume greenfield migration columns exist.",
    "3. Live `users` uses `role` (not `system_permission`).",
    "4. `billing_webhook_events` timestamp is `processed_at` (not `created_at`).",
    "5. Refresh: `bash scripts/supabase/dump-live-schema.sh`",
    "",
]

text = "\n".join(lines) + "\n"
out.parent.mkdir(parents=True, exist_ok=True)
stable.parent.mkdir(parents=True, exist_ok=True)
out.write_text(text)
stable.write_text(text)
print(f"wrote {out}")
print(f"wrote {stable}")
for t, c in wanted:
    print(f"  {t}.{c}={'YES' if (t, c) in present else 'NO'}")
PY
