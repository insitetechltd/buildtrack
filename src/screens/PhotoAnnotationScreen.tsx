import React from "react";
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";

import { usePhotoAnnotationViewAdapter } from "../ui/viewAdapters/usePhotoAnnotationViewAdapter";

interface PhotoAnnotationScreenProps {
  photoUri: string;
  onSave: (annotatedPhotoUri: string) => void;
  onCancel: () => void;
}

export default function PhotoAnnotationScreen({
  photoUri,
  onSave,
  onCancel,
}: PhotoAnnotationScreenProps) {
  const adapter = usePhotoAnnotationViewAdapter({
    photoUri,
    onSave,
    onCancel,
  });

  const insets = useSafeAreaInsets();
  const topPadding = insets.top > 0 ? insets.top + 8 : 16;

  return (
    <SafeAreaView edges={['bottom', 'left', 'right']} className="flex-1 bg-gray-50">
      <StatusBar style="dark" />
      
      {/* Header */}
      <View 
        className="flex-row items-center justify-between px-6 pb-4 bg-white border-b border-gray-200"
        style={{ paddingTop: topPadding }}
      >
        <Pressable
          onPress={onCancel}
          className="flex-row items-center"
        >
          <Ionicons name="arrow-back" size={24} color="#374151" />
          <Text className="text-gray-700 text-base font-medium ml-2">Cancel</Text>
        </Pressable>
        
        <Text className="text-gray-900 text-lg font-semibold">Annotate Photo</Text>
        
        <View style={{ width: 80 }} />
      </View>

      {/* Loading State */}
      {adapter.isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text className="text-gray-600 mt-4">Opening editor...</Text>
        </View>
      ) : (
        <View className="flex-1 items-center justify-center px-6">
          <Ionicons name="create-outline" size={64} color="#3b82f6" />
          <Text className="text-xl font-semibold text-gray-900 mt-4 text-center">
            Photo Editor
          </Text>
          <Text className="text-base text-gray-600 mt-2 text-center">
            The photo editor will open in a moment. You can draw, add text, and annotate your photo.
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}
