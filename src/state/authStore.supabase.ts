import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../api/supabase";
import { AuthState, User, UserRole, SystemPermission, getUserSystemPermission } from "../types/buildtrack";
import { useUserStore } from "./userStore.supabase";

interface AuthStore extends AuthState {
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  register: (data: {
    name: string;
    phone: string;
    companyId: string;
    position: string;
    email?: string;
    password: string;
    role?: UserRole;
    isPending?: boolean;
  }) => Promise<{ success: boolean; error?: string }>;
  updateUser: (updates: Partial<User>) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  refreshUser: () => Promise<void>;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (username: string, password: string) => {
        set({ isLoading: true });
        
        try {
          if (!supabase) {
            // Fallback to mock authentication
            const allUsers = useUserStore.getState().getAllUsers();
            const user = allUsers.find((u: User) => 
              (u.email && u.email.toLowerCase() === username.toLowerCase()) ||
              u.phone === username
            );
            
            if (user && password.length >= 6) {
              set({ 
                user, 
                isAuthenticated: true, 
                isLoading: false 
              });
              return true;
            }
            
            set({ isLoading: false });
            return false;
          }

          // Check if username is a phone number or email
          let email = username;
          const phoneRegex = /^[\d\s\-\(\)\+]+$/;
          const isPhoneNumber = phoneRegex.test(username.trim());
          
          // If it's a phone number, look up the email from the users table
          if (isPhoneNumber) {
            console.log('📱 Phone number login detected, looking up email...');
            const { data: phoneUserData, error: phoneError } = await supabase
              .from('users')
              .select('email')
              .eq('phone', username.trim())
              .single();
            
            if (phoneError || !phoneUserData || !phoneUserData.email) {
              console.error('Phone number not found or has no email:', phoneError);
              set({ isLoading: false });
              return false;
            }
            
            email = phoneUserData.email;
            console.log('✅ Found email for phone number:', email);
          }

          // Use Supabase Auth for real authentication
          const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password,
          });

          if (error) {
            console.error('Login error:', error.message);
            set({ isLoading: false });
            return false;
          }

          if (data.user) {
            // Fetch user details from our users table using user ID (more reliable than email)
            const { data: userData, error: userError } = await supabase
              .from('users')
              .select(`
                *,
                companies (
                  id,
                  name,
                  type
                )
              `)
              .eq('id', data.user.id)
              .single();

            if (userError || !userData) {
              console.error('Error fetching user data:', userError);
              set({ isLoading: false });
              return false;
            }

            // Check if user is pending approval
            if (userData.is_pending) {
              console.log('User login blocked: pending approval');
              // Sign out the user from Supabase auth
              await supabase.auth.signOut();
              set({ 
                user: null, 
                isAuthenticated: false, 
                isLoading: false 
              });
              // Return false with a special indicator that can be checked
              throw new Error('PENDING_APPROVAL');
            }

            // Transform Supabase data to match local interface
            // Map database role field to both role (backward compat) and systemPermission (new)
            const dbRole = userData.role || 'worker';
            const systemPermission: SystemPermission = dbRole === 'worker' ? 'member' : (dbRole as SystemPermission);
            
            const transformedUser: User = {
              ...userData,
              role: dbRole as UserRole, // Keep for backward compatibility
              systemPermission, // New field
              companyId: userData.company_id || userData.companyId,
              lastSelectedProjectId: userData.last_selected_project_id || null,
              isPending: userData.is_pending,
              approvedBy: userData.approved_by,
              approvedAt: userData.approved_at,
            };

            // Note: Don't clear selectedProjectId here - DashboardScreen will check database
            // and restore the correct value. This prevents race conditions.

            set({ 
              user: transformedUser, 
              isAuthenticated: true, 
              isLoading: false 
            });
            return true;
          }

          set({ isLoading: false });
          return false;
        } catch (error) {
          console.error('Login error:', error);
          set({ isLoading: false });
          return false;
        }
      },

      logout: () => {
        if (supabase) {
          supabase.auth.signOut();
        }
        set({ 
          user: null, 
          isAuthenticated: false, 
          isLoading: false 
        });
      },

      register: async (data) => {
        set({ isLoading: true });
        
        try {
          if (!supabase) {
            // Fallback to mock registration
            const userStore = useUserStore.getState();
            
            // Check if email already exists
            if (data.email) {
              const existingUser = userStore.getAllUsers().find(u => u.email === data.email);
              if (existingUser) {
                set({ isLoading: false });
                return { success: false, error: 'Email already exists' };
              }
            }

            // Check if phone already exists
            const existingPhoneUser = userStore.getAllUsers().find(u => u.phone === data.phone);
            if (existingPhoneUser) {
              set({ isLoading: false });
              return { success: false, error: 'Phone number already exists' };
            }

            // Create user
            const userId = await userStore.createUser({
              name: data.name,
              email: data.email,
              phone: data.phone,
              companyId: data.companyId,
              position: data.position,
              role: data.role || 'worker',
            });

            // Auto-login after registration
            const newUser = userStore.getUserById(userId);
            if (newUser) {
              set({ 
                user: newUser, 
                isAuthenticated: true, 
                isLoading: false 
              });
              return { success: true };
            }

            set({ isLoading: false });
            return { success: false, error: 'Failed to create user' };
          }

          // Use Supabase Auth for real registration
          const { data: authData, error: authError } = await supabase.auth.signUp({
            email: data.email || `${data.phone}@buildtrack.local`,
            password: data.password,
            options: {
              data: {
                name: data.name,
                phone: data.phone,
                company_id: data.companyId,
                position: data.position,
                role: data.role || 'worker',
                is_pending: data.isPending ?? false,
              }
            }
          });

          if (authError) {
            console.error('Registration error:', authError.message);
            set({ isLoading: false });
            return { success: false, error: authError.message };
          }

          if (authData.user) {
            // Create user record in our users table
            const { error: userError } = await supabase
              .from('users')
              .insert({
                id: authData.user.id,
                name: data.name,
                email: data.email || `${data.phone}@buildtrack.local`,
                phone: data.phone,
                company_id: data.companyId,
                position: data.position,
                role: data.role || 'worker',
                is_pending: data.isPending ?? false,
                approved_by: data.isPending ? null : authData.user.id, // Auto-approve if not pending
                approved_at: data.isPending ? null : new Date().toISOString(),
              });

            if (userError) {
              console.error('Error creating user record:', userError);
              set({ isLoading: false });
              return { success: false, error: 'Failed to create user profile' };
            }

            // Fetch the created user
            const { data: userData, error: fetchError } = await supabase
              .from('users')
              .select(`
                *,
                companies (
                  id,
                  name,
                  type
                )
              `)
              .eq('id', authData.user.id)
              .single();

            if (fetchError || !userData) {
              console.error('Error fetching created user:', fetchError);
              set({ isLoading: false });
              return { success: false, error: 'Failed to fetch user data' };
            }

            // Transform user data and map role to systemPermission
            const dbRole = userData.role || 'worker';
            const systemPermission: SystemPermission = dbRole === 'worker' ? 'member' : (dbRole as SystemPermission);
            
            const transformedUser: User = {
              ...userData,
              role: dbRole as UserRole, // Keep for backward compatibility
              systemPermission, // New field
              companyId: userData.company_id || userData.companyId,
              lastSelectedProjectId: userData.last_selected_project_id || null,
              isPending: userData.is_pending,
              approvedBy: userData.approved_by,
              approvedAt: userData.approved_at,
            };
            
            // Only auto-login if user is not pending approval
            if (!data.isPending) {
              set({ 
                user: transformedUser, 
                isAuthenticated: true, 
                isLoading: false 
              });
            } else {
              // Don't auto-login pending users
              set({ 
                user: null, 
                isAuthenticated: false, 
                isLoading: false 
              });
            }
            
            return { success: true };
          }

          set({ isLoading: false });
          return { success: false, error: 'Registration failed' };
        } catch (error: any) {
          console.error('Registration error:', error);
          set({ isLoading: false });
          return { success: false, error: error.message || 'Registration failed' };
        }
      },

      updateUser: async (updates) => {
        const currentUser = get().user;
        if (!currentUser) return;

        set({ isLoading: true });
        
        try {
          if (!supabase) {
            // Fallback to local update
            const userStore = useUserStore.getState();
            await userStore.updateUser(currentUser.id, updates);
            
            const updatedUser = userStore.getUserById(currentUser.id);
            if (updatedUser) {
              set({ user: updatedUser, isLoading: false });
            }
            return;
          }

          // Update in Supabase
          // Map systemPermission back to role for database (backward compatibility)
          const dbRole = updates.systemPermission 
            ? (updates.systemPermission === 'member' ? 'worker' : updates.systemPermission)
            : updates.role;
          
          const { error } = await supabase
            .from('users')
            .update({
              name: updates.name,
              email: updates.email,
              phone: updates.phone,
              company_id: updates.companyId,
              position: updates.position,
              role: dbRole || currentUser.role,
            })
            .eq('id', currentUser.id);

          if (error) {
            console.error('Error updating user:', error);
            set({ isLoading: false });
            throw error;
          }

          // Update local state
          // Ensure systemPermission is set if role is updated
          const updatedUser: User = { 
            ...currentUser, 
            ...updates,
            // If systemPermission is provided, use it; otherwise derive from role
            systemPermission: updates.systemPermission || (updates.role 
              ? (updates.role === 'worker' ? 'member' : updates.role as SystemPermission)
              : getUserSystemPermission(currentUser)
            ),
          };
          set({ user: updatedUser, isLoading: false });

          // Update user store cache
          const userStore = useUserStore.getState();
          await userStore.updateUser(currentUser.id, updates);
        } catch (error: any) {
          console.error('Error updating user:', error);
          set({ isLoading: false });
          throw error;
        }
      },

      changePassword: async (currentPassword: string, newPassword: string) => {
        const currentUser = get().user;
        if (!currentUser) {
          return { success: false, error: 'User not found' };
        }

        set({ isLoading: true });

        try {
          if (!supabase) {
            set({ isLoading: false });
            return { success: false, error: 'Supabase not configured' };
          }

          // Validate new password
          if (!newPassword || newPassword.length < 6) {
            set({ isLoading: false });
            return { success: false, error: 'New password must be at least 6 characters long' };
          }

          // Verify current password by attempting to sign in
          // Get user email for verification
          const userEmail = currentUser.email;
          if (!userEmail) {
            set({ isLoading: false });
            return { success: false, error: 'User email not found' };
          }

          // Verify current password
          const { error: verifyError } = await supabase.auth.signInWithPassword({
            email: userEmail,
            password: currentPassword,
          });

          if (verifyError) {
            set({ isLoading: false });
            return { success: false, error: 'Current password is incorrect' };
          }

          // Update password using Supabase Auth
          const { error: updateError } = await supabase.auth.updateUser({
            password: newPassword,
          });

          if (updateError) {
            set({ isLoading: false });
            return { success: false, error: updateError.message || 'Failed to update password' };
          }

          set({ isLoading: false });
          return { success: true };
        } catch (error: any) {
          console.error('Error changing password:', error);
          set({ isLoading: false });
          return { success: false, error: error.message || 'Failed to change password' };
        }
      },

      refreshUser: async () => {
        const currentUser = get().user;
        if (!currentUser || !supabase) return;

        try {
          const { data: userData, error } = await supabase
            .from('users')
            .select(`
              *,
              companies (
                id,
                name,
                type
              )
            `)
            .eq('id', currentUser.id)
            .single();

          if (error) {
            console.error('Error refreshing user:', error);
            return;
          }

          if (userData) {
            // Transform Supabase data to match local interface
            const dbRole = userData.role || 'worker';
            const systemPermission: SystemPermission = dbRole === 'worker' ? 'member' : (dbRole as SystemPermission);
            
            const transformedUser: User = {
              ...userData,
              role: dbRole as UserRole, // Keep for backward compatibility
              systemPermission, // New field
              companyId: userData.company_id || userData.companyId,
              lastSelectedProjectId: userData.last_selected_project_id || null,
              isPending: userData.is_pending,
              approvedBy: userData.approved_by,
              approvedAt: userData.approved_at,
            };
            set({ user: transformedUser });
          }
        } catch (error) {
          console.error('Error refreshing user:', error);
        }
      },

      initialize: async () => {
        set({ isLoading: true });
        
        try {
          if (!supabase) {
            // No Supabase, just set loading to false
            set({ isLoading: false });
            return;
          }

          // Check for existing session
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();

          if (sessionError) {
            console.error('Error getting session:', sessionError);
            set({ isLoading: false, isAuthenticated: false, user: null });
            return;
          }

          if (session?.user) {
            // Session exists, fetch user data using user ID (more reliable than email)
            const { data: userData, error: userError } = await supabase
              .from('users')
              .select(`
                *,
                companies (
                  id,
                  name,
                  type
                )
              `)
              .eq('id', session.user.id)
              .single();

            if (userError || !userData) {
              console.error('Error fetching user data on init:', userError);
              set({ isLoading: false, isAuthenticated: false, user: null });
              return;
            }

            // Transform Supabase data to match local interface
            const dbRole = userData.role || 'worker';
            const systemPermission: SystemPermission = dbRole === 'worker' ? 'member' : (dbRole as SystemPermission);
            
            const transformedUser: User = {
              ...userData,
              role: dbRole as UserRole, // Keep for backward compatibility
              systemPermission, // New field
              companyId: userData.company_id || userData.companyId,
              lastSelectedProjectId: userData.last_selected_project_id || null,
              isPending: userData.is_pending,
              approvedBy: userData.approved_by,
              approvedAt: userData.approved_at,
            };

            set({ 
              user: transformedUser, 
              isAuthenticated: true, 
              isLoading: false 
            });
          } else {
            // No session, user is not authenticated
            set({ isLoading: false, isAuthenticated: false, user: null });
          }
        } catch (error) {
          console.error('Error initializing auth:', error);
          set({ isLoading: false, isAuthenticated: false, user: null });
        }
      },
    }),
    {
      name: "buildtrack-auth",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        // Only persist user and auth state, not loading state
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

