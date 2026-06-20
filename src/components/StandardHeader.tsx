import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  Pressable,
  Image,
  Animated,
  Platform,
  Dimensions,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../state/authStore";
import { useCompanyStore } from "../state/companyStore";
import { useThemeStore } from "../state/themeStore";
import { useTranslation } from "../utils/useTranslation";
import { cn } from "../utils/cn";
import { checkSupabaseConnection } from "../api/supabase";
import { detectEnvironment, getEnvironmentStyles } from "../utils/environmentDetector";
import ProfileMenu from "./ProfileMenu";

interface StandardHeaderProps {
  title: string;
  subtitle?: string;
  showBackButton?: boolean;
  onBackPress?: () => void;
  onBack?: () => void;
  rightElement?: React.ReactNode;
  onProfilePress?: () => void;
  onNavigateToProfile?: () => void;
  onNavigateToProjectPicker?: (allowBack?: boolean) => void;
  className?: string;
}

export default function StandardHeader({
  title,
  subtitle,
  showBackButton = false,
  onBackPress,
  onBack,
  rightElement,
  onProfilePress,
  onNavigateToProfile,
  onNavigateToProjectPicker,
  className = "",
}: StandardHeaderProps) {
  const { user } = useAuthStore();
  const { getCompanyBanner } = useCompanyStore();
  const { isDarkMode } = useThemeStore();
  const navigation = useNavigation<any>();
  const [supabaseStatus, setSupabaseStatus] = useState<"checking" | "connected" | "disconnected">("checking");
  const [environmentInfo] = useState(() => detectEnvironment());
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const t = useTranslation();
  const insets = useSafeAreaInsets();

  // Provide default navigation functions if not provided as props
  const handleNavigateToProfile = onNavigateToProfile || (() => {
    navigation.getParent()?.navigate("Profile");
  });

  const handleNavigateToProjectPicker = onNavigateToProjectPicker || ((allowBack?: boolean) => {
    navigation.getParent()?.navigate("ProjectPicker", { allowBack });
  });

  // Calculate top padding based on safe area insets
  // Since SafeAreaView already handles the safe area, we only need minimal padding
  // Use the actual inset value plus a small buffer (8px) for comfortable spacing
  // For devices with no inset (web/desktop), use 16px as minimum
  const topPadding = insets.top > 0 ? insets.top + 8 : 16;

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

  if (!user) {
    // Return a minimal header when user is not loaded yet
    return (
      <View className={cn(
        "border-b px-6 pb-4",
        isDarkMode ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200",
        className
      )} style={{ paddingTop: topPadding }}>
        <View className="flex-row items-center">
          <View className="flex-1">
            <Text className={cn(
              "text-2xl font-bold",
              isDarkMode ? "text-white" : "text-gray-900"
            )}>
              {title}
            </Text>
            {subtitle && (
              <Text className={cn(
                "text-base mt-0.5",
                isDarkMode ? "text-slate-400" : "text-gray-600"
              )} numberOfLines={1}>
                {subtitle}
              </Text>
            )}
          </View>
          {rightElement ? <View className="ml-3">{rightElement}</View> : null}
        </View>
      </View>
    );
  }

  const banner = getCompanyBanner(user.companyId);
  
  // Debug logging to help diagnose spacing issues
  if (__DEV__) {
    console.log('[StandardHeader] Top spacing:', {
      insetsTop: insets.top,
      calculatedPadding: topPadding,
      deviceType: Platform.OS,
    });
  }

  return (
    <View className={cn(
      "border-b px-6 pb-4",
      isDarkMode ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200",
      className
    )} style={{ paddingTop: topPadding }}>

      {/* Company Banner */}
      {banner && banner.isVisible && (
        <View className="mb-2">
          {banner.imageUri ? (
            // Display image banner
            <Image
              source={{ uri: banner.imageUri }}
              style={{ width: '100%', height: 60 }}
              resizeMode="cover"
              className="rounded-lg"
            />
          ) : (
            // Display text banner
            <Text 
              style={{ 
                color: banner.textColor,
                fontSize: 18, // Consistent with main title
                fontWeight: '700',
              }}
              numberOfLines={1}
            >
              {banner.text}
            </Text>
          )}
        </View>
      )}
      
      {/* Screen Title with Back Button */}
      <View className="flex-row items-center">
        {/* Back Button */}
        {showBackButton && (
          <Pressable 
            onPress={onBackPress || onBack}
            className="w-10 h-10 items-center justify-center mr-3"
          >
            <Ionicons name="arrow-back" size={24} color={isDarkMode ? "#cbd5e1" : "#374151"} />
          </Pressable>
        )}
        
        {/* Title and Subtitle */}
        <View className="flex-1">
          <Text className={cn(
            "text-2xl font-bold",
            isDarkMode ? "text-white" : "text-gray-900"
          )}>
            {title}
          </Text>
          {subtitle && (
            <Text className={cn(
              "text-base mt-0.5",
              isDarkMode ? "text-slate-400" : "text-gray-600"
            )} numberOfLines={1}>
              {subtitle}
            </Text>
          )}
        </View>
        
        <View className="ml-3 flex-row items-center">
          {rightElement ? <View>{rightElement}</View> : null}
          <Pressable 
            onPress={() => {
              if (onProfilePress) {
                onProfilePress();
              } else {
                setShowProfileMenu(true);
              }
            }}
            className={cn("flex-row items-center", rightElement ? "ml-2" : "")}
          >
            <View className="w-8 h-8 bg-blue-600 rounded-full items-center justify-center">
              <Text className="text-white font-bold text-base">
                {user.name.charAt(0).toUpperCase()}
              </Text>
            </View>
          </Pressable>
        </View>
      </View>

      {/* Profile Menu - Only render when user is available */}
      {user && (
        <ProfileMenu
          visible={showProfileMenu}
          onClose={() => setShowProfileMenu(false)}
          onNavigateToProfile={handleNavigateToProfile}
          onNavigateToProjectPicker={handleNavigateToProjectPicker}
        />
      )}
    </View>
  );
}
