#!/usr/bin/env node
/**
 * Stage D O2 DB readback — project by name + Alice active UPA.
 * Env: STAGE_D_O2_NAME, EXPO_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */
const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const ROOT = path.resolve(__dirname, "../..");
const NAME = process.env.STAGE_D_O2_NAME;
const ALICE = process.env.MAESTRO_DU_ASSIGNEE_EMAIL || "alice.workera1@test.com";

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
  if (!NAME) {
    console.error("FAIL: STAGE_D_O2_NAME required");
    process.exit(2);
  }
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("FAIL: missing supabase env");
    process.exit(2);
  }
  if (!url.includes("zusulknbhaumougqckec")) {
    console.error("FAIL: not DEV");
    process.exit(9);
  }
  const sb = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: proj, error } = await sb
    .from("projects")
    .select("id, company_id, name")
    .eq("name", NAME)
    .maybeSingle();
  if (error || !proj?.id) {
    console.error("FAIL: project missing", error?.message || NAME);
    process.exit(1);
  }
  const { data: alice } = await sb
    .from("users")
    .select("id")
    .eq("email", ALICE)
    .maybeSingle();
  if (!alice?.id) {
    console.error("FAIL: alice missing");
    process.exit(1);
  }
  const { data: upa } = await sb
    .from("user_project_assignments")
    .select("id, is_active, project_role")
    .eq("project_id", proj.id)
    .eq("user_id", alice.id)
    .maybeSingle();
  if (!upa?.id || upa.is_active !== true) {
    console.error("FAIL: alice UPA missing/inactive", upa);
    process.exit(1);
  }
  console.log(
    JSON.stringify({
      ok: true,
      projectId: proj.id,
      companyId: proj.company_id,
      aliceUpa: upa,
      name: NAME,
    }),
  );
}

main().catch((e) => {
  console.error("FAIL:", e?.message || e);
  process.exit(1);
});
