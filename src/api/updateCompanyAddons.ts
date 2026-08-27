import { supabase } from "./supabase";

export type UpdateCompanyAddonsInput = {
  companyId: string;
  addonWorkerPacks: number;
  addonPmSeats: number;
};

export type ReconcileCompanyAddonsInput = {
  companyId: string;
  reconcileOnly: true;
};

export type UpdateCompanyAddonsResult = {
  success: boolean;
  error?: string;
  /** True when a mid-cycle remove was scheduled for period end (no refund). */
  deferredDecrease?: boolean;
  effectiveAt?: string | null;
  reconciledWorkerQty?: number;
  reconciledPmQty?: number;
  stripeConfirmation?: import("@/billing/seatAddonCopy").StripeAddonConfirmation | null;
};

const CHECKOUT_ERROR_LABELS: Record<string, string> = {
  not_authenticated: "Sign in again, then retry.",
  caller_profile_not_found: "Your profile could not be loaded.",
  caller_pending: "Your account is still pending approval.",
  company_mismatch: "Request company does not match your account.",
  not_company_admin: "Only a company admin can change add-ons.",
  subscription_missing:
    "Subscribe to a company plan first, then add PM or worker seats.",
  subscription_missing_period_end:
    "Could not determine your billing period end. Try again, or email support.",
  addon_tier_not_found: "Requested add-on is not available right now.",
  addon_payment_incomplete:
    "Stripe needs payment before extra seats activate. Complete the open invoice, then pull to refresh.",
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

  const payload = data as {
    success?: boolean;
    error?: string;
    message?: string;
    deferredDecrease?: boolean;
    effectiveAt?: string | null;
    stripeConfirmation?: UpdateCompanyAddonsResult["stripeConfirmation"];
  };
  if (payload.success === true) {
    return {
      success: true,
      deferredDecrease: Boolean(payload.deferredDecrease),
      effectiveAt: payload.effectiveAt ?? null,
      stripeConfirmation: payload.stripeConfirmation ?? null,
    };
  }

  const code = payload.error || "";
  const mapped =
    (typeof payload.message === "string" && payload.message) ||
    (code && CHECKOUT_ERROR_LABELS[code]) ||
    code ||
    "Add-on update failed";

  return {
    success: false,
    error: mapped,
  };
}

/** Rebuild seat meters from live Stripe addon qty (no charge). */
export async function reconcileCompanyAddonsFromStripe(
  companyId: string,
): Promise<UpdateCompanyAddonsResult> {
  if (!supabase) {
    return { success: false, error: "Supabase not configured" };
  }

  const { data, error } = await supabase.functions.invoke("update-company-addons", {
    body: { companyId, reconcileOnly: true } satisfies ReconcileCompanyAddonsInput,
  });

  if (error) {
    const message =
      (await readFunctionsErrorMessage(error, data)) || "Seat reconcile failed";
    return { success: false, error: message };
  }

  if (!data || typeof data !== "object") {
    return { success: false, error: "Seat reconcile returned empty response" };
  }

  const payload = data as {
    success?: boolean;
    error?: string;
    message?: string;
    reconciledWorkerQty?: number;
    reconciledPmQty?: number;
  };
  if (payload.success === true) {
    return {
      success: true,
      deferredDecrease: false,
      reconciledWorkerQty: payload.reconciledWorkerQty,
      reconciledPmQty: payload.reconciledPmQty,
    };
  }

  const code = payload.error || "";
  return {
    success: false,
    error:
      (typeof payload.message === "string" && payload.message) ||
      (code && CHECKOUT_ERROR_LABELS[code]) ||
      code ||
      "Seat reconcile failed",
  };
}

