import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Linking, Text, View } from "react-native";

import { fetchCompanyEntitlementView } from "@/api/fetchCompanyEntitlements";
import { companyHasPaidStripePlan } from "@/billing/companyPlanGate";
import { parseCheckoutPlanParam } from "@/billing/checkoutReturnPlan";
import type { PlanTierSlug } from "@/billing/planCatalog";
import CompanyPlanScreen from "@/screens/CompanyPlanScreen";
import { useAuthStore } from "@/state/authStore";

function parseCheckoutLink(
  url: string | null | undefined,
): {
  checkoutResult?: "success" | "cancel";
  checkoutPlan?: PlanTierSlug;
} {
  if (!url) {
    return {};
  }
  const normalized = url.replace(/^[^:]+:\/\//, "");
  const queryStart = normalized.indexOf("?");
  if (queryStart === -1) {
    return {};
  }
  const params = new URLSearchParams(normalized.slice(queryStart + 1));
  const checkout = params.get("checkout");
  const checkoutPlan = parseCheckoutPlanParam(params.get("plan")) ?? undefined;
  if (checkout === "success") {
    return {
      checkoutResult: "success",
      ...(checkoutPlan ? { checkoutPlan } : {}),
    };
  }
  if (checkout === "cancel") {
    return { checkoutResult: "cancel" };
  }
  return {};
}

export default function CompanyPlanSelectionGate() {
  const user = useAuthStore((state) => state.user);
  const clearRequiresCompanyPlanSelection = useAuthStore(
    (state) => state.clearRequiresCompanyPlanSelection,
  );
  const [checkoutParams, setCheckoutParams] = useState(() =>
    parseCheckoutLink(null),
  );
  const [isCheckingEntitlement, setIsCheckingEntitlement] = useState(true);

  const verifySubscription = useCallback(async () => {
    if (!user?.companyId) {
      setIsCheckingEntitlement(false);
      return;
    }
    const view = await fetchCompanyEntitlementView(user.companyId);
    if (companyHasPaidStripePlan(view)) {
      clearRequiresCompanyPlanSelection();
    }
    setIsCheckingEntitlement(false);
  }, [clearRequiresCompanyPlanSelection, user?.companyId]);

  useEffect(() => {
    void verifySubscription();
  }, [verifySubscription]);

  useEffect(() => {
    void Linking.getInitialURL().then((url) => {
      const parsed = parseCheckoutLink(url);
      if (parsed.checkoutResult) {
        setCheckoutParams(parsed);
      }
    });
    const subscription = Linking.addEventListener("url", ({ url }) => {
      const parsed = parseCheckoutLink(url);
      if (parsed.checkoutResult) {
        setCheckoutParams(parsed);
      }
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (!user?.companyId) {
      return;
    }
    const intervalId = setInterval(() => {
      void verifySubscription();
    }, 3000);
    return () => clearInterval(intervalId);
  }, [user?.companyId, verifySubscription]);

  if (isCheckingEntitlement && !checkoutParams.checkoutResult) {
    return (
      <View
        testID="company-plan-selection-gate-loading"
        className="flex-1 items-center justify-center bg-[#E7F4F8]"
      >
        <ActivityIndicator size="large" color="#08576E" />
        <Text className="mt-4 text-base text-gray-600">Loading plans…</Text>
      </View>
    );
  }

  return (
    <CompanyPlanScreen
      forceSelection
      checkoutResult={checkoutParams.checkoutResult}
      checkoutPlan={checkoutParams.checkoutPlan}
    />
  );
}
