import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useAuthStore } from '../authStore';
import { supabase } from '@/api/supabase';

// Mock Supabase
jest.mock('@/api/supabase');

describe('Authentication Workflow Tests', () => {
  const mockSupabase = supabase as jest.Mocked<typeof supabase>;

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

      await act(async () => {
        await result.current.signUp('existing@buildtrack.com', 'Password123!', 'Duplicate User');
      });

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

      await act(async () => {
        await result.current.signUp('user@buildtrack.com', '123', 'Test User');
      });

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
        expect(result.current.user).toEqual(mockUser);
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

      await act(async () => {
        await result.current.signIn('user@buildtrack.com', 'WrongPassword');
      });

      expect(result.current.user).toBeNull();
      expect(result.current.error).toContain('Invalid login credentials');
    });

    it('should fail to login with non-existent user', async () => {
      (mockSupabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid login credentials' },
      });

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.signIn('nonexistent@buildtrack.com', 'Password123!');
      });

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

      expect(result.current.user).toEqual(mockUser);
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
        expires_at: Date.now() - 1000, // Expired 1 second ago
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
});

