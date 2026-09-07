import React, { useEffect, useMemo, useRef } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { buildResourceKey } from "@/api/supabase";
import ProjectPickerScreen from "@/screens/ProjectPickerScreen";
import { useAuthStore } from "@/state/authStore";
import { useProjectFilterStore } from "@/state/projectFilterStore";
import { useProjectStore } from "@/state/projectStore.supabase";
import {
  filterViewerProjectIdsForCompany,
  isProjectScopeReady,
} from "@/ui/contracts/taskVisibilityPermissions";
import {
  needsForcedProjectPicker,
  resolveWorkspaceProjectId,
} from "@/ui/contracts/workspaceProject";

/**
 * Field shell requires an active workspace project.
 * - 1 membership → auto-select (and persist) that project
 * - 0 / many with no valid selection → force ProjectPicker (no back)
 * - Invalid last_selected (left the job) → clear and force pick / sole default
 */
export function RequireWorkspaceProjectGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = useAuthStore((state) => state.user);
  const currentUserId = user?.id ?? null;
  const selectedProjectId = useProjectFilterStore((state) => state.selectedProjectId);
  const setSelectedProject = useProjectFilterStore((state) => state.setSelectedProject);
  const projects = useProjectStore((state) => state.projects);
  const projectIdsByUser = useProjectStore((state) => state.projectIdsByUser);
  const projectQueryMeta = useProjectStore((state) => state.projectQueryMeta);
  const assignmentQueryMeta = useProjectStore((state) => state.assignmentQueryMeta);
  const isLoadingProjects = useProjectStore((state) => state.isLoading);
  const autoSelectInFlightRef = useRef<string | null>(null);

  const viewerProjectIds = useMemo(() => {
    if (!currentUserId) {
      return [] as string[];
    }
    const raw = (projectIdsByUser?.[currentUserId] ?? []).map(String);
    const projectsById: Record<string, { id: string; companyId?: string | null }> = {};
    for (const project of projects ?? []) {
      projectsById[project.id] = {
        id: project.id,
        companyId: (project as { companyId?: string | null }).companyId,
      };
    }
    return filterViewerProjectIdsForCompany({
      viewerCompanyId: user?.companyId,
      projectIds: raw,
      projectsById,
    });
  }, [currentUserId, projectIdsByUser, projects, user?.companyId]);
  const viewerProjectIdsKey = viewerProjectIds.join("|");

  const assignmentsResourceKey = currentUserId
    ? buildResourceKey("assignments", "user", currentUserId)
    : null;
  const hasFetchedAssignmentsOnce = assignmentsResourceKey
    ? Boolean(assignmentQueryMeta?.[assignmentsResourceKey]?.hasFetchedOnce)
    : false;
  const projectScopeReady = isProjectScopeReady({
    projectCount: projects?.length ?? 0,
    hasFetchedProjectsOnce: Boolean(projectQueryMeta?.[buildResourceKey("projects", "all")]?.hasFetchedOnce),
  });
  const membershipReady = hasFetchedAssignmentsOnce || viewerProjectIds.length > 0;

  useEffect(() => {
    if (!currentUserId || !membershipReady) {
      return;
    }

    const resolved = resolveWorkspaceProjectId(selectedProjectId, viewerProjectIds);
    if (resolved && resolved === selectedProjectId) {
      autoSelectInFlightRef.current = null;
      return;
    }

    // Stale selection after leaving a job — clear so picker / sole-default can run.
    if (
      selectedProjectId &&
      viewerProjectIds.length > 0 &&
      !viewerProjectIds.includes(String(selectedProjectId))
    ) {
      if (autoSelectInFlightRef.current === "__clear__") {
        return;
      }
      autoSelectInFlightRef.current = "__clear__";
      void setSelectedProject(null, currentUserId);
      return;
    }

    if (!selectedProjectId && viewerProjectIds.length === 1) {
      const onlyProjectId = viewerProjectIds[0];
      if (!onlyProjectId || autoSelectInFlightRef.current === onlyProjectId) {
        return;
      }
      autoSelectInFlightRef.current = onlyProjectId;
      void setSelectedProject(onlyProjectId, currentUserId);
    }
  }, [
    currentUserId,
    membershipReady,
    selectedProjectId,
    setSelectedProject,
    viewerProjectIds,
    viewerProjectIdsKey,
  ]);

  if (!currentUserId) {
    return <>{children}</>;
  }

  if (!membershipReady && (isLoadingProjects || !projectScopeReady)) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading projects...</Text>
      </View>
    );
  }

  if (!membershipReady && !hasFetchedAssignmentsOnce) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading projects...</Text>
      </View>
    );
  }

  const workspaceProjectId = resolveWorkspaceProjectId(selectedProjectId, viewerProjectIds);
  if (needsForcedProjectPicker(selectedProjectId, viewerProjectIds) || !workspaceProjectId) {
    // Sole-project auto-select in flight — avoid flashing the picker.
    if (viewerProjectIds.length === 1 && !selectedProjectId) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Opening project...</Text>
        </View>
      );
    }

    return (
      <ProjectPickerScreen
        allowBack={false}
        onNavigateBack={() => {
          // Selection updates the filter store; this gate swaps to children.
        }}
      />
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#ffffff",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#6b7280",
  },
});
