import React, { useCallback, useMemo, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  NativeSyntheticEvent,
  TextInputKeyPressEventData,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useNavigation } from "@react-navigation/native";
import StandardHeader from "../components/StandardHeader";
import PrimaryActionBar from "../components/ui/PrimaryActionBar";
import FileUploadHarness from "../components/ui/FileUploadHarness";
import { useTranslation } from "../utils/useTranslation";
import {
  createFormNavigationRegistry,
  getNextFocusableFieldId,
  getPreviousFocusableFieldId,
  getTabNavigationDirection,
} from "../utils/formNavigation";
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
  const rejectReasonInputRef = useRef<TextInput>(null);
  const formNavigationRegistry = useMemo(
    () =>
      createFormNavigationRegistry([
        { fieldId: "reason", isFocusable: true },
        { fieldId: "submit", isFocusable: true },
      ]),
    [],
  );
  const focusFormField = useCallback((fieldId: "reason" | "submit" | null) => {
    if (!fieldId || fieldId === "submit") {
      rejectReasonInputRef.current?.blur?.();
      return;
    }

    rejectReasonInputRef.current?.focus?.();
  }, []);
  const moveFormFocus = useCallback(
    (activeFieldId: "reason", direction: "next" | "previous" = "next") => {
      const targetFieldId =
        direction === "previous"
          ? getPreviousFocusableFieldId(formNavigationRegistry, activeFieldId)
          : getNextFocusableFieldId(formNavigationRegistry, activeFieldId);

      focusFormField((targetFieldId as "reason" | "submit" | null) ?? null);
    },
    [focusFormField, formNavigationRegistry],
  );
  const handleReasonKeyPress = useCallback(
    (event: NativeSyntheticEvent<TextInputKeyPressEventData>) => {
      if (event.nativeEvent.key !== "Tab") {
        return;
      }

      moveFormFocus("reason", getTabNavigationDirection(event));
    },
    [moveFormFocus],
  );

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
    <SafeAreaView edges={['left', 'right']} className="flex-1 bg-gray-50">
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
        <FileUploadHarness
          title="Photos (Optional)"
          items={output.photoAttachments.map((photo) => ({
            id: photo.id,
            uri: photo.uri,
            onRemove: photo.onRemove,
          }))}
          onAdd={() => {
            void actions.handleAddPhotos();
          }}
        />

        {/* Rejection Reason Text */}
        <View className="mb-6">
          <Text className="text-xl font-semibold text-gray-900 mb-3">
            Reason for Rejection <Text className="text-red-500">*</Text>
          </Text>
          <TextInput
            ref={rejectReasonInputRef}
            className="bg-white border border-gray-300 rounded-lg p-4 text-base min-h-[120]"
            placeholder="Please provide a reason for rejecting this task..."
            value={output.rejectForm.reason}
            onChangeText={actions.setRejectReason}
            multiline
            textAlignVertical="top"
            returnKeyType="done"
            onKeyPress={handleReasonKeyPress}
            onSubmitEditing={() => {
              rejectReasonInputRef.current?.blur();
            }}
            blurOnSubmit={false}
          />
        </View>
      </ScrollView>

      <PrimaryActionBar
        primaryLabel={output.rejectForm.isSubmitting ? t.common.loading : t.taskDetail.reject}
        onPrimaryPress={() => {
          void actions.handleSubmitReject();
        }}
        isPrimaryDisabled={output.rejectForm.isSubmitting || !output.rejectForm.isValid}
        destructive
      />
    </SafeAreaView>
  );
}
