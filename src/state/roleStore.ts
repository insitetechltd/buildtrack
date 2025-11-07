import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../api/supabase";
import { Role, RoleName } from "../types/buildtrack";

interface RoleStore {
  roles: Role[];
  isLoading: boolean;
  error: string | null;

  // Fetching
  fetchRoles: () => Promise<void>;
  fetchRoleById: (id: string) => Promise<Role | null>;
  
  // Getters (local state)
  getAllRoles: () => Role[];
  getRoleById: (id: string) => Role | undefined;
  getRoleByName: (name: RoleName) => Role | undefined;
  getSystemRoles: () => Role[];
  getCustomRoles: () => Role[];
  getRolesByLevel: (level: number) => Role[];
  
  // Mutations (admin only)
  createRole: (role: Omit<Role, "id" | "createdAt" | "updatedAt">) => Promise<string>;
  updateRole: (id: string, updates: Partial<Role>) => Promise<void>;
  deleteRole: (id: string) => Promise<void>;
}

export const useRoleStore = create<RoleStore>()(
  persist(
    (set, get) => ({
      roles: [], // Will be populated from Supabase
      isLoading: false,
      error: null,

      // FETCH from Supabase
      fetchRoles: async () => {
        if (!supabase) {
          console.error('Supabase not configured, no data available');
          set({ roles: [], isLoading: false, error: 'Supabase not configured' });
          return;
        }

        set({ isLoading: true, error: null });
        try {
          const { data, error } = await supabase
            .from('roles')
            .select('*')
            .order('level');

          if (error) throw error;

          set({ 
            roles: data || [], 
            isLoading: false 
          });
        } catch (error: any) {
          console.error('Error fetching roles:', error);
          set({ 
            error: error.message, 
            isLoading: false 
          });
        }
      },

      fetchRoleById: async (id: string) => {
        if (!supabase) {
          return get().getRoleById(id) || null;
        }

        try {
          const { data, error } = await supabase
            .from('roles')
            .select('*')
            .eq('id', id)
            .single();

          if (error) throw error;
          return data;
        } catch (error: any) {
          console.error('Error fetching role:', error);
          return null;
        }
      },

      // LOCAL getters (work with cached data)
      getAllRoles: () => {
        return get().roles;
      },

      getRoleById: (id) => {
        return get().roles.find(role => role.id === id);
      },

      getRoleByName: (name) => {
        return get().roles.find(role => role.name === name);
      },

      getSystemRoles: () => {
        return get().roles.filter(role => role.isSystemRole);
      },

      getCustomRoles: () => {
        return get().roles.filter(role => !role.isSystemRole);
      },

      getRolesByLevel: (level) => {
        return get().roles.filter(role => role.level === level);
      },

      // CREATE role in Supabase (admin only)
      createRole: async (roleData) => {
        if (!supabase) {
          console.error('Supabase not configured');
          throw new Error('Supabase not configured');
        }

        set({ isLoading: true, error: null });
        try {
          const { data, error } = await supabase
            .from('roles')
            .insert({
              name: roleData.name,
              display_name: roleData.displayName,
              description: roleData.description,
              level: roleData.level,
              permissions: roleData.permissions || {},
              is_system_role: roleData.isSystemRole,
            })
            .select()
            .single();

          if (error) throw error;

          // Update local state
          set(state => ({
            roles: [...state.roles, data],
            isLoading: false,
          }));

          return data.id;
        } catch (error: any) {
          console.error('Error creating role:', error);
          set({ 
            error: error.message, 
            isLoading: false 
          });
          throw error;
        }
      },

      // UPDATE role in Supabase (admin only)
      updateRole: async (id, updates) => {
        if (!supabase) {
          console.error('Supabase not configured');
          throw new Error('Supabase not configured');
        }

        set({ isLoading: true, error: null });
        try {
          const { error } = await supabase
            .from('roles')
            .update({
              ...(updates.name && { name: updates.name }),
              ...(updates.displayName && { display_name: updates.displayName }),
              ...(updates.description !== undefined && { description: updates.description }),
              ...(updates.level && { level: updates.level }),
              ...(updates.permissions && { permissions: updates.permissions }),
              ...(updates.isSystemRole !== undefined && { is_system_role: updates.isSystemRole }),
            })
            .eq('id', id);

          if (error) throw error;

          // Update local state
          set(state => ({
            roles: state.roles.map(role =>
              role.id === id ? { ...role, ...updates, updatedAt: new Date().toISOString() } : role
            ),
            isLoading: false,
          }));
        } catch (error: any) {
          console.error('Error updating role:', error);
          set({ 
            error: error.message, 
            isLoading: false 
          });
          throw error;
        }
      },

      // DELETE role in Supabase (admin only)
      deleteRole: async (id) => {
        if (!supabase) {
          console.error('Supabase not configured');
          throw new Error('Supabase not configured');
        }

        // Prevent deletion of system roles
        const role = get().getRoleById(id);
        if (role?.isSystemRole) {
          throw new Error('Cannot delete system roles');
        }

        set({ isLoading: true, error: null });
        try {
          const { error } = await supabase
            .from('roles')
            .delete()
            .eq('id', id);

          if (error) throw error;

          // Update local state
          set(state => ({
            roles: state.roles.filter(role => role.id !== id),
            isLoading: false,
          }));
        } catch (error: any) {
          console.error('Error deleting role:', error);
          set({ 
            error: error.message, 
            isLoading: false 
          });
          throw error;
        }
      },
    }),
    {
      name: "role-storage",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);


