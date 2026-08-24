import AsyncStorage from "@react-native-async-storage/async-storage";

import { normalizePlanTierSlug, type PlanTierSlug } from "./planCatalog";

const PLAN_STORAGE_KEY = "insite:last-checkout-plan";
const PRICE_STORAGE_KEY = "insite:last-checkout-plan-price-id";

let rememberedCheckoutPlan: PlanTierSlug | null = null;
let rememberedCheckoutPlanPriceId: string | null = null;

export type RememberedCheckoutSelection = {
  plan: PlanTierSlug;
  planPriceId: string | null;
};

export function rememberCheckoutPlan(
  plan: PlanTierSlug | null | undefined,
  planPriceId?: string | null,
): void {
  rememberedCheckoutPlan = normalizePlanTierSlug(plan);
  rememberedCheckoutPlanPriceId = planPriceId?.trim() || null;

  if (rememberedCheckoutPlan) {
    void AsyncStorage.setItem(PLAN_STORAGE_KEY, rememberedCheckoutPlan);
    if (rememberedCheckoutPlanPriceId) {
      void AsyncStorage.setItem(PRICE_STORAGE_KEY, rememberedCheckoutPlanPriceId);
    } else {
      void AsyncStorage.removeItem(PRICE_STORAGE_KEY);
    }
  } else {
    void AsyncStorage.removeItem(PLAN_STORAGE_KEY);
    void AsyncStorage.removeItem(PRICE_STORAGE_KEY);
  }
}

export function peekRememberedCheckoutPlan(): RememberedCheckoutSelection | null {
  if (!rememberedCheckoutPlan) {
    return null;
  }
  return {
    plan: rememberedCheckoutPlan,
    planPriceId: rememberedCheckoutPlanPriceId,
  };
}

export function takeRememberedCheckoutPlan(): RememberedCheckoutSelection | null {
  const selection = peekRememberedCheckoutPlan();
  rememberedCheckoutPlan = null;
  rememberedCheckoutPlanPriceId = null;
  return selection;
}

export function clearRememberedCheckoutPlan(): void {
  rememberedCheckoutPlan = null;
  rememberedCheckoutPlanPriceId = null;
  void AsyncStorage.removeItem(PLAN_STORAGE_KEY);
  void AsyncStorage.removeItem(PRICE_STORAGE_KEY);
}

export async function resolveCheckoutReturnPlan(
  routePlan: string | null | undefined,
): Promise<PlanTierSlug | null> {
  const fromRoute = normalizePlanTierSlug(routePlan);
  if (fromRoute) {
    return fromRoute;
  }

  const fromMemory = peekRememberedCheckoutPlan();
  if (fromMemory?.plan) {
    return fromMemory.plan;
  }

  try {
    return normalizePlanTierSlug(await AsyncStorage.getItem(PLAN_STORAGE_KEY));
  } catch {
    return null;
  }
}

export function appendCheckoutPlanToSuccessUrl(
  successUrl: string,
  plan: PlanTierSlug,
  planPriceId?: string | null,
): string {
  let url = successUrl;
  if (!/[?&]plan=/.test(url)) {
    const joiner = url.includes("?") ? "&" : "?";
    url = `${url}${joiner}plan=${encodeURIComponent(plan)}`;
  }
  if (planPriceId && !/[?&]planPriceId=/.test(url)) {
    const joiner = url.includes("?") ? "&" : "?";
    url = `${url}${joiner}planPriceId=${encodeURIComponent(planPriceId)}`;
  }
  return url;
}

export function parseCheckoutPlanParam(
  value: string | null | undefined,
): PlanTierSlug | null {
  return normalizePlanTierSlug(value);
}

export function parseCheckoutPlanPriceIdParam(
  value: string | null | undefined,
): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}
