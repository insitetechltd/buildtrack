/**
 * ASC App Review demo account password lock (Node).
 *
 * Why: Taskr 1.1.3 was rejected twice under Guideline 2.1 when
 * sara@insitetest.com / password123 failed on PROD after automated Auth Admin
 * password rotation (p-matrix mint_qa_jwt, Metro QA, one-off .cache scripts)
 * drifted the ASC Review Information password.
 *
 * Break-glass (intentional only):
 *   ASC_DEMO_PASSWORD_BREAK_GLASS=1
 * If the password changes, update ASC Review Information in the same change.
 */
const fs = require("fs");
const path = require("path");

const MANIFEST_PATH = path.join(__dirname, "asc-review-demo-accounts.json");

function loadManifest() {
  const raw = fs.readFileSync(MANIFEST_PATH, "utf8");
  return JSON.parse(raw);
}

function normalizeEmail(email) {
  if (typeof email !== "string") return "";
  return email.trim().toLowerCase();
}

function ascLockedDemoEmails() {
  const m = loadManifest();
  return (m.emails || []).map(normalizeEmail).filter(Boolean);
}

function isAscLockedDemoEmail(email) {
  const n = normalizeEmail(email);
  if (!n) return false;
  return ascLockedDemoEmails().includes(n);
}

function ascDemoPasswordBreakGlassEnabled(env = process.env) {
  const v = String(env.ASC_DEMO_PASSWORD_BREAK_GLASS || "").trim();
  return v === "1" || v.toLowerCase() === "true" || v.toLowerCase() === "yes";
}

/**
 * @returns {{ ok: true } | { ok: false, reason: string }}
 */
function assertMayRotateAscDemoPassword(email, env = process.env) {
  if (!isAscLockedDemoEmail(email)) {
    return { ok: true };
  }
  if (ascDemoPasswordBreakGlassEnabled(env)) {
    return { ok: true };
  }
  return {
    ok: false,
    reason:
      `Refusing Auth Admin password change for ASC-locked demo account ${normalizeEmail(email)}. ` +
      `Automated QA must not drift App Store Review credentials (Guideline 2.1). ` +
      `Break-glass: ASC_DEMO_PASSWORD_BREAK_GLASS=1 and update ASC Review Information if the password changes.`,
  };
}

function assertMayRotateAscDemoPasswordOrThrow(email, env = process.env) {
  const result = assertMayRotateAscDemoPassword(email, env);
  if (!result.ok) {
    const err = new Error(result.reason);
    err.code = "ASC_DEMO_PASSWORD_LOCKED";
    throw err;
  }
}

module.exports = {
  MANIFEST_PATH,
  loadManifest,
  normalizeEmail,
  ascLockedDemoEmails,
  isAscLockedDemoEmail,
  ascDemoPasswordBreakGlassEnabled,
  assertMayRotateAscDemoPassword,
  assertMayRotateAscDemoPasswordOrThrow,
};
