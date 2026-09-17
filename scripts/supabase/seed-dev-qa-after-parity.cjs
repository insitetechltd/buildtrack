#!/usr/bin/env node
/**
 * Seed disposable DEV QA after PROD→DEV schema restore.
 *
 * Auth users are preserved across public schema nuke; public rows are not.
 * Creates company + Project A + public.users + user_project_assignments
 * for John (PM) + Alice (worker) on NEW dialect columns.
 *
 * Usage:
 *   node scripts/supabase/seed-dev-qa-after-parity.cjs
 */
const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const ROOT = path.resolve(__dirname, "../..");
const PROJECT_NAME =
  process.env.MAESTRO_DU_PROJECT_NAME || "Project A - Commercial Building";
const COMPANY_NAME = process.env.MAESTRO_QA_COMPANY_NAME || "Maestro QA Co";
const ACTORS = [
  {
    email: process.env.MAESTRO_DU_ASSIGNER_EMAIL || "john.managera@test.com",
    name: "John Manager A",
    system_permission: "admin",
    user_type: "company_user",
    project_role: "lead_project_manager",
    deployable_seat: "pm",
  },
  {
    email: process.env.MAESTRO_DU_ASSIGNEE_EMAIL || "alice.workera1@test.com",
    name: "Alice Worker A1",
    system_permission: "member",
    user_type: "company_user",
    project_role: "worker",
    deployable_seat: "worker",
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

function assertDevUrl(url) {
  // Daily DEV project ref (insite-dev). Never seed PROD by accident.
  if (!url.includes("zusulknbhaumougqckec")) {
    console.error("FAIL: refusing seed — EXPO_PUBLIC_SUPABASE_URL is not DEV ref");
    process.exit(9);
  }
}

async function main() {
  loadDotEnv();
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error("FAIL: EXPO_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY required");
    process.exit(2);
  }
  assertDevUrl(url);

  const sb = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const authByEmail = new Map();
  let page = 1;
  for (;;) {
    const { data, error } = await sb.auth.admin.listUsers({ page, perPage: 200 });
    if (error) {
      console.error("FAIL: listUsers", error.message);
      process.exit(3);
    }
    for (const u of data.users || []) {
      if (u.email) authByEmail.set(u.email.toLowerCase(), u);
    }
    if (!data.users || data.users.length < 200) break;
    page += 1;
    if (page > 20) break;
  }

  for (const actor of ACTORS) {
    if (!authByEmail.has(actor.email.toLowerCase())) {
      console.error(`FAIL: auth user missing for ${actor.email} — recreate in Auth first`);
      process.exit(4);
    }
  }

  // Company
  let companyId;
  {
    const { data: existing } = await sb
      .from("companies")
      .select("id, name")
      .eq("name", COMPANY_NAME)
      .maybeSingle();
    if (existing?.id) {
      companyId = existing.id;
      console.log("COMPANY_OK", companyId);
    } else {
      const creator = authByEmail.get(ACTORS[0].email.toLowerCase());
      const { data, error } = await sb
        .from("companies")
        .insert({
          name: COMPANY_NAME,
          type: "general_contractor",
          is_active: true,
          created_by: creator.id,
        })
        .select("id")
        .single();
      if (error) {
        console.error("FAIL: create company", error.message);
        process.exit(5);
      }
      companyId = data.id;
      console.log("COMPANY_CREATED", companyId);
    }
  }

  // public.users
  for (const actor of ACTORS) {
    const auth = authByEmail.get(actor.email.toLowerCase());
    const row = {
      id: auth.id,
      email: actor.email,
      name: actor.name,
      company_id: companyId,
      system_permission: actor.system_permission,
      user_type: actor.user_type,
      is_active: true,
      is_pending: false,
      must_set_password: false,
      deployable_seat: actor.deployable_seat,
    };
    const { error } = await sb.from("users").upsert(row, { onConflict: "id" });
    if (error) {
      console.error("FAIL: upsert user", actor.email, error.message);
      process.exit(6);
    }
    console.log("USER_OK", actor.email, auth.id);
  }

  // Project
  let projectId;
  {
    const { data: existing } = await sb
      .from("projects")
      .select("id, name")
      .eq("name", PROJECT_NAME)
      .maybeSingle();
    if (existing?.id) {
      projectId = existing.id;
      console.log("PROJECT_OK", projectId);
    } else {
      const creator = authByEmail.get(ACTORS[0].email.toLowerCase());
      const { data, error } = await sb
        .from("projects")
        .insert({
          name: PROJECT_NAME,
          status: "active",
          company_id: companyId,
          created_by: creator.id,
        })
        .select("id")
        .single();
      if (error) {
        console.error("FAIL: create project", error.message);
        process.exit(7);
      }
      projectId = data.id;
      console.log("PROJECT_CREATED", projectId);
    }
  }

  // Assignments (NEW dialect: project_role)
  for (const actor of ACTORS) {
    const auth = authByEmail.get(actor.email.toLowerCase());
    const { data: existing } = await sb
      .from("user_project_assignments")
      .select("id, is_active, project_role")
      .eq("project_id", projectId)
      .eq("user_id", auth.id)
      .maybeSingle();
    if (existing?.id) {
      const { error } = await sb
        .from("user_project_assignments")
        .update({
          is_active: true,
          project_role: actor.project_role,
          assigned_by: authByEmail.get(ACTORS[0].email.toLowerCase()).id,
        })
        .eq("id", existing.id);
      if (error) {
        console.error("FAIL: update upa", actor.email, error.message);
        process.exit(8);
      }
      console.log("UPA_UPDATED", actor.email, actor.project_role);
    } else {
      const { error } = await sb.from("user_project_assignments").insert({
        user_id: auth.id,
        project_id: projectId,
        project_role: actor.project_role,
        assigned_by: authByEmail.get(ACTORS[0].email.toLowerCase()).id,
        is_active: true,
      });
      if (error) {
        console.error("FAIL: insert upa", actor.email, error.message);
        process.exit(8);
      }
      console.log("UPA_CREATED", actor.email, actor.project_role);
    }
  }

  console.log(
    JSON.stringify({
      ok: true,
      plane: "dev",
      companyId,
      projectId,
      projectName: PROJECT_NAME,
      actors: ACTORS.map((a) => a.email),
    }),
  );
}

main().catch((err) => {
  console.error("FAIL:", err?.message || err);
  process.exit(1);
});
