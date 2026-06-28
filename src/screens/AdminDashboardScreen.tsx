import React from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Modal,
  TextInput,
  Image,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";

import ModalHandle from "../components/ModalHandle";
import StandardHeader from "../components/StandardHeader";
import { cn } from "../utils/cn";
import type {
  AdminDashboardBannerSettingsModel,
  AdminDashboardQuickActionItem,
  AdminDashboardStatCard,
} from "../ui/contracts/viewAdapters";
import {
  useAdminDashboardViewAdapter,
  type AdminDashboardViewAdapterProps,
} from "../ui/viewAdapters/useAdminDashboardViewAdapter";

type AdminDashboardScreenProps = AdminDashboardViewAdapterProps;

function StatCard({ card }: { card: AdminDashboardStatCard }) {
  return (
    <View className={cn("w-[48%] rounded-xl p-4 mb-3", card.color)}>
      <View className="flex-row items-center justify-between mb-2">
        <Ionicons name={card.icon as any} size={22} color={card.iconColor} />
        <Text className={cn("text-3xl font-bold", card.textColor)}>{card.value}</Text>
      </View>
      <Text className="text-base font-semibold text-gray-900">{card.label}</Text>
      {card.subtitle ? <Text className="text-sm text-gray-600 mt-1">{card.subtitle}</Text> : null}
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
      className={cn("rounded-xl border p-4 mb-3", action.color, action.borderColor)}
    >
      <View className="flex-row items-start">
        <View className="w-12 h-12 rounded-lg bg-white/70 items-center justify-center mr-4">
          <Ionicons name={action.icon as any} size={24} color={action.iconColor} />
        </View>
        <View className="flex-1">
          <Text
            testID={`admin-quick-action-trigger-${action.actionId}`}
            onPress={onPress}
            className="text-lg font-semibold text-gray-900 mb-1"
          >
            {action.label}
          </Text>
          <Text className="text-base text-gray-600">{action.description}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
      </View>
    </Pressable>
  );
}

function BannerSettingsModal({
  bannerSettings,
  onClose,
  onChangeText,
  onSelectColorPreset,
  onToggleVisibility,
  onPickImage,
  onRemoveImage,
  onSave,
}: {
  bannerSettings: AdminDashboardBannerSettingsModel;
  onClose: () => void;
  onChangeText: (value: string) => void;
  onSelectColorPreset: (presetId: string) => void;
  onToggleVisibility: () => void;
  onPickImage: () => void;
  onRemoveImage: () => void;
  onSave: () => void;
}) {
  if (!bannerSettings.isModalVisible || !Modal) {
    return null;
  }

  return (
    <Modal
      visible={bannerSettings.isModalVisible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView edges={["bottom", "left", "right"]} className="flex-1 bg-gray-50">
        <StatusBar style="dark" />

        <ModalHandle />

        <View className="flex-row items-center bg-white border-b border-gray-200 px-6 py-4">
          <Pressable onPress={onClose} className="mr-4 w-10 h-10 items-center justify-center">
            <Ionicons name="close" size={24} color="#374151" />
          </Pressable>
          <Text className="text-2xl font-semibold text-gray-900 flex-1">
            Company Banner Settings
          </Text>
        </View>

        <ScrollView className="flex-1 px-6 py-4">
          <View className="mb-6">
            <Text className="text-base font-semibold text-gray-700 mb-2">Preview</Text>
            {bannerSettings.isVisible ? (
              <View className="rounded-lg overflow-hidden">
                {bannerSettings.imageUri ? (
                  <Image
                    source={{ uri: bannerSettings.imageUri }}
                    className="w-full h-24"
                    resizeMode="cover"
                  />
                ) : (
                  <View
                    className="px-4 py-3"
                    style={{ backgroundColor: bannerSettings.backgroundColor }}
                  >
                    <Text
                      className="text-base font-medium text-center"
                      style={{ color: bannerSettings.textColor }}
                    >
                      {bannerSettings.text || "Your banner text will appear here"}
                    </Text>
                  </View>
                )}
              </View>
            ) : (
              <View className="bg-gray-100 px-4 py-3 rounded-lg border border-gray-300">
                <Text className="text-base text-gray-500 text-center">Banner is hidden</Text>
              </View>
            )}
          </View>

          <View className="mb-6">
            <View className="flex-row items-center justify-between mb-3">
              <View className="flex-1">
                <Text className="text-base font-semibold text-gray-700">Banner Image (Optional)</Text>
                <Text className="text-sm text-gray-500 mt-1">Recommended size: 1200x225px</Text>
              </View>
              {bannerSettings.imageUri ? (
                <Pressable
                  onPress={onRemoveImage}
                  className="w-8 h-8 bg-red-500 rounded-full items-center justify-center ml-2"
                >
                  <Ionicons name="trash-outline" size={16} color="white" />
                </Pressable>
              ) : null}
            </View>

            <Pressable
              onPress={onPickImage}
              className="bg-white rounded-lg border border-dashed border-gray-300 overflow-hidden"
            >
              {bannerSettings.imageUri ? (
                <Image
                  source={{ uri: bannerSettings.imageUri }}
                  style={{
                    width: "100%",
                    height: 128,
                    backgroundColor: "#f3f4f6",
                  }}
                  resizeMode="cover"
                />
              ) : (
                <View className="p-4 items-center">
                  <Ionicons name="images-outline" size={24} color="#9ca3af" />
                  <Text className="text-gray-400 text-base mt-1">Tap to add banner image</Text>
                </View>
              )}
            </Pressable>
          </View>

          {!bannerSettings.imageUri ? (
            <>
              <View className="mb-4">
                <Text className="text-base font-semibold text-gray-700 mb-2">Banner Text</Text>
                <TextInput
                  className="bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-900"
                  placeholder="Enter banner message..."
                  value={bannerSettings.text}
                  onChangeText={onChangeText}
                  multiline
                />
              </View>

              <View className="mb-4">
                <Text className="text-base font-semibold text-gray-700 mb-2">Color Preset</Text>
                <View className="flex-row flex-wrap -mx-1">
                  {bannerSettings.colorPresets.map((preset) => (
                    <Pressable
                      key={preset.id}
                      onPress={() => onSelectColorPreset(preset.id)}
                      className="w-1/3 px-1 mb-2"
                    >
                      <View
                        className="rounded-lg py-3 items-center justify-center border-2"
                        style={{
                          backgroundColor: preset.backgroundColor,
                          borderColor:
                            bannerSettings.backgroundColor === preset.backgroundColor
                              ? "#374151"
                              : "transparent",
                        }}
                      >
                        <Text style={{ color: preset.textColor }} className="text-sm font-medium">
                          {preset.label}
                        </Text>
                      </View>
                    </Pressable>
                  ))}
                </View>
              </View>
            </>
          ) : null}

          <View className="mb-4">
            <View className="bg-white rounded-lg border border-gray-300 px-4 py-3">
              <View className="flex-row items-center justify-between">
                <View className="flex-1 mr-4">
                  <Text className="text-base font-semibold text-gray-900 mb-1">
                    Banner Visibility
                  </Text>
                  <Text className="text-sm text-gray-600">
                    {bannerSettings.isVisible
                      ? "Banner will be shown to all users"
                      : "Banner is hidden from all users"}
                  </Text>
                </View>
                <Pressable
                  onPress={onToggleVisibility}
                  className={cn(
                    "w-12 h-7 rounded-full flex-row items-center px-0.5",
                    bannerSettings.isVisible ? "bg-green-500" : "bg-gray-300",
                  )}
                >
                  <View
                    className={cn(
                      "w-6 h-6 rounded-full bg-white",
                      bannerSettings.isVisible ? "ml-auto" : undefined,
                    )}
                  />
                </Pressable>
              </View>
            </View>
          </View>

          <Pressable
            onPress={onSave}
            className="bg-blue-600 rounded-lg py-4 items-center justify-center mt-2"
          >
            <Text className="text-white font-semibold text-lg">Save Banner Settings</Text>
          </Pressable>

          <Pressable
            onPress={onClose}
            className="bg-gray-200 rounded-lg py-4 items-center justify-center mt-3 mb-6"
          >
            <Text className="text-gray-700 font-semibold text-lg">Cancel</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

export default function AdminDashboardScreen(props: AdminDashboardScreenProps) {
  const { output, actions } = useAdminDashboardViewAdapter(props);
  const RefreshControlComponent = RefreshControl;
  const ModalComponent = Modal;

  if (!output.readiness.hasUsableData) {
    return null;
  }

  if (!output.access.isAllowed) {
    return (
      <SafeAreaView edges={["bottom", "left", "right"]} className="flex-1 bg-gray-50">
        <StatusBar style="dark" />
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-gray-500 text-center">
            {output.access.deniedMessage || "Access denied."}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["bottom", "left", "right"]} className="flex-1 bg-gray-50">
      <StatusBar style="dark" />

      <StandardHeader
        title="Admin Dashboard"
        rightElement={
          <Pressable
            testID="admin-profile-trigger"
            onPress={actions.toggleProfileMenu}
            className="flex-row items-center"
          >
            <View className="w-8 h-8 bg-blue-600 rounded-full items-center justify-center">
              <Text className="text-white font-bold text-base">
                {output.profileMenu.avatarInitial}
              </Text>
            </View>
          </Pressable>
        }
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
        {output.companyScope.companyName ? (
          <View className="px-6">
            <View className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-2">
              <View className="flex-row items-center">
                <Ionicons name="business" size={16} color="#3b82f6" />
                <Text className="text-blue-900 font-medium ml-2 flex-1">
                  {output.companyScope.companyName}
                </Text>
              </View>
              {output.companyScope.subtitle ? (
                <Text className="text-blue-700 text-sm mt-1">{output.companyScope.subtitle}</Text>
              ) : null}
            </View>
          </View>
        ) : null}

        <View className="px-6 pb-4 pt-6">
          <Text className="text-xl font-semibold text-gray-900 mb-3">Company Overview</Text>
          <View className="flex-row flex-wrap justify-between">
            {output.topLevelStats.map((card) => (
              <StatCard key={card.id} card={card} />
            ))}
          </View>
        </View>

        <View className="px-6 pb-4">
          <Text className="text-xl font-semibold text-gray-900 mb-3">Administrative Actions</Text>
          {output.quickActions
            .filter((action) => action.isVisible)
            .map((action) => (
              <QuickActionCard
                key={action.id}
                action={action}
                onPress={() => actions.pressQuickAction(action.actionId)}
              />
            ))}
        </View>
      </ScrollView>

      <BannerSettingsModal
        bannerSettings={output.bannerSettings}
        onClose={actions.closeBannerSettings}
        onChangeText={actions.setBannerText}
        onSelectColorPreset={actions.selectBannerColorPreset}
        onToggleVisibility={actions.toggleBannerVisibility}
        onPickImage={() => void actions.pickBannerImage()}
        onRemoveImage={actions.removeBannerImage}
        onSave={() => void actions.saveBannerSettings()}
      />

      {ModalComponent ? (
        <ModalComponent
          visible={output.profileMenu.isVisible}
          animationType="fade"
          transparent={true}
          onRequestClose={actions.toggleProfileMenu}
        >
          <Pressable className="flex-1 bg-black/50" onPress={actions.toggleProfileMenu}>
            <View
              className="absolute top-16 right-4 bg-white rounded-xl shadow-lg overflow-hidden min-w-[200px]"
              style={{
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 8,
              }}
            >
              <View className="bg-purple-600 px-4 py-3 border-b border-purple-700">
                <View className="flex-row items-center">
                  <View className="w-10 h-10 bg-white rounded-full items-center justify-center mr-3">
                    <Text className="text-purple-600 font-bold text-lg">
                      {output.profileMenu.avatarInitial}
                    </Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-white font-semibold text-base" numberOfLines={1}>
                      {output.profileMenu.displayName}
                    </Text>
                    <Text className="text-purple-100 text-sm capitalize">
                      {output.profileMenu.roleLabel}
                    </Text>
                  </View>
                </View>
              </View>

              <View className="py-2">
                <Pressable
                  onPress={actions.navigateToProfile}
                  className="flex-row items-center px-4 py-3 active:bg-gray-100"
                >
                  <Ionicons name="person-outline" size={22} color="#9333ea" />
                  <Text className="text-gray-900 text-base font-medium ml-3">
                    Profile & Settings
                  </Text>
                </Pressable>

                <View className="h-px bg-gray-200 mx-4" />

                <Pressable
                  onPress={actions.confirmLogout}
                  className="flex-row items-center px-4 py-3 active:bg-gray-100"
                >
                  <Ionicons name="log-out-outline" size={22} color="#ef4444" />
                  <Text className="text-red-600 text-base font-medium ml-3">Logout</Text>
                </Pressable>
              </View>
            </View>
          </Pressable>
        </ModalComponent>
      ) : null}
    </SafeAreaView>
  );
}
