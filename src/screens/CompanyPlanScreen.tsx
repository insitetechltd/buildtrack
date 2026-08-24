import React from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";

import ModernScreenHeader from "../components/ModernScreenHeader";
import BrandHeaderTitle from "../components/BrandHeaderTitle";
import { cn } from "../utils/cn";
import { useTranslation } from "../utils/useTranslation";
import type {
  CompanyPlanOptionModel,
  CompanyPlanStatusBannerModel,
} from "../ui/contracts/viewAdapters";
import {
  useCompanyPlanViewAdapter,
  type CompanyPlanViewAdapterProps,
} from "../ui/viewAdapters/useCompanyPlanViewAdapter";

type CompanyPlanScreenProps = CompanyPlanViewAdapterProps;

function StatusBanner({
  banner,
  onDismiss,
}: {
  banner: CompanyPlanStatusBannerModel;
  onDismiss: () => void;
}) {
  const toneStyles =
    banner.tone === "success"
      ? "border-green-200 bg-green-50"
      : banner.tone === "error"
        ? "border-red-200 bg-red-50"
        : "border-blue-200 bg-blue-50";

  const textStyles =
    banner.tone === "success"
      ? "text-green-900"
      : banner.tone === "error"
        ? "text-red-900"
        : "text-blue-900";

  return (
    <View
      testID="company-plan-status-banner"
      className={cn("mx-6 mt-4 rounded-xl border p-4", toneStyles)}
    >
      <View className="flex-row items-start">
        <Text className={cn("flex-1 text-base leading-6", textStyles)}>
          {banner.message}
        </Text>
        <Pressable
          testID="company-plan-status-banner-dismiss"
          onPress={onDismiss}
          hitSlop={8}
          className="ml-2"
        >
          <Ionicons name="close" size={20} color="#6b7280" />
        </Pressable>
      </View>
    </View>
  );
}

function PlanOptionCard({
  option,
  isLoading,
  onPress,
}: {
  option: CompanyPlanOptionModel;
  isLoading: boolean;
  onPress: () => void;
}) {
  const isCurrent = option.state === "current";

  return (
    <View
      testID={`company-plan-option-${option.id}`}
      className={cn(
        "rounded-xl border bg-white p-4",
        isCurrent ? "border-blue-500 bg-blue-50" : "border-gray-200",
      )}
    >
      <View className="mb-2 flex-row items-start justify-between">
        <View className="flex-1 pr-3">
          <Text className="text-xl font-semibold text-gray-900">{option.title}</Text>
          <Text className="mt-1 text-lg font-medium text-blue-700">{option.priceLabel}</Text>
        </View>
        {isCurrent ? (
          <View className="rounded-full bg-blue-600 px-3 py-1">
            <Text className="text-xs font-semibold uppercase text-white">Current</Text>
          </View>
        ) : null}
      </View>

      <Text className="text-base leading-6 text-gray-600">{option.summary}</Text>

      <Pressable
        testID={`company-plan-action-${option.id}`}
        disabled={option.disabled}
        onPress={onPress}
        className={cn(
          "mt-4 flex-row items-center justify-center rounded-lg py-3",
          option.disabled ? "bg-gray-200" : "bg-blue-600",
        )}
      >
        {isLoading ? (
          <ActivityIndicator color={option.disabled ? "#6b7280" : "#ffffff"} />
        ) : (
          <Text
            className={cn(
              "text-base font-semibold",
              option.disabled ? "text-gray-500" : "text-white",
            )}
          >
            {option.actionLabel}
          </Text>
        )}
      </Pressable>
    </View>
  );
}

export default function CompanyPlanScreen(props: CompanyPlanScreenProps) {
  const { onNavigateBack, forceSelection } = props;
  const t = useTranslation();
  const { output, actions } = useCompanyPlanViewAdapter(props);

  if (!output.readiness.hasUsableData && output.isLoading) {
    return (
      <SafeAreaView edges={["bottom", "left", "right"]} className="flex-1 bg-[#E7F4F8]">
        <StatusBar style="light" />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#08576E" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["bottom", "left", "right"]} className="flex-1 bg-[#E7F4F8]">
      <StatusBar style="light" />

      <ModernScreenHeader
        title={t.profile.companyPlan}
        titleNode={<BrandHeaderTitle subtitle={t.profile.companyPlan} />}
        showBackButton={!forceSelection}
        onBackPress={forceSelection ? undefined : onNavigateBack}
        className="border-b-0 bg-[#08576E] pb-2"
      />

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={output.isRefreshing}
            onRefresh={() => {
              void actions.handleRefresh();
            }}
          />
        }
      >
        {forceSelection ? (
          <View
            testID="company-plan-force-selection-banner"
            className="mx-6 mt-4 rounded-xl border border-[#08576E]/20 bg-white p-4"
          >
            <Text className="text-base font-semibold text-gray-900">
              Choose a company plan to continue
            </Text>
            <Text className="mt-2 text-base leading-6 text-gray-600">
              Subscribe to {output.offeredPlanNames} to use Taskr. You can apply a
              promotion code at checkout.
            </Text>
          </View>
        ) : null}

        {output.statusBanner ? (
          <StatusBanner
            banner={output.statusBanner}
            onDismiss={actions.dismissStatusBanner}
          />
        ) : null}

        <View className={cn("mx-6 mt-4", output.statusBanner && "mt-2")}>
          <Text className="mb-2 text-xl font-semibold text-gray-900">Current plan</Text>
          <View className="rounded-xl border border-gray-200 bg-white p-4">
            {output.currentPlan ? (
              <>
                <Text
                  testID="company-plan-current-tier"
                  className="text-2xl font-bold text-gray-900"
                >
                  {output.currentPlan.tierName}
                </Text>
                <Text className="mt-1 text-base text-gray-600">
                  Subscription status: {output.currentPlan.statusLabel}
                </Text>
                {output.currentPlan.trialEndsLabel ? (
                  <Text
                    testID="company-plan-trial-ends"
                    className="mt-1 text-base text-gray-600"
                  >
                    Trial ends: {output.currentPlan.trialEndsLabel}
                  </Text>
                ) : null}
                <View className="mt-4 border-t border-gray-100 pt-4">
                  {output.currentPlan.limitRows.map((row, index) => (
                    <View
                      key={row.id}
                      className={cn(
                        "flex-row items-center justify-between py-2",
                        index > 0 && "border-t border-gray-100",
                      )}
                    >
                      <Text className="text-base text-gray-600">{row.label}</Text>
                      <Text className="text-base font-medium text-gray-900">{row.value}</Text>
                    </View>
                  ))}
                </View>
              </>
            ) : (
              <Text className="text-base text-gray-600">
                No entitlement record found for this company yet.
              </Text>
            )}
          </View>
        </View>

        <View className="mx-6 mt-6 mb-8">
          <Text className="mb-2 text-xl font-semibold text-gray-900">Plans</Text>
          <Text className="mb-4 text-base text-gray-600">
            {output.plansSectionSubtitle}
          </Text>

          <View className="gap-4">
            {output.planOptions.map((option) => (
              <PlanOptionCard
                key={option.id}
                option={option}
                isLoading={output.activeActionPlanId === option.id}
                onPress={() => {
                  void actions.handlePlanAction(option.id);
                }}
              />
            ))}
          </View>

          <View className="mt-6 rounded-xl border border-gray-200 bg-white p-4">
            <View className="flex-row items-start">
              <Ionicons name="mail-outline" size={20} color="#6b7280" />
              <Text className="ml-3 flex-1 text-base leading-6 text-gray-600">
                Need a downgrade, cancellation, or billing help? Email{" "}
                <Text className="font-medium text-gray-900">{output.supportEmail}</Text>.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
