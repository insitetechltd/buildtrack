import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import TextField from "@/components/primitives/input/TextField";
import { buildFormTextFieldContract } from "@/ui/mappers/formTextField";
import { useAuthStore } from "@/state/authStore";
import { useTranslation } from "@/utils/useTranslation";
import { cn } from "@/utils/cn";

interface CreateCompanyScreenProps {
  onToggleLogin: () => void;
}

export default function CreateCompanyScreen({ onToggleLogin }: CreateCompanyScreenProps) {
  const t = useTranslation();
  const createCompanyAccount = useAuthStore((s) => s.createCompanyAccount);
  const isLoading = useAuthStore((s) => s.isLoading);

  const [companyName, setCompanyName] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const companyRef = useRef<TextInput>(null);
  const nameRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  const validate = useCallback(() => {
    const next: Record<string, string> = {};
    if (!companyName.trim()) {
      next.companyName = t.createCompany.companyNameRequired;
    }
    if (!name.trim()) {
      next.name = t.createCompany.nameRequired;
    }
    if (!email.trim()) {
      next.email = t.createCompany.emailRequired;
    } else if (!/\S+@\S+\.\S+/.test(email.trim())) {
      next.email = t.createCompany.invalidEmail;
    }
    if (!password) {
      next.password = t.validation.passwordRequired;
    } else if (password.length < 6) {
      next.password = t.validation.passwordTooShort;
    }
    if (password !== confirmPassword) {
      next.confirmPassword = t.registration.passwordsDoNotMatch;
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }, [
    companyName,
    name,
    email,
    password,
    confirmPassword,
    t.createCompany.companyNameRequired,
    t.createCompany.nameRequired,
    t.createCompany.emailRequired,
    t.createCompany.invalidEmail,
    t.validation.passwordRequired,
    t.validation.passwordTooShort,
    t.registration.passwordsDoNotMatch,
  ]);

  const onSubmit = useCallback(async () => {
    if (!validate()) {
      return;
    }
    const result = await createCompanyAccount({
      companyName,
      name,
      email,
      password,
    });
    if (!result.success) {
      Alert.alert(t.createCompany.failedTitle, result.error || t.createCompany.failedMessage);
    }
  }, [validate, createCompanyAccount, companyName, name, email, password, t.createCompany]);

  const companyContract = useMemo(
    () =>
      buildFormTextFieldContract({
        id: "create-company-name",
        label: t.createCompany.companyName,
        value: companyName,
        placeholder: t.createCompany.companyNamePlaceholder,
        error: errors.companyName,
        required: true,
        disabled: isLoading,
        testId: "create-company-name",
      }),
    [companyName, errors.companyName, isLoading, t.createCompany],
  );

  const nameContract = useMemo(
    () =>
      buildFormTextFieldContract({
        id: "create-company-founder-name",
        label: t.createCompany.yourName,
        value: name,
        placeholder: t.createCompany.yourNamePlaceholder,
        error: errors.name,
        required: true,
        disabled: isLoading,
        testId: "create-company-founder-name",
      }),
    [name, errors.name, isLoading, t.createCompany],
  );

  const emailContract = useMemo(
    () =>
      buildFormTextFieldContract({
        id: "create-company-email",
        label: t.createCompany.workEmail,
        value: email,
        placeholder: t.createCompany.workEmailPlaceholder,
        error: errors.email,
        required: true,
        disabled: isLoading,
        testId: "create-company-email",
      }),
    [email, errors.email, isLoading, t.createCompany],
  );

  const passwordContract = useMemo(
    () =>
      buildFormTextFieldContract({
        id: "create-company-password",
        label: t.auth.password,
        value: password,
        placeholder: t.login.passwordPlaceholder,
        error: errors.password,
        required: true,
        disabled: isLoading,
        testId: "create-company-password",
      }),
    [password, errors.password, isLoading, t.auth.password, t.login.passwordPlaceholder],
  );

  const confirmContract = useMemo(
    () =>
      buildFormTextFieldContract({
        id: "create-company-confirmPassword",
        label: t.auth.confirmPassword,
        value: confirmPassword,
        placeholder: t.registration.confirmPasswordPlaceholder,
        error: errors.confirmPassword,
        required: true,
        disabled: isLoading,
        testId: "create-company-confirmPassword",
      }),
    [
      confirmPassword,
      errors.confirmPassword,
      isLoading,
      t.auth.confirmPassword,
      t.registration.confirmPasswordPlaceholder,
    ],
  );

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top", "bottom"]}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingVertical: 24 }}
          keyboardShouldPersistTaps="always"
          keyboardDismissMode="on-drag"
        >
          <Text className="text-3xl font-bold text-gray-900 mb-2" testID="create-company-title">
            {t.createCompany.title}
          </Text>
          <Text className="text-gray-600 mb-8">{t.createCompany.subtitle}</Text>

          <View className="gap-3 mb-6">
            <TextField
              contract={companyContract}
              inputTestId="create-company-name"
              inputRef={companyRef}
              collapseEmptyChrome
              onChangeText={setCompanyName}
              returnKeyType="next"
              onSubmitEditing={() => nameRef.current?.focus()}
              blurOnSubmit={false}
            />
            <TextField
              contract={nameContract}
              inputTestId="create-company-founder-name"
              inputRef={nameRef}
              collapseEmptyChrome
              onChangeText={setName}
              autoCapitalize="words"
              returnKeyType="next"
              onSubmitEditing={() => emailRef.current?.focus()}
              blurOnSubmit={false}
            />
            <TextField
              contract={emailContract}
              inputTestId="create-company-email"
              inputRef={emailRef}
              collapseEmptyChrome
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              spellCheck={false}
              // Avoid email+password signup heuristic that summons iOS Strong Password.
              autoComplete="off"
              textContentType="none"
              importantForAutofill="no"
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
              blurOnSubmit={false}
            />
            <TextField
              contract={passwordContract}
              inputTestId="create-company-password"
              inputRef={passwordRef}
              collapseEmptyChrome
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              spellCheck={false}
              // oneTimeCode: known kill-switch for iOS Strong Password blank sheet on sim.
              autoComplete="off"
              textContentType="oneTimeCode"
              importantForAutofill="no"
              returnKeyType="next"
              onSubmitEditing={() => confirmRef.current?.focus()}
              blurOnSubmit={false}
              rightSlot={
                <Pressable
                  testID="create-company-togglePassword"
                  onPress={() => setShowPassword((v) => !v)}
                >
                  <Ionicons
                    name={showPassword ? "eye-outline" : "eye-off-outline"}
                    size={20}
                    color="#6b7280"
                  />
                </Pressable>
              }
            />
            <TextField
              contract={confirmContract}
              inputTestId="create-company-confirmPassword"
              inputRef={confirmRef}
              collapseEmptyChrome
              onChangeText={setConfirmPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              spellCheck={false}
              autoComplete="off"
              textContentType="oneTimeCode"
              importantForAutofill="no"
              returnKeyType="go"
              onSubmitEditing={() => void onSubmit()}
            />
          </View>

          <Pressable
            testID="create-company-submit"
            accessibilityRole="button"
            onPress={() => void onSubmit()}
            disabled={isLoading}
            className={cn(
              "bg-blue-600 py-4 rounded-lg items-center mb-4",
              isLoading && "opacity-50",
            )}
          >
            <Text className="text-white font-semibold text-lg">
              {isLoading ? t.createCompany.creating : t.createCompany.submit}
            </Text>
          </Pressable>

          <Pressable
            testID="create-company-back-to-login"
            onPress={onToggleLogin}
            className="py-3 items-center"
          >
            <Text className="text-blue-600 font-medium">{t.createCompany.backToLogin}</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
