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
import { UserAvatar } from "../components/UserAvatar";
import { cn } from "../utils/cn";
import { useThemeStore } from "../state/themeStore";
import { useTranslation } from "../utils/useTranslation";
import {
  useProfileViewAdapter,
  type ProfileScreenProps,
} from "../ui/viewAdapters/useProfileViewAdapter";
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
      className="flex-row items-center border-b border-gray-100 bg-white px-6 py-4 dark:border-[#1E3A44] dark:bg-surface-dark"
    >
      <Ionicons name={icon as any} size={20} color="#7A9AA6" />
      <Text
        className={cn(
          "ml-3 flex-1 text-lg",
          colorTone === "danger"
            ? "text-red-600 dark:text-red-400"
            : "text-gray-900 dark:text-ink-dark",
        )}
      >
        {title}
      </Text>
      {badge !== undefined && badge > 0 ? (
        <View className="mr-2 h-6 min-w-[24px] items-center justify-center rounded-full bg-red-500 px-2">
          <Text className="text-xs font-bold text-white">{badge > 99 ? "99+" : badge}</Text>
        </View>
      ) : null}
      {rightText && !badge ? (
        <Text className="mr-2 text-base text-gray-500 dark:text-ink-dark-muted">{rightText}</Text>
      ) : null}
      {showChevron ? <Ionicons name="chevron-forward" size={20} color="#7A9AA6" /> : null}
    </Pressable>
  );
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
  const isDarkMode = useThemeStore((state) => state.isDarkMode);
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
      ]),
    [],
  );

  const focusPasswordField = useCallback((fieldId: string) => {
    if (fieldId === "currentPassword") {
      currentPasswordInputRef.current?.focus();
      return;
    }
    if (fieldId === "newPassword") {
      newPasswordInputRef.current?.focus();
      return;
    }
    if (fieldId === "confirmPassword") {
      confirmPasswordInputRef.current?.focus();
    }
  }, []);

  const handlePasswordFieldKeyPress = useCallback(
    (fieldId: string, event: NativeSyntheticEvent<TextInputKeyPressEventData>) => {
      const direction = getTabNavigationDirection(event);
      if (!direction) {
        return;
      }
      const nextId =
        direction === "next"
          ? getNextFocusableFieldId(passwordFormNavigationRegistry, fieldId)
          : getPreviousFocusableFieldId(passwordFormNavigationRegistry, fieldId);
      if (nextId) {
        focusPasswordField(nextId);
      }
    },
    [focusPasswordField, passwordFormNavigationRegistry],
  );

  return (
    <SafeAreaView
      edges={["bottom", "left", "right"]}
      className="flex-1 bg-canvas dark:bg-canvas-dark"
    >
      <StatusBar style="light" />

      <ModernScreenHeader
        title={t.profile.profile}
        titleNode={<BrandHeaderTitle subtitle={t.profile.profile} />}
        showBackButton={true}
        onBackPress={onNavigateBack}
        onNavigateToProfile={onNavigateToProfile}
        onNavigateToProjectPicker={onNavigateToProjectPicker}
        className="border-b-0 bg-brand pb-2"
      />

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="mx-6 mt-4 rounded-xl border border-gray-200 bg-white dark:border-[#1E3A44] dark:bg-surface-dark">
          <View className="items-center py-6">
            <UserAvatar
              userId={output.profileCard.userId}
              name={output.profileCard.name}
              email={output.profileCard.email}
              size={80}
              className="mb-4"
            />
            <Text className="text-2xl font-bold text-gray-900 dark:text-ink-dark">
              {output.profileCard.name}
            </Text>
            <Text className="capitalize text-gray-600 dark:text-ink-dark-muted">
              {output.profileCard.roleLabel}
            </Text>
            <Text className="mt-1 text-base text-gray-500 dark:text-ink-dark-faint">
              {output.profileCard.email}
            </Text>
            {output.profileCard.phone ? (
              <Text className="text-base text-gray-500 dark:text-ink-dark-faint">
                {output.profileCard.phone}
              </Text>
            ) : null}
          </View>
        </View>

        {output.sections.map((section) => (
          <View key={section.id} className="mt-6">
            <Text className="mb-2 px-6 text-xl font-semibold text-gray-900 dark:text-ink-dark">
              {section.title}
            </Text>
            <View className="mx-6 overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-[#1E3A44] dark:bg-surface-dark">
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

        <View className="h-8" />
      </ScrollView>

      {output.passwordChange.visible ? (
        <Modal
          visible={output.passwordChange.visible}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={actions.closePasswordChange}
        >
          <SafeAreaView
            edges={["bottom", "left", "right"]}
            className="flex-1 bg-canvas dark:bg-canvas-dark"
          >
            <StatusBar style={isDarkMode ? "light" : "dark"} />

            <ModalHandle />

            <View className="flex-row items-center border-b border-gray-200 bg-white px-6 py-4 dark:border-[#1E3A44] dark:bg-surface-dark">
              <Pressable
                onPress={actions.closePasswordChange}
                className="mr-4 h-10 w-10 items-center justify-center"
                disabled={output.passwordChange.isSubmitting}
              >
                <Ionicons
                  name="close"
                  size={24}
                  color={output.passwordChange.isSubmitting ? "#7A9AA6" : "#A8C5D0"}
                />
              </Pressable>
              <Text className="flex-1 text-2xl font-semibold text-gray-900 dark:text-ink-dark">
                Change Password
              </Text>
            </View>

            <ScrollView className="flex-1 px-6 py-4" showsVerticalScrollIndicator={false}>
              <View className="mb-4">
                <Text className="mb-2 text-lg font-semibold text-slate-900 dark:text-ink-dark">
                  Current Password
                </Text>
                <TextInput
                  ref={currentPasswordInputRef}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-3 text-lg text-gray-900 dark:border-[#1E3A44] dark:bg-surface-dark dark:text-ink-dark"
                  placeholder="Enter your current password"
                  placeholderTextColor="#7A9AA6"
                  value={output.passwordChange.currentPassword}
                  onChangeText={actions.setCurrentPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  editable={!output.passwordChange.isSubmitting}
                  returnKeyType="next"
                  style={{ fontSize: 18 }}
                  onKeyPress={(event) => handlePasswordFieldKeyPress("currentPassword", event)}
                  onSubmitEditing={() => {
                    focusPasswordField("newPassword");
                  }}
                />
              </View>

              <View className="mb-4">
                <Text className="mb-2 text-lg font-semibold text-slate-900 dark:text-ink-dark">
                  New Password
                </Text>
                <TextInput
                  ref={newPasswordInputRef}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-3 text-lg text-gray-900 dark:border-[#1E3A44] dark:bg-surface-dark dark:text-ink-dark"
                  placeholder="Enter a new password"
                  placeholderTextColor="#7A9AA6"
                  value={output.passwordChange.newPassword}
                  onChangeText={actions.setNewPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  editable={!output.passwordChange.isSubmitting}
                  returnKeyType="next"
                  style={{ fontSize: 18 }}
                  onKeyPress={(event) => handlePasswordFieldKeyPress("newPassword", event)}
                  onSubmitEditing={() => {
                    focusPasswordField("confirmPassword");
                  }}
                />
              </View>

              <View className="mb-6">
                <Text className="mb-2 text-lg font-semibold text-slate-900 dark:text-ink-dark">
                  Confirm New Password
                </Text>
                <TextInput
                  ref={confirmPasswordInputRef}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-3 text-lg text-gray-900 dark:border-[#1E3A44] dark:bg-surface-dark dark:text-ink-dark"
                  placeholder="Confirm new password"
                  placeholderTextColor="#7A9AA6"
                  value={output.passwordChange.confirmPassword}
                  onChangeText={actions.setConfirmPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  editable={!output.passwordChange.isSubmitting}
                  returnKeyType="done"
                  style={{ fontSize: 18 }}
                  onKeyPress={(event) => handlePasswordFieldKeyPress("confirmPassword", event)}
                  onSubmitEditing={() => {
                    if (output.passwordChange.isValid && !output.passwordChange.isSubmitting) {
                      void actions.submitPasswordChange();
                    }
                  }}
                />
              </View>

              <Pressable
                testID="profile-change-password-submit"
                onPress={() => {
                  void actions.submitPasswordChange();
                }}
                disabled={!output.passwordChange.isValid || output.passwordChange.isSubmitting}
                className={cn(
                  "mb-8 items-center justify-center rounded-xl py-4",
                  output.passwordChange.isValid && !output.passwordChange.isSubmitting
                    ? "bg-brand"
                    : "bg-gray-300 dark:bg-[#1E3A44]",
                )}
              >
                {output.passwordChange.isSubmitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="text-lg font-semibold text-white">Update Password</Text>
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
          <SafeAreaView
            edges={["bottom", "left", "right"]}
            className="flex-1 bg-canvas dark:bg-canvas-dark"
          >
            <ModalHandle />
            <View className="flex-row items-center border-b border-gray-200 bg-white px-6 py-4 dark:border-[#1E3A44] dark:bg-surface-dark">
              <Pressable
                testID="profile-language__close"
                onPress={actions.closeLanguagePicker}
                className="mr-4 h-10 w-10 items-center justify-center"
              >
                <Ionicons name="close" size={24} color="#A8C5D0" />
              </Pressable>
              <Text className="flex-1 text-2xl font-semibold text-gray-900 dark:text-ink-dark">
                {t.profile.language}
              </Text>
            </View>
            <ScrollView className="flex-1">
              {output.languagePicker.options.map((option) => (
                <Pressable
                  key={option.id}
                  testID={option.id}
                  onPress={() => actions.handleLanguageSelection(option.language)}
                  className="flex-row items-center border-b border-gray-100 bg-white px-6 py-4 dark:border-[#1E3A44] dark:bg-surface-dark"
                >
                  <View className="flex-1">
                    <Text className="text-lg font-medium text-gray-900 dark:text-ink-dark">
                      {option.title}
                    </Text>
                    <Text className="text-base text-gray-500 dark:text-ink-dark-muted">
                      {option.subtitle}
                    </Text>
                  </View>
                  {option.isSelected ? (
                    <Ionicons name="checkmark-circle" size={24} color="#12A8E0" />
                  ) : null}
                </Pressable>
              ))}
            </ScrollView>
          </SafeAreaView>
        </Modal>
      ) : null}
    </SafeAreaView>
  );
}
