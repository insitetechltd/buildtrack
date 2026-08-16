import React from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";

import ModernScreenHeader from "@/components/ModernScreenHeader";
import BrandHeaderTitle from "@/components/BrandHeaderTitle";
import type {
  DevAdminEnvironmentItem,
  DevAdminToolActionItem,
} from "@/ui/contracts/viewAdapters";
import {
  useDevAdminViewAdapter,
  type DevAdminViewAdapterProps,
} from "@/ui/viewAdapters/useDevAdminViewAdapter";

type DevAdminScreenProps = DevAdminViewAdapterProps;

function getToneClasses(tone: DevAdminEnvironmentItem["tone"]) {
  if (tone === "production") {
    return {
      badge: "bg-red-100",
      badgeText: "text-red-600",
      border: "border-red-200",
      dot: "bg-red-500",
      card: "bg-red-50",
    };
  }

  if (tone === "testing") {
    return {
      badge: "bg-yellow-100",
      badgeText: "text-yellow-700",
      border: "border-yellow-200",
      dot: "bg-yellow-500",
      card: "bg-yellow-50",
    };
  }

  return {
    badge: "bg-blue-100",
    badgeText: "text-blue-600",
    border: "border-blue-200",
    dot: "bg-blue-500",
    card: "bg-blue-50",
  };
}

function EnvironmentRow({
  item,
  onPress,
  onRemove,
}: {
  item: DevAdminEnvironmentItem;
  onPress: (envName: string) => void;
  onRemove: (envName: string) => void;
}) {
  const tone = getToneClasses(item.tone);

  return (
    <View className={`rounded-xl border p-3 mb-3 ${tone.border} ${item.isActive ? tone.card : "bg-gray-50"}`}>
      <View className="flex-row items-center">
        <Pressable onPress={() => onPress(item.envName)} className="flex-1">
          <View className="flex-row items-center">
            <Text className="font-semibold text-gray-900 capitalize">{item.label}</Text>
            {item.isActive ? <View className={`ml-2 h-2.5 w-2.5 rounded-full ${tone.dot}`} /> : null}
          </View>
          <Text className="text-xs text-gray-500 mt-1" numberOfLines={1}>
            {item.url}
          </Text>
        </Pressable>

        {item.isRemovable ? (
          <Pressable onPress={() => onRemove(item.envName)} className="ml-3 p-2">
            <Ionicons name="trash-outline" size={18} color="#ef4444" />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function ToolActionCard({
  item,
  onPress,
  isBusy,
}: {
  item: DevAdminToolActionItem;
  onPress: (actionId: DevAdminToolActionItem["actionId"]) => void;
  isBusy: boolean;
}) {
  return (
    <Pressable
      onPress={() => onPress(item.actionId)}
      disabled={isBusy}
      className="flex-row items-center rounded-xl bg-gray-50 p-4 mb-3 border border-gray-200"
      style={{ borderLeftWidth: 4, borderLeftColor: item.color }}
    >
      <Ionicons name={item.icon as keyof typeof Ionicons.glyphMap} size={22} color={item.color} />
      <View className="flex-1 ml-3">
        <Text className="font-semibold text-gray-900">{item.title}</Text>
        <Text className="text-xs text-gray-500 mt-1">{item.description}</Text>
      </View>
      {isBusy ? <ActivityIndicator size="small" color={item.color} /> : null}
    </Pressable>
  );
}

export default function DevAdminScreen(props: DevAdminScreenProps) {
  const { output, actions } = useDevAdminViewAdapter(props);

  if (!output.access.isAllowed) {
    return (
      <SafeAreaView edges={["bottom", "left", "right"]} className="flex-1 bg-[#E7F4F8]">
        <StatusBar style="light" />
        <ModernScreenHeader
          title="Dev Admin"
          titleNode={<BrandHeaderTitle label="Dev Admin" subtitle="Admin" />}
          showBackButton
          onBackPress={actions.handleNavigateBack}
          className="border-b-0 bg-[#08576E] pb-2"
        />
        <View className="flex-1 items-center justify-center px-6">
          <Ionicons name="shield-outline" size={64} color="#ef4444" />
          <Text className="mt-4 text-2xl font-bold text-gray-900 text-center">Access Denied</Text>
          <Text className="mt-2 text-base text-gray-500 text-center">
            {output.access.deniedMessage || "Access denied."}
          </Text>
          <Text className="mt-4 text-sm text-gray-400 text-center">
            Unauthorized access attempts are logged.
          </Text>
          <Pressable
            onPress={actions.handleNavigateBack}
            className="mt-6 rounded-lg bg-blue-600 px-6 py-3"
          >
            <Text className="text-base font-semibold text-white">Go Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const activeTone = output.activeEnvironment ? getToneClasses(output.activeEnvironment.tone) : null;

  return (
    <SafeAreaView edges={["bottom", "left", "right"]} className="flex-1 bg-[#E7F4F8]">
      <StatusBar style="light" />

      <ModernScreenHeader
        title={output.title}
        titleNode={<BrandHeaderTitle label={output.title} subtitle="Admin" />}
        showBackButton
        onBackPress={actions.handleNavigateBack}
        className="border-b-0 bg-[#08576E] pb-2"
      />

      <ScrollView className="flex-1">
        <View className="px-4 py-4">
          <View className="rounded-xl bg-white p-4 mb-3 border border-gray-200">
            <Text className="text-xs text-gray-500 mb-1">{output.userInfoLabel}</Text>
            <Text className="text-lg font-semibold text-gray-900">{output.access.displayName}</Text>
            <Text className="text-sm text-gray-600">{output.access.email}</Text>
            <Text className="text-xs text-gray-500 mt-1">Role: {output.access.roleLabel}</Text>
          </View>

          {output.activeEnvironment ? (
            <View className="rounded-xl bg-white p-4 mb-3 border border-gray-200">
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-xs text-gray-500">ACTIVE ENVIRONMENT</Text>
                <View className={`rounded-full px-3 py-1 ${activeTone?.badge}`}>
                  <Text className={`text-xs font-semibold ${activeTone?.badgeText}`}>
                    {output.activeEnvironment.badgeLabel}
                  </Text>
                </View>
              </View>
              <Text className="text-sm font-medium text-gray-900 capitalize">
                {output.activeEnvironment.name}
              </Text>
              <Text className="text-xs text-gray-500 mt-1">{output.activeEnvironment.url}</Text>
            </View>
          ) : null}

          <View className="rounded-xl bg-white p-4 mb-3 border border-gray-200">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-xs text-gray-500">{output.environmentSection.title}</Text>
              <Pressable
                onPress={actions.handleToggleAddEnvironment}
                className="flex-row items-center"
              >
                <Ionicons name="add-circle-outline" size={20} color="#2196F3" />
                <Text className="ml-1 text-sm text-blue-600">
                  {output.environmentSection.addActionLabel}
                </Text>
              </Pressable>
            </View>

            {output.environmentSection.environments.map((environment) => (
              <EnvironmentRow
                key={environment.id}
                item={environment}
                onPress={actions.handleEnvironmentPress}
                onRemove={actions.handleRemoveEnvironment}
              />
            ))}

            {output.addEnvironmentForm.isVisible ? (
              <View className="mt-2 rounded-xl bg-blue-50 p-3 border border-blue-200">
                <Text className="text-sm font-semibold text-gray-900 mb-2">Add New Environment</Text>
                <TextInput
                  placeholder="Environment Name (e.g., staging)"
                  value={output.addEnvironmentForm.name}
                  onChangeText={actions.setNewEnvironmentName}
                  className="rounded-lg bg-white px-3 py-2 text-sm mb-2"
                />
                <TextInput
                  placeholder="Supabase URL"
                  value={output.addEnvironmentForm.url}
                  onChangeText={actions.setNewEnvironmentUrl}
                  className="rounded-lg bg-white px-3 py-2 text-sm mb-2"
                  autoCapitalize="none"
                />
                <TextInput
                  placeholder="Anon Key"
                  value={output.addEnvironmentForm.anonKey}
                  onChangeText={actions.setNewEnvironmentKey}
                  className="rounded-lg bg-white px-3 py-2 text-sm mb-3"
                  autoCapitalize="none"
                  secureTextEntry
                />
                <View className="flex-row gap-2">
                  <Pressable
                    onPress={actions.handleSubmitNewEnvironment}
                    disabled={!output.addEnvironmentForm.canSubmit}
                    className={`flex-1 rounded-lg py-3 ${
                      output.addEnvironmentForm.canSubmit ? "bg-blue-600" : "bg-blue-300"
                    }`}
                  >
                    <Text className="text-center font-semibold text-white">Add</Text>
                  </Pressable>
                  <Pressable
                    onPress={actions.handleToggleAddEnvironment}
                    className="flex-1 rounded-lg bg-gray-200 py-3"
                  >
                    <Text className="text-center font-semibold text-gray-700">Cancel</Text>
                  </Pressable>
                </View>
              </View>
            ) : null}
          </View>

          <View className="rounded-xl bg-white p-4 mb-3 border border-gray-200">
            <Text className="text-xs text-gray-500 mb-3">{output.toolSection.title}</Text>
            {output.toolSection.actions.map((action) => (
              <ToolActionCard
                key={action.id}
                item={action}
                onPress={actions.handleToolActionPress}
                isBusy={output.loadingState.isBusy}
              />
            ))}
          </View>

          {output.productionWarning ? (
            <View className="rounded-xl border border-red-300 bg-red-100 p-4 mb-6">
              <View className="flex-row items-center">
                <Ionicons name="warning" size={22} color="#ef4444" />
                <Text className="ml-2 flex-1 font-semibold text-red-600">
                  {output.productionWarning}
                </Text>
              </View>
            </View>
          ) : null}

          <View className="h-8" />
        </View>
      </ScrollView>

      {output.loadingState.isBusy ? (
        <View className="absolute inset-0 items-center justify-center bg-black/50">
          <View className="rounded-xl bg-white p-6">
            <ActivityIndicator size="large" color="#2196F3" />
            <Text className="mt-3 text-gray-700">{output.loadingState.loadingMessage}</Text>
          </View>
        </View>
      ) : null}
    </SafeAreaView>
  );
}
