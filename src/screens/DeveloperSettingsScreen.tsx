import React from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import {
  type DeveloperSettingsActionColor,
  type DeveloperSettingsActionId,
  type DeveloperSettingsActionItem,
  type DeveloperSettingsScenarioPresetAction,
  type DeveloperSettingsStatisticItem,
} from "../ui/contracts/viewAdapters";
import StandardHeader from "../components/StandardHeader";
import { useThemeStore } from "../state/themeStore";
import { cn } from "../utils/cn";
import {
  useDeveloperSettingsViewAdapter,
  type DeveloperSettingsViewAdapterProps,
} from "../ui/viewAdapters/useDeveloperSettingsViewAdapter";

type DeveloperSettingsScreenProps = DeveloperSettingsViewAdapterProps;

export default function DeveloperSettingsScreen(props: DeveloperSettingsScreenProps) {
  const { isDarkMode } = useThemeStore();
  const { output, actions } = useDeveloperSettingsViewAdapter(props);

  if (!output.access.isAuthenticated) {
    return null;
  }

  const actionHandlers: Record<DeveloperSettingsActionId, () => void> = {
    "open-task-detail-verification": actions.handleOpenTaskDetailVerification,
    "force-sync-all": actions.handleForceSyncAll,
    "clear-task-cache": actions.handleClearTaskCache,
    "clear-project-cache": actions.handleClearProjectCache,
    "clear-user-cache": actions.handleClearUserCache,
    "view-storage-keys": actions.handleViewStorageKeys,
    "initialize-sprint7-sandbox": actions.handleInitializeSprint7Sandbox,
    "test-file-upload": actions.handleTestUpload,
    "clear-all-local-data": actions.handleClearAllLocalData,
  };

  return (
    <SafeAreaView
      edges={["bottom", "left", "right"]}
      className={cn("flex-1", isDarkMode ? "bg-slate-900" : "bg-gray-50")}
    >
      <StatusBar style={isDarkMode ? "light" : "dark"} />

      <StandardHeader
        title={output.title}
        onBackPress={actions.handleNavigateBack}
        showBackButton
      />

      <ScrollView className="flex-1">
        <View className="px-4 py-6">
          <View
            className={cn(
              "rounded-xl p-4 mb-6 border-2",
              isDarkMode ? "bg-amber-900/20 border-amber-600" : "bg-amber-50 border-amber-400",
            )}
          >
            <View className="flex-row items-center mb-2">
              <Ionicons
                name="warning"
                size={24}
                color={isDarkMode ? "#fbbf24" : "#f59e0b"}
              />
              <Text
                className={cn(
                  "text-lg font-bold ml-2",
                  isDarkMode ? "text-amber-400" : "text-amber-700",
                )}
              >
                {output.warningTitle}
              </Text>
            </View>
            <Text
              className={cn("text-sm", isDarkMode ? "text-amber-200" : "text-amber-700")}
            >
              {output.warningMessage}
            </Text>
          </View>

          <SectionCard title="📊 Local Data Statistics" isDarkMode={isDarkMode}>
            <View className="space-y-3">
              {output.statistics.map((statistic) => (
                <DataRow
                  key={statistic.id}
                  statistic={statistic}
                  isDarkMode={isDarkMode}
                />
              ))}
            </View>
          </SectionCard>

          <SectionCard title="🧭 UI Mode" isDarkMode={isDarkMode}>
            <Pressable
              onLongPress={actions.handleToggleUiMode}
              className={cn(
                "rounded-lg p-4 border flex-row items-center",
                isDarkMode ? "bg-slate-900 border-slate-700" : "bg-gray-50 border-gray-200",
              )}
            >
              <Ionicons
                name="swap-horizontal"
                size={24}
                color={isDarkMode ? "#93c5fd" : "#3b82f6"}
              />
              <View className="flex-1 ml-3">
                <Text
                  className={cn(
                    "text-base font-semibold",
                    isDarkMode ? "text-white" : "text-gray-900",
                  )}
                >
                  UI Mode: {output.uiMode.currentModeLabel}
                </Text>
                <Text
                  className={cn(
                    "text-sm mt-1",
                    isDarkMode ? "text-slate-300" : "text-gray-600",
                  )}
                >
                  {output.uiMode.description}
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={isDarkMode ? "#93c5fd" : "#3b82f6"}
              />
            </Pressable>
          </SectionCard>

          {output.actionGroups.map((group) => (
            <SectionCard key={group.id} title={group.title} isDarkMode={isDarkMode}>
              {group.actions.map((action) => (
                <ActionButton
                  key={action.id}
                  action={action}
                  onPress={actionHandlers[action.actionId]}
                  isDarkMode={isDarkMode}
                />
              ))}

              {group.supplementaryLabel ? (
                <View className="mb-3">
                  <Text
                    className={cn(
                      "text-xs font-semibold uppercase tracking-wide mb-2",
                      isDarkMode ? "text-slate-400" : "text-gray-500",
                    )}
                  >
                    {group.supplementaryLabel}
                  </Text>
                  <View className="flex-row flex-wrap gap-2">
                    {output.scenarioPresets.map((preset) => (
                      <ScenarioPresetButton
                        key={preset.id}
                        preset={preset}
                        onPress={() => actions.handleScenarioPresetPress(preset.preset)}
                        isDarkMode={isDarkMode}
                      />
                    ))}
                  </View>
                  {output.scenarioPresetHint ? (
                    <Text
                      className={cn(
                        "text-xs mt-2",
                        isDarkMode ? "text-slate-500" : "text-gray-500",
                      )}
                    >
                      {output.scenarioPresetHint}
                    </Text>
                  ) : null}
                </View>
              ) : null}

              {group.id === "danger-zone" ? (
                <Text
                  className={cn(
                    "text-sm mb-4",
                    isDarkMode ? "text-red-200" : "text-red-600",
                  )}
                >
                  These actions cannot be undone!
                </Text>
              ) : null}
            </SectionCard>
          ))}

          <View
            className={cn(
              "rounded-xl p-4 mb-6",
              isDarkMode ? "bg-slate-800 border border-slate-700" : "bg-white border border-gray-200",
            )}
          >
            <Text
              className={cn("text-sm", isDarkMode ? "text-slate-400" : "text-gray-600")}
            >
              {output.infoMessage}
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// Helper Components
interface SectionCardProps {
  title: string;
  isDarkMode: boolean;
  children: React.ReactNode;
}

function SectionCard({ title, isDarkMode, children }: SectionCardProps) {
  return (
    <View
      className={cn(
        "rounded-xl p-4 mb-6",
        isDarkMode ? "bg-slate-800 border border-slate-700" : "bg-white border border-gray-200",
      )}
    >
      <Text
        className={cn(
          "text-lg font-bold mb-4",
          isDarkMode ? "text-white" : "text-gray-900",
        )}
      >
        {title}
      </Text>
      {children}
    </View>
  );
}

interface DataRowProps {
  statistic: DeveloperSettingsStatisticItem;
  isDarkMode: boolean;
}

function DataRow({ statistic, isDarkMode }: DataRowProps) {
  return (
    <View className="flex-row justify-between items-center py-2">
      <Text
        className={cn("text-base", isDarkMode ? "text-slate-300" : "text-gray-700")}
      >
        {statistic.label}
      </Text>
      <View
        className={cn(
          "px-3 py-1 rounded-full",
          isDarkMode ? "bg-blue-900/40" : "bg-blue-100",
        )}
      >
        <Text
          className={cn(
            "text-base font-bold",
            isDarkMode ? "text-blue-400" : "text-blue-700",
          )}
        >
          {statistic.count}
        </Text>
      </View>
    </View>
  );
}

interface ActionButtonProps {
  action: DeveloperSettingsActionItem;
  onPress: () => void;
  isDarkMode: boolean;
}

function ActionButton({ action, onPress, isDarkMode }: ActionButtonProps) {
  const colorMap: Record<
    DeveloperSettingsActionColor,
    {
      bg: string;
      border: string;
      icon: string;
      text: string;
      desc: string;
    }
  > = {
    blue: {
      bg: isDarkMode ? "bg-blue-900/40" : "bg-blue-50",
      border: isDarkMode ? "border-blue-700" : "border-blue-200",
      icon: isDarkMode ? "#60a5fa" : "#3b82f6",
      text: isDarkMode ? "text-blue-400" : "text-blue-700",
      desc: isDarkMode ? "text-blue-300" : "text-blue-600",
    },
    orange: {
      bg: isDarkMode ? "bg-orange-900/40" : "bg-orange-50",
      border: isDarkMode ? "border-orange-700" : "border-orange-200",
      icon: isDarkMode ? "#fb923c" : "#f97316",
      text: isDarkMode ? "text-orange-400" : "text-orange-700",
      desc: isDarkMode ? "text-orange-300" : "text-orange-600",
    },
    purple: {
      bg: isDarkMode ? "bg-purple-900/40" : "bg-purple-50",
      border: isDarkMode ? "border-purple-700" : "border-purple-200",
      icon: isDarkMode ? "#a78bfa" : "#8b5cf6",
      text: isDarkMode ? "text-purple-400" : "text-purple-700",
      desc: isDarkMode ? "text-purple-300" : "text-purple-600",
    },
    red: {
      bg: isDarkMode ? "bg-red-900/40" : "bg-red-50",
      border: isDarkMode ? "border-red-700" : "border-red-200",
      icon: isDarkMode ? "#f87171" : "#ef4444",
      text: isDarkMode ? "text-red-400" : "text-red-700",
      desc: isDarkMode ? "text-red-300" : "text-red-600",
    },
    green: {
      bg: isDarkMode ? "bg-green-900/40" : "bg-green-50",
      border: isDarkMode ? "border-green-700" : "border-green-200",
      icon: isDarkMode ? "#4ade80" : "#22c55e",
      text: isDarkMode ? "text-green-400" : "text-green-700",
      desc: isDarkMode ? "text-green-300" : "text-green-600",
    },
  };

  const colors = colorMap[action.color];

  return (
    <Pressable
      onPress={onPress}
      disabled={action.isDisabled}
      className={cn(
        "rounded-lg p-4 mb-3 border flex-row items-center",
        colors.bg,
        colors.border,
        action.isDisabled && "opacity-50",
      )}
    >
      <Ionicons name={action.icon as keyof typeof Ionicons.glyphMap} size={24} color={colors.icon} />
      <View className="flex-1 ml-3">
        <Text className={cn("text-base font-semibold", colors.text)}>
          {action.label}
        </Text>
        <Text className={cn("text-sm mt-1", colors.desc)}>
          {action.description}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.icon} />
    </Pressable>
  );
}

interface ScenarioPresetButtonProps {
  preset: DeveloperSettingsScenarioPresetAction;
  onPress: () => void;
  isDarkMode: boolean;
}

function ScenarioPresetButton({
  preset,
  onPress,
  isDarkMode,
}: ScenarioPresetButtonProps) {
  return (
    <Pressable
      testID={preset.testID}
      onPress={onPress}
      disabled={preset.isDisabled}
      className={cn(
        "px-3 py-2 rounded-full border",
        isDarkMode ? "bg-slate-900 border-slate-700" : "bg-slate-50 border-slate-300",
        preset.isDisabled && "opacity-50",
      )}
    >
      <Text
        className={cn(
          "text-xs font-medium",
          isDarkMode ? "text-slate-200" : "text-slate-700",
        )}
      >
        {preset.label}
      </Text>
    </Pressable>
  );
}
