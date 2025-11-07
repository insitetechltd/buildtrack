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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../state/authStore";
import { useCompanyStore } from "../state/companyStore";
import { UserRole } from "../types/buildtrack";
import { cn } from "../utils/cn";

interface RegisterScreenProps {
  onToggleLogin: () => void;
}

export default function RegisterScreen({ onToggleLogin }: RegisterScreenProps) {
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    password: "",
    confirmPassword: "",
    // Note: All users default to "worker" role. Administrators can reassign roles in user management.
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { register, isLoading } = useAuthStore();
  const companies = useCompanyStore(state => state.companies);
  const fetchCompanies = useCompanyStore(state => state.fetchCompanies);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    }

    if (!formData.phone.trim()) {
      newErrors.phone = "Phone number is required";
    } else if (!/^\d{8}$/.test(formData.phone.replace(/\s/g, ""))) {
      newErrors.phone = "Phone number must be exactly 8 digits";
    }

    // Email is optional, but if provided, must be valid
    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    // Clear any existing errors before validation
    setErrors({});
    
    if (!validateForm()) return;

    let defaultCompanyId: string | undefined;
    try {
      let availableCompanies = companies;
      if (!availableCompanies || availableCompanies.length === 0) {
        await fetchCompanies();
        availableCompanies = useCompanyStore.getState().companies;
      }

      const preferredCompany = availableCompanies?.find(
        (company) => company.name === "BuildTrack Construction Inc."
      );

      defaultCompanyId = preferredCompany?.id || availableCompanies?.[0]?.id;
    } catch (error) {
      console.error("Error fetching companies during registration:", error);
    }

    if (!defaultCompanyId) {
      Alert.alert(
        "Registration Unavailable",
        "No active company is configured. Please contact your administrator.",
        [{ text: "OK" }]
      );
      return;
    }

    const result = await register({
      name: formData.name,
      phone: formData.phone,
      companyId: defaultCompanyId,
      position: "Field Worker", // All new users default to worker role
      email: formData.email || undefined, // Only pass email if provided
      password: formData.password,
      role: "worker" as UserRole, // All users default to worker, admins can reassign later
    });
    
    if (!result.success) {
      Alert.alert(
        "Registration Failed",
        result.error || "An account with this email already exists or there was an error.",
        [{ text: "OK" }]
      );
    }
  };

  const handleNameChange = useCallback((text: string) => {
    setFormData(prev => ({ ...prev, name: text }));
  }, []);

  const handlePhoneChange = useCallback((text: string) => {
    // Only allow digits and limit to 8 characters
    const cleanedText = text.replace(/\D/g, '').slice(0, 8);
    setFormData(prev => ({ ...prev, phone: cleanedText }));
  }, []);

  const handleEmailChange = useCallback((text: string) => {
    setFormData(prev => ({ ...prev, email: text }));
  }, []);

  const handlePasswordChange = useCallback((text: string) => {
    setFormData(prev => ({ ...prev, password: text }));
  }, []);

  const handleConfirmPasswordChange = useCallback((text: string) => {
    setFormData(prev => ({ ...prev, confirmPassword: text }));
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="flex-1 px-6 py-8">
            {/* Header */}
            <View className="items-center mb-8">
              <View className="w-16 h-16 bg-blue-600 rounded-xl items-center justify-center mb-4">
                <Ionicons name="construct" size={24} color="white" />
              </View>
              <Text className="text-3xl font-bold text-gray-900 mb-1">
                Join BuildTrack
              </Text>
              <Text className="text-gray-600 text-center">
                Create your account to get started
              </Text>
            </View>

            {/* Register Form */}
            <View className="space-y-4">
              {/* Name Input */}
              <View>
                <Text className="text-base font-medium text-gray-700 mb-2">
                  Full Name
                </Text>
                <View
                  className={cn(
                    "flex-row items-center border rounded-lg px-3 py-3",
                    errors.name
                      ? "border-red-300 bg-red-50"
                      : "border-gray-300 bg-gray-50"
                  )}
                >
                  <Ionicons
                    name="person-outline"
                    size={20}
                    color={errors.name ? "#ef4444" : "#6b7280"}
                  />
                  <TextInput
                    className="flex-1 ml-3 text-gray-900"
                    placeholder="Enter your full name"
                    value={formData.name}
                    onChangeText={handleNameChange}
                    autoComplete="name"
                    autoCorrect={false}
                    returnKeyType="next"
                  />
                </View>
                {errors.name && (
                  <Text className="text-red-500 text-sm mt-1">{errors.name}</Text>
                )}
              </View>

              {/* Phone Input */}
              <View>
                <Text className="text-base font-medium text-gray-700 mb-2">
                  Phone Number <Text className="text-red-500">*</Text>
                </Text>
                <View
                  className={cn(
                    "flex-row items-center border rounded-lg px-3 py-3",
                    errors.phone
                      ? "border-red-300 bg-red-50"
                      : "border-gray-300 bg-gray-50"
                  )}
                >
                  <Ionicons
                    name="call-outline"
                    size={20}
                    color={errors.phone ? "#ef4444" : "#6b7280"}
                  />
                  <TextInput
                    className="flex-1 ml-3 text-gray-900"
                    placeholder="Enter 8-digit phone number"
                    value={formData.phone}
                    onChangeText={handlePhoneChange}
                    keyboardType="numeric"
                    autoComplete="tel"
                    autoCorrect={false}
                    spellCheck={false}
                    returnKeyType="next"
                    maxLength={8}
                  />
                </View>
                {errors.phone && (
                  <Text className="text-red-500 text-sm mt-1">{errors.phone}</Text>
                )}
              </View>

              {/* Email Input */}
              <View>
                <Text className="text-base font-medium text-gray-700 mb-2">
                  Email Address <Text className="text-gray-400">(Optional)</Text>
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
                    placeholder="Enter your email (optional)"
                    value={formData.email}
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
                  Password
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
                    placeholder="Enter your password"
                    value={formData.password}
                    onChangeText={handlePasswordChange}
                    secureTextEntry={!showPassword}
                    autoComplete="off"
                    autoCorrect={false}
                    spellCheck={false}
                    autoCapitalize="none"
                    textContentType="none"
                    importantForAutofill="no"
                    returnKeyType="next"
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

              {/* Confirm Password Input */}
              <View>
                <Text className="text-base font-medium text-gray-700 mb-2">
                  Confirm Password
                </Text>
                <View
                  className={cn(
                    "flex-row items-center border rounded-lg px-3 py-3",
                    errors.confirmPassword
                      ? "border-red-300 bg-red-50"
                      : "border-gray-300 bg-gray-50"
                  )}
                >
                  <Ionicons
                    name="lock-closed-outline"
                    size={20}
                    color={errors.confirmPassword ? "#ef4444" : "#6b7280"}
                  />
                  <TextInput
                    className="flex-1 ml-3 text-gray-900"
                    placeholder="Confirm your password"
                    value={formData.confirmPassword}
                    onChangeText={handleConfirmPasswordChange}
                    secureTextEntry={!showConfirmPassword}
                    autoComplete="off"
                    autoCorrect={false}
                    spellCheck={false}
                    autoCapitalize="none"
                    textContentType="none"
                    importantForAutofill="no"
                    returnKeyType="done"
                  />
                  <Pressable
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="ml-2"
                  >
                    <Ionicons
                      name={showConfirmPassword ? "eye-outline" : "eye-off-outline"}
                      size={20}
                      color="#6b7280"
                    />
                  </Pressable>
                </View>
                {errors.confirmPassword && (
                  <Text className="text-red-500 text-sm mt-1">{errors.confirmPassword}</Text>
                )}
              </View>

              {/* Register Button */}
              <Pressable
                onPress={handleRegister}
                disabled={isLoading}
                className={cn(
                  "bg-blue-600 py-4 rounded-lg items-center mt-6",
                  isLoading && "opacity-50"
                )}
              >
                <Text className="text-white font-semibold text-xl">
                  {isLoading ? "Creating Account..." : "Create Account"}
                </Text>
              </Pressable>

              {/* Login Link */}
              <View className="flex-row justify-center mt-6">
                <Text className="text-gray-600">{"Already have an account? "}</Text>
                <Pressable onPress={onToggleLogin}>
                  <Text className="text-blue-600 font-semibold">Sign In</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}