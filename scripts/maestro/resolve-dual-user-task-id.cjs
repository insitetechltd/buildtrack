#!/usr/bin/env node
/**
 * Resolve a live task id by unique title (dual-user Maestro gate).
 *
 * Usage:
 *   node scripts/maestro/resolve-dual-user-task-id.cjs --title "DU-H01-123"
 *
 * Writes:
 *   .cache/maestro-du-task.env  (DU_TASK_TITLE, DU_TASK_ID)
 *
 * Auth: SUPABASE_SERVICE_ROLE_KEY (local .env). Never prints secret values.
 */
const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const ROOT = path.resolve(__dirname, "../..");
const CACHE = path.join(ROOT, ".cache");
const ENV_OUT = path.join(CACHE, "maestro-du-task.env");

const ASSIGNEE_EMAIL =
  process.env.MAESTRO_DU_ASSIGNEE_EMAIL || "alice.workera1@test.com";
const POLL_MS = Number(process.env.MAESTRO_DU_RESOLVE_POLL_MS || 2000);
const TIMEOUT_MS = Number(process.env.MAESTRO_DU_RESOLVE_TIMEOUT_MS || 90000);

function loadDotEnv() {
  const envPath = path.join(ROOT, ".env");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

function argTitle() {
  const idx = process.argv.indexOf("--title");
  if (idx >= 0 && process.argv[idx + 1]) return process.argv[idx + 1];
  console.error("FAIL: --title required");
  process.exit(2);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  loadDotEnv();
  const title = argTitle();
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error(
      "FAIL: EXPO_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required in .env",
    );
    process.exit(2);
  }

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: assignee, error: assigneeErr } = await supabase
    .from("users")
    .select("id, email")
    .eq("email", ASSIGNEE_EMAIL)
    .maybeSingle();
  if (assigneeErr || !assignee?.id) {
    console.error(
      "FAIL: lookup assignee",
      ASSIGNEE_EMAIL,
      assigneeErr?.message || "not found",
    );
    process.exit(3);
  }

  const started = Date.now();
  let hit = null;

  while (Date.now() - started < TIMEOUT_MS) {
    const { data: rows, error } = await supabase
      .from("tasks")
      .select("id, title, assigned_to, status, created_at")
      .eq("title", title)
      .order("created_at", { ascending: false })
      .limit(5);

    if (error) {
      console.error("FAIL: tasks query", error.message);
      process.exit(4);
    }

    hit =
      (rows || []).find((row) => {
        const assigned = Array.isArray(row.assigned_to) ? row.assigned_to : [];
        return assigned.map(String).includes(String(assignee.id));
      }) || null;

    if (hit?.id) break;
    process.stdout.write(`WAIT title=${title} elapsed=${Date.now() - started}ms\n`);
    await sleep(POLL_MS);
  }

  if (!hit?.id) {
    console.error(`FAIL: task not found for title=${title} within ${TIMEOUT_MS}ms`);
    process.exit(5);
  }

  fs.mkdirSync(CACHE, { recursive: true });
  const envBody = `DU_TASK_TITLE=${JSON.stringify(title)}\nDU_TASK_ID=${hit.id}\n`;
  fs.writeFileSync(ENV_OUT, envBody, "utf8");

  console.log(
    `RESOLVE_OK title=${title} taskId=${hit.id} status=${hit.status} assignee=${ASSIGNEE_EMAIL}`,
  );
}

main().catch((err) => {
  console.error("FAIL:", err?.message || err);
  process.exit(1);
});
