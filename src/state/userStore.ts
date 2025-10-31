import React from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../api/supabase";
import { User, UserRole } from "../types/buildtrack";

interface UserStore {
  users: User[];
  currentUser: User | null;
  isLoading: boolean;
  error: string | null;

  // Internal initialization
  _initializeData: () => Promise<void>;

  // Fetching
  fetchUsers: () => Promise<void>;
  fetchUsersByCompany: (companyId: string) => Promise<void>;
  fetchUserById: (id: string) => Promise<User | null>;
  fetchCurrentUser: (id: string) => Promise<void>;
  
  // Getters (local state)
  getAllUsers: () => User[];
  getUserById: (id: string) => User | undefined;
  getUsersByRole: (role: UserRole) => User[];
  getUsersByCompany: (companyId: string) => User[];
  searchUsers: (query: string) => User[];
  searchUsersByCompany: (query: string, companyId: string) => User[];
  
  // Permissions
  hasPermission: (permission: string) => boolean;
  
  // Admin validation helpers
  getAdminCountByCompany: (companyId: string) => number;
  canDeleteUser: (userId: string) => { canDelete: boolean; reason?: string };
  canChangeUserRole: (userId: string, newRole: UserRole) => { canChange: boolean; reason?: string };
  
  // Mutations
  createUser: (userData: Omit<User, "id" | "createdAt">) => Promise<string>;
  updateUser: (id: string, updates: Partial<User>) => Promise<boolean>;
  deleteUser: (id: string) => Promise<boolean>;
}

export const useUserStore = create<UserStore>()(
  persist(
    (set, get) => ({
      users: [], // No mock data fallback - Supabase only
      currentUser: null,
      isLoading: false,
      error: null,

      // Initialize data on first access
      _initializeData: async () => {
        const state = get();
        if (state.users.length === 0 && !state.isLoading && supabase) {
          await state.fetchUsers();
        }
      },

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

          set({ 
            users: data || [], 
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

          set({ 
            users: data || [], 
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
          return data;
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
        return get().users.filter(user => user.companyId === companyId);
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

      // Fetch current user (for tests)
      fetchCurrentUser: async (id: string) => {
        const user = await get().fetchUserById(id);
        if (user) {
          set({ currentUser: user });
        }
      },

      // Permission checking (for tests)
      hasPermission: (permission: string) => {
        const { currentUser } = get();
        if (!currentUser) return false;

        // Admin has all permissions
        if (currentUser.role === 'admin') return true;

        // Manager permissions
        if (permission === 'manager' && (currentUser.role === 'manager' || currentUser.role === 'admin')) {
          return true;
        }

        // Exact role match
        return currentUser.role === permission;
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
      store._initializeData();
    }
  }, []);
  
  return store;
};
