import React, { useCallback, useEffect, useMemo, useRef } from "react";
import {
  NativeSyntheticEvent,
  View,
  Text,
  TextInput,
  TextInputKeyPressEventData,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { cn } from "../utils/cn";
import { useTranslation } from "../utils/useTranslation";
import { useLoginViewAdapter } from "../ui/viewAdapters/useLoginViewAdapter";
import {
  createFormNavigationRegistry,
  getNextFocusableFieldId,
  getPreviousFocusableFieldId,
  getTabNavigationDirection,
} from "../utils/formNavigation";

interface LoginScreenProps {
  onToggleRegister?: () => void; // Optional - registration is hidden
}

function isPhoneNumber(value: string) {
  const phoneRegex = /^[\d\s\-\(\)\+]+$/;
  return phoneRegex.test(value.trim());
}

export default function LoginScreen(_props: LoginScreenProps) {
  const t = useTranslation();
  const { output, actions } = useLoginViewAdapter();
  const emailInputRef = useRef<TextInput>(null);
  const passwordInputRef = useRef<TextInput>(null);
  const formNavigationRegistry = useMemo(
    () =>
      createFormNavigationRegistry([
        { fieldId: "emailOrPhone", isFocusable: true },
        { fieldId: "password", isFocusable: true },
        { fieldId: "submit", isFocusable: true },
      ]),
    [],
  );

  const focusFormField = useCallback((fieldId: "emailOrPhone" | "password" | "submit" | null) => {
    if (!fieldId || fieldId === "submit") {
      emailInputRef.current?.blur?.();
      passwordInputRef.current?.blur?.();
      return;
    }

    const focusTargetMap = {
      emailOrPhone: emailInputRef,
      password: passwordInputRef,
    } satisfies Record<"emailOrPhone" | "password", React.RefObject<TextInput | null>>;

    focusTargetMap[fieldId].current?.focus?.();
  }, []);
  const moveFormFocus = useCallback(
    (activeFieldId: "emailOrPhone" | "password", direction: "next" | "previous" = "next") => {
      const targetFieldId =
        direction === "previous"
          ? getPreviousFocusableFieldId(formNavigationRegistry, activeFieldId)
          : getNextFocusableFieldId(formNavigationRegistry, activeFieldId);

      focusFormField((targetFieldId as "emailOrPhone" | "password" | "submit" | null) ?? null);
    },
    [focusFormField, formNavigationRegistry],
  );
  const handleFieldKeyPress = useCallback(
    (
      activeFieldId: "emailOrPhone" | "password",
      event: NativeSyntheticEvent<TextInputKeyPressEventData>,
    ) => {
      if (event.nativeEvent.key !== "Tab") {
        return;
      }

      moveFormFocus(activeFieldId, getTabNavigationDirection(event));
    },
    [moveFormFocus],
  );

  return (
    <SafeAreaView edges={["bottom", "left", "right"]} className="flex-1 bg-[#E7F4F8]">
      <StatusBar style="dark" />
      
      {/* Build Identifier */}
      <View className="absolute top-12 right-4 z-10">
        <Text className="text-sm text-gray-400 font-mono">
          {output.buildIdentifierLabel}
        </Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="flex-1 px-6 py-8 justify-center">
            {/* Logo and Title */}
            <View className="items-center mb-12">
              <Image 
                source={require('../../assets/icon.png')}
                style={{ width: 80, height: 80 }}
                className="mb-6 rounded-2xl"
              />
              <Text className="text-4xl font-bold text-gray-900 mb-2">
                Taskr
              </Text>
              <Text className="text-gray-600 text-center">
                {t.login.constructionTaskManagement}
              </Text>
            </View>

            {/* Login Form */}
            <View className="space-y-4 mb-6">
              {/* Email or Phone Input */}
              <View>
                <Text className="text-base font-medium text-gray-700 mb-2">
                  {t.login.emailOrPhone}
                </Text>
                <View
                  className={cn(
                    "flex-row items-center border rounded-lg px-3 py-3",
                    output.validationErrors.emailOrPhone
                      ? "border-red-300 bg-red-50"
                      : "border-gray-300 bg-gray-50"
                  )}
                >
                  <Ionicons
                    name={isPhoneNumber(output.emailOrPhone) ? "call-outline" : "mail-outline"}
                    size={20}
                    color={output.validationErrors.emailOrPhone ? "#ef4444" : "#6b7280"}
                  />
                  <TextInput
                    testID="login-emailOrPhone"
                    ref={emailInputRef}
                    className="flex-1 ml-3 text-gray-900"
                    placeholder={t.login.emailOrPhonePlaceholder}
                    value={output.emailOrPhone}
                    onChangeText={actions.setEmailOrPhone}
                    keyboardType="default"
                    autoCapitalize="none"
                    autoComplete="off"
                    autoCorrect={false}
                    spellCheck={false}
                    returnKeyType="next"
                    onKeyPress={(event) => handleFieldKeyPress("emailOrPhone", event)}
                    onSubmitEditing={() => {
                      moveFormFocus("emailOrPhone");
                    }}
                    blurOnSubmit={false}
                  />
                </View>
                {output.validationErrors.emailOrPhone && (
                  <Text className="text-red-500 text-sm mt-1">
                    {output.validationErrors.emailOrPhone}
                  </Text>
                )}
              </View>

              {/* Password Input */}
              <View>
                <Text className="text-base font-medium text-gray-700 mb-2">
                  {t.auth.password}
                </Text>
                <View
                  className={cn(
                    "flex-row items-center border rounded-lg px-3 py-3",
                    output.validationErrors.password
                      ? "border-red-300 bg-red-50"
                      : "border-gray-300 bg-gray-50"
                  )}
                >
                  <Ionicons
                    name="lock-closed-outline"
                    size={20}
                    color={output.validationErrors.password ? "#ef4444" : "#6b7280"}
                  />
                  <TextInput
                    testID="login-password"
                    ref={passwordInputRef}
                    className="flex-1 ml-3 text-gray-900"
                    placeholder={t.login.passwordPlaceholder}
                    value={output.password}
                    onChangeText={actions.setPassword}
                    secureTextEntry={!output.isPasswordVisible}
                    autoComplete="password"
                    autoCorrect={false}
                    spellCheck={false}
                    returnKeyType="done"
                    onKeyPress={(event) => handleFieldKeyPress("password", event)}
                    onSubmitEditing={() => {
                      passwordInputRef.current?.blur();
                    }}
                  />
                  {/* Password visibility toggle */}
                  <Pressable
                    testID="login-togglePassword"
                    onPress={() => {
                      actions.togglePasswordVisibility();
                    }}
                    className="ml-2"
                  >
                    <Ionicons
                      name={output.isPasswordVisible ? "eye-outline" : "eye-off-outline"}
                      size={20}
                      color="#6b7280"
                    />
                  </Pressable>
                </View>
                {output.validationErrors.password && (
                  <Text className="text-red-500 text-sm mt-1">
                    {output.validationErrors.password}
                  </Text>
                )}
              </View>

              {/* Login Button */}
              <Pressable
                testID="login-submit"
                onPress={() => {
                  void actions.submitLogin();
                }}
                disabled={output.isLoading}
                className={cn(
                  "bg-blue-600 py-4 rounded-lg items-center mt-6",
                  output.isLoading && "opacity-50"
                )}
              >
                <Text className="text-white font-semibold text-xl">
                  {output.isLoading ? t.login.signingIn : t.login.signIn}
                </Text>
              </Pressable>

              {/* Registration is temporarily disabled - accounts are created by administrators */}
              {/* Register Link - Hidden for App Store submission */}
              {/* <View className="flex-row justify-center mt-6">
                <Text className="text-gray-600">{t.login.dontHaveAccount} </Text>
                <Pressable onPress={onToggleRegister}>
                  <Text className="text-blue-600 font-semibold">{t.login.signUp}</Text>
                </Pressable>
              </View> */}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
