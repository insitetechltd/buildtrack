#!/usr/bin/env node
/**
 * Stage D S3 helper — mint a DEV invite handoff link for the disposable invitee.
 * Sets must_set_password=true, generates magiclink, writes URL to --out file.
 * DEV ref only.
 *
 * Usage:
 *   node scripts/maestro/org-s3-mint-invite-link.cjs --out .cache/stage-d-s3-link.txt
 */
const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const ROOT = path.resolve(__dirname, "../..");
const INVITEE_EMAIL =
  process.env.MAESTRO_ORG_INVITEE_EMAIL || "erin.invitee@test.com";
const COMPANY_NAME = process.env.MAESTRO_QA_COMPANY_NAME || "Maestro QA Co";

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

function argValue(flag) {
  const i = process.argv.indexOf(flag);
  if (i < 0 || i + 1 >= process.argv.length) return null;
  return process.argv[i + 1];
}

async function main() {
  loadDotEnv();
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error("FAIL: EXPO_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY required");
    process.exit(2);
  }
  if (!url.includes("zusulknbhaumougqckec")) {
    console.error("FAIL: refusing — not DEV ref");
    process.exit(9);
  }

  const outPath = argValue("--out") || path.join(ROOT, ".cache/stage-d-s3-link.txt");
  const sb = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: company, error: cErr } = await sb
    .from("companies")
    .select("id")
    .eq("name", COMPANY_NAME)
    .maybeSingle();
  if (cErr || !company?.id) {
    console.error("FAIL: company", cErr?.message || "missing");
    process.exit(5);
  }

  const { data: list, error: listErr } = await sb.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });
  if (listErr) {
    console.error("FAIL: listUsers", listErr.message);
    process.exit(3);
  }
  const auth = (list.users || []).find(
    (u) => (u.email || "").toLowerCase() === INVITEE_EMAIL.toLowerCase(),
  );
  if (!auth?.id) {
    console.error("FAIL: invitee auth missing — run seed:dev-qa first");
    process.exit(4);
  }

  const { error: upErr } = await sb.from("users").upsert(
    {
      id: auth.id,
      email: INVITEE_EMAIL,
      name: "Erin Invitee",
      company_id: company.id,
      system_permission: "member",
      user_type: "company_user",
      is_active: true,
      is_pending: false,
      must_set_password: true,
      deployable_seat: "worker",
    },
    { onConflict: "id" },
  );
  if (upErr) {
    console.error("FAIL: upsert invitee", upErr.message);
    process.exit(6);
  }

  const { data: linkData, error: linkErr } = await sb.auth.admin.generateLink({
    type: "magiclink",
    email: INVITEE_EMAIL,
  });
  if (linkErr || !linkData) {
    console.error("FAIL: generateLink", linkErr?.message || "no data");
    process.exit(7);
  }

  // Product invite handoff is taskr://auth/invite/<hashed_token> (see inviteSignInLink.ts).
  // HTTPS action_link opens Safari → marketing site and never reaches Set Password.
  const hashedToken =
    linkData.properties?.hashed_token ||
    linkData.hashed_token ||
    null;
  if (!hashedToken) {
    console.error("FAIL: no hashed_token in generateLink response");
    process.exit(7);
  }

  const appLink = `taskr://auth/invite/${encodeURIComponent(hashedToken)}?type=magiclink`;

  // Keep share-style HTTP link on the row for UI parity (invite-open), but Maestro opens appLink.
  const origin = url.replace(/\/$/, "");
  const shareLink = `${origin}/functions/v1/invite-open?token_hash=${encodeURIComponent(hashedToken)}`;
  try {
    await sb
      .from("users")
      .update({ invite_sign_in_link: shareLink })
      .eq("id", auth.id);
  } catch {
    // Column may be absent on older tenants — ignore.
  }

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, appLink.trim() + "\n", "utf8");
  console.log(
    JSON.stringify({
      ok: true,
      email: INVITEE_EMAIL,
      out: outPath,
      must_set_password: true,
      linkPrefix: appLink.slice(0, 48),
    }),
  );
}

main().catch((err) => {
  console.error("FAIL:", err?.message || err);
  process.exit(1);
});
