#!/usr/bin/env node
/**
 * DEV schema + drill-down smoke for owner-tenant-read (M-OPS-03 Phase 1c).
 * Run after deploy: node scripts/supabase/smoke-owner-tenant-read-dev.mjs
 *
 * Optional edge JWT smoke: set SMOKE_OWNER_EMAIL + SMOKE_OWNER_PASSWORD in .env
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
const service = env.SUPABASE_SERVICE_ROLE_KEY;

let failed = 0;

function fail(label, detail) {
  failed += 1;
  console.error(`FAIL ${label}: ${detail}`);
}

function pass(label) {
  console.log(`PASS ${label}`);
}

async function rest(query, key = service) {
  const res = await fetch(`${url}/rest/v1/${query}`, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      Prefer: "count=exact",
    },
  });
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  return { status: res.status, body, cr: res.headers.get("content-range") };
}

async function probe(label, query) {
  const r = await rest(query);
  if (r.status >= 400) {
    fail(label, `${r.status} ${JSON.stringify(r.body).slice(0, 200)}`);
    return null;
  }
  pass(label);
  return r.body;
}

async function simulateGetCompany(companyId) {
  const companyLive = await rest(
    `companies?id=eq.${companyId}&select=id,name,type,description,address,phone,email,website,logo,is_active,created_at`,
  );
  if (companyLive.status >= 400) {
    fail("getCompany.company", `${companyLive.status}`);
    return false;
  }
  if (!Array.isArray(companyLive.body) || companyLive.body.length === 0) {
    fail("getCompany.company", "not found");
    return false;
  }

  await probe("getCompany.entitlements", `company_entitlements?company_id=eq.${companyId}&select=pm_seat_limit,worker_seat_limit,project_limit,storage_limit_bytes,subscription_status,billing_phase,entitlements_snapshot`);
  await probe(
    "getCompany.subscription",
    `company_subscriptions?company_id=eq.${companyId}&select=stripe_subscription_id,status,trial_ends_at,locked_plan_price_id,plan_prices:locked_plan_price_id(plan_tiers:plan_tier_id(slug,display_name))`,
  );

  const usersRole = await rest(
    `users?company_id=eq.${companyId}&select=id,role,is_pending,is_active,deployable_seat&limit=500`,
  );
  if (usersRole.status >= 400) {
    const usersPerm = await rest(
      `users?company_id=eq.${companyId}&select=id,system_permission,is_pending,is_active,deployable_seat&limit=500`,
    );
    if (usersPerm.status >= 400) {
      fail("getCompany.users", `${usersRole.status}`);
      return false;
    }
    pass("getCompany.users (system_permission path)");
  } else {
    pass("getCompany.users (role path)");
  }

  const projects = await probe("getCompany.projects", `projects?company_id=eq.${companyId}&select=id`);
  const pids = (projects ?? []).map((p) => p.id);
  if (pids.length > 0) {
    const inList = pids.join(",");
    const tasks = await rest(
      `tasks?project_id=in.(${inList})&deleted_at=is.null&archived_at=is.null&cancelled_at=is.null&select=id`,
    );
    if (tasks.status >= 400) {
      fail("getCompany.tasks", `${tasks.status}`);
      return false;
    }
    pass(`getCompany.tasks (${pids.length} projects)`);
  } else {
    pass("getCompany.tasks (0 projects)");
  }

  return true;
}

async function edgeSmoke(ownerJwt) {
  const actions = [
    ["listCompanies", { action: "listCompanies", limit: 3 }],
    ["getCompany", null],
    ["listProjects", null],
    ["listUsers", null],
  ];

  const listRes = await fetch(`${url}/functions/v1/owner-tenant-read`, {
    method: "POST",
    headers: {
      apikey: anon,
      Authorization: `Bearer ${ownerJwt}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(actions[0][1]),
  });
  const listBody = await listRes.json().catch(() => ({}));
  if (!listRes.ok || !Array.isArray(listBody.companies) || listBody.companies.length === 0) {
    fail("edge.listCompanies", `${listRes.status} ${JSON.stringify(listBody).slice(0, 120)}`);
    return;
  }
  pass("edge.listCompanies");

  const companyId = listBody.companies[0].id;
  const companyName = listBody.companies[0].name;

  const getCompanyRes = await fetch(`${url}/functions/v1/owner-tenant-read`, {
    method: "POST",
    headers: {
      apikey: anon,
      Authorization: `Bearer ${ownerJwt}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ action: "getCompany", companyId }),
  });
  const getCompanyBody = await getCompanyRes.json().catch(() => ({}));
  if (!getCompanyRes.ok || !getCompanyBody.company?.id) {
    fail(
      "edge.getCompany",
      `${getCompanyRes.status} ${getCompanyBody.detail ?? getCompanyBody.error ?? JSON.stringify(getCompanyBody).slice(0, 120)}`,
    );
    return;
  }
  pass(`edge.getCompany (${companyName})`);

  for (const [name, body] of [
    ["listProjects", { action: "listProjects", companyId }],
    ["listUsers", { action: "listUsers", companyId }],
    ["listAllProjects", { action: "listAllProjects", limit: 5 }],
    ["listAllUsers", { action: "listAllUsers", limit: 5 }],
  ]) {
    const r = await fetch(`${url}/functions/v1/owner-tenant-read`, {
      method: "POST",
      headers: {
        apikey: anon,
        Authorization: `Bearer ${ownerJwt}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const b = await r.json().catch(() => ({}));
    if (!r.ok) {
      fail(`edge.${name}`, `${r.status} ${b.detail ?? b.error ?? ""}`);
    } else {
      pass(`edge.${name}`);
    }
  }

  const usersRes = await fetch(`${url}/functions/v1/owner-tenant-read`, {
    method: "POST",
    headers: {
      apikey: anon,
      Authorization: `Bearer ${ownerJwt}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ action: "listUsers", companyId, limit: 1 }),
  });
  const usersBody = await usersRes.json().catch(() => ({}));
  if (usersRes.ok && usersBody.users?.[0]?.id) {
    const userId = usersBody.users[0].id;
    const getUserRes = await fetch(`${url}/functions/v1/owner-tenant-read`, {
      method: "POST",
      headers: {
        apikey: anon,
        Authorization: `Bearer ${ownerJwt}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ action: "getUser", userId, companyId }),
    });
    const getUserBody = await getUserRes.json().catch(() => ({}));
    if (!getUserRes.ok) {
      fail("edge.getUser", `${getUserRes.status} ${getUserBody.detail ?? getUserBody.error ?? ""}`);
    } else {
      pass("edge.getUser");
    }

    const projectsRes = await fetch(`${url}/functions/v1/owner-tenant-read`, {
      method: "POST",
      headers: {
        apikey: anon,
        Authorization: `Bearer ${ownerJwt}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ action: "listProjects", companyId, limit: 1 }),
    });
    const projectsBody = await projectsRes.json().catch(() => ({}));
    if (projectsRes.ok && projectsBody.projects?.[0]?.id) {
      const projectId = projectsBody.projects[0].id;
      const getProjectRes = await fetch(`${url}/functions/v1/owner-tenant-read`, {
        method: "POST",
        headers: {
          apikey: anon,
          Authorization: `Bearer ${ownerJwt}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "getProject", projectId, companyId }),
      });
      const getProjectBody = await getProjectRes.json().catch(() => ({}));
      if (!getProjectRes.ok) {
        fail("edge.getProject", `${getProjectRes.status} ${getProjectBody.detail ?? getProjectBody.error ?? ""}`);
      } else {
        pass("edge.getProject");
        const listTasksProjectRes = await fetch(`${url}/functions/v1/owner-tenant-read`, {
          method: "POST",
          headers: {
            apikey: anon,
            Authorization: `Bearer ${ownerJwt}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "listTasks",
            companyId,
            projectId,
            limit: 500,
            offset: 0,
          }),
        });
        const listTasksProjectBody = await listTasksProjectRes.json().catch(() => ({}));
        const expectedTotal = getProjectBody.taskTotal ?? 0;
        const listTotal = listTasksProjectBody.total ?? 0;
        if (
          !listTasksProjectRes.ok ||
          !Array.isArray(listTasksProjectBody.tasks) ||
          listTotal !== expectedTotal
        ) {
          fail(
            "edge.listTasks.projectTotalParity",
            `${listTasksProjectRes.status} getProject=${expectedTotal} listTasks=${listTotal}`,
          );
        } else {
          pass(`edge.listTasks.projectTotalParity (${listTotal})`);
        }

        for (const status of ["in_progress", "new"]) {
          const statusRes = await fetch(`${url}/functions/v1/owner-tenant-read`, {
            method: "POST",
            headers: {
              apikey: anon,
              Authorization: `Bearer ${ownerJwt}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              action: "listTasks",
              companyId,
              projectId,
              status,
              limit: 50,
              offset: 0,
            }),
          });
          const statusBody = await statusRes.json().catch(() => ({}));
          if (!statusRes.ok || typeof statusBody.total !== "number") {
            fail(
              `edge.listTasks.statusFilter.${status}`,
              `${statusRes.status} ${statusBody.detail ?? statusBody.error ?? ""}`,
            );
          } else {
            pass(`edge.listTasks.statusFilter.${status} (total=${statusBody.total})`);
          }
        }
      }

      const listTasksRes = await fetch(`${url}/functions/v1/owner-tenant-read`, {
        method: "POST",
        headers: {
          apikey: anon,
          Authorization: `Bearer ${ownerJwt}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "listTasks", companyId, limit: 5 }),
      });
      const listTasksBody = await listTasksRes.json().catch(() => ({}));
      if (!listTasksRes.ok || !Array.isArray(listTasksBody.tasks)) {
        fail(
          "edge.listTasks",
          `${listTasksRes.status} ${listTasksBody.detail ?? listTasksBody.error ?? ""}`,
        );
      } else {
        pass(`edge.listTasks (${listTasksBody.tasks.length} rows)`);
        const listTasksUserRes = await fetch(`${url}/functions/v1/owner-tenant-read`, {
          method: "POST",
          headers: {
            apikey: anon,
            Authorization: `Bearer ${ownerJwt}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ action: "listTasks", companyId, userId, limit: 5 }),
        });
        const listTasksUserBody = await listTasksUserRes.json().catch(() => ({}));
        if (!listTasksUserRes.ok || !Array.isArray(listTasksUserBody.tasks)) {
          fail(
            "edge.listTasks.user",
            `${listTasksUserRes.status} ${listTasksUserBody.detail ?? listTasksUserBody.error ?? ""}`,
          );
        } else {
          pass(`edge.listTasks.user (${listTasksUserBody.tasks.length} rows)`);
        }
        if (listTasksBody.tasks[0]?.id) {
          const taskId = listTasksBody.tasks[0].id;
          const getTaskRes = await fetch(`${url}/functions/v1/owner-tenant-read`, {
            method: "POST",
            headers: {
              apikey: anon,
              Authorization: `Bearer ${ownerJwt}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ action: "getTask", taskId, companyId }),
          });
          const getTaskBody = await getTaskRes.json().catch(() => ({}));
          if (!getTaskRes.ok || !getTaskBody.task?.id) {
            fail(
              "edge.getTask",
              `${getTaskRes.status} ${getTaskBody.detail ?? getTaskBody.error ?? ""}`,
            );
          } else {
            pass("edge.getTask");
          }
        }
      }
    }
  }
}

async function main() {
  if (!url || !service || !anon) {
    console.error("Missing EXPO_PUBLIC_SUPABASE_URL / keys in .env or apps/owner/.env");
    process.exit(1);
  }

  console.log("=== owner-tenant-read DEV smoke (schema) ===");

  const companies = await probe(
    "listCompanies.companies",
    "companies?select=id,name,type,is_active,email,phone,created_at&order=name.asc&limit=5",
  );
  if (!companies?.length) {
    console.error("No companies on DEV — abort");
    process.exit(1);
  }

  for (const c of companies.slice(0, 3)) {
    console.log(`--- simulate getCompany: ${c.name} ---`);
    await simulateGetCompany(c.id);
  }

  const email = env.SMOKE_OWNER_EMAIL;
  const password = env.SMOKE_OWNER_PASSWORD;
  if (email && password) {
    console.log("=== owner-tenant-read DEV smoke (edge JWT) ===");
    const client = createClient(url, anon, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error || !data.session?.access_token) {
      fail("edge.auth", error?.message ?? "no session");
    } else {
      await edgeSmoke(data.session.access_token);
    }
  } else {
    console.log("SKIP edge JWT smoke (set SMOKE_OWNER_EMAIL + SMOKE_OWNER_PASSWORD for full edge proof)");
  }

  console.log(`=== done: ${failed} failure(s) ===`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
