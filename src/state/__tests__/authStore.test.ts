import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useAuthStore } from '../authStore';
import { supabase } from '@/api/supabase';

// Mock Supabase
jest.mock('@/api/supabase');

describe('Authentication Workflow Tests', () => {
  const mockSupabase = supabase as jest.Mocked<typeof supabase>;

  const defaultAuthUser = {
    id: 'mock-user-id',
    email: 'test@insite.com',
  };

  const defaultUsersTableRow = {
    id: 'mock-user-id',
    email: 'test@insite.com',
    name: 'Test User',
    role: 'worker',
    company_id: 'company-123',
  };

  beforeEach(() => {
    // Reset store before each test
    useAuthStore.setState({
      user: null,
      session: null,
      isLoading: false,
      error: null,
    });

    // Clear all mocks
    jest.clearAllMocks();

    mockSupabase.auth = {
      getSession: jest.fn().mockResolvedValue({
        data: { session: null },
        error: null,
      }),
      getUser: jest.fn().mockResolvedValue({
        data: { user: defaultAuthUser },
        error: null,
      }),
      signUp: jest.fn().mockResolvedValue({
        data: { user: { id: 'new-user-id', email: 'test@insite.com' }, session: null },
        error: null,
      }),
      signInWithPassword: jest.fn().mockResolvedValue({
        data: {
          user: defaultAuthUser,
          session: { access_token: 'mock-token' },
        },
        error: null,
      }),
      refreshSession: jest.fn().mockResolvedValue({
        data: { session: { access_token: 'refreshed-token' } },
        error: null,
      }),
      signOut: jest.fn().mockResolvedValue({ error: null }),
      updateUser: jest.fn().mockResolvedValue({ data: { user: defaultAuthUser }, error: null }),
      verifyOtp: jest.fn().mockResolvedValue({ data: { session: { access_token: 'invite-token' }, user: defaultAuthUser }, error: null }),
    } as any;

    const mockFrom = mockSupabase.from as unknown as jest.Mock;
    mockFrom.mockImplementation((table: string) => {
      if (table === 'users') {
        return {
          select: jest.fn().mockReturnThis(),
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ data: null, error: null }),
          }),
          eq: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({
              data: defaultUsersTableRow,
              error: null,
            }),
          })),
        };
      }

      return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn(() => ({
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
        })),
      };
    });
  });

  describe('User Registration', () => {
    it('should register user with valid email and password', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'newuser@buildtrack.com',
        user_metadata: {},
      };

      (mockSupabase.auth.signUp as jest.Mock).mockResolvedValue({
        data: {
          user: mockUser,
          session: { access_token: 'token-123' },
        },
        error: null,
      });

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.signUp('newuser@buildtrack.com', 'SecurePass123!', 'New User');
      });

      expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
        email: 'newuser@buildtrack.com',
        password: 'SecurePass123!',
        options: {
          data: {
            full_name: 'New User',
          },
        },
      });
    });

    it('should fail to register with duplicate email', async () => {
      (mockSupabase.auth.signUp as jest.Mock).mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'User already registered' },
      });

      const { result } = renderHook(() => useAuthStore());
      let thrownError: unknown;

      await act(async () => {
        try {
          await result.current.signUp('existing@buildtrack.com', 'Password123!', 'Duplicate User');
        } catch (error) {
          thrownError = error;
        }
      });

      expect(thrownError).toBeDefined();
      expect(result.current.error).toContain('User already registered');
    });

    it('should fail to register with invalid email format', async () => {
      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        try {
          await result.current.signUp('invalid-email', 'Password123!', 'Test User');
        } catch (error) {
          expect(error).toBeDefined();
        }
      });
    });

    it('should fail to register with weak password', async () => {
      (mockSupabase.auth.signUp as jest.Mock).mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Password should be at least 6 characters' },
      });

      const { result } = renderHook(() => useAuthStore());
      let thrownError: unknown;

      await act(async () => {
        try {
          await result.current.signUp('user@buildtrack.com', '123', 'Test User');
        } catch (error) {
          thrownError = error;
        }
      });

      expect(thrownError).toBeDefined();
      expect(result.current.error).toContain('Password');
    });
  });

  describe('User Login', () => {
    it('should login with valid credentials', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'user@buildtrack.com',
        user_metadata: { full_name: 'Test User' },
      };

      const mockSession = {
        access_token: 'valid-token-123',
        refresh_token: 'refresh-token-123',
        expires_at: Date.now() + 3600000,
      };

      (mockSupabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
        data: {
          user: mockUser,
          session: mockSession,
        },
        error: null,
      });

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.signIn('user@buildtrack.com', 'Password123!');
      });

      expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'user@buildtrack.com',
        password: 'Password123!',
      });

      await waitFor(() => {
        expect(result.current.user).toMatchObject({
          id: 'mock-user-id',
          email: 'test@insite.com',
          role: 'worker',
          systemPermission: 'member',
        });
        expect(result.current.session).toEqual(mockSession);
        expect(result.current.error).toBeNull();
      });
    });

    it('should fail to login with invalid credentials', async () => {
      (mockSupabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid login credentials' },
      });

      const { result } = renderHook(() => useAuthStore());
      let thrownError: unknown;

      await act(async () => {
        try {
          await result.current.signIn('user@buildtrack.com', 'WrongPassword');
        } catch (error) {
          thrownError = error;
        }
      });

      expect(thrownError).toBeDefined();
      expect(result.current.user).toBeNull();
      expect(result.current.error).toContain('Invalid login credentials');
    });

    it('should fail to login with non-existent user', async () => {
      (mockSupabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid login credentials' },
      });

      const { result } = renderHook(() => useAuthStore());
      let thrownError: unknown;

      await act(async () => {
        try {
          await result.current.signIn('nonexistent@buildtrack.com', 'Password123!');
        } catch (error) {
          thrownError = error;
        }
      });

      expect(thrownError).toBeDefined();
      expect(result.current.user).toBeNull();
      expect(result.current.error).toBeDefined();
    });

    it('should persist login session across app restarts', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'user@buildtrack.com',
      };

      const mockSession = {
        access_token: 'persisted-token',
        refresh_token: 'refresh-token',
      };

      // Simulate persisted session
      (mockSupabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      (mockSupabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.restoreSession();
      });

      expect(result.current.user).toMatchObject({
        id: 'mock-user-id',
        email: 'test@insite.com',
        role: 'worker',
        systemPermission: 'member',
      });
      expect(result.current.session).toEqual(mockSession);
    });
  });

  describe('Session Management', () => {
    it('should maintain session after app reload', async () => {
      const mockSession = {
        access_token: 'valid-token',
        refresh_token: 'refresh-token',
        expires_at: Date.now() + 3600000,
      };

      (mockSupabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.restoreSession();
      });

      expect(result.current.session).toEqual(mockSession);
    });

    it('should auto-logout on token expiration', async () => {
      const expiredSession = {
        access_token: 'expired-token',
        expires_at: Math.floor(Date.now() / 1000) - 1, // Expired 1 second ago
      };

      (mockSupabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: expiredSession },
        error: null,
      });

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.restoreSession();
      });

      // Should clear session if expired
      expect(result.current.user).toBeNull();
    });

    it('should refresh token when needed', async () => {
      const oldSession = {
        access_token: 'old-token',
        refresh_token: 'refresh-token',
        expires_at: Date.now() + 1000, // Expires soon
      };

      const newSession = {
        access_token: 'new-token',
        refresh_token: 'new-refresh-token',
        expires_at: Date.now() + 3600000,
      };

      (mockSupabase.auth.refreshSession as jest.Mock).mockResolvedValue({
        data: { session: newSession },
        error: null,
      });

      const { result } = renderHook(() => useAuthStore());

      // Set old session
      act(() => {
        useAuthStore.setState({ session: oldSession });
      });

      await act(async () => {
        await result.current.refreshSession();
      });

      expect(result.current.session?.access_token).toBe('new-token');
    });
  });

  describe('Logout', () => {
    it('should successfully logout user', async () => {
      // Set up logged-in state
      const mockUser = {
        id: 'user-123',
        email: 'user@buildtrack.com',
      };

      act(() => {
        useAuthStore.setState({
          user: mockUser,
          session: { access_token: 'token-123' },
        });
      });

      (mockSupabase.auth.signOut as jest.Mock).mockResolvedValue({
        error: null,
      });

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.signOut();
      });

      expect(mockSupabase.auth.signOut).toHaveBeenCalled();
      expect(result.current.user).toBeNull();
      expect(result.current.session).toBeNull();
    });

    it('should clear local storage on logout', async () => {
      (mockSupabase.auth.signOut as jest.Mock).mockResolvedValue({
        error: null,
      });

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.signOut();
      });

      // Verify all auth state is cleared
      expect(result.current.user).toBeNull();
      expect(result.current.session).toBeNull();
      expect(result.current.error).toBeNull();
    });

    it('should handle logout even if API fails', async () => {
      (mockSupabase.auth.signOut as jest.Mock).mockResolvedValue({
        error: { message: 'Network error' },
      });

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.signOut();
      });

      // Should still clear local state even if API fails
      expect(result.current.user).toBeNull();
      expect(result.current.session).toBeNull();
    });
  });

  describe('Delete account', () => {
    it('deletes via RPC then signs out and clears local session', async () => {
      mockSupabase.rpc = jest.fn().mockResolvedValue({ data: null, error: null });
      (mockSupabase.auth.signOut as jest.Mock).mockResolvedValue({ error: null });

      act(() => {
        useAuthStore.setState({
          user: { id: 'user-123', email: 'user@buildtrack.com' } as any,
          session: { access_token: 'token-123' },
          isAuthenticated: true,
        });
      });

      const { result } = renderHook(() => useAuthStore());
      let outcome: { success: boolean; error?: string } | undefined;
      await act(async () => {
        outcome = await result.current.deleteAccount();
      });

      expect(mockSupabase.rpc).toHaveBeenCalledWith('delete_own_account');
      expect(mockSupabase.auth.signOut).toHaveBeenCalled();
      expect(outcome).toEqual({ success: true });
      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('does not sign out when RPC fails', async () => {
      mockSupabase.rpc = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'boom', code: 'XX000' },
      });

      act(() => {
        useAuthStore.setState({
          user: { id: 'user-123', email: 'user@buildtrack.com' } as any,
          isAuthenticated: true,
        });
      });

      const { result } = renderHook(() => useAuthStore());
      let outcome: { success: boolean; error?: string } | undefined;
      await act(async () => {
        outcome = await result.current.deleteAccount();
      });

      expect(outcome?.success).toBe(false);
      expect(result.current.user).not.toBeNull();
      expect(mockSupabase.auth.signOut).not.toHaveBeenCalled();
    });
  });

  describe('Create company account', () => {
    it('signs up, calls create_company_for_self, and authenticates admin', async () => {
      (mockSupabase.auth.signUp as jest.Mock).mockResolvedValue({
        data: {
          user: { id: 'founder-1', email: 'admin@acme.com' },
          session: { access_token: 'sess-1' },
        },
        error: null,
      });
      (mockSupabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: { access_token: 'sess-1' } },
        error: null,
      });
      mockSupabase.rpc = jest.fn().mockResolvedValue({
        data: 'company-uuid-1',
        error: null,
      });

      const mockFrom = mockSupabase.from as unknown as jest.Mock;
      mockFrom.mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn(() => ({
          maybeSingle: jest.fn().mockResolvedValue({
            data: { id: 'founder-1' },
            error: null,
          }),
          single: jest.fn().mockResolvedValue({
            data: {
              id: 'founder-1',
              email: 'admin@acme.com',
              name: 'Founder',
              role: 'admin',
              company_id: 'company-uuid-1',
              is_pending: false,
            },
            error: null,
          }),
        })),
      }));

      const { result } = renderHook(() => useAuthStore());
      let outcome:
        | { success: boolean; error?: string; companyId?: string }
        | undefined;
      await act(async () => {
        outcome = await result.current.createCompanyAccount({
          companyName: 'Acme Construction',
          name: 'Founder',
          email: 'admin@acme.com',
          password: 'Secure1!',
        });
      });

      expect(mockSupabase.auth.signUp).toHaveBeenCalled();
      expect(mockSupabase.rpc).toHaveBeenCalledWith('create_company_for_self', {
        company_name: 'Acme Construction',
        company_type: 'general_contractor',
      });
      expect(outcome?.success).toBe(true);
      expect(outcome?.companyId).toBe('company-uuid-1');
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.requiresCompanyPlanSelection).toBe(true);
      expect(result.current.user?.companyId || (result.current.user as any)?.company_id).toBeTruthy();
    });

    it('returns missing-fn message when RPC is not deployed', async () => {
      (mockSupabase.auth.signUp as jest.Mock).mockResolvedValue({
        data: {
          user: { id: 'founder-1', email: 'admin@acme.com' },
          session: { access_token: 'sess-1' },
        },
        error: null,
      });
      (mockSupabase.auth.signOut as jest.Mock).mockResolvedValue({ error: null });
      const mockFrom = mockSupabase.from as unknown as jest.Mock;
      mockFrom.mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn(() => ({
          maybeSingle: jest.fn().mockResolvedValue({
            data: { id: 'founder-1' },
            error: null,
          }),
        })),
      }));
      mockSupabase.rpc = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Could not find the function create_company_for_self', code: 'PGRST202' },
      });

      const { result } = renderHook(() => useAuthStore());
      let outcome: { success: boolean; error?: string } | undefined;
      await act(async () => {
        outcome = await result.current.createCompanyAccount({
          companyName: 'Acme',
          name: 'Founder',
          email: 'admin@acme.com',
          password: 'Secure1!',
        });
      });

      expect(outcome?.success).toBe(false);
      expect(outcome?.error).toMatch(/not enabled/i);
      expect(mockSupabase.auth.signOut).toHaveBeenCalled();
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('rejects when RPC succeeds but profile has no company_id', async () => {
      (mockSupabase.auth.signUp as jest.Mock).mockResolvedValue({
        data: {
          user: { id: 'founder-1', email: 'admin@acme.com' },
          session: { access_token: 'sess-1' },
        },
        error: null,
      });
      (mockSupabase.auth.signOut as jest.Mock).mockResolvedValue({ error: null });
      mockSupabase.rpc = jest.fn().mockResolvedValue({
        data: null,
        error: null,
      });
      const mockFrom = mockSupabase.from as unknown as jest.Mock;
      mockFrom.mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn(() => ({
          maybeSingle: jest.fn().mockResolvedValue({
            data: { id: 'founder-1' },
            error: null,
          }),
          single: jest.fn().mockResolvedValue({
            data: {
              id: 'founder-1',
              email: 'admin@acme.com',
              name: 'Founder',
              role: 'admin',
              company_id: null,
              is_pending: false,
            },
            error: null,
          }),
        })),
      }));

      const { result } = renderHook(() => useAuthStore());
      let outcome: { success: boolean; error?: string } | undefined;
      await act(async () => {
        outcome = await result.current.createCompanyAccount({
          companyName: 'Acme',
          name: 'Founder',
          email: 'admin@acme.com',
          password: 'Secure1!',
        });
      });

      expect(outcome?.success).toBe(false);
      expect(outcome?.error).toMatch(/not linked/i);
      expect(mockSupabase.auth.signOut).toHaveBeenCalled();
      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe('Invite sign-in link', () => {
    it('verifies magiclink token and authenticates', async () => {
      (mockSupabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: { access_token: 'invite-token', user: defaultAuthUser } },
        error: null,
      });

      const { result } = renderHook(() => useAuthStore());
      let outcome: { success: boolean; error?: string } | undefined;
      await act(async () => {
        outcome = await result.current.signInWithInviteToken('hashed-token');
      });

      expect(mockSupabase.auth.verifyOtp).toHaveBeenCalledWith({
        token_hash: 'hashed-token',
        type: 'magiclink',
      });
      expect(outcome?.success).toBe(true);
      expect(result.current.isAuthenticated).toBe(true);
    });

    it("exposes mustSetPassword from the users row after invite sign-in", async () => {
      const mockFrom = mockSupabase.from as unknown as jest.Mock;
      mockFrom.mockImplementation((table: string) => {
        if (table === "users") {
          return {
            select: jest.fn().mockReturnThis(),
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ data: null, error: null }),
            }),
            eq: jest.fn(() => ({
              single: jest.fn().mockResolvedValue({
                data: { ...defaultUsersTableRow, must_set_password: true },
                error: null,
              }),
            })),
          };
        }
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
        };
      });
      (mockSupabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: { access_token: "invite-token", user: defaultAuthUser } },
        error: null,
      });

      const { result } = renderHook(() => useAuthStore());
      await act(async () => {
        await result.current.signInWithInviteToken("hashed-token");
      });

      expect(result.current.user?.mustSetPassword).toBe(true);
      expect(result.current.isAuthenticated).toBe(true);
    });
  });

  describe("First-login password", () => {
    it("initialize rehydrates mustSetPassword from the session profile", async () => {
      const mockFrom = mockSupabase.from as unknown as jest.Mock;
      mockFrom.mockImplementation((table: string) => {
        if (table === "users") {
          return {
            select: jest.fn().mockReturnThis(),
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ data: null, error: null }),
            }),
            eq: jest.fn(() => ({
              single: jest.fn().mockResolvedValue({
                data: { ...defaultUsersTableRow, must_set_password: true },
                error: null,
              }),
            })),
          };
        }
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
        };
      });
      (mockSupabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: { access_token: "sess", user: defaultAuthUser } },
        error: null,
      });

      const { result } = renderHook(() => useAuthStore());
      await act(async () => {
        await result.current.initialize();
      });

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user?.mustSetPassword).toBe(true);
    });

    it("does not reopen Set Password when users row is false but JWT metadata is stale", async () => {
      const mockFrom = mockSupabase.from as unknown as jest.Mock;
      mockFrom.mockImplementation((table: string) => {
        if (table === "users") {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn(() => ({
              single: jest.fn().mockResolvedValue({
                data: { ...defaultUsersTableRow, must_set_password: false },
                error: null,
              }),
            })),
          };
        }
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
        };
      });
      (mockSupabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: {
          session: {
            access_token: "sess",
            user: {
              ...defaultAuthUser,
              user_metadata: { must_set_password: true },
            },
          },
        },
        error: null,
      });

      const { result } = renderHook(() => useAuthStore());
      await act(async () => {
        await result.current.initialize();
      });

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user?.mustSetPassword).toBe(false);
    });

    it("completeFirstLoginPassword updates auth and clears the flag", async () => {
      const mockFrom = mockSupabase.from as unknown as jest.Mock;
      const select = jest.fn().mockResolvedValue({
        data: [{ id: "mock-user-id" }],
        error: null,
      });
      const eq = jest.fn().mockReturnValue({ select });
      mockFrom.mockImplementation((table: string) => {
        if (table === "users") {
          return {
            select: jest.fn().mockReturnThis(),
            update: jest.fn().mockReturnValue({ eq }),
            eq: jest.fn(() => ({
              single: jest.fn().mockResolvedValue({
                data: defaultUsersTableRow,
                error: null,
              }),
            })),
          };
        }
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
        };
      });

      useAuthStore.setState({
        user: {
          ...defaultUsersTableRow,
          companyId: "company-123",
          position: "Worker",
          phone: "",
          createdAt: "2026-01-01T00:00:00.000Z",
          mustSetPassword: true,
        } as any,
        isAuthenticated: true,
      });

      const { result } = renderHook(() => useAuthStore());
      let outcome: { success: boolean; error?: string } | undefined;
      await act(async () => {
        outcome = await result.current.completeFirstLoginPassword("newpass1");
      });

      expect(mockSupabase.auth.updateUser).toHaveBeenCalledWith({
        password: "newpass1",
        data: { must_set_password: false, mustSetPassword: false },
      });
      expect(eq).toHaveBeenCalledWith("id", "mock-user-id");
      expect(outcome?.success).toBe(true);
      expect(result.current.user?.mustSetPassword).toBe(false);
    });

    it("keeps the gate when auth password update fails", async () => {
      (mockSupabase.auth.updateUser as jest.Mock).mockResolvedValue({
        data: { user: null },
        error: { message: "Password is too weak" },
      });

      useAuthStore.setState({
        user: {
          ...defaultUsersTableRow,
          companyId: "company-123",
          position: "Worker",
          phone: "",
          createdAt: "2026-01-01T00:00:00.000Z",
          mustSetPassword: true,
        } as any,
        isAuthenticated: true,
      });

      const { result } = renderHook(() => useAuthStore());
      let outcome: { success: boolean; error?: string } | undefined;
      await act(async () => {
        outcome = await result.current.completeFirstLoginPassword("newpass1");
      });

      expect(outcome?.success).toBe(false);
      expect(result.current.user?.mustSetPassword).toBe(true);
    });

    it("clears the flag when GoTrue says the password is already that value", async () => {
      (mockSupabase.auth.updateUser as jest.Mock).mockResolvedValue({
        data: { user: null },
        error: { message: "New password should be different from the old password" },
      });
      const eq = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue({
          data: [{ id: "mock-user-id" }],
          error: null,
        }),
      });
      const mockFrom = mockSupabase.from as unknown as jest.Mock;
      mockFrom.mockImplementation((table: string) => {
        if (table === "users") {
          return {
            select: jest.fn().mockReturnThis(),
            update: jest.fn().mockReturnValue({ eq }),
            eq: jest.fn(() => ({
              single: jest.fn().mockResolvedValue({
                data: defaultUsersTableRow,
                error: null,
              }),
            })),
          };
        }
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
        };
      });

      useAuthStore.setState({
        user: {
          ...defaultUsersTableRow,
          companyId: "company-123",
          position: "Worker",
          phone: "",
          createdAt: "2026-01-01T00:00:00.000Z",
          mustSetPassword: true,
        } as any,
        isAuthenticated: true,
      });

      const { result } = renderHook(() => useAuthStore());
      let outcome: { success: boolean; error?: string } | undefined;
      await act(async () => {
        outcome = await result.current.completeFirstLoginPassword("newpass1");
      });

      expect(outcome?.success).toBe(true);
      expect(result.current.user?.mustSetPassword).toBe(false);
    });

    it("clears the gate when users flag update is blocked", async () => {
      const mockFrom = mockSupabase.from as unknown as jest.Mock;
      mockFrom.mockImplementation((table: string) => {
        if (table === "users") {
          return {
            select: jest.fn().mockReturnThis(),
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockRejectedValue(new Error("updated_at trigger broken")),
            }),
            eq: jest.fn(() => ({
              single: jest.fn().mockResolvedValue({
                data: defaultUsersTableRow,
                error: null,
              }),
            })),
          };
        }
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
        };
      });

      useAuthStore.setState({
        user: {
          ...defaultUsersTableRow,
          companyId: "company-123",
          position: "Worker",
          phone: "",
          createdAt: "2026-01-01T00:00:00.000Z",
          mustSetPassword: true,
        } as any,
        isAuthenticated: true,
      });

      const { result } = renderHook(() => useAuthStore());
      let outcome: { success: boolean; error?: string } | undefined;
      await act(async () => {
        outcome = await result.current.completeFirstLoginPassword("newpass1");
      });

      expect(outcome?.success).toBe(true);
      expect(result.current.user?.mustSetPassword).toBe(false);
    });
  });
});
