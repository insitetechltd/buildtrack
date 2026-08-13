import React, { useCallback, useMemo, useRef } from "react";
import {
  NativeSyntheticEvent,
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  TextInputKeyPressEventData,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import StandardHeader from "../components/StandardHeader";
import PrimaryActionBar from "../components/ui/PrimaryActionBar";
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
