import React, { useMemo, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

import ModalHandle from "@/components/ModalHandle";
import ProjectForm from "@/components/ProjectForm";
import ModernScreenHeader from "@/components/ModernScreenHeader";
import BrandHeaderTitle from "@/components/BrandHeaderTitle";
import { useAuthStore } from "@/state/authStore";
import { useCompanyStore } from "@/state/companyStore";
import { useUserPreferencesStore } from "@/state/userPreferencesStore";
import { useUserStoreWithInit } from "@/state/userStore.supabase";
import { isAdmin, type ProjectStatus } from "@/types/buildtrack";
import { cn } from "@/utils/cn";
import { useProjectDetailViewAdapter } from "@/ui/viewAdapters/useProjectDetailViewAdapter";

interface ProjectDetailScreenProps {
  projectId: string;
  onNavigateBack: () => void;
}

export default function ProjectDetailScreen({ projectId, onNavigateBack }: ProjectDetailScreenProps) {
  const { output, actions } = useProjectDetailViewAdapter({ projectId });

  const getStatusColor = (status: ProjectStatus) => {
    switch (status) {
      case "active":
        return "text-green-600 bg-green-50 border-green-200";
      case "planning":
        return "text-blue-600 bg-blue-50 border-blue-200";
      case "on_hold":
        return "text-yellow-600 bg-yellow-50 border-yellow-200";
      case "completed":
        return "text-gray-600 bg-gray-50 border-gray-200";
      case "cancelled":
        return "text-red-600 bg-red-50 border-red-200";
      default:
        return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  if (!output.readiness.hasUsableData && !output.continuity.isInitialLoading) {
    return null;
  }

  if (!output.project || !output.header || output.emptyState) {
    return (
      <SafeAreaView edges={["bottom", "left", "right"]} className="flex-1 bg-[#E7F4F8]">
        <StatusBar style="light" />
        <ModernScreenHeader
          title="Project Details"
          titleNode={<BrandHeaderTitle label="Project Details" subtitle="Project details" />}
          showBackButton={true}
          onBackPress={onNavigateBack}
          className="border-b-0 bg-[#08576E] pb-2"
        />
        <View className="flex-1 items-center justify-center p-6">
          <Ionicons name="alert-circle-outline" size={64} color="#9ca3af" />
          <Text className="text-gray-500 text-xl font-medium mt-4">
            {output.emptyState?.title || "Project not found"}
          </Text>
          <Text className="text-gray-400 text-center mt-2">
            {output.emptyState?.message ||
              "This project may have been deleted or you don't have access to it."}
          </Text>
          <Pressable
            onPress={onNavigateBack}
            className="mt-6 px-6 py-3 bg-blue-600 rounded-lg"
          >
            <Text className="text-white font-semibold">
              {output.emptyState?.primaryActionLabel || "Go Back"}
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["bottom", "left", "right"]} className="flex-1 bg-[#E7F4F8]">
      <StatusBar style="light" />

      <ModernScreenHeader
        title="Project Details"
        titleNode={
          <BrandHeaderTitle
            label={output.header.title || "Project Details"}
            subtitle="Project details"
          />
        }
        showBackButton={true}
        onBackPress={onNavigateBack}
        className="border-b-0 bg-[#08576E] pb-2"
        rightElement={
          output.canEdit ? (
            <Pressable
              testID="project-detail__edit"
              onPress={actions.openEditProject}
              className="h-10 w-10 items-center justify-center rounded-full bg-[#0D6E87]"
            >
              <Ionicons name="pencil" size={20} color="white" />
            </Pressable>
          ) : undefined
        }
      />

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={output.isRefreshing}
            onRefresh={() => void actions.handleRefresh()}
          />
        }
      >
        <View className="bg-white border-b border-gray-200 px-6 py-4">
          <View className="flex-row items-start justify-between mb-3">
            <View className="flex-1">
              <Text className="text-3xl font-bold text-gray-900 mb-2">
                {output.header.title}
              </Text>
              <Text className="text-lg text-gray-600">
                {output.header.description}
              </Text>
            </View>
          </View>

          <View
            className={cn(
              "px-3 py-2 rounded-lg border self-start",
              getStatusColor(output.header.statusValue),
            )}
          >
            <Text className="text-base font-medium capitalize">
              {output.header.statusLabel}
            </Text>
          </View>
        </View>

        {output.leadPm && (
          <View className="bg-purple-100 border-y border-purple-200 px-6 py-3">
            <View className="flex-row items-center">
              <Ionicons name="star" size={20} color="#7c3aed" />
              <Text className="text-base text-purple-900 font-semibold ml-2">
                Lead Project Manager: {output.leadPm.name}
              </Text>
            </View>
            {output.leadPm.email && (
              <Text className="text-sm text-purple-700 ml-7">
                {output.leadPm.email}
              </Text>
            )}
          </View>
        )}

        <View className="px-6 py-4">
          <View className="flex-row flex-wrap -mx-1">
            {output.statCards.map((card) => (
              <View key={card.id} className="w-1/2 px-1 mb-3">
                <View className="bg-white border border-gray-200 rounded-xl p-4">
                  <View className="flex-row items-center mb-2">
                    <Ionicons
                      name={card.iconName as keyof typeof Ionicons.glyphMap}
                      size={20}
                      color={card.statId === "members" ? "#3b82f6" : "#10b981"}
                    />
                    <Text className="text-sm text-gray-500 ml-2">{card.label}</Text>
                  </View>
                  <Text className="text-3xl font-bold text-gray-900">
                    {card.value}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        <View className="px-6 pb-4">
          <Text className="text-xl font-semibold text-gray-900 mb-3">Project Information</Text>

          <View className="bg-white border border-gray-200 rounded-xl p-4 mb-3">
            {output.informationRows.map((row, index) => (
              <View
                key={row.id}
                className={cn("flex-row items-start", index < output.informationRows.length - 1 && "mb-4")}
              >
                <Ionicons
                  name={
                    row.id.includes("location")
                      ? "location-outline"
                      : row.id.includes("timeline")
                        ? "calendar-outline"
                        : row.id.includes("client")
                          ? "business-outline"
                          : row.id.includes("budget")
                            ? "cash-outline"
                            : "person-outline"
                  }
                  size={20}
                  color="#6b7280"
                />
                <View className="ml-3 flex-1">
                  <Text className="text-base font-medium text-gray-900 mb-1">
                    {row.label}
                  </Text>
                  <Text className="text-base text-gray-600">{row.value}</Text>
                  {row.secondaryValue ? (
                    <Text className="text-base text-gray-600 mt-1">
                      {row.secondaryValue}
                    </Text>
                  ) : null}
                </View>
              </View>
            ))}
          </View>
        </View>

        <View className="px-6 pb-4">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-xl font-semibold text-gray-900">Team Members</Text>
            {output.canManageMembers && (
              <Pressable
                onPress={actions.openAddMemberModal}
                testID="project-detail__add-member"
                className="px-3 py-1.5 bg-blue-600 rounded-lg"
              >
                <Text className="text-white text-base font-medium">Add Member</Text>
              </Pressable>
            )}
          </View>

          <View className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            {output.memberRows.length > 0 ? (
              output.memberRows.map((member, index) => (
                <View
                  key={member.id}
                  className={cn(
                    "flex-row items-center justify-between p-4",
                    index < output.memberRows.length - 1 && "border-b border-gray-200",
                  )}
                >
                  <View className="flex-1">
                    <View className="flex-row items-center mb-1">
                      <Text className="text-lg font-medium text-gray-900">
                        {member.name}
                      </Text>
                      {member.isLeadPm ? (
                        <View className="ml-2 bg-purple-100 px-2 py-0.5 rounded">
                          <Text className="text-sm text-purple-700 font-medium">Lead PM</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text className="text-base text-gray-600 capitalize">
                      {member.projectRoleLabel}
                    </Text>
                    {member.email ? (
                      <Text className="text-sm text-gray-500 mt-1">{member.email}</Text>
                    ) : null}
                  </View>

                  {member.canRemove ? (
                    <Pressable
                      onPress={() => actions.confirmRemoveMember(member.userId)}
                      className="w-8 h-8 items-center justify-center bg-red-50 rounded-lg ml-3"
                    >
                      <Ionicons name="trash-outline" size={16} color="#ef4444" />
                    </Pressable>
                  ) : null}
                </View>
              ))
            ) : (
              <View className="p-6 items-center">
                <Ionicons name="people-outline" size={48} color="#9ca3af" />
                <Text className="text-gray-500 text-base mt-2">No team members yet</Text>
              </View>
            )}
          </View>
        </View>

        <View className="h-20" />
      </ScrollView>

      {output.isEditModalVisible && output.editingProject ? (
        <EditProjectModal
          visible={output.isEditModalVisible}
          project={output.editingProject}
          onClose={actions.closeEditProject}
          onSubmit={actions.saveProjectEdits}
        />
      ) : null}

      {output.isAddMemberModalVisible ? (
        <AddMemberModal
          visible={output.isAddMemberModalVisible}
          existingMembers={output.existingMemberIds}
          onClose={actions.closeAddMemberModal}
          onAdd={actions.addMembers}
        />
      ) : null}
    </SafeAreaView>
  );
}

function EditProjectModal({
  visible,
  project,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  project: NonNullable<
    ReturnType<typeof useProjectDetailViewAdapter>["output"]["editingProject"]
  >;
  onClose: () => void;
  onSubmit: ReturnType<typeof useProjectDetailViewAdapter>["actions"]["saveProjectEdits"];
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (formData: Parameters<typeof onSubmit>[0]) => {
    setIsSubmitting(true);

    try {
      await onSubmit(formData);
    } catch (error) {
      console.error("ProjectDetailScreen: Error submitting project edits", error);
      Alert.alert("Error", "Failed to update project. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView edges={["bottom", "left", "right"]} className="flex-1 bg-[#E7F4F8]">
        <StatusBar style="light" />

        <ModernScreenHeader
          title="Edit Project"
          titleNode={<BrandHeaderTitle label="Edit Project" subtitle="Project details" />}
          showBackButton={true}
          onBackPress={onClose}
          className="border-b-0 bg-[#08576E] pb-2"
        />

        <ProjectForm
          mode="edit"
          project={project}
          onSubmit={handleSubmit}
          onCancel={onClose}
          submitButtonText="Save"
          isSubmitting={isSubmitting}
        />
      </SafeAreaView>
    </Modal>
  );
}

function AddMemberModal({
  visible,
  existingMembers,
  onClose,
  onAdd,
}: {
  visible: boolean;
  existingMembers: string[];
  onClose: () => void;
  onAdd: (userIds: string[]) => Promise<void>;
}) {
  const { user } = useAuthStore();
  const { getUsersByCompany, getAllUsers } = useUserStoreWithInit();
  const { getCompanyById } = useCompanyStore();
  const { isFavoriteUser, toggleFavoriteUser } = useUserPreferencesStore();

  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const canAdministerProject = isAdmin(user);

  const allAvailableUsers = useMemo(() => {
    if (canAdministerProject) {
      return getAllUsers().filter((availableUser) => !existingMembers.includes(availableUser.id));
    }

    const companyUsers = user?.companyId ? getUsersByCompany(user.companyId) : [];
    return companyUsers.filter((availableUser) => !existingMembers.includes(availableUser.id));
  }, [canAdministerProject, user?.companyId, getAllUsers, getUsersByCompany, existingMembers]);

  const availableUsers = useMemo(() => {
    let filtered = allAvailableUsers;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = allAvailableUsers.filter((availableUser) => {
        const company = getCompanyById(availableUser.companyId);
        return (
          availableUser.name.toLowerCase().includes(query) ||
          (availableUser.email && availableUser.email.toLowerCase().includes(query)) ||
          availableUser.position.toLowerCase().includes(query) ||
          (company && company.name.toLowerCase().includes(query))
        );
      });
    }

    if (user?.id) {
      return [...filtered].sort((a, b) => {
        const aIsFavorite = isFavoriteUser(user.id, a.id);
        const bIsFavorite = isFavoriteUser(user.id, b.id);

        if (aIsFavorite && !bIsFavorite) return -1;
        if (!aIsFavorite && bIsFavorite) return 1;
        return 0;
      });
    }
    
    return filtered;
  }, [allAvailableUsers, searchQuery, getCompanyById, user?.id, isFavoriteUser]);

  React.useEffect(() => {
    if (visible) {
      setSelectedUsers([]);
      setSearchQuery("");
    }
  }, [visible]);

  const toggleUser = (userId: string) => {
    setSelectedUsers((prev) => {
      if (prev.includes(userId)) {
        return prev.filter((id) => id !== userId);
      }

      return [...prev, userId];
    });
  };

  const handleAdd = async () => {
    if (selectedUsers.length === 0) {
      Alert.alert("Error", "Please select at least one user");
      return;
    }

    await onAdd(selectedUsers);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView edges={['bottom', 'left', 'right']} className="flex-1 bg-[#E7F4F8]">
        <StatusBar style="light" />

        <ModalHandle />

        <View className="flex-row items-center bg-white border-b border-gray-200 px-6 py-4">
          <Pressable onPress={onClose} className="mr-4 w-10 h-10 items-center justify-center">
            <Ionicons name="close" size={24} color="#374151" />
          </Pressable>
          <Text className="text-2xl font-semibold text-gray-900 flex-1">
            Add Team Members
          </Text>
          <Pressable onPress={handleAdd} className="px-4 py-2 bg-blue-600 rounded-lg">
            <Text className="text-white font-medium">
              Add ({selectedUsers.length})
            </Text>
          </Pressable>
        </View>

        {/* Search Bar */}
        <View className="bg-white px-6 py-3 border-b border-gray-200">
          <View className="flex-row items-center bg-gray-100 rounded-lg px-3 py-2">
            <Ionicons name="search" size={20} color="#6b7280" />
            <TextInput
              className="flex-1 ml-2 text-lg text-gray-900"
              placeholder="Search by name, email, position, or company..."
              placeholderTextColor="#9ca3af"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery("")}>
                <Ionicons name="close-circle" size={20} color="#6b7280" />
              </Pressable>
            )}
          </View>
          
          {/* Results info */}
          {canAdministerProject && (
            <Text className="text-sm text-gray-600 mt-2">
              {availableUsers.length} user{availableUsers.length !== 1 ? "s" : ""} available
              {searchQuery && ` (filtered from ${allAvailableUsers.length})`}
              {" • "}Showing users from all companies
            </Text>
          )}
        </View>

        <ScrollView className="flex-1 px-6 py-4">
          {availableUsers.length > 0 ? (
            <View className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <View className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                <Text className="text-base font-medium text-gray-700">
                  Select Users <Text className="text-red-500">*</Text>
                </Text>
                <Text className="text-sm text-gray-500 mt-1">
                  Tap to select/deselect team members
                </Text>
              </View>

              {availableUsers.map((availableUser, index) => {
                const isSelected = selectedUsers.includes(availableUser.id);
                const userCompany = getCompanyById(availableUser.companyId);
                const isFavorite = user?.id ? isFavoriteUser(user.id, availableUser.id) : false;

                return (
                  <Pressable
                    key={availableUser.id}
                    onPress={() => toggleUser(availableUser.id)}
                    className={cn(
                      "flex-row items-center justify-between px-4 py-3",
                      index < availableUsers.length - 1 && "border-b border-gray-200",
                      isSelected && "bg-blue-50"
                    )}
                  >
                    <View className="flex-1">
                      <Text className="text-lg font-medium text-gray-900">
                        {availableUser.name}
                      </Text>
                      <View className="flex-row items-center mt-1">
                        <Text className="text-base text-gray-600 capitalize">
                          {availableUser.position}
                        </Text>
                        <View className="w-1 h-1 rounded-full bg-gray-400 mx-2" />
                        <Text className="text-base text-gray-500 capitalize">
                          {availableUser.role}
                        </Text>
                      </View>
                      {/* Show company name - important for cross-company visibility */}
                      {userCompany && (
                        <View className="flex-row items-center mt-1">
                          <Ionicons name="business-outline" size={12} color="#9ca3af" />
                          <Text className="text-sm text-gray-500 ml-1">
                            {userCompany.name}
                          </Text>
                        </View>
                      )}
                      {availableUser.email && (
                        <Text className="text-sm text-gray-400 mt-0.5">
                          {availableUser.email}
                        </Text>
                      )}
                    </View>

                    <View className="flex-row items-center ml-3">
                      <Pressable
                        onPress={(e) => {
                          e.stopPropagation();
                          if (user?.id) {
                            toggleFavoriteUser(user.id, availableUser.id);
                          }
                        }}
                        className="p-2 mr-2"
                      >
                        <Ionicons
                          name={isFavorite ? "star" : "star-outline"}
                          size={24}
                          color={isFavorite ? "#fbbf24" : "#9ca3af"}
                        />
                      </Pressable>

                      <View
                        className={cn(
                          "w-6 h-6 rounded border-2 items-center justify-center",
                          isSelected
                            ? "bg-blue-600 border-blue-600"
                            : "bg-white border-gray-300",
                        )}
                      >
                        {isSelected && (
                          <Ionicons name="checkmark" size={16} color="white" />
                        )}
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ) : searchQuery ? (
            <View className="flex-1 items-center justify-center py-16">
              <Ionicons name="search-outline" size={64} color="#9ca3af" />
              <Text className="text-gray-500 text-xl font-medium mt-4">No Users Found</Text>
              <Text className="text-gray-400 text-center mt-2 px-8">
                Try adjusting your search query
              </Text>
              <Pressable
                onPress={() => setSearchQuery("")}
                className="mt-4 bg-blue-600 px-4 py-2 rounded-lg"
              >
                <Text className="text-white font-medium">Clear Search</Text>
              </Pressable>
            </View>
          ) : (
            <View className="flex-1 items-center justify-center py-16">
              <Ionicons name="people-outline" size={64} color="#9ca3af" />
              <Text className="text-gray-500 text-xl font-medium mt-4">No Available Users</Text>
              <Text className="text-gray-400 text-center mt-2 px-8">
                {canAdministerProject
                  ? "All users from all companies are already assigned to this project."
                  : "All company members are already assigned to this project."
                }
              </Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
