#!/usr/bin/env node
/**
 * Seed disposable DEV QA after PROD→DEV schema restore (Stage D SoT).
 *
 * Auth users may be created if missing. Always resets known Maestro passwords
 * to password123 (p-matrix mint_qa_jwt otherwise leaves them mangled).
 *
 * Actors:
 *   Carol  — Company Admin (org Maestro O1–O3 / S2–S3)
 *   Dave   — spare admin (keeps admin_count≥2 so O4 / demotions cannot orphan Carol)
 *   John   — field PM (member + deployable_seat=pm) for dual-user / RC
 *   Alice  — field worker
 *   Invitee — disposable S3 invite→password subject (must_set_password reset each seed)
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
const MAESTRO_PASSWORD = process.env.MAESTRO_QA_PASSWORD || "password123";

/** F6 DEV isolation subject preference (documented for p-matrix; not John). */
const F6_DEV_SUBJECT_HINT =
  process.env.MAESTRO_F6_DEV_EMAIL || "alice.workera1@test.com";

const ACTORS = [
  {
    key: "carol",
    email: process.env.MAESTRO_ORG_CA_EMAIL || "carol.admina@test.com",
    name: "Carol Admin A",
    system_permission: "admin",
    user_type: "company_user",
    project_role: "lead_project_manager",
    deployable_seat: "worker",
    assignToProject: true,
    createIfMissing: true,
  },
  {
    key: "dave",
    email: process.env.MAESTRO_ORG_SPARE_CA_EMAIL || "dave.adminb@test.com",
    name: "Dave Admin B",
    system_permission: "admin",
    user_type: "company_user",
    project_role: null,
    deployable_seat: "worker",
    assignToProject: false,
    createIfMissing: true,
  },
  {
    key: "john",
    email: process.env.MAESTRO_DU_ASSIGNER_EMAIL || "john.managera@test.com",
    name: "John Manager A",
    // Field PM — isAdmin false (MAINTABS / dual-user assumption).
    system_permission: "member",
    user_type: "company_user",
    project_role: "lead_project_manager",
    deployable_seat: "pm",
    assignToProject: true,
    createIfMissing: true,
  },
  {
    key: "alice",
    email: process.env.MAESTRO_DU_ASSIGNEE_EMAIL || "alice.workera1@test.com",
    name: "Alice Worker A1",
    system_permission: "member",
    user_type: "company_user",
    project_role: "worker",
    deployable_seat: "worker",
    assignToProject: true,
    createIfMissing: true,
  },
  {
    key: "invitee",
    email:
      process.env.MAESTRO_ORG_INVITEE_EMAIL || "erin.invitee@test.com",
    name: "Erin Invitee",
    system_permission: "member",
    user_type: "company_user",
    project_role: null,
    deployable_seat: "worker",
    assignToProject: false,
    createIfMissing: true,
    // Cleared each seed so S3 can re-drive invite → set-password cleanly.
    must_set_password: false,
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
  if (!url.includes("zusulknbhaumougqckec")) {
    console.error("FAIL: refusing seed — EXPO_PUBLIC_SUPABASE_URL is not DEV ref");
    process.exit(9);
  }
}

async function ensureAuthUser(sb, authByEmail, actor) {
  const emailKey = actor.email.toLowerCase();
  let auth = authByEmail.get(emailKey);
  if (auth) {
    const { error } = await sb.auth.admin.updateUserById(auth.id, {
      password: MAESTRO_PASSWORD,
      email_confirm: true,
    });
    if (error) {
      console.error("FAIL: reset password", actor.email, error.message);
      process.exit(10);
    }
    console.log("AUTH_PASSWORD_RESET", actor.email);
    return auth;
  }
  if (!actor.createIfMissing) {
    console.error(`FAIL: auth user missing for ${actor.email}`);
    process.exit(4);
  }
  const { data, error } = await sb.auth.admin.createUser({
    email: actor.email,
    password: MAESTRO_PASSWORD,
    email_confirm: true,
    user_metadata: { name: actor.name },
  });
  if (error || !data?.user) {
    console.error("FAIL: createUser", actor.email, error?.message || "no user");
    process.exit(4);
  }
  auth = data.user;
  authByEmail.set(emailKey, auth);
  console.log("AUTH_CREATED", actor.email, auth.id);
  return auth;
}

async function main() {
  loadDotEnv();
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error(
      "FAIL: EXPO_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY required",
    );
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

  // 1) Ensure auth + reset passwords for all actors (Carol/Dave before John demote).
  for (const actor of ACTORS) {
    await ensureAuthUser(sb, authByEmail, actor);
  }

  // 2) Company — prefer Carol as creator when new.
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

  // 3) public.users — admins first (Carol, Dave), then field actors.
  const ordered = [
    ...ACTORS.filter((a) => a.system_permission === "admin"),
    ...ACTORS.filter((a) => a.system_permission !== "admin"),
  ];
  for (const actor of ordered) {
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
      must_set_password: actor.must_set_password === true,
      deployable_seat: actor.deployable_seat,
    };
    const { error } = await sb.from("users").upsert(row, { onConflict: "id" });
    if (error) {
      console.error("FAIL: upsert user", actor.email, error.message);
      process.exit(6);
    }
    console.log(
      "USER_OK",
      actor.email,
      actor.system_permission,
      actor.deployable_seat,
    );
  }

  // 4) Refuse orphan company (no admin).
  {
    const { data: admins, error } = await sb
      .from("users")
      .select("id, email")
      .eq("company_id", companyId)
      .eq("system_permission", "admin")
      .eq("is_active", true);
    if (error) {
      console.error("FAIL: admin_count check", error.message);
      process.exit(11);
    }
    const adminCount = (admins || []).length;
    if (adminCount < 1) {
      console.error("FAIL: admin_count < 1 after seed — refusing to leave orphan company");
      process.exit(11);
    }
    console.log("ADMIN_COUNT_OK", adminCount, (admins || []).map((a) => a.email));
  }

  // 5) Project A
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
      const creator = authByEmail.get(
        (process.env.MAESTRO_DU_ASSIGNER_EMAIL || "john.managera@test.com").toLowerCase(),
      );
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

  // 6) UPAs for actors with assignToProject
  const assignerId = authByEmail.get(
    (process.env.MAESTRO_DU_ASSIGNER_EMAIL || "john.managera@test.com").toLowerCase(),
  ).id;
  for (const actor of ACTORS.filter((a) => a.assignToProject && a.project_role)) {
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
          assigned_by: assignerId,
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
        assigned_by: assignerId,
        is_active: true,
      });
      if (error) {
        console.error("FAIL: insert upa", actor.email, error.message);
        process.exit(8);
      }
      console.log("UPA_CREATED", actor.email, actor.project_role);
    }
  }

  // Carol landing contract: company + Project A UPA (reachable shell without empty-company trap).
  const carolEmail = (
    process.env.MAESTRO_ORG_CA_EMAIL || "carol.admina@test.com"
  ).toLowerCase();
  const carolAuth = authByEmail.get(carolEmail);
  const { data: carolUpa } = await sb
    .from("user_project_assignments")
    .select("id")
    .eq("project_id", projectId)
    .eq("user_id", carolAuth.id)
    .eq("is_active", true)
    .maybeSingle();
  if (!carolUpa?.id) {
    console.error("FAIL: Carol landing contract — missing active UPA on Project A");
    process.exit(12);
  }

  console.log(
    JSON.stringify({
      ok: true,
      plane: "dev",
      companyId,
      projectId,
      projectName: PROJECT_NAME,
      passwordReset: MAESTRO_PASSWORD === "password123" ? "password123" : "custom",
      f6DevSubjectHint: F6_DEV_SUBJECT_HINT,
      actors: ACTORS.map((a) => ({
        key: a.key,
        email: a.email,
        system_permission: a.system_permission,
        deployable_seat: a.deployable_seat,
        assignToProject: Boolean(a.assignToProject),
      })),
      carolLanding: "company+projectA",
    }),
  );
}

main().catch((err) => {
  console.error("FAIL:", err?.message || err);
  process.exit(1);
});
