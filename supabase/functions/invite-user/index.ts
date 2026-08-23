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

async function loadSeatLimits(
  adminClient: ReturnType<typeof createClient>,
  companyId: string,
): Promise<{ pmSeatLimit: number; workerSeatLimit: number } | null> {
  const { data, error } = await adminClient
    .from("company_entitlements")
    .select("pm_seat_limit, worker_seat_limit")
    .eq("company_id", companyId)
    .maybeSingle();

  if (error) {
    if (/42703|PGRST204|does not exist/i.test(error.message || "")) {
      return null;
    }
    throw error;
  }

  if (!data) return null;

  return {
    pmSeatLimit: data.pm_seat_limit as number,
    workerSeatLimit: data.worker_seat_limit as number,
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
  const activeUsers = users.filter((user) => user.is_pending !== true);
  let pmCount = 0;
  let workerCount = 0;

  for (const user of activeUsers) {
    const roleKey = (user.system_permission || user.role || "").toLowerCase();
    if (!roleKey) continue;

    const rule = rulesByKey?.get(roleKey);
    if (rule) {
      if (rule.is_seat_exempt) continue;
      if (rule.consumes_pm_seats) {
        pmCount += 1;
        continue;
      }
      if (rule.consumes_worker_seats) {
        workerCount += 1;
      }
      continue;
    }

    // Pre-BILL-D fallback when seat_class_rules is unavailable.
    if (
      roleKey === "admin" ||
      roleKey === "company_admin"
    ) {
      continue;
    }
    if (legacyPmRole(roleKey)) {
      pmCount += 1;
    } else if (legacyWorkerRole(roleKey)) {
      workerCount += 1;
    } else {
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

  if (!isMissingColumnError(roleError.message)) {
    const { error: sysError } = await adminClient.from("users").upsert(
      { ...patch, id: userId, system_permission: inviteSystemPermission },
      { onConflict: "id" },
    );
    if (sysError) {
      throw sysError;
    }
    return;
  }

  throw roleError;
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
        .select("id, role, is_pending")
        .eq("company_id", companyId);
      if (!rolePath.error) {
        companyUsers = rolePath.data || [];
      } else {
        const sysPath = await adminClient
          .from("users")
          .select("id, system_permission, is_pending")
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
            `PM seat limit reached (${pmSeatLimit}). Add a PM seat add-on to invite more.`,
        },
        409,
      );
    }
    if (seatType === "worker" && workerCount >= workerSeatLimit) {
      return jsonResponse(
        {
          error: "worker_seat_limit",
          message:
            `Worker seat limit reached (${workerSeatLimit}). Add a worker pack to invite more.`,
        },
        409,
      );
    }

    const tempPassword = generateTempPassword();
    const inviteRole = seatType === "pm" ? "manager" : "worker";
    const inviteSystemPermission = seatType === "pm" ? "manager" : "member";

    let userId: string | null = null;

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

      await upsertInviteProfile(
        adminClient,
        userId,
        existingPatch,
        inviteRole,
        inviteSystemPermission,
      );
      await markMustSetPassword(adminClient, userId);
    } else {
      userId = created.user.id;

      const patch: Record<string, unknown> = {
        id: userId,
        name,
        email,
        phone: "",
        company_id: companyId,
        is_pending: false,
        position: seatType === "pm" ? "Project Manager" : "Worker",
      };

      await upsertInviteProfile(
        adminClient,
        userId,
        patch,
        inviteRole,
        inviteSystemPermission,
      );
      await markMustSetPassword(adminClient, userId);
    }

    if (!userId) {
      return jsonResponse({ error: "create_user_failed" }, 500);
    }

    const minted = await mintSignInLink(adminClient, supabaseUrl, email, userId);
    if (!minted.signInLink) {
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
