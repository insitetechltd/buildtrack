import { supabase } from "./supabase";

export type UpdateCompanyAddonsInput = {
  companyId: string;
  addonWorkerPacks: number;
  addonPmSeats: number;
};

export type UpdateCompanyAddonsResult = {
  success: boolean;
  error?: string;
};

const CHECKOUT_ERROR_LABELS: Record<string, string> = {
  not_authenticated: "Sign in again, then retry.",
  caller_profile_not_found: "Your profile could not be loaded.",
  caller_pending: "Your account is still pending approval.",
  company_mismatch: "Request company does not match your account.",
  not_company_admin: "Only a company admin can change add-ons.",
  subscription_missing: "Subscription missing for this company. Try again later.",
  addon_tier_not_found: "Requested add-on is not available right now.",
};

async function readFunctionsErrorMessage(
  error: { message?: string; context?: unknown },
  data: unknown,
): Promise<string | null> {
  if (typeof data === "object" && data && "error" in data) {
    const code = String((data as { error?: string }).error || "");
    const message = (data as { message?: string }).message;
    if (typeof message === "string" && message) return message;
    if (code && CHECKOUT_ERROR_LABELS[code]) return CHECKOUT_ERROR_LABELS[code];
    if (code) return code;
  }

  const context = (error as { context?: Response | { json?: () => Promise<unknown> } })
    ?.context;
  if (context && typeof (context as Response).json === "function") {
    try {
      const body = await (context as Response).json();
      if (body && typeof body === "object" && "error" in (body as object)) {
        const code = String((body as { error?: string }).error || "");
        if (code && CHECKOUT_ERROR_LABELS[code]) return CHECKOUT_ERROR_LABELS[code];
        if (code) return code;
      }
    } catch {
      // ignore parse failures
    }
  }

  if (error.message) {
    return error.message;
  }

  return null;
}

export async function updateCompanyAddons(
  input: UpdateCompanyAddonsInput,
): Promise<UpdateCompanyAddonsResult> {
  if (!supabase) {
    return { success: false, error: "Supabase not configured" };
  }

  const { data, error } = await supabase.functions.invoke("update-company-addons", {
    body: input,
  });

  if (error) {
    const message =
      (await readFunctionsErrorMessage(error, data)) || "Add-on update failed";
    return { success: false, error: message };
  }

  if (!data || typeof data !== "object") {
    return { success: false, error: "Add-on update returned empty response" };
  }

  const payload = data as { success?: boolean; error?: string };
  if (payload.success === true) {
    return { success: true };
  }

  return {
    success: false,
    error: payload.error || "Add-on update failed",
  };
}

