#!/usr/bin/env node
/**
 * Stage E Report DB readback — same-ID status + activity proof.
 *
 * Env:
 *   REPORT_TASK_ID (required)
 *   EXPECT_STATUS = reported | resolved
 *   EXPECT_ACTIVITY = issue_reported | issue_resolved (optional)
 *   EXPECT_ACTOR_EMAIL = carol.admina@test.com (optional; for issue_resolved)
 *   EXPECT_ACTIVITY_REASON = Resolved with reply (optional; issue_resolved data.reason)
 *   EXPECT_ASSIGNER_COMMENT_TEXT (optional; exact assigner_comment.description)
 *   EXPECT_ASSIGNER_COMMENT_COUNT = 1 (used when TEXT is set)
 *   EXPECT_ASSIGNER_COMMENT_ACTOR_EMAIL (optional; defaults to EXPECT_ACTOR_EMAIL)
 *   WRITE_ASSIGNMENT_SNAPSHOT=1 — persist assigned_by / assignees for a later compare
 *   EXPECT_ASSIGNMENT_UNCHANGED=1 — compare against that snapshot
 *   ASSIGNMENT_SNAPSHOT_PATH (optional)
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
const EXPECT_ACTIVITY_REASON = process.env.EXPECT_ACTIVITY_REASON || "";
const EXPECT_ASSIGNER_COMMENT_TEXT = process.env.EXPECT_ASSIGNER_COMMENT_TEXT || "";
const EXPECT_ASSIGNER_COMMENT_COUNT = process.env.EXPECT_ASSIGNER_COMMENT_COUNT
  ? Number(process.env.EXPECT_ASSIGNER_COMMENT_COUNT)
  : 1;
const EXPECT_ASSIGNER_COMMENT_ACTOR =
  process.env.EXPECT_ASSIGNER_COMMENT_ACTOR_EMAIL || EXPECT_ACTOR;
const WRITE_ASSIGNMENT_SNAPSHOT = process.env.WRITE_ASSIGNMENT_SNAPSHOT === "1";
const EXPECT_ASSIGNMENT_UNCHANGED =
  process.env.EXPECT_ASSIGNMENT_UNCHANGED === "1";
const ASSIGNMENT_SNAPSHOT_PATH =
  process.env.ASSIGNMENT_SNAPSHOT_PATH ||
  path.join(ROOT, ".cache", `maestro-report-assignment-${TASK_ID || "unknown"}.json`);

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

function parseJson(value) {
  if (!value) return {};
  if (typeof value === "object") return value;
  try {
    return JSON.parse(String(value));
  } catch {
    return {};
  }
}

function assignmentSnapshot(task) {
  return {
    assigned_by: task.assigned_by ?? null,
    assigned_to: Array.isArray(task.assigned_to)
      ? [...task.assigned_to].map(String).sort()
      : task.assigned_to ?? null,
    primary_assignee_id: task.primary_assignee_id ?? null,
    delegated_user_ids: Array.isArray(task.delegated_user_ids)
      ? [...task.delegated_user_ids].map(String).sort()
      : task.delegated_user_ids ?? null,
  };
}

async function loadActorId(sb, email) {
  if (!email) return null;
  const { data: actor } = await sb
    .from("users")
    .select("id, email")
    .eq("email", email)
    .maybeSingle();
  return actor?.id ? String(actor.id) : null;
}

async function selectTask(sb) {
  const wide =
    "id, title, status, assigned_by, assigned_to, primary_assignee_id, delegated_user_ids";
  const narrow = "id, title, status, assigned_by, assigned_to";
  let result = await sb.from("tasks").select(wide).eq("id", TASK_ID).maybeSingle();
  if (result.error) {
    result = await sb.from("tasks").select(narrow).eq("id", TASK_ID).maybeSingle();
  }
  return result;
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

  const { data: task, error } = await selectTask(sb);
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

  if (WRITE_ASSIGNMENT_SNAPSHOT) {
    fs.mkdirSync(path.dirname(ASSIGNMENT_SNAPSHOT_PATH), { recursive: true });
    fs.writeFileSync(
      ASSIGNMENT_SNAPSHOT_PATH,
      JSON.stringify(assignmentSnapshot(task), null, 2) + "\n",
    );
  }

  if (EXPECT_ASSIGNMENT_UNCHANGED) {
    if (!fs.existsSync(ASSIGNMENT_SNAPSHOT_PATH)) {
      console.error("FAIL: assignment snapshot missing", ASSIGNMENT_SNAPSHOT_PATH);
      process.exit(1);
    }
    const before = JSON.parse(fs.readFileSync(ASSIGNMENT_SNAPSHOT_PATH, "utf8"));
    const after = assignmentSnapshot(task);
    if (JSON.stringify(before) !== JSON.stringify(after)) {
      console.error("FAIL: assignees/assigned_by changed", { before, after });
      process.exit(1);
    }
  }

  let activityOk = true;
  let activityRow = null;
  if (EXPECT_ACTIVITY) {
    const { data: acts, error: aErr } = await sb
      .from("task_activities")
      .select("id, activity_type, user_id, description, data, created_at")
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
      const actorId = await loadActorId(sb, EXPECT_ACTOR);
      if (!actorId || String(activityRow.user_id) !== actorId) {
        console.error(
          `FAIL: activity actor want=${EXPECT_ACTOR} got_user=${activityRow.user_id}`,
        );
        process.exit(1);
      }
    }
    if (EXPECT_ACTIVITY_REASON) {
      const payload = parseJson(activityRow.data);
      const reason = payload.reason || payload.note || "";
      const haystack = `${reason} ${activityRow.description || ""}`;
      if (!haystack.includes(EXPECT_ACTIVITY_REASON)) {
        console.error(
          `FAIL: activity reason want=${EXPECT_ACTIVITY_REASON} data=${JSON.stringify(payload)} description=${activityRow.description || ""}`,
        );
        process.exit(1);
      }
    }
  }

  let assignerComment = null;
  if (EXPECT_ASSIGNER_COMMENT_TEXT) {
    const actorId = await loadActorId(sb, EXPECT_ASSIGNER_COMMENT_ACTOR);
    if (EXPECT_ASSIGNER_COMMENT_ACTOR && !actorId) {
      console.error(
        `FAIL: assigner comment actor missing ${EXPECT_ASSIGNER_COMMENT_ACTOR}`,
      );
      process.exit(1);
    }
    let query = sb
      .from("task_activities")
      .select("id, activity_type, user_id, description, created_at")
      .eq("task_id", TASK_ID)
      .eq("activity_type", "assigner_comment")
      .eq("description", EXPECT_ASSIGNER_COMMENT_TEXT);
    if (actorId) {
      query = query.eq("user_id", actorId);
    }
    const { data: comments, error: cErr } = await query;
    if (cErr) {
      console.error("FAIL: assigner_comment query", cErr.message);
      process.exit(1);
    }
    const rows = comments || [];
    if (rows.length !== EXPECT_ASSIGNER_COMMENT_COUNT) {
      console.error(
        `FAIL: assigner_comment count want=${EXPECT_ASSIGNER_COMMENT_COUNT} got=${rows.length} text=${EXPECT_ASSIGNER_COMMENT_TEXT}`,
      );
      process.exit(1);
    }
    assignerComment = {
      count: rows.length,
      description: EXPECT_ASSIGNER_COMMENT_TEXT,
      userId: rows[0]?.user_id || null,
    };
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
            reason: parseJson(activityRow.data).reason || null,
          }
        : null,
      assignerComment,
      assignment: assignmentSnapshot(task),
      activityOk,
    }),
  );
}

main().catch((e) => {
  console.error("FAIL:", e?.message || e);
  process.exit(1);
});
