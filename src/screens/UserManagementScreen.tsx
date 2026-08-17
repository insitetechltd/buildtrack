import React, { useCallback, useMemo, useRef } from "react";
import {
  FlatList,
  Modal,
  NativeSyntheticEvent,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  Text,
  TextInput,
  TextInputKeyPressEventData,
  View,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";

import ModalHandle from "../components/ModalHandle";
import ModernScreenHeader from "../components/ModernScreenHeader";
import BrandHeaderTitle from "../components/BrandHeaderTitle";
import type {
  UserManagementProjectRoleOption,
  UserManagementUserCard,
} from "../ui/contracts/viewAdapters";
import {
  useUserManagementViewAdapter,
  type UserManagementViewAdapterProps,
} from "../ui/viewAdapters/useUserManagementViewAdapter";
import { cn } from "../utils/cn";
import {
  createFormNavigationRegistry,
  getNextFocusableFieldId,
  getPreviousFocusableFieldId,
  getTabNavigationDirection,
} from "../utils/formNavigation";

type UserManagementScreenProps = UserManagementViewAdapterProps;

function getProjectRoleClasses(role: UserManagementProjectRoleOption["role"]) {
  const colors = {
    lead_project_manager: {
      container: "bg-purple-50 border-purple-200",
      text: "text-purple-600",
    },
    contractor: {
      container: "bg-blue-50 border-blue-200",
      text: "text-blue-600",
    },
    subcontractor: {
      container: "bg-green-50 border-green-200",
      text: "text-green-600",
    },
    inspector: {
      container: "bg-red-50 border-red-200",
      text: "text-red-600",
    },
    architect: {
      container: "bg-indigo-50 border-indigo-200",
      text: "text-indigo-600",
    },
    engineer: {
      container: "bg-orange-50 border-orange-200",
      text: "text-orange-600",
    },
    worker: {
      container: "bg-gray-50 border-gray-200",
      text: "text-gray-600",
    },
    foreman: {
      container: "bg-yellow-50 border-yellow-200",
      text: "text-yellow-600",
    },
  } as const;

  return colors[role] || colors.worker;
}

function UserCard({
  card,
  isCopyingInvite,
  onAssign,
  onApprove,
  onReject,
  onRemoveAssignment,
  onCopyInviteLink,
}: {
  card: UserManagementUserCard;
  isCopyingInvite: boolean;
  onAssign: (userId: string) => void;
  onApprove: (userId: string) => void;
  onReject: (userId: string) => void;
  onRemoveAssignment: (userId: string, projectId: string) => void;
  onCopyInviteLink: (userId: string) => void;
}) {
  return (
    <View className="bg-white border border-gray-200 rounded-xl p-4 mb-3">
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-1">
          <View className="flex-row items-center gap-2">
            <View className="flex-row items-center gap-1">
              <Text className="font-semibold text-gray-900 text-lg">{card.name}</Text>
              {card.isAdmin ? <Ionicons name="star" size={16} color="#7c3aed" /> : null}
            </View>
            {card.isAdmin ? (
              <View className="bg-purple-100 px-2 py-1 rounded">
                <Text className="text-purple-700 text-sm font-bold">ADMIN</Text>
              </View>
            ) : null}
            {card.isPending ? (
              <View className="bg-orange-100 px-2 py-1 rounded flex-row items-center">
                <Ionicons name="time-outline" size={12} color="#ea580c" />
                <Text className="text-orange-700 text-sm font-bold ml-1">Pending</Text>
              </View>
            ) : null}
            {card.isProtected ? (
              <View className="bg-amber-100 px-2 py-1 rounded flex-row items-center">
                <Ionicons name="shield-checkmark" size={12} color="#d97706" />
                <Text className="text-amber-700 text-sm font-bold ml-1">Protected</Text>
              </View>
            ) : null}
          </View>
          {card.email ? <Text className="text-base text-gray-600">{card.email}</Text> : null}
          <View className="flex-row items-center mt-1">
            <Ionicons name="person-outline" size={14} color="#6b7280" />
            <Text className="text-sm text-gray-500 ml-1">
              {card.systemRoleLabel} • {card.positionLabel}
            </Text>
          </View>
        </View>

        {card.isPending ? (
          <View className="flex-row gap-2">
            <Pressable
              testID={card.primaryAction.testId}
              onPress={() => onApprove(card.userId)}
              className="px-3 py-2 bg-green-600 rounded-lg"
            >
              <Text className="text-white text-sm font-medium">{card.primaryAction.label}</Text>
            </Pressable>
            {card.secondaryAction ? (
              <Pressable
                testID={card.secondaryAction.testId}
                onPress={() => onReject(card.userId)}
                className="px-3 py-2 bg-red-600 rounded-lg"
              >
                <Text className="text-white text-sm font-medium">{card.secondaryAction.label}</Text>
              </Pressable>
            ) : null}
          </View>
        ) : (
          <Pressable
            testID={card.primaryAction.testId}
            onPress={() => onAssign(card.userId)}
            className="px-3 py-2 bg-blue-600 rounded-lg"
          >
            <Text className="text-white text-sm font-medium">{card.primaryAction.label}</Text>
          </Pressable>
        )}
      </View>

      {!card.isPending ? (
        <>
          {card.assignmentRows.length > 0 ? (
            <View>
              <Text className="text-base font-medium text-gray-700 mb-2">
                Project Assignments ({card.assignmentRows.length})
              </Text>
              <View className="space-y-2">
                {card.assignmentRows.map((assignment) => {
                  const classes = getProjectRoleClasses(assignment.projectRole);

                  return (
                    <View
                      key={assignment.id}
                      className="flex-row items-center justify-between bg-gray-50 rounded-lg p-2"
                    >
                      <View className="flex-1">
                        <Text className="text-base font-medium text-gray-900">
                          {assignment.projectName}
                        </Text>
                        <View
                          className={cn(
                            "inline-flex px-2 py-1 rounded border mt-1",
                            classes.container,
                          )}
                        >
                          <Text className={cn("text-sm font-medium", classes.text)}>
                            {assignment.projectRoleLabel}
                          </Text>
                        </View>
                      </View>

                      {assignment.canRemove ? (
                        <Pressable
                          testID={assignment.removeTestId}
                          onPress={() => onRemoveAssignment(card.userId, assignment.projectId)}
                          className="ml-2 p-1"
                        >
                          <Ionicons name="close-circle" size={20} color="#ef4444" />
                        </Pressable>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            </View>
          ) : (
            <View className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <Text className="text-yellow-800 text-base">Not assigned to any projects</Text>
            </View>
          )}
        </>
      ) : null}

      {card.pendingMessage ? (
        <View className="bg-orange-50 border border-orange-200 rounded-lg p-3">
          <View className="flex-row items-center">
            <Ionicons name="time-outline" size={16} color="#ea580c" />
            <Text className="text-orange-800 text-base ml-2">{card.pendingMessage}</Text>
          </View>
        </View>
      ) : null}

      {card.canCopyInviteLink ? (
        <Pressable
          testID={`user-management__copy-invite-${card.userId}`}
          disabled={isCopyingInvite}
          onPress={() => onCopyInviteLink(card.userId)}
          className={`mt-3 flex-row items-center justify-center rounded-lg py-3 ${
            isCopyingInvite ? "bg-[#9BB9C2]" : "bg-[#08576E]"
          }`}
        >
          <Ionicons name="copy-outline" size={16} color="#ffffff" />
          <Text className="text-white text-sm font-semibold ml-2">
            {isCopyingInvite ? "Copying…" : "Copy invite link"}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export default function UserManagementScreen(props: UserManagementScreenProps) {
  const { onNavigateBack } = props;
  const { output, actions } = useUserManagementViewAdapter(props);
  const searchInputRef = useRef<TextInput>(null);
  const selectedRoleClasses = getProjectRoleClasses(output.selectedProjectRole);
  const ModalComponent = Modal || View;
  const RefreshControlComponent = RefreshControl;
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
  const renderUserCard = React.useCallback(
    ({ item }: { item: UserManagementUserCard }) => (
      <UserCard
        card={item}
        isCopyingInvite={output.copyingInviteUserId === item.userId}
        onAssign={actions.requestAssignUser}
        onApprove={actions.requestApproveUser}
        onReject={actions.requestRejectUser}
        onRemoveAssignment={actions.requestRemoveAssignment}
        onCopyInviteLink={actions.copyInviteLink}
      />
    ),
    [
      actions.copyInviteLink,
      actions.requestApproveUser,
      actions.requestAssignUser,
      actions.requestRejectUser,
      actions.requestRemoveAssignment,
      output.copyingInviteUserId,
    ]
  );

  if (!output.readiness.hasUsableData) {
    return null;
  }

  if (!output.access.isAllowed) {
    return (
      <SafeAreaView edges={["bottom", "left", "right"]} className="flex-1 bg-[#E7F4F8]">
        <StatusBar style="light" />
        <ModernScreenHeader
          title="User Management"
          titleNode={<BrandHeaderTitle label="User Management" subtitle="Admin" />}
          showBackButton={true}
          onBackPress={onNavigateBack}
          className="border-b-0 bg-[#08576E] pb-2"
        />
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-gray-500 text-center">
            {output.access.deniedMessage || "Access denied."}
          </Text>
          <Pressable
            onPress={onNavigateBack}
            className="mt-4 px-4 py-2 bg-blue-600 rounded-lg"
          >
            <Text className="text-white">Go Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["bottom", "left", "right"]} className="flex-1 bg-[#E7F4F8]">
      <StatusBar style="light" />

      <ModernScreenHeader
        title="User Management"
        titleNode={<BrandHeaderTitle label="User Management" subtitle="Admin" />}
        showBackButton={true}
        onBackPress={onNavigateBack}
        className="border-b-0 bg-[#08576E] pb-2"
        onProfilePress={actions.toggleProfileMenu}
        rightElement={
          <Pressable onPress={actions.toggleProfileMenu} className="flex-row items-center">
            <View className="mr-2">
              <Text className="text-base font-semibold text-right text-[#F8FCFF]">
                {output.profileMenu.displayName}
              </Text>
              <Text className="text-sm text-[#B9D9E4] text-right capitalize">
                {output.profileMenu.roleLabel}
              </Text>
            </View>
          </Pressable>
        }
      />

      <View className="bg-white border-b border-gray-200 px-6 py-4">
        {output.companyScope.companyName ? (
          <View className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
            <View className="flex-row items-center">
              <Ionicons name="business" size={16} color="#3b82f6" />
              <Text className="text-blue-900 font-medium ml-2 flex-1">
                {output.companyScope.companyName}
              </Text>
            </View>
            {output.companyScope.subtitle ? (
              <Text className="text-blue-700 text-sm mt-1">{output.companyScope.subtitle}</Text>
            ) : null}
          </View>
        ) : null}

        <View className="flex-row items-center mb-4 gap-2">
          <View className="flex-1 flex-row items-center bg-gray-100 rounded-lg px-3 py-2">
            <Ionicons name="search-outline" size={20} color="#6b7280" />
            <TextInput
              ref={searchInputRef}
              className="flex-1 ml-2 text-gray-900"
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
          <Pressable
            onPress={actions.openInviteModal}
            className="bg-green-600 rounded-lg px-4 py-2 flex-row items-center"
          >
            <Ionicons name="mail" size={18} color="white" />
            <Text className="text-white font-medium ml-1">Invite</Text>
          </Pressable>
        </View>

        <Text className="text-base text-gray-600">{output.userCountLabel}</Text>
      </View>

      <FlatList
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingVertical: 16,
          flexGrow: 1,
        }}
        refreshControl={
          RefreshControlComponent ? (
            <RefreshControlComponent
              refreshing={output.refreshState.isRefreshing}
              onRefresh={() => void actions.handleRefresh()}
            />
          ) : undefined
        }
        data={output.userCards}
        keyExtractor={(card) => card.id}
        renderItem={renderUserCard}
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center py-12">
            <View className="w-20 h-20 bg-gray-100 rounded-full items-center justify-center mb-4">
              <Ionicons name="people-outline" size={40} color="#9ca3af" />
            </View>
            <Text className="text-xl font-semibold text-gray-900 mb-2">
              {output.emptyState.title}
            </Text>
            <Text className="text-base text-gray-600 text-center px-8 mb-6">
              {output.emptyState.message}
            </Text>
            {output.emptyState.showInviteAction ? (
              <Pressable
                onPress={actions.openInviteModal}
                className="bg-blue-600 rounded-lg px-6 py-3"
              >
                <Text className="text-white font-medium">Invite Users</Text>
              </Pressable>
            ) : null}
          </View>
        }
        ListFooterComponent={<View className="h-24" />}
      />

      <ModalComponent
        visible={output.activeModal === "assign"}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView edges={["bottom", "left", "right"]} className="flex-1 bg-[#E7F4F8]">
          <ModalHandle />

          <View className="flex-row items-center bg-white border-b border-gray-200 px-6 py-4">
            <Pressable onPress={actions.closeAssignmentFlow} className="mr-4">
              <Text className="text-blue-600 font-medium">Cancel</Text>
            </Pressable>
            <Text className="text-xl font-semibold text-gray-900 flex-1">
              Assign User to Project
            </Text>
            <Pressable
              onPress={() => void actions.saveAssignment()}
              disabled={!output.selectedUserSummary || !output.selectedProjectId}
              className={cn(
                "px-4 py-2 rounded-lg",
                !output.selectedUserSummary || !output.selectedProjectId
                  ? "bg-gray-300"
                  : "bg-blue-600",
              )}
            >
              <Text className="text-white font-medium">Assign</Text>
            </Pressable>
          </View>

          <ScrollView className="flex-1 px-6 py-4" keyboardShouldPersistTaps="handled">
            {output.selectedUserSummary ? (
              <View className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
                <Text className="text-xl font-semibold text-gray-900 mb-2">Selected User</Text>
                <Text className="text-lg font-medium text-gray-900">
                  {output.selectedUserSummary.name}
                </Text>
                <Text className="text-base text-gray-600">
                  {output.selectedUserSummary.email || "No email"} • {output.selectedUserSummary.roleLabel}
                </Text>
              </View>
            ) : null}

            <View className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
              <Text className="text-xl font-semibold text-gray-900 mb-4">Select Project</Text>
              <Pressable
                onPress={actions.openProjectPicker}
                className="border border-gray-300 rounded-lg bg-gray-50 p-4"
              >
                <View className="flex-row items-center justify-between">
                  <Text className={output.selectedProjectName ? "text-gray-900" : "text-gray-500"}>
                    {output.selectedProjectName || "Select a project..."}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color="#6b7280" />
                </View>
              </Pressable>
            </View>

            <View className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
              <Text className="text-xl font-semibold text-gray-900 mb-4">Select Category</Text>
              <Pressable
                onPress={actions.openProjectRolePicker}
                className="border border-gray-300 rounded-lg bg-gray-50 p-4"
              >
                <View className="flex-row items-center justify-between">
                  <Text className="text-gray-900">
                    {output.projectRoleOptions.find(
                      (option) => option.role === output.selectedProjectRole,
                    )?.label || "Worker"}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color="#6b7280" />
                </View>
              </Pressable>

              <View
                className={cn(
                  "mt-3 p-3 rounded-lg border",
                  selectedRoleClasses.container,
                )}
              >
                <Text className={cn("text-base font-medium", selectedRoleClasses.text)}>
                  Preview:{" "}
                  {output.projectRoleOptions.find(
                    (option) => option.role === output.selectedProjectRole,
                  )?.label || "Worker"}
                </Text>
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </ModalComponent>

      <ModalComponent
        visible={output.activeModal === "project"}
        animationType="slide"
        presentationStyle="formSheet"
      >
        <SafeAreaView edges={["bottom", "left", "right"]} className="flex-1 bg-[#E7F4F8]">
          <ModalHandle />

          <View className="flex-row items-center bg-white border-b border-gray-200 px-6 py-4">
            <Pressable onPress={actions.returnToAssignmentModal} className="mr-4">
              <Text className="text-blue-600 font-medium">Done</Text>
            </Pressable>
            <Text className="text-xl font-semibold text-gray-900 flex-1">Select Project</Text>
          </View>

          <ScrollView className="flex-1">
            {output.availableProjects.length === 0 ? (
              <View className="p-6">
                <Text className="text-center text-gray-500">No projects available</Text>
              </View>
            ) : (
              output.availableProjects.map((project) => (
                <Pressable
                  key={project.id}
                  onPress={() => actions.selectProject(project.projectId)}
                  className={cn(
                    "flex-row items-center justify-between px-6 py-4 border-b border-gray-200",
                    project.isSelected ? "bg-blue-50" : "bg-white",
                  )}
                >
                  <Text
                    className={cn(
                      "text-lg",
                      project.isSelected ? "text-blue-600 font-semibold" : "text-gray-900",
                    )}
                  >
                    {project.projectName}
                  </Text>
                  {project.isSelected ? <Ionicons name="checkmark" size={24} color="#3b82f6" /> : null}
                </Pressable>
              ))
            )}
          </ScrollView>
        </SafeAreaView>
      </ModalComponent>

      <ModalComponent
        visible={output.activeModal === "category"}
        animationType="slide"
        presentationStyle="formSheet"
      >
        <SafeAreaView edges={["bottom", "left", "right"]} className="flex-1 bg-[#E7F4F8]">
          <ModalHandle />

          <View className="flex-row items-center bg-white border-b border-gray-200 px-6 py-4">
            <Pressable onPress={actions.returnToAssignmentModal} className="mr-4">
              <Text className="text-blue-600 font-medium">Done</Text>
            </Pressable>
            <Text className="text-xl font-semibold text-gray-900 flex-1">
              Select Project Role
            </Text>
          </View>

          <ScrollView className="flex-1">
            {output.projectRoleOptions.map((option) => {
              const classes = getProjectRoleClasses(option.role);

              return (
                <Pressable
                  key={option.id}
                  onPress={() => actions.selectProjectRole(option.role)}
                  className={cn(
                    "px-6 py-4 border-b border-gray-200",
                    option.isSelected ? "bg-blue-50" : "bg-white",
                  )}
                >
                  <View className="flex-row items-center justify-between">
                    <View>
                      <Text
                        className={cn(
                          "text-lg",
                          option.isSelected ? "text-blue-600 font-semibold" : "text-gray-900",
                        )}
                      >
                        {option.label}
                      </Text>
                      <View
                        className={cn(
                          "inline-flex px-2 py-1 rounded border mt-2",
                          classes.container,
                        )}
                      >
                        <Text className={cn("text-sm font-medium", classes.text)}>
                          {option.label}
                        </Text>
                      </View>
                    </View>
                    {option.isSelected ? <Ionicons name="checkmark" size={24} color="#3b82f6" /> : null}
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        </SafeAreaView>
      </ModalComponent>

      <ModalComponent visible={output.activeModal === "success"} transparent animationType="fade">
        <View className="flex-1 bg-black/50 items-center justify-center p-6">
          <View className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <View className="items-center mb-4">
              <View className="w-16 h-16 bg-green-100 rounded-full items-center justify-center mb-3">
                <Ionicons name="checkmark-circle" size={40} color="#10b981" />
              </View>
              <Text className="text-2xl font-bold text-gray-900 mb-2">Success!</Text>
              <Text className="text-center text-gray-600">{output.successMessage}</Text>
            </View>
            <Pressable
              onPress={actions.closeActiveModal}
              className="bg-blue-600 rounded-lg py-3 items-center"
            >
              <Text className="text-white font-semibold">OK</Text>
            </Pressable>
          </View>
        </View>
      </ModalComponent>

      <ModalComponent visible={output.activeModal === "removeConfirm"} transparent animationType="fade">
        <View className="flex-1 bg-black/50 items-center justify-center p-6">
          <View className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <View className="items-center mb-4">
              <View className="w-16 h-16 bg-red-100 rounded-full items-center justify-center mb-3">
                <Ionicons name="warning" size={40} color="#ef4444" />
              </View>
              <Text className="text-2xl font-bold text-gray-900 mb-2">Remove Assignment</Text>
              <Text className="text-center text-gray-600">
                Remove {output.pendingRemoval?.userName} from {output.pendingRemoval?.projectName}?
              </Text>
            </View>
            <View className="flex-row gap-3">
              <Pressable
                onPress={actions.closeActiveModal}
                className="flex-1 bg-gray-200 rounded-lg py-3 items-center"
              >
                <Text className="text-gray-900 font-semibold">Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => void actions.confirmRemoveAssignment()}
                className="flex-1 bg-red-600 rounded-lg py-3 items-center"
              >
                <Text className="text-white font-semibold">Remove</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </ModalComponent>

      <ModalComponent visible={output.activeModal === "approveConfirm"} transparent animationType="fade">
        <View className="flex-1 bg-black/50 items-center justify-center p-6">
          <View className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <View className="items-center mb-4">
              <View className="w-16 h-16 bg-green-100 rounded-full items-center justify-center mb-3">
                <Ionicons name="checkmark-circle" size={40} color="#10b981" />
              </View>
              <Text className="text-2xl font-bold text-gray-900 mb-2">Approve User</Text>
              <Text className="text-center text-gray-600">
                Approve {output.pendingApprovalUser?.name} to join your company? They will be able
                to log in and access the app.
              </Text>
            </View>
            <View className="flex-row gap-3">
              <Pressable
                onPress={actions.closeActiveModal}
                className="flex-1 bg-gray-200 rounded-lg py-3 items-center"
              >
                <Text className="text-gray-900 font-semibold">Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => void actions.confirmApproveUser()}
                className="flex-1 bg-green-600 rounded-lg py-3 items-center"
              >
                <Text className="text-white font-semibold">Approve</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </ModalComponent>

      <ModalComponent visible={output.activeModal === "rejectConfirm"} transparent animationType="fade">
        <View className="flex-1 bg-black/50 items-center justify-center p-6">
          <View className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <View className="items-center mb-4">
              <View className="w-16 h-16 bg-red-100 rounded-full items-center justify-center mb-3">
                <Ionicons name="close-circle" size={40} color="#ef4444" />
              </View>
              <Text className="text-2xl font-bold text-gray-900 mb-2">Reject User</Text>
              <Text className="text-center text-gray-600">
                Reject {output.pendingApprovalUser?.name}? This will permanently delete their account
                from the system.
              </Text>
            </View>
            <View className="flex-row gap-3">
              <Pressable
                onPress={actions.closeActiveModal}
                className="flex-1 bg-gray-200 rounded-lg py-3 items-center"
              >
                <Text className="text-gray-900 font-semibold">Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => void actions.confirmRejectUser()}
                className="flex-1 bg-red-600 rounded-lg py-3 items-center"
              >
                <Text className="text-white font-semibold">Reject</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </ModalComponent>

      <ModalComponent
        visible={output.activeModal === "invite"}
        transparent
        animationType="fade"
        onRequestClose={actions.closeActiveModal}
      >
        <View className="flex-1 bg-black/50 items-center justify-center p-6">
          <View className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <Text className="text-2xl font-bold text-gray-900 mb-2" testID="invite-modal-title">
              Invite team member
            </Text>
            <Text className="text-gray-600 mb-4">
              Creates a shareable link. They download Taskr if needed, then open the link to sign in
              the first time — no password.
            </Text>

            <Text className="text-sm font-medium text-gray-700 mb-1">Name</Text>
            <TextInput
              testID="invite-name"
              value={output.inviteForm.name}
              onChangeText={actions.setInviteName}
              placeholder="Full name"
              className="border border-gray-300 rounded-lg px-3 py-3 mb-3 text-base text-gray-900"
              autoCapitalize="words"
              editable={!output.inviteForm.isSubmitting}
            />

            <Text className="text-sm font-medium text-gray-700 mb-1">Email</Text>
            <TextInput
              testID="invite-email"
              value={output.inviteForm.email}
              onChangeText={actions.setInviteEmail}
              placeholder="name@company.com"
              className="border border-gray-300 rounded-lg px-3 py-3 mb-3 text-base text-gray-900"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!output.inviteForm.isSubmitting}
            />

            <Text className="text-sm font-medium text-gray-700 mb-2">Seat</Text>
            <View className="flex-row mb-4">
              <Pressable
                testID="invite-seat-worker"
                onPress={() => actions.setInviteSeatType("worker")}
                className={`flex-1 py-3 rounded-lg mr-2 items-center ${
                  output.inviteForm.seatType === "worker" ? "bg-blue-600" : "bg-gray-100"
                }`}
              >
                <Text
                  className={
                    output.inviteForm.seatType === "worker"
                      ? "text-white font-semibold"
                      : "text-gray-700 font-medium"
                  }
                >
                  Worker
                </Text>
              </Pressable>
              <Pressable
                testID="invite-seat-pm"
                onPress={() => actions.setInviteSeatType("pm")}
                className={`flex-1 py-3 rounded-lg items-center ${
                  output.inviteForm.seatType === "pm" ? "bg-blue-600" : "bg-gray-100"
                }`}
              >
                <Text
                  className={
                    output.inviteForm.seatType === "pm"
                      ? "text-white font-semibold"
                      : "text-gray-700 font-medium"
                  }
                >
                  PM
                </Text>
              </Pressable>
            </View>

            {output.inviteForm.error ? (
              <Text className="text-red-600 mb-3" testID="invite-error">
                {output.inviteForm.error}
              </Text>
            ) : null}

            <View className="flex-row">
              <Pressable
                onPress={actions.closeActiveModal}
                className="flex-1 bg-gray-100 rounded-lg py-3 items-center mr-2"
                disabled={output.inviteForm.isSubmitting}
              >
                <Text className="text-gray-800 font-semibold">Cancel</Text>
              </Pressable>
              <Pressable
                testID="invite-submit"
                onPress={() => void actions.submitInvite()}
                className={`flex-1 bg-blue-600 rounded-lg py-3 items-center ${
                  output.inviteForm.isSubmitting ? "opacity-50" : ""
                }`}
                disabled={output.inviteForm.isSubmitting}
              >
                <Text className="text-white font-semibold">
                  {output.inviteForm.isSubmitting ? "Creating…" : "Create invite"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </ModalComponent>

      <ModalComponent
        visible={output.activeModal === "inviteResult"}
        transparent
        animationType="fade"
        onRequestClose={actions.closeActiveModal}
      >
        <View className="flex-1 bg-black/50 items-center justify-center p-6">
          <View className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <Text className="text-2xl font-bold text-gray-900 mb-2" testID="invite-result-title">
              Share this sign-in link
            </Text>
            <Text className="text-gray-600 mb-4">
              Send this to {output.inviteResult?.email}. If they don’t have Taskr yet, the page
              sends them to download it. Then they tap Open to sign in. It works once.
            </Text>
            <View className="bg-gray-100 rounded-lg p-4 mb-4">
              <Text
                selectable
                testID="invite-sign-in-link"
                className="text-sm text-gray-900"
              >
                {output.inviteResult?.signInLink}
              </Text>
            </View>
            <Pressable
              testID="invite-copy-link"
              onPress={() => {
                const link = output.inviteResult?.signInLink;
                if (!link) {
                  return;
                }
                void Clipboard.setStringAsync(link).then(() => {
                  Alert.alert("Copied", "Sign-in link copied.");
                });
              }}
              className="bg-[#08576E] rounded-lg py-3 items-center mb-2"
            >
              <Text className="text-white font-semibold">Copy link</Text>
            </Pressable>
            <Pressable
              testID="invite-share-link"
              onPress={() => {
                const link = output.inviteResult?.signInLink;
                if (!link) {
                  return;
                }
                void Share.share({
                  message: `Join Taskr. Download the app if you need it, then open this invite to sign in:\n${link}`,
                  url: link,
                });
              }}
              className="bg-blue-600 rounded-lg py-3 items-center mb-2"
            >
              <Text className="text-white font-semibold">Share…</Text>
            </Pressable>
            <Pressable
              testID="invite-result-done"
              onPress={actions.closeActiveModal}
              className="bg-gray-200 rounded-lg py-3 items-center"
            >
              <Text className="text-gray-800 font-semibold">Done</Text>
            </Pressable>
          </View>
        </View>
      </ModalComponent>

      <ModalComponent
        visible={output.profileMenu.isVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={actions.toggleProfileMenu}
      >
        <Pressable className="flex-1 bg-black/50" onPress={actions.toggleProfileMenu}>
          <View
            className="absolute top-16 right-4 bg-white rounded-xl shadow-lg overflow-hidden min-w-[200px]"
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 8,
            }}
          >
            <View className="bg-blue-600 px-4 py-3 border-b border-blue-700">
              <View className="flex-row items-center">
                <View className="w-10 h-10 bg-white rounded-full items-center justify-center mr-3">
                  <Text className="text-blue-600 font-bold text-lg">
                    {output.profileMenu.avatarInitial}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text className="text-white font-semibold text-base" numberOfLines={1}>
                    {output.profileMenu.displayName}
                  </Text>
                  <Text className="text-blue-100 text-sm capitalize">
                    {output.profileMenu.roleLabel}
                  </Text>
                </View>
              </View>
            </View>

            <View className="py-2">
              <Pressable
                onPress={() => {
                  actions.toggleProfileMenu();
                  onNavigateBack();
                }}
                className="flex-row items-center px-4 py-3 active:bg-gray-100"
              >
                <Ionicons name="arrow-back-outline" size={22} color="#3b82f6" />
                <Text className="text-gray-900 text-base font-medium ml-3">Back to Dashboard</Text>
              </Pressable>

              <View className="h-px bg-gray-200 mx-4" />

              <Pressable
                onPress={actions.confirmLogout}
                className="flex-row items-center px-4 py-3 active:bg-gray-100"
              >
                <Ionicons name="log-out-outline" size={22} color="#ef4444" />
                <Text className="text-red-600 text-base font-medium ml-3">Logout</Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </ModalComponent>
    </SafeAreaView>
  );
}
