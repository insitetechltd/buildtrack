#!/usr/bin/env node
/**
 * DEV smoke for owner-ops-read (read-only). Schema + optional JWT actions.
 * Mutation canary: audit log count must not rise after read actions.
 * JWT: SMOKE_OWNER_EMAIL + SMOKE_OWNER_PASSWORD (or magiclink via service role).
 * node scripts/supabase/smoke-owner-ops-read-dev.mjs
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

async function invoke(token, body) {
  const res = await fetch(`${url}/functions/v1/owner-ops-read`, {
    method: "POST",
    headers: {
      apikey: anon,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, body: json };
}

async function auditCount() {
  const res = await fetch(
    `${url}/rest/v1/owner_audit_log?select=id`,
    {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        Prefer: "count=exact",
        Range: "0-0",
      },
    },
  );
  const cr = res.headers.get("content-range");
  const m = cr && /\/(\d+)$/.exec(cr);
  return m ? Number(m[1]) : -1;
}

async function main() {
  if (!url || !key || !anon) {
    console.error("Missing URL / keys");
    process.exit(1);
  }
  console.log("=== owner-ops-read DEV smoke ===");

  const audit = await rest("owner_audit_log?select=id&limit=1");
  if (audit.status >= 400) fail("owner_audit_log", JSON.stringify(audit.body).slice(0, 160));
  else pass("owner_audit_log readable");

  const owners = await rest("platform_owners?select=user_id");
  if (owners.status >= 400) fail("platform_owners", JSON.stringify(owners.body).slice(0, 160));
  else pass("platform_owners");

  let token = null;
  const email = env.SMOKE_OWNER_EMAIL || "tristan@insitetech.co";
  const password = env.SMOKE_OWNER_PASSWORD;
  const admin = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  if (password) {
    const client = createClient(url, anon, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error || !data.session?.access_token) {
      fail("edge.auth", error?.message ?? "no session");
    } else {
      token = data.session.access_token;
      pass("owner JWT (password)");
    }
  } else {
    // Service-role magiclink mint (DEV smoke only — no password required)
    const { data, error } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email,
    });
    const hashed = data?.properties?.hashed_token;
    if (error || !hashed) {
      fail("edge.auth_magiclink", error?.message ?? "no hashed_token");
    } else {
      const userClient = createClient(url, anon, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const verified = await userClient.auth.verifyOtp({
        token_hash: hashed,
        type: "magiclink",
      });
      if (verified.error || !verified.data.session?.access_token) {
        fail("edge.auth_verify", verified.error?.message ?? "no session");
      } else {
        token = verified.data.session.access_token;
        pass("owner JWT (magiclink)");
      }
    }
  }

  if (token) {
    const before = await auditCount();

    const mon = await invoke(token, { action: "monitoringSnapshot" });
    if (mon.status !== 200 || !mon.body.providers) {
      fail("monitoringSnapshot", `${mon.status} ${JSON.stringify(mon.body).slice(0, 120)}`);
    } else {
      const secrets = mon.body.secretsPresent || {};
      const leaked = Object.values(secrets).some((v) => typeof v === "string");
      if (leaked) fail("secretsPresent", "must be booleans only");
      else pass("monitoringSnapshot");
      if (!mon.body.supabaseBackup?.detail?.includes("Management")) {
        fail("backup_placeholder", "expected Management API placeholder");
      } else pass("backup honest placeholder");
    }

    const econ = await invoke(token, { action: "economicsStripe" });
    if (econ.status !== 200 || !econ.body.reconcile) {
      fail("economicsStripe", `${econ.status} ${JSON.stringify(econ.body).slice(0, 120)}`);
    } else if (!econ.body.stripeConfigured && econ.body.detail && !/Not configured/i.test(econ.body.detail)) {
      fail("economicsStripe empty", "unconfigured must say Not configured");
    } else {
      pass(
        econ.body.stripeConfigured
          ? `economicsStripe mrr=${econ.body.mrrCents}`
          : "economicsStripe Not configured",
      );
    }

    const logs = await invoke(token, { action: "listAuditLogs", limit: 10 });
    if (logs.status !== 200 || !Array.isArray(logs.body.entries)) {
      fail("listAuditLogs", `${logs.status}`);
    } else pass(`listAuditLogs n=${logs.body.entries.length}`);

    const badSearch = await invoke(token, { action: "searchUsers", email: "ab" });
    if (badSearch.status !== 400 && badSearch.body?.error !== "email_required") {
      fail("searchUsers bound", `${badSearch.status}`);
    } else pass("searchUsers rejects short");

    const companies = await rest("companies?select=id&limit=1");
    const companyId = Array.isArray(companies.body) && companies.body[0]?.id;
    if (companyId) {
      const support = await invoke(token, {
        action: "getSupportSnapshot",
        companyId,
      });
      if (support.status !== 200 || !support.body.company) {
        fail("getSupportSnapshot", `${support.status}`);
      } else pass("getSupportSnapshot");
    }

    // Mutation canary
    const after = await auditCount();
    if (before >= 0 && after > before) {
      fail("mutation_canary", `audit grew ${before} → ${after}`);
    } else pass(`mutation_canary audit_stable=${after}`);

    // Non-owner JWT (create ephemeral auth user not in platform_owners)
    const stamp = Date.now();
    const nonOwnerEmail = `hq.ops.nonowner.${stamp}@example.com`;
    const created = await admin.auth.admin.createUser({
      email: nonOwnerEmail,
      password: `Tmp!${stamp}Aa`,
      email_confirm: true,
    });
    if (created.error || !created.data.user) {
      fail("non_owner_create", created.error?.message ?? "no user");
    } else {
      const nonClient = createClient(url, anon, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const signed = await nonClient.auth.signInWithPassword({
        email: nonOwnerEmail,
        password: `Tmp!${stamp}Aa`,
      });
      if (!signed.data.session?.access_token) {
        fail("non_owner_login", signed.error?.message ?? "no session");
      } else {
        const denied = await invoke(signed.data.session.access_token, {
          action: "monitoringSnapshot",
        });
        if (denied.status === 403) pass("non_owner JWT 403");
        else fail("non_owner JWT", `expected 403 got ${denied.status}`);
      }
      await admin.auth.admin.deleteUser(created.data.user.id);
    }

    // Anon key as bearer
    const noAuth = await fetch(`${url}/functions/v1/owner-ops-read`, {
      method: "POST",
      headers: {
        apikey: anon,
        Authorization: `Bearer ${anon}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ action: "monitoringSnapshot" }),
    });
    if (noAuth.status === 401 || noAuth.status === 403) pass(`anon_bearer ${noAuth.status}`);
    else fail("anon_bearer", `expected 401/403 got ${noAuth.status}`);
  } else {
    fail("owner_jwt", "could not mint owner session");
  }

  console.log(`=== done: ${failed} failure(s) ===`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
