import { useCallback, useMemo, useState } from "react";
import { Alert } from "react-native";
import Constants from "expo-constants";
import * as Application from "expo-application";

import { useAuthStore } from "@/state/authStore";
import type {
  LoginScreenValidationErrors,
  LoginScreenViewAdapterOutput,
} from "@/ui/contracts/viewAdapters";
import { useTranslation } from "@/utils/useTranslation";

export interface LoginViewAdapterHookResult {
  output: LoginScreenViewAdapterOutput;
  actions: {
    setEmailOrPhone: (value: string) => void;
    setPassword: (value: string) => void;
    togglePasswordVisibility: () => void;
    submitLogin: () => Promise<void>;
  };
}

function isPhoneNumber(value: string): boolean {
  const phoneRegex = /^[\d\s\-\(\)\+]+$/;
  return phoneRegex.test(value.trim());
}

function isEmail(value: string): boolean {
  const emailRegex = /\S+@\S+\.\S+/;
  return emailRegex.test(value);
}

function buildIdentifierLabel(): string {
  // Prefer native Info.plist / versionCode so the login badge matches the
  // installed binary (EAS autoIncrement), not a stale app.json embed.
  const appVersion =
    Application.nativeApplicationVersion ||
    Constants.expoConfig?.version ||
    "1.0.0";
  const buildNumber =
    Application.nativeBuildVersion ||
    Constants.expoConfig?.ios?.buildNumber ||
    (Constants.expoConfig?.android?.versionCode != null
      ? String(Constants.expoConfig.android.versionCode)
      : null) ||
    "0";

  return `v${appVersion} (${buildNumber})`;
}

export function useLoginViewAdapter(): LoginViewAdapterHookResult {
  const t = useTranslation();
  const { login, isLoading } = useAuthStore();
  const [emailOrPhone, setEmailOrPhone] = useState("");
  const [password, setPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [validationErrors, setValidationErrors] = useState<LoginScreenValidationErrors>({});

  const validateForm = useCallback((): boolean => {
    const nextErrors: LoginScreenValidationErrors = {};

    if (!emailOrPhone) {
      nextErrors.emailOrPhone = t.login.emailOrPhoneRequired;
    } else if (!isEmail(emailOrPhone) && !isPhoneNumber(emailOrPhone)) {
      nextErrors.emailOrPhone = t.login.invalidEmailOrPhone;
    }

    if (!password) {
      nextErrors.password = t.validation.passwordRequired;
    } else if (password.length < 6) {
      nextErrors.password = t.validation.passwordTooShort;
    }

    setValidationErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }, [
    emailOrPhone,
    password,
    t.login.emailOrPhoneRequired,
    t.login.invalidEmailOrPhone,
    t.validation.passwordRequired,
    t.validation.passwordTooShort,
  ]);

  const submitLogin = useCallback(async () => {
    setValidationErrors({});

    if (!validateForm()) {
      return;
    }

    try {
      const success = await login(emailOrPhone.trim(), password);

      if (!success) {
        Alert.alert(t.login.loginFailed, t.login.invalidCredentials, [{ text: t.common.ok }]);
      }
    } catch (error: any) {
      const code = error?.message;
      if (code === "PENDING_APPROVAL") {
        Alert.alert(t.login.approvalPending, t.login.approvalPendingMessage, [
          { text: t.common.ok },
        ]);
        return;
      }
      if (code === "EMAIL_NOT_CONFIRMED") {
        Alert.alert(t.login.loginFailed, t.login.emailNotConfirmed, [{ text: t.common.ok }]);
        return;
      }
      if (code === "PROFILE_MISSING") {
        Alert.alert(t.login.loginFailed, t.login.profileMissing, [{ text: t.common.ok }]);
        return;
      }
      if (code === "PHONE_LOOKUP_FAILED") {
        Alert.alert(t.login.loginFailed, t.login.phoneLookupFailed, [{ text: t.common.ok }]);
        return;
      }
      if (code === "INVALID_CREDENTIALS") {
        Alert.alert(t.login.loginFailed, t.login.invalidCredentials, [{ text: t.common.ok }]);
        return;
      }

      Alert.alert(t.login.loginFailed, t.login.invalidCredentials, [{ text: t.common.ok }]);
    }
  }, [
    emailOrPhone,
    login,
    password,
    t.common.ok,
    t.login.approvalPending,
    t.login.approvalPendingMessage,
    t.login.emailNotConfirmed,
    t.login.invalidCredentials,
    t.login.loginFailed,
    t.login.phoneLookupFailed,
    t.login.profileMissing,
    validateForm,
  ]);

  const output = useMemo<LoginScreenViewAdapterOutput>(
    () => ({
      screenId: "LoginScreen",
      emailOrPhone,
      password,
      isPasswordVisible,
      buildIdentifierLabel: buildIdentifierLabel(),
      validationErrors,
      isLoading,
    }),
    [emailOrPhone, isLoading, isPasswordVisible, password, validationErrors],
  );

  return {
    output,
    actions: {
      setEmailOrPhone,
      setPassword,
      togglePasswordVisibility: () => setIsPasswordVisible((current) => !current),
      submitLogin,
    },
  };
}
