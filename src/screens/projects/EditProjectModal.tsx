import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";

import ModalHandle from "@/components/ModalHandle";
import { useAuthStore } from "@/state/authStore";
import { useProjectStoreWithCompanyInit } from "@/state/projectStore.supabase";
import { useUserStoreWithInit } from "@/state/userStore.supabase";
import {
  type Project,
  type ProjectStatus,
  getUserSystemPermission,
  isLeadProjectManager,
} from "@/types/buildtrack";
import { cn } from "@/utils/cn";
import { useDateFormatter } from "@/utils/dateFormatter";

interface EditProjectModalProps {
  visible: boolean;
  project: Project | null;
  onClose: () => void;
  onSave: (project: Project) => Promise<void> | void;
  onSaveSuccess: () => Promise<void> | void;
}

export function EditProjectModal({
  visible,
  project,
  onClose,
  onSave,
  onSaveSuccess,
}: EditProjectModalProps) {
  const dateFormatter = useDateFormatter();
  const { user } = useAuthStore();
  const { getUsersByCompany } = useUserStoreWithInit();
  const {
    getLeadPMForProject,
    getProjectUserAssignments,
    assignUserToProject,
    removeUserFromProject,
    updateUserProjectCategory,
  } = useProjectStoreWithCompanyInit(user?.companyId || "");

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    status: "planning" as ProjectStatus,
    startDate: new Date(),
    endDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
    location: "",
  });
  const [selectedLeadPM, setSelectedLeadPM] = useState("");
  const [hasTouchedLeadPMSelection, setHasTouchedLeadPMSelection] = useState(false);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showLeadPMPicker, setShowLeadPMPicker] = useState(false);
  const [showStatusPicker, setShowStatusPicker] = useState(false);

  const companyUsers = user?.companyId ? getUsersByCompany(user.companyId) : [];
  const hydratedLeadPM = project ? getLeadPMForProject(project.id) || "" : "";

  React.useEffect(() => {
    if (!project) {
      return;
    }

    const initialLeadPM = getLeadPMForProject(project.id) || "";

    setFormData({
      name: project.name,
      description: project.description,
      status: project.status,
      startDate: new Date(project.startDate),
      endDate: project.endDate
        ? new Date(project.endDate)
        : new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
      location: project.location,
    });

    console.log(`ProjectsScreen: Setting Lead PM for project ${project.id}:`, initialLeadPM);
    setSelectedLeadPM(initialLeadPM);
    setHasTouchedLeadPMSelection(false);
  }, [project?.id]);

  React.useEffect(() => {
    if (!visible || !project || hasTouchedLeadPMSelection) {
      return;
    }

    setSelectedLeadPM((currentSelectedLeadPM) =>
      currentSelectedLeadPM === hydratedLeadPM ? currentSelectedLeadPM : hydratedLeadPM,
    );
  }, [visible, project, hydratedLeadPM, hasTouchedLeadPMSelection]);

  const eligibleLeadPMs = React.useMemo(
    () =>
      companyUsers.filter((candidate) => getUserSystemPermission(candidate) === "manager"),
    [companyUsers],
  );

  if (!user || !project) {
    return null;
  }

  const selectedLeadPmUser = eligibleLeadPMs.find(
    (candidate) => candidate.id === selectedLeadPM,
  );
  const selectedLeadPmLabel = selectedLeadPmUser
    ? `${selectedLeadPmUser.name} (${selectedLeadPmUser.role})`
    : "No Lead PM (Select one)";

  const handleSave = async () => {
    if (!formData.name.trim()) {
      Alert.alert("Error", "Project name is required");
      return;
    }

    if (formData.endDate <= formData.startDate) {
      Alert.alert("Error", "End date must be after start date");
      return;
    }

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

    try {
      await onSave(updatedProject);

      const projectAssignments = getProjectUserAssignments(project.id);
      const effectiveSelectedLeadPM = hasTouchedLeadPMSelection
        ? selectedLeadPM
        : hydratedLeadPM;
      const activeLeadAssignments = projectAssignments.filter(
        (assignment) => assignment.isActive && isLeadProjectManager(assignment),
      );

      if (effectiveSelectedLeadPM) {
        const selectedLeadPmAssignment = projectAssignments.find(
          (assignment) => assignment.userId === effectiveSelectedLeadPM && assignment.isActive,
        );

        if (selectedLeadPmAssignment && !isLeadProjectManager(selectedLeadPmAssignment)) {
          await updateUserProjectCategory(
            effectiveSelectedLeadPM,
            project.id,
            "lead_project_manager",
          );
        } else if (!selectedLeadPmAssignment) {
          await assignUserToProject(
            effectiveSelectedLeadPM,
            project.id,
            "lead_project_manager",
            user.id,
          );
        }
      }

      const staleLeadUserIds = Array.from(
        new Set(
          activeLeadAssignments
            .map((assignment) => assignment.userId)
            .filter((userId) => userId !== effectiveSelectedLeadPM),
        ),
      );

      for (const staleLeadUserId of staleLeadUserIds) {
        await removeUserFromProject(staleLeadUserId, project.id);
      }

      await onSaveSuccess();
    } catch (error) {
      console.error("ProjectsScreen: Failed to save edited project modal state:", error);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView edges={["bottom", "left", "right"]} className="flex-1 bg-gray-50">
        <StatusBar style="dark" />

        <ModalHandle />

        <View className="flex-row items-center bg-white border-b border-gray-200 px-6 py-4">
          <Pressable onPress={onClose} className="mr-4 h-10 w-10 items-center justify-center">
            <Ionicons name="close" size={24} color="#374151" />
          </Pressable>
          <Text className="flex-1 text-2xl font-semibold text-gray-900">Edit Project</Text>
          <Pressable onPress={() => void handleSave()} className="rounded-lg bg-blue-600 px-4 py-2">
            <Text className="font-medium text-white">Save</Text>
          </Pressable>
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1"
        >
          <ScrollView className="flex-1 px-4 py-3" keyboardShouldPersistTaps="handled">
            <View className="mb-4 rounded-xl border border-gray-200 bg-white p-4">
              <Text className="mb-4 text-2xl font-bold text-gray-900">Project Information</Text>

              <View className="space-y-4">
                <View>
                  <Text className="mb-2 text-base font-medium text-gray-700">
                    Project Name <Text className="text-red-500">*</Text>
                  </Text>
                  <TextInput
                    className="bg-gray-50 text-xl text-gray-900 border border-gray-300 rounded-lg px-4 py-3"
                    placeholder="Enter project name"
                    value={formData.name}
                    onChangeText={(text) => setFormData((prev) => ({ ...prev, name: text }))}
                    maxLength={100}
                  />
                </View>

                <View>
                  <Text className="mb-2 text-base font-medium text-gray-700">Description</Text>
                  <TextInput
                    className="bg-gray-50 text-xl text-gray-900 border border-gray-300 rounded-lg px-4 py-3"
                    placeholder="Project description"
                    value={formData.description}
                    onChangeText={(text) =>
                      setFormData((prev) => ({ ...prev, description: text }))
                    }
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                    maxLength={500}
                  />
                </View>

                <View>
                  <Text className="mb-2 text-base font-medium text-gray-700">Status</Text>

                  <Pressable
                    onPress={() => setShowStatusPicker(!showStatusPicker)}
                    className="flex-row items-center justify-between rounded-lg border border-gray-300 bg-gray-50 px-4 py-3"
                  >
                    <Text className="text-lg capitalize text-gray-900">
                      {formData.status.replace("_", " ")}
                    </Text>
                    <Ionicons
                      name={showStatusPicker ? "chevron-up" : "chevron-down"}
                      size={20}
                      color="#6b7280"
                    />
                  </Pressable>

                  {showStatusPicker ? (
                    <View className="absolute top-full left-0 right-0 z-50 mt-1 rounded-lg border border-gray-300 bg-white shadow-lg">
                      {["planning", "active", "on_hold", "completed", "cancelled"].map(
                        (status, index) => (
                          <Pressable
                            key={status}
                            onPress={() => {
                              setFormData((prev) => ({
                                ...prev,
                                status: status as ProjectStatus,
                              }));
                              setShowStatusPicker(false);
                            }}
                            className={cn(
                              "px-4 py-3",
                              formData.status === status && "bg-blue-50",
                              index < 4 && "border-b border-gray-200",
                            )}
                          >
                            <Text
                              className={cn(
                                "text-lg capitalize",
                                formData.status === status
                                  ? "font-medium text-blue-900"
                                  : "text-gray-900",
                              )}
                            >
                              {status.replace("_", " ")}
                            </Text>
                          </Pressable>
                        ),
                      )}
                    </View>
                  ) : null}
                </View>
              </View>
            </View>

            <View className="mb-4 rounded-xl border border-gray-200 bg-white p-4">
              <Text className="mb-3 text-2xl font-bold text-gray-900">Location</Text>

              <View>
                <TextInput
                  className="bg-gray-50 text-lg text-gray-900 border border-gray-300 rounded-lg px-4 py-3"
                  placeholder="Enter full address (street, city, state/province, postal code, country)"
                  value={formData.location}
                  onChangeText={(text) => setFormData((prev) => ({ ...prev, location: text }))}
                  multiline
                  numberOfLines={5}
                  textAlignVertical="top"
                />
              </View>
            </View>

            <View className="mb-4 rounded-xl border border-gray-200 bg-white p-4">
              <Text className="mb-4 text-2xl font-bold text-gray-900">Project Timeline</Text>

              <View className="flex-row space-x-4">
                <View className="flex-1">
                  <Text className="mb-2 text-base font-medium text-gray-700">Start Date</Text>
                  <Pressable
                    onPress={() => setShowStartDatePicker(true)}
                    className="flex-row items-center justify-between rounded-lg border border-gray-300 bg-gray-50 px-4 py-3"
                  >
                    <Text className="text-lg text-gray-900">
                      {dateFormatter.formatDateShort(formData.startDate)}
                    </Text>
                    <Ionicons name="calendar-outline" size={20} color="#6b7280" />
                  </Pressable>
                </View>

                <View className="flex-1">
                  <Text className="mb-2 text-base font-medium text-gray-700">
                    Estimated End Date
                  </Text>
                  <Pressable
                    onPress={() => setShowEndDatePicker(true)}
                    className="flex-row items-center justify-between rounded-lg border border-gray-300 bg-gray-50 px-4 py-3"
                  >
                    <Text className="text-lg text-gray-900">
                      {dateFormatter.formatDateShort(formData.endDate)}
                    </Text>
                    <Ionicons name="calendar-outline" size={20} color="#6b7280" />
                  </Pressable>
                </View>
              </View>
            </View>

            <View className="mb-4 rounded-xl border border-gray-200 bg-white p-4">
              <Text className="mb-4 text-2xl font-bold text-gray-900">Lead Project Manager</Text>

              <View className="space-y-3">
                <Text className="text-base text-gray-600">
                  The Lead PM has full visibility to all tasks and subtasks in this project
                </Text>

                <View>
                  <Pressable
                    onPress={() => setShowLeadPMPicker(!showLeadPMPicker)}
                    className="flex-row items-center justify-between rounded-lg border border-gray-300 bg-gray-50 px-4 py-3"
                  >
                    <Text className="text-lg text-gray-900">
                      {selectedLeadPmLabel}
                    </Text>
                    <Ionicons
                      name={showLeadPMPicker ? "chevron-up" : "chevron-down"}
                      size={20}
                      color="#6b7280"
                    />
                  </Pressable>

                  {showLeadPMPicker ? (
                    <View className="absolute bottom-full left-0 right-0 z-50 mb-1 max-h-64 rounded-lg border border-gray-300 bg-white shadow-lg">
                      <ScrollView nestedScrollEnabled style={{ maxHeight: 256 }}>
                        <Pressable
                          onPress={() => {
                            setHasTouchedLeadPMSelection(true);
                            setSelectedLeadPM("");
                            setShowLeadPMPicker(false);
                            console.log('ProjectsScreen: Lead PM changed to: ""');
                          }}
                          className="border-b border-gray-200 px-4 py-3"
                        >
                          <Text className="text-lg text-gray-900">No Lead PM (Select one)</Text>
                        </Pressable>
                        {eligibleLeadPMs.map((eligibleUser) => (
                          <Pressable
                            key={eligibleUser.id}
                            onPress={() => {
                              setHasTouchedLeadPMSelection(true);
                              setSelectedLeadPM(eligibleUser.id);
                              setShowLeadPMPicker(false);
                              console.log(
                                "ProjectsScreen: Lead PM changed to:",
                                eligibleUser.id,
                              );
                            }}
                            className={cn(
                              "px-4 py-3",
                              eligibleUser.id === selectedLeadPM && "bg-blue-50",
                              eligibleUser.id !== eligibleLeadPMs[eligibleLeadPMs.length - 1].id &&
                                "border-b border-gray-200",
                            )}
                          >
                            <Text
                              className={cn(
                                "text-lg",
                                eligibleUser.id === selectedLeadPM
                                  ? "font-medium text-blue-900"
                                  : "text-gray-900",
                              )}
                            >
                              {eligibleUser.name} ({eligibleUser.role})
                            </Text>
                          </Pressable>
                        ))}
                      </ScrollView>
                    </View>
                  ) : null}
                </View>
              </View>
            </View>

            <View className="h-20" />
          </ScrollView>
        </KeyboardAvoidingView>

        {showStartDatePicker ? (
          <DateTimePicker
            value={formData.startDate}
            mode="date"
            display="default"
            onChange={(_event, selectedDate) => {
              setShowStartDatePicker(false);
              if (selectedDate) {
                setFormData((prev) => ({ ...prev, startDate: selectedDate }));
              }
            }}
          />
        ) : null}

        {showEndDatePicker ? (
          <DateTimePicker
            value={formData.endDate}
            mode="date"
            display="default"
            minimumDate={formData.startDate}
            onChange={(_event, selectedDate) => {
              setShowEndDatePicker(false);
              if (selectedDate) {
                setFormData((prev) => ({ ...prev, endDate: selectedDate }));
              }
            }}
          />
        ) : null}
      </SafeAreaView>
    </Modal>
  );
}
