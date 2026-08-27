import React from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  buildResourceKey,
  createQueryMeta,
  getRequestCacheEnvelope,
  invalidateResourceKeys,
  isRequestCacheExpired,
  isRequestCacheFresh,
  runSingleFlightRequest,
  supabase,
  type QueryMeta,
} from "../api/supabase";
import { getSessionScopedSupabase } from "../api/supabaseSessionGate";
import { useAuthStore } from "./authStore";
import {
  getProjectRole,
  isLeadProjectManager,
  Project,
  UserProjectAssignment,
  ProjectStatus,
  UserCategory,
  ProjectRole,
} from "../types/buildtrack";

export type { QueryMeta } from "../api/supabase";

export interface ProjectSummary {
  id: string;
  name: string;
  status: ProjectStatus;
  companyId: string;
  updatedAt?: string;
  summaryHash: string;
  entityVersion: number;
}

export interface NormalizedProjectAssignment extends UserProjectAssignment {
  id: string;
}

export interface ProjectDerivedState {
  projectsById: Record<string, Project>;
  projectSummaryById: Record<string, ProjectSummary>;
  userAssignmentsById: Record<string, NormalizedProjectAssignment>;
  projectIdsByCompany: Record<string, string[]>;
  projectIdsByUser: Record<string, string[]>;
  assignmentIdsByUser: Record<string, string[]>;
  assignmentIdsByProject: Record<string, string[]>;
  queryProjectIds: Record<string, string[]>;
}

const STRUCTURAL_FRESH_MS = 60_000;
const STRUCTURAL_TTL_MS = 5 * 60_000;

function getAssignmentKey(assignment: UserProjectAssignment): string {
  if ((assignment as NormalizedProjectAssignment).id) {
    return (assignment as NormalizedProjectAssignment).id;
  }

  return buildResourceKey(
    "assignment",
    assignment.userId,
    assignment.projectId,
    assignment.assignedAt || "unknown"
  );
}

function createProjectSummary(project: Project): ProjectSummary {
  const updatedAt = project.updatedAt || project.createdAt || "";

  return {
    id: project.id,
    name: project.name,
    status: project.status,
    companyId: project.companyId || "",
    updatedAt,
    summaryHash: [
      project.id,
      project.name,
      project.status,
      updatedAt,
    ].join("|"),
    entityVersion: updatedAt ? new Date(updatedAt).getTime() : 0,
  };
}

function pushUnique(target: Record<string, string[]>, key: string, value: string) {
  if (!key) {
    return;
  }

  if (!target[key]) {
    target[key] = [];
  }

  if (!target[key].includes(value)) {
    target[key].push(value);
  }
}

function deriveProjectIdsForQuery(
  resourceKey: string,
  allProjectIds: string[],
  projectIdsByCompany: Record<string, string[]>,
  projectIdsByUser: Record<string, string[]>,
  projectsById: Record<string, Project>
): string[] {
  const parts = resourceKey.split(":");

  if (resourceKey === buildResourceKey("projects", "all")) {
    return allProjectIds;
  }

  if (parts[0] === "projects" && parts[1] === "company" && parts[2]) {
    return projectIdsByCompany[parts[2]] || [];
  }

  if (parts[0] === "projects" && parts[1] === "user" && parts[2]) {
    return projectIdsByUser[parts[2]] || [];
  }

  if ((parts[0] === "project" || (parts[0] === "projects" && parts[1] === "id")) && parts[parts.length - 1]) {
    const projectId = parts[parts.length - 1];
    return projectsById[projectId] ? [projectId] : [];
  }

  return [];
}

export function buildProjectDerivedState(
  projects: Project[],
  userAssignments: UserProjectAssignment[],
  projectQueryMeta: Record<string, QueryMeta> = {}
): ProjectDerivedState {
  const projectsById: Record<string, Project> = {};
  const projectSummaryById: Record<string, ProjectSummary> = {};
  const normalizedAssignmentsById: Record<string, NormalizedProjectAssignment> = {};
  const projectIdsByCompany: Record<string, string[]> = {};
  const projectIdsByUser: Record<string, string[]> = {};
  const assignmentIdsByUser: Record<string, string[]> = {};
  const assignmentIdsByProject: Record<string, string[]> = {};
  const queryProjectIds: Record<string, string[]> = {};
  const allProjectIds: string[] = [];

  projects.forEach((project) => {
    projectsById[project.id] = project;
    projectSummaryById[project.id] = createProjectSummary(project);
    allProjectIds.push(project.id);
    pushUnique(projectIdsByCompany, project.companyId || "", project.id);
  });

  userAssignments.forEach((assignment) => {
    const assignmentId = getAssignmentKey(assignment);
    const normalizedAssignment: NormalizedProjectAssignment = {
      ...assignment,
      id: assignmentId,
    };

    normalizedAssignmentsById[assignmentId] = normalizedAssignment;
    pushUnique(assignmentIdsByUser, assignment.userId, assignmentId);
    pushUnique(assignmentIdsByProject, assignment.projectId, assignmentId);

    if (assignment.isActive) {
      pushUnique(projectIdsByUser, assignment.userId, assignment.projectId);
    }
  });

  Object.keys(projectQueryMeta).forEach((resourceKey) => {
    queryProjectIds[resourceKey] = deriveProjectIdsForQuery(
      resourceKey,
      allProjectIds,
      projectIdsByCompany,
      projectIdsByUser,
      projectsById
    );
  });

  return {
    projectsById,
    projectSummaryById,
    userAssignmentsById: normalizedAssignmentsById,
    projectIdsByCompany,
    projectIdsByUser,
    assignmentIdsByUser,
    assignmentIdsByProject,
    queryProjectIds,
  };
}

function transformProjectRow(project: any): Project {
  return {
    ...project,
    startDate: project.start_date,
    endDate: project.end_date,
    createdBy: project.created_by,
    companyId: project.company_id,
    createdAt: project.created_at,
    updatedAt: project.updated_at,
    clientInfo: project.client_info,
  };
}

function transformAssignmentRow(assignment: any): NormalizedProjectAssignment {
  return {
    id: assignment.id || getAssignmentKey({
      userId: assignment.user_id,
      projectId: assignment.project_id,
      category: assignment.category,
      assignedAt: assignment.assigned_at,
      assignedBy: assignment.assigned_by,
      isActive: assignment.is_active,
    } as UserProjectAssignment),
    userId: assignment.user_id,
    projectId: assignment.project_id,
    category: assignment.category,
    assignedAt: assignment.assigned_at,
    assignedBy: assignment.assigned_by,
    isActive: assignment.is_active,
  };
}

interface ProjectStore {
  projects: Project[];
  userAssignments: UserProjectAssignment[];
  projectsById: Record<string, Project>;
  projectSummaryById: Record<string, ProjectSummary>;
  userAssignmentsById: Record<string, NormalizedProjectAssignment>;
  projectIdsByCompany: Record<string, string[]>;
  projectIdsByUser: Record<string, string[]>;
  assignmentIdsByUser: Record<string, string[]>;
  assignmentIdsByProject: Record<string, string[]>;
  queryProjectIds: Record<string, string[]>;
  projectQueryMeta: Record<string, QueryMeta>;
  assignmentQueryMeta: Record<string, QueryMeta>;
  isLoading: boolean;
  error: string | null;
  setProjectQueryMeta: (resourceKey: string, updates: Partial<QueryMeta>) => void;
  setAssignmentQueryMeta: (resourceKey: string, updates: Partial<QueryMeta>) => void;
  beginQuery: (resourceKey: string, hasCachedData: boolean, manualRefresh?: boolean) => void;
  completeQuerySuccess: (resourceKey: string, payloadIds: string[]) => void;
  completeQueryError: (resourceKey: string, errorMessage: string, hasCachedData: boolean) => void;
  shouldServeCachedProjects: (resourceKey: string, fallbackIds: string[], forceRefresh?: boolean) => boolean;
  shouldRefreshInBackground: (resourceKey: string, fallbackIds: string[], forceRefresh?: boolean) => boolean;
  replaceProjects: (projects: Project[]) => void;
  mergeProject: (project: Project) => void;
  replaceAssignmentsForUser: (userId: string, assignments: NormalizedProjectAssignment[]) => void;
  replaceAssignmentsForProject: (projectId: string, assignments: NormalizedProjectAssignment[]) => void;
  
  // Fetching
  fetchProjects: (forceRefresh?: boolean) => Promise<void>;
  fetchProjectsByCompany: (companyId: string, forceRefresh?: boolean) => Promise<void>;
  fetchProjectsByUser: (userId: string, forceRefresh?: boolean) => Promise<void>;
  fetchProjectById: (id: string, forceRefresh?: boolean) => Promise<Project | null>;
  fetchUserProjectAssignments: (userId: string, forceRefresh?: boolean) => Promise<void>;
  fetchProjectUserAssignments: (projectId: string, forceRefresh?: boolean) => Promise<void>;
  
  // Project management
  getAllProjects: () => Project[];
  getProjectById: (id: string) => Project | undefined;
  getProjectsByCompany: (companyId: string) => Project[];
  getProjectsByUser: (userId: string) => Project[];
  createProject: (project: Omit<Project, "id" | "createdAt" | "updatedAt">) => Promise<string>;
  updateProject: (id: string, updates: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  
  // User assignments
  assignUserToProject: (userId: string, projectId: string, category: ProjectRole, assignedBy: string) => Promise<void>;
  removeUserFromProject: (userId: string, projectId: string) => Promise<void>;
  updateUserProjectCategory: (userId: string, projectId: string, category: ProjectRole) => Promise<void>;
  getUserProjectAssignments: (userId: string) => UserProjectAssignment[];
  getProjectUserAssignments: (projectId: string) => UserProjectAssignment[];
  cleanupDuplicateAssignments: (projectId: string) => Promise<void>;
  
  // Lead Project Manager utilities
  getUserLeadProjects: (userId: string) => Project[];
  isUserLeadPMForProject: (userId: string, projectId: string) => boolean;
  getLeadPMForProject: (projectId: string) => string | undefined;
  
  // Admin utilities
  getProjectStats: (projectId: string) => {
    totalUsers: number;
    usersByCategory: Record<ProjectRole, number>;
    isActive: boolean;
  };
}

export const useProjectStore = create<ProjectStore>()(
  persist(
    (set, get) => ({
      projects: [],
      userAssignments: [],
      projectsById: {},
      projectSummaryById: {},
      userAssignmentsById: {},
      projectIdsByCompany: {},
      projectIdsByUser: {},
      assignmentIdsByUser: {},
      assignmentIdsByProject: {},
      queryProjectIds: {},
      projectQueryMeta: {},
      assignmentQueryMeta: {},
      isLoading: false,
      error: null,

      // Internal helpers
      ...(() => {
        const setProjectQueryMeta = (
          resourceKey: string,
          updates: Partial<QueryMeta>
        ) => {
          set((state) => ({
            projectQueryMeta: {
              ...state.projectQueryMeta,
              [resourceKey]: createQueryMeta(resourceKey, {
                ...(state.projectQueryMeta[resourceKey] || {}),
                ...updates,
              }),
            },
          }));
        };

        const setAssignmentQueryMeta = (
          resourceKey: string,
          updates: Partial<QueryMeta>
        ) => {
          set((state) => ({
            assignmentQueryMeta: {
              ...state.assignmentQueryMeta,
              [resourceKey]: createQueryMeta(resourceKey, {
                ...(state.assignmentQueryMeta[resourceKey] || {}),
                ...updates,
              }),
            },
          }));
        };

        const beginQuery = (
          resourceKey: string,
          hasCachedData: boolean,
          manualRefresh: boolean = false
        ) => {
          setProjectQueryMeta(resourceKey, {
            hasHydratedData: hasCachedData,
            hasFetchedOnce: hasCachedData || Boolean(get().projectQueryMeta[resourceKey]?.hasFetchedOnce),
            isInitialLoading: !hasCachedData,
            isBackgroundRefreshing: hasCachedData,
            isManualRefreshing: manualRefresh,
            error: null,
          });

          set({
            isLoading: !hasCachedData,
            error: null,
          });
        };

        const completeQuerySuccess = (
          resourceKey: string,
          payloadIds: string[]
        ) => {
          const envelope = getRequestCacheEnvelope(resourceKey);

          setProjectQueryMeta(resourceKey, {
            hasHydratedData: payloadIds.length > 0,
            hasFetchedOnce: true,
            isInitialLoading: false,
            isBackgroundRefreshing: false,
            isManualRefreshing: false,
            lastFetchedAt: envelope?.lastFetchedAt ?? Date.now(),
            lastSuccessfulFetchAt: envelope?.lastSuccessfulFetchAt ?? Date.now(),
            staleAt: envelope?.staleAt ?? (Date.now() + STRUCTURAL_FRESH_MS),
            expiresAt: envelope?.expiresAt ?? (Date.now() + STRUCTURAL_TTL_MS),
            error: null,
            emptyStateResolved: true,
          });

          set({
            isLoading: false,
            error: null,
          });
        };

        const completeQueryError = (
          resourceKey: string,
          errorMessage: string,
          hasCachedData: boolean
        ) => {
          const envelope = getRequestCacheEnvelope(resourceKey);

          setProjectQueryMeta(resourceKey, {
            hasHydratedData: hasCachedData,
            hasFetchedOnce: Boolean(get().projectQueryMeta[resourceKey]?.hasFetchedOnce || hasCachedData),
            isInitialLoading: false,
            isBackgroundRefreshing: false,
            isManualRefreshing: false,
            lastFetchedAt: envelope?.lastFetchedAt ?? get().projectQueryMeta[resourceKey]?.lastFetchedAt ?? null,
            lastSuccessfulFetchAt: envelope?.lastSuccessfulFetchAt ?? get().projectQueryMeta[resourceKey]?.lastSuccessfulFetchAt ?? null,
            staleAt: envelope?.staleAt ?? get().projectQueryMeta[resourceKey]?.staleAt ?? null,
            expiresAt: envelope?.expiresAt ?? get().projectQueryMeta[resourceKey]?.expiresAt ?? null,
            error: errorMessage,
            emptyStateResolved: hasCachedData || Boolean(get().projectQueryMeta[resourceKey]?.emptyStateResolved),
          });

          set({
            isLoading: false,
            error: errorMessage,
          });
        };

        const shouldServeCachedProjects = (resourceKey: string, fallbackIds: string[], forceRefresh = false) => {
          if (forceRefresh || fallbackIds.length === 0) {
            return false;
          }

          return isRequestCacheFresh(resourceKey) && fallbackIds.length > 0;
        };

        const shouldRefreshInBackground = (resourceKey: string, fallbackIds: string[], forceRefresh = false) => {
          if (forceRefresh || fallbackIds.length === 0) {
            return false;
          }

          return !isRequestCacheExpired(resourceKey) && !isRequestCacheFresh(resourceKey);
        };

        const replaceProjects = (projects: Project[]) => {
          set({ projects });
        };

        const mergeProject = (project: Project) => {
          set((state) => {
            const existingIndex = state.projects.findIndex((candidate) => candidate.id === project.id);
            const nextProjects =
              existingIndex >= 0
                ? state.projects.map((candidate) =>
                    candidate.id === project.id ? project : candidate
                  )
                : [...state.projects, project];

            return {
              projects: nextProjects,
            };
          });
        };

        const replaceAssignmentsForUser = (userId: string, assignments: NormalizedProjectAssignment[]) => {
          set((state) => ({
            userAssignments: [
              ...state.userAssignments.filter((assignment) => assignment.userId !== userId),
              ...assignments,
            ],
          }));
        };

        const replaceAssignmentsForProject = (projectId: string, assignments: NormalizedProjectAssignment[]) => {
          set((state) => ({
            userAssignments: [
              ...state.userAssignments.filter((assignment) => assignment.projectId !== projectId),
              ...assignments,
            ],
          }));
        };

        return {
          setProjectQueryMeta,
          setAssignmentQueryMeta,
          beginQuery,
          completeQuerySuccess,
          completeQueryError,
          shouldServeCachedProjects,
          shouldRefreshInBackground,
          replaceProjects,
          mergeProject,
          replaceAssignmentsForUser,
          replaceAssignmentsForProject,
        };
      })(),

      // FETCH from Supabase
      fetchProjects: async (forceRefresh = false) => {
        const sessionClient = await getSessionScopedSupabase();
        if (!sessionClient) {
          console.warn('📊 [projects] Skipping fetchProjects — no Supabase session (avoids anon 42501)');
          return;
        }

        const resourceKey = buildResourceKey("projects", "all");
        const supabaseClient = sessionClient;
        const cachedIds = get().queryProjectIds[resourceKey] || get().projects.map((project) => project.id);
        const hasCachedData = cachedIds.length > 0;

        if (get().shouldServeCachedProjects(resourceKey, cachedIds, forceRefresh)) {
          get().completeQuerySuccess(resourceKey, cachedIds);
          return;
        }

        if (get().shouldRefreshInBackground(resourceKey, cachedIds, forceRefresh)) {
          get().beginQuery(resourceKey, true);
          void runSingleFlightRequest(
            resourceKey,
            async () => {
              const { data, error } = await supabaseClient
                .from('projects')
                .select('*')
                .order('name');

              if (error) {
                throw error;
              }

              const transformedProjects = (data || []).map(transformProjectRow);
              get().replaceProjects(transformedProjects);
              return transformedProjects;
            },
            {
              staleMs: STRUCTURAL_FRESH_MS,
              ttlMs: STRUCTURAL_TTL_MS,
              forceRefresh,
            }
          )
            .then((result) => {
              get().completeQuerySuccess(
                resourceKey,
                result.data.map((project) => project.id)
              );
            })
            .catch((error: any) => {
              get().completeQueryError(resourceKey, error.message, true);
            });
          return;
        }

        get().beginQuery(resourceKey, hasCachedData);
        try {
          const result = await runSingleFlightRequest(
            resourceKey,
            async () => {
              const { data, error } = await supabaseClient
                .from('projects')
                .select('*')
                .order('name');

              if (error) {
                throw error;
              }

              const transformedProjects = (data || []).map(transformProjectRow);
              get().replaceProjects(transformedProjects);
              return transformedProjects;
            },
            {
              staleMs: STRUCTURAL_FRESH_MS,
              ttlMs: STRUCTURAL_TTL_MS,
              forceRefresh,
            }
          );

          get().completeQuerySuccess(
            resourceKey,
            result.data.map((project) => project.id)
          );
        } catch (error: any) {
          console.error('Error fetching projects:', error);
          get().completeQueryError(resourceKey, error.message, hasCachedData);
        }
      },

      fetchProjectsByCompany: async (companyId: string, forceRefresh = false) => {
        const sessionClient = await getSessionScopedSupabase();
        if (!sessionClient) {
          console.warn(
            '📊 [projects] Skipping fetchProjectsByCompany — no Supabase session (avoids anon 42501)',
          );
          return;
        }

        const resourceKey = buildResourceKey("projects", "company", companyId);
        const supabaseClient = sessionClient;
        const cachedIds = get().queryProjectIds[resourceKey] || get().projectIdsByCompany[companyId] || [];
        const hasCachedData = cachedIds.length > 0;

        if (get().shouldServeCachedProjects(resourceKey, cachedIds, forceRefresh)) {
          get().completeQuerySuccess(resourceKey, cachedIds);
          return;
        }

        if (get().shouldRefreshInBackground(resourceKey, cachedIds, forceRefresh)) {
          get().beginQuery(resourceKey, true);
          void runSingleFlightRequest(
            resourceKey,
            async () => {
              const { data, error } = await supabaseClient
                .from('projects')
                .select(`
                  *,
                  users!created_by (
                    id,
                    name,
                    email,
                    role
                  )
                `)
                .eq('company_id', companyId)
                .order('created_at', { ascending: false });

              if (error) {
                throw error;
              }

              const transformedProjects = (data || []).map(transformProjectRow);
              get().replaceProjects(transformedProjects);
              return transformedProjects;
            },
            {
              staleMs: STRUCTURAL_FRESH_MS,
              ttlMs: STRUCTURAL_TTL_MS,
              forceRefresh,
            }
          )
            .then((result) => {
              get().completeQuerySuccess(resourceKey, result.data.map((project) => project.id));
            })
            .catch((error: any) => {
              get().completeQueryError(resourceKey, error.message, true);
            });
          return;
        }

        get().beginQuery(resourceKey, hasCachedData);
        try {
          const result = await runSingleFlightRequest(
            resourceKey,
            async () => {
              const { data, error } = await supabaseClient
                .from('projects')
                .select(`
                  *,
                  users!created_by (
                    id,
                    name,
                    email,
                    role
                  )
                `)
                .eq('company_id', companyId)
                .order('created_at', { ascending: false });

              if (error) {
                throw error;
              }

              const transformedProjects = (data || []).map(transformProjectRow);
              get().replaceProjects(transformedProjects);
              return transformedProjects;
            },
            {
              staleMs: STRUCTURAL_FRESH_MS,
              ttlMs: STRUCTURAL_TTL_MS,
              forceRefresh,
            }
          );

          get().completeQuerySuccess(resourceKey, result.data.map((project) => project.id));
        } catch (error: any) {
          console.error('Error fetching projects by company:', error);
          get().completeQueryError(resourceKey, error.message, hasCachedData);
        }
      },

      fetchProjectsByUser: async (userId: string, forceRefresh = false) => {
        const sessionClient = await getSessionScopedSupabase();
        if (!sessionClient) {
          console.warn(
            '📊 [projects] Skipping fetchProjectsByUser — no Supabase session (avoids anon 42501)',
          );
          return;
        }

        const resourceKey = buildResourceKey("projects", "user", userId);
        const supabaseClient = sessionClient;
        const cachedIds = get().queryProjectIds[resourceKey] || get().projectIdsByUser[userId] || [];
        const hasCachedData = cachedIds.length > 0;

        if (get().shouldServeCachedProjects(resourceKey, cachedIds, forceRefresh)) {
          get().completeQuerySuccess(resourceKey, cachedIds);
          return;
        }

        if (get().shouldRefreshInBackground(resourceKey, cachedIds, forceRefresh)) {
          get().beginQuery(resourceKey, true);
          void runSingleFlightRequest(
            resourceKey,
            async () => {
              const { data: assignments, error: assignmentError } = await supabaseClient
                .from('user_project_assignments')
                .select('project_id')
                .eq('user_id', userId)
                .eq('is_active', true);

              if (assignmentError) {
                throw assignmentError;
              }

              const projectIds = assignments?.map((assignment) => assignment.project_id) || [];

              if (projectIds.length === 0) {
                get().replaceProjects([]);
                return [];
              }

              const { data, error } = await supabaseClient
                .from('projects')
                .select('*')
                .in('id', projectIds)
                .order('name');

              if (error) {
                throw error;
              }

              const transformedProjects = (data || []).map(transformProjectRow);
              get().replaceProjects(transformedProjects);
              return transformedProjects;
            },
            {
              staleMs: STRUCTURAL_FRESH_MS,
              ttlMs: STRUCTURAL_TTL_MS,
              forceRefresh,
            }
          )
            .then((result) => {
              get().completeQuerySuccess(resourceKey, result.data.map((project) => project.id));
            })
            .catch((error: any) => {
              get().completeQueryError(resourceKey, error.message, true);
            });
          return;
        }

        get().beginQuery(resourceKey, hasCachedData);
        try {
          const result = await runSingleFlightRequest(
            resourceKey,
            async () => {
              const { data: assignments, error: assignmentError } = await supabaseClient
                .from('user_project_assignments')
                .select('project_id')
                .eq('user_id', userId)
                .eq('is_active', true);

              if (assignmentError) {
                throw assignmentError;
              }

              const projectIds = assignments?.map((assignment) => assignment.project_id) || [];

              if (projectIds.length === 0) {
                get().replaceProjects([]);
                return [];
              }

              const { data, error } = await supabaseClient
                .from('projects')
                .select('*')
                .in('id', projectIds)
                .order('name');

              if (error) {
                throw error;
              }

              const transformedProjects = (data || []).map(transformProjectRow);
              get().replaceProjects(transformedProjects);
              return transformedProjects;
            },
            {
              staleMs: STRUCTURAL_FRESH_MS,
              ttlMs: STRUCTURAL_TTL_MS,
              forceRefresh,
            }
          );

          get().completeQuerySuccess(resourceKey, result.data.map((project) => project.id));
        } catch (error: any) {
          console.error('Error fetching projects by user:', error);
          get().completeQueryError(resourceKey, error.message, hasCachedData);
        }
      },

      fetchProjectById: async (id: string, forceRefresh = false) => {
        const sessionClient = await getSessionScopedSupabase();
        if (!sessionClient) {
          console.warn(
            '📊 [projects] Skipping fetchProjectById — no Supabase session (avoids anon 42501)',
          );
          return get().getProjectById(id) || null;
        }

        const resourceKey = buildResourceKey("project", id);
        const supabaseClient = sessionClient;
        const cachedProject = get().projectsById[id] || get().getProjectById(id);

        if (!forceRefresh && cachedProject && isRequestCacheFresh(resourceKey)) {
          get().completeQuerySuccess(resourceKey, [id]);
          return cachedProject;
        }

        try {
          get().beginQuery(resourceKey, Boolean(cachedProject));
          const result = await runSingleFlightRequest(
            resourceKey,
            async () => {
              const { data, error } = await supabaseClient
                .from('projects')
                .select('*')
                .eq('id', id)
                .single();

              if (error) {
                throw error;
              }

              const transformedProject = transformProjectRow(data);
              get().mergeProject(transformedProject);
              return transformedProject;
            },
            {
              staleMs: STRUCTURAL_FRESH_MS,
              ttlMs: STRUCTURAL_TTL_MS,
              forceRefresh,
            }
          );

          const transformedProject = result.data;
          get().completeQuerySuccess(resourceKey, [id]);
          return transformedProject;
        } catch (error: any) {
          console.error('Error fetching project:', error);
          get().completeQueryError(resourceKey, error.message, Boolean(cachedProject));
          return null;
        }
      },

      fetchUserProjectAssignments: async (userId: string, forceRefresh = false) => {
        if (!supabase) {
          console.error('Supabase not configured, no data available');
          set({ projects: [], userAssignments: [], isLoading: false, error: 'Supabase not configured' });
          return;
        }

        const sessionClient = await getSessionScopedSupabase();
        if (!sessionClient) {
          console.warn('📊 [assignments] Skipping fetchUserProjectAssignments — no Supabase session');
          return;
        }

        const resourceKey = buildResourceKey("assignments", "user", userId);
        const cachedIds = get().assignmentIdsByUser[userId] || [];
        const hasCachedData = cachedIds.length > 0;

        if (!forceRefresh && cachedIds.length > 0 && isRequestCacheFresh(resourceKey)) {
          get().setAssignmentQueryMeta(resourceKey, {
            ...createQueryMeta(resourceKey, get().assignmentQueryMeta[resourceKey] || {}),
            hasHydratedData: true,
            hasFetchedOnce: true,
            isInitialLoading: false,
            isBackgroundRefreshing: false,
            isManualRefreshing: false,
          });
          return;
        }

        try {
          const supabaseClient = sessionClient;
          get().setAssignmentQueryMeta(resourceKey, {
            hasHydratedData: hasCachedData,
            hasFetchedOnce: hasCachedData,
            isInitialLoading: !hasCachedData,
            isBackgroundRefreshing: hasCachedData,
            isManualRefreshing: false,
            error: null,
          });

          const result = await runSingleFlightRequest(
            resourceKey,
            async () => {
              const { data, error } = await supabaseClient
                .from('user_project_assignments')
                .select('*')
                .eq('user_id', userId)
                .eq('is_active', true)
                .order('assigned_at', { ascending: false });

              if (error) {
                throw error;
              }

              const transformedAssignments = (data || []).map(transformAssignmentRow);
              get().replaceAssignmentsForUser(userId, transformedAssignments);
              return transformedAssignments;
            },
            {
              staleMs: STRUCTURAL_FRESH_MS,
              ttlMs: STRUCTURAL_TTL_MS,
              forceRefresh,
            }
          );

          get().setAssignmentQueryMeta(resourceKey, {
            hasHydratedData: result.data.length > 0,
            hasFetchedOnce: true,
            isInitialLoading: false,
            isBackgroundRefreshing: false,
            isManualRefreshing: false,
            lastFetchedAt: result.envelope.lastFetchedAt,
            lastSuccessfulFetchAt: result.envelope.lastSuccessfulFetchAt,
            staleAt: result.envelope.staleAt,
            expiresAt: result.envelope.expiresAt,
            error: null,
            emptyStateResolved: true,
          });
        } catch (error: any) {
          console.error('Error fetching user project assignments:', error);
          get().setAssignmentQueryMeta(resourceKey, {
            hasHydratedData: hasCachedData,
            hasFetchedOnce: hasCachedData,
            isInitialLoading: false,
            isBackgroundRefreshing: false,
            isManualRefreshing: false,
            error: error.message,
            emptyStateResolved: hasCachedData,
          });
        }
      },

      fetchProjectUserAssignments: async (projectId: string, forceRefresh = false) => {
        if (!supabase) {
          console.error('Supabase not configured, no data available');
          set({ projects: [], userAssignments: [], isLoading: false, error: 'Supabase not configured' });
          return;
        }

        const sessionClient = await getSessionScopedSupabase();
        if (!sessionClient) {
          console.warn('📊 [assignments] Skipping fetchProjectUserAssignments — no Supabase session');
          return;
        }

        const resourceKey = buildResourceKey("assignments", "project", projectId);
        const cachedIds = get().assignmentIdsByProject[projectId] || [];
        const hasCachedData = cachedIds.length > 0;

        try {
          const supabaseClient = sessionClient;
          get().setAssignmentQueryMeta(resourceKey, {
            hasHydratedData: hasCachedData,
            hasFetchedOnce: hasCachedData,
            isInitialLoading: !hasCachedData,
            isBackgroundRefreshing: hasCachedData,
            isManualRefreshing: false,
            error: null,
          });

          const result = await runSingleFlightRequest(
            resourceKey,
            async () => {
              const { data, error } = await supabaseClient
                .from('user_project_assignments')
                .select('*')
                .eq('project_id', projectId)
                .eq('is_active', true)
                .order('assigned_at', { ascending: false });

              if (error) {
                throw error;
              }

              const transformedAssignments = (data || []).map(transformAssignmentRow);
              get().replaceAssignmentsForProject(projectId, transformedAssignments);
              return transformedAssignments;
            },
            {
              staleMs: STRUCTURAL_FRESH_MS,
              ttlMs: STRUCTURAL_TTL_MS,
              forceRefresh,
            }
          );

          get().setAssignmentQueryMeta(resourceKey, {
            hasHydratedData: result.data.length > 0,
            hasFetchedOnce: true,
            isInitialLoading: false,
            isBackgroundRefreshing: false,
            isManualRefreshing: false,
            lastFetchedAt: result.envelope.lastFetchedAt,
            lastSuccessfulFetchAt: result.envelope.lastSuccessfulFetchAt,
            staleAt: result.envelope.staleAt,
            expiresAt: result.envelope.expiresAt,
            error: null,
            emptyStateResolved: true,
          });
        } catch (error: any) {
          console.error('Error fetching project user assignments:', error);
          get().setAssignmentQueryMeta(resourceKey, {
            hasHydratedData: hasCachedData,
            hasFetchedOnce: hasCachedData,
            isInitialLoading: false,
            isBackgroundRefreshing: false,
            isManualRefreshing: false,
            error: error.message,
            emptyStateResolved: hasCachedData,
          });
        }
      },

      // LOCAL getters (work with cached data)
      getAllProjects: () => {
        return get().projects;
      },

      getProjectById: (id) => {
        return get().projects.find(project => project.id === id);
      },

      getProjectsByCompany: (companyId) => {
        return get().projects.filter(project => project.companyId === companyId);
      },

      getProjectsByUser: (userId) => {
        const assignments = get().getUserProjectAssignments(userId);
        const projectIds = assignments.map(a => a.projectId);
        return get().projects.filter(project => projectIds.includes(project.id));
      },

      // CREATE project in Supabase
      createProject: async (projectData) => {
        if (!supabase) {
          // Fallback to local creation
          const newProject: Project = {
            ...projectData,
            id: `proj-${Date.now()}`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          set(state => ({
            projects: [...state.projects, newProject]
          }));

          return newProject.id;
        }

        set({ isLoading: true, error: null });
        try {
          const { data, error } = await supabase
            .from('projects')
            .insert({
              name: projectData.name,
              description: projectData.description,
              status: projectData.status,
              start_date: projectData.startDate,
              end_date: projectData.endDate,
              budget: projectData.budget,
              location: projectData.location,
              client_info: projectData.clientInfo,
              created_by: projectData.createdBy,
              company_id: projectData.companyId,
            })
            .select()
            .single();

          if (error) throw error;

          const transformedProject = transformProjectRow(data);
          get().mergeProject(transformedProject);
          invalidateResourceKeys([
            buildResourceKey("projects", "all"),
            buildResourceKey("projects", "company", transformedProject.companyId),
            buildResourceKey("project", transformedProject.id),
          ]);
          set({ isLoading: false });

          return transformedProject.id;
        } catch (error: any) {
          console.error('Error creating project:', error);
          set({ 
            error: error.message, 
            isLoading: false 
          });
          throw error;
        }
      },

      // UPDATE project in Supabase
      updateProject: async (id, updates) => {
        if (!supabase) {
          // Fallback to local update
          set(state => ({
            projects: state.projects.map(project =>
              project.id === id
                ? { ...project, ...updates, updatedAt: new Date().toISOString() }
                : project
            )
          }));
          return;
        }

        set({ isLoading: true, error: null });
        try {
          const { error } = await supabase
            .from('projects')
            .update({
              name: updates.name,
              description: updates.description,
              status: updates.status,
              start_date: updates.startDate,
              end_date: updates.endDate,
              budget: updates.budget,
              location: updates.location,
              client_info: updates.clientInfo,
            })
            .eq('id', id);

          if (error) throw error;

          const existingProject = get().projectsById[id] || get().getProjectById(id);
          const updatedProject: Project = {
            ...(existingProject as Project),
            ...updates,
            id,
            updatedAt: new Date().toISOString(),
          };

          get().mergeProject(updatedProject);
          invalidateResourceKeys([
            buildResourceKey("projects", "all"),
            buildResourceKey("project", id),
            buildResourceKey("projects", "company", updatedProject.companyId),
          ]);
          set({ isLoading: false });
        } catch (error: any) {
          console.error('Error updating project:', error);
          set({ 
            error: error.message, 
            isLoading: false 
          });
          throw error;
        }
      },

      // DELETE project in Supabase
      deleteProject: async (id) => {
        if (!supabase) {
          // Fallback to local deletion
          set(state => ({
            projects: state.projects.filter(project => project.id !== id)
          }));
          return;
        }

        set({ isLoading: true, error: null });
        try {
          const { error } = await supabase
            .from('projects')
            .delete()
            .eq('id', id);

          if (error) throw error;

          const deletedProject = get().projectsById[id] || get().getProjectById(id);
          set(state => ({
            projects: state.projects.filter(project => project.id !== id),
            isLoading: false,
          }));
          invalidateResourceKeys([
            buildResourceKey("projects", "all"),
            buildResourceKey("project", id),
            deletedProject ? buildResourceKey("projects", "company", deletedProject.companyId) : "",
          ]);
        } catch (error: any) {
          console.error('Error deleting project:', error);
          set({ 
            error: error.message, 
            isLoading: false 
          });
          throw error;
        }
      },

      // User assignment methods
      assignUserToProject: async (userId, projectId, category, assignedBy) => {
        if (!supabase) {
          // Fallback to local assignment
          const newAssignment: UserProjectAssignment = {
            userId,
            projectId,
            category,
            assignedAt: new Date().toISOString(),
            assignedBy,
            isActive: true,
          };

          set(state => ({
            userAssignments: [...state.userAssignments, newAssignment]
          }));
          return;
        }

        try {
          // Check if assignment already exists (any category)
          const existingAssignments = get().userAssignments.filter(
            a => a.userId === userId && a.projectId === projectId && a.isActive
          );

          if (existingAssignments.length > 0) {
            console.log(`User ${userId} already assigned to project ${projectId}. Existing categories: ${existingAssignments.map(a => a.category).join(', ')}`);
            return; // Skip if already assigned
          }

          const { error } = await supabase
            .from('user_project_assignments')
            .insert({
              user_id: userId,
              project_id: projectId,
              category,
              assigned_by: assignedBy,
              is_active: true,
            });

          if (error) {
            // Handle duplicate key constraint violation specifically
            if (error.code === '23505') {
              console.log(`User ${userId} already assigned to project ${projectId} with category ${category}`);
              return; // Skip if duplicate
            }
            throw error;
          }

          invalidateResourceKeys([
            buildResourceKey("assignments", "user", userId),
            buildResourceKey("assignments", "project", projectId),
            buildResourceKey("projects", "user", userId),
          ]);
          await get().fetchUserProjectAssignments(userId, true);
          await get().fetchProjectUserAssignments(projectId, true);
        } catch (error: any) {
          console.error('Error assigning user to project:', error);
          throw error;
        }
      },

      removeUserFromProject: async (userId, projectId) => {
        if (!supabase) {
          // Fallback to local removal
          set(state => ({
            userAssignments: state.userAssignments.filter(
              a => !(a.userId === userId && a.projectId === projectId)
            )
          }));
          return;
        }

        try {
          const { error } = await supabase
            .from('user_project_assignments')
            .update({ is_active: false })
            .eq('user_id', userId)
            .eq('project_id', projectId);

          if (error) throw error;

          invalidateResourceKeys([
            buildResourceKey("assignments", "user", userId),
            buildResourceKey("assignments", "project", projectId),
            buildResourceKey("projects", "user", userId),
          ]);
          await get().fetchUserProjectAssignments(userId, true);
          await get().fetchProjectUserAssignments(projectId, true);
        } catch (error: any) {
          console.error('Error removing user from project:', error);
          throw error;
        }
      },

      updateUserProjectCategory: async (userId, projectId, category) => {
        if (!supabase) {
          // Fallback to local update
          set(state => ({
            userAssignments: state.userAssignments.map(a =>
              a.userId === userId && a.projectId === projectId
                ? { ...a, category }
                : a
            )
          }));
          return;
        }

        try {
          const { error } = await supabase
            .from('user_project_assignments')
            .update({ category })
            .eq('user_id', userId)
            .eq('project_id', projectId);

          if (error) throw error;

          // Refresh assignments
          await get().fetchUserProjectAssignments(userId);
        } catch (error: any) {
          console.error('Error updating user project category:', error);
          throw error;
        }
      },

      getUserProjectAssignments: (userId) => {
        return get().userAssignments.filter(a => a.userId === userId && a.isActive);
      },

      getProjectUserAssignments: (projectId) => {
        return get().userAssignments.filter(a => a.projectId === projectId && a.isActive);
      },

      cleanupDuplicateAssignments: async (projectId) => {
        if (!supabase) {
          console.log('Supabase not available for cleanup');
          return;
        }

        try {
          // Get all assignments for this project
          const { data, error } = await supabase
            .from('user_project_assignments')
            .select('*')
            .eq('project_id', projectId)
            .eq('is_active', true)
            .order('assigned_at', { ascending: false });

          if (error) throw error;

          // Group by user_id and keep only the most recent assignment for each user
          const userGroups = (data || []).reduce((acc, assignment) => {
            const userId = assignment.user_id;
            if (!acc[userId] || new Date(assignment.assigned_at) > new Date(acc[userId].assigned_at)) {
              acc[userId] = assignment;
            }
            return acc;
          }, {} as Record<string, any>);

          // Find duplicates to remove
          const assignmentsToKeep = Object.values(userGroups) as Array<{ id: string }>;
          const assignmentsToRemove = (data || []).filter((assignment: { id: string }) => 
            !assignmentsToKeep.some(keep => keep.id === assignment.id)
          );

          if (assignmentsToRemove.length > 0) {
            console.log(`Cleaning up ${assignmentsToRemove.length} duplicate assignments for project ${projectId}`);
            
            // Mark duplicates as inactive
            const { error: updateError } = await supabase
              .from('user_project_assignments')
              .update({ is_active: false })
              .in('id', assignmentsToRemove.map(a => a.id));

            if (updateError) throw updateError;

            // Refresh project assignments
            await get().fetchProjectUserAssignments(projectId);
          }
        } catch (error: any) {
          console.error('Error cleaning up duplicate assignments:', error);
        }
      },

      // Lead Project Manager utilities
      getUserLeadProjects: (userId) => {
        const leadAssignments = get().userAssignments.filter(
          (assignment) =>
            assignment.userId === userId &&
            assignment.isActive &&
            isLeadProjectManager(assignment)
        );
        const projectIds = leadAssignments.map(a => a.projectId);
        return get().projects.filter(project => projectIds.includes(project.id));
      },

      isUserLeadPMForProject: (userId, projectId) => {
        return get().userAssignments.some(
          (assignment) =>
            assignment.userId === userId &&
            assignment.projectId === projectId &&
            assignment.isActive &&
            isLeadProjectManager(assignment)
        );
      },

      getLeadPMForProject: (projectId) => {
        const leadAssignment = get().userAssignments.find(
          (assignment) =>
            assignment.projectId === projectId &&
            assignment.isActive &&
            isLeadProjectManager(assignment)
        );
        return leadAssignment?.userId;
      },

      // Admin utilities
      getProjectStats: (projectId) => {
        const assignments = get().getProjectUserAssignments(projectId);
        const project = get().getProjectById(projectId);

        const usersByCategory = assignments.reduce((acc, assignment) => {
          const role = getProjectRole(assignment);
          acc[role] = (acc[role] || 0) + 1;
          return acc;
        }, {} as Record<ProjectRole, number>);

        return {
          totalUsers: assignments.length,
          usersByCategory,
          isActive: project?.status === 'active',
        };
      },
    }),
    {
      name: "buildtrack-projects",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        projects: state.projects,
        userAssignments: state.userAssignments,
        projectQueryMeta: Object.fromEntries(
          Object.entries(state.projectQueryMeta).map(([key, meta]) => [
            key,
            {
              ...meta,
              isInitialLoading: false,
              isBackgroundRefreshing: false,
              isManualRefreshing: false,
              error: null,
            },
          ])
        ),
        assignmentQueryMeta: Object.fromEntries(
          Object.entries(state.assignmentQueryMeta).map(([key, meta]) => [
            key,
            {
              ...meta,
              isInitialLoading: false,
              isBackgroundRefreshing: false,
              isManualRefreshing: false,
              error: null,
            },
          ])
        ),
      }),
    }
  )
);

function syncProjectDerivedState() {
  useProjectStore.subscribe((state, previousState) => {
    if (
      state.projects === previousState.projects &&
      state.userAssignments === previousState.userAssignments &&
      state.projectQueryMeta === previousState.projectQueryMeta
    ) {
      return;
    }

    const derivedState = buildProjectDerivedState(
      state.projects,
      state.userAssignments,
      state.projectQueryMeta
    );

    useProjectStore.setState(derivedState);
  });

  const initialState = useProjectStore.getState();
  useProjectStore.setState(
    buildProjectDerivedState(
      initialState.projects,
      initialState.userAssignments,
      initialState.projectQueryMeta
    )
  );
}

syncProjectDerivedState();

export const selectProjectIdsByCompany = (companyId: string) => (state: ProjectStore) =>
  state.projectIdsByCompany[companyId] || [];

export const selectProjectIdsByUser = (userId: string) => (state: ProjectStore) =>
  state.projectIdsByUser[userId] || [];

export const selectProjectSummaryById = (projectId: string) => (state: ProjectStore) =>
  state.projectSummaryById[projectId] || null;

export const selectProjectQueryMeta = (resourceKey: string) => (state: ProjectStore) =>
  state.projectQueryMeta[resourceKey] || createQueryMeta(resourceKey);

export const useProjectIdsByCompany = (companyId: string) =>
  useProjectStore(selectProjectIdsByCompany(companyId));

export const useProjectIdsByUser = (userId: string) =>
  useProjectStore(selectProjectIdsByUser(userId));

export const useProjectSummary = (projectId: string) =>
  useProjectStore(selectProjectSummaryById(projectId));

export const useProjectQueryMeta = (resourceKey: string) =>
  useProjectStore(selectProjectQueryMeta(resourceKey));

// Custom hook that automatically initializes data when accessed
export const useProjectStoreWithInit = () => {
  useProjectStore();
  const user = useAuthStore.getState().user;
  const isSprint7SandboxUser = user
    ? user.id === "sprint7-user-tristan" || user.id === "sprint7-user-herman"
    : false;
  const initStartedRef = React.useRef<boolean>(false);

  React.useEffect(() => {
    if (initStartedRef.current) {
      return;
    }
    if (isSprint7SandboxUser) {
      initStartedRef.current = true;
      return;
    }
    initStartedRef.current = true;
    const s = useProjectStore.getState();
    const store = s;

    const projectResourceKey = buildResourceKey("projects", "all");
    const userAssignmentsResourceKey = user ? buildResourceKey("assignments", "user", user.id) : null;
    const cachedProjectIds = s.queryProjectIds[projectResourceKey] || s.projects.map((p) => p.id);
    const hasCachedProjects = cachedProjectIds.length > 0;
    const hasCachedAssignments = user
      ? (s.assignmentIdsByUser[user.id] || []).length > 0
      : false;
    const hasFetchedProjectsOnce = Boolean(s.projectQueryMeta[projectResourceKey]?.hasFetchedOnce);
    const hasFetchedAssignmentsOnce = userAssignmentsResourceKey
      ? Boolean(s.assignmentQueryMeta[userAssignmentsResourceKey]?.hasFetchedOnce)
      : true;
    const isProjectsLoading =
      s.isLoading || Boolean(s.projectQueryMeta[projectResourceKey]?.isInitialLoading);
    const isAssignmentsLoading =
      s.isLoading ||
      (userAssignmentsResourceKey
        ? Boolean(s.assignmentQueryMeta[userAssignmentsResourceKey]?.isInitialLoading)
        : false);
    if (
      hasCachedProjects &&
      hasCachedAssignments &&
      hasFetchedProjectsOnce &&
      hasFetchedAssignmentsOnce
    ) {
      return;
    }
    if (isProjectsLoading || isAssignmentsLoading) {
      initStartedRef.current = false;
      return;
    }

    console.log('🔄 useProjectStoreWithInit: Initializing project store...');

    const authStore = require('./authStore').useAuthStore.getState();
    const localUser = authStore.user;

    console.log('👤 Current user:', localUser ? `${localUser.name} (${localUser.id})` : 'none');
    console.log('🔗 Supabase available:', !!supabase);

    if (localUser && supabase) {
      console.log('🚀 Initializing with user context - fetching projects and assignments...');
      Promise.all([
        store.fetchProjects(),
        store.fetchUserProjectAssignments(localUser.id)
      ]).then(() => {
        console.log('✅ Project store initialization complete');
      }).catch(error => {
        console.error('❌ Error during project store initialization:', error);
      });
    } else if (s.projects.length === 0 && !isProjectsLoading && supabase) {
      console.log('🚀 Fallback to basic initialization...');
      store.fetchProjects();
    } else {
      console.log('⏭️ Skipping initialization - already loaded or no Supabase');
    }
  }, [isSprint7SandboxUser]);

  return useProjectStore();
};

// Custom hook that automatically fetches projects for a specific company
export const useProjectStoreWithCompanyInit = (companyId: string) => {
  const store = useProjectStore();
  
  React.useEffect(() => {
    if (!companyId) {
      return;
    }
    void store.fetchProjectsByCompany(companyId);
  }, [companyId]);
  
  return store;
};
