import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert } from "react-native";
import * as Clipboard from "expo-clipboard";
import * as ImagePicker from "expo-image-picker";

import {
  isEphemeralBannerImageUri,
  resolveCompanyBannerImageUrl,
  uploadCompanyBannerImage,
} from "@/api/companyBannerStorage";
import { extractBuildtrackStoragePath } from "@/api/fileUploadService";
import { useAuthStore } from "@/state/authStore";
import { useCompanyStore } from "@/state/companyStore";
import { useProjectStoreWithCompanyInit } from "@/state/projectStore.supabase";
import { useTaskStore } from "@/state/taskStore.supabase";
import { useUserStoreWithInit } from "@/state/userStore.supabase";
import {
  getUserSystemPermission,
  isAdmin,
  type Company,
  type ProjectStatus,
  type User,
  type UserProjectAssignment,
} from "@/types/buildtrack";
import { countCompanySeatUsage } from "@/billing/seatUsage";
import type {
  AdminDashboardBannerColorPreset,
  AdminDashboardBannerSettingsModel,
  AdminDashboardQuickActionId,
  AdminDashboardScreenViewAdapterOutput,
  AdminDashboardSecondaryStat,
} from "@/ui/contracts/viewAdapters";
import {
  PROJECT_STATUS_LABELS,
  PROJECT_STATUS_ORDER,
  normalizeProjectStatus,
} from "@/ui/contracts/projectStatus";

function buildProjectStageStats(
  projects: Array<{ status: ProjectStatus | string }>,
): AdminDashboardSecondaryStat[] {
  return PROJECT_STATUS_ORDER.map((status) => ({
    id: status,
    label: PROJECT_STATUS_LABELS[status],
    value: projects.filter(
      (project) => normalizeProjectStatus(project.status) === status,
    ).length,
  }));
}

/**
 * Admin Dashboard Team Members headcount — same seat law as billing.
 *
 * - PM (`manager` / supervisor) or CA with deployableSeat=pm → PM tile
 * - Worker + CA default (no PM deployable upgrade) → Worker tile
 * Project assignment does **not** change seat class (Place ≠ seat).
 */
export function countAdminDashboardTeamHeadcount(
  users: Array<
    Pick<User, "id" | "role" | "systemPermission" | "isPending" | "isActive"> & {
      is_active?: boolean | null;
      deployableSeat?: "pm" | "worker" | null;
      deployable_seat?: "pm" | "worker" | null;
    }
  >,
  _assignments?: Array<Pick<UserProjectAssignment, "userId" | "isActive">>,
): { pmCount: number; workerCount: number } {
  return countCompanySeatUsage(users);
}

function buildTeamHeadcountStats(pmCount: number, workerCount: number): AdminDashboardSecondaryStat[] {
  return [
    { id: "pm", label: "PMs", value: pmCount },
    { id: "worker", label: "Workers", value: workerCount },
  ];
}

interface AdminDashboardBannerFormState {
  text: string;
  backgroundColor: string;
  textColor: string;
  isVisible: boolean;
  imageUri: string;
  imageStoragePath: string;
}

export interface AdminDashboardViewAdapterProps {
  onNavigateToProjects: () => void;
  onNavigateToUserManagement: () => void;
  onNavigateToProfile: () => void;
  onNavigateToCompanyPlan?: () => void;
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
  imageStoragePath: "",
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
    imageStoragePath: banner.imageStoragePath || "",
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

export function useAdminDashboardViewAdapter(
  props: AdminDashboardViewAdapterProps,
): AdminDashboardViewAdapterHookResult {
  const {
    onNavigateToProjects,
    onNavigateToUserManagement,
    onNavigateToProfile,
    onNavigateToCompanyPlan,
    onNavigateToDevAdmin,
  } = props;
  const { user, logout } = useAuthStore();
  const currentCompanyId = user?.companyId || "";
  const projectStore = useProjectStoreWithCompanyInit(currentCompanyId);
  const userStore = useUserStoreWithInit();
  const fetchTasks = useTaskStore((state) => state.fetchTasks);
  const { getCompanyById, getCompanyBanner, updateCompanyBanner, ensureCompanyLoaded } =
    useCompanyStore();
  const { getProjectsByCompany, userAssignments, fetchProjects } = projectStore;
  const { getUsersByCompany, fetchUsers } = userStore;

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isProfileMenuVisible, setIsProfileMenuVisible] = useState(false);
  const [isBannerModalVisible, setIsBannerModalVisible] = useState(false);
  const [bannerForm, setBannerForm] = useState<AdminDashboardBannerFormState>(DEFAULT_BANNER_FORM);
  const [isSavingBanner, setIsSavingBanner] = useState(false);

  const adminUser = isAdmin(user) ? user : null;

  useEffect(() => {
    if (!adminUser?.companyId) {
      return;
    }
    void ensureCompanyLoaded(adminUser.companyId);
  }, [adminUser?.companyId, ensureCompanyLoaded]);
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

    const nextForm = getBannerFormState(getCompanyBanner(adminUser.companyId));
    setBannerForm(nextForm);
    setIsBannerModalVisible(true);

    void (async () => {
      const previewUrl = await resolveCompanyBannerImageUrl({
        imageStoragePath: nextForm.imageStoragePath || undefined,
        imageUri: nextForm.imageUri || undefined,
      });
      if (previewUrl) {
        setBannerForm((current) => ({
          ...current,
          imageUri: previewUrl,
        }));
      }
    })();
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
              imageStoragePath: "",
            })),
        },
      ],
    );
  }, []);

  const saveBannerSettings = useCallback(async () => {
    if (!adminUser || isSavingBanner) {
      return;
    }

    setIsSavingBanner(true);
    try {
      let imageStoragePath = bannerForm.imageStoragePath.trim();
      const selectedUri = bannerForm.imageUri.trim();

      if (selectedUri && isEphemeralBannerImageUri(selectedUri)) {
        const uploaded = await uploadCompanyBannerImage({
          companyId: adminUser.companyId,
          uri: selectedUri,
        });
        imageStoragePath = uploaded.storagePath;
        setBannerForm((current) => ({
          ...current,
          imageStoragePath: uploaded.storagePath,
          imageUri: uploaded.previewUrl,
        }));
      } else if (selectedUri) {
        const extracted = extractBuildtrackStoragePath(selectedUri);
        if (extracted) {
          imageStoragePath = extracted;
        }
      } else {
        imageStoragePath = "";
      }

      await updateCompanyBanner(adminUser.companyId, {
        text: bannerForm.text,
        backgroundColor: bannerForm.backgroundColor,
        textColor: bannerForm.textColor,
        isVisible: bannerForm.isVisible,
        ...(imageStoragePath ? { imageStoragePath } : {}),
      });
      setIsBannerModalVisible(false);
      Alert.alert(
        "Success",
        "Company banner updated. All seats in your company will see this banner.",
      );
    } catch (error) {
      console.error("AdminDashboardScreen: Failed to save company banner", error);
      Alert.alert(
        "Error",
        error instanceof Error ? error.message : "Failed to save company banner. Please try again.",
      );
    } finally {
      setIsSavingBanner(false);
    }
  }, [adminUser, bannerForm, isSavingBanner, updateCompanyBanner]);

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
        case "company_plan":
          onNavigateToCompanyPlan?.();
          return;
        case "dev_admin":
          onNavigateToDevAdmin?.();
          return;
      }
    },
    [
      onNavigateToCompanyPlan,
      onNavigateToDevAdmin,
      onNavigateToProjects,
      onNavigateToUserManagement,
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
    const projectStageStats = buildProjectStageStats(companyProjects);
    const { pmCount, workerCount } = countAdminDashboardTeamHeadcount(
      companyUsers,
      companyAssignments,
    );
    const teamTotal = pmCount + workerCount;
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
        companyId: currentCompanyId || undefined,
        companyName: currentCompany?.name,
        subtitle: currentCompany ? "Showing data for your company only" : undefined,
      },
      topLevelStats: [
        {
          id: "admin-stat:company_plan",
          statId: "company_plan",
          label: "Company Plan",
          value: currentCompany?.name?.trim() || "—",
          subtitle: "Plan & seats",
          icon: "business-outline",
          color: "bg-white",
          iconColor: "#08576E",
          textColor: "text-gray-900",
          density: "standard",
          structuralState,
          actionId: onNavigateToCompanyPlan ? "company_plan" : undefined,
          ctaLabel: onNavigateToCompanyPlan ? "Manage" : undefined,
        },
        {
          id: "admin-stat:projects",
          statId: "projects",
          label: "Projects",
          value: companyProjects.length,
          hidePrimaryValue: true,
          secondaryStats: projectStageStats,
          secondaryLayout: "stage_tiles",
          icon: "folder-open-outline",
          color: "bg-white",
          iconColor: "#08576E",
          textColor: "text-gray-900",
          density: "standard",
          structuralState,
          actionId: "projects",
          ctaLabel: "View all",
        },
        {
          id: "admin-stat:team",
          statId: "team",
          label: "Team Members",
          value: teamTotal,
          hidePrimaryValue: true,
          secondaryStats: buildTeamHeadcountStats(pmCount, workerCount),
          secondaryLayout: "stage_tiles",
          icon: "people-outline",
          color: "bg-white",
          iconColor: "#08576E",
          textColor: "text-gray-900",
          density: "standard",
          structuralState,
          actionId: "user_management",
          ctaLabel: "Manage",
        },
      ],
      // Overview CTAs cover plan / projects / team; keep Dev Admin only for now.
      quickActions: [
        {
          id: "admin-action:dev_admin",
          actionId: "dev_admin",
          label: "Dev Admin Tools",
          description: "Database management, testing scripts, and environment control",
          icon: "code-slash-outline",
          color: "bg-white",
          iconColor: "#08576E",
          borderColor: "border-gray-200",
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
    companyUsers,
    currentCompany,
    currentCompanyId,
    isProfileMenuVisible,
    isRefreshing,
    onNavigateToCompanyPlan,
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
