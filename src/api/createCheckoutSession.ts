import { supabase } from "./supabase";

export type CheckoutPlanTierSlug = "growth" | "unlimited";

export interface CreateCheckoutSessionInput {
  companyId: string;
  planTierSlug: CheckoutPlanTierSlug;
}

export interface CreateCheckoutSessionResult {
  success: boolean;
  url?: string;
  sessionId?: string;
  planPriceId?: string;
  upgraded?: boolean;
  planTierSlug?: CheckoutPlanTierSlug;
  error?: string;
}

const CHECKOUT_ERROR_LABELS: Record<string, string> = {
  invalid_payload: "Choose Growth or Unlimited to continue",
  not_authenticated: "Sign in again, then retry checkout",
  caller_profile_not_found: "Your profile could not be loaded for checkout",
  caller_pending: "Your account is still pending approval",
  company_mismatch: "Checkout company does not match your account",
  not_company_admin: "Only a company admin can start checkout",
  plan_not_found: "That plan is not available right now",
  plan_lookup_failed: "Could not load plan pricing",
  checkout_url_missing: "Stripe did not return a checkout URL",
  already_subscribed: "Your company is already on that plan",
  downgrade_not_supported:
    "Downgrades are not self-serve yet. Contact support to change plans.",
  subscription_item_missing:
    "Could not locate your Stripe subscription item for upgrade",
};

async function readFunctionsErrorMessage(
  error: { message?: string; context?: unknown },
  data: unknown,
): Promise<string | null> {
  if (typeof data === "object" && data && "error" in data) {
    const code = String((data as { error?: string }).error || "");
    const message = (data as { message?: string }).message;
    if (message) return message;
    if (code && CHECKOUT_ERROR_LABELS[code]) return CHECKOUT_ERROR_LABELS[code];
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
        if (code && CHECKOUT_ERROR_LABELS[code]) return CHECKOUT_ERROR_LABELS[code];
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

/** Creates a Stripe Checkout Session with native trial + billing metadata. */
export async function createCompanyCheckoutSession(
  input: CreateCheckoutSessionInput,
): Promise<CreateCheckoutSessionResult> {
  if (!supabase) {
    return { success: false, error: "Supabase not configured" };
  }

  const { data, error } = await supabase.functions.invoke(
    "create-checkout-session",
    {
      body: {
        companyId: input.companyId,
        planTierSlug: input.planTierSlug,
      },
    },
  );

  if (error) {
    const message =
      (await readFunctionsErrorMessage(error, data)) || "Checkout failed";
    return { success: false, error: message };
  }

  if (!data || typeof data !== "object") {
    return { success: false, error: "Checkout returned empty response" };
  }

  const payload = data as {
    error?: string;
    message?: string;
    url?: string;
    sessionId?: string;
    planPriceId?: string;
    upgraded?: boolean;
    planTierSlug?: CheckoutPlanTierSlug;
  };

  if (payload.error) {
    return {
      success: false,
      error:
        payload.message ||
        CHECKOUT_ERROR_LABELS[payload.error] ||
        payload.error,
    };
  }

  if (payload.upgraded) {
    return {
      success: true,
      upgraded: true,
      planTierSlug: payload.planTierSlug,
      planPriceId: payload.planPriceId,
    };
  }

  if (!payload.url) {
    return { success: false, error: "Checkout did not return a URL" };
  }

  return {
    success: true,
    url: payload.url,
    sessionId: payload.sessionId,
    planPriceId: payload.planPriceId,
  };
}
