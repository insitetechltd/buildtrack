import React, { useCallback, useMemo, useRef } from "react";
import {
  NativeSyntheticEvent,
  View,
  Text,
  ScrollView,
  Pressable,
  Modal,
  TextInput,
  TextInputKeyPressEventData,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";

import ModernScreenHeader from "../components/ModernScreenHeader";
import BrandHeaderTitle from "../components/BrandHeaderTitle";
import ModalHandle from "../components/ModalHandle";
import { cn } from "../utils/cn";
import { useTranslation } from "../utils/useTranslation";
import {
  useProfileViewAdapter,
  type ProfileScreenProps,
} from "../ui/viewAdapters/useProfileViewAdapter";
import type { ProfileSystemStatusItem } from "../ui/contracts/viewAdapters";
import {
  createFormNavigationRegistry,
  getNextFocusableFieldId,
  getPreviousFocusableFieldId,
  getTabNavigationDirection,
} from "../utils/formNavigation";

function MenuOption({
  title,
  icon,
  onPress,
  showChevron = true,
  colorTone = "default",
  rightText,
  badge,
  testID,
}: {
  title: string;
  icon: string;
  onPress: () => void;
  showChevron?: boolean;
  colorTone?: "default" | "danger";
  rightText?: string;
  badge?: number;
  testID?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      testID={testID}
      className="flex-row items-center border-b border-gray-100 bg-white px-6 py-4"
    >
      <Ionicons name={icon as any} size={20} color="#6b7280" />
      <Text
        className={cn(
          "ml-3 flex-1 text-lg",
          colorTone === "danger" ? "text-red-600" : "text-gray-900",
        )}
      >
        {title}
      </Text>
      {badge !== undefined && badge > 0 ? (
        <View className="mr-2 h-6 min-w-[24px] items-center justify-center rounded-full bg-red-500 px-2">
          <Text className="text-xs font-bold text-white">{badge > 99 ? "99+" : badge}</Text>
        </View>
      ) : null}
      {rightText && !badge ? <Text className="mr-2 text-base text-gray-500">{rightText}</Text> : null}
      {showChevron ? <Ionicons name="chevron-forward" size={20} color="#d1d5db" /> : null}
    </Pressable>
  );
}

function getSystemStatusTextClassName(item: ProfileSystemStatusItem): string {
  switch (item.valueTone) {
    case "positive":
      return "text-green-700";
    case "negative":
      return "text-red-700";
    case "warning":
      return "text-yellow-700";
    default:
      return "text-gray-900";
  }
}

export default function ProfileScreen({
  onNavigateBack,
  onNavigateToDeveloperSettings,
  onNavigateToOwnerConsole,
  onNavigateToPendingUsers,
  onNavigateToProfile,
  onNavigateToProjectPicker,
}: ProfileScreenProps) {
  const t = useTranslation();
  const { output, actions } = useProfileViewAdapter({
    onNavigateBack,
    onNavigateToDeveloperSettings,
    onNavigateToOwnerConsole,
    onNavigateToPendingUsers,
    onNavigateToProfile,
    onNavigateToProjectPicker,
  });
  const currentPasswordInputRef = useRef<TextInput>(null);
  const newPasswordInputRef = useRef<TextInput>(null);
  const confirmPasswordInputRef = useRef<TextInput>(null);
  const passwordFormNavigationRegistry = useMemo(
    () =>
      createFormNavigationRegistry([
        { fieldId: "currentPassword", isFocusable: true },
        { fieldId: "newPassword", isFocusable: true },
        { fieldId: "confirmPassword", isFocusable: true },
        { fieldId: "submit", isFocusable: true },
      ]),
    [],
  );
  const focusPasswordField = useCallback(
    (fieldId: "currentPassword" | "newPassword" | "confirmPassword" | "submit" | null) => {
      if (!fieldId || fieldId === "submit") {
        currentPasswordInputRef.current?.blur?.();
        newPasswordInputRef.current?.blur?.();
        confirmPasswordInputRef.current?.blur?.();
        return;
      }

      const focusTargetMap = {
        currentPassword: currentPasswordInputRef,
        newPassword: newPasswordInputRef,
        confirmPassword: confirmPasswordInputRef,
      } satisfies Record<
        "currentPassword" | "newPassword" | "confirmPassword",
        React.RefObject<TextInput | null>
      >;

      focusTargetMap[fieldId].current?.focus?.();
    },
    [],
  );
  const movePasswordFieldFocus = useCallback(
    (
      activeFieldId: "currentPassword" | "newPassword" | "confirmPassword",
      direction: "next" | "previous" = "next",
    ) => {
      const targetFieldId =
        direction === "previous"
          ? getPreviousFocusableFieldId(passwordFormNavigationRegistry, activeFieldId)
          : getNextFocusableFieldId(passwordFormNavigationRegistry, activeFieldId);

      focusPasswordField(
        (targetFieldId as "currentPassword" | "newPassword" | "confirmPassword" | "submit" | null) ??
          null,
      );
    },
    [focusPasswordField, passwordFormNavigationRegistry],
  );
  const handlePasswordFieldKeyPress = useCallback(
    (
      activeFieldId: "currentPassword" | "newPassword" | "confirmPassword",
      event: NativeSyntheticEvent<TextInputKeyPressEventData>,
    ) => {
      if (event.nativeEvent.key !== "Tab") {
        return;
      }

      movePasswordFieldFocus(activeFieldId, getTabNavigationDirection(event));
    },
    [movePasswordFieldFocus],
  );

  if (!output.readiness.hasUsableData) {
    return null;
  }

  return (
    <SafeAreaView edges={["bottom", "left", "right"]} className="flex-1 bg-[#E7F4F8]">
      <StatusBar style="light" />

      <ModernScreenHeader
        title={t.profile.profile}
        titleNode={<BrandHeaderTitle subtitle={t.profile.profile} />}
        showBackButton={true}
        onBackPress={onNavigateBack}
        onNavigateToProfile={onNavigateToProfile}
        onNavigateToProjectPicker={onNavigateToProjectPicker}
        className="border-b-0 bg-[#08576E] pb-2"
      />

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="mx-6 mt-4 rounded-xl border border-gray-200 bg-white">
          <View className="items-center py-6">
            <View className="mb-4 h-20 w-20 items-center justify-center rounded-full bg-blue-600">
              <Text className="text-3xl font-bold text-white">{output.profileCard.initial}</Text>
            </View>
            <Text className="text-2xl font-bold text-gray-900">{output.profileCard.name}</Text>
            <Text className="capitalize text-gray-600">{output.profileCard.roleLabel}</Text>
            <Text className="mt-1 text-base text-gray-500">{output.profileCard.email}</Text>
            {output.profileCard.phone ? (
              <Text className="text-base text-gray-500">{output.profileCard.phone}</Text>
            ) : null}
          </View>
        </View>

        {output.sections.map((section) => (
          <View key={section.id} className="mt-6">
            <Text className="mb-2 px-6 text-xl font-semibold text-gray-900">{section.title}</Text>
            <View className="mx-6 rounded-xl border border-gray-200 bg-white">
              {section.items.map((item) => (
                <MenuOption
                  key={item.id}
                  testID={`profile-menu-${item.actionId}`}
                  title={item.title}
                  icon={item.icon}
                  rightText={item.rightText}
                  badge={item.badge}
                  showChevron={item.showChevron}
                  colorTone={item.colorTone}
                  onPress={() => {
                    void actions.handleMenuAction(item.actionId);
                  }}
                />
              ))}
            </View>
          </View>
        ))}

        <View className="mb-4 mt-6 px-6">
          <Text className="mb-2 text-xl font-semibold text-gray-900">System Status</Text>
          <View className="rounded-xl border border-gray-200 bg-white p-4">
            {output.systemStatusItems.map((item, index) => (
              <React.Fragment key={item.id}>
                {index > 0 ? <View className="my-2 h-px bg-gray-200" /> : null}
                <View className="flex-row items-center justify-between py-2">
                  <View className="flex-1 flex-row items-center">
                    <View
                      className="mr-3 h-3 w-3 rounded-full"
                      style={{ backgroundColor: item.indicatorColor }}
                    />
                    <Text className="text-base text-gray-700">{item.label}</Text>
                  </View>
                  <Text className={cn("text-base font-medium", getSystemStatusTextClassName(item))}>
                    {item.value}
                  </Text>
                </View>
              </React.Fragment>
            ))}
          </View>
        </View>
      </ScrollView>

      {output.passwordChange.visible ? (
        <Modal
          visible={output.passwordChange.visible}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={actions.closePasswordChange}
        >
          <SafeAreaView edges={["bottom", "left", "right"]} className="flex-1 bg-[#E7F4F8]">
            <StatusBar style="light" />

            <ModalHandle />

            <View className="flex-row items-center border-b border-gray-200 bg-white px-6 py-4">
              <Pressable
                onPress={actions.closePasswordChange}
                className="mr-4 h-10 w-10 items-center justify-center"
                disabled={output.passwordChange.isSubmitting}
              >
                <Ionicons
                  name="close"
                  size={24}
                  color={output.passwordChange.isSubmitting ? "#d1d5db" : "#374151"}
                />
              </Pressable>
              <Text className="flex-1 text-2xl font-semibold text-gray-900">Change Password</Text>
            </View>

            <ScrollView className="flex-1 px-6 py-4" showsVerticalScrollIndicator={false}>
              <View className="mb-4">
                <Text className="mb-2 text-lg font-semibold text-slate-900">Current Password</Text>
                <TextInput
                  ref={currentPasswordInputRef}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-3 text-lg text-gray-900"
                  placeholder="Enter your current password"
                  value={output.passwordChange.currentPassword}
                  onChangeText={actions.setCurrentPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  editable={!output.passwordChange.isSubmitting}
                  returnKeyType="next"
                  style={{ fontSize: 18 }}
                  onKeyPress={(event) => handlePasswordFieldKeyPress("currentPassword", event)}
                  onSubmitEditing={() => {
                    movePasswordFieldFocus("currentPassword");
                  }}
                  blurOnSubmit={false}
                />
              </View>

              <View className="mb-4">
                <Text className="mb-2 text-lg font-semibold text-slate-900">New Password</Text>
                <TextInput
                  ref={newPasswordInputRef}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-3 text-lg text-gray-900"
                  placeholder="Enter new password (min. 6 characters)"
                  value={output.passwordChange.newPassword}
                  onChangeText={actions.setNewPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  editable={!output.passwordChange.isSubmitting}
                  returnKeyType="next"
                  style={{ fontSize: 18 }}
                  onKeyPress={(event) => handlePasswordFieldKeyPress("newPassword", event)}
                  onSubmitEditing={() => {
                    movePasswordFieldFocus("newPassword");
                  }}
                  blurOnSubmit={false}
                />
              </View>

              <View className="mb-6">
                <Text className="mb-2 text-lg font-semibold text-slate-900">Confirm New Password</Text>
                <TextInput
                  ref={confirmPasswordInputRef}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-3 text-lg text-gray-900"
                  placeholder="Confirm new password"
                  value={output.passwordChange.confirmPassword}
                  onChangeText={actions.setConfirmPassword}
                  secureTextEntry
                  style={{ fontSize: 18 }}
                  autoCapitalize="none"
                  editable={!output.passwordChange.isSubmitting}
                  returnKeyType="done"
                  onKeyPress={(event) => handlePasswordFieldKeyPress("confirmPassword", event)}
                  onSubmitEditing={() => {
                    confirmPasswordInputRef.current?.blur();
                  }}
                />
              </View>

              <Pressable
                onPress={() => {
                  void actions.submitPasswordChange();
                }}
                disabled={output.passwordChange.isSubmitting}
                className={cn(
                  "items-center justify-center rounded-lg bg-blue-600 py-4",
                  output.passwordChange.isSubmitting && "opacity-50",
                )}
              >
                {output.passwordChange.isSubmitting ? (
                  <View className="flex-row items-center">
                    <ActivityIndicator color="white" size="small" className="mr-2" />
                    <Text className="text-lg font-semibold text-white">Changing Password...</Text>
                  </View>
                ) : (
                  <Text className="text-lg font-semibold text-white">Change Password</Text>
                )}
              </Pressable>
            </ScrollView>
          </SafeAreaView>
        </Modal>
      ) : null}

      {output.languagePicker.visible ? (
        <Modal
          visible={output.languagePicker.visible}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={actions.closeLanguagePicker}
        >
          <SafeAreaView edges={["bottom", "left", "right"]} className="flex-1 bg-[#E7F4F8]">
            <StatusBar style="light" />

            <ModalHandle />

            <View className="flex-row items-center border-b border-gray-200 bg-white px-6 py-4">
              <Pressable
                onPress={actions.closeLanguagePicker}
                className="mr-4 h-10 w-10 items-center justify-center"
              >
                <Ionicons name="close" size={24} color="#374151" />
              </Pressable>
              <Text className="flex-1 text-2xl font-semibold text-gray-900">
                {t.profile.selectLanguage}
              </Text>
            </View>

            <View className="px-6 py-4">
              {output.languagePicker.options.map((option) => (
                <Pressable
                  key={option.id}
                  onPress={() => actions.handleLanguageSelection(option.language)}
                  className={cn(
                    "mb-3 flex-row items-center rounded-lg border bg-white px-4 py-4",
                    option.isSelected ? "border-blue-500 bg-blue-50" : "border-gray-300",
                  )}
                >
                  <View
                    className={cn(
                      "mr-3 h-5 w-5 items-center justify-center rounded-full border-2",
                      option.isSelected ? "border-blue-500" : "border-gray-300",
                    )}
                  >
                    {option.isSelected ? <View className="h-3 w-3 rounded-full bg-blue-500" /> : null}
                  </View>
                  <View className="flex-1">
                    <Text
                      className={cn(
                        "text-lg font-semibold",
                        option.isSelected ? "text-blue-900" : "text-gray-900",
                      )}
                    >
                      {option.title}
                    </Text>
                    <Text className="mt-0.5 text-sm text-gray-600">{option.subtitle}</Text>
                  </View>
                  <Ionicons
                    name="language-outline"
                    size={24}
                    color={option.isSelected ? "#3b82f6" : "#6b7280"}
                  />
                </Pressable>
              ))}
            </View>
          </SafeAreaView>
        </Modal>
      ) : null}

    </SafeAreaView>
  );
}
