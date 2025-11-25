import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useAuthStore } from "../state/authStore";
import { ProjectStatus, Project } from "../types/buildtrack";
import { cn } from "../utils/cn";

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

export default function ProjectForm({
  mode,
  project,
  onSubmit,
  onCancel,
  submitButtonText,
  isSubmitting = false,
}: ProjectFormProps) {
  const { user } = useAuthStore();

  const [formData, setFormData] = useState<ProjectFormData>({
    name: project?.name || "",
    description: project?.description || "",
    status: project?.status || "planning",
    startDate: project?.startDate ? new Date(project.startDate) : new Date(),
    endDate: project?.endDate ? new Date(project.endDate) : new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
    location: project?.location || "",
    clientInfo: project?.clientInfo || {
      name: "",
      email: "",
      phone: "",
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
      clientInfo: project?.clientInfo || {
        name: "",
        email: "",
        phone: "",
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
    { label: "Active", value: "active" },
    { label: "On Hold", value: "on_hold" },
    { label: "Completed", value: "completed" },
    { label: "Cancelled", value: "cancelled" },
  ];

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1"
    >
      <ScrollView className="flex-1 px-4 py-3" keyboardShouldPersistTaps="handled">
        {/* Project Information */}
        <View className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
          <Text className="text-2xl font-bold text-gray-900 mb-4">Project Information</Text>
          
          <View className="space-y-4">
            {/* Client Name */}
            <View>
              <Text className="text-lg font-medium text-gray-700 mb-2">Client</Text>
              <TextInput
                className={cn(
                  "border rounded-lg px-4 py-3 text-gray-900 bg-gray-50 text-lg",
                  errors.clientName ? "border-red-300" : "border-gray-300"
                )}
                placeholder="Enter client name"
                value={formData.clientInfo.name}
                onChangeText={(text) => handleClientChange("name", text)}
                maxLength={100}
              />
              {errors.clientName && (
                <Text className="text-red-500 text-sm mt-1">{errors.clientName}</Text>
              )}
            </View>

            {/* Project Name */}
            <View>
              <Text className="text-lg font-medium text-gray-700 mb-2">
                Project Title <Text className="text-red-500">*</Text>
              </Text>
              <TextInput
                className={cn(
                  "border rounded-lg px-4 py-3 text-gray-900 bg-gray-50 text-lg",
                  errors.name ? "border-red-300" : "border-gray-300"
                )}
                placeholder="Enter project name"
                value={formData.name}
                onChangeText={handleNameChange}
                maxLength={100}
              />
              {errors.name && (
                <Text className="text-red-500 text-sm mt-1">{errors.name}</Text>
              )}
            </View>

            {/* Description */}
            <View>
              <Text className="text-lg font-medium text-gray-700 mb-2">Description</Text>
              <TextInput
                className={cn(
                  "border rounded-lg px-4 py-3 text-gray-900 bg-gray-50 text-lg min-h-[90px]",
                  errors.description ? "border-red-300" : "border-gray-300"
                )}
                placeholder="Project description"
                value={formData.description}
                onChangeText={handleDescriptionChange}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                maxLength={500}
                style={{ minHeight: 90 }}
              />
              {errors.description && (
                <Text className="text-red-500 text-sm mt-1">{errors.description}</Text>
              )}
            </View>

            {/* Status */}
            <View className="relative" style={{ zIndex: showStatusPicker ? 1000 : 1 }}>
              <Text className="text-lg font-medium text-gray-700 mb-2">Status</Text>
              
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
              
              {/* Dropdown Options */}
              {showStatusPicker && (
                <View 
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

        {/* Location */}
        <View className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
          <Text className="text-2xl font-bold text-gray-900 mb-3">Location</Text>
          
          <View>
            <TextInput
              className={cn(
                "border rounded-lg px-4 py-3 text-gray-900 bg-gray-50 text-lg min-h-[130px]",
                errors.location ? "border-red-300" : "border-gray-300"
              )}
              placeholder="Enter full address (street, city, state/province, postal code, country)"
              value={formData.location}
              onChangeText={handleLocationChange}
              multiline={true}
              numberOfLines={5}
              textAlignVertical="top"
              style={{ minHeight: 130 }}
            />
            {errors.location && (
              <Text className="text-red-500 text-sm mt-1">{errors.location}</Text>
            )}
          </View>
        </View>

        {/* Project Timeline */}
        <View className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
          <Text className="text-2xl font-bold text-gray-900 mb-4">Project Timeline</Text>
          
          <View className="flex-row space-x-4">
            <View className="flex-1">
              <Text className="text-lg font-medium text-gray-700 mb-2">Start Date</Text>
              <Pressable
                onPress={() => setShowStartDatePicker(true)}
                className="border border-gray-300 rounded-lg px-4 py-3 bg-gray-50 flex-row items-center justify-between"
              >
                <Text className="text-gray-900 text-lg">
                  {formData.startDate.toLocaleDateString()}
                </Text>
                <Ionicons name="calendar-outline" size={20} color="#6b7280" />
              </Pressable>
            </View>

            <View className="flex-1">
              <Text className="text-lg font-medium text-gray-700 mb-2">Estimated End Date</Text>
              <Pressable
                onPress={() => setShowEndDatePicker(true)}
                className={cn(
                  "border rounded-lg px-4 py-3 bg-gray-50 flex-row items-center justify-between",
                  errors.endDate ? "border-red-300" : "border-gray-300"
                )}
              >
                <Text className="text-gray-900 text-lg">
                  {formData.endDate.toLocaleDateString()}
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
