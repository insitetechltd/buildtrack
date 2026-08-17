import React, { useCallback, useMemo, useRef } from "react";
import {
  NativeSyntheticEvent,
  View,
  Text,
  TextInput,
  TextInputKeyPressEventData,
  Pressable,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import TextField from "@/components/primitives/input/TextField";
import { buildFormTextFieldContract } from "@/ui/mappers/formTextField";
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
  onToggleCreateCompany?: () => void;
}

function isPhoneNumber(value: string) {
  const phoneRegex = /^[\d\s\-\(\)\+]+$/;
  return phoneRegex.test(value.trim());
}

export default function LoginScreen({ onToggleCreateCompany }: LoginScreenProps) {
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

  const handleSubmitPress = useCallback(() => {
    Keyboard.dismiss();
    emailInputRef.current?.blur?.();
    passwordInputRef.current?.blur?.();
    void actions.submitLogin();
  }, [actions]);

  const emailContract = useMemo(
    () =>
      buildFormTextFieldContract({
        id: "login-emailOrPhone",
        label: t.login.emailOrPhone,
        value: output.emailOrPhone,
        placeholder: t.login.emailOrPhonePlaceholder,
        error: output.validationErrors.emailOrPhone,
        required: true,
        testId: "login-emailOrPhone",
      }),
    [
      output.emailOrPhone,
      output.validationErrors.emailOrPhone,
      t.login.emailOrPhone,
      t.login.emailOrPhonePlaceholder,
    ],
  );

  const passwordContract = useMemo(
    () =>
      buildFormTextFieldContract({
        id: "login-password",
        label: t.auth.password,
        value: output.password,
        placeholder: t.login.passwordPlaceholder,
        error: output.validationErrors.password,
        required: true,
        testId: "login-password",
      }),
    [
      output.password,
      output.validationErrors.password,
      t.auth.password,
      t.login.passwordPlaceholder,
    ],
  );

  return (
    <SafeAreaView edges={["bottom", "left", "right"]} className="flex-1 bg-[#E7F4F8]">
      <StatusBar style="dark" />

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
          keyboardShouldPersistTaps="always"
          keyboardDismissMode="on-drag"
        >
          <View className="flex-1 px-6 py-8 justify-center">
            <View className="items-center mb-12">
              <Image
                source={require("../../assets/icon.png")}
                style={{ width: 80, height: 80 }}
                className="mb-6 rounded-2xl"
              />
              <Text className="text-4xl font-bold text-gray-900 mb-2">Taskr</Text>
              <Text className="text-gray-600 text-center">
                {t.login.constructionTaskManagement}
              </Text>
            </View>

            <View className="space-y-4 mb-6">
              <TextField
                contract={emailContract}
                inputTestId="login-emailOrPhone"
                inputRef={emailInputRef}
                collapseEmptyChrome
                leftSlot={
                  <Ionicons
                    name={isPhoneNumber(output.emailOrPhone) ? "call-outline" : "mail-outline"}
                    size={20}
                    color={output.validationErrors.emailOrPhone ? "#ef4444" : "#6b7280"}
                  />
                }
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

              <TextField
                contract={passwordContract}
                inputTestId="login-password"
                inputRef={passwordInputRef}
                collapseEmptyChrome
                leftSlot={
                  <Ionicons
                    name="lock-closed-outline"
                    size={20}
                    color={output.validationErrors.password ? "#ef4444" : "#6b7280"}
                  />
                }
                rightSlot={
                  <Pressable
                    testID="login-togglePassword"
                    onPress={() => {
                      actions.togglePasswordVisibility();
                    }}
                  >
                    <Ionicons
                      name={output.isPasswordVisible ? "eye-outline" : "eye-off-outline"}
                      size={20}
                      color="#6b7280"
                    />
                  </Pressable>
                }
                onChangeText={actions.setPassword}
                secureTextEntry={!output.isPasswordVisible}
                autoComplete="password"
                autoCorrect={false}
                spellCheck={false}
                returnKeyType="go"
                onKeyPress={(event) => handleFieldKeyPress("password", event)}
                onSubmitEditing={handleSubmitPress}
              />

              <Pressable
                testID="login-submit"
                accessibilityRole="button"
                accessibilityLabel={t.login.signIn}
                onPress={handleSubmitPress}
                disabled={output.isLoading}
                className={cn(
                  "bg-blue-600 py-4 rounded-lg items-center mt-6",
                  output.isLoading && "opacity-50",
                )}
              >
                <Text className="text-white font-semibold text-xl">
                  {output.isLoading ? t.login.signingIn : t.login.signIn}
                </Text>
              </Pressable>

              {onToggleCreateCompany ? (
                <Pressable
                  testID="login-create-company"
                  onPress={onToggleCreateCompany}
                  className="py-4 items-center mt-2"
                >
                  <Text className="text-blue-600 font-medium text-base">
                    {t.login.createCompany}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
