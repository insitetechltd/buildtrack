import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Modal,
  Image,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../state/authStore";
import { useProjectStoreWithCompanyInit } from "../state/projectStore.supabase";
import { useUserStoreWithInit } from "../state/userStore.supabase";
import { useCompanyStore } from "../state/companyStore";
import { User, Project, UserCategory } from "../types/buildtrack";
import { cn } from "../utils/cn";
import StandardHeader from "../components/StandardHeader";
import ModalHandle from "../components/ModalHandle";
import { notifyDataMutation } from "../utils/DataRefreshManager";

interface UserManagementScreenProps {
  onNavigateBack: () => void;
}

export default function UserManagementScreen({ onNavigateBack }: UserManagementScreenProps) {
  const { user: currentUser } = useAuthStore();
  const { getProjectsByCompany, assignUserToProject, removeUserFromProject, getUserProjectAssignments } = useProjectStoreWithCompanyInit(currentUser.companyId);
  const userStore = useUserStoreWithInit();
  const { getUsersByCompany, getAdminCountByCompany, fetchUsers } = userStore;
  const { getCompanyById, getCompanyBanner } = useCompanyStore();

  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<UserCategory>("worker");
  const [activeModal, setActiveModal] = useState<'assign' | 'project' | 'category' | 'success' | 'removeConfirm' | 'invite' | null>(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [removeData, setRemoveData] = useState<{userId: string, projectId: string, userName: string, projectName: string} | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Handle pull-to-refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetchUsers();
      console.log('✅ User list refreshed successfully');
    } catch (error) {
      console.error('❌ Error refreshing users:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  if (!currentUser || currentUser.role !== "admin") {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <StatusBar style="dark" />
        <View className="flex-1 items-center justify-center">
          <Text className="text-gray-500">Access denied. Admin role required.</Text>
          <Pressable onPress={onNavigateBack} className="mt-4 px-4 py-2 bg-blue-600 rounded-lg">
            <Text className="text-white">Go Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // Only show users from the same company
  const companyUsers = currentUser.companyId 
    ? getUsersByCompany(currentUser.companyId)
    : [];
  const projects = currentUser.companyId ? getProjectsByCompany(currentUser.companyId) : [];
  const currentCompany = currentUser.companyId ? getCompanyById(currentUser.companyId) : null;
  
  // Debug logging
  console.log('=== USER MANAGEMENT DEBUG ===');
  console.log('Current User:', currentUser.name, currentUser.email);
  console.log('Current User Company ID:', currentUser.companyId);
  console.log('Current User Company_id:', currentUser.company_id);
  console.log('All Users in Store:', useUserStoreWithInit().getAllUsers().length);
  console.log('Company Users Found:', companyUsers.length);
  console.log('All Users Details:', useUserStoreWithInit().getAllUsers().map(u => ({ 
    id: u.id, 
    name: u.name, 
    companyId: u.companyId, 
    company_id: u.company_id 
  })));
  console.log('Filtered Users Details:', companyUsers.map(u => ({ 
    id: u.id, 
    name: u.name, 
    companyId: u.companyId, 
    company_id: u.company_id 
  })));
  console.log('============================');
  
  const filteredUsers = companyUsers.filter(u => 
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.email && u.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  /**
   * Get color styling for PROJECT ROLE (category) badges
   * 
   * Note: "category" refers to PROJECT ROLE, not job title
   * Example: A user with job title "manager" can have category "contractor" on a project
   */
  const getCategoryColor = (category: UserCategory) => {
    const colors = {
      lead_project_manager: "bg-purple-50 text-purple-600 border-purple-200",
      contractor: "bg-blue-50 text-blue-600 border-blue-200", 
      subcontractor: "bg-green-50 text-green-600 border-green-200",
      inspector: "bg-red-50 text-red-600 border-red-200",
      architect: "bg-indigo-50 text-indigo-600 border-indigo-200",
      engineer: "bg-orange-50 text-orange-600 border-orange-200",
      worker: "bg-gray-50 text-gray-600 border-gray-200",
      foreman: "bg-yellow-50 text-yellow-600 border-yellow-200",
    };
    return colors[category] || colors.worker;
  };

  /**
   * Get display label for PROJECT ROLE (category)
   * 
   * Note: This is for project-specific roles, not system-wide job titles
   */
  const getCategoryLabel = (category: UserCategory) => {
    const labels = {
      lead_project_manager: "Lead Project Manager",
      contractor: "Contractor",
      subcontractor: "Subcontractor", 
      inspector: "Inspector",
      architect: "Architect",
      engineer: "Engineer",
      worker: "Worker",
      foreman: "Foreman",
    };
    return labels[category] || category;
  };

  const handleAssignUser = () => {
    if (!selectedUser || !selectedProject) return;

    // Assign user to project with a PROJECT ROLE (category)
    // Note: selectedCategory is the PROJECT ROLE (what they do on this project),
    //       NOT their job title (admin/manager/worker)
    assignUserToProject(selectedUser.id, selectedProject.id, selectedCategory, currentUser.id);
    
    // Notify all users about the assignment
    notifyDataMutation('assignment');
    
    setSuccessMessage(`${selectedUser.name} has been assigned to ${selectedProject.name} as ${getCategoryLabel(selectedCategory)}.`);
    setActiveModal('success');
    
    setSelectedUser(null);
    setSelectedProject(null);
    setSelectedCategory("worker");
  };

  const handleRemoveUser = (userId: string, projectId: string, userName: string, projectName: string) => {
    setRemoveData({ userId, projectId, userName, projectName });
    setActiveModal('removeConfirm');
  };

  const confirmRemoveUser = () => {
    if (!removeData) return;
    
    removeUserFromProject(removeData.userId, removeData.projectId);
    
    // Notify all users about the removal
    notifyDataMutation('assignment');
    
    setSuccessMessage(`${removeData.userName} has been removed from ${removeData.projectName}.`);
    setActiveModal('success');
    setRemoveData(null);
  };

  const UserCard = ({ user }: { user: User }) => {
    const userAssignments = getUserProjectAssignments(user.id);
    const isLastAdmin = user.role === "admin" && getAdminCountByCompany(user.companyId) === 1;
    
    // Debug logging for user assignments
    console.log(`=== USER ASSIGNMENTS DEBUG for ${user.name} ===`);
    console.log('- User ID:', user.id);
    console.log('- User Assignments:', userAssignments);
    console.log('- Available Projects:', projects.map(p => ({ id: p.id, name: p.name })));
    console.log('==========================================');
    
    return (
      <View className="bg-white border border-gray-200 rounded-xl p-4 mb-3">
        {/* User Info */}
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-1">
            <View className="flex-row items-center gap-2">
              <View className="flex-row items-center gap-1">
                <Text className="font-semibold text-gray-900 text-lg">
                  {user.name}
                </Text>
                {user.role === "admin" && (
                  <Ionicons name="star" size={16} color="#7c3aed" />
                )}
              </View>
              {user.role === "admin" && (
                <View className="bg-purple-100 px-2 py-1 rounded">
                  <Text className="text-purple-700 text-sm font-bold">ADMIN</Text>
                </View>
              )}
              {isLastAdmin && (
                <View className="bg-amber-100 px-2 py-1 rounded flex-row items-center">
                  <Ionicons name="shield-checkmark" size={12} color="#d97706" />
                  <Text className="text-amber-700 text-sm font-bold ml-1">Protected</Text>
                </View>
              )}
            </View>
            <Text className="text-base text-gray-600">
              {user.email}
            </Text>
            <View className="flex-row items-center mt-1">
              <Ionicons name="person-outline" size={14} color="#6b7280" />
              <Text className="text-sm text-gray-500 ml-1 capitalize">
                {user.role} • {user.position}
              </Text>
            </View>
          </View>
          
          <Pressable
            onPress={() => {
              setSelectedUser(user);
              setActiveModal('assign');
            }}
            className="px-3 py-2 bg-blue-600 rounded-lg"
          >
            <Text className="text-white text-sm font-medium">Assign</Text>
          </Pressable>
        </View>

        {/* Project Assignments */}
        {userAssignments.length > 0 ? (
          <View>
            <Text className="text-base font-medium text-gray-700 mb-2">
              Project Assignments ({userAssignments.length})
            </Text>
            <View className="space-y-2">
              {userAssignments.map((assignment) => {
                const project = projects.find(p => p.id === assignment.projectId);
                if (!project) return null;
                
                return (
                  <View key={assignment.projectId} className="flex-row items-center justify-between bg-gray-50 rounded-lg p-2">
                    <View className="flex-1">
                      <Text className="text-base font-medium text-gray-900">
                        {project.name}
                      </Text>
                      <View className={cn("inline-flex px-2 py-1 rounded border mt-1", getCategoryColor(assignment.category))}>
                        <Text className="text-sm font-medium">
                          {getCategoryLabel(assignment.category)}
                        </Text>
                      </View>
                    </View>
                    
                    <Pressable
                      onPress={() => handleRemoveUser(user.id, project.id, user.name, project.name)}
                      className="ml-2 p-1"
                    >
                      <Ionicons name="close-circle" size={20} color="#ef4444" />
                    </Pressable>
                  </View>
                );
              })}
            </View>
          </View>
        ) : (
          <View className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <Text className="text-yellow-800 text-base">
              Not assigned to any projects
            </Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <StatusBar style="dark" />
      
      {/* Standard Header */}
      <StandardHeader 
        title="User Management"
        showBackButton={true}
        onBackPress={onNavigateBack}
      />

      <View className="bg-white border-b border-gray-200 px-6 py-4">
        {/* Company Info Banner */}
        {currentCompany && (
          <View className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
            <View className="flex-row items-center">
              <Ionicons name="business" size={16} color="#3b82f6" />
              <Text className="text-blue-900 font-medium ml-2 flex-1">
                {currentCompany.name}
              </Text>
            </View>
            <Text className="text-blue-700 text-sm mt-1">
              Showing users from your company only
            </Text>
          </View>
        )}


        {/* Search Bar and Invite Button */}
        <View className="flex-row items-center mb-4 gap-2">
          <View className="flex-1 flex-row items-center bg-gray-100 rounded-lg px-3 py-2">
            <Ionicons name="search-outline" size={20} color="#6b7280" />
            <TextInput
              className="flex-1 ml-2 text-gray-900"
              placeholder="Search users..."
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          <Pressable
            onPress={() => setActiveModal('invite')}
            className="bg-green-600 rounded-lg px-4 py-2 flex-row items-center"
          >
            <Ionicons name="mail" size={18} color="white" />
            <Text className="text-white font-medium ml-1">Invite</Text>
          </Pressable>
        </View>

        <Text className="text-base text-gray-600">
          {filteredUsers.length} user{filteredUsers.length !== 1 ? "s" : ""} in your company
        </Text>
      </View>

      {/* User List */}
      <ScrollView 
        className="flex-1 px-6 py-4" 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
      >
        {filteredUsers.length === 0 ? (
          <View className="flex-1 items-center justify-center py-12">
            <View className="w-20 h-20 bg-gray-100 rounded-full items-center justify-center mb-4">
              <Ionicons name="people-outline" size={40} color="#9ca3af" />
            </View>
            <Text className="text-xl font-semibold text-gray-900 mb-2">
              No Users Found
            </Text>
            <Text className="text-base text-gray-600 text-center px-8 mb-6">
              {searchQuery 
                ? "No users match your search criteria"
                : "No users in your company yet. Invite team members to get started."
              }
            </Text>
            {!searchQuery && (
              <Pressable
                onPress={() => setActiveModal('invite')}
                className="bg-blue-600 rounded-lg px-6 py-3"
              >
                <Text className="text-white font-medium">Invite Users</Text>
              </Pressable>
            )}
          </View>
        ) : (
          filteredUsers.map((user) => (
            <UserCard key={user.id} user={user} />
          ))
        )}
      </ScrollView>

      {/* Assignment Modal */}
      <Modal
        visible={activeModal === 'assign'}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView className="flex-1 bg-gray-50">
          <ModalHandle />
          
          <View className="flex-row items-center bg-white border-b border-gray-200 px-6 py-4">
            <Pressable 
              onPress={() => setActiveModal(null)}
              className="mr-4"
            >
              <Text className="text-blue-600 font-medium">Cancel</Text>
            </Pressable>
            <Text className="text-xl font-semibold text-gray-900 flex-1">
              Assign User to Project
            </Text>
            <Pressable
              onPress={handleAssignUser}
              disabled={!selectedUser || !selectedProject}
              className={cn(
                "px-4 py-2 rounded-lg",
                (!selectedUser || !selectedProject) ? "bg-gray-300" : "bg-blue-600"
              )}
            >
              <Text className="text-white font-medium">Assign</Text>
            </Pressable>
          </View>

          <ScrollView 
            className="flex-1 px-6 py-4"
            keyboardShouldPersistTaps="handled"
          >
            {selectedUser && (
              <View className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
                <Text className="text-xl font-semibold text-gray-900 mb-2">
                  Selected User
                </Text>
                <Text className="text-lg font-medium text-gray-900">
                  {selectedUser.name}
                </Text>
                <Text className="text-base text-gray-600">
                  {selectedUser.email} • {selectedUser.role}
                </Text>
              </View>
            )}

            <View className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
              <Text className="text-xl font-semibold text-gray-900 mb-4">
                Select Project
              </Text>
              <Pressable
                onPress={() => {
                  console.log("Project picker button pressed");
                  setActiveModal('project');
                }}
                className="border border-gray-300 rounded-lg bg-gray-50 p-4"
              >
                <View className="flex-row items-center justify-between">
                  <Text className={selectedProject ? "text-gray-900" : "text-gray-500"}>
                    {selectedProject ? selectedProject.name : "Select a project..."}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color="#6b7280" />
                </View>
              </Pressable>
            </View>

            <View className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
              <Text className="text-xl font-semibold text-gray-900 mb-4">
                Select Category
              </Text>
              <Pressable
                onPress={() => {
                  console.log("Category picker button pressed");
                  setActiveModal('category');
                }}
                className="border border-gray-300 rounded-lg bg-gray-50 p-4"
              >
                <View className="flex-row items-center justify-between">
                  <Text className="text-gray-900">
                    {getCategoryLabel(selectedCategory)}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color="#6b7280" />
                </View>
              </Pressable>

              <View className={cn("mt-3 p-3 rounded-lg border", getCategoryColor(selectedCategory))}>
                <Text className="text-base font-medium">
                  Preview: {getCategoryLabel(selectedCategory)}
                </Text>
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Project Picker Modal */}
      <Modal
        visible={activeModal === 'project'}
        animationType="slide"
        presentationStyle="formSheet"
      >
        <SafeAreaView className="flex-1 bg-gray-50">
          <ModalHandle />
          
          <View className="flex-row items-center bg-white border-b border-gray-200 px-6 py-4">
            <Pressable 
              onPress={() => setActiveModal('assign')}
              className="mr-4"
            >
              <Text className="text-blue-600 font-medium">Done</Text>
            </Pressable>
            <Text className="text-xl font-semibold text-gray-900 flex-1">
              Select Project
            </Text>
          </View>

          <ScrollView className="flex-1">
            {projects.length === 0 ? (
              <View className="p-6">
                <Text className="text-center text-gray-500">No projects available</Text>
              </View>
            ) : (
              projects.map((project) => (
                <Pressable
                  key={project.id}
                  onPress={() => {
                    setSelectedProject(project);
                    setActiveModal('assign');
                  }}
                  className={cn(
                    "flex-row items-center justify-between px-6 py-4 border-b border-gray-200",
                    selectedProject?.id === project.id ? "bg-blue-50" : "bg-white"
                  )}
                >
                  <Text className={cn(
                    "text-lg",
                    selectedProject?.id === project.id ? "text-blue-600 font-semibold" : "text-gray-900"
                  )}>
                    {project.name}
                  </Text>
                  {selectedProject?.id === project.id && (
                    <Ionicons name="checkmark" size={24} color="#3b82f6" />
                  )}
                </Pressable>
              ))
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Category Picker Modal */}
      {/* 
        IMPORTANT: "Category" here means PROJECT ROLE
        This is what the user will DO on this specific project,
        not their system-wide job title (admin/manager/worker)
      */}
      <Modal
        visible={activeModal === 'category'}
        animationType="slide"
        presentationStyle="formSheet"
      >
        <SafeAreaView className="flex-1 bg-gray-50">
          <ModalHandle />
          
          <View className="flex-row items-center bg-white border-b border-gray-200 px-6 py-4">
            <Pressable 
              onPress={() => setActiveModal('assign')}
              className="mr-4"
            >
              <Text className="text-blue-600 font-medium">Done</Text>
            </Pressable>
            <Text className="text-xl font-semibold text-gray-900 flex-1">
              Select Project Role
            </Text>
          </View>

          <ScrollView className="flex-1">
            {/* All available PROJECT ROLES (what they do on the project) */}
            {(["lead_project_manager", "contractor", "subcontractor", "inspector", "architect", "engineer", "worker", "foreman"] as UserCategory[]).map((category) => (
              <Pressable
                key={category}
                onPress={() => {
                  setSelectedCategory(category);
                  setActiveModal('assign');
                }}
                className={cn(
                  "px-6 py-4 border-b border-gray-200",
                  selectedCategory === category ? "bg-blue-50" : "bg-white"
                )}
              >
                <View className="flex-row items-center justify-between">
                  <View>
                    <Text className={cn(
                      "text-lg",
                      selectedCategory === category ? "text-blue-600 font-semibold" : "text-gray-900"
                    )}>
                      {getCategoryLabel(category)}
                    </Text>
                    <View className={cn("inline-flex px-2 py-1 rounded border mt-2", getCategoryColor(category))}>
                      <Text className="text-sm font-medium">
                        {getCategoryLabel(category)}
                      </Text>
                    </View>
                  </View>
                  {selectedCategory === category && (
                    <Ionicons name="checkmark" size={24} color="#3b82f6" />
                  )}
                </View>
              </Pressable>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Success Modal */}
      <Modal
        visible={activeModal === 'success'}
        transparent
        animationType="fade"
      >
        <View className="flex-1 bg-black/50 items-center justify-center p-6">
          <View className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <View className="items-center mb-4">
              <View className="w-16 h-16 bg-green-100 rounded-full items-center justify-center mb-3">
                <Ionicons name="checkmark-circle" size={40} color="#10b981" />
              </View>
              <Text className="text-2xl font-bold text-gray-900 mb-2">Success!</Text>
              <Text className="text-center text-gray-600">{successMessage}</Text>
            </View>
            <Pressable
              onPress={() => setActiveModal(null)}
              className="bg-blue-600 rounded-lg py-3 items-center"
            >
              <Text className="text-white font-semibold">OK</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Remove Confirmation Modal */}
      <Modal
        visible={activeModal === 'removeConfirm'}
        transparent
        animationType="fade"
      >
        <View className="flex-1 bg-black/50 items-center justify-center p-6">
          <View className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <View className="items-center mb-4">
              <View className="w-16 h-16 bg-red-100 rounded-full items-center justify-center mb-3">
                <Ionicons name="warning" size={40} color="#ef4444" />
              </View>
              <Text className="text-2xl font-bold text-gray-900 mb-2">Remove Assignment</Text>
              <Text className="text-center text-gray-600">
                Remove {removeData?.userName} from {removeData?.projectName}?
              </Text>
            </View>
            <View className="flex-row gap-3">
              <Pressable
                onPress={() => {
                  setActiveModal(null);
                  setRemoveData(null);
                }}
                className="flex-1 bg-gray-200 rounded-lg py-3 items-center"
              >
                <Text className="text-gray-900 font-semibold">Cancel</Text>
              </Pressable>
              <Pressable
                onPress={confirmRemoveUser}
                className="flex-1 bg-red-600 rounded-lg py-3 items-center"
              >
                <Text className="text-white font-semibold">Remove</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}