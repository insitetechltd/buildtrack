import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TextInputKeyPressEventData,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";

import ModalHandle from "@/components/ModalHandle";
import TextField from "@/components/primitives/input/TextField";
import { buildFormTextFieldContract } from "@/ui/mappers/formTextField";
import { useAuthStore } from "@/state/authStore";
import { useProjectStoreWithCompanyInit } from "@/state/projectStore.supabase";
import { useUserStoreWithInit } from "@/state/userStore.supabase";
import {
  type Project,
  type ProjectStatus,
  isLeadProjectManager,
} from "@/types/buildtrack";
import {
  PROJECT_STATUS_LABELS,
  PROJECT_STATUS_ORDER,
  formatProjectStatusLabel,
  normalizeProjectStatus,
} from "@/ui/contracts/projectStatus";
import {
  isEligibleProjectAdminCandidate,
  upsertProjectMembership,
} from "@/ui/contracts/projectMembership";
import { cn } from "@/utils/cn";
import { useDateFormatter } from "@/utils/dateFormatter";
import {
  createFormNavigationRegistry,
  getNextFocusableFieldId,
  getPreviousFocusableFieldId,
  getTabNavigationDirection,
} from "@/utils/formNavigation";

interface EditProjectModalProps {
  visible: boolean;
  project: Project | null;
  onClose: () => void;
  onSave: (project: Project) => Promise<void> | void;
  onSaveSuccess: () => Promise<void> | void;
}

type EditProjectFieldId = "name" | "description" | "location" | "submit";

export function EditProjectModal({
  visible,
  project,
  onClose,
  onSave,
  onSaveSuccess,
}: EditProjectModalProps) {
  const dateFormatter = useDateFormatter();
  const { user } = useAuthStore();
  const nameInputRef = useRef<TextInput>(null);
  const descriptionInputRef = useRef<TextInput>(null);
  const locationInputRef = useRef<TextInput>(null);
  const { getUsersByCompany } = useUserStoreWithInit();
  const {
    getLeadPMForProject,
    getProjectUserAssignments,
    assignUserToProject,
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
      status: normalizeProjectStatus(project.status),
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

  // Host company CA|PM already on this job only — never partner PA (AUTHZ-02).
  const eligibleLeadPMs = React.useMemo(() => {
    if (!project) {
      return [];
    }
    const onJob = new Set(
      getProjectUserAssignments(project.id)
        .filter((assignment) => assignment.isActive)
        .map((assignment) => assignment.userId),
    );
    return companyUsers.filter(
      (candidate) =>
        isEligibleProjectAdminCandidate(candidate) && onJob.has(candidate.id),
    );
  }, [companyUsers, project?.id, getProjectUserAssignments]);

  const selectedLeadPmUser = eligibleLeadPMs.find(
    (candidate) => candidate.id === selectedLeadPM,
  );
  const selectedLeadPmLabel = selectedLeadPmUser
    ? `${selectedLeadPmUser.name} (${selectedLeadPmUser.role})`
    : "No Project Admin (Select one)";
  const formNavigationRegistry = useMemo(
    () =>
      createFormNavigationRegistry([
        { fieldId: "name", isFocusable: true },
        { fieldId: "description", isFocusable: true },
        { fieldId: "location", isFocusable: true },
        { fieldId: "submit", isFocusable: true },
      ]),
    [],
  );
  const focusFormField = useCallback((fieldId: EditProjectFieldId | null) => {
    if (!fieldId || fieldId === "submit") {
      nameInputRef.current?.blur?.();
      descriptionInputRef.current?.blur?.();
      locationInputRef.current?.blur?.();
      return;
    }

    const focusTargetMap = {
      name: nameInputRef,
      description: descriptionInputRef,
      location: locationInputRef,
    } satisfies Record<Exclude<EditProjectFieldId, "submit">, React.RefObject<TextInput | null>>;

    focusTargetMap[fieldId].current?.focus?.();
  }, []);
  const moveFormFocus = useCallback(
    (
      activeFieldId: Exclude<EditProjectFieldId, "submit">,
      direction: "next" | "previous" = "next",
    ) => {
      const targetFieldId =
        direction === "previous"
          ? getPreviousFocusableFieldId(formNavigationRegistry, activeFieldId)
          : getNextFocusableFieldId(formNavigationRegistry, activeFieldId);

      focusFormField((targetFieldId as EditProjectFieldId | null) ?? null);
    },
    [focusFormField, formNavigationRegistry],
  );
  const handleFieldKeyPress = useCallback(
    (
      activeFieldId: Exclude<EditProjectFieldId, "submit">,
      event: NativeSyntheticEvent<TextInputKeyPressEventData>,
    ) => {
      if (event.nativeEvent.key !== "Tab") {
        return;
      }

      moveFormFocus(activeFieldId, getTabNavigationDirection(event));
    },
    [moveFormFocus],
  );

  const handleSave = useCallback(async () => {
    if (!user || !project) {
      return;
    }

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
      const writer = { assignUserToProject, updateUserProjectCategory };

      if (effectiveSelectedLeadPM) {
        const candidateUser =
          companyUsers.find((candidate) => candidate.id === effectiveSelectedLeadPM) ??
          undefined;
        await upsertProjectMembership(writer, {
          userId: effectiveSelectedLeadPM,
          projectId: project.id,
          asProjectAdmin: true,
          assignedBy: user.id,
          assignments: projectAssignments,
          candidateUser,
        });
      } else {
        const leftoverLeads = projectAssignments.filter(
          (assignment) => assignment.isActive && isLeadProjectManager(assignment),
        );
        for (const lead of leftoverLeads) {
          await updateUserProjectCategory(lead.userId, project.id, "worker");
        }
      }

      await onSaveSuccess();
    } catch (error) {
      console.error("ProjectsScreen: Failed to save edited project modal state:", error);
    }
  }, [
    assignUserToProject,
    companyUsers,
    formData.description,
    formData.endDate,
    formData.location,
    formData.name,
    formData.startDate,
    formData.status,
    getProjectUserAssignments,
    hasTouchedLeadPMSelection,
    hydratedLeadPM,
    onSave,
    onSaveSuccess,
    project,
    selectedLeadPM,
    updateUserProjectCategory,
    user,
  ]);

  if (!user || !project) {
    return null;
  }

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
          <ScrollView className="flex-1 px-4 py-3" keyboardShouldPersistTaps="always">
            {/* Elevate Project Information while status menu is open so it paints above Location */}
            <View
              testID="edit-project-info-card"
              className="mb-4 rounded-xl border border-gray-200 bg-white p-4"
              style={
                showStatusPicker
                  ? { zIndex: 20, elevation: 20, overflow: "visible" }
                  : { zIndex: 1, elevation: 0, overflow: "visible" }
              }
            >
              <Text className="mb-4 text-2xl font-bold text-gray-900">Project Information</Text>

              <View className="space-y-4" style={{ overflow: "visible" }}>
                <TextField
                  contract={buildFormTextFieldContract({
                    id: "edit-project-name",
                    label: "Project Name",
                    value: formData.name,
                    placeholder: "Enter project name",
                    required: true,
                    testId: "edit-project-name",
                  })}
                  inputTestId="edit-project-name"
                  inputRef={nameInputRef}
                  collapseEmptyChrome
                  onChangeText={(text) => setFormData((prev) => ({ ...prev, name: text }))}
                  maxLength={100}
                  returnKeyType="next"
                  onKeyPress={(event) => handleFieldKeyPress("name", event)}
                  onSubmitEditing={() => {
                    moveFormFocus("name");
                  }}
                  blurOnSubmit={false}
                />

                <TextField
                  contract={buildFormTextFieldContract({
                    id: "edit-project-description",
                    label: "Description",
                    value: formData.description,
                    placeholder: "Project description",
                    testId: "edit-project-description",
                  })}
                  inputTestId="edit-project-description"
                  inputRef={descriptionInputRef}
                  collapseEmptyChrome
                  onChangeText={(text) =>
                    setFormData((prev) => ({ ...prev, description: text }))
                  }
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  maxLength={500}
                  returnKeyType="next"
                  onKeyPress={(event) => handleFieldKeyPress("description", event)}
                  onSubmitEditing={() => {
                    moveFormFocus("description");
                  }}
                  blurOnSubmit={false}
                />

                <View className="relative" style={{ zIndex: showStatusPicker ? 1000 : 1 }}>
                  <Text className="mb-2 text-lg font-semibold text-slate-900">Status</Text>

                  <Pressable
                    testID="edit-project-status-trigger"
                    onPress={() => setShowStatusPicker(!showStatusPicker)}
                    className="flex-row items-center justify-between rounded-lg border border-gray-300 bg-gray-50 px-4 py-3"
                  >
                    <Text className="text-lg text-gray-900">
                      {formatProjectStatusLabel(formData.status)}
                    </Text>
                    <Ionicons
                      name={showStatusPicker ? "chevron-up" : "chevron-down"}
                      size={20}
                      color="#6b7280"
                    />
                  </Pressable>

                  {showStatusPicker ? (
                    <View
                      testID="edit-project-status-menu"
                      className="absolute top-full left-0 right-0 mt-1 rounded-lg border border-gray-300 bg-white shadow-lg"
                      style={{
                        zIndex: 1001,
                        elevation: 1001,
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.3,
                        shadowRadius: 8,
                      }}
                    >
                      {PROJECT_STATUS_ORDER.map((status, index) => (
                          <Pressable
                            key={status}
                            testID={`edit-project-status-option-${status}`}
                            onPress={() => {
                              setFormData((prev) => ({
                                ...prev,
                                status,
                              }));
                              setShowStatusPicker(false);
                            }}
                            className={cn(
                              "px-4 py-3",
                              formData.status === status && "bg-blue-50",
                              index < PROJECT_STATUS_ORDER.length - 1 &&
                                "border-b border-gray-200",
                            )}
                          >
                            <Text
                              className={cn(
                                "text-lg",
                                formData.status === status
                                  ? "font-medium text-blue-900"
                                  : "text-gray-900",
                              )}
                            >
                              {PROJECT_STATUS_LABELS[status]}
                            </Text>
                          </Pressable>
                        ))}
                    </View>
                  ) : null}
                </View>
              </View>
            </View>

            <View
              testID="edit-project-location-card"
              className="mb-4 rounded-xl border border-gray-200 bg-white p-4"
              style={{ zIndex: 1, elevation: 1 }}
            >
              <Text className="mb-3 text-2xl font-bold text-gray-900">Location</Text>

              <TextField
                contract={buildFormTextFieldContract({
                  id: "edit-project-location",
                  label: "",
                  value: formData.location,
                  placeholder:
                    "Enter full address (street, city, state/province, postal code, country)",
                  testId: "edit-project-location",
                })}
                inputTestId="edit-project-location"
                inputRef={locationInputRef}
                collapseEmptyChrome
                onChangeText={(text) => setFormData((prev) => ({ ...prev, location: text }))}
                multiline
                numberOfLines={5}
                textAlignVertical="top"
                returnKeyType="done"
                onKeyPress={(event) => handleFieldKeyPress("location", event)}
                onSubmitEditing={() => {
                  locationInputRef.current?.blur();
                }}
                blurOnSubmit={false}
              />
            </View>

            <View className="mb-4 rounded-xl border border-gray-200 bg-white p-4">
              <Text className="mb-4 text-2xl font-bold text-gray-900">Project Timeline</Text>

              <View className="flex-row space-x-4">
                <View className="flex-1">
                  <Text className="mb-2 text-lg font-semibold text-slate-900">Start Date</Text>
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
                  <Text className="mb-2 text-lg font-semibold text-slate-900">
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
              <Text className="mb-4 text-2xl font-bold text-gray-900">Project Admin</Text>

              <View className="space-y-3">
                <Text className="text-base text-gray-600">
                  Name a company admin or PM already on this job. Partners cannot be host
                  Project Admin.
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
                            console.log('ProjectsScreen: Project Admin cleared');
                          }}
                          className="border-b border-gray-200 px-4 py-3"
                        >
                          <Text className="text-lg text-gray-900">No Project Admin (Select one)</Text>
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
