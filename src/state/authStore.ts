import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../api/supabase";
import { AuthState, User, UserRole } from "../types/buildtrack";
import { useUserStore } from "./userStore.supabase";

interface AuthStore extends AuthState {
  isInitialized: boolean;
  session: any | null;
  error: string | null;
  // Existing methods
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
  // Test-compatible method names
  signUp: (email: string, password: string, fullName?: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  restoreSession: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      session: null,
      isAuthenticated: false,
      isLoading: false,
      isInitialized: false,
      error: null,

      login: async (username: string, password: string) => {
        console.log('🔐 Login attempt:', username);
        set({ isLoading: true });
        
        try {
          // Always try Supabase Auth first if available
          if (supabase) {
            try {
              const { data, error } = await supabase.auth.signInWithPassword({
                email: username,
                password: password,
              });

              if (!error && data.user) {
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

                if (!userError && userData) {
                  // Transform Supabase data to match local interface
                  const transformedUser = {
                    ...userData,
                    companyId: userData.company_id || userData.companyId, // Handle both field names
                  };
                  
                  console.log('✅ Login successful:', transformedUser.name);
                  console.log('Setting state: isAuthenticated=true, isLoading=false, isInitialized=true');
                  
                  set({ 
                    user: transformedUser, 
                    isAuthenticated: true, 
                    isLoading: false,
                    isInitialized: true  // Ensure initialized after login
                  });
                  
                  // Trigger data refresh after successful login
                  setTimeout(() => {
                    try {
                      const projectStore = require('./projectStore').useProjectStore.getState();
                      const taskStore = require('./taskStore').useTaskStore.getState();
                      const userStore = require('./userStore').useUserStore.getState();
                      
                      // Initialize user-specific data
                      Promise.all([
                        projectStore._initializeUserData?.(userData.id),
                        taskStore._initializeUserData?.(userData.id),
                        userStore.fetchUsers?.()
                      ]).catch(error => {
                        console.error('Error initializing user data after login:', error);
                      });
                    } catch (error) {
                      console.error('Error triggering data refresh after login:', error);
                    }
                  }, 100);
                  
                  return true;
                }
              }
            } catch (supabaseError) {
              console.error('Supabase Auth failed:', supabaseError);
            }
          }

          // Supabase authentication failed
          console.error('Authentication failed: Supabase not available');
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

            // Transform Supabase data to match local interface
            const transformedUser = {
              ...userData,
              companyId: userData.company_id || userData.companyId, // Handle both field names
            };
            
            set({ 
              user: transformedUser, 
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
              companyId: userData.company_id || userData.companyId, // Handle both field names
            };
            set({ user: transformedUser });
          }
        } catch (error) {
          console.error('Error refreshing user:', error);
        }
      },

      // Test-compatible method implementations
      signUp: async (email: string, password: string, fullName?: string) => {
        set({ isLoading: true, error: null });
        
        try {
          if (!supabase) {
            throw new Error('Supabase not configured');
          }

          const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: {
                full_name: fullName || '',
              }
            }
          });

          if (error) {
            set({ isLoading: false, error: error.message });
            throw error;
          }

          if (data.user && data.session) {
            set({ 
              user: { 
                id: data.user.id, 
                email: data.user.email,
                name: fullName || data.user.email?.split('@')[0] || 'User'
              } as any,
              session: data.session,
              isAuthenticated: true,
              isLoading: false,
              error: null
            });
          }
        } catch (error: any) {
          set({ isLoading: false, error: error.message });
          throw error;
        }
      },

      signIn: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        
        try {
          if (!supabase) {
            throw new Error('Supabase not configured');
          }

          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (error) {
            set({ isLoading: false, error: error.message });
            throw error;
          }

          if (data.user && data.session) {
            // Fetch user details from users table
            const { data: userData } = await supabase
              .from('users')
              .select('*')
              .eq('email', data.user.email)
              .single();

            const transformedUser = userData ? {
              ...userData,
              companyId: userData.company_id || userData.companyId,
            } : {
              id: data.user.id,
              email: data.user.email,
              name: data.user.email?.split('@')[0] || 'User'
            };

            set({ 
              user: transformedUser as any,
              session: data.session,
              isAuthenticated: true,
              isLoading: false,
              isInitialized: true,
              error: null
            });
          }
        } catch (error: any) {
          set({ isLoading: false, error: error.message });
          throw error;
        }
      },

      signOut: async () => {
        try {
          if (supabase) {
            await supabase.auth.signOut();
          }
          set({ 
            user: null,
            session: null,
            isAuthenticated: false,
            isLoading: false,
            error: null
          });
        } catch (error: any) {
          console.error('Logout error:', error);
          // Clear state anyway
          set({ 
            user: null,
            session: null,
            isAuthenticated: false,
            isLoading: false,
            error: null
          });
        }
      },

      restoreSession: async () => {
        try {
          if (!supabase) return;

          const { data: { session }, error } = await supabase.auth.getSession();

          if (error) {
            console.error('Session restore error:', error);
            set({ user: null, session: null, isAuthenticated: false });
            return;
          }

          if (session) {
            // Check if session is expired
            if (session.expires_at && session.expires_at < Date.now() / 1000) {
              console.log('Session expired');
              set({ user: null, session: null, isAuthenticated: false });
              return;
            }

            // Get user data
            const { data: { user } } = await supabase.auth.getUser();
            
            if (user) {
              const { data: userData } = await supabase
                .from('users')
                .select('*')
                .eq('email', user.email)
                .single();

              const transformedUser = userData ? {
                ...userData,
                companyId: userData.company_id || userData.companyId,
              } : {
                id: user.id,
                email: user.email,
                name: user.email?.split('@')[0] || 'User'
              };

              set({ 
                user: transformedUser as any,
                session,
                isAuthenticated: true,
                isInitialized: true
              });
            }
          } else {
            set({ user: null, session: null, isAuthenticated: false });
          }
        } catch (error) {
          console.error('Error restoring session:', error);
          set({ user: null, session: null, isAuthenticated: false });
        }
      },

      refreshSession: async () => {
        try {
          if (!supabase) return;

          const { data, error } = await supabase.auth.refreshSession();

          if (error) {
            console.error('Session refresh error:', error);
            return;
          }

          if (data.session) {
            set({ session: data.session });
          }
        } catch (error) {
          console.error('Error refreshing session:', error);
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
      onRehydrateStorage: () => (state) => {
        console.log('🔄 AuthStore rehydration callback fired');
        if (state) {
          state.isInitialized = true;
          console.log('✅ AuthStore initialized:', { 
            isAuthenticated: state.isAuthenticated, 
            hasUser: !!state.user,
            userName: state.user?.name 
          });
        } else {
          console.log('⚠️ AuthStore rehydration - no state found');
        }
      },
    }
  )
);
