import React from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../api/supabase";
import { Project, UserProjectAssignment, ProjectStatus, UserCategory, ProjectRole } from "../types/buildtrack";

interface ProjectStore {
  projects: Project[];
  userAssignments: UserProjectAssignment[];
  isLoading: boolean;
  error: string | null;
  
  // Fetching
  fetchProjects: () => Promise<void>;
  fetchProjectsByCompany: (companyId: string) => Promise<void>;
  fetchProjectsByUser: (userId: string) => Promise<void>;
  fetchProjectById: (id: string) => Promise<Project | null>;
  fetchUserProjectAssignments: (userId: string) => Promise<void>;
  fetchProjectUserAssignments: (projectId: string) => Promise<void>;
  
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
      isLoading: false,
      error: null,

      // FETCH from Supabase
      fetchProjects: async () => {
        if (!supabase) {
          console.error('Supabase not configured, no data available');
          set({ projects: [], userAssignments: [], isLoading: false, error: 'Supabase not configured' });
          return;
        }

        set({ isLoading: true, error: null });
        try {
          const { data, error } = await supabase
            .from('projects')
            .select('*')
            .order('name');

          if (error) throw error;

          // Transform Supabase data to match local interface
          const transformedProjects = (data || []).map(project => ({
            ...project,
            startDate: project.start_date,
            endDate: project.end_date,
            createdBy: project.created_by,
            companyId: project.company_id,
            createdAt: project.created_at,
            updatedAt: project.updated_at,
            clientInfo: project.client_info,
          }));

          set({ 
            projects: transformedProjects, 
            isLoading: false 
          });
        } catch (error: any) {
          console.error('Error fetching projects:', error);
          set({ 
            error: error.message, 
            isLoading: false 
          });
        }
      },

      fetchProjectsByCompany: async (companyId: string) => {
        if (!supabase) {
          console.error('Supabase not configured, no data available');
          set({ projects: [], userAssignments: [], isLoading: false, error: 'Supabase not configured' });
          return;
        }

        set({ isLoading: true, error: null });
        try {
          const { data, error } = await supabase
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

          if (error) throw error;

          // Transform Supabase data to match local interface
          const transformedProjects = (data || []).map(project => ({
            ...project,
            startDate: project.start_date,
            endDate: project.end_date,
            createdBy: project.created_by,
            companyId: project.company_id,
            createdAt: project.created_at,
            updatedAt: project.updated_at,
            clientInfo: project.client_info,
          }));

          set({ 
            projects: transformedProjects, 
            isLoading: false 
          });
        } catch (error: any) {
          console.error('Error fetching projects by company:', error);
          set({ 
            error: error.message, 
            isLoading: false 
          });
        }
      },

      fetchProjectsByUser: async (userId: string) => {
        if (!supabase) {
          console.error('Supabase not configured, no data available');
          set({ projects: [], userAssignments: [], isLoading: false, error: 'Supabase not configured' });
          return;
        }

        set({ isLoading: true, error: null });
        try {
          // Get projects where user is assigned
          const { data: assignments, error: assignmentError } = await supabase
            .from('user_project_assignments')
            .select('project_id')
            .eq('user_id', userId)
            .eq('is_active', true);

          if (assignmentError) throw assignmentError;

          const projectIds = assignments?.map(a => a.project_id) || [];

          if (projectIds.length === 0) {
            set({ projects: [], isLoading: false });
            return;
          }

          const { data, error } = await supabase
            .from('projects')
            .select('*')
            .in('id', projectIds)
            .order('name');

          if (error) throw error;

          // Transform Supabase data to match local interface
          const transformedProjects = (data || []).map(project => ({
            ...project,
            startDate: project.start_date,
            endDate: project.end_date,
            createdBy: project.created_by,
            companyId: project.company_id,
            createdAt: project.created_at,
            updatedAt: project.updated_at,
            clientInfo: project.client_info,
          }));

          set({ 
            projects: transformedProjects, 
            isLoading: false 
          });
        } catch (error: any) {
          console.error('Error fetching projects by user:', error);
          set({ 
            error: error.message, 
            isLoading: false 
          });
        }
      },

      fetchProjectById: async (id: string) => {
        if (!supabase) {
          return get().getProjectById(id) || null;
        }

        try {
          const { data, error } = await supabase
            .from('projects')
            .select('*')
            .eq('id', id)
            .single();

          if (error) throw error;
          
          // Transform Supabase data to match local interface
          const transformedProject = {
            ...data,
            startDate: data.start_date,
            endDate: data.end_date,
            createdBy: data.created_by,
            companyId: data.company_id,
            createdAt: data.created_at,
            updatedAt: data.updated_at,
            clientInfo: data.client_info,
          };
          
          return transformedProject;
        } catch (error: any) {
          console.error('Error fetching project:', error);
          return null;
        }
      },

      fetchUserProjectAssignments: async (userId: string) => {
        if (!supabase) {
          console.error('Supabase not configured, no data available');
          set({ projects: [], userAssignments: [], isLoading: false, error: 'Supabase not configured' });
          return;
        }

        try {
          console.log('🔄 Fetching user project assignments for user:', userId);
          
          const { data, error } = await supabase
            .from('user_project_assignments')
            .select('*')
            .eq('user_id', userId)
            .eq('is_active', true)
            .order('assigned_at', { ascending: false });

          if (error) {
            console.error('❌ Supabase assignments fetch error:', error);
            throw error;
          }

          console.log('✅ User assignments fetched successfully:', data?.length || 0, 'assignments');

          // Transform Supabase data to match local interface
          const transformedAssignments = (data || []).map(assignment => ({
            id: assignment.id,
            userId: assignment.user_id,
            projectId: assignment.project_id,
            category: assignment.category,
            assignedAt: assignment.assigned_at,
            assignedBy: assignment.assigned_by,
            isActive: assignment.is_active,
          }));

          set(state => ({
            userAssignments: [
              ...state.userAssignments.filter(a => a.userId !== userId),
              ...transformedAssignments
            ]
          }));
        } catch (error: any) {
          console.error('Error fetching user project assignments:', error);
          
          // Check if it's a network error and retry once
          if (error.message?.includes('502') || error.message?.includes('Bad Gateway')) {
            console.log('🔄 Retrying fetchUserProjectAssignments due to 502 error...');
            setTimeout(async () => {
              try {
                const { data, error: retryError } = await supabase
                  .from('user_project_assignments')
                  .select('*')
                  .eq('user_id', userId)
                  .eq('is_active', true)
                  .order('assigned_at', { ascending: false });

                if (!retryError && data) {
                  console.log('✅ Retry successful:', data.length, 'assignments');
                  const transformedAssignments = data.map(assignment => ({
                    id: assignment.id,
                    userId: assignment.user_id,
                    projectId: assignment.project_id,
                    category: assignment.category,
                    assignedAt: assignment.assigned_at,
                    assignedBy: assignment.assigned_by,
                    isActive: assignment.is_active,
                  }));

                  set(state => ({
                    userAssignments: [
                      ...state.userAssignments.filter(a => a.userId !== userId),
                      ...transformedAssignments
                    ]
                  }));
                }
              } catch (retryError) {
                console.error('❌ Retry also failed:', retryError);
              }
            }, 2000); // Retry after 2 seconds
          }
        }
      },

      fetchProjectUserAssignments: async (projectId: string) => {
        if (!supabase) {
          console.error('Supabase not configured, no data available');
          set({ projects: [], userAssignments: [], isLoading: false, error: 'Supabase not configured' });
          return;
        }

        try {
          const { data, error } = await supabase
            .from('user_project_assignments')
            .select('*')
            .eq('project_id', projectId)
            .eq('is_active', true)
            .order('assigned_at', { ascending: false });

          if (error) throw error;

          // Transform Supabase data to match local interface
          const transformedAssignments = (data || []).map(assignment => ({
            id: assignment.id,
            userId: assignment.user_id,
            projectId: assignment.project_id,
            category: assignment.category,
            assignedAt: assignment.assigned_at,
            assignedBy: assignment.assigned_by,
            isActive: assignment.is_active,
          }));

          set(state => ({
            userAssignments: [
              ...state.userAssignments.filter(a => a.projectId !== projectId),
              ...transformedAssignments
            ]
          }));
        } catch (error: any) {
          console.error('Error fetching project user assignments:', error);
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

          // Update local state
          set(state => ({
            projects: [...state.projects, data],
            isLoading: false,
          }));

          return data.id;
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

          // Update local state
          set(state => ({
            projects: state.projects.map(project =>
              project.id === id 
                ? { ...project, ...updates, updatedAt: new Date().toISOString() } 
                : project
            ),
            isLoading: false,
          }));
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

          // Update local state
          set(state => ({
            projects: state.projects.filter(project => project.id !== id),
            isLoading: false,
          }));
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
            id: `assignment-${Date.now()}`,
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

          // Refresh assignments for both the user AND the project
          await get().fetchUserProjectAssignments(userId);
          await get().fetchProjectUserAssignments(projectId);
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

          // Refresh assignments for both the user AND the project
          await get().fetchUserProjectAssignments(userId);
          await get().fetchProjectUserAssignments(projectId);
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
          const assignmentsToKeep = Object.values(userGroups);
          const assignmentsToRemove = (data || []).filter(assignment => 
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
          a => a.userId === userId && a.category === 'lead_project_manager' && a.isActive
        );
        const projectIds = leadAssignments.map(a => a.projectId);
        return get().projects.filter(project => projectIds.includes(project.id));
      },

      isUserLeadPMForProject: (userId, projectId) => {
        return get().userAssignments.some(
          a => a.userId === userId && a.projectId === projectId && 
               a.category === 'lead_project_manager' && a.isActive
        );
      },

      getLeadPMForProject: (projectId) => {
        const leadAssignment = get().userAssignments.find(
          a => a.projectId === projectId && a.category === 'lead_project_manager' && a.isActive
        );
        return leadAssignment?.userId;
      },

      // Admin utilities
      getProjectStats: (projectId) => {
        const assignments = get().getProjectUserAssignments(projectId);
        const project = get().getProjectById(projectId);

        const usersByCategory = assignments.reduce((acc, assignment) => {
          const role = assignment.projectRole || assignment.category;
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
        // Only persist projects and assignments, not loading/error states
        projects: state.projects,
        userAssignments: state.userAssignments,
      }),
    }
  )
);

// Custom hook that automatically initializes data when accessed
export const useProjectStoreWithInit = () => {
  const store = useProjectStore();
  
  React.useEffect(() => {
    console.log('🔄 useProjectStoreWithInit: Initializing project store...');
    
    // Get current user from auth store
    const authStore = require('./authStore').useAuthStore.getState();
    const user = authStore.user;
    
    console.log('👤 Current user:', user ? `${user.name} (${user.id})` : 'none');
    console.log('🔗 Supabase available:', !!supabase);
    
    if (user && supabase) {
      console.log('🚀 Initializing with user context - fetching projects and assignments...');
      // Fetch both projects and user assignments
      Promise.all([
        store.fetchProjects(),
        store.fetchUserProjectAssignments(user.id)
      ]).then(() => {
        console.log('✅ Project store initialization complete');
      }).catch(error => {
        console.error('❌ Error during project store initialization:', error);
      });
    } else if (store.projects.length === 0 && !store.isLoading && supabase) {
      console.log('🚀 Fallback to basic initialization...');
      // Fallback to basic initialization
      store.fetchProjects();
    } else {
      console.log('⏭️ Skipping initialization - already loaded or no Supabase');
    }
  }, []);
  
  return store;
};

// Custom hook that automatically fetches projects for a specific company
export const useProjectStoreWithCompanyInit = (companyId: string) => {
  const store = useProjectStore();
  
  React.useEffect(() => {
    // Fetch projects for the specific company if not already loaded
    if (companyId && supabase) {
      store.fetchProjectsByCompany(companyId);
    }
  }, [companyId]);
  
  return store;
};

