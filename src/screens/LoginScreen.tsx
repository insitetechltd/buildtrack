import React, { useCallback, useMemo, useRef, useState } from "react";
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

const LOGIN_FORM_WIDTH = 320;

function isPhoneNumber(value: string) {
  const phoneRegex = /^[\d\s\-\(\)\+]+$/;
  return phoneRegex.test(value.trim());
}

export default function LoginScreen() {
  const t = useTranslation();
  const { output, actions } = useLoginViewAdapter();
  const emailInputRef = useRef<TextInput>(null);
  const passwordInputRef = useRef<TextInput>(null);
  const submitInputRef = useRef<TextInput>(null);
  const tabMoveLock = useRef(false);
  const [activeFormFocusTarget, setActiveFormFocusTarget] = useState<
    "emailOrPhone" | "password" | "submit" | null
  >(null);
  const formNavigationRegistry = useMemo(
    () =>
      createFormNavigationRegistry([
        { fieldId: "emailOrPhone", isFocusable: true },
        { fieldId: "password", isFocusable: output.isPasswordEnabled },
        { fieldId: "submit", isFocusable: true },
      ]),
    [output.isPasswordEnabled],
  );

  const focusFormField = useCallback((fieldId: "emailOrPhone" | "password" | "submit" | null) => {
    if (!fieldId) {
      return;
    }

    setActiveFormFocusTarget(fieldId);

    const focusTargetMap = {
      emailOrPhone: emailInputRef,
      password: passwordInputRef,
      submit: submitInputRef,
    } satisfies Record<"emailOrPhone" | "password" | "submit", React.RefObject<TextInput | null>>;

    (Object.keys(focusTargetMap) as Array<keyof typeof focusTargetMap>).forEach((id) => {
      if (id !== fieldId) {
        focusTargetMap[id].current?.blur?.();
      }
    });
    focusTargetMap[fieldId].current?.focus?.();
  }, []);
  const moveFormFocus = useCallback(
    (
      activeFieldId: "emailOrPhone" | "password" | "submit",
      direction: "next" | "previous" = "next",
    ) => {
      if (tabMoveLock.current) {
        return;
      }
      tabMoveLock.current = true;
      const targetFieldId =
        direction === "previous"
          ? getPreviousFocusableFieldId(formNavigationRegistry, activeFieldId)
          : getNextFocusableFieldId(formNavigationRegistry, activeFieldId);

      focusFormField((targetFieldId as "emailOrPhone" | "password" | "submit" | null) ?? null);
      setTimeout(() => {
        tabMoveLock.current = false;
      }, 0);
    },
    [focusFormField, formNavigationRegistry],
  );

  const handleSubmitPress = useCallback(() => {
    Keyboard.dismiss();
    emailInputRef.current?.blur?.();
    passwordInputRef.current?.blur?.();
    submitInputRef.current?.blur?.();
    setActiveFormFocusTarget(null);
    void actions.submitLogin();
  }, [actions]);

  const handleFieldKeyPress = useCallback(
    (
      activeFieldId: "emailOrPhone" | "password" | "submit",
      event: NativeSyntheticEvent<TextInputKeyPressEventData>,
    ) => {
      const key = event.nativeEvent.key;
      if (key === "Tab") {
        moveFormFocus(activeFieldId, getTabNavigationDirection(event));
        return;
      }
      if (activeFieldId === "submit" && (key === "Enter" || key === " ")) {
        handleSubmitPress();
      }
    },
    [handleSubmitPress, moveFormFocus],
  );

  const handleTabbedTextChange = useCallback(
    (
      fieldId: "emailOrPhone" | "password",
      value: string,
      commit: (next: string) => void,
    ) => {
      if (!value.includes("\t")) {
        commit(value);
        return;
      }
      commit(value.replace(/\t/g, ""));
      moveFormFocus(fieldId, "next");
    },
    [moveFormFocus],
  );

  const emailContract = useMemo(
    () =>
      buildFormTextFieldContract({
        id: "login-emailOrPhone",
        label: t.login.emailOrPhone,
        value: output.emailOrPhone,
        placeholder: t.login.emailOrPhonePlaceholder,
        error: output.validationErrors.emailOrPhone,
        required: false,
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
        required: false,
        disabled: !output.isPasswordEnabled,
        testId: "login-password",
      }),
    [
      output.isPasswordEnabled,
      output.password,
      output.validationErrors.password,
      t.auth.password,
      t.login.passwordPlaceholder,
    ],
  );

  return (
    <SafeAreaView edges={["bottom", "left", "right"]} className="flex-1 bg-[#E7F4F8]">
      <StatusBar style="dark" />

      <View className="absolute top-12 right-4 z-10 items-end">
        <Text
          testID="login-build-identity"
          className="text-sm text-gray-400 font-mono"
        >
          {output.buildIdentifierLabel}
        </Text>
        {output.activeSupabaseProjectRef ? (
          <Text
            testID="login-active-db-host"
            className="text-[10px] text-gray-400 font-mono mt-0.5"
          >
            {output.activeSupabaseProjectRef}
          </Text>
        ) : null}
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
              <Text className="text-4xl font-bold text-gray-900">Taskr</Text>
            </View>

            <View
              testID="login-form-column"
              className="mb-6 gap-4"
              style={{
                width: LOGIN_FORM_WIDTH,
                maxWidth: "100%",
                alignSelf: "center",
              }}
            >
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
                onChangeText={(value) => handleTabbedTextChange("emailOrPhone", value, actions.setEmailOrPhone)}
                accessibilityState={{ selected: activeFormFocusTarget === "emailOrPhone" }}
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
                    disabled={!output.isPasswordEnabled}
                    onPress={() => {
                      if (!output.isPasswordEnabled) {
                        return;
                      }
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
                onChangeText={(value) => {
                  if (!output.isPasswordEnabled) {
                    return;
                  }
                  handleTabbedTextChange("password", value, actions.setPassword);
                }}
                accessibilityState={{ selected: activeFormFocusTarget === "password" }}
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
                accessibilityLabel={output.primaryButtonLabel}
                accessibilityState={{ selected: activeFormFocusTarget === "submit" }}
                onPress={handleSubmitPress}
                disabled={output.isLoading || output.primaryAction === "disabled"}
                className={cn(
                  "bg-blue-600 py-4 rounded-lg items-center mt-6 border-2",
                  activeFormFocusTarget === "submit" ? "border-white" : "border-transparent",
                  (output.isLoading || output.primaryAction === "disabled") && "opacity-50",
                )}
              >
                <TextInput
                  ref={submitInputRef}
                  testID="login-submit-focus"
                  accessible={false}
                  caretHidden
                  showSoftInputOnFocus={false}
                  value=""
                  onChangeText={() => {}}
                  onKeyPress={(event) => handleFieldKeyPress("submit", event)}
                  onSubmitEditing={handleSubmitPress}
                  blurOnSubmit={false}
                  style={{ position: "absolute", width: 1, height: 1, opacity: 0 }}
                />
                <Text className="text-white font-semibold text-xl">
                  {output.primaryButtonLabel}
                </Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
