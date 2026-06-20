import React from "react";
import { View, Text, ScrollView, Pressable, TextInput, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { cn } from "../utils/cn";
import StandardHeader from "../components/StandardHeader";
import { useTranslation } from "../utils/useTranslation";
import {
  useRejectTaskViewAdapter,
  type RejectTaskScreenProps,
} from "../ui/viewAdapters/useRejectTaskViewAdapter";

export default function RejectTaskScreen({
  onNavigateToProfile,
  onNavigateToProjectPicker,
}: RejectTaskScreenProps = {}) {
  const navigation = useNavigation<any>();
  const t = useTranslation();
  const { output, actions } = useRejectTaskViewAdapter();

  if (!output.readiness.hasUsableData) {
    return (
      <SafeAreaView edges={['bottom', 'left', 'right']} className="flex-1 bg-gray-50">
        <StatusBar style="dark" />
        
        {/* Standard Header */}
        <StandardHeader 
          title={t.taskDetail.reject}
          showBackButton={true}
          onBackPress={() => navigation.goBack()}
          onNavigateToProfile={onNavigateToProfile}
          onNavigateToProjectPicker={onNavigateToProjectPicker}
        />
        <View className="flex-1 items-center justify-center">
          <Text className="text-gray-500">Task not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['bottom', 'left', 'right']} className="flex-1 bg-gray-50">
      <StatusBar style="dark" />
      
      {/* Standard Header */}
      <StandardHeader 
        title={t.taskDetail.reject}
        showBackButton={true}
        onBackPress={() => navigation.goBack()}
        onNavigateToProfile={onNavigateToProfile}
        onNavigateToProjectPicker={onNavigateToProjectPicker}
      />

      <ScrollView className="flex-1 px-6 py-4" contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Photos Section */}
        <View className="mb-6">
          <Text className="text-xl font-semibold text-gray-900 mb-3">
            Photos (Optional)
          </Text>
          
          {output.photoAttachments.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3">
              <View className="flex-row">
                {output.photoAttachments.map((photo) => (
                  <View key={photo.id} className="mr-3 relative">
                    <Image
                      source={{ uri: photo.uri }}
                      className="w-24 h-24 rounded-lg"
                      resizeMode="cover"
                    />
                    <Pressable
                      onPress={photo.onRemove}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full items-center justify-center"
                    >
                      <Ionicons name="close" size={14} color="white" />
                    </Pressable>
                  </View>
                ))}
              </View>
            </ScrollView>
          ) : null}

          <Pressable
            onPress={() => {
              void actions.handleAddPhotos();
            }}
            className="flex-row items-center justify-center border-2 border-dashed border-gray-300 rounded-lg py-4"
          >
            <Ionicons name="camera-outline" size={24} color="#6b7280" />
            <Text className="text-gray-600 ml-2 font-medium">
              Add Photos
            </Text>
          </Pressable>
        </View>

        {/* Rejection Reason Text */}
        <View className="mb-6">
          <Text className="text-xl font-semibold text-gray-900 mb-3">
            Reason for Rejection <Text className="text-red-500">*</Text>
          </Text>
          <TextInput
            className="bg-white border border-gray-300 rounded-lg p-4 text-base min-h-[120]"
            placeholder="Please provide a reason for rejecting this task..."
            value={output.rejectForm.reason}
            onChangeText={actions.setRejectReason}
            multiline
            textAlignVertical="top"
          />
        </View>
      </ScrollView>

      {/* Fixed Bottom Bar */}
      <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3"
        style={{
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 8
        }}
      >
        <SafeAreaView edges={['bottom']}>
          <Pressable
            onPress={() => {
              void actions.handleSubmitReject();
            }}
            disabled={output.rejectForm.isSubmitting || !output.rejectForm.isValid}
            className={cn(
              "w-full rounded-xl py-3 px-4 flex-row items-center justify-center",
              (output.rejectForm.isSubmitting || !output.rejectForm.isValid)
                ? "bg-gray-300"
                : "bg-red-600"
            )}
          >
            <Ionicons 
              name="close-circle-outline" 
              size={18} 
              color="white" 
            />
            <Text className="text-white font-semibold text-base ml-2">
              {output.rejectForm.isSubmitting ? t.common.loading : t.taskDetail.reject}
            </Text>
          </Pressable>
        </SafeAreaView>
      </View>
    </SafeAreaView>
  );
}
