#!/usr/bin/env node
/**
 * DEV schema + service-role path smoke for owner-tenant-write prerequisites.
 * Full JWT create/deactivate requires SMOKE_OWNER_EMAIL + SMOKE_OWNER_PASSWORD.
 * node scripts/supabase/smoke-owner-tenant-write-dev.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function loadEnv(file) {
  const out = {};
  const full = path.join(ROOT, file);
  if (!fs.existsSync(full)) return out;
  for (const line of fs.readFileSync(full, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#") || !t.includes("=")) continue;
    const i = t.indexOf("=");
    out[t.slice(0, i).trim()] = t.slice(i + 1).trim().replace(/^["']|["']$/g, "");
  }
  return out;
}

const env = { ...loadEnv(".env"), ...loadEnv("apps/owner/.env") };
const url = env.EXPO_PUBLIC_SUPABASE_URL;
const anon = env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
let failed = 0;

function fail(label, detail) {
  failed += 1;
  console.error(`FAIL ${label}: ${detail}`);
}
function pass(label) {
  console.log(`PASS ${label}`);
}

async function rest(query) {
  const res = await fetch(`${url}/rest/v1/${query}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

async function main() {
  if (!url || !key || !anon) {
    console.error("Missing URL / keys");
    process.exit(1);
  }
  console.log("=== owner-tenant-write DEV smoke ===");

  const audit = await rest("owner_audit_log?select=id&limit=1");
  if (audit.status >= 400) fail("owner_audit_log", JSON.stringify(audit.body).slice(0, 160));
  else pass("owner_audit_log readable");

  const roleUsers = await rest(
    "users?select=id,role,is_active,deployable_seat,company_id&limit=1",
  );
  if (roleUsers.status >= 400) {
    fail("users.role path", JSON.stringify(roleUsers.body).slice(0, 160));
  } else {
    pass("users.role path");
  }

  const email = env.SMOKE_OWNER_EMAIL;
  const password = env.SMOKE_OWNER_PASSWORD;
  if (!email || !password) {
    console.log("SKIP edge JWT write smoke (set SMOKE_OWNER_EMAIL + SMOKE_OWNER_PASSWORD)");
    console.log(`=== done: ${failed} failure(s) ===`);
    process.exit(failed > 0 ? 1 : 0);
    return;
  }

  const client = createClient(url, anon, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.session?.access_token) {
    fail("edge.auth", error?.message ?? "no session");
    process.exit(1);
  }
  const token = data.session.access_token;

  const companies = await fetch(`${url}/functions/v1/owner-tenant-read`, {
    method: "POST",
    headers: {
      apikey: anon,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ action: "listCompanies", limit: 5 }),
  }).then((r) => r.json());

  const company = (companies.companies || []).find((c) => c.projectCount >= 0);
  if (!company?.id) {
    fail("listCompanies", "no company");
    process.exit(1);
  }
  pass(`company ${company.name}`);

  const stamp = Date.now();
  const testEmail = `hq.smoke.${stamp}@example.com`;
  const createRes = await fetch(`${url}/functions/v1/owner-tenant-write`, {
    method: "POST",
    headers: {
      apikey: anon,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      action: "createUser",
      companyId: company.id,
      email: testEmail,
      name: `HQ Smoke ${stamp}`,
      seatClass: "worker",
    }),
  });
  const createBody = await createRes.json().catch(() => ({}));
  if (!createRes.ok || !createBody.user?.id) {
    fail("createUser", `${createRes.status} ${JSON.stringify(createBody).slice(0, 200)}`);
  } else {
    pass(`createUser ${createBody.user.id}`);
    const userId = createBody.user.id;

    const switchRes = await fetch(`${url}/functions/v1/owner-tenant-write`, {
      method: "POST",
      headers: {
        apikey: anon,
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "deactivateUser",
        companyId: company.id,
        userId,
        newCompanyId: "00000000-0000-4000-8000-000000000000",
      }),
    });
    if (switchRes.status !== 400) {
      fail("company_switch_forbidden", `expected 400 got ${switchRes.status}`);
    } else {
      pass("company_switch_forbidden");
    }

    const deactRes = await fetch(`${url}/functions/v1/owner-tenant-write`, {
      method: "POST",
      headers: {
        apikey: anon,
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "deactivateUser",
        companyId: company.id,
        userId,
      }),
    });
    const deactBody = await deactRes.json().catch(() => ({}));
    if (!deactRes.ok || deactBody.user?.isActive !== false) {
      fail("deactivateUser", `${deactRes.status} ${JSON.stringify(deactBody).slice(0, 200)}`);
    } else {
      pass("deactivateUser");
    }

    const auditRows = await rest(
      `owner_audit_log?target_user_id=eq.${userId}&select=action&order=occurred_at.desc`,
    );
    const actions = Array.isArray(auditRows.body)
      ? auditRows.body.map((r) => r.action)
      : [];
    if (!actions.includes("createUser") || !actions.includes("deactivateUser")) {
      fail("audit rows", JSON.stringify(actions));
    } else {
      pass("audit create+deactivate");
    }
  }

  // Non-owner 403
  const mbillEmail = env.SMOKE_NON_OWNER_EMAIL;
  const mbillPass = env.SMOKE_NON_OWNER_PASSWORD;
  if (mbillEmail && mbillPass) {
    const other = createClient(url, anon, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const signed = await other.auth.signInWithPassword({
      email: mbillEmail,
      password: mbillPass,
    });
    if (signed.data.session?.access_token) {
      const forbidden = await fetch(`${url}/functions/v1/owner-tenant-write`, {
        method: "POST",
        headers: {
          apikey: anon,
          Authorization: `Bearer ${signed.data.session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "createUser", companyId: company.id }),
      });
      if (forbidden.status !== 403) fail("non-owner", `expected 403 got ${forbidden.status}`);
      else pass("non-owner 403");
    }
  }

  console.log(`=== done: ${failed} failure(s) ===`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
