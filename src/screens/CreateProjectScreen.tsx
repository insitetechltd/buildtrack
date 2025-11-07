import React, { useState } from "react";
import { View, Text, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useAuthStore } from "../state/authStore";
import { useProjectStoreWithCompanyInit } from "../state/projectStore.supabase";
import { useCompanyStore } from "../state/companyStore";
import StandardHeader from "../components/StandardHeader";
import ProjectForm from "../components/ProjectForm";
import { notifyDataMutation } from "../utils/DataRefreshManager";

interface CreateProjectScreenProps {
  onNavigateBack: () => void;
}

export default function CreateProjectScreen({ onNavigateBack }: CreateProjectScreenProps) {
  const { user } = useAuthStore();
  const { createProject, assignUserToProject } = useProjectStoreWithCompanyInit(user?.companyId || "");
  const { getCompanyBanner } = useCompanyStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!user || user.role !== "admin") {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <StatusBar style="dark" />
        <View className="flex-1 items-center justify-center">
          <Text className="text-gray-500">Access denied. Admin role required.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const handleSubmit = async (formData: any) => {
    setIsSubmitting(true);

    try {
      const newProject = await createProject({
        name: formData.name,
        description: formData.description,
        status: formData.status,
        startDate: formData.startDate.toISOString(),
        endDate: formData.endDate.toISOString(),
        location: formData.location,
        clientInfo: {
          name: formData.clientInfo.name,
          email: formData.clientInfo.email || undefined,
          phone: formData.clientInfo.phone || undefined,
        },
        createdBy: user.id,
        companyId: user.companyId,
      });

      // Assign Lead PM if selected
      if (formData.selectedLeadPM && newProject) {
        await assignUserToProject(formData.selectedLeadPM, newProject.id, "lead_project_manager", user.id);
      }

      // Notify all users about the new project
      notifyDataMutation('project');

      Alert.alert(
        "Project Created",
        "Project has been created successfully. You can now assign users to it.",
        [
          {
            text: "OK",
            onPress: onNavigateBack,
          },
        ]
      );
    } catch (error) {
      console.error("Error creating project:", error);
      Alert.alert("Error", "Failed to create project. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <StatusBar style="dark" />
      
      <StandardHeader
        title="Create New Project"
        showBackButton={true}
        onBackPress={onNavigateBack}
      />

      <ProjectForm
        mode="create"
        onSubmit={handleSubmit}
        onCancel={onNavigateBack}
        submitButtonText="Create"
        isSubmitting={isSubmitting}
      />
    </SafeAreaView>
  );
}