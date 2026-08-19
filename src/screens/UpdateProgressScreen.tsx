import React, { useCallback, useMemo, useRef } from "react";
import {
  BackHandler,
  NativeSyntheticEvent,
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  TextInputKeyPressEventData,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import ModernScreenHeader from "../components/ModernScreenHeader";
import PrimaryActionBar from "../components/ui/PrimaryActionBar";
import CompletionPercentageDialer from "../components/ui/CompletionPercentageDialer";
import FileUploadHarness from "../components/ui/FileUploadHarness";
import { useTranslation } from "../utils/useTranslation";
import { useUpdateProgressViewAdapter, UpdateProgressScreenProps } from "../ui/viewAdapters/useUpdateProgressViewAdapter";
import {
  createFormNavigationRegistry,
  getNextFocusableFieldId,
  getPreviousFocusableFieldId,
  getTabNavigationDirection,
} from "../utils/formNavigation";

export default function UpdateProgressScreen(props: UpdateProgressScreenProps) {
  const navigation = useNavigation<any>();
  const t = useTranslation();
  const { output, actions, task } = useUpdateProgressViewAdapter(props);
  const descriptionInputRef = useRef<TextInput>(null);
  const formNavigationRegistry = useMemo(
    () =>
      createFormNavigationRegistry([
        { fieldId: "description", isFocusable: true },
        { fieldId: "submit", isFocusable: true },
      ]),
    [],
  );
  const focusFormField = useCallback((fieldId: "description" | "submit" | null) => {
    if (!fieldId || fieldId === "submit") {
      descriptionInputRef.current?.blur?.();
      return;
    }

    descriptionInputRef.current?.focus?.();
  }, []);
  const moveFormFocus = useCallback(
    (activeFieldId: "description", direction: "next" | "previous" = "next") => {
      const targetFieldId =
        direction === "previous"
          ? getPreviousFocusableFieldId(formNavigationRegistry, activeFieldId)
          : getNextFocusableFieldId(formNavigationRegistry, activeFieldId);

      focusFormField((targetFieldId as "description" | "submit" | null) ?? null);
    },
    [focusFormField, formNavigationRegistry],
  );
  const handleDescriptionKeyPress = useCallback(
    (event: NativeSyntheticEvent<TextInputKeyPressEventData>) => {
      if (event.nativeEvent.key !== "Tab") {
        return;
      }

      moveFormFocus("description", getTabNavigationDirection(event));
    },
    [moveFormFocus],
  );
  const handleNavigateBack = useCallback(() => {
    if (props.onNavigateBack) {
      props.onNavigateBack();
      return;
    }
    navigation.goBack();
  }, [navigation, props.onNavigateBack]);

  useFocusEffect(
    useCallback(() => {
      if (!props.onNavigateBack) {
        return undefined;
      }

      const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
        props.onNavigateBack?.();
        return true;
      });

      return () => subscription.remove();
    }, [props.onNavigateBack]),
  );

  if (!output.readiness.hasUsableData || !task) {
    return (
      <SafeAreaView edges={['bottom', 'left', 'right']} className="flex-1 bg-gray-50">
        <StatusBar style="dark" />
        <ModernScreenHeader 
          title={t.taskDetail.progressUpdate}
          titleNode={(
            <Text testID="update-progress__screen_title" className="text-[28px] leading-8 font-semibold text-[#F8FCFF]">
              {t.taskDetail.progressUpdate}
            </Text>
          )}
          showBackButton={true}
          onBackPress={handleNavigateBack}
          onNavigateToProfile={props.onNavigateToProfile}
          onNavigateToProjectPicker={props.onNavigateToProjectPicker}
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
    <SafeAreaView edges={['left', 'right']} className="flex-1 bg-gray-50">
      <StatusBar style="dark" />
      
      <ModernScreenHeader 
        title={t.taskDetail.progressUpdate}
        titleNode={(
          <Text testID="update-progress__screen_title" className="text-[28px] leading-8 font-semibold text-[#F8FCFF]">
            {t.taskDetail.progressUpdate}
          </Text>
        )}
        showBackButton={true}
        onBackPress={handleNavigateBack}
        onNavigateToProfile={props.onNavigateToProfile}
        onNavigateToProjectPicker={props.onNavigateToProjectPicker}
      />

      <ScrollView className="flex-1 px-6 py-4" contentContainerStyle={{ paddingBottom: 100 }}>
        <FileUploadHarness
          title={t.taskDetail.photosAndFiles}
          items={validPhotos.map((photo, idx) => ({
            id: photo.id,
            uri: photo.uri,
            status: photo.isUploaded ? "uploaded" : "pending",
            onRemove: photo.onRemove,
          }))}
          onAdd={() => actions.handleAddPhotos()}
          addTestID="update-progress__take_photo"
          previewTestIDPrefix="update-progress__photo_preview_tile"
          removeTestIDPrefix="update-progress__photo_preview_remove"
        />
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

        {/* Update Description */}
        <View className="mb-6">
          <Text className="text-lg font-semibold text-slate-900 mb-3">
            {t.taskDetail.updateDescription}
          </Text>
          <View testID="update-progress__description--preview">
            <TextInput
              testID="update-progress__description"
              accessibilityLabel="Update description"
              ref={descriptionInputRef}
              className="border border-gray-300 rounded-lg px-4 py-3 text-lg text-gray-900 bg-white"
              placeholder={t.taskDetail.updateDescriptionPlaceholder}
              value={output.form.description}
              onChangeText={actions.setDescription}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              maxLength={500}
              style={{ height: 120, fontSize: 18, lineHeight: 24 }}
              returnKeyType="done"
              onKeyPress={handleDescriptionKeyPress}
              onSubmitEditing={() => {
                descriptionInputRef.current?.blur();
              }}
              blurOnSubmit={false}
            />
          </View>
        </View>

        <View className="mb-6">
          <Text className="text-lg font-semibold text-slate-900 mb-3">
            {t.taskDetail.completionPercentage}
          </Text>
          <CompletionPercentageDialer
            value={output.form.completionPercentage}
            onChange={actions.setCompletionPercentage}
            previousPercentage={output.form.previousPercentage}
          />
        </View>
      </ScrollView>

      <PrimaryActionBar
        testID="update-progress__action_bar"
        primaryTestID="update-progress__submit"
        primaryLabel={output.form.isSubmitting ? t.common.loading : t.taskDetail.submitUpdate}
        onPrimaryPress={actions.handleSubmitUpdate}
        isPrimaryDisabled={output.form.isSubmitting}
      />
    </SafeAreaView>
  );
}
