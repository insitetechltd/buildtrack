import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Picker } from "@react-native-picker/picker";
import { useAuthStore } from "../state/authStore";
import { useProjectStoreWithCompanyInit } from "../state/projectStore.supabase";
import { useUserStoreWithInit } from "../state/userStore.supabase";
import { useCompanyStore } from "../state/companyStore";
import { Project, ProjectStatus } from "../types/buildtrack";
import { cn } from "../utils/cn";
import StandardHeader from "../components/StandardHeader";
import LogoutFAB from "../components/LogoutFAB"; // Keep for screens without create task
import ModalHandle from "../components/ModalHandle";

interface ProjectsScreenProps {
  onNavigateToProjectDetail: (projectId: string) => void;
  onNavigateToCreateProject: () => void;
  onNavigateToUserManagement?: () => void;
  onNavigateBack?: () => void;
}

export default function ProjectsScreen({ 
  onNavigateToProjectDetail, 
  onNavigateToCreateProject,
  onNavigateToUserManagement,
  onNavigateBack
}: ProjectsScreenProps) {
  const { user } = useAuthStore();
  const projectStore = useProjectStoreWithCompanyInit(user?.companyId || "");
  const { getProjectsByCompany, getProjectsByUser, getProjectStats, updateProject, getProjectUserAssignments, assignUserToProject, getLeadPMForProject } = projectStore;
  const userStore = useUserStoreWithInit();
  const { getUserById, getUsersByCompany } = userStore;
  const { getCompanyById, getCompanyBanner } = useCompanyStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | "all">("all");
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  if (!user) return null;

  const currentCompany = user.role === "admin" ? getCompanyById(user.companyId) : null;
  const banner = getCompanyBanner(user.companyId);

  // Get projects based on user role - COMPANY FILTERED
  const allProjects = React.useMemo(() => {
    if (user.role === "admin") {
      // For admins: Only show projects owned by their company
      return getProjectsByCompany(user.companyId);
    } else {
      // For non-admins: Show only projects they're assigned to
      return getProjectsByUser(user.id);
    }
  }, [user.role, user.companyId, user.id, getProjectsByCompany, getProjectsByUser]);
  
  // Filter projects based on search and status
  const filteredProjects = React.useMemo(() => {
    return allProjects.filter(project => {
      const matchesSearch = project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           project.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "all" || project.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [allProjects, searchQuery, statusFilter]);

  const getStatusColor = (status: ProjectStatus) => {
    switch (status) {
      case "active": return "text-green-600 bg-green-50";
      case "planning": return "text-blue-600 bg-blue-50";
      case "on_hold": return "text-yellow-600 bg-yellow-50";
      case "completed": return "text-gray-600 bg-gray-50";
      case "cancelled": return "text-red-600 bg-red-50";
      default: return "text-gray-600 bg-gray-50";
    }
  };

  const ProjectCard = ({ project }: { project: Project }) => {
    const projectStats = getProjectStats(project.id);
    const createdBy = getUserById(project.createdBy);
    const leadPMId = getLeadPMForProject(project.id);
    const leadPM = leadPMId ? getUserById(leadPMId) : null;
    
    return (
      <View className="bg-white border border-gray-200 rounded-xl p-4 mb-3">
        {/* Header */}
        <View className="flex-row items-start justify-between mb-3">
          <Pressable 
            className="flex-1"
            onPress={() => onNavigateToProjectDetail(project.id)}
          >
            <Text className="font-bold text-lg text-gray-900 mb-1" numberOfLines={2}>
              {project.name}
            </Text>
            <Text className="text-sm text-gray-600" numberOfLines={2}>
              {project.description}
            </Text>
          </Pressable>
          <View className="flex-row items-center ml-3">
            <View className={cn("px-3 py-1 rounded-full mr-2", getStatusColor(project.status))}>
              <Text className="text-xs font-medium capitalize">
                {project.status.replace("_", " ")}
              </Text>
            </View>
            {user.role === "admin" && (
              <Pressable
                onPress={() => {
                  setEditingProject(project);
                  setShowEditModal(true);
                }}
                className="w-8 h-8 items-center justify-center bg-blue-50 rounded-lg"
              >
                <Ionicons name="pencil" size={16} color="#3b82f6" />
              </Pressable>
            )}
          </View>
        </View>

        {/* Lead PM Badge */}
        {leadPM && (
          <View className="bg-purple-50 border border-purple-200 rounded-lg px-2 py-1 mb-3 flex-row items-center">
            <Ionicons name="star" size={12} color="#7c3aed" />
            <Text className="text-xs text-purple-700 font-medium ml-1">
              Lead PM: {leadPM.name}
            </Text>
          </View>
        )}

        {/* Project Info */}
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-row items-center">
            <Ionicons name="location-outline" size={14} color="#6b7280" />
            <Text className="text-xs text-gray-500 ml-1">
              {project.location.city}, {project.location.state}
            </Text>
          </View>
          
          <View className="flex-row items-center">
            <Ionicons name="people-outline" size={14} color="#6b7280" />
            <Text className="text-xs text-gray-500 ml-1">
              {projectStats.totalUsers} member{projectStats.totalUsers !== 1 ? "s" : ""}
            </Text>
          </View>
        </View>

        {/* Client and Timeline */}
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-row items-center">
            <Ionicons name="business-outline" size={14} color="#6b7280" />
            <Text className="text-xs text-gray-500 ml-1">
              {project.clientInfo.name}
            </Text>
          </View>
          
          <View className="flex-row items-center">
            <Ionicons name="calendar-outline" size={14} color="#6b7280" />
            <Text className="text-xs text-gray-500 ml-1">
              {new Date(project.startDate).toLocaleDateString()}
            </Text>
          </View>
        </View>

        {/* Budget */}
        {project.budget && (
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <Ionicons name="cash-outline" size={14} color="#6b7280" />
              <Text className="text-xs text-gray-500 ml-1">
                Budget: ${project.budget.toLocaleString()}
              </Text>
            </View>
            
            <View className="flex-row items-center">
              <Text className="text-xs text-gray-500">
                Created by {createdBy?.name || "Unknown"}
              </Text>
            </View>
          </View>
        )}
      </View>
    );
  };

  const StatusFilterButton = ({ 
    status, 
    label 
  }: { 
    status: ProjectStatus | "all"; 
    label: string 
  }) => (
    <Pressable
      onPress={() => setStatusFilter(status)}
      className={cn(
        "px-3 py-1.5 rounded-full border mr-2 mb-2",
        statusFilter === status
          ? "bg-blue-600 border-blue-600"
          : "bg-white border-gray-300"
      )}
    >
      <Text
        className={cn(
          "text-sm font-medium",
          statusFilter === status
            ? "text-white"
            : "text-gray-600"
        )}
      >
        {label}
      </Text>
    </Pressable>
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <StatusBar style="dark" />
      
      {/* Standard Header */}
      <StandardHeader 
        title="Projects"
        showBackButton={!!onNavigateBack}
        onBackPress={onNavigateBack}
        rightElement={
          user.role === "admin" ? (
            <View className="flex-row space-x-2">
              {onNavigateToUserManagement && (
                <Pressable
                  onPress={onNavigateToUserManagement}
                  className="w-10 h-10 bg-purple-600 rounded-full items-center justify-center"
                >
                  <Ionicons name="people" size={20} color="white" />
                </Pressable>
              )}
              <Pressable
                onPress={onNavigateToCreateProject}
                className="w-10 h-10 bg-blue-600 rounded-full items-center justify-center"
              >
                <Ionicons name="add" size={24} color="white" />
              </Pressable>
            </View>
          ) : undefined
        }
      />

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Search Bar */}
        <View className="px-6 pt-4">
          <View className="flex-row items-center bg-gray-100 rounded-lg px-3 py-2 mb-4">
            <Ionicons name="search-outline" size={20} color="#6b7280" />
            <TextInput
              className="flex-1 ml-2 text-gray-900"
              placeholder="Search projects..."
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          {/* Project Count */}
          <Text className="text-sm text-gray-600 mb-4">
            {filteredProjects.length} project{filteredProjects.length !== 1 ? "s" : ""}
            {user.role !== "admin" && " assigned to you"}
          </Text>
        </View>

        {/* Status Filters */}
        <View className="bg-white border-b border-gray-200 px-6 py-3">
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row">
              <StatusFilterButton status="all" label="All" />
              <StatusFilterButton status="active" label="Active" />
              <StatusFilterButton status="planning" label="Planning" />
              <StatusFilterButton status="on_hold" label="On Hold" />
              <StatusFilterButton status="completed" label="Completed" />
              <StatusFilterButton status="cancelled" label="Cancelled" />
            </View>
          </ScrollView>
        </View>

        {/* Project List */}
        <View className="px-6 py-4">
        {filteredProjects.length > 0 ? (
          filteredProjects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))
        ) : (
          <View className="flex-1 items-center justify-center py-16">
            <Ionicons name="folder-open-outline" size={64} color="#9ca3af" />
            <Text className="text-gray-500 text-lg font-medium mt-4">
              {searchQuery ? "No projects found" : "No projects yet"}
            </Text>
            <Text className="text-gray-400 text-center mt-2 px-8">
              {searchQuery 
                ? "Try adjusting your search or filters"
                : user.role === "admin"
                  ? "Create your first project to get started"
                  : "You haven't been assigned to any projects yet"
              }
            </Text>
            {user.role === "admin" && !searchQuery && (
              <Pressable
                onPress={onNavigateToCreateProject}
                className="mt-6 px-6 py-3 bg-blue-600 rounded-lg"
              >
                <Text className="text-white font-semibold">Create Project</Text>
              </Pressable>
            )}
          </View>
        )}
        </View>
      </ScrollView>

      {/* Edit Project Modal */}
      <EditProjectModal
        visible={showEditModal}
        project={editingProject}
        onClose={() => {
          setShowEditModal(false);
          setEditingProject(null);
        }}
        onSave={(updatedProject) => {
          updateProject(updatedProject.id, updatedProject);
          setShowEditModal(false);
          setEditingProject(null);
          Alert.alert("Success", "Project updated successfully");
        }}
      />
    </SafeAreaView>
  );
}

// Edit Project Modal Component
function EditProjectModal({
  visible,
  project,
  onClose,
  onSave,
}: {
  visible: boolean;
  project: Project | null;
  onClose: () => void;
  onSave: (project: Project) => void;
}) {
  const { user } = useAuthStore();
  const { getUsersByCompany } = useUserStoreWithInit();
  const { getLeadPMForProject, assignUserToProject, getProjectUserAssignments, removeUserFromProject } = useProjectStoreWithCompanyInit(user?.companyId || "");

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    status: "planning" as ProjectStatus,
    startDate: new Date(),
    endDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
    location: {
      address: "",
      city: "",
      state: "",
      zipCode: "",
    },
  });

  const [selectedLeadPM, setSelectedLeadPM] = useState<string>("");
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showLeadPMPicker, setShowLeadPMPicker] = useState(false);
  const [showStatusPicker, setShowStatusPicker] = useState(false);

  // Memoize company users - must be called before any conditional returns
  const companyUsers = React.useMemo(() => 
    user?.companyId ? getUsersByCompany(user.companyId) : [], 
    [user?.companyId, getUsersByCompany]
  );

  // Initialize form when project changes (only once)
  React.useEffect(() => {
    if (project) {
      setFormData({
        name: project.name,
        description: project.description,
        status: project.status,
        startDate: new Date(project.startDate),
        endDate: project.endDate ? new Date(project.endDate) : new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
        location: project.location,
      });

      // Get current Lead PM
      const currentLeadPM = getLeadPMForProject(project.id);
      console.log(`ProjectsScreen: Setting Lead PM for project ${project.id}:`, currentLeadPM);
      setSelectedLeadPM(currentLeadPM || "");
    }
  }, [project?.id, getLeadPMForProject]); // Added getLeadPMForProject to dependencies

  // Memoize eligible lead PMs - must be called before any conditional returns
  const eligibleLeadPMs = React.useMemo(() => 
    companyUsers.filter(u => u.role === "manager"), // Only managers can be Lead PM, not admins
    [companyUsers]
  );

  if (!user || !project) return null;

  const handleSave = () => {
    if (!formData.name.trim()) {
      Alert.alert("Error", "Project name is required");
      return;
    }

    if (formData.endDate <= formData.startDate) {
      Alert.alert("Error", "End date must be after start date");
      return;
    }

    // Update project info
    const updatedProject: Project = {
      ...project,
      name: formData.name,
      description: formData.description,
      status: formData.status,
      startDate: formData.startDate.toISOString(),
      endDate: formData.endDate.toISOString(),
      location: formData.location,
      updatedAt: new Date().toISOString(),
    };

    // Update Lead PM if changed
    const currentLeadPM = getLeadPMForProject(project.id);
    if (selectedLeadPM !== currentLeadPM) {
      // Remove old Lead PM if exists
      if (currentLeadPM) {
        removeUserFromProject(currentLeadPM, project.id);
      }
      
      // Assign new Lead PM if selected
      if (selectedLeadPM) {
        assignUserToProject(selectedLeadPM, project.id, "lead_project_manager", user.id);
      }
    }

    onSave(updatedProject);
  };

  return (
    <>
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView className="flex-1 bg-gray-50">
        <StatusBar style="dark" />
        
        <ModalHandle />

        {/* Header */}
        <View className="flex-row items-center bg-white border-b border-gray-200 px-6 py-4">
          <Pressable onPress={onClose} className="mr-4 w-10 h-10 items-center justify-center">
            <Ionicons name="close" size={24} color="#374151" />
          </Pressable>
          <Text className="text-xl font-semibold text-gray-900 flex-1">
            Edit Project
          </Text>
          <Pressable onPress={handleSave} className="px-4 py-2 bg-blue-600 rounded-lg">
            <Text className="text-white font-medium">Save</Text>
          </Pressable>
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1"
        >
          <ScrollView className="flex-1 px-4 py-3" keyboardShouldPersistTaps="handled">
            {/* Project Information */}
            <View className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
              <Text className="text-xl font-bold text-gray-900 mb-4">Project Information</Text>
              
              <View className="space-y-4">
                {/* Project Name */}
                <View>
                  <Text className="text-sm font-medium text-gray-700 mb-2">
                    Project Name <Text className="text-red-500">*</Text>
                  </Text>
                  <TextInput
                    className="border border-gray-300 rounded-lg px-4 py-3 text-gray-900 bg-gray-50 text-lg"
                    placeholder="Enter project name"
                    value={formData.name}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
                    maxLength={100}
                  />
                </View>

                {/* Description */}
                <View>
                  <Text className="text-sm font-medium text-gray-700 mb-2">Description</Text>
                  <TextInput
                    className="border border-gray-300 rounded-lg px-4 py-3 text-gray-900 bg-gray-50 text-lg"
                    placeholder="Project description"
                    value={formData.description}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                    maxLength={500}
                  />
                </View>

                {/* Status */}
                <View>
                  <Text className="text-sm font-medium text-gray-700 mb-2">Status</Text>
                  
                  {/* Custom Status Dropdown */}
                  <Pressable
                    onPress={() => setShowStatusPicker(!showStatusPicker)}
                    className="border border-gray-300 rounded-lg px-4 py-3 bg-gray-50 flex-row items-center justify-between"
                  >
                    <Text className="text-gray-900 text-base capitalize">
                      {formData.status.replace("_", " ")}
                    </Text>
                    <Ionicons 
                      name={showStatusPicker ? "chevron-up" : "chevron-down"} 
                      size={20} 
                      color="#6b7280" 
                    />
                  </Pressable>
                  
                  {/* Status Dropdown Options */}
                  {showStatusPicker && (
                    <View className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg">
                      {["planning", "active", "on_hold", "completed", "cancelled"].map((status, index) => (
                        <Pressable
                          key={status}
                          onPress={() => {
                            setFormData(prev => ({ ...prev, status: status as ProjectStatus }));
                            setShowStatusPicker(false);
                          }}
                          className={cn(
                            "px-4 py-3",
                            formData.status === status && "bg-blue-50",
                            index < 4 && "border-b border-gray-200"
                          )}
                        >
                          <Text className={cn(
                            "text-base capitalize",
                            formData.status === status ? "text-blue-900 font-medium" : "text-gray-900"
                          )}>
                            {status.replace("_", " ")}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  )}
                </View>
              </View>
            </View>

            {/* Location */}
            <View className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
              <Text className="text-xl font-bold text-gray-900 mb-3">Location</Text>
              
              <View>
                <TextInput
                  className="border border-gray-300 rounded-lg px-4 py-3 text-gray-900 bg-gray-50 text-base"
                  placeholder="Enter full address (street, city, state/province, postal code, country)"
                  value={formData.location.address}
                  onChangeText={(text) => setFormData(prev => ({
                    ...prev,
                    location: { ...prev.location, address: text }
                  }))}
                  multiline={true}
                  numberOfLines={5}
                  textAlignVertical="top"
                />
              </View>
            </View>

            {/* Project Timeline */}
            <View className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
              <Text className="text-xl font-bold text-gray-900 mb-4">Project Timeline</Text>
              
              <View className="flex-row space-x-4">
                <View className="flex-1">
                  <Text className="text-sm font-medium text-gray-700 mb-2">Start Date</Text>
                  <Pressable
                    onPress={() => setShowStartDatePicker(true)}
                    className="border border-gray-300 rounded-lg px-4 py-3 bg-gray-50 flex-row items-center justify-between"
                  >
                    <Text className="text-gray-900 text-base">
                      {formData.startDate.toLocaleDateString()}
                    </Text>
                    <Ionicons name="calendar-outline" size={20} color="#6b7280" />
                  </Pressable>
                </View>

                <View className="flex-1">
                  <Text className="text-sm font-medium text-gray-700 mb-2">Estimated End Date</Text>
                  <Pressable
                    onPress={() => setShowEndDatePicker(true)}
                    className="border border-gray-300 rounded-lg px-4 py-3 bg-gray-50 flex-row items-center justify-between"
                  >
                    <Text className="text-gray-900 text-base">
                      {formData.endDate.toLocaleDateString()}
                    </Text>
                    <Ionicons name="calendar-outline" size={20} color="#6b7280" />
                  </Pressable>
                </View>
              </View>
            </View>

            {/* Lead Project Manager */}
            <View className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
              <Text className="text-xl font-bold text-gray-900 mb-4">Lead Project Manager</Text>
              
              <View className="space-y-3">
                <Text className="text-sm text-gray-600">
                  The Lead PM has full visibility to all tasks and subtasks in this project
                </Text>
                
                <View>
                  <Text className="text-xs text-gray-500 mb-2">Debug: selectedLeadPM = "{selectedLeadPM}"</Text>
                  
                  {/* Custom Dropdown Picker */}
                  <Pressable
                    onPress={() => setShowLeadPMPicker(!showLeadPMPicker)}
                    className="border border-gray-300 rounded-lg px-4 py-3 bg-gray-50 flex-row items-center justify-between"
                  >
                    <Text className="text-gray-900 text-base">
                      {selectedLeadPM 
                        ? eligibleLeadPMs.find(u => u.id === selectedLeadPM)?.name + ` (${eligibleLeadPMs.find(u => u.id === selectedLeadPM)?.role})`
                        : "No Lead PM (Select one)"
                      }
                    </Text>
                    <Ionicons 
                      name={showLeadPMPicker ? "chevron-up" : "chevron-down"} 
                      size={20} 
                      color="#6b7280" 
                    />
                  </Pressable>
                  
                  {/* Dropdown Options */}
                  {showLeadPMPicker && (
                    <View className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg">
                      <Pressable
                        onPress={() => {
                          setSelectedLeadPM("");
                          setShowLeadPMPicker(false);
                          console.log(`ProjectsScreen: Lead PM changed to: ""`);
                        }}
                        className="px-4 py-3 border-b border-gray-200"
                      >
                        <Text className="text-gray-900 text-base">No Lead PM (Select one)</Text>
                      </Pressable>
                      {eligibleLeadPMs.map((user) => (
                        <Pressable
                          key={user.id}
                          onPress={() => {
                            setSelectedLeadPM(user.id);
                            setShowLeadPMPicker(false);
                            console.log(`ProjectsScreen: Lead PM changed to:`, user.id);
                          }}
                          className={cn(
                            "px-4 py-3",
                            user.id === selectedLeadPM && "bg-blue-50",
                            user.id !== eligibleLeadPMs[eligibleLeadPMs.length - 1].id && "border-b border-gray-200"
                          )}
                        >
                          <Text className={cn(
                            "text-base",
                            user.id === selectedLeadPM ? "text-blue-900 font-medium" : "text-gray-900"
                          )}>
                            {user.name} ({user.role})
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  )}
                </View>
              </View>
            </View>

            <View className="h-20" />
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Date Pickers */}
        {showStartDatePicker && (
          <DateTimePicker
            value={formData.startDate}
            mode="date"
            display="default"
            onChange={(_event, selectedDate) => {
              setShowStartDatePicker(false);
              if (selectedDate) {
                setFormData(prev => ({ ...prev, startDate: selectedDate }));
              }
            }}
          />
        )}

        {showEndDatePicker && (
          <DateTimePicker
            value={formData.endDate}
            mode="date"
            display="default"
            minimumDate={formData.startDate}
            onChange={(_event, selectedDate) => {
              setShowEndDatePicker(false);
              if (selectedDate) {
                setFormData(prev => ({ ...prev, endDate: selectedDate }));
              }
            }}
          />
        )}
      </SafeAreaView>
    </Modal>

    {/* Logout FAB */}
    <LogoutFAB />
    </>
  );
}