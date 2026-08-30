// M-OPS-03 Phase 1d — owner tenant writes for hq (DEV).
// Actions: createUser | deactivateUser. No company switch. No purge.
// Auth: JWT + platform_owners. Audit → owner_audit_log (actor → auth.users).
// Deploy: bash scripts/supabase/deploy-owner-tenant-write.sh --project-ref zusulknbhaumougqckec

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { isCallerPlatformOwner } from "../_shared/ownerAllowlist.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type SeatType = "pm" | "worker";
type WriteAction = "createUser" | "deactivateUser";

type CompanyUserRow = {
  id: string;
  role?: string | null;
  system_permission?: string | null;
  is_pending?: boolean | null;
  is_active?: boolean | null;
  deployable_seat?: string | null;
};

const STARTER_PM_LIMIT = 1;
const STARTER_WORKER_LIMIT = 5;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function parseUuid(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const id = raw.trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      .test(id)
    ? id
    : null;
}

function parseEmail(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const email = raw.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

function generateTempPassword(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

function isMissingColumnError(message: string | undefined): boolean {
  return /42703|PGRST204|does not exist/i.test(message || "");
}

function isSeatLimitDbError(message: string | undefined): boolean {
  return /pm_seat_limit|worker_seat_limit/i.test(message || "");
}

function seatClassForUser(user: CompanyUserRow): "pm" | "worker" | "none" {
  const deploy = (user.deployable_seat || "").toLowerCase();
  if (deploy === "pm") return "pm";
  if (deploy === "worker") return "worker";
  const role = (user.system_permission || user.role || "").toLowerCase();
  if (!role) return "none";
  if (role === "admin" || role === "company_admin") return "worker";
  if (role === "manager" || role === "supervisor") return "pm";
  return "worker";
}

function countSeats(users: CompanyUserRow[]): { pmCount: number; workerCount: number } {
  let pmCount = 0;
  let workerCount = 0;
  for (const user of users) {
    if (user.is_active === false) continue;
    const seat = seatClassForUser(user);
    if (seat === "pm") pmCount += 1;
    else if (seat === "worker") workerCount += 1;
  }
  return { pmCount, workerCount };
}

function isAdminRole(user: CompanyUserRow): boolean {
  const role = (user.system_permission || user.role || "").toLowerCase();
  return role === "admin" || role === "company_admin";
}

async function loadSeatLimits(
  admin: ReturnType<typeof createClient>,
  companyId: string,
): Promise<{ pmSeatLimit: number; workerSeatLimit: number }> {
  const { data, error } = await admin
    .from("company_entitlements")
    .select("pm_seat_limit, worker_seat_limit, entitlements_snapshot")
    .eq("company_id", companyId)
    .maybeSingle();

  if (error && !isMissingColumnError(error.message)) throw error;
  if (!data) {
    return { pmSeatLimit: STARTER_PM_LIMIT, workerSeatLimit: STARTER_WORKER_LIMIT };
  }

  const snapshot = data.entitlements_snapshot as {
    meters?: Record<string, number | null>;
  } | null;
  const meters = snapshot?.meters ?? {};
  return {
    pmSeatLimit:
      typeof meters.pm_seats === "number" && Number.isFinite(meters.pm_seats)
        ? meters.pm_seats
        : typeof data.pm_seat_limit === "number"
        ? data.pm_seat_limit
        : STARTER_PM_LIMIT,
    workerSeatLimit:
      typeof meters.worker_seats === "number" && Number.isFinite(meters.worker_seats)
        ? meters.worker_seats
        : typeof data.worker_seat_limit === "number"
        ? data.worker_seat_limit
        : STARTER_WORKER_LIMIT,
  };
}

async function listCompanyUsers(
  admin: ReturnType<typeof createClient>,
  companyId: string,
): Promise<CompanyUserRow[]> {
  const withDeploy = await admin
    .from("users")
    .select("id, role, is_pending, is_active, deployable_seat")
    .eq("company_id", companyId);
  if (!withDeploy.error) return (withDeploy.data ?? []) as CompanyUserRow[];

  if (isMissingColumnError(withDeploy.error.message)) {
    const roleOnly = await admin
      .from("users")
      .select("id, role, is_pending, is_active")
      .eq("company_id", companyId);
    if (roleOnly.error) {
      const sys = await admin
        .from("users")
        .select("id, system_permission, is_pending, is_active, deployable_seat")
        .eq("company_id", companyId);
      if (sys.error) throw sys.error;
      return (sys.data ?? []) as CompanyUserRow[];
    }
    return (roleOnly.data ?? []) as CompanyUserRow[];
  }
  throw withDeploy.error;
}

async function upsertProfile(
  admin: ReturnType<typeof createClient>,
  userId: string,
  patch: Record<string, unknown>,
  inviteRole: string,
  inviteSystemPermission: string,
): Promise<void> {
  const { error: roleError } = await admin.from("users").upsert(
    { ...patch, id: userId, role: inviteRole },
    { onConflict: "id" },
  );
  if (!roleError) return;
  if (isSeatLimitDbError(roleError.message)) {
    throw Object.assign(new Error(roleError.message), { code: "seat_limit" });
  }
  if (isMissingColumnError(roleError.message)) {
    const { error: sysError } = await admin.from("users").upsert(
      { ...patch, id: userId, system_permission: inviteSystemPermission },
      { onConflict: "id" },
    );
    if (sysError) throw sysError;
    return;
  }
  throw roleError;
}

async function writeAudit(
  admin: ReturnType<typeof createClient>,
  row: {
    actorUserId: string;
    action: string;
    companyId: string | null;
    targetUserId: string | null;
    payload: Record<string, unknown>;
  },
): Promise<void> {
  const { error } = await admin.from("owner_audit_log").insert({
    actor_user_id: row.actorUserId,
    action: row.action,
    company_id: row.companyId,
    target_user_id: row.targetUserId,
    payload: row.payload,
  });
  if (error) throw error;
}

async function handleCreateUser(
  admin: ReturnType<typeof createClient>,
  actorId: string,
  body: Record<string, unknown>,
) {
  if ("companyIdPatch" in body || body.patchCompanyId != null) {
    return jsonResponse({ error: "company_switch_forbidden" }, 400);
  }

  const companyId = parseUuid(body.companyId);
  const email = parseEmail(body.email);
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const seatRaw = typeof body.seatClass === "string"
    ? body.seatClass.toLowerCase()
    : "worker";
  const seatType: SeatType = seatRaw === "pm" ? "pm" : "worker";

  if (!companyId) return jsonResponse({ error: "invalid_company_id" }, 400);
  if (!email) return jsonResponse({ error: "invalid_email" }, 400);
  if (!name) return jsonResponse({ error: "invalid_name" }, 400);

  const { data: company, error: companyError } = await admin
    .from("companies")
    .select("id, name")
    .eq("id", companyId)
    .maybeSingle();
  if (companyError) throw companyError;
  if (!company) return jsonResponse({ error: "company_not_found" }, 404);

  const limits = await loadSeatLimits(admin, companyId);
  const existingUsers = await listCompanyUsers(admin, companyId);
  const { pmCount, workerCount } = countSeats(existingUsers);

  if (seatType === "pm" && pmCount >= limits.pmSeatLimit) {
    return jsonResponse(
      {
        error: "pm_seat_limit",
        message: `PM seat limit reached (${pmCount}/${limits.pmSeatLimit})`,
        pmCount,
        workerCount,
        pmSeatLimit: limits.pmSeatLimit,
        workerSeatLimit: limits.workerSeatLimit,
      },
      409,
    );
  }
  if (seatType === "worker" && workerCount >= limits.workerSeatLimit) {
    return jsonResponse(
      {
        error: "worker_seat_limit",
        message:
          `Worker seat limit reached (${workerCount}/${limits.workerSeatLimit})`,
        pmCount,
        workerCount,
        pmSeatLimit: limits.pmSeatLimit,
        workerSeatLimit: limits.workerSeatLimit,
      },
      409,
    );
  }

  // Live users.role CHECK: supervisor not manager (M-SUPABASE-03a).
  const inviteRole = seatType === "pm" ? "supervisor" : "worker";
  const inviteSystemPermission = seatType === "pm" ? "manager" : "member";
  const position = seatType === "pm" ? "Project Manager" : "Worker";
  const tempPassword = generateTempPassword();

  let userId: string | null = null;
  let createdFreshAuthUser = false;

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: {
      name,
      company_id: companyId,
      role: inviteRole,
      system_permission: inviteSystemPermission,
      is_pending: false,
      must_set_password: true,
      position,
    },
  });

  if (createError || !created.user) {
    const msg = createError?.message || "create_user_failed";
    if (/already|registered|exists/i.test(msg)) {
      return jsonResponse({ error: "email_exists", message: msg }, 409);
    }
    return jsonResponse({ error: "create_user_failed", detail: msg }, 500);
  }

  userId = created.user.id;
  createdFreshAuthUser = true;

  try {
    const patch: Record<string, unknown> = {
      id: userId,
      name,
      email,
      phone: "",
      company_id: companyId,
      is_pending: false,
      is_active: true,
      position,
      deployable_seat: seatType,
    };
    await upsertProfile(
      admin,
      userId,
      patch,
      inviteRole,
      inviteSystemPermission,
    );

    // Soft-set must_set_password if column exists
    const { error: mspErr } = await admin
      .from("users")
      .update({ must_set_password: true })
      .eq("id", userId);
    if (mspErr && !isMissingColumnError(mspErr.message)) throw mspErr;

    await writeAudit(admin, {
      actorUserId: actorId,
      action: "createUser",
      companyId,
      targetUserId: userId,
      payload: {
        email,
        name,
        seatClass: seatType,
        role: inviteRole,
        companyName: (company as { name: string }).name,
      },
    });

    // Invite recovery link (password set) — mirrors invite-user generateLink
    try {
      await admin.auth.admin.generateLink({
        type: "recovery",
        email,
      });
    } catch (linkErr) {
      console.error(
        "owner-tenant-write generateLink",
        linkErr instanceof Error ? linkErr.message : String(linkErr),
      );
    }
  } catch (err) {
    if (createdFreshAuthUser && userId) {
      await admin.from("users").delete().eq("id", userId);
      await admin.auth.admin.deleteUser(userId);
    }
    const message = err instanceof Error ? err.message : String(err);
    if (isSeatLimitDbError(message)) {
      return jsonResponse({ error: "seat_limit", message }, 409);
    }
    throw err;
  }

  return jsonResponse({
    user: {
      id: userId,
      email,
      name,
      companyId,
      role: inviteRole,
      seatClass: seatType,
      isActive: true,
    },
  });
}

async function handleDeactivateUser(
  admin: ReturnType<typeof createClient>,
  actorId: string,
  body: Record<string, unknown>,
) {
  if (body.companyId != null && body.newCompanyId != null) {
    return jsonResponse({ error: "company_switch_forbidden" }, 400);
  }

  const userId = parseUuid(body.userId);
  const companyId = parseUuid(body.companyId);
  if (!userId) return jsonResponse({ error: "invalid_user_id" }, 400);
  if (!companyId) return jsonResponse({ error: "invalid_company_id" }, 400);

  const withRole = await admin
    .from("users")
    .select("id, email, name, company_id, role, is_active, deployable_seat")
    .eq("id", userId)
    .maybeSingle();

  let user = withRole.data as CompanyUserRow & {
    email?: string;
    name?: string;
    company_id?: string | null;
  } | null;
  if (withRole.error && isMissingColumnError(withRole.error.message)) {
    const alt = await admin
      .from("users")
      .select(
        "id, email, name, company_id, system_permission, is_active, deployable_seat",
      )
      .eq("id", userId)
      .maybeSingle();
    if (alt.error) throw alt.error;
    user = alt.data as typeof user;
  } else if (withRole.error) {
    throw withRole.error;
  }

  if (!user) return jsonResponse({ error: "not_found" }, 404);
  if (user.company_id !== companyId) {
    return jsonResponse({ error: "forbidden" }, 403);
  }

  if (user.is_active === false) {
    return jsonResponse({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        companyId: user.company_id,
        isActive: false,
        alreadyInactive: true,
      },
    });
  }

  if (isAdminRole(user)) {
    const peers = await listCompanyUsers(admin, companyId);
    const otherAdmins = peers.filter(
      (u) => u.id !== userId && u.is_active !== false && isAdminRole(u),
    );
    if (otherAdmins.length === 0) {
      return jsonResponse(
        {
          error: "cannot_deactivate_sole_admin",
          message: "Cannot deactivate the only active company admin.",
        },
        409,
      );
    }
  }

  const { error: updateError } = await admin
    .from("users")
    .update({ is_active: false })
    .eq("id", userId)
    .eq("company_id", companyId);
  if (updateError) throw updateError;

  // Ban Auth identity so Taskr login cannot continue with an inactive seat.
  const { error: banError } = await admin.auth.admin.updateUserById(userId, {
    ban_duration: "876600h",
  });
  if (banError) {
    await admin
      .from("users")
      .update({ is_active: true })
      .eq("id", userId)
      .eq("company_id", companyId);
    throw banError;
  }

  try {
    await writeAudit(admin, {
      actorUserId: actorId,
      action: "deactivateUser",
      companyId,
      targetUserId: userId,
      payload: {
        email: user.email,
        name: user.name,
        previousActive: true,
        authBanned: true,
      },
    });
  } catch (auditErr) {
    // Compensate: restore active + unban if audit fails
    await admin
      .from("users")
      .update({ is_active: true })
      .eq("id", userId)
      .eq("company_id", companyId);
    await admin.auth.admin.updateUserById(userId, { ban_duration: "none" });
    throw auditErr;
  }

  return jsonResponse({
    user: {
      id: userId,
      email: user.email,
      name: user.name,
      companyId,
      isActive: false,
    },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return jsonResponse({ error: "server_misconfigured" }, 500);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "not_authenticated" }, 401);
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const admin = createClient(supabaseUrl, serviceRoleKey);

    const {
      data: { user: caller },
      error: callerError,
    } = await userClient.auth.getUser();

    if (callerError || !caller) {
      return jsonResponse({ error: "not_authenticated" }, 401);
    }

    if (!(await isCallerPlatformOwner(admin, caller.id))) {
      return jsonResponse({ error: "forbidden" }, 403);
    }

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const action = body.action as WriteAction | undefined;

    // Hard reject company_id mutation payloads on any action
    if (body.newCompanyId != null || body.companyIdPatch != null) {
      return jsonResponse({ error: "company_switch_forbidden" }, 400);
    }

    switch (action) {
      case "createUser":
        return await handleCreateUser(admin, caller.id, body);
      case "deactivateUser":
        return await handleDeactivateUser(admin, caller.id, body);
      default:
        return jsonResponse({ error: "invalid_action" }, 400);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("owner-tenant-write", message);
    return jsonResponse({ error: "internal_error", detail: message }, 500);
  }
});
