import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  Pressable,
  Image,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../state/authStore";
import { useCompanyStore } from "../state/companyStore";
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

  return (
    <View className={cn("bg-white border-b border-gray-200 px-6 py-4", className)}>
      {/* First Row: Status Indicators - Above everything */}
      <View className="flex-row items-center justify-end mb-2">
        <View className="flex-row items-center space-x-4">
          {/* Environment Indicator */}
          <View className="flex-row items-center">
            <View 
              className="w-2 h-2 rounded-full mr-2"
              style={{ backgroundColor: getEnvironmentStyles(environmentInfo).backgroundColor }}
            />
            <Text className="text-xs font-medium text-gray-700">
              {environmentInfo.displayName}
            </Text>
          </View>
          
          {/* Supabase Connection Status */}
          <View className="flex-row items-center">
            <View 
              className={cn(
                "w-2 h-2 rounded-full mr-2",
                supabaseStatus === "connected" ? "bg-green-500" :
                supabaseStatus === "disconnected" ? "bg-red-500" :
                "bg-yellow-500"
              )}
            />
            <Text className={cn(
              "text-xs font-medium",
              supabaseStatus === "connected" ? "text-green-700" :
              supabaseStatus === "disconnected" ? "text-red-700" :
              "text-yellow-700"
            )}>
              {supabaseStatus === "connected" ? "Cloud" :
               supabaseStatus === "disconnected" ? "Offline" :
               "Checking..."}
            </Text>
          </View>
        </View>
      </View>

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
            <Ionicons name="arrow-back" size={24} color="#374151" />
          </Pressable>
        )}
        
        {/* Title and Subtitle */}
        <View className="flex-1">
          <Text className="text-xl font-bold text-gray-900">
            {title}
          </Text>
          {subtitle && (
            <Text className="text-sm text-gray-600 mt-0.5" numberOfLines={1}>
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
