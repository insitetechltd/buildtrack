import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  Modal,
  Platform,
  Image,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../state/authStore";
import { useLanguageStore, Language } from "../state/languageStore";
import { useThemeStore } from "../state/themeStore";
import { useCompanyStore } from "../state/companyStore";
import { useTranslation } from "../utils/useTranslation";
import { cn } from "../utils/cn";
import StandardHeader from "../components/StandardHeader";
import ModalHandle from "../components/ModalHandle";
import ExpandableUtilityFAB from "../components/ExpandableUtilityFAB";
import { useTaskStore } from "../state/taskStore.supabase";
import { useProjectStoreWithInit } from "../state/projectStore.supabase";
import { useUserStore } from "../state/userStore.supabase";
import { checkSupabaseConnection } from "../api/supabase";
import { detectEnvironment, getEnvironmentStyles } from "../utils/environmentDetector";

interface ProfileScreenProps {
  onNavigateBack: () => void;
  onNavigateToCreateTask?: () => void;
  onNavigateToDeveloperSettings?: () => void;
  onNavigateToPendingUsers?: () => void;
}

export default function ProfileScreen({ onNavigateBack, onNavigateToCreateTask, onNavigateToDeveloperSettings, onNavigateToPendingUsers }: ProfileScreenProps) {
  const { user, changePassword } = useAuthStore();
  const { language, setLanguage } = useLanguageStore();
  const { isDarkMode, toggleDarkMode } = useThemeStore();
  const { getCompanyBanner } = useCompanyStore();
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [supabaseStatus, setSupabaseStatus] = useState<"checking" | "connected" | "disconnected">("checking");
  const [environmentInfo] = useState(() => detectEnvironment());
  const t = useTranslation();

  // Check Supabase connection on component mount
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const isConnected = await checkSupabaseConnection();
        setSupabaseStatus(isConnected ? "connected" : "disconnected");
      } catch (error) {
        console.error("Supabase connection check failed:", error);
        setSupabaseStatus("disconnected");
      }
    };
    
    checkConnection();
  }, []);

  if (!user) return null;

  const banner = getCompanyBanner(user.companyId);

  const taskStore = useTaskStore();
  const { fetchTasks } = taskStore;
  const projectStore = useProjectStoreWithInit();
  const { fetchProjects, fetchUserProjectAssignments } = projectStore;
  const userStore = useUserStore();
  const { fetchUsers, getPendingUsersByCompany } = userStore;
  
  // Get pending users count for admin badge
  const pendingUsers = user?.role === 'admin' ? getPendingUsersByCompany(user.companyId) : [];
  const pendingCount = pendingUsers.length;

  const handleRefresh = async () => {
    if (!user) return;
    
    console.log('🔄 [Profile Refresh] Syncing all data...');
    
    try {
      // Sync all data in parallel
      await Promise.all([
        fetchTasks(),
        fetchProjects(),
        fetchUserProjectAssignments(user.id),
        fetchUsers(),
      ]);
      
      console.log('✅ [Profile Refresh] Sync completed');
    } catch (error) {
      console.error('❌ [Profile Refresh] Sync failed:', error);
    }
  };

  const handleLanguageChange = (newLanguage: Language) => {
    if (newLanguage === language) {
      // Same language, just close modal
      setShowLanguagePicker(false);
      return;
    }

    // Different language - change and reload
    setLanguage(newLanguage);
    setShowLanguagePicker(false);

    // Show reload confirmation
    setTimeout(() => {
      Alert.alert(
        t.profile.languageChanged,
        t.profile.languageChangedMessage,
        [
          {
            text: t.profile.later,
            style: "cancel",
          },
          {
            text: t.profile.reloadNow,
            onPress: () => {
              // In Expo dev mode, we can use DevSettings to reload
              // In production, this would reload the JS bundle
              if (__DEV__ && Platform.OS === "ios") {
                // For iOS dev, we can trigger a reload via DevSettings
                const DevSettings = require("react-native").DevSettings;
                DevSettings.reload();
              } else if (__DEV__ && Platform.OS === "android") {
                // For Android dev, we can trigger a reload
                const DevSettings = require("react-native").DevSettings;
                DevSettings.reload();
              } else {
                // Fallback: show message to manually restart
                Alert.alert(
                  t.profile.pleaseRestart,
                  t.profile.pleaseRestartMessage
                );
              }
            },
          },
        ]
      );
    }, 300);
  };

  const MenuOption = ({
    title,
    icon,
    onPress,
    showChevron = true,
    color = "text-gray-900",
    rightText,
    badge,
  }: {
    title: string;
    icon: string;
    onPress?: () => void;
    showChevron?: boolean;
    color?: string;
    rightText?: string;
    badge?: number;
  }) => (
    <Pressable
      onPress={onPress}
      className="flex-row items-center py-4 px-6 bg-white border-b border-gray-100"
    >
      <Ionicons name={icon as any} size={20} color="#6b7280" />
      <Text className={cn("flex-1 ml-3 text-lg", color)}>
        {title}
      </Text>
      {badge !== undefined && badge > 0 && (
        <View className="bg-red-500 rounded-full min-w-[24px] h-6 items-center justify-center px-2 mr-2">
          <Text className="text-white text-xs font-bold">
            {badge > 99 ? '99+' : badge}
          </Text>
        </View>
      )}
      {rightText && !badge && (
        <Text className="text-gray-500 text-base mr-2">
          {rightText}
        </Text>
      )}
      {showChevron && (
        <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
      )}
    </Pressable>
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <StatusBar style="dark" />
      
      {/* Standard Header */}
      <StandardHeader 
        title={t.profile.profile}
        showBackButton={true}
        onBackPress={onNavigateBack}
      />

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* User Info Card */}
        <View className="bg-white mx-6 mt-4 rounded-xl border border-gray-200">
          {/* Avatar and Name */}
          <View className="items-center py-6">
            <View className="w-20 h-20 bg-blue-600 rounded-full items-center justify-center mb-4">
              <Text className="text-white font-bold text-3xl">
                {user.name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <Text className="text-2xl font-bold text-gray-900">
              {user.name}
            </Text>
            <Text className="text-gray-600 capitalize">
              {user.role}
            </Text>
            <Text className="text-gray-500 text-base mt-1">
              {user.email}
            </Text>
            {user.phone && user.phone !== user.email && (
              <Text className="text-gray-500 text-base">
                {user.phone}
              </Text>
            )}
          </View>
        </View>

        {/* Menu Options */}
        <View className="mt-6">
          <Text className="text-xl font-semibold text-gray-900 px-6 mb-2">
            {t.profile.settings}
          </Text>
          <View className="bg-white border border-gray-200 rounded-xl mx-6">
            {user.role === 'admin' && (
              <MenuOption
                title="Pending Approvals"
                icon="people-outline"
                onPress={() => onNavigateToPendingUsers?.()}
                badge={pendingCount}
              />
            )}
            <MenuOption
              title={t.profile.language}
              icon="language-outline"
              rightText={language === "en" ? t.profile.english : t.profile.traditionalChinese}
              onPress={() => setShowLanguagePicker(true)}
            />
            <MenuOption
              title={t.profile.theme}
              icon={isDarkMode ? "moon" : "sunny-outline"}
              rightText={isDarkMode ? t.profile.darkMode : t.profile.lightMode}
              onPress={toggleDarkMode}
            />
            <MenuOption
              title={t.profile.reloadData}
              icon="refresh-outline"
              onPress={handleRefresh}
            />
            <MenuOption
              title={t.profile.editProfile}
              icon="person-outline"
              onPress={() => Alert.alert(t.phrases.comingSoon, t.phrases.comingSoonMessage)}
            />
            <MenuOption
              title={t.profile.notifications}
              icon="notifications-outline"
              onPress={() => Alert.alert(t.phrases.comingSoon, t.phrases.comingSoonMessage)}
            />
            <MenuOption
              title={t.profile.privacySecurity}
              icon="shield-outline"
              onPress={() => Alert.alert(t.phrases.comingSoon, t.phrases.comingSoonMessage)}
            />
            <MenuOption
              title="Change Password"
              icon="lock-closed-outline"
              onPress={() => setShowPasswordChange(true)}
            />
            <MenuOption
              title={t.profile.helpSupport}
              icon="help-circle-outline"
              onPress={() => Alert.alert(t.profile.helpSupport, "For support, please contact your system administrator or project manager.")}
            />
          </View>
        </View>

        {/* Developer Tools */}
        <View className="mt-6">
          <Text className="text-xl font-semibold text-gray-900 px-6 mb-2">
            Developer
          </Text>
          <View className="bg-white border border-gray-200 rounded-xl mx-6">
            <MenuOption
              title="Developer Settings"
              icon="code-slash-outline"
              onPress={() => onNavigateToDeveloperSettings?.()}
            />
          </View>
        </View>

        {/* App Info */}
        <View className="mt-6">
          <Text className="text-xl font-semibold text-gray-900 px-6 mb-2">
            About
          </Text>
          <View className="bg-white border border-gray-200 rounded-xl mx-6">
            <MenuOption
              title="About BuildTrack"
              icon="information-circle-outline"
              showChevron={false}
              onPress={() => Alert.alert("BuildTrack v1.0", "Construction Task Management Application\n\nBuilt for efficient project coordination and progress tracking.")}
            />
            
            {/* Supabase Connection Status */}
            
            <MenuOption
              title="Terms of Service"
              icon="document-text-outline"
              onPress={() => Alert.alert("Coming Soon", "Terms of service will be available in a future update.")}
            />
            <MenuOption
              title="Privacy Policy"
              icon="lock-closed-outline"
              onPress={() => Alert.alert("Coming Soon", "Privacy policy will be available in a future update.")}
            />
          </View>
        </View>

        {/* System Status Indicators */}
        <View className="mt-6 mb-4 px-6">
          <Text className="text-xl font-semibold text-gray-900 mb-2">
            System Status
          </Text>
          <View className="bg-white border border-gray-200 rounded-xl p-4">
            {/* Environment Indicator */}
            <View className="flex-row items-center justify-between py-2">
              <View className="flex-row items-center flex-1">
                <View 
                  className="w-3 h-3 rounded-full mr-3"
                  style={{ backgroundColor: getEnvironmentStyles(environmentInfo).backgroundColor }}
                />
                <Text className="text-base text-gray-700">
                  Environment
                </Text>
              </View>
              <Text className="text-base font-medium text-gray-900">
                {environmentInfo.displayName}
              </Text>
            </View>
            
            {/* Divider */}
            <View className="h-px bg-gray-200 my-2" />
            
            {/* Supabase Connection Status */}
            <View className="flex-row items-center justify-between py-2">
              <View className="flex-row items-center flex-1">
                <View 
                  className={cn(
                    "w-3 h-3 rounded-full mr-3",
                    supabaseStatus === "connected" ? "bg-green-500" :
                    supabaseStatus === "disconnected" ? "bg-red-500" :
                    "bg-yellow-500"
                  )}
                />
                <Text className="text-base text-gray-700">
                  Cloud Connection
                </Text>
              </View>
              <Text className={cn(
                "text-base font-medium",
                supabaseStatus === "connected" ? "text-green-700" :
                supabaseStatus === "disconnected" ? "text-red-700" :
                "text-yellow-700"
              )}>
                {supabaseStatus === "connected" ? "Connected" :
                 supabaseStatus === "disconnected" ? "Offline" :
                 "Checking..."}
              </Text>
            </View>
          </View>
        </View>

      </ScrollView>

      {/* Password Change Modal */}
      <Modal
        visible={showPasswordChange}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          if (!isChangingPassword) {
            setShowPasswordChange(false);
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
          }
        }}
      >
        <SafeAreaView className="flex-1 bg-gray-50">
          <StatusBar style="dark" />
          
          <ModalHandle />
          
          {/* Modal Header */}
          <View className="flex-row items-center bg-white border-b border-gray-200 px-6 py-4">
            <Pressable 
              onPress={() => {
                if (!isChangingPassword) {
                  setShowPasswordChange(false);
                  setCurrentPassword("");
                  setNewPassword("");
                  setConfirmPassword("");
                }
              }}
              className="mr-4 w-10 h-10 items-center justify-center"
              disabled={isChangingPassword}
            >
              <Ionicons name="close" size={24} color={isChangingPassword ? "#d1d5db" : "#374151"} />
            </Pressable>
            <Text className="text-2xl font-semibold text-gray-900 flex-1">
              Change Password
            </Text>
          </View>

          <ScrollView className="flex-1 px-6 py-4" showsVerticalScrollIndicator={false}>
            {/* Current Password */}
            <View className="mb-4">
              <Text className="text-base font-medium text-gray-700 mb-2">
                Current Password
              </Text>
              <TextInput
                className="border border-gray-300 rounded-lg px-4 py-3 text-gray-900 bg-white"
                placeholder="Enter your current password"
                value={currentPassword}
                onChangeText={setCurrentPassword}
                secureTextEntry
                autoCapitalize="none"
                editable={!isChangingPassword}
              />
            </View>

            {/* New Password */}
            <View className="mb-4">
              <Text className="text-base font-medium text-gray-700 mb-2">
                New Password
              </Text>
              <TextInput
                className="border border-gray-300 rounded-lg px-4 py-3 text-gray-900 bg-white"
                placeholder="Enter new password (min. 6 characters)"
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
                autoCapitalize="none"
                editable={!isChangingPassword}
              />
            </View>

            {/* Confirm Password */}
            <View className="mb-6">
              <Text className="text-base font-medium text-gray-700 mb-2">
                Confirm New Password
              </Text>
              <TextInput
                className="border border-gray-300 rounded-lg px-4 py-3 text-gray-900 bg-white"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                autoCapitalize="none"
                editable={!isChangingPassword}
              />
            </View>

            {/* Change Password Button */}
            <Pressable
              onPress={async () => {
                // Validation
                if (!currentPassword) {
                  Alert.alert("Error", "Please enter your current password");
                  return;
                }

                if (!newPassword || newPassword.length < 6) {
                  Alert.alert("Error", "New password must be at least 6 characters long");
                  return;
                }

                if (newPassword !== confirmPassword) {
                  Alert.alert("Error", "New passwords do not match");
                  return;
                }

                setIsChangingPassword(true);
                try {
                  const result = await changePassword(currentPassword, newPassword);
                  
                  if (result.success) {
                    Alert.alert(
                      "Success",
                      "Password changed successfully",
                      [
                        {
                          text: "OK",
                          onPress: () => {
                            setShowPasswordChange(false);
                            setCurrentPassword("");
                            setNewPassword("");
                            setConfirmPassword("");
                          }
                        }
                      ]
                    );
                  } else {
                    Alert.alert("Error", result.error || "Failed to change password");
                  }
                } catch (error: any) {
                  Alert.alert("Error", error.message || "Failed to change password");
                } finally {
                  setIsChangingPassword(false);
                }
              }}
              disabled={isChangingPassword}
              className={cn(
                "bg-blue-600 rounded-lg py-4 items-center justify-center",
                isChangingPassword ? "opacity-50" : ""
              )}
            >
              {isChangingPassword ? (
                <View className="flex-row items-center">
                  <ActivityIndicator color="white" size="small" className="mr-2" />
                  <Text className="text-white font-semibold text-lg">
                    Changing Password...
                  </Text>
                </View>
              ) : (
                <Text className="text-white font-semibold text-lg">
                  Change Password
                </Text>
              )}
            </Pressable>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Language Picker Modal */}
      <Modal
        visible={showLanguagePicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowLanguagePicker(false)}
      >
        <SafeAreaView className="flex-1 bg-gray-50">
          <StatusBar style="dark" />
          
          <ModalHandle />
          
          {/* Modal Header */}
          <View className="flex-row items-center bg-white border-b border-gray-200 px-6 py-4">
            <Pressable 
              onPress={() => setShowLanguagePicker(false)}
              className="mr-4 w-10 h-10 items-center justify-center"
            >
              <Ionicons name="close" size={24} color="#374151" />
            </Pressable>
            <Text className="text-2xl font-semibold text-gray-900 flex-1">
              {t.profile.selectLanguage}
            </Text>
          </View>

          <View className="px-6 py-4">
            {/* English Option */}
            <Pressable
              onPress={() => handleLanguageChange("en")}
              className={cn(
                "bg-white border rounded-lg px-4 py-4 mb-3 flex-row items-center",
                language === "en" ? "border-blue-500 bg-blue-50" : "border-gray-300"
              )}
            >
              <View className={cn(
                "w-5 h-5 rounded-full border-2 items-center justify-center mr-3",
                language === "en" ? "border-blue-500" : "border-gray-300"
              )}>
                {language === "en" && (
                  <View className="w-3 h-3 rounded-full bg-blue-500" />
                )}
              </View>
              <View className="flex-1">
                <Text className={cn(
                  "font-semibold text-lg",
                  language === "en" ? "text-blue-900" : "text-gray-900"
                )}>
                  English
                </Text>
                <Text className="text-sm text-gray-600 mt-0.5">
                  English (United States)
                </Text>
              </View>
              <Ionicons name="language-outline" size={24} color={language === "en" ? "#3b82f6" : "#6b7280"} />
            </Pressable>

            {/* Traditional Chinese Option */}
            <Pressable
              onPress={() => handleLanguageChange("zh-TW")}
              className={cn(
                "bg-white border rounded-lg px-4 py-4 mb-3 flex-row items-center",
                language === "zh-TW" ? "border-blue-500 bg-blue-50" : "border-gray-300"
              )}
            >
              <View className={cn(
                "w-5 h-5 rounded-full border-2 items-center justify-center mr-3",
                language === "zh-TW" ? "border-blue-500" : "border-gray-300"
              )}>
                {language === "zh-TW" && (
                  <View className="w-3 h-3 rounded-full bg-blue-500" />
                )}
              </View>
              <View className="flex-1">
                <Text className={cn(
                  "font-semibold text-lg",
                  language === "zh-TW" ? "text-blue-900" : "text-gray-900"
                )}>
                  繁體中文
                </Text>
                <Text className="text-sm text-gray-600 mt-0.5">
                  Traditional Chinese
                </Text>
              </View>
              <Ionicons name="language-outline" size={24} color={language === "zh-TW" ? "#3b82f6" : "#6b7280"} />
            </Pressable>

          </View>
        </SafeAreaView>
      </Modal>

      {/* Expandable Utility FAB */}
      <ExpandableUtilityFAB 
        onCreateTask={onNavigateToCreateTask || (() => {})}
      />
    </SafeAreaView>
  );
}