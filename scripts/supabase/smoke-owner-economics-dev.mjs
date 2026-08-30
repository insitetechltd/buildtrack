#!/usr/bin/env node
/**
 * DEV schema smoke for Economics Edge (counts only — no currency).
 * node scripts/supabase/smoke-owner-economics-dev.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

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
  if (!url || !key) {
    console.error("Missing URL / service role");
    process.exit(1);
  }
  console.log("=== owner-economics DEV schema smoke ===");

  const companies = await rest("companies?select=id&limit=1");
  if (companies.status >= 400) fail("companies", companies.status);
  else pass("companies");

  // No livemode=true filter
  const subs = await rest(
    "company_subscriptions?select=company_id,status,stripe_subscription_id,trial_ends_at,locked_plan_price_id,plan_prices:locked_plan_price_id(plan_tiers:plan_tier_id(slug,display_name))&limit=5",
  );
  if (subs.status >= 400) fail("subscriptions join", JSON.stringify(subs.body).slice(0, 160));
  else pass(`subscriptions join rows=${Array.isArray(subs.body) ? subs.body.length : "?"}`);

  const ents = await rest(
    "company_entitlements?select=company_id,subscription_status,billing_phase&limit=5",
  );
  if (ents.status >= 400) fail("entitlements", JSON.stringify(ents.body).slice(0, 160));
  else pass(`entitlements rows=${Array.isArray(ents.body) ? ents.body.length : "?"}`);

  const owners = await rest("platform_owners?select=user_id");
  if (owners.status >= 400) fail("platform_owners", JSON.stringify(owners.body).slice(0, 160));
  else pass(`platform_owners rows=${Array.isArray(owners.body) ? owners.body.length : "?"}`);

  console.log(`=== done: ${failed} failure(s) ===`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
