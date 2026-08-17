// Corp RC: company admin invites a seat and gets a first-sign-in deep link.
// Temp passwords are generated only as an internal Auth credential and are not
// shown. Email + temp-password invite returns after RC.
// Deploy: Human Gate — Dashboard paste or `supabase functions deploy invite-user`.
// Soft seat limits match R6 paper defaults (1 PM + 5 workers) until Stripe/R13.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type SeatType = "pm" | "worker";

const PM_SEAT_LIMIT = 1;
const WORKER_SEAT_LIMIT = 5;

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

function isPmRole(role: string | null | undefined): boolean {
  const value = (role || "").toLowerCase();
  return (
    value === "admin" ||
    value === "company_admin" ||
    value === "manager" ||
    value === "supervisor"
  );
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

    let companyUsers: Array<{
      id: string;
      role?: string | null;
      system_permission?: string | null;
    }> = [];
    {
      const rolePath = await adminClient
        .from("users")
        .select("id, role")
        .eq("company_id", companyId);
      if (!rolePath.error) {
        companyUsers = rolePath.data || [];
      } else {
        const sysPath = await adminClient
          .from("users")
          .select("id, system_permission")
          .eq("company_id", companyId);
        if (sysPath.error) {
          return jsonResponse({ error: sysPath.message }, 500);
        }
        companyUsers = sysPath.data || [];
      }
    }

    const activeUsers = companyUsers;
    const pmCount = activeUsers.filter((u) =>
      isPmRole(u.system_permission || u.role),
    ).length;
    const workerCount = activeUsers.length - pmCount;

    if (seatType === "pm" && pmCount >= PM_SEAT_LIMIT) {
      return jsonResponse(
        {
          error: "pm_seat_limit",
          message: `PM seat limit reached (${PM_SEAT_LIMIT}). Add a PM seat add-on later.`,
        },
        409,
      );
    }
    if (seatType === "worker" && workerCount >= WORKER_SEAT_LIMIT) {
      return jsonResponse(
        {
          error: "worker_seat_limit",
          message: `Worker seat limit reached (${WORKER_SEAT_LIMIT}). Add a worker pack later.`,
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

      const missingColumn = (message: string | undefined) =>
        /must_set_password|42703|PGRST204/i.test(message || "");

      const upsertProfile = async (row: Record<string, unknown>) => {
        const { error: upsertRoleError } = await adminClient.from("users").upsert(
          { ...row, role: inviteRole },
          { onConflict: "id" },
        );
        if (!upsertRoleError) {
          return { error: null as { message?: string } | null };
        }
        if (missingColumn(upsertRoleError.message)) {
          return { error: upsertRoleError };
        }
        const { error: sysError } = await adminClient.from("users").upsert(
          { ...row, system_permission: inviteSystemPermission },
          { onConflict: "id" },
        );
        return { error: sysError };
      };

      const withFlag = await upsertProfile({ ...patch, must_set_password: true });
      if (withFlag.error && missingColumn(withFlag.error.message)) {
        await upsertProfile(patch);
      }
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
