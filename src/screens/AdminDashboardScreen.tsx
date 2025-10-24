import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Modal,
  TextInput,
  Image,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as Clipboard from "expo-clipboard";
import { useAuthStore } from "../state/authStore";
import { useProjectStoreWithCompanyInit } from "../state/projectStore.supabase";
import { useUserStoreWithInit } from "../state/userStore.supabase";
import { useTaskStore } from "../state/taskStore.supabase";
import { useCompanyStore } from "../state/companyStore";
import { cn } from "../utils/cn";
import StandardHeader from "../components/StandardHeader";
import ModalHandle from "../components/ModalHandle";

interface AdminDashboardScreenProps {
  onNavigateToProjects: () => void;
  onNavigateToUserManagement: () => void;
  onNavigateToProfile: () => void;
}

export default function AdminDashboardScreen({ 
  onNavigateToProjects,
  onNavigateToUserManagement,
  onNavigateToProfile
}: AdminDashboardScreenProps) {
  const { user } = useAuthStore();
  const { getProjectsByCompany, userAssignments } = useProjectStoreWithCompanyInit(user.companyId);
  const { getUsersByCompany } = useUserStoreWithInit();
  const tasks = useTaskStore(state => state.tasks);
  const { getCompanyById, getCompanyBanner, updateCompanyBanner } = useCompanyStore();

  // Banner customization state
  const [showBannerModal, setShowBannerModal] = useState(false);
  const [bannerForm, setBannerForm] = useState({
    text: "",
    backgroundColor: "#3b82f6",
    textColor: "#ffffff",
    isVisible: true,
    imageUri: "",
  });

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

  const allProjects = getProjectsByCompany(user.companyId);
  // Get only users from the admin's company
  const allUsers = useUserStoreWithInit().getAllUsers();
  const companyUsers = getUsersByCompany(user.companyId);
  
  // Debug: Check company filtering
  console.log('=== COMPANY FILTERING DEBUG ===');
  console.log('Current user:', user.name, user.email);
  console.log('Current user company ID:', user.companyId);
  console.log('Current user company_id:', user.company_id);
  console.log('Total users in store:', allUsers.length);
  console.log('Company users after filtering:', companyUsers.length);
  console.log('Sample user company IDs:', allUsers.slice(0, 5).map(u => ({ 
    name: u.name, 
    companyId: u.companyId, 
    company_id: u.company_id,
    matches: u.companyId === user.companyId || u.company_id === user.companyId
  })));
  console.log('===============================');
  const currentCompany = getCompanyById(user.companyId);
  
  // Get company user IDs for filtering
  const companyUserIds = new Set(companyUsers.map(u => u.id));
  
  // Filter projects where company users are involved (either created by them OR assigned to them)
  const assignedProjectIds = new Set(
    userAssignments
      .filter(a => companyUserIds.has(a.userId) && a.isActive)
      .map(a => a.projectId)
  );
  const companyProjects = allProjects.filter(project => 
    companyUserIds.has(project.createdBy) || assignedProjectIds.has(project.id)
  );
  
  // Filter tasks that belong to company projects
  const companyProjectIds = new Set(companyProjects.map(p => p.id));
  const companyTasks = tasks.filter(task => companyProjectIds.has(task.projectId));
  
  // Debug logging
  console.log('Admin Dashboard Debug:');
  console.log('- Current user company ID:', user.companyId);
  console.log('- All projects:', allProjects.length);
  console.log('- Company projects:', companyProjects.length);
  console.log('- All tasks:', tasks.length);
  console.log('- Company tasks:', companyTasks.length);
  console.log('- Company users:', companyUsers.length);
  console.log('- Company user IDs:', Array.from(companyUserIds));
  console.log('- Project creators:', allProjects.map(p => p.createdBy));
  const userStore = useUserStoreWithInit();
  console.log('- All users count:', userStore.getAllUsers().length);
  console.log('- Company users details:', companyUsers.map(u => ({ id: u.id, name: u.name, companyId: u.companyId, company_id: u.company_id })));
  console.log('- Current user company ID:', user.companyId);
  console.log('- Sample user company IDs:', userStore.getAllUsers().slice(0, 3).map(u => ({ name: u.name, companyId: u.companyId, company_id: u.company_id })));
  
  // Filter user assignments for company users
  const companyAssignments = userAssignments.filter(a => companyUserIds.has(a.userId));
  
  
  // Calculate statistics
  const stats = {
    totalProjects: companyProjects.length, // Should be 0 since projects are created by different company users
    activeProjects: companyProjects.filter(p => p.status === "active").length,
    totalUsers: companyUsers.length, // Should be 4 for BuildTrack, 2 for Elite Electric
    assignedUsers: new Set(companyAssignments.filter(a => a.isActive).map(a => a.userId)).size,
    totalTasks: companyTasks.length, // Should be 0 since no projects from this company
    completedTasks: companyTasks.filter(t => t.currentStatus === "completed").length,
  };

  const projectsByStatus = {
    planning: companyProjects.filter(p => p.status === "planning").length,
    active: companyProjects.filter(p => p.status === "active").length,
    on_hold: companyProjects.filter(p => p.status === "on_hold").length,
    completed: companyProjects.filter(p => p.status === "completed").length,
    cancelled: companyProjects.filter(p => p.status === "cancelled").length,
  };

  const usersByRole = {
    admin: companyUsers.filter(u => u.role === "admin").length,
    manager: companyUsers.filter(u => u.role === "manager").length,
    worker: companyUsers.filter(u => u.role === "worker").length,
  };

  const StatCard = ({ 
    title, 
    count, 
    subtitle,
    icon, 
    color = "bg-blue-50", 
    iconColor = "#3b82f6",
    textColor = "text-blue-600",
    onPress 
  }: {
    title: string;
    count: number | string;
    subtitle?: string;
    icon: string;
    color?: string;
    iconColor?: string;
    textColor?: string;
    onPress?: () => void;
  }) => (
    <Pressable
      onPress={onPress}
      className={cn("flex-1 p-4 rounded-xl mr-3 mb-3", color)}
    >
      <View className="flex-row items-center justify-between mb-2">
        <Ionicons name={icon as any} size={24} color={iconColor} />
        <Text className={cn("text-2xl font-bold", textColor)}>{count}</Text>
      </View>
      <Text className="text-sm text-gray-700 font-medium">{title}</Text>
      {subtitle && (
        <Text className="text-xs text-gray-600 mt-1">{subtitle}</Text>
      )}
    </Pressable>
  );

  const QuickActionCard = ({
    title,
    description,
    icon,
    color = "bg-white",
    iconColor = "#6b7280",
    borderColor = "border-gray-200",
    onPress
  }: {
    title: string;
    description: string;
    icon: string;
    color?: string;
    iconColor?: string;
    borderColor?: string;
    onPress: () => void;
  }) => (
    <Pressable
      onPress={onPress}
      className={cn("rounded-xl border p-4 mb-3", color, borderColor)}
    >
      <View className="flex-row items-start">
        <View className="w-12 h-12 rounded-lg bg-gray-100 items-center justify-center mr-4">
          <Ionicons name={icon as any} size={24} color={iconColor} />
        </View>
        <View className="flex-1">
          <Text className="text-base font-semibold text-gray-900 mb-1">
            {title}
          </Text>
          <Text className="text-sm text-gray-600">
            {description}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
      </View>
    </Pressable>
  );

  // Banner customization handlers
  const openBannerModal = () => {
    const currentBanner = getCompanyBanner(user.companyId);
    if (currentBanner) {
      setBannerForm({
        text: currentBanner.text,
        backgroundColor: currentBanner.backgroundColor,
        textColor: currentBanner.textColor,
        isVisible: currentBanner.isVisible,
        imageUri: currentBanner.imageUri || "",
      });
    }
    setShowBannerModal(true);
  };

  const saveBanner = () => {
    updateCompanyBanner(user.companyId, bannerForm);
    setShowBannerModal(false);
    Alert.alert("Success", "Company banner updated successfully!");
  };

  const pickBannerImage = async () => {
    Alert.alert(
      "Select Banner Image",
      "Choose how you want to add a banner image",
      [
        {
          text: "Take Photo",
          onPress: async () => {
            try {
              // Request camera permissions
              const { status } = await ImagePicker.requestCameraPermissionsAsync();
              if (status !== 'granted') {
                Alert.alert('Permission Denied', 'Camera permission is required to take photos.');
                return;
              }

              const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images as any,
                allowsEditing: true,
                aspect: [16, 3], // Wide banner aspect ratio
                quality: 0.9,
              });

              if (!result.canceled && result.assets && result.assets[0]) {
                setBannerForm(prev => ({ ...prev, imageUri: result.assets[0].uri }));
              }
            } catch (error) {
              Alert.alert("Error", "Failed to take photo. Please try again.");
            }
          },
        },
        {
          text: "Choose from Library",
          onPress: async () => {
            try {
              // Request media library permissions
              const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
              if (status !== 'granted') {
                Alert.alert('Permission Denied', 'Photo library permission is required to select photos.');
                return;
              }

              const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images as any,
                allowsEditing: true,
                aspect: [16, 3], // Wide banner aspect ratio
                quality: 0.9,
              });

              if (!result.canceled && result.assets && result.assets[0]) {
                setBannerForm(prev => ({ ...prev, imageUri: result.assets[0].uri }));
              }
            } catch (error) {
              Alert.alert("Error", "Failed to pick image. Please try again.");
            }
          },
        },
        {
          text: "Paste from Clipboard",
          onPress: async () => {
            try {
              const hasImage = await Clipboard.hasImageAsync();
              
              if (!hasImage) {
                Alert.alert("No Image", "No image found in clipboard. Copy an image first.");
                return;
              }

              const imageUri = await Clipboard.getImageAsync({ format: 'png' });
              
              if (imageUri && imageUri.data) {
                // Convert base64 to URI format
                const uri = `data:image/png;base64,${imageUri.data}`;
                setBannerForm(prev => ({ ...prev, imageUri: uri }));
                Alert.alert("Success", "Image pasted from clipboard!");
              } else {
                Alert.alert("Error", "Could not paste image from clipboard");
              }
            } catch (error) {
              console.error("Clipboard paste error:", error);
              Alert.alert("Error", "Failed to paste from clipboard");
            }
          },
        },
        {
          text: "Cancel",
          style: "cancel",
        },
      ]
    );
  };

  const removeBannerImage = () => {
    Alert.alert(
      "Remove Banner Image",
      "Are you sure you want to remove the banner image? The text banner will be used instead.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => setBannerForm(prev => ({ ...prev, imageUri: "" })),
        },
      ]
    );
  };

  const colorPresets = [
    { name: "Blue", bg: "#3b82f6", text: "#ffffff" },
    { name: "Green", bg: "#10b981", text: "#ffffff" },
    { name: "Red", bg: "#ef4444", text: "#ffffff" },
    { name: "Purple", bg: "#7c3aed", text: "#ffffff" },
    { name: "Yellow", bg: "#f59e0b", text: "#000000" },
    { name: "Gray", bg: "#6b7280", text: "#ffffff" },
  ];

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <StatusBar style="dark" />
      
      {/* Standard Header */}
      <StandardHeader 
        title="Admin Dashboard"
        rightElement={
          <Pressable onPress={onNavigateToProfile}>
            <View className="w-10 h-10 bg-purple-600 rounded-full items-center justify-center">
              <Text className="text-white font-bold text-lg">
                {user.name.charAt(0).toUpperCase()}
              </Text>
            </View>
          </Pressable>
        }
      />

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>

        {/* Company Info Banner */}
        {currentCompany && (
          <View className="px-6">
            <View className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-2">
              <View className="flex-row items-center">
                <Ionicons name="business" size={16} color="#3b82f6" />
                <Text className="text-blue-900 font-medium ml-2 flex-1">
                  {currentCompany.name}
                </Text>
              </View>
              <Text className="text-blue-700 text-xs mt-1">
                Showing data for your company only
              </Text>
            </View>
          </View>
        )}

        {/* Company Overview */}
        <View className="px-6 pb-4 pt-6">
          <Text className="text-lg font-semibold text-gray-900 mb-3">
            Company Overview
          </Text>
          
          {/* Project Status */}
          <View className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
            <Text className="text-base font-semibold text-gray-900 mb-3">
              Project Status
            </Text>
            <View className="flex-row">
              <View className="flex-1 items-center">
                <Text className="text-xl font-bold text-blue-600">{stats.totalProjects}</Text>
                <Text className="text-xs text-gray-600">Total Projects</Text>
              </View>
              <View className="flex-1 items-center">
                <Text className="text-xl font-bold text-green-600">{projectsByStatus.active}</Text>
                <Text className="text-xs text-gray-600">In Progress</Text>
              </View>
              <View className="flex-1 items-center">
                <Text className="text-xl font-bold text-gray-600">{projectsByStatus.completed}</Text>
                <Text className="text-xs text-gray-600">Completed</Text>
              </View>
            </View>
          </View>

          {/* User Role Distribution */}
          <View className="bg-white rounded-xl border border-gray-200 p-4">
            <Text className="text-base font-semibold text-gray-900 mb-3">
              User Roles
            </Text>
            <View className="flex-row">
              <View className="flex-1 items-center">
                <Text className="text-xl font-bold text-purple-600">{usersByRole.admin}</Text>
                <Text className="text-xs text-gray-600">Admins</Text>
              </View>
              <View className="flex-1 items-center">
                <Text className="text-xl font-bold text-blue-600">{usersByRole.manager}</Text>
                <Text className="text-xs text-gray-600">Managers</Text>
              </View>
              <View className="flex-1 items-center">
                <Text className="text-xl font-bold text-green-600">{usersByRole.worker}</Text>
                <Text className="text-xs text-gray-600">Workers</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Administrative Actions */}
        <View className="px-6 pb-4">
          <Text className="text-lg font-semibold text-gray-900 mb-3">
            Administrative Actions
          </Text>
          
          <QuickActionCard
            title="Manage Projects"
            description="Create, edit, and oversee all construction projects"
            icon="folder-open-outline"
            color="bg-blue-50"
            iconColor="#3b82f6"
            borderColor="border-blue-300"
            onPress={onNavigateToProjects}
          />

          <QuickActionCard
            title="User Management"
            description="Assign users to projects and manage team categories"
            icon="people-outline"
            color="bg-purple-50"
            iconColor="#7c3aed"
            borderColor="border-purple-300"
            onPress={onNavigateToUserManagement}
          />

          <QuickActionCard
            title="Company Banner"
            description="Customize the banner displayed across all company screens"
            icon="megaphone-outline"
            color="bg-amber-50"
            iconColor="#f59e0b"
            borderColor="border-amber-300"
            onPress={openBannerModal}
          />
        </View>
      </ScrollView>

      {/* Banner Customization Modal */}
      <Modal
        visible={showBannerModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowBannerModal(false)}
      >
        <SafeAreaView className="flex-1 bg-gray-50">
          <StatusBar style="dark" />
          
          <ModalHandle />
          
          {/* Modal Header */}
          <View className="flex-row items-center bg-white border-b border-gray-200 px-6 py-4">
            <Pressable 
              onPress={() => setShowBannerModal(false)}
              className="mr-4 w-10 h-10 items-center justify-center"
            >
              <Ionicons name="close" size={24} color="#374151" />
            </Pressable>
            <Text className="text-xl font-semibold text-gray-900 flex-1">
              Company Banner Settings
            </Text>
          </View>

          <ScrollView className="flex-1 px-6 py-4">
            {/* Banner Preview */}
            <View className="mb-6">
              <Text className="text-sm font-semibold text-gray-700 mb-2">Preview</Text>
              {bannerForm.isVisible && (
                <View className="rounded-lg overflow-hidden">
                  {bannerForm.imageUri ? (
                    // Image Banner Preview
                    <Image
                      source={{ uri: bannerForm.imageUri }}
                      className="w-full h-24"
                      resizeMode="cover"
                    />
                  ) : (
                    // Text Banner Preview
                    <View 
                      className="px-4 py-3"
                      style={{ backgroundColor: bannerForm.backgroundColor }}
                    >
                      <Text 
                        className="text-sm font-medium text-center"
                        style={{ color: bannerForm.textColor }}
                      >
                        {bannerForm.text || "Your banner text will appear here"}
                      </Text>
                    </View>
                  )}
                </View>
              )}
              {!bannerForm.isVisible && (
                <View className="bg-gray-100 px-4 py-3 rounded-lg border border-gray-300">
                  <Text className="text-sm text-gray-500 text-center">
                    Banner is hidden
                  </Text>
                </View>
              )}
            </View>

            {/* Banner Image Upload */}
            <View className="mb-6">
              <View className="flex-row items-center justify-between mb-3">
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-gray-700">
                    Banner Image (Optional)
                  </Text>
                  <Text className="text-xs text-gray-500 mt-1">
                    Recommended size: 1200x225px
                  </Text>
                </View>
                {bannerForm.imageUri && (
                  <Pressable
                    onPress={removeBannerImage}
                    className="w-8 h-8 bg-red-500 rounded-full items-center justify-center ml-2"
                  >
                    <Ionicons name="trash-outline" size={16} color="white" />
                  </Pressable>
                )}
              </View>
              
              {bannerForm.imageUri ? (
                <Pressable onPress={pickBannerImage}>
                  <Image
                    source={{ uri: bannerForm.imageUri }}
                    style={{ 
                      width: '100%', 
                      height: 128, 
                      borderRadius: 8,
                      backgroundColor: '#f3f4f6'
                    }}
                    resizeMode="cover"
                  />
                  <View style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.2)',
                    borderRadius: 8,
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <View style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.9)',
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderRadius: 8
                    }}>
                      <Text className="text-gray-900 font-medium text-sm">Tap to change</Text>
                    </View>
                  </View>
                </Pressable>
              ) : (
                <Pressable
                  onPress={pickBannerImage}
                  className="bg-white rounded-lg border border-dashed border-gray-300 p-4 items-center"
                >
                  <Ionicons name="images-outline" size={24} color="#9ca3af" />
                  <Text className="text-gray-400 text-sm mt-1">Tap to add banner image</Text>
                </Pressable>
              )}
            </View>

            {/* Separator */}
            {!bannerForm.imageUri && (
              <View className="flex-row items-center mb-6">
                <View className="flex-1 h-px bg-gray-300" />
                <Text className="text-xs text-gray-500 mx-3">OR USE TEXT BANNER</Text>
                <View className="flex-1 h-px bg-gray-300" />
              </View>
            )}

            {/* Banner Text Input - Only show if no image */}
            {!bannerForm.imageUri && (
              <>
                <View className="mb-4">
                  <Text className="text-sm font-semibold text-gray-700 mb-2">Banner Text</Text>
                  <TextInput
                    className="bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-900"
                    placeholder="Enter banner message..."
                    value={bannerForm.text}
                    onChangeText={(text) => setBannerForm({ ...bannerForm, text })}
                    multiline
                  />
                </View>

                {/* Color Presets */}
                <View className="mb-4">
                  <Text className="text-sm font-semibold text-gray-700 mb-2">Color Preset</Text>
                  <View className="flex-row flex-wrap -mx-1">
                    {colorPresets.map((preset) => (
                      <Pressable
                        key={preset.name}
                        onPress={() => setBannerForm({ 
                          ...bannerForm, 
                          backgroundColor: preset.bg,
                          textColor: preset.text
                        })}
                        className="w-1/3 px-1 mb-2"
                      >
                        <View 
                          className="rounded-lg py-3 items-center justify-center border-2"
                          style={{ 
                            backgroundColor: preset.bg,
                            borderColor: bannerForm.backgroundColor === preset.bg ? "#374151" : "transparent"
                          }}
                        >
                          <Text style={{ color: preset.text }} className="text-xs font-medium">
                            {preset.name}
                          </Text>
                        </View>
                      </Pressable>
                    ))}
                  </View>
                </View>
              </>
            )}

            {/* Visibility Toggle */}
            <View className="mb-4">
              <View className="bg-white rounded-lg border border-gray-300 px-4 py-3">
                <View className="flex-row items-center justify-between">
                  <View className="flex-1 mr-4">
                    <Text className="text-sm font-semibold text-gray-900 mb-1">
                      Banner Visibility
                    </Text>
                    <Text className="text-xs text-gray-600">
                      {bannerForm.isVisible ? "Banner will be shown to all users" : "Banner is hidden from all users"}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => setBannerForm({ ...bannerForm, isVisible: !bannerForm.isVisible })}
                    className={cn(
                      "w-12 h-7 rounded-full flex-row items-center px-0.5",
                      bannerForm.isVisible ? "bg-green-500" : "bg-gray-300"
                    )}
                  >
                    <View 
                      className={cn(
                        "w-6 h-6 rounded-full bg-white",
                        bannerForm.isVisible && "ml-auto"
                      )}
                    />
                  </Pressable>
                </View>
              </View>
            </View>

            {/* Save Button */}
            <Pressable
              onPress={saveBanner}
              className="bg-blue-600 rounded-lg py-4 items-center justify-center mt-2"
            >
              <Text className="text-white font-semibold text-base">
                Save Banner Settings
              </Text>
            </Pressable>

            {/* Cancel Button */}
            <Pressable
              onPress={() => setShowBannerModal(false)}
              className="bg-gray-200 rounded-lg py-4 items-center justify-center mt-3 mb-6"
            >
              <Text className="text-gray-700 font-semibold text-base">
                Cancel
              </Text>
            </Pressable>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}