import React, { useState } from "react";
import { View, Text, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useAuthStore } from "../state/authStore";
import { isAdmin } from "../types/buildtrack";
import { useProjectStoreWithCompanyInit } from "../state/projectStore.supabase";
import { useCompanyStore } from "../state/companyStore";
import StandardHeader from "../components/StandardHeader";
import ProjectForm from "../components/ProjectForm";
import { notifyDataMutation } from "../utils/DataRefreshManager";

interface CreateProjectScreenProps {
  onNavigateBack: (projectId?: string) => void;
}

export default function CreateProjectScreen({ onNavigateBack }: CreateProjectScreenProps) {
  const { user } = useAuthStore();
  const projectStore = useProjectStoreWithCompanyInit(user?.companyId || "");
  const { createProject, fetchProjects } = projectStore;
  const { getCompanyBanner } = useCompanyStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isAdmin(user)) {
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
      console.log('🔨 Creating project...');
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

      console.log('✅ Project created:', newProject?.id);
      console.log('📋 Project details:', {
        id: newProject?.id,
        name: formData.name,
        companyId: user.companyId,
        createdBy: user.id
      });

      // Wait a moment for database to fully process
      console.log('⏳ Waiting for database to process...');
      await new Promise(resolve => setTimeout(resolve, 1000)); // Increased to 1 second

      // Fetch fresh project data with retry logic - keep trying until successful
      console.log('🔄 Fetching fresh project list...');
      let retries = 0;
      const maxRetries = 10; // Increased max retries
      let projectExists = false;
      
      while (retries < maxRetries && !projectExists) {
        await fetchProjects();
        
        // Log current projects in store
        console.log(`📊 Current projects in store: ${projectStore.projects.length}`);
        projectStore.projects.forEach(p => {
          console.log(`  - "${p.name}" (ID: ${p.id}, Company: ${p.companyId})`);
        });
        
        // Check if the new project is in the store
        projectExists = projectStore.projects.some(p => p.id === newProject?.id);
        
        if (projectExists) {
          console.log('✅ New project confirmed in store');
          break;
        }
        
        retries++;
        console.log(`⏳ Project not found yet, retrying (${retries}/${maxRetries})...`);
        await new Promise(resolve => setTimeout(resolve, 800)); // Increased delay
      }

      if (!projectExists) {
        console.warn('⚠️ Project created but not yet visible in list. It may appear after a refresh.');
        Alert.alert(
          "Project Created", 
          "Your project was created successfully, but it may take a moment to appear in the list.",
          [{ text: "OK", onPress: () => onNavigateBack(newProject?.id) }]
        );
        return;
      }

      // Notify all users about the new project
      notifyDataMutation('project');

      console.log('✅ Navigating back to projects screen with project ID:', newProject?.id);
      // Navigate back with the new project ID so ProjectsScreen can verify it's loaded
      onNavigateBack(newProject?.id);
    } catch (error) {
      console.error("❌ Error creating project:", error);
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