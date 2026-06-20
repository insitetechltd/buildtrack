import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuthStore } from "../state/authStore";
import { useTaskStore } from "../state/taskStore.supabase";
import { useProjectStoreWithInit } from "../state/projectStore.supabase";
import { useUserStore } from "../state/userStore.supabase";
import { useCompanyStore } from "../state/companyStore";
import { useProjectFilterStore } from "../state/projectFilterStore";
import { useThemeStore } from "../state/themeStore";
import { useLanguageStore } from "../state/languageStore";
import { useDevToggleStore } from "../state/devToggleStore";
import { cn } from "../utils/cn";
import StandardHeader from "../components/StandardHeader";
import { supabase } from "../api/supabase";
import { runStorageUploadDiagnostic } from "../api/storageUploadDiagnostic";
import {
  initializeSprint7RuntimeSandbox,
  isSprint7RuntimeSandboxLoaded,
  loadScenarioAPreset,
  loadScenarioBPreset,
  loadScenarioCPreset,
  switchSprint7RuntimeSandboxActor,
} from "../test-utils/sprint7RuntimeSandbox";

interface DeveloperSettingsScreenProps {
  onNavigateBack: () => void;
}

export default function DeveloperSettingsScreen({ onNavigateBack }: DeveloperSettingsScreenProps) {
  const { user, logout } = useAuthStore();
  const { isDarkMode } = useThemeStore();
  const { uiModernizationMode, toggleUiMode } = useDevToggleStore();
  const [isClearing, setIsClearing] = useState(false);
  const [isTestingUpload, setIsTestingUpload] = useState(false);
  const [isInitializingSprint7Sandbox, setIsInitializingSprint7Sandbox] = useState(false);
  
  // Get all stores
  const taskStore = useTaskStore();
  const projectStore = useProjectStoreWithInit();
  const userStore = useUserStore();
  const companyStore = useCompanyStore();
  const projectFilterStore = useProjectFilterStore();

  if (!user) return null;

  // Get data counts
  const taskCount = taskStore.tasks.length;
  const projectCount = projectStore.projects.length;
  const userCount = userStore.users.length;
  const companyCount = companyStore.companies.length;
  const sprint7SandboxLoaded = isSprint7RuntimeSandboxLoaded();

  // Clear all local AsyncStorage data
  const handleClearAllLocalData = async () => {
    Alert.alert(
      "⚠️ Clear All Local Data",
      "This will:\n\n• Clear all cached tasks, projects, users, and companies\n• Log you out\n• Force you to login again\n\nThe data in Supabase will NOT be affected.\n\nAre you sure?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear & Logout",
          style: "destructive",
          onPress: async () => {
            setIsClearing(true);
            try {
              console.log("🗑️ [Developer] Clearing all local AsyncStorage data...");
              
              // Get all keys
              const keys = await AsyncStorage.getAllKeys();
              console.log(`🗑️ [Developer] Found ${keys.length} keys:`, keys);
              
              // Clear all AsyncStorage keys
              await AsyncStorage.multiRemove(keys);
              
              console.log("✅ [Developer] All local data cleared");
              
              // Show success message
              Alert.alert(
                "Success",
                "All local data has been cleared. The app will now logout.",
                [
                  {
                    text: "OK",
                    onPress: () => {
                      // Logout (this will redirect to login screen)
                      logout();
                    },
                  },
                ]
              );
            } catch (error) {
              console.error("❌ [Developer] Error clearing local data:", error);
              Alert.alert("Error", "Failed to clear local data. Please try again.");
            } finally {
              setIsClearing(false);
            }
          },
        },
      ]
    );
  };

  // Clear only task cache
  const handleClearTaskCache = async () => {
    Alert.alert(
      "Clear Task Cache",
      "This will clear all cached tasks and force a refresh from Supabase.\n\nContinue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: async () => {
            try {
              console.log("🗑️ [Developer] Clearing task cache...");
              await AsyncStorage.removeItem("buildtrack-tasks");
              
              // Re-fetch from Supabase
              await taskStore.fetchTasks();
              
              Alert.alert("Success", "Task cache cleared and refreshed from Supabase.");
            } catch (error) {
              console.error("❌ [Developer] Error clearing task cache:", error);
              Alert.alert("Error", "Failed to clear task cache.");
            }
          },
        },
      ]
    );
  };

  // Clear only project cache
  const handleClearProjectCache = async () => {
    Alert.alert(
      "Clear Project Cache",
      "This will clear all cached projects and force a refresh from Supabase.\n\nContinue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: async () => {
            try {
              console.log("🗑️ [Developer] Clearing project cache...");
              await AsyncStorage.removeItem("buildtrack-projects");
              
              // Re-fetch from Supabase
              await projectStore.fetchProjects();
              if (user) {
                await projectStore.fetchUserProjectAssignments(user.id);
              }
              
              Alert.alert("Success", "Project cache cleared and refreshed from Supabase.");
            } catch (error) {
              console.error("❌ [Developer] Error clearing project cache:", error);
              Alert.alert("Error", "Failed to clear project cache.");
            }
          },
        },
      ]
    );
  };

  // Clear only user cache
  const handleClearUserCache = async () => {
    Alert.alert(
      "Clear User Cache",
      "This will clear all cached users and force a refresh from Supabase.\n\nContinue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: async () => {
            try {
              console.log("🗑️ [Developer] Clearing user cache...");
              await AsyncStorage.removeItem("buildtrack-users");
              
              // Re-fetch from Supabase
              await userStore.fetchUsers();
              
              Alert.alert("Success", "User cache cleared and refreshed from Supabase.");
            } catch (error) {
              console.error("❌ [Developer] Error clearing user cache:", error);
              Alert.alert("Error", "Failed to clear user cache.");
            }
          },
        },
      ]
    );
  };

  // Force sync all data from Supabase
  const handleForceSyncAll = async () => {
    try {
      console.log("🔄 [Developer] Force syncing all data from Supabase...");
      
      await Promise.all([
        taskStore.fetchTasks(),
        projectStore.fetchProjects(),
        user ? projectStore.fetchUserProjectAssignments(user.id) : Promise.resolve(),
        userStore.fetchUsers(),
        companyStore.fetchCompanies(),
      ]);
      
      Alert.alert("Success", "All data synced from Supabase successfully!");
    } catch (error) {
      console.error("❌ [Developer] Error syncing data:", error);
      Alert.alert("Error", "Failed to sync data from Supabase.");
    }
  };

  // View all AsyncStorage keys
  const handleViewStorageKeys = async () => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const keyList = keys.length > 0 ? keys.join("\n• ") : "No keys found";
      
      Alert.alert(
        "AsyncStorage Keys",
        `Found ${keys.length} keys:\n\n• ${keyList}`,
        [{ text: "OK" }]
      );
    } catch (error) {
      console.error("❌ [Developer] Error getting storage keys:", error);
      Alert.alert("Error", "Failed to get storage keys.");
    }
  };

  // Test Supabase file upload
  const handleTestUpload = async () => {
    if (!user) {
      Alert.alert("Error", "You must be logged in to test uploads.");
      return;
    }

    setIsTestingUpload(true);

    try {
      const results = await runStorageUploadDiagnostic(supabase as any);
      Alert.alert("Upload Test Results", results.join("\n"));
    } catch (error: any) {
      console.error("❌ [Developer] Upload test error:", error);
      Alert.alert("Upload Test Results", `\n❌ Test error: ${error.message}`);
    } finally {
      setIsTestingUpload(false);
    }
  };

  const runSprint7SandboxAction = async (
    mode: "initialize" | "switch",
    actor: "tristan" | "herman"
  ) => {
    setIsInitializingSprint7Sandbox(true);
    try {
      if (mode === "initialize") {
        await initializeSprint7RuntimeSandbox({ activeActor: actor });
      } else {
        await switchSprint7RuntimeSandboxActor(actor);
      }

      const actorLabel = actor === "tristan" ? "Tristan" : "Herman";
      const actionLabel = mode === "initialize" ? "initialized" : "switched";
      Alert.alert(
        "Sprint 7 Sandbox Ready",
        `Sprint 7 staging sandbox ${actionLabel} for ${actorLabel}.`,
      );
    } catch (error: any) {
      console.error("❌ [Developer] Sprint 7 sandbox error:", error);
      Alert.alert("Sprint 7 Sandbox Error", error.message || "Failed to load the Sprint 7 sandbox.");
    } finally {
      setIsInitializingSprint7Sandbox(false);
    }
  };

  const handleInitializeSprint7Sandbox = () => {
    Alert.alert(
      "Initialize Sprint 7 Staging Sandbox",
      sprint7SandboxLoaded
        ? "Choose whether to reset the canonical Sprint 7 dataset or switch the active sandbox user."
        : "Load the canonical Tristan/Herman dataset and choose which user to open first.",
      [
        {
          text: "Reset as Tristan",
          onPress: () => runSprint7SandboxAction("initialize", "tristan"),
        },
        {
          text: "Reset as Herman",
          onPress: () => runSprint7SandboxAction("initialize", "herman"),
        },
        {
          text: "Switch to Tristan",
          onPress: () => runSprint7SandboxAction("switch", "tristan"),
        },
        {
          text: "Switch to Herman",
          onPress: () => runSprint7SandboxAction("switch", "herman"),
        },
        { text: "Cancel", style: "cancel" },
      ]
    );
  };

  const handleLoadScenarioPreset = async (preset: "A" | "B" | "C") => {
    if (!sprint7SandboxLoaded) {
      Alert.alert(
        "Initialize Sprint 7 First",
        "Load the Sprint 7 staging sandbox before applying a scenario preset."
      );
      return;
    }

    setIsInitializingSprint7Sandbox(true);
    try {
      if (preset === "A") {
        await loadScenarioAPreset();
      } else if (preset === "B") {
        await loadScenarioBPreset();
      } else {
        await loadScenarioCPreset();
      }

      const presetLabel =
        preset === "A"
          ? "Preset A: Rejection Loop"
          : preset === "B"
            ? "Preset B: Overdue Crunch"
            : "Preset C: Isolation Wall";

      Alert.alert("Sprint 7 Preset Loaded", `${presetLabel} is ready for validation.`);
    } catch (error: any) {
      console.error("❌ [Developer] Sprint 7 preset error:", error);
      Alert.alert("Sprint 7 Preset Error", error.message || "Failed to load the Sprint 7 preset.");
    } finally {
      setIsInitializingSprint7Sandbox(false);
    }
  };

  return (
    <SafeAreaView edges={['bottom', 'left', 'right']} className={cn("flex-1", isDarkMode ? "bg-slate-900" : "bg-gray-50")}>
      <StatusBar style={isDarkMode ? "light" : "dark"} />
      
      <StandardHeader
        title="Developer Settings"
        onBack={onNavigateBack}
        showBackButton
      />

      <ScrollView className="flex-1">
        <View className="px-4 py-6">
          {/* Warning Banner */}
          <View className={cn(
            "rounded-xl p-4 mb-6 border-2",
            isDarkMode ? "bg-amber-900/20 border-amber-600" : "bg-amber-50 border-amber-400"
          )}>
            <View className="flex-row items-center mb-2">
              <Ionicons name="warning" size={24} color={isDarkMode ? "#fbbf24" : "#f59e0b"} />
              <Text className={cn(
                "text-lg font-bold ml-2",
                isDarkMode ? "text-amber-400" : "text-amber-700"
              )}>
                Developer Tools
              </Text>
            </View>
            <Text className={cn(
              "text-sm",
              isDarkMode ? "text-amber-200" : "text-amber-700"
            )}>
              These tools are for testing and development. Use with caution!
            </Text>
          </View>

          {/* Data Statistics */}
          <View className={cn(
            "rounded-xl p-4 mb-6",
            isDarkMode ? "bg-slate-800 border border-slate-700" : "bg-white border border-gray-200"
          )}>
            <Text className={cn(
              "text-lg font-bold mb-4",
              isDarkMode ? "text-white" : "text-gray-900"
            )}>
              📊 Local Data Statistics
            </Text>
            
            <View className="space-y-3">
              <DataRow label="Tasks" count={taskCount} isDarkMode={isDarkMode} />
              <DataRow label="Projects" count={projectCount} isDarkMode={isDarkMode} />
              <DataRow label="Users" count={userCount} isDarkMode={isDarkMode} />
              <DataRow label="Companies" count={companyCount} isDarkMode={isDarkMode} />
            </View>
          </View>

          <View className={cn(
            "rounded-xl p-4 mb-6",
            isDarkMode ? "bg-slate-800 border border-slate-700" : "bg-white border border-gray-200"
          )}>
            <Text className={cn(
              "text-lg font-bold mb-4",
              isDarkMode ? "text-white" : "text-gray-900"
            )}>
              🧭 UI Mode
            </Text>

            <Pressable
              onLongPress={() => {
                toggleUiMode();
                Alert.alert(
                  "UI Mode Updated",
                  `Now running: ${uiModernizationMode === "modern" ? "Legacy" : "Modern"}`,
                  [{ text: "OK" }],
                );
              }}
              className={cn(
                "rounded-lg p-4 border flex-row items-center",
                isDarkMode ? "bg-slate-900 border-slate-700" : "bg-gray-50 border-gray-200",
              )}
            >
              <Ionicons name="swap-horizontal" size={24} color={isDarkMode ? "#93c5fd" : "#3b82f6"} />
              <View className="flex-1 ml-3">
                <Text className={cn(
                  "text-base font-semibold",
                  isDarkMode ? "text-white" : "text-gray-900"
                )}>
                  UI Mode: {uiModernizationMode === "modern" ? "Modern" : "Legacy"}
                </Text>
                <Text className={cn(
                  "text-sm mt-1",
                  isDarkMode ? "text-slate-300" : "text-gray-600"
                )}>
                  Long-press to toggle between legacy and modern screens
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={isDarkMode ? "#93c5fd" : "#3b82f6"} />
            </Pressable>
          </View>

          {/* Sync Actions */}
          <View className={cn(
            "rounded-xl p-4 mb-6",
            isDarkMode ? "bg-slate-800 border border-slate-700" : "bg-white border border-gray-200"
          )}>
            <Text className={cn(
              "text-lg font-bold mb-4",
              isDarkMode ? "text-white" : "text-gray-900"
            )}>
              🔄 Sync Actions
            </Text>
            
            <ActionButton
              icon="sync"
              label="Force Sync All Data"
              description="Re-fetch all data from Supabase"
              onPress={handleForceSyncAll}
              isDarkMode={isDarkMode}
              color="blue"
            />
          </View>

          {/* Clear Cache Actions */}
          <View className={cn(
            "rounded-xl p-4 mb-6",
            isDarkMode ? "bg-slate-800 border border-slate-700" : "bg-white border border-gray-200"
          )}>
            <Text className={cn(
              "text-lg font-bold mb-4",
              isDarkMode ? "text-white" : "text-gray-900"
            )}>
              🗑️ Clear Cache
            </Text>
            
            <ActionButton
              icon="trash-outline"
              label="Clear Task Cache"
              description="Clear cached tasks only"
              onPress={handleClearTaskCache}
              isDarkMode={isDarkMode}
              color="orange"
            />
            
            <ActionButton
              icon="trash-outline"
              label="Clear Project Cache"
              description="Clear cached projects only"
              onPress={handleClearProjectCache}
              isDarkMode={isDarkMode}
              color="orange"
            />
            
            <ActionButton
              icon="trash-outline"
              label="Clear User Cache"
              description="Clear cached users only"
              onPress={handleClearUserCache}
              isDarkMode={isDarkMode}
              color="orange"
            />
          </View>

          {/* Debug Actions */}
          <View className={cn(
            "rounded-xl p-4 mb-6",
            isDarkMode ? "bg-slate-800 border border-slate-700" : "bg-white border border-gray-200"
          )}>
            <Text className={cn(
              "text-lg font-bold mb-4",
              isDarkMode ? "text-white" : "text-gray-900"
            )}>
              🔍 Debug Tools
            </Text>
            
            <ActionButton
              icon="key-outline"
              label="View Storage Keys"
              description="See all AsyncStorage keys"
              onPress={handleViewStorageKeys}
              isDarkMode={isDarkMode}
              color="purple"
            />
            
            <ActionButton
              icon="flask-outline"
              label="Initialize Sprint 7 Staging Sandbox"
              description="Load or switch the canonical Tristan/Herman QA dataset"
              onPress={handleInitializeSprint7Sandbox}
              isDarkMode={isDarkMode}
              color="blue"
              disabled={isInitializingSprint7Sandbox}
            />

            <View className="mb-3">
              <Text className={cn(
                "text-xs font-semibold uppercase tracking-wide mb-2",
                isDarkMode ? "text-slate-400" : "text-gray-500"
              )}>
                Sprint 7 Quick Presets
              </Text>
              <View className="flex-row flex-wrap gap-2">
                <ScenarioPresetButton
                  label="Preset A: Rejection Loop"
                  onPress={() => handleLoadScenarioPreset("A")}
                  isDarkMode={isDarkMode}
                  disabled={!sprint7SandboxLoaded || isInitializingSprint7Sandbox}
                  testID="developer-settings__preset_a"
                />
                <ScenarioPresetButton
                  label="Preset B: Overdue Crunch"
                  onPress={() => handleLoadScenarioPreset("B")}
                  isDarkMode={isDarkMode}
                  disabled={!sprint7SandboxLoaded || isInitializingSprint7Sandbox}
                  testID="developer-settings__preset_b"
                />
                <ScenarioPresetButton
                  label="Preset C: Isolation Wall"
                  onPress={() => handleLoadScenarioPreset("C")}
                  isDarkMode={isDarkMode}
                  disabled={!sprint7SandboxLoaded || isInitializingSprint7Sandbox}
                  testID="developer-settings__preset_c"
                />
              </View>
              {!sprint7SandboxLoaded ? (
                <Text className={cn(
                  "text-xs mt-2",
                  isDarkMode ? "text-slate-500" : "text-gray-500"
                )}>
                  Initialize the Sprint 7 sandbox first to enable these presets.
                </Text>
              ) : null}
            </View>

            <ActionButton
              icon="cloud-upload-outline"
              label="Test File Upload"
              description="Test Supabase storage upload functionality"
              onPress={handleTestUpload}
              isDarkMode={isDarkMode}
              color="green"
              disabled={isTestingUpload}
            />
          </View>

          {/* Danger Zone */}
          <View className={cn(
            "rounded-xl p-4 mb-6 border-2",
            isDarkMode ? "bg-red-900/20 border-red-600" : "bg-red-50 border-red-400"
          )}>
            <Text className={cn(
              "text-lg font-bold mb-2",
              isDarkMode ? "text-red-400" : "text-red-700"
            )}>
              ⚠️ Danger Zone
            </Text>
            <Text className={cn(
              "text-sm mb-4",
              isDarkMode ? "text-red-200" : "text-red-600"
            )}>
              These actions cannot be undone!
            </Text>
            
            <ActionButton
              icon="nuclear"
              label="Clear All Local Data & Logout"
              description="Wipe everything and start fresh"
              onPress={handleClearAllLocalData}
              isDarkMode={isDarkMode}
              color="red"
              disabled={isClearing}
            />
          </View>

          {/* Info */}
          <View className={cn(
            "rounded-xl p-4 mb-6",
            isDarkMode ? "bg-slate-800 border border-slate-700" : "bg-white border border-gray-200"
          )}>
            <Text className={cn(
              "text-sm",
              isDarkMode ? "text-slate-400" : "text-gray-600"
            )}>
              ℹ️ Note: Clearing local data does NOT affect your Supabase database. 
              All data will be re-downloaded when you login again.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// Helper Components
interface DataRowProps {
  label: string;
  count: number;
  isDarkMode: boolean;
}

function DataRow({ label, count, isDarkMode }: DataRowProps) {
  return (
    <View className="flex-row justify-between items-center py-2">
      <Text className={cn(
        "text-base",
        isDarkMode ? "text-slate-300" : "text-gray-700"
      )}>
        {label}
      </Text>
      <View className={cn(
        "px-3 py-1 rounded-full",
        isDarkMode ? "bg-blue-900/40" : "bg-blue-100"
      )}>
        <Text className={cn(
          "text-base font-bold",
          isDarkMode ? "text-blue-400" : "text-blue-700"
        )}>
          {count}
        </Text>
      </View>
    </View>
  );
}

interface ActionButtonProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  description: string;
  onPress: () => void;
  isDarkMode: boolean;
  color: "blue" | "orange" | "purple" | "red" | "green";
  disabled?: boolean;
}

interface ScenarioPresetButtonProps {
  label: string;
  onPress: () => void;
  isDarkMode: boolean;
  disabled?: boolean;
  testID?: string;
}

function ActionButton({ 
  icon, 
  label, 
  description, 
  onPress, 
  isDarkMode, 
  color,
  disabled = false 
}: ActionButtonProps) {
  const colorMap = {
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

  const colors = colorMap[color];

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={cn(
        "rounded-lg p-4 mb-3 border flex-row items-center",
        colors.bg,
        colors.border,
        disabled && "opacity-50"
      )}
    >
      <Ionicons name={icon} size={24} color={colors.icon} />
      <View className="flex-1 ml-3">
        <Text className={cn("text-base font-semibold", colors.text)}>
          {label}
        </Text>
        <Text className={cn("text-sm mt-1", colors.desc)}>
          {description}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.icon} />
    </Pressable>
  );
}

function ScenarioPresetButton({
  label,
  onPress,
  isDarkMode,
  disabled = false,
  testID,
}: ScenarioPresetButtonProps) {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={disabled}
      className={cn(
        "px-3 py-2 rounded-full border",
        isDarkMode ? "bg-slate-900 border-slate-700" : "bg-slate-50 border-slate-300",
        disabled && "opacity-50"
      )}
    >
      <Text className={cn(
        "text-xs font-medium",
        isDarkMode ? "text-slate-200" : "text-slate-700"
      )}>
        {label}
      </Text>
    </Pressable>
  );
}
