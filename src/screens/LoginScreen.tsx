import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../state/authStore";
import { cn } from "../utils/cn";
import Constants from "expo-constants";
import { useTranslation } from "../utils/useTranslation";

interface LoginScreenProps {
  onToggleRegister?: () => void; // Optional - registration is hidden
}

export default function LoginScreen({ onToggleRegister }: LoginScreenProps) {
  const t = useTranslation();
  const [emailOrPhone, setEmailOrPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ emailOrPhone?: string; password?: string }>({});

  const { login, isLoading } = useAuthStore();

  const isPhoneNumber = (value: string) => {
    // Check if it's a phone number (digits, spaces, dashes, parentheses, plus)
    const phoneRegex = /^[\d\s\-\(\)\+]+$/;
    return phoneRegex.test(value.trim());
  };

  const isEmail = (value: string) => {
    const emailRegex = /\S+@\S+\.\S+/;
    return emailRegex.test(value);
  };

  const validateForm = () => {
    const newErrors: { emailOrPhone?: string; password?: string } = {};

    if (!emailOrPhone) {
      newErrors.emailOrPhone = t.login.emailOrPhoneRequired;
    } else if (!isEmail(emailOrPhone) && !isPhoneNumber(emailOrPhone)) {
      newErrors.emailOrPhone = t.login.invalidEmailOrPhone;
    }

    if (!password) {
      newErrors.password = t.validation.passwordRequired;
    } else if (password.length < 6) {
      newErrors.password = t.validation.passwordTooShort;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleEmailOrPhoneChange = useCallback((text: string) => {
    setEmailOrPhone(text);
  }, []);

  const handlePasswordChange = useCallback((text: string) => {
    setPassword(text);
  }, []);

  const handleLogin = async () => {
    // Clear any existing errors before validation
    setErrors({});
    
    if (!validateForm()) return;

    try {
      const success = await login(emailOrPhone, password);
      
      if (!success) {
        Alert.alert(
          t.login.loginFailed,
          t.login.invalidCredentials,
          [{ text: t.common.ok }]
        );
      }
    } catch (error: any) {
      if (error.message === 'PENDING_APPROVAL') {
        Alert.alert(
          t.login.approvalPending,
          t.login.approvalPendingMessage,
          [{ text: t.common.ok }]
        );
      } else {
        Alert.alert(
          t.login.loginFailed,
          t.login.invalidCredentials,
          [{ text: t.common.ok }]
        );
      }
    }
  };


  const appVersion = Constants.expoConfig?.version || "1.0.0";
  const buildNumber = Constants.expoConfig?.ios?.buildNumber || Constants.expoConfig?.android?.versionCode || "0";
  const buildIdentifier = `v${appVersion} (${buildNumber})`;

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar style="dark" />
      
      {/* Build Identifier */}
      <View className="absolute top-12 right-4 z-10">
        <Text className="text-sm text-gray-400 font-mono">
          {buildIdentifier}
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
                    errors.emailOrPhone
                      ? "border-red-300 bg-red-50"
                      : "border-gray-300 bg-gray-50"
                  )}
                >
                  <Ionicons
                    name={isPhoneNumber(emailOrPhone) ? "call-outline" : "mail-outline"}
                    size={20}
                    color={errors.emailOrPhone ? "#ef4444" : "#6b7280"}
                  />
                  <TextInput
                    testID="login-emailOrPhone"
                    className="flex-1 ml-3 text-gray-900"
                    placeholder={t.login.emailOrPhonePlaceholder}
                    value={emailOrPhone}
                    onChangeText={handleEmailOrPhoneChange}
                    keyboardType="default"
                    autoCapitalize="none"
                    autoComplete="off"
                    autoCorrect={false}
                    spellCheck={false}
                    returnKeyType="next"
                  />
                </View>
                {errors.emailOrPhone && (
                  <Text className="text-red-500 text-sm mt-1">{errors.emailOrPhone}</Text>
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
                    errors.password
                      ? "border-red-300 bg-red-50"
                      : "border-gray-300 bg-gray-50"
                  )}
                >
                  <Ionicons
                    name="lock-closed-outline"
                    size={20}
                    color={errors.password ? "#ef4444" : "#6b7280"}
                  />
                  <TextInput
                    testID="login-password"
                    className="flex-1 ml-3 text-gray-900"
                    placeholder={t.login.passwordPlaceholder}
                    value={password}
                    onChangeText={handlePasswordChange}
                    secureTextEntry={!showPassword}
                    autoComplete="password"
                    autoCorrect={false}
                    spellCheck={false}
                    returnKeyType="done"
                  />
                  <Pressable
                    testID="login-togglePassword"
                    onPress={() => setShowPassword(!showPassword)}
                    className="ml-2"
                  >
                    <Ionicons
                      name={showPassword ? "eye-outline" : "eye-off-outline"}
                      size={20}
                      color="#6b7280"
                    />
                  </Pressable>
                </View>
                {errors.password && (
                  <Text className="text-red-500 text-sm mt-1">{errors.password}</Text>
                )}
              </View>

              {/* Login Button */}
              <Pressable
                testID="login-submit"
                onPress={handleLogin}
                disabled={isLoading}
                className={cn(
                  "bg-blue-600 py-4 rounded-lg items-center mt-6",
                  isLoading && "opacity-50"
                )}
              >
                <Text className="text-white font-semibold text-xl">
                  {isLoading ? t.login.signingIn : t.login.signIn}
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
