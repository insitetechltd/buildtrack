import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../api/supabase";
import {
  AuthState,
  getUserSystemPermission,
  User,
  UserRole,
} from "../types/buildtrack";
import { useUserStore } from "./userStore.supabase";
import { clearWorkspaceSessionState } from "./clearWorkspaceSession";

export function readMustSetPassword(
  user: Record<string, unknown> | null | undefined,
): boolean {
  if (!user) {
    return false;
  }
  return user.mustSetPassword === true || user.must_set_password === true;
}

export function readMustSetPasswordFromAuthMetadata(
  metadata: Record<string, unknown> | null | undefined,
): boolean {
  if (!metadata) {
    return false;
  }
  return (
    metadata.mustSetPassword === true || metadata.must_set_password === true
  );
}

/**
 * Prefer the `users` row once loaded. Auth metadata is only a fallback when
 * the profile row is missing (invite edge). Never OR metadata over a false
 * row — that traps invitees on Set Password after every app restart when
 * JWT user_metadata still has must_set_password: true.
 */
export function resolveMustSetPassword(
  userRow: Record<string, unknown> | null | undefined,
  authMetadata?: Record<string, unknown> | null,
): boolean {
  if (userRow) {
    return readMustSetPassword(userRow);
  }
  return readMustSetPasswordFromAuthMetadata(authMetadata);
}

const SAME_PASSWORD_ERROR = /different from the old password|same as the old|should be different/i;

export function normalizeAuthUser<T extends Record<string, any>>(user: T) {
  const rawPermission =
    user.systemPermission ||
    user.system_permission ||
    null;
  const rawRole = user.role || "worker";
  // Live DB CHECK uses supervisor/company_admin; app UserRole uses manager/admin.
  const normalizedRole: UserRole =
    rawRole === "company_admin"
      ? "admin"
      : rawRole === "supervisor"
        ? "manager"
        : (rawRole as UserRole);
  const mustSetPassword = readMustSetPassword(user);

  const normalizedUser = {
    ...user,
    role: normalizedRole,
    mustSetPassword,
    must_set_password: mustSetPassword,
    ...(rawPermission
      ? {
          systemPermission:
            rawPermission === "company_admin" ? "admin" : rawPermission,
        }
      : {}),
  };

  return {
    ...normalizedUser,
    systemPermission: getUserSystemPermission(normalizedUser as unknown as User),
  };
}

function getPersistenceRole(
  systemPermission?: User["systemPermission"],
  fallbackRole: UserRole = "worker",
): UserRole {
  if (!systemPermission) {
    return fallbackRole;
  }

  if (systemPermission === "member") {
    return "worker";
  }

  // App "manager" persists as DB "supervisor" (users_role_allowed_values).
  if (systemPermission === "manager") {
    return "manager";
  }

  return systemPermission as UserRole;
}

/** Map app seat / SystemPermission into live `users.role` CHECK vocabulary. */
export function toDbUsersRole(
  roleOrPermission: string | null | undefined,
): string {
  const value = (roleOrPermission || "worker").toLowerCase();
  if (value === "admin" || value === "company_admin") {
    return "admin";
  }
  if (value === "manager" || value === "supervisor") {
    return "supervisor";
  }
  if (value === "member" || value === "worker") {
    return "worker";
  }
  if (value === "foreman") {
    return "foreman";
  }
  return "worker";
}

interface AuthStore extends AuthState {
  isInitialized: boolean;
  session: any | null;
  error: string | null;
  /** One-shot: navigate to Company Plan after create-company signup. */
  /** Persisted — new company founders must pick a paid plan before app access. */
  requiresCompanyPlanSelection: boolean;
  clearRequiresCompanyPlanSelection: () => void;
  /** One-shot after Stripe checkout success — land on Company management dashboard. */
  landOnCompanyManagementAfterCheckout: boolean;
  requestLandOnCompanyManagementAfterCheckout: () => void;
  clearLandOnCompanyManagementAfterCheckout: () => void;
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
    isPending?: boolean;
  }) => Promise<{ success: boolean; error?: string }>;
  updateUser: (updates: Partial<User>) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  deleteAccount: () => Promise<{ success: boolean; error?: string }>;
  createCompanyAccount: (data: {
    companyName: string;
    name: string;
    email: string;
    password: string;
  }) => Promise<{ success: boolean; error?: string; companyId?: string }>;
  signInWithInviteToken: (tokenHash: string) => Promise<{ success: boolean; error?: string }>;
  completeFirstLoginPassword: (newPassword: string) => Promise<{ success: boolean; error?: string }>;
  refreshUser: () => Promise<void>;
  // Test-compatible method names
  signUp: (email: string, password: string, fullName?: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  restoreSession: () => Promise<void>;
  refreshSession: () => Promise<void>;
  initialize: () => Promise<void>;
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
      requiresCompanyPlanSelection: false,
      landOnCompanyManagementAfterCheckout: false,

      clearRequiresCompanyPlanSelection: () => {
        set({ requiresCompanyPlanSelection: false });
      },

      requestLandOnCompanyManagementAfterCheckout: () => {
        set({ landOnCompanyManagementAfterCheckout: true });
      },

      clearLandOnCompanyManagementAfterCheckout: () => {
        set({ landOnCompanyManagementAfterCheckout: false });
      },

      login: async (username: string, password: string) => {
        const identifier = (username || "").trim();
        console.log('🔐 Login attempt:', identifier);
        set({ isLoading: true });
        
        try {
          // Always try Supabase Auth first if available
          if (supabase) {
            try {
              // Match create-company: emails are stored lowercased. Trailing
              // spaces from paste otherwise look like "wrong password".
              const phoneRegex = /^[\d\s\-\(\)\+]+$/;
              const isPhoneNumber = phoneRegex.test(identifier);
              let email = isPhoneNumber ? identifier : identifier.toLowerCase();
              
              // If it's a phone number, look up the email from the users table
              if (isPhoneNumber) {
                console.log('📱 Phone number login detected, looking up email...');
                // Requires a prior authenticated session to read public.users
                // (anon is blocked). Prefer email from the invite for first login.
                const { data: phoneUserData, error: phoneError } = await supabase
                  .from('users')
                  .select('email')
                  .eq('phone', identifier)
                  .single();
                
                if (phoneError || !phoneUserData || !phoneUserData.email) {
                  console.error('Phone number not found or has no email:', phoneError);
                  set({ isLoading: false });
                  throw new Error('PHONE_LOOKUP_FAILED');
                }
                
                email = String(phoneUserData.email).trim().toLowerCase();
                console.log('✅ Found email for phone number:', email);
              }
              
              const { data, error } = await supabase.auth.signInWithPassword({
                email: email,
                password: password,
              });

              if (error) {
                console.error('Login error:', error.message);
                set({ isLoading: false });
                const msg = (error.message || "").toLowerCase();
                if (msg.includes("email not confirmed")) {
                  throw new Error("EMAIL_NOT_CONFIRMED");
                }
                throw new Error("INVALID_CREDENTIALS");
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
                  await supabase.auth.signOut();
                  set({
                    user: null,
                    isAuthenticated: false,
                    isLoading: false,
                    isInitialized: true,
                  });
                  throw new Error("PROFILE_MISSING");
                }

                if (userData.is_pending) {
                  console.log('User login blocked: pending approval');
                  await supabase.auth.signOut();
                  set({
                    user: null,
                    isAuthenticated: false,
                    isLoading: false,
                    isInitialized: true,
                  });
                  throw new Error('PENDING_APPROVAL');
                }

                // Transform Supabase data to match local interface
                const transformedUser = normalizeAuthUser({
                  ...userData,
                  companyId: userData.company_id || userData.companyId, // Handle both field names
                  lastSelectedProjectId: userData.last_selected_project_id || null,
                });
                
                console.log('✅ Login successful:', transformedUser.name);
                console.log('Setting state: isAuthenticated=true, isLoading=false, isInitialized=true');

                const previousUserId = get().user?.id ?? null;
                if (previousUserId !== transformedUser.id) {
                  clearWorkspaceSessionState("login-user-switch");
                }
                
                set({ 
                  user: transformedUser, 
                  isAuthenticated: true, 
                  isLoading: false,
                  isInitialized: true  // Ensure initialized after login
                });
                
                // Warm projects/assignments first; defer heavy task/user fetch so
                // Hermes is not JSON-materializing ~150 tasks during the login
                // navigation transition (SIGABRT OOM under Maestro clearState).
                setTimeout(() => {
                  try {
                    const projectStore = require('./projectStore.supabase').useProjectStore.getState();
                    Promise.all([
                      projectStore.fetchProjects?.(true),
                      projectStore.fetchUserProjectAssignments?.(userData.id, true),
                    ]).catch((error) => {
                      console.error('Error initializing project data after login:', error);
                    });
                  } catch (error) {
                    console.error('Error triggering project refresh after login:', error);
                  }
                }, 100);

                setTimeout(() => {
                  try {
                    const taskStore = require('./taskStore.supabase').useTaskStore.getState();
                    const userStore = require('./userStore.supabase').useUserStore.getState();
                    Promise.all([
                      taskStore.fetchTasks?.(true),
                      userStore.fetchUsers?.(),
                    ]).catch((error) => {
                      console.error('Error initializing task/user data after login:', error);
                    });
                  } catch (error) {
                    console.error('Error triggering task/user refresh after login:', error);
                  }
                }, 1500);
                
                return true;
              }
            } catch (supabaseError) {
              if (
                supabaseError instanceof Error &&
                [
                  "PENDING_APPROVAL",
                  "INVALID_CREDENTIALS",
                  "EMAIL_NOT_CONFIRMED",
                  "PROFILE_MISSING",
                  "PHONE_LOOKUP_FAILED",
                ].includes(supabaseError.message)
              ) {
                set({ isLoading: false });
                throw supabaseError;
              }
              console.error('Supabase Auth failed:', supabaseError);
              set({ isLoading: false });
              return false;
            }
          }

          // Only show this error if Supabase is actually not available
          if (!supabase) {
            console.error('Authentication failed: Supabase not available');
            set({ isLoading: false });
            return false;
          }

          // If we reach here, Supabase exists but authentication failed for other reasons
          set({ isLoading: false });
          return false;
        } catch (error) {
          if (
            error instanceof Error &&
            [
              "PENDING_APPROVAL",
              "INVALID_CREDENTIALS",
              "EMAIL_NOT_CONFIRMED",
              "PROFILE_MISSING",
              "PHONE_LOOKUP_FAILED",
            ].includes(error.message)
          ) {
            set({ isLoading: false });
            throw error;
          }
          console.error('Login error:', error);
          set({ isLoading: false });
          return false;
        }
      },

      logout: () => {
        clearWorkspaceSessionState("logout");
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
                user: normalizeAuthUser(newUser), 
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
            const transformedUser = normalizeAuthUser({
              ...userData,
              companyId: userData.company_id || userData.companyId, // Handle both field names
            });
            
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

          const persistedRole =
            updates.role ??
            (updates.systemPermission
              ? getPersistenceRole(updates.systemPermission, currentUser.role)
              : undefined);
          const persistedUpdates = {
            ...updates,
            role: persistedRole,
          };

          // Update in Supabase
          const { error } = await supabase
            .from('users')
            .update({
              name: updates.name,
              email: updates.email,
              phone: updates.phone,
              company_id: updates.companyId,
              position: updates.position,
              role: persistedRole ? toDbUsersRole(persistedRole) : undefined,
            })
            .eq('id', currentUser.id);

          if (error) {
            console.error('Error updating user:', error);
            set({ isLoading: false });
            throw error;
          }

          // Update local state
          const updatedUser = normalizeAuthUser({ ...currentUser, ...persistedUpdates });
          set({ user: updatedUser, isLoading: false });

          // Update user store cache
          const userStore = useUserStore.getState();
          await userStore.updateUser(currentUser.id, persistedUpdates);
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

      deleteAccount: async () => {
        const currentUser = get().user;
        if (!currentUser) {
          return { success: false, error: "Not signed in" };
        }

        if (!supabase) {
          return { success: false, error: "Supabase not configured" };
        }

        set({ isLoading: true });

        try {
          const { error } = await supabase.rpc("delete_own_account");
          if (error) {
            set({ isLoading: false });
            const missingFn =
              error.code === "PGRST202" ||
              error.code === "42883" ||
              /delete_own_account/i.test(error.message || "");
            return {
              success: false,
              error: missingFn
                ? "Account deletion is not enabled on this server yet."
                : error.message || "Failed to delete account",
            };
          }

          try {
            await supabase.auth.signOut();
          } catch {
            // Auth user is already gone; still clear local session.
          }

          set({
            user: null,
            session: null,
            isAuthenticated: false,
            isLoading: false,
          });
          return { success: true };
        } catch (error: any) {
          set({ isLoading: false });
          return { success: false, error: error.message || "Failed to delete account" };
        }
      },

      createCompanyAccount: async (data) => {
        if (!supabase) {
          return { success: false, error: "Supabase not configured" };
        }

        const companyName = data.companyName.trim();
        const name = data.name.trim();
        const email = data.email.trim().toLowerCase();
        const password = data.password;

        if (!companyName || !name || !email || !password) {
          return { success: false, error: "All fields are required" };
        }

        if (password.length < 6) {
          return { success: false, error: "Password must be at least 6 characters" };
        }

        set({ isLoading: true, error: null });

        try {
          const { data: authData, error: authError } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: {
                name,
                system_permission: "admin",
                role: "admin",
                is_pending: false,
              },
            },
          });

          if (authError) {
            set({ isLoading: false, error: authError.message });
            return { success: false, error: authError.message };
          }

          if (!authData.user) {
            set({ isLoading: false });
            return { success: false, error: "Could not create account" };
          }

          if (!authData.session) {
            const { data: signInData, error: signInError } =
              await supabase.auth.signInWithPassword({ email, password });
            if (signInError || !signInData.session) {
              set({ isLoading: false });
              return {
                success: false,
                error:
                  signInError?.message ||
                  "Account created but sign-in failed. Confirm email if required, then sign in.",
              };
            }
          }

          // Profile row comes from handle_new_user trigger; brief retry if race.
          for (let attempt = 0; attempt < 5; attempt += 1) {
            const { data: profile } = await supabase
              .from("users")
              .select("id")
              .eq("id", authData.user.id)
              .maybeSingle();
            if (profile?.id) {
              break;
            }
            await new Promise((resolve) => setTimeout(resolve, 200));
          }

          const { data: companyId, error: rpcError } = await supabase.rpc(
            "create_company_for_self",
            {
              company_name: companyName,
              company_type: "general_contractor",
            },
          );

          if (rpcError) {
            // Sign-up may have left a session; do not leave the app in an
            // authenticated state without a company (Invite → "No company…").
            await supabase.auth.signOut().catch(() => undefined);
            set({
              user: null,
              session: null,
              isAuthenticated: false,
              isLoading: false,
              error: rpcError.message,
            });
            const missingFn =
              rpcError.code === "PGRST202" ||
              rpcError.code === "42883" ||
              /create_company_for_self/i.test(rpcError.message || "");
            return {
              success: false,
              error: missingFn
                ? "Company setup is not enabled on this server yet."
                : rpcError.message || "Failed to create company",
            };
          }

          const { data: userData, error: userError } = await supabase
            .from("users")
            .select("*")
            .eq("id", authData.user.id)
            .single();

          const resolvedCompanyId =
            (typeof companyId === "string" && companyId) ||
            userData?.company_id ||
            userData?.companyId ||
            "";

          if (userError || !userData || !resolvedCompanyId) {
            await supabase.auth.signOut().catch(() => undefined);
            set({
              user: null,
              session: null,
              isAuthenticated: false,
              isLoading: false,
            });
            return {
              success: false,
              error:
                userError?.message ||
                "Company was not linked to this account. Try Create company again, or sign in after support repairs the profile.",
            };
          }

          const session = (await supabase.auth.getSession()).data.session;
          const transformedUser = normalizeAuthUser({
            ...userData,
            companyId: resolvedCompanyId,
            lastSelectedProjectId: userData.last_selected_project_id || null,
          });

          set({
            user: transformedUser as any,
            session,
            isAuthenticated: true,
            isLoading: false,
            isInitialized: true,
            error: null,
            requiresCompanyPlanSelection: true,
          });

          return {
            success: true,
            companyId: String(resolvedCompanyId),
          };
        } catch (error: any) {
          await supabase?.auth.signOut().catch(() => undefined);
          set({
            user: null,
            session: null,
            isAuthenticated: false,
            isLoading: false,
            error: error?.message || "Failed to create company",
          });
          return {
            success: false,
            error: error?.message || "Failed to create company",
          };
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
            const transformedUser = normalizeAuthUser({
              ...userData,
              companyId: userData.company_id || userData.companyId, // Handle both field names
            });
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
              user: normalizeAuthUser({ 
                id: data.user.id, 
                email: data.user.email,
                name: fullName || data.user.email?.split('@')[0] || 'User',
              }) as any,
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
            // Fetch user details from users table using user ID (more reliable than email)
            const { data: userData } = await supabase
              .from('users')
              .select('*')
              .eq('id', data.user.id)
              .single();

            const transformedUser = userData ? normalizeAuthUser({
              ...userData,
              companyId: userData.company_id || userData.companyId,
            }) : normalizeAuthUser({
              id: data.user.id,
              email: data.user.email,
              name: data.user.email?.split('@')[0] || 'User',
            });

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
          clearWorkspaceSessionState("signOut");
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
          clearWorkspaceSessionState("signOut-error");
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
            
            // If refresh token is invalid, clear auth state
            if (error.message?.includes('Invalid Refresh Token') || 
                error.message?.includes('Refresh Token Not Found')) {
              console.log('🔴 Invalid refresh token during restore - clearing auth state');
            }
            
            set({ user: null, session: null, isAuthenticated: false, isInitialized: true });
            return;
          }

          if (session) {
            // Check if session is expired
            if (session.expires_at && session.expires_at < Date.now() / 1000) {
              console.log('Session expired');
              set({ user: null, session: null, isAuthenticated: false, isInitialized: true });
              return;
            }

            // Get user data
            const { data: { user } } = await supabase.auth.getUser();
            
            if (user) {
              const { data: userData } = await supabase
                .from('users')
                .select('*')
                .eq('id', user.id)
                .single();

              const transformedUser = userData ? normalizeAuthUser({
                ...userData,
                companyId: userData.company_id || userData.companyId,
              }) : normalizeAuthUser({
                id: user.id,
                email: user.email,
                name: user.email?.split('@')[0] || 'User',
              });

              set({ 
                user: transformedUser as any,
                session,
                isAuthenticated: true,
                isInitialized: true
              });
            }
          } else {
            set({ user: null, session: null, isAuthenticated: false, isInitialized: true });
          }
        } catch (error: any) {
          const isExpectedAuthLoss =
            error?.message?.includes('Invalid Refresh Token') ||
            error?.message?.includes('Refresh Token Not Found') ||
            error?.message?.includes('Auth session missing') ||
            error?.name === 'AuthSessionMissingError';

          if (isExpectedAuthLoss) {
            console.log('🔴 Session not present or token expired - clearing auth state');
          } else {
            console.error('Error restoring session:', error);
          }
          
          set({ user: null, session: null, isAuthenticated: false, isInitialized: true });
        }
      },

      refreshSession: async () => {
        try {
          if (!supabase) return;

          const { data, error } = await supabase.auth.refreshSession();

          if (error) {
            // Missing session is an expected non-authenticated/idle state
            if (error.message?.includes('Auth session missing') || error.name === 'AuthSessionMissingError') {
              return;
            }

            // If refresh token is invalid/expired, log user out
            if (error.message?.includes('Invalid Refresh Token') || 
                error.message?.includes('Refresh Token Not Found')) {
              console.log('🔴 Invalid refresh token detected - logging out user');
              get().logout();
              return;
            }

            console.error('Session refresh error:', error);
            return;
          }

          if (data.session) {
            set({ session: data.session });
          }
        } catch (error: any) {
          if (error?.message?.includes('Auth session missing') || error?.name === 'AuthSessionMissingError') {
            return;
          }

          // If it's an auth error, log user out
          if (error?.message?.includes('Invalid Refresh Token') || 
              error?.message?.includes('Refresh Token Not Found')) {
            console.log('🔴 Invalid refresh token detected - logging out user');
            get().logout();
            return;
          }

          console.error('Error refreshing session:', error);
        }
      },

      signInWithInviteToken: async (tokenHash) => {
        if (!supabase) {
          return { success: false, error: "Supabase not configured" };
        }

        set({ isLoading: true, error: null });

        try {
          const { error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: "magiclink",
          });

          if (error) {
            set({ isLoading: false, error: error.message });
            return { success: false, error: error.message };
          }

          await get().initialize();
          if (!get().isAuthenticated) {
            return { success: false, error: "Invite signed in but profile could not load" };
          }
          const signedInId = get().user?.id;
          if (signedInId) {
            try {
              await supabase
                .from("users")
                .update({ invite_sign_in_link: null })
                .eq("id", signedInId);
            } catch {
              // Column may not exist until invite-link migration is applied.
            }
          }
          return { success: true };
        } catch (error: any) {
          const message = error?.message || "Invite sign-in failed";
          set({ isLoading: false, error: message });
          return { success: false, error: message };
        }
      },

      completeFirstLoginPassword: async (newPassword) => {
        const currentUser = get().user;
        if (!currentUser) {
          return { success: false, error: "Not signed in" };
        }
        if (!supabase) {
          return { success: false, error: "Supabase not configured" };
        }

        const trimmed = (newPassword || "").trim();
        if (trimmed.length < 6) {
          return { success: false, error: "New password must be at least 6 characters long" };
        }

        set({ isLoading: true, error: null });

        try {
          const { error: updateError } = await supabase.auth.updateUser({
            password: trimmed,
            data: { must_set_password: false, mustSetPassword: false },
          });

          const authAlreadyMatches =
            Boolean(updateError) && SAME_PASSWORD_ERROR.test(updateError?.message || "");
          if (updateError && !authAlreadyMatches) {
            set({ isLoading: false, error: updateError.message });
            return { success: false, error: updateError.message };
          }

          try {
            const { error: profileError } = await supabase
              .from("users")
              .update({ must_set_password: false })
              .eq("id", currentUser.id);
            if (profileError) {
              console.warn(
                "⚠️ [completeFirstLoginPassword] users.must_set_password clear failed:",
                profileError.message,
              );
            }
          } catch (profileException) {
            console.warn(
              "⚠️ [completeFirstLoginPassword] users.must_set_password clear exception:",
              profileException,
            );
          }

          // Refresh so session.user_metadata matches the cleared flag on next cold start.
          try {
            await supabase.auth.refreshSession();
          } catch {
            // Non-fatal — users row is SoT on initialize().
          }

          const updatedUser = normalizeAuthUser({
            ...currentUser,
            mustSetPassword: false,
            must_set_password: false,
          });
          set({ user: updatedUser, isLoading: false, error: null });
          return { success: true };
        } catch (error: any) {
          const message = error?.message || "Failed to set password";
          set({ isLoading: false, error: message });
          return { success: false, error: message };
        }
      },

      initialize: async () => {
        set({ isLoading: true });
        
        try {
          if (!supabase) {
            // No Supabase, just set loading to false
            set({ isLoading: false, isInitialized: true });
            return;
          }

          // Check for existing session
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();

          if (sessionError) {
            // Handle refresh token errors gracefully
            if (sessionError.message?.includes('Invalid Refresh Token') || 
                sessionError.message?.includes('Refresh Token Not Found')) {
              console.log('🔴 Invalid refresh token during init - clearing session');
              // Clear auth storage
              try {
                await supabase.auth.signOut();
              } catch (signOutError) {
                // Ignore sign out errors if already signed out
              }
            } else {
              console.error('Error getting session during init:', sessionError);
            }
            set({ isLoading: false, isAuthenticated: false, user: null, session: null, isInitialized: true });
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
              set({ isLoading: false, isAuthenticated: false, user: null, session: null, isInitialized: true });
              return;
            }

            // Transform Supabase data to match local interface
            const mustSetPassword = resolveMustSetPassword(
              userData,
              session.user.user_metadata,
            );
            const transformedUser = normalizeAuthUser({
              ...userData,
              companyId: userData.company_id || userData.companyId,
              lastSelectedProjectId: userData.last_selected_project_id || null,
              must_set_password: mustSetPassword,
              mustSetPassword,
            });

            set({ 
              user: transformedUser, 
              isAuthenticated: true, 
              isLoading: false,
              session,
              isInitialized: true
            });
          } else {
            // No session, user is not authenticated
            set({ isLoading: false, isAuthenticated: false, user: null, session: null, isInitialized: true });
          }
        } catch (error) {
          console.error('Error initializing auth:', error);
          set({ isLoading: false, isAuthenticated: false, user: null, session: null, isInitialized: true });
        }
      },
    }),
    {
      name: "buildtrack-auth",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        requiresCompanyPlanSelection: state.requiresCompanyPlanSelection,
      }),
      onRehydrateStorage: () => (state) => {
        console.log('🔄 AuthStore rehydration callback fired');
        if (state) {
          // Do not set isInitialized here — AppNavigator would otherwise
          // mount MainTabs from a persisted user before initialize() loads
          // must_set_password from the server.
          console.log('✅ AuthStore rehydration:', { 
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
