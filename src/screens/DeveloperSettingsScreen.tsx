import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, Text, ScrollView, Pressable, Dimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import type {
  DeveloperSettingsActionColor,
  DeveloperSettingsActionId,
  DeveloperSettingsActionItem,
  DeveloperSettingsScenarioPreset,
  DeveloperSettingsScenarioPresetAction,
  DeveloperSettingsStatisticItem,
} from "../ui/contracts/viewAdapters";
import StandardHeader from "../components/StandardHeader";
import { useThemeStore } from "../state/themeStore";
import { cn } from "../utils/cn";
import {
  useDeveloperSettingsViewAdapter,
  type DeveloperSettingsViewAdapterProps,
} from "../ui/viewAdapters/useDeveloperSettingsViewAdapter";
import type {
  Sprint7SandboxConfirmationDialog,
  Sprint7SandboxInfoDialog,
} from "@/ui/contracts/viewAdapters";

type DeveloperSettingsScreenProps = DeveloperSettingsViewAdapterProps;

type Sprint7ConfirmationChoice =
  | "initialize-tristan"
  | "initialize-herman"
  | "switch-tristan"
  | "switch-herman";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const colorByActionColor: Record<DeveloperSettingsActionColor, string> = {
  blue: "bg-[#12A8E0] active:bg-[#0D88B8]",
  orange: "bg-orange-500 active:bg-orange-600",
  purple: "bg-purple-500 active:bg-purple-600",
  red: "bg-red-500 active:bg-red-600",
  green: "bg-green-500 active:bg-green-600",
};

const textColorByActionColor: Record<DeveloperSettingsActionColor, string> = {
  blue: "text-white",
  orange: "text-white",
  purple: "text-white",
  red: "text-white",
  green: "text-white",
};

export default function DeveloperSettingsScreen(props: DeveloperSettingsScreenProps) {
  const { isDarkMode } = useThemeStore();
  const { output, actions } = useDeveloperSettingsViewAdapter(props);

  const [confirmationDialog, setConfirmationDialog] =
    useState<Sprint7SandboxConfirmationDialog | null>(null);
  const [infoDialog, setInfoDialog] = useState<Sprint7SandboxInfoDialog | null>(null);
  const infoDismissedRef = useRef(false);

  useEffect(() => {
    setConfirmationDialog(output.sandboxDialogs?.confirmation ?? null);
    const nextInfo = output.sandboxDialogs?.info ?? null;
    if (nextInfo) {
      const priorKey = infoDialog?.key;
      if (priorKey !== nextInfo.key) {
        infoDismissedRef.current = false;
      }
      if (!infoDismissedRef.current) {
        setInfoDialog(nextInfo);
      }
    } else {
      setInfoDialog(null);
      infoDismissedRef.current = false;
    }
  }, [output.sandboxDialogs?.confirmation, output.sandboxDialogs?.info]);

  if (!output.access.isAuthenticated) {
    return null;
  }

  const handleSprint7SandboxConfirm = useCallback(
    (choice: Sprint7ConfirmationChoice) => {
      setConfirmationDialog(null);
      if (actions.handleSprint7SandboxConfirm) {
        actions.handleSprint7SandboxConfirm(choice as any);
      }
    },
    [actions],
  );

  const handleActionPress = useCallback(
    (actionId: DeveloperSettingsActionId) => {
      switch (actionId) {
        case "open-task-detail-verification":
          actions.handleOpenTaskDetailVerification();
          break;
        case "open-capture-session-smoke":
          actions.handleOpenCaptureSessionSmoke();
          break;
        case "force-sync-all":
          actions.handleForceSyncAll();
          break;
        case "clear-task-cache":
          actions.handleClearTaskCache();
          break;
        case "clear-project-cache":
          actions.handleClearProjectCache();
          break;
        case "clear-user-cache":
          actions.handleClearUserCache();
          break;
        case "view-storage-keys":
          actions.handleViewStorageKeys();
          break;
        case "initialize-sprint7-sandbox":
          actions.handleInitializeSprint7Sandbox();
          break;
        case "test-file-upload":
          actions.handleTestUpload();
          break;
        case "clear-all-local-data":
          actions.handleClearAllLocalData();
          break;
      }
    },
    [actions],
  );

  const handleScenarioPress = useCallback(
    (preset: DeveloperSettingsScenarioPreset) => {
      actions.handleScenarioPresetPress(preset);
    },
    [actions],
  );

  const Sprint7ConfirmationSheet: React.FC<{
    dialog: Sprint7SandboxConfirmationDialog;
  }> = ({ dialog }) => {
    const currentActorText = useMemo(() => {
      switch (dialog.currentActor) {
        case "tristan":
          return "Current actor: Tristan";
        case "herman":
          return "Current actor: Herman";
        default:
          return "No sandbox active";
      }
    }, [dialog.currentActor]);

    return (
      <>
        <Pressable
          className="absolute inset-0 z-40 bg-black/40"
          onPress={() => setConfirmationDialog(null)}
          accessible={false}
          testID="developer-settings-sheet_confirm-sprint7_backdrop"
        >
          <View />
        </Pressable>
        <View
          testID="developer-settings-sheet_confirm-sprint7"
          className="absolute inset-0 z-50 flex-col items-center justify-center"
          pointerEvents="box-none"
        >
          <View
            className="relative w-[88%] max-w-[440px] overflow-hidden rounded-3xl border border-[#B9D9E4] bg-[#F8FCFF]"
            pointerEvents="auto"
          >
            <View className="border-b border-[#D8EBF2] px-5 py-4">
              <Text className="text-lg font-semibold text-[#08576E]">{dialog.title}</Text>
              <Text className="mt-2 text-sm text-[#497080]">{dialog.description}</Text>
              <View className="mt-3 rounded-2xl bg-[#EAF6FB] px-3 py-2">
                <Text className="text-xs font-medium text-[#08576E]">{currentActorText}</Text>
              </View>
            </View>
            <View className="px-5 py-3">
              {dialog.choices.map((choice) => {
                const label: Record<string, string> = {
                  "initialize-tristan": "Initialize as Tristan",
                  "initialize-herman": "Initialize as Herman",
                  "switch-tristan": "Switch to Tristan",
                  "switch-herman": "Switch to Herman",
                  reset: "Reset sandbox",
                };
                return (
                  <Pressable
                    key={choice}
                    testID={`developer-settings-sheet_confirm-sprint7_${choice}`}
                    onPress={() => handleSprint7SandboxConfirm(choice as Sprint7ConfirmationChoice)}
                    className="mt-2 min-h-[48px] flex-row items-center justify-center rounded-2xl bg-[#12A8E0] px-4 py-3 active:bg-[#0D88B8]"
                    accessibilityRole="button"
                  >
                    <Text className="text-base font-semibold text-white">
                      {label[choice] ?? choice}
                    </Text>
                  </Pressable>
                );
              })}
              <Pressable
                testID="developer-settings-sheet_confirm-sprint7_cancel"
                onPress={() => setConfirmationDialog(null)}
                className="mt-2 min-h-[48px] flex-row items-center justify-center rounded-2xl bg-[#D8EBF2] px-4 py-3 active:bg-[#B9D9E4]"
                accessibilityRole="button"
              >
                <Text className="text-base font-semibold text-[#08576E]">Cancel</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </>
    );
  };

  const Sprint7InfoSheet: React.FC<{ dialog: Sprint7SandboxInfoDialog }> = ({ dialog }) => {
    return (
      <>
        <Pressable
          className="absolute inset-0 z-40 bg-black/40"
          onPress={() => {
            infoDismissedRef.current = true;
            setInfoDialog(null);
          }}
          accessible={false}
          testID="developer-settings-sheet_info-sprint7_backdrop"
        >
          <View />
        </Pressable>
        <View
          testID="developer-settings-sheet_info-sprint7"
          className="absolute inset-0 z-50 flex-col items-center justify-center"
          pointerEvents="box-none"
        >
          <View
            className="relative w-[88%] max-w-[440px] overflow-hidden rounded-3xl border border-[#B9D9E4] bg-[#F8FCFF]"
            pointerEvents="auto"
          >
            <View className="border-b border-[#D8EBF2] px-5 py-4">
              <Text className="text-lg font-semibold text-[#08576E]">{dialog.title}</Text>
            </View>
            <ScrollView className="max-h-[40vh] px-5 py-3">
              {dialog.lines.map((line, i) => (
                <Text key={i} className="mt-1 text-sm text-[#497080]">
                  {line}
                </Text>
              ))}
            </ScrollView>
            <View className="px-5 py-3">
              <Pressable
                testID="developer-settings-sheet_info-sprint7_ok"
                onPress={() => {
                  infoDismissedRef.current = true;
                  setInfoDialog(null);
                }}
                className="min-h-[48px] flex-row items-center justify-center rounded-2xl bg-[#12A8E0] px-4 py-3 active:bg-[#0D88B8]"
                accessibilityRole="button"
              >
                <Text className="text-base font-semibold text-white">OK</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </>
    );
  };

  const sandboxActions = output.actionGroups.find(
    (g) => g.id === "debug-tools",
  )?.actions ?? [];
  const scenarioPresetActions: DeveloperSettingsScenarioPresetAction[] =
    output.scenarioPresets ?? [];

  return (
    <View testID="developer-settings-screen__root" className="flex-1 bg-[#EAF6FB]">
      <StandardHeader
        title="Developer Settings"
        showBackButton
        onBackPress={actions.handleNavigateBack}
      />
      <ScrollView
        testID="developer-settings-screen__scroll"
        contentContainerClassName="pb-10 px-4 pt-4"
        className="flex-1"
      >
        {output.statistics.map((stat: DeveloperSettingsStatisticItem) => (
          <View
            key={stat.id}
            className={cn(
              "mb-4 rounded-3xl border p-4",
              isDarkMode
                ? "border-neutral-700 bg-neutral-800"
                : "border-[#D8EBF2] bg-[#F8FCFF]",
            )}
          >
            <Text
              className={cn(
                "mb-2 text-sm font-medium",
                isDarkMode ? "text-neutral-300" : "text-[#497080]",
              )}
            >
              {stat.label}
            </Text>
            <Text
              className={cn(
                "text-2xl font-bold",
                isDarkMode ? "text-white" : "text-[#08576E]",
              )}
            >
              {stat.count}
            </Text>
          </View>
        ))}

        {output.actionGroups.map((group) => (
          <View
            key={group.id}
            className={cn(
              "mb-4 overflow-hidden rounded-3xl border",
              isDarkMode ? "border-neutral-700 bg-neutral-800" : "border-[#D8EBF2] bg-[#F8FCFF]",
            )}
          >
            <View
              className={cn(
                "border-b px-5 py-3",
                isDarkMode ? "border-neutral-700" : "border-[#D8EBF2]",
              )}
            >
              <Text
                className={cn(
                  "text-base font-semibold",
                  isDarkMode ? "text-white" : "text-[#08576E]",
                )}
              >
                {group.title}
              </Text>
              {group.supplementaryLabel ? (
                <Text
                  className={cn(
                    "mt-1 text-sm",
                    isDarkMode ? "text-neutral-300" : "text-[#497080]",
                  )}
                >
                  {group.supplementaryLabel}
                </Text>
              ) : null}
            </View>
            {group.actions.map((action: DeveloperSettingsActionItem, idx) => (
              <Pressable
                key={action.id}
                testID={`developer-settings-action_${action.id}`}
                onPress={() => handleActionPress(action.actionId)}
                className={cn(
                  "min-h-[52px] flex-row items-center justify-between px-5 py-3",
                  idx !== group.actions.length - 1
                    ? isDarkMode
                      ? "border-b border-neutral-700"
                      : "border-b border-[#D8EBF2]"
                    : undefined,
                )}
                accessibilityRole="button"
                disabled={action.isDisabled}
              >
                <View className="flex-1 pr-3">
                  <Text
                    className={cn(
                      "text-base font-semibold",
                      action.isDisabled
                        ? isDarkMode
                          ? "text-neutral-500"
                          : "text-[#A8C6D0]"
                        : isDarkMode
                          ? "text-white"
                          : "text-[#10222B]",
                    )}
                    numberOfLines={1}
                  >
                    {action.label}
                  </Text>
                  <Text
                    className={cn(
                      "mt-1 text-xs",
                      action.isDisabled
                        ? isDarkMode
                          ? "text-neutral-500"
                          : "text-[#A8C6D0]"
                        : isDarkMode
                          ? "text-neutral-400"
                          : "text-[#7FA7B4]",
                    )}
                  >
                    {action.description}
                  </Text>
                </View>
                <View
                  className={cn(
                    "rounded-2xl px-4 py-2",
                    colorByActionColor[action.color],
                  )}
                >
                  <Text className={cn("text-sm font-semibold", textColorByActionColor[action.color])}>
                    Run
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        ))}

        {scenarioPresetActions.length > 0 ? (
          <View
            className={cn(
              "mb-4 overflow-hidden rounded-3xl border",
              isDarkMode ? "border-neutral-700 bg-neutral-800" : "border-[#D8EBF2] bg-[#F8FCFF]",
            )}
          >
            <View
              className={cn(
                "border-b px-5 py-3",
                isDarkMode ? "border-neutral-700" : "border-[#D8EBF2]",
              )}
            >
              <Text
                className={cn(
                  "text-base font-semibold",
                  isDarkMode ? "text-white" : "text-[#08576E]",
                )}
              >
                Scenario Presets
              </Text>
              {output.scenarioPresetHint ? (
                <Text
                  className={cn(
                    "mt-1 text-sm",
                    isDarkMode ? "text-neutral-300" : "text-[#497080]",
                  )}
                >
                  {output.scenarioPresetHint}
                </Text>
              ) : null}
            </View>
            {scenarioPresetActions.map((action, idx) => (
              <Pressable
                key={action.id}
                testID={action.testID}
                onPress={() => handleScenarioPress(action.preset)}
                className={cn(
                  "min-h-[52px] flex-row items-center justify-between px-5 py-3",
                  idx !== scenarioPresetActions.length - 1
                    ? isDarkMode
                      ? "border-b border-neutral-700"
                      : "border-b border-[#D8EBF2]"
                    : undefined,
                )}
                accessibilityRole="button"
                disabled={action.isDisabled}
              >
                <View className="flex-1 pr-3">
                  <Text
                    className={cn(
                      "text-base font-semibold",
                      action.isDisabled
                        ? isDarkMode
                          ? "text-neutral-500"
                          : "text-[#A8C6D0]"
                        : isDarkMode
                          ? "text-white"
                          : "text-[#10222B]",
                    )}
                  >
                    {action.label}
                  </Text>
                </View>
                <View
                  className={cn(
                    "rounded-2xl px-4 py-2",
                    isDarkMode ? "bg-sky-600 active:bg-sky-700" : "bg-[#12A8E0] active:bg-[#0D88B8]",
                  )}
                >
                  <Text className="text-sm font-semibold text-white">Load</Text>
                </View>
              </Pressable>
            ))}
          </View>
        ) : null}
      </ScrollView>

      {confirmationDialog ? (
        <Sprint7ConfirmationSheet key={confirmationDialog.key} dialog={confirmationDialog} />
      ) : null}
      {infoDialog ? (
        <Sprint7InfoSheet key={infoDialog.key} dialog={infoDialog} />
      ) : null}

      <StatusBar style="light" />
    </View>
  );
}
