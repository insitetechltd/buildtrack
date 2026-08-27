import React from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";

import ModernScreenHeader from "../components/ModernScreenHeader";
import BrandHeaderTitle from "../components/BrandHeaderTitle";
import { lightPalette } from "../theme/colors";
import { cn } from "../utils/cn";
import type {
  AdminDashboardQuickActionItem,
  AdminDashboardSecondaryStat,
  AdminDashboardStatCard,
} from "../ui/contracts/viewAdapters";
import {
  useAdminDashboardViewAdapter,
  type AdminDashboardViewAdapterProps,
} from "../ui/viewAdapters/useAdminDashboardViewAdapter";

type AdminDashboardScreenProps = AdminDashboardViewAdapterProps;

const TEAL = lightPalette.brand;
const SCREEN_BG = lightPalette.canvas;

/**
 * C′ Admin Dashboard type scale — Insite tokens (base=14, lg=18, xl=20, 2xl=24).
 * Title in header ≥ body; tile labels never smaller than text-base.
 */
const TYPE = {
  sectionTitle: "text-xl font-semibold text-gray-900",
  primaryValue: "text-xl font-semibold text-gray-900",
  secondaryLabel: "text-base text-gray-600",
  cta: "text-base font-semibold text-[#08576E]",
  tileLabel: "text-base font-semibold",
  tileNumber: "text-2xl font-bold text-gray-900",
} as const;

type TileChrome = {
  container: string;
  label: string;
};

function tileChromeFor(statId: string): TileChrome {
  switch (statId) {
    case "planning":
      return {
        container: "border border-amber-200 bg-amber-50",
        label: "text-amber-800",
      };
    case "active":
      return {
        container: "border border-cyan-200 bg-cyan-50",
        label: "text-cyan-900",
      };
    case "completed":
      return {
        container: "border border-emerald-200 bg-emerald-50",
        label: "text-emerald-900",
      };
    case "cancelled":
      return {
        container: "border border-gray-200 bg-gray-50",
        label: "text-gray-600",
      };
    case "pm":
      return {
        container: "border border-gray-200 bg-[#F0F7FA]",
        label: "text-[#08576E]",
      };
    case "worker":
      return {
        container: "border border-gray-200 bg-gray-50",
        label: "text-gray-600",
      };
    default:
      return {
        container: "border border-gray-200 bg-gray-50",
        label: "text-gray-600",
      };
  }
}

/**
 * C′ anatomy:
 * 1. Pressable header band (icon well + title + CTA) — primary nav
 * 2. Optional body value / subtitle
 * 3. 2×2 (or 2-col wrap) metric tiles
 * No footer link row.
 */
function StatSection({
  card,
  onPress,
}: {
  card: AdminDashboardStatCard;
  onPress?: () => void;
}) {
  const ctaLabel = card.ctaLabel || "Open";
  const secondaryStats = card.secondaryStats ?? [];
  const secondaryLayout = card.secondaryLayout ?? "row";
  const header = (
    <View className="min-h-[52px] flex-row items-center bg-[#F0F7FA] px-3 py-3">
      <View className="mr-3 h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white">
        <Ionicons name={card.icon as any} size={20} color={TEAL} />
      </View>
      <Text className={cn("flex-1", TYPE.sectionTitle)} numberOfLines={1}>
        {card.label}
      </Text>
      {onPress ? (
        <View className="ml-2 flex-row items-center">
          <Text className={TYPE.cta}>{ctaLabel}</Text>
          <Ionicons
            name="chevron-forward"
            size={18}
            color={TEAL}
            style={{ marginLeft: 2 }}
          />
        </View>
      ) : null}
    </View>
  );

  const body = (
    <View className="px-4 py-3">
      {!card.hidePrimaryValue ? (
        <Text className={TYPE.primaryValue} numberOfLines={2}>
          {card.value}
        </Text>
      ) : null}
      {card.subtitle ? (
        <Text
          className={cn(
            TYPE.secondaryLabel,
            !card.hidePrimaryValue ? "mt-1" : null,
          )}
        >
          {card.subtitle}
        </Text>
      ) : null}

      {secondaryStats.length > 0 && secondaryLayout === "stage_tiles" ? (
        <View
          testID={`admin-stat-secondary-${card.statId}`}
          className={cn(
            "flex-row flex-wrap",
            card.hidePrimaryValue && !card.subtitle ? null : "mt-3",
          )}
          style={{ gap: 8 }}
        >
          {secondaryStats.map((stat) => (
            <StageOrRoleTile
              key={stat.id}
              sectionId={card.statId}
              stat={stat}
            />
          ))}
        </View>
      ) : null}

      {secondaryStats.length > 0 && secondaryLayout === "row" ? (
        <View
          testID={`admin-stat-secondary-${card.statId}`}
          className="mt-3 flex-row"
          style={{ gap: 8 }}
        >
          {secondaryStats.map((stat) => (
            <View
              key={stat.id}
              testID={`admin-stat-secondary-${card.statId}-${stat.id}`}
              className="min-h-[88px] flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-3"
            >
              <Text className={cn(TYPE.tileLabel, "text-gray-600")}>
                {stat.label}
              </Text>
              <Text className={cn(TYPE.tileNumber, "mt-1")}>{stat.value}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );

  return (
    <View
      testID={`admin-stat-section-${card.statId}`}
      className="mb-3 overflow-hidden rounded-xl border border-gray-200 bg-white"
    >
      {onPress ? (
        <Pressable
          testID={`admin-stat-${card.statId}`}
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel={`${card.label}, ${ctaLabel}`}
          className="active:opacity-90"
        >
          {header}
        </Pressable>
      ) : (
        header
      )}
      {body}
    </View>
  );
}

function StageOrRoleTile({
  sectionId,
  stat,
}: {
  sectionId: string;
  stat: AdminDashboardSecondaryStat;
}) {
  const chrome = tileChromeFor(stat.id);
  return (
    <View
      testID={`admin-stat-secondary-${sectionId}-${stat.id}`}
      className={cn("min-h-[88px] rounded-xl px-3 py-3", chrome.container)}
      style={{ width: "48%" }}
    >
      <Text className={cn(TYPE.tileLabel, chrome.label)} numberOfLines={2}>
        {stat.label}
      </Text>
      <Text className={cn(TYPE.tileNumber, "mt-1")}>{stat.value}</Text>
    </View>
  );
}

function QuickActionCard({
  action,
  onPress,
}: {
  action: AdminDashboardQuickActionItem;
  onPress: () => void;
}) {
  return (
    <Pressable
      testID={`admin-quick-action-${action.actionId}`}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={action.label}
      className="mb-3 min-h-[48px] overflow-hidden rounded-xl border border-gray-200 bg-white"
    >
      <View className="flex-row items-center px-4 py-3">
        <View className="mr-3 h-11 w-11 items-center justify-center rounded-lg bg-[#F0F7FA]">
          <Ionicons name={action.icon as any} size={22} color={TEAL} />
        </View>
        <View className="flex-1 pr-2">
          <Text
            testID={`admin-quick-action-trigger-${action.actionId}`}
            className="mb-0.5 text-xl font-semibold text-gray-900"
          >
            {action.label}
          </Text>
          <Text className={TYPE.secondaryLabel}>{action.description}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={TEAL} />
      </View>
    </Pressable>
  );
}

export default function AdminDashboardScreen(props: AdminDashboardScreenProps) {
  const { output, actions } = useAdminDashboardViewAdapter(props);
  const RefreshControlComponent = RefreshControl;
  const visibleQuickActions = output.quickActions.filter((action) => action.isVisible);

  if (!output.readiness.hasUsableData) {
    return null;
  }

  if (!output.access.isAllowed) {
    return (
      <SafeAreaView
        edges={["bottom", "left", "right"]}
        className="flex-1"
        style={{ backgroundColor: SCREEN_BG }}
      >
        <StatusBar style="light" />
        <ModernScreenHeader
          title="Admin Dashboard"
          titleNode={<BrandHeaderTitle label="Admin Dashboard" subtitle="Admin" />}
          className="border-b-0 bg-[#08576E] pb-2"
        />
        <View className="flex-1 items-center justify-center px-6">
          <Text className={cn("text-center", TYPE.secondaryLabel)}>
            {output.access.deniedMessage || "Access denied."}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      edges={["bottom", "left", "right"]}
      className="flex-1"
      style={{ backgroundColor: SCREEN_BG }}
    >
      <StatusBar style="light" />

      <ModernScreenHeader
        title="Admin Dashboard"
        titleNode={<BrandHeaderTitle label="Admin Dashboard" subtitle="Admin" />}
        className="border-b-0 bg-[#08576E] pb-2"
      />

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={
          RefreshControlComponent ? (
            <RefreshControlComponent
              refreshing={output.refreshState.isRefreshing}
              onRefresh={() => void actions.handleRefresh()}
            />
          ) : undefined
        }
      >
        <View className="px-4 py-4">
          {output.topLevelStats.map((card) => (
            <StatSection
              key={card.id}
              card={card}
              onPress={
                card.actionId
                  ? () => actions.pressQuickAction(card.actionId!)
                  : undefined
              }
            />
          ))}

          {visibleQuickActions.length > 0 ? (
            <View className="mt-1">
              {visibleQuickActions.map((action) => (
                <QuickActionCard
                  key={action.id}
                  action={action}
                  onPress={() => actions.pressQuickAction(action.actionId)}
                />
              ))}
            </View>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
