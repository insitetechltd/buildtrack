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
import { cn } from "../utils/cn";

interface LoginScreenProps {
  onToggleRegister: () => void;
}

export default function LoginScreen({ onToggleRegister }: LoginScreenProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const { login, isLoading } = useAuthStore();

  const validateForm = () => {
    const newErrors: { email?: string; password?: string } = {};

    if (!email) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = "Please enter a valid email";
    }

    if (!password) {
      newErrors.password = "Password is required";
    } else if (password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
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
        "Login Failed",
        "Invalid email or password. Please try again.",
        [{ text: "OK" }]
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
        "Quick Login Failed",
        `Failed to login with ${email}. Please try again.`,
        [{ text: "OK" }]
      );
    }
  };

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
          <View className="flex-1 px-6 py-8 justify-center">
            {/* Logo and Title */}
            <View className="items-center mb-12">
              <View className="w-20 h-20 bg-blue-600 rounded-2xl items-center justify-center mb-6">
                <Ionicons name="construct" size={32} color="white" />
              </View>
              <Text className="text-3xl font-bold text-gray-900 mb-2">
                BuildTrack
              </Text>
              <Text className="text-gray-600 text-center">
                Construction Task Management
              </Text>
            </View>

            {/* Quick Login User List */}
            <View className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <Text className="text-sm font-semibold text-blue-800 mb-3">
                👥 Quick Login - Tap any user (9 total):
              </Text>
              
              <View className="space-y-3">
                {/* Admin Tristan */}
                <Pressable 
                  className="bg-indigo-50 border border-indigo-200 rounded-lg py-4 px-4 active:bg-indigo-100"
                  onPress={() => handleQuickLogin('admin_tristan@insitetech.com', 'password123')}
                >
                  <Text className="text-base font-semibold text-indigo-900">
                    Insite Tech: Admin: Admin Tristan
                  </Text>
                </Pressable>
                
                {/* Tristan (Manager) */}
                <Pressable 
                  className="bg-indigo-50 border border-indigo-200 rounded-lg py-4 px-4 active:bg-indigo-100"
                  onPress={() => handleQuickLogin('tristan@insitetech.com', 'password123')}
                >
                  <Text className="text-base font-semibold text-indigo-900">
                    Insite Tech: Manager: Tristan
                  </Text>
                </Pressable>
                
                {/* Peter - Featured */}
                <Pressable 
                  className="bg-blue-50 border-2 border-blue-300 rounded-lg py-4 px-4 active:bg-blue-100"
                  onPress={() => handleQuickLogin('peter@buildtrack.com', 'password123')}
                >
                  <Text className="text-base font-bold text-blue-900">
                    ⭐ BuildTrack: Worker: Peter
                  </Text>
                </Pressable>
                
                {/* John Manager */}
                <Pressable 
                  className="bg-purple-50 border border-purple-200 rounded-lg py-4 px-4 active:bg-purple-100"
                  onPress={() => handleQuickLogin('manager@buildtrack.com', 'password123')}
                >
                  <Text className="text-base font-semibold text-purple-900">
                    BuildTrack: Manager: John Manager
                  </Text>
                </Pressable>
                
                {/* Sarah Worker */}
                <Pressable 
                  className="bg-green-50 border border-green-200 rounded-lg py-4 px-4 active:bg-green-100"
                  onPress={() => handleQuickLogin('worker@buildtrack.com', 'password123')}
                >
                  <Text className="text-base font-semibold text-green-900">
                    BuildTrack: Worker: Sarah Worker
                  </Text>
                </Pressable>
                
                {/* Alex Administrator */}
                <Pressable 
                  className="bg-red-50 border border-red-200 rounded-lg py-4 px-4 active:bg-red-100"
                  onPress={() => handleQuickLogin('admin@buildtrack.com', 'password123')}
                >
                  <Text className="text-base font-semibold text-red-900">
                    BuildTrack: Admin: Alex Administrator
                  </Text>
                </Pressable>
                
                {/* Lisa Martinez - Elite Electric */}
                <Pressable 
                  className="bg-orange-50 border border-orange-200 rounded-lg py-4 px-4 active:bg-orange-100"
                  onPress={() => handleQuickLogin('lisa@eliteelectric.com', 'password123')}
                >
                  <Text className="text-base font-semibold text-orange-900">
                    Elite Electric: Worker: Lisa Martinez
                  </Text>
                </Pressable>
                
                {/* Mike Johnson - Elite Electric */}
                <Pressable 
                  className="bg-teal-50 border border-teal-200 rounded-lg py-4 px-4 active:bg-teal-100"
                  onPress={() => handleQuickLogin('admin@eliteelectric.com', 'password123')}
                >
                  <Text className="text-base font-semibold text-teal-900">
                    Elite Electric: Admin: Mike Johnson
                  </Text>
                </Pressable>
              </View>
              
              <Text className="text-xs text-gray-600 mt-2 italic">
                💡 Tap any name to login instantly
              </Text>
            </View>

            {/* Login Form */}
            <View className="space-y-4">
              {/* Email Input */}
              <View>
                <Text className="text-sm font-medium text-gray-700 mb-2">
                  Email Address
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
                    placeholder="Enter your email"
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
                  <Text className="text-red-500 text-xs mt-1">{errors.email}</Text>
                )}
              </View>

              {/* Password Input */}
              <View>
                <Text className="text-sm font-medium text-gray-700 mb-2">
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
                  <Text className="text-red-500 text-xs mt-1">{errors.password}</Text>
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
                <Text className="text-white font-semibold text-lg">
                  {isLoading ? "Signing In..." : "Sign In"}
                </Text>
              </Pressable>

              {/* Register Link */}
              <View className="flex-row justify-center mt-6">
                <Text className="text-gray-600">{"Don't have an account? "}</Text>
                <Pressable onPress={onToggleRegister}>
                  <Text className="text-blue-600 font-semibold">Sign Up</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}