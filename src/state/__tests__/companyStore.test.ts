import { renderHook, act } from '@testing-library/react-native';
import { useCompanyStore } from '../companyStore';
import { supabase } from '@/api/supabase';

// Mock Supabase
jest.mock('@/api/supabase');

describe('Company Management Tests', () => {
  const mockSupabase = supabase as jest.Mocked<typeof supabase>;

  const mockCompany = {
    id: 'company-123',
    name: 'BuildTrack Construction Inc.',
    type: 'general_contractor' as const,
    description: 'Leading construction company',
    address: '123 Main St, City, State 12345',
    phone: '+1-555-0100',
    email: 'contact@buildtrack.com',
    website: 'https://buildtrack.com',
    licenseNumber: 'GC-12345',
    insuranceExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    banner: {
      text: 'Safety First!',
      backgroundColor: '#FF0000',
      textColor: '#FFFFFF',
      isVisible: true,
    },
  };

  beforeEach(() => {
    useCompanyStore.setState({
      company: null,
      isLoading: false,
      error: null,
    });

    jest.clearAllMocks();

    (mockSupabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
    });
  });

  describe('Company Data', () => {
    it('should fetch company information', async () => {
      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockCompany,
              error: null,
            }),
          }),
        }),
      }));

      const { result } = renderHook(() => useCompanyStore());

      await act(async () => {
        await result.current.fetchCompany(mockCompany.id);
      });

      expect(result.current.company).toEqual(mockCompany);
      expect(mockSupabase.from).toHaveBeenCalledWith('companies');
    });

    it('should update company details', async () => {
      const updates = {
        name: 'BuildTrack Construction LLC',
        description: 'Premier construction services',
        phone: '+1-555-0200',
      };

      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: { ...mockCompany, ...updates },
            error: null,
          }),
        }),
      }));

      const { result } = renderHook(() => useCompanyStore());

      await act(async () => {
        await result.current.updateCompany(mockCompany.id, updates);
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('companies');
    });

    it('should update company banner', async () => {
      const newBanner = {
        text: 'Quality Work Guaranteed',
        backgroundColor: '#00FF00',
        textColor: '#000000',
        isVisible: true,
      };

      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: { ...mockCompany, banner: newBanner },
            error: null,
          }),
        }),
      }));

      const { result } = renderHook(() => useCompanyStore());

      await act(async () => {
        await result.current.updateCompany(mockCompany.id, { banner: newBanner });
      });

      expect(mockSupabase.from).toHaveBeenCalled();
    });

    it('should update company logo', async () => {
      const logoUrl = 'https://storage.supabase.co/company-logo.png';

      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: { ...mockCompany, logo: logoUrl },
            error: null,
          }),
        }),
      }));

      const { result } = renderHook(() => useCompanyStore());

      await act(async () => {
        await result.current.updateCompany(mockCompany.id, { logo: logoUrl });
      });

      expect(mockSupabase.from).toHaveBeenCalled();
    });
  });

  describe('Company Users', () => {
    it('should get all company users', async () => {
      const mockUsers = [
        { id: 'user-1', name: 'User 1', companyId: mockCompany.id },
        { id: 'user-2', name: 'User 2', companyId: mockCompany.id },
        { id: 'user-3', name: 'User 3', companyId: mockCompany.id },
      ];

      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: mockUsers,
            error: null,
          }),
        }),
      }));

      const { result } = renderHook(() => useCompanyStore());

      let users;
      await act(async () => {
        users = await result.current.fetchCompanyUsers(mockCompany.id);
      });

      expect(users).toHaveLength(3);
      expect(mockSupabase.from).toHaveBeenCalledWith('users');
    });

    it('should get company statistics', () => {
      const stats = {
        totalUsers: 15,
        totalProjects: 8,
        activeProjects: 5,
        completedProjects: 3,
      };

      useCompanyStore.setState({ companyStats: stats });

      const { result } = renderHook(() => useCompanyStore());

      expect(result.current.companyStats?.totalUsers).toBe(15);
      expect(result.current.companyStats?.activeProjects).toBe(5);
    });
  });

  describe('Company Settings', () => {
    it('should update company contact info', async () => {
      const contactInfo = {
        phone: '+1-555-0300',
        email: 'info@buildtrack.com',
        address: '456 New Address, City, State 67890',
      };

      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: { ...mockCompany, ...contactInfo },
            error: null,
          }),
        }),
      }));

      const { result } = renderHook(() => useCompanyStore());

      await act(async () => {
        await result.current.updateCompany(mockCompany.id, contactInfo);
      });

      expect(mockSupabase.from).toHaveBeenCalled();
    });

    it('should update license information', async () => {
      const licenseInfo = {
        licenseNumber: 'GC-67890',
        insuranceExpiry: new Date(Date.now() + 730 * 24 * 60 * 60 * 1000).toISOString(), // 2 years
      };

      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: { ...mockCompany, ...licenseInfo },
            error: null,
          }),
        }),
      }));

      const { result } = renderHook(() => useCompanyStore());

      await act(async () => {
        await result.current.updateCompany(mockCompany.id, licenseInfo);
      });

      expect(mockSupabase.from).toHaveBeenCalled();
    });
  });
});

