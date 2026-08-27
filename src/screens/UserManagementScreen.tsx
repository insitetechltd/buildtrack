import React, { useCallback, useMemo, useRef } from "react";
import {
  FlatList,
  Modal,
  NativeSyntheticEvent,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TextInputKeyPressEventData,
  View,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { Swipeable } from "react-native-gesture-handler";
import * as Clipboard from "expo-clipboard";

import ModalHandle from "../components/ModalHandle";
import ModernScreenHeader from "../components/ModernScreenHeader";
import BrandHeaderTitle from "../components/BrandHeaderTitle";
import {
  ROOT_TAB_BAR_STYLE,
  ROOT_TAB_CENTER_FAB_LAYOUT,
  ROOT_TAB_CENTER_FAB_SLOT,
} from "../navigation/rootTabVisibility";
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

const MAX_VISIBLE_ASSIGNMENTS = 2;

function getAssignmentRoleBadge(
  projectRole: UserManagementProjectRoleOption["role"],
  companySeatLabel: string,
): string {
  if (projectRole === "lead_project_manager") {
    return "PA";
  }
  return companySeatLabel;
}

function formatContactLine(phone?: string, email?: string): string | null {
  const parts = [phone?.trim(), email?.trim()].filter(Boolean) as string[];
  return parts.length > 0 ? parts.join(" · ") : null;
}

function SwipeDeactivateAction({
  testID,
  onPress,
}: {
  testID: string;
  onPress: () => void;
}) {
  return (
    <View testID={`${testID}-wrapper`} className="mb-3 w-[72px] items-end justify-center">
      <Pressable
        testID={testID}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel="Make user inactive"
        className="h-full min-h-[88px] w-[64px] items-center justify-center rounded-xl bg-amber-600"
      >
        <Ionicons name="person-remove-outline" size={22} color="#ffffff" />
        <Text className="mt-1 text-center text-xs font-semibold text-white">Inactive</Text>
      </Pressable>
    </View>
  );
}

/** Local bottom nav chrome — same bar + FAB geometry as root Camera/add-task. */
function AddUserBottomNav({ onPress }: { onPress: () => void }) {
  return (
    <View style={styles.addUserTabBar} testID="user-management__bottom-nav">
      <View style={styles.addUserTabSideSlot} pointerEvents="none" />
      <View style={styles.addUserTabCenterSlot} testID="user-management__add-user">
        <Pressable
          testID="user-management__add-user_button"
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel="Add user"
          style={styles.addUserTabButton}
        >
          <View pointerEvents="none" style={styles.addUserTabIconSurface}>
            <Ionicons name="person-add" size={28} color="#ffffff" />
          </View>
        </Pressable>
      </View>
      <View style={styles.addUserTabSideSlot} pointerEvents="none" />
    </View>
  );
}

function UserCard({
  card,
  isCopyingInvite,
  onAssign,
  onApprove,
  onReject,
  onRemoveAssignment,
  onCopyInviteLink,
  onDeactivate,
}: {
  card: UserManagementUserCard;
  isCopyingInvite: boolean;
  onAssign: (userId: string) => void;
  onApprove: (userId: string) => void;
  onReject: (userId: string) => void;
  onRemoveAssignment: (userId: string, projectId: string) => void;
  onCopyInviteLink: (userId: string) => void;
  onDeactivate: (userId: string) => void;
}) {
  const contactLine = formatContactLine(card.phone, card.email);
  const visibleAssignments = card.assignmentRows.slice(0, MAX_VISIBLE_ASSIGNMENTS);
  const roleBadgeLabel = card.isPending ? "Pending" : card.systemRoleLabel;
  const roleBadgeClass = card.isPending
    ? "bg-orange-100"
    : card.isAdmin
      ? "bg-purple-100"
      : "bg-slate-100";
  const roleBadgeTextClass = card.isPending
    ? "text-orange-700"
    : card.isAdmin
      ? "text-purple-700"
      : "text-slate-700";

  const cardBody = (
    <View className="bg-white border border-gray-200 rounded-xl px-4 py-3">
      <View className="flex-row items-center justify-between gap-3">
        <Text
          className="flex-1 text-lg font-semibold text-gray-900"
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {card.name}
        </Text>
        <View className={cn("rounded-md px-2 py-0.5", roleBadgeClass)}>
          <Text className={cn("text-sm font-semibold", roleBadgeTextClass)}>
            {roleBadgeLabel}
          </Text>
        </View>
      </View>

      {contactLine ? (
        <Text className="mt-1 text-base text-gray-500" numberOfLines={1} ellipsizeMode="tail">
          {contactLine}
        </Text>
      ) : null}

      {card.isPending ? (
        <View className="mt-3 flex-row items-center justify-between gap-2">
          <Text className="flex-1 text-base text-orange-700" numberOfLines={2}>
            {card.pendingMessage ?? "Awaiting approval"}
          </Text>
          <View className="flex-row gap-2">
            <Pressable
              testID={card.primaryAction.testId}
              onPress={() => onApprove(card.userId)}
              className="rounded-lg bg-green-600 px-3 py-1.5"
            >
              <Text className="text-base font-medium text-white">{card.primaryAction.label}</Text>
            </Pressable>
            {card.secondaryAction ? (
              <Pressable
                testID={card.secondaryAction.testId}
                onPress={() => onReject(card.userId)}
                className="rounded-lg bg-red-600 px-3 py-1.5"
              >
                <Text className="text-base font-medium text-white">
                  {card.secondaryAction.label}
                </Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      ) : (
        <>
          <View className="mt-3 flex-row items-center justify-between gap-2">
            <Text className="text-base font-medium text-gray-700">
              {`Assigned Project(${card.assignmentRows.length})`}
            </Text>
            <Pressable
              testID={card.primaryAction.testId}
              onPress={() => onAssign(card.userId)}
              className="rounded-lg bg-blue-600 px-3 py-1.5"
            >
              <Text className="text-base font-medium text-white">{card.primaryAction.label}</Text>
            </Pressable>
          </View>

          {visibleAssignments.length > 0 ? (
            <View className="mt-1.5">
              {visibleAssignments.map((assignment) => {
                const roleBadge = getAssignmentRoleBadge(
                  assignment.projectRole,
                  card.companySeatLabel,
                );

                return (
                  <View
                    key={assignment.id}
                    className="flex-row items-center py-0.5"
                  >
                    <Text
                      className="flex-1 text-base text-gray-600"
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {`${assignment.projectName} (${roleBadge})`}
                    </Text>
                    {assignment.canRemove ? (
                      <Pressable
                        testID={assignment.removeTestId}
                        onPress={() =>
                          onRemoveAssignment(card.userId, assignment.projectId)
                        }
                        hitSlop={8}
                        className="ml-2 p-0.5"
                      >
                        <Ionicons name="close-circle" size={18} color="#9ca3af" />
                      </Pressable>
                    ) : null}
                  </View>
                );
              })}
            </View>
          ) : (
            <Text className="mt-1.5 text-base text-gray-400">No projects yet</Text>
          )}
        </>
      )}

      {card.canCopyInviteLink ? (
        <Pressable
          testID={`user-management__copy-invite-${card.userId}`}
          disabled={isCopyingInvite}
          onPress={() => onCopyInviteLink(card.userId)}
          className={`mt-3 flex-row items-center justify-center rounded-lg py-2.5 ${
            isCopyingInvite ? "bg-[#9BB9C2]" : "bg-[#08576E]"
          }`}
        >
          <Ionicons name="copy-outline" size={18} color="#ffffff" />
          <Text className="ml-2 text-base font-semibold text-white">
            {isCopyingInvite ? "Copying…" : "Copy invite link"}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );

  if (!card.canDeactivate) {
    return <View className="mb-3">{cardBody}</View>;
  }

  return (
    <Swipeable
      testID={`user-management__row_${card.userId}:swipeable`}
      overshootLeft={false}
      overshootRight={false}
      activeOffsetX={[-20, 20]}
      failOffsetY={[-12, 12]}
      renderRightActions={() => (
        <SwipeDeactivateAction
          testID={`user-management__deactivate-${card.userId}`}
          onPress={() => onDeactivate(card.userId)}
        />
      )}
    >
      <View className="mb-3">{cardBody}</View>
    </Swipeable>
  );
}

export default function UserManagementScreen(props: UserManagementScreenProps) {
  const { onNavigateBack } = props;
  const { output, actions } = useUserManagementViewAdapter(props);
  const searchInputRef = useRef<TextInput>(null);
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
        onDeactivate={actions.requestDeactivateUser}
      />
    ),
    [
      actions.copyInviteLink,
      actions.requestApproveUser,
      actions.requestAssignUser,
      actions.requestDeactivateUser,
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
    <SafeAreaView edges={["left", "right"]} className="flex-1 bg-[#E7F4F8]">
      <StatusBar style="light" />

      <ModernScreenHeader
        title="User Management"
        titleNode={<BrandHeaderTitle label="User Management" subtitle="Admin" />}
        showBackButton={true}
        onBackPress={onNavigateBack}
        className="border-b-0 bg-[#08576E] pb-2"
      />

      <View className="bg-white border-b border-gray-200 px-6 py-4">
        <View className="flex-row items-center mb-3 bg-gray-100 rounded-lg px-3 py-2">
          <Ionicons name="search-outline" size={22} color="#6b7280" />
          <TextInput
            ref={searchInputRef}
            className="flex-1 ml-2 text-lg text-gray-900"
            placeholder="Search users..."
            placeholderTextColor="#9ca3af"
            value={output.searchQuery}
            onChangeText={actions.setSearchQuery}
            returnKeyType="done"
            onKeyPress={handleSearchKeyPress}
            onSubmitEditing={() => {
              searchInputRef.current?.blur();
            }}
          />
        </View>

        <Text className="text-lg text-gray-600">{output.userCountLabel}</Text>
      </View>

      <View className="flex-1">
        <FlatList
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 24,
            paddingVertical: 16,
            flexGrow: 1,
            paddingBottom: 24,
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
            </View>
          }
        />
      </View>

      <AddUserBottomNav onPress={actions.openInviteModal} />

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
              <Text className="text-sm text-gray-500 mt-3">
                Places them on the job as a member. Name Project Admin on Edit Project
                (company admin or PM only).
              </Text>
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
            <Text className="text-gray-600 mb-2">
              Creates a shareable link. They download Taskr if needed, then open the link to sign in
              the first time — no password.
            </Text>
            {output.inviteForm.seatUsageLabel ? (
              <Text className="text-base text-gray-700 mb-4" testID="invite-seat-usage">
                {output.inviteForm.seatUsageLabel}
              </Text>
            ) : (
              <View className="mb-4" />
            )}

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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  addUserTabBar: {
    ...ROOT_TAB_BAR_STYLE,
    alignItems: "center",
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
  },
  addUserTabSideSlot: {
    flex: 1,
  },
  addUserTabCenterSlot: {
    ...ROOT_TAB_CENTER_FAB_SLOT,
  },
  addUserTabButton: {
    ...ROOT_TAB_CENTER_FAB_LAYOUT,
    backgroundColor: "#08576E",
    shadowColor: "#053845",
  },
  addUserTabIconSurface: {
    alignItems: "center",
    justifyContent: "center",
  },
});
