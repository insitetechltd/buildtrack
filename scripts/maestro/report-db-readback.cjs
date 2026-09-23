#!/usr/bin/env node
/**
 * Stage E Report DB readback — same-ID status + activity proof.
 *
 * Env:
 *   REPORT_TASK_ID (required)
 *   EXPECT_STATUS = reported | resolved
 *   EXPECT_ACTIVITY = issue_reported | issue_resolved (optional)
 *   EXPECT_ACTOR_EMAIL = carol.admina@test.com (optional; for issue_resolved)
 *   EXPO_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (DEV only)
 */
const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const ROOT = path.resolve(__dirname, "../..");
const TASK_ID = process.env.REPORT_TASK_ID || process.env.DU_TASK_ID;
const EXPECT_STATUS = process.env.EXPECT_STATUS || "reported";
const EXPECT_ACTIVITY = process.env.EXPECT_ACTIVITY || "";
const EXPECT_ACTOR = process.env.EXPECT_ACTOR_EMAIL || "";

function loadDotEnv() {
  const envPath = path.join(ROOT, ".env");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq <= 0) continue;
    const k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (process.env[k] === undefined) process.env[k] = v;
  }
}

async function main() {
  loadDotEnv();
  if (!TASK_ID) {
    console.error("FAIL: REPORT_TASK_ID required");
    process.exit(2);
  }
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("FAIL: missing supabase env");
    process.exit(2);
  }
  if (!url.includes("zusulknbhaumougqckec")) {
    console.error("FAIL: not DEV ref");
    process.exit(9);
  }
  const sb = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: task, error } = await sb
    .from("tasks")
    .select("id, title, status")
    .eq("id", TASK_ID)
    .maybeSingle();
  if (error || !task?.id) {
    console.error("FAIL: task missing", error?.message || TASK_ID);
    process.exit(1);
  }
  if (String(task.status) !== EXPECT_STATUS) {
    console.error(
      `FAIL: status want=${EXPECT_STATUS} got=${task.status} id=${TASK_ID}`,
    );
    process.exit(1);
  }

  let activityOk = true;
  let activityRow = null;
  if (EXPECT_ACTIVITY) {
    const { data: acts, error: aErr } = await sb
      .from("task_activities")
      .select("id, activity_type, user_id, description, created_at")
      .eq("task_id", TASK_ID)
      .eq("activity_type", EXPECT_ACTIVITY)
      .order("created_at", { ascending: false })
      .limit(5);
    if (aErr || !acts || acts.length === 0) {
      console.error(
        "FAIL: activity missing",
        EXPECT_ACTIVITY,
        aErr?.message || "none",
      );
      process.exit(1);
    }
    activityRow = acts[0];
    if (EXPECT_ACTOR) {
      const { data: actor } = await sb
        .from("users")
        .select("id, email")
        .eq("email", EXPECT_ACTOR)
        .maybeSingle();
      if (!actor?.id || String(activityRow.user_id) !== String(actor.id)) {
        console.error(
          `FAIL: activity actor want=${EXPECT_ACTOR} got_user=${activityRow.user_id}`,
        );
        process.exit(1);
      }
    }
  }

  console.log(
    JSON.stringify({
      ok: true,
      taskId: TASK_ID,
      title: task.title,
      status: task.status,
      expectStatus: EXPECT_STATUS,
      activity: activityRow
        ? {
            type: activityRow.activity_type,
            userId: activityRow.user_id,
          }
        : null,
      activityOk,
    }),
  );
}

main().catch((e) => {
  console.error("FAIL:", e?.message || e);
  process.exit(1);
});
