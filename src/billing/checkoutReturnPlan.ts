import AsyncStorage from "@react-native-async-storage/async-storage";

import type { OrgCheckoutPlanTierSlug } from "./orgPlans";
import { parseBaseTierSlug } from "./companyEntitlementSummary";

const STORAGE_KEY = "insite:last-checkout-plan";

let rememberedCheckoutPlan: OrgCheckoutPlanTierSlug | null = null;

export function rememberCheckoutPlan(
  plan: OrgCheckoutPlanTierSlug | null | undefined,
): void {
  rememberedCheckoutPlan = parseBaseTierSlug(plan);
  if (rememberedCheckoutPlan) {
    void AsyncStorage.setItem(STORAGE_KEY, rememberedCheckoutPlan);
  } else {
    void AsyncStorage.removeItem(STORAGE_KEY);
  }
}

export function peekRememberedCheckoutPlan(): OrgCheckoutPlanTierSlug | null {
  return rememberedCheckoutPlan;
}

export function takeRememberedCheckoutPlan(): OrgCheckoutPlanTierSlug | null {
  const plan = rememberedCheckoutPlan;
  rememberedCheckoutPlan = null;
  return plan;
}

export function clearRememberedCheckoutPlan(): void {
  rememberedCheckoutPlan = null;
  void AsyncStorage.removeItem(STORAGE_KEY);
}

export async function resolveCheckoutReturnPlan(
  routePlan: string | null | undefined,
): Promise<OrgCheckoutPlanTierSlug | null> {
  const fromRoute = parseBaseTierSlug(routePlan);
  if (fromRoute) {
    return fromRoute;
  }

  const fromMemory = peekRememberedCheckoutPlan();
  if (fromMemory) {
    return fromMemory;
  }

  try {
    return parseBaseTierSlug(await AsyncStorage.getItem(STORAGE_KEY));
  } catch {
    return null;
  }
}

export function appendCheckoutPlanToSuccessUrl(
  successUrl: string,
  plan: OrgCheckoutPlanTierSlug,
): string {
  if (/[?&]plan=/.test(successUrl)) {
    return successUrl;
  }
  const joiner = successUrl.includes("?") ? "&" : "?";
  return `${successUrl}${joiner}plan=${encodeURIComponent(plan)}`;
}

export function parseCheckoutPlanParam(
  value: string | null | undefined,
): OrgCheckoutPlanTierSlug | null {
  return parseBaseTierSlug(value);
}
