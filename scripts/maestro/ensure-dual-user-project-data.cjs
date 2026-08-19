#!/usr/bin/env node
/**
 * Verify/repair dual-user Maestro project membership.
 *
 * Ensures John + Alice are active members of the shared Project A sandbox used
 * by the dual-user RC gate. Idempotent: creates missing assignments only.
 *
 * Usage:
 *   node scripts/maestro/ensure-dual-user-project-data.cjs
 */
const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const ROOT = path.resolve(__dirname, "../..");
const PROJECT_NAME =
  process.env.MAESTRO_DU_PROJECT_NAME || "Project A - Commercial Building";
const USERS = [
  {
    email: process.env.MAESTRO_DU_ASSIGNER_EMAIL || "john.managera@test.com",
    category: "lead_project_manager",
  },
  {
    email: process.env.MAESTRO_DU_ASSIGNEE_EMAIL || "alice.workera1@test.com",
    category: "worker",
  },
];

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

async function main() {
  loadDotEnv();
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

  const { data: project, error: projectErr } = await supabase
    .from("projects")
    .select("id, name")
    .eq("name", PROJECT_NAME)
    .maybeSingle();
  if (projectErr || !project?.id) {
    console.error(
      "FAIL: lookup project",
      PROJECT_NAME,
      projectErr?.message || "not found",
    );
    process.exit(3);
  }

  const emails = USERS.map((user) => user.email);
  const { data: users, error: usersErr } = await supabase
    .from("users")
    .select("id, email")
    .in("email", emails);
  if (usersErr || !users || users.length !== USERS.length) {
    console.error("FAIL: lookup users", usersErr?.message || "missing dual-user rows");
    process.exit(4);
  }

  const userByEmail = new Map(users.map((user) => [user.email, user]));
  const userIds = users.map((user) => user.id);
  const { data: existingRows, error: existingErr } = await supabase
    .from("user_project_assignments")
    .select("id, user_id, category, is_active")
    .eq("project_id", project.id)
    .in("user_id", userIds);
  if (existingErr) {
    console.error("FAIL: lookup existing assignments", existingErr.message);
    process.exit(5);
  }

  const existingByUserId = new Map(
    (existingRows || []).map((row) => [String(row.user_id), row]),
  );
  const inserts = [];
  for (const wanted of USERS) {
    const user = userByEmail.get(wanted.email);
    const existing = existingByUserId.get(String(user.id));
    if (existing?.is_active) continue;
    inserts.push({
      user_id: user.id,
      project_id: project.id,
      category: wanted.category,
      assigned_by: userByEmail.get(USERS[0].email).id,
      is_active: true,
    });
  }

  if (inserts.length > 0) {
    const { error: insertErr } = await supabase
      .from("user_project_assignments")
      .insert(inserts);
    if (insertErr) {
      console.error("FAIL: insert missing assignments", insertErr.message);
      process.exit(6);
    }
  }

  console.log(
    `ENSURE_DU_PROJECT_OK project=${project.name} inserted=${inserts.length} users=${emails.join(",")}`,
  );
}

main().catch((err) => {
  console.error("FAIL:", err?.message || err);
  process.exit(1);
});
