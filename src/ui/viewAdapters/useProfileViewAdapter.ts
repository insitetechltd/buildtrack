import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Linking, Platform } from "react-native";

import { checkSupabaseConnection } from "@/api/supabase";
import { buildOrgPlanSummary, resolveOrgCheckoutUrl } from "@/billing/orgPlans";
import {
  PRIVACY_POLICY_URL,
  SUPPORT_EMAIL,
  SUPPORT_URL,
  TERMS_OF_SERVICE_URL,
} from "@/legal/legalLinks";
import { useAuthStore } from "@/state/authStore";
import { useLanguageStore, type Language } from "@/state/languageStore";
import { useProjectStoreWithInit } from "@/state/projectStore.supabase";
import { useTaskStore } from "@/state/taskStore.supabase";
import { useThemeStore } from "@/state/themeStore";
import { useUserStore } from "@/state/userStore.supabase";
import { isAdmin } from "@/types/buildtrack";
import type {
  ProfileScreenMenuItem,
  ProfileScreenSectionModel,
  ProfileScreenViewAdapterOutput,
} from "@/ui/contracts/viewAdapters";
import { detectEnvironment, getEnvironmentStyles } from "@/utils/environmentDetector";
import { useTranslation } from "@/utils/useTranslation";

export interface ProfileScreenProps {
  onNavigateBack: () => void;
  onNavigateToCreateTask?: () => void;
  onNavigateToDeveloperSettings?: () => void;
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

type SupabaseStatus = "checking" | "connected" | "disconnected";

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
  const { onNavigateToDeveloperSettings } = props;
  const { user, changePassword } = useAuthStore();
  const { language, setLanguage } = useLanguageStore();
  const { isDarkMode, toggleDarkMode } = useThemeStore();
  const taskStore = useTaskStore();
  const projectStore = useProjectStoreWithInit();
  const userStore = useUserStore();
  const t = useTranslation();

  const [showLanguagePicker, setShowLanguagePicker] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [supabaseStatus, setSupabaseStatus] = useState<SupabaseStatus>("checking");
  const [environmentInfo] = useState(() => detectEnvironment());
  const canApproveUsers = isAdmin(user);

  useEffect(() => {
    let isMounted = true;

    const checkConnection = async () => {
      try {
        const isConnected = await checkSupabaseConnection();

        if (isMounted) {
          setSupabaseStatus(isConnected ? "connected" : "disconnected");
        }
      } catch (error) {
        console.error("Supabase connection check failed:", error);

        if (isMounted) {
          setSupabaseStatus("disconnected");
        }
      }
    };

    void checkConnection();

    return () => {
      isMounted = false;
    };
  }, []);

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

  const handleRefreshData = useCallback(async () => {
    if (!user) {
      return;
    }

    try {
      await Promise.all([
        taskStore.fetchTasks(),
        projectStore.fetchProjects(),
        projectStore.fetchUserProjectAssignments(user.id),
        userStore.fetchUsers(),
      ]);
    } catch (error) {
      console.error("Profile refresh failed:", error);
    }
  }, [projectStore, taskStore, user, userStore]);

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
        case "company-plan":
          Alert.alert(t.profile.companyPlan, buildOrgPlanSummary(), [
            { text: t.common.cancel, style: "cancel" },
            {
              text: t.profile.continueToCheckout,
              onPress: () => {
                void Linking.openURL(resolveOrgCheckoutUrl()).catch(() => {
                  Alert.alert(
                    t.profile.companyPlan,
                    `Unable to open checkout. Email ${SUPPORT_EMAIL}.`,
                  );
                });
              },
            },
          ]);
          return;
        case "language":
          setShowLanguagePicker(true);
          return;
        case "theme":
          toggleDarkMode();
          return;
        case "refresh-data":
          void handleRefreshData();
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
      handleRefreshData,
      onNavigateToDeveloperSettings,
      t.common.cancel,
      t.profile.companyPlan,
      t.profile.continueToCheckout,
      t.profile.helpSupport,
      toggleDarkMode,
    ],
  );

  const sections = useMemo<ProfileScreenSectionModel[]>(() => {
    const settingsItems: ProfileScreenMenuItem[] = [];

    if (canApproveUsers) {
      settingsItems.push({
        id: "profile-menu:company-plan",
        actionId: "company-plan",
        title: t.profile.companyPlan,
        icon: "card-outline",
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
        id: "profile-menu:refresh-data",
        actionId: "refresh-data",
        title: t.profile.reloadData,
        icon: "refresh-outline",
        showChevron: true,
        colorTone: "default",
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
    language,
    canApproveUsers,
    t.profile.companyPlan,
    t.profile.darkMode,
    t.profile.english,
    t.profile.helpSupport,
    t.profile.language,
    t.profile.lightMode,
    t.profile.reloadData,
    t.profile.settings,
    t.profile.theme,
    t.profile.traditionalChinese,
  ]);

  const environmentStyles = getEnvironmentStyles(environmentInfo);

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
      systemStatusItems: [
        {
          id: "profile-system-status:environment",
          label: "Environment",
          value: environmentInfo.displayName,
          indicatorColor: environmentStyles.backgroundColor,
          valueTone: "default",
        },
        {
          id: "profile-system-status:cloud-connection",
          label: "Cloud Connection",
          value:
            supabaseStatus === "connected"
              ? "Connected"
              : supabaseStatus === "disconnected"
                ? "Offline"
                : "Checking...",
          indicatorColor:
            supabaseStatus === "connected"
              ? "#22c55e"
              : supabaseStatus === "disconnected"
                ? "#ef4444"
                : "#eab308",
          valueTone:
            supabaseStatus === "connected"
              ? "positive"
              : supabaseStatus === "disconnected"
                ? "negative"
                : "warning",
        },
      ],
    };
  }, [
    confirmPassword,
    currentPassword,
    environmentInfo.displayName,
    environmentStyles.backgroundColor,
    isChangingPassword,
    language,
    newPassword,
    sections,
    showLanguagePicker,
    showPasswordChange,
    supabaseStatus,
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
