import { supabase } from "./supabase";

export type InviteSeatType = "pm" | "worker";

export interface InviteUserInput {
  companyId: string;
  name: string;
  email: string;
  seatType: InviteSeatType;
}

export interface InviteUserResult {
  success: boolean;
  userId?: string;
  email?: string;
  signInLink?: string;
  seatType?: InviteSeatType;
  error?: string;
}

const EMAIL_RE = /\S+@\S+\.\S+/;

const INVITE_ERROR_LABELS: Record<string, string> = {
  invalid_email: "Enter a full email address (e.g. name@company.com)",
  invalid_payload: "Name and email are required",
  not_authenticated: "Sign in again, then retry the invite",
  caller_profile_not_found: "Your profile could not be loaded for invite",
  caller_pending: "Your account is still pending approval",
  company_mismatch: "Invite company does not match your account",
  not_company_admin: "Only a company admin can invite teammates",
  pm_seat_limit: "PM seat limit reached",
  worker_seat_limit: "Worker seat limit reached",
  user_not_found: "That teammate was not found in your company",
};

async function readFunctionsErrorMessage(
  error: { message?: string; context?: unknown },
  data: unknown,
): Promise<string | null> {
  if (typeof data === "object" && data && "error" in data) {
    const code = String((data as { error?: string }).error || "");
    const message = (data as { message?: string }).message;
    if (message) return message;
    if (code && INVITE_ERROR_LABELS[code]) return INVITE_ERROR_LABELS[code];
    if (code) return code;
  }

  const context = (error as { context?: Response | { json?: () => Promise<unknown> } })
    ?.context;
  if (context && typeof (context as Response).json === "function") {
    try {
      const body = await (context as Response).json();
      if (body && typeof body === "object") {
        const code = String((body as { error?: string }).error || "");
        const message = (body as { message?: string }).message;
        if (message) return message;
        if (code && INVITE_ERROR_LABELS[code]) return INVITE_ERROR_LABELS[code];
        if (code) return code;
      }
    } catch {
      // ignore parse failures; fall through
    }
  }

  if (
    error.message &&
    !/non-2xx status code/i.test(error.message)
  ) {
    return error.message;
  }

  return null;
}

/** Invokes the invite-user Edge Function (service role stays on server). */
export async function inviteCompanyUser(
  input: InviteUserInput,
): Promise<InviteUserResult> {
  if (!supabase) {
    return { success: false, error: "Supabase not configured" };
  }

  const email = input.email.trim().toLowerCase();
  if (!EMAIL_RE.test(email)) {
    return {
      success: false,
      error: INVITE_ERROR_LABELS.invalid_email,
    };
  }

  const { data, error } = await supabase.functions.invoke("invite-user", {
    body: {
      companyId: input.companyId,
      name: input.name.trim(),
      email,
      seatType: input.seatType,
    },
  });

  if (error) {
    const message =
      (await readFunctionsErrorMessage(error, data)) || "Invite failed";
    return { success: false, error: message };
  }

  if (!data || typeof data !== "object") {
    return { success: false, error: "Invite returned empty response" };
  }

  const payload = data as {
    error?: string;
    message?: string;
    userId?: string;
    email?: string;
    signInLink?: string;
    seatType?: InviteSeatType;
  };

  if (payload.error) {
    return {
      success: false,
      error:
        payload.message ||
        INVITE_ERROR_LABELS[payload.error] ||
        payload.error,
    };
  }

  if (!payload.signInLink || !payload.userId) {
    return { success: false, error: "Invite did not return a sign-in link" };
  }

  return {
    success: true,
    userId: payload.userId,
    email: payload.email,
    signInLink: payload.signInLink,
    seatType: payload.seatType,
  };
}

export interface CopyInviteLinkInput {
  companyId: string;
  email: string;
}

/** Mints a fresh invite URL for an existing teammate and returns it for clipboard copy. */
export async function copyCompanyInviteLink(
  input: CopyInviteLinkInput,
): Promise<InviteUserResult> {
  if (!supabase) {
    return { success: false, error: "Supabase not configured" };
  }

  const email = input.email.trim().toLowerCase();
  if (!EMAIL_RE.test(email)) {
    return {
      success: false,
      error: INVITE_ERROR_LABELS.invalid_email,
    };
  }

  const { data, error } = await supabase.functions.invoke("invite-user", {
    body: {
      copyLink: true,
      companyId: input.companyId,
      email,
    },
  });

  if (error) {
    const message =
      (await readFunctionsErrorMessage(error, data)) || "Could not copy invite link";
    return { success: false, error: message };
  }

  if (!data || typeof data !== "object") {
    return { success: false, error: "Invite returned empty response" };
  }

  const payload = data as {
    error?: string;
    message?: string;
    userId?: string;
    email?: string;
    signInLink?: string;
  };

  if (payload.error) {
    return {
      success: false,
      error:
        payload.message ||
        INVITE_ERROR_LABELS[payload.error] ||
        payload.error,
    };
  }

  if (!payload.signInLink) {
    return { success: false, error: "Invite did not return a sign-in link" };
  }

  return {
    success: true,
    userId: payload.userId,
    email: payload.email,
    signInLink: payload.signInLink,
  };
}
