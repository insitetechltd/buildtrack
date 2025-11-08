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
  onToggleRegister: () => void;
}

export default function LoginScreen({ onToggleRegister }: LoginScreenProps) {
  const t = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const { login, isLoading } = useAuthStore();

  const validateForm = () => {
    const newErrors: { email?: string; password?: string } = {};

    if (!email) {
      newErrors.email = t.validation.emailRequired;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = t.validation.emailInvalid;
    }

    if (!password) {
      newErrors.password = t.validation.passwordRequired;
    } else if (password.length < 6) {
      newErrors.password = t.validation.passwordTooShort;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleEmailChange = useCallback((text: string) => {
    setEmail(text);
  }, []);

  const handlePasswordChange = useCallback((text: string) => {
    setPassword(text);
  }, []);

  const handleLogin = async () => {
    // Clear any existing errors before validation
    setErrors({});
    
    if (!validateForm()) return;

    const success = await login(email, password);
    
    if (!success) {
      Alert.alert(
        t.login.loginFailed,
        t.login.invalidCredentials,
        [{ text: t.common.ok }]
      );
    }
  };

  const handleQuickLogin = async (email: string, password: string) => {
    // Clear any existing errors
    setErrors({});
    
    // Set the form fields for visual feedback
    setEmail(email);
    setPassword(password);
    
    // Perform login
    const success = await login(email, password);
    
    if (!success) {
      Alert.alert(
        t.login.quickLoginFailed,
        `${t.login.failedToLogin} ${email}. ${t.login.pleaseTryAgain}`,
        [{ text: t.common.ok }]
      );
    }
  };

  const appVersion = Constants.expoConfig?.version || "1.0.0";
  const runtimeVersion = Constants.expoConfig?.runtimeVersion || "1.0.0";
  const buildIdentifier = `v${appVersion} (${runtimeVersion})`;

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
              {/* Email Input */}
              <View>
                <Text className="text-base font-medium text-gray-700 mb-2">
                  {t.login.emailAddress}
                </Text>
                <View
                  className={cn(
                    "flex-row items-center border rounded-lg px-3 py-3",
                    errors.email
                      ? "border-red-300 bg-red-50"
                      : "border-gray-300 bg-gray-50"
                  )}
                >
                  <Ionicons
                    name="mail-outline"
                    size={20}
                    color={errors.email ? "#ef4444" : "#6b7280"}
                  />
                  <TextInput
                    className="flex-1 ml-3 text-gray-900"
                    placeholder={t.login.emailPlaceholder}
                    value={email}
                    onChangeText={handleEmailChange}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    autoCorrect={false}
                    spellCheck={false}
                    returnKeyType="next"
                  />
                </View>
                {errors.email && (
                  <Text className="text-red-500 text-sm mt-1">{errors.email}</Text>
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

              {/* Register Link */}
              <View className="flex-row justify-center mt-6">
                <Text className="text-gray-600">{t.login.dontHaveAccount} </Text>
                <Pressable onPress={onToggleRegister}>
                  <Text className="text-blue-600 font-semibold">{t.login.signUp}</Text>
                </Pressable>
              </View>
            </View>

            {/* Quick Login User List */}
            <View className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <Text className="text-base font-semibold text-blue-800 mb-3">
                👥 {t.login.quickLogin} (9 total):
              </Text>
              
              <View className="space-y-3">
                {/* Insite Tech Ltd - Admin */}
                <Pressable 
                  className="bg-purple-50 border border-purple-200 rounded-lg py-4 px-4 active:bg-purple-100"
                  onPress={() => handleQuickLogin('admin_tristan@insitetech.com', 'password123')}
                >
                  <Text className="text-lg font-semibold text-purple-900">
                    Insite Tech: Admin: Admin Tristan
                  </Text>
                </Pressable>
                
                {/* Insite Tech Ltd - Managers */}
                <Pressable 
                  className="bg-purple-50 border border-purple-200 rounded-lg py-4 px-4 active:bg-purple-100"
                  onPress={() => handleQuickLogin('tristan@insitetech.com', 'password123')}
                >
                  <Text className="text-lg font-semibold text-purple-900">
                    Insite Tech: Manager: Tristan
                  </Text>
                </Pressable>
                
                <Pressable 
                  className="bg-purple-50 border border-purple-200 rounded-lg py-4 px-4 active:bg-purple-100"
                  onPress={() => handleQuickLogin('dennis@insitetech.com', 'password123')}
                >
                  <Text className="text-lg font-semibold text-purple-900">
                    Insite Tech: Manager: Dennis
                  </Text>
                </Pressable>
                
                {/* BuildTrack - Admin */}
                <Pressable 
                  className="bg-emerald-50 border border-emerald-200 rounded-lg py-4 px-4 active:bg-emerald-100"
                  onPress={() => handleQuickLogin('admin@buildtrack.com', 'password123')}
                >
                  <Text className="text-lg font-semibold text-emerald-900">
                    BuildTrack: Admin: Alex Administrator
                  </Text>
                </Pressable>
                
                {/* BuildTrack - Manager */}
                <Pressable 
                  className="bg-emerald-50 border border-emerald-200 rounded-lg py-4 px-4 active:bg-emerald-100"
                  onPress={() => handleQuickLogin('manager@buildtrack.com', 'password123')}
                >
                  <Text className="text-lg font-semibold text-emerald-900">
                    BuildTrack: Manager: John Manager
                  </Text>
                </Pressable>
                
                {/* BuildTrack - Workers */}
                <Pressable 
                  className="bg-emerald-50 border border-emerald-200 rounded-lg py-4 px-4 active:bg-emerald-100"
                  onPress={() => handleQuickLogin('peter@buildtrack.com', 'password123')}
                >
                  <Text className="text-lg font-semibold text-emerald-900">
                    BuildTrack: Worker: Peter
                  </Text>
                </Pressable>
                
                <Pressable 
                  className="bg-emerald-50 border border-emerald-200 rounded-lg py-4 px-4 active:bg-emerald-100"
                  onPress={() => handleQuickLogin('worker@buildtrack.com', 'password123')}
                >
                  <Text className="text-lg font-semibold text-emerald-900">
                    BuildTrack: Worker: Sarah Worker
                  </Text>
                </Pressable>
                
                {/* Elite Electric - Admin */}
                <Pressable 
                  className="bg-amber-50 border border-amber-200 rounded-lg py-4 px-4 active:bg-amber-100"
                  onPress={() => handleQuickLogin('admin@eliteelectric.com', 'password123')}
                >
                  <Text className="text-lg font-semibold text-amber-900">
                    Elite Electric: Admin: Mike Johnson
                  </Text>
                </Pressable>
                
                {/* Elite Electric - Worker */}
                <Pressable 
                  className="bg-amber-50 border border-amber-200 rounded-lg py-4 px-4 active:bg-amber-100"
                  onPress={() => handleQuickLogin('lisa@eliteelectric.com', 'password123')}
                >
                  <Text className="text-lg font-semibold text-amber-900">
                    Elite Electric: Worker: Lisa Martinez
                  </Text>
                </Pressable>
              </View>
              
              <Text className="text-sm text-gray-600 mt-2 italic">
                💡 {t.login.tapToLogin}
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}