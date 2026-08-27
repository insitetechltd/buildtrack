import { useCallback, useMemo, useState } from "react";
import { Alert, Linking, Platform } from "react-native";

import {
  PRIVACY_POLICY_URL,
  SUPPORT_EMAIL,
  SUPPORT_URL,
  TERMS_OF_SERVICE_URL,
} from "@/legal/legalLinks";
import { useAuthStore } from "@/state/authStore";
import { useLanguageStore, type Language } from "@/state/languageStore";
import { useThemeStore } from "@/state/themeStore";
import { isPlatformSuperuser } from "@/config/platformSuperusers";
import type {
  ProfileScreenMenuItem,
  ProfileScreenSectionModel,
  ProfileScreenViewAdapterOutput,
} from "@/ui/contracts/viewAdapters";
import { useTranslation } from "@/utils/useTranslation";

export interface ProfileScreenProps {
  onNavigateBack: () => void;
  onNavigateToCreateTask?: () => void;
  onNavigateToDeveloperSettings?: () => void;
  onNavigateToOwnerConsole?: () => void;
  onNavigateToPendingUsers?: () => void;
  onNavigateToProfile?: () => void;
  onNavigateToProjectPicker?: (allowBack?: boolean) => void;
}

export interface ProfileViewAdapterHookResult {
  output: ProfileScreenViewAdapterOutput;
  actions: {
    handleMenuAction: (actionId: string) => void | Promise<void>;
    closeLanguagePicker: () => void;
    handleLanguageSelection: (language: Language) => void;
    closePasswordChange: () => void;
    setCurrentPassword: (value: string) => void;
    setNewPassword: (value: string) => void;
    setConfirmPassword: (value: string) => void;
    submitPasswordChange: () => Promise<void>;
  };
}

function toRoleLabel(role?: string): string {
  if (!role) {
    return "";
  }

  return role
    .split("_")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

export function useProfileViewAdapter(
  props: ProfileScreenProps,
): ProfileViewAdapterHookResult {
  const {
    onNavigateToDeveloperSettings,
    onNavigateToOwnerConsole,
  } = props;
  const { user, changePassword } = useAuthStore();
  const { language, setLanguage } = useLanguageStore();
  const { isDarkMode, toggleDarkMode } = useThemeStore();
  const t = useTranslation();

  const [showLanguagePicker, setShowLanguagePicker] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const isOwnerAccount = isPlatformSuperuser(user);

  const resetPasswordState = useCallback(() => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  }, []);

  const closePasswordChange = useCallback(() => {
    if (isChangingPassword) {
      return;
    }

    setShowPasswordChange(false);
    resetPasswordState();
  }, [isChangingPassword, resetPasswordState]);

  const handleLanguageSelection = useCallback(
    (nextLanguage: Language) => {
      if (nextLanguage === language) {
        setShowLanguagePicker(false);
        return;
      }

      setLanguage(nextLanguage);
      setShowLanguagePicker(false);

      setTimeout(() => {
        Alert.alert(
          t.profile.languageChanged,
          t.profile.languageChangedMessage,
          [
            {
              text: t.profile.later,
              style: "cancel",
            },
            {
              text: t.profile.reloadNow,
              onPress: () => {
                if (__DEV__ && (Platform.OS === "ios" || Platform.OS === "android")) {
                  const { DevSettings } = require("react-native");
                  DevSettings.reload();
                  return;
                }

                Alert.alert(t.profile.pleaseRestart, t.profile.pleaseRestartMessage);
              },
            },
          ],
        );
      }, 300);
    },
    [language, setLanguage, t.profile],
  );

  const submitPasswordChange = useCallback(async () => {
    if (!currentPassword) {
      Alert.alert("Error", "Please enter your current password");
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      Alert.alert("Error", "New password must be at least 6 characters long");
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert("Error", "New passwords do not match");
      return;
    }

    setIsChangingPassword(true);

    try {
      const result = await changePassword(currentPassword, newPassword);

      if (result.success) {
        Alert.alert("Success", "Password changed successfully", [
          {
            text: "OK",
            onPress: () => {
              setShowPasswordChange(false);
              resetPasswordState();
            },
          },
        ]);
        return;
      }

      Alert.alert("Error", result.error || "Failed to change password");
    } catch (error: any) {
      Alert.alert("Error", error?.message || "Failed to change password");
    } finally {
      setIsChangingPassword(false);
    }
  }, [
    changePassword,
    confirmPassword,
    currentPassword,
    newPassword,
    resetPasswordState,
  ]);

  const handleMenuAction = useCallback(
    (actionId: string) => {
      switch (actionId) {
        case "language":
          setShowLanguagePicker(true);
          return;
        case "theme":
          toggleDarkMode();
          return;
        case "change-password":
          setShowPasswordChange(true);
          return;
        case "help-support":
          void Linking.openURL(SUPPORT_URL).catch(() => {
            Alert.alert(
              t.profile.helpSupport,
              `Unable to open this link.\n${SUPPORT_URL}\n\nOr email ${SUPPORT_EMAIL}.`,
            );
          });
          return;
        case "developer-settings":
          onNavigateToDeveloperSettings?.();
          return;
        case "owner-console":
          onNavigateToOwnerConsole?.();
          return;
        case "about":
          Alert.alert(
            "Taskr",
            "Construction field app for company teams.\n\nPhoto evidence → task → review → complete.",
          );
          return;
        case "terms-of-service":
          void Linking.openURL(TERMS_OF_SERVICE_URL).catch(() => {
            Alert.alert(
              "Terms of Service",
              `Unable to open this link.\n${TERMS_OF_SERVICE_URL}\n\nOr email ${SUPPORT_EMAIL}.`,
            );
          });
          return;
        case "privacy-policy":
          void Linking.openURL(PRIVACY_POLICY_URL).catch(() => {
            Alert.alert(
              "Privacy Policy",
              `Unable to open this link.\n${PRIVACY_POLICY_URL}\n\nOr email ${SUPPORT_EMAIL}.`,
            );
          });
          return;
        default:
          return;
      }
    },
    [
      onNavigateToDeveloperSettings,
      onNavigateToOwnerConsole,
      t.profile.helpSupport,
      toggleDarkMode,
    ],
  );

  const sections = useMemo<ProfileScreenSectionModel[]>(() => {
    const settingsItems: ProfileScreenMenuItem[] = [];

    if (isOwnerAccount && onNavigateToOwnerConsole) {
      settingsItems.push({
        id: "profile-menu:owner-console",
        actionId: "owner-console",
        title: "Owner Console",
        icon: "construct-outline",
        showChevron: true,
        colorTone: "default",
        density: "standard",
        structuralState: "stale",
      });
    }

    if (isOwnerAccount && onNavigateToDeveloperSettings) {
      settingsItems.push({
        id: "profile-menu:developer-settings",
        actionId: "developer-settings",
        title: "Dev Admin tools",
        icon: "code-slash-outline",
        showChevron: true,
        colorTone: "default",
        density: "standard",
        structuralState: "stale",
      });
    }

    settingsItems.push(
      {
        id: "profile-menu:language",
        actionId: "language",
        title: t.profile.language,
        icon: "language-outline",
        showChevron: true,
        colorTone: "default",
        rightText: language === "en" ? t.profile.english : t.profile.traditionalChinese,
        density: "standard",
        structuralState: "stale",
      },
      {
        id: "profile-menu:theme",
        actionId: "theme",
        title: t.profile.theme,
        icon: isDarkMode ? "moon" : "sunny-outline",
        showChevron: true,
        colorTone: "default",
        rightText: isDarkMode ? t.profile.darkMode : t.profile.lightMode,
        density: "standard",
        structuralState: "stale",
      },
      {
        id: "profile-menu:change-password",
        actionId: "change-password",
        title: "Change Password",
        icon: "lock-closed-outline",
        showChevron: true,
        colorTone: "default",
        density: "standard",
        structuralState: "stale",
      },
    );

    const aboutItems: ProfileScreenMenuItem[] = [
      {
        id: "profile-menu:about",
        actionId: "about",
        title: "About Taskr",
        icon: "information-circle-outline",
        showChevron: false,
        colorTone: "default",
        density: "standard",
        structuralState: "stale",
      },
      {
        id: "profile-menu:help-support",
        actionId: "help-support",
        title: t.profile.helpSupport,
        icon: "help-circle-outline",
        showChevron: true,
        colorTone: "default",
        density: "standard",
        structuralState: "stale",
      },
      {
        id: "profile-menu:terms-of-service",
        actionId: "terms-of-service",
        title: "Terms of Service",
        icon: "document-text-outline",
        showChevron: true,
        colorTone: "default",
        density: "standard",
        structuralState: "stale",
      },
      {
        id: "profile-menu:privacy-policy",
        actionId: "privacy-policy",
        title: "Privacy Policy",
        icon: "lock-closed-outline",
        showChevron: true,
        colorTone: "default",
        density: "standard",
        structuralState: "stale",
      },
    ];

    return [
      {
        id: "profile-section:settings",
        title: t.profile.settings,
        items: settingsItems,
      },
      {
        id: "profile-section:about",
        title: "About",
        items: aboutItems,
      },
    ];
  }, [
    isDarkMode,
    isOwnerAccount,
    language,
    onNavigateToDeveloperSettings,
    onNavigateToOwnerConsole,
    t.profile.darkMode,
    t.profile.english,
    t.profile.helpSupport,
    t.profile.language,
    t.profile.lightMode,
    t.profile.settings,
    t.profile.theme,
    t.profile.traditionalChinese,
    user,
  ]);

  const output = useMemo<ProfileScreenViewAdapterOutput>(() => {
    const hasUsableData = Boolean(user);

    return {
      screenId: "ProfileScreen",
      readiness: {
        hasInitialFrame: true,
        hasUsableData,
        isBackgroundRefreshing: false,
        isNavigationTransitionActive: false,
      },
      continuity: {
        isInitialLoading: false,
        isBackgroundRefreshing: false,
        hasCachedFrame: hasUsableData,
        shouldRenderSkeletonShell: false,
        shouldRenderEmptyState: !hasUsableData,
        freshnessLabel: hasUsableData ? "Ready" : "Unavailable",
      },
      profileCard: {
        initial: user?.name?.charAt(0)?.toUpperCase() || "?",
        name: user?.name || "",
        roleLabel: toRoleLabel(user?.systemPermission || user?.role),
        email: user?.email || "",
        phone: user?.phone && user.phone !== user.email ? user.phone : undefined,
      },
      sections,
      languagePicker: {
        visible: showLanguagePicker,
        selectedLanguage: language,
        options: [
          {
            id: "profile-language:en",
            language: "en",
            title: t.profile.english,
            subtitle: t.profile.englishUS,
            isSelected: language === "en",
          },
          {
            id: "profile-language:zh-TW",
            language: "zh-TW",
            title: t.profile.traditionalChinese,
            subtitle: "Traditional Chinese",
            isSelected: language === "zh-TW",
          },
        ],
      },
      passwordChange: {
        visible: showPasswordChange,
        currentPassword,
        newPassword,
        confirmPassword,
        isSubmitting: isChangingPassword,
        isValid:
          currentPassword.length > 0 &&
          newPassword.length >= 6 &&
          confirmPassword.length > 0 &&
          newPassword === confirmPassword,
      },
      systemStatusItems: [],
    };
  }, [
    confirmPassword,
    currentPassword,
    isChangingPassword,
    language,
    newPassword,
    sections,
    showLanguagePicker,
    showPasswordChange,
    t.profile.english,
    t.profile.englishUS,
    t.profile.traditionalChinese,
    user,
  ]);

  return {
    output,
    actions: {
      handleMenuAction,
      closeLanguagePicker: () => setShowLanguagePicker(false),
      handleLanguageSelection,
      closePasswordChange,
      setCurrentPassword,
      setNewPassword,
      setConfirmPassword,
      submitPasswordChange,
    },
  };
}
