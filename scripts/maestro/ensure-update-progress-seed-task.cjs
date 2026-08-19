#!/usr/bin/env node
/**
 * Seed a live Supabase task for Update Progress Maestro (U01–U12).
 * Avoids ~60–90s Create Task UI simulation per case.
 *
 * Usage:
 *   node scripts/maestro/ensure-update-progress-seed-task.mjs
 *   node scripts/maestro/ensure-update-progress-seed-task.mjs --title "Maestro UP Photo 123"
 *
 * Writes:
 *   .cache/maestro-up-seed.env   (UP_SEED_TITLE, UP_SEED_TASK_ID)
 *   .cache/maestro-up-seed.json
 *
 * Auth: SUPABASE_SERVICE_ROLE_KEY (local .env). Never prints secret values.
 */
const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const ROOT = path.resolve(__dirname, "../..");
const CACHE = path.join(ROOT, ".cache");
const ENV_OUT = path.join(CACHE, "maestro-up-seed.env");
const JSON_OUT = path.join(CACHE, "maestro-up-seed.json");

const ACTOR_EMAIL = process.env.MAESTRO_UP_SEED_EMAIL || "john.managera@test.com";
const ASSIGNED_BY_EMAIL =
  process.env.MAESTRO_UP_SEED_ASSIGNED_BY_EMAIL || ACTOR_EMAIL;
const PROJECT_NAME =
  process.env.MAESTRO_UP_SEED_PROJECT || "Project A - Commercial Building";
const SEED_STATUS = (process.env.MAESTRO_UP_SEED_STATUS || "new").toLowerCase();
const SEED_IS_APPROVED =
  SEED_STATUS === "approved" ||
  SEED_STATUS === "completed" ||
  SEED_STATUS === "done";
const SEED_IS_IN_PROGRESS = SEED_STATUS === "in_progress";
const SEED_CURRENT_STATUS = SEED_IS_APPROVED
  ? "approved"
  : SEED_IS_IN_PROGRESS
    ? "in_progress"
    : "new";

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
  return `Maestro UP Photo ${Date.now()}`;
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

  const title = argTitle();
  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: user, error: userErr } = await supabase
    .from("users")
    .select("id, company_id, name, email")
    .eq("email", ACTOR_EMAIL)
    .maybeSingle();
  if (userErr || !user?.id) {
    console.error("FAIL: lookup actor", ACTOR_EMAIL, userErr?.message || "not found");
    process.exit(3);
  }

  let creator = user;
  if (ASSIGNED_BY_EMAIL !== ACTOR_EMAIL) {
    const { data: creatorHit, error: creatorErr } = await supabase
      .from("users")
      .select("id, company_id, name, email")
      .eq("email", ASSIGNED_BY_EMAIL)
      .maybeSingle();
    if (creatorErr || !creatorHit?.id) {
      console.error(
        "FAIL: lookup assigned_by",
        ASSIGNED_BY_EMAIL,
        creatorErr?.message || "not found",
      );
      process.exit(3);
    }
    creator = creatorHit;
  }

  const { data: projectHit, error: projectErr } = await supabase
    .from("projects")
    .select("id, name, company_id")
    .eq("name", PROJECT_NAME)
    .maybeSingle();
  let project = projectHit;
  if (!project?.id) {
    const { data: fuzzy } = await supabase
      .from("projects")
      .select("id, name, company_id")
      .ilike("name", "%Project A%")
      .limit(1)
      .maybeSingle();
    project = fuzzy;
  }
  if (projectErr || !project?.id) {
    console.error(
      "FAIL: lookup project",
      PROJECT_NAME,
      projectErr?.message || "not found",
    );
    process.exit(4);
  }

  const due = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const payload = {
    project_id: project.id,
    title,
    description: "Seed task for update-progress-photo suite (API).",
    task_reference: null,
    billing_status: "non_billable",
    priority: "medium",
    category: "general",
    due_date: due,
    current_status: SEED_CURRENT_STATUS,
    completion_percentage: SEED_IS_APPROVED ? 100 : 0,
    assigned_to: [user.id],
    primary_assignee_id: user.id,
    delegated_user_ids: [],
    assigned_by: creator.id,
    tags: [],
    location_on_site: null,
    attachments: [],
    accepted: SEED_IS_APPROVED,
    accepted_by: SEED_IS_APPROVED ? user.id : null,
    accepted_at: SEED_IS_APPROVED ? new Date().toISOString() : null,
  };

  let { data: task, error: insertErr } = await supabase
    .from("tasks")
    .insert(payload)
    .select("id, title")
    .single();

  if (insertErr) {
    // Compatibility retry without redesign columns if tenant lag
    const slim = { ...payload };
    for (const k of [
      "primary_assignee_id",
      "delegated_user_ids",
      "container_id",
      "sub_container_id",
      "tags",
      "location_on_site",
    ]) {
      delete slim[k];
    }
    ({ data: task, error: insertErr } = await supabase
      .from("tasks")
      .insert(slim)
      .select("id, title")
      .single());
  }

  if (insertErr || !task?.id) {
    console.error("FAIL: insert task", insertErr?.message || insertErr);
    process.exit(5);
  }

  fs.mkdirSync(CACHE, { recursive: true });
  const envBody = `UP_SEED_TITLE=${JSON.stringify(task.title)}\nUP_SEED_TASK_ID=${task.id}\n`;
  fs.writeFileSync(ENV_OUT, envBody);
  fs.writeFileSync(
    JSON_OUT,
    JSON.stringify(
      {
        title: task.title,
        taskId: task.id,
        projectId: project.id,
        actorEmail: ACTOR_EMAIL,
        assignedByEmail: ASSIGNED_BY_EMAIL,
        seededAt: new Date().toISOString(),
      },
      null,
      2,
    ),
  );

  // Machine-readable single line for runners (no secrets)
  console.log(
    `SEED_OK title=${task.title} taskId=${task.id} actor=${ACTOR_EMAIL} assignedBy=${ASSIGNED_BY_EMAIL} status=${SEED_CURRENT_STATUS}`,
  );
  console.log(`WROTE ${ENV_OUT}`);
}

main().catch((err) => {
  console.error("FAIL:", err?.message || err);
  process.exit(1);
});
