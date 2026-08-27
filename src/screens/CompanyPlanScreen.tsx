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
import {
  SEAT_ADDON_COPY,
  seatAddonPriceLine,
  seatAddonQtyLine,
  seatAddonRowLine,
  type SeatAddonKind,
} from "../billing/seatAddonCopy";
import { cn } from "../utils/cn";
import { useTranslation } from "../utils/useTranslation";
import type {
  CompanyPlanAddonStepperModel,
  CompanyPlanOptionModel,
  CompanyPlanStatusBannerModel,
} from "../ui/contracts/viewAdapters";
import {
  useCompanyPlanViewAdapter,
  type CompanyPlanViewAdapterProps,
} from "../ui/viewAdapters/useCompanyPlanViewAdapter";

type CompanyPlanScreenProps = CompanyPlanViewAdapterProps;

const TEAL = "#08576E";
/** Section labels — at least as large as Starter / Pro / Extra Worker titles. */
const SECTION_TITLE = "text-2xl font-semibold text-gray-900";
/** Product row titles in plan + add-on cards (Starter, Pro, Extra worker, Extra PM). */
const PRODUCT_TITLE = "text-xl font-semibold text-gray-900";

function ExtraPersonRow({
  kind,
  qty,
  unitPrice,
  busySeatType,
  onSubscribe,
  onRemove,
}: {
  kind: SeatAddonKind;
  qty: number;
  unitPrice: string;
  busySeatType: CompanyPlanAddonStepperModel["busySeatType"];
  onSubscribe: () => void;
  onRemove: () => void;
}) {
  const copy = SEAT_ADDON_COPY[kind];
  const priceLine = seatAddonPriceLine(unitPrice);
  const qtyLine = seatAddonQtyLine(qty);
  const qtyTestId =
    kind === "worker" ? "company-plan-worker-seat-qty" : "company-plan-pm-seat-qty";
  const increaseTestId =
    kind === "worker"
      ? "company-plan-worker-seat-increase"
      : "company-plan-pm-seat-increase";
  const decreaseTestId =
    kind === "worker"
      ? "company-plan-worker-seat-decrease"
      : "company-plan-pm-seat-decrease";
  const busy = busySeatType !== null;
  const busyThis = busySeatType === kind;
  const canRemove = qty > 0 && !busy;

  return (
    <View>
      <Text className={PRODUCT_TITLE}>{copy.rowLabel}</Text>
      <Text
        testID={`company-plan-${kind}-unit-price`}
        className="mt-1 text-2xl font-semibold text-[#08576E]"
      >
        {priceLine}
      </Text>
      <Text
        testID={qtyTestId}
        accessibilityLabel={`${seatAddonRowLine({ kind, priceLabel: unitPrice })}, ${qty}`}
        className="mt-1 text-base text-gray-600"
      >
        {qtyLine}
      </Text>

      <Pressable
        testID={increaseTestId}
        disabled={busy}
        accessibilityRole="button"
        accessibilityLabel={copy.subscribeButton}
        onPress={onSubscribe}
        className={cn(
          "mt-4 min-h-[48px] items-center justify-center rounded-xl bg-[#08576E] px-4",
          busyThis && "opacity-50",
        )}
      >
        <Text className="text-center text-lg font-semibold text-white">
          {copy.subscribeButton}
        </Text>
      </Pressable>

      <Pressable
        testID={decreaseTestId}
        disabled={!canRemove}
        accessibilityRole="button"
        accessibilityLabel={copy.removeButton}
        onPress={onRemove}
        className={cn(
          "mt-2 min-h-[48px] items-center justify-center rounded-xl border border-gray-300 bg-white px-4",
          !canRemove && "opacity-40",
        )}
      >
        <Text className="text-center text-lg font-semibold text-gray-800">
          {copy.removeButton}
        </Text>
      </Pressable>
    </View>
  );
}

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
        : "border-[#08576E]/25 bg-[#F0F7FA]";

  const textStyles =
    banner.tone === "success"
      ? "text-green-900"
      : banner.tone === "error"
        ? "text-red-900"
        : "text-[#08576E]";

  return (
    <View
      testID="company-plan-status-banner"
      className={cn("rounded-xl border p-4", toneStyles)}
    >
      <View className="flex-row items-start">
        <Text className={cn("flex-1 text-lg leading-7", textStyles)}>
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

function planFeatureLines(summary: string): string[] {
  return summary
    .split("·")
    .map((part) => part.trim())
    .filter(Boolean);
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
  const priceDisplay =
    option.priceLabel && option.priceLabel !== "—"
      ? seatAddonPriceLine(option.priceLabel)
      : option.priceLabel;
  const features = planFeatureLines(option.summary);

  return (
    <View
      testID={`company-plan-option-${option.id}`}
      className={cn(
        "rounded-xl border bg-white p-4",
        isCurrent ? "border-[#08576E] bg-[#F0F7FA]" : "border-gray-200",
      )}
    >
      <View className="mb-3 flex-row items-start justify-between">
        <Text className={cn("flex-1 pr-3", PRODUCT_TITLE)}>
          {option.title}
        </Text>
        {isCurrent ? (
          <View className="rounded-full bg-[#08576E] px-3 py-1">
            <Text className="text-base font-semibold uppercase text-white">
              Current
            </Text>
          </View>
        ) : null}
      </View>

      <Text
        testID={`company-plan-price-${option.id}`}
        className="text-2xl font-bold text-[#08576E]"
      >
        {priceDisplay}
      </Text>

      <View className="mt-3 gap-2">
        {features.map((line) => (
          <View key={line} className="flex-row items-start">
            <Text className="mr-2 text-lg text-[#08576E]">•</Text>
            <Text className="flex-1 text-lg leading-7 text-gray-700">{line}</Text>
          </View>
        ))}
      </View>

      <Pressable
        testID={`company-plan-action-${option.id}`}
        disabled={option.disabled || isLoading}
        accessibilityRole="button"
        accessibilityLabel={option.actionLabel}
        onPress={onPress}
        className={cn(
          "mt-4 min-h-[48px] flex-row items-center justify-center rounded-xl px-4 py-3",
          option.disabled ? "bg-gray-200" : "bg-[#08576E]",
          isLoading && "opacity-70",
        )}
      >
        {isLoading ? (
          <ActivityIndicator color={option.disabled ? "#6b7280" : "#ffffff"} />
        ) : (
          <Text
            className={cn(
              "text-center text-lg font-semibold",
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
  const {
    onNavigateBack,
    forceSelection,
    onNavigateToProfile,
    onNavigateToProjectPicker,
    onNavigateToCompanyManagement,
    onNavigateToTaskDashboard,
  } = props;
  const t = useTranslation();
  const { output, actions } = useCompanyPlanViewAdapter(props);
  const addonSteppers = output.addonSteppers;

  if (!output.readiness.hasUsableData && output.isLoading) {
    return (
      <SafeAreaView edges={["bottom", "left", "right"]} className="flex-1 bg-[#E7F4F8]">
        <StatusBar style="light" />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={TEAL} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["bottom", "left", "right"]} className="flex-1 bg-[#E7F4F8]">
      <StatusBar style="light" />

      <ModernScreenHeader
        title={t.profile.companyPlan}
        titleNode={<BrandHeaderTitle label={t.profile.companyPlan} />}
        showBackButton={!forceSelection}
        onBackPress={forceSelection ? undefined : onNavigateBack}
        onNavigateToProfile={onNavigateToProfile}
        onNavigateToProjectPicker={onNavigateToProjectPicker}
        onNavigateToCompanyManagement={onNavigateToCompanyManagement}
        onNavigateToTaskDashboard={onNavigateToTaskDashboard}
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
        <View className="px-4 py-4">
          {forceSelection ? (
            <View
              testID="company-plan-force-selection-banner"
              className="mb-4 rounded-xl border border-[#08576E]/25 bg-white p-4"
            >
              <Text className="text-lg font-semibold text-gray-900">
                Choose {output.offeredPlanNames} to continue
              </Text>
              <Text className="mt-1 text-base leading-6 text-gray-600">
                Promo codes apply at checkout.
              </Text>
            </View>
          ) : null}

          {output.statusBanner ? (
            <View className="mb-4">
              <StatusBanner
                banner={output.statusBanner}
                onDismiss={actions.dismissStatusBanner}
              />
            </View>
          ) : null}

          <Text className={cn("mb-2", SECTION_TITLE)}>Your plan</Text>
          <View
            testID="company-plan-allocated-resources"
            className="mb-6 rounded-xl border border-gray-200 bg-white p-4"
          >
            {output.currentPlan ? (
              <>
                <View className="mb-3 flex-row items-baseline justify-between">
                  <Text
                    testID="company-plan-current-tier"
                    className={PRODUCT_TITLE}
                  >
                    {output.currentPlan.tierName}
                  </Text>
                  <Text className="text-base text-gray-500">
                    {output.currentPlan.statusLabel}
                  </Text>
                </View>
                {output.currentPlan.trialEndsLabel ? (
                  <Text
                    testID="company-plan-trial-ends"
                    className="mb-3 text-base text-gray-600"
                  >
                    Trial ends {output.currentPlan.trialEndsLabel}
                  </Text>
                ) : null}
                {output.currentPlan.limitRows.map((row, index) => (
                  <View
                    key={row.id}
                    className={cn(
                      "flex-row items-center justify-between py-2.5",
                      index > 0 && "border-t border-gray-100",
                    )}
                  >
                    <Text className="text-lg text-gray-600">{row.label}</Text>
                    <Text
                      testID={`company-plan-limit-${row.id}`}
                      className="text-lg font-semibold text-gray-900"
                    >
                      {row.value}
                    </Text>
                  </View>
                ))}
              </>
            ) : (
              <Text className="text-lg text-gray-600">
                No plan yet — pick one below.
              </Text>
            )}
          </View>

          <Text className={cn("mb-3", SECTION_TITLE)}>Plans</Text>
          <View className="gap-3">
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

          {addonSteppers ? (
            <View className="mt-6">
              <Text
                testID="company-plan-addons-title"
                className={cn("mb-3", SECTION_TITLE)}
              >
                Add-ons
              </Text>
              <View
                testID="company-plan-extra-people"
                className="rounded-xl border border-gray-200 bg-white p-4"
              >
                {addonSteppers.busySeatType ? (
                  <View className="mb-4 flex-row items-center">
                    <ActivityIndicator size="small" color="#08576E" />
                    <Text className="ml-2 text-lg text-gray-600">
                      {SEAT_ADDON_COPY.updating}
                    </Text>
                  </View>
                ) : null}

                <View className="gap-6">
                  <ExtraPersonRow
                    kind="worker"
                    qty={addonSteppers.workerSeatQty}
                    unitPrice={addonSteppers.workerUnitPrice}
                    busySeatType={addonSteppers.busySeatType}
                    onSubscribe={() => {
                      void actions.handleUpdateAddons(
                        addonSteppers.workerSeatQty + 1,
                        addonSteppers.pmSeatQty,
                      );
                    }}
                    onRemove={() => {
                      void actions.handleUpdateAddons(
                        addonSteppers.workerSeatQty - 1,
                        addonSteppers.pmSeatQty,
                      );
                    }}
                  />

                  <View className="border-t border-gray-200" />

                  <ExtraPersonRow
                    kind="pm"
                    qty={addonSteppers.pmSeatQty}
                    unitPrice={addonSteppers.pmUnitPrice}
                    busySeatType={addonSteppers.busySeatType}
                    onSubscribe={() => {
                      void actions.handleUpdateAddons(
                        addonSteppers.workerSeatQty,
                        addonSteppers.pmSeatQty + 1,
                      );
                    }}
                    onRemove={() => {
                      void actions.handleUpdateAddons(
                        addonSteppers.workerSeatQty,
                        addonSteppers.pmSeatQty - 1,
                      );
                    }}
                  />
                </View>
              </View>
            </View>
          ) : null}

          <Text className="mt-6 mb-2 text-base leading-6 text-gray-500">
            Billing help:{" "}
            <Text className="font-medium text-gray-800">{output.supportEmail}</Text>
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
