import { useCallback, useMemo, useState } from "react";
import { Alert } from "react-native";
import * as Clipboard from "expo-clipboard";
import * as ImagePicker from "expo-image-picker";

import { useAuthStore } from "@/state/authStore";
import { useCompanyStore } from "@/state/companyStore";
import { useProjectStoreWithCompanyInit } from "@/state/projectStore.supabase";
import { useTaskStore } from "@/state/taskStore.supabase";
import { useUserStoreWithInit } from "@/state/userStore.supabase";
import {
  getUserSystemPermission,
  isAdmin,
  type Company,
} from "@/types/buildtrack";
import type {
  AdminDashboardBannerColorPreset,
  AdminDashboardBannerSettingsModel,
  AdminDashboardQuickActionId,
  AdminDashboardScreenViewAdapterOutput,
} from "@/ui/contracts/viewAdapters";

interface AdminDashboardBannerFormState {
  text: string;
  backgroundColor: string;
  textColor: string;
  isVisible: boolean;
  imageUri: string;
}

export interface AdminDashboardViewAdapterProps {
  onNavigateToProjects: () => void;
  onNavigateToUserManagement: () => void;
  onNavigateToProfile: () => void;
  onNavigateToDevAdmin?: () => void;
}

export interface AdminDashboardViewAdapterHookResult {
  output: AdminDashboardScreenViewAdapterOutput;
  actions: {
    handleRefresh: () => Promise<void>;
    pressQuickAction: (actionId: AdminDashboardQuickActionId) => void;
    toggleProfileMenu: () => void;
    openBannerSettings: () => void;
    closeBannerSettings: () => void;
    setBannerText: (value: string) => void;
    selectBannerColorPreset: (presetId: string) => void;
    toggleBannerVisibility: () => void;
    pickBannerImage: () => Promise<void>;
    removeBannerImage: () => void;
    saveBannerSettings: () => Promise<void>;
    navigateToProfile: () => void;
    confirmLogout: () => void;
  };
}

const DEFAULT_BANNER_FORM: AdminDashboardBannerFormState = {
  text: "",
  backgroundColor: "#3b82f6",
  textColor: "#ffffff",
  isVisible: true,
  imageUri: "",
};

const BANNER_COLOR_PRESETS: AdminDashboardBannerColorPreset[] = [
  {
    id: "banner-preset:blue",
    label: "Blue",
    backgroundColor: "#3b82f6",
    textColor: "#ffffff",
  },
  {
    id: "banner-preset:green",
    label: "Green",
    backgroundColor: "#10b981",
    textColor: "#ffffff",
  },
  {
    id: "banner-preset:red",
    label: "Red",
    backgroundColor: "#ef4444",
    textColor: "#ffffff",
  },
  {
    id: "banner-preset:purple",
    label: "Purple",
    backgroundColor: "#7c3aed",
    textColor: "#ffffff",
  },
  {
    id: "banner-preset:yellow",
    label: "Yellow",
    backgroundColor: "#f59e0b",
    textColor: "#000000",
  },
  {
    id: "banner-preset:gray",
    label: "Gray",
    backgroundColor: "#6b7280",
    textColor: "#ffffff",
  },
];

function getBannerFormState(banner: Company["banner"] | undefined): AdminDashboardBannerFormState {
  if (!banner) {
    return DEFAULT_BANNER_FORM;
  }

  return {
    text: banner.text,
    backgroundColor: banner.backgroundColor,
    textColor: banner.textColor,
    isVisible: banner.isVisible,
    imageUri: banner.imageUri || "",
  };
}

function getRoleLabel(role: string | undefined): string {
  if (!role) {
    return "Admin";
  }

  return role
    .split("_")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function isCompletedTaskStatus(status: string): boolean {
  return status === "completed" || status === "approved" || status === "done";
}

export function useAdminDashboardViewAdapter(
  props: AdminDashboardViewAdapterProps,
): AdminDashboardViewAdapterHookResult {
  const {
    onNavigateToProjects,
    onNavigateToUserManagement,
    onNavigateToProfile,
    onNavigateToDevAdmin,
  } = props;
  const { user, logout } = useAuthStore();
  const currentCompanyId = user?.companyId || "";
  const projectStore = useProjectStoreWithCompanyInit(currentCompanyId);
  const userStore = useUserStoreWithInit();
  const tasks = useTaskStore((state) => state.tasks);
  const fetchTasks = useTaskStore((state) => state.fetchTasks);
  const { getCompanyById, getCompanyBanner, updateCompanyBanner } = useCompanyStore();
  const { getProjectsByCompany, userAssignments, fetchProjects } = projectStore;
  const { getUsersByCompany, fetchUsers } = userStore;

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isProfileMenuVisible, setIsProfileMenuVisible] = useState(false);
  const [isBannerModalVisible, setIsBannerModalVisible] = useState(false);
  const [bannerForm, setBannerForm] = useState<AdminDashboardBannerFormState>(DEFAULT_BANNER_FORM);

  const adminUser = isAdmin(user) ? user : null;
  const allProjects = useMemo(
    () => (adminUser ? getProjectsByCompany(adminUser.companyId) : []),
    [adminUser, getProjectsByCompany],
  );
  const companyUsers = useMemo(
    () => (adminUser ? getUsersByCompany(adminUser.companyId) : []),
    [adminUser, getUsersByCompany],
  );
  const currentCompany = useMemo(
    () => (adminUser ? getCompanyById(adminUser.companyId) : undefined),
    [adminUser, getCompanyById],
  );

  const companyUserIds = useMemo(
    () => new Set(companyUsers.map((companyUser) => companyUser.id)),
    [companyUsers],
  );

  const assignedProjectIds = useMemo(
    () =>
      new Set(
        userAssignments
          .filter((assignment) => companyUserIds.has(assignment.userId) && assignment.isActive)
          .map((assignment) => assignment.projectId),
      ),
    [companyUserIds, userAssignments],
  );

  const companyProjects = useMemo(
    () =>
      allProjects.filter(
        (project) =>
          companyUserIds.has(project.createdBy) || assignedProjectIds.has(project.id),
      ),
    [allProjects, assignedProjectIds, companyUserIds],
  );

  const companyProjectIds = useMemo(
    () => new Set(companyProjects.map((project) => project.id)),
    [companyProjects],
  );

  const companyTasks = useMemo(
    () => tasks.filter((task) => companyProjectIds.has(task.projectId)),
    [companyProjectIds, tasks],
  );

  const companyAssignments = useMemo(
    () => userAssignments.filter((assignment) => companyUserIds.has(assignment.userId)),
    [companyUserIds, userAssignments],
  );

  const bannerSettings = useMemo<AdminDashboardBannerSettingsModel>(
    () => ({
      isModalVisible: isBannerModalVisible,
      text: bannerForm.text,
      backgroundColor: bannerForm.backgroundColor,
      textColor: bannerForm.textColor,
      isVisible: bannerForm.isVisible,
      imageUri: bannerForm.imageUri,
      colorPresets: BANNER_COLOR_PRESETS,
    }),
    [bannerForm, isBannerModalVisible],
  );

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);

    try {
      await Promise.all([fetchUsers(), fetchProjects(), fetchTasks()]);
    } catch (error) {
      console.error("AdminDashboardScreen: Error refreshing dashboard", error);
    } finally {
      setIsRefreshing(false);
    }
  }, [fetchProjects, fetchTasks, fetchUsers]);

  const openBannerSettings = useCallback(() => {
    if (!adminUser) {
      return;
    }

    setBannerForm(getBannerFormState(getCompanyBanner(adminUser.companyId)));
    setIsBannerModalVisible(true);
  }, [adminUser, getCompanyBanner]);

  const closeBannerSettings = useCallback(() => {
    setIsBannerModalVisible(false);
  }, []);

  const selectBannerColorPreset = useCallback((presetId: string) => {
    const preset = BANNER_COLOR_PRESETS.find((item) => item.id === presetId);

    if (!preset) {
      return;
    }

    setBannerForm((current) => ({
      ...current,
      backgroundColor: preset.backgroundColor,
      textColor: preset.textColor,
    }));
  }, []);

  const pickBannerImage = useCallback(async () => {
    Alert.alert("Select Banner Image", "Choose how you want to add a banner image", [
      {
        text: "Take Photo",
        onPress: async () => {
          try {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();

            if (status !== "granted") {
              Alert.alert("Permission Denied", "Camera permission is required to take photos.");
              return;
            }

            const result = await ImagePicker.launchCameraAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images as any,
              allowsEditing: true,
              aspect: [16, 3],
              quality: 0.9,
            });

            if (!result.canceled && result.assets?.[0]?.uri) {
              setBannerForm((current) => ({
                ...current,
                imageUri: result.assets[0].uri,
              }));
            }
          } catch (_error) {
            Alert.alert("Error", "Failed to take photo. Please try again.");
          }
        },
      },
      {
        text: "Choose from Library",
        onPress: async () => {
          try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

            if (status !== "granted") {
              Alert.alert(
                "Permission Denied",
                "Photo library permission is required to select photos.",
              );
              return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images as any,
              allowsEditing: true,
              aspect: [16, 3],
              quality: 0.9,
            });

            if (!result.canceled && result.assets?.[0]?.uri) {
              setBannerForm((current) => ({
                ...current,
                imageUri: result.assets[0].uri,
              }));
            }
          } catch (_error) {
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

            const image = await Clipboard.getImageAsync({ format: "png" });

            if (!image?.data) {
              Alert.alert("Error", "Could not paste image from clipboard");
              return;
            }

            setBannerForm((current) => ({
              ...current,
              imageUri: `data:image/png;base64,${image.data}`,
            }));
            Alert.alert("Success", "Image pasted from clipboard!");
          } catch (error) {
            console.error("AdminDashboardScreen: Clipboard paste error", error);
            Alert.alert("Error", "Failed to paste from clipboard");
          }
        },
      },
      {
        text: "Cancel",
        style: "cancel",
      },
    ]);
  }, []);

  const removeBannerImage = useCallback(() => {
    Alert.alert(
      "Remove Banner Image",
      "Are you sure you want to remove the banner image? The text banner will be used instead.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () =>
            setBannerForm((current) => ({
              ...current,
              imageUri: "",
            })),
        },
      ],
    );
  }, []);

  const saveBannerSettings = useCallback(async () => {
    if (!adminUser) {
      return;
    }

    await updateCompanyBanner(adminUser.companyId, bannerForm);
    setIsBannerModalVisible(false);
    Alert.alert("Success", "Company banner updated successfully!");
  }, [adminUser, bannerForm, updateCompanyBanner]);

  const pressQuickAction = useCallback(
    (actionId: AdminDashboardQuickActionId) => {
      switch (actionId) {
        case "projects":
          onNavigateToProjects();
          return;
        case "user_management":
          onNavigateToUserManagement();
          return;
        case "company_banner":
          openBannerSettings();
          return;
        case "dev_admin":
          onNavigateToDevAdmin?.();
          return;
      }
    },
    [
      onNavigateToDevAdmin,
      onNavigateToProjects,
      onNavigateToUserManagement,
      openBannerSettings,
    ],
  );

  const navigateToProfile = useCallback(() => {
    setIsProfileMenuVisible(false);
    onNavigateToProfile();
  }, [onNavigateToProfile]);

  const confirmLogout = useCallback(() => {
    setIsProfileMenuVisible(false);
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: logout,
      },
    ]);
  }, [logout]);

  const output = useMemo<AdminDashboardScreenViewAdapterOutput>(() => {
    const isAllowed = isAdmin(user);
    const completedTasks = companyTasks.filter((task) => isCompletedTaskStatus(task.status)).length;
    const activeProjects = companyProjects.filter((project) => project.status === "active").length;
    const assignedUsers = new Set(
      companyAssignments.filter((assignment) => assignment.isActive).map((assignment) => assignment.userId),
    ).size;
    const adminCount = companyUsers.filter(
      (companyUser) => getUserSystemPermission(companyUser) === "admin",
    ).length;
    const structuralState = companyProjects.length === 0 ? "empty" : "stale";
    const permissionLabel = adminUser ? getRoleLabel(getUserSystemPermission(adminUser)) : "Admin";

    return {
      screenId: "AdminDashboardScreen",
      readiness: {
        hasInitialFrame: true,
        hasUsableData: Boolean(user),
        isBackgroundRefreshing: isRefreshing,
        isNavigationTransitionActive: false,
      },
      continuity: {
        isInitialLoading: false,
        isBackgroundRefreshing: isRefreshing,
        hasCachedFrame: Boolean(user),
        shouldRenderSkeletonShell: false,
        shouldRenderEmptyState: false,
        freshnessLabel: isRefreshing ? "Refreshing" : "Ready",
      },
      access: {
        isAllowed,
        deniedMessage: isAllowed ? null : "Access denied. Admin role required.",
      },
      companyScope: {
        companyName: currentCompany?.name,
        subtitle: currentCompany ? "Showing data for your company only" : undefined,
      },
      topLevelStats: [
        {
          id: "admin-stat:projects",
          statId: "projects",
          label: "Projects",
          value: companyProjects.length,
          subtitle: `${activeProjects} active`,
          icon: "folder-open-outline",
          color: "bg-blue-50",
          iconColor: "#3b82f6",
          textColor: "text-blue-600",
          density: "standard",
          structuralState,
        },
        {
          id: "admin-stat:team",
          statId: "team",
          label: "Team Members",
          value: companyUsers.length,
          subtitle: `${assignedUsers} assigned`,
          icon: "people-outline",
          color: "bg-purple-50",
          iconColor: "#7c3aed",
          textColor: "text-purple-600",
          density: "standard",
          structuralState,
        },
        {
          id: "admin-stat:completed_tasks",
          statId: "completed_tasks",
          label: "Completed Tasks",
          value: completedTasks,
          subtitle: `${companyTasks.length} total tracked`,
          icon: "checkmark-done-outline",
          color: "bg-green-50",
          iconColor: "#10b981",
          textColor: "text-green-600",
          density: "standard",
          structuralState,
        },
        {
          id: "admin-stat:admins",
          statId: "admins",
          label: "Admins",
          value: adminCount,
          subtitle: permissionLabel,
          icon: "shield-checkmark-outline",
          color: "bg-amber-50",
          iconColor: "#f59e0b",
          textColor: "text-amber-600",
          density: "standard",
          structuralState,
        },
      ],
      quickActions: [
        {
          id: "admin-action:projects",
          actionId: "projects",
          label: "Projects",
          description: "Create, edit, and oversee all construction projects",
          icon: "folder-open-outline",
          color: "bg-blue-50",
          iconColor: "#3b82f6",
          borderColor: "border-blue-300",
          isVisible: true,
          density: "standard",
          structuralState: "stale",
        },
        {
          id: "admin-action:user_management",
          actionId: "user_management",
          label: "User Management",
          description: "Assign users to projects and manage team categories",
          icon: "people-outline",
          color: "bg-purple-50",
          iconColor: "#7c3aed",
          borderColor: "border-purple-300",
          isVisible: true,
          density: "standard",
          structuralState: "stale",
        },
        {
          id: "admin-action:company_banner",
          actionId: "company_banner",
          label: "Company Banner",
          description: "Customize the banner displayed across all company screens",
          icon: "megaphone-outline",
          color: "bg-amber-50",
          iconColor: "#f59e0b",
          borderColor: "border-amber-300",
          isVisible: true,
          density: "standard",
          structuralState: "stale",
        },
        {
          id: "admin-action:dev_admin",
          actionId: "dev_admin",
          label: "Dev Admin Tools",
          description: "Database management, testing scripts, and environment control",
          icon: "code-slash-outline",
          color: "bg-red-50",
          iconColor: "#ef4444",
          borderColor: "border-red-300",
          isVisible: Boolean(onNavigateToDevAdmin),
          density: "standard",
          structuralState: "stale",
        },
      ],
      bannerSettings,
      refreshState: {
        isRefreshing,
      },
      profileMenu: {
        isVisible: isProfileMenuVisible,
        displayName: adminUser?.name || "Admin",
        roleLabel: permissionLabel,
        avatarInitial: adminUser?.name?.charAt(0).toUpperCase() || "A",
      },
    };
  }, [
    adminUser,
    bannerSettings,
    companyAssignments,
    companyProjects,
    companyTasks,
    companyUsers,
    currentCompany,
    isRefreshing,
    onNavigateToDevAdmin,
    user,
  ]);

  return {
    output,
    actions: {
      handleRefresh,
      pressQuickAction,
      toggleProfileMenu: () => setIsProfileMenuVisible((current) => !current),
      openBannerSettings,
      closeBannerSettings,
      setBannerText: (value: string) =>
        setBannerForm((current) => ({
          ...current,
          text: value,
        })),
      selectBannerColorPreset,
      toggleBannerVisibility: () =>
        setBannerForm((current) => ({
          ...current,
          isVisible: !current.isVisible,
        })),
      pickBannerImage,
      removeBannerImage,
      saveBannerSettings,
      navigateToProfile,
      confirmLogout,
    },
  };
}
