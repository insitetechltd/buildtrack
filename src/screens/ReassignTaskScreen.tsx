import React, { useCallback, useMemo, useRef } from "react";
import {
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
import { useNavigation } from "@react-navigation/native";
import { cn } from "../utils/cn";
import StandardHeader from "../components/StandardHeader";
import {
  createFormNavigationRegistry,
  getNextFocusableFieldId,
  getPreviousFocusableFieldId,
  getTabNavigationDirection,
} from "../utils/formNavigation";
import {
  useReassignTaskViewAdapter,
  type ReassignTaskScreenProps,
} from "../ui/viewAdapters/useReassignTaskViewAdapter";

export default function ReassignTaskScreen({
  onNavigateToProfile,
  onNavigateToProjectPicker,
}: ReassignTaskScreenProps = {}) {
  const navigation = useNavigation<any>();
  const { output, actions } = useReassignTaskViewAdapter();
  const searchInputRef = useRef<TextInput>(null);
  const formNavigationRegistry = useMemo(
    () =>
      createFormNavigationRegistry([
        { fieldId: "search", isFocusable: true },
        { fieldId: "submit", isFocusable: true },
      ]),
    [],
  );
  const focusFormField = useCallback((fieldId: "search" | "submit" | null) => {
    if (!fieldId || fieldId === "submit") {
      searchInputRef.current?.blur?.();
      return;
    }

    searchInputRef.current?.focus?.();
  }, []);
  const moveFormFocus = useCallback(
    (activeFieldId: "search", direction: "next" | "previous" = "next") => {
      const targetFieldId =
        direction === "previous"
          ? getPreviousFocusableFieldId(formNavigationRegistry, activeFieldId)
          : getNextFocusableFieldId(formNavigationRegistry, activeFieldId);

      focusFormField((targetFieldId as "search" | "submit" | null) ?? null);
    },
    [focusFormField, formNavigationRegistry],
  );
  const handleSearchKeyPress = useCallback(
    (event: NativeSyntheticEvent<TextInputKeyPressEventData>) => {
      if (event.nativeEvent.key !== "Tab") {
        return;
      }

      moveFormFocus("search", getTabNavigationDirection(event));
    },
    [moveFormFocus],
  );

  if (!output.readiness.hasUsableData) {
    return (
      <SafeAreaView edges={['bottom', 'left', 'right']} className="flex-1 bg-gray-50">
        <StatusBar style="dark" />
        
        {/* Standard Header */}
        <StandardHeader 
          title="Reassign Task"
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
        title="Reassign Task"
        showBackButton={true}
        onBackPress={() => navigation.goBack()}
        onNavigateToProfile={onNavigateToProfile}
        onNavigateToProjectPicker={onNavigateToProjectPicker}
      />

      {/* Search */}
      <View className="px-6 pt-4 pb-3">
        <View className="flex-row items-center bg-white border border-gray-300 rounded-lg px-4 py-3">
          <Ionicons name="search" size={20} color="#6b7280" />
          <TextInput
            ref={searchInputRef}
            className="flex-1 ml-2 text-lg"
            placeholder="Search users..."
            value={output.searchQuery}
            onChangeText={actions.setSearchQuery}
            returnKeyType="done"
            onKeyPress={handleSearchKeyPress}
            onSubmitEditing={() => {
              searchInputRef.current?.blur();
            }}
          />
        </View>
      </View>

      {/* User List */}
      <ScrollView className="flex-1 px-6 py-4" contentContainerStyle={{ paddingBottom: 100 }}>
        <Text className="text-sm text-gray-600 mb-2">
          Select user(s) to reassign this task to:
        </Text>
        
        {output.assigneeItems.map((assigneeItem) => {
          return (
            <Pressable
              key={assigneeItem.userId}
              testID={`reassign-task-user-${assigneeItem.userId}`}
              onPress={() => actions.toggleUserSelection(assigneeItem.userId)}
              className={cn(
                "flex-row items-center py-2.5 px-3 rounded-lg border mb-2",
                assigneeItem.isSelected ? "bg-blue-50 border-blue-300" : "bg-white border-gray-200"
              )}
            >
              <View className={cn(
                "w-5 h-5 rounded border-2 items-center justify-center mr-2.5",
                assigneeItem.isSelected ? "bg-blue-600 border-blue-600" : "bg-white border-gray-300"
              )}>
                {assigneeItem.isSelected && <Ionicons name="checkmark" size={12} color="white" />}
              </View>
              <View className="flex-1">
                <Text className="text-base font-semibold text-gray-900">
                  {assigneeItem.name}
                </Text>
                <View className="flex-row items-center mt-0.5">
                  <Text className="text-sm text-gray-500 capitalize">
                    {assigneeItem.roleLabel}
                  </Text>
                  {assigneeItem.email && (
                    <>
                      <Text className="text-sm text-gray-400 mx-1">•</Text>
                      <Text className="text-sm text-gray-400" numberOfLines={1}>
                        {assigneeItem.email}
                      </Text>
                    </>
                  )}
                </View>
              </View>
              
              {/* Favorite Star */}
              <Pressable
                onPress={(e) => {
                  e.stopPropagation();
                  actions.toggleFavoriteUser(assigneeItem.userId);
                }}
                className="p-1.5"
              >
                <Ionicons 
                  name={assigneeItem.isFavorite ? "star" : "star-outline"} 
                  size={20} 
                  color={assigneeItem.isFavorite ? "#fbbf24" : "#9ca3af"} 
                />
              </Pressable>
            </Pressable>
          );
        })}
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
              void actions.handleReassign();
            }}
            disabled={output.selectedUserIds.length === 0}
            className={cn(
              "px-4 py-3 rounded-xl flex-row items-center justify-center w-full",
              output.selectedUserIds.length === 0 ? "bg-gray-300" : "bg-blue-600"
            )}
          >
            <Ionicons 
              name="people-outline" 
              size={18} 
              color="white" 
            />
            <Text className="text-white font-semibold text-base ml-2">
              Reassign ({output.selectedUserIds.length})
            </Text>
          </Pressable>
        </SafeAreaView>
      </View>
    </SafeAreaView>
  );
}
