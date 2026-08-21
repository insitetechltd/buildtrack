#!/usr/bin/env node
/**
 * Prepare Activity feed for marketing landing screenshots.
 * - Soft-cancel noisy Maestro / sandbox titles on Project A
 * - Seed high-priority marketing-worthy construction titles
 *
 * Usage: node scripts/maestro/prepare-marketing-landing-tasks.cjs
 * Requires: EXPO_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env
 * Never prints secrets.
 */
const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const ROOT = path.resolve(__dirname, "../..");
const ACTOR_EMAIL = process.env.MAESTRO_UP_SEED_EMAIL || "john.managera@test.com";
const PROJECT_NAME =
  process.env.MAESTRO_UP_SEED_PROJECT || "Project A - Commercial Building";

const MARKETING_TITLES = [
  "L3 corridor — fire-stop penetrations incomplete",
  "HVAC make-good after duct clash — Grid D/5",
  "Handoff: EL complete, HVAC can start — L5 east",
  "Punch: door hardware missing — core toilets L3",
  "Seal ceiling joints — L2 south corridor",
  "EL first-fix incomplete — L4 riser cupboard",
  "Rework: ceiling grid off line — Grid B/8",
  "Waterproofing photo proof — plant-room threshold",
];

const NOISE_TITLE_RE =
  /(maestro|alice worker|bob worker|henry@|test task|wiring phase|up photo|ct photo|sandbox|dummy|lorem)/i;

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
    console.error("FAIL: missing Supabase env");
    process.exit(2);
  }
  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: user, error: userErr } = await supabase
    .from("users")
    .select("id, company_id, email")
    .eq("email", ACTOR_EMAIL)
    .maybeSingle();
  if (userErr || !user?.id) {
    console.error("FAIL: actor", ACTOR_EMAIL);
    process.exit(3);
  }

  let { data: project } = await supabase
    .from("projects")
    .select("id, name")
    .eq("name", PROJECT_NAME)
    .maybeSingle();
  if (!project?.id) {
    const { data: fuzzy } = await supabase
      .from("projects")
      .select("id, name")
      .ilike("name", "%Project A%")
      .limit(1)
      .maybeSingle();
    project = fuzzy;
  }
  if (!project?.id) {
    console.error("FAIL: project");
    process.exit(4);
  }

  const { data: existing, error: listErr } = await supabase
    .from("tasks")
    .select("id, title, current_status, priority")
    .eq("project_id", project.id)
    .limit(200);
  if (listErr) {
    console.error("FAIL: list tasks", listErr.message);
    process.exit(5);
  }

  const noise = (existing || []).filter(
    (t) =>
      t.title &&
      NOISE_TITLE_RE.test(t.title) &&
      t.current_status !== "cancelled" &&
      t.current_status !== "deleted",
  );
  let cancelled = 0;
  for (const t of noise) {
    const { error } = await supabase
      .from("tasks")
      .update({ current_status: "cancelled", updated_at: new Date().toISOString() })
      .eq("id", t.id);
    if (!error) cancelled += 1;
  }
  console.log(`CANCELLED_NOISE count=${cancelled}`);

  const due = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
  const existingTitles = new Set((existing || []).map((t) => t.title));
  let seeded = 0;
  for (const title of MARKETING_TITLES) {
    if (existingTitles.has(title)) {
      // Bump to high priority so it surfaces in Critical / Activity
      await supabase
        .from("tasks")
        .update({
          priority: "high",
          current_status: "new",
          due_date: due,
          updated_at: new Date().toISOString(),
        })
        .eq("project_id", project.id)
        .eq("title", title);
      continue;
    }
    const payload = {
      project_id: project.id,
      title,
      description:
        "Site evidence required before next trade starts. Photo update + review trail.",
      billing_status: "non_billable",
      priority: "high",
      category: "general",
      due_date: due,
      current_status: "new",
      completion_percentage: 0,
      assigned_to: [user.id],
      primary_assignee_id: user.id,
      delegated_user_ids: [],
      assigned_by: user.id,
      tags: ["critical_this_week", "site"],
      location_on_site: title.includes("Grid")
        ? title.split("—").pop()?.trim() || null
        : null,
      attachments: [],
      accepted: false,
    };
    let { error } = await supabase.from("tasks").insert(payload);
    if (error) {
      const slim = { ...payload };
      delete slim.primary_assignee_id;
      delete slim.delegated_user_ids;
      delete slim.tags;
      delete slim.location_on_site;
      ({ error } = await supabase.from("tasks").insert(slim));
    }
    if (!error) seeded += 1;
    else console.error("SEED_FAIL", title, error.message);
  }
  console.log(
    `SEED_OK project=${project.name} seeded=${seeded} titles=${MARKETING_TITLES.length}`,
  );
}

main().catch((e) => {
  console.error("FAIL", e.message || e);
  process.exit(1);
});
