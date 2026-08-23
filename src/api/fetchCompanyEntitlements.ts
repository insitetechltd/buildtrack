import { supabase } from "./supabase";
import {
  buildCompanyEntitlementView,
  type CompanyEntitlementRow,
  type CompanyEntitlementView,
  type CompanySubscriptionRow,
} from "@/billing/companyEntitlementSummary";

export async function fetchCompanyEntitlementView(
  companyId: string,
): Promise<CompanyEntitlementView | null> {
  if (!supabase || !companyId) {
    return null;
  }

  const { data: entitlements, error: entitlementsError } = await supabase
    .from("company_entitlements")
    .select(
      "pm_seat_limit, worker_seat_limit, project_limit, entries_limit, entries_limit_kind, storage_limit_bytes, subscription_status, billing_phase, source_plan_price_id",
    )
    .eq("company_id", companyId)
    .maybeSingle();

  if (entitlementsError || !entitlements) {
    return null;
  }

  const { data: subscription, error: subscriptionError } = await supabase
    .from("company_subscriptions")
    .select(
      "stripe_subscription_id, status, trial_ends_at, locked_plan_price_id, plan_prices:locked_plan_price_id ( plan_tiers:plan_tier_id ( slug, display_name, kind ) )",
    )
    .eq("company_id", companyId)
    .maybeSingle();

  if (subscriptionError) {
    return buildCompanyEntitlementView(
      entitlements as CompanyEntitlementRow,
      null,
    );
  }

  return buildCompanyEntitlementView(
    entitlements as CompanyEntitlementRow,
    subscription as CompanySubscriptionRow | null,
  );
}
