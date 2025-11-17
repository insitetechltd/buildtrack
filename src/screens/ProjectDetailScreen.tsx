import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Picker } from "@react-native-picker/picker";
import { useFocusEffect } from "@react-navigation/native";
import { useAuthStore } from "../state/authStore";
import { useProjectStoreWithCompanyInit } from "../state/projectStore.supabase";
import { useUserStoreWithInit } from "../state/userStore.supabase";
import { useTaskStore } from "../state/taskStore.supabase";
import { useCompanyStore } from "../state/companyStore";
import { useUserPreferencesStore } from "../state/userPreferencesStore";
import { Project, ProjectStatus, UserCategory, Task } from "../types/buildtrack";
import { cn } from "../utils/cn";
import StandardHeader from "../components/StandardHeader";
import ProjectForm from "../components/ProjectForm";
import ModalHandle from "../components/ModalHandle";

interface ProjectDetailScreenProps {
  projectId: string;
  onNavigateBack: () => void;
}

export default function ProjectDetailScreen({ projectId, onNavigateBack }: ProjectDetailScreenProps) {
  const { user } = useAuthStore();
  const projectStore = useProjectStoreWithCompanyInit(user?.companyId || "");
  const { 
    getProjectById, 
    updateProject, 
    getProjectStats,
    getProjectUserAssignments,
    getLeadPMForProject,
    assignUserToProject,
    removeUserFromProject,
    fetchProjectUserAssignments,
    cleanupDuplicateAssignments,
  } = projectStore;
  const { getUserById, getUsersByCompany, getAllUsers } = useUserStoreWithInit();
  const { getTasksByProject } = useTaskStore();
  const { getCompanyById } = useCompanyStore();

  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);

  // Refresh project assignments when component mounts and when screen comes into focus
  React.useEffect(() => {
    if (user?.companyId && projectId) {
      // First cleanup any duplicates, then fetch fresh data
      cleanupDuplicateAssignments(projectId).then(() => {
        fetchProjectUserAssignments(projectId);
      });
    }
  }, [projectId, user?.companyId, fetchProjectUserAssignments, cleanupDuplicateAssignments]);

  // Refresh data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      if (user?.companyId && projectId) {
        fetchProjectUserAssignments(projectId);
      }
    }, [projectId, user?.companyId, fetchProjectUserAssignments])
  );

  if (!user) return null;

  const project = getProjectById(projectId);
  
  if (!project) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <StatusBar style="dark" />
        <StandardHeader 
          title="Project Details"
          showBackButton={true}
          onBackPress={onNavigateBack}
        />
        <View className="flex-1 items-center justify-center p-6">
          <Ionicons name="alert-circle-outline" size={64} color="#9ca3af" />
          <Text className="text-gray-500 text-xl font-medium mt-4">Project not found</Text>
          <Text className="text-gray-400 text-center mt-2">
            This project may have been deleted or you don't have access to it.
          </Text>
          <Pressable
            onPress={onNavigateBack}
            className="mt-6 px-6 py-3 bg-blue-600 rounded-lg"
          >
            <Text className="text-white font-semibold">Go Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const projectStats = getProjectStats(project.id);
  const createdBy = getUserById(project.createdBy);
  const leadPMId = getLeadPMForProject(project.id);
  const leadPM = leadPMId ? getUserById(leadPMId) : null;
  const allProjectAssignments = getProjectUserAssignments(project.id);
  
  // Filter out assignments where the user doesn't exist and remove duplicates
  const projectAssignments = React.useMemo(() => {
    console.log(`Project ${project.id} - All assignments:`, allProjectAssignments);
    
    // First filter out invalid users
    const validAssignments = allProjectAssignments.filter(assignment => {
      const user = getUserById(assignment.userId);
      if (!user) {
        console.warn(`User ${assignment.userId} not found in project ${project.id} assignments. Data may be stale.`);
        return false;
      }
      return true;
    });

    // Remove duplicates by userId (keep the most recent assignment)
    const uniqueAssignments = validAssignments.reduce((acc, assignment) => {
      const existing = acc.find(a => a.userId === assignment.userId);
      if (!existing) {
        acc.push(assignment);
      } else {
        // Keep the most recent assignment
        if (new Date(assignment.assignedAt) > new Date(existing.assignedAt)) {
          const index = acc.indexOf(existing);
          acc[index] = assignment;
        }
      }
      return acc;
    }, [] as typeof validAssignments);

    console.log(`Project ${project.id} - Valid assignments:`, validAssignments);
    console.log(`Project ${project.id} - Unique assignments:`, uniqueAssignments);
    return uniqueAssignments;
  }, [allProjectAssignments, getUserById, project.id]);
  
  const projectTasks = getTasksByProject(project.id);

  const getStatusColor = (status: ProjectStatus) => {
    switch (status) {
      case "active": return "text-green-600 bg-green-50 border-green-200";
      case "planning": return "text-blue-600 bg-blue-50 border-blue-200";
      case "on_hold": return "text-yellow-600 bg-yellow-50 border-yellow-200";
      case "completed": return "text-gray-600 bg-gray-50 border-gray-200";
      case "cancelled": return "text-red-600 bg-red-50 border-red-200";
      default: return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  const handleRemoveMember = (userId: string) => {
    Alert.alert(
      "Remove Member",
      "Are you sure you want to remove this member from the project?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Remove", 
          style: "destructive",
          onPress: async () => {
            try {
              await removeUserFromProject(userId, project.id);
              // Refresh project assignments to show updated data
              await fetchProjectUserAssignments(project.id);
              Alert.alert("Success", "Member removed from project");
            } catch (error) {
              console.error("Error removing member:", error);
              Alert.alert("Error", "Failed to remove member from project");
            }
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <StatusBar style="dark" />
      
      {/* Header */}
      <StandardHeader 
        title="Project Details"
        showBackButton={true}
        onBackPress={onNavigateBack}
        rightElement={
          user.role === "admin" ? (
            <Pressable
              onPress={() => setShowEditModal(true)}
              className="w-10 h-10 bg-blue-600 rounded-full items-center justify-center"
            >
              <Ionicons name="pencil" size={20} color="white" />
            </Pressable>
          ) : undefined
        }
      />

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Project Header */}
        <View className="bg-white border-b border-gray-200 px-6 py-4">
          <View className="flex-row items-start justify-between mb-3">
            <View className="flex-1">
              <Text className="text-3xl font-bold text-gray-900 mb-2">{project.name}</Text>
              <Text className="text-lg text-gray-600">{project.description}</Text>
            </View>
          </View>
          
          <View className={cn("px-3 py-2 rounded-lg border self-start", getStatusColor(project.status))}>
            <Text className="text-base font-medium capitalize">
              {project.status.replace("_", " ")}
            </Text>
          </View>
        </View>

        {/* Lead PM Badge */}
        {leadPM && (
          <View className="bg-purple-100 border-y border-purple-200 px-6 py-3">
            <View className="flex-row items-center">
              <Ionicons name="star" size={20} color="#7c3aed" />
              <Text className="text-base text-purple-900 font-semibold ml-2">
                Lead Project Manager: {leadPM.name}
              </Text>
            </View>
            {leadPM.email && (
              <Text className="text-sm text-purple-700 ml-7">{leadPM.email}</Text>
            )}
          </View>
        )}

        {/* Quick Stats */}
        <View className="px-6 py-4">
          <View className="flex-row flex-wrap -mx-1">
            <View className="w-1/2 px-1 mb-3">
              <View className="bg-white border border-gray-200 rounded-xl p-4">
                <View className="flex-row items-center mb-2">
                  <Ionicons name="people-outline" size={20} color="#3b82f6" />
                  <Text className="text-sm text-gray-500 ml-2">Team Members</Text>
                </View>
                <Text className="text-3xl font-bold text-gray-900">{projectStats.totalUsers}</Text>
              </View>
            </View>
            
            <View className="w-1/2 px-1 mb-3">
              <View className="bg-white border border-gray-200 rounded-xl p-4">
                <View className="flex-row items-center mb-2">
                  <Ionicons name="checkbox-outline" size={20} color="#10b981" />
                  <Text className="text-sm text-gray-500 ml-2">Total Tasks</Text>
                </View>
                <Text className="text-3xl font-bold text-gray-900">{projectTasks.length}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Project Information */}
        <View className="px-6 pb-4">
          <Text className="text-xl font-semibold text-gray-900 mb-3">Project Information</Text>
          
          <View className="bg-white border border-gray-200 rounded-xl p-4 mb-3">
            <View className="flex-row items-start mb-4">
              <Ionicons name="location-outline" size={20} color="#6b7280" />
              <View className="ml-3 flex-1">
                <Text className="text-base font-medium text-gray-900 mb-1">Location</Text>
                <Text className="text-base text-gray-600">{project.location || "No location specified"}</Text>
              </View>
            </View>

            <View className="flex-row items-start mb-4">
              <Ionicons name="calendar-outline" size={20} color="#6b7280" />
              <View className="ml-3 flex-1">
                <Text className="text-base font-medium text-gray-900 mb-1">Timeline</Text>
                <Text className="text-base text-gray-600">
                  Start: {new Date(project.startDate).toLocaleDateString()}
                </Text>
                {project.endDate && (
                  <Text className="text-base text-gray-600">
                    End: {new Date(project.endDate).toLocaleDateString()}
                  </Text>
                )}
              </View>
            </View>

            <View className="flex-row items-start mb-4">
              <Ionicons name="business-outline" size={20} color="#6b7280" />
              <View className="ml-3 flex-1">
                <Text className="text-base font-medium text-gray-900 mb-1">Client</Text>
                <Text className="text-base text-gray-600">{project.clientInfo.name}</Text>
                {project.clientInfo.email && (
                  <Text className="text-base text-gray-600">{project.clientInfo.email}</Text>
                )}
                {project.clientInfo.phone && (
                  <Text className="text-base text-gray-600">{project.clientInfo.phone}</Text>
                )}
              </View>
            </View>

            {project.budget && (
              <View className="flex-row items-start mb-4">
                <Ionicons name="cash-outline" size={20} color="#6b7280" />
                <View className="ml-3 flex-1">
                  <Text className="text-base font-medium text-gray-900 mb-1">Budget</Text>
                  <Text className="text-base text-gray-600">${project.budget.toLocaleString()}</Text>
                </View>
              </View>
            )}

            <View className="flex-row items-start">
              <Ionicons name="person-outline" size={20} color="#6b7280" />
              <View className="ml-3 flex-1">
                <Text className="text-base font-medium text-gray-900 mb-1">Created By</Text>
                <Text className="text-base text-gray-600">{createdBy?.name || "Unknown"}</Text>
                <Text className="text-sm text-gray-500 mt-1">
                  {new Date(project.createdAt).toLocaleString()}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Team Members */}
        <View className="px-6 pb-4">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-xl font-semibold text-gray-900">Team Members</Text>
            {user.role === "admin" && (
              <Pressable
                onPress={() => setShowAddMemberModal(true)}
                className="px-3 py-1.5 bg-blue-600 rounded-lg"
              >
                <Text className="text-white text-base font-medium">Add Member</Text>
              </Pressable>
            )}
          </View>

          <View className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            {projectAssignments.length > 0 ? (
              projectAssignments.map((assignment, index) => {
                const member = getUserById(assignment.userId);
                const isLeadPM = assignment.userId === leadPMId;
                
                // Debug logging
                console.log(`Member ${member.name}: isLeadPM=${isLeadPM}, user.role=${user.role}, canDelete=${user.role === "admin" && !isLeadPM}`);
                
                // This should never happen now due to filtering, but keeping for safety
                if (!member) return null;
                
                return (
                  <View 
                    key={assignment.id || `${assignment.userId}-${assignment.projectId}`}
                    className={cn(
                      "flex-row items-center justify-between p-4",
                      index < projectAssignments.length - 1 && "border-b border-gray-200"
                    )}
                  >
                    <View className="flex-1">
                      <View className="flex-row items-center mb-1">
                        <Text className="text-lg font-medium text-gray-900">{member.name}</Text>
                        {isLeadPM && (
                          <View className="ml-2 bg-purple-100 px-2 py-0.5 rounded">
                            <Text className="text-sm text-purple-700 font-medium">Lead PM</Text>
                          </View>
                        )}
                      </View>
                      {/* Display PROJECT ROLE (category) - what they do on THIS project */}
                      <Text className="text-base text-gray-600 capitalize">
                        {assignment.category.replace("_", " ")}
                      </Text>
                      {member.email && (
                        <Text className="text-sm text-gray-500 mt-1">{member.email}</Text>
                      )}
                    </View>
                    
                    {user.role === "admin" && !isLeadPM && (
                      <Pressable
                        onPress={() => handleRemoveMember(assignment.userId)}
                        className="w-8 h-8 items-center justify-center bg-red-50 rounded-lg ml-3"
                      >
                        <Ionicons name="trash-outline" size={16} color="#ef4444" />
                      </Pressable>
                    )}
                  </View>
                );
              })
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

      {/* Edit Project Modal */}
      {showEditModal && (
        <EditProjectModal
          visible={showEditModal}
          project={project}
          onClose={() => setShowEditModal(false)}
          onSave={(updatedProject) => {
            updateProject(updatedProject.id, updatedProject);
            setShowEditModal(false);
            Alert.alert("Success", "Project updated successfully");
          }}
        />
      )}

      {/* Add Member Modal */}
      {showAddMemberModal && (
        <AddMemberModal
          visible={showAddMemberModal}
          projectId={project.id}
          existingMembers={projectAssignments.map(a => a.userId)}
          onClose={() => setShowAddMemberModal(false)}
          onAdd={async (userIds) => {
            try {
              // Add all selected users with default 'worker' PROJECT ROLE (category)
              // Note: "worker" here is their PROJECT ROLE, not their job title
              // A "manager" (job title) can be assigned as "worker" (project role) on a project
              const results = await Promise.allSettled(
                userIds.map(userId => 
                  assignUserToProject(userId, project.id, "worker", user.id)
                )
              );

              // Count successful and failed additions
              const successful = results.filter(r => r.status === 'fulfilled').length;
              const failed = results.filter(r => r.status === 'rejected').length;

              setShowAddMemberModal(false);

              // Refresh project assignments to show updated data
              await fetchProjectUserAssignments(project.id);

              if (successful > 0 && failed === 0) {
                const memberText = successful === 1 ? "member" : "members";
                Alert.alert("Success", `${successful} ${memberText} added to project`);
              } else if (successful > 0 && failed > 0) {
                Alert.alert(
                  "Partial Success", 
                  `${successful} members added successfully. ${failed} members were already assigned to this project.`
                );
              } else {
                Alert.alert(
                  "Info", 
                  "All selected members were already assigned to this project."
                );
              }
            } catch (error) {
              console.error("Error adding members:", error);
              Alert.alert("Error", "Failed to add members to project");
            }
          }}
        />
      )}
    </SafeAreaView>
  );
}

// Edit Project Modal Component - Simplified version using ProjectForm
function EditProjectModal({
  visible,
  project,
  onClose,
  onSave,
}: {
  visible: boolean;
  project: Project;
  onClose: () => void;
  onSave: (project: Project) => void;
}) {
  const { user } = useAuthStore();
  const { getLeadPMForProject, assignUserToProject, removeUserFromProject } = useProjectStoreWithCompanyInit(user?.companyId || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!user) return null;

  const handleSubmit = async (formData: any) => {
    setIsSubmitting(true);

    try {
      const updatedProject: Project = {
        ...project,
        name: formData.name,
        description: formData.description,
        status: formData.status,
        startDate: formData.startDate.toISOString(),
        endDate: formData.endDate.toISOString(),
        location: formData.location,
        clientInfo: formData.clientInfo,
        updatedAt: new Date().toISOString(),
      };

      // Handle Lead PM changes
      const currentLeadPM = getLeadPMForProject(project.id);
      if (formData.selectedLeadPM !== currentLeadPM) {
        if (currentLeadPM) {
          await removeUserFromProject(currentLeadPM, project.id);
        }
        
        if (formData.selectedLeadPM) {
          await assignUserToProject(formData.selectedLeadPM, project.id, "lead_project_manager", user.id);
        }
      }

      onSave(updatedProject);
      onClose();
    } catch (error) {
      console.error("Error updating project:", error);
      Alert.alert("Error", "Failed to update project. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView className="flex-1 bg-gray-50">
        <StatusBar style="dark" />
        
        <StandardHeader
          title="Edit Project"
          showBackButton={true}
          onBackPress={onClose}
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

// Add Member Modal Component
function AddMemberModal({
  visible,
  projectId,
  existingMembers,
  onClose,
  onAdd,
}: {
  visible: boolean;
  projectId: string;
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

  // CHANGED: Admins can see ALL users from ALL companies
  // Non-admins see only users from their company (though they shouldn't reach this modal)
  const allAvailableUsers = React.useMemo(() => {
    if (user?.role === "admin") {
      // Admin: Show ALL users from ALL companies
      return getAllUsers().filter(u => !existingMembers.includes(u.id));
    } else {
      // Non-admin: Show only users from same company (fallback)
      const companyUsers = user?.companyId ? getUsersByCompany(user.companyId) : [];
      return companyUsers.filter(u => !existingMembers.includes(u.id));
    }
  }, [user?.role, user?.companyId, getAllUsers, getUsersByCompany, existingMembers]);

  // Filter by search query and sort favorites to top
  const availableUsers = React.useMemo(() => {
    let filtered = allAvailableUsers;
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = allAvailableUsers.filter(u => {
        const company = getCompanyById(u.companyId);
        return (
          u.name.toLowerCase().includes(query) ||
          (u.email && u.email.toLowerCase().includes(query)) ||
          u.position.toLowerCase().includes(query) ||
          (company && company.name.toLowerCase().includes(query))
        );
      });
    }
    
    // Sort favorites to top
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

  // Reset selected users and search when modal opens/closes
  React.useEffect(() => {
    if (visible) {
      setSelectedUsers([]);
      setSearchQuery("");
    }
  }, [visible]);

  const toggleUser = (userId: string) => {
    setSelectedUsers(prev => {
      if (prev.includes(userId)) {
        return prev.filter(id => id !== userId);
      } else {
        return [...prev, userId];
      }
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
      <SafeAreaView className="flex-1 bg-gray-50">
        <StatusBar style="dark" />
        
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
          {user?.role === "admin" && (
            <Text className="text-sm text-gray-600 mt-2">
              {availableUsers.length} user{availableUsers.length !== 1 ? 's' : ''} available
              {searchQuery && ` (filtered from ${allAvailableUsers.length})`}
              {' • '}Showing users from all companies
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
                      {/* Favorite Star */}
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
                      
                      {/* Checkbox */}
                      <View 
                        className={cn(
                          "w-6 h-6 rounded border-2 items-center justify-center",
                          isSelected 
                            ? "bg-blue-600 border-blue-600" 
                            : "bg-white border-gray-300"
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
            // No results from search
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
            // No users available at all
            <View className="flex-1 items-center justify-center py-16">
              <Ionicons name="people-outline" size={64} color="#9ca3af" />
              <Text className="text-gray-500 text-xl font-medium mt-4">No Available Users</Text>
              <Text className="text-gray-400 text-center mt-2 px-8">
                {user?.role === "admin" 
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

