import React from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../api/supabase";
import { Project, UserProjectAssignment, ProjectStatus, UserCategory } from "../types/buildtrack";

interface ProjectStore {
  projects: Project[];
  userAssignments: UserProjectAssignment[];
  isLoading: boolean;
  error: string | null;
  
  // Internal initialization
  _initializeData: () => Promise<void>;
  _initializeUserData: (userId: string) => Promise<void>;
  
  // Fetching
  fetchProjects: () => Promise<void>;
  fetchProjectsByUser: (userId: string) => Promise<void>;
  fetchProjectById: (id: string) => Promise<Project | null>;
  fetchUserProjectAssignments: (userId: string) => Promise<void>;
  fetchProjectUserAssignments: (projectId: string) => Promise<void>;
  
  // Project management
  getAllProjects: () => Project[];
  getProjectById: (id: string) => Project | undefined;
  getProjectsByUser: (userId: string) => Project[];
  createProject: (project: Omit<Project, "id" | "createdAt" | "updatedAt">) => Promise<string>;
  updateProject: (id: string, updates: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  
  // User assignments
  assignUserToProject: (userId: string, projectId: string, category: UserCategory, assignedBy: string) => Promise<void>;
  removeUserFromProject: (userId: string, projectId: string) => Promise<void>;
  updateUserProjectCategory: (userId: string, projectId: string, category: UserCategory) => Promise<void>;
  getUserProjectAssignments: (userId: string) => UserProjectAssignment[];
  getProjectUserAssignments: (projectId: string) => UserProjectAssignment[];
  
  
  // Admin utilities
  getProjectStats: (projectId: string) => {
    totalUsers: number;
    usersByCategory: Record<UserCategory, number>;
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

      // Initialize data on first access
      _initializeData: async () => {
        const state = get();
        if (state.projects.length === 0 && !state.isLoading && supabase) {
          await state.fetchProjects();
        }
      },

      // Initialize data with user context (call this after login)
      _initializeUserData: async (userId: string) => {
        const state = get();
        if (!state.isLoading && supabase) {
          // Fetch projects and user assignments
          await Promise.all([
            state.fetchProjects(),
            state.fetchUserProjectAssignments(userId)
          ]);
        }
      },

      // FETCH from Supabase
      fetchProjects: async () => {
        if (!supabase) {
          console.error('Supabase not configured, no data available');
          set({ projects: [], isLoading: false, error: 'Supabase not configured' });
          return;
        }

        set({ isLoading: true, error: null });
        try {
          console.log('🔄 Fetching projects from Supabase...');
          
          // Fetch projects with company_id field
          const { data, error } = await supabase
            .from('projects')
            .select('*')
            .order('name');

          if (error) {
            console.error('❌ Supabase projects fetch error:', error);
            throw error;
          }

          console.log('✅ Projects fetched successfully:', data?.length || 0, 'projects');
          console.log('Project names:', data?.map(p => p.name).join(', '));

          // Transform Supabase data to match app's Project interface
          const transformedProjects = (data || []).map(project => ({
            id: project.id,
            name: project.name,
            description: project.description || '',
            status: project.status || 'planning',
            startDate: project.start_date || new Date().toISOString(),
            endDate: project.end_date,
            budget: project.budget,
            location: project.location || { address: '', city: '', state: '', zipCode: '' },
            clientInfo: project.client_info || { name: '' },
            createdBy: project.created_by || '',
            companyId: project.company_id, // Map company_id to companyId
            createdAt: project.created_at || new Date().toISOString(),
            updatedAt: project.updated_at || new Date().toISOString(),
          }));

          set({ 
            projects: transformedProjects, 
            isLoading: false 
          });
        } catch (error: any) {
          console.error('❌ Error fetching projects:', error);
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
            .select(`
              *,
              users!created_by (
                id,
                name,
                email
              )
            `)
            .in('id', projectIds)
            .order('name');

          if (error) throw error;

          set({ 
            projects: data || [], 
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
            .select(`
              *,
              users!created_by (
                id,
                name,
                email
              )
            `)
            .eq('id', id)
            .single();

          if (error) throw error;
          return data;
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
          
          // Simplified query without foreign key joins to avoid relationship issues
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
          data?.forEach(assignment => {
            console.log('  - Project', assignment.project_id, 'as', assignment.category);
          });

          set(state => ({
            userAssignments: [
              ...state.userAssignments.filter(a => a.userId !== userId),
              ...(data || []).map(assignment => ({
                userId: assignment.user_id,
                projectId: assignment.project_id,
                category: assignment.category,
                assignedBy: assignment.assigned_by,
                assignedAt: assignment.assigned_at,
                isActive: assignment.is_active
              }))
            ]
          }));
        } catch (error: any) {
          console.error('❌ Error fetching user project assignments:', error);
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
            .select(`
              *,
              users (
                id,
                name,
                email,
                role
              ),
              users!assigned_by (
                id,
                name
              )
            `)
            .eq('project_id', projectId)
            .eq('is_active', true)
            .order('assigned_at', { ascending: false });

          if (error) throw error;

          set(state => ({
            userAssignments: [
              ...state.userAssignments.filter(a => a.projectId !== projectId),
              ...(data || [])
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

      getProjectsByUser: (userId) => {
        const assignments = get().getUserProjectAssignments(userId);
        const projectIds = assignments.map(a => a.projectId);
        
        // If user has no assignments, check if they're admin or manager
        if (projectIds.length === 0) {
          // Get user info to check role
          const userStore = require('./userStore').useUserStore.getState();
          const user = userStore.getUserById(userId);
          
          // Admins and managers can see all projects by default
          if (user && (user.role === 'admin' || user.role === 'manager')) {
            return get().projects; // Return all projects
          }
        }
        
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
          // Get the user's company_id to set as project's company_id
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('company_id')
            .eq('id', projectData.createdBy)
            .single();

          if (userError) {
            console.error('Error fetching user company:', userError);
            // Continue without company_id if user lookup fails
          }

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
              company_id: userData?.company_id || projectData.companyId, // Use user's company_id or provided companyId
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
          const { error } = await supabase
            .from('user_project_assignments')
            .insert({
              user_id: userId,
              project_id: projectId,
              category,
              assigned_by: assignedBy,
              is_active: true,
            });

          if (error) throw error;

          // Refresh assignments
          await get().fetchUserProjectAssignments(userId);
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

          // Refresh assignments
          await get().fetchUserProjectAssignments(userId);
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


      // Admin utilities
      getProjectStats: (projectId) => {
        const assignments = get().getProjectUserAssignments(projectId);
        const project = get().getProjectById(projectId);

        const usersByCategory = assignments.reduce((acc, assignment) => {
          acc[assignment.category] = (acc[assignment.category] || 0) + 1;
          return acc;
        }, {} as Record<UserCategory, number>);

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
      console.log('🚀 Initializing with user context...');
      // Initialize with user context to fetch both projects and assignments
      store._initializeUserData(user.id);
    } else if (store.projects.length === 0 && !store.isLoading && supabase) {
      console.log('🚀 Fallback to basic initialization...');
      // Fallback to basic initialization
      store._initializeData();
    } else {
      console.log('⏭️ Skipping initialization - already loaded or no Supabase');
    }
  }, []);
  
  return store;
};
