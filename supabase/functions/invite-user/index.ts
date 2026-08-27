// Corp RC: company admin invites a seat and gets a first-sign-in deep link.
// BILL-D: seat caps from company_entitlements; counting via seat_class_rules.
// Deploy: scripts/supabase/deploy-invite-user.sh

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type SeatType = "pm" | "worker";

type SeatClassRule = {
  role_key: string;
  consumes_pm_seats: boolean;
  consumes_worker_seats: boolean;
  is_seat_exempt: boolean;
};

type CompanyUserRow = {
  id: string;
  role?: string | null;
  system_permission?: string | null;
  is_pending?: boolean | null;
  is_active?: boolean | null;
  deployable_seat?: string | null;
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function generateTempPassword(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

function legacyPmRole(role: string | null | undefined): boolean {
  const value = (role || "").toLowerCase();
  return value === "manager" || value === "supervisor";
}

function legacyWorkerRole(role: string | null | undefined): boolean {
  const value = (role || "").toLowerCase();
  return (
    value === "foreman" ||
    value === "member" ||
    value === "worker"
  );
}

function seatClassForInviteUser(
  user: CompanyUserRow,
  rulesByKey: Map<string, SeatClassRule> | null,
): "pm" | "worker" | "none" {
  const deploy = (user.deployable_seat || "").toLowerCase();
  if (deploy === "pm") return "pm";
  if (deploy === "worker") return "worker";

  const roleKey = (user.system_permission || user.role || "").toLowerCase();
  if (!roleKey) return "none";

  const rule = rulesByKey?.get(roleKey);
  if (rule) {
    if (rule.is_seat_exempt) return "none";
    if (rule.consumes_pm_seats) return "pm";
    if (rule.consumes_worker_seats) return "worker";
    return "none";
  }

  // Fallback when seat_class_rules is unavailable — CA defaults to worker seat.
  if (roleKey === "admin" || roleKey === "company_admin") {
    return "worker";
  }
  if (legacyPmRole(roleKey)) return "pm";
  if (legacyWorkerRole(roleKey)) return "worker";
  return "worker";
}

async function loadSeatLimits(
  adminClient: ReturnType<typeof createClient>,
  companyId: string,
): Promise<{ pmSeatLimit: number; workerSeatLimit: number } | null> {
  const { data, error } = await adminClient
    .from("company_entitlements")
    .select("pm_seat_limit, worker_seat_limit, entitlements_snapshot")
    .eq("company_id", companyId)
    .maybeSingle();

  if (error) {
    if (/42703|PGRST204|does not exist/i.test(error.message || "")) {
      return null;
    }
    throw error;
  }

  if (!data) return null;

  const snapshot = data.entitlements_snapshot as {
    meters?: Record<string, number | null>;
  } | null;
  const meters = snapshot?.meters ?? {};

  const pmFromSnapshot = meters.pm_seats;
  const workerFromSnapshot = meters.worker_seats;

  return {
    pmSeatLimit:
      typeof pmFromSnapshot === "number" && Number.isFinite(pmFromSnapshot)
        ? pmFromSnapshot
        : (data.pm_seat_limit as number),
    workerSeatLimit:
      typeof workerFromSnapshot === "number" && Number.isFinite(workerFromSnapshot)
        ? workerFromSnapshot
        : (data.worker_seat_limit as number),
  };
}

async function loadSeatClassRules(
  adminClient: ReturnType<typeof createClient>,
): Promise<Map<string, SeatClassRule> | null> {
  const { data, error } = await adminClient
    .from("seat_class_rules")
    .select("role_key, consumes_pm_seats, consumes_worker_seats, is_seat_exempt");

  if (error) {
    if (/42703|PGRST204|does not exist/i.test(error.message || "")) {
      return null;
    }
    throw error;
  }

  const rules = new Map<string, SeatClassRule>();
  for (const row of data || []) {
    rules.set(String(row.role_key).toLowerCase(), row as SeatClassRule);
  }
  return rules;
}

function countSeats(
  users: CompanyUserRow[],
  rulesByKey: Map<string, SeatClassRule> | null,
): { pmCount: number; workerCount: number } {
  // Soft-inactive frees the seat. Pending invites / awaiting approval HOLD a seat.
  const seatHolders = users.filter((user) => user.is_active !== false);
  let pmCount = 0;
  let workerCount = 0;

  for (const user of seatHolders) {
    const seatClass = seatClassForInviteUser(user, rulesByKey);
    if (seatClass === "pm") {
      pmCount += 1;
    } else if (seatClass === "worker") {
      workerCount += 1;
    }
  }

  return { pmCount, workerCount };
}

function isMissingColumnError(message: string | undefined): boolean {
  return /42703|PGRST204|does not exist/i.test(message || "");
}

async function markMustSetPassword(
  adminClient: ReturnType<typeof createClient>,
  userId: string,
): Promise<void> {
  const { error } = await adminClient
    .from("users")
    .update({ must_set_password: true })
    .eq("id", userId);

  if (error && !isMissingColumnError(error.message)) {
    throw error;
  }
}

async function upsertInviteProfile(
  adminClient: ReturnType<typeof createClient>,
  userId: string,
  patch: Record<string, unknown>,
  inviteRole: string,
  inviteSystemPermission: string,
): Promise<void> {
  const { error: roleError } = await adminClient.from("users").upsert(
    { ...patch, id: userId, role: inviteRole },
    { onConflict: "id" },
  );
  if (!roleError) {
    return;
  }

  if (isSeatLimitDbError(roleError.message)) {
    throw Object.assign(new Error(roleError.message), {
      code: seatLimitErrorCode(roleError.message),
    });
  }

  if (!isMissingColumnError(roleError.message)) {
    const { error: sysError } = await adminClient.from("users").upsert(
      { ...patch, id: userId, system_permission: inviteSystemPermission },
      { onConflict: "id" },
    );
    if (sysError) {
      if (isSeatLimitDbError(sysError.message)) {
        throw Object.assign(new Error(sysError.message), {
          code: seatLimitErrorCode(sysError.message),
        });
      }
      throw sysError;
    }
    return;
  }

  throw roleError;
}

function isSeatLimitDbError(message: string | undefined): boolean {
  return /pm_seat_limit|worker_seat_limit/i.test(message || "");
}

function seatLimitErrorCode(message: string | undefined): "pm_seat_limit" | "worker_seat_limit" {
  return /pm_seat_limit/i.test(message || "") ? "pm_seat_limit" : "worker_seat_limit";
}

async function deleteInviteUser(
  adminClient: ReturnType<typeof createClient>,
  userId: string,
): Promise<void> {
  await adminClient.from("users").delete().eq("id", userId);
  await adminClient.auth.admin.deleteUser(userId);
}

async function assertSeatAvailableAfterWrite(
  adminClient: ReturnType<typeof createClient>,
  companyId: string,
  seatType: SeatType,
  seatRules: Map<string, SeatClassRule> | null,
  limits: { pmSeatLimit: number; workerSeatLimit: number },
): Promise<{ ok: true } | { ok: false; error: "pm_seat_limit" | "worker_seat_limit"; pmCount: number; workerCount: number }> {
  const { data, error } = await adminClient
    .from("users")
    .select("id, role, system_permission, is_pending, is_active, deployable_seat")
    .eq("company_id", companyId);

  let companyUsers: CompanyUserRow[] = [];
  if (error) {
    if (isMissingColumnError(error.message)) {
      const roleOnly = await adminClient
        .from("users")
        .select("id, role, is_pending, is_active")
        .eq("company_id", companyId);
      if (roleOnly.error) {
        throw roleOnly.error;
      }
      companyUsers = roleOnly.data || [];
    } else {
      throw error;
    }
  } else {
    companyUsers = data || [];
  }

  const { pmCount, workerCount } = countSeats(companyUsers, seatRules);
  if (seatType === "pm" && pmCount > limits.pmSeatLimit) {
    return { ok: false, error: "pm_seat_limit", pmCount, workerCount };
  }
  if (seatType === "worker" && workerCount > limits.workerSeatLimit) {
    return { ok: false, error: "worker_seat_limit", pmCount, workerCount };
  }
  // Cross-check both pools — role writes can tip either class.
  if (pmCount > limits.pmSeatLimit) {
    return { ok: false, error: "pm_seat_limit", pmCount, workerCount };
  }
  if (workerCount > limits.workerSeatLimit) {
    return { ok: false, error: "worker_seat_limit", pmCount, workerCount };
  }
  return { ok: true };
}

async function mintSignInLink(
  adminClient: ReturnType<typeof createClient>,
  supabaseUrl: string,
  email: string,
  userId: string,
): Promise<{ signInLink?: string; error?: string }> {
  const { data: linkData, error: linkError } =
    await adminClient.auth.admin.generateLink({
      type: "magiclink",
      email,
    });

  const hashedToken = linkData?.properties?.hashed_token;
  if (linkError || !hashedToken) {
    return { error: linkError?.message || "invite_link_failed" };
  }

  const origin = supabaseUrl.replace(/\/$/, "");
  const signInLink =
    `${origin}/functions/v1/invite-open?token_hash=${encodeURIComponent(hashedToken)}`;

  const persist = await adminClient
    .from("users")
    .update({ invite_sign_in_link: signInLink })
    .eq("id", userId);
  void persist.error;

  return { signInLink };
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
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const {
      data: { user: caller },
      error: callerError,
    } = await userClient.auth.getUser();

    if (callerError || !caller) {
      return jsonResponse({ error: "not_authenticated" }, 401);
    }

    const body = await req.json().catch(() => ({}));
    const copyLink = body.copyLink === true;
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const seatType: SeatType = body.seatType === "pm" ? "pm" : "worker";
    const companyId =
      typeof body.companyId === "string" ? body.companyId.trim() : "";

    if (!email || !companyId || (!copyLink && !name)) {
      return jsonResponse({ error: "invalid_payload" }, 400);
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      return jsonResponse({ error: "invalid_email" }, 400);
    }

    // Live tenants use `role`; greenfield may use `system_permission`.
    // Never SELECT both — PostgREST 42703 aborts the whole query if a column is missing.
    let callerProfile: {
      id: string;
      company_id: string | null;
      role?: string | null;
      system_permission?: string | null;
      is_pending?: boolean | null;
    } | null = null;

    {
      const rolePath = await adminClient
        .from("users")
        .select("id, company_id, role, is_pending")
        .eq("id", caller.id)
        .maybeSingle();
      if (!rolePath.error && rolePath.data) {
        callerProfile = rolePath.data;
      } else {
        const sysPath = await adminClient
          .from("users")
          .select("id, company_id, system_permission, is_pending")
          .eq("id", caller.id)
          .maybeSingle();
        if (sysPath.error || !sysPath.data) {
          return jsonResponse({ error: "caller_profile_not_found" }, 403);
        }
        callerProfile = sysPath.data;
      }
    }

    if (callerProfile.is_pending) {
      return jsonResponse({ error: "caller_pending" }, 403);
    }

    if (callerProfile.company_id !== companyId) {
      return jsonResponse({ error: "company_mismatch" }, 403);
    }

    const permission = (callerProfile.system_permission || "").toLowerCase();
    const role = (callerProfile.role || "").toLowerCase();
    const isAdmin =
      permission === "admin" ||
      role === "admin" ||
      role === "company_admin";
    if (!isAdmin) {
      return jsonResponse({ error: "not_company_admin" }, 403);
    }

    if (copyLink) {
      const { data: existing } = await adminClient
        .from("users")
        .select("id, company_id")
        .ilike("email", email)
        .maybeSingle();
      if (!existing?.id || existing.company_id !== companyId) {
        return jsonResponse({ error: "user_not_found" }, 404);
      }

      const minted = await mintSignInLink(
        adminClient,
        supabaseUrl,
        email,
        existing.id,
      );
      if (!minted.signInLink) {
        return jsonResponse({ error: minted.error || "invite_link_failed" }, 500);
      }

      return jsonResponse({
        userId: existing.id,
        email,
        signInLink: minted.signInLink,
      });
    }

    let companyUsers: CompanyUserRow[] = [];
    {
      const rolePath = await adminClient
        .from("users")
        .select("id, role, is_pending, is_active, deployable_seat")
        .eq("company_id", companyId);
      if (!rolePath.error) {
        companyUsers = rolePath.data || [];
      } else if (isMissingColumnError(rolePath.error.message)) {
        const roleOnly = await adminClient
          .from("users")
          .select("id, role, is_pending, is_active")
          .eq("company_id", companyId);
        if (roleOnly.error) {
          const sysPath = await adminClient
            .from("users")
            .select("id, system_permission, is_pending")
            .eq("company_id", companyId);
          if (sysPath.error) {
            return jsonResponse({ error: sysPath.message }, 500);
          }
          companyUsers = sysPath.data || [];
        } else {
          companyUsers = roleOnly.data || [];
        }
      } else {
        const sysPath = await adminClient
          .from("users")
          .select("id, system_permission, is_pending, is_active")
          .eq("company_id", companyId);
        if (sysPath.error) {
          return jsonResponse({ error: sysPath.message }, 500);
        }
        companyUsers = sysPath.data || [];
      }
    }

    const seatLimits = await loadSeatLimits(adminClient, companyId);
    if (!seatLimits) {
      return jsonResponse(
        {
          error: "entitlements_missing",
          message:
            "Company entitlements are not configured. Contact support before inviting teammates.",
        },
        409,
      );
    }

    const seatRules = await loadSeatClassRules(adminClient);
    const { pmCount, workerCount } = countSeats(companyUsers, seatRules);
    const { pmSeatLimit, workerSeatLimit } = seatLimits;

    if (seatType === "pm" && pmCount >= pmSeatLimit) {
      return jsonResponse(
        {
          error: "pm_seat_limit",
          message:
            `PM seat limit reached (${pmCount}/${pmSeatLimit}). Add a PM seat to invite more.`,
          pmCount,
          workerCount,
          pmSeatLimit,
          workerSeatLimit,
        },
        409,
      );
    }
    if (seatType === "worker" && workerCount >= workerSeatLimit) {
      return jsonResponse(
        {
          error: "worker_seat_limit",
          message:
            `Worker seat limit reached (${workerCount}/${workerSeatLimit}). Add a worker seat to invite more.`,
          pmCount,
          workerCount,
          pmSeatLimit,
          workerSeatLimit,
        },
        409,
      );
    }

    const tempPassword = generateTempPassword();
    // Live `users.role` CHECK (M-SUPABASE-03a) allows supervisor, not manager.
    // App SystemPermission still uses manager — map on read in the client.
    const inviteRole = seatType === "pm" ? "supervisor" : "worker";
    const inviteSystemPermission = seatType === "pm" ? "manager" : "member";

    let userId: string | null = null;
    let createdFreshAuthUser = false;

    const { data: created, error: createError } =
      await adminClient.auth.admin.createUser({
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
          position: seatType === "pm" ? "Project Manager" : "Worker",
        },
      });

    if (createError || !created.user) {
      const msg = createError?.message || "create_user_failed";
      const alreadyExists = /already|registered|exists/i.test(msg);
      if (!alreadyExists) {
        return jsonResponse({ error: msg }, 500);
      }

      const { data: existing } = await adminClient
        .from("users")
        .select("id, company_id")
        .ilike("email", email)
        .maybeSingle();
      if (!existing?.id) {
        return jsonResponse({ error: msg }, 409);
      }
      if (existing.company_id !== companyId) {
        return jsonResponse({ error: "company_mismatch" }, 403);
      }
      userId = existing.id;

      const existingPatch: Record<string, unknown> = {
        id: userId,
        email,
        company_id: companyId,
        is_pending: false,
        position: seatType === "pm" ? "Project Manager" : "Worker",
      };
      if (name) {
        existingPatch.name = name;
      }

      try {
        await upsertInviteProfile(
          adminClient,
          userId,
          existingPatch,
          inviteRole,
          inviteSystemPermission,
        );
        await markMustSetPassword(adminClient, userId);
      } catch (profileError) {
        const message =
          profileError instanceof Error ? profileError.message : "seat_limit";
        const code =
          (profileError as { code?: string })?.code ||
          seatLimitErrorCode(message);
        if (isSeatLimitDbError(message)) {
          return jsonResponse(
            {
              error: code,
              message,
              pmSeatLimit: seatLimits.pmSeatLimit,
              workerSeatLimit: seatLimits.workerSeatLimit,
            },
            409,
          );
        }
        throw profileError;
      }
    } else {
      userId = created.user.id;
      createdFreshAuthUser = true;

      const patch: Record<string, unknown> = {
        id: userId,
        name,
        email,
        phone: "",
        company_id: companyId,
        is_pending: false,
        position: seatType === "pm" ? "Project Manager" : "Worker",
      };

      try {
        await upsertInviteProfile(
          adminClient,
          userId,
          patch,
          inviteRole,
          inviteSystemPermission,
        );
        await markMustSetPassword(adminClient, userId);
      } catch (profileError) {
        const message =
          profileError instanceof Error ? profileError.message : "seat_limit";
        const code =
          (profileError as { code?: string })?.code ||
          seatLimitErrorCode(message);
        if (createdFreshAuthUser) {
          await deleteInviteUser(adminClient, userId);
        }
        if (isSeatLimitDbError(message)) {
          return jsonResponse(
            {
              error: code,
              message,
              pmSeatLimit: seatLimits.pmSeatLimit,
              workerSeatLimit: seatLimits.workerSeatLimit,
            },
            409,
          );
        }
        throw profileError;
      }
    }

    if (!userId) {
      return jsonResponse({ error: "create_user_failed" }, 500);
    }

    // Post-write verify closes concurrent-invite races (count→create→count).
    const postCheck = await assertSeatAvailableAfterWrite(
      adminClient,
      companyId,
      seatType,
      seatRules,
      seatLimits,
    );
    if (!postCheck.ok) {
      if (createdFreshAuthUser) {
        await deleteInviteUser(adminClient, userId);
      } else {
        // Existing email path: do not delete; leave profile but report limit.
      }
      const detail =
        postCheck.error === "pm_seat_limit"
          ? `PM seat limit reached (${postCheck.pmCount}/${seatLimits.pmSeatLimit}). Add a PM seat to invite more.`
          : `Worker seat limit reached (${postCheck.workerCount}/${seatLimits.workerSeatLimit}). Add a worker seat to invite more.`;
      return jsonResponse(
        {
          error: postCheck.error,
          message: detail,
          pmCount: postCheck.pmCount,
          workerCount: postCheck.workerCount,
          pmSeatLimit: seatLimits.pmSeatLimit,
          workerSeatLimit: seatLimits.workerSeatLimit,
        },
        409,
      );
    }

    const minted = await mintSignInLink(adminClient, supabaseUrl, email, userId);
    if (!minted.signInLink) {
      if (createdFreshAuthUser) {
        await deleteInviteUser(adminClient, userId);
      }
      return jsonResponse({ error: minted.error || "invite_link_failed" }, 500);
    }

    return jsonResponse({
      userId,
      email,
      signInLink: minted.signInLink,
      seatType,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    return jsonResponse({ error: message }, 500);
  }
});
