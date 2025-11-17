import React from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../api/supabase";
import { User, UserRole } from "../types/buildtrack";

interface UserStore {
  users: User[];
  isLoading: boolean;
  error: string | null;

  // Fetching
  fetchUsers: () => Promise<void>;
  fetchUsersByCompany: (companyId: string) => Promise<void>;
  fetchUserById: (id: string) => Promise<User | null>;
  
  // Getters (local state)
  getAllUsers: () => User[];
  getUserById: (id: string) => User | undefined;
  getUsersByRole: (role: UserRole) => User[];
  getUsersByCompany: (companyId: string) => User[];
  getPendingUsersByCompany: (companyId: string) => User[];
  searchUsers: (query: string) => User[];
  searchUsersByCompany: (query: string, companyId: string) => User[];
  
  // Admin validation helpers
  getAdminCountByCompany: (companyId: string) => number;
  canDeleteUser: (userId: string) => { canDelete: boolean; reason?: string };
  canChangeUserRole: (userId: string, newRole: UserRole) => { canChange: boolean; reason?: string };
  
  // User approval
  approveUser: (userId: string, approvedBy: string) => Promise<boolean>;
  rejectUser: (userId: string) => Promise<boolean>;
  
  // Mutations
  createUser: (userData: Omit<User, "id" | "createdAt">) => Promise<string>;
  updateUser: (id: string, updates: Partial<User>) => Promise<boolean>;
  deleteUser: (id: string) => Promise<boolean>;
}

export const useUserStore = create<UserStore>()(
  persist(
    (set, get) => ({
      users: [], // Supabase only - no mock data fallback
      isLoading: false,
      error: null,

      // FETCH from Supabase
      fetchUsers: async () => {
        if (!supabase) {
          console.error('Supabase not configured, no data available');
          set({ users: [], isLoading: false, error: 'Supabase not configured' });
          return;
        }

        set({ isLoading: true, error: null });
        try {
          const { data, error } = await supabase
            .from('users')
            .select(`
              *,
              companies (
                id,
                name,
                type
              )
            `)
            .order('name');

          if (error) throw error;

          // Transform Supabase data to match local interface
          const transformedUsers = (data || []).map(user => ({
            ...user,
            companyId: user.company_id || user.companyId, // Handle both field names
            lastSelectedProjectId: user.last_selected_project_id || null,
            isPending: user.is_pending ?? user.isPending ?? false, // Transform snake_case to camelCase
            approvedBy: user.approved_by || user.approvedBy || null,
            approvedAt: user.approved_at || user.approvedAt || null,
          }));

          set({ 
            users: transformedUsers, 
            isLoading: false 
          });
        } catch (error: any) {
          console.error('Error fetching users:', error);
          set({ 
            error: error.message, 
            isLoading: false 
          });
        }
      },

      fetchUsersByCompany: async (companyId: string) => {
        if (!supabase) {
          console.error('Supabase not configured, no data available');
          set({ users: [], isLoading: false, error: 'Supabase not configured' });
          return;
        }

        set({ isLoading: true, error: null });
        try {
          const { data, error } = await supabase
            .from('users')
            .select(`
              *,
              companies (
                id,
                name,
                type
              )
            `)
            .eq('company_id', companyId)
            .order('name');

          if (error) throw error;

          // Transform Supabase data to match local interface
          const transformedUsers = (data || []).map(user => ({
            ...user,
            companyId: user.company_id || user.companyId, // Handle both field names
            lastSelectedProjectId: user.last_selected_project_id || null,
            isPending: user.is_pending ?? user.isPending ?? false, // Transform snake_case to camelCase
            approvedBy: user.approved_by || user.approvedBy || null,
            approvedAt: user.approved_at || user.approvedAt || null,
          }));

          set({ 
            users: transformedUsers, 
            isLoading: false 
          });
        } catch (error: any) {
          console.error('Error fetching users by company:', error);
          set({ 
            error: error.message, 
            isLoading: false 
          });
        }
      },

      fetchUserById: async (id: string) => {
        if (!supabase) {
          return get().getUserById(id) || null;
        }

        try {
          const { data, error } = await supabase
            .from('users')
            .select(`
              *,
              companies (
                id,
                name,
                type
              )
            `)
            .eq('id', id)
            .single();

          if (error) throw error;
          
          // Transform Supabase data to match local interface
          return data ? {
            ...data,
            companyId: data.company_id || data.companyId,
            lastSelectedProjectId: data.last_selected_project_id || null,
            isPending: data.is_pending ?? data.isPending ?? false, // Transform snake_case to camelCase
            approvedBy: data.approved_by || data.approvedBy || null,
            approvedAt: data.approved_at || data.approvedAt || null,
          } : null;
        } catch (error: any) {
          console.error('Error fetching user:', error);
          return null;
        }
      },

      // LOCAL getters (work with cached data)
      getAllUsers: () => {
        return get().users;
      },

      getUserById: (id) => {
        return get().users.find(user => user.id === id);
      },

      getUsersByRole: (role) => {
        return get().users.filter(user => user.role === role);
      },

      getUsersByCompany: (companyId) => {
        const users = get().users;
        const filteredUsers = users.filter(user => 
          (user.companyId === companyId) || 
          (user.company_id === companyId)
        );
        
        // Debug logging
        console.log('=== getUsersByCompany Debug ===');
        console.log('- Company ID to filter by:', companyId);
        console.log('- Total users in store:', users.length);
        console.log('- Filtered users count:', filteredUsers.length);
        console.log('- All users data:', users.map(u => ({ 
          name: u.name, 
          companyId: u.companyId, 
          company_id: u.company_id,
          matches: (u.companyId === companyId) || (u.company_id === companyId)
        })));
        console.log('===============================');
        
        return filteredUsers;
      },

      getPendingUsersByCompany: (companyId) => {
        const users = get().getUsersByCompany(companyId);
        return users.filter(user => user.isPending === true || user.is_pending === true);
      },

      searchUsers: (query) => {
        const { users } = get();
        const lowercaseQuery = query.toLowerCase();
        return users.filter(user => 
          user.name.toLowerCase().includes(lowercaseQuery) ||
          user.email?.toLowerCase().includes(lowercaseQuery) ||
          user.phone.includes(query) ||
          user.position.toLowerCase().includes(lowercaseQuery)
        );
      },

      searchUsersByCompany: (query, companyId) => {
        const companyUsers = get().getUsersByCompany(companyId);
        const lowercaseQuery = query.toLowerCase();
        return companyUsers.filter(user => 
          user.name.toLowerCase().includes(lowercaseQuery) ||
          user.email?.toLowerCase().includes(lowercaseQuery) ||
          user.phone.includes(query) ||
          user.position.toLowerCase().includes(lowercaseQuery)
        );
      },

      // Admin validation helpers
      getAdminCountByCompany: (companyId) => {
        return get().getUsersByCompany(companyId).filter(user => user.role === 'admin').length;
      },

      canDeleteUser: (userId) => {
        const user = get().getUserById(userId);
        if (!user) {
          return { canDelete: false, reason: 'User not found' };
        }

        const adminCount = get().getAdminCountByCompany(user.companyId);
        if (user.role === 'admin' && adminCount <= 1) {
          return { canDelete: false, reason: 'Cannot delete the last admin in the company' };
        }

        return { canDelete: true };
      },

      canChangeUserRole: (userId, newRole) => {
        const user = get().getUserById(userId);
        if (!user) {
          return { canChange: false, reason: 'User not found' };
        }

        const adminCount = get().getAdminCountByCompany(user.companyId);
        if (user.role === 'admin' && newRole !== 'admin' && adminCount <= 1) {
          return { canChange: false, reason: 'Cannot remove admin role from the last admin in the company' };
        }

        return { canChange: true };
      },

      // APPROVE user
      approveUser: async (userId, approvedBy) => {
        if (!supabase) {
          console.error('Supabase not configured');
          return false;
        }

        set({ isLoading: true, error: null });
        try {
          const { error } = await supabase
            .from('users')
            .update({
              is_pending: false,
              approved_by: approvedBy,
              approved_at: new Date().toISOString(),
            })
            .eq('id', userId);

          if (error) throw error;

          // Update local state
          set(state => ({
            users: state.users.map(user =>
              user.id === userId
                ? { 
                    ...user, 
                    isPending: false, 
                    is_pending: false,
                    approvedBy: approvedBy,
                    approved_by: approvedBy,
                    approvedAt: new Date().toISOString(),
                    approved_at: new Date().toISOString(),
                  }
                : user
            ),
            isLoading: false,
          }));

          return true;
        } catch (error: any) {
          console.error('Error approving user:', error);
          set({ error: error.message, isLoading: false });
          return false;
        }
      },

      // REJECT user (delete pending user)
      rejectUser: async (userId) => {
        if (!supabase) {
          console.error('Supabase not configured');
          return false;
        }

        set({ isLoading: true, error: null });
        try {
          // Delete the user from auth
          const { error: authError } = await supabase.auth.admin.deleteUser(userId);
          if (authError) {
            console.warn('Could not delete auth user:', authError);
            // Continue anyway as we still want to delete from users table
          }

          // Delete from users table
          const { error } = await supabase
            .from('users')
            .delete()
            .eq('id', userId);

          if (error) throw error;

          // Update local state
          set(state => ({
            users: state.users.filter(user => user.id !== userId),
            isLoading: false,
          }));

          return true;
        } catch (error: any) {
          console.error('Error rejecting user:', error);
          set({ error: error.message, isLoading: false });
          return false;
        }
      },

      // CREATE user in Supabase
      createUser: async (userData) => {
        if (!supabase) {
          // Fallback to local creation
          const newUser: User = {
            ...userData,
            id: `user-${Date.now()}`,
            createdAt: new Date().toISOString(),
          };

          set(state => ({
            users: [...state.users, newUser]
          }));

          return newUser.id;
        }

        set({ isLoading: true, error: null });
        try {
          const { data, error } = await supabase
            .from('users')
            .insert({
              name: userData.name,
              email: userData.email,
              role: userData.role,
              company_id: userData.companyId,
              position: userData.position,
              phone: userData.phone,
            })
            .select()
            .single();

          if (error) throw error;

          // Update local state
          set(state => ({
            users: [...state.users, data],
            isLoading: false,
          }));

          return data.id;
        } catch (error: any) {
          console.error('Error creating user:', error);
          set({ 
            error: error.message, 
            isLoading: false 
          });
          throw error;
        }
      },

      // UPDATE user in Supabase
      updateUser: async (id, updates) => {
        if (!supabase) {
          // Fallback to local update
          set(state => ({
            users: state.users.map(user =>
              user.id === id
                ? { ...user, ...updates }
                : user
            )
          }));
          return true;
        }

        set({ isLoading: true, error: null });
        try {
          const { error } = await supabase
            .from('users')
            .update({
              name: updates.name,
              email: updates.email,
              role: updates.role,
              company_id: updates.companyId,
              position: updates.position,
              phone: updates.phone,
            })
            .eq('id', id);

          if (error) throw error;

          // Update local state
          set(state => ({
            users: state.users.map(user =>
              user.id === id 
                ? { ...user, ...updates } 
                : user
            ),
            isLoading: false,
          }));

          return true;
        } catch (error: any) {
          console.error('Error updating user:', error);
          set({ 
            error: error.message, 
            isLoading: false 
          });
          return false;
        }
      },

      // DELETE user in Supabase
      deleteUser: async (id) => {
        if (!supabase) {
          // Fallback to local deletion
          set(state => ({
            users: state.users.filter(user => user.id !== id)
          }));
          return true;
        }

        set({ isLoading: true, error: null });
        try {
          const { error } = await supabase
            .from('users')
            .delete()
            .eq('id', id);

          if (error) throw error;

          // Update local state
          set(state => ({
            users: state.users.filter(user => user.id !== id),
            isLoading: false,
          }));

          return true;
        } catch (error: any) {
          console.error('Error deleting user:', error);
          set({ 
            error: error.message, 
            isLoading: false 
          });
          return false;
        }
      },
    }),
    {
      name: "buildtrack-users",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        // Only persist users, not loading/error states
        users: state.users,
      }),
    }
  )
);

// Custom hook that automatically initializes data when accessed
export const useUserStoreWithInit = () => {
  const store = useUserStore();
  
  React.useEffect(() => {
    // Initialize data on first mount if not already loaded
    if (store.users.length === 0 && !store.isLoading && supabase) {
      store.fetchUsers();
    }
  }, []);
  
  return store;
};

