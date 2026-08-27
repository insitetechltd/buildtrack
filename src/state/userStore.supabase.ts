import React from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../api/supabase";
import { getSessionScopedSupabase } from "../api/supabaseSessionGate";
import { User, UserRole, SystemPermission, getUserSystemPermission, hasSystemPermission } from "../types/buildtrack";
import { userAccountIsDeleted } from "../types/userAccountRetention";
import { roleChangeExceedsSeatLimit } from "../billing/seatUsage";

function mapSupabaseUser(user: {
  role?: string | null;
  system_permission?: string | null;
  company_id?: string;
  companyId?: string;
  last_selected_project_id?: string | null;
  is_pending?: boolean;
  isPending?: boolean;
  is_active?: boolean;
  isActive?: boolean;
  approved_by?: string | null;
  approvedBy?: string | null;
  approved_at?: string | null;
  approvedAt?: string | null;
  deleted_at?: string | null;
  deletedAt?: string | null;
  invite_sign_in_link?: string | null;
  inviteSignInLink?: string | null;
  must_set_password?: boolean;
  mustSetPassword?: boolean;
  deployable_seat?: "pm" | "worker" | null;
  deployableSeat?: "pm" | "worker" | null;
}): User {
  const dbRoleRaw = user.role || user.system_permission || "worker";
  const dbRole =
    dbRoleRaw === "company_admin"
      ? "admin"
      : dbRoleRaw === "supervisor"
        ? "manager"
        : dbRoleRaw === "member"
          ? "worker"
          : dbRoleRaw;
  const systemPermission: SystemPermission =
    user.system_permission === "admin" ||
    user.system_permission === "manager" ||
    user.system_permission === "member"
      ? user.system_permission
      : dbRole === "admin"
        ? "admin"
        : dbRole === "manager"
          ? "manager"
          : "member";

  const deployableRaw = user.deployableSeat ?? user.deployable_seat;
  const deployableSeat =
    deployableRaw === "pm" || deployableRaw === "worker" ? deployableRaw : null;

  return {
    ...(user as User),
    role: dbRole as UserRole,
    systemPermission,
    deployableSeat,
    companyId: user.company_id || user.companyId || "",
    lastSelectedProjectId: user.last_selected_project_id || null,
    isPending: user.is_pending ?? user.isPending ?? false,
    isActive: user.is_active ?? user.isActive ?? true,
    approvedBy: user.approved_by || user.approvedBy || null,
    approvedAt: user.approved_at || user.approvedAt || null,
    deletedAt: user.deleted_at ?? user.deletedAt ?? null,
    inviteSignInLink: user.invite_sign_in_link ?? user.inviteSignInLink ?? null,
    mustSetPassword: user.mustSetPassword === true || user.must_set_password === true,
  };
}

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
  canAssignCompanySeatRole: (
    userId: string,
    nextRole: string,
    limits: { pmSeatLimit: number; workerSeatLimit: number },
    nextIsActive?: boolean,
  ) => { canChange: boolean; reason?: string; seatType: "pm" | "worker" | null };

  // User approval
  approveUser: (userId: string, approvedBy: string) => Promise<boolean>;
  rejectUser: (userId: string) => Promise<boolean>;
  
  // Mutations
  createUser: (userData: Omit<User, "id" | "createdAt">) => Promise<string>;
  updateUser: (id: string, updates: Partial<User>) => Promise<boolean>;
  /** Soft-deactivate a seat without deleting the profile (vacates invite caps). */
  deactivateUserSeat: (id: string) => Promise<boolean>;
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
        const sessionClient = await getSessionScopedSupabase();
        if (!sessionClient) {
          console.warn('📊 [users] Skipping fetchUsers — no Supabase session (avoids anon 42501)');
          set({ isLoading: false });
          return;
        }

        set({ isLoading: true, error: null });
        try {
          const { data, error } = await sessionClient
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

          const transformedUsers = (data || []).map(mapSupabaseUser);

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

        const sessionClient = await getSessionScopedSupabase();
        if (!sessionClient) {
          console.warn('📊 [users] Skipping fetchUsersByCompany — no Supabase session');
          return;
        }

        set({ isLoading: true, error: null });
        try {
          const { data, error } = await sessionClient
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

          const transformedUsers = (data || []).map(mapSupabaseUser);

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
          
          if (!data) return null;
          return mapSupabaseUser(data);
        } catch (error: any) {
          console.error('Error fetching user:', error);
          return null;
        }
      },

      // LOCAL getters (work with cached data)
      getAllUsers: () => {
        return get().users.filter((user) => !userAccountIsDeleted(user));
      },

      getUserById: (id) => {
        return get().users.find(user => user.id === id);
      },

      getUsersByRole: (role) => {
        // Support both old (UserRole) and new (SystemPermission) types
        // Map "worker" to "member" for backward compatibility
        const targetPermission: SystemPermission = role === 'worker' ? 'member' : (role as SystemPermission);
        return get().users.filter(user =>
          !userAccountIsDeleted(user) && getUserSystemPermission(user) === targetPermission
        );
      },

      getUsersByCompany: (companyId) => {
        const users = get().users;
        const filteredUsers = users.filter(user =>
          user.companyId === companyId && !userAccountIsDeleted(user)
        );
        
        // Debug logging
        console.log('=== getUsersByCompany Debug ===');
        console.log('- Company ID to filter by:', companyId);
        console.log('- Total users in store:', users.length);
        console.log('- Filtered users count:', filteredUsers.length);
        console.log('- All users data:', users.map(u => ({
          name: u.name,
          companyId: u.companyId,
          matches: u.companyId === companyId
        })));
        console.log('===============================');
        
        return filteredUsers;
      },

      getPendingUsersByCompany: (companyId) => {
        const users = get().getUsersByCompany(companyId);
        return users.filter(user => user.isPending === true);
      },

      searchUsers: (query) => {
        const { users } = get();
        const lowercaseQuery = query.toLowerCase();
        return users.filter(user =>
          !userAccountIsDeleted(user) && (
          user.name.toLowerCase().includes(lowercaseQuery) ||
          user.email?.toLowerCase().includes(lowercaseQuery) ||
          user.phone.includes(query) ||
          user.position.toLowerCase().includes(lowercaseQuery)
          )
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
        return get().getUsersByCompany(companyId).filter(user => hasSystemPermission(user, 'admin')).length;
      },

      canDeleteUser: (userId) => {
        const user = get().getUserById(userId);
        if (!user) {
          return { canDelete: false, reason: 'User not found' };
        }

        if (userAccountIsDeleted(user)) {
          return { canDelete: false, reason: 'User already deleted' };
        }

        const adminCount = get().getAdminCountByCompany(user.companyId);
        if (hasSystemPermission(user, 'admin') && adminCount <= 1) {
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
        const newPermission: SystemPermission = newRole === 'worker' ? 'member' : (newRole as SystemPermission);
        if (hasSystemPermission(user, 'admin') && newPermission !== 'admin' && adminCount <= 1) {
          return { canChange: false, reason: 'Cannot remove admin role from the last admin in the company' };
        }

        return { canChange: true };
      },

      /**
       * Seat-aware role change gate. Call before updateUser when changing role /
       * reactivating a seat. Entitlement limits must be passed from a fresh fetch.
       */
      canAssignCompanySeatRole: (
        userId: string,
        nextRole: string,
        limits: { pmSeatLimit: number; workerSeatLimit: number },
        nextIsActive = true,
      ) => {
        const user = get().getUserById(userId);
        if (!user) {
          return { canChange: false, reason: "User not found", seatType: null as "pm" | "worker" | null };
        }
        const lastAdminGate = get().canChangeUserRole(
          userId,
          nextRole === "member" ? "worker" : (nextRole as UserRole),
        );
        if (!lastAdminGate.canChange) {
          return { ...lastAdminGate, seatType: null as "pm" | "worker" | null };
        }

        const companyUsers = get().getUsersByCompany(user.companyId);
        const mappedRole =
          nextRole === "manager"
            ? "supervisor"
            : nextRole === "member"
              ? "worker"
              : nextRole;
        const { exceeds, seatType, usage } = roleChangeExceedsSeatLimit(
          companyUsers,
          limits,
          { userId, nextRole: mappedRole, nextIsActive },
        );
        if (exceeds) {
          return {
            canChange: false,
            reason:
              seatType === "pm"
                ? `PM seat limit reached (${usage.pmCount}/${limits.pmSeatLimit}). Add a PM seat before assigning this role.`
                : `Worker seat limit reached (${usage.workerCount}/${limits.workerSeatLimit}). Add a worker seat before assigning this role.`,
            seatType,
          };
        }
        return { canChange: true, seatType: null };
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
              role:
                userData.role === "manager"
                  ? "supervisor"
                  : userData.role === "member"
                    ? "worker"
                    : userData.role,
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
          // Map systemPermission / role into live users.role CHECK vocabulary
          const rawDbRole = updates.systemPermission
            ? updates.systemPermission === "member"
              ? "worker"
              : updates.systemPermission
            : updates.role === "member"
              ? "worker"
              : updates.role;
          const dbRole =
            rawDbRole === "manager"
              ? "supervisor"
              : rawDbRole;

          const dbUpdates: Record<string, unknown> = {};
          if (updates.name !== undefined) dbUpdates.name = updates.name;
          if (updates.email !== undefined) dbUpdates.email = updates.email;
          if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
          if (updates.position !== undefined) dbUpdates.position = updates.position;
          if (updates.companyId !== undefined) dbUpdates.company_id = updates.companyId;
          if (dbRole !== undefined) dbUpdates.role = dbRole;
          if (typeof updates.isActive === "boolean") {
            dbUpdates.is_active = updates.isActive;
          }
          if (typeof updates.isPending === "boolean") {
            dbUpdates.is_pending = updates.isPending;
          }

          if (Object.keys(dbUpdates).length === 0) {
            set({ isLoading: false });
            return true;
          }

          const { error } = await supabase
            .from('users')
            .update(dbUpdates)
            .eq('id', id);

          if (error) {
            if (/pm_seat_limit|worker_seat_limit/i.test(error.message || "")) {
              set({
                error: error.message,
                isLoading: false,
              });
              return false;
            }
            throw error;
          }

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

      deactivateUserSeat: async (id) => {
        return get().updateUser(id, { isActive: false });
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
      name: "insite-users-supabase-v1",
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
