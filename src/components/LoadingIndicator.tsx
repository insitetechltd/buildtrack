import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface LoadingIndicatorProps {
  isLoading: boolean;
  text?: string;
}

export const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({ 
  isLoading, 
  text = "Syncing..." 
}) => {
  if (!isLoading) return null;

  return (
    <View className="absolute top-2 right-2 bg-blue-500 rounded-full p-2 shadow-lg z-50">
      <View className="flex-row items-center">
        <ActivityIndicator size="small" color="white" />
        <Text className="text-white text-sm ml-1 font-medium">
          {text}
        </Text>
      </View>
    </View>
  );
};

// Blinking dot indicator for subtle loading state
export const LoadingDot: React.FC<{ isLoading: boolean }> = ({ isLoading }) => {
  if (!isLoading) return null;

  return (
    <View className="absolute top-3 right-3">
      <View className="w-3 h-3 bg-blue-500 rounded-full animate-pulse">
        <View className="w-3 h-3 bg-blue-400 rounded-full animate-ping absolute" />
      </View>
    </View>
  );
};

