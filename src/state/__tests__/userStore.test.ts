import { renderHook, act } from '@testing-library/react-native';
import { useUserStore } from '../userStore';
import { supabase } from '@/api/supabase';
import { UserRole } from '@/types/buildtrack';

// Mock Supabase
jest.mock('@/api/supabase');

describe('User Management Tests', () => {
  const mockSupabase = supabase as jest.Mocked<typeof supabase>;

  const mockCompany = {
    id: 'company-123',
    name: 'BuildTrack Construction',
  };

  const mockCurrentUser = {
    id: 'user-123',
    name: 'John Manager',
    email: 'john@buildtrack.com',
    role: 'manager' as UserRole,
    companyId: mockCompany.id,
    position: 'Project Manager',
    phone: '+1-555-0100',
  };

  beforeEach(() => {
    useUserStore.setState({
      users: [],
      currentUser: null,
      isLoading: false,
      error: null,
    });

    jest.clearAllMocks();

    (mockSupabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
      order: jest.fn().mockResolvedValue({ data: [], error: null }),
    });
  });

  describe('User Profile', () => {
    it('should get current user profile', async () => {
      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockCurrentUser,
              error: null,
            }),
          }),
        }),
      }));

      const { result } = renderHook(() => useUserStore());

      await act(async () => {
        await result.current.fetchCurrentUser(mockCurrentUser.id);
      });

      expect(result.current.currentUser).toEqual(mockCurrentUser);
      expect(mockSupabase.from).toHaveBeenCalledWith('users');
    });

    it('should update user profile', async () => {
      const profileUpdates = {
        name: 'John Updated Manager',
        phone: '+1-555-0199',
        position: 'Senior Project Manager',
      };

      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: { ...mockCurrentUser, ...profileUpdates },
            error: null,
          }),
        }),
      }));

      const { result } = renderHook(() => useUserStore());

      await act(async () => {
        await result.current.updateUser(mockCurrentUser.id, profileUpdates);
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('users');
    });

    it('should update user phone number', async () => {
      const newPhone = '+1-555-9999';

      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: { ...mockCurrentUser, phone: newPhone },
            error: null,
          }),
        }),
      }));

      const { result } = renderHook(() => useUserStore());

      await act(async () => {
        await result.current.updateUser(mockCurrentUser.id, { phone: newPhone });
      });

      expect(mockSupabase.from).toHaveBeenCalled();
    });

    it('should update user position', async () => {
      const newPosition = 'Lead Project Manager';

      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: { ...mockCurrentUser, position: newPosition },
            error: null,
          }),
        }),
      }));

      const { result } = renderHook(() => useUserStore());

      await act(async () => {
        await result.current.updateUser(mockCurrentUser.id, { position: newPosition });
      });

      expect(mockSupabase.from).toHaveBeenCalled();
    });
  });

  describe('User Queries', () => {
    const mockUsers = [
      {
        id: 'user-1',
        name: 'Admin User',
        email: 'admin@buildtrack.com',
        role: 'admin' as UserRole,
        companyId: mockCompany.id,
      },
      {
        id: 'user-2',
        name: 'Manager User',
        email: 'manager@buildtrack.com',
        role: 'manager' as UserRole,
        companyId: mockCompany.id,
      },
      {
        id: 'user-3',
        name: 'Worker One',
        email: 'worker1@buildtrack.com',
        role: 'worker' as UserRole,
        companyId: mockCompany.id,
      },
      {
        id: 'user-4',
        name: 'Worker Two',
        email: 'worker2@buildtrack.com',
        role: 'worker' as UserRole,
        companyId: mockCompany.id,
      },
    ];

    beforeEach(() => {
      useUserStore.setState({ users: mockUsers });
    });

    it('should get all users in company', () => {
      const { result } = renderHook(() => useUserStore());

      const companyUsers = result.current.getUsersByCompany(mockCompany.id);

      expect(companyUsers).toHaveLength(4);
    });

    it('should get user by ID', () => {
      const { result } = renderHook(() => useUserStore());

      const user = result.current.getUserById('user-2');

      expect(user).toBeDefined();
      expect(user?.name).toBe('Manager User');
      expect(user?.role).toBe('manager');
    });

    it('should get users by role', () => {
      const { result } = renderHook(() => useUserStore());

      const workers = result.current.getUsersByRole('worker');

      expect(workers).toHaveLength(2);
      expect(workers[0].role).toBe('worker');
      expect(workers[1].role).toBe('worker');
    });

    it('should search users by name', () => {
      const { result } = renderHook(() => useUserStore());

      const searchResults = result.current.searchUsers('Worker');

      expect(searchResults).toHaveLength(2);
      expect(searchResults[0].name).toContain('Worker');
      expect(searchResults[1].name).toContain('Worker');
    });
  });

  describe('User Permissions', () => {
    it('should check admin permissions', () => {
      const adminUser = {
        id: 'admin-1',
        role: 'admin' as UserRole,
      };

      useUserStore.setState({ currentUser: adminUser });

      const { result } = renderHook(() => useUserStore());

      const hasAdminPermission = result.current.hasPermission('admin');

      expect(hasAdminPermission).toBe(true);
    });

    it('should check manager permissions', () => {
      const managerUser = {
        id: 'manager-1',
        role: 'manager' as UserRole,
      };

      useUserStore.setState({ currentUser: managerUser });

      const { result } = renderHook(() => useUserStore());

      const hasManagerPermission = result.current.hasPermission('manager');

      expect(hasManagerPermission).toBe(true);
    });

    it('should check worker permissions', () => {
      const workerUser = {
        id: 'worker-1',
        role: 'worker' as UserRole,
      };

      useUserStore.setState({ currentUser: workerUser });

      const { result } = renderHook(() => useUserStore());

      const canManageProjects = result.current.hasPermission('admin');

      expect(canManageProjects).toBe(false);
    });
  });
});

