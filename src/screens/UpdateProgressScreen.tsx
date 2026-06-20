import React from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import Slider from "@react-native-community/slider";
import { cn } from "../utils/cn";
import StandardHeader from "../components/StandardHeader";
import ModernUiMarker from "../components/migration/ModernUiMarker";
import { useTranslation } from "../utils/useTranslation";
import { useUpdateProgressViewAdapter, UpdateProgressScreenProps } from "../ui/viewAdapters/useUpdateProgressViewAdapter";

export default function UpdateProgressScreen(props: UpdateProgressScreenProps) {
  const navigation = useNavigation<any>();
  const t = useTranslation();
  const { output, actions, task } = useUpdateProgressViewAdapter(props);

  if (!output.readiness.hasUsableData || !task) {
    return (
      <SafeAreaView edges={['bottom', 'left', 'right']} className="flex-1 bg-gray-50">
        <StatusBar style="dark" />
        <StandardHeader 
          title={t.taskDetail.progressUpdate}
          showBackButton={true}
          onBackPress={() => navigation.goBack()}
          onNavigateToProfile={props.onNavigateToProfile}
          onNavigateToProjectPicker={props.onNavigateToProjectPicker}
          rightElement={<ModernUiMarker />}
        />
        <View className="flex-1 items-center justify-center">
          <Text className="text-gray-500">Task not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const validPhotos = output.photos.filter(p => !p.isFailed);
  const failedPhotos = output.photos.filter(p => p.isFailed);

  return (
    <SafeAreaView edges={['bottom', 'left', 'right']} className="flex-1 bg-gray-50">
      <StatusBar style="dark" />
      
      <StandardHeader 
        title={t.taskDetail.progressUpdate}
        showBackButton={true}
        onBackPress={() => navigation.goBack()}
        onNavigateToProfile={props.onNavigateToProfile}
        onNavigateToProjectPicker={props.onNavigateToProjectPicker}
        rightElement={<ModernUiMarker />}
      />

      <ScrollView className="flex-1 px-6 py-4" contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Photos & Files - Top Section */}
        <View className="mb-6">
          <Text className="text-xl font-semibold text-gray-900 mb-3">
            {t.taskDetail.photosAndFiles}
          </Text>
          
          {validPhotos.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3">
              <View className="flex-row">
                {validPhotos.map((photo) => (
                  <View key={photo.id} className="mr-3 relative">
                    <Image
                      source={{ uri: photo.uri }}
                      className="w-24 h-24 rounded-lg"
                      resizeMode="cover"
                    />
                    <View className={cn(
                      "absolute top-1 left-1 w-6 h-6 rounded-full items-center justify-center",
                      photo.isUploaded ? "bg-green-500" : "bg-yellow-500"
                    )}>
                      <Ionicons name={photo.isUploaded ? "checkmark" : "time-outline"} size={14} color="white" />
                    </View>
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

          {/* Failed Uploads Section with Retry */}
          {failedPhotos.length > 0 && (
            <View className="mb-3">
              <View className="bg-red-50 border border-red-200 rounded-lg p-3 mb-2">
                <View className="flex-row items-center mb-2">
                  <Ionicons name="alert-circle" size={20} color="#dc2626" />
                  <Text className="text-red-800 font-semibold ml-2">
                    {failedPhotos.length} photo(s) failed to upload
                  </Text>
                </View>
                <Text className="text-red-700 text-sm">
                  Check your connection and tap retry below
                </Text>
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View className="flex-row">
                  {failedPhotos.map((failedPhoto) => (
                    <View key={failedPhoto.id} className="mr-3 w-24">
                      <View className="w-24 h-24 rounded-lg bg-red-100 border-2 border-red-300 items-center justify-center mb-2">
                        <Ionicons name="close-circle" size={40} color="#dc2626" />
                      </View>
                      <Text className="text-xs text-gray-700 mb-1" numberOfLines={1}>
                        {(failedPhoto as any).originalFileName || 'Unknown'}
                      </Text>
                      <Text className="text-xs text-red-600 mb-2" numberOfLines={2}>
                        {failedPhoto.errorMessage}
                      </Text>
                      <Pressable
                        onPress={failedPhoto.onRetry}
                        className="bg-blue-600 py-2 rounded-lg items-center"
                      >
                        <Text className="text-white text-xs font-semibold">Retry</Text>
                      </Pressable>
                      <Pressable
                        onPress={failedPhoto.onRemove}
                        className="mt-1 py-1"
                      >
                        <Text className="text-gray-500 text-xs text-center">Dismiss</Text>
                      </Pressable>
                    </View>
                  ))}
                </View>
              </ScrollView>
            </View>
          )}
          
          <Pressable
            onPress={actions.handleAddPhotos}
            className="flex-row items-center justify-between border-2 border-dashed border-gray-300 rounded-lg px-4 py-3 bg-gray-50"
          >
            <View className="flex-row items-center flex-1">
              <Ionicons name="cloud-upload-outline" size={20} color="#9ca3af" />
              <Text className="text-gray-600 font-medium ml-2 text-sm">
                {output.scalarMetrics.totalPhotos === 0 
                  ? t.taskDetail.tapToAddFiles 
                  : `${output.scalarMetrics.totalPhotos} file(s) added`}
              </Text>
            </View>
            {output.scalarMetrics.totalPhotos > 0 && (
              <Ionicons name="checkmark-circle" size={20} color="#10b981" />
            )}
          </Pressable>
        </View>

        {/* Update Description */}
        <View className="mb-6">
          <Text className="text-xl font-semibold text-gray-900 mb-3">
            {t.taskDetail.updateDescription}
          </Text>
          <TextInput
            className="border border-gray-300 rounded-lg px-4 py-3 text-gray-900 bg-white"
            placeholder={t.taskDetail.updateDescriptionPlaceholder}
            value={output.form.description}
            onChangeText={actions.setDescription}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
            maxLength={500}
            style={{ height: 120 }}
          />
        </View>

        {/* Completion Percentage - Bottom with Horizontal Slider */}
        <View className="mb-6">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-xl font-semibold text-gray-900">
              {t.taskDetail.completionPercentage}
            </Text>
            <Text className="text-3xl font-bold text-blue-600">
              {output.form.completionPercentage}%
            </Text>
          </View>
          
          {/* Current Progress Indicator */}
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-base text-gray-600">{t.taskDetail.current}: {output.form.previousPercentage}%</Text>
            <View className="flex-row items-center">
              <View className="w-3 h-3 bg-red-500 rounded-full mr-2"></View>
              <Text className="text-base text-red-600 font-medium">{t.taskDetail.previous}</Text>
            </View>
          </View>
          
          {/* Horizontal Slider */}
          <Slider
            style={{ width: '100%', height: 40 }}
            minimumValue={0}
            maximumValue={100}
            step={5}
            value={output.form.completionPercentage}
            onValueChange={actions.setCompletionPercentage}
            minimumTrackTintColor="#ffffff"
            maximumTrackTintColor="#d1d5db"
            thumbTintColor="#ffffff"
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
            onPress={actions.handleSubmitUpdate}
            disabled={output.form.isSubmitting}
            className={cn(
              "w-full rounded-xl py-3 px-4 flex-row items-center justify-center",
              output.form.isSubmitting ? "bg-gray-300" : "bg-blue-600"
            )}
          >
            <Ionicons 
              name="checkmark-circle-outline" 
              size={18} 
              color="white" 
            />
            <Text className="text-white font-semibold text-base ml-2">
              {output.form.isSubmitting ? t.common.loading : t.taskDetail.submitUpdate}
            </Text>
          </Pressable>
        </SafeAreaView>
      </View>
    </SafeAreaView>
  );
}
