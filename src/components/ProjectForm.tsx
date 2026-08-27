import React, { useState, useCallback, useEffect, useMemo, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  NativeSyntheticEvent,
  TextInputKeyPressEventData,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import TextField from "@/components/primitives/input/TextField";
import { buildFormTextFieldContract } from "@/ui/mappers/formTextField";
import { useAuthStore } from "../state/authStore";
import { ProjectStatus, Project } from "../types/buildtrack";
import { cn } from "../utils/cn";
import { useDateFormatter } from "../utils/dateFormatter";
import {
  createFormNavigationRegistry,
  getNextFocusableFieldId,
  getPreviousFocusableFieldId,
  getTabNavigationDirection,
} from "../utils/formNavigation";

interface ProjectFormProps {
  mode: "create" | "edit";
  project?: Project;
  onSubmit: (formData: ProjectFormData) => Promise<void>;
  onCancel: () => void;
  submitButtonText: string;
  isSubmitting?: boolean;
}

interface ProjectFormData {
  name: string;
  description: string;
  status: ProjectStatus;
  startDate: Date;
  endDate: Date;
  location: string;
  clientInfo: {
    name: string;
    email: string;
    phone: string;
  };
}

type ProjectFormFieldId =
  | "clientName"
  | "name"
  | "description"
  | "location"
  | "clientEmail"
  | "clientPhone"
  | "submit";

export default function ProjectForm({
  mode,
  project,
  onSubmit,
  onCancel,
  submitButtonText,
  isSubmitting = false,
}: ProjectFormProps) {
  const dateFormatter = useDateFormatter();
  const { user } = useAuthStore();
  const clientNameInputRef = useRef<TextInput>(null);
  const projectNameInputRef = useRef<TextInput>(null);
  const descriptionInputRef = useRef<TextInput>(null);
  const locationInputRef = useRef<TextInput>(null);
  const clientEmailInputRef = useRef<TextInput>(null);
  const clientPhoneInputRef = useRef<TextInput>(null);

  const [formData, setFormData] = useState<ProjectFormData>({
    name: project?.name || "",
    description: project?.description || "",
    status: project?.status || "planning",
    startDate: project?.startDate ? new Date(project.startDate) : new Date(),
    endDate: project?.endDate ? new Date(project.endDate) : new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
    location: project?.location || "",
    clientInfo: {
      name: project?.clientInfo?.name || "",
      email: project?.clientInfo?.email || "",
      phone: project?.clientInfo?.phone || "",
    },
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showStatusPicker, setShowStatusPicker] = useState(false);

  // Reset form data when mode or project changes
  useEffect(() => {
    console.log('🔄 ProjectForm: Resetting form data', { mode, projectId: project?.id });
    setFormData({
      name: project?.name || "",
      description: project?.description || "",
      status: project?.status || "planning",
      startDate: project?.startDate ? new Date(project.startDate) : new Date(),
      endDate: project?.endDate ? new Date(project.endDate) : new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
      location: project?.location || "",
      clientInfo: {
        name: project?.clientInfo?.name || "",
        email: project?.clientInfo?.email || "",
        phone: project?.clientInfo?.phone || "",
      },
    });
    setErrors({});
  }, [mode, project?.id]);


  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Project name is required";
    }

    if (!formData.description.trim()) {
      newErrors.description = "Project description is required";
    }

    if (!formData.location.trim()) {
      newErrors.location = "Location is required";
    }

    if (!formData.clientInfo.name.trim()) {
      newErrors.clientName = "Client name is required";
    }

    if (formData.endDate <= formData.startDate) {
      newErrors.endDate = "End date must be after start date";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    setErrors({});
    
    if (!validateForm()) return;

    try {
      await onSubmit(formData);
    } catch (error) {
      console.error("Form submission error:", error);
      Alert.alert("Error", "Failed to save project. Please try again.");
    }
  };

  const handleNameChange = useCallback((text: string) => {
    setFormData(prev => ({ ...prev, name: text }));
  }, []);

  const handleDescriptionChange = useCallback((text: string) => {
    setFormData(prev => ({ ...prev, description: text }));
  }, []);

  const handleLocationChange = useCallback((text: string) => {
    setFormData(prev => ({ 
      ...prev, 
      location: text
    }));
  }, []);

  const handleClientChange = useCallback((field: keyof typeof formData.clientInfo, value: string) => {
    setFormData(prev => ({
      ...prev,
      clientInfo: { ...prev.clientInfo, [field]: value }
    }));
  }, []);

  const statusOptions = [
    { label: "Planning", value: "planning" },
    { label: "On-going", value: "active" },
    { label: "Completed", value: "completed" },
    { label: "Cancelled", value: "cancelled" },
  ];
  const formNavigationRegistry = useMemo(
    () =>
      createFormNavigationRegistry([
        { fieldId: "clientName", isFocusable: true },
        { fieldId: "name", isFocusable: true },
        { fieldId: "description", isFocusable: true },
        { fieldId: "location", isFocusable: true },
        { fieldId: "clientEmail", isFocusable: true },
        { fieldId: "clientPhone", isFocusable: true },
        { fieldId: "submit", isFocusable: true },
      ]),
    [],
  );
  const focusFormField = useCallback((fieldId: ProjectFormFieldId | null) => {
    if (!fieldId || fieldId === "submit") {
      clientNameInputRef.current?.blur?.();
      projectNameInputRef.current?.blur?.();
      descriptionInputRef.current?.blur?.();
      locationInputRef.current?.blur?.();
      clientEmailInputRef.current?.blur?.();
      clientPhoneInputRef.current?.blur?.();
      return;
    }

    const focusTargetMap = {
      clientName: clientNameInputRef,
      name: projectNameInputRef,
      description: descriptionInputRef,
      location: locationInputRef,
      clientEmail: clientEmailInputRef,
      clientPhone: clientPhoneInputRef,
    } satisfies Record<Exclude<ProjectFormFieldId, "submit">, React.RefObject<TextInput | null>>;

    focusTargetMap[fieldId].current?.focus?.();
  }, []);
  const moveFormFocus = useCallback(
    (
      activeFieldId: Exclude<ProjectFormFieldId, "submit">,
      direction: "next" | "previous" = "next",
    ) => {
      const targetFieldId =
        direction === "previous"
          ? getPreviousFocusableFieldId(formNavigationRegistry, activeFieldId)
          : getNextFocusableFieldId(formNavigationRegistry, activeFieldId);

      focusFormField((targetFieldId as ProjectFormFieldId | null) ?? null);
    },
    [focusFormField, formNavigationRegistry],
  );
  const handleFieldKeyPress = useCallback(
    (
      activeFieldId: Exclude<ProjectFormFieldId, "submit">,
      event: NativeSyntheticEvent<TextInputKeyPressEventData>,
    ) => {
      if (event.nativeEvent.key !== "Tab") {
        return;
      }

      moveFormFocus(activeFieldId, getTabNavigationDirection(event));
    },
    [moveFormFocus],
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1"
    >
      <ScrollView className="flex-1 px-4 py-3" keyboardShouldPersistTaps="always">
        {/* Project Information — elevate whole card while status menu is open so it paints above Location */}
        <View
          testID="project-form-info-card"
          className="bg-white rounded-xl border border-gray-200 p-4 mb-4"
          style={
            showStatusPicker
              ? { zIndex: 20, elevation: 20, overflow: "visible" }
              : { zIndex: 1, elevation: 0, overflow: "visible" }
          }
        >
          <Text className="text-2xl font-bold text-gray-900 mb-4">Project Information</Text>
          
          <View className="space-y-4" style={{ overflow: "visible" }}>
            <TextField
              contract={buildFormTextFieldContract({
                id: "project-clientName",
                label: "Client",
                value: formData.clientInfo.name,
                placeholder: "Enter client name",
                error: errors.clientName,
                required: true,
                testId: "project-form-clientName",
              })}
              inputTestId="project-form-clientName"
              inputRef={clientNameInputRef}
              collapseEmptyChrome
              onChangeText={(text) => handleClientChange("name", text)}
              maxLength={100}
              returnKeyType="next"
              onKeyPress={(event) => handleFieldKeyPress("clientName", event)}
              onSubmitEditing={() => {
                moveFormFocus("clientName");
              }}
              blurOnSubmit={false}
            />

            <TextField
              contract={buildFormTextFieldContract({
                id: "project-name",
                label: "Project Title",
                value: formData.name,
                placeholder: "Enter project name",
                error: errors.name,
                required: true,
                testId: "project-form-name",
              })}
              inputTestId="project-form-name"
              inputRef={projectNameInputRef}
              collapseEmptyChrome
              onChangeText={handleNameChange}
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
                id: "project-description",
                label: "Description",
                value: formData.description,
                placeholder: "Project description",
                error: errors.description,
                required: true,
                testId: "project-form-description",
              })}
              inputTestId="project-form-description"
              inputRef={descriptionInputRef}
              collapseEmptyChrome
              inputClassName="min-h-[90px]"
              onChangeText={handleDescriptionChange}
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

            {/* Status */}
            <View className="relative" style={{ zIndex: showStatusPicker ? 1000 : 1 }}>
                  <Text className="text-lg font-medium text-slate-900 mb-2">Status</Text>
              
              {/* Custom Status Dropdown */}
              <Pressable
                testID="project-form-status-trigger"
                onPress={() => setShowStatusPicker(!showStatusPicker)}
                className="border border-gray-300 rounded-lg px-4 py-3 bg-gray-50 flex-row items-center justify-between"
              >
                <Text className="text-gray-900 text-lg">
                  {statusOptions.find((option) => option.value === formData.status)?.label ??
                    formData.status}
                </Text>
                <Ionicons 
                  name={showStatusPicker ? "chevron-up" : "chevron-down"} 
                  size={20} 
                  color="#6b7280" 
                />
              </Pressable>
              
              {/* Dropdown Options */}
              {showStatusPicker && (
                <View 
                  testID="project-form-status-menu"
                  className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg"
                  style={{ 
                    zIndex: 1001,
                    elevation: 1001,
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 8,
                  }}
                >
                  {statusOptions.map((option, index) => (
                    <Pressable
                      key={option.value}
                      testID={`project-form-status-option-${option.value}`}
                      onPress={() => {
                        setFormData(prev => ({ ...prev, status: option.value as ProjectStatus }));
                        setShowStatusPicker(false);
                      }}
                      className={cn(
                        "px-4 py-3",
                        formData.status === option.value && "bg-blue-50",
                        index !== statusOptions.length - 1 && "border-b border-gray-200"
                      )}
                    >
                      <Text className={cn(
                        "text-lg",
                        formData.status === option.value ? "text-blue-900 font-medium" : "text-gray-900"
                      )}>
                        {option.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Location — keep below open status menu (sibling stacking) */}
        <View
          testID="project-form-location-card"
          className="bg-white rounded-xl border border-gray-200 p-4 mb-4"
          style={{ zIndex: 1, elevation: 1 }}
        >
          <View className="flex-row items-center mb-3">
            <Text className="text-2xl font-bold text-gray-900">Location</Text>
            <Text className="text-red-500 text-2xl font-bold ml-1">*</Text>
          </View>
          
          <TextField
            contract={buildFormTextFieldContract({
              id: "project-location",
              label: "",
              value: formData.location,
              placeholder: "Enter full address (street, city, state/province, postal code, country)",
              error: errors.location,
              required: true,
              testId: "project-form-location",
            })}
            inputTestId="project-form-location"
            inputRef={locationInputRef}
            collapseEmptyChrome
            inputClassName="min-h-[130px]"
            onChangeText={handleLocationChange}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
            returnKeyType="next"
            onKeyPress={(event) => handleFieldKeyPress("location", event)}
            onSubmitEditing={() => {
              moveFormFocus("location");
            }}
            blurOnSubmit={false}
          />
        </View>

        <View className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
          <Text className="text-2xl font-bold text-gray-900 mb-4">Client Contact</Text>

          <View className="space-y-4">
            <TextField
              contract={buildFormTextFieldContract({
                id: "project-clientEmail",
                label: "Client Email",
                value: formData.clientInfo.email,
                placeholder: "Enter client email",
                testId: "project-form-clientEmail",
              })}
              inputTestId="project-form-clientEmail"
              inputRef={clientEmailInputRef}
              collapseEmptyChrome
              onChangeText={(text) => handleClientChange("email", text)}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
              onKeyPress={(event) => handleFieldKeyPress("clientEmail", event)}
              onSubmitEditing={() => {
                moveFormFocus("clientEmail");
              }}
              blurOnSubmit={false}
            />

            <TextField
              contract={buildFormTextFieldContract({
                id: "project-clientPhone",
                label: "Client Phone",
                value: formData.clientInfo.phone,
                placeholder: "Enter client phone",
                testId: "project-form-clientPhone",
              })}
              inputTestId="project-form-clientPhone"
              inputRef={clientPhoneInputRef}
              collapseEmptyChrome
              onChangeText={(text) => handleClientChange("phone", text)}
              keyboardType="phone-pad"
              returnKeyType="done"
              onKeyPress={(event) => handleFieldKeyPress("clientPhone", event)}
              onSubmitEditing={() => {
                clientPhoneInputRef.current?.blur();
              }}
            />
          </View>
        </View>

        {/* Project Timeline */}
        <View className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
          <Text className="text-2xl font-bold text-gray-900 mb-4">Project Timeline</Text>
          
          <View className="flex-row space-x-4">
            <View className="flex-1">
              <Text className="text-lg font-semibold text-slate-900 mb-2">Start Date</Text>
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
              <Text className="text-lg font-semibold text-slate-900 mb-2">Estimated End Date</Text>
              <Pressable
                onPress={() => setShowEndDatePicker(true)}
                className={cn(
                  "border rounded-lg px-4 py-3 bg-gray-50 flex-row items-center justify-between",
                  errors.endDate ? "border-red-300" : "border-gray-300"
                )}
              >
                <Text className="text-gray-900 text-lg">
                  {dateFormatter.formatDateShort(formData.endDate)}
                </Text>
                <Ionicons name="calendar-outline" size={20} color="#6b7280" />
              </Pressable>
              {errors.endDate && (
                <Text className="text-red-500 text-sm mt-1">{errors.endDate}</Text>
              )}
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View className="flex-row space-x-3 mb-6">
          <Pressable
            onPress={onCancel}
            className="flex-1 bg-gray-200 rounded-lg py-3"
          >
            <Text className="text-gray-700 font-medium text-center">Cancel</Text>
          </Pressable>
          <Pressable
            onPress={handleSubmit}
            disabled={isSubmitting}
            className={cn(
              "flex-1 rounded-lg py-3",
              isSubmitting ? "bg-gray-300" : "bg-blue-600"
            )}
          >
            <Text className="text-white font-medium text-center">
              {isSubmitting ? "Saving..." : submitButtonText}
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* Date Pickers */}
      {showStartDatePicker && (
        <DateTimePicker
          value={formData.startDate}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
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
          onChange={(event, selectedDate) => {
            setShowEndDatePicker(false);
            if (selectedDate) {
              setFormData(prev => ({ ...prev, endDate: selectedDate }));
            }
          }}
        />
      )}
    </KeyboardAvoidingView>
  );
}
