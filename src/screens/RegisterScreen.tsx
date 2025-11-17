import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Modal,
  FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../state/authStore";
import { useCompanyStore } from "../state/companyStore";
import { UserRole, CompanyType } from "../types/buildtrack";
import { cn } from "../utils/cn";
import { notifyDataMutation } from "../utils/DataRefreshManager";

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
    promoCode: "",
    companySelection: "" as "existing" | "new" | "",
    selectedCompanyId: "",
    newCompanyName: "",
    newCompanyType: "general_contractor" as CompanyType,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showCompanyPicker, setShowCompanyPicker] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const VALID_PROMO_CODE = "tasker";

  const { register, isLoading } = useAuthStore();
  const companies = useCompanyStore(state => state.companies);
  const fetchCompanies = useCompanyStore(state => state.fetchCompanies);
  const createCompany = useCompanyStore(state => state.createCompany);

  // Fetch companies when component mounts
  useEffect(() => {
    fetchCompanies();
  }, []);

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

    if (!formData.promoCode.trim()) {
      newErrors.promoCode = "Promo code is required";
    } else if (formData.promoCode.toLowerCase() !== VALID_PROMO_CODE.toLowerCase()) {
      newErrors.promoCode = "Invalid promo code";
    }

    // Company selection validation
    if (!formData.companySelection) {
      newErrors.company = "Please select a company option";
    } else if (formData.companySelection === "existing" && !formData.selectedCompanyId) {
      newErrors.company = "Please select a company";
    } else if (formData.companySelection === "new") {
      if (!formData.newCompanyName.trim()) {
        newErrors.company = "Company name is required";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    // Clear any existing errors before validation
    setErrors({});
    
    if (!validateForm()) return;

    try {
      let companyId: string;
      let isFirstUser = false;
      let userRole: UserRole = "worker";

      // Handle company selection
      if (formData.companySelection === "new") {
        // Create new company - user becomes admin
        console.log("Creating new company:", formData.newCompanyName);
        
        companyId = await createCompany({
          name: formData.newCompanyName,
          type: formData.newCompanyType,
          isActive: true,
          createdBy: "pending", // Will be updated after user is created
        });
        
        isFirstUser = true;
        userRole = "admin"; // First user of new company is admin
        
        console.log("New company created with ID:", companyId);
      } else {
        // Join existing company
        companyId = formData.selectedCompanyId;
        isFirstUser = false;
        userRole = "worker"; // Users joining existing companies start as workers
      }

      // Register the user
      const result = await register({
        name: formData.name,
        phone: formData.phone,
        companyId: companyId,
        position: isFirstUser ? "Company Administrator" : "Field Worker",
        email: formData.email || undefined,
        password: formData.password,
        role: userRole,
        isPending: !isFirstUser, // First user of new company is auto-approved
      });
      
      if (!result.success) {
        Alert.alert(
          "Registration Failed",
          result.error || "An error occurred during registration.",
          [{ text: "OK" }]
        );
        return;
      }

      // Notify all users about the new user registration
      notifyDataMutation('user');

      // Show appropriate success message
      if (isFirstUser) {
        Alert.alert(
          "Welcome!",
          "Your company has been created and you are now the administrator. You can start creating projects and inviting team members.",
          [{ text: "Get Started" }]
        );
      } else {
        Alert.alert(
          "Registration Submitted",
          "Your registration request has been sent to the company administrator for approval. You will be notified once approved.",
          [{ text: "OK", onPress: onToggleLogin }]
        );
      }
    } catch (error: any) {
      console.error("Registration error:", error);
      Alert.alert(
        "Registration Failed",
        error.message || "An unexpected error occurred. Please try again.",
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

  const handlePromoCodeChange = useCallback((text: string) => {
    setFormData(prev => ({ ...prev, promoCode: text }));
  }, []);

  const handleCompanySelection = useCallback((type: "existing" | "new") => {
    setFormData(prev => ({ 
      ...prev, 
      companySelection: type,
      selectedCompanyId: type === "new" ? "" : prev.selectedCompanyId,
      newCompanyName: type === "existing" ? "" : prev.newCompanyName,
    }));
    setErrors(prev => ({ ...prev, company: "" }));
    
    // Open company picker modal immediately when "Join Existing" is pressed
    if (type === "existing") {
      setShowCompanyPicker(true);
    }
  }, []);

  const handleSelectCompany = useCallback((companyId: string) => {
    setFormData(prev => ({ ...prev, selectedCompanyId: companyId }));
    setShowCompanyPicker(false);
    setErrors(prev => ({ ...prev, company: "" }));
  }, []);

  const handleNewCompanyNameChange = useCallback((text: string) => {
    setFormData(prev => ({ ...prev, newCompanyName: text }));
    setErrors(prev => ({ ...prev, company: "" }));
  }, []);

  const getSelectedCompanyName = () => {
    const company = companies.find(c => c.id === formData.selectedCompanyId);
    return company?.name || "Select a company";
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
          <View className="flex-1 px-6 py-8">
            {/* Header */}
            <View className="items-center mb-8">
              <View className="w-16 h-16 bg-blue-600 rounded-xl items-center justify-center mb-4">
                <Ionicons name="construct" size={24} color="white" />
              </View>
              <Text className="text-3xl font-bold text-gray-900 mb-1">
                Join Taskr
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
                    returnKeyType="next"
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

              {/* Promo Code Input */}
              <View>
                <Text className="text-base font-medium text-gray-700 mb-2">
                  Promo Code <Text className="text-red-500">*</Text>
                </Text>
                <View
                  className={cn(
                    "flex-row items-center border rounded-lg px-3 py-3",
                    errors.promoCode
                      ? "border-red-300 bg-red-50"
                      : formData.promoCode.toLowerCase() === VALID_PROMO_CODE.toLowerCase() && formData.promoCode
                      ? "border-green-300 bg-green-50"
                      : "border-gray-300 bg-gray-50"
                  )}
                >
                  <Ionicons
                    name="ticket-outline"
                    size={20}
                    color={errors.promoCode ? "#ef4444" : formData.promoCode.toLowerCase() === VALID_PROMO_CODE.toLowerCase() && formData.promoCode ? "#10b981" : "#6b7280"}
                  />
                  <TextInput
                    className="flex-1 ml-3 text-gray-900"
                    placeholder="Enter promo code to continue"
                    value={formData.promoCode}
                    onChangeText={handlePromoCodeChange}
                    autoCapitalize="none"
                    autoComplete="off"
                    autoCorrect={false}
                    spellCheck={false}
                    returnKeyType="done"
                  />
                  {formData.promoCode.toLowerCase() === VALID_PROMO_CODE.toLowerCase() && formData.promoCode && (
                    <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                  )}
                </View>
                {errors.promoCode && (
                  <Text className="text-red-500 text-sm mt-1">{errors.promoCode}</Text>
                )}
                {!errors.promoCode && formData.promoCode.toLowerCase() === VALID_PROMO_CODE.toLowerCase() && formData.promoCode && (
                  <Text className="text-green-600 text-sm mt-1">✓ Valid promo code!</Text>
                )}
              </View>

              {/* Company Selection */}
              <View>
                <Text className="text-base font-medium text-gray-700 mb-2">
                  Company <Text className="text-red-500">*</Text>
                </Text>
                
                {/* Company Selection Buttons */}
                <View className="flex-row gap-2 mb-3">
                  <Pressable
                    onPress={() => handleCompanySelection("existing")}
                    className={cn(
                      "flex-1 py-3 px-4 rounded-lg border-2 flex-row items-center justify-center",
                      formData.companySelection === "existing"
                        ? "border-blue-600 bg-blue-50"
                        : "border-gray-300 bg-gray-50"
                    )}
                  >
                    <Ionicons
                      name="business-outline"
                      size={20}
                      color={formData.companySelection === "existing" ? "#2563eb" : "#6b7280"}
                    />
                    <Text
                      className={cn(
                        "ml-2 font-medium",
                        formData.companySelection === "existing"
                          ? "text-blue-600"
                          : "text-gray-700"
                      )}
                    >
                      Join Existing
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => handleCompanySelection("new")}
                    className={cn(
                      "flex-1 py-3 px-4 rounded-lg border-2 flex-row items-center justify-center",
                      formData.companySelection === "new"
                        ? "border-blue-600 bg-blue-50"
                        : "border-gray-300 bg-gray-50"
                    )}
                  >
                    <Ionicons
                      name="add-circle-outline"
                      size={20}
                      color={formData.companySelection === "new" ? "#2563eb" : "#6b7280"}
                    />
                    <Text
                      className={cn(
                        "ml-2 font-medium",
                        formData.companySelection === "new"
                          ? "text-blue-600"
                          : "text-gray-700"
                      )}
                    >
                      Create New
                    </Text>
                  </Pressable>
                </View>

                {/* Selected Company Display */}
                {formData.companySelection === "existing" && formData.selectedCompanyId && (
                  <Pressable
                    onPress={() => setShowCompanyPicker(true)}
                    className="flex-row items-center border border-blue-300 bg-blue-50 rounded-lg px-3 py-3"
                  >
                    <Ionicons
                      name="business"
                      size={20}
                      color="#2563eb"
                    />
                    <Text className="flex-1 ml-3 text-gray-900 font-medium">
                      {getSelectedCompanyName()}
                    </Text>
                    <Pressable
                      onPress={() => setShowCompanyPicker(true)}
                      className="ml-2"
                    >
                      <Text className="text-blue-600 text-sm">Change</Text>
                    </Pressable>
                  </Pressable>
                )}

                {/* New Company Input */}
                {formData.companySelection === "new" && (
                  <View>
                    <View
                      className={cn(
                        "flex-row items-center border rounded-lg px-3 py-3 mb-3",
                        errors.company
                          ? "border-red-300 bg-red-50"
                          : "border-gray-300 bg-gray-50"
                      )}
                    >
                      <Ionicons
                        name="business"
                        size={20}
                        color={errors.company ? "#ef4444" : "#6b7280"}
                      />
                      <TextInput
                        className="flex-1 ml-3 text-gray-900"
                        placeholder="Enter your company name"
                        value={formData.newCompanyName}
                        onChangeText={handleNewCompanyNameChange}
                        autoCorrect={false}
                        returnKeyType="done"
                      />
                    </View>
                    <View className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <View className="flex-row items-start">
                        <Ionicons name="information-circle" size={20} color="#2563eb" />
                        <Text className="flex-1 ml-2 text-sm text-blue-800">
                          You will be the first user and administrator of this company.
                        </Text>
                      </View>
                    </View>
                  </View>
                )}

                {errors.company && (
                  <Text className="text-red-500 text-sm mt-1">{errors.company}</Text>
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

      {/* Company Picker Modal */}
      <Modal
        visible={showCompanyPicker}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCompanyPicker(false)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white rounded-t-3xl max-h-[70%]">
            {/* Modal Header */}
            <View className="flex-row items-center justify-between px-6 py-4 border-b border-gray-200">
              <Text className="text-xl font-bold text-gray-900">Select Company</Text>
              <Pressable
                onPress={() => setShowCompanyPicker(false)}
                className="w-8 h-8 items-center justify-center"
              >
                <Ionicons name="close" size={24} color="#6b7280" />
              </Pressable>
            </View>

            {/* Company List */}
            <FlatList
              data={companies}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ padding: 16 }}
              ListEmptyComponent={
                <View className="py-12 items-center">
                  <Ionicons name="business-outline" size={48} color="#d1d5db" />
                  <Text className="text-gray-500 mt-4 text-center">
                    No companies available
                  </Text>
                </View>
              }
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => handleSelectCompany(item.id)}
                  className={cn(
                    "flex-row items-center p-4 rounded-lg mb-2",
                    formData.selectedCompanyId === item.id
                      ? "bg-blue-50 border-2 border-blue-600"
                      : "bg-gray-50 border border-gray-200"
                  )}
                >
                  <View className="flex-1">
                    <Text className="text-base font-semibold text-gray-900">
                      {item.name}
                    </Text>
                    {item.type && (
                      <Text className="text-sm text-gray-500 mt-1 capitalize">
                        {item.type.replace(/_/g, " ")}
                      </Text>
                    )}
                  </View>
                  {formData.selectedCompanyId === item.id && (
                    <Ionicons name="checkmark-circle" size={24} color="#2563eb" />
                  )}
                </Pressable>
              )}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}