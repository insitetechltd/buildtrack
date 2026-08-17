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

export default function SetPasswordScreen() {
  const t = useTranslation();
  const completeFirstLoginPassword = useAuthStore((s) => s.completeFirstLoginPassword);
  const isLoading = useAuthStore((s) => s.isLoading);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  const passwordContract = useMemo(
    () =>
      buildFormTextFieldContract({
        id: "set-password",
        label: t.setPassword.password,
        value: password,
        placeholder: t.setPassword.passwordPlaceholder,
        error: errors.password,
        testId: "set-password-password",
      }),
    [errors.password, password, t.setPassword.password, t.setPassword.passwordPlaceholder],
  );

  const confirmContract = useMemo(
    () =>
      buildFormTextFieldContract({
        id: "set-password-confirm",
        label: t.setPassword.confirmPassword,
        value: confirmPassword,
        placeholder: t.setPassword.confirmPasswordPlaceholder,
        error: errors.confirmPassword,
        testId: "set-password-confirm",
      }),
    [
      confirmPassword,
      errors.confirmPassword,
      t.setPassword.confirmPassword,
      t.setPassword.confirmPasswordPlaceholder,
    ],
  );

  const validate = useCallback(() => {
    const next: Record<string, string> = {};
    if (!password.trim()) {
      next.password = t.setPassword.passwordRequired;
    } else if (password.trim().length < 6) {
      next.password = t.setPassword.passwordTooShort;
    }
    if (!confirmPassword.trim()) {
      next.confirmPassword = t.setPassword.confirmPasswordRequired;
    } else if (password.trim() !== confirmPassword.trim()) {
      next.confirmPassword = t.setPassword.passwordsDoNotMatch;
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }, [confirmPassword, password, t.setPassword]);

  const handleSubmit = useCallback(async () => {
    if (!validate()) {
      return;
    }
    const result = await completeFirstLoginPassword(password.trim());
    if (!result.success) {
      Alert.alert(t.setPassword.failedTitle, result.error || t.setPassword.retryAfterAuth);
    }
  }, [completeFirstLoginPassword, password, t.setPassword, validate]);

  return (
    <SafeAreaView className="flex-1 bg-white" testID="set-password-screen">
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="always"
          keyboardDismissMode="on-drag"
        >
          <View className="flex-1 px-6 py-8 justify-center">
            <Text className="text-3xl font-bold text-gray-900 mb-2">
              {t.setPassword.title}
            </Text>
            <Text className="text-gray-600 text-lg mb-8">{t.setPassword.subtitle}</Text>

            <TextField
              contract={passwordContract}
              inputTestId="set-password-password"
              inputRef={passwordRef}
              collapseEmptyChrome
              leftSlot={
                <Ionicons name="lock-closed-outline" size={20} color="#6b7280" />
              }
              rightSlot={
                <Pressable
                  testID="set-password-toggle"
                  onPress={() => setShowPassword((value) => !value)}
                >
                  <Ionicons
                    name={showPassword ? "eye-outline" : "eye-off-outline"}
                    size={20}
                    color="#6b7280"
                  />
                </Pressable>
              }
              onChangeText={(value) => {
                setPassword(value);
                if (errors.password) {
                  setErrors((current) => ({ ...current, password: "" }));
                }
              }}
              secureTextEntry={!showPassword}
              autoComplete="password-new"
              autoCorrect={false}
              spellCheck={false}
              returnKeyType="next"
              onSubmitEditing={() => confirmRef.current?.focus()}
              blurOnSubmit={false}
            />

            <TextField
              contract={confirmContract}
              inputTestId="set-password-confirm"
              inputRef={confirmRef}
              collapseEmptyChrome
              leftSlot={
                <Ionicons name="lock-closed-outline" size={20} color="#6b7280" />
              }
              onChangeText={(value) => {
                setConfirmPassword(value);
                if (errors.confirmPassword) {
                  setErrors((current) => ({ ...current, confirmPassword: "" }));
                }
              }}
              secureTextEntry={!showPassword}
              autoComplete="password-new"
              autoCorrect={false}
              spellCheck={false}
              returnKeyType="go"
              onSubmitEditing={() => {
                void handleSubmit();
              }}
            />

            <Pressable
              testID="set-password-submit"
              accessibilityRole="button"
              accessibilityLabel={t.setPassword.submit}
              onPress={() => {
                void handleSubmit();
              }}
              disabled={isLoading}
              className={cn(
                "bg-blue-600 py-4 rounded-lg items-center mt-6",
                isLoading && "opacity-50",
              )}
            >
              <Text className="text-white font-semibold text-xl">
                {isLoading ? t.setPassword.submitting : t.setPassword.submit}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
