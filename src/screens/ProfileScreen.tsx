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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../state/authStore";
import { useLanguageStore, Language } from "../state/languageStore";
import { useCompanyStore } from "../state/companyStore";
import { useTranslation } from "../utils/useTranslation";
import { cn } from "../utils/cn";
import StandardHeader from "../components/StandardHeader";
import ModalHandle from "../components/ModalHandle";
import LogoutFAB from "../components/LogoutFAB"; // Keep for screens without create task

interface ProfileScreenProps {
  onNavigateBack: () => void;
}

export default function ProfileScreen({ onNavigateBack }: ProfileScreenProps) {
  const { user } = useAuthStore();
  const { language, setLanguage } = useLanguageStore();
  const { getCompanyBanner } = useCompanyStore();
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);
  const t = useTranslation();

  if (!user) return null;

  const banner = getCompanyBanner(user.companyId);

  // Manual refresh function
  const handleRefresh = async () => {
    if (!user) return;
    
    console.log('🔄 Manual refresh triggered from Profile...');
    
    try {
      // Refresh all stores
      const projectStore = require('../state/projectStore.supabase').useProjectStore.getState();
      const taskStore = require('../state/taskStore.supabase').useTaskStore.getState();
      const userStore = require('../state/userStore.supabase').useUserStore.getState();
      
      await Promise.all([
        projectStore.fetchProjects?.(),
        projectStore.fetchUserProjectAssignments?.(user.id),
        taskStore.fetchTasks?.(),
        userStore.fetchUsers?.()
      ]);
      
      console.log('✅ Manual refresh completed');
      Alert.alert('Success', 'Data refreshed successfully!');
    } catch (error) {
      console.error('❌ Manual refresh failed:', error);
      Alert.alert('Error', 'Failed to refresh data. Please try again.');
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
  }: {
    title: string;
    icon: string;
    onPress?: () => void;
    showChevron?: boolean;
    color?: string;
    rightText?: string;
  }) => (
    <Pressable
      onPress={onPress}
      className="flex-row items-center py-4 px-6 bg-white border-b border-gray-100"
    >
      <Ionicons name={icon as any} size={20} color="#6b7280" />
      <Text className={cn("flex-1 ml-3 text-base", color)}>
        {title}
      </Text>
      {rightText && (
        <Text className="text-gray-500 text-sm mr-2">
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
        rightElement={
          <Pressable
            onPress={handleRefresh}
            className="w-10 h-10 bg-blue-600 rounded-full items-center justify-center"
          >
            <Ionicons name="refresh" size={20} color="white" />
          </Pressable>
        }
      />

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* User Info Card */}
        <View className="bg-white mx-6 mt-4 rounded-xl border border-gray-200">
          {/* Avatar and Name */}
          <View className="items-center py-6">
            <View className="w-20 h-20 bg-blue-600 rounded-full items-center justify-center mb-4">
              <Text className="text-white font-bold text-2xl">
                {user.name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <Text className="text-xl font-bold text-gray-900">
              {user.name}
            </Text>
            <Text className="text-gray-600 capitalize">
              {user.role}
            </Text>
            <Text className="text-gray-500 text-sm mt-1">
              {user.email}
            </Text>
            {user.phone && user.phone !== user.email && (
              <Text className="text-gray-500 text-sm">
                {user.phone}
              </Text>
            )}
          </View>
        </View>

        {/* Menu Options */}
        <View className="mt-6">
          <Text className="text-lg font-semibold text-gray-900 px-6 mb-2">
            {t.profile.settings}
          </Text>
          <View className="bg-white border border-gray-200 rounded-xl mx-6">
            <MenuOption
              title={t.profile.language}
              icon="language-outline"
              rightText={language === "en" ? t.profile.english : t.profile.traditionalChinese}
              onPress={() => setShowLanguagePicker(true)}
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
              title={t.profile.helpSupport}
              icon="help-circle-outline"
              onPress={() => Alert.alert(t.profile.helpSupport, "For support, please contact your system administrator or project manager.")}
            />
          </View>
        </View>

        {/* App Info */}
        <View className="mt-6">
          <Text className="text-lg font-semibold text-gray-900 px-6 mb-2">
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

      </ScrollView>

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
            <Text className="text-xl font-semibold text-gray-900 flex-1">
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
                  "font-semibold text-base",
                  language === "en" ? "text-blue-900" : "text-gray-900"
                )}>
                  English
                </Text>
                <Text className="text-xs text-gray-600 mt-0.5">
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
                  "font-semibold text-base",
                  language === "zh-TW" ? "text-blue-900" : "text-gray-900"
                )}>
                  繁體中文
                </Text>
                <Text className="text-xs text-gray-600 mt-0.5">
                  Traditional Chinese
                </Text>
              </View>
              <Ionicons name="language-outline" size={24} color={language === "zh-TW" ? "#3b82f6" : "#6b7280"} />
            </Pressable>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Logout FAB */}
      <LogoutFAB />
    </SafeAreaView>
  );
}