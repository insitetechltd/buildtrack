import React, { useCallback, useMemo, useRef } from "react";
import {
  NativeSyntheticEvent,
  View,
  Text,
  ScrollView,
  TextInput,
  TextInputKeyPressEventData,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useNavigation } from "@react-navigation/native";
import StandardHeader from "../components/StandardHeader";
import PrimaryActionBar from "../components/ui/PrimaryActionBar";
import FileUploadHarness from "../components/ui/FileUploadHarness";
import {
  createFormNavigationRegistry,
  getNextFocusableFieldId,
  getPreviousFocusableFieldId,
  getTabNavigationDirection,
} from "../utils/formNavigation";
import {
  useAddCommentViewAdapter,
  type AddCommentScreenProps,
} from "../ui/viewAdapters/useAddCommentViewAdapter";

export default function AddCommentScreen({
  onNavigateToProfile,
  onNavigateToProjectPicker,
}: AddCommentScreenProps = {}) {
  const navigation = useNavigation<any>();
  const { output, actions } = useAddCommentViewAdapter();
  const commentInputRef = useRef<TextInput>(null);
  const formNavigationRegistry = useMemo(
    () =>
      createFormNavigationRegistry([
        { fieldId: "comment", isFocusable: true },
        { fieldId: "submit", isFocusable: true },
      ]),
    [],
  );
  const focusFormField = useCallback((fieldId: "comment" | "submit" | null) => {
    if (!fieldId || fieldId === "submit") {
      commentInputRef.current?.blur?.();
      return;
    }

    commentInputRef.current?.focus?.();
  }, []);
  const moveFormFocus = useCallback(
    (activeFieldId: "comment", direction: "next" | "previous" = "next") => {
      const targetFieldId =
        direction === "previous"
          ? getPreviousFocusableFieldId(formNavigationRegistry, activeFieldId)
          : getNextFocusableFieldId(formNavigationRegistry, activeFieldId);

      focusFormField((targetFieldId as "comment" | "submit" | null) ?? null);
    },
    [focusFormField, formNavigationRegistry],
  );
  const handleCommentKeyPress = useCallback(
    (event: NativeSyntheticEvent<TextInputKeyPressEventData>) => {
      if (event.nativeEvent.key !== "Tab") {
        return;
      }

      moveFormFocus("comment", getTabNavigationDirection(event));
    },
    [moveFormFocus],
  );

  if (!output.readiness.hasUsableData) {
    return (
      <SafeAreaView edges={['bottom', 'left', 'right']} className="flex-1 bg-gray-50">
        <StatusBar style="dark" />
        
        {/* Standard Header */}
        <StandardHeader 
          title="Add Comment"
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
        title="Add Comment"
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

        {/* Comment Text */}
        <View className="mb-6">
          <Text className="text-xl font-semibold text-gray-900 mb-3">
            Comment <Text className="text-red-500">*</Text>
          </Text>
          <TextInput
            ref={commentInputRef}
            className="bg-white border border-gray-300 rounded-lg p-4 text-base min-h-[120]"
            placeholder="Add your comment here..."
            value={output.commentForm.description}
            onChangeText={actions.setCommentDescription}
            multiline
            textAlignVertical="top"
            returnKeyType="done"
            onKeyPress={handleCommentKeyPress}
            onSubmitEditing={() => {
              commentInputRef.current?.blur();
            }}
            blurOnSubmit={false}
          />
        </View>
      </ScrollView>

      <PrimaryActionBar
        primaryLabel={output.commentForm.isSubmitting ? "Submitting..." : "Add Comment"}
        onPrimaryPress={() => {
          void actions.handleSubmitComment();
        }}
        isPrimaryDisabled={output.commentForm.isSubmitting || !output.commentForm.isValid}
      />
    </SafeAreaView>
  );
}
