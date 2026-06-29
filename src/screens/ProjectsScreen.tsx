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
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useAuthStore } from "../state/authStore";
import { useProjectStoreWithCompanyInit } from "../state/projectStore.supabase";
import { useUserStoreWithInit } from "../state/userStore.supabase";
import { getUserSystemPermission, Project, ProjectStatus } from "../types/buildtrack";
import { cn } from "../utils/cn";
import StandardHeader from "../components/StandardHeader";
import LogoutFAB from "../components/LogoutFAB"; // Keep for screens without create task
import ModalHandle from "../components/ModalHandle";
import { useTranslation } from "../utils/useTranslation";
import { useDateFormatter } from "../utils/dateFormatter";
import { useProjectsViewAdapter } from "../ui/viewAdapters/useProjectsViewAdapter";
import type {
  ProjectsScreenFilterOption,
  ProjectsScreenProjectItem,
} from "../ui/contracts/viewAdapters";

interface ProjectsScreenProps {
  onNavigateToProjectDetail: (projectId: string) => void;
  onNavigateToCreateProject: () => void;
  onNavigateToUserManagement?: () => void;
  onNavigateBack?: () => void;
  newProjectId?: string;
}

export default function ProjectsScreen({ 
  onNavigateToProjectDetail, 
  onNavigateToCreateProject,
  onNavigateToUserManagement,
  onNavigateBack,
  newProjectId
}: ProjectsScreenProps) {
  const t = useTranslation();
  const { output, actions } = useProjectsViewAdapter({ newProjectId });

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

  const ProjectCard = ({ project }: { project: ProjectsScreenProjectItem }) => {
    return (
      <View className="bg-white border border-gray-200 rounded-xl p-4 mb-3">
        <View className="flex-row items-start justify-between mb-3">
          <Pressable 
            className="flex-1"
            onPress={() => onNavigateToProjectDetail(project.projectId)}
          >
            <Text className="font-bold text-xl text-gray-900 mb-1" numberOfLines={2}>
              {project.title}
            </Text>
            <Text className="text-base text-gray-600" numberOfLines={2}>
              {project.description}
            </Text>
          </Pressable>
          <View className="flex-row items-center ml-3">
            <View
              className={cn(
                "px-3 py-1 rounded-full mr-2",
                getStatusColor(project.statusValue),
              )}
            >
              <Text className="text-sm font-medium capitalize">
                {project.statusLabel}
              </Text>
            </View>
            {project.canEdit && (
              <Pressable
                testID={`projects-edit-${project.projectId}`}
                onPress={() => actions.openEditProject(project.projectId)}
                className="w-8 h-8 items-center justify-center bg-blue-50 rounded-lg"
              >
                <Ionicons name="pencil" size={16} color="#3b82f6" />
              </Pressable>
            )}
          </View>
        </View>

        {project.leadPmName && (
          <View className="bg-purple-50 border border-purple-200 rounded-lg px-2 py-1 mb-3 flex-row items-center">
            <Ionicons name="star" size={12} color="#7c3aed" />
            <Text className="text-sm text-purple-700 font-medium ml-1">
              {t.projects.leadPM}: {project.leadPmName}
            </Text>
          </View>
        )}

        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-row items-center flex-1 mr-2">
            <Ionicons name="location-outline" size={14} color="#6b7280" />
            <Text className="text-sm text-gray-500 ml-1 flex-1" numberOfLines={1} ellipsizeMode="tail">
              {project.locationLabel}
            </Text>
          </View>
          
          <View className="flex-row items-center">
            <Ionicons name="people-outline" size={14} color="#6b7280" />
            <Text className="text-sm text-gray-500 ml-1">
              {project.memberCountLabel}
            </Text>
          </View>
        </View>

        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-row items-center">
            <Ionicons name="business-outline" size={14} color="#6b7280" />
            <Text className="text-sm text-gray-500 ml-1">
              {project.clientName}
            </Text>
          </View>
          
          <View className="flex-row items-center">
            <Ionicons name="calendar-outline" size={14} color="#6b7280" />
            <Text className="text-sm text-gray-500 ml-1">
              {project.startDateLabel}
            </Text>
          </View>
        </View>

        {project.budgetLabel && (
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <Ionicons name="cash-outline" size={14} color="#6b7280" />
              <Text className="text-sm text-gray-500 ml-1">
                {project.budgetLabel}
              </Text>
            </View>
            
            <View className="flex-row items-center">
              <Text className="text-sm text-gray-500">
                {t.projects.createdBy} {project.createdByLabel}
              </Text>
            </View>
          </View>
        )}
      </View>
    );
  };

  const StatusFilterButton = ({ 
    option,
  }: { 
    option: ProjectsScreenFilterOption;
  }) => (
    <Pressable
      onPress={() => actions.selectStatusFilter(option.value)}
      className={cn(
        "px-3 py-1.5 rounded-full border mr-2 mb-2",
        option.isSelected
          ? "bg-blue-600 border-blue-600"
          : "bg-white border-gray-300"
      )}
    >
      <Text
        className={cn(
          "text-base font-medium",
          option.isSelected
            ? "text-white"
            : "text-gray-600"
        )}
      >
        {option.label}
      </Text>
    </Pressable>
  );

  if (!output.readiness.hasUsableData && !output.continuity.isInitialLoading) {
    return null;
  }

  return (
    <>
    <SafeAreaView edges={['bottom', 'left', 'right']} className="flex-1 bg-gray-50">
      <StatusBar style="dark" />
      
      <StandardHeader 
        title={t.projects.projects}
        showBackButton={!!onNavigateBack}
        onBackPress={onNavigateBack}
        rightElement={
          output.isAdmin ? (
            <View className="flex-row space-x-2">
              {onNavigateToUserManagement && (
                <Pressable
                  testID="projects-user-management-action"
                  onPress={onNavigateToUserManagement}
                  className="w-10 h-10 bg-purple-600 rounded-full items-center justify-center"
                >
                  <Ionicons name="people" size={20} color="white" />
                </Pressable>
              )}
              <Pressable
                testID="projects-create-action"
                onPress={onNavigateToCreateProject}
                className="w-10 h-10 bg-blue-600 rounded-full items-center justify-center"
              >
                <Ionicons name="add" size={24} color="white" />
              </Pressable>
            </View>
          ) : undefined
        }
      />

      <ScrollView 
        className="flex-1" 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={output.isRefreshing} onRefresh={() => void actions.handleRefresh()} />
        }
      >
        <View className="px-6 pt-4">
          <View className="flex-row items-center bg-gray-100 rounded-lg px-3 py-2 mb-4">
            <Ionicons name="search-outline" size={20} color="#6b7280" />
            <TextInput
              className="flex-1 ml-2 text-gray-900"
              placeholder={t.projects.searchProjects}
              value={output.searchQuery}
              onChangeText={actions.setSearchQuery}
            />
          </View>

          <Text className="text-base text-gray-600 mb-4">
            {output.projectCountLabel}
          </Text>
        </View>

        <View className="bg-white border-b border-gray-200 px-6 py-3">
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row">
              {output.filterOptions.map((option) => (
                <StatusFilterButton key={option.id} option={option} />
              ))}
            </View>
          </ScrollView>
        </View>

        <View className="px-6 py-4">
        {output.continuity.isInitialLoading ? (
          <View className="flex-1 items-center justify-center py-16">
            <ActivityIndicator size="large" color="#2563eb" />
            <Text className="text-gray-500 text-lg font-medium mt-4">
              {t.projects.loadingProjects}
            </Text>
          </View>
        ) : output.projectItems.length > 0 ? (
          output.projectItems.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))
        ) : (
          <View className="flex-1 items-center justify-center py-16">
            <Ionicons name="folder-open-outline" size={64} color="#9ca3af" />
            <Text className="text-gray-500 text-xl font-medium mt-4">
              {output.emptyState.title}
            </Text>
            <Text className="text-gray-400 text-center mt-2 px-8">
              {output.emptyState.message}
            </Text>
            {output.emptyState.showCreateAction && (
              <Pressable
                onPress={onNavigateToCreateProject}
                className="mt-6 px-6 py-3 bg-blue-600 rounded-lg"
              >
                <Text className="text-white font-semibold">{t.projects.createProject}</Text>
              </Pressable>
            )}
          </View>
        )}
        </View>
      </ScrollView>

      <EditProjectModal
        visible={output.isEditModalVisible}
        project={output.editingProject}
        onClose={actions.closeEditProject}
        onSave={actions.saveEditedProject}
      />

    <LogoutFAB />
    </SafeAreaView>
    </>
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
  const dateFormatter = useDateFormatter();
  const { user } = useAuthStore();
  const { getUsersByCompany } = useUserStoreWithInit();
  const { getLeadPMForProject, assignUserToProject, removeUserFromProject } = useProjectStoreWithCompanyInit(user?.companyId || "");

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    status: "planning" as ProjectStatus,
    startDate: new Date(),
    endDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
    location: "",
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
    companyUsers.filter((candidate) => getUserSystemPermission(candidate) === "manager"),
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
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView edges={['bottom', 'left', 'right']} className="flex-1 bg-gray-50">
        <StatusBar style="dark" />
        
        <ModalHandle />

        {/* Header */}
        <View className="flex-row items-center bg-white border-b border-gray-200 px-6 py-4">
          <Pressable onPress={onClose} className="mr-4 w-10 h-10 items-center justify-center">
            <Ionicons name="close" size={24} color="#374151" />
          </Pressable>
          <Text className="text-2xl font-semibold text-gray-900 flex-1">
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
              <Text className="text-2xl font-bold text-gray-900 mb-4">Project Information</Text>
              
              <View className="space-y-4">
                {/* Project Name */}
                <View>
                  <Text className="text-base font-medium text-gray-700 mb-2">
                    Project Name <Text className="text-red-500">*</Text>
                  </Text>
                  <TextInput
                    className="border border-gray-300 rounded-lg px-4 py-3 text-gray-900 bg-gray-50 text-xl"
                    placeholder="Enter project name"
                    value={formData.name}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
                    maxLength={100}
                  />
                </View>

                {/* Description */}
                <View>
                  <Text className="text-base font-medium text-gray-700 mb-2">Description</Text>
                  <TextInput
                    className="border border-gray-300 rounded-lg px-4 py-3 text-gray-900 bg-gray-50 text-xl"
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
                  <Text className="text-base font-medium text-gray-700 mb-2">Status</Text>
                  
                  {/* Custom Status Dropdown */}
                  <Pressable
                    onPress={() => setShowStatusPicker(!showStatusPicker)}
                    className="border border-gray-300 rounded-lg px-4 py-3 bg-gray-50 flex-row items-center justify-between"
                  >
                    <Text className="text-gray-900 text-lg capitalize">
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
                            "text-lg capitalize",
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
              <Text className="text-2xl font-bold text-gray-900 mb-3">Location</Text>
              
              <View>
                <TextInput
                  className="border border-gray-300 rounded-lg px-4 py-3 text-gray-900 bg-gray-50 text-lg"
                  placeholder="Enter full address (street, city, state/province, postal code, country)"
                  value={formData.location}
                  onChangeText={(text) => setFormData(prev => ({
                    ...prev,
                    location: text
                  }))}
                  multiline={true}
                  numberOfLines={5}
                  textAlignVertical="top"
                />
              </View>
            </View>

            {/* Project Timeline */}
            <View className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
              <Text className="text-2xl font-bold text-gray-900 mb-4">Project Timeline</Text>
              
              <View className="flex-row space-x-4">
                <View className="flex-1">
                  <Text className="text-base font-medium text-gray-700 mb-2">Start Date</Text>
                  <Pressable
                    onPress={() => setShowStartDatePicker(true)}
                    className="border border-gray-300 rounded-lg px-4 py-3 bg-gray-50 flex-row items-center justify-between"
                  >
                    <Text className="text-gray-900 text-lg">
                      {dateFormatter.formatDateShort(formData.startDate)}
                    </Text>
                    <Ionicons name="calendar-outline" size={20} color="#6b7280" />
                  </Pressable>
                </View>

                <View className="flex-1">
                  <Text className="text-base font-medium text-gray-700 mb-2">Estimated End Date</Text>
                  <Pressable
                    onPress={() => setShowEndDatePicker(true)}
                    className="border border-gray-300 rounded-lg px-4 py-3 bg-gray-50 flex-row items-center justify-between"
                  >
                    <Text className="text-gray-900 text-lg">
                      {dateFormatter.formatDateShort(formData.endDate)}
                    </Text>
                    <Ionicons name="calendar-outline" size={20} color="#6b7280" />
                  </Pressable>
                </View>
              </View>
            </View>

            {/* Lead Project Manager */}
            <View className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
              <Text className="text-2xl font-bold text-gray-900 mb-4">Lead Project Manager</Text>
              
              <View className="space-y-3">
                <Text className="text-base text-gray-600">
                  The Lead PM has full visibility to all tasks and subtasks in this project
                </Text>
                
                <View>
                  <Text className="text-sm text-gray-500 mb-2">Debug: selectedLeadPM = "{selectedLeadPM}"</Text>
                  
                  {/* Custom Dropdown Picker */}
                  <Pressable
                    onPress={() => setShowLeadPMPicker(!showLeadPMPicker)}
                    className="border border-gray-300 rounded-lg px-4 py-3 bg-gray-50 flex-row items-center justify-between"
                  >
                    <Text className="text-gray-900 text-lg">
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
                  
                  {/* Dropdown Options - Opens UPWARD */}
                  {showLeadPMPicker && (
                    <View className="absolute bottom-full left-0 right-0 z-50 mb-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-64">
                      <ScrollView nestedScrollEnabled={true} style={{ maxHeight: 256 }}>
                        <Pressable
                          onPress={() => {
                            setSelectedLeadPM("");
                            setShowLeadPMPicker(false);
                            console.log(`ProjectsScreen: Lead PM changed to: ""`);
                          }}
                          className="px-4 py-3 border-b border-gray-200"
                        >
                          <Text className="text-gray-900 text-lg">No Lead PM (Select one)</Text>
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
                              "text-lg",
                              user.id === selectedLeadPM ? "text-blue-900 font-medium" : "text-gray-900"
                            )}>
                              {user.name} ({user.role})
                            </Text>
                          </Pressable>
                        ))}
                      </ScrollView>
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
  );
}
