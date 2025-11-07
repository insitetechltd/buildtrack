import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../api/supabase";
import { AuthState, User, UserRole } from "../types/buildtrack";
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
  }) => Promise<{ success: boolean; error?: string }>;
  updateUser: (updates: Partial<User>) => Promise<void>;
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

          // Use Supabase Auth for real authentication
          const { data, error } = await supabase.auth.signInWithPassword({
            email: username, // Assuming username is email for Supabase
            password: password,
          });

          if (error) {
            console.error('Login error:', error.message);
            set({ isLoading: false });
            return false;
          }

          if (data.user) {
            // Fetch user details from our users table
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
              .eq('email', data.user.email)
              .single();

            if (userError || !userData) {
              console.error('Error fetching user data:', userError);
              set({ isLoading: false });
              return false;
            }

            // Transform Supabase data to match local interface
            const transformedUser = {
              ...userData,
              companyId: userData.company_id || userData.companyId,
              lastSelectedProjectId: userData.last_selected_project_id || null,
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

            set({ 
              user: userData, 
              isAuthenticated: true, 
              isLoading: false 
            });
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
          const { error } = await supabase
            .from('users')
            .update({
              name: updates.name,
              email: updates.email,
              phone: updates.phone,
              company_id: updates.companyId,
              position: updates.position,
              role: updates.role,
            })
            .eq('id', currentUser.id);

          if (error) {
            console.error('Error updating user:', error);
            set({ isLoading: false });
            throw error;
          }

          // Update local state
          const updatedUser = { ...currentUser, ...updates };
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
            const transformedUser = {
              ...userData,
              companyId: userData.company_id || userData.companyId,
              lastSelectedProjectId: userData.last_selected_project_id || null,
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
            // Session exists, fetch user data
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
              .eq('email', session.user.email)
              .single();

            if (userError || !userData) {
              console.error('Error fetching user data on init:', userError);
              set({ isLoading: false, isAuthenticated: false, user: null });
              return;
            }

            // Transform Supabase data to match local interface
            const transformedUser = {
              ...userData,
              companyId: userData.company_id || userData.companyId,
              lastSelectedProjectId: userData.last_selected_project_id || null,
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

