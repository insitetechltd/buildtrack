import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  Pressable,
  Image,
  Animated,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../state/authStore";
import { useCompanyStore } from "../state/companyStore";
import { useThemeStore } from "../state/themeStore";
import { useTranslation } from "../utils/useTranslation";
import { cn } from "../utils/cn";
import { checkSupabaseConnection } from "../api/supabase";
import { detectEnvironment, getEnvironmentStyles } from "../utils/environmentDetector";

interface StandardHeaderProps {
  title: string;
  subtitle?: string;
  showBackButton?: boolean;
  onBackPress?: () => void;
  rightElement?: React.ReactNode;
  className?: string;
}

export default function StandardHeader({
  title,
  subtitle,
  showBackButton = false,
  onBackPress,
  rightElement,
  className = "",
}: StandardHeaderProps) {
  const { user } = useAuthStore();
  const { getCompanyBanner } = useCompanyStore();
  const { isDarkMode } = useThemeStore();
  const [supabaseStatus, setSupabaseStatus] = useState<"checking" | "connected" | "disconnected">("checking");
  const [environmentInfo] = useState(() => detectEnvironment());
  const t = useTranslation();
  const insets = useSafeAreaInsets();

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

  // Reduce top padding - use a smaller value to minimize gap
  // insets.top can be quite large on devices with Dynamic Island (59px)
  // We'll use a smaller value to bring content closer to the status bar
  const topPadding = Math.max(insets.top * 0.7, 8); // Use 70% of safe area or minimum 8px

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
            onPress={onBackPress}
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
        
        {/* Custom right element */}
        {rightElement}
      </View>
    </View>
  );
}
